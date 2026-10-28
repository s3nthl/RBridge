'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Logo } from './Logo'
import ThemeToggle from './ThemeToggle'

const NAV = [
  { href: '/#how-it-works', label: 'How it works' },
  { href: '/simulator', label: 'Simulator' },
  { href: '/lookup', label: 'Property lookup' },
  { href: '/faq', label: 'FAQ' },
] as const

export default function SiteHeader() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-paper/85 backdrop-blur-md" style={{ top: 'env(safe-area-inset-top, 0px)' }}>
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-4 sm:px-6">
        <Link href="/" aria-label="RBridge home" onClick={() => setOpen(false)}>
          <Logo />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {NAV.map(item => {
            const active = item.href === pathname
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-3.5 py-2 text-sm transition-colors ${
                  active ? 'bg-sunken text-ink' : 'text-ink-2 hover:text-ink'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/calculate"
            className="hidden rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper transition-opacity hover:opacity-85 sm:inline-flex"
          >
            Run a scenario
          </Link>
          <button
            type="button"
            className="grid h-9 w-9 place-items-center rounded-full border border-line text-ink md:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label="Menu"
            onClick={() => setOpen(o => !o)}
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
              {open ? <path d="M5 5l10 10M15 5 5 15" strokeLinecap="round" /> : <path d="M3 6h14M3 10h14M3 14h14" strokeLinecap="round" />}
            </svg>
          </button>
        </div>
      </div>

      <nav id="mobile-nav" aria-label="Mobile" hidden={!open} className="border-t border-line px-4 pb-4 md:hidden">
        {[...NAV, { href: '/calculate', label: 'Run a scenario' }].map(item => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className="block border-b border-line/60 py-3 text-ink"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  )
}
