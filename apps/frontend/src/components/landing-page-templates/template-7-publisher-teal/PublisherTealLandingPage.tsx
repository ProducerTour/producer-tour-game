/**
 * Publisher/Label Landing Template - Teal Edition (2025 Premium)
 * Sophisticated UI/UX with modern music industry aesthetics
 *
 * Color Palette:
 * - #152026 (dark-teal) - primary dark
 * - #253840 (teal-800) - secondary dark
 * - #516973 (teal-600) - mid tone
 * - #92A4A6 (teal-400) - light accent
 * - #0D0D0D (black) - deep black
 */

import { useRef, useState, useEffect } from 'react';
import {
  motion,
  useScroll,
  useTransform,
  useInView,
  AnimatePresence,
} from 'framer-motion';
import {
  ArrowRight,
  ArrowUpRight,
  Play,
  Pause,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Music,
  Globe,
  Shield,
  Zap,
  Users,
  BarChart3,
  DollarSign,
  TrendingUp,
  Headphones,
  Plus,
  Star,
  Sparkles,
  Disc3,
  Radio,
  Waves,
  Activity,
  Heart,
  Share2,
  Crown,
  Verified,
} from 'lucide-react';


// ============================================
// GLASS CARD
// ============================================

function GlassCard({ children, className = '', hover = true }: { children: React.ReactNode; className?: string; hover?: boolean }) {
  return (
    <motion.div
      className={`relative bg-[#152026]/60 backdrop-blur-xl border border-[#253840]/50 ${className}`}
      whileHover={hover ? { y: -5, borderColor: 'rgba(81, 105, 115, 0.5)' } : {}}
      transition={{ duration: 0.3 }}
    >
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}

// ============================================
// ANIMATED WAVEFORM
// ============================================

function AnimatedWaveform({ barCount = 40, className = '' }: { barCount?: number; className?: string }) {
  return (
    <div className={`flex items-end justify-center gap-[3px] ${className}`}>
      {Array.from({ length: barCount }).map((_, i) => (
        <motion.div
          key={i}
          className="w-1 bg-gradient-to-t from-[#253840] via-[#516973] to-[#92A4A6] rounded-full"
          animate={{
            height: [
              `${15 + Math.random() * 25}px`,
              `${30 + Math.random() * 40}px`,
              `${15 + Math.random() * 30}px`,
              `${40 + Math.random() * 30}px`,
              `${15 + Math.random() * 25}px`,
            ],
          }}
          transition={{
            duration: 1.5 + Math.random() * 0.5,
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
// FLOATING ORB
// ============================================

function FloatingOrb({ className = '', delay = 0 }: { className?: string; delay?: number }) {
  return (
    <motion.div
      className={`absolute rounded-full blur-[100px] ${className}`}
      animate={{
        scale: [1, 1.2, 1],
        opacity: [0.3, 0.5, 0.3],
        x: [0, 30, 0],
        y: [0, -20, 0],
      }}
      transition={{
        duration: 8,
        repeat: Infinity,
        ease: 'easeInOut',
        delay,
      }}
    />
  );
}

// ============================================
// ANIMATED COUNTER
// ============================================

function AnimatedCounter({ value, prefix = '', suffix = '' }: { value: number; prefix?: string; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (isInView) {
      const duration = 2000;
      const steps = 60;
      const increment = value / steps;
      let current = 0;
      const timer = setInterval(() => {
        current += increment;
        if (current >= value) {
          setCount(value);
          clearInterval(timer);
        } else {
          setCount(Math.floor(current));
        }
      }, duration / steps);
      return () => clearInterval(timer);
    }
  }, [isInView, value]);

  return (
    <span ref={ref} className="tabular-nums">
      {prefix}{count.toLocaleString()}{suffix}
    </span>
  );
}

// ============================================
// HERO SECTION - IMMERSIVE 2025
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
    <section
      ref={ref}
      className="relative min-h-screen bg-[#0D0D0D] overflow-hidden"
    >
      {/* Animated gradient mesh */}
      <div className="absolute inset-0">
        <FloatingOrb className="w-[600px] h-[600px] bg-[#516973]/30 top-[-200px] left-[-200px]" />
        <FloatingOrb className="w-[500px] h-[500px] bg-[#253840]/40 bottom-[-100px] right-[-100px]" delay={2} />
        <FloatingOrb className="w-[400px] h-[400px] bg-[#92A4A6]/20 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" delay={4} />
      </div>

      {/* Noise texture */}
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(#516973 1px, transparent 1px), linear-gradient(90deg, #516973 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />

      <motion.div
        className="relative z-10 max-w-7xl mx-auto px-6 pt-24 pb-20 min-h-screen flex items-center"
        style={{ opacity, y, scale }}
      >
        <div className="w-full">
          {/* Top badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex justify-center mb-8"
          >
            <GlassCard className="px-5 py-2.5 rounded-full" hover={false}>
              <span className="flex items-center gap-3 text-sm">
                <span className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#92A4A6] opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#92A4A6]" />
                  </span>
                  <span className="text-[#92A4A6]">Live</span>
                </span>
                <span className="w-px h-4 bg-[#253840]" />
                <span className="text-[#516973]">10,847 producers collecting royalties right now</span>
              </span>
            </GlassCard>
          </motion.div>

          {/* Main headline */}
          <motion.div
            className="text-center mb-8"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
          >
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-white leading-[0.95] tracking-tight mb-6">
              Where Music Meets
              <br />
              <span className="relative inline-block">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#516973] via-[#92A4A6] to-[#516973]">
                  Money
                </span>
                <motion.span
                  className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#516973] to-transparent"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 1, duration: 0.8 }}
                />
              </span>
            </h1>
            <p className="text-lg md:text-xl text-[#92A4A6] max-w-2xl mx-auto leading-relaxed">
              The next-generation publishing platform that registers your works globally
              and ensures every royalty finds its way to your pocket.
            </p>
          </motion.div>

          {/* Stats row */}
          <motion.div
            className="flex flex-wrap justify-center gap-6 md:gap-12 mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            {[
              { value: 47, prefix: '$', suffix: 'M+', label: 'Collected' },
              { value: 180, suffix: '+', label: 'Countries' },
              { value: 99.7, suffix: '%', label: 'Collection Rate' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-white mb-1">
                  <AnimatedCounter value={stat.value} prefix={stat.prefix} suffix={stat.suffix} />
                </div>
                <div className="text-sm text-[#516973] uppercase tracking-wider">{stat.label}</div>
              </div>
            ))}
          </motion.div>

          {/* CTAs */}
          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <motion.a
              href="/apply"
              className="group relative inline-flex items-center justify-center gap-3 px-8 py-4 overflow-hidden rounded-full"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-[#516973] to-[#92A4A6]" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#92A4A6] to-[#516973] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <span className="relative z-10 font-semibold text-[#0D0D0D]">Start Collecting Today</span>
              <ArrowRight className="relative z-10 w-4 h-4 text-[#0D0D0D] group-hover:translate-x-1 transition-transform" />
            </motion.a>

            <motion.a
              href="#demo"
              className="group inline-flex items-center justify-center gap-3 px-8 py-4 rounded-full border border-[#253840] text-[#92A4A6] hover:border-[#516973] hover:text-white transition-all"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="w-8 h-8 rounded-full bg-[#152026] flex items-center justify-center group-hover:bg-[#253840] transition-colors">
                <Play className="w-3 h-3 ml-0.5" />
              </div>
              Watch Demo
            </motion.a>
          </motion.div>

          {/* Live waveform visualization */}
          <motion.div
            className="max-w-3xl mx-auto"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.9, duration: 0.8 }}
          >
            <GlassCard className="p-8 rounded-2xl">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#516973] to-[#253840] flex items-center justify-center">
                    <Activity className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="text-white font-medium">Live Royalty Stream</div>
                    <div className="text-sm text-[#516973]">Real-time collection activity</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-white">$12,847</div>
                  <div className="text-xs text-[#92A4A6]">collected this minute</div>
                </div>
              </div>
              <AnimatedWaveform barCount={60} className="h-16" />
              <div className="flex items-center justify-between mt-6 pt-6 border-t border-[#253840]">
                <div className="flex items-center gap-6">
                  {[
                    { icon: Globe, label: '180 countries' },
                    { icon: Radio, label: '50+ PROs' },
                    { icon: Disc3, label: '523K songs' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-2 text-sm text-[#516973]">
                      <item.icon className="w-4 h-4" />
                      {item.label}
                    </div>
                  ))}
                </div>
              </div>
            </GlassCard>
          </motion.div>
        </div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="flex flex-col items-center gap-2"
        >
          <span className="text-xs tracking-widest text-[#516973] uppercase">Scroll</span>
          <ChevronDown className="w-4 h-4 text-[#516973]" />
        </motion.div>
      </motion.div>
    </section>
  );
}

// ============================================
// SPOTIFY-STYLE NOW PLAYING
// ============================================

function NowPlayingSection() {
  const [isPlaying, setIsPlaying] = useState(true);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  const recentPlacements = [
    { song: 'Late Night Vibes', artist: 'Metro Boomin', platform: 'Netflix', amount: '$45,000' },
    { song: 'Summer Heat', artist: 'DJ Dahi', platform: 'Apple TV+', amount: '$32,000' },
    { song: 'City Lights', artist: 'Hit-Boy', platform: 'HBO Max', amount: '$28,500' },
  ];

  return (
    <section className="py-24 bg-[#0D0D0D] relative overflow-hidden" ref={ref}>
      <div className="absolute inset-0 bg-gradient-to-b from-[#152026]/50 to-transparent h-32" />

      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
        >
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#152026] border border-[#253840] text-sm text-[#92A4A6] mb-6">
            <TrendingUp className="w-4 h-4" />
            Recent Sync Placements
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-white">
            Your Music, Everywhere
          </h2>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Featured placement */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ delay: 0.2 }}
          >
            <GlassCard className="p-8 rounded-2xl h-full">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-[#92A4A6]" />
                  <span className="text-sm text-[#92A4A6] font-medium">Featured Placement</span>
                </div>
                <span className="px-3 py-1 rounded-full bg-[#516973]/20 text-[#92A4A6] text-xs font-medium">
                  This Week
                </span>
              </div>

              <div className="flex gap-6 mb-6">
                <div className="w-32 h-32 rounded-xl bg-gradient-to-br from-[#516973] to-[#253840] flex items-center justify-center flex-shrink-0">
                  <Music className="w-12 h-12 text-white/50" />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-white mb-2">Midnight Dreams</h3>
                  <p className="text-[#92A4A6] mb-4">Featured in "The Last Dance" - Netflix</p>
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="text-3xl font-bold text-white">$125,000</div>
                      <div className="text-xs text-[#516973]">Sync License Fee</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mini player */}
              <div className="flex items-center gap-4 p-4 rounded-xl bg-[#0D0D0D]">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="w-10 h-10 rounded-full bg-[#516973] flex items-center justify-center hover:bg-[#92A4A6] transition-colors"
                >
                  {isPlaying ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white ml-0.5" />}
                </button>
                <div className="flex-1">
                  <div className="h-1 bg-[#253840] rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-[#516973] to-[#92A4A6]"
                      animate={isPlaying ? { width: ['0%', '100%'] } : {}}
                      transition={{ duration: 30, repeat: Infinity }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Heart className="w-4 h-4 text-[#516973] hover:text-[#92A4A6] cursor-pointer" />
                  <Share2 className="w-4 h-4 text-[#516973] hover:text-[#92A4A6] cursor-pointer" />
                </div>
              </div>
            </GlassCard>
          </motion.div>

          {/* Recent placements list */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ delay: 0.3 }}
            className="space-y-4"
          >
            {recentPlacements.map((placement) => (
              <GlassCard key={placement.song} className="p-6 rounded-xl">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-[#253840] to-[#152026] flex items-center justify-center">
                    <Disc3 className="w-6 h-6 text-[#516973]" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-white font-medium">{placement.song}</h4>
                    <p className="text-sm text-[#516973]">{placement.artist} • {placement.platform}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-[#92A4A6]">{placement.amount}</div>
                    <div className="text-xs text-[#516973]">License Fee</div>
                  </div>
                </div>
              </GlassCard>
            ))}

            <motion.a
              href="#"
              className="flex items-center justify-center gap-2 p-4 rounded-xl border border-dashed border-[#253840] text-[#516973] hover:border-[#516973] hover:text-[#92A4A6] transition-all"
              whileHover={{ scale: 1.01 }}
            >
              View All Placements
              <ArrowRight className="w-4 h-4" />
            </motion.a>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ============================================
// ROYALTY ESTIMATOR - INTERACTIVE
// ============================================

function RoyaltyEstimatorSection() {
  const [streams, setStreams] = useState(1000000);
  const [syncPlacements, setSyncPlacements] = useState(2);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  const streamingRoyalties = Math.round(streams * 0.003 * 0.5);
  const syncRoyalties = syncPlacements * 15000;
  const totalRoyalties = streamingRoyalties + syncRoyalties;

  return (
    <section id="estimator" className="py-32 bg-[#152026] relative overflow-hidden" ref={ref}>
      <FloatingOrb className="w-[400px] h-[400px] bg-[#516973]/20 top-0 right-0" />

      <div className="max-w-5xl mx-auto px-6 relative z-10">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
        >
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#0D0D0D] border border-[#253840] text-sm text-[#92A4A6] mb-6">
            <BarChart3 className="w-4 h-4" />
            Earnings Calculator
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            See Your Potential
          </h2>
          <p className="text-[#92A4A6] max-w-lg mx-auto">
            Calculate your estimated annual royalties with proper publishing administration.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.2 }}
        >
          <GlassCard className="p-8 md:p-12 rounded-3xl">
            <div className="grid md:grid-cols-2 gap-12">
              {/* Sliders */}
              <div className="space-y-10">
                <div>
                  <div className="flex justify-between mb-4">
                    <label className="text-[#92A4A6] font-medium">Monthly Streams</label>
                    <span className="text-2xl font-bold text-white">{(streams / 1000000).toFixed(1)}M</span>
                  </div>
                  <div className="relative">
                    <input
                      type="range"
                      min="100000"
                      max="10000000"
                      step="100000"
                      value={streams}
                      onChange={(e) => setStreams(Number(e.target.value))}
                      className="w-full h-2 bg-[#253840] rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:bg-gradient-to-r [&::-webkit-slider-thumb]:from-[#516973] [&::-webkit-slider-thumb]:to-[#92A4A6] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-[#516973]/30"
                    />
                    <div
                      className="absolute top-0 left-0 h-2 bg-gradient-to-r from-[#516973] to-[#92A4A6] rounded-full pointer-events-none"
                      style={{ width: `${((streams - 100000) / (10000000 - 100000)) * 100}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-4">
                    <label className="text-[#92A4A6] font-medium">Sync Placements/Year</label>
                    <span className="text-2xl font-bold text-white">{syncPlacements}</span>
                  </div>
                  <div className="relative">
                    <input
                      type="range"
                      min="0"
                      max="10"
                      step="1"
                      value={syncPlacements}
                      onChange={(e) => setSyncPlacements(Number(e.target.value))}
                      className="w-full h-2 bg-[#253840] rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:bg-gradient-to-r [&::-webkit-slider-thumb]:from-[#516973] [&::-webkit-slider-thumb]:to-[#92A4A6] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-[#516973]/30"
                    />
                    <div
                      className="absolute top-0 left-0 h-2 bg-gradient-to-r from-[#516973] to-[#92A4A6] rounded-full pointer-events-none"
                      style={{ width: `${(syncPlacements / 10) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Results */}
              <div className="space-y-6">
                <div className="p-6 rounded-2xl bg-[#0D0D0D] border border-[#253840]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#253840] flex items-center justify-center">
                        <Waves className="w-5 h-5 text-[#516973]" />
                      </div>
                      <span className="text-[#92A4A6]">Streaming Royalties</span>
                    </div>
                    <span className="text-xl font-bold text-white">${streamingRoyalties.toLocaleString()}</span>
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-[#0D0D0D] border border-[#253840]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#253840] flex items-center justify-center">
                        <Radio className="w-5 h-5 text-[#516973]" />
                      </div>
                      <span className="text-[#92A4A6]">Sync Revenue</span>
                    </div>
                    <span className="text-xl font-bold text-white">${syncRoyalties.toLocaleString()}</span>
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-gradient-to-r from-[#516973] to-[#253840]">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-white/80 text-sm">Total Annual Earnings</span>
                      <div className="text-3xl font-bold text-white mt-1">${totalRoyalties.toLocaleString()}</div>
                    </div>
                    <div className="text-right">
                      <span className="text-white/60 text-sm">per year</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </section>
  );
}

// ============================================
// FEATURES - BENTO GRID 2025
// ============================================

function FeaturesSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  const features = [
    { icon: Globe, title: 'Global Registration', desc: 'We register your works with PROs in 180+ countries automatically.', size: 'large' },
    { icon: BarChart3, title: 'Real-Time Analytics', desc: 'Track every stream, every dollar, every territory.', size: 'normal' },
    { icon: Zap, title: 'Weekly Payouts', desc: 'Get paid faster than anywhere else.', size: 'normal' },
    { icon: Shield, title: 'Catalog Protection', desc: 'AI-powered monitoring fights infringement 24/7.', size: 'normal' },
    { icon: Users, title: 'Split Management', desc: 'Automatic payments to all collaborators.', size: 'normal' },
    { icon: Headphones, title: 'Sync Licensing', desc: 'We pitch your catalog to music supervisors worldwide.', size: 'large' },
  ];

  return (
    <section id="features" className="py-32 bg-[#0D0D0D] relative overflow-hidden" ref={ref}>
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
        >
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#152026] border border-[#253840] text-sm text-[#92A4A6] mb-6">
            <Sparkles className="w-4 h-4" />
            Premium Features
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Built for the Modern Producer
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              className={feature.size === 'large' ? 'lg:col-span-2' : ''}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.1 }}
            >
              <GlassCard className="p-8 rounded-2xl h-full group">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#516973]/20 to-[#253840]/20 border border-[#253840] flex items-center justify-center flex-shrink-0 group-hover:border-[#516973] transition-colors">
                    <feature.icon className="w-7 h-7 text-[#92A4A6]" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-[#92A4A6] transition-colors">{feature.title}</h3>
                    <p className="text-[#516973] leading-relaxed">{feature.desc}</p>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================
// PRICING - PREMIUM CARDS
// ============================================

function PricingSection() {
  const [hoveredPlan, setHoveredPlan] = useState<string>('pro');
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  const plans = [
    {
      id: 'starter',
      name: 'Starter',
      price: 'Free',
      commission: '20%',
      description: 'Perfect for emerging producers',
      features: ['Unlimited catalog', 'All PRO registrations', 'Basic analytics', 'Monthly payouts', 'Email support'],
    },
    {
      id: 'pro',
      name: 'Professional',
      price: '$29',
      commission: '10%',
      description: 'For serious producers',
      features: ['Everything in Starter', 'Advanced analytics', 'Weekly payouts', 'Priority support', 'Sync opportunities', 'Custom reports'],
      featured: true,
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: '$99',
      commission: '5%',
      description: 'For established catalogs',
      features: ['Everything in Pro', 'Dedicated manager', 'Daily payouts', 'White-glove service', 'API access', 'Custom integrations'],
    },
  ];

  return (
    <section id="pricing" className="py-32 bg-[#152026] relative overflow-hidden" ref={ref}>
      <FloatingOrb className="w-[500px] h-[500px] bg-[#516973]/10 bottom-0 left-0" delay={2} />

      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
        >
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#0D0D0D] border border-[#253840] text-sm text-[#92A4A6] mb-6">
            <DollarSign className="w-4 h-4" />
            Transparent Pricing
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Choose Your Plan
          </h2>
          <p className="text-[#92A4A6]">No hidden fees. No lock-in contracts. Cancel anytime.</p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.1 }}
              onMouseEnter={() => setHoveredPlan(plan.id)}
              onMouseLeave={() => setHoveredPlan('pro')}
            >
              <div
                className={`relative h-full p-[1px] rounded-3xl transition-all duration-300 ${
                  hoveredPlan === plan.id
                    ? 'bg-gradient-to-b from-[#516973] to-[#253840]'
                    : 'bg-[#253840]'
                }`}
              >
                <div className="relative h-full p-8 rounded-3xl bg-[#0D0D0D]">
                  {plan.featured && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-gradient-to-r from-[#516973] to-[#92A4A6] text-xs font-semibold text-[#0D0D0D]">
                      Most Popular
                    </div>
                  )}

                  <div className="mb-6">
                    <h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>
                    <p className="text-sm text-[#516973]">{plan.description}</p>
                  </div>

                  <div className="mb-6">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold text-white">{plan.price}</span>
                      {plan.price !== 'Free' && <span className="text-[#516973]">/mo</span>}
                    </div>
                    <div className="text-sm text-[#92A4A6] mt-1">+ {plan.commission} commission</div>
                  </div>

                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-3 text-sm text-[#92A4A6]">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                          hoveredPlan === plan.id ? 'bg-[#516973]/30' : 'bg-[#253840]'
                        }`}>
                          <Check className={`w-3 h-3 ${hoveredPlan === plan.id ? 'text-[#92A4A6]' : 'text-[#516973]'}`} />
                        </div>
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <motion.a
                    href="/apply"
                    className={`block w-full py-4 rounded-full text-center font-medium transition-all ${
                      hoveredPlan === plan.id
                        ? 'bg-gradient-to-r from-[#516973] to-[#92A4A6] text-[#0D0D0D]'
                        : 'bg-[#253840] text-white hover:bg-[#516973]/50'
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Get Started
                  </motion.a>
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
// TESTIMONIALS - PREMIUM CAROUSEL
// ============================================

function TestimonialsSection() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  const testimonials = [
    {
      quote: "Producer Tour found $23,000 in royalties I didn't know existed. The platform literally paid for itself in the first week.",
      name: 'Marcus Johnson',
      title: 'Grammy-Nominated Producer',
      earnings: '$127K collected',
      avatar: 'MJ',
    },
    {
      quote: "Finally, a publishing admin that actually understands producers. The analytics alone are worth 10x the price.",
      name: 'Sarah Chen',
      title: 'Independent Producer',
      earnings: '$84K collected',
      avatar: 'SC',
    },
    {
      quote: "Switched from my old publisher and immediately saw 40% more collections. Should have done this years ago.",
      name: 'David Williams',
      title: 'Platinum Producer',
      earnings: '$312K collected',
      avatar: 'DW',
    },
  ];

  const nextSlide = () => setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  const prevSlide = () => setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);

  useEffect(() => {
    const interval = setInterval(nextSlide, 6000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="py-32 bg-[#0D0D0D]" ref={ref}>
      <div className="max-w-4xl mx-auto px-6">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
        >
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#152026] border border-[#253840] text-sm text-[#92A4A6] mb-6">
            <Star className="w-4 h-4 fill-[#92A4A6]" />
            Success Stories
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-white">
            Trusted by Top Producers
          </h2>
        </motion.div>

        <div className="relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
            >
              <GlassCard className="p-8 md:p-12 rounded-3xl text-center">
                <div className="flex justify-center gap-1 mb-6">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-[#92A4A6] text-[#92A4A6]" />
                  ))}
                </div>

                <blockquote className="text-xl md:text-2xl text-white leading-relaxed mb-8 max-w-2xl mx-auto">
                  "{testimonials[currentIndex].quote}"
                </blockquote>

                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#516973] to-[#253840] flex items-center justify-center text-lg font-bold text-white">
                    {testimonials[currentIndex].avatar}
                  </div>
                  <div>
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-white font-semibold">{testimonials[currentIndex].name}</span>
                      <Verified className="w-4 h-4 text-[#92A4A6]" />
                    </div>
                    <div className="text-[#516973] text-sm">{testimonials[currentIndex].title}</div>
                  </div>
                  <span className="px-4 py-2 rounded-full bg-[#516973]/20 text-[#92A4A6] text-sm font-medium">
                    {testimonials[currentIndex].earnings}
                  </span>
                </div>
              </GlassCard>
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex justify-center items-center gap-4 mt-8">
            <button
              onClick={prevSlide}
              className="w-10 h-10 rounded-full bg-[#152026] border border-[#253840] flex items-center justify-center hover:border-[#516973] transition-colors"
            >
              <ChevronLeft className="w-4 h-4 text-[#92A4A6]" />
            </button>
            <div className="flex gap-2">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentIndex(i)}
                  className={`h-2 rounded-full transition-all ${
                    i === currentIndex ? 'w-8 bg-[#516973]' : 'w-2 bg-[#253840] hover:bg-[#516973]/50'
                  }`}
                />
              ))}
            </div>
            <button
              onClick={nextSlide}
              className="w-10 h-10 rounded-full bg-[#152026] border border-[#253840] flex items-center justify-center hover:border-[#516973] transition-colors"
            >
              <ChevronRight className="w-4 h-4 text-[#92A4A6]" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================
// FAQ SECTION
// ============================================

function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  const faqs = [
    { q: 'What is publishing administration?', a: 'Publishing administration is the process of registering your songs with PROs, collecting royalties worldwide, and ensuring you get paid for every use of your music.' },
    { q: 'How long until I start earning?', a: 'Once registered, royalties typically start flowing within 3-6 months. We work to accelerate collections wherever possible.' },
    { q: 'Do I keep ownership of my music?', a: 'Absolutely. We never take ownership. You retain 100% of your copyrights.' },
    { q: 'What makes Producer Tour different?', a: 'We\'re built specifically for producers with features like split management and sync opportunities tailored to your needs.' },
  ];

  return (
    <section id="faq" className="py-32 bg-[#152026]" ref={ref}>
      <div className="max-w-3xl mx-auto px-6">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
        >
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#0D0D0D] border border-[#253840] text-sm text-[#92A4A6] mb-6">
            Questions
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-white">
            Common Questions
          </h2>
        </motion.div>

        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.1 }}
            >
              <GlassCard className="rounded-2xl overflow-hidden" hover={false}>
                <button
                  onClick={() => setOpenIndex(openIndex === i ? null : i)}
                  className="w-full p-6 flex items-center justify-between text-left"
                >
                  <span className="text-lg font-medium text-white pr-8">{faq.q}</span>
                  <div className={`w-8 h-8 rounded-full bg-[#253840] flex items-center justify-center transition-transform ${openIndex === i ? 'rotate-45' : ''}`}>
                    <Plus className="w-4 h-4 text-[#92A4A6]" />
                  </div>
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
                      <div className="px-6 pb-6">
                        <p className="text-[#92A4A6] leading-relaxed">{faq.a}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================
// FINAL CTA
// ============================================

function CTASection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  return (
    <section className="py-32 bg-[#0D0D0D] relative overflow-hidden" ref={ref}>
      <FloatingOrb className="w-[600px] h-[600px] bg-[#516973]/20 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />

      <motion.div
        className="max-w-4xl mx-auto px-6 text-center relative z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
      >
        <h2 className="text-5xl md:text-7xl font-bold text-white mb-6">
          Ready to Collect
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#516973] via-[#92A4A6] to-[#516973]">
            What You're Owed?
          </span>
        </h2>
        <p className="text-xl text-[#92A4A6] mb-10 max-w-2xl mx-auto">
          Join 10,000+ producers who've taken control of their publishing.
        </p>

        <motion.a
          href="/apply"
          className="group relative inline-flex items-center gap-3 px-10 py-5 overflow-hidden rounded-full"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-[#516973] to-[#92A4A6]" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#92A4A6] to-[#516973] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <span className="relative z-10 text-lg font-semibold text-[#0D0D0D]">Start Free Today</span>
          <ArrowUpRight className="relative z-10 w-5 h-5 text-[#0D0D0D] group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
        </motion.a>

        <p className="mt-6 text-sm text-[#516973]">
          No credit card required • Cancel anytime
        </p>
      </motion.div>
    </section>
  );
}

// ============================================
// FOOTER
// ============================================

function FooterSection() {
  const links = {
    Product: ['Features', 'Pricing', 'Estimator', 'API'],
    Company: ['About', 'Blog', 'Careers', 'Press'],
    Resources: ['Help Center', 'Community', 'Tutorials'],
    Legal: ['Privacy', 'Terms', 'Cookies'],
  };

  return (
    <footer className="py-16 bg-[#0D0D0D] border-t border-[#253840]">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid md:grid-cols-5 gap-12 mb-16">
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#516973] to-[#253840] flex items-center justify-center">
                <Music className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-semibold text-white">
                Producer<span className="text-[#516973]">Tour</span>
              </span>
            </div>
            <p className="text-[#516973] text-sm max-w-xs">
              The premium publishing administration platform for modern producers.
            </p>
          </div>

          {Object.entries(links).map(([category, items]) => (
            <div key={category}>
              <h4 className="text-sm font-medium text-white mb-4">{category}</h4>
              <ul className="space-y-3">
                {items.map((item) => (
                  <li key={item}>
                    <a href="#" className="text-sm text-[#516973] hover:text-[#92A4A6] transition-colors">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="pt-8 border-t border-[#253840] flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-[#516973] text-sm">© 2025 Producer Tour. All rights reserved.</div>
          <div className="flex items-center gap-6 text-[#516973] text-sm">
            <a href="#" className="hover:text-[#92A4A6] transition-colors">Twitter</a>
            <a href="#" className="hover:text-[#92A4A6] transition-colors">Instagram</a>
            <a href="#" className="hover:text-[#92A4A6] transition-colors">Discord</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ============================================
// MAIN EXPORT
// ============================================

export function PublisherTealLandingPage() {
  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white">
      <style>{`
        @keyframes gradient-x {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient-x {
          background-size: 200% 200%;
          animation: gradient-x 3s ease infinite;
        }
      `}</style>
      <HeroSection />
      <NowPlayingSection />
      <RoyaltyEstimatorSection />
      <FeaturesSection />
      <PricingSection />
      <TestimonialsSection />
      <FAQSection />
      <CTASection />
      <FooterSection />
    </div>
  );
}

export default PublisherTealLandingPage;
