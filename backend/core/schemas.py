from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Any, Literal

from pydantic import BaseModel, Field

from core.constants import (
    DEFAULT_AMORT_MONTHS,
    DEFAULT_CLOSING_COST_PCT,
    DEFAULT_FIRST_LIEN_LTV,
    DEFAULT_FIRST_LIEN_TERM_MONTHS,
    DEFAULT_FUNDING_MONTHS,
    DEFAULT_INSURANCE_GROWTH,
    DEFAULT_MAX_TAX_RATE,
    DEFAULT_PMI_RATE,
    DEFAULT_REFI_TERM_MONTHS,
    DEFAULT_SECOND_LIEN_RATE,
    DEFAULT_SPECIAL_ASSESSMENT_GROWTH,
    DEFAULT_TAX_GROWTH,
    MAX_SECOND_LIEN_CAP_PCT,
)

EmploymentType = Literal["W2", "1099", "self_employed", "retired"]
RiskBand = Literal["Low", "Moderate", "Elevated", "High"]


# ── Inputs ─────────────────────────────────────────────────────────────────────
# No PII anywhere. Only what the engine needs.

class ScenarioInput(BaseModel):
    """Program math inputs. Field comments give the partner Dev Spec key."""

    # Purchase and first lien
    purchase_price: Decimal = Field(gt=0)                                          # price
    first_lien_ltv: Decimal = Field(default=DEFAULT_FIRST_LIEN_LTV, gt=0, lt=1)    # ltv
    first_lien_rate: Decimal = Field(gt=0, lt=1)                                   # r1
    first_lien_term_months: int = Field(default=DEFAULT_FIRST_LIEN_TERM_MONTHS, ge=12)  # term1

    # Property taxes, special assessments, insurance (annual, growing yearly)
    tax_rate: Decimal = Field(ge=0, lt=1, description="Annual property tax as a share of price")  # tax
    tax_growth: Decimal = Field(default=DEFAULT_TAX_GROWTH, ge=0, lt=1)                           # gT
    special_assessment_rate: Decimal = Field(default=Decimal("0"), ge=0, lt=1)                    # cfd
    special_assessment_growth: Decimal = Field(default=DEFAULT_SPECIAL_ASSESSMENT_GROWTH, ge=0, lt=1)  # gC
    fund_special_assessments: bool = True                                                          # fundcfd
    insurance_annual: Decimal = Field(ge=0)                                                        # ins
    insurance_growth: Decimal = Field(default=DEFAULT_INSURANCE_GROWTH, ge=0, lt=1)                # gI

    # Second lien
    second_lien_cap_pct: Decimal = Field(default=MAX_SECOND_LIEN_CAP_PCT, gt=0, lt=1)  # cap
    second_lien_rate: Decimal = Field(default=DEFAULT_SECOND_LIEN_RATE, ge=0, lt=1)   # r2
    accrue_interest: bool = True                                                        # accrue
    funding_months: int = Field(default=DEFAULT_FUNDING_MONTHS, ge=1)                  # defer
    amort_months: int = Field(default=DEFAULT_AMORT_MONTHS, ge=1)                      # amort

    # Refinance exit (Option B)
    refi_rate: Decimal = Field(gt=0, lt=1)                                              # rnew
    refi_term_months: int = Field(default=DEFAULT_REFI_TERM_MONTHS, ge=12)             # term30
    pmi_rate: Decimal = Field(default=DEFAULT_PMI_RATE, ge=0, lt=1)                    # pmirate
    closing_cost_pct: Decimal = Field(default=DEFAULT_CLOSING_COST_PCT, ge=0, lt=1)    # closepct

    # Program limit on the property tax rate the application accepts
    max_tax_rate: Decimal = Field(default=DEFAULT_MAX_TAX_RATE, gt=0, lt=1)            # maxtax


class UnderwritingProfile(BaseModel):
    """Borrower data used only to underwrite the payment after funding."""

    income: Decimal = Field(gt=0, description="Gross annual income")
    monthly_debts: Decimal = Field(ge=0, description="Existing monthly obligations")
    credit_score: int = Field(ge=300, le=850)
    employment_type: EmploymentType


# ── Engine output ──────────────────────────────────────────────────────────────

class YearRow(BaseModel):
    year: int
    ti_monthly: Decimal                 # avg monthly taxes + assessments + insurance
    payment_without_second: Decimal     # first-lien P&I + T&I
    payment_with_second: Decimal        # what the borrower actually pays
    relief_monthly: Decimal             # netyear
    relief_pct: Decimal                 # netpct


class MonthRow(BaseModel):
    month: int
    ti: Decimal                 # T&I due this month
    draw: Decimal               # paid by the second lien
    interest: Decimal           # second-lien interest charged this month
    interest_paid: Decimal      # interest the borrower pays (0 when accruing)
    balance: Decimal            # second-lien balance at month end
    borrower_payment: Decimal   # P&I + interest paid + any T&I the second did not cover


class ScenarioResult(BaseModel):
    calc_version: str

    # First lien
    first_lien_amount: Decimal              # loan
    first_lien_pi: Decimal                  # pi / oldpi

    # Funding period
    ti_monthly_year1: Decimal               # ti1
    payment_without_second_year1: Decimal   # base1
    relief_month1: Decimal                  # net1
    avg_monthly_relief: Decimal             # avg
    avg_relief_pct: Decimal                 # avgp
    total_draws: Decimal                    # totdraw
    total_accrued_interest: Decimal         # totaccr
    total_interest_paid_monthly: Decimal    # totio

    # Cap
    cap_amount: Decimal                     # capamt
    shortfall_months: int                   # short
    cap_reached_month: int | None           # capout (None = "Not reached")
    cap_needed_pct: Decimal                 # capneed
    commitment_cltv: Decimal                # first-lien LTV + cap

    # End of funding
    second_lien_balance: Decimal            # bal
    cap_room: Decimal                       # room
    first_lien_balance_at_end: Decimal      # bal1
    total_debt_at_end: Decimal              # debt
    payment_without_second_after: Decimal   # baseafter

    # Option A: keep the first, amortize the second
    option_a_payment: Decimal               # pmt2
    option_a_total_payment: Decimal         # withprod
    option_a_total_interest: Decimal        # totint

    # Option B: refinance both into one new first
    option_b_new_loan: Decimal              # newloan
    option_b_payment: Decimal               # newpi (remaining first-lien term)
    option_b_payment_change: Decimal        # chg
    option_b_payment_change_pct: Decimal    # chgp
    option_b_payment_full_term: Decimal     # newpi30
    option_b_payment_change_full_term: Decimal  # chg30
    option_b_breakeven_rate: Decimal | None     # be
    option_b_breakeven_rate_drop: Decimal | None  # bedrop
    option_b_ltv: Decimal                   # refiltv
    option_b_pmi_required: bool             # pmiflag
    option_b_pmi_monthly: Decimal           # pmi
    option_b_payment_change_with_pmi: Decimal   # chgpmi
    option_b_breakeven_rate_with_pmi: Decimal | None  # bepmi
    option_b_breakeven_rate_drop_with_pmi: Decimal | None  # bedroppmi
    option_b_closing_costs: Decimal         # closepct × new loan, display only

    years: list[YearRow]
    months: list[MonthRow]


class RiskFactor(BaseModel):
    name: str
    value: str
    points: int     # points deducted (0 = no penalty)


class RiskAssessment(BaseModel):
    score: int
    band: RiskBand
    dti_during_funding: Decimal   # back-end DTI on the year-1 payment
    dti_after_funding: Decimal    # back-end DTI on the Option A payment
    factors: list[RiskFactor]


# ── API envelope ───────────────────────────────────────────────────────────────

class ResponseMeta(BaseModel):
    request_id: str
    calc_version: str
    tenant_id: str
    timestamp: datetime


class ErrorDetail(BaseModel):
    code: str
    field: str | None = None
    message: str


class ApiResponse(BaseModel):
    success: bool
    data: Any = None
    meta: ResponseMeta
    errors: list[ErrorDetail] = Field(default_factory=list)


# ── Calculate / transaction DTOs ───────────────────────────────────────────────

class CalculateRequest(BaseModel):
    tenant_id: str
    scenario: ScenarioInput


class CalculateResponse(BaseModel):
    scenario: ScenarioResult


class InitiateRequest(BaseModel):
    tenant_id: str
    borrower_ref: str = Field(description="CU-side reference, never a name or SSN")
    scenario: ScenarioInput
    borrower: UnderwritingProfile
    lo_email: str | None = Field(
        default=None,
        description="Loan officer email, used once to send a notification and never stored",
    )


class InitiateResponse(BaseModel):
    transaction_id: str
    transaction_token: str
    results_url: str
    avg_monthly_relief: Decimal
    payment_with_second_year1: Decimal
    payment_without_second_year1: Decimal
    risk_band: RiskBand


class TransactionResponse(BaseModel):
    transaction_id: str
    tenant_id: str
    borrower_ref: str
    status: str
    expires_at: datetime
    scenario_input: ScenarioInput
    result: ScenarioResult
    risk: RiskAssessment


# ── Chat DTOs ──────────────────────────────────────────────────────────────────

class ChatMessageRequest(BaseModel):
    content: str = Field(min_length=1, max_length=2000)


class ChatMessageResponse(BaseModel):
    id: str
    role: str   # "user" | "assistant"
    content: str
    created_at: datetime


class ChatHistoryResponse(BaseModel):
    transaction_id: str
    messages: list[ChatMessageResponse]


class SuggestionsResponse(BaseModel):
    transaction_id: str
    suggestions: list[str]  # 3 question strings
