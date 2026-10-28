import { PORTLAND_SCENARIO, PROGRAM } from '@/lib/scenario'

/** Slider state. Rates are held in percent so slider steps stay exact. */
export interface SimulatorValues {
  purchasePrice: number
  firstLienRatePct: number
  taxRatePct: number
  insuranceAnnual: number
  secondLienRatePct: number
  fundingMonths: number
  refiRatePct: number
  accrueInterest: boolean
}

export const SLIDER_LIMITS = {
  purchasePrice: { min: 200_000, max: 2_000_000, step: 5_000 },
  firstLienRatePct: { min: 3, max: 10, step: 0.05 },
  taxRatePct: { min: 0.2, max: 2.5, step: 0.05 },
  insuranceAnnual: { min: 400, max: 8_000, step: 50 },
  secondLienRatePct: { min: 4, max: 12, step: 0.25 },
  fundingMonths: { min: 12, max: 120, step: 12 },
  refiRatePct: { min: 3, max: 10, step: 0.05 },
} as const

export const DEFAULT_VALUES: SimulatorValues = {
  purchasePrice: PORTLAND_SCENARIO.purchase_price,
  firstLienRatePct: PORTLAND_SCENARIO.first_lien_rate * 100,
  taxRatePct: PORTLAND_SCENARIO.tax_rate * 100,
  insuranceAnnual: PORTLAND_SCENARIO.insurance_annual,
  secondLienRatePct: PROGRAM.secondLienRate * 100,
  fundingMonths: PROGRAM.fundingMonths,
  refiRatePct: PORTLAND_SCENARIO.refi_rate * 100,
  accrueInterest: true,
}
