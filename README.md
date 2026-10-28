# RBridge

A second lien that pays a borrower's property taxes and homeowner insurance during the first years of a
mortgage. During funding the borrower pays first-lien principal and interest only; second-lien interest
accrues inside a cap. After funding the borrower either amortizes the second (Option A) or refinances
both liens into one new first (Option B).

RBridge is the calculation and scenario platform credit unions use to run that program. It never stores
borrower PII.

## Layout

```
backend/    FastAPI + SQLAlchemy. Calc engine v2.0.0, risk score, transactions, LO chat.
frontend/   Next.js 16 (App Router, Tailwind v4). Landing, calculator, results, simulator, lookup, FAQ, chat.
scripts/    dev.sh (start both), preflight.sh (environment check)
```

## Run locally

```bash
# one-time
cd backend && uv venv && uv pip install -r requirements.txt pytest pytest-asyncio httpx && cd ..
cd frontend && npm install && npx playwright install chromium && cd ..
cp backend/.env.example backend/.env.local     # defaults work: SQLite, AI off
cp frontend/.env.example frontend/.env.local   # add ATTOM / Mapbox keys for property lookup

bash scripts/dev.sh        # backend :8000, frontend :3000
bash scripts/preflight.sh  # verify
```

## Tests

```bash
cd backend && .venv/bin/python -m pytest          # engine golden tests + API
cd frontend && npx playwright test                 # e2e, needs both servers running
```

The engine is checked against every value in the partner Dev Spec test cases
(`backend/tests/fixtures/second_lien_test_cases.json`).

## Deploy

- Backend → Railway (`backend/railway.toml`, runs `alembic upgrade head` then uvicorn).
  Set `DATABASE_URL`, `FRONTEND_URL`, `RBRIDGE_JWT_SECRET`, and optionally `RESEND_API_KEY`, `OPENROUTER_API_KEY`.
- Frontend → Vercel (root `frontend/`). Set `BACKEND_URL`, `ATTOM_API_KEY`, `NEXT_PUBLIC_MAPBOX_TOKEN`.

See `SYSTEM_TRUTH.md`, `API_TRUTH.md` and `APP_TRUTH.md` for what is built.
