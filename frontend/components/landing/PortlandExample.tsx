import { Card, Container, DisplayHeading, Eyebrow, Stat } from '@/components/ui/primitives'
import { money, pct } from '@/lib/format'
import BalanceChart from './BalanceChart'
import { PORTLAND, PORTLAND_YEARS } from './portland'

export default function PortlandExample() {
  return (
    <section className="border-b border-line py-20 sm:py-28" aria-labelledby="example-heading">
      <Container>
        <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr] lg:gap-16">
          <div>
            <Eyebrow>A worked example</Eyebrow>
            <DisplayHeading className="mt-4 text-4xl sm:text-5xl">
              <span id="example-heading">A {money(PORTLAND.price)} home in the Portland area.</span>
            </DisplayHeading>
            <p className="mt-5 text-lg leading-relaxed text-ink-2">
              {money(PORTLAND.firstLien)} first lien at {pct(PORTLAND.firstLienRate, 2)} with P&amp;I of{' '}
              {money(PORTLAND.pi)}. Property tax is 1.0% of the price and grows 3% a year; insurance is{' '}
              {money(PORTLAND.insuranceAnnual)} a year and grows 5%. The second lien is at{' '}
              {pct(PORTLAND.secondLienRate, 2)} over a {PORTLAND.fundingMonths}-month funding period.
            </p>

            <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-8">
              <Stat
                label="Average relief"
                value={`${money(PORTLAND.avgRelief)}/mo`}
                note={`${pct(PORTLAND.avgReliefPct)} lower payment`}
                tone="accent"
              />
              <Stat
                label="Balance at month 60"
                value={money(PORTLAND.endBalance)}
                note={`incl. ${money(PORTLAND.accruedInterest)} interest`}
                tone="steel"
              />
              <Stat label="Share of price" value={pct(PORTLAND.endBalancePctOfPrice)} note="at end of funding" />
              <Stat label="Room under the cap" value={money(PORTLAND.capRoom)} note={`of ${money(PORTLAND.cap)}`} />
            </dl>
          </div>

          <div className="min-w-0 space-y-6">
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[30rem] text-left text-sm" data-testid="portland-table">
                  <caption className="sr-only">Monthly payment by year, with and without the second lien</caption>
                  <thead>
                    <tr className="border-b border-line text-xs uppercase tracking-[0.1em] text-ink-3">
                      <th scope="col" className="px-5 py-3.5 font-medium">Year</th>
                      <th scope="col" className="px-5 py-3.5 text-right font-medium">Without</th>
                      <th scope="col" className="px-5 py-3.5 text-right font-medium">With RBridge</th>
                      <th scope="col" className="px-5 py-3.5 text-right font-medium">Relief</th>
                      <th scope="col" className="px-5 py-3.5 text-right font-medium">%</th>
                    </tr>
                  </thead>
                  <tbody className="num">
                    {PORTLAND_YEARS.map(row => (
                      <tr key={row.year} className="border-b border-line/70 last:border-0">
                        <th scope="row" className="px-5 py-3.5 font-medium text-ink">{row.year}</th>
                        <td className="px-5 py-3.5 text-right text-ink-2">{money(row.without)}</td>
                        <td className="px-5 py-3.5 text-right text-ink">{money(row.with)}</td>
                        <td className="px-5 py-3.5 text-right font-semibold text-accent">{money(row.relief)}</td>
                        <td className="px-5 py-3.5 text-right text-ink-2">{pct(row.reliefPct)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card className="p-5 sm:p-6">
              <p className="mb-4 text-sm font-medium text-ink">How the second-lien balance builds</p>
              <BalanceChart />
            </Card>
          </div>
        </div>
      </Container>
    </section>
  )
}
