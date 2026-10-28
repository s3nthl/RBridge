import { ButtonLink, Card, Container, Eyebrow } from '@/components/ui/primitives'
import { money, pct } from '@/lib/format'
import { PORTLAND, PORTLAND_YEARS } from './portland'

export default function Hero() {
  const year1 = PORTLAND_YEARS[0]
  // Share of the year-1 payment that is P&I, for the bar visual.
  const piShare = (year1.with / year1.without) * 100

  return (
    <section className="relative overflow-hidden border-b border-line">
      <Container className="grid items-center gap-12 py-16 sm:py-24 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
        <div className="rise">
          <Eyebrow>Taxes &amp; insurance second lien</Eyebrow>
          <h1 className="mt-5 font-display text-[2.75rem] leading-[1.02] tracking-[-0.015em] text-ink sm:text-6xl lg:text-7xl">
            The first five years start at{' '}
            <em className="text-accent">principal and interest.</em>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-2">
            RBridge is a second lien that pays a new homeowner&rsquo;s property taxes and insurance while the
            household finds its footing. The borrower makes the first-lien payment only. The second is settled
            when the funding period ends.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <ButtonLink href="/calculate" className="px-6 py-3 text-[15px]">Run a scenario</ButtonLink>
            <ButtonLink href="/simulator" variant="secondary" className="px-6 py-3 text-[15px]">
              Try the simulator
            </ButtonLink>
          </div>
        </div>

        <Card className="rise p-6 sm:p-8 [animation-delay:120ms]">
          <div className="flex items-baseline justify-between gap-4">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-ink-3">Year 1 · Portland example</p>
            <p className="num text-xs text-ink-3">{money(PORTLAND.price)} home</p>
          </div>

          <dl className="mt-6 space-y-5">
            <div>
              <dt className="text-sm text-ink-2">Payment without RBridge</dt>
              <dd className="num mt-1 text-3xl font-semibold tracking-tight text-ink-3 line-through decoration-1">
                {money(year1.without)}<span className="text-base font-normal">/mo</span>
              </dd>
            </div>
            <div>
              <dt className="text-sm text-ink-2">Payment with RBridge</dt>
              <dd className="num mt-1 text-5xl font-semibold tracking-tight text-ink" data-testid="hero-with">
                {money(year1.with)}<span className="text-xl font-normal text-ink-2">/mo</span>
              </dd>
            </div>
          </dl>

          <div className="mt-6" aria-hidden="true">
            <div className="flex h-3 overflow-hidden rounded-full bg-sunken">
              <div className="bg-ink" style={{ width: `${piShare}%` }} />
              <div className="bg-accent" style={{ width: `${100 - piShare}%` }} />
            </div>
            <div className="mt-2 flex justify-between text-xs text-ink-3">
              <span>Principal &amp; interest</span>
              <span>Taxes &amp; insurance</span>
            </div>
          </div>

          <div className="mt-6 flex items-end justify-between gap-4 rounded-xl bg-accent-soft px-5 py-4">
            <div>
              <p className="text-sm text-ink-2">Monthly relief</p>
              <p className="num text-2xl font-semibold text-accent">{money(year1.relief)}</p>
            </div>
            <p className="num text-right text-sm text-ink-2">
              <span className="text-lg font-semibold text-accent">{pct(year1.reliefPct)}</span>
              <br />lower payment
            </p>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-ink-3">
            Illustrative. {money(PORTLAND.firstLien)} first lien at {pct(PORTLAND.firstLienRate, 2)}; tax 1.0% of
            price, insurance {money(PORTLAND.insuranceAnnual)}/yr.
          </p>
        </Card>
      </Container>
    </section>
  )
}
