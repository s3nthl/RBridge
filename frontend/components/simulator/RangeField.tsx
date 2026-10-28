'use client'

/** Labelled native range input. Native keeps keyboard and screen-reader support. */
export function RangeField({
  id,
  label,
  value,
  min,
  max,
  step,
  display,
  onChange,
  hint,
}: {
  id: string
  label: string
  value: number
  min: number
  max: number
  step: number
  display: string
  onChange: (v: number) => void
  hint?: string
}) {
  return (
    <div className="py-3.5">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium text-ink">
          {label}
          {hint && <span className="ml-1.5 font-normal text-ink-3">{hint}</span>}
        </label>
        <output htmlFor={id} className="num text-sm font-semibold text-ink" data-testid={`${id}-value`}>
          {display}
        </output>
      </div>
      <input
        id={id}
        name={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={display}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="h-2 w-full cursor-pointer accent-accent"
      />
    </div>
  )
}
