/**
 * Illustrative Portland-area borrower from the partner program summary.
 * Static display copy for the landing page; live numbers come from the
 * calc engine via /calculate. Values match backend test case 1.
 */
export const PORTLAND = {
  price: 600_000,
  firstLien: 480_000,
  firstLienRate: 0.071,
  pi: 3_226,
  taxRate: 0.01,
  insuranceAnnual: 1_600,
  secondLienRate: 0.08,
  fundingMonths: 60,
  cap: 60_000,
  avgRelief: 678,
  avgReliefPct: 0.174,
  endBalance: 49_570,
  accruedInterest: 8_874,
  capRoom: 10_430,
  endBalancePctOfPrice: 0.083,
  optionA: { addedPayment: 415, years: 20 },
  optionB: {
    newFirst: 501_881,
    ltv: 0.836,
    pmiRate: 0.005,
    pmiMonthly: 209,
    breakevenDropPts: 1.13,
    breakevenDropPtsWithPmi: 1.82,
  },
} as const

export interface PortlandYear {
  year: number
  without: number
  with: number
  relief: number
  reliefPct: number
}

export const PORTLAND_YEARS: PortlandYear[] = [
  { year: 1, without: 3_859, with: 3_226, relief: 633, reliefPct: 0.164 },
  { year: 2, without: 3_881, with: 3_226, relief: 655, reliefPct: 0.169 },
  { year: 3, without: 3_903, with: 3_226, relief: 677, reliefPct: 0.174 },
  { year: 4, without: 3_926, with: 3_226, relief: 701, reliefPct: 0.178 },
  { year: 5, without: 3_951, with: 3_226, relief: 725, reliefPct: 0.183 },
]

/** Month-end second-lien balance, months 1–60 (engine output, rounded to $1). */
export const PORTLAND_BALANCE: number[] = [
  633, 1271, 1913, 2559, 3209, 3864, 4523, 5186, 5854, 6527, 7204, 7885,
  8593, 9305, 10022, 10744, 11470, 12202, 12938, 13679, 14426, 15177, 15933, 16694,
  17483, 18277, 19076, 19881, 20691, 21506, 22327, 23153, 23985, 24822, 25665, 26514,
  27391, 28275, 29164, 30059, 30960, 31867, 32780, 33700, 34625, 35557, 36494, 37438,
  38413, 39394, 40381, 41375, 42376, 43383, 44397, 45418, 46446, 47480, 48521, 49570,
]

/** Monthly T&I drawn in each funding year (engine values to the cent). */
export const PORTLAND_MONTHLY_DRAW: number[] = [633.33, 655.0, 677.45, 700.71, 724.82]
