'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { calculate } from '@/lib/api'
import { money, num, pct, points, signedMoney } from '@/lib/format'
import { PORTLAND_SCENARIO, PROGRAM } from '@/lib/scenario'
import type { ApiError, ScenarioInput, ScenarioResult } from '@/types'
import { ButtonLink, Card, ErrorList, Stat, Toggle } from '@/components/ui/primitives'
import { RangeField } from './RangeField'
import { DEFAULT_VALUES, SLIDER_LIMITS, type SimulatorValues } from './values'

const DEBOUNCE_MS = 250

/** Percent → decimal rate, rounded so 7.1 sends 0.071 and not 0.07100000000000001. */
function rate(pctValue: number): number {
  return Math.round(pctValue * 10_000) / 1_000_000
}

function toScenario(v: SimulatorValues): ScenarioInput {
  return {
    ...PORTLAND_SCENARIO,
    purchase_price: v.purchasePrice,
    first_lien_rate: rate(v.firstLienRatePct),
    tax_rate: rate(v.taxRatePct),
    insurance_annual: v.insuranceAnnual,
    second_lien_rate: rate(v.secondLienRatePct),
    funding_months: v.fundingMonths,
    refi_rate: rate(v.refiRatePct),
    accrue_interest: v.accrueInterest,
  }
}

function calculateHref(s: ScenarioInput): string {
  const params = new URLSearchParams({
    purchase_price: String(s.purchase_price),
    first_lien_rate: String(s.first_lien_rate),
    tax_rate: String(s.tax_rate),
    insurance_annual: String(s.insurance_annual),
    second_lien_rate: String(s.second_lien_rate),
    funding_months: String(s.funding_months),
    refi_rate: String(s.refi_rate),
    accrue_interest: String(s.accrue_interest),
  })
  return `/calculate?${params.toString()}`
}

const fmtPct = (v: number, digits = 2) => `${v.toFixed(digits)}%`
const fmtUsd = (v: number) => money(v)

export default function Simulator({ initial }: { initial: SimulatorValues }) {
  const [values, setValues] = useState<SimulatorValues>(initial)
  const [result, setResult] = useState<ScenarioResult | null>(null)
  const [errors, setErrors] = useState<ApiError[]>([])
  const [pending, setPending] = useState(true)
  const controllerRef = useRef<AbortController | null>(null)

  const scenario = useMemo(() => toScenario(values), [values])

  useEffect(() => {
    const timer = setTimeout(async () => {
      controllerRef.current?.abort()
      const controller = new AbortController()
      controllerRef.current = controller
      const envelope = await calculate(scenario, controller.signal)
      // A newer request superseded this one; its result is stale.
      if (controller.signal.aborted) return
      if (envelope.success && envelope.data) {
        setResult(envelope.data.scenario)
        setErrors([])
      } else {
        setErrors(envelope.errors)
      }
      setPending(false)
    }, DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [scenario])

  useEffect(() => () => controllerRef.current?.abort(), [])

  // Pending is set here rather than in the effect so the spinner state changes with the input.
  function update(next: (prev: SimulatorValues) => SimulatorValues) {
    setPending(true)
    setValues(next)
  }

  function set<K extends keyof SimulatorValues>(key: K, v: SimulatorValues[K]) {
    update(prev => ({ ...prev, [key]: v }))
  }

  const stale = errors.length > 0
  const year1 = result?.years[0]
  const capUsed = result ? Math.min(1, num(result.second_lien_balance) / num(result.cap_amount)) : 0

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start">
      {/* ── Controls ── */}
      <Card className="p-5 sm:p-6 lg:sticky lg:top-24">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-ink-3">Scenario</h2>
          <button
            type="button"
            onClick={() => update(() => DEFAULT_VALUES)}
            className="text-sm text-ink-2 underline-offset-4 hover:text-ink hover:underline"
          >
            Reset to Portland
          </button>
        </div>

        <div className="divide-y divide-line">
          <RangeField id="purchase-price" label="Purchase price" value={values.purchasePrice}
            {...SLIDER_LIMITS.purchasePrice} display={fmtUsd(values.purchasePrice)}
            onChange={v => set('purchasePrice', v)} />
          <RangeField id="first-lien-rate" label="First-lien rate" value={values.firstLienRatePct}
            {...SLIDER_LIMITS.firstLienRatePct} display={fmtPct(values.firstLienRatePct)}
            onChange={v => set('firstLienRatePct', v)} />
          <RangeField id="tax-rate" label="Property tax rate" hint={`max ${fmtPct(PROGRAM.maxTaxRate * 100, 1)}`}
            value={values.taxRatePct} {...SLIDER_LIMITS.taxRatePct} display={fmtPct(values.taxRatePct)}
            onChange={v => set('taxRatePct', v)} />
          <RangeField id="insurance" label="Homeowner insurance" hint="per year" value={values.insuranceAnnual}
            {...SLIDER_LIMITS.insuranceAnnual} display={fmtUsd(values.insuranceAnnual)}
            onChange={v => set('insuranceAnnual', v)} />
          <RangeField id="second-lien-rate" label="Second-lien rate" value={values.secondLienRatePct}
            {...SLIDER_LIMITS.secondLienRatePct} display={fmtPct(values.secondLienRatePct)}
            onChange={v => set('secondLienRatePct', v)} />
          <RangeField id="funding-months" label="Funding period" value={values.fundingMonths}
            {...SLIDER_LIMITS.fundingMonths} display={`${values.fundingMonths} months`}
            onChange={v => set('fundingMonths', v)} />
          <RangeField id="refi-rate" label="Refinance rate" hint="Option B" value={values.refiRatePct}
            {...SLIDER_LIMITS.refiRatePct} display={fmtPct(values.refiRatePct)}
            onChange={v => set('refiRatePct', v)} />
        </div>

        <div className="mt-4">
          <Toggle
            id="accrue-interest"
            label="Interest accrues into the balance"
            description={values.accrueInterest
              ? 'Borrower makes no payment on the second during funding.'
              : 'Borrower pays second-lien interest each month.'}
            checked={values.accrueInterest}
            onChange={v => set('accrueInterest', v)}
          />
        </div>

        <ButtonLink href={calculateHref(scenario)} className="mt-6 w-full" data-testid="use-numbers">
          Use these numbers
          <span aria-hidden="true">→</span>
        </ButtonLink>
      </Card>

      {/* ── Results ── */}
      <div className="space-y-6" aria-live="polite" aria-busy={pending}>
        <ErrorList errors={errors} />

        {!result ? (
          <Card className="grid min-h-64 place-items-center p-8 text-sm text-ink-3" data-testid="sim-loading">
            {pending ? 'Running the numbers…' : 'No result yet.'}
          </Card>
        ) : (
          <div className={`space-y-6 transition-opacity ${stale ? 'opacity-40' : pending ? 'opacity-80' : ''}`}
            data-testid="sim-results" data-stale={stale ? 'true' : 'false'}>
            {/* Year 1 */}
            <Card className="overflow-hidden">
              <div className="grid gap-6 p-6 sm:grid-cols-3">
                <Stat label="Year 1 without RBridge" value={money(year1?.payment_without_second)}
                  note="P&I + taxes & insurance" testId="sim-without-year1" />
                <Stat label="Year 1 with RBridge" value={money(year1?.payment_with_second)}
                  note="What the borrower pays" tone="steel" testId="sim-with-year1" />
                <Stat label="Monthly relief" value={money(year1?.relief_monthly)}
                  note={`${pct(year1?.relief_pct)} lower`} tone="accent" testId="sim-relief-year1" />
              </div>
              <div className="border-t border-line bg-sunken/60 px-6 py-4 text-sm text-ink-2">
                Average relief across the funding period:{' '}
                <span className="num font-semibold text-ink" data-testid="sim-avg-relief">
                  {money(result.avg_monthly_relief)}/mo
                </span>{' '}
                ({pct(result.avg_relief_pct)})
              </div>
            </Card>

            {/* Year by year */}
            <Card className="p-6">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.12em] text-ink-3">Payment by year</h3>
              <YearBars result={result} />
            </Card>

            {/* Balance vs cap */}
            <Card className="p-6">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-ink-3">Second-lien balance at end</h3>
                <p className="num text-sm text-ink-2">
                  <span className="font-semibold text-ink" data-testid="sim-balance">{money(result.second_lien_balance)}</span>
                  {' '}of {money(result.cap_amount)} cap
                </p>
              </div>
              <div
                className="mt-4 h-3 overflow-hidden rounded-full bg-sunken"
                role="progressbar"
                aria-label="Share of the cap used"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(capUsed * 100)}
              >
                <div
                  className={`h-full rounded-full transition-[width] duration-500 ${result.cap_reached_month ? 'bg-warn' : 'bg-steel'}`}
                  style={{ width: `${capUsed * 100}%` }}
                />
              </div>
              <p className="mt-3 text-sm text-ink-2">
                Includes {money(result.total_accrued_interest)} of accrued interest.{' '}
                {result.cap_reached_month === null && <>Room left under the cap: {money(result.cap_room)}.</>}
              </p>
              {result.cap_reached_month !== null && (
                <p data-testid="sim-cap-warning" className="mt-3 rounded-xl bg-warn-soft px-4 py-3 text-sm text-warn">
                  The cap is reached in month {result.cap_reached_month}. For {result.shortfall_months} month
                  {result.shortfall_months === 1 ? '' : 's'} the borrower covers taxes and insurance not paid by the
                  second lien. This program would need a cap of {pct(result.cap_needed_pct)} of price to fund the full period.
                </p>
              )}
            </Card>

            {/* After funding */}
            <div className="grid gap-6 sm:grid-cols-2">
              <Card className="p-6">
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-accent">Option A</p>
                <h3 className="mt-1 font-display text-2xl text-ink">Keep the first, amortize the second</h3>
                <Stat className="mt-5" label="Total monthly payment" value={money(result.option_a_total_payment)}
                  testId="sim-option-a"
                  note={<>Includes {money(result.option_a_payment)}/mo on the second over {PROGRAM.amortMonths / 12} years.</>} />
              </Card>
              <Card className="p-6">
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-accent">Option B</p>
                <h3 className="mt-1 font-display text-2xl text-ink">Refinance into one new first</h3>
                <Stat className="mt-5" label="New P&I" value={money(result.option_b_payment)} testId="sim-option-b"
                  note={<>{signedMoney(result.option_b_payment_change)}/mo vs today · new loan {money(result.option_b_new_loan)} ({pct(result.option_b_ltv)} LTV)</>} />
                <dl className="mt-4 space-y-1.5 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-ink-2">Mortgage insurance</dt>
                    <dd className="num text-ink" data-testid="sim-pmi">
                      {result.option_b_pmi_required ? `${money(result.option_b_pmi_monthly)}/mo` : 'Not required'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-ink-2">Break-even rate drop</dt>
                    <dd className="num text-ink" data-testid="sim-breakeven">
                      {result.option_b_breakeven_rate_drop === null ? 'None' : points(result.option_b_breakeven_rate_drop)}
                    </dd>
                  </div>
                  {result.option_b_pmi_required && (
                    <div className="flex justify-between gap-3">
                      <dt className="text-ink-2">Break-even with PMI</dt>
                      <dd className="num text-ink">
                        {result.option_b_breakeven_rate_drop_with_pmi === null
                          ? 'None'
                          : points(result.option_b_breakeven_rate_drop_with_pmi)}
                      </dd>
                    </div>
                  )}
                </dl>
              </Card>
            </div>

            <p className="text-xs text-ink-3">
              Figures from RBridge calc engine {result.calc_version}. Illustrative only, not an offer or commitment to lend.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

/** Without vs with, one row per funding year. Bars share one scale so years compare honestly. */
function YearBars({ result }: { result: ScenarioResult }) {
  const max = Math.max(...result.years.map(y => num(y.payment_without_second)))
  return (
    <ol className="space-y-4">
      {result.years.map(y => {
        const without = num(y.payment_without_second)
        const withSecond = num(y.payment_with_second)
        return (
          <li key={y.year} className="grid grid-cols-[3.5rem_minmax(0,1fr)] items-center gap-3">
            <span className="text-sm text-ink-2">Year {y.year}</span>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="h-2.5 rounded-full bg-line-strong" style={{ width: `${(without / max) * 100}%` }} />
                <span className="num shrink-0 text-xs text-ink-3">{money(without)}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2.5 rounded-full bg-accent" style={{ width: `${(withSecond / max) * 100}%` }} />
                <span className="num shrink-0 text-xs font-medium text-ink">{money(withSecond)}</span>
              </div>
            </div>
          </li>
        )
      })}
      <li className="flex flex-wrap gap-4 pt-1 text-xs text-ink-3">
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-4 rounded-full bg-line-strong" /> Without RBridge</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-4 rounded-full bg-accent" /> With RBridge</span>
      </li>
    </ol>
  )
}
