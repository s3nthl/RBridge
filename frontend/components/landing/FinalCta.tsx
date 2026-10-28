import { BridgeMark } from '@/components/ui/Logo'
import { ButtonLink, Container, DisplayHeading } from '@/components/ui/primitives'

export default function FinalCta() {
  return (
    <section className="pt-20 sm:pt-28">
      <Container>
        <div className="relative overflow-hidden rounded-3xl bg-ink px-6 py-14 text-center sm:px-12 sm:py-20">
          <BridgeMark className="mx-auto h-10 w-10 text-paper" />
          <DisplayHeading className="mx-auto mt-6 max-w-2xl text-4xl text-paper sm:text-5xl">
            See what it does for <em className="text-accent">your</em> borrower.
          </DisplayHeading>
          <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-paper/70">
            Enter a price, rate, taxes and insurance. You get the year-by-year payment, the balance at the end of
            funding, and both exit options.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/calculate" className="px-6 py-3 text-[15px]">Run a scenario</ButtonLink>
            <ButtonLink
              href="/lookup"
              variant="ghost"
              className="border border-paper/25 px-6 py-3 text-[15px] text-paper hover:border-paper/60 hover:text-paper"
            >
              Look up a property
            </ButtonLink>
          </div>
        </div>
      </Container>
    </section>
  )
}
