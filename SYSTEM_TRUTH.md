# SYSTEM_TRUTH.md — RBridge infrastructure and locked decisions

## Product
Taxes & Insurance Second Lien. Purchase borrowers put 20% down (first lien ≤ 80% of price). A second lien,
capped at 10% of price including accrued interest, pays property tax, special assessments and insurance for
the funding period (60 months default). Combined commitment 90%. Exits: Option A amortize the second over
240 months; Option B refinance into one new first (PMI above 80% LTV).

iTSMOR was dissolved; RBridge is a fresh codebase. The old HELOC model (Liberator / Liberator Plus) is retired.

## Locked decisions
- **Calc engine v2.0.0** (`backend/core/calc_engine.py`): Decimal at 28 digits, outputs quantized to 6 dp.
  Interest on beginning-of-month balance, then draw. Cap rule: draws limited to
  `cap / (1+r)^(n−m) − balance`, so principal + all future accrued interest ends ≤ cap; uncovered T&I is
  paid by the borrower. Break-even rates by fixed 100-step bisection over [0, 30%].
- **Golden tests**: all 156 values of the partner Dev Spec cases must match (`tests/unit/test_calc_engine.py`).
- **Assumptions to confirm with the partner**: `max_tax_rate` (1.7%) is treated as an input limit on the
  property tax rate; `closing_cost_pct` is display-only (not rolled into the refinance); unfunded special
  assessments are paid by the borrower but still count in "payment without the second".
- **Risk score** (`core/risk.py`): deterministic, factors = credit, DTI after funding, payment step-up at end of
  funding, cap shortfall, variable income. No geography or demographic inputs.
- **Underwriting rule**: DTI is tested on the payment after funding (Option A), max 55%.
- **No PII**: RBridge stores only scenario inputs, underwriting numbers and a CU-side `borrower_ref`.
  LO email is used once and never stored.
- **LLMs** only explain stored results in chat. Never in the calc or eligibility path.
- **Multi-tenant**: every transaction, audit row and chat message carries `tenant_id`.

## Environment
| Var | Where | Purpose |
|---|---|---|
| `API_PORT` | backend | default 8000 |
| `FRONTEND_URL` | backend | comma-separated CORS origins; first is used for links |
| `DATABASE_URL` | backend | default `sqlite+aiosqlite:///./rbridge_dev.db`; Postgres in prod |
| `RBRIDGE_JWT_SECRET` / `_ALGORITHM` / `_TTL_HOURS` | backend | transaction link tokens |
| `RESEND_API_KEY`, `RESEND_FROM`, `RESEND_LOG` | backend | LO notification email |
| `OPENROUTER_API_KEY` | backend | results chat |
| `DISABLE_NON_ESSENTIAL_MODEL_CALLS` | backend | 1 = canned chat replies |
| `BACKEND_URL` | frontend | proxy + server components |
| `ATTOM_API_KEY` | frontend (server) | property tax lookup |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | frontend | lookup map |

## Database
Tables (`backend/db/models.py`, migration `alembic/versions/b9cea0833708_initial_schema.py`):
- `transactions` — id, tenant_id, borrower_ref, status, calc_version, inputs_snapshot {scenario, borrower},
  calc_result {result, risk}, created_at, expires_at, closed_at
- `audit_log` — tenant_id, transaction_id, event, calc_version, request_id, timestamp, details (no PII)
- `chat_messages` — transaction_id, tenant_id, role, content, created_at

## Hosting (planned)
Backend on Railway, frontend on Vercel. Local only for now.

## Planned — not built
- Production auth / RBAC, LOS adapters, CU onboarding, audit exports
- Project dashboard page (the iTSMOR /project page was not carried over)
