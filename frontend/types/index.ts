// Mirrors backend/core/schemas.py. Decimals arrive as strings; parse with num() from lib/format.

export type Decimal = string

export type EmploymentType = 'W2' | '1099' | 'self_employed' | 'retired'
export type RiskBand = 'Low' | 'Moderate' | 'Elevated' | 'High'

export interface ScenarioInput {
  purchase_price: number
  first_lien_ltv?: number
  first_lien_rate: number
  first_lien_term_months?: number
  tax_rate: number
  tax_growth?: number
  special_assessment_rate?: number
  special_assessment_growth?: number
  fund_special_assessments?: boolean
  insurance_annual: number
  insurance_growth?: number
  second_lien_cap_pct?: number
  second_lien_rate?: number
  accrue_interest?: boolean
  funding_months?: number
  amort_months?: number
  refi_rate: number
  refi_term_months?: number
  pmi_rate?: number
  closing_cost_pct?: number
  max_tax_rate?: number
}

export interface UnderwritingProfile {
  income: number
  monthly_debts: number
  credit_score: number
  employment_type: EmploymentType
}

export interface YearRow {
  year: number
  ti_monthly: Decimal
  payment_without_second: Decimal
  payment_with_second: Decimal
  relief_monthly: Decimal
  relief_pct: Decimal
}

export interface MonthRow {
  month: number
  ti: Decimal
  draw: Decimal
  interest: Decimal
  interest_paid: Decimal
  balance: Decimal
  borrower_payment: Decimal
}

export interface ScenarioResult {
  calc_version: string
  first_lien_amount: Decimal
  first_lien_pi: Decimal
  ti_monthly_year1: Decimal
  payment_without_second_year1: Decimal
  relief_month1: Decimal
  avg_monthly_relief: Decimal
  avg_relief_pct: Decimal
  total_draws: Decimal
  total_accrued_interest: Decimal
  total_interest_paid_monthly: Decimal
  cap_amount: Decimal
  shortfall_months: number
  cap_reached_month: number | null
  cap_needed_pct: Decimal
  commitment_cltv: Decimal
  second_lien_balance: Decimal
  cap_room: Decimal
  first_lien_balance_at_end: Decimal
  total_debt_at_end: Decimal
  payment_without_second_after: Decimal
  option_a_payment: Decimal
  option_a_total_payment: Decimal
  option_a_total_interest: Decimal
  option_b_new_loan: Decimal
  option_b_payment: Decimal
  option_b_payment_change: Decimal
  option_b_payment_change_pct: Decimal
  option_b_payment_full_term: Decimal
  option_b_payment_change_full_term: Decimal
  option_b_breakeven_rate: Decimal | null
  option_b_breakeven_rate_drop: Decimal | null
  option_b_ltv: Decimal
  option_b_pmi_required: boolean
  option_b_pmi_monthly: Decimal
  option_b_payment_change_with_pmi: Decimal
  option_b_breakeven_rate_with_pmi: Decimal | null
  option_b_breakeven_rate_drop_with_pmi: Decimal | null
  option_b_closing_costs: Decimal
  years: YearRow[]
  months: MonthRow[]
}

export interface RiskFactor {
  name: string
  value: string
  points: number
}

export interface RiskAssessment {
  score: number
  band: RiskBand
  dti_during_funding: Decimal
  dti_after_funding: Decimal
  factors: RiskFactor[]
}

export interface ApiError {
  code: string
  field: string | null
  message: string
}

export interface ApiEnvelope<T> {
  success: boolean
  data: T | null
  meta: { request_id: string; calc_version: string; tenant_id: string; timestamp: string }
  errors: ApiError[]
}

export interface CalculateData {
  scenario: ScenarioResult
}

export interface InitiateData {
  transaction_id: string
  transaction_token: string
  results_url: string
  avg_monthly_relief: Decimal
  payment_with_second_year1: Decimal
  payment_without_second_year1: Decimal
  risk_band: RiskBand
}

export interface TransactionData {
  transaction_id: string
  tenant_id: string
  borrower_ref: string
  status: string
  expires_at: string
  scenario_input: Record<keyof ScenarioInput, Decimal | number | boolean>
  result: ScenarioResult
  risk: RiskAssessment
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export interface ChatHistoryData {
  transaction_id: string
  messages: ChatMessage[]
}

export interface SuggestionsData {
  transaction_id: string
  suggestions: string[]
}
