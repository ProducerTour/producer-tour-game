import { motion } from 'framer-motion';
import { Container, Section, SectionHeader } from './ui';
import { ScrollReveal, StaggerContainer, StaggerItem } from './animations';
import { processSteps } from './data';

export function ProcessSection() {
  return (
    <Section id="process" padding="xl" className="relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-hero-gradient pointer-events-none" />

      <Container className="relative">
        <ScrollReveal>
          <SectionHeader
            title="How It Works"
            subtitle="From application to your first payout in four simple steps."
          />
        </ScrollReveal>

        {/* Steps */}
        <StaggerContainer className="relative">
          {/* Connecting line */}
          <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-y-1/2 z-0" />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {processSteps.map((step, index) => (
              <StaggerItem key={step.number}>
                <motion.div
                  className="relative text-center lg:text-left"
                  whileHover={{ y: -8 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Step number */}
                  <div className="relative inline-flex items-center justify-center mb-6">
                    {/* Glow effect */}
                    <div className="absolute inset-0 bg-brand-blue/20 blur-xl rounded-full scale-150" />

                    <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-blue/20 to-brand-blue/5 border border-brand-blue/30 flex items-center justify-center">
                      <span className="text-3xl font-bold text-brand-blue">
                        {step.number}
                      </span>
                    </div>

                    {/* Connector dot on desktop */}
                    {index < processSteps.length - 1 && (
                      <div className="hidden lg:block absolute -right-4 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white/20" />
                    )}
                  </div>

                  {/* Content */}
                  <h3 className="text-xl font-semibold text-white mb-3">
                    {step.title}
                  </h3>
                  <p className="text-text-secondary leading-relaxed max-w-xs mx-auto lg:mx-0">
                    {step.description}
                  </p>
                </motion.div>
              </StaggerItem>
            ))}
          </div>
        </StaggerContainer>

        {/* Bottom CTA */}
        <ScrollReveal className="mt-20 text-center">
          <a
            href="/apply"
            className="inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-white text-surface font-semibold hover:bg-white/90 hover:shadow-glow-sm hover:-translate-y-0.5 transition-all"
          >
            Start Your Journey
            <span>→</span>
          </a>
        </ScrollReveal>
      </Container>
    </Section>
  );
}
