/**
 * Producer Platform Landing Template
 * BeatStars-inspired but elevated - Premium music producer marketplace feel
 *
 * Style: Dark with vibrant gradients, audio visualizers, interactive cards
 */

import { useRef, useState, useEffect } from 'react';
import {
  motion,
  useScroll,
  useTransform,
  useInView,
  useMotionValue,
  AnimatePresence,
} from 'framer-motion';
import {
  ArrowRight,
  ArrowUpRight,
  Play,
  Check,
  Star,
  Zap,
  Shield,
  TrendingUp,
  Music,
  Headphones,
  DollarSign,
  Users,
  Globe,
  BarChart3,
  Sparkles,
  ChevronRight,
  Volume2,
} from 'lucide-react';

// ============================================
// ANIMATED AUDIO VISUALIZER BARS
// ============================================

function AudioVisualizer({ isPlaying = true, barCount = 40 }: { isPlaying?: boolean; barCount?: number }) {
  return (
    <div className="flex items-end justify-center gap-[2px] h-16">
      {Array.from({ length: barCount }).map((_, i) => (
        <motion.div
          key={i}
          className="w-1 bg-gradient-to-t from-zinc-600 via-zinc-400 to-white rounded-full"
          animate={isPlaying ? {
            height: [
              `${20 + Math.random() * 30}%`,
              `${50 + Math.random() * 50}%`,
              `${20 + Math.random() * 40}%`,
              `${60 + Math.random() * 40}%`,
              `${20 + Math.random() * 30}%`,
            ],
          } : { height: '20%' }}
          transition={{
            duration: 0.8 + Math.random() * 0.4,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 0.02,
          }}
        />
      ))}
    </div>
  );
}

// ============================================
// FLOATING PARTICLES BACKGROUND
// ============================================

function FloatingParticles() {
  const particles = Array.from({ length: 50 });

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-white/20 rounded-full"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -100, 0],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: 5 + Math.random() * 5,
            repeat: Infinity,
            delay: Math.random() * 5,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

// ============================================
// GRADIENT ORB
// ============================================

function GradientOrb({ className = '' }: { className?: string }) {
  return (
    <motion.div
      className={`absolute rounded-full blur-3xl opacity-20 ${className}`}
      animate={{
        scale: [1, 1.2, 1],
        opacity: [0.1, 0.15, 0.1],
      }}
      transition={{
        duration: 8,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
  );
}

// ============================================
// NAVIGATION
// ============================================

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _Navigation() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [scrolled]);

  return (
    <motion.nav
      className={`fixed top-0 left-0 right-0 z-50 px-6 py-4 transition-all duration-300 ${
        scrolled ? 'bg-black/80 backdrop-blur-xl border-b border-white/5' : ''
      }`}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <motion.div
          className="flex items-center gap-2"
          whileHover={{ scale: 1.02 }}
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Music className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-semibold text-white">
            Producer<span className="text-purple-400">Tour</span>
          </span>
        </motion.div>

        <div className="hidden md:flex items-center gap-8 text-sm text-zinc-400">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
          <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          <a href="#testimonials" className="hover:text-white transition-colors">Success Stories</a>
        </div>

        <div className="flex items-center gap-3">
          <motion.a
            href="/login"
            className="hidden sm:block px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
            whileHover={{ scale: 1.02 }}
          >
            Sign In
          </motion.a>
          <motion.a
            href="/apply"
            className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-medium rounded-full hover:from-purple-500 hover:to-pink-500 transition-all"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
          >
            Get Started
          </motion.a>
        </div>
      </div>
    </motion.nav>
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

  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const y = useTransform(scrollYProgress, [0, 0.5], [0, 100]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 0.95]);

  return (
    <section ref={ref} className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#0a0a0a] pt-20">
      {/* Background elements */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-800/30 via-transparent to-transparent" />
        <GradientOrb className="w-[600px] h-[600px] bg-zinc-600 -top-40 -left-40" />
        <GradientOrb className="w-[500px] h-[500px] bg-zinc-500 -bottom-40 -right-40" />
        <FloatingParticles />
      </div>

      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: 'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      {/* Content */}
      <motion.div className="relative z-10 max-w-6xl mx-auto px-6 text-center" style={{ opacity, y, scale }}>
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-8"
        >
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-zinc-400">
            <Sparkles className="w-4 h-4 text-zinc-400" />
            Trusted by 10,000+ Producers Worldwide
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          className="text-5xl md:text-7xl lg:text-8xl font-bold text-white leading-[1.1] mb-6"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.8 }}
        >
          Your Music.
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-300 via-white to-zinc-300">
            Your Money.
          </span>
        </motion.h1>

        {/* Subhead */}
        <motion.p
          className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          Stop leaving royalties uncollected. Producer Tour tracks every stream,
          every sync, every dollar — so you can focus on making hits.
        </motion.p>

        {/* CTAs */}
        <motion.div
          className="flex flex-col sm:flex-row gap-4 justify-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <motion.a
            href="/apply"
            className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-black font-semibold rounded-full hover:bg-zinc-200 transition-all"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
          >
            Claim Your Royalties
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </motion.a>

          <motion.a
            href="#how-it-works"
            className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/5 border border-white/10 text-white font-medium rounded-full hover:bg-white/10 transition-all"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Play className="w-4 h-4" />
            See How It Works
          </motion.a>
        </motion.div>

        {/* Visualizer */}
        <motion.div
          className="max-w-2xl mx-auto"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1, duration: 0.8 }}
        >
          <div className="relative p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-white text-xs font-medium text-black">
              LIVE ROYALTY TRACKER
            </div>
            <AudioVisualizer barCount={60} />
            <div className="mt-4 flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-zinc-400">
                <Volume2 className="w-4 h-4" />
                <span>Tracking 2.4M+ streams today</span>
              </div>
              <div className="flex items-center gap-2 text-green-400">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span>$12,847 collected this hour</span>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
      >
        <motion.div
          className="w-6 h-10 rounded-full border-2 border-white/20 flex items-start justify-center p-2"
          animate={{ y: [0, 5, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <motion.div
            className="w-1.5 h-1.5 rounded-full bg-white"
            animate={{ y: [0, 12, 0], opacity: [1, 0.5, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </motion.div>
      </motion.div>
    </section>
  );
}

// ============================================
// STATS MARQUEE
// ============================================

function StatsMarquee() {
  const stats = [
    { value: '$47M+', label: 'Royalties Collected' },
    { value: '10K+', label: 'Active Producers' },
    { value: '180+', label: 'Countries' },
    { value: '99.7%', label: 'Collection Rate' },
    { value: '500K+', label: 'Songs Tracked' },
    { value: '24/7', label: 'Support' },
  ];

  return (
    <div className="py-8 bg-zinc-900/50 border-y border-white/5 overflow-hidden">
      <motion.div
        className="flex gap-16 whitespace-nowrap"
        animate={{ x: [0, -1200] }}
        transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
      >
        {[...stats, ...stats, ...stats].map((stat, i) => (
          <div key={i} className="flex items-center gap-4">
            <span className="text-3xl font-bold text-white">{stat.value}</span>
            <span className="text-zinc-500">{stat.label}</span>
            <span className="text-zinc-700">•</span>
          </div>
        ))}
      </motion.div>
    </div>
  );
}

// ============================================
// FEATURES SECTION
// ============================================

function FeaturesSection() {
  const features = [
    {
      icon: BarChart3,
      title: 'Real-Time Analytics',
      desc: 'Watch your earnings update live. See exactly where every dollar comes from — by platform, territory, and track.',
    },
    {
      icon: Globe,
      title: 'Global Collection',
      desc: 'We collect from 180+ countries and every major PRO. No royalty left behind, anywhere in the world.',
    },
    {
      icon: Shield,
      title: 'Catalog Protection',
      desc: 'Our AI monitors the internet for unauthorized use. We fight infringement so you don\'t have to.',
    },
    {
      icon: Zap,
      title: 'Fast Payouts',
      desc: 'Monthly payments, no holdbacks. Your money hits your account faster than any other platform.',
    },
    {
      icon: Users,
      title: 'Split Management',
      desc: 'Collaborate with confidence. Automatic split payments to all contributors, every time.',
    },
    {
      icon: Headphones,
      title: 'Sync Opportunities',
      desc: 'Get your music placed in film, TV, and ads. Our licensing team pitches your catalog to top supervisors.',
    },
  ];

  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section id="features" className="py-32 bg-[#0a0a0a] relative overflow-hidden">
      <GradientOrb className="w-[400px] h-[400px] bg-zinc-700 top-0 right-0" />

      <div className="max-w-7xl mx-auto px-6 relative z-10" ref={ref}>
        <motion.div
          className="text-center mb-20"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
        >
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-zinc-400 mb-6">
            <Sparkles className="w-4 h-4" />
            Why Producers Choose Us
          </span>
          <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">
            Everything You Need to
            <br />
            <span className="text-zinc-400">
              Get Paid
            </span>
          </h2>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
            We built the tools we wished existed when we started. Now they're yours.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              className="group relative p-8 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/20 transition-all overflow-hidden"
              initial={{ opacity: 0, y: 40 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -5 }}
            >
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mb-6 group-hover:bg-white/20 transition-colors">
                <feature.icon className="w-6 h-6 text-white" />
              </div>

              <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
              <p className="text-zinc-400 leading-relaxed">{feature.desc}</p>

              <motion.div
                className="mt-6 flex items-center gap-2 text-sm text-zinc-500 group-hover:text-white transition-colors"
                whileHover={{ x: 5 }}
              >
                Learn more <ChevronRight className="w-4 h-4" />
              </motion.div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================
// HOW IT WORKS
// ============================================

function HowItWorksSection() {
  const steps = [
    {
      num: '01',
      title: 'Submit Your Catalog',
      desc: 'Upload your tracks or connect your distributor. We handle the rest.',
      icon: Music,
    },
    {
      num: '02',
      title: 'We Register Everything',
      desc: 'Every PRO, every territory, every revenue stream — registered properly.',
      icon: Globe,
    },
    {
      num: '03',
      title: 'Watch It Grow',
      desc: 'Track your earnings in real-time. See every stream, every placement.',
      icon: TrendingUp,
    },
    {
      num: '04',
      title: 'Get Paid Monthly',
      desc: 'Direct deposits to your account. No delays, no excuses.',
      icon: DollarSign,
    },
  ];

  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section id="how-it-works" className="py-32 bg-[#0a0a0a] relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-zinc-900/30 to-transparent" />

      <div className="max-w-7xl mx-auto px-6 relative z-10" ref={ref}>
        <motion.div
          className="text-center mb-20"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
        >
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-zinc-400 mb-6">
            Simple Process
          </span>
          <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">
            How It Works
          </h2>
          <p className="text-lg text-zinc-400 max-w-xl mx-auto">
            From signup to payday in four simple steps
          </p>
        </motion.div>

        <div className="relative">
          {/* Connection line */}
          <div className="hidden lg:block absolute top-24 left-[10%] right-[10%] h-0.5 bg-gradient-to-r from-transparent via-zinc-700 to-transparent" />

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, i) => (
              <motion.div
                key={step.num}
                className="relative text-center"
                initial={{ opacity: 0, y: 40 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: i * 0.15 }}
              >
                {/* Number/Icon */}
                <motion.div
                  className="relative mx-auto mb-8"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                >
                  <div className="w-20 h-20 rounded-2xl bg-white flex items-center justify-center mx-auto">
                    <step.icon className="w-8 h-8 text-black" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-black border-2 border-white flex items-center justify-center text-xs font-bold text-white">
                    {step.num}
                  </div>
                </motion.div>

                <h3 className="text-xl font-semibold text-white mb-3">{step.title}</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================
// PRICING SECTION
// ============================================

function PricingSection() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');

  const plans = [
    {
      name: 'Starter',
      desc: 'Perfect for new producers',
      price: billingCycle === 'yearly' ? '12' : '15',
      commission: '15%',
      features: ['Up to 50 songs', 'Basic analytics', 'PRO registration', 'Email support', 'Monthly payouts'],
    },
    {
      name: 'Professional',
      desc: 'For serious producers',
      price: billingCycle === 'yearly' ? '29' : '39',
      commission: '10%',
      features: ['Unlimited songs', 'Advanced analytics', 'All PROs worldwide', 'Priority support', 'Weekly payouts', 'Split management', 'Sync opportunities'],
      featured: true,
    },
    {
      name: 'Enterprise',
      desc: 'For labels & publishers',
      price: 'Custom',
      commission: 'Negotiable',
      features: ['Everything in Pro', 'Custom integrations', 'Dedicated manager', 'White-label options', 'API access', 'Volume discounts'],
    },
  ];

  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section id="pricing" className="py-32 bg-[#0a0a0a] relative overflow-hidden">
      <GradientOrb className="w-[500px] h-[500px] bg-zinc-700 bottom-0 left-0" />

      <div className="max-w-7xl mx-auto px-6 relative z-10" ref={ref}>
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
        >
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-zinc-400 mb-6">
            Transparent Pricing
          </span>
          <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">
            Invest in Your Future
          </h2>
          <p className="text-lg text-zinc-400 max-w-xl mx-auto mb-8">
            Choose the plan that fits your catalog size. Upgrade anytime.
          </p>

          {/* Billing toggle */}
          <div className="inline-flex items-center gap-4 p-1.5 rounded-full bg-white/5 border border-white/10">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                billingCycle === 'monthly' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                billingCycle === 'yearly' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Yearly
              <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-xs">Save 20%</span>
            </button>
          </div>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              className={`relative p-8 rounded-2xl transition-all ${
                plan.featured
                  ? 'bg-white/5 border-2 border-white/30'
                  : 'bg-white/[0.02] border border-white/10 hover:border-white/20'
              }`}
              initial={{ opacity: 0, y: 40 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -5 }}
            >
              {plan.featured && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-white text-xs font-semibold text-black">
                  Most Popular
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-xl font-semibold text-white mb-1">{plan.name}</h3>
                <p className="text-zinc-500 text-sm">{plan.desc}</p>
              </div>

              <div className="mb-6">
                {plan.price === 'Custom' ? (
                  <span className="text-4xl font-bold text-white">Custom</span>
                ) : (
                  <>
                    <span className="text-4xl font-bold text-white">${plan.price}</span>
                    <span className="text-zinc-500">/mo</span>
                  </>
                )}
                <div className="text-sm text-zinc-500 mt-1">+ {plan.commission} commission</div>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-sm text-zinc-300">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center bg-white/10">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                    {feature}
                  </li>
                ))}
              </ul>

              <motion.a
                href="/apply"
                className={`block w-full py-4 rounded-full text-center font-medium transition-all ${
                  plan.featured
                    ? 'bg-white text-black hover:bg-zinc-200'
                    : 'bg-white/5 text-white border border-white/10 hover:bg-white/10'
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
    </section>
  );
}

// ============================================
// TESTIMONIALS
// ============================================

function TestimonialsSection() {
  const [activeIndex, setActiveIndex] = useState(0);

  const testimonials = [
    {
      quote: "I was leaving over $30K a year on the table before Producer Tour. Now I have complete visibility into every stream, every territory. Game changer.",
      name: "Marcus Johnson",
      title: "Multi-Platinum Producer",
      avatar: "MJ",
      stats: "+340% royalty increase",
    },
    {
      quote: "The sync team got my beat placed in a Netflix show within 3 months. That one placement paid for a year of service. The ROI is insane.",
      name: "Sarah Chen",
      title: "Grammy-Nominated Songwriter",
      avatar: "SC",
      stats: "6-figure sync placement",
    },
    {
      quote: "Finally, a platform that treats producers like professionals. The analytics alone are worth it. I know exactly where my money comes from.",
      name: "David Williams",
      title: "Top 40 Billboard Producer",
      avatar: "DW",
      stats: "500K+ songs tracked",
    },
  ];

  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % testimonials.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [testimonials.length]);

  return (
    <section id="testimonials" className="py-32 bg-[#0a0a0a] relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-zinc-900/20 via-transparent to-transparent" />

      <div className="max-w-5xl mx-auto px-6 relative z-10" ref={ref}>
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
        >
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-zinc-400 mb-6">
            <Star className="w-4 h-4" />
            Success Stories
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-white">
            Producers Love Us
          </h2>
        </motion.div>

        <div className="relative min-h-[400px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeIndex}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="text-center"
            >
              {/* Quote */}
              <div className="text-5xl text-zinc-700 font-serif mb-6">"</div>
              <blockquote className="text-2xl md:text-3xl font-light text-white leading-relaxed mb-10 max-w-3xl mx-auto">
                {testimonials[activeIndex].quote}
              </blockquote>

              {/* Author */}
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-xl font-bold text-black">
                  {testimonials[activeIndex].avatar}
                </div>
                <div>
                  <div className="text-white font-semibold">{testimonials[activeIndex].name}</div>
                  <div className="text-zinc-500 text-sm">{testimonials[activeIndex].title}</div>
                </div>
                <div className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-zinc-300 text-sm font-medium">
                  {testimonials[activeIndex].stats}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Dots */}
        <div className="flex justify-center gap-2 mt-10">
          {testimonials.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveIndex(i)}
              className={`w-2 h-2 rounded-full transition-all ${
                i === activeIndex ? 'w-8 bg-white' : 'bg-white/20 hover:bg-white/40'
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================
// FINAL CTA
// ============================================

function FinalCTA() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section className="py-32 bg-[#0a0a0a] relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/30 to-transparent" />
      <GradientOrb className="w-[600px] h-[600px] bg-zinc-700 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />

      <div className="max-w-4xl mx-auto px-6 relative z-10 text-center" ref={ref}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={isInView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-5xl md:text-7xl font-bold text-white mb-6">
            Ready to Get
            <br />
            <span className="text-zinc-400">
              What You're Owed?
            </span>
          </h2>

          <p className="text-xl text-zinc-400 mb-10 max-w-2xl mx-auto">
            Join 10,000+ producers who've taken control of their royalties.
            Your first month is on us.
          </p>

          <motion.a
            href="/apply"
            className="group inline-flex items-center gap-3 px-10 py-5 bg-white text-black text-lg font-semibold rounded-full hover:bg-zinc-200 transition-all"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
          >
            Start Free Trial
            <ArrowUpRight className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
          </motion.a>

          <p className="mt-6 text-sm text-zinc-500">
            No credit card required • Cancel anytime • 30-day money-back guarantee
          </p>
        </motion.div>
      </div>
    </section>
  );
}

// ============================================
// FOOTER
// ============================================

function Footer() {
  const links = {
    Product: ['Features', 'Pricing', 'Integrations', 'API'],
    Company: ['About', 'Blog', 'Careers', 'Press'],
    Resources: ['Help Center', 'Community', 'Tutorials', 'Status'],
    Legal: ['Privacy', 'Terms', 'Cookies', 'Licenses'],
  };

  return (
    <footer className="py-16 bg-black border-t border-white/5">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-6 gap-12 mb-16">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
                <Music className="w-4 h-4 text-black" />
              </div>
              <span className="text-lg font-semibold text-white">
                Producer<span className="text-zinc-500">Tour</span>
              </span>
            </div>
            <p className="text-zinc-500 text-sm mb-6 max-w-xs">
              The most advanced royalty administration platform for music producers.
            </p>
            <div className="flex gap-4">
              {['Twitter', 'Instagram', 'YouTube', 'Discord'].map((social) => (
                <a
                  key={social}
                  href="#"
                  className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/10 transition-all"
                >
                  {social[0]}
                </a>
              ))}
            </div>
          </div>

          {Object.entries(links).map(([category, items]) => (
            <div key={category}>
              <h4 className="text-white font-medium mb-4">{category}</h4>
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

        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-zinc-600 text-sm">
            © 2025 Producer Tour. All rights reserved.
          </div>
          <div className="flex items-center gap-6 text-sm text-zinc-600">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              All systems operational
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ============================================
// MAIN
// ============================================

export function LabelLandingV2() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <HeroSection />
      <StatsMarquee />
      <FeaturesSection />
      <HowItWorksSection />
      <PricingSection />
      <TestimonialsSection />
      <FinalCTA />
      <Footer />
    </div>
  );
}

export default LabelLandingV2;
