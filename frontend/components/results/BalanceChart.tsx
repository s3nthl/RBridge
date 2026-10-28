import { money, num } from '@/lib/format'
import type { MonthRow } from '@/types'

const W = 640
const H = 280
const PAD = { top: 20, right: 20, bottom: 40, left: 64 }
const PLOT_W = W - PAD.left - PAD.right
const PLOT_H = H - PAD.top - PAD.bottom
const Y_TICKS = [0, 0.25, 0.5, 0.75, 1]

/** Second-lien balance by month against the cap. Pure SVG, server-rendered. */
export default function BalanceChart({
  months,
  cap,
  capReachedMonth,
}: {
  months: MonthRow[]
  cap: number
  capReachedMonth: number | null
}) {
  const n = months.length
  // Headroom above the cap so the cap line is never on the frame edge.
  const yMax = cap * 1.08
  const x = (m: number) => PAD.left + ((m - 1) / Math.max(n - 1, 1)) * PLOT_W
  const y = (v: number) => PAD.top + PLOT_H - (v / yMax) * PLOT_H

  const points = months.map(m => `${x(m.month).toFixed(1)},${y(num(m.balance)).toFixed(1)}`)
  const line = `M${points.join(' L')}`
  const area = `${line} L${x(n).toFixed(1)},${y(0).toFixed(1)} L${x(1).toFixed(1)},${y(0).toFixed(1)} Z`
  const xTicks = months.filter(m => m.month === 1 || m.month % 12 === 0).map(m => m.month)
  const last = months[n - 1]
  const capped = capReachedMonth !== null ? months[capReachedMonth - 1] : null

  return (
    <figure className="w-full">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-labelledby="balance-chart-title balance-chart-desc"
        data-testid="balance-chart"
        className="h-auto w-full overflow-visible"
      >
        <title id="balance-chart-title">Second-lien balance by month</title>
        <desc id="balance-chart-desc">
          {`The balance grows from $0 to ${money(last?.balance)} over ${n} months, against a cap of ${money(cap)}.`}
          {capReachedMonth !== null ? ` The cap is reached in month ${capReachedMonth}.` : ' The cap is not reached.'}
        </desc>

        {Y_TICKS.map(t => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(cap * t)} y2={y(cap * t)} stroke="var(--line)" strokeWidth="1" />
            <text x={PAD.left - 10} y={y(cap * t)} dy="0.32em" textAnchor="end" className="num fill-ink-3 text-[11px]">
              {money(cap * t)}
            </text>
          </g>
        ))}

        {xTicks.map(m => (
          <text key={m} x={x(m)} y={H - PAD.bottom + 18} textAnchor="middle" className="num fill-ink-3 text-[11px]">
            {m}
          </text>
        ))}
        <text x={PAD.left + PLOT_W / 2} y={H - 4} textAnchor="middle" className="fill-ink-3 text-[11px]">
          Month of funding period
        </text>

        <path d={area} fill="var(--steel)" opacity="0.12" />
        <path d={line} fill="none" stroke="var(--steel)" strokeWidth="2.25" strokeLinejoin="round" />

        <line
          x1={PAD.left} x2={W - PAD.right} y1={y(cap)} y2={y(cap)}
          stroke="var(--accent)" strokeWidth="1.5" strokeDasharray="5 4"
        />
        <text x={W - PAD.right} y={y(cap) - 8} textAnchor="end" className="fill-accent text-[11px] font-medium">
          Cap {money(cap)}
        </text>

        {capped && (
          <g data-testid="cap-reached-marker">
            <line x1={x(capped.month)} x2={x(capped.month)} y1={PAD.top} y2={y(0)} stroke="var(--warn)" strokeWidth="1" strokeDasharray="2 3" />
            <circle cx={x(capped.month)} cy={y(num(capped.balance))} r="4" fill="var(--warn)" />
            <text x={x(capped.month) - 6} y={PAD.top + 10} textAnchor="end" className="fill-warn text-[11px] font-medium">
              Cap reached · month {capped.month}
            </text>
          </g>
        )}

        {last && (
          <g>
            <circle cx={x(last.month)} cy={y(num(last.balance))} r="4" fill="var(--steel)" />
            <text x={x(last.month) - 8} y={y(num(last.balance)) - 12} textAnchor="end" className="num fill-steel text-[12px] font-semibold">
              {money(last.balance)}
            </text>
          </g>
        )}
      </svg>
      <figcaption className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-ink-2">
        <span className="inline-flex items-center gap-2"><span className="h-0.5 w-5 bg-steel" aria-hidden="true" />Balance incl. accrued interest</span>
        <span className="inline-flex items-center gap-2"><span className="w-5 border-t-2 border-dashed border-accent" aria-hidden="true" />Cap (principal + interest)</span>
      </figcaption>
    </figure>
  )
}
