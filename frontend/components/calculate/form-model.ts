import { PORTLAND_SCENARIO, PROGRAM, type SampleProfile } from '@/lib/scenario'
import type { EmploymentType, ScenarioInput, UnderwritingProfile } from '@/types'

/** Every input is held as the string the user typed; percents are in % units. */
export interface FormState {
  purchase_price: string
  first_lien_rate: string
  tax_rate: string
  tax_growth: string
  special_assessment_rate: string
  special_assessment_growth: string
  fund_special_assessments: boolean
  insurance_annual: string
  insurance_growth: string
  second_lien_rate: string
  funding_months: string
  accrue_interest: boolean
  refi_rate: string
  pmi_rate: string
  income: string
  monthly_debts: string
  credit_score: string
  employment_type: EmploymentType
  lo_email: string
}

export type FieldKey = Exclude<keyof FormState, 'fund_special_assessments' | 'accrue_interest' | 'employment_type' | 'lo_email'>

/** 0.071 → "7.1" without float noise. */
export function toPercentString(v: number | undefined): string {
  return v === undefined ? '' : String(Number((v * 100).toFixed(6)))
}

/** "7.1" → 0.071 without float noise. */
export function fromPercentString(s: string): number {
  return Number((parseFloat(s) / 100).toFixed(8))
}

function str(v: number | undefined): string {
  return v === undefined ? '' : String(v)
}

export function formFromProfile(profile: SampleProfile): FormState {
  const s: ScenarioInput = { ...PORTLAND_SCENARIO, ...profile.scenario }
  const b = profile.borrower
  return {
    purchase_price: str(s.purchase_price),
    first_lien_rate: toPercentString(s.first_lien_rate),
    tax_rate: toPercentString(s.tax_rate),
    tax_growth: toPercentString(s.tax_growth),
    special_assessment_rate: toPercentString(s.special_assessment_rate),
    special_assessment_growth: toPercentString(s.special_assessment_growth),
    fund_special_assessments: s.fund_special_assessments ?? true,
    insurance_annual: str(s.insurance_annual),
    insurance_growth: toPercentString(s.insurance_growth),
    second_lien_rate: toPercentString(s.second_lien_rate),
    funding_months: str(s.funding_months),
    accrue_interest: s.accrue_interest ?? true,
    refi_rate: toPercentString(s.refi_rate),
    pmi_rate: toPercentString(s.pmi_rate),
    income: str(b.income),
    monthly_debts: str(b.monthly_debts),
    credit_score: str(b.credit_score),
    employment_type: b.employment_type,
    lo_email: '',
  }
}

export function toRequest(f: FormState): { scenario: ScenarioInput; borrower: UnderwritingProfile } {
  return {
    scenario: {
      ...PORTLAND_SCENARIO,
      purchase_price: parseFloat(f.purchase_price),
      first_lien_ltv: PROGRAM.firstLienLtv,
      first_lien_rate: fromPercentString(f.first_lien_rate),
      tax_rate: fromPercentString(f.tax_rate),
      tax_growth: fromPercentString(f.tax_growth),
      special_assessment_rate: fromPercentString(f.special_assessment_rate || '0'),
      special_assessment_growth: fromPercentString(f.special_assessment_growth || '0'),
      fund_special_assessments: f.fund_special_assessments,
      insurance_annual: parseFloat(f.insurance_annual),
      insurance_growth: fromPercentString(f.insurance_growth),
      second_lien_rate: fromPercentString(f.second_lien_rate),
      funding_months: parseInt(f.funding_months, 10),
      accrue_interest: f.accrue_interest,
      refi_rate: fromPercentString(f.refi_rate),
      pmi_rate: fromPercentString(f.pmi_rate),
    },
    borrower: {
      income: parseFloat(f.income),
      monthly_debts: parseFloat(f.monthly_debts || '0'),
      credit_score: parseInt(f.credit_score, 10),
      employment_type: f.employment_type,
    },
  }
}

/** Backend field names that map to a form input (others show only in the error list). */
export const ERROR_FIELDS: ReadonlySet<string> = new Set<FieldKey>([
  'purchase_price', 'first_lien_rate', 'tax_rate', 'funding_months',
  'income', 'credit_score', 'refi_rate', 'second_lien_rate', 'insurance_annual',
])
