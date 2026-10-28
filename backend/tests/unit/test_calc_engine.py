"""
Golden tests for calc engine v2 against the partner Dev Spec test cases.

Every output key in tests/fixtures/second_lien_test_cases.json is checked,
plus the year-by-year netyear / netpct / payyear arrays.
"""

import json
from decimal import Decimal
from pathlib import Path

import pytest

from core.calc_engine import run_scenario
from core.schemas import ScenarioInput, ScenarioResult

FIXTURE = Path(__file__).parent.parent / "fixtures" / "second_lien_test_cases.json"
CASES = json.loads(FIXTURE.read_text())["cases"]

# Fixture values are rounded to 6 decimals; allow one unit of that rounding.
TOLERANCE = Decimal("0.000002")
YEARS_IN_FIXTURE = 5

# Dev Spec input key → ScenarioInput field
INPUT_MAP = {
    "price": "purchase_price",
    "ltv": "first_lien_ltv",
    "r1": "first_lien_rate",
    "term1": "first_lien_term_months",
    "tax": "tax_rate",
    "cfd": "special_assessment_rate",
    "ins": "insurance_annual",
    "gT": "tax_growth",
    "gC": "special_assessment_growth",
    "gI": "insurance_growth",
    "fundcfd": "fund_special_assessments",
    "cap": "second_lien_cap_pct",
    "r2": "second_lien_rate",
    "accrue": "accrue_interest",
    "defer": "funding_months",
    "amort": "amort_months",
    "rnew": "refi_rate",
    "term30": "refi_term_months",
    "pmirate": "pmi_rate",
    "closepct": "closing_cost_pct",
    "maxtax": "max_tax_rate",
}

# Dev Spec output key → ScenarioResult field
OUTPUT_MAP = {
    "loan": "first_lien_amount",
    "pi": "first_lien_pi",
    "ti1": "ti_monthly_year1",
    "base1": "payment_without_second_year1",
    "net1": "relief_month1",
    "avg": "avg_monthly_relief",
    "avgp": "avg_relief_pct",
    "totdraw": "total_draws",
    "totaccr": "total_accrued_interest",
    "totio": "total_interest_paid_monthly",
    "capamt": "cap_amount",
    "short": "shortfall_months",
    "capout": "cap_reached_month",
    "capneed": "cap_needed_pct",
    "bal": "second_lien_balance",
    "room": "cap_room",
    "bal1": "first_lien_balance_at_end",
    "debt": "total_debt_at_end",
    "pmt2": "option_a_payment",
    "baseafter": "payment_without_second_after",
    "withprod": "option_a_total_payment",
    "totint": "option_a_total_interest",
    "newloan": "option_b_new_loan",
    "newpi": "option_b_payment",
    "oldpi": "first_lien_pi",
    "chg": "option_b_payment_change",
    "chgp": "option_b_payment_change_pct",
    "newpi30": "option_b_payment_full_term",
    "chg30": "option_b_payment_change_full_term",
    "be": "option_b_breakeven_rate",
    "bedrop": "option_b_breakeven_rate_drop",
    "refiltv": "option_b_ltv",
    "pmiflag": "option_b_pmi_required",
    "pmi": "option_b_pmi_monthly",
    "chgpmi": "option_b_payment_change_with_pmi",
    "bepmi": "option_b_breakeven_rate_with_pmi",
    "bedroppmi": "option_b_breakeven_rate_drop_with_pmi",
}


def _scenario(raw: dict) -> ScenarioInput:
    fields = {}
    for key, value in raw.items():
        name = INPUT_MAP[key]
        if name in ("fund_special_assessments", "accrue_interest"):
            fields[name] = bool(value)
        elif isinstance(value, float):
            fields[name] = Decimal(str(value))
        else:
            fields[name] = value
    return ScenarioInput(**fields)


def _expected(key: str, value):
    """Translate Dev Spec display values into the engine's typed values."""
    if key == "capout":
        return None if value == "Not reached" else int(value)
    if key == "pmiflag":
        return value.startswith("Yes")
    if key == "short":
        return int(value)
    return Decimal(str(value))


def _assert_close(actual, expected, label: str) -> None:
    if isinstance(expected, Decimal):
        assert actual is not None, f"{label}: got None"
        assert abs(actual - expected) <= TOLERANCE, f"{label}: {actual} != {expected}"
    else:
        assert actual == expected, f"{label}: {actual!r} != {expected!r}"


@pytest.fixture(scope="module", params=CASES, ids=[c["name"] for c in CASES])
def case(request) -> tuple[dict, ScenarioResult]:
    return request.param, run_scenario(_scenario(request.param["inputs"]))


def test_every_output_matches(case):
    spec, result = case
    for key, raw in spec["outputs"].items():
        _assert_close(getattr(result, OUTPUT_MAP[key]), _expected(key, raw), key)


def test_year_rows_match(case):
    spec, result = case
    # Fixture always has 5 columns; years past the funding period are zero.
    funded_years = len(result.years)
    for i in range(YEARS_IN_FIXTURE):
        row = result.years[i] if i < funded_years else None
        _assert_close(row.relief_monthly if row else Decimal(0), Decimal(str(spec["netyear"][i])), f"netyear[{i}]")
        _assert_close(row.relief_pct if row else Decimal(0), Decimal(str(spec["netpct"][i])), f"netpct[{i}]")
        _assert_close(row.payment_with_second if row else Decimal(0), Decimal(str(spec["payyear"][i])), f"payyear[{i}]")


def test_every_output_key_is_mapped():
    keys = set(json.loads(FIXTURE.read_text())["output_keys"])
    assert keys == set(OUTPUT_MAP)


def test_deterministic(case):
    spec, result = case
    again = run_scenario(_scenario(spec["inputs"]))
    assert again.model_dump() == result.model_dump()


def test_cap_never_exceeded(case):
    _, result = case
    assert all(m.balance <= result.cap_amount for m in result.months)


def test_month_rows_cover_funding_period(case):
    spec, result = case
    assert len(result.months) == spec["inputs"]["defer"]
    assert result.months[-1].balance == result.second_lien_balance


def test_unfunded_special_assessments_are_paid_by_borrower():
    raw = dict(CASES[2]["inputs"], fundcfd=0)
    result = run_scenario(_scenario(raw))
    funded = run_scenario(_scenario(CASES[2]["inputs"]))
    # Same total housing cost, but less of it is covered by the second lien.
    assert result.ti_monthly_year1 == funded.ti_monthly_year1
    assert result.relief_month1 < funded.relief_month1
    assert result.total_draws < funded.total_draws


def test_no_pmi_at_or_below_threshold():
    # Big down payment on the first keeps the refinance at or under 80% LTV.
    raw = dict(CASES[0]["inputs"], ltv=0.6)
    result = run_scenario(_scenario(raw))
    assert result.option_b_ltv <= Decimal("0.80")
    assert result.option_b_pmi_required is False
    assert result.option_b_pmi_monthly == 0
    assert result.option_b_breakeven_rate_with_pmi == result.option_b_breakeven_rate
