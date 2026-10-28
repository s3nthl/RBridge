import type { Metadata } from 'next'
import LookupView from '@/components/lookup/LookupView'
import { Container, DisplayHeading, Eyebrow } from '@/components/ui/primitives'

export const metadata: Metadata = {
  title: 'Property lookup',
  description: 'Look up a US property to estimate its taxes and insurance, then run it through RBridge.',
}

export default function LookupPage() {
  return (
    <Container className="py-12 sm:py-16">
      <header className="mb-10 max-w-2xl">
        <Eyebrow>Property lookup</Eyebrow>
        <DisplayHeading as="h1" className="mt-3 text-4xl sm:text-5xl">
          Start with the house. <em className="text-accent">We&apos;ll find the taxes.</em>
        </DisplayHeading>
        <p className="mt-4 text-ink-2">
          Type an address to estimate property taxes and homeowner insurance, the two costs the RBridge second lien
          pays during the funding period.
        </p>
      </header>
      <LookupView />
    </Container>
  )
}
