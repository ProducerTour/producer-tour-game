/**
 * Street Style Landing Template
 * Music/Rap/Urban aesthetic with premium design
 *
 * Style: Bold typography, dark with gold accents, gritty textures, energetic
 */

import { useRef } from 'react';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import { ArrowRight, Check, Mic2, Music, Headphones, TrendingUp, Wallet, Crown, Flame, Star } from 'lucide-react';

// ============================================
// HERO SECTION - STREET STYLE
// ============================================

function HeroSection() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  });

  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 0.9]);

  return (
    <section ref={ref} className="relative min-h-screen flex items-center justify-center overflow-hidden bg-black">
      {/* Gritty texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Gold gradient accents */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent" />
      <div className="absolute top-1/3 -left-40 w-80 h-80 bg-amber-500/10 rounded-full blur-[100px]" />
      <div className="absolute bottom-1/3 -right-40 w-80 h-80 bg-orange-500/10 rounded-full blur-[100px]" />

      {/* Diagonal lines pattern */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: 'repeating-linear-gradient(45deg, white 0, white 1px, transparent 0, transparent 50%)',
          backgroundSize: '20px 20px',
        }}
      />

      <motion.div className="relative z-10 max-w-6xl mx-auto px-6 text-center" style={{ opacity, scale }}>
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-none bg-amber-500/10 border border-amber-500/30 text-sm font-bold uppercase tracking-widest text-amber-400">
            <Flame className="w-4 h-4" />
            For Independent Producers
          </span>
        </motion.div>

        {/* Main headline - Bold condensed style */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="mb-6"
        >
          <h1 className="text-6xl md:text-8xl lg:text-[10rem] font-black uppercase leading-[0.85] tracking-tighter">
            <span className="text-white block">Get Your</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-500 to-amber-400 block">
              Bag
            </span>
          </h1>
        </motion.div>

        {/* Subtitle */}
        <motion.p
          className="max-w-xl mx-auto text-lg md:text-xl text-white/60 leading-relaxed mb-10 font-medium"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          Stop letting labels and PROs hold your money.{' '}
          <span className="text-amber-400">We track it. We collect it. We pay you.</span>
        </motion.p>

        {/* CTAs */}
        <motion.div
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <motion.a
            href="/apply"
            className="group px-10 py-5 bg-gradient-to-r from-amber-500 to-orange-500 text-black font-black uppercase tracking-wider text-lg hover:from-amber-400 hover:to-orange-400 transition-all"
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="flex items-center gap-2">
              Start Now <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </span>
          </motion.a>

          <motion.a
            href="#how"
            className="px-10 py-5 border-2 border-white/20 text-white font-bold uppercase tracking-wider text-lg hover:border-amber-500/50 hover:text-amber-400 transition-all"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
          >
            How It Works
          </motion.a>
        </motion.div>

        {/* Stats row */}
        <motion.div
          className="mt-20 flex flex-wrap items-center justify-center gap-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
        >
          {[
            { value: '$2.5M+', label: 'Paid Out' },
            { value: '500+', label: 'Producers' },
            { value: '100%', label: 'Transparent' },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-3xl md:text-4xl font-black text-amber-400">{stat.value}</div>
              <div className="text-white/40 text-sm uppercase tracking-widest mt-1">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </motion.div>

      {/* Bottom accent */}
      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent" />
    </section>
  );
}

// ============================================
// SECTION WRAPPER
// ============================================

function Section({ children, className = '', dark = false }: { children: React.ReactNode; className?: string; dark?: boolean }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <motion.section
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6 }}
      className={`${dark ? 'bg-black' : 'bg-zinc-950'} ${className}`}
    >
      {children}
    </motion.section>
  );
}

// ============================================
// WHY SECTION
// ============================================

function WhySection() {
  const problems = [
    { icon: '💸', title: "You're Getting Robbed", desc: "PROs are sitting on your money for months. Labels take cuts you never agreed to." },
    { icon: '📊', title: "No Visibility", desc: "You have no idea where your money is or when it's coming." },
    { icon: '⏰', title: "Wasting Time", desc: "Hours spent chasing payments instead of making hits." },
  ];

  return (
    <Section className="py-24" dark>
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-6xl font-black uppercase text-white mb-4">
            The Game Is <span className="text-red-500">Broken</span>
          </h2>
          <p className="text-white/50 text-lg">Here's what's really happening to your royalties</p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {problems.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="p-8 bg-zinc-900/50 border border-zinc-800 hover:border-red-500/30 transition-colors"
            >
              <div className="text-4xl mb-4">{item.icon}</div>
              <h3 className="text-xl font-bold text-white mb-2">{item.title}</h3>
              <p className="text-white/50">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </Section>
  );
}

// ============================================
// SOLUTION SECTION
// ============================================

function SolutionSection() {
  const features = [
    { icon: TrendingUp, title: 'Track Everything', desc: 'See every stream, every placement, every dollar in real-time.', color: 'text-green-400' },
    { icon: Wallet, title: 'Monthly Payouts', desc: '$50 minimum. No waiting months for your bread.', color: 'text-amber-400' },
    { icon: Crown, title: 'Own Your Catalog', desc: 'Full control. Full transparency. No BS.', color: 'text-purple-400' },
    { icon: Mic2, title: 'All PROs Covered', desc: 'BMI, ASCAP, SESAC - we handle all of them.', color: 'text-cyan-400' },
  ];

  return (
    <Section className="py-32">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-6xl font-black uppercase text-white mb-4">
            We <span className="text-amber-400">Fix</span> That
          </h2>
          <p className="text-white/50 text-lg max-w-2xl mx-auto">
            Producer Tour handles the business so you can focus on the music
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ x: 10 }}
              className="flex items-start gap-6 p-6 bg-zinc-900/30 border-l-4 border-amber-500/50 hover:border-amber-500 transition-all"
            >
              <div className={`p-3 bg-zinc-800 ${feature.color}`}>
                <feature.icon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
                <p className="text-white/50">{feature.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </Section>
  );
}

// ============================================
// HOW IT WORKS
// ============================================

function HowItWorksSection() {
  const steps = [
    { num: '01', title: 'Sign Up', desc: '2 minutes. No paperwork.' },
    { num: '02', title: 'Connect Your Catalog', desc: 'Import your tracks and splits.' },
    { num: '03', title: 'We Do The Work', desc: 'Registration, tracking, collection.' },
    { num: '04', title: 'Get Paid Monthly', desc: 'Direct deposit. No cap.' },
  ];

  return (
    <Section id="how" className="py-32" dark>
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-20"
        >
          <h2 className="text-4xl md:text-6xl font-black uppercase text-white">
            How It <span className="text-amber-400">Works</span>
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-4 gap-8">
          {steps.map((step, i) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="relative text-center"
            >
              <div className="text-6xl font-black text-amber-500/20 mb-4">{step.num}</div>
              <h3 className="text-xl font-bold text-white mb-2">{step.title}</h3>
              <p className="text-white/50 text-sm">{step.desc}</p>

              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-8 left-full w-full h-[2px] bg-gradient-to-r from-amber-500/30 to-transparent" />
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </Section>
  );
}

// ============================================
// SOCIAL PROOF
// ============================================

function SocialProofSection() {
  const testimonials = [
    { quote: "Finally getting paid what I'm owed. This changed my whole situation.", name: "D. Marcus", title: "Platinum Producer" },
    { quote: "The transparency is unmatched. I see every dollar, every stream.", name: "Kay Beats", title: "Independent Producer" },
    { quote: "Should've done this years ago. Stop sleeping on your royalties.", name: "T. Williams", title: "Multi-Platinum Engineer" },
  ];

  return (
    <Section className="py-32">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-6xl font-black uppercase text-white">
            Real <span className="text-amber-400">Talk</span>
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="p-8 bg-zinc-900/50 border border-zinc-800"
            >
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, j) => (
                  <Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-white/70 mb-6 italic">"{t.quote}"</p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center font-bold text-black">
                  {t.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <div className="font-bold text-white">{t.name}</div>
                  <div className="text-white/40 text-sm">{t.title}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </Section>
  );
}

// ============================================
// CTA SECTION
// ============================================

function CTASection() {
  return (
    <Section className="py-32 relative overflow-hidden" dark>
      {/* Background accents */}
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
        >
          <h2 className="text-5xl md:text-7xl font-black uppercase text-white mb-6">
            Stop Playing.
            <br />
            <span className="text-amber-400">Start Getting Paid.</span>
          </h2>
          <p className="text-white/50 text-xl mb-10 max-w-2xl mx-auto">
            Join 500+ producers who are finally collecting what they're owed.
          </p>

          <motion.a
            href="/apply"
            className="inline-flex items-center gap-3 px-12 py-6 bg-gradient-to-r from-amber-500 to-orange-500 text-black font-black uppercase tracking-wider text-xl hover:from-amber-400 hover:to-orange-400 transition-all"
            whileHover={{ scale: 1.05, y: -3 }}
            whileTap={{ scale: 0.98 }}
          >
            Claim Your Royalties <ArrowRight className="w-6 h-6" />
          </motion.a>

          <p className="mt-6 text-white/30 text-sm">Free to start • No credit card required</p>
        </motion.div>
      </div>
    </Section>
  );
}

// ============================================
// FOOTER
// ============================================

function Footer() {
  return (
    <footer className="py-12 bg-black border-t border-zinc-900">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-2xl font-black uppercase text-white">
            Producer<span className="text-amber-400">Tour</span>
          </div>
          <div className="flex items-center gap-8 text-white/40 text-sm">
            <a href="#" className="hover:text-amber-400 transition-colors">Privacy</a>
            <a href="#" className="hover:text-amber-400 transition-colors">Terms</a>
            <a href="#" className="hover:text-amber-400 transition-colors">Contact</a>
          </div>
          <p className="text-white/20 text-sm">© 2025 Producer Tour</p>
        </div>
      </div>
    </footer>
  );
}

// ============================================
// MAIN
// ============================================

export function StreetLandingPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <HeroSection />
      <WhySection />
      <SolutionSection />
      <HowItWorksSection />
      <SocialProofSection />
      <CTASection />
      <Footer />
    </div>
  );
}

export default StreetLandingPage;
