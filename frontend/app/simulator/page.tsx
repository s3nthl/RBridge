import type { Metadata } from 'next'
import Simulator from '@/components/simulator/Simulator'
import { DEFAULT_VALUES, SLIDER_LIMITS, type SimulatorValues } from '@/components/simulator/values'
import { Container, DisplayHeading, Eyebrow } from '@/components/ui/primitives'

export const metadata: Metadata = {
  title: 'Simulator',
  description: 'Move the sliders and watch the RBridge second lien reshape the payment, year by year.',
}

type Limits = { min: number; max: number }

function clamp(v: number, { min, max }: Limits) {
  return Math.min(max, Math.max(min, v))
}

/** Read one numeric query param; decimals for rates are converted to percent. */
function param(
  raw: string | string[] | undefined,
  fallback: number,
  limits: Limits,
  asPercent = false,
): number {
  const value = parseFloat(Array.isArray(raw) ? raw[0] : (raw ?? ''))
  if (!Number.isFinite(value)) return fallback
  return clamp(asPercent ? value * 100 : value, limits)
}

/**
 * Query params use the same names and units as the API (rates as decimals),
 * so /simulator and /calculate links are interchangeable.
 */
function initialValues(q: Record<string, string | string[] | undefined>): SimulatorValues {
  const accrue = Array.isArray(q.accrue_interest) ? q.accrue_interest[0] : q.accrue_interest
  return {
    purchasePrice: param(q.purchase_price, DEFAULT_VALUES.purchasePrice, SLIDER_LIMITS.purchasePrice),
    firstLienRatePct: param(q.first_lien_rate, DEFAULT_VALUES.firstLienRatePct, SLIDER_LIMITS.firstLienRatePct, true),
    taxRatePct: param(q.tax_rate, DEFAULT_VALUES.taxRatePct, SLIDER_LIMITS.taxRatePct, true),
    insuranceAnnual: param(q.insurance_annual, DEFAULT_VALUES.insuranceAnnual, SLIDER_LIMITS.insuranceAnnual),
    secondLienRatePct: param(q.second_lien_rate, DEFAULT_VALUES.secondLienRatePct, SLIDER_LIMITS.secondLienRatePct, true),
    // Funding period moves in whole years.
    fundingMonths: Math.round(param(q.funding_months, DEFAULT_VALUES.fundingMonths, SLIDER_LIMITS.fundingMonths) / 12) * 12,
    refiRatePct: param(q.refi_rate, DEFAULT_VALUES.refiRatePct, SLIDER_LIMITS.refiRatePct, true),
    accrueInterest: accrue === undefined ? DEFAULT_VALUES.accrueInterest : accrue !== 'false',
  }
}

export default async function SimulatorPage(props: PageProps<'/simulator'>) {
  const query = await props.searchParams

  return (
    <Container className="py-12 sm:py-16">
      <header className="mb-10 max-w-2xl">
        <Eyebrow>Simulator</Eyebrow>
        <DisplayHeading as="h1" className="mt-3 text-4xl sm:text-5xl">
          Move a slider, <em className="text-accent">watch the payment move.</em>
        </DisplayHeading>
        <p className="mt-4 text-ink-2">
          Every number on this page comes straight from the RBridge calc engine. Start from the Portland example and
          see how price, taxes, rates and the funding period change the relief and what happens after.
        </p>
      </header>
      <Simulator initial={initialValues(query)} />
    </Container>
  )
}
