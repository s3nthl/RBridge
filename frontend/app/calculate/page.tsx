import type { Metadata } from 'next'
import CalculateForm, { type Prefill } from '@/components/calculate/CalculateForm'
import { Container, DisplayHeading, Eyebrow } from '@/components/ui/primitives'

export const metadata: Metadata = { title: 'Run a scenario' }

/** Reads a positive number from a query param sent by /lookup; ignores anything else. */
function positive(v: string | string[] | undefined): number | undefined {
  if (typeof v !== 'string') return undefined
  const n = parseFloat(v)
  return Number.isFinite(n) && n > 0 ? n : undefined
}

export default async function CalculatePage(props: PageProps<'/calculate'>) {
  const params = await props.searchParams
  const prefill: Prefill = {
    purchase_price: positive(params.purchase_price),
    tax_rate: positive(params.tax_rate),
    insurance_annual: positive(params.insurance_annual),
  }

  return (
    <Container className="py-12 sm:py-16">
      <div className="mb-10 max-w-2xl">
        <Eyebrow>Scenario</Eyebrow>
        <DisplayHeading as="h1" className="mt-3 text-4xl sm:text-5xl">
          See the payment <em className="text-accent">with</em> and without the second.
        </DisplayHeading>
        <p className="mt-4 text-[17px] leading-relaxed text-ink-2">
          Enter the home, the taxes and insurance, and the borrower. You get year-by-year relief, the second-lien
          balance at the end of funding, and both exit options.
        </p>
      </div>
      <CalculateForm prefill={prefill} />
    </Container>
  )
}
