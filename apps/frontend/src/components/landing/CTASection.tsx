import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Container, Section, Button } from './ui';
import { ScrollReveal, GradientText } from './animations';

export function CTASection() {
  return (
    <Section padding="xl" className="relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-brand-blue/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-brand-purple/10 rounded-full blur-[100px]" />
      </div>

      <Container className="relative">
        <ScrollReveal>
          <motion.div
            className="relative rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-sm p-12 md:p-20 text-center overflow-hidden"
            whileHover={{ scale: 1.01 }}
            transition={{ duration: 0.3 }}
          >
            {/* Inner glow */}
            <div className="absolute inset-0 bg-gradient-to-b from-brand-blue/10 to-transparent opacity-50" />

            {/* Content */}
            <div className="relative z-10 max-w-3xl mx-auto">
              <h2 className="text-display-lg md:text-display-xl text-white mb-6">
                Ready to{' '}
                <GradientText from="from-brand-blue" to="to-cyan-400">
                  Get Paid
                </GradientText>
                ?
              </h2>

              <p className="text-body-lg text-text-secondary mb-10 max-w-xl mx-auto">
                Join hundreds of independent producers who trust Producer Tour
                to handle their royalties. Apply today and take control of your earnings.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button
                  to="/apply"
                  variant="primary"
                  size="xl"
                  icon={<ArrowRight className="w-5 h-5" />}
                >
                  Get Started Free
                </Button>
                <Button
                  href="mailto:hello@producertour.com"
                  variant="ghost"
                  size="lg"
                >
                  Talk to Us
                </Button>
              </div>

              {/* Trust badges */}
              <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-text-muted text-sm">
                <span>No setup fees</span>
                <span className="w-1 h-1 rounded-full bg-white/20" />
                <span>$50 minimum payout</span>
                <span className="w-1 h-1 rounded-full bg-white/20" />
                <span>Cancel anytime</span>
              </div>
            </div>
          </motion.div>
        </ScrollReveal>
      </Container>
    </Section>
  );
}

// Smaller Email Signup Section
export function EmailSignupSection() {
  return (
    <Section padding="lg" className="relative">
      <Container>
        <ScrollReveal>
          <div className="max-w-2xl mx-auto text-center">
            <h3 className="text-display-sm text-white mb-4">
              Stay in the Loop
            </h3>
            <p className="text-text-secondary mb-8">
              Get updates on new features, industry insights, and tips for maximizing your royalties.
            </p>

            <form className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-5 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-text-muted focus:outline-none focus:border-brand-blue/50 focus:ring-1 focus:ring-brand-blue/50 transition-all"
              />
              <Button type="submit" variant="primary" size="md">
                Subscribe
              </Button>
            </form>

            <p className="mt-4 text-xs text-text-muted">
              No spam, ever. Unsubscribe anytime.
            </p>
          </div>
        </ScrollReveal>
      </Container>
    </Section>
  );
}

// Discord Community Section
export function DiscordSection() {
  return (
    <Section padding="lg" className="relative">
      <Container>
        <ScrollReveal>
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#5865F2]/10 to-transparent p-8 md:p-12">
            <div className="flex flex-col md:flex-row items-center gap-8">
              {/* Discord Icon */}
              <div className="flex-shrink-0">
                <div className="w-20 h-20 rounded-2xl bg-[#5865F2]/20 border border-[#5865F2]/30 flex items-center justify-center">
                  <svg className="w-10 h-10 text-[#5865F2]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                  </svg>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-xl font-semibold text-white mb-2">
                  Join Our Community
                </h3>
                <p className="text-text-secondary mb-4">
                  Connect with other producers, get help, share wins, and stay updated on new features.
                </p>
              </div>

              {/* CTA */}
              <div className="flex-shrink-0">
                <a
                  href="https://discord.gg/producertour"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#5865F2] text-white font-semibold hover:bg-[#4752C4] transition-colors"
                >
                  Join Discord
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </Container>
    </Section>
  );
}
