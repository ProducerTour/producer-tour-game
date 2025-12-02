/**
 * Publisher Sunrise Landing Template
 * MINIMAL EDITORIAL Design - Horizontal layouts, serif typography
 * Warm gold/cream palette with elegant animations
 *
 * Colors:
 * #fffbeb - Cream (background)
 * #ffe270 - Light Gold
 * #ffda47 - Medium Gold
 * #ffcc00 - Bright Gold (primary)
 * #393e41 - Charcoal (text)
 */

import { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform, useInView, AnimatePresence } from 'framer-motion';
import { ArrowRight, Check, Play, ExternalLink, MoveRight } from 'lucide-react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { featuresData, faqData, processSteps } from '../../landing/data';

// ============================================
// HERO SECTION - HORIZONTAL SPLIT EDITORIAL
// ============================================

function HeroSection() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start'],
  });

  const textX = useTransform(scrollYProgress, [0, 1], [0, -100]);
  const imageX = useTransform(scrollYProgress, [0, 1], [0, 100]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  return (
    <section ref={containerRef} className="min-h-screen bg-[#fffbeb] relative overflow-hidden">
      {/* Top navigation bar */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="absolute top-0 left-0 right-0 z-20 px-8 py-6 flex items-center justify-between"
      >
        <div className="font-serif text-2xl italic text-[#393e41]">
          Producer<span className="text-[#ffcc00]">Tour</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm text-[#393e41]/60">
          <a href="#features" className="hover:text-[#393e41] transition-colors">Features</a>
          <a href="#process" className="hover:text-[#393e41] transition-colors">How It Works</a>
          <a href="#pricing" className="hover:text-[#393e41] transition-colors">Pricing</a>
        </div>
        <a href="/apply" className="text-sm text-[#393e41] border-b border-[#393e41] pb-0.5 hover:border-[#ffcc00] hover:text-[#ffcc00] transition-colors">
          Get Started
        </a>
      </motion.nav>

      {/* Main content - Horizontal split */}
      <div className="min-h-screen flex flex-col lg:flex-row">
        {/* Left side - Typography */}
        <motion.div
          className="flex-1 flex flex-col justify-center px-8 md:px-16 lg:px-24 pt-32 lg:pt-0"
          style={{ x: textX, opacity }}
        >
          {/* Eyebrow */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="mb-6"
          >
            <span className="text-xs uppercase tracking-[0.3em] text-[#393e41]/50 font-light">
              Publishing Administration
            </span>
          </motion.div>

          {/* Main headline - Serif, elegant */}
          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.8 }}
            className="font-serif text-5xl md:text-6xl lg:text-7xl xl:text-8xl text-[#393e41] leading-[1.1] mb-8"
          >
            Collect
            <br />
            <span className="italic text-[#ffcc00]">every</span> royalty
            <br />
            you've earned.
          </motion.h1>

          {/* Subtitle - Light weight */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.3 }}
            className="text-lg text-[#393e41]/60 font-light max-w-md mb-12 leading-relaxed"
          >
            We handle the complex world of music publishing.
            Track everything. Collect from every PRO. Get paid monthly.
          </motion.p>

          {/* CTA - Minimal line style */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.5 }}
            className="flex items-center gap-8"
          >
            <a
              href="/apply"
              className="group inline-flex items-center gap-3 text-[#393e41] font-medium"
            >
              <span className="relative">
                Start collecting
                <span className="absolute bottom-0 left-0 w-full h-px bg-[#393e41] origin-left group-hover:scale-x-0 transition-transform" />
                <span className="absolute bottom-0 left-0 w-full h-px bg-[#ffcc00] origin-right scale-x-0 group-hover:scale-x-100 transition-transform" />
              </span>
              <MoveRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
            </a>
            <span className="text-[#393e41]/30">|</span>
            <span className="text-sm text-[#393e41]/50">No setup fees</span>
          </motion.div>
        </motion.div>

        {/* Right side - Stats cards stacked vertically */}
        <motion.div
          className="flex-1 flex items-center justify-center p-8 lg:p-0 lg:pr-24"
          style={{ x: imageX, opacity }}
        >
          <div className="relative w-full max-w-sm">
            {/* Decorative golden rectangle */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.6, duration: 0.8 }}
              className="absolute -top-8 -left-8 w-full h-full bg-[#ffcc00]/20 -z-10"
            />

            {/* Stats cards */}
            <div className="space-y-4">
              {[
                { value: '$2.5M+', label: 'Paid to creators', desc: 'And growing every month' },
                { value: '500+', label: 'Active members', desc: 'Independent producers & writers' },
                { value: '30+', label: 'Countries', desc: 'Global royalty collection' },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1 + i * 0.15 }}
                  className="bg-white p-6 border-l-4 border-[#ffcc00]"
                >
                  <div className="font-serif text-4xl text-[#393e41] mb-1">{stat.value}</div>
                  <div className="text-sm font-medium text-[#393e41] mb-1">{stat.label}</div>
                  <div className="text-xs text-[#393e41]/50">{stat.desc}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Bottom scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
      >
        <span className="text-xs uppercase tracking-widest text-[#393e41]/40">Scroll</span>
        <motion.div
          className="w-px h-8 bg-[#393e41]/20"
          animate={{ scaleY: [1, 0.5, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      </motion.div>
    </section>
  );
}

// ============================================
// HIT SONGS - HORIZONTAL SCROLL GALLERY
// ============================================

interface HitSong {
  title: string;
  artist: string;
  coverArt?: string;
  spotifyUrl?: string;
  streams?: string;
  gradient?: string;
}

const hitSongsData = [
  { title: 'Midnight Dreams', gradient: 'from-[#ffcc00] to-[#ffe270]' },
  { title: 'Electric Soul', gradient: 'from-[#ffda47] to-[#ffcc00]' },
  { title: 'Golden Hour', gradient: 'from-[#ffe270] to-[#ffda47]' },
  { title: 'Neon Nights', gradient: 'from-[#ffcc00] to-[#ffda47]' },
  { title: 'Urban Flow', gradient: 'from-[#ffda47] to-[#ffe270]' },
];

const streamCounts: Record<string, string> = {
  'Go (feat. Juice WRLD)': '620M+',
  'Chanel (Go Get It) [feat. Gunna & Lil Baby]': '110M+',
  'Prada (feat. Lil Durk)': '75M+',
  'Moncler (feat. Gunna)': '35M+',
  'Big Boy Diamonds (feat. Kodak Black & Chief Keef)': '40M+',
};

function HitSongsSection() {
  const [songs, setSongs] = useState<HitSong[]>(
    hitSongsData.map((s) => ({
      title: s.title,
      artist: 'Featured Artist',
      gradient: s.gradient,
    }))
  );

  const [emblaRef] = useEmblaCarousel(
    { loop: true, align: 'start', dragFree: true },
    [Autoplay({ delay: 3500, stopOnInteraction: false })]
  );

  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' });

  useEffect(() => {
    const fetchSongs = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:10000';
        const response = await fetch(`${apiUrl}/api/spotify/hit-songs`);
        const data = await response.json();
        if (data.success && data.songs) {
          const songsWithData = data.songs.map((song: HitSong, index: number) => ({
            ...song,
            streams: streamCounts[song.title] || undefined,
            gradient: hitSongsData[index % hitSongsData.length]?.gradient,
          }));
          setSongs(songsWithData);
        }
      } catch (error) {
        console.error('Failed to fetch hit songs:', error);
      }
    };
    fetchSongs();
  }, []);

  return (
    <section ref={sectionRef} className="py-32 bg-white relative">
      {/* Section header - left aligned */}
      <div className="px-8 md:px-16 lg:px-24 mb-16">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          className="flex flex-col md:flex-row md:items-end md:justify-between gap-6"
        >
          <div>
            <span className="text-xs uppercase tracking-[0.3em] text-[#393e41]/50 font-light block mb-4">
              Our Catalog
            </span>
            <h2 className="font-serif text-4xl md:text-5xl text-[#393e41]">
              Trusted by <span className="italic text-[#ffcc00]">hit makers</span>
            </h2>
          </div>
          <p className="text-[#393e41]/60 max-w-sm text-sm leading-relaxed">
            We help collect royalties from songs with billions of streams across every major platform.
          </p>
        </motion.div>
      </div>

      {/* Full-width carousel */}
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {songs.map((song, index) => (
            <motion.div
              key={`${song.title}-${index}`}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: index * 0.1 }}
              className="flex-none w-[320px] md:w-[380px] pl-8 first:pl-8 md:first:pl-16 lg:first:pl-24 last:pr-8"
            >
              <div className="group cursor-pointer">
                {/* Album art */}
                <div className={`aspect-[4/5] mb-4 overflow-hidden bg-gradient-to-br ${song.gradient}`}>
                  {song.coverArt ? (
                    <img
                      src={song.coverArt}
                      alt={song.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Play className="w-12 h-12 text-white/30" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-serif text-lg text-[#393e41] group-hover:text-[#ffcc00] transition-colors">{song.title}</h3>
                    <p className="text-sm text-[#393e41]/50">{song.artist}</p>
                  </div>
                  {song.streams && (
                    <span className="text-xs text-[#ffcc00] font-medium">{song.streams}</span>
                  )}
                </div>

                {song.spotifyUrl && (
                  <a
                    href={song.spotifyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-xs text-[#393e41]/40 hover:text-[#ffcc00] transition-colors"
                  >
                    Listen <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================
// FEATURES - ALTERNATING LAYOUT
// ============================================

function FeaturesSection() {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' });

  return (
    <section id="features" ref={sectionRef} className="py-32 bg-[#fffbeb]">
      <div className="px-8 md:px-16 lg:px-24">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          className="max-w-xl mb-20"
        >
          <span className="text-xs uppercase tracking-[0.3em] text-[#393e41]/50 font-light block mb-4">
            Features
          </span>
          <h2 className="font-serif text-4xl md:text-5xl text-[#393e41] mb-6">
            Everything you need to <span className="italic text-[#ffcc00]">get paid</span>
          </h2>
          <p className="text-[#393e41]/60 leading-relaxed">
            Professional tools designed for independent music creators who want full control over their royalties.
          </p>
        </motion.div>

        {/* Features grid - 2 columns with numbers */}
        <div className="grid md:grid-cols-2 gap-x-16 gap-y-12">
          {featuresData.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: index * 0.1 }}
              className="flex gap-6 group"
            >
              {/* Number */}
              <div className="flex-shrink-0">
                <span className="font-serif text-5xl text-[#ffcc00]/30 group-hover:text-[#ffcc00]/60 transition-colors">
                  {String(index + 1).padStart(2, '0')}
                </span>
              </div>

              {/* Content */}
              <div className="pt-2">
                <h3 className="font-medium text-[#393e41] mb-2">{feature.title}</h3>
                <p className="text-sm text-[#393e41]/60 leading-relaxed">{feature.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================
// HOW IT WORKS - HORIZONTAL TIMELINE
// ============================================

function HowItWorksSection() {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' });

  return (
    <section id="process" ref={sectionRef} className="py-32 bg-white overflow-hidden">
      <div className="px-8 md:px-16 lg:px-24">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          className="mb-20"
        >
          <span className="text-xs uppercase tracking-[0.3em] text-[#393e41]/50 font-light block mb-4">
            Process
          </span>
          <h2 className="font-serif text-4xl md:text-5xl text-[#393e41]">
            How it <span className="italic text-[#ffcc00]">works</span>
          </h2>
        </motion.div>

        {/* Steps - Horizontal on desktop */}
        <div className="relative">
          {/* Connecting line */}
          <div className="hidden lg:block absolute top-8 left-0 right-0 h-px bg-[#ffcc00]/30" />

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12">
            {processSteps.map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: index * 0.15 }}
                className="relative"
              >
                {/* Dot on line */}
                <div className="hidden lg:block absolute top-8 left-0 w-4 h-4 -translate-y-1/2 rounded-full bg-[#fffbeb] border-2 border-[#ffcc00]" />

                <div className="lg:pl-8">
                  <span className="font-serif text-6xl text-[#ffcc00]/20">{step.number}</span>
                  <h3 className="font-medium text-[#393e41] mt-4 mb-2">{step.title}</h3>
                  <p className="text-sm text-[#393e41]/60 leading-relaxed">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================
// PRICING - SIDE BY SIDE
// ============================================

const pricingPlans = [
  {
    name: 'For Publishing Admins',
    price: 'Custom',
    description: 'White-label solution for managing your roster',
    features: [
      'Unlimited writer management',
      'Custom branding & domain',
      'API access',
      'Priority support',
      'Custom splits',
      'Advanced analytics',
    ],
    cta: 'Get in touch',
    href: 'mailto:hello@producertour.com',
    highlighted: false,
  },
  {
    name: 'For Creators',
    price: '$29',
    period: '/month',
    description: 'Everything you need to collect royalties',
    features: [
      'All PRO collections',
      'Real-time dashboard',
      'Monthly payouts',
      'Collaboration splits',
      'Territory insights',
      'Direct deposits',
    ],
    cta: 'Start free trial',
    href: '/apply',
    highlighted: true,
  },
];

function PricingSection() {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' });

  return (
    <section id="pricing" ref={sectionRef} className="py-32 bg-[#fffbeb]">
      <div className="px-8 md:px-16 lg:px-24">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          className="max-w-xl mb-20"
        >
          <span className="text-xs uppercase tracking-[0.3em] text-[#393e41]/50 font-light block mb-4">
            Pricing
          </span>
          <h2 className="font-serif text-4xl md:text-5xl text-[#393e41]">
            Simple, <span className="italic text-[#ffcc00]">transparent</span> pricing
          </h2>
        </motion.div>

        {/* Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl">
          {pricingPlans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: index * 0.15 }}
              className={`p-8 md:p-10 ${
                plan.highlighted
                  ? 'bg-white border-l-4 border-[#ffcc00]'
                  : 'bg-white/50 border border-[#393e41]/10'
              }`}
            >
              {plan.highlighted && (
                <span className="text-xs uppercase tracking-widest text-[#ffcc00] font-medium mb-4 block">
                  Most Popular
                </span>
              )}

              <h3 className="font-serif text-2xl text-[#393e41] mb-2">{plan.name}</h3>
              <p className="text-sm text-[#393e41]/50 mb-6">{plan.description}</p>

              <div className="mb-8">
                <span className="font-serif text-4xl text-[#393e41]">{plan.price}</span>
                {plan.period && <span className="text-[#393e41]/50">{plan.period}</span>}
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-sm text-[#393e41]/70">
                    <Check className="w-4 h-4 text-[#ffcc00]" />
                    {feature}
                  </li>
                ))}
              </ul>

              <a
                href={plan.href}
                className={`block w-full py-3 text-center text-sm font-medium transition-all ${
                  plan.highlighted
                    ? 'bg-[#393e41] text-white hover:bg-[#ffcc00]'
                    : 'border border-[#393e41]/20 text-[#393e41] hover:border-[#ffcc00] hover:text-[#ffcc00]'
                }`}
              >
                {plan.cta}
              </a>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================
// FAQ - MINIMAL ACCORDION
// ============================================

function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' });

  return (
    <section ref={sectionRef} className="py-32 bg-white">
      <div className="px-8 md:px-16 lg:px-24">
        <div className="grid lg:grid-cols-2 gap-16">
          {/* Left - Header */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
          >
            <span className="text-xs uppercase tracking-[0.3em] text-[#393e41]/50 font-light block mb-4">
              FAQ
            </span>
            <h2 className="font-serif text-4xl md:text-5xl text-[#393e41] mb-6">
              Common <span className="italic text-[#ffcc00]">questions</span>
            </h2>
            <p className="text-[#393e41]/60 leading-relaxed max-w-md">
              Everything you need to know about working with Producer Tour.
              Can't find what you're looking for? Reach out.
            </p>
          </motion.div>

          {/* Right - Questions */}
          <div className="space-y-0">
            {faqData.slice(0, 6).map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: index * 0.08 }}
                className="border-b border-[#393e41]/10"
              >
                <button
                  onClick={() => setOpenIndex(openIndex === index ? null : index)}
                  className="w-full py-6 flex items-start justify-between text-left group"
                >
                  <span className="font-medium text-[#393e41] pr-8 group-hover:text-[#ffcc00] transition-colors">
                    {faq.question}
                  </span>
                  <motion.span
                    animate={{ rotate: openIndex === index ? 45 : 0 }}
                    className="text-[#ffcc00] text-2xl font-light flex-shrink-0"
                  >
                    +
                  </motion.span>
                </button>

                <AnimatePresence>
                  {openIndex === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <p className="pb-6 text-sm text-[#393e41]/60 leading-relaxed">
                        {faq.answer}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================
// CTA - FULL BLEED
// ============================================

function CTASection() {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' });

  return (
    <section ref={sectionRef} className="py-32 bg-[#393e41] relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-1/3 h-full bg-[#ffcc00]/5" />
      <div className="absolute top-8 right-8 w-64 h-64 border border-[#ffcc00]/20 rounded-full" />
      <div className="absolute bottom-8 right-24 w-32 h-32 border border-[#ffcc00]/10 rounded-full" />

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        className="px-8 md:px-16 lg:px-24 relative"
      >
        <div className="max-w-2xl">
          <span className="text-xs uppercase tracking-[0.3em] text-white/40 font-light block mb-6">
            Get Started
          </span>
          <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl text-white mb-6 leading-tight">
            Ready to collect
            <br />
            <span className="italic text-[#ffcc00]">what you've earned?</span>
          </h2>
          <p className="text-white/50 text-lg mb-10 max-w-md">
            Join hundreds of independent creators who trust Producer Tour.
          </p>

          <a
            href="/apply"
            className="group inline-flex items-center gap-4 text-white"
          >
            <span className="relative text-lg">
              Start your free trial
              <span className="absolute bottom-0 left-0 w-full h-px bg-white origin-left group-hover:scale-x-0 transition-transform" />
              <span className="absolute bottom-0 left-0 w-full h-px bg-[#ffcc00] origin-right scale-x-0 group-hover:scale-x-100 transition-transform" />
            </span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
          </a>

          <div className="mt-12 flex items-center gap-6 text-sm text-white/30">
            <span>No setup fees</span>
            <span>•</span>
            <span>$50 minimum payout</span>
            <span>•</span>
            <span>Cancel anytime</span>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

// ============================================
// FOOTER - MINIMAL
// ============================================

function Footer() {
  return (
    <footer className="py-16 bg-[#fffbeb] border-t border-[#393e41]/10">
      <div className="px-8 md:px-16 lg:px-24">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div className="font-serif text-2xl italic text-[#393e41]">
            Producer<span className="text-[#ffcc00]">Tour</span>
          </div>

          <div className="flex flex-wrap items-center gap-8 text-sm text-[#393e41]/50">
            <a href="#" className="hover:text-[#393e41] transition-colors">Features</a>
            <a href="#" className="hover:text-[#393e41] transition-colors">Pricing</a>
            <a href="#" className="hover:text-[#393e41] transition-colors">About</a>
            <a href="#" className="hover:text-[#393e41] transition-colors">Contact</a>
            <a href="#" className="hover:text-[#393e41] transition-colors">Privacy</a>
            <a href="#" className="hover:text-[#393e41] transition-colors">Terms</a>
          </div>

          <p className="text-sm text-[#393e41]/30">© 2025</p>
        </div>
      </div>
    </footer>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function PublisherSunriseLandingPage() {
  return (
    <div className="min-h-screen bg-[#fffbeb] text-[#393e41] overflow-x-hidden">
      <HeroSection />
      <HitSongsSection />
      <FeaturesSection />
      <HowItWorksSection />
      <PricingSection />
      <FAQSection />
      <CTASection />
      <Footer />
    </div>
  );
}

export default PublisherSunriseLandingPage;
