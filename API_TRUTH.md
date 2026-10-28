# API_TRUTH.md — RBridge API

Base path `/api/v1`. Every response is the envelope:

```json
{ "success": true, "data": {}, "meta": { "request_id": "", "calc_version": "2.0.0", "tenant_id": "", "timestamp": "" }, "errors": [] }
```

Errors are `{ code, field, message }`. Token failures on GET routes return HTTP 401/404/410 with `{ "detail": "..." }`.
Decimals are serialized as strings with 6 decimal places.

## Built

### GET /health
`{ "status": "ok", "calc_version": "2.0.0" }`

### POST /calculate
Stateless scenario run (no borrower data, audited, nothing else persisted).

Request: `{ tenant_id, scenario: ScenarioInput }` → data `{ scenario: ScenarioResult }`.
Rejects with `validate_scenario` errors.

### POST /transactions/initiate
Request:
```
{ tenant_id, borrower_ref, scenario: ScenarioInput, borrower: UnderwritingProfile, lo_email? }
```
Runs validation → engine → risk → post-funding DTI check, persists the transaction, emails the LO if
`lo_email` (never stored). data:
```
{ transaction_id, transaction_token, results_url, avg_monthly_relief,
  payment_with_second_year1, payment_without_second_year1, risk_band }
```

### GET /transactions/{token}
data: `{ transaction_id, tenant_id, borrower_ref, status, expires_at, scenario_input, result: ScenarioResult, risk: RiskAssessment }`

### POST /transactions/{token}/close
data: `{ closed: true }`. 409 if already closed. Later fetches return 410.

### GET /chat/{token}/messages · POST /chat/{token}/messages · GET /chat/{token}/suggestions
LO chat about one saved result. POST body `{ content }` (1–2000 chars) → `ChatMessageResponse`.
Suggestions → `{ transaction_id, suggestions: [3 strings] }`. With `DISABLE_NON_ESSENTIAL_MODEL_CALLS=1`
replies are a canned "Dev mode" string. The AI only explains stored numbers.

## Schemas (backend/core/schemas.py)

**ScenarioInput** (Dev Spec key in brackets; defaults from the partner summary)
`purchase_price` [price] · `first_lien_ltv`=0.80 [ltv] · `first_lien_rate` [r1] · `first_lien_term_months`=360 [term1] ·
`tax_rate` [tax] · `tax_growth`=0.03 [gT] · `special_assessment_rate`=0 [cfd] · `special_assessment_growth`=0.02 [gC] ·
`fund_special_assessments`=true [fundcfd] · `insurance_annual` [ins] · `insurance_growth`=0.05 [gI] ·
`second_lien_cap_pct`=0.10 [cap] · `second_lien_rate`=0.08 [r2] · `accrue_interest`=true [accrue] ·
`funding_months`=60 [defer] · `amort_months`=240 [amort] · `refi_rate` [rnew] · `refi_term_months`=360 [term30] ·
`pmi_rate`=0.005 [pmirate] · `closing_cost_pct`=0.01 [closepct] · `max_tax_rate`=0.017 [maxtax]

**UnderwritingProfile**: `income`, `monthly_debts`, `credit_score`, `employment_type` (W2 | 1099 | self_employed | retired)

**ScenarioResult**: every Dev Spec output (mapping in `backend/tests/unit/test_calc_engine.py`), plus
`commitment_cltv`, `option_b_closing_costs`, `years[]` (year, ti_monthly, payment_without_second,
payment_with_second, relief_monthly, relief_pct) and `months[]` (month, ti, draw, interest, interest_paid,
balance, borrower_payment). `cap_reached_month` is null when not reached; break-even rates are null when no
rate breaks even.

**RiskAssessment**: `score` 0–100, `band` (Low | Moderate | Elevated | High), `dti_during_funding`,
`dti_after_funding`, `factors[]` ({name, value, points}).

## Error codes
PURCHASE_PRICE_TOO_HIGH · DOWN_PAYMENT_TOO_LOW · SECOND_LIEN_CAP_TOO_HIGH · COMMITMENT_CLTV_TOO_HIGH ·
TAX_RATE_ABOVE_MAX · TERM_TOO_LONG · FUNDING_PERIOD_OUT_OF_RANGE · FUNDING_PERIOD_TOO_LONG ·
INCOME_TOO_LOW · CREDIT_SCORE_TOO_LOW · DTI_TOO_HIGH

## Planned — not built
- API-key auth for LOS integrations, JWT user sessions, RBAC
- LOS adapters (MeridianLink first)
- Audit export endpoint
