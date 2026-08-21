import LandingHeader from '../components/landing/LandingHeader'
import HeroSection from '../components/landing/HeroSection'
import SignalStrip from '../components/landing/SignalStrip'
import StatsBand from '../components/landing/StatsBand'
import FeatureSections from '../components/landing/FeatureSections'
import Testimonials from '../components/landing/Testimonials'
import TabbedOverview from '../components/landing/TabbedOverview'
import AudienceCards from '../components/landing/AudienceCards'
import FAQAccordion from '../components/landing/FAQAccordion'
import LandingFooter from '../components/landing/LandingFooter'

export default function LandingPage() {
  return (
    <div className="bg-paper">
      <LandingHeader />
      <HeroSection />
      <SignalStrip />
      <StatsBand />
      <FeatureSections />
      <Testimonials />
      <TabbedOverview />
      <AudienceCards />
      <FAQAccordion />
      <LandingFooter />
    </div>
  )
}
