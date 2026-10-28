from decimal import Decimal

from core.calc_engine import run_scenario
from core.risk import assess
from core.schemas import ScenarioInput, UnderwritingProfile
from core.validation import validate_borrower, validate_scenario

PORTLAND = ScenarioInput(
    purchase_price=Decimal("600000"),
    first_lien_rate=Decimal("0.071"),
    tax_rate=Decimal("0.01"),
    insurance_annual=Decimal("1600"),
    refi_rate=Decimal("0.061"),
)
STRONG = UnderwritingProfile(income=Decimal("200000"), monthly_debts=Decimal("0"),
                             credit_score=800, employment_type="W2")


def test_portland_defaults_are_valid():
    assert validate_scenario(PORTLAND) == []


def test_cap_above_ten_percent_rejected():
    codes = {e.code for e in validate_scenario(PORTLAND.model_copy(update={"second_lien_cap_pct": Decimal("0.12")}))}
    assert {"SECOND_LIEN_CAP_TOO_HIGH", "COMMITMENT_CLTV_TOO_HIGH"} <= codes


def test_funding_period_bounds():
    for months in (6, 121, 360):
        errors = validate_scenario(PORTLAND.model_copy(update={"funding_months": months}))
        assert errors and errors[0].field == "funding_months"


def test_borrower_guardrails():
    weak = STRONG.model_copy(update={"income": Decimal("10000"), "credit_score": 500})
    assert {e.code for e in validate_borrower(weak)} == {"INCOME_TOO_LOW", "CREDIT_SCORE_TOO_LOW"}


def test_strong_borrower_scores_low_risk():
    risk = assess(run_scenario(PORTLAND), STRONG)
    assert risk.band == "Low"
    assert risk.dti_after_funding < risk.dti_during_funding * 2
    assert sum(f.points for f in risk.factors) == 100 - risk.score


def test_score_is_deterministic_and_drops_with_credit():
    result = run_scenario(PORTLAND)
    good = assess(result, STRONG)
    fair = assess(result, STRONG.model_copy(update={"credit_score": 630}))
    assert assess(result, STRONG) == good
    assert fair.score < good.score


def test_cap_shortfall_is_penalised():
    tight = run_scenario(PORTLAND.model_copy(update={"second_lien_cap_pct": Decimal("0.05")}))
    assert tight.shortfall_months > 0
    factor = next(f for f in assess(tight, STRONG).factors if f.name == "cap_shortfall_months")
    assert factor.points > 0
