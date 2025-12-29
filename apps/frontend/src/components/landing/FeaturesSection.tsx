import { motion } from 'framer-motion';
import { Container, Section, SectionHeader, Card, IconBox } from './ui';
import { ScrollReveal, StaggerContainer, StaggerItem } from './animations';
import { featuresData } from './data';

export function FeaturesSection() {
  return (
    <Section id="features" padding="xl" className="relative">
      {/* Background accent */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-brand-blue/[0.02] to-transparent pointer-events-none" />

      <Container className="relative">
        <ScrollReveal>
          <SectionHeader
            title="Everything You Need to Get Paid"
            subtitle="We handle the complex business of music royalties so you can focus on what matters—making music."
          />
        </ScrollReveal>

        {/* Bento Grid Layout */}
        <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuresData.map((feature, index) => (
            <StaggerItem key={feature.title}>
              <motion.div
                className={`h-full ${
                  // Make first and fourth cards span 2 columns on large screens for visual interest
                  (index === 0 || index === 3) ? 'lg:col-span-1' : ''
                }`}
                whileHover={{ y: -8 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="h-full group" hover>
                  {/* Icon */}
                  <div className="mb-6">
                    <IconBox variant="gradient" size="lg">
                      <span className="text-3xl">{feature.icon}</span>
                    </IconBox>
                  </div>

                  {/* Content */}
                  <h3 className="text-xl font-semibold text-white mb-3 group-hover:text-brand-blue transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-text-secondary leading-relaxed">
                    {feature.description}
                  </p>

                  {/* Hover indicator */}
                  <div className="mt-6 flex items-center gap-2 text-brand-blue text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    <span>Learn more</span>
                    <motion.span
                      initial={{ x: 0 }}
                      whileHover={{ x: 4 }}
                    >
                      →
                    </motion.span>
                  </div>
                </Card>
              </motion.div>
            </StaggerItem>
          ))}
        </StaggerContainer>

        {/* Bottom CTA */}
        <ScrollReveal className="mt-16 text-center">
          <p className="text-text-secondary mb-6">
            Ready to take control of your royalties?
          </p>
          <a
            href="/apply"
            className="inline-flex items-center gap-2 text-brand-blue hover:text-white transition-colors font-medium"
          >
            Start your application
            <span>→</span>
          </a>
        </ScrollReveal>
      </Container>
    </Section>
  );
}
