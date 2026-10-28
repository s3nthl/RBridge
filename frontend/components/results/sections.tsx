import Link from 'next/link'
import type { ReactNode } from 'react'
import { ButtonLink, Card, DisplayHeading, Stat } from '@/components/ui/primitives'
import { money, num, pct, points, signedMoney } from '@/lib/format'
import type { RiskAssessment, ScenarioResult } from '@/types'

function SectionTitle({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return (
    <div className="mb-6 max-w-2xl">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-ink-3">{eyebrow}</p>
      <DisplayHeading className="mt-2 text-3xl">{title}</DisplayHeading>
      {children && <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{children}</p>}
    </div>
  )
}

/* ── Hero ───────────────────────────────────────────────────── */

export function PaymentHero({ r }: { r: ScenarioResult }) {
  const y1 = r.years[0]
  const without = num(y1.payment_without_second)
  const withSecond = num(y1.payment_with_second)
  const ratio = withSecond / without

  return (
    <Card className="overflow-hidden">
      <div className="grid md:grid-cols-[1.1fr_1fr]">
        <div className="space-y-6 p-6 sm:p-8">
          <div>
            <p className="text-sm text-ink-2">Year-1 monthly relief</p>
            <p data-testid="hero-relief" className="num mt-1 text-6xl font-semibold tracking-tight text-accent">
              {money(y1.relief_monthly)}
            </p>
            <p className="mt-2 text-sm text-ink-2">
              {pct(y1.relief_pct)} lower in year 1 · average{' '}
              <strong data-testid="avg-relief" className="num font-medium text-ink">{money(r.avg_monthly_relief)}</strong>
              /mo ({pct(r.avg_relief_pct)}) across funding
            </p>
          </div>
          <div className="space-y-3" aria-hidden="true">
            <div>
              <div className="mb-1 flex justify-between text-xs text-ink-3"><span>Without the second</span><span className="num">{money(without)}</span></div>
              <div className="h-3 rounded-full bg-ink-3/40" />
            </div>
            <div>
              <div className="mb-1 flex justify-between text-xs text-ink-3"><span>With RBridge</span><span className="num">{money(withSecond)}</span></div>
              <div className="h-3 rounded-full bg-accent" style={{ width: `${Math.max(ratio * 100, 4)}%` }} />
            </div>
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-6 border-t border-line bg-sunken/60 p-6 sm:p-8 md:border-l md:border-t-0">
          <div>
            <dt className="text-xs uppercase tracking-[0.12em] text-ink-3">Without the second</dt>
            <dd className="num mt-1 text-2xl font-semibold text-ink">{money(without)}</dd>
            <dd className="text-xs text-ink-3">P&amp;I + taxes &amp; insurance</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.12em] text-ink-3">With the second</dt>
            <dd data-testid="payment-with-second" className="num mt-1 text-2xl font-semibold text-ink">{money(withSecond)}</dd>
            <dd className="text-xs text-ink-3">{num(r.total_interest_paid_monthly) > 0 ? 'P&I + second-lien interest' : 'First-lien P&I only'}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.12em] text-ink-3">First lien</dt>
            <dd className="num mt-1 text-lg font-medium text-ink">{money(r.first_lien_amount)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.12em] text-ink-3">Funding period</dt>
            <dd className="num mt-1 text-lg font-medium text-ink">{r.months.length} months</dd>
          </div>
        </dl>
      </div>
    </Card>
  )
}

/* ── Year table ─────────────────────────────────────────────── */

export function YearTable({ r }: { r: ScenarioResult }) {
  return (
    <section aria-label="Year by year">
      <SectionTitle eyebrow="During funding" title="Year by year">
        Taxes and insurance grow each year; the second lien keeps paying them, so relief grows too.
      </SectionTitle>
      <Card className="overflow-x-auto">
        <table data-testid="year-table" className="num w-full min-w-[34rem] text-sm">
          <caption className="sr-only">Monthly payment by year of funding</caption>
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-[0.1em] text-ink-3">
              <th scope="col" className="px-5 py-3 font-medium">Year</th>
              <th scope="col" className="px-5 py-3 text-right font-medium">Taxes &amp; ins.</th>
              <th scope="col" className="px-5 py-3 text-right font-medium">Without the second</th>
              <th scope="col" className="px-5 py-3 text-right font-medium">With the second</th>
              <th scope="col" className="px-5 py-3 text-right font-medium">Relief</th>
              <th scope="col" className="px-5 py-3 text-right font-medium">Relief %</th>
            </tr>
          </thead>
          <tbody>
            {r.years.map(y => (
              <tr key={y.year} className="border-b border-line/60 last:border-0">
                <th scope="row" className="px-5 py-3 text-left font-medium text-ink">{y.year}</th>
                <td className="px-5 py-3 text-right text-ink-2">{money(y.ti_monthly)}</td>
                <td className="px-5 py-3 text-right text-ink-2">{money(y.payment_without_second)}</td>
                <td className="px-5 py-3 text-right text-ink">{money(y.payment_with_second)}</td>
                <td className="px-5 py-3 text-right font-semibold text-accent">{money(y.relief_monthly)}</td>
                <td className="px-5 py-3 text-right text-ink-2">{pct(y.relief_pct)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </section>
  )
}

/* ── End of funding ─────────────────────────────────────────── */

export function FundingSummary({ r, purchasePrice }: { r: ScenarioResult; purchasePrice: number }) {
  const capped = r.cap_reached_month !== null
  return (
    <div className="grid grid-cols-2 gap-6 lg:grid-cols-1">
      <Stat label="Balance at end" value={money(r.second_lien_balance)} tone="steel" testId="end-balance"
        note={`${pct(num(r.second_lien_balance) / purchasePrice)} of price`} />
      <Stat label="Accrued interest" value={money(r.total_accrued_interest)}
        note={num(r.total_interest_paid_monthly) > 0 ? `${money(r.total_interest_paid_monthly)} paid monthly instead` : 'Added to the balance'} />
      <Stat label="Room under cap" value={money(r.cap_room)} tone={capped ? 'warn' : 'good'}
        note={`Cap ${money(r.cap_amount)}`} />
      <Stat label="Cap needed" value={pct(r.cap_needed_pct)} tone={capped ? 'warn' : 'ink'}
        note={capped
          ? `Cap reached month ${r.cap_reached_month}; borrower covers part of T&I for ${r.shortfall_months} month${r.shortfall_months === 1 ? '' : 's'}`
          : 'To fund every month in full'} />
    </div>
  )
}

/* ── Exit options ───────────────────────────────────────────── */

function Row({ label, value, strong = false, testId }: { label: string; value: ReactNode; strong?: boolean; testId?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line/60 py-2.5 last:border-0">
      <dt className="text-sm text-ink-2">{label}</dt>
      <dd data-testid={testId} className={`num text-right text-sm ${strong ? 'font-semibold text-ink' : 'text-ink'}`}>{value}</dd>
    </div>
  )
}

function breakeven(rate: string | null, drop: string | null): string {
  if (rate === null || drop === null) return 'No rate breaks even'
  return `${pct(rate, 2)} (${points(drop)} lower)`
}

export function ExitOptions({ r }: { r: ScenarioResult }) {
  return (
    <section aria-label="Exit options">
      <SectionTitle eyebrow="After funding" title="Two ways out">
        When funding ends the borrower either keeps the first and pays down the second, or refinances both into one
        new first.
      </SectionTitle>
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6 sm:p-7" data-testid="option-a">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-steel">Option A</p>
          <h3 className="mt-1 text-lg font-semibold text-ink">Keep the first, amortize the second</h3>
          <p className="num mt-4 text-4xl font-semibold tracking-tight text-ink">{money(r.option_a_total_payment)}<span className="text-base font-normal text-ink-3">/mo</span></p>
          <p className="mt-1 text-sm text-ink-2">Total payment after funding</p>
          <dl className="mt-5">
            <Row label="Second-lien payment" value={`${money(r.option_a_payment)}/mo`} strong />
            <Row label="Without the second" value={`${money(r.payment_without_second_after)}/mo`} />
            <Row label="Second-lien interest, all in" value={money(r.option_a_total_interest)} />
          </dl>
        </Card>

        <Card className="p-6 sm:p-7" data-testid="option-b">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-accent">Option B</p>
          <h3 className="mt-1 text-lg font-semibold text-ink">Refinance into one new first</h3>
          <p className="num mt-4 text-4xl font-semibold tracking-tight text-ink">{money(r.option_b_new_loan)}</p>
          <p className="mt-1 text-sm text-ink-2">
            New first · <span className="num">{pct(r.option_b_ltv)}</span> of price
            {r.option_b_pmi_required && <span className="ml-2 rounded-full bg-warn-soft px-2 py-0.5 text-xs font-medium text-warn">PMI applies</span>}
          </p>
          <dl className="mt-5">
            <Row label="Payment, remaining term" value={`${money(r.option_b_payment)}/mo (${signedMoney(r.option_b_payment_change)})`} strong />
            <Row label="Payment, new 30-year" value={`${money(r.option_b_payment_full_term)}/mo (${signedMoney(r.option_b_payment_change_full_term)})`} />
            <Row label="Mortgage insurance" value={r.option_b_pmi_required ? `${money(r.option_b_pmi_monthly)}/mo` : 'Not required'} />
            <Row label="Break-even rate" value={breakeven(r.option_b_breakeven_rate, r.option_b_breakeven_rate_drop)} testId="breakeven" />
            {r.option_b_pmi_required && (
              <Row label="Break-even with PMI" value={breakeven(r.option_b_breakeven_rate_with_pmi, r.option_b_breakeven_rate_drop_with_pmi)} />
            )}
            <Row label="Closing costs (est.)" value={money(r.option_b_closing_costs)} />
          </dl>
        </Card>
      </div>
    </section>
  )
}

/* ── Underwriting ───────────────────────────────────────────── */

const FACTOR_LABELS: Record<string, string> = {
  credit_score: 'Credit score',
  dti_after_funding: 'DTI after funding',
  payment_step_up: 'Payment step-up at end of funding',
  cap_shortfall_months: 'Months the cap fell short',
  employment_type: 'Employment type',
}

export function Underwriting({ risk, r }: { risk: RiskAssessment; r: ScenarioResult }) {
  return (
    <section aria-label="Underwriting">
      <SectionTitle eyebrow="Underwriting" title="Tested on the payment after funding">
        Debt-to-income is checked on the Option A payment, not just the lower payment during funding.
      </SectionTitle>
      <Card className="grid gap-8 p-6 sm:p-8 md:grid-cols-[1fr_1.4fr]">
        <div className="grid grid-cols-2 gap-6 md:grid-cols-1">
          <Stat label="DTI during funding" value={pct(risk.dti_during_funding)} note={`On ${money(r.years[0].payment_with_second)}/mo`} />
          <Stat label="DTI after funding" value={pct(risk.dti_after_funding)} tone="steel" note={`On ${money(r.option_a_total_payment)}/mo`} />
        </div>
        <div>
          <p className="mb-3 text-sm font-medium text-ink">Risk score {risk.score}/100 — points deducted</p>
          <ul data-testid="risk-factors" className="divide-y divide-line/60">
            {risk.factors.map(f => (
              <li key={f.name} className="flex items-center justify-between gap-4 py-2.5 text-sm">
                <span className="text-ink-2">{FACTOR_LABELS[f.name] ?? f.name} <span className="num text-ink">{f.value}</span></span>
                <span className={`num font-medium ${f.points > 0 ? 'text-warn' : 'text-ink-3'}`}>{f.points > 0 ? `−${f.points}` : '0'}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-ink-3">Deterministic and auditable. No geography or demographic inputs.</p>
        </div>
      </Card>
    </section>
  )
}

/* ── Chat CTA + expired ─────────────────────────────────────── */

export function ChatCTA({ token }: { token: string }) {
  return (
    <div className="flex flex-col items-start justify-between gap-5 rounded-2xl bg-ink p-6 text-paper shadow-card sm:flex-row sm:items-center sm:p-8">
      <div>
        <p className="font-display text-2xl text-paper">Questions about these numbers?</p>
        <p className="mt-1 text-sm text-paper/70">Ask the RBridge analyst. It explains this result; it never makes loan decisions.</p>
      </div>
      <Link
        href={`/chat/${token}`}
        data-testid="chat-cta"
        className="inline-flex shrink-0 items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-ink hover:bg-accent-hover"
      >
        Open analyst chat <span aria-hidden="true">→</span>
      </Link>
    </div>
  )
}

export function ExpiredState({ title = 'This link has expired', body }: { title?: string; body?: string }) {
  return (
    <div data-testid="expired-state" className="mx-auto max-w-lg px-4 py-24 text-center">
      <div className="mx-auto mb-6 grid h-12 w-12 place-items-center rounded-full bg-sunken text-ink-2" aria-hidden="true">
        <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
          <circle cx="10" cy="10" r="7.5" /><path d="M10 6v4.5l3 1.8" strokeLinecap="round" />
        </svg>
      </div>
      <DisplayHeading as="h1" className="text-4xl">{title}</DisplayHeading>
      <p className="mt-3 text-ink-2">
        {body ?? 'Result links last 72 hours and stop working once the loan officer closes the session. Run the scenario again to get a new one.'}
      </p>
      <ButtonLink href="/calculate" className="mt-8">Run a new scenario</ButtonLink>
    </div>
  )
}
