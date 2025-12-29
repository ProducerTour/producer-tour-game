import { motion } from 'framer-motion';
import { Container, Section, SectionHeader, Card } from './ui';
import { ScrollReveal, StaggerContainer, StaggerItem } from './animations';
import { Check } from 'lucide-react';
import { Link } from 'react-router-dom';

const pricingPlans = [
  {
    name: 'For Publishing Admins',
    description: 'Essential tools for managing music publishing operations',
    price: 'Contact Us',
    priceSubtext: 'Custom pricing for teams',
    features: [
      'Metadata Index Tool',
      'Pub Deal Simulator',
      'Advance Estimator',
      'Priority Support',
      'Team Management',
    ],
    cta: 'Contact Sales',
    ctaLink: '/apply',
    featured: false,
    gradient: 'from-brand-blue/20 to-purple-500/20',
  },
  {
    name: 'For Creators',
    description: 'Everything you need to grow your music career',
    price: '$29',
    priceSubtext: '/month',
    features: [
      'Type Beat Video Uploader with Bulk Scheduling',
      'Opportunities Portal',
      'Pub Deal Simulator',
      'Advance Estimator',
      'Metadata Index Tool',
      'My Tour Profile',
      'Premium Discord Roles',
      'Access to Producer Tour Events',
    ],
    cta: 'Get Started',
    ctaLink: '/login',
    featured: true,
    gradient: 'from-green-500/20 to-brand-blue/20',
  },
];

export function PricingSection() {
  return (
    <Section id="pricing" padding="xl" className="relative">
      {/* Background accent */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-green-500/[0.02] to-transparent pointer-events-none" />

      <Container className="relative">
        <ScrollReveal>
          <SectionHeader
            title="Simple, Transparent Pricing"
            subtitle="Choose the plan that fits your needs. No hidden fees, cancel anytime."
          />
        </ScrollReveal>

        {/* Pricing Cards */}
        <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {pricingPlans.map((plan) => (
            <StaggerItem key={plan.name}>
              <motion.div
                className="h-full"
                whileHover={{ y: -8 }}
                transition={{ duration: 0.3 }}
              >
                <Card
                  className={`h-full relative overflow-hidden ${
                    plan.featured ? 'ring-2 ring-green-500/50' : ''
                  }`}
                  hover
                >
                  {/* Featured badge */}
                  {plan.featured && (
                    <div className="absolute top-4 right-4">
                      <span className="px-3 py-1 text-xs font-semibold bg-green-500/20 text-green-400 rounded-full border border-green-500/30">
                        Most Popular
                      </span>
                    </div>
                  )}

                  {/* Gradient overlay */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${plan.gradient} opacity-50`} />

                  <div className="relative">
                    {/* Plan name & description */}
                    <h3 className="text-xl font-bold text-white mb-2">
                      {plan.name}
                    </h3>
                    <p className="text-text-secondary text-sm mb-6">
                      {plan.description}
                    </p>

                    {/* Price */}
                    <div className="mb-8">
                      <span className="text-4xl font-bold text-white">{plan.price}</span>
                      {plan.priceSubtext && (
                        <span className="text-text-muted ml-1">{plan.priceSubtext}</span>
                      )}
                    </div>

                    {/* Features */}
                    <ul className="space-y-3 mb-8">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center mt-0.5">
                            <Check className="w-3 h-3 text-green-400" />
                          </div>
                          <span className="text-text-secondary text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    {/* CTA Button */}
                    <Link
                      to={plan.ctaLink}
                      className={`block w-full text-center py-3 px-6 rounded-xl font-semibold transition-all duration-300 ${
                        plan.featured
                          ? 'bg-white text-surface hover:bg-white/90 hover:shadow-glow-sm'
                          : 'bg-white/10 text-white border border-white/20 hover:bg-white/20 hover:border-white/30'
                      }`}
                    >
                      {plan.cta}
                    </Link>
                  </div>
                </Card>
              </motion.div>
            </StaggerItem>
          ))}
        </StaggerContainer>

        {/* Bottom note */}
        <ScrollReveal className="mt-12 text-center">
          <p className="text-text-muted text-sm">
            All plans include 14-day free trial. No credit card required.
          </p>
        </ScrollReveal>
      </Container>
    </Section>
  );
}
