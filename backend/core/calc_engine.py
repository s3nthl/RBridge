"""
RBridge Calc Engine — Taxes & Insurance Second Lien, v2.0.0

Deterministic. No randomness. No LLM calls. No floats.
All arithmetic uses decimal.Decimal at 28 digits; outputs are quantized to
6 decimal places only at the end, so intermediate rounding never drifts.

Program (partner summary + Dev Spec test cases):
  - First lien: purchase_price × first_lien_ltv, fixed rate, P&I only.
  - During funding, a second lien pays each month's property tax, special
    assessments and insurance (T&I), which grow once a year.
  - Interest is charged on the second-lien balance at the START of each month,
    then that month's T&I is drawn. Interest either accrues into the balance
    or is paid monthly by the borrower.
  - The balance including all interest that will accrue through the end of
    funding must stay within the cap. Draws are trimmed so the final balance
    lands exactly on the cap; any T&I left uncovered is paid by the borrower.
  - After funding: Option A amortizes the second; Option B refinances the
    first-lien balance plus the second into one new first.

Golden values: tests/unit/test_calc_engine.py checks every output of the three
partner test cases (tests/fixtures/second_lien_test_cases.json).
"""

from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP, getcontext

from core.constants import CALC_ENGINE_VERSION, PMI_LTV_THRESHOLD
from core.schemas import MonthRow, ScenarioInput, ScenarioResult, YearRow

getcontext().prec = 28

ZERO = Decimal("0")
ONE = Decimal("1")
TWELVE = Decimal("12")
_OUTPUT_QUANTUM = Decimal("0.000001")

# Break-even rate search: bisection over [0, 30%] annual. 100 halvings narrow
# the interval far below the output precision; a fixed count keeps it deterministic.
_BREAKEVEN_RATE_CEILING = Decimal("0.30")
_BREAKEVEN_ITERATIONS = 100


def _q(v: Decimal) -> Decimal:
    return v.quantize(_OUTPUT_QUANTUM, rounding=ROUND_HALF_UP)


def _q_opt(v: Decimal | None) -> Decimal | None:
    return None if v is None else _q(v)


def _pmt(monthly_rate: Decimal, nper: int, pv: Decimal) -> Decimal:
    """Level payment that amortizes pv over nper months."""
    if monthly_rate == ZERO:
        return pv / Decimal(nper)
    factor = (ONE + monthly_rate) ** nper
    return pv * monthly_rate * factor / (factor - ONE)


def _remaining_balance(pv: Decimal, monthly_rate: Decimal, payment: Decimal, months_paid: int) -> Decimal:
    """Amortizing loan balance after months_paid level payments."""
    if monthly_rate == ZERO:
        return pv - payment * Decimal(months_paid)
    growth = (ONE + monthly_rate) ** months_paid
    return pv * growth - payment * (growth - ONE) / monthly_rate


def _breakeven_rate(loan: Decimal, nper: int, target_payment: Decimal, extra_monthly: Decimal) -> Decimal | None:
    """
    Annual rate at which PMT(rate/12, nper, loan) + extra_monthly equals
    target_payment. None when even a 0% rate cannot get there.
    """
    if _pmt(ZERO, nper, loan) + extra_monthly > target_payment:
        return None
    lo, hi = ZERO, _BREAKEVEN_RATE_CEILING
    for _ in range(_BREAKEVEN_ITERATIONS):
        mid = (lo + hi) / 2
        if _pmt(mid / TWELVE, nper, loan) + extra_monthly > target_payment:
            hi = mid
        else:
            lo = mid
    return (lo + hi) / 2


def _annual_costs(s: ScenarioInput, year_index: int) -> tuple[Decimal, Decimal]:
    """
    (total, funded) annual T&I for a 0-indexed year.

    Special assessments are always part of the borrower's housing cost; they
    are funded by the second lien only when fund_special_assessments is set.
    """
    taxes = s.purchase_price * s.tax_rate * (ONE + s.tax_growth) ** year_index
    assessments = s.purchase_price * s.special_assessment_rate * (ONE + s.special_assessment_growth) ** year_index
    insurance = s.insurance_annual * (ONE + s.insurance_growth) ** year_index
    total = taxes + assessments + insurance
    funded = total if s.fund_special_assessments else taxes + insurance
    return total, funded


@dataclass(frozen=True)
class _FundingMonth:
    """Unrounded per-month figures, kept so yearly totals never sum rounded values."""
    ti: Decimal
    draw: Decimal
    interest: Decimal
    interest_paid: Decimal
    balance: Decimal

    @property
    def relief(self) -> Decimal:
        # What the second lien takes off the borrower's monthly payment.
        return self.draw - self.interest_paid


@dataclass(frozen=True)
class _FundingPeriod:
    months: list[_FundingMonth]
    balance: Decimal
    uncapped_balance: Decimal
    total_draws: Decimal
    total_accrued: Decimal
    total_paid_interest: Decimal
    shortfall_months: int
    cap_reached_month: int | None


def _run_funding_period(s: ScenarioInput, cap_amount: Decimal) -> _FundingPeriod:
    r2 = s.second_lien_rate / TWELVE
    n = s.funding_months

    balance = ZERO
    uncapped_balance = ZERO     # what the balance would be with no cap
    total_draws = ZERO
    total_accrued = ZERO
    total_paid_interest = ZERO
    shortfall_months = 0
    cap_reached_month: int | None = None
    months: list[_FundingMonth] = []

    for m in range(1, n + 1):
        total_annual, funded_annual = _annual_costs(s, (m - 1) // 12)
        funded_ti = funded_annual / TWELVE

        interest = balance * r2
        if s.accrue_interest:
            balance += interest
            total_accrued += interest
            uncapped_balance = uncapped_balance * (ONE + r2) + funded_ti
            interest_paid = ZERO
            # Leave room for the interest this balance will accrue through the
            # end of funding, so the final balance never exceeds the cap.
            draw_limit = cap_amount / (ONE + r2) ** (n - m) - balance
        else:
            total_paid_interest += interest
            uncapped_balance += funded_ti
            interest_paid = interest
            draw_limit = cap_amount - balance

        draw = min(funded_ti, max(draw_limit, ZERO))
        if draw < funded_ti:
            shortfall_months += 1
            if cap_reached_month is None:
                cap_reached_month = m
        balance += draw
        total_draws += draw

        months.append(_FundingMonth(
            ti=total_annual / TWELVE,
            draw=draw,
            interest=interest,
            interest_paid=interest_paid,
            balance=balance,
        ))

    return _FundingPeriod(
        months=months,
        balance=balance,
        uncapped_balance=uncapped_balance,
        total_draws=total_draws,
        total_accrued=total_accrued,
        total_paid_interest=total_paid_interest,
        shortfall_months=shortfall_months,
        cap_reached_month=cap_reached_month,
    )


def _year_rows(funding: _FundingPeriod, pi: Decimal) -> list[YearRow]:
    """Average monthly figures per funding year (a partial last year averages its own months)."""
    rows: list[YearRow] = []
    for start in range(0, len(funding.months), 12):
        chunk = funding.months[start:start + 12]
        count = Decimal(len(chunk))
        ti = sum((fm.ti for fm in chunk), ZERO) / count
        relief = sum((fm.relief for fm in chunk), ZERO) / count
        without = pi + ti
        rows.append(YearRow(
            year=start // 12 + 1,
            ti_monthly=_q(ti),
            payment_without_second=_q(without),
            payment_with_second=_q(without - relief),
            relief_monthly=_q(relief),
            relief_pct=_q(relief / without),
        ))
    return rows


def run_scenario(s: ScenarioInput) -> ScenarioResult:
    """
    Run the full second-lien scenario.

    This is the only entry point to the calc engine. Inputs must already have
    passed core.validation.validate_scenario.
    """
    # ── 1. First lien ────────────────────────────────────────────────
    r1 = s.first_lien_rate / TWELVE
    first_lien_amount = s.purchase_price * s.first_lien_ltv
    pi = _pmt(r1, s.first_lien_term_months, first_lien_amount)

    # ── 2. Funding period ────────────────────────────────────────────
    cap_amount = s.purchase_price * s.second_lien_cap_pct
    funding = _run_funding_period(s, cap_amount)
    n = s.funding_months
    count = Decimal(n)

    ti_year1 = funding.months[0].ti
    total_ti = sum((fm.ti for fm in funding.months), ZERO)
    total_relief = sum((fm.relief for fm in funding.months), ZERO)
    avg_relief = total_relief / count
    avg_relief_pct = avg_relief / (pi + total_ti / count)

    # ── 3. End of funding ────────────────────────────────────────────
    balance = funding.balance
    first_lien_balance = _remaining_balance(first_lien_amount, r1, pi, n)
    total_debt = first_lien_balance + balance
    after_annual, _ = _annual_costs(s, n // 12)   # month n+1 falls in year n // 12
    payment_without_second_after = pi + after_annual / TWELVE

    # ── 4. Option A: keep the first, amortize the second ─────────────
    r2 = s.second_lien_rate / TWELVE
    option_a_payment = _pmt(r2, s.amort_months, balance)
    option_a_total_interest = (
        funding.total_accrued
        + funding.total_paid_interest
        + option_a_payment * Decimal(s.amort_months) - balance
    )

    # ── 5. Option B: refinance into one new first ────────────────────
    remaining_term = s.first_lien_term_months - n
    r_new = s.refi_rate / TWELVE
    new_loan = total_debt
    new_pi = _pmt(r_new, remaining_term, new_loan)
    new_pi_full = _pmt(r_new, s.refi_term_months, new_loan)
    refi_ltv = new_loan / s.purchase_price
    pmi_required = refi_ltv > PMI_LTV_THRESHOLD
    pmi = new_loan * s.pmi_rate / TWELVE if pmi_required else ZERO
    breakeven = _breakeven_rate(new_loan, remaining_term, pi, ZERO)
    breakeven_pmi = _breakeven_rate(new_loan, remaining_term, pi, pmi)

    return ScenarioResult(
        calc_version=CALC_ENGINE_VERSION,
        first_lien_amount=_q(first_lien_amount),
        first_lien_pi=_q(pi),
        ti_monthly_year1=_q(ti_year1),
        payment_without_second_year1=_q(pi + ti_year1),
        relief_month1=_q(funding.months[0].relief),
        avg_monthly_relief=_q(avg_relief),
        avg_relief_pct=_q(avg_relief_pct),
        total_draws=_q(funding.total_draws),
        total_accrued_interest=_q(funding.total_accrued),
        total_interest_paid_monthly=_q(funding.total_paid_interest),
        cap_amount=_q(cap_amount),
        shortfall_months=funding.shortfall_months,
        cap_reached_month=funding.cap_reached_month,
        cap_needed_pct=_q(funding.uncapped_balance / s.purchase_price),
        commitment_cltv=_q(s.first_lien_ltv + s.second_lien_cap_pct),
        second_lien_balance=_q(balance),
        cap_room=_q(cap_amount - balance),
        first_lien_balance_at_end=_q(first_lien_balance),
        total_debt_at_end=_q(total_debt),
        payment_without_second_after=_q(payment_without_second_after),
        option_a_payment=_q(option_a_payment),
        option_a_total_payment=_q(payment_without_second_after + option_a_payment),
        option_a_total_interest=_q(option_a_total_interest),
        option_b_new_loan=_q(new_loan),
        option_b_payment=_q(new_pi),
        option_b_payment_change=_q(new_pi - pi),
        option_b_payment_change_pct=_q((new_pi - pi) / payment_without_second_after),
        option_b_payment_full_term=_q(new_pi_full),
        option_b_payment_change_full_term=_q(new_pi_full - pi),
        option_b_breakeven_rate=_q_opt(breakeven),
        option_b_breakeven_rate_drop=_q_opt(None if breakeven is None else s.first_lien_rate - breakeven),
        option_b_ltv=_q(refi_ltv),
        option_b_pmi_required=pmi_required,
        option_b_pmi_monthly=_q(pmi),
        option_b_payment_change_with_pmi=_q(new_pi + pmi - pi),
        option_b_breakeven_rate_with_pmi=_q_opt(breakeven_pmi),
        option_b_breakeven_rate_drop_with_pmi=_q_opt(
            None if breakeven_pmi is None else s.first_lien_rate - breakeven_pmi
        ),
        option_b_closing_costs=_q(new_loan * s.closing_cost_pct),
        years=_year_rows(funding, pi),
        months=[
            MonthRow(
                month=i + 1,
                ti=_q(fm.ti),
                draw=_q(fm.draw),
                interest=_q(fm.interest),
                interest_paid=_q(fm.interest_paid),
                balance=_q(fm.balance),
                borrower_payment=_q(pi + fm.interest_paid + fm.ti - fm.draw),
            )
            for i, fm in enumerate(funding.months)
        ],
    )
