import AfterFunding from '@/components/landing/AfterFunding'
import FinalCta from '@/components/landing/FinalCta'
import ForCreditUnions from '@/components/landing/ForCreditUnions'
import Hero from '@/components/landing/Hero'
import HowItWorks from '@/components/landing/HowItWorks'
import PortlandExample from '@/components/landing/PortlandExample'

export default function HomePage() {
  return (
    <>
      <Hero />
      <HowItWorks />
      <PortlandExample />
      <AfterFunding />
      <ForCreditUnions />
      <FinalCta />
    </>
  )
}
