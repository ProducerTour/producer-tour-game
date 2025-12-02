/**
 * Label Style Landing Template
 * Professional record label aesthetic - Def Jam meets high-end agency
 *
 * Style: Monochrome, platinum/silver accents, red CTAs, sophisticated
 */

import { useRef, useState, useEffect } from 'react';
import { motion, useScroll, useTransform, useInView, useMotionValue, useSpring, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowUpRight, Play, Pause, ChevronDown, Award, Users, Globe, Briefcase } from 'lucide-react';

// ============================================
// CUSTOM CURSOR (Label sites love custom cursors)
// ============================================

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
      className="fixed top-0 left-0 w-4 h-4 bg-red-600 rounded-full pointer-events-none z-[9999] mix-blend-difference hidden md:block"
      style={{ x: cursorXSpring, y: cursorYSpring }}
    />
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
  const y = useTransform(scrollYProgress, [0, 0.5], [0, 150]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 1.1]);

  // Text reveal animation
  const titleWords = ['THE', 'FUTURE', 'OF', 'ROYALTIES'];

  return (
    <section ref={ref} className="relative h-screen flex items-center justify-center overflow-hidden bg-[#0a0a0a]">
      {/* Background video placeholder / gradient */}
      <motion.div className="absolute inset-0" style={{ scale }}>
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-[#0a0a0a] to-black" />
        {/* Subtle moving gradient */}
        <motion.div
          className="absolute inset-0 opacity-30"
          animate={{
            background: [
              'radial-gradient(circle at 20% 50%, rgba(120,120,120,0.1) 0%, transparent 50%)',
              'radial-gradient(circle at 80% 50%, rgba(120,120,120,0.1) 0%, transparent 50%)',
              'radial-gradient(circle at 20% 50%, rgba(120,120,120,0.1) 0%, transparent 50%)',
            ],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
        />
      </motion.div>

      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)',
          backgroundSize: '100px 100px',
        }}
      />

      {/* Content */}
      <motion.div className="relative z-10 max-w-7xl mx-auto px-6 w-full" style={{ opacity, y }}>
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left - Text */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mb-8"
            >
              <span className="inline-flex items-center gap-3 text-xs tracking-[0.3em] text-zinc-500 uppercase">
                <span className="w-12 h-px bg-zinc-700" />
                Est. 2024
              </span>
            </motion.div>

            <div className="overflow-hidden mb-8">
              {titleWords.map((word, i) => (
                <motion.div
                  key={word}
                  initial={{ y: 100 }}
                  animate={{ y: 0 }}
                  transition={{ delay: 0.3 + i * 0.1, duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
                  className="overflow-hidden"
                >
                  <span className={`block text-5xl md:text-7xl lg:text-8xl font-light tracking-tight ${
                    word === 'ROYALTIES' ? 'text-transparent bg-clip-text bg-gradient-to-r from-zinc-200 via-zinc-400 to-zinc-200' : 'text-white'
                  }`}>
                    {word}
                  </span>
                </motion.div>
              ))}
            </div>

            <motion.p
              className="text-zinc-500 text-lg max-w-md mb-10 leading-relaxed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              The industry's most sophisticated royalty administration platform.
              Built for serious producers. Trusted by platinum artists.
            </motion.p>

            <motion.div
              className="flex flex-wrap gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
            >
              <motion.a
                href="/apply"
                className="group inline-flex items-center gap-3 px-8 py-4 bg-red-600 text-white font-medium tracking-wide hover:bg-red-700 transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Apply Now
                <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </motion.a>

              <motion.a
                href="#work"
                className="inline-flex items-center gap-3 px-8 py-4 border border-zinc-800 text-zinc-400 font-medium tracking-wide hover:border-zinc-600 hover:text-white transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Our Approach
              </motion.a>
            </motion.div>
          </div>

          {/* Right - Stats / Visual */}
          <motion.div
            className="hidden lg:block"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
          >
            <div className="relative">
              {/* Large number */}
              <div className="text-[12rem] font-extralight text-zinc-900 leading-none select-none">
                01
              </div>
              {/* Overlay stat */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <div className="text-center">
                  <div className="text-6xl font-light text-white mb-2">$2.5M+</div>
                  <div className="text-xs tracking-[0.2em] text-zinc-500 uppercase">Royalties Collected</div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
      >
        <span className="text-xs tracking-[0.2em] text-zinc-600 uppercase">Scroll</span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <ChevronDown className="w-5 h-5 text-zinc-600" />
        </motion.div>
      </motion.div>
    </section>
  );
}

// ============================================
// MARQUEE SECTION
// ============================================

function MarqueeSection() {
  const items = ['BMI', 'ASCAP', 'SESAC', 'PLATINUM', 'CERTIFIED', 'WORLDWIDE', 'BMI', 'ASCAP', 'SESAC'];

  return (
    <div className="py-8 bg-[#0a0a0a] border-y border-zinc-900 overflow-hidden">
      <motion.div
        className="flex gap-12 whitespace-nowrap"
        animate={{ x: [0, -1000] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
      >
        {[...items, ...items].map((item, i) => (
          <span key={i} className="text-4xl md:text-6xl font-extralight text-zinc-800 tracking-tight">
            {item}
            <span className="mx-12 text-zinc-800">•</span>
          </span>
        ))}
      </motion.div>
    </div>
  );
}

// ============================================
// SECTION WRAPPER
// ============================================

function Section({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <motion.section
      ref={ref}
      initial={{ opacity: 0 }}
      animate={isInView ? { opacity: 1 } : {}}
      transition={{ duration: 0.8 }}
      className={`bg-[#0a0a0a] ${className}`}
    >
      {children}
    </motion.section>
  );
}

// ============================================
// ABOUT SECTION
// ============================================

function AboutSection() {
  return (
    <Section className="py-32">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-20">
          <div>
            <motion.span
              className="inline-flex items-center gap-3 text-xs tracking-[0.3em] text-zinc-500 uppercase mb-8"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
            >
              <span className="w-12 h-px bg-zinc-700" />
              About
            </motion.span>

            <motion.h2
              className="text-4xl md:text-5xl font-light text-white leading-tight mb-8"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              We don't just track royalties.
              <span className="text-zinc-500"> We build wealth.</span>
            </motion.h2>

            <motion.p
              className="text-zinc-500 text-lg leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              Producer Tour represents a new standard in publishing administration.
              We combine institutional-grade infrastructure with white-glove service,
              ensuring every dollar you've earned finds its way to you.
            </motion.p>
          </div>

          <div className="grid grid-cols-2 gap-6">
            {[
              { icon: Award, value: '98%', label: 'Collection Rate' },
              { icon: Users, value: '500+', label: 'Active Clients' },
              { icon: Globe, value: '50+', label: 'Countries' },
              { icon: Briefcase, value: '15%', label: 'Transparent Fee' },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                className="p-8 border border-zinc-900 hover:border-zinc-800 transition-colors"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -5 }}
              >
                <stat.icon className="w-6 h-6 text-zinc-600 mb-6" />
                <div className="text-3xl font-light text-white mb-2">{stat.value}</div>
                <div className="text-xs tracking-[0.15em] text-zinc-500 uppercase">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}

// ============================================
// SERVICES SECTION
// ============================================

function ServicesSection() {
  const services = [
    { num: '01', title: 'Royalty Collection', desc: 'Comprehensive collection from all major PROs worldwide.' },
    { num: '02', title: 'Catalog Administration', desc: 'Full registration and management of your publishing catalog.' },
    { num: '03', title: 'Sync Licensing', desc: 'Placement opportunities in film, TV, and advertising.' },
    { num: '04', title: 'Analytics & Reporting', desc: 'Real-time insights into your earnings and catalog performance.' },
  ];

  return (
    <Section id="work" className="py-32 border-t border-zinc-900">
      <div className="max-w-7xl mx-auto px-6">
        <motion.span
          className="inline-flex items-center gap-3 text-xs tracking-[0.3em] text-zinc-500 uppercase mb-8"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <span className="w-12 h-px bg-zinc-700" />
          Services
        </motion.span>

        <div className="grid md:grid-cols-2 gap-0 border border-zinc-900">
          {services.map((service, i) => (
            <motion.div
              key={service.num}
              className="p-10 border-b border-r border-zinc-900 hover:bg-zinc-900/30 transition-colors group cursor-pointer"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <div className="flex items-start justify-between mb-6">
                <span className="text-xs text-zinc-600">{service.num}</span>
                <ArrowUpRight className="w-5 h-5 text-zinc-700 group-hover:text-red-500 transition-colors" />
              </div>
              <h3 className="text-2xl font-light text-white mb-3 group-hover:text-red-500 transition-colors">
                {service.title}
              </h3>
              <p className="text-zinc-500">{service.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </Section>
  );
}

// ============================================
// TESTIMONIAL SECTION
// ============================================

function TestimonialSection() {
  const [current, setCurrent] = useState(0);
  const testimonials = [
    { quote: "Producer Tour brought structure to chaos. Our royalty collection increased by 340% in the first year.", name: "Marcus Thompson", title: "Multi-Platinum Producer" },
    { quote: "The transparency is unprecedented. I finally understand where every dollar comes from.", name: "Sarah Chen", title: "Grammy-Nominated Songwriter" },
    { quote: "This is how publishing administration should work. Professional. Efficient. Trustworthy.", name: "David Williams", title: "Executive Producer, Atlantic Records" },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [testimonials.length]);

  return (
    <Section className="py-32 border-t border-zinc-900">
      <div className="max-w-5xl mx-auto px-6">
        <motion.span
          className="inline-flex items-center gap-3 text-xs tracking-[0.3em] text-zinc-500 uppercase mb-12"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <span className="w-12 h-px bg-zinc-700" />
          Testimonials
        </motion.span>

        <div className="relative min-h-[300px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.5 }}
            >
              <blockquote className="text-3xl md:text-4xl font-light text-white leading-relaxed mb-10">
                "{testimonials[current].quote}"
              </blockquote>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-zinc-800 flex items-center justify-center text-zinc-400 font-medium">
                  {testimonials[current].name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <div className="text-white font-medium">{testimonials[current].name}</div>
                  <div className="text-zinc-500 text-sm">{testimonials[current].title}</div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Dots */}
        <div className="flex gap-2 mt-10">
          {testimonials.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`w-2 h-2 transition-colors ${i === current ? 'bg-red-600' : 'bg-zinc-800'}`}
            />
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
    <Section className="py-32 border-t border-zinc-900">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <motion.h2
              className="text-5xl md:text-6xl font-light text-white leading-tight"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              Ready to elevate
              <span className="text-zinc-500"> your publishing?</span>
            </motion.h2>
          </div>

          <motion.div
            className="flex flex-col sm:flex-row gap-4 lg:justify-end"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <motion.a
              href="/apply"
              className="group inline-flex items-center justify-center gap-3 px-10 py-5 bg-red-600 text-white font-medium tracking-wide hover:bg-red-700 transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Get Started
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </motion.a>

            <motion.a
              href="/contact"
              className="inline-flex items-center justify-center gap-3 px-10 py-5 border border-zinc-800 text-zinc-400 font-medium tracking-wide hover:border-zinc-600 hover:text-white transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Contact Us
            </motion.a>
          </motion.div>
        </div>
      </div>
    </Section>
  );
}

// ============================================
// FOOTER
// ============================================

function Footer() {
  return (
    <footer className="py-12 bg-[#0a0a0a] border-t border-zinc-900">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-xl tracking-tight text-white">
            PRODUCER<span className="text-zinc-600">TOUR</span>
          </div>

          <div className="flex items-center gap-12 text-zinc-600 text-sm">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Contact</a>
          </div>

          <div className="text-zinc-700 text-sm">
            © 2025
          </div>
        </div>
      </div>
    </footer>
  );
}

// ============================================
// MAIN
// ============================================

export function LabelLandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white cursor-none md:cursor-none">
      <CustomCursor />
      <HeroSection />
      <MarqueeSection />
      <AboutSection />
      <ServicesSection />
      <TestimonialSection />
      <CTASection />
      <Footer />
    </div>
  );
}

export default LabelLandingPage;
