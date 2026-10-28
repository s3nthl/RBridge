from decimal import Decimal

# ── Engine version ─────────────────────────────────────────────────────────────
# Bump on any change to calc, validation or risk logic. Stored with every
# scenario so results stay reproducible.
CALC_ENGINE_VERSION = "2.0.0"

# ── Program terms (Taxes & Insurance Second Lien) ──────────────────────────────
# Purchase borrowers put 20% down, so the first lien is at most 80% of price.
MAX_FIRST_LIEN_LTV = Decimal("0.80")
# Second lien: principal plus accrued interest stays inside 10% of price.
MAX_SECOND_LIEN_CAP_PCT = Decimal("0.10")
# Combined commitment at origination.
MAX_COMMITMENT_CLTV = Decimal("0.90")
# A new first above this LTV carries mortgage insurance.
PMI_LTV_THRESHOLD = Decimal("0.80")

# ── Program defaults (placeholders from the partner summary) ───────────────────
DEFAULT_FIRST_LIEN_LTV = Decimal("0.80")
DEFAULT_FIRST_LIEN_TERM_MONTHS = 360
DEFAULT_FUNDING_MONTHS = 60
DEFAULT_AMORT_MONTHS = 240
DEFAULT_SECOND_LIEN_RATE = Decimal("0.08")
DEFAULT_TAX_GROWTH = Decimal("0.03")
DEFAULT_SPECIAL_ASSESSMENT_GROWTH = Decimal("0.02")
DEFAULT_INSURANCE_GROWTH = Decimal("0.05")
DEFAULT_REFI_TERM_MONTHS = 360
DEFAULT_PMI_RATE = Decimal("0.005")
DEFAULT_CLOSING_COST_PCT = Decimal("0.01")
DEFAULT_MAX_TAX_RATE = Decimal("0.017")

# ── Guardrails ─────────────────────────────────────────────────────────────────
# Hard limits. Any input that violates these is rejected before reaching the
# calc engine. Never change without a versioned rule update.
MIN_CREDIT_SCORE = 580
# Back-end DTI is tested on the payment AFTER the funding period ends.
MAX_ECONOMIC_DTI = Decimal("0.55")
MAX_PURCHASE_PRICE = Decimal("2000000")
MIN_ANNUAL_INCOME = Decimal("24000")
MAX_TERM_MONTHS = 360
MIN_FUNDING_MONTHS = 12
MAX_FUNDING_MONTHS = 120

# ── Risk score bands ───────────────────────────────────────────────────────────
RISK_BAND_LOW = "Low"            # score >= 75
RISK_BAND_MODERATE = "Moderate"  # score >= 50
RISK_BAND_ELEVATED = "Elevated"  # score >= 25
RISK_BAND_HIGH = "High"          # score < 25

# ── Employment types ───────────────────────────────────────────────────────────
EMPLOYMENT_TYPES = ("W2", "1099", "self_employed", "retired")
