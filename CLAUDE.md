# CLAUDE.md — RBridge

Read this before writing code. RBridge replaces iTSMOR (dissolved). Never use the names iTSMOR, LowMo or
Liberator, and do not reintroduce the old HELOC model.

## 0. Before any task
1. `bash scripts/preflight.sh` — fix failures first. Start the stack with `bash scripts/dev.sh`.
2. Read the truth files. If it is not listed as Built, it does not exist.

| File | Governs |
|---|---|
| `SYSTEM_TRUTH.md` | product terms, locked decisions, environment, database |
| `API_TRUTH.md` | endpoints and exact request/response shapes |
| `APP_TRUTH.md` | frontend routes and components |

Update the relevant truth file in the same commit as the code change.

## 1. What RBridge is
A Taxes & Insurance Second Lien program for credit unions (B2B2C). Purchase borrowers put 20% down. A second
lien, capped at 10% of price including accrued interest, pays property tax, special assessments and insurance
during a funding period (60 months). The borrower pays first-lien P&I only. After funding:
Option A amortizes the second over 20 years; Option B refinances both into a new first (PMI above 80% LTV).

RBridge is a calculation and scenario engine. It is not a lender, not a credit decision engine, and never
stores borrower PII.

## 2. The calc model (backend/core/calc_engine.py, v2.0.0)
Spec source: the partner Program Summary + Dev Spec test cases (`backend/tests/fixtures/second_lien_test_cases.json`).

```
first lien      L = price × ltv;  P&I = PMT(r1/12, term1, L)
T&I (year y)    price×tax×(1+gT)^y + price×cfd×(1+gC)^y + ins×(1+gI)^y   (÷12 per month)
each month m    interest = balance × r2/12  (beginning balance)
                accrue:  balance += interest; draw ≤ cap/(1+r2/12)^(n−m) − balance
                pay:     borrower pays interest;  draw ≤ cap − balance
                draw = min(funded T&I, limit);  uncovered T&I is paid by the borrower
relief          draw − interest paid
Option A        PMT(r2/12, amort, balance); total = P&I + T&I(year n/12) + that payment
Option B        new loan = first-lien balance at n + second balance;
                payment on (term1 − n) and on term30; break-even rate by bisection; PMI if LTV > 80%
```

All 156 golden values must pass. Any formula change bumps `CALC_ENGINE_VERSION` and adds test cases.

## 3. Engineering rules
- **Determinism**: same input, same output. Decimal only, no floats in the engine, no randomness.
- **No LLMs in the calc or eligibility path.** The LO chat only explains stored numbers.
- **Auditability**: every calculate / initiate / fetch / close / chat writes an audit row with tenant_id,
  request_id and calc_version. Transactions store the input snapshot and full output.
- **Fail loudly**: validation returns structured `{code, field, message}` errors before the engine runs.
- **Multi-tenant**: `tenant_id` on every record.
- **One source of numbers**: the frontend never reimplements the formula; it calls `/calculate`.
- **No PII**: only `borrower_ref` (a CU-side reference) plus underwriting numbers.
- **Fair lending**: the risk score uses no geography or demographic inputs.
- Constants over magic numbers (`core/constants.py`); types everywhere; comments explain why.

## 4. Guardrails (core/constants.py, core/validation.py)
```
MAX_FIRST_LIEN_LTV      0.80     MAX_SECOND_LIEN_CAP_PCT  0.10    MAX_COMMITMENT_CLTV  0.90
max_tax_rate (input)    0.017    MIN_CREDIT_SCORE         580     MIN_ANNUAL_INCOME    24,000
MAX_PURCHASE_PRICE      2,000,000  MAX_TERM_MONTHS        360     funding months       12–120
MAX_ECONOMIC_DTI        0.55 (tested on the payment AFTER funding)
```

## 5. Frontend
Next.js 16 App Router + Tailwind v4. Read `frontend/node_modules/next/dist/docs/` before using a Next API —
this version differs from older training data. Design tokens live in `app/globals.css` (paper / ink /
bridge-orange accent, light + dark); shared pieces in `components/ui/`. Browser calls go through
`/api/proxy` (`lib/api.ts`). Every UI change ships with a Playwright test in `tests/e2e/`
(never `waitForTimeout`).

## 6. Done means
Tests pass (`backend: pytest`, `frontend: npx playwright test`), validation and structured errors in place,
audit row written, tenant_id present, calc_version stored, truth files updated, no secrets in code.

## 7. Git
Branches `feature/`, `fix/`, `chore/`. Imperative commit messages. No direct commits to `main` once the
initial scaffold lands; no force-push; no debug prints or commented-out code.
