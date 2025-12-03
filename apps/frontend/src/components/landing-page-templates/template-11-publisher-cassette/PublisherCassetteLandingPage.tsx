/**
 * Publisher Cassette Landing Template
 * MINIMAL / CINEMATIC Design inspired by cassettemusic.com
 * Dark backgrounds with yellow accents, staggered beat animations
 *
 * Colors:
 * #000000 - Pure Black (background)
 * #19181a - Soft Black (cards)
 * #f0e226 - Yellow (accent)
 * #ffffff - White (text)
 * #888888 - Gray (secondary text)
 *
 * Creative Effects:
 * - Mouse-following spotlight
 * - Text scramble animation
 * - Magnetic buttons
 * - Vinyl/cassette spinning animation
 * - Noise texture overlay
 * - GSAP-style spring physics
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  motion,
  useScroll,
  useTransform,
  useInView,
  AnimatePresence,
  useSpring,
  useMotionValue,
  useMotionTemplate,
} from 'framer-motion';
import { ArrowRight, Check, Play, ChevronDown, ArrowUpRight, Plus, Pause, Music2, BarChart3, Wallet, FileText, Users2, Globe2, Shield, ShoppingCart, Video, Search, DollarSign, Clock } from 'lucide-react';
import { useCartStore } from '../../../store/cart.store';
import { faqData, processSteps } from '../../landing/data';
import ptLogo from '../../../assets/images/logos/whitetransparentpt.png';

// ============================================
// ANIMATION CONSTANTS - "Beat" timing
// ============================================

const BEAT = 0.15; // 150ms beat interval

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: BEAT,
      delayChildren: BEAT * 2,
    },
  },
};

const fadeUpItem = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: 'easeOut' as const },
  },
};

const fadeInItem = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.6, ease: 'easeOut' as const },
  },
};

// ============================================
// CREATIVE COMPONENTS
// ============================================

// Noise texture overlay
function NoiseOverlay() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-50 opacity-[0.03]"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
      }}
    />
  );
}

// Custom cursor with spring physics
function CustomCursor() {
  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);
  const springConfig = { damping: 25, stiffness: 700 };
  const cursorXSpring = useSpring(cursorX, springConfig);
  const cursorYSpring = useSpring(cursorY, springConfig);

  useEffect(() => {
    const moveCursor = (e: MouseEvent) => {
      cursorX.set(e.clientX - 8);
      cursorY.set(e.clientY - 8);
    };
    window.addEventListener('mousemove', moveCursor);
    return () => window.removeEventListener('mousemove', moveCursor);
  }, [cursorX, cursorY]);

  return (
    <motion.div
      className="fixed top-0 left-0 w-4 h-4 bg-[#f0e226] rounded-full pointer-events-none z-[9999] mix-blend-difference hidden md:block"
      style={{ x: cursorXSpring, y: cursorYSpring }}
    />
  );
}

// Mouse-following spotlight
function Spotlight() {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    },
    [mouseX, mouseY]
  );

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [handleMouseMove]);

  const spotlightX = useSpring(mouseX, { stiffness: 100, damping: 30 });
  const spotlightY = useSpring(mouseY, { stiffness: 100, damping: 30 });

  const background = useMotionTemplate`radial-gradient(600px circle at ${spotlightX}px ${spotlightY}px, rgba(240, 226, 38, 0.06), transparent 80%)`;

  return (
    <motion.div
      className="pointer-events-none fixed inset-0 z-30"
      style={{ background }}
    />
  );
}

// Text scramble effect
function ScrambleText({ text, className = '' }: { text: string; className?: string }) {
  const [displayText, setDisplayText] = useState(text);
  const [isHovering, setIsHovering] = useState(false);
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

  useEffect(() => {
    if (!isHovering) {
      setDisplayText(text);
      return;
    }

    let iteration = 0;
    const interval = setInterval(() => {
      setDisplayText(
        text
          .split('')
          .map((char, i) => {
            if (char === ' ') return ' ';
            if (i < iteration) return text[i];
            return chars[Math.floor(Math.random() * chars.length)];
          })
          .join('')
      );
      iteration += 1 / 3;
      if (iteration >= text.length) clearInterval(interval);
    }, 30);

    return () => clearInterval(interval);
  }, [isHovering, text]);

  return (
    <span
      className={className}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {displayText}
    </span>
  );
}

// Magnetic button effect
function MagneticButton({
  children,
  href,
  className = '',
  variant = 'primary',
}: {
  children: React.ReactNode;
  href: string;
  className?: string;
  variant?: 'primary' | 'secondary';
}) {
  const ref = useRef<HTMLAnchorElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const springX = useSpring(x, { stiffness: 300, damping: 20 });
  const springY = useSpring(y, { stiffness: 300, damping: 20 });

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    x.set((e.clientX - centerX) * 0.3);
    y.set((e.clientY - centerY) * 0.3);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  const baseStyles =
    variant === 'primary'
      ? 'bg-[#f0e226] text-black hover:bg-white'
      : 'border border-[#f0e226] text-[#f0e226] hover:bg-[#f0e226] hover:text-black';

  return (
    <motion.a
      ref={ref}
      href={href}
      style={{ x: springX, y: springY }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`inline-flex items-center gap-3 px-8 py-4 font-medium uppercase tracking-wider transition-colors ${baseStyles} ${className}`}
    >
      {children}
    </motion.a>
  );
}

// Audio waveform visualization
function AudioWaveform({ isPlaying = false }: { isPlaying?: boolean }) {
  const bars = 40;

  return (
    <div className="flex items-end justify-center gap-[2px] h-12">
      {[...Array(bars)].map((_, i) => (
        <motion.div
          key={i}
          className="w-1 bg-[#f0e226] rounded-full"
          animate={{
            height: isPlaying
              ? [
                  `${20 + Math.random() * 30}%`,
                  `${50 + Math.random() * 50}%`,
                  `${20 + Math.random() * 30}%`,
                ]
              : '20%',
          }}
          transition={{
            duration: 0.5 + Math.random() * 0.5,
            repeat: Infinity,
            delay: i * 0.02,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

// ============================================
// SHARED COMPONENTS
// ============================================

function YellowText({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <span className={`text-[#f0e226] ${className}`}>{children}</span>;
}

// Producer Tour Logo component
function Logo({ size = 80 }: { size?: number }) {
  return (
    <img
      src={ptLogo}
      alt="Producer Tour"
      style={{ width: size, height: 'auto' }}
      className="object-contain"
    />
  );
}

// Horizontal scrolling ticker
function Ticker({ items, speed = 30 }: { items: string[]; speed?: number }) {
  return (
    <div className="overflow-hidden whitespace-nowrap border-y border-[#333]">
      <motion.div
        className="inline-flex py-4"
        animate={{ x: ['0%', '-50%'] }}
        transition={{ duration: speed, repeat: Infinity, ease: 'linear' }}
      >
        {[...Array(4)].map((_, setIdx) => (
          <div key={setIdx} className="flex">
            {items.map((item, i) => (
              <span key={i} className="flex items-center gap-8 px-8">
                <span className="text-sm uppercase tracking-[0.2em] text-white/60">{item}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#f0e226]" />
              </span>
            ))}
          </div>
        ))}
      </motion.div>
    </div>
  );
}

// Card with hover lift effect
function LiftCard({
  children,
  className = '',
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.6, delay, ease: "easeOut" }}
      whileHover={{
        y: -25,
        boxShadow: '0 25px 50px -12px rgba(240, 226, 38, 0.15)',
        transition: { duration: 0.4, ease: "backOut" },
      }}
      className={`bg-[#19181a] border border-white/5 ${className}`}
    >
      {children}
    </motion.div>
  );
}

// Section wrapper with scroll-triggered blur transition
function Section({
  children,
  id,
  className = '',
  dark = true,
}: {
  children: React.ReactNode;
  id?: string;
  className?: string;
  dark?: boolean;
}) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0.3, 1, 1, 0.3]);

  return (
    <motion.section
      ref={ref}
      id={id}
      style={{ opacity }}
      className={`relative ${dark ? 'bg-black' : 'bg-[#19181a]'} ${className}`}
    >
      {children}
    </motion.section>
  );
}

// ============================================
// HERO SECTION - Cinematic Staggered Reveal
// ============================================

// Artist interface for hero section
interface HeroArtist {
  id: string | null;
  name: string;
  image: string | null;
  imageLarge: string | null;
}

function HeroSection() {
  const containerRef = useRef(null);
  const [artists, setArtists] = useState<HeroArtist[]>([]);
  const [artistsLoaded, setArtistsLoaded] = useState(false);
  const [currentArtistIndex, setCurrentArtistIndex] = useState(0);
  const cartItemCount = useCartStore((state) => state.getItemCount());

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start'],
  });

  const overlayOpacity = useTransform(scrollYProgress, [0, 0.5], [0, 0.7]);
  const textY = useTransform(scrollYProgress, [0, 1], [0, 100]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.95]);

  const words = ['Collect', 'every', 'royalty', "you've", 'earned.'];

  // Fetch artist images from Spotify API
  useEffect(() => {
    const fetchArtists = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:10000';
        const response = await fetch(`${apiUrl}/api/spotify/hero-artists`);
        const data = await response.json();

        if (data.success && data.artists) {
          setArtists(data.artists);
        }
      } catch (error) {
        console.error('Failed to fetch hero artists:', error);
      } finally {
        setArtistsLoaded(true);
      }
    };

    fetchArtists();
  }, []);

  // Cycle through artists every 4 seconds
  useEffect(() => {
    if (artists.length === 0) return;

    const interval = setInterval(() => {
      setCurrentArtistIndex((prev) => (prev + 1) % artists.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [artists.length]);

  const currentArtist = artists[currentArtistIndex];

  return (
    <section ref={containerRef} className="relative min-h-screen bg-black overflow-hidden flex items-center">
      {/* Single artist image background - crossfade */}
      <div className="absolute inset-0 overflow-hidden">
        <AnimatePresence mode="wait">
          {currentArtist?.image && artistsLoaded && (
            <motion.div
              key={currentArtist.id || currentArtistIndex}
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 0.25, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 1.2, ease: 'easeInOut' }}
              className="absolute inset-0"
            >
              <img
                src={currentArtist.image}
                alt={currentArtist.name}
                className="w-full h-full object-cover"
                style={{
                  filter: 'grayscale(100%) contrast(1.1)',
                }}
              />
              {/* Gradient overlays for depth */}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/30" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-black/80" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Artist name indicator */}
        {currentArtist && artistsLoaded && (
          <motion.div
            key={`name-${currentArtistIndex}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="absolute bottom-8 right-8 z-20"
          >
            <div className="flex items-center gap-3">
              <div className="flex gap-1">
                {artists.map((_, i) => (
                  <div
                    key={i}
                    className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${
                      i === currentArtistIndex ? 'bg-[#f0e226]' : 'bg-white/30'
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs uppercase tracking-[0.2em] text-white/50">
                {currentArtist.name}
              </span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '100px 100px',
        }}
      />

      {/* Scroll-triggered overlay */}
      <motion.div
        className="absolute inset-0 bg-black pointer-events-none z-10"
        style={{ opacity: overlayOpacity }}
      />

      {/* Top nav */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: BEAT }}
        className="absolute top-0 left-0 right-0 z-20"
      >
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-6 flex items-center justify-between">
          <div className="flex items-center">
            <Logo size={120} />
          </div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="hidden md:flex items-center gap-8"
          >
            {[
              { label: 'About', href: '#about' },
              { label: 'Services', href: '#services' },
              { label: 'Pricing', href: '/pricing' },
              { label: 'Shop', href: '/shop' },
              { label: 'FAQ', href: '#faq' },
            ].map((link) => (
              <motion.a
                key={link.label}
                variants={fadeInItem}
                href={link.href}
                className="text-sm text-white/60 hover:text-[#f0e226] transition-colors uppercase tracking-[0.15em]"
              >
                <ScrambleText text={link.label} />
              </motion.a>
            ))}
          </motion.div>

          <div className="flex items-center gap-3">
            {/* Cart Icon */}
            <motion.a
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: BEAT * 4 }}
              href="/cart"
              className="relative p-2.5 text-white/60 hover:text-[#f0e226] transition-colors"
            >
              <ShoppingCart className="w-5 h-5" />
              {cartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#f0e226] text-black text-xs font-bold flex items-center justify-center">
                  {cartItemCount > 9 ? '9+' : cartItemCount}
                </span>
              )}
            </motion.a>
            <motion.a
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: BEAT * 5 }}
              href="/login"
              className="relative px-6 py-2.5 border border-[#f0e226] text-[#f0e226] text-sm uppercase tracking-wider hover:bg-[#f0e226] hover:text-black transition-all before:absolute before:left-2 before:top-1/2 before:-translate-y-1/2 before:w-1.5 before:h-1.5 before:rounded-full before:bg-[#f0e226] after:absolute after:right-2 after:top-1/2 after:-translate-y-1/2 after:w-1.5 after:h-1.5 after:rounded-full after:bg-[#f0e226] hover:before:bg-black hover:after:bg-black"
            >
              Log In
            </motion.a>
            <motion.a
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: BEAT * 6 }}
              href="/apply"
              className="px-5 py-2.5 bg-[#f0e226] text-black text-sm uppercase tracking-wider hover:bg-white transition-all"
            >
              Apply
            </motion.a>
          </div>
        </div>
      </motion.nav>

      {/* Main content */}
      <motion.div style={{ y: textY, scale }} className="relative z-10 w-full">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          {/* Staggered word reveal */}
          <motion.h1
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="text-5xl md:text-7xl lg:text-8xl xl:text-9xl font-normal leading-[1.05] tracking-[-0.02em]"
          >
            {words.map((word, i) => (
              <motion.span
                key={i}
                variants={fadeUpItem}
                className={`inline-block mr-[0.3em] ${word === 'every' ? 'text-[#f0e226]' : 'text-white'}`}
              >
                {word}
              </motion.span>
            ))}
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: BEAT * 8, duration: 0.6 }}
            className="mt-8 max-w-xl text-lg md:text-xl text-white/50 font-light leading-relaxed"
          >
            We track, collect, and distribute your publishing royalties. Transparent.
            Monthly. No surprises.
          </motion.p>

          {/* CTA with magnetic effect */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: BEAT * 10, duration: 0.6 }}
            className="mt-12 flex items-center gap-6"
          >
            <MagneticButton href="/apply" variant="primary">
              Start Collecting
              <ArrowRight className="w-5 h-5" />
            </MagneticButton>

            <a
              href="#services"
              className="inline-flex items-center gap-2 text-white/50 hover:text-white transition-colors text-sm uppercase tracking-wider"
            >
              <Play className="w-4 h-4" />
              Learn More
            </a>
          </motion.div>
        </div>
      </motion.div>

      {/* Bottom scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: BEAT * 12 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
      >
        <span className="text-xs uppercase tracking-[0.3em] text-white/30">Scroll</span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <ChevronDown className="w-5 h-5 text-[#f0e226]" />
        </motion.div>
      </motion.div>
    </section>
  );
}

// ============================================
// TICKER SECTION
// ============================================

function TickerSection() {
  const items = [
    'Performance Royalties',
    'Mechanical Royalties',
    'Sync Licensing',
    'Global Collection',
    'Transparent Payouts',
    'Monthly Statements',
  ];

  return (
    <div className="bg-black">
      <Ticker items={items} />
    </div>
  );
}

// ============================================
// ABOUT SECTION - Split with counter stats
// ============================================

function AboutSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  const stats = [
    { value: '$5M+', label: 'Collected' },
    { value: '1,200+', label: 'Songwriters' },
    { value: '45+', label: 'Countries' },
    { value: '100%', label: 'Transparency' },
  ];

  return (
    <Section id="about" className="py-32">
      <div ref={ref} className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24">
          {/* Left - Text */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate={isInView ? 'visible' : 'hidden'}
          >
            <motion.div variants={fadeUpItem} className="flex items-center gap-4 mb-8">
              <div className="w-12 h-px bg-[#f0e226]" />
              <span className="text-xs uppercase tracking-[0.3em] text-white/40">About Us</span>
            </motion.div>

            <motion.h2
              variants={fadeUpItem}
              className="text-4xl md:text-5xl lg:text-6xl font-normal text-white leading-[1.1]"
            >
              Publishing administration,{' '}
              <YellowText>reimagined.</YellowText>
            </motion.h2>

            <motion.p
              variants={fadeUpItem}
              className="mt-8 text-lg text-white/50 leading-relaxed max-w-lg"
            >
              We believe every songwriter deserves to be paid for their work. No hidden
              fees, no complicated contracts. Just transparent royalty collection and
              monthly payouts.
            </motion.p>

            <motion.div variants={fadeUpItem}>
              <MagneticButton href="/apply" variant="secondary" className="mt-10">
                <span className="uppercase tracking-wider text-sm">Our Manifesto</span>
                <ArrowUpRight className="w-4 h-4" />
              </MagneticButton>
            </motion.div>
          </motion.div>

          {/* Right - Stats in a single card */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            whileHover={{ y: -8, transition: { duration: 0.3 } }}
            className="relative group cursor-pointer"
          >
            {/* Main card */}
            <div className="bg-[#19181a] border border-white/10 group-hover:border-[#f0e226]/30 p-10 md:p-12 relative overflow-hidden transition-colors duration-300">
              {/* Yellow accent line at top */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-[#f0e226]" />

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-x-12 gap-y-10">
                {stats.map((stat, i) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 + i * 0.1, duration: 0.5 }}
                    className="relative"
                  >
                    <div className="text-4xl md:text-5xl lg:text-6xl font-light text-[#f0e226] tracking-tight">
                      {stat.value}
                    </div>
                    <div className="mt-2 text-sm uppercase tracking-[0.2em] text-white/50 group-hover:text-white/70 transition-colors">
                      {stat.label}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </Section>
  );
}

// ============================================
// SERVICES SECTION - Clean list with Framer
// ============================================

function ServicesSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  const services = [
    { icon: BarChart3, title: 'Real-Time Royalty Tracking', description: 'Track revenue by song, territory, and PRO—all in one dashboard.' },
    { icon: Wallet, title: 'Automated Payouts', description: 'Get paid monthly once you hit $50. Direct deposits with complete transparency.' },
    { icon: FileText, title: 'Statement Processing', description: 'We parse complex PRO statements. You see clean data, not chaos.' },
    { icon: Users2, title: 'Smart Collaboration Splits', description: 'Add collaborators, set percentages. Everyone gets paid automatically.' },
    { icon: Globe2, title: 'Global Territory Insights', description: 'Visual heatmaps show where your music earns worldwide.' },
    { icon: Shield, title: 'Your Music, Your Rights', description: '100% ownership. No exclusivity, no lock-ins, leave anytime.' },
  ];

  return (
    <Section id="services" dark={false} className="py-32">
      <div ref={ref} className="max-w-7xl mx-auto px-6 md:px-12">
        {/* Two column layout */}
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24">
          {/* Left - Header */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="lg:sticky lg:top-32 lg:self-start"
          >
            <motion.div
              className="flex items-center gap-4 mb-8"
              initial={{ opacity: 0, x: -20 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              <motion.div
                className="w-12 h-px bg-[#f0e226]"
                initial={{ scaleX: 0 }}
                animate={isInView ? { scaleX: 1 } : {}}
                transition={{ delay: 0.4, duration: 0.6 }}
                style={{ originX: 0 }}
              />
              <span className="text-xs uppercase tracking-[0.3em] text-white/40">Services</span>
            </motion.div>

            <motion.h2
              className="text-4xl md:text-5xl lg:text-6xl font-normal text-white leading-[1.1]"
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.3, duration: 0.8 }}
            >
              Everything you need to <YellowText>get paid.</YellowText>
            </motion.h2>

            <motion.p
              className="mt-6 text-white/40 text-lg leading-relaxed"
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : {}}
              transition={{ delay: 0.5, duration: 0.8 }}
            >
              We handle the complex work of royalty collection so you can focus on making music.
            </motion.p>
          </motion.div>

          {/* Right - Services list */}
          <div className="space-y-0">
            {services.map((service, i) => {
              const Icon = service.icon;
              return (
                <motion.div
                  key={service.title}
                  initial={{ opacity: 0, x: 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.5, ease: "easeOut" }}
                  className="group relative"
                >
                  {/* Divider line */}
                  <motion.div
                    className="absolute top-0 left-0 right-0 h-px bg-white/10"
                    whileHover={{ backgroundColor: 'rgba(240, 226, 38, 0.3)' }}
                    transition={{ duration: 0.3 }}
                  />

                  <div className="py-8 flex items-start gap-6 cursor-pointer">
                    {/* Number */}
                    <motion.span
                      className="text-sm text-white/20 font-light mt-1 w-8 flex-shrink-0"
                      whileHover={{ color: 'rgba(240, 226, 38, 0.5)' }}
                    >
                      {String(i + 1).padStart(2, '0')}
                    </motion.span>

                    {/* Icon */}
                    <motion.div
                      className="w-12 h-12 flex-shrink-0 flex items-center justify-center"
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                    >
                      <Icon className="w-6 h-6 text-[#f0e226]" />
                    </motion.div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <motion.h3
                        className="text-xl md:text-2xl text-white font-normal mb-2"
                        whileHover={{ color: '#f0e226', x: 4 }}
                        transition={{ duration: 0.2 }}
                      >
                        {service.title}
                      </motion.h3>
                      <p className="text-white/40 text-sm md:text-base leading-relaxed">
                        {service.description}
                      </p>
                    </div>

                    {/* Arrow */}
                    <motion.div
                      className="flex-shrink-0 mt-1 opacity-0 group-hover:opacity-100"
                      initial={{ x: -10 }}
                      whileHover={{ x: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ArrowRight className="w-5 h-5 text-[#f0e226]" />
                    </motion.div>
                  </div>

                  {/* Last item bottom border */}
                  {i === services.length - 1 && (
                    <div className="absolute bottom-0 left-0 right-0 h-px bg-white/10" />
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </Section>
  );
}

// ============================================
// SPOTIFY CAROUSEL - Album artwork with vinyl effect
// ============================================

interface HitSong {
  id: string;
  title: string;
  artist: string;
  producer: string;
  coverArt?: string;
  previewUrl?: string;
  spotifyUrl?: string;
  streams?: string;
}

// Fallback static data
const fallbackSongs: HitSong[] = [
  { id: '1', title: 'Special K', artist: 'Kosher', producer: 'Producer Tour Member', streams: '2.5M+' },
  { id: '2', title: 'Get In With Me', artist: 'Bossman Dlow', producer: 'Producer Tour Member', streams: '150M+' },
  { id: '3', title: 'Come Outside', artist: 'Icewear Vezzo', producer: 'Producer Tour Member', streams: '5M+' },
  { id: '4', title: 'Gangsta Groove', artist: 'Bayflogo', producer: 'Producer Tour Member', streams: '1M+' },
  { id: '5', title: 'Pink Molly', artist: 'YTB Fatt & Loe Shimmy', producer: 'Producer Tour Member', streams: '3M+' },
  { id: '6', title: 'Pressure', artist: 'Bossman Dlow', producer: 'Producer Tour Member', streams: '80M+' },
  { id: '7', title: 'OG Crashout', artist: 'Bhad Baby', producer: 'Producer Tour Member', streams: '500K+' },
];

function SpotifySection() {
  const [songs, setSongs] = useState<HitSong[]>(fallbackSongs);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [, setIsLoading] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Fetch from Spotify API
  useEffect(() => {
    const fetchSongs = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:10000';
        const response = await fetch(`${apiUrl}/api/spotify/hit-songs`);
        const data = await response.json();

        if (data.success && data.songs) {
          setSongs(data.songs);
        }
      } catch (error) {
        console.error('Failed to fetch hit songs:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSongs();
  }, []);

  const togglePlay = (index: number, previewUrl?: string) => {
    if (!previewUrl) return;

    if (playingIndex === index) {
      audioRef.current?.pause();
      setPlayingIndex(null);
    } else {
      if (audioRef.current) {
        audioRef.current.src = previewUrl;
        audioRef.current.play().catch(() => {
          setPlayingIndex(null);
        });
      }
      setPlayingIndex(index);
    }
  };

  const selectedSong = songs[selectedIndex];
  const isCurrentPlaying = playingIndex === selectedIndex;

  return (
    <Section className="py-32 overflow-hidden">
      <audio ref={audioRef} onEnded={() => setPlayingIndex(null)} />

      <div className="max-w-7xl mx-auto px-6 md:px-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-16">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="flex items-center gap-4 mb-4"
            >
              <div className="w-12 h-px bg-[#f0e226]" />
              <span className="text-xs uppercase tracking-[0.3em] text-white/40">The Catalog</span>
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-4xl md:text-5xl font-normal text-white"
            >
              Hits from our <YellowText>community.</YellowText>
            </motion.h2>
          </div>

          {/* Audio waveform - larger and more prominent */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="hidden md:block"
          >
            <AudioWaveform isPlaying={playingIndex !== null} />
          </motion.div>
        </div>

        {/* Main content - Split layout */}
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16">
          {/* Left - Featured track with vinyl */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative"
          >
            {/* Album sleeve + Vinyl */}
            <div className="relative aspect-square max-w-md mx-auto lg:mx-0">
              {/* Vinyl record - slides out when playing */}
              <motion.div
                className="absolute inset-0 z-0"
                animate={{
                  x: isCurrentPlaying ? 60 : 20,
                  rotate: isCurrentPlaying ? 360 : 0,
                }}
                transition={{
                  x: { duration: 0.5, ease: 'easeOut' },
                  rotate: { duration: 3, repeat: isCurrentPlaying ? Infinity : 0, ease: 'linear' },
                }}
              >
                <div className="w-full h-full rounded-full bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] border border-white/10">
                  {/* Grooves */}
                  <div className="absolute inset-[5%] rounded-full border border-white/5" />
                  <div className="absolute inset-[15%] rounded-full border border-white/5" />
                  <div className="absolute inset-[25%] rounded-full border border-white/5" />
                  <div className="absolute inset-[35%] rounded-full border border-white/5" />
                  {/* Label */}
                  <div className="absolute inset-[38%] rounded-full bg-[#f0e226] flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-black" />
                  </div>
                </div>
              </motion.div>

              {/* Album cover */}
              <motion.div
                className="relative z-10 w-full h-full bg-[#19181a] border border-white/10 overflow-hidden group cursor-pointer"
                onClick={() => togglePlay(selectedIndex, selectedSong?.previewUrl)}
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.3 }}
              >
                {selectedSong?.coverArt ? (
                  <img
                    src={selectedSong.coverArt}
                    alt={selectedSong.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#f0e226]/20 to-transparent">
                    <Music2 className="w-24 h-24 text-white/20" />
                  </div>
                )}

                {/* Play overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <motion.div
                    className="w-20 h-20 rounded-full bg-[#f0e226] flex items-center justify-center"
                    whileHover={{ scale: 1.1 }}
                  >
                    {isCurrentPlaying ? (
                      <Pause className="w-10 h-10 text-black" />
                    ) : (
                      <Play className="w-10 h-10 text-black ml-1" />
                    )}
                  </motion.div>
                </div>

                {/* Now playing indicator */}
                <AnimatePresence>
                  {isCurrentPlaying && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 20 }}
                      className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black to-transparent"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex gap-0.5">
                          {[...Array(4)].map((_, i) => (
                            <motion.div
                              key={i}
                              className="w-1 bg-[#f0e226] rounded-full"
                              animate={{ height: [8, 20, 8] }}
                              transition={{
                                duration: 0.5,
                                repeat: Infinity,
                                delay: i * 0.1,
                              }}
                            />
                          ))}
                        </div>
                        <span className="text-sm text-[#f0e226] font-medium">Now Playing</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>

            {/* Track info below album */}
            <div className="mt-8 max-w-md mx-auto lg:mx-0">
              <h3 className="text-2xl md:text-3xl font-normal text-white mb-2">
                {selectedSong?.title}
              </h3>
              <p className="text-lg text-white/50">{selectedSong?.artist}</p>
              {selectedSong?.producer && (
                <p className="text-sm text-[#f0e226]/70 mb-4">
                  Produced by {selectedSong.producer}
                </p>
              )}
              <div className="flex items-center gap-4 mt-4">
                {selectedSong?.streams && (
                  <span className="px-3 py-1 bg-[#f0e226]/10 border border-[#f0e226]/20 text-[#f0e226] text-sm rounded-full">
                    {selectedSong.streams} streams
                  </span>
                )}
                {selectedSong?.spotifyUrl && (
                  <a
                    href={selectedSong.spotifyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#1DB954] text-white text-sm rounded-full hover:bg-[#1ed760] transition-colors"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                    </svg>
                    Listen on Spotify
                  </a>
                )}
              </div>
            </div>
          </motion.div>

          {/* Right - Track list */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center justify-between mb-6">
              <span className="text-sm uppercase tracking-[0.2em] text-white/40">Tracklist</span>
              <span className="text-sm text-white/40">{songs.length} tracks</span>
            </div>

            <div className="space-y-2">
              {songs.map((song, i) => (
                <motion.div
                  key={song.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => setSelectedIndex(i)}
                  className={`group flex items-center gap-4 p-4 cursor-pointer transition-all border ${
                    selectedIndex === i
                      ? 'bg-[#f0e226]/10 border-[#f0e226]/30'
                      : 'bg-[#19181a]/50 border-white/5 hover:bg-[#19181a] hover:border-white/10'
                  }`}
                >
                  {/* Track number / Play button */}
                  <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center">
                    {playingIndex === i ? (
                      <div className="flex gap-0.5">
                        {[...Array(3)].map((_, j) => (
                          <motion.div
                            key={j}
                            className="w-0.5 bg-[#f0e226] rounded-full"
                            animate={{ height: [4, 12, 4] }}
                            transition={{
                              duration: 0.5,
                              repeat: Infinity,
                              delay: j * 0.15,
                            }}
                          />
                        ))}
                      </div>
                    ) : (
                      <>
                        <span className="text-sm text-white/30 group-hover:hidden">
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePlay(i, song.previewUrl);
                          }}
                          className="hidden group-hover:flex w-8 h-8 rounded-full bg-[#f0e226] items-center justify-center"
                        >
                          <Play className="w-4 h-4 text-black ml-0.5" />
                        </button>
                      </>
                    )}
                  </div>

                  {/* Album art thumbnail */}
                  <div className="w-12 h-12 flex-shrink-0 bg-[#19181a] overflow-hidden">
                    {song.coverArt ? (
                      <img src={song.coverArt} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Music2 className="w-5 h-5 text-white/20" />
                      </div>
                    )}
                  </div>

                  {/* Track info */}
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium truncate ${selectedIndex === i ? 'text-[#f0e226]' : 'text-white'}`}>
                      {song.title}
                    </div>
                    <div className="text-xs text-white/40 truncate">{song.artist}</div>
                    {song.producer && (
                      <div className="text-xs text-[#f0e226]/50 truncate">
                        Prod. {song.producer}
                      </div>
                    )}
                  </div>

                  {/* Streams */}
                  {song.streams && (
                    <div className="hidden md:block text-xs text-white/30">
                      {song.streams}
                    </div>
                  )}

                  {/* Spotify link */}
                  {song.spotifyUrl && (
                    <a
                      href={song.spotifyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <svg className="w-5 h-5 text-[#1DB954] hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                      </svg>
                    </a>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </Section>
  );
}

// ============================================
// PROCESS SECTION - Horizontal timeline
// ============================================

function ProcessSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  const [hoveredStep, setHoveredStep] = useState<number | null>(null);

  // Step icons for visual interest
  const stepIcons = [FileText, BarChart3, Wallet];

  return (
    <Section id="process" dark={false} className="py-32">
      <div ref={ref} className="max-w-7xl mx-auto px-6 md:px-12">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          className="text-center max-w-2xl mx-auto mb-20"
        >
          <motion.div variants={fadeUpItem} className="flex items-center justify-center gap-4 mb-8">
            <motion.div
              className="w-12 h-px bg-[#f0e226]"
              initial={{ scaleX: 0 }}
              animate={isInView ? { scaleX: 1 } : {}}
              transition={{ delay: 0.3, duration: 0.6 }}
              style={{ originX: 1 }}
            />
            <span className="text-xs uppercase tracking-[0.3em] text-white/40">How It Works</span>
            <motion.div
              className="w-12 h-px bg-[#f0e226]"
              initial={{ scaleX: 0 }}
              animate={isInView ? { scaleX: 1 } : {}}
              transition={{ delay: 0.3, duration: 0.6 }}
              style={{ originX: 0 }}
            />
          </motion.div>

          <motion.h2
            variants={fadeUpItem}
            className="text-4xl md:text-5xl font-normal text-white leading-[1.1]"
          >
            Three steps to <YellowText>get paid.</YellowText>
          </motion.h2>
        </motion.div>

        {/* Timeline */}
        <div className="relative">
          {/* Animated gradient line */}
          <div className="absolute top-8 left-0 right-0 h-px hidden lg:block overflow-hidden">
            <motion.div
              className="h-full w-full bg-gradient-to-r from-transparent via-[#f0e226] to-transparent"
              initial={{ x: '-100%' }}
              whileInView={{ x: '0%' }}
              viewport={{ once: true }}
              transition={{ duration: 1.2, ease: "easeOut" }}
            />
            {/* Shimmer effect */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 3, repeat: Infinity, repeatDelay: 2, ease: 'linear' }}
            />
          </div>

          <div className="grid lg:grid-cols-3 gap-8 lg:gap-4">
            {processSteps.slice(0, 3).map((step, i) => {
              const Icon = stepIcons[i];
              const isHovered = hoveredStep === i;

              return (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 + i * 0.2, duration: 0.6, ease: "easeOut" }}
                  className="relative group cursor-pointer"
                  onMouseEnter={() => setHoveredStep(i)}
                  onMouseLeave={() => setHoveredStep(null)}
                >
                  {/* Dot with pulse animation */}
                  <div className="hidden lg:flex absolute top-6 left-1/2 -translate-x-1/2">
                    {/* Outer pulse ring */}
                    <motion.div
                      className="absolute inset-0 w-4 h-4 rounded-full bg-[#f0e226]/30"
                      animate={isHovered ? {
                        scale: [1, 2.5, 1],
                        opacity: [0.5, 0, 0.5],
                      } : {}}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                    {/* Main dot */}
                    <motion.div
                      className="w-4 h-4 rounded-full bg-[#f0e226] border-4 border-[#19181a] relative z-10"
                      initial={{ scale: 0 }}
                      whileInView={{ scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.8 + i * 0.15, type: 'spring', stiffness: 500, damping: 25 }}
                      whileHover={{ scale: 1.3 }}
                    />
                  </div>

                  {/* Card content with hover effects */}
                  <motion.div
                    className="lg:pt-20 lg:text-center relative"
                    whileHover={{ y: -8 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  >
                    {/* Background glow on hover */}
                    <motion.div
                      className="absolute inset-0 -m-6 rounded-2xl bg-[#f0e226]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    />

                    {/* Icon that appears on hover */}
                    <motion.div
                      className="hidden lg:flex items-center justify-center mb-4"
                      initial={{ opacity: 0, scale: 0.5, rotate: -10 }}
                      animate={isHovered ? { opacity: 1, scale: 1, rotate: 0 } : { opacity: 0, scale: 0.5, rotate: -10 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    >
                      <div className="w-12 h-12 rounded-xl bg-[#f0e226]/10 border border-[#f0e226]/20 flex items-center justify-center">
                        <Icon className="w-6 h-6 text-[#f0e226]" />
                      </div>
                    </motion.div>

                    {/* Step number with animation */}
                    <motion.div
                      className="text-6xl font-light text-[#f0e226]/20 mb-4 relative"
                      animate={isHovered ? { color: 'rgba(240, 226, 38, 0.4)' } : {}}
                      transition={{ duration: 0.3 }}
                    >
                      <motion.span
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.5 + i * 0.15, duration: 0.5 }}
                      >
                        {String(i + 1).padStart(2, '0')}
                      </motion.span>
                    </motion.div>

                    {/* Title with slide animation */}
                    <motion.h3
                      className="text-xl text-white font-normal mb-3 relative"
                      animate={isHovered ? { color: '#f0e226' } : { color: '#ffffff' }}
                      transition={{ duration: 0.2 }}
                    >
                      {step.title}
                      {/* Underline animation */}
                      <motion.div
                        className="absolute -bottom-1 left-1/2 h-px bg-[#f0e226]"
                        initial={{ width: 0, x: '-50%' }}
                        animate={isHovered ? { width: '60%', x: '-50%' } : { width: 0, x: '-50%' }}
                        transition={{ duration: 0.3 }}
                      />
                    </motion.h3>

                    {/* Description */}
                    <motion.p
                      className="text-white/40 text-sm leading-relaxed relative z-10"
                      animate={isHovered ? { color: 'rgba(255, 255, 255, 0.6)' } : {}}
                      transition={{ duration: 0.3 }}
                    >
                      {step.description}
                    </motion.p>

                    {/* Arrow indicator on hover */}
                    <motion.div
                      className="mt-4 flex items-center justify-center lg:justify-center gap-2"
                      initial={{ opacity: 0, y: 10 }}
                      animate={isHovered ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
                      transition={{ duration: 0.2 }}
                    >
                      <span className="text-xs text-[#f0e226] uppercase tracking-wider">Learn more</span>
                      <ArrowRight className="w-3 h-3 text-[#f0e226]" />
                    </motion.div>
                  </motion.div>

                  {/* Connector line animation (between steps on mobile) */}
                  {i < 2 && (
                    <motion.div
                      className="lg:hidden absolute left-8 top-full h-8 w-px bg-gradient-to-b from-[#f0e226]/50 to-transparent"
                      initial={{ scaleY: 0 }}
                      whileInView={{ scaleY: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.5 + i * 0.2, duration: 0.4 }}
                      style={{ originY: 0 }}
                    />
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Dashboard Preview Section */}
        <motion.div
          className="mt-32"
          initial={{ opacity: 0, y: 60 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          {/* Section header */}
          <div className="text-center mb-12">
            <motion.p
              className="text-xs uppercase tracking-[0.3em] text-[#f0e226] mb-4"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              Your Command Center
            </motion.p>
            <motion.h3
              className="text-2xl md:text-3xl text-white font-normal"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
            >
              Everything at a glance
            </motion.h3>
          </div>

          {/* Dashboard mockup container */}
          <motion.div
            className="relative rounded-2xl overflow-hidden border border-white/10 bg-[#0d0d0d]"
            whileHover={{ borderColor: 'rgba(240, 226, 38, 0.2)' }}
            transition={{ duration: 0.3 }}
          >
            {/* Browser chrome */}
            <div className="flex items-center gap-2 px-4 py-3 bg-[#19181a] border-b border-white/10">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="px-4 py-1 rounded-md bg-black/50 text-xs text-white/40">
                  app.producertour.com/dashboard
                </div>
              </div>
            </div>

            {/* Dashboard content */}
            <div className="p-6 md:p-8">
              {/* Top stats row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {[
                  { label: 'Total Earnings', value: '$12,847.32', change: '+12.5%' },
                  { label: 'This Month', value: '$1,423.50', change: '+8.2%' },
                  { label: 'Pending', value: '$342.00', change: '' },
                  { label: 'Songs Tracked', value: '47', change: '+3' },
                ].map((stat, i) => (
                  <motion.div
                    key={stat.label}
                    className="p-4 rounded-xl bg-[#19181a] border border-white/5"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.4 + i * 0.1 }}
                    whileHover={{ borderColor: 'rgba(240, 226, 38, 0.2)', y: -2 }}
                  >
                    <div className="text-xs text-white/40 mb-1">{stat.label}</div>
                    <div className="text-xl md:text-2xl font-light text-white">{stat.value}</div>
                    {stat.change && (
                      <div className="text-xs text-[#f0e226] mt-1">{stat.change}</div>
                    )}
                  </motion.div>
                ))}
              </div>

              {/* Main dashboard grid */}
              <div className="grid lg:grid-cols-3 gap-6">
                {/* Earnings chart */}
                <motion.div
                  className="lg:col-span-2 p-5 rounded-xl bg-[#19181a] border border-white/5"
                  initial={{ opacity: 0, x: -30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.5 }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-white/60">Earnings Overview</span>
                    <span className="text-xs text-white/30">Last 6 months</span>
                  </div>
                  {/* Chart bars */}
                  <div className="flex items-end gap-3 h-32">
                    {[40, 65, 45, 80, 60, 95].map((height, i) => (
                      <motion.div
                        key={i}
                        className="flex-1 bg-gradient-to-t from-[#f0e226]/20 to-[#f0e226]/60 rounded-t"
                        initial={{ height: 0 }}
                        whileInView={{ height: `${height}%` }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.7 + i * 0.1, duration: 0.6, ease: "easeOut" }}
                      />
                    ))}
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-white/30">
                    <span>Jul</span>
                    <span>Aug</span>
                    <span>Sep</span>
                    <span>Oct</span>
                    <span>Nov</span>
                    <span>Dec</span>
                  </div>
                </motion.div>

                {/* Territory breakdown */}
                <motion.div
                  className="p-5 rounded-xl bg-[#19181a] border border-white/5"
                  initial={{ opacity: 0, x: 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.6 }}
                >
                  <div className="text-sm text-white/60 mb-4">Top Territories</div>
                  <div className="space-y-3">
                    {[
                      { country: 'United States', percent: 45, flag: '🇺🇸' },
                      { country: 'United Kingdom', percent: 22, flag: '🇬🇧' },
                      { country: 'Germany', percent: 15, flag: '🇩🇪' },
                      { country: 'France', percent: 10, flag: '🇫🇷' },
                      { country: 'Other', percent: 8, flag: '🌍' },
                    ].map((territory, i) => (
                      <motion.div
                        key={territory.country}
                        initial={{ opacity: 0, x: 20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.8 + i * 0.08 }}
                      >
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-white/60">
                            <span className="mr-2">{territory.flag}</span>
                            {territory.country}
                          </span>
                          <span className="text-[#f0e226]">{territory.percent}%</span>
                        </div>
                        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-[#f0e226]"
                            initial={{ width: 0 }}
                            whileInView={{ width: `${territory.percent}%` }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.9 + i * 0.1, duration: 0.5 }}
                          />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              </div>

              {/* Recent songs table */}
              <motion.div
                className="mt-6 p-5 rounded-xl bg-[#19181a] border border-white/5"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.7 }}
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-white/60">Recent Earnings</span>
                  <span className="text-xs text-[#f0e226] cursor-pointer hover:underline">View all →</span>
                </div>
                <div className="space-y-3">
                  {[
                    { song: 'Midnight Drive', artist: 'Artist Name ft. Featured', amount: '$234.50', source: 'ASCAP' },
                    { song: 'Golden Hour', artist: 'Artist Name', amount: '$187.25', source: 'BMI' },
                    { song: 'City Lights', artist: 'Artist Name', amount: '$156.00', source: 'SESAC' },
                  ].map((item, i) => (
                    <motion.div
                      key={item.song}
                      className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.9 + i * 0.1 }}
                      whileHover={{ x: 4 }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#f0e226]/20 to-[#f0e226]/5 flex items-center justify-center">
                          <Music2 className="w-5 h-5 text-[#f0e226]" />
                        </div>
                        <div>
                          <div className="text-sm text-white">{item.song}</div>
                          <div className="text-xs text-white/40">{item.artist}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-[#f0e226]">{item.amount}</div>
                        <div className="text-xs text-white/30">{item.source}</div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>

            {/* Gradient overlay at bottom for depth */}
            <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[#0d0d0d] to-transparent pointer-events-none" />
          </motion.div>

          {/* CTA below dashboard */}
          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 1 }}
          >
            <MagneticButton href="/apply" className="inline-flex">
              <span className="uppercase tracking-wider text-sm">Get Your Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </MagneticButton>
            <MagneticButton href="/tools" variant="secondary" className="inline-flex">
              <span className="uppercase tracking-wider text-sm">Browse Tools Suite</span>
              <ArrowUpRight className="w-4 h-4" />
            </MagneticButton>
          </motion.div>
        </motion.div>
      </div>
    </Section>
  );
}

// ============================================
// PRICING SECTION
// ============================================

function PricingSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  // Publishing Administration features
  const publishingFeatures = [
    'Global royalty collection',
    'Quarterly statements & Realtime Analytics',
    'Work registration & song submission',
    'Tour Profile (public portfolio with Rewards)',
    'Sync licensing opportunities',
    'Dedicated support',
  ];

  // Writer tools data
  const writerTools = [
    {
      name: 'Beat Video Maker',
      description: 'Create professional type beat videos',
      price: '$9.99/mo',
      note: 'Free for Producer Tour writers',
      status: 'available' as const,
      icon: Video,
      href: '/tools/type-beat-video-maker',
    },
    {
      name: 'Metadata Index',
      description: 'Search & verify music metadata',
      price: 'Contact',
      status: 'contact' as const,
      icon: Search,
      href: '/contact',
    },
    {
      name: 'Takedown Tool',
      description: 'Protect your music from infringement',
      price: '',
      status: 'coming-soon' as const,
      icon: Shield,
      href: '#',
    },
    {
      name: 'Pub Deal Simulator',
      description: 'Simulate publishing deal scenarios',
      price: 'Free',
      note: 'Free for all users',
      status: 'available' as const,
      icon: BarChart3,
      href: '/tools/pub-deal-simulator',
    },
    {
      name: 'Advance Estimator',
      description: 'Calculate potential catalog funding',
      price: 'Free',
      note: 'Free for all users',
      status: 'available' as const,
      icon: DollarSign,
      href: '/tools/advance-estimator',
    },
  ];

  return (
    <Section id="pricing" className="py-32">
      <div ref={ref} className="max-w-7xl mx-auto px-6 md:px-12">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <motion.div variants={fadeUpItem} className="flex items-center justify-center gap-4 mb-8">
            <div className="w-12 h-px bg-[#f0e226]" />
            <span className="text-xs uppercase tracking-[0.3em] text-white/40">Pricing</span>
            <div className="w-12 h-px bg-[#f0e226]" />
          </motion.div>

          <motion.h2
            variants={fadeUpItem}
            className="text-4xl md:text-5xl font-normal text-white leading-[1.1]"
          >
            Simple, <YellowText>transparent</YellowText> pricing.
          </motion.h2>
        </motion.div>

        {/* Publishing Administration Card */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
          transition={{ duration: 0.6, delay: BEAT * 2 }}
          className="mb-16"
        >
          <LiftCard className="p-8 md:p-12 border-[#f0e226] relative max-w-4xl mx-auto">
            <div className="absolute -top-3 left-8 px-3 py-1 bg-[#f0e226] text-black text-xs uppercase tracking-wider">
              Publishing
            </div>

            <div className="grid md:grid-cols-2 gap-8 md:gap-12">
              <div>
                <div className="text-sm uppercase tracking-[0.2em] text-white/40 mb-2">
                  Music Publishing Administration
                </div>
                <div className="text-5xl md:text-6xl font-light text-white mb-2">80/20</div>
                <div className="text-lg text-white/60 mb-6">You keep <YellowText>80%</YellowText> of your royalties</div>

                <MagneticButton
                  href="/apply"
                  variant="primary"
                  className="w-full md:w-auto justify-center"
                >
                  Get Started
                </MagneticButton>
              </div>

              <div>
                <ul className="space-y-4">
                  {publishingFeatures.map((feature) => (
                    <li key={feature} className="flex items-center gap-3 text-sm text-white/60">
                      <Check className="w-4 h-4 text-[#f0e226] flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </LiftCard>
        </motion.div>

        {/* Writer Tools Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.6, delay: BEAT * 4 }}
        >
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className="w-12 h-px bg-[#f0e226]" />
            <span className="text-xs uppercase tracking-[0.3em] text-white/40">Writer Tools</span>
            <div className="w-12 h-px bg-[#f0e226]" />
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {writerTools.map((tool, i) => (
              <LiftCard
                key={tool.name}
                delay={BEAT * 5 + i * BEAT}
                className={`p-6 relative ${tool.status === 'coming-soon' ? 'opacity-75' : ''}`}
              >
                {tool.status === 'coming-soon' && (
                  <div className="absolute -top-3 right-6 px-3 py-1 bg-white/10 text-white/60 text-xs uppercase tracking-wider flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Coming Soon
                  </div>
                )}
                {tool.note && tool.status === 'available' && (
                  <div className="absolute -top-3 right-6 px-3 py-1 bg-[#f0e226] text-black text-xs uppercase tracking-wider">
                    {tool.price === 'Free' ? 'Free' : 'Free for Writers'}
                  </div>
                )}

                <div className="flex items-start gap-4 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-[#f0e226]/10 flex items-center justify-center flex-shrink-0">
                    <tool.icon className="w-5 h-5 text-[#f0e226]" />
                  </div>
                  <div>
                    <div className="text-white font-medium mb-1">{tool.name}</div>
                    <div className="text-xs text-white/40">{tool.description}</div>
                  </div>
                </div>

                {tool.status === 'available' && (
                  <div className="text-2xl font-light text-white mb-4">{tool.price}</div>
                )}

                {tool.status === 'contact' && (
                  <div className="text-lg text-white/60 mb-4">Contact for pricing</div>
                )}

                {tool.status === 'coming-soon' ? (
                  <div className="text-sm text-white/40 uppercase tracking-wider">
                    Notify Me
                  </div>
                ) : (
                  <MagneticButton
                    href={tool.href}
                    variant="secondary"
                    className="w-full justify-center text-sm py-3"
                  >
                    {tool.status === 'contact' ? 'Contact Us' : 'Get Started'}
                  </MagneticButton>
                )}
              </LiftCard>
            ))}
          </div>
        </motion.div>
      </div>
    </Section>
  );
}

// ============================================
// FAQ SECTION - Accordion
// ============================================

function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <Section id="faq" dark={false} className="py-32">
      <div ref={ref} className="max-w-4xl mx-auto px-6 md:px-12">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          className="text-center mb-16"
        >
          <motion.div variants={fadeUpItem} className="flex items-center justify-center gap-4 mb-8">
            <div className="w-12 h-px bg-[#f0e226]" />
            <span className="text-xs uppercase tracking-[0.3em] text-white/40">FAQ</span>
            <div className="w-12 h-px bg-[#f0e226]" />
          </motion.div>

          <motion.h2
            variants={fadeUpItem}
            className="text-4xl md:text-5xl font-normal text-white leading-[1.1]"
          >
            Got <YellowText>questions?</YellowText>
          </motion.h2>
        </motion.div>

        <div className="space-y-2">
          {faqData.slice(0, 6).map((item, i) => (
            <motion.div
              key={item.question}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * BEAT }}
              className="border border-white/10"
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
              >
                <span className="text-white font-normal">{item.question}</span>
                <motion.div
                  animate={{ rotate: openIndex === i ? 45 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Plus className="w-5 h-5 text-[#f0e226]" />
                </motion.div>
              </button>

              <AnimatePresence>
                {openIndex === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-5 text-white/50 text-sm leading-relaxed">
                      {item.answer}
                    </div>
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
// CTA SECTION
// ============================================

function CTASection() {
  return (
    <Section className="py-32">
      <div className="max-w-4xl mx-auto px-6 md:px-12 text-center">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex justify-center"
        >
          <Logo size={140} />
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: BEAT * 2 }}
          className="mt-8 text-4xl md:text-5xl lg:text-6xl font-normal text-white leading-[1.1]"
        >
          Ready to collect your <YellowText>royalties?</YellowText>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: BEAT * 4 }}
          className="mt-6 text-lg text-white/50 max-w-xl mx-auto"
        >
          Join 1,200+ songwriters who trust us with their publishing royalties.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: BEAT * 6 }}
          className="mt-10 flex justify-center"
        >
          <MagneticButton href="/apply" variant="primary">
            Apply Now
            <ArrowRight className="w-5 h-5" />
          </MagneticButton>
        </motion.div>
      </div>
    </Section>
  );
}

// ============================================
// FOOTER
// ============================================

function Footer() {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    product: [
      { name: 'Features', href: '#services' },
      { name: 'How It Works', href: '#process' },
      { name: 'FAQ', href: '#faq' },
      { name: 'Pricing', href: '/pricing' },
      { name: 'Shop', href: '/shop' },
    ],
    company: [
      { name: 'About', href: '#about' },
      { name: 'Blog', href: 'https://blog.producertour.com' },
      { name: 'Careers', href: '#careers' },
      { name: 'Contact', href: '/contact' },
    ],
    legal: [
      { name: 'Privacy Policy', href: '#privacy' },
      { name: 'Terms of Service', href: '#terms' },
    ],
  };

  return (
    <footer className="relative bg-[#19181a] border-t border-white/5">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        {/* Main Footer Content */}
        <div className="py-16 md:py-20">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 lg:gap-12">
            {/* Brand Column */}
            <div className="col-span-2 md:col-span-1">
              <a href="/" className="inline-block mb-6">
                <Logo size={100} />
              </a>
              <p className="text-white/40 text-sm leading-relaxed mb-6 max-w-xs">
                Publishing administration built for independent music producers.
                Track your royalties. Get paid monthly.
              </p>
              {/* Social Links */}
              <div className="flex gap-3">
                <a
                  href="https://twitter.com/producertour"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-[#f0e226] hover:border-[#f0e226]/30 transition-colors"
                  aria-label="Twitter"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </a>
                <a
                  href="https://discord.gg/producertour"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-[#f0e226] hover:border-[#f0e226]/30 transition-colors"
                  aria-label="Discord"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                  </svg>
                </a>
                <a
                  href="https://instagram.com/producertour"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-[#f0e226] hover:border-[#f0e226]/30 transition-colors"
                  aria-label="Instagram"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                  </svg>
                </a>
              </div>
            </div>

            {/* Product Links */}
            <div>
              <h4 className="text-sm font-medium text-white uppercase tracking-[0.15em] mb-4">Product</h4>
              <ul className="space-y-3">
                {footerLinks.product.map((link) => (
                  <li key={link.name}>
                    <a
                      href={link.href}
                      className="text-sm text-white/40 hover:text-[#f0e226] transition-colors"
                    >
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company Links */}
            <div>
              <h4 className="text-sm font-medium text-white uppercase tracking-[0.15em] mb-4">Company</h4>
              <ul className="space-y-3">
                {footerLinks.company.map((link) => (
                  <li key={link.name}>
                    <a
                      href={link.href}
                      className="text-sm text-white/40 hover:text-[#f0e226] transition-colors"
                    >
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal Links */}
            <div>
              <h4 className="text-sm font-medium text-white uppercase tracking-[0.15em] mb-4">Legal</h4>
              <ul className="space-y-3">
                {footerLinks.legal.map((link) => (
                  <li key={link.name}>
                    <a
                      href={link.href}
                      className="text-sm text-white/40 hover:text-[#f0e226] transition-colors"
                    >
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Status */}
            <div>
              <h4 className="text-sm font-medium text-white uppercase tracking-[0.15em] mb-4">Status</h4>
              <div className="flex items-center gap-2 text-sm text-white/40">
                <span className="w-2 h-2 rounded-full bg-[#f0e226] animate-pulse" />
                <span>All systems operational</span>
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-white/5" />

        {/* Bottom Bar */}
        <div className="py-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-white/30">
            © {currentYear} Producer Tour. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-sm text-white/30">
            <a href="#privacy" className="hover:text-[#f0e226] transition-colors">
              Privacy
            </a>
            <a href="#terms" className="hover:text-[#f0e226] transition-colors">
              Terms
            </a>
            <a href="#cookies" className="hover:text-[#f0e226] transition-colors">
              Cookies
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ============================================
// MAIN EXPORT
// ============================================

export function PublisherCassetteLandingPage() {
  return (
    <div className="bg-black text-white min-h-screen cursor-none">
      {/* Global effects */}
      <NoiseOverlay />
      <Spotlight />
      <CustomCursor />

      {/* Content */}
      <HeroSection />
      <TickerSection />
      <AboutSection />
      <ServicesSection />
      <SpotifySection />
      <ProcessSection />
      <PricingSection />
      <FAQSection />
      <CTASection />
      <Footer />
    </div>
  );
}
