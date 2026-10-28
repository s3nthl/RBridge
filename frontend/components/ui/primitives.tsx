import Link from 'next/link'
import type { ComponentProps, ReactNode } from 'react'
import type { RiskBand } from '@/types'

/* ── Layout ─────────────────────────────────────────────────── */

export function Container({ className = '', children }: { className?: string; children: ReactNode }) {
  return <div className={`mx-auto w-full max-w-6xl px-4 sm:px-6 ${className}`}>{children}</div>
}

/** Small uppercase label above a heading. */
export function Eyebrow({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <p className={`text-xs font-medium uppercase tracking-[0.16em] text-accent ${className}`}>{children}</p>
  )
}

/** Serif display heading. Size via className (e.g. text-4xl sm:text-5xl). */
export function DisplayHeading({
  as: Tag = 'h2',
  className = '',
  children,
}: {
  as?: 'h1' | 'h2' | 'h3'
  className?: string
  children: ReactNode
}) {
  return (
    <Tag className={`font-display font-normal leading-[1.05] tracking-[-0.01em] text-ink ${className}`}>
      {children}
    </Tag>
  )
}

export function Card({ className = '', children, ...rest }: ComponentProps<'div'>) {
  return (
    <div className={`rounded-2xl border border-line bg-surface shadow-card ${className}`} {...rest}>
      {children}
    </div>
  )
}

/* ── Buttons ────────────────────────────────────────────────── */

type Variant = 'primary' | 'secondary' | 'ghost'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent text-accent-ink hover:bg-accent-hover',
  secondary: 'border border-line-strong bg-surface text-ink hover:border-ink-3',
  ghost: 'text-ink-2 hover:text-ink',
}

const BUTTON_BASE =
  'inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50'

export function Button({
  variant = 'primary',
  className = '',
  ...rest
}: ComponentProps<'button'> & { variant?: Variant }) {
  return <button className={`${BUTTON_BASE} ${VARIANTS[variant]} ${className}`} {...rest} />
}

export function ButtonLink({
  variant = 'primary',
  className = '',
  ...rest
}: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={`${BUTTON_BASE} ${VARIANTS[variant]} ${className}`} {...rest} />
}

/* ── Data display ───────────────────────────────────────────── */

/** Label + big tabular number + optional note. */
export function Stat({
  label,
  value,
  note,
  tone = 'ink',
  className = '',
  testId,
}: {
  label: string
  value: ReactNode
  note?: ReactNode
  tone?: 'ink' | 'accent' | 'steel' | 'good' | 'warn' | 'bad'
  className?: string
  testId?: string
}) {
  const tones = {
    ink: 'text-ink', accent: 'text-accent', steel: 'text-steel',
    good: 'text-good', warn: 'text-warn', bad: 'text-bad',
  }
  return (
    <div className={className}>
      <p className="text-xs font-medium uppercase tracking-[0.12em] text-ink-3">{label}</p>
      <p data-testid={testId} className={`num mt-1.5 text-2xl font-semibold tracking-tight ${tones[tone]}`}>{value}</p>
      {note && <p className="mt-1 text-sm text-ink-2">{note}</p>}
    </div>
  )
}

const BAND_STYLES: Record<RiskBand, string> = {
  Low: 'bg-good-soft text-good',
  Moderate: 'bg-steel-soft text-steel',
  Elevated: 'bg-warn-soft text-warn',
  High: 'bg-bad-soft text-bad',
}

export function RiskPill({ band, score }: { band: RiskBand; score: number }) {
  return (
    <span
      data-testid="risk-pill"
      data-band={band}
      className={`num inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${BAND_STYLES[band]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {band} risk · {score}/100
    </span>
  )
}

/** Structured API errors rendered as a list. */
export function ErrorList({ errors }: { errors: { code: string; message: string }[] }) {
  if (errors.length === 0) return null
  return (
    <div role="alert" data-testid="error-list" className="rounded-xl border border-bad/30 bg-bad-soft px-4 py-3">
      <ul className="space-y-1 text-sm text-bad">
        {errors.map((e, i) => (
          <li key={`${e.code}-${i}`} data-code={e.code}>{e.message}</li>
        ))}
      </ul>
    </div>
  )
}

/* ── Form fields ────────────────────────────────────────────── */

export function NumberField({
  id,
  label,
  value,
  onChange,
  prefix,
  suffix,
  hint,
  step = 'any',
  min,
  max,
  required = true,
  error,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  prefix?: string
  suffix?: string
  hint?: string
  step?: string
  min?: number
  max?: number
  required?: boolean
  error?: string
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink">
        {label}
        {hint && <span className="ml-1.5 font-normal text-ink-3">{hint}</span>}
      </label>
      <div
        className={`flex items-center rounded-xl border bg-surface transition-colors focus-within:border-accent ${
          error ? 'border-bad' : 'border-line'
        }`}
      >
        {prefix && <span className="select-none pl-3.5 text-sm text-ink-3">{prefix}</span>}
        <input
          id={id}
          name={id}
          type="number"
          inputMode="decimal"
          step={step}
          min={min}
          max={max}
          required={required}
          value={value}
          onChange={e => onChange(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className="num w-full min-w-0 bg-transparent px-3.5 py-2.5 text-[15px] text-ink outline-none placeholder:text-ink-3"
        />
        {suffix && <span className="select-none whitespace-nowrap pr-3.5 text-sm text-ink-3">{suffix}</span>}
      </div>
      {error && <p id={`${id}-error`} className="mt-1 text-xs text-bad">{error}</p>}
    </div>
  )
}

export function Toggle({
  id,
  label,
  description,
  checked,
  onChange,
}: {
  id: string
  label: string
  description?: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-line bg-surface px-4 py-3">
      <span>
        <span className="block text-sm font-medium text-ink">{label}</span>
        {description && <span className="mt-0.5 block text-xs text-ink-2">{description}</span>}
      </span>
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input id={id} type="checkbox" role="switch" checked={checked} onChange={e => onChange(e.target.checked)} className="peer sr-only" />
        <span className="h-6 w-10 rounded-full bg-line-strong transition-colors peer-checked:bg-accent" />
        <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-surface shadow transition-transform peer-checked:translate-x-4" />
      </span>
    </label>
  )
}
