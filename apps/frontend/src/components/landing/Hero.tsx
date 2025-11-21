import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Container, Button, Badge } from './ui';
import { BlurFade, GradientText } from './animations';
import { FloatingParticles, AmbientGlow } from './HeroVisuals';

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center pt-32 pb-20 overflow-hidden">
      {/* Background Effects */}
      <AmbientGlow />

      {/* Floating particles */}
      <FloatingParticles />

      <Container className="relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <BlurFade delay={0}>
            <Badge variant="primary" className="mb-8">
              Publishing Administration for Independent Producers
            </Badge>
          </BlurFade>

          {/* Main Headline */}
          <BlurFade delay={0.1}>
            <h1 className="text-display-xl md:text-display-2xl text-white mb-8">
              Your royalties.{' '}
              <GradientText
                from="from-brand-blue"
                to="to-cyan-400"
                className="inline"
              >
                Finally tracked.
              </GradientText>
            </h1>
          </BlurFade>

          {/* Subtitle */}
          <BlurFade delay={0.2}>
            <p className="text-body-xl text-text-secondary max-w-2xl mx-auto mb-12">
              We collect your performance royalties, process the complex PRO statements,
              and pay you monthly. See every dollar. Control your catalog. Get paid.
            </p>
          </BlurFade>

          {/* CTA Buttons */}
          <BlurFade delay={0.3}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  to="/apply"
                  variant="primary"
                  size="lg"
                  icon={<ArrowRight className="w-5 h-5" />}
                  className="shadow-glow-md hover:shadow-glow-lg"
                >
                  Get Started
                </Button>
              </motion.div>
              <Button
                href="#features"
                variant="secondary"
                size="lg"
              >
                See How It Works
              </Button>
            </div>
          </BlurFade>

          {/* Trust Indicators */}
          <BlurFade delay={0.4}>
            <div className="mt-16 flex flex-wrap items-center justify-center gap-8 text-text-muted text-sm">
              {[
                { label: 'BMI, ASCAP, SESAC' },
                { label: '$50 Minimum Payout' },
                { label: 'No Lock-In Contracts' }
              ].map((item, i) => (
                <motion.div
                  key={item.label}
                  className="flex items-center gap-2"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 + i * 0.1 }}
                >
                  <motion.div
                    className="w-2 h-2 rounded-full bg-green-500"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
                  />
                  <span>{item.label}</span>
                </motion.div>
              ))}
            </div>
          </BlurFade>
        </div>

        {/* Hero Visual - Dashboard Preview */}
        <BlurFade delay={0.5}>
          <motion.div
            className="mt-20 relative"
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6, duration: 1, ease: [0.25, 0.1, 0.25, 1] }}
          >
            {/* Glow effect behind */}
            <div className="absolute -inset-4 bg-brand-blue/10 blur-[80px] rounded-full" />

            {/* Dashboard mockup card */}
            <motion.div
              className="relative rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.08] to-white/[0.02] backdrop-blur-xl overflow-hidden shadow-2xl"
              whileHover={{ y: -5 }}
              transition={{ duration: 0.3 }}
            >
              {/* Window chrome */}
              <div className="flex items-center gap-2 px-5 py-4 border-b border-white/10 bg-white/[0.02]">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <div className="flex-1 text-center">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10">
                    <div className="w-3 h-3 rounded-full bg-green-500/50" />
                    <span className="text-xs text-text-muted font-mono">producertour.com/dashboard</span>
                  </div>
                </div>
                <div className="w-[52px]" />
              </div>

              {/* Dashboard content preview */}
              <div className="p-6 md:p-10">
                {/* Stats row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-6">
                  {[
                    { label: 'Total Earnings', value: '$24,892.47', trend: '+12.3%', color: 'blue' },
                    { label: 'This Month', value: '$3,421.18', trend: '+8.7%', color: 'green' },
                    { label: 'Pending', value: '$892.33', trend: 'Processing', color: 'purple' }
                  ].map((stat, i) => (
                    <motion.div
                      key={stat.label}
                      className="relative group bg-white/[0.03] hover:bg-white/[0.06] rounded-2xl p-5 border border-white/[0.05] hover:border-white/[0.1] transition-all"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.9 + i * 0.1 }}
                      whileHover={{ y: -2 }}
                    >
                      <p className="text-text-muted text-sm mb-2">{stat.label}</p>
                      <p className="text-2xl md:text-3xl font-bold text-white mb-1">{stat.value}</p>
                      <p className={`text-xs font-medium ${
                        stat.color === 'green' ? 'text-green-400' :
                        stat.color === 'purple' ? 'text-purple-400' :
                        'text-brand-blue'
                      }`}>
                        {stat.trend}
                      </p>
                    </motion.div>
                  ))}
                </div>

                {/* Chart */}
                <motion.div
                  className="bg-white/[0.03] rounded-2xl p-5 border border-white/[0.05]"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.2 }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-text-muted">Monthly Revenue</span>
                    <span className="text-xs text-green-400 font-medium">+23% vs last year</span>
                  </div>
                  <div className="flex items-end justify-between h-28 md:h-36 gap-1.5 md:gap-2">
                    {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88].map((h, i) => (
                      <motion.div
                        key={i}
                        className="flex-1 bg-gradient-to-t from-brand-blue via-brand-blue to-cyan-400 rounded-t-md relative group cursor-pointer"
                        initial={{ height: 0 }}
                        animate={{ height: `${h}%` }}
                        transition={{ delay: 1.3 + i * 0.04, duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
                        whileHover={{ scaleY: 1.05 }}
                      >
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded bg-white/10 backdrop-blur-sm text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                          ${(h * 50).toLocaleString()}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  <div className="flex justify-between mt-3 text-[10px] text-text-muted">
                    <span>Jan</span>
                    <span>Feb</span>
                    <span>Mar</span>
                    <span>Apr</span>
                    <span>May</span>
                    <span>Jun</span>
                    <span>Jul</span>
                    <span>Aug</span>
                    <span>Sep</span>
                    <span>Oct</span>
                    <span>Nov</span>
                    <span>Dec</span>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        </BlurFade>
      </Container>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-surface to-transparent pointer-events-none" />
    </section>
  );
}
