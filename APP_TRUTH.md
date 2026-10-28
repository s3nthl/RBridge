# APP_TRUTH.md — RBridge frontend

Next.js 16 App Router, Tailwind v4, `frontend/`. Design tokens in `app/globals.css` (paper / ink / bridge-orange
accent / steel, light + dark via `prefers-color-scheme` and `data-theme`). Fonts: Inter Tight (body),
Instrument Serif (display), JetBrains Mono (numeric). All numbers come from the backend; the frontend never
reimplements the formula (the landing page's Portland figures are a static snapshot of engine output).

## Built

### Routes
| Route | File | What it does |
|---|---|---|
| `/` | `app/page.tsx` | Landing: hero, how it works (`#how-it-works`), Portland example + balance chart, Option A/B, for credit unions, CTA |
| `/calculate` | `app/calculate/page.tsx` | Scenario form with sample borrowers; prefill from query params; `initiate` → redirect to results |
| `/results/[token]` | `app/results/[token]/page.tsx` | Server-rendered result: relief hero, year table, balance-vs-cap chart, end of funding, Option A vs B, underwriting/risk, chat CTA; expired state |
| `/chat/[token]` | `app/chat/[token]/page.tsx` | Analyst chat with suggestions, context sidebar, end session; closed state |
| `/simulator` | `app/simulator/page.tsx` | Live sliders → debounced `/calculate`; "Use these numbers" → `/calculate` |
| `/lookup` | `app/lookup/page.tsx` | Address → tax rate, annual tax, insurance estimate, T&I/mo, max-tax flag; map; CTA → `/calculate` |
| `/faq` | `app/faq/page.tsx` | 12 program questions, native details/summary accordion |

### Route handlers
- `app/api/proxy/[...path]` — forwards browser calls to `BACKEND_URL`
- `app/api/lookup/geocode` — address autocomplete
- `app/api/lookup/property` — ATTOM property tax + valuation (server-side key)
- `app/api/lookup/rates` — Freddie Mac 30-year rate and FRED prime rate, cached

### Shared
- `components/ui/` — `Logo`/`BridgeMark`, `SiteHeader` (mobile menu), `SiteFooter`, `ThemeToggle`,
  `primitives.tsx` (Container, Eyebrow, DisplayHeading, Card, Button, ButtonLink, Stat, RiskPill, ErrorList,
  NumberField, Toggle)
- `lib/api.ts` (typed client), `lib/format.ts` (money/pct/points), `lib/scenario.ts` (program defaults,
  Portland scenario, fictional sample borrowers), `lib/lookup/state-data.ts`
- `types/index.ts` mirrors backend schemas

### Feature components
`components/landing/*`, `components/calculate/*`, `components/results/*`, `components/chat/*`,
`components/simulator/*`, `components/lookup/*`, `components/faq/*`

### Query params (shared by /calculate and /simulator)
`purchase_price` (dollars), `tax_rate` (decimal), `insurance_annual` (dollars), `first_lien_rate` (decimal),
plus simulator extras.

### Playwright (`tests/e2e/`, 29 tests)
landing, faq, calculate-flow, validation-errors, results-page, chat-page, simulator, lookup (lookup mocks its
network). Needs backend + frontend running.

## Planned — not built
- Project dashboard (`/project`) — iTSMOR's version was not carried over
- Borrower-facing portal, CU admin dashboard
