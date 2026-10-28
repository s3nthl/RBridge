/** RBridge mark: two towers and a suspension cable over a deck. */
export function BridgeMark({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" className={className}>
      <path d="M2 23h28" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M9 27V7M23 27V7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M2 9c3 9 4 11 7 11h14c3 0 4-2 7-11" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" />
      <path d="M9 8c3.5 7 4.5 8.5 7 8.5S19.5 15 23 8" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export function Logo() {
  return (
    <span className="inline-flex items-center gap-2 text-ink">
      <BridgeMark />
      <span className="text-[1.05rem] font-semibold tracking-tight">
        R<span className="text-accent">Bridge</span>
      </span>
    </span>
  )
}
