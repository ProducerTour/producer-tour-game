import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Copy,
  Check,
  Palette,
  Type,
  Layers,
  Sparkles,
  Grid3X3,
  MousePointer2,
  Download,
  Moon,
  Sun,
  ChevronRight,
  ExternalLink,
  Box,
  Zap,
  Globe,
  Music,
  Headphones,
} from 'lucide-react';
import { cn } from '../lib/utils';

// ============================================================================
// BRAND DATA
// ============================================================================

const brandColors = {
  primary: [
    { name: 'Brand Blue', hex: '#3B82F6', rgb: '59, 130, 246', usage: 'Primary actions, CTAs, highlights' },
    { name: 'Blue Hover', hex: '#2563EB', rgb: '37, 99, 235', usage: 'Hover states, active elements' },
    { name: 'Blue Light', hex: '#60A5FA', rgb: '96, 165, 250', usage: 'Accent highlights, gradient ends' },
  ],
  accent: [
    { name: 'Brand Yellow', hex: '#FFF200', rgb: '255, 242, 0', usage: 'Alternative theme, cassette UI' },
    { name: 'Brand Purple', hex: '#8B5CF6', rgb: '139, 92, 246', usage: 'Secondary highlights, gradients' },
    { name: 'Brand Cyan', hex: '#06B6D4', rgb: '6, 182, 212', usage: 'Gradient combinations' },
  ],
  dark: [
    { name: 'Surface', hex: '#0A0A0B', rgb: '10, 10, 11', usage: 'Primary background' },
    { name: 'Surface 50', hex: '#18181B', rgb: '24, 24, 27', usage: 'Elevated surfaces' },
    { name: 'Surface 100', hex: '#141416', rgb: '20, 20, 22', usage: 'Cards, containers' },
    { name: 'Card BG', hex: '#19181A', rgb: '25, 24, 26', usage: 'Card backgrounds' },
  ],
  semantic: [
    { name: 'Success', hex: '#22C55E', rgb: '34, 197, 94', usage: 'Success states, positive' },
    { name: 'Warning', hex: '#F59E0B', rgb: '245, 158, 11', usage: 'Warnings, caution' },
    { name: 'Error', hex: '#EF4444', rgb: '239, 68, 68', usage: 'Errors, destructive' },
    { name: 'Info', hex: '#3B82F6', rgb: '59, 130, 246', usage: 'Informational' },
  ],
};

const typography = {
  display: [
    { name: 'Display 2XL', size: '4.5rem', lineHeight: '1', weight: '700', letterSpacing: '-0.02em' },
    { name: 'Display XL', size: '3.75rem', lineHeight: '1.1', weight: '700', letterSpacing: '-0.02em' },
    { name: 'Display LG', size: '3rem', lineHeight: '1.1', weight: '700', letterSpacing: '-0.02em' },
    { name: 'Display MD', size: '2.25rem', lineHeight: '1.2', weight: '600', letterSpacing: '-0.02em' },
    { name: 'Display SM', size: '1.875rem', lineHeight: '1.3', weight: '600', letterSpacing: '-0.01em' },
  ],
  body: [
    { name: 'Body XL', size: '1.25rem', lineHeight: '1.75', weight: '400' },
    { name: 'Body LG', size: '1.125rem', lineHeight: '1.75', weight: '400' },
    { name: 'Body Base', size: '1rem', lineHeight: '1.5', weight: '400' },
    { name: 'Body SM', size: '0.875rem', lineHeight: '1.5', weight: '400' },
    { name: 'Body XS', size: '0.75rem', lineHeight: '1.5', weight: '400' },
  ],
};

const gradients = [
  {
    name: 'Hero Glow',
    css: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(59, 130, 246, 0.15), transparent)',
    colors: ['#3B82F6', 'transparent'],
  },
  {
    name: 'Blue to Cyan',
    css: 'linear-gradient(135deg, #3B82F6 0%, #06B6D4 100%)',
    colors: ['#3B82F6', '#06B6D4'],
  },
  {
    name: 'Blue to Purple',
    css: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)',
    colors: ['#3B82F6', '#8B5CF6'],
  },
  {
    name: 'Glass Card',
    css: 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)',
    colors: ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)'],
  },
  {
    name: 'Yellow Glow',
    css: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(255, 242, 0, 0.08), transparent)',
    colors: ['#FFF200', 'transparent'],
  },
  {
    name: 'Purple Accent',
    css: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
    colors: ['#8B5CF6', '#EC4899'],
  },
];

const shadows = [
  { name: 'Glow SM', css: '0 0 20px -5px rgba(59, 130, 246, 0.3)' },
  { name: 'Glow MD', css: '0 0 40px -10px rgba(59, 130, 246, 0.4)' },
  { name: 'Glow LG', css: '0 0 60px -15px rgba(59, 130, 246, 0.5)' },
  { name: 'Yellow Glow', css: '0 0 40px -10px rgba(255, 242, 0, 0.3)' },
  { name: 'Card Hover', css: '0 20px 40px -15px rgba(0, 0, 0, 0.3)' },
];

// ============================================================================
// COMPONENTS
// ============================================================================

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 transition-colors text-xs text-white/60 hover:text-white"
    >
      {copied ? (
        <>
          <Check className="w-3 h-3 text-green-400" />
          <span className="text-green-400">Copied!</span>
        </>
      ) : (
        <>
          <Copy className="w-3 h-3" />
          <span>{label || text}</span>
        </>
      )}
    </button>
  );
}

function ColorSwatch({
  color,
  size = 'md',
}: {
  color: { name: string; hex: string; rgb: string; usage: string };
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizeClasses = {
    sm: 'h-16',
    md: 'h-24',
    lg: 'h-32',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm hover:border-white/20 transition-all duration-300"
    >
      <div
        className={cn('w-full', sizeClasses[size])}
        style={{ backgroundColor: color.hex }}
      />
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-semibold text-white">{color.name}</h4>
          <CopyButton text={color.hex} />
        </div>
        <div className="space-y-1 text-xs text-white/50">
          <p>RGB: {color.rgb}</p>
          <p className="text-white/40">{color.usage}</p>
        </div>
      </div>
    </motion.div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-brand-blue/20 to-brand-purple/20 border border-white/10">
          <Icon className="w-5 h-5 text-brand-blue" />
        </div>
        <h2 className="text-2xl font-bold text-white">{title}</h2>
      </div>
      <p className="text-white/60 max-w-2xl">{description}</p>
    </div>
  );
}

function NavigationTabs({
  activeTab,
  setActiveTab,
}: {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}) {
  const tabs = [
    { id: 'colors', label: 'Colors', icon: Palette },
    { id: 'typography', label: 'Typography', icon: Type },
    { id: 'components', label: 'Components', icon: Layers },
    { id: 'effects', label: 'Effects', icon: Sparkles },
    { id: 'spacing', label: 'Spacing', icon: Grid3X3 },
    { id: 'assets', label: 'Assets', icon: Download },
  ];

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-xl bg-surface/80 border-b border-white/10 py-4 mb-12">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-blue to-brand-purple flex items-center justify-center">
              <Music className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">
              Producer <span className="text-brand-blue">Tour</span>
            </span>
          </div>
          <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                    activeTab === tab.id
                      ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/20'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}

// ============================================================================
// SECTION COMPONENTS
// ============================================================================

function ColorsSection() {
  return (
    <section className="space-y-12">
      <SectionHeader
        icon={Palette}
        title="Color System"
        description="A carefully crafted color palette that balances professionalism with modern aesthetics. Built for dark-first design with light mode support."
      />

      {/* Primary Colors */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-brand-blue" />
          Primary Blue
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {brandColors.primary.map((color) => (
            <ColorSwatch key={color.hex} color={color} size="lg" />
          ))}
        </div>
      </div>

      {/* Accent Colors */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-brand-purple" />
          Accent Colors
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {brandColors.accent.map((color) => (
            <ColorSwatch key={color.hex} color={color} size="lg" />
          ))}
        </div>
      </div>

      {/* Dark Theme */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Moon className="w-4 h-4" />
          Dark Theme Surfaces
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {brandColors.dark.map((color) => (
            <ColorSwatch key={color.hex} color={color} size="md" />
          ))}
        </div>
      </div>

      {/* Semantic Colors */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Zap className="w-4 h-4" />
          Semantic Colors
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {brandColors.semantic.map((color) => (
            <ColorSwatch key={color.hex} color={color} size="md" />
          ))}
        </div>
      </div>

      {/* Color Ratios */}
      <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
        <h3 className="text-lg font-semibold text-white mb-4">Color Usage Ratios</h3>
        <div className="flex items-center gap-1 h-12 rounded-xl overflow-hidden">
          <div className="h-full bg-surface-100 flex-[60] flex items-center justify-center">
            <span className="text-xs font-medium text-white/60">60% Background</span>
          </div>
          <div className="h-full bg-white/10 flex-[30] flex items-center justify-center">
            <span className="text-xs font-medium text-white/80">30% Surface</span>
          </div>
          <div className="h-full bg-brand-blue flex-[10] flex items-center justify-center">
            <span className="text-xs font-medium text-white">10% Accent</span>
          </div>
        </div>
        <p className="mt-4 text-sm text-white/50">
          Follow the 60-30-10 rule: 60% background colors, 30% surface colors, 10% accent colors.
        </p>
      </div>
    </section>
  );
}

function TypographySection() {
  return (
    <section className="space-y-12">
      <SectionHeader
        icon={Type}
        title="Typography"
        description="Inter is our primary typeface - modern, clean, and highly readable across all sizes. Available in weights from 400 to 700."
      />

      {/* Font Family */}
      <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-white">Inter</h3>
            <p className="text-sm text-white/50">Primary Font Family</p>
          </div>
          <a
            href="https://fonts.google.com/specimen/Inter"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-sm transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Google Fonts
          </a>
        </div>
        <div className="text-5xl font-bold text-white mb-4">
          Aa Bb Cc Dd Ee Ff Gg
        </div>
        <div className="text-3xl text-white/70 mb-4">
          The quick brown fox jumps over the lazy dog
        </div>
        <div className="text-xl text-white/50">
          0123456789 !@#$%^&*()
        </div>
      </div>

      {/* Font Weights */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Font Weights</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { name: 'Regular', weight: 400 },
            { name: 'Medium', weight: 500 },
            { name: 'Semibold', weight: 600 },
            { name: 'Bold', weight: 700 },
          ].map((w) => (
            <div key={w.weight} className="p-4 rounded-xl bg-white/5 border border-white/10">
              <div
                className="text-2xl text-white mb-2"
                style={{ fontWeight: w.weight }}
              >
                Producer Tour
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/50">{w.name}</span>
                <CopyButton text={String(w.weight)} label={String(w.weight)} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Display Sizes */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Display Sizes</h3>
        <div className="space-y-4">
          {typography.display.map((t) => (
            <div
              key={t.name}
              className="p-6 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors"
            >
              <div className="flex items-end justify-between gap-4 mb-4">
                <div
                  className="text-white leading-none"
                  style={{
                    fontSize: t.size,
                    fontWeight: parseInt(t.weight),
                    lineHeight: t.lineHeight,
                    letterSpacing: t.letterSpacing,
                  }}
                >
                  Producer Tour
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-white/50">
                <span className="px-2 py-1 rounded bg-white/10">{t.name}</span>
                <span>{t.size}</span>
                <span>Line: {t.lineHeight}</span>
                <span>Weight: {t.weight}</span>
                {t.letterSpacing && <span>Tracking: {t.letterSpacing}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Body Sizes */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Body Sizes</h3>
        <div className="space-y-3">
          {typography.body.map((t) => (
            <div
              key={t.name}
              className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10"
            >
              <div className="w-32 shrink-0">
                <span className="px-2 py-1 rounded bg-white/10 text-xs text-white/50">{t.name}</span>
              </div>
              <div
                className="flex-1 text-white/80"
                style={{
                  fontSize: t.size,
                  fontWeight: parseInt(t.weight),
                  lineHeight: t.lineHeight,
                }}
              >
                The music industry's most powerful toolkit for producers.
              </div>
              <div className="text-xs text-white/40">{t.size}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ComponentsSection() {
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);

  return (
    <section className="space-y-12">
      <SectionHeader
        icon={Layers}
        title="UI Components"
        description="Reusable components built with Tailwind CSS and Framer Motion. Designed for consistency and accessibility."
      />

      {/* Buttons */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Buttons</h3>
        <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
          <div className="flex flex-wrap gap-4 mb-6">
            {/* Primary Button */}
            <motion.button
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onHoverStart={() => setHoveredButton('primary')}
              onHoverEnd={() => setHoveredButton(null)}
              className="px-6 py-3 rounded-xl bg-white text-surface font-semibold shadow-lg shadow-white/10 hover:shadow-white/20 transition-shadow"
            >
              Primary Button
            </motion.button>

            {/* Secondary Button */}
            <motion.button
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onHoverStart={() => setHoveredButton('secondary')}
              onHoverEnd={() => setHoveredButton(null)}
              className="px-6 py-3 rounded-xl bg-white/10 border border-white/10 text-white font-medium hover:bg-white/20 hover:border-white/20 transition-all"
            >
              Secondary Button
            </motion.button>

            {/* Ghost Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onHoverStart={() => setHoveredButton('ghost')}
              onHoverEnd={() => setHoveredButton(null)}
              className="px-6 py-3 rounded-xl text-white/70 font-medium hover:text-white hover:bg-white/5 transition-all"
            >
              Ghost Button
            </motion.button>

            {/* Blue CTA */}
            <motion.button
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onHoverStart={() => setHoveredButton('cta')}
              onHoverEnd={() => setHoveredButton(null)}
              className="px-6 py-3 rounded-xl bg-brand-blue text-white font-semibold shadow-lg shadow-brand-blue/30 hover:shadow-brand-blue/50 transition-shadow"
            >
              Call to Action
            </motion.button>
          </div>

          <AnimatePresence mode="wait">
            {hoveredButton && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-xs text-white/50 p-3 rounded-lg bg-white/5"
              >
                {hoveredButton === 'primary' && 'Primary: bg-white text-surface font-semibold'}
                {hoveredButton === 'secondary' && 'Secondary: bg-white/10 border border-white/10'}
                {hoveredButton === 'ghost' && 'Ghost: transparent hover:bg-white/5'}
                {hoveredButton === 'cta' && 'CTA: bg-brand-blue shadow-brand-blue/30'}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Cards */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Cards</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Glass Card */}
          <motion.div
            whileHover={{ y: -4, borderColor: 'rgba(255,255,255,0.2)' }}
            className="p-6 rounded-2xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/10 backdrop-blur-sm"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-blue/30 to-brand-purple/30 border border-white/10 flex items-center justify-center mb-4">
              <Box className="w-6 h-6 text-brand-blue" />
            </div>
            <h4 className="text-lg font-semibold text-white mb-2">Glass Card</h4>
            <p className="text-sm text-white/60">
              Frosted glass effect with gradient background and blur.
            </p>
          </motion.div>

          {/* Feature Card */}
          <motion.div
            whileHover={{ y: -4 }}
            className="group p-6 rounded-2xl bg-surface-50 border border-white/10 hover:border-brand-blue/30 transition-colors"
          >
            <div className="w-12 h-12 rounded-xl bg-brand-blue/10 flex items-center justify-center mb-4 group-hover:bg-brand-blue/20 transition-colors">
              <Zap className="w-6 h-6 text-brand-blue" />
            </div>
            <h4 className="text-lg font-semibold text-white mb-2 group-hover:text-brand-blue transition-colors">
              Feature Card
            </h4>
            <p className="text-sm text-white/60">
              Clean card with hover state accent color transition.
            </p>
          </motion.div>

          {/* Highlighted Card */}
          <motion.div
            whileHover={{ y: -4 }}
            className="relative p-6 rounded-2xl bg-surface-50 border-2 border-brand-blue/50 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-b from-brand-blue/10 to-transparent pointer-events-none" />
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-brand-blue flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h4 className="text-lg font-semibold text-white mb-2">Highlighted Card</h4>
              <p className="text-sm text-white/60">
                Featured content with accent border and gradient overlay.
              </p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Badges */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Badges</h3>
        <div className="flex flex-wrap gap-3">
          <span className="px-3 py-1.5 rounded-full bg-white/10 text-white/80 text-sm border border-white/10">
            Default
          </span>
          <span className="px-3 py-1.5 rounded-full bg-brand-blue/20 text-brand-blue text-sm border border-brand-blue/30">
            Primary
          </span>
          <span className="px-3 py-1.5 rounded-full bg-green-500/20 text-green-400 text-sm border border-green-500/30">
            Success
          </span>
          <span className="px-3 py-1.5 rounded-full bg-yellow-500/20 text-yellow-400 text-sm border border-yellow-500/30">
            Warning
          </span>
          <span className="px-3 py-1.5 rounded-full bg-red-500/20 text-red-400 text-sm border border-red-500/30">
            Error
          </span>
          <span className="px-3 py-1.5 rounded-full bg-purple-500/20 text-purple-400 text-sm border border-purple-500/30">
            Pro
          </span>
        </div>
      </div>

      {/* Input Fields */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Input Fields</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-white/60 mb-2">Default Input</label>
            <input
              type="text"
              placeholder="Enter your email..."
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 focus:outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white/60 mb-2">With Icon</label>
            <div className="relative">
              <Headphones className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              <input
                type="text"
                placeholder="Search producers..."
                className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 focus:outline-none transition-all"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function EffectsSection() {
  return (
    <section className="space-y-12">
      <SectionHeader
        icon={Sparkles}
        title="Effects & Animations"
        description="Carefully crafted motion and visual effects that bring the interface to life while maintaining performance."
      />

      {/* Gradients */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Gradients</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {gradients.map((gradient) => (
            <div
              key={gradient.name}
              className="rounded-xl border border-white/10 overflow-hidden"
            >
              <div
                className="h-32 w-full"
                style={{ background: gradient.css }}
              />
              <div className="p-4 bg-white/5">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-white">{gradient.name}</h4>
                  <CopyButton text={gradient.css} label="CSS" />
                </div>
                <div className="flex items-center gap-2">
                  {gradient.colors.map((color, i) => (
                    <div
                      key={i}
                      className="w-6 h-6 rounded border border-white/20"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Shadows */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Glow Effects</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {shadows.map((shadow) => (
            <div
              key={shadow.name}
              className="p-6 rounded-xl bg-white/5 border border-white/10"
            >
              <div
                className="w-full h-20 rounded-lg bg-surface mb-4"
                style={{ boxShadow: shadow.css }}
              />
              <div className="flex items-center justify-between">
                <span className="font-medium text-white">{shadow.name}</span>
                <CopyButton text={shadow.css} label="Copy" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Animations */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Animations</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Fade In Up */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <motion.div
              animate={{ y: [20, 0], opacity: [0, 1] }}
              transition={{ duration: 1, repeat: Infinity, repeatDelay: 1 }}
              className="w-full h-16 rounded-lg bg-brand-blue/30 mb-3"
            />
            <span className="text-sm text-white/60">Fade In Up</span>
          </div>

          {/* Scale In */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <motion.div
              animate={{ scale: [0.8, 1], opacity: [0, 1] }}
              transition={{ duration: 0.8, repeat: Infinity, repeatDelay: 1.2 }}
              className="w-full h-16 rounded-lg bg-brand-purple/30 mb-3"
            />
            <span className="text-sm text-white/60">Scale In</span>
          </div>

          {/* Float */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <motion.div
              animate={{ y: [-4, 4, -4] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="w-full h-16 rounded-lg bg-brand-cyan/30 mb-3"
            />
            <span className="text-sm text-white/60">Float</span>
          </div>

          {/* Pulse */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-full h-16 rounded-lg bg-green-500/30 mb-3"
            />
            <span className="text-sm text-white/60">Pulse</span>
          </div>
        </div>
      </div>

      {/* Glass Morphism */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Glass Morphism</h3>
        <div className="relative h-64 rounded-2xl overflow-hidden">
          {/* Background with gradients */}
          <div className="absolute inset-0 bg-gradient-to-br from-brand-blue/30 via-brand-purple/20 to-brand-cyan/30" />
          <div className="absolute top-10 left-10 w-32 h-32 rounded-full bg-brand-blue/50 blur-3xl" />
          <div className="absolute bottom-10 right-10 w-40 h-40 rounded-full bg-brand-purple/50 blur-3xl" />

          {/* Glass card */}
          <div className="absolute inset-8 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              className="p-6 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl"
            >
              <h4 className="text-xl font-bold text-white mb-2">Glassmorphism</h4>
              <p className="text-white/70 text-sm">
                backdrop-blur-xl + bg-white/10 + border-white/20
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SpacingSection() {
  const spacingScale = [
    { name: 'xs', value: '0.25rem', px: '4px' },
    { name: 'sm', value: '0.5rem', px: '8px' },
    { name: 'md', value: '1rem', px: '16px' },
    { name: 'lg', value: '1.5rem', px: '24px' },
    { name: 'xl', value: '2rem', px: '32px' },
    { name: '2xl', value: '3rem', px: '48px' },
    { name: '3xl', value: '4rem', px: '64px' },
    { name: 'section', value: '8rem', px: '128px' },
    { name: 'section-lg', value: '10rem', px: '160px' },
  ];

  const radiusScale = [
    { name: 'sm', value: '0.25rem', visual: '4px' },
    { name: 'md', value: '0.375rem', visual: '6px' },
    { name: 'lg', value: '0.5rem', visual: '8px' },
    { name: 'xl', value: '0.75rem', visual: '12px' },
    { name: '2xl', value: '1rem', visual: '16px' },
    { name: '3xl', value: '1.5rem', visual: '24px' },
    { name: 'full', value: '9999px', visual: 'full' },
  ];

  return (
    <section className="space-y-12">
      <SectionHeader
        icon={Grid3X3}
        title="Spacing & Layout"
        description="Consistent spacing creates visual harmony. Our spacing scale is based on a 4px base unit for pixel-perfect alignment."
      />

      {/* Spacing Scale */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Spacing Scale</h3>
        <div className="space-y-3">
          {spacingScale.map((space) => (
            <div
              key={space.name}
              className="flex items-center gap-4 p-3 rounded-xl bg-white/5 border border-white/10"
            >
              <div className="w-20">
                <span className="px-2 py-1 rounded bg-brand-blue/20 text-brand-blue text-xs font-medium">
                  {space.name}
                </span>
              </div>
              <div
                className="h-8 bg-brand-blue/50 rounded"
                style={{ width: space.value }}
              />
              <div className="flex items-center gap-4 text-sm text-white/50 ml-auto">
                <span>{space.value}</span>
                <span className="text-white/30">({space.px})</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Border Radius */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Border Radius</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {radiusScale.map((radius) => (
            <div
              key={radius.name}
              className="p-4 rounded-xl bg-white/5 border border-white/10 text-center"
            >
              <div
                className="w-16 h-16 mx-auto bg-brand-blue/30 border-2 border-brand-blue mb-3"
                style={{ borderRadius: radius.value }}
              />
              <div className="text-xs">
                <span className="block text-white font-medium">{radius.name}</span>
                <span className="text-white/40">{radius.visual}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Grid System */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Grid System</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-12 gap-2">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="h-12 rounded bg-brand-blue/20 border border-brand-blue/40 flex items-center justify-center text-xs text-brand-blue"
              >
                {i + 1}
              </div>
            ))}
          </div>
          <p className="text-sm text-white/50">
            12-column grid system with responsive breakpoints at sm (640px), md (768px), and lg (1024px).
          </p>
        </div>
      </div>

      {/* Container Widths */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Container Widths</h3>
        <div className="space-y-3">
          {[
            { name: 'sm', width: '640px', usage: 'Small content areas' },
            { name: 'md', width: '768px', usage: 'Medium layouts' },
            { name: 'lg', width: '1024px', usage: 'Standard content' },
            { name: 'xl', width: '1280px', usage: 'Wide layouts' },
            { name: '7xl', width: '1440px', usage: 'Full-width sections' },
          ].map((container) => (
            <div
              key={container.name}
              className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10"
            >
              <div className="flex items-center gap-3">
                <span className="px-2 py-1 rounded bg-white/10 text-xs text-white font-medium">
                  max-w-{container.name}
                </span>
                <span className="text-white/60 text-sm">{container.usage}</span>
              </div>
              <span className="text-sm text-white/40">{container.width}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function AssetsSection() {
  return (
    <section className="space-y-12">
      <SectionHeader
        icon={Download}
        title="Brand Assets"
        description="Official logos, icons, and visual assets for Producer Tour. Use these assets consistently across all platforms."
      />

      {/* Logos */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Logo Variants</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* White Logo on Dark */}
          <div className="p-8 rounded-2xl bg-surface border border-white/10">
            <div className="flex items-center justify-center h-32 mb-4">
              <img
                src="/src/assets/images/logos/whitetransparentpt.png"
                alt="Producer Tour White Logo"
                className="h-14 w-auto"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-white">White on Dark</h4>
                <p className="text-xs text-white/50">Primary usage</p>
              </div>
              <a
                href="/src/assets/images/logos/whitetransparentpt.png"
                download
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-sm text-white/60 hover:text-white transition-colors"
              >
                <Download className="w-4 h-4" />
                PNG
              </a>
            </div>
          </div>

          {/* Black Logo on Light */}
          <div className="p-8 rounded-2xl bg-white border border-white/10">
            <div className="flex items-center justify-center h-32 mb-4">
              <img
                src="/src/assets/images/logos/blacktransparentpt.png"
                alt="Producer Tour Black Logo"
                className="h-14 w-auto"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-surface">Black on Light</h4>
                <p className="text-xs text-surface/50">Print & light backgrounds</p>
              </div>
              <a
                href="/src/assets/images/logos/blacktransparentpt.png"
                download
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface/10 hover:bg-surface/20 text-sm text-surface/60 hover:text-surface transition-colors"
              >
                <Download className="w-4 h-4" />
                PNG
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Logo Clear Space */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Logo Clear Space</h3>
        <div className="p-8 rounded-2xl bg-white/5 border border-white/10">
          <div className="relative w-fit mx-auto">
            <div className="absolute inset-0 border-2 border-dashed border-brand-blue/30 -m-8" />
            <div className="p-8">
              <div className="text-3xl font-bold text-white">
                Producer <span className="text-brand-blue">Tour</span>
              </div>
            </div>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full text-xs text-brand-blue/60 pb-2">
              1x
            </div>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full text-xs text-brand-blue/60 pt-2">
              1x
            </div>
            <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full text-xs text-brand-blue/60 pr-2">
              1x
            </div>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full text-xs text-brand-blue/60 pl-2">
              1x
            </div>
          </div>
          <p className="text-center text-sm text-white/50 mt-8">
            Maintain minimum clear space of 1x the logo height on all sides.
          </p>
        </div>
      </div>

      {/* Brand Mark Usage */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Brand Mark</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { bg: 'bg-surface', border: 'border-white/10', text: 'text-white' },
            { bg: 'bg-brand-blue', border: 'border-brand-blue', text: 'text-white' },
            { bg: 'bg-white', border: 'border-gray-200', text: 'text-surface' },
            { bg: 'bg-gradient-to-br from-brand-blue to-brand-purple', border: 'border-transparent', text: 'text-white' },
          ].map((style, i) => (
            <div
              key={i}
              className={cn(
                'p-6 rounded-xl border flex items-center justify-center',
                style.bg,
                style.border
              )}
            >
              <div className={cn('text-xl font-bold', style.text)}>
                PT
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Icons */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Icon Set</h3>
        <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
          <p className="text-sm text-white/60 mb-4">
            We use <span className="text-white font-medium">Lucide Icons</span> for consistency across the platform.
          </p>
          <div className="grid grid-cols-6 md:grid-cols-10 gap-3">
            {[
              Music, Headphones, Globe, Zap, Sparkles, Box, Layers, Grid3X3,
              Palette, Type, Download, Copy, Check, ChevronRight, ExternalLink,
              Moon, Sun, MousePointer2,
            ].map((Icon, i) => (
              <div
                key={i}
                className="w-12 h-12 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:border-brand-blue/30 hover:bg-brand-blue/10 transition-colors cursor-pointer"
              >
                <Icon className="w-5 h-5 text-white/60" />
              </div>
            ))}
          </div>
          <a
            href="https://lucide.dev/icons"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-4 text-sm text-brand-blue hover:underline"
          >
            Browse full icon set
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Do's and Don'ts */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Usage Guidelines</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Do's */}
          <div className="p-6 rounded-2xl bg-green-500/10 border border-green-500/20">
            <h4 className="flex items-center gap-2 text-green-400 font-semibold mb-4">
              <Check className="w-5 h-5" />
              Do
            </h4>
            <ul className="space-y-2 text-sm text-white/70">
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                Use the white logo on dark backgrounds
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                Maintain proper clear space around the logo
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                Use brand blue (#3B82F6) for primary accents
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                Keep text hierarchy with white → 70% → 40% opacity
              </li>
            </ul>
          </div>

          {/* Don'ts */}
          <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/20">
            <h4 className="flex items-center gap-2 text-red-400 font-semibold mb-4">
              <span className="w-5 h-5 flex items-center justify-center text-lg">×</span>
              Don't
            </h4>
            <ul className="space-y-2 text-sm text-white/70">
              <li className="flex items-start gap-2">
                <span className="w-4 h-4 text-red-400 mt-0.5 shrink-0 text-center">×</span>
                Stretch or distort the logo
              </li>
              <li className="flex items-start gap-2">
                <span className="w-4 h-4 text-red-400 mt-0.5 shrink-0 text-center">×</span>
                Use colors outside the brand palette
              </li>
              <li className="flex items-start gap-2">
                <span className="w-4 h-4 text-red-400 mt-0.5 shrink-0 text-center">×</span>
                Place the logo on busy backgrounds
              </li>
              <li className="flex items-start gap-2">
                <span className="w-4 h-4 text-red-400 mt-0.5 shrink-0 text-center">×</span>
                Use drop shadows on the logo
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function BrandKitPage() {
  const [activeTab, setActiveTab] = useState('colors');

  return (
    <div className="min-h-screen bg-surface text-white">
      {/* Hero */}
      <div className="relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-brand-blue/10 via-transparent to-transparent" />
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-blue/20 rounded-full blur-[128px]" />
          <div className="absolute top-20 right-1/4 w-64 h-64 bg-brand-purple/20 rounded-full blur-[96px]" />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 pt-24 pb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-6">
              <Palette className="w-4 h-4 text-brand-blue" />
              <span className="text-sm text-white/70">Brand Guidelines v1.0</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold mb-4">
              Producer{' '}
              <span className="bg-gradient-to-r from-brand-blue to-cyan-400 bg-clip-text text-transparent">
                Tour
              </span>
            </h1>
            <p className="text-xl text-white/60 max-w-2xl mx-auto mb-8">
              The complete brand identity system for the music industry's most powerful platform.
            </p>
            <div className="flex items-center justify-center gap-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-6 py-3 rounded-xl bg-white text-surface font-semibold shadow-lg shadow-white/10"
              >
                Download Assets
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-6 py-3 rounded-xl bg-white/10 border border-white/10 text-white font-medium hover:bg-white/20"
              >
                View Figma
              </motion.button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Navigation */}
      <NavigationTabs activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 pb-24">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {activeTab === 'colors' && <ColorsSection />}
            {activeTab === 'typography' && <TypographySection />}
            {activeTab === 'components' && <ComponentsSection />}
            {activeTab === 'effects' && <EffectsSection />}
            {activeTab === 'spacing' && <SpacingSection />}
            {activeTab === 'assets' && <AssetsSection />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <p className="text-sm text-white/40">
            © 2024 Producer Tour. All rights reserved.
          </p>
          <div className="flex items-center gap-2 text-sm text-white/40">
            <span>Built with</span>
            <span className="text-brand-blue">React</span>
            <span>+</span>
            <span className="text-brand-purple">Framer Motion</span>
            <span>+</span>
            <span className="text-cyan-400">Tailwind</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
