/**
 * Publisher Flame Landing Template
 * BRUTALIST / INDUSTRIAL Design
 * Fiery orange/red palette with bold typography
 *
 * Colors:
 * #737272 - Gray (neutral text)
 * #D95204 - Deep Orange (primary)
 * #D93D04 - Red-Orange (accent)
 * #401201 - Dark Maroon (background)
 * #F23005 - Bright Red-Orange (highlight)
 */

import { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform, useInView, AnimatePresence } from 'framer-motion';
import { ArrowRight, Check, Play, ExternalLink, ArrowUpRight } from 'lucide-react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { featuresData, faqData, processSteps } from '../../landing/data';

// ============================================
// SHARED COMPONENTS
// ============================================

function GradientText({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`bg-gradient-to-r from-[#F23005] via-[#D95204] to-[#D93D04] bg-clip-text text-transparent ${className}`}>
      {children}
    </span>
  );
}

// Ember particles floating upward
function EmberParticles({ count = 30 }: { count?: number }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(count)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full"
          style={{
            left: `${Math.random() * 100}%`,
            bottom: '-10%',
            background: `rgba(${217 + Math.random() * 25}, ${48 + Math.random() * 30}, 5, ${0.6 + Math.random() * 0.4})`,
            boxShadow: '0 0 6px rgba(242, 48, 5, 0.8)',
          }}
          animate={{
            y: [0, -window.innerHeight * 1.2],
            x: [0, (Math.random() - 0.5) * 100],
            opacity: [0, 1, 1, 0],
            scale: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 4 + Math.random() * 4,
            repeat: Infinity,
            delay: Math.random() * 5,
            ease: 'linear',
          }}
        />
      ))}
    </div>
  );
}

// Horizontal marquee text
function MarqueeText({ text, speed = 20 }: { text: string; speed?: number }) {
  return (
    <div className="overflow-hidden whitespace-nowrap">
      <motion.div
        className="inline-block"
        animate={{ x: ['0%', '-50%'] }}
        transition={{ duration: speed, repeat: Infinity, ease: 'linear' }}
      >
        {[...Array(4)].map((_, i) => (
          <span key={i} className="inline-block px-8">
            {text}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

// ============================================
// HERO SECTION - BRUTALIST SPLIT
// ============================================

function HeroSection() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start'],
  });

  const textY = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const imageScale = useTransform(scrollYProgress, [0, 1], [1, 1.2]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  return (
    <section ref={containerRef} className="relative min-h-screen bg-[#0a0806] overflow-hidden">
      <EmberParticles count={40} />

      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(#737272 1px, transparent 1px), linear-gradient(90deg, #737272 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      {/* Main content - asymmetric split */}
      <div className="relative z-10 min-h-screen flex flex-col lg:flex-row">
        {/* Left side - Typography */}
        <motion.div
          className="flex-1 flex flex-col justify-center px-6 md:px-12 lg:px-20 py-20 lg:py-0"
          style={{ y: textY, opacity }}
        >
          {/* Top tag */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <div className="inline-flex items-center gap-3">
              <div className="w-12 h-[2px] bg-[#F23005]" />
              <span className="text-[#F23005] text-sm font-mono uppercase tracking-[0.3em]">
                Publishing Admin
              </span>
            </div>
          </motion.div>

          {/* Main headline - MASSIVE */}
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
          >
            <h1 className="text-[4rem] md:text-[6rem] lg:text-[8rem] xl:text-[10rem] font-black leading-[0.85] tracking-[-0.04em] uppercase">
              <span className="text-white block">Claim</span>
              <span className="text-white block">Your</span>
              <GradientText className="block">Royalties</GradientText>
            </h1>
          </motion.div>

          {/* Subtitle with hard line */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mt-8 max-w-lg"
          >
            <div className="w-20 h-[3px] bg-[#D95204] mb-6" />
            <p className="text-[#737272] text-lg md:text-xl leading-relaxed">
              Stop leaving money on the table. We track, collect, and pay your
              publishing royalties—<span className="text-white">every month.</span>
            </p>
          </motion.div>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="mt-12 flex flex-wrap gap-4"
          >
            <a
              href="/apply"
              className="group inline-flex items-center gap-3 px-8 py-5 bg-[#F23005] text-white font-bold uppercase tracking-wider hover:bg-[#D93D04] transition-colors"
            >
              Get Started
              <ArrowUpRight className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
            </a>
            <a
              href="#how-it-works"
              className="inline-flex items-center gap-3 px-8 py-5 border-2 border-[#737272]/30 text-[#737272] font-bold uppercase tracking-wider hover:border-[#F23005] hover:text-white transition-all"
            >
              Learn More
            </a>
          </motion.div>
        </motion.div>

        {/* Right side - Stats block / Visual */}
        <motion.div
          className="lg:w-[45%] relative flex items-end lg:items-center justify-center p-6 lg:p-0"
          style={{ scale: imageScale }}
        >
          {/* Giant number background */}
          <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none">
            <span className="text-[30rem] md:text-[40rem] font-black text-[#401201]/30 leading-none select-none">
              $
            </span>
          </div>

          {/* Stats cards - stacked */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="relative z-10 space-y-4 w-full max-w-sm"
          >
            {[
              { value: '$2.5M+', label: 'Paid to Creators', delay: 0.6 },
              { value: '500+', label: 'Active Members', delay: 0.7 },
              { value: '30+', label: 'Countries Worldwide', delay: 0.8 },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: stat.delay }}
                className="bg-[#0d0908] border-l-4 border-[#F23005] p-6"
              >
                <div className="text-4xl md:text-5xl font-black text-white">{stat.value}</div>
                <div className="text-[#737272] text-sm uppercase tracking-wider mt-1">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>

      {/* Bottom marquee */}
      <div className="absolute bottom-0 left-0 right-0 py-4 bg-[#F23005] overflow-hidden">
        <MarqueeText
          text="COLLECT YOUR ROYALTIES • TRANSPARENT PAYOUTS • NO HIDDEN FEES • MONTHLY PAYMENTS •"
          speed={25}
        />
      </div>
    </section>
  );
}

// ============================================
// HIT SONGS - HORIZONTAL SCROLL STYLE
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
  { title: 'Midnight Dreams', gradient: 'from-[#D95204] to-[#401201]' },
  { title: 'Electric Soul', gradient: 'from-[#F23005] to-[#D93D04]' },
  { title: 'Golden Hour', gradient: 'from-[#D93D04] to-[#401201]' },
  { title: 'Neon Nights', gradient: 'from-[#D95204] to-[#F23005]' },
  { title: 'Urban Flow', gradient: 'from-[#401201] to-[#D95204]' },
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
    [Autoplay({ delay: 3000, stopOnInteraction: false })]
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
            gradient: hitSongsData[index % hitSongsData.length]?.gradient || 'from-[#D95204] to-[#401201]',
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
    <section ref={sectionRef} className="py-32 bg-[#0d0908] relative overflow-hidden">
      {/* Section header */}
      <div className="max-w-7xl mx-auto px-6 mb-16">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          className="flex flex-col md:flex-row md:items-end md:justify-between gap-6"
        >
          <div>
            <div className="inline-flex items-center gap-3 mb-4">
              <div className="w-8 h-[2px] bg-[#F23005]" />
              <span className="text-[#F23005] text-sm font-mono uppercase tracking-[0.2em]">Our Catalog</span>
            </div>
            <h2 className="text-5xl md:text-6xl lg:text-7xl font-black text-white uppercase tracking-tight">
              Hit <GradientText>Makers</GradientText>
            </h2>
          </div>
          <p className="text-[#737272] max-w-md text-lg">
            We help collect royalties from songs with <span className="text-white font-semibold">billions of streams</span>
          </p>
        </motion.div>
      </div>

      {/* Carousel */}
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {songs.map((song, index) => (
            <motion.div
              key={`${song.title}-${index}`}
              initial={{ opacity: 0, y: 50 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: index * 0.1 }}
              className="flex-none w-[300px] md:w-[350px] px-3 first:pl-6 last:pr-6"
            >
              <div className="group relative bg-[#0a0806] border border-[#737272]/10 hover:border-[#F23005]/50 transition-all duration-300">
                {/* Album art */}
                <div className={`aspect-square overflow-hidden bg-gradient-to-br ${song.gradient}`}>
                  {song.coverArt ? (
                    <img
                      src={song.coverArt}
                      alt={song.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Play className="w-16 h-16 text-white/20" />
                    </div>
                  )}
                </div>

                {/* Info bar */}
                <div className="p-5 border-t border-[#737272]/10">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-white truncate">{song.title}</h3>
                      <p className="text-sm text-[#737272] truncate">{song.artist}</p>
                    </div>
                    {song.streams && (
                      <div className="flex-shrink-0 px-3 py-1 bg-[#F23005]/10 border border-[#F23005]/30">
                        <span className="text-xs font-mono text-[#F23005]">{song.streams}</span>
                      </div>
                    )}
                  </div>
                  {song.spotifyUrl && (
                    <a
                      href={song.spotifyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 flex items-center gap-2 text-xs text-[#737272] hover:text-[#F23005] transition-colors"
                    >
                      <Play className="w-3 h-3" />
                      Play on Spotify
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                {/* Hover number */}
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-6xl font-black text-[#F23005]/20">{String(index + 1).padStart(2, '0')}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================
// FEATURES - BRUTALIST GRID
// ============================================

function FeaturesSection() {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' });

  const iconMap: Record<string, string> = {
    '📊': '01',
    '💰': '02',
    '📋': '03',
    '🤝': '04',
    '🌍': '05',
    '🔐': '06',
  };

  return (
    <section ref={sectionRef} className="py-32 bg-[#0a0806] relative">
      <EmberParticles count={15} />

      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          className="mb-20"
        >
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
            <div>
              <div className="inline-flex items-center gap-3 mb-4">
                <div className="w-8 h-[2px] bg-[#F23005]" />
                <span className="text-[#F23005] text-sm font-mono uppercase tracking-[0.2em]">Features</span>
              </div>
              <h2 className="text-5xl md:text-6xl lg:text-7xl font-black text-white uppercase tracking-tight">
                What You <GradientText>Get</GradientText>
              </h2>
            </div>
            <p className="text-[#737272] max-w-md text-lg lg:text-right">
              Professional tools built for independent music creators who want
              <span className="text-white"> full control</span>
            </p>
          </div>
        </motion.div>

        {/* Feature grid - asymmetric */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-[#737272]/10">
          {featuresData.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: index * 0.1 }}
              className="group bg-[#0a0806] p-8 hover:bg-[#0d0908] transition-colors relative"
            >
              {/* Large number */}
              <div className="absolute top-6 right-6 text-6xl font-black text-[#401201]/50 group-hover:text-[#F23005]/20 transition-colors">
                {iconMap[feature.icon] || String(index + 1).padStart(2, '0')}
              </div>

              <div className="relative z-10">
                <div className="w-12 h-[3px] bg-[#F23005] mb-8" />
                <h3 className="text-xl font-bold text-white mb-4 uppercase tracking-wide">{feature.title}</h3>
                <p className="text-[#737272] leading-relaxed">{feature.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================
// HOW IT WORKS - NUMBERED BLOCKS
// ============================================

function HowItWorksSection() {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' });

  return (
    <section id="how-it-works" ref={sectionRef} className="py-32 bg-[#0d0908] relative overflow-hidden">
      {/* Background number */}
      <div className="absolute top-1/2 right-0 -translate-y-1/2 pointer-events-none">
        <span className="text-[20rem] md:text-[30rem] font-black text-[#401201]/20 leading-none">
          4
        </span>
      </div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          className="mb-20"
        >
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-8 h-[2px] bg-[#F23005]" />
            <span className="text-[#F23005] text-sm font-mono uppercase tracking-[0.2em]">Process</span>
          </div>
          <h2 className="text-5xl md:text-6xl lg:text-7xl font-black text-white uppercase tracking-tight">
            How It <GradientText>Works</GradientText>
          </h2>
        </motion.div>

        {/* Steps - horizontal on desktop */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {processSteps.map((step, index) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 50 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: index * 0.15 }}
              className="relative group"
            >
              {/* Connector line */}
              {index < processSteps.length - 1 && (
                <div className="hidden lg:block absolute top-12 left-full w-full h-[2px] bg-gradient-to-r from-[#F23005] to-transparent z-0" />
              )}

              <div className="relative bg-[#0a0806] border border-[#737272]/10 p-8 hover:border-[#F23005]/30 transition-colors">
                {/* Step number */}
                <div className="text-7xl font-black text-[#F23005] mb-6 leading-none">
                  {step.number}
                </div>
                <h3 className="text-2xl font-bold text-white mb-3 uppercase">{step.title}</h3>
                <p className="text-[#737272]">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================
// PRICING - BOLD COMPARISON
// ============================================

const pricingPlans = [
  {
    name: 'Publishing Admins',
    price: 'Custom',
    description: 'White-label our platform for your roster',
    features: [
      'Unlimited writer management',
      'Custom branding & domain',
      'API access for integrations',
      'Priority support',
      'Custom royalty splits',
      'Advanced analytics',
    ],
    cta: 'Contact Sales',
    href: 'mailto:hello@producertour.com',
    highlighted: false,
  },
  {
    name: 'Creators',
    price: '$29',
    period: '/mo',
    description: 'Everything you need to collect royalties',
    features: [
      'All PRO collections',
      'Real-time dashboard',
      'Monthly payouts ($50 min)',
      'Collaboration splits',
      'Territory insights',
      'Direct deposits',
    ],
    cta: 'Start Free',
    href: '/apply',
    highlighted: true,
  },
];

function PricingSection() {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' });

  return (
    <section ref={sectionRef} className="py-32 bg-[#0a0806] relative">
      <div className="max-w-5xl mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          className="text-center mb-20"
        >
          <div className="inline-flex items-center gap-3 mb-4 justify-center">
            <div className="w-8 h-[2px] bg-[#F23005]" />
            <span className="text-[#F23005] text-sm font-mono uppercase tracking-[0.2em]">Pricing</span>
            <div className="w-8 h-[2px] bg-[#F23005]" />
          </div>
          <h2 className="text-5xl md:text-6xl font-black text-white uppercase tracking-tight">
            Simple <GradientText>Pricing</GradientText>
          </h2>
        </motion.div>

        {/* Pricing cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {pricingPlans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: index * 0.15 }}
              className={`relative ${plan.highlighted ? 'md:-mt-4 md:mb-4' : ''}`}
            >
              <div className={`h-full border-2 p-8 md:p-10 ${
                plan.highlighted
                  ? 'border-[#F23005] bg-gradient-to-b from-[#401201]/30 to-[#0a0806]'
                  : 'border-[#737272]/20 bg-[#0d0908]'
              }`}>
                {plan.highlighted && (
                  <div className="absolute -top-4 left-8 px-4 py-1 bg-[#F23005] text-white text-sm font-bold uppercase tracking-wider">
                    Popular
                  </div>
                )}

                <div className="mb-8">
                  <h3 className="text-2xl font-black text-white uppercase mb-2">{plan.name}</h3>
                  <p className="text-[#737272] text-sm">{plan.description}</p>
                </div>

                <div className="mb-8">
                  <span className="text-5xl md:text-6xl font-black text-white">{plan.price}</span>
                  {plan.period && <span className="text-[#737272] text-xl">{plan.period}</span>}
                </div>

                <ul className="space-y-4 mb-10">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-[#F23005] flex-shrink-0" />
                      <span className="text-[#737272]">{feature}</span>
                    </li>
                  ))}
                </ul>

                <a
                  href={plan.href}
                  className={`block w-full py-4 text-center font-bold uppercase tracking-wider transition-all ${
                    plan.highlighted
                      ? 'bg-[#F23005] text-white hover:bg-[#D93D04]'
                      : 'border-2 border-[#737272]/30 text-white hover:border-[#F23005] hover:bg-[#F23005]/10'
                  }`}
                >
                  {plan.cta}
                </a>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================
// FAQ - ACCORDION STYLE
// ============================================

function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' });

  return (
    <section ref={sectionRef} className="py-32 bg-[#0d0908] relative">
      <div className="max-w-4xl mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          className="mb-16"
        >
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-8 h-[2px] bg-[#F23005]" />
            <span className="text-[#F23005] text-sm font-mono uppercase tracking-[0.2em]">FAQ</span>
          </div>
          <h2 className="text-5xl md:text-6xl font-black text-white uppercase tracking-tight">
            Questions<GradientText>?</GradientText>
          </h2>
        </motion.div>

        {/* FAQ items */}
        <div className="space-y-2">
          {faqData.slice(0, 8).map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: index * 0.08 }}
              className="border-b border-[#737272]/10"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full py-6 flex items-center justify-between text-left group"
              >
                <span className="flex items-center gap-6">
                  <span className="text-[#F23005] font-mono text-sm">{String(index + 1).padStart(2, '0')}</span>
                  <span className="text-lg font-semibold text-white group-hover:text-[#F23005] transition-colors">
                    {faq.question}
                  </span>
                </span>
                <motion.span
                  animate={{ rotate: openIndex === index ? 45 : 0 }}
                  className="text-[#F23005] text-2xl font-light"
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
                    <div className="pb-6 pl-14 pr-8 text-[#737272] leading-relaxed">
                      {faq.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================
// CTA - FULL WIDTH BOLD
// ============================================

function CTASection() {
  const sectionRef = useRef(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' });

  return (
    <section ref={sectionRef} className="py-32 bg-[#0a0806] relative overflow-hidden">
      <EmberParticles count={25} />

      {/* Background text */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
        <span className="text-[15rem] md:text-[25rem] font-black text-[#401201]/20 leading-none whitespace-nowrap">
          START NOW
        </span>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        className="max-w-4xl mx-auto px-6 text-center relative z-10"
      >
        <h2 className="text-5xl md:text-7xl font-black text-white uppercase tracking-tight mb-6">
          Ready to Get
          <br />
          <GradientText>Paid?</GradientText>
        </h2>

        <p className="text-xl text-[#737272] mb-10 max-w-2xl mx-auto">
          Join hundreds of creators who stopped leaving money on the table.
        </p>

        <a
          href="/apply"
          className="inline-flex items-center gap-3 px-12 py-6 bg-[#F23005] text-white font-bold uppercase tracking-wider text-lg hover:bg-[#D93D04] transition-colors"
        >
          Get Started Free
          <ArrowRight className="w-6 h-6" />
        </a>

        <div className="mt-8 flex items-center justify-center gap-6 text-sm text-[#737272]">
          <span>No setup fees</span>
          <span className="w-1 h-1 rounded-full bg-[#737272]/50" />
          <span>$50 minimum payout</span>
          <span className="w-1 h-1 rounded-full bg-[#737272]/50" />
          <span>Cancel anytime</span>
        </div>
      </motion.div>
    </section>
  );
}

// ============================================
// FOOTER - MINIMAL INDUSTRIAL
// ============================================

function Footer() {
  return (
    <footer className="py-16 bg-[#0a0806] border-t border-[#737272]/10">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-12 mb-16">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="text-3xl font-black text-white uppercase mb-4">
              Producer<GradientText>Tour</GradientText>
            </div>
            <p className="text-[#737272] text-sm leading-relaxed">
              Professional publishing administration for independent music creators.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-bold text-white uppercase tracking-wider mb-6 text-sm">Product</h4>
            <ul className="space-y-3 text-[#737272]">
              <li><a href="#" className="hover:text-[#F23005] transition-colors">Features</a></li>
              <li><a href="#" className="hover:text-[#F23005] transition-colors">Pricing</a></li>
              <li><a href="#" className="hover:text-[#F23005] transition-colors">How It Works</a></li>
              <li><a href="#" className="hover:text-[#F23005] transition-colors">FAQ</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-white uppercase tracking-wider mb-6 text-sm">Company</h4>
            <ul className="space-y-3 text-[#737272]">
              <li><a href="#" className="hover:text-[#F23005] transition-colors">About</a></li>
              <li><a href="#" className="hover:text-[#F23005] transition-colors">Blog</a></li>
              <li><a href="#" className="hover:text-[#F23005] transition-colors">Careers</a></li>
              <li><a href="#" className="hover:text-[#F23005] transition-colors">Contact</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-white uppercase tracking-wider mb-6 text-sm">Legal</h4>
            <ul className="space-y-3 text-[#737272]">
              <li><a href="#" className="hover:text-[#F23005] transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-[#F23005] transition-colors">Terms of Service</a></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-[#737272]/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-[#737272]">© 2025 Producer Tour. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <a href="#" className="text-[#737272] hover:text-[#F23005] transition-colors">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            </a>
            <a href="#" className="text-[#737272] hover:text-[#F23005] transition-colors">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
            </a>
            <a href="#" className="text-[#737272] hover:text-[#F23005] transition-colors">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function PublisherFlameLandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0806] text-white overflow-x-hidden">
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

export default PublisherFlameLandingPage;
