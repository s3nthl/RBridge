import type { Decimal } from '@/types'

export function num(v: Decimal | number | null | undefined): number {
  if (v === null || v === undefined) return 0
  return typeof v === 'number' ? v : parseFloat(v)
}

const usd0 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const usd2 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** $3,226 — whole dollars, for anything shown to a borrower. */
export function money(v: Decimal | number | null | undefined): string {
  return usd0.format(Math.round(num(v)))
}

/** $3,225.75 — cents, for detail tables. */
export function moneyCents(v: Decimal | number | null | undefined): string {
  return usd2.format(num(v))
}

/** +$38 / −$184 with an explicit sign. */
export function signedMoney(v: Decimal | number | null | undefined): string {
  const n = Math.round(num(v))
  if (n === 0) return usd0.format(0)
  return `${n > 0 ? '+' : '−'}${usd0.format(Math.abs(n))}`
}

/** 0.173735 → "17.4%" */
export function pct(v: Decimal | number | null | undefined, digits = 1): string {
  return `${(num(v) * 100).toFixed(digits)}%`
}

/** 0.011257 → "1.13 pts" — a rate difference in percentage points. */
export function points(v: Decimal | number | null | undefined, digits = 2): string {
  return `${(num(v) * 100).toFixed(digits)} pts`
}
