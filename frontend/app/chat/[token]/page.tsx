import type { Metadata } from 'next'
import Link from 'next/link'
import ChatShell, { SessionClosed } from '@/components/chat/ChatShell'
import { Card, Container, RiskPill } from '@/components/ui/primitives'
import { fetchTransaction } from '@/lib/api'
import { money, pct } from '@/lib/format'

export const metadata: Metadata = { title: 'Analyst chat' }

export default async function ChatPage(props: PageProps<'/chat/[token]'>) {
  const { token } = await props.params
  const envelope = await fetchTransaction(token)
  const txn = envelope.success ? envelope.data : null

  if (!txn || txn.status === 'closed') {
    return <Container><SessionClosed /></Container>
  }

  const { result: r, risk } = txn
  const facts: [string, string][] = [
    ['Year-1 relief', `${money(r.years[0].relief_monthly)}/mo`],
    ['Average relief', `${money(r.avg_monthly_relief)}/mo · ${pct(r.avg_relief_pct)}`],
    ['Balance at end', money(r.second_lien_balance)],
    ['Option A payment', `${money(r.option_a_total_payment)}/mo`],
    ['Option B new first', `${money(r.option_b_new_loan)} · ${pct(r.option_b_ltv)} LTV`],
    ['DTI after funding', pct(risk.dti_after_funding)],
  ]

  return (
    <Container className="grid gap-6 py-10 lg:grid-cols-[1fr_18rem]">
      <ChatShell token={token} borrowerRef={txn.borrower_ref} />
      <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-ink-3">This scenario</p>
          <dl className="mt-3 divide-y divide-line/60">
            {facts.map(([label, value]) => (
              <div key={label} className="flex items-baseline justify-between gap-3 py-2">
                <dt className="text-sm text-ink-2">{label}</dt>
                <dd className="num text-right text-sm font-medium text-ink">{value}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-4"><RiskPill band={risk.band} score={risk.score} /></div>
        </Card>
        <Link href={`/results/${token}`} className="block text-sm text-ink-2 hover:text-ink">
          ← Back to the full result
        </Link>
      </aside>
    </Container>
  )
}
