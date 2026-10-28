"""
Input guardrail validation.

All limits come from core.constants (never magic numbers here).
Validation runs BEFORE the calc engine sees any input. Returns structured
error lists; never raises.
"""

from core.constants import (
    MAX_COMMITMENT_CLTV,
    MAX_FIRST_LIEN_LTV,
    MAX_FUNDING_MONTHS,
    MAX_PURCHASE_PRICE,
    MAX_SECOND_LIEN_CAP_PCT,
    MAX_TERM_MONTHS,
    MIN_ANNUAL_INCOME,
    MIN_CREDIT_SCORE,
    MIN_FUNDING_MONTHS,
)
from core.schemas import ErrorDetail, ScenarioInput, UnderwritingProfile


def validate_scenario(s: ScenarioInput) -> list[ErrorDetail]:
    """Program-term checks on the scenario. Empty list = valid."""
    errors: list[ErrorDetail] = []

    def fail(code: str, field: str, message: str) -> None:
        errors.append(ErrorDetail(code=code, field=field, message=message))

    if s.purchase_price > MAX_PURCHASE_PRICE:
        fail("PURCHASE_PRICE_TOO_HIGH", "purchase_price",
             f"Purchase price cannot exceed ${MAX_PURCHASE_PRICE:,.0f}.")

    if s.first_lien_ltv > MAX_FIRST_LIEN_LTV:
        fail("DOWN_PAYMENT_TOO_LOW", "first_lien_ltv",
             f"The program requires at least {(1 - MAX_FIRST_LIEN_LTV) * 100:.0f}% down "
             f"(first lien at most {MAX_FIRST_LIEN_LTV * 100:.0f}% of price).")

    if s.second_lien_cap_pct > MAX_SECOND_LIEN_CAP_PCT:
        fail("SECOND_LIEN_CAP_TOO_HIGH", "second_lien_cap_pct",
             f"The second lien is capped at {MAX_SECOND_LIEN_CAP_PCT * 100:.0f}% of price.")

    commitment = s.first_lien_ltv + s.second_lien_cap_pct
    if commitment > MAX_COMMITMENT_CLTV:
        fail("COMMITMENT_CLTV_TOO_HIGH", "second_lien_cap_pct",
             f"Combined commitment ({commitment:.2%}) exceeds {MAX_COMMITMENT_CLTV:.0%} of price.")

    if s.tax_rate > s.max_tax_rate:
        fail("TAX_RATE_ABOVE_MAX", "tax_rate",
             f"Property tax rate ({s.tax_rate:.2%}) is above the program maximum of {s.max_tax_rate:.2%}.")

    if s.first_lien_term_months > MAX_TERM_MONTHS:
        fail("TERM_TOO_LONG", "first_lien_term_months",
             f"Maximum first-lien term is {MAX_TERM_MONTHS} months.")

    if s.refi_term_months > MAX_TERM_MONTHS:
        fail("TERM_TOO_LONG", "refi_term_months",
             f"Maximum refinance term is {MAX_TERM_MONTHS} months.")

    if not MIN_FUNDING_MONTHS <= s.funding_months <= MAX_FUNDING_MONTHS:
        fail("FUNDING_PERIOD_OUT_OF_RANGE", "funding_months",
             f"Funding period must be {MIN_FUNDING_MONTHS}–{MAX_FUNDING_MONTHS} months.")
    elif s.funding_months >= s.first_lien_term_months:
        fail("FUNDING_PERIOD_TOO_LONG", "funding_months",
             "Funding period must end before the first lien matures.")

    return errors


def validate_borrower(b: UnderwritingProfile) -> list[ErrorDetail]:
    """Borrower checks that do not depend on the scenario result."""
    errors: list[ErrorDetail] = []

    if b.income < MIN_ANNUAL_INCOME:
        errors.append(ErrorDetail(
            code="INCOME_TOO_LOW", field="income",
            message=f"Annual income must be at least ${MIN_ANNUAL_INCOME:,.0f}.",
        ))

    if b.credit_score < MIN_CREDIT_SCORE:
        errors.append(ErrorDetail(
            code="CREDIT_SCORE_TOO_LOW", field="credit_score",
            message=f"Minimum credit score is {MIN_CREDIT_SCORE}.",
        ))

    return errors

