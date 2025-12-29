import { motion } from 'framer-motion';
import { Radio, Tv, Music2, Building2, ArrowRight, Wallet, CheckCircle } from 'lucide-react';
import { Container, Section } from './ui';
import { ScrollReveal } from './animations';

const sources = [
  { icon: Radio, label: 'Radio', color: 'from-orange-500 to-red-500' },
  { icon: Music2, label: 'Streaming', color: 'from-green-500 to-emerald-500' },
  { icon: Tv, label: 'TV & Film', color: 'from-blue-500 to-indigo-500' },
  { icon: Building2, label: 'Live Venues', color: 'from-purple-500 to-pink-500' },
];

const pros = ['BMI', 'ASCAP', 'SESAC'];

export function RoyaltyFlow() {
  return (
    <Section padding="xl" className="relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-surface via-surface-50/30 to-surface" />

      <Container className="relative">
        <ScrollReveal>
          <div className="text-center mb-16">
            <h2 className="text-display-md md:text-display-lg text-white mb-4">
              How Your Money <span className="text-green-400">Actually</span> Gets to You
            </h2>
            <p className="text-text-secondary max-w-2xl mx-auto">
              Royalties flow through a complex system. We simplify the entire journey and make sure nothing gets lost.
            </p>
          </div>
        </ScrollReveal>

        {/* Flow Diagram */}
        <div className="relative max-w-5xl mx-auto">
          {/* Mobile: Vertical Flow */}
          <div className="lg:hidden space-y-6">
            {/* Sources */}
            <ScrollReveal>
              <div className="grid grid-cols-2 gap-3">
                {sources.map((source, i) => (
                  <motion.div
                    key={source.label}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <div className={`inline-flex w-10 h-10 rounded-xl bg-gradient-to-br ${source.color} items-center justify-center mb-2`}>
                      <source.icon className="w-5 h-5 text-white" />
                    </div>
                    <p className="text-sm text-white">{source.label}</p>
                  </motion.div>
                ))}
              </div>
            </ScrollReveal>

            {/* Arrow */}
            <div className="flex justify-center">
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
              >
                <ArrowRight className="w-5 h-5 text-text-muted rotate-90" />
              </motion.div>
            </div>

            {/* PROs */}
            <ScrollReveal delay={0.2}>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs text-text-muted mb-3 text-center">Performance Rights Organizations</p>
                <div className="flex justify-center gap-3">
                  {pros.map((pro) => (
                    <div key={pro} className="px-4 py-2 rounded-lg bg-white/5 border border-white/10">
                      <span className="text-sm font-medium text-white">{pro}</span>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollReveal>

            {/* Arrow */}
            <div className="flex justify-center">
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="w-10 h-10 rounded-full bg-brand-blue/20 flex items-center justify-center"
              >
                <ArrowRight className="w-5 h-5 text-brand-blue rotate-90" />
              </motion.div>
            </div>

            {/* Producer Tour */}
            <ScrollReveal delay={0.3}>
              <div className="rounded-2xl border-2 border-brand-blue/50 bg-brand-blue/10 p-6 text-center">
                <div className="inline-flex w-14 h-14 rounded-2xl bg-brand-blue items-center justify-center mb-3">
                  <CheckCircle className="w-7 h-7 text-white" />
                </div>
                <p className="text-lg font-bold text-white mb-1">Producer Tour</p>
                <p className="text-xs text-text-secondary">We collect, process & pay you</p>
              </div>
            </ScrollReveal>

            {/* Arrow */}
            <div className="flex justify-center">
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center"
              >
                <ArrowRight className="w-5 h-5 text-green-400 rotate-90" />
              </motion.div>
            </div>

            {/* Your Wallet */}
            <ScrollReveal delay={0.4}>
              <div className="rounded-2xl border-2 border-green-500/50 bg-green-500/10 p-6 text-center">
                <div className="inline-flex w-14 h-14 rounded-2xl bg-green-500 items-center justify-center mb-3">
                  <Wallet className="w-7 h-7 text-white" />
                </div>
                <p className="text-lg font-bold text-white mb-1">Your Wallet</p>
                <p className="text-xs text-text-secondary">Monthly payments, $50 minimum</p>
              </div>
            </ScrollReveal>
          </div>

          {/* Desktop: Horizontal Flow */}
          <div className="hidden lg:block">
            <div className="flex items-center justify-between gap-4">
              {/* Sources Column */}
              <div className="flex-shrink-0 w-[180px]">
                <p className="text-xs text-text-muted mb-4 text-center">Revenue Sources</p>
                <div className="space-y-3">
                  {sources.map((source, i) => (
                    <motion.div
                      key={source.label}
                      className="rounded-xl border border-white/10 bg-white/[0.03] p-3 flex items-center gap-3"
                      initial={{ opacity: 0, x: -30 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1 }}
                    >
                      <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${source.color} flex items-center justify-center flex-shrink-0`}>
                        <source.icon className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-sm text-white">{source.label}</span>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Animated Lines */}
              <div className="flex-1 relative h-[250px]">
                <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                  {/* Animated paths from sources to PROs */}
                  {sources.map((_, i) => {
                    const startY = 30 + i * 55;
                    return (
                      <motion.path
                        key={`path-${i}`}
                        d={`M 0 ${startY} Q 80 ${startY}, 80 125 T 160 125`}
                        fill="none"
                        stroke="url(#flowGradient)"
                        strokeWidth="2"
                        strokeLinecap="round"
                        initial={{ pathLength: 0, opacity: 0 }}
                        whileInView={{ pathLength: 1, opacity: 0.6 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.5 + i * 0.1, duration: 1 }}
                      />
                    );
                  })}
                  {/* Gradient definition */}
                  <defs>
                    <linearGradient id="flowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.5" />
                      <stop offset="100%" stopColor="#22c55e" stopOpacity="0.5" />
                    </linearGradient>
                  </defs>
                </svg>

                {/* Animated dots flowing along paths */}
                {[0, 1, 2, 3].map((i) => (
                  <motion.div
                    key={`dot-${i}`}
                    className="absolute w-2 h-2 rounded-full bg-brand-blue shadow-lg shadow-brand-blue/50"
                    initial={{ left: 0, top: 30 + i * 55, opacity: 0 }}
                    animate={{
                      left: ['0%', '100%'],
                      top: [30 + i * 55, 125, 125],
                      opacity: [0, 1, 1, 0],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      delay: i * 0.5,
                      ease: 'easeInOut',
                    }}
                  />
                ))}
              </div>

              {/* PROs */}
              <motion.div
                className="flex-shrink-0 w-[140px] rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
              >
                <p className="text-xs text-text-muted mb-3 text-center">PROs</p>
                <div className="space-y-2">
                  {pros.map((pro) => (
                    <div key={pro} className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-center">
                      <span className="text-sm font-medium text-white">{pro}</span>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Arrow */}
              <motion.div
                className="flex-shrink-0"
                initial={{ opacity: 0, scale: 0 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5 }}
              >
                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center">
                  <ArrowRight className="w-6 h-6 text-text-muted" />
                </div>
              </motion.div>

              {/* Producer Tour */}
              <motion.div
                className="flex-shrink-0 w-[160px] rounded-2xl border-2 border-brand-blue/50 bg-brand-blue/10 p-5 text-center"
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.6 }}
              >
                <div className="inline-flex w-12 h-12 rounded-xl bg-brand-blue items-center justify-center mb-2">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
                <p className="text-sm font-bold text-white">Producer Tour</p>
                <p className="text-xs text-text-secondary mt-1">Collect & Process</p>
              </motion.div>

              {/* Arrow */}
              <motion.div
                className="flex-shrink-0"
                initial={{ opacity: 0, scale: 0 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.7 }}
              >
                <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                  <ArrowRight className="w-6 h-6 text-green-400" />
                </div>
              </motion.div>

              {/* Your Wallet */}
              <motion.div
                className="flex-shrink-0 w-[140px] rounded-2xl border-2 border-green-500/50 bg-green-500/10 p-5 text-center"
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.8 }}
              >
                <div className="inline-flex w-12 h-12 rounded-xl bg-green-500 items-center justify-center mb-2">
                  <Wallet className="w-6 h-6 text-white" />
                </div>
                <p className="text-sm font-bold text-white">Your Wallet</p>
                <p className="text-xs text-text-secondary mt-1">$50 minimum</p>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Bottom benefits */}
        <ScrollReveal delay={0.5}>
          <div className="mt-16 grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              { title: 'No More Confusion', desc: 'We decode complex PRO statements so you understand every dollar' },
              { title: 'Nothing Slips Through', desc: 'Our system catches royalties others miss across all territories' },
              { title: 'Faster Payments', desc: 'Monthly payouts with just $50 minimum—no waiting for quarterly checks' },
            ].map((benefit, i) => (
              <motion.div
                key={benefit.title}
                className="text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.6 + i * 0.1 }}
              >
                <h4 className="text-white font-medium mb-2">{benefit.title}</h4>
                <p className="text-sm text-text-muted">{benefit.desc}</p>
              </motion.div>
            ))}
          </div>
        </ScrollReveal>
      </Container>
    </Section>
  );
}
