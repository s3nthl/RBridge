import { Container, DisplayHeading, Eyebrow } from '@/components/ui/primitives'

const STEPS = [
  {
    title: 'Buy with 20% down',
    body: 'A purchase borrower takes a first lien of 80% of the price at a fixed rate. Nothing about the first lien changes.',
  },
  {
    title: 'The second lien pays T&I',
    body: 'For 60 months, the servicer pays property tax and homeowner insurance from the second lien as they come due. No cash goes to the borrower.',
  },
  {
    title: 'Interest stays inside the cap',
    body: 'Interest is charged only on what has been drawn and added to the balance. Principal plus interest stays within 10% of the price.',
  },
  {
    title: 'Settle up after funding',
    body: 'Option A keeps the first and amortizes the second over 20 years. Option B refinances both into one new first.',
  },
] as const

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-20 border-b border-line py-20 sm:py-28">
      <Container>
        <div className="max-w-2xl">
          <Eyebrow>How it works</Eyebrow>
          <DisplayHeading className="mt-4 text-4xl sm:text-5xl">
            One payment the borrower can plan around.
          </DisplayHeading>
          <p className="mt-5 text-lg leading-relaxed text-ink-2">
            Taxes and insurance rise every year. During funding, the borrower&rsquo;s payment doesn&rsquo;t.
          </p>
        </div>

        <ol className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <li key={step.title} className="flex flex-col bg-surface p-6 sm:p-7">
              <span className="num font-display text-5xl leading-none text-accent">{String(i + 1).padStart(2, '0')}</span>
              <h3 className="mt-6 text-lg font-semibold tracking-tight text-ink">{step.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{step.body}</p>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  )
}
