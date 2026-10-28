'use client'

import { ButtonLink, Card, Stat } from '@/components/ui/primitives'
import { money, pct } from '@/lib/format'
import { estimateInsurance } from '@/lib/lookup/state-data'
import { PROGRAM } from '@/lib/scenario'
import type { Construction, PropertyApi, PropertyValueSource, RatesApi } from './types'

const VALUE_SOURCE_LABEL: Record<PropertyValueSource, string> = {
  attom_avm: 'Automated valuation',
  attom_market: 'Tax-roll market value',
  attom_assessed: 'Assessed value',
  state_median: 'State median, no property record',
}

// Rates sent to /calculate are rounded to basis points so the form shows clean numbers.
const RATE_PRECISION = 10_000

export interface LookupEstimate {
  propertyValue: number
  annualTaxes: number
  taxRate: number
  annualInsurance: number
  tiMonthly: number
}

/** All figures the page shows, derived from the lookup responses. */
export function deriveEstimate(p: PropertyApi, construction: Construction): LookupEstimate | null {
  if (!p.property_value || p.property_value <= 0) return null
  const annualTaxes = p.annual_taxes ?? 0
  // Insurance scales with current market value (AVM) when there is one.
  const insuranceBase = p.avm?.value && p.avm.value > 0 ? p.avm.value : p.property_value
  const annualInsurance = Math.round(
    estimateInsurance(insuranceBase, { median_value: p.property_value, insurance_avg: p.state_insurance_avg }, construction === 'new'),
  )
  return {
    propertyValue: p.property_value,
    annualTaxes,
    taxRate: annualTaxes / p.property_value,
    annualInsurance,
    tiMonthly: (annualTaxes + annualInsurance) / 12,
  }
}

function calculateHref(e: LookupEstimate, rates: RatesApi | null): string {
  const params = new URLSearchParams({
    purchase_price: String(Math.round(e.propertyValue)),
    tax_rate: String(Math.round(e.taxRate * RATE_PRECISION) / RATE_PRECISION),
    insurance_annual: String(e.annualInsurance),
  })
  if (rates && rates.mortgage_source !== 'fallback') {
    params.set('first_lien_rate', String(Math.round(rates.mortgage_30yr * 100) / RATE_PRECISION))
  }
  return `/calculate?${params.toString()}`
}

export function PropertyResults({
  address,
  property,
  rates,
  construction,
  onConstructionChange,
}: {
  address: string
  property: PropertyApi
  rates: RatesApi | null
  construction: Construction
  onConstructionChange: (c: Construction) => void
}) {
  const estimate = deriveEstimate(property, construction)
  const isFallback = property.property_value_source_detail === 'state_median'
  const facts = [
    property.property_type,
    property.year_built ? `Built ${property.year_built}` : null,
    property.beds ? `${property.beds} bd` : null,
    property.baths ? `${property.baths} ba` : null,
    property.living_area_sqft ? `${property.living_area_sqft.toLocaleString('en-US')} sq ft` : null,
  ].filter(Boolean)

  return (
    <div className="space-y-5" data-testid="lookup-results">
      <Card className="p-6">
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-ink-3">Property</p>
        <h2 className="mt-1 font-display text-3xl leading-tight text-ink" data-testid="lookup-address">{address}</h2>
        {facts.length > 0 && <p className="mt-2 text-sm text-ink-2">{facts.join(' · ')}</p>}

        <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
          <Stat
            label="Estimated value"
            value={money(property.property_value)}
            testId="lookup-value"
            note={property.avm?.low && property.avm.high
              ? `Range ${money(property.avm.low)} – ${money(property.avm.high)}`
              : undefined}
          />
          <span
            data-testid="value-source"
            className={`rounded-full px-3 py-1 text-xs font-medium ${isFallback ? 'bg-warn-soft text-warn' : 'bg-sunken text-ink-2'}`}
          >
            {VALUE_SOURCE_LABEL[property.property_value_source_detail]}
          </span>
        </div>
        {property.note && <p className="mt-3 text-xs text-ink-3">{property.note}</p>}
      </Card>

      {estimate ? (
        <Card className="overflow-hidden">
          <div className="grid gap-6 p-6 sm:grid-cols-2">
            <Stat
              label="Property tax rate"
              value={pct(estimate.taxRate, 2)}
              tone={estimate.taxRate > PROGRAM.maxTaxRate ? 'warn' : 'ink'}
              testId="lookup-tax-rate"
              note={`${money(estimate.annualTaxes)} a year${property.tax_year ? ` (${property.tax_year})` : ''}${
                property.annual_taxes_estimated ? ' · estimated' : ''}`}
            />
            <Stat
              label="Homeowner insurance"
              value={`${money(estimate.annualInsurance)}/yr`}
              testId="lookup-insurance"
              note={`Estimate from ${property.state_code} averages`}
            />
            <Stat
              label="Taxes & insurance"
              value={`${money(estimate.tiMonthly)}/mo`}
              tone="accent"
              testId="lookup-ti-monthly"
              note="What RBridge would pay during funding (est.)"
            />
            {rates && (
              <Stat
                label="30-year fixed rate"
                value={`${rates.mortgage_30yr.toFixed(2)}%`}
                testId="lookup-mortgage-rate"
                note={rates.mortgage_source === 'freddie_mac'
                  ? `Freddie Mac PMMS, ${rates.mortgage_as_of}`
                  : 'Placeholder, live rate unavailable'}
              />
            )}
          </div>

          <fieldset className="border-t border-line px-6 py-4">
            <legend className="sr-only">Construction type</legend>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="text-ink-2">Insurance basis:</span>
              {(['existing', 'new'] as const).map(c => (
                <label key={c} className={`cursor-pointer rounded-full border px-3 py-1 ${
                  construction === c ? 'border-ink bg-ink text-paper' : 'border-line text-ink-2 hover:text-ink'}`}>
                  <input type="radio" name="construction" value={c} checked={construction === c}
                    onChange={() => onConstructionChange(c)} className="sr-only" />
                  {c === 'existing' ? 'Existing home' : 'New construction'}
                </label>
              ))}
            </div>
          </fieldset>

          {estimate.taxRate > PROGRAM.maxTaxRate && (
            <p data-testid="lookup-tax-warning" className="border-t border-line bg-warn-soft px-6 py-4 text-sm text-warn">
              This tax rate is above the program maximum of {pct(PROGRAM.maxTaxRate)}. Confirm it with the county
              assessor; as entered, the scenario would be rejected.
            </p>
          )}

          <div className="flex flex-col gap-4 border-t border-line bg-sunken/60 p-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-md text-xs leading-relaxed text-ink-3">
              Estimates only. Verify taxes and any special assessments with the county assessor, and insurance
              with a quote. The estimated value is used as the purchase price.
            </p>
            <ButtonLink href={calculateHref(estimate, rates)} data-testid="lookup-cta" className="shrink-0">
              Run this home through RBridge <span aria-hidden="true">→</span>
            </ButtonLink>
          </div>
        </Card>
      ) : (
        <Card className="p-6 text-sm text-ink-2">
          No value was found for this property, so taxes and insurance can&apos;t be estimated.
        </Card>
      )}
    </div>
  )
}
