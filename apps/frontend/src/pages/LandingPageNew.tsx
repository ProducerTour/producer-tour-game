import './LandingPageNew.css';
import 'lenis/dist/lenis.css';
import {
  Header,
  Hero,
  HitSongsCarousel,
  LiveCounter,
  RoyaltyEstimator,
  RoyaltyFlow,
  FeaturesSection,
  PricingSection,
  ProcessSection,
  FAQSection,
  CTASection,
  EmailSignupSection,
  DiscordSection,
  Footer,
  Divider
} from '../components/landing';
import SmoothScroll from '../components/SmoothScroll';

/**
 * Producer Tour Landing Page
 *
 * Premium 2025 SaaS landing page built with:
 * - React 18 + TypeScript
 * - Tailwind CSS (design system in tailwind.config.js)
 * - Framer Motion (scroll reveals, stagger animations)
 * - Lenis (buttery-smooth scrolling)
 *
 * Section Order:
 * 1. Hero - Main value prop + dashboard preview
 * 2. Live Counter - Real-time platform stats
 * 3. Hit Songs Carousel - Producer community songs with Spotify data
 * 4. Royalty Estimator - Interactive calculator
 * 5. Royalty Flow - Visualization of money flow
 * 6. Features - Core benefits (publishing admin focused)
 * 7. Process - How it works (4 steps)
 * 8. Pricing - Two plans (Publishing Admins & Creators)
 * 9. FAQ - Filterable accordion
 * 10. Email Signup - Newsletter
 * 11. Discord - Community CTA
 * 12. CTA - Final conversion
 * 13. Footer
 */
export default function LandingPage() {
  return (
    <SmoothScroll>
      <div className="min-h-screen bg-surface text-white overflow-x-hidden">
        {/* Fixed Header */}
        <Header />

        {/* Main Content */}
        <main>
          {/* Hero Section */}
          <Hero />

          {/* Live Stats Counter */}
          <LiveCounter />

          {/* Hit Songs Carousel - Producer Community */}
          <HitSongsCarousel />

          {/* Divider */}
          <div className="max-w-6xl mx-auto px-4">
            <Divider />
          </div>

          {/* Interactive Royalty Estimator */}
          <RoyaltyEstimator />

          {/* How Royalties Flow */}
          <RoyaltyFlow />

          {/* Features Section */}
          <FeaturesSection />

          {/* Process Section */}
          <ProcessSection />

          {/* Pricing Section */}
          <PricingSection />

          {/* FAQ Section */}
          <FAQSection />

          {/* Email Signup */}
          <EmailSignupSection />

          {/* Discord Community */}
          <DiscordSection />

          {/* Final CTA */}
          <CTASection />
        </main>

        {/* Footer */}
        <Footer />
      </div>
    </SmoothScroll>
  );
}
