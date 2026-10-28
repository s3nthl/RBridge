import { ButtonLink, Container, DisplayHeading, Eyebrow } from '@/components/ui/primitives'

const POINTS = [
  {
    title: 'No borrower PII',
    body: 'RBridge receives only the numbers the engine needs. Names, SSNs, addresses and loan files stay in your systems.',
  },
  {
    title: 'Deterministic and auditable',
    body: 'The same inputs always give the same outputs. Every run logs its inputs, the rule version and a request ID.',
  },
  {
    title: 'Versioned rules',
    body: 'Each scenario stores the engine version that produced it, so any result can be reproduced for review.',
  },
  {
    title: 'Works with any LOS',
    body: 'An adapter layer maps your loan origination system into one canonical input. The engine never knows which LOS sent it.',
  },
] as const

export default function ForCreditUnions() {
  return (
    <section className="border-b border-line py-20 sm:py-28" aria-labelledby="cu-heading">
      <Container className="grid gap-12 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
        <div>
          <Eyebrow>For credit unions</Eyebrow>
          <DisplayHeading className="mt-4 text-4xl sm:text-5xl">
            <span id="cu-heading">Built to sit beside your loan process.</span>
          </DisplayHeading>
          <p className="mt-5 text-lg leading-relaxed text-ink-2">
            RBridge is a calculation and scenario engine, not a lender. Credit decisions stay with you.
          </p>
          <ButtonLink href="/faq" variant="secondary" className="mt-8">Read the FAQ</ButtonLink>
        </div>

        <dl className="grid gap-x-10 gap-y-10 sm:grid-cols-2">
          {POINTS.map(p => (
            <div key={p.title} className="border-t border-line-strong pt-5">
              <dt className="text-lg font-semibold tracking-tight text-ink">{p.title}</dt>
              <dd className="mt-2 text-[15px] leading-relaxed text-ink-2">{p.body}</dd>
            </div>
          ))}
        </dl>
      </Container>
    </section>
  )
}
