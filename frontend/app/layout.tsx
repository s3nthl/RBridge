import type { Metadata } from 'next'
import { Instrument_Serif, Inter_Tight, JetBrains_Mono } from 'next/font/google'
import SiteFooter from '@/components/ui/SiteFooter'
import SiteHeader from '@/components/ui/SiteHeader'
import './globals.css'

const body = Inter_Tight({ variable: '--font-body', subsets: ['latin'] })
const display = Instrument_Serif({
  variable: '--font-display-serif',
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
})
const numeric = JetBrains_Mono({ variable: '--font-numeric', subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    default: 'RBridge — Taxes & insurance, bridged',
    template: '%s · RBridge',
  },
  description:
    'RBridge is a second lien that pays property taxes and homeowner insurance in the early years of a mortgage, so the payment starts at principal and interest.',
}

// Applies a saved theme before paint so there is no flash; with no saved
// choice the CSS follows prefers-color-scheme.
const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('theme');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${body.variable} ${display.variable} ${numeric.variable} h-full`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-paper">
          Skip to content
        </a>
        <SiteHeader />
        <main id="main" className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  )
}
