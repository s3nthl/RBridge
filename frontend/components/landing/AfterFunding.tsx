import { Card, Container, DisplayHeading, Eyebrow } from '@/components/ui/primitives'
import { money, pct } from '@/lib/format'
import { PORTLAND } from './portland'

export default function AfterFunding() {
  const { optionA, optionB } = PORTLAND

  return (
    <section className="border-b border-line bg-sunken/50 py-20 sm:py-28" aria-labelledby="after-heading">
      <Container>
        <div className="max-w-2xl">
          <Eyebrow>After month 60</Eyebrow>
          <DisplayHeading className="mt-4 text-4xl sm:text-5xl">
            <span id="after-heading">Two ways to settle the second.</span>
          </DisplayHeading>
          <p className="mt-5 text-lg leading-relaxed text-ink-2">
            Underwriting tests the payment after funding, not just during it, so the borrower knows both paths before
            they start.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <Card className="flex flex-col p-7 sm:p-8">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-steel">Option A</p>
            <h3 className="mt-3 font-display text-3xl text-ink">Keep the first, amortize the second</h3>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
              The first lien stays as it is. The {money(PORTLAND.endBalance)} balance is repaid over{' '}
              {optionA.years} years at the second-lien rate.
            </p>
            <div className="mt-auto pt-8">
              <p className="num text-4xl font-semibold tracking-tight text-ink">
                +{money(optionA.addedPayment)}<span className="text-lg font-normal text-ink-2">/mo</span>
              </p>
              <p className="mt-1 text-sm text-ink-2">added to the monthly payment</p>
            </div>
          </Card>

          <Card className="flex flex-col p-7 sm:p-8">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-accent">Option B</p>
            <h3 className="mt-3 font-display text-3xl text-ink">Refinance into one new first</h3>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
              A new first of {money(optionB.newFirst)} is {pct(optionB.ltv)} of the purchase price, so mortgage
              insurance applies (placeholder {pct(optionB.pmiRate, 2)} of the loan, about{' '}
              {money(optionB.pmiMonthly)} a month).
            </p>
            <dl className="mt-auto grid grid-cols-2 gap-4 pt-8">
              <div>
                <dt className="text-sm text-ink-2">Break-even rate drop</dt>
                <dd className="num mt-1 text-3xl font-semibold tracking-tight text-ink">
                  {optionB.breakevenDropPts.toFixed(2)}<span className="text-base font-normal text-ink-2"> pts</span>
                </dd>
              </div>
              <div>
                <dt className="text-sm text-ink-2">With mortgage insurance</dt>
                <dd className="num mt-1 text-3xl font-semibold tracking-tight text-ink">
                  {optionB.breakevenDropPtsWithPmi.toFixed(2)}<span className="text-base font-normal text-ink-2"> pts</span>
                </dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-ink-3">
              How far below the current {pct(PORTLAND.firstLienRate, 2)} first-lien rate a new rate must be to keep
              the payment the same.
            </p>
          </Card>
        </div>
      </Container>
    </section>
  )
}
