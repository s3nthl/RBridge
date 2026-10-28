import type { Metadata } from 'next'
import FaqList from '@/components/faq/FaqList'
import { ButtonLink, Container, DisplayHeading, Eyebrow } from '@/components/ui/primitives'

export const metadata: Metadata = {
  title: 'FAQ',
  description: 'How the RBridge taxes and insurance second lien works: eligibility, interest, the cap, and what happens after funding.',
}

export default function FaqPage() {
  return (
    <Container className="py-16 sm:py-24">
      <div className="grid gap-12 lg:grid-cols-[1fr_2fr] lg:gap-20">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <Eyebrow>Questions</Eyebrow>
          <DisplayHeading as="h1" className="mt-4 text-5xl sm:text-6xl">
            Frequently asked.
          </DisplayHeading>
          <p className="mt-5 text-lg leading-relaxed text-ink-2">
            How the taxes and insurance second lien works, from the first draw to the end of funding.
          </p>
          <ButtonLink href="/calculate" className="mt-8">Run a scenario</ButtonLink>
        </div>
        <FaqList />
      </div>
    </Container>
  )
}
