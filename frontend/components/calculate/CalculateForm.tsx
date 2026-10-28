'use client'

import { useRouter } from 'next/navigation'
import { useState, type ReactNode } from 'react'
import { Button, Card, ErrorList, NumberField, Toggle } from '@/components/ui/primitives'
import { initiate } from '@/lib/api'
import { PROGRAM, SAMPLE_PROFILES } from '@/lib/scenario'
import type { ApiError, EmploymentType } from '@/types'
import { ERROR_FIELDS, type FieldKey, type FormState, formFromProfile, toPercentString, toRequest } from './form-model'

export interface Prefill {
  purchase_price?: number
  tax_rate?: number
  insurance_annual?: number
}

const EMPLOYMENT_OPTIONS: { value: EmploymentType; label: string }[] = [
  { value: 'W2', label: 'W-2 salaried' },
  { value: '1099', label: '1099 contractor' },
  { value: 'self_employed', label: 'Self-employed' },
  { value: 'retired', label: 'Retired' },
]

function initialState(prefill: Prefill): FormState {
  const base = formFromProfile(SAMPLE_PROFILES[0])
  return {
    ...base,
    ...(prefill.purchase_price !== undefined && { purchase_price: String(prefill.purchase_price) }),
    ...(prefill.tax_rate !== undefined && { tax_rate: toPercentString(prefill.tax_rate) }),
    ...(prefill.insurance_annual !== undefined && { insurance_annual: String(Math.round(prefill.insurance_annual)) }),
  }
}

function Section({ step, title, description, children }: {
  step: string
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <fieldset className="grid gap-6 border-t border-line pt-8 first:border-t-0 first:pt-0 md:grid-cols-[14rem_1fr]">
      <legend className="sr-only">{title}</legend>
      <div>
        <p className="num text-xs text-accent">{step}</p>
        <h2 className="mt-1 text-base font-semibold text-ink">{title}</h2>
        {description && <p className="mt-1 text-sm leading-relaxed text-ink-2">{description}</p>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  )
}

export default function CalculateForm({ prefill }: { prefill: Prefill }) {
  const router = useRouter()
  const hasPrefill = Object.values(prefill).some(v => v !== undefined)
  const [form, setForm] = useState<FormState>(() => initialState(prefill))
  const [sampleRef, setSampleRef] = useState<string | null>(hasPrefill ? null : SAMPLE_PROFILES[0].ref)
  const [errors, setErrors] = useState<ApiError[]>([])
  const [submitting, setSubmitting] = useState(false)

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
    setSampleRef(null)
  }

  function pickSample(ref: string) {
    const profile = SAMPLE_PROFILES.find(p => p.ref === ref)
    if (!profile) return
    setForm(prev => ({ ...formFromProfile(profile), lo_email: prev.lo_email }))
    setSampleRef(ref)
    setErrors([])
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setErrors([])
    const { scenario, borrower } = toRequest(form)
    const res = await initiate({
      borrower_ref: sampleRef ?? `CUSTOM-${Date.now()}`,
      scenario,
      borrower,
      lo_email: form.lo_email.trim() || undefined,
    })
    if (res.success && res.data) {
      router.push(`/results/${res.data.transaction_token}`)
      return
    }
    setErrors(res.errors)
    setSubmitting(false)
  }

  const fieldError = (key: FieldKey) =>
    errors.find(e => e.field === key && ERROR_FIELDS.has(key))?.message

  const field = (key: FieldKey, label: string, opts: Partial<Parameters<typeof NumberField>[0]> = {}) => (
    <NumberField
      id={key}
      label={label}
      value={form[key]}
      onChange={v => set(key, v)}
      error={fieldError(key)}
      {...opts}
    />
  )

  return (
    <form onSubmit={onSubmit} noValidate={false} className="space-y-8" aria-label="Second-lien scenario">
      <div>
        <p className="mb-3 text-sm font-medium text-ink">Start from a sample borrower</p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Sample borrowers">
          {SAMPLE_PROFILES.map(p => {
            const active = p.ref === sampleRef
            return (
              <button
                key={p.ref}
                type="button"
                aria-pressed={active}
                data-testid={`sample-${p.ref}`}
                onClick={() => pickSample(p.ref)}
                className={`rounded-full border px-4 py-2 text-left text-sm transition-colors ${
                  active ? 'border-accent bg-accent-soft text-ink' : 'border-line bg-surface text-ink-2 hover:border-line-strong hover:text-ink'
                }`}
              >
                <span className="font-medium">{p.label}</span>
                <span className="ml-2 text-ink-3">{p.detail}</span>
              </button>
            )
          })}
        </div>
        {hasPrefill && sampleRef === null && (
          <p className="mt-3 text-sm text-ink-2">Prefilled with tax and insurance figures from your property lookup.</p>
        )}
      </div>

      <Card className="space-y-8 p-6 sm:p-8">
        <Section step="01" title="Home & first lien" description="Purchase borrowers put 20% down. The first lien is 80% of the price.">
          {field('purchase_price', 'Purchase price', { prefix: '$', min: 0, step: 'any' })}
          {field('first_lien_rate', 'First-lien rate', { suffix: '%', min: 0, step: 'any' })}
          <div className="sm:col-span-2 flex flex-wrap gap-x-8 gap-y-1 rounded-xl bg-sunken px-4 py-3 text-sm text-ink-2">
            <span>Down payment <strong className="num font-medium text-ink">20%</strong></span>
            <span>First lien <strong className="num font-medium text-ink">{(PROGRAM.firstLienLtv * 100).toFixed(0)}% of price</strong></span>
            <span>Term <strong className="num font-medium text-ink">30 years</strong></span>
          </div>
        </Section>

        <Section step="02" title="Taxes & insurance" description="What the second lien pays each month during funding.">
          {field('tax_rate', 'Property tax rate', { suffix: '% of price', min: 0, step: 'any', hint: 'annual' })}
          {field('insurance_annual', 'Homeowner insurance', { prefix: '$', suffix: '/yr', min: 0, step: 'any' })}
          {field('special_assessment_rate', 'Special assessments', { suffix: '% of price', min: 0, step: 'any', required: false, hint: '0 if none' })}
          <div className="sm:self-end">
            <Toggle
              id="fund_special_assessments"
              label="Fund assessments with the second"
              checked={form.fund_special_assessments}
              onChange={v => set('fund_special_assessments', v)}
            />
          </div>
        </Section>

        <Section step="03" title="Second lien" description={`Capped at ${PROGRAM.secondLienCapPct * 100}% of price, including accrued interest.`}>
          {field('second_lien_rate', 'Second-lien rate', { suffix: '%', min: 0, step: 'any', hint: 'set by lender' })}
          {field('funding_months', 'Funding period', { suffix: 'months', min: 12, max: 120, step: 'any' })}
          <div className="sm:col-span-2">
            <Toggle
              id="accrue_interest"
              label="Interest accrues into the balance"
              description={form.accrue_interest
                ? 'The borrower makes no payment on the second during funding.'
                : 'The borrower pays second-lien interest each month during funding.'}
              checked={form.accrue_interest}
              onChange={v => set('accrue_interest', v)}
            />
          </div>
        </Section>

        <Section step="04" title="Borrower" description="Used to underwrite the payment after funding ends, not just during it.">
          {field('income', 'Gross annual income', { prefix: '$', min: 0, step: 'any' })}
          {field('monthly_debts', 'Other monthly debts', { prefix: '$', min: 0, step: 'any', required: false })}
          {field('credit_score', 'Credit score', { min: 300, max: 850, step: '1' })}
          <div>
            <label htmlFor="employment_type" className="mb-1.5 block text-sm font-medium text-ink">Employment</label>
            <select
              id="employment_type"
              value={form.employment_type}
              onChange={e => set('employment_type', e.target.value as EmploymentType)}
              className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-[15px] text-ink outline-none focus:border-accent"
            >
              {EMPLOYMENT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </Section>

        <details className="group border-t border-line pt-6">
          <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium text-ink">
            <span>Growth & refinance assumptions</span>
            <span className="text-ink-3 transition-transform group-open:rotate-45" aria-hidden="true">+</span>
          </summary>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {field('tax_growth', 'Tax growth', { suffix: '%/yr', min: 0, step: 'any' })}
            {field('insurance_growth', 'Insurance growth', { suffix: '%/yr', min: 0, step: 'any' })}
            {field('special_assessment_growth', 'Assessment growth', { suffix: '%/yr', min: 0, step: 'any' })}
            {field('refi_rate', 'Refinance rate', { suffix: '%', min: 0, step: 'any', hint: 'Option B' })}
            {field('pmi_rate', 'PMI rate', { suffix: '% of loan', min: 0, step: 'any' })}
          </div>
        </details>

        <div className="border-t border-line pt-6">
          <label htmlFor="lo_email" className="mb-1.5 block text-sm font-medium text-ink">
            Loan officer email <span className="font-normal text-ink-3">optional — we send the result link once and never store it</span>
          </label>
          <input
            id="lo_email"
            type="email"
            value={form.lo_email}
            onChange={e => setForm(prev => ({ ...prev, lo_email: e.target.value }))}
            placeholder="officer@creditunion.org"
            className="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-[15px] text-ink outline-none placeholder:text-ink-3 focus:border-accent sm:max-w-sm"
          />
        </div>
      </Card>

      <ErrorList errors={errors} />

      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={submitting} data-testid="submit-scenario" className="px-7 py-3 text-[15px]">
          {submitting ? 'Running scenario…' : 'Run scenario'}
        </Button>
        <p className="text-sm text-ink-3">Estimates only. Not a commitment to lend.</p>
      </div>
    </form>
  )
}
