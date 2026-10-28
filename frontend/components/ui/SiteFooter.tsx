import Link from 'next/link'
import { Logo } from './Logo'

export default function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="space-y-3">
          <Logo />
          <p className="max-w-sm text-sm leading-relaxed text-ink-2">
            A second lien that pays property taxes and homeowner insurance during the early years of a mortgage, so the
            monthly payment starts at principal and interest.
          </p>
        </div>
        <div>
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-ink-3">Product</p>
          <ul className="space-y-2 text-sm">
            <li><Link className="text-ink-2 hover:text-ink" href="/calculate">Run a scenario</Link></li>
            <li><Link className="text-ink-2 hover:text-ink" href="/simulator">Simulator</Link></li>
            <li><Link className="text-ink-2 hover:text-ink" href="/lookup">Property lookup</Link></li>
          </ul>
        </div>
        <div>
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-ink-3">Learn</p>
          <ul className="space-y-2 text-sm">
            <li><Link className="text-ink-2 hover:text-ink" href="/#how-it-works">How it works</Link></li>
            <li><Link className="text-ink-2 hover:text-ink" href="/faq">FAQ</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line">
        <p className="mx-auto max-w-6xl px-4 py-6 text-xs leading-relaxed text-ink-3 sm:px-6">
          Illustrative only. Not an offer, a commitment to lend, or a borrower disclosure. Program terms, rates and
          eligibility are set by the participating lender. © {new Date().getFullYear()} RBridge.
        </p>
      </div>
    </footer>
  )
}
