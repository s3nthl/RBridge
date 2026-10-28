import type { Metadata } from 'next'
import BalanceChart from '@/components/results/BalanceChart'
import {
  ChatCTA,
  ExitOptions,
  ExpiredState,
  FundingSummary,
  PaymentHero,
  Underwriting,
  YearTable,
} from '@/components/results/sections'
import { Card, Container, DisplayHeading, Eyebrow, RiskPill } from '@/components/ui/primitives'
import { fetchTransaction } from '@/lib/api'
import { num } from '@/lib/format'

export const metadata: Metadata = { title: 'Scenario result' }

export default async function ResultsPage(props: PageProps<'/results/[token]'>) {
  const { token } = await props.params
  const envelope = await fetchTransaction(token)
  const txn = envelope.success ? envelope.data : null

  if (!txn || txn.status === 'closed') {
    return <ExpiredState />
  }

  const { result: r, risk } = txn
  const purchasePrice = num(txn.scenario_input.purchase_price as string)
  const expires = new Date(txn.expires_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <Container className="space-y-14 py-12 sm:py-16">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>Application #{txn.borrower_ref}</Eyebrow>
          <DisplayHeading as="h1" className="mt-3 text-4xl sm:text-5xl">Scenario result</DisplayHeading>
          <p className="mt-2 text-sm text-ink-3">
            Engine v{r.calc_version} · link expires {expires}
          </p>
        </div>
        <RiskPill band={risk.band} score={risk.score} />
      </header>

      <PaymentHero r={r} />

      <YearTable r={r} />

      <section aria-label="Second-lien balance">
        <div className="mb-6 max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-ink-3">End of funding</p>
          <DisplayHeading className="mt-2 text-3xl">How the second lien builds</DisplayHeading>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-2">
            Each month the second pays taxes and insurance, and interest is charged on what has been drawn. The balance,
            interest included, stays inside the cap.
          </p>
        </div>
        <Card className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1fr_15rem]">
          <BalanceChart months={r.months} cap={num(r.cap_amount)} capReachedMonth={r.cap_reached_month} />
          <FundingSummary r={r} purchasePrice={purchasePrice} />
        </Card>
      </section>

      <ExitOptions r={r} />

      <Underwriting risk={risk} r={r} />

      <ChatCTA token={token} />

      <p className="text-center text-xs text-ink-3">
        Illustrative only. Not an offer, a commitment to lend, or a borrower disclosure.
      </p>
    </Container>
  )
}
