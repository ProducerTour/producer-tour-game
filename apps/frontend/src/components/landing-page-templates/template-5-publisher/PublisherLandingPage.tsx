/**
 * Publisher/Label Landing Template
 * Sophisticated editorial style - think major label meets fintech
 *
 * Includes all elements from main landing:
 * - Hero, Live Counter, Hit Songs, Royalty Estimator, Royalty Flow
 * - Features, Process, Pricing, FAQ, Email Signup, Discord, CTA, Footer
 */

import { useRef, useState, useEffect } from 'react';
import {
  motion,
  useScroll,
  useTransform,
  useInView,
  AnimatePresence,
  useMotionValue,
  useSpring,
} from 'framer-motion';
import {
  ArrowRight,
  ArrowUpRight,
  Play,
  Check,
  ChevronDown,
  ChevronRight,
  Music,
  Globe,
  Shield,
  Zap,
  Users,
  BarChart3,
  DollarSign,
  TrendingUp,
  Headphones,
  FileText,
  MessageCircle,
  Mail,
  Plus,
  Minus,
  ExternalLink,
} from 'lucide-react';

// ============================================
// SECTION WRAPPER WITH ANIMATIONS
// ============================================

function Section({
  children,
  className = '',
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  return (
    <motion.section
      ref={ref}
      id={id}
      initial={{ opacity: 0 }}
      animate={isInView ? { opacity: 1 } : {}}
      transition={{ duration: 0.6 }}
      className={className}
    >
      {children}
    </motion.section>
  );
}

// ============================================
// HERO SECTION
// ============================================

function HeroSection() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  });

  const opacity = useTransform(scrollYProgress, [0, 0.4], [1, 0]);
  const y = useTransform(scrollYProgress, [0, 0.4], [0, 80]);

  return (
    <section
      ref={ref}
      className="relative min-h-screen flex items-center justify-center bg-black pt-8 overflow-hidden"
    >
      {/* Subtle grain texture */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Large background text */}
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none select-none">
        <motion.span
          className="text-[20vw] font-black text-zinc-950 tracking-tighter"
          style={{ opacity: useTransform(scrollYProgress, [0, 0.3], [1, 0]) }}
        >
          ROYALTIES
        </motion.span>
      </div>

      <motion.div
        className="relative z-10 max-w-5xl mx-auto px-6 text-center"
        style={{ opacity, y }}
      >
        {/* Eyebrow */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <span className="inline-flex items-center gap-2 text-xs tracking-[0.25em] text-zinc-500 uppercase">
            <span className="w-8 h-px bg-red-600" />
            Publishing Administration
            <span className="w-8 h-px bg-red-600" />
          </span>
        </motion.div>

        {/* Main headline */}
        <motion.h1
          className="text-5xl md:text-7xl lg:text-8xl font-bold text-white leading-[0.95] tracking-tight mb-8"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
        >
          Collect Every
          <br />
          <span className="text-zinc-500">Dollar You're Owed</span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          Producer Tour is the publishing administration platform built for modern producers.
          We register your works, collect your royalties, and put money in your pocket.
        </motion.p>

        {/* CTAs */}
        <motion.div
          className="flex flex-col sm:flex-row gap-4 justify-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <motion.a
            href="/apply"
            className="group inline-flex items-center justify-center gap-3 px-8 py-4 bg-red-600 text-white font-semibold tracking-wide hover:bg-red-700 transition-all"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Get Started Free
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </motion.a>
          <motion.a
            href="#how-it-works"
            className="inline-flex items-center justify-center gap-3 px-8 py-4 border border-zinc-800 text-zinc-300 font-medium tracking-wide hover:border-zinc-600 hover:text-white transition-all"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Play className="w-4 h-4" />
            See How It Works
          </motion.a>
        </motion.div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="flex flex-col items-center gap-2"
        >
          <span className="text-xs tracking-widest text-zinc-600 uppercase">Scroll</span>
          <ChevronDown className="w-4 h-4 text-zinc-600" />
        </motion.div>
      </motion.div>
    </section>
  );
}

// ============================================
// LIVE COUNTER SECTION
// ============================================

function LiveCounterSection() {
  const [counts, setCounts] = useState({
    collected: 47234892,
    producers: 10847,
    songs: 523491,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setCounts((prev) => ({
        collected: prev.collected + Math.floor(Math.random() * 50),
        producers: prev.producers + (Math.random() > 0.95 ? 1 : 0),
        songs: prev.songs + (Math.random() > 0.9 ? 1 : 0),
      }));
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const stats = [
    { value: `$${(counts.collected / 1000000).toFixed(2)}M`, label: 'Royalties Collected', live: true },
    { value: counts.producers.toLocaleString(), label: 'Active Producers', live: false },
    { value: counts.songs.toLocaleString(), label: 'Songs Tracked', live: false },
  ];

  return (
    <Section className="py-20 bg-zinc-950 border-y border-zinc-900">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid md:grid-cols-3 gap-8 md:gap-0 md:divide-x divide-zinc-800">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              className="text-center px-8"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <div className="flex items-center justify-center gap-2 mb-2">
                {stat.live && (
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                )}
                <span className="text-4xl md:text-5xl font-bold text-white tabular-nums">
                  {stat.value}
                </span>
              </div>
              <span className="text-sm text-zinc-500 tracking-wide uppercase">{stat.label}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </Section>
  );
}

// ============================================
// HIT SONGS CAROUSEL
// ============================================

function HitSongsSection() {
  const songs = [
    { title: 'Money Trees', artist: 'Kendrick Lamar', producer: 'DJ Dahi', streams: '1.2B' },
    { title: 'Sicko Mode', artist: 'Travis Scott', producer: 'Hit-Boy', streams: '2.1B' },
    { title: 'HUMBLE.', artist: 'Kendrick Lamar', producer: 'Mike WiLL', streams: '1.8B' },
    { title: 'God\'s Plan', artist: 'Drake', producer: 'Cardo', streams: '2.4B' },
    { title: 'Mask Off', artist: 'Future', producer: 'Metro Boomin', streams: '1.5B' },
    { title: 'XO Tour Life', artist: 'Lil Uzi', producer: 'TM88', streams: '1.9B' },
  ];

  return (
    <Section className="py-24 bg-black overflow-hidden">
      <div className="max-w-6xl mx-auto px-6 mb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex items-end justify-between"
        >
          <div>
            <span className="text-xs tracking-[0.25em] text-zinc-500 uppercase mb-4 block">
              Community Hits
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-white">
              Songs Our Producers Made
            </h2>
          </div>
          <a href="#" className="hidden md:flex items-center gap-2 text-sm text-zinc-500 hover:text-white transition-colors">
            View All <ExternalLink className="w-4 h-4" />
          </a>
        </motion.div>
      </div>

      {/* Scrolling carousel */}
      <div className="relative">
        <motion.div
          className="flex gap-6 pl-6"
          animate={{ x: [0, -1500] }}
          transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
        >
          {[...songs, ...songs].map((song, i) => (
            <motion.div
              key={i}
              className="flex-shrink-0 w-72 p-6 bg-zinc-900/50 border border-zinc-800 hover:border-red-600/50 transition-colors group"
              whileHover={{ y: -5 }}
            >
              <div className="w-full aspect-square bg-zinc-800 mb-4 flex items-center justify-center">
                <Music className="w-12 h-12 text-zinc-700" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-1">{song.title}</h3>
              <p className="text-sm text-zinc-500 mb-2">{song.artist}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-600">Prod. {song.producer}</span>
                <span className="text-xs text-zinc-500">{song.streams} streams</span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </Section>
  );
}

// ============================================
// ROYALTY ESTIMATOR
// ============================================

function RoyaltyEstimatorSection() {
  const [streams, setStreams] = useState(1000000);
  const [syncPlacements, setSyncPlacements] = useState(2);

  const streamingRoyalties = Math.round(streams * 0.003 * 0.5); // $0.003 per stream, 50% writer share
  const syncRoyalties = syncPlacements * 15000; // $15k avg per sync
  const totalRoyalties = streamingRoyalties + syncRoyalties;

  return (
    <Section id="estimator" className="py-32 bg-zinc-950">
      <div className="max-w-4xl mx-auto px-6">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <span className="text-xs tracking-[0.25em] text-zinc-500 uppercase mb-4 block">
            Calculate Your Earnings
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Royalty Estimator
          </h2>
          <p className="text-zinc-400 max-w-lg mx-auto">
            See how much you could be earning with proper publishing administration.
          </p>
        </motion.div>

        <motion.div
          className="p-8 bg-black border border-zinc-800"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="grid md:grid-cols-2 gap-12">
            {/* Inputs */}
            <div className="space-y-8">
              <div>
                <label className="block text-sm text-zinc-400 mb-3">
                  Monthly Streams: <span className="text-white font-semibold">{(streams / 1000000).toFixed(1)}M</span>
                </label>
                <input
                  type="range"
                  min="100000"
                  max="10000000"
                  step="100000"
                  value={streams}
                  onChange={(e) => setStreams(Number(e.target.value))}
                  className="w-full h-1 bg-zinc-800 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-red-600 [&::-webkit-slider-thumb]:rounded-full"
                />
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-3">
                  Sync Placements/Year: <span className="text-white font-semibold">{syncPlacements}</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="1"
                  value={syncPlacements}
                  onChange={(e) => setSyncPlacements(Number(e.target.value))}
                  className="w-full h-1 bg-zinc-800 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-red-600 [&::-webkit-slider-thumb]:rounded-full"
                />
              </div>
            </div>

            {/* Results */}
            <div className="space-y-6">
              <div className="p-4 bg-zinc-900/50 border border-zinc-800">
                <div className="text-sm text-zinc-500 mb-1">Streaming Royalties</div>
                <div className="text-2xl font-bold text-white">${streamingRoyalties.toLocaleString()}/yr</div>
              </div>
              <div className="p-4 bg-zinc-900/50 border border-zinc-800">
                <div className="text-sm text-zinc-500 mb-1">Sync Revenue</div>
                <div className="text-2xl font-bold text-white">${syncRoyalties.toLocaleString()}/yr</div>
              </div>
              <div className="p-4 bg-red-600 text-white">
                <div className="text-sm text-red-200 mb-1">Total Estimated Earnings</div>
                <div className="text-3xl font-bold">${totalRoyalties.toLocaleString()}/yr</div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </Section>
  );
}

// ============================================
// ROYALTY FLOW VISUALIZATION
// ============================================

function RoyaltyFlowSection() {
  const sources = ['Spotify', 'Apple Music', 'YouTube', 'Radio', 'Sync', 'Live'];
  const pros = ['BMI', 'ASCAP', 'SESAC', 'GMR'];

  return (
    <Section className="py-32 bg-black">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          className="text-center mb-20"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <span className="text-xs tracking-[0.25em] text-zinc-500 uppercase mb-4 block">
            How It Works
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Where Your Money Comes From
          </h2>
          <p className="text-zinc-400 max-w-lg mx-auto">
            We collect royalties from every source, through every PRO, in every territory.
          </p>
        </motion.div>

        {/* Flow visualization */}
        <div className="grid md:grid-cols-3 gap-8 items-center">
          {/* Sources */}
          <motion.div
            className="space-y-3"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <div className="text-xs text-zinc-500 uppercase tracking-wide mb-4">Revenue Sources</div>
            {sources.map((source, i) => (
              <motion.div
                key={source}
                className="p-3 bg-zinc-900/50 border border-zinc-800 text-zinc-300 text-sm flex items-center justify-between"
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
              >
                {source}
                <ChevronRight className="w-4 h-4 text-zinc-600" />
              </motion.div>
            ))}
          </motion.div>

          {/* Center - Producer Tour */}
          <motion.div
            className="p-8 bg-red-600 text-white text-center"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <div className="w-16 h-16 bg-white flex items-center justify-center mx-auto mb-4">
              <Music className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-xl font-bold mb-2">Producer Tour</h3>
            <p className="text-sm text-red-200">
              We handle registration, collection, and distribution
            </p>
            <div className="mt-6 flex justify-center gap-2">
              {pros.map((pro) => (
                <span key={pro} className="px-2 py-1 bg-white/20 text-xs font-medium">
                  {pro}
                </span>
              ))}
            </div>
          </motion.div>

          {/* You */}
          <motion.div
            className="p-8 border-2 border-white text-center"
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <div className="w-16 h-16 border-2 border-white flex items-center justify-center mx-auto mb-4">
              <DollarSign className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">You Get Paid</h3>
            <p className="text-sm text-zinc-400">
              Monthly direct deposits, detailed statements, full transparency
            </p>
          </motion.div>
        </div>
      </div>
    </Section>
  );
}

// ============================================
// FEATURES SECTION
// ============================================

function FeaturesSection() {
  const features = [
    {
      icon: Globe,
      title: 'Global Registration',
      desc: 'We register your works with PROs in 180+ countries. No royalty left unclaimed.',
    },
    {
      icon: BarChart3,
      title: 'Real-Time Analytics',
      desc: 'Track your earnings by source, territory, and work. Know exactly where your money comes from.',
    },
    {
      icon: Shield,
      title: 'Catalog Protection',
      desc: 'We monitor for infringement and fight unauthorized use of your music.',
    },
    {
      icon: Zap,
      title: 'Fast Monthly Payouts',
      desc: 'No holdbacks, no delays. Your money hits your account every month.',
    },
    {
      icon: Users,
      title: 'Split Management',
      desc: 'Collaborate with confidence. We handle automatic payments to all contributors.',
    },
    {
      icon: Headphones,
      title: 'Sync Licensing',
      desc: 'Our team pitches your catalog to music supervisors for film, TV, and advertising.',
    },
  ];

  return (
    <Section id="features" className="py-32 bg-zinc-950">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          className="mb-20"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <span className="text-xs tracking-[0.25em] text-zinc-500 uppercase mb-4 block">
            Features
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-white">
            Built for Producers
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-zinc-800">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              className="p-8 bg-zinc-950 hover:bg-zinc-900/50 transition-colors group relative"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
            >
              <div className="absolute top-0 left-0 w-0 h-0.5 bg-red-600 group-hover:w-full transition-all duration-300" />
              <feature.icon className="w-8 h-8 text-zinc-600 group-hover:text-red-500 transition-colors mb-6" />
              <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-sm text-zinc-500 leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </Section>
  );
}

// ============================================
// PROCESS SECTION
// ============================================

function ProcessSection() {
  const steps = [
    { num: '01', title: 'Apply', desc: 'Submit your catalog for review. Takes 5 minutes.' },
    { num: '02', title: 'Onboard', desc: 'We register all your works with global PROs.' },
    { num: '03', title: 'Collect', desc: 'Our systems find and claim every royalty owed.' },
    { num: '04', title: 'Earn', desc: 'Receive monthly payments with detailed statements.' },
  ];

  return (
    <Section id="how-it-works" className="py-32 bg-black">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          className="text-center mb-20"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <span className="text-xs tracking-[0.25em] text-zinc-500 uppercase mb-4 block">
            Process
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-white">
            Four Simple Steps
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-4 gap-8">
          {steps.map((step, i) => (
            <motion.div
              key={step.num}
              className="relative"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <div className="text-6xl font-black text-red-600/30 mb-4">{step.num}</div>
              <h3 className="text-xl font-semibold text-white mb-2">{step.title}</h3>
              <p className="text-sm text-zinc-500">{step.desc}</p>
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-8 right-0 translate-x-1/2 w-full h-px bg-zinc-800" />
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </Section>
  );
}

// ============================================
// PRICING SECTION
// ============================================

function PricingSection() {
  const plans = [
    {
      name: 'Creator',
      desc: 'For independent producers',
      price: 'Free',
      commission: '20%',
      features: ['Unlimited catalog', 'All PRO registrations', 'Basic analytics', 'Monthly payouts', 'Email support'],
    },
    {
      name: 'Professional',
      desc: 'For established producers',
      price: '$29/mo',
      commission: '10%',
      features: ['Everything in Creator', 'Advanced analytics', 'Weekly payouts', 'Priority support', 'Sync opportunities', 'Dedicated manager'],
      featured: true,
    },
  ];

  return (
    <Section id="pricing" className="py-32 bg-zinc-950">
      <div className="max-w-4xl mx-auto px-6">
        <motion.div
          className="text-center mb-20"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <span className="text-xs tracking-[0.25em] text-zinc-500 uppercase mb-4 block">
            Pricing
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-zinc-400">No hidden fees. No lock-in contracts.</p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              className={`p-8 ${plan.featured ? 'bg-white text-black' : 'bg-black border border-zinc-800'}`}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <h3 className="text-2xl font-bold mb-1">{plan.name}</h3>
              <p className={`text-sm mb-6 ${plan.featured ? 'text-zinc-600' : 'text-zinc-500'}`}>
                {plan.desc}
              </p>

              <div className="mb-6">
                <span className="text-4xl font-bold">{plan.price}</span>
                <span className={`text-sm ml-2 ${plan.featured ? 'text-zinc-600' : 'text-zinc-500'}`}>
                  + {plan.commission} commission
                </span>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-sm">
                    <Check className={`w-4 h-4 ${plan.featured ? 'text-black' : 'text-zinc-500'}`} />
                    {feature}
                  </li>
                ))}
              </ul>

              <motion.a
                href="/apply"
                className={`block w-full py-4 text-center font-medium transition-colors ${
                  plan.featured
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-white text-black hover:bg-zinc-200'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Get Started
              </motion.a>
            </motion.div>
          ))}
        </div>
      </div>
    </Section>
  );
}

// ============================================
// FAQ SECTION
// ============================================

function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: 'What is publishing administration?',
      a: 'Publishing administration is the process of registering your songs with performance rights organizations (PROs), collecting royalties from all sources worldwide, and ensuring you get paid for every use of your music.',
    },
    {
      q: 'How long does it take to start earning?',
      a: 'Once registered, royalties typically start flowing within 3-6 months. The music industry payment cycle is slow, but we work to accelerate collections wherever possible.',
    },
    {
      q: 'Do I keep ownership of my music?',
      a: 'Absolutely. We never take ownership of your songs. You retain 100% of your copyrights. We simply administer your catalog on your behalf.',
    },
    {
      q: 'What makes Producer Tour different?',
      a: 'We\'re built specifically for producers, not just songwriters. We understand splits, production credits, and the unique challenges producers face in collecting their share.',
    },
    {
      q: 'Can I leave anytime?',
      a: 'Yes. There are no long-term contracts. You can terminate our agreement with 30 days notice, though some royalties may continue to flow through us for a transition period.',
    },
  ];

  return (
    <Section id="faq" className="py-32 bg-black">
      <div className="max-w-3xl mx-auto px-6">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <span className="text-xs tracking-[0.25em] text-zinc-500 uppercase mb-4 block">
            FAQ
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-white">
            Common Questions
          </h2>
        </motion.div>

        <div className="divide-y divide-zinc-800">
          {faqs.map((faq, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full py-6 flex items-center justify-between text-left"
              >
                <span className="text-lg font-medium text-white pr-8">{faq.q}</span>
                {openIndex === i ? (
                  <Minus className="w-5 h-5 text-zinc-500 flex-shrink-0" />
                ) : (
                  <Plus className="w-5 h-5 text-zinc-500 flex-shrink-0" />
                )}
              </button>
              <AnimatePresence>
                {openIndex === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <p className="pb-6 text-zinc-400 leading-relaxed">{faq.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </Section>
  );
}

// ============================================
// EMAIL SIGNUP SECTION
// ============================================

function EmailSignupSection() {
  const [email, setEmail] = useState('');

  return (
    <Section className="py-24 bg-zinc-950 border-y border-zinc-900">
      <div className="max-w-2xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <Mail className="w-10 h-10 text-zinc-600 mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-white mb-4">Stay in the Loop</h2>
          <p className="text-zinc-400 mb-8">
            Get industry insights, royalty tips, and Producer Tour updates delivered to your inbox.
          </p>

          <form className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 px-4 py-3 bg-black border border-zinc-800 text-white placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none"
            />
            <motion.button
              type="submit"
              className="px-6 py-3 bg-red-600 text-white font-medium hover:bg-red-700 transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Subscribe
            </motion.button>
          </form>
        </motion.div>
      </div>
    </Section>
  );
}

// ============================================
// DISCORD SECTION
// ============================================

function DiscordSection() {
  return (
    <Section className="py-24 bg-black">
      <div className="max-w-4xl mx-auto px-6">
        <motion.div
          className="p-12 bg-zinc-900/50 border border-zinc-800 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <MessageCircle className="w-12 h-12 text-zinc-600 mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-white mb-4">Join the Community</h2>
          <p className="text-zinc-400 mb-8 max-w-lg mx-auto">
            Connect with 5,000+ producers, share knowledge, get feedback, and stay updated on the latest in publishing.
          </p>
          <motion.a
            href="#"
            className="inline-flex items-center gap-3 px-8 py-4 bg-[#5865F2] text-white font-medium hover:bg-[#4752C4] transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
            </svg>
            Join Discord
          </motion.a>
        </motion.div>
      </div>
    </Section>
  );
}

// ============================================
// FINAL CTA SECTION
// ============================================

function CTASection() {
  return (
    <Section className="py-32 bg-white text-black">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-5xl md:text-7xl font-bold mb-6">
            Stop Leaving Money
            <br />
            <span className="text-zinc-400">On the Table</span>
          </h2>
          <p className="text-xl text-zinc-600 mb-10 max-w-2xl mx-auto">
            Join 10,000+ producers who've taken control of their publishing.
            Start collecting what you're owed today.
          </p>
          <motion.a
            href="/apply"
            className="group inline-flex items-center gap-3 px-10 py-5 bg-red-600 text-white text-lg font-semibold hover:bg-red-700 transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Get Started Free
            <ArrowUpRight className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
          </motion.a>
        </motion.div>
      </div>
    </Section>
  );
}

// ============================================
// FOOTER
// ============================================

function FooterSection() {
  const links = {
    Product: ['Features', 'Pricing', 'Estimator', 'API'],
    Company: ['About', 'Blog', 'Careers', 'Press'],
    Resources: ['Help Center', 'Community', 'Tutorials', 'Status'],
    Legal: ['Privacy', 'Terms', 'Cookies'],
  };

  return (
    <footer className="py-16 bg-black border-t border-zinc-900">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid md:grid-cols-5 gap-12 mb-16">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-red-600 flex items-center justify-center">
                <Music className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-semibold text-white">
                Producer<span className="text-zinc-500">Tour</span>
              </span>
            </div>
            <p className="text-zinc-500 text-sm mb-6 max-w-xs">
              Publishing administration built for the modern producer.
            </p>
          </div>

          {Object.entries(links).map(([category, items]) => (
            <div key={category}>
              <h4 className="text-sm font-medium text-white mb-4">{category}</h4>
              <ul className="space-y-3">
                {items.map((item) => (
                  <li key={item}>
                    <a href="#" className="text-sm text-zinc-500 hover:text-white transition-colors">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="pt-8 border-t border-zinc-900 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-zinc-600 text-sm">© 2025 Producer Tour. All rights reserved.</div>
          <div className="flex items-center gap-6 text-zinc-600 text-sm">
            <a href="#" className="hover:text-white transition-colors">Twitter</a>
            <a href="#" className="hover:text-white transition-colors">Instagram</a>
            <a href="#" className="hover:text-white transition-colors">Discord</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ============================================
// MAIN EXPORT
// ============================================

export function PublisherLandingPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <HeroSection />
      <LiveCounterSection />
      <HitSongsSection />
      <RoyaltyEstimatorSection />
      <RoyaltyFlowSection />
      <FeaturesSection />
      <ProcessSection />
      <PricingSection />
      <FAQSection />
      <EmailSignupSection />
      <DiscordSection />
      <CTASection />
      <FooterSection />
    </div>
  );
}

export default PublisherLandingPage;
