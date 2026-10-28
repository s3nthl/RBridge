import type { ScenarioInput, UnderwritingProfile } from '@/types'

/**
 * Program defaults from the partner summary. The backend applies the same
 * defaults; they are repeated here only to pre-fill forms and sliders.
 */
export const PROGRAM = {
  firstLienLtv: 0.8,
  secondLienCapPct: 0.1,
  secondLienRate: 0.08,
  fundingMonths: 60,
  amortMonths: 240,
  taxGrowth: 0.03,
  specialAssessmentGrowth: 0.02,
  insuranceGrowth: 0.05,
  pmiRate: 0.005,
  closingCostPct: 0.01,
  maxTaxRate: 0.017,
} as const

/** Illustrative Portland-area borrower from the partner summary. */
export const PORTLAND_SCENARIO: ScenarioInput = {
  purchase_price: 600_000,
  first_lien_ltv: PROGRAM.firstLienLtv,
  first_lien_rate: 0.071,
  first_lien_term_months: 360,
  tax_rate: 0.01,
  tax_growth: PROGRAM.taxGrowth,
  special_assessment_rate: 0,
  special_assessment_growth: PROGRAM.specialAssessmentGrowth,
  fund_special_assessments: true,
  insurance_annual: 1_600,
  insurance_growth: PROGRAM.insuranceGrowth,
  second_lien_cap_pct: PROGRAM.secondLienCapPct,
  second_lien_rate: PROGRAM.secondLienRate,
  accrue_interest: true,
  funding_months: PROGRAM.fundingMonths,
  amort_months: PROGRAM.amortMonths,
  refi_rate: 0.061,
  refi_term_months: 360,
  pmi_rate: PROGRAM.pmiRate,
  closing_cost_pct: PROGRAM.closingCostPct,
  max_tax_rate: PROGRAM.maxTaxRate,
}

export interface SampleProfile {
  ref: string
  label: string
  detail: string
  scenario: Partial<ScenarioInput>
  borrower: UnderwritingProfile
}

/** Fictional demo borrowers. Not real people, no PII. */
export const SAMPLE_PROFILES: SampleProfile[] = [
  {
    ref: 'DEMO-PDX',
    label: 'Portland default',
    detail: '$600k · 1.0% tax',
    scenario: {},
    borrower: { income: 150_000, monthly_debts: 400, credit_score: 740, employment_type: 'W2' },
  },
  {
    ref: 'DEMO-HCOL',
    label: 'Higher-cost, cap binds',
    detail: '$700k · 1.2% tax + 0.6% assessment',
    scenario: {
      purchase_price: 700_000, tax_rate: 0.012, tax_growth: 0.02,
      special_assessment_rate: 0.006, insurance_annual: 2_400, funding_months: 48,
    },
    borrower: { income: 185_000, monthly_debts: 650, credit_score: 760, employment_type: 'W2' },
  },
  {
    ref: 'DEMO-STARTER',
    label: 'Starter home',
    detail: '$420k · 0.9% tax',
    scenario: { purchase_price: 420_000, tax_rate: 0.009, insurance_annual: 1_300, first_lien_rate: 0.0685 },
    borrower: { income: 105_000, monthly_debts: 350, credit_score: 715, employment_type: 'W2' },
  },
  {
    ref: 'DEMO-SELF',
    label: 'Self-employed',
    detail: '$540k · 1.05% tax',
    scenario: { purchase_price: 540_000, tax_rate: 0.0105, insurance_annual: 1_750 },
    borrower: { income: 140_000, monthly_debts: 900, credit_score: 690, employment_type: 'self_employed' },
  },
  {
    ref: 'DEMO-PAYIO',
    label: 'Interest paid monthly',
    detail: '$600k · borrower pays interest',
    scenario: { accrue_interest: false },
    borrower: { income: 150_000, monthly_debts: 400, credit_score: 740, employment_type: 'W2' },
  },
]
