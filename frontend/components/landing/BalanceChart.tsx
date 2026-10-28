import { money } from '@/lib/format'
import { PORTLAND, PORTLAND_BALANCE, PORTLAND_MONTHLY_DRAW } from './portland'

// Chart geometry in viewBox units; the SVG scales to its container width.
const W = 640
const H = 300
const PAD = { top: 20, right: 16, bottom: 40, left: 56 }
const PLOT_W = W - PAD.left - PAD.right
const PLOT_H = H - PAD.top - PAD.bottom
const Y_MAX = 60_000
const Y_TICKS = [0, 20_000, 40_000, 60_000]
const X_TICKS = [0, 12, 24, 36, 48, 60]

const x = (month: number) => PAD.left + (month / PORTLAND.fundingMonths) * PLOT_W
const y = (value: number) => PAD.top + PLOT_H - (value / Y_MAX) * PLOT_H

/** Cumulative T&I drawn (principal) at each month end. */
function cumulativeDraws(): number[] {
  const out: number[] = []
  let total = 0
  for (let m = 0; m < PORTLAND.fundingMonths; m++) {
    total += PORTLAND_MONTHLY_DRAW[Math.floor(m / 12)]
    out.push(total)
  }
  return out
}

function areaPath(top: number[], bottom: number[]): string {
  const upper = top.map((v, i) => `${x(i + 1)},${y(v)}`)
  const lower = bottom.map((v, i) => `${x(i + 1)},${y(v)}`).reverse()
  return `M${x(0)},${y(0)} L${upper.join(' L')} L${lower.join(' L')} Z`
}

export default function BalanceChart() {
  const principal = cumulativeDraws()
  const zeros = principal.map(() => 0)
  const last = PORTLAND_BALANCE[PORTLAND_BALANCE.length - 1]

  return (
    <figure className="w-full">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-labelledby="balance-chart-title balance-chart-desc"
        className="h-auto w-full"
      >
        <title id="balance-chart-title">Second-lien balance over the 60-month funding period</title>
        <desc id="balance-chart-desc">
          The balance grows from $0 to {money(last)} by month 60: {money(last - PORTLAND.accruedInterest)} of taxes
          and insurance paid plus {money(PORTLAND.accruedInterest)} of accrued interest, staying under the{' '}
          {money(PORTLAND.cap)} cap.
        </desc>

        {Y_TICKS.map(t => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeWidth="1" />
            <text x={PAD.left - 10} y={y(t)} dy="0.32em" textAnchor="end" fontSize="11" fill="var(--ink-3)" className="num">
              {t === 0 ? '$0' : `$${t / 1000}k`}
            </text>
          </g>
        ))}
        {X_TICKS.map(t => (
          <text key={t} x={x(t)} y={H - PAD.bottom + 20} textAnchor="middle" fontSize="11" fill="var(--ink-3)" className="num">
            {t}
          </text>
        ))}
        <text x={PAD.left + PLOT_W / 2} y={H - 4} textAnchor="middle" fontSize="11" fill="var(--ink-2)">
          Month of funding period
        </text>

        <path d={areaPath(principal, zeros)} fill="var(--steel)" fillOpacity="0.85" />
        <path d={areaPath(PORTLAND_BALANCE, principal)} fill="var(--accent)" fillOpacity="0.85" />

        <line x1={PAD.left} x2={W - PAD.right} y1={y(PORTLAND.cap)} y2={y(PORTLAND.cap)} stroke="var(--ink)" strokeWidth="1.5" strokeDasharray="5 4" />
        <text x={PAD.left + 8} y={y(PORTLAND.cap) + 16} fontSize="11" fill="var(--ink)" fontWeight="600">
          10% cap · {money(PORTLAND.cap)}
        </text>

        <circle cx={x(60)} cy={y(last)} r="4" fill="var(--accent)" stroke="var(--surface)" strokeWidth="2" />
        <text x={x(60) - 8} y={y(last) - 10} textAnchor="end" fontSize="12" fontWeight="600" fill="var(--ink)" className="num">
          {money(last)}
        </text>
      </svg>
      <figcaption className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-ink-2">
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm bg-steel" aria-hidden="true" /> Taxes & insurance paid
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm bg-accent" aria-hidden="true" /> Accrued interest
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-0 w-4 border-t-2 border-dashed border-ink" aria-hidden="true" /> Cap
        </span>
      </figcaption>
    </figure>
  )
}
