"""
Deterministic risk score, 0–100 (higher = safer). No ML.

Every factor and the points it costs are returned with the score so each
result is auditable. Inputs are credit, DTI on the payment AFTER funding
(per the program's underwriting rule), payment step-up at the end of
funding, cap pressure and income stability. No geography or demographic
inputs, so nothing here can proxy a protected class.
"""

from decimal import Decimal

from core.constants import (
    RISK_BAND_ELEVATED,
    RISK_BAND_HIGH,
    RISK_BAND_LOW,
    RISK_BAND_MODERATE,
)
from core.schemas import RiskAssessment, RiskFactor, ScenarioResult, UnderwritingProfile

_MAX_SCORE = 100
_QUANTUM = Decimal("0.0001")

# (minimum credit score, points deducted), checked top-down
_CREDIT_TIERS: tuple[tuple[int, int], ...] = ((760, 0), (720, 5), (680, 10), (640, 18), (620, 24))
_CREDIT_FLOOR_PENALTY = 30

# (maximum post-funding DTI, points deducted)
_DTI_TIERS: tuple[tuple[Decimal, int], ...] = (
    (Decimal("0.36"), 0), (Decimal("0.43"), 8), (Decimal("0.50"), 18),
)
_DTI_CEILING_PENALTY = 30

# (maximum payment increase at end of funding vs year 1, points deducted)
_STEP_UP_TIERS: tuple[tuple[Decimal, int], ...] = (
    (Decimal("0.15"), 0), (Decimal("0.25"), 5), (Decimal("0.35"), 10),
)
_STEP_UP_CEILING_PENALTY = 15

# The cap ran out before funding ended, so the borrower covers some T&I.
_CAP_SHORTFALL_PENALTY = 10
_VARIABLE_INCOME_PENALTY = 5
_VARIABLE_INCOME_TYPES = ("self_employed", "1099")


def _tiered(value, tiers, ceiling_penalty: int) -> int:
    for limit, points in tiers:
        if value <= limit:
            return points
    return ceiling_penalty


def _credit_penalty(score: int) -> int:
    for minimum, points in _CREDIT_TIERS:
        if score >= minimum:
            return points
    return _CREDIT_FLOOR_PENALTY


def _band(score: int) -> str:
    if score >= 75:
        return RISK_BAND_LOW
    if score >= 50:
        return RISK_BAND_MODERATE
    if score >= 25:
        return RISK_BAND_ELEVATED
    return RISK_BAND_HIGH


def back_end_dti(result: ScenarioResult, borrower: UnderwritingProfile) -> tuple[Decimal, Decimal]:
    """(during funding on the year-1 payment, after funding on the Option A payment)."""
    gross_monthly = borrower.income / Decimal("12")
    during = (result.years[0].payment_with_second + borrower.monthly_debts) / gross_monthly
    after = (result.option_a_total_payment + borrower.monthly_debts) / gross_monthly
    return during.quantize(_QUANTUM), after.quantize(_QUANTUM)


def assess(result: ScenarioResult, borrower: UnderwritingProfile) -> RiskAssessment:
    dti_during, dti_after = back_end_dti(result, borrower)
    year1_payment = result.years[0].payment_with_second
    step_up = (result.option_a_total_payment - year1_payment) / year1_payment

    factors = [
        RiskFactor(name="credit_score", value=str(borrower.credit_score),
                   points=_credit_penalty(borrower.credit_score)),
        RiskFactor(name="dti_after_funding", value=f"{dti_after:.2%}",
                   points=_tiered(dti_after, _DTI_TIERS, _DTI_CEILING_PENALTY)),
        RiskFactor(name="payment_step_up", value=f"{step_up:.2%}",
                   points=_tiered(step_up, _STEP_UP_TIERS, _STEP_UP_CEILING_PENALTY)),
        RiskFactor(name="cap_shortfall_months", value=str(result.shortfall_months),
                   points=_CAP_SHORTFALL_PENALTY if result.shortfall_months else 0),
        RiskFactor(name="employment_type", value=borrower.employment_type,
                   points=_VARIABLE_INCOME_PENALTY if borrower.employment_type in _VARIABLE_INCOME_TYPES else 0),
    ]

    score = max(0, min(_MAX_SCORE, _MAX_SCORE - sum(f.points for f in factors)))
    return RiskAssessment(
        score=score,
        band=_band(score),
        dti_during_funding=dti_during,
        dti_after_funding=dti_after,
        factors=factors,
    )
