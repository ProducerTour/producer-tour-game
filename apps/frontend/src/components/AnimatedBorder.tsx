import { motion } from 'framer-motion';
import { useMemo } from 'react';

export interface BorderConfig {
  id: string;
  name: string;
  tier: string;
  colors: string[]; // Array of hex colors for gradient
  spinSpeed: number; // Animation duration in seconds (lower = faster)
  glowIntensity: number; // 1 = normal, 2 = intense
  specialEffect?: 'sparkles' | 'particles' | 'shimmer' | 'flame' | null;
}

// Preset borders matching Rocket League-style tier system
export const PRESET_BORDERS: Record<string, BorderConfig> = {
  'first-steps': {
    id: 'first-steps',
    name: 'First Steps',
    tier: 'starter',
    colors: ['#4ade80', '#22c55e', '#16a34a'],
    spinSpeed: 4,
    glowIntensity: 1,
    specialEffect: null,
  },
  'week-warrior': {
    id: 'week-warrior',
    name: 'Week Warrior',
    tier: 'week',
    colors: ['#60a5fa', '#3b82f6', '#2563eb'],
    spinSpeed: 3.5,
    glowIntensity: 1.2,
    specialEffect: null,
  },
  'monthly-master': {
    id: 'monthly-master',
    name: 'Monthly Master',
    tier: 'month',
    colors: ['#a78bfa', '#8b5cf6', '#7c3aed'],
    spinSpeed: 3,
    glowIntensity: 1.3,
    specialEffect: 'shimmer',
  },
  'streak-legend': {
    id: 'streak-legend',
    name: 'Streak Legend',
    tier: 'streak',
    colors: ['#fb923c', '#f97316', '#ea580c'],
    spinSpeed: 2.5,
    glowIntensity: 1.5,
    specialEffect: 'flame',
  },
  'bronze-status': {
    id: 'bronze-status',
    name: 'Bronze Status',
    tier: 'BRONZE',
    colors: ['#d97706', '#b45309', '#92400e'],
    spinSpeed: 4,
    glowIntensity: 1,
    specialEffect: null,
  },
  'silver-status': {
    id: 'silver-status',
    name: 'Silver Status',
    tier: 'SILVER',
    colors: ['#9ca3af', '#6b7280', '#4b5563'],
    spinSpeed: 3.5,
    glowIntensity: 1.2,
    specialEffect: 'shimmer',
  },
  'gold-status': {
    id: 'gold-status',
    name: 'Gold Status',
    tier: 'GOLD',
    colors: ['#fcd34d', '#fbbf24', '#f59e0b'],
    spinSpeed: 3,
    glowIntensity: 1.4,
    specialEffect: 'sparkles',
  },
  'diamond-status': {
    id: 'diamond-status',
    name: 'Diamond Status',
    tier: 'DIAMOND',
    colors: ['#67e8f9', '#22d3ee', '#06b6d4', '#0891b2'],
    spinSpeed: 2.5,
    glowIntensity: 1.6,
    specialEffect: 'sparkles',
  },
  'elite-status': {
    id: 'elite-status',
    name: 'Elite Status',
    tier: 'ELITE',
    colors: ['#f472b6', '#ec4899', '#db2777', '#be185d', '#9d174d'],
    spinSpeed: 2,
    glowIntensity: 2,
    specialEffect: 'particles',
  },
};

interface AnimatedBorderProps {
  children: React.ReactNode;
  border?: BorderConfig | null;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  showBorder?: boolean;
}

export function AnimatedBorder({
  children,
  border,
  size = 'md',
  className = '',
  showBorder = true,
}: AnimatedBorderProps) {
  // Size configurations
  const sizeConfig = useMemo(() => {
    switch (size) {
      case 'sm':
        return { outer: 'w-10 h-10', inner: 'w-8 h-8', borderWidth: 2 };
      case 'md':
        return { outer: 'w-14 h-14', inner: 'w-12 h-12', borderWidth: 3 };
      case 'lg':
        return { outer: 'w-20 h-20', inner: 'w-[72px] h-[72px]', borderWidth: 4 };
      case 'xl':
        return { outer: 'w-28 h-28', inner: 'w-24 h-24', borderWidth: 5 };
      case '2xl':
        return { outer: 'w-40 h-40', inner: 'w-36 h-36', borderWidth: 8 };
      default:
        return { outer: 'w-14 h-14', inner: 'w-12 h-12', borderWidth: 3 };
    }
  }, [size]);

  // Generate conic gradient from colors
  const gradient = useMemo(() => {
    if (!border?.colors?.length) return '';
    const colors = border.colors;
    const step = 360 / colors.length;
    const gradientStops = colors.map((color, i) => `${color} ${i * step}deg ${(i + 1) * step}deg`).join(', ');
    return `conic-gradient(${gradientStops})`;
  }, [border?.colors]);

  // No border - just render children
  if (!showBorder || !border) {
    return (
      <div className={`relative ${sizeConfig.outer} rounded-full ${className}`}>
        <div className={`${sizeConfig.inner} rounded-full overflow-hidden`}>
          {children}
        </div>
      </div>
    );
  }

  const glowColor = border.colors[0];
  const glowStyle = {
    boxShadow: `0 0 ${8 * border.glowIntensity}px ${glowColor}40, 0 0 ${16 * border.glowIntensity}px ${glowColor}20`,
  };

  return (
    <div className={`relative ${sizeConfig.outer} rounded-full ${className}`}>
      {/* Animated spinning border */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background: gradient,
          ...glowStyle,
        }}
        animate={{ rotate: 360 }}
        transition={{
          duration: border.spinSpeed,
          repeat: Infinity,
          ease: 'linear',
        }}
      />

      {/* Glow pulse effect for high intensity borders */}
      {border.glowIntensity >= 1.5 && (
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background: gradient,
            filter: 'blur(8px)',
            opacity: 0.4,
          }}
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}

      {/* Special effects overlay */}
      {border.specialEffect && (
        <SpecialEffectOverlay effect={border.specialEffect} colors={border.colors} />
      )}

      {/* Inner content container */}
      <div
        className="absolute rounded-full overflow-hidden"
        style={{
          top: sizeConfig.borderWidth,
          left: sizeConfig.borderWidth,
          right: sizeConfig.borderWidth,
          bottom: sizeConfig.borderWidth,
        }}
      >
        {children}
      </div>
    </div>
  );
}

// Special effects component
function SpecialEffectOverlay({
  effect,
  colors,
}: {
  effect: 'sparkles' | 'particles' | 'shimmer' | 'flame';
  colors: string[];
}) {
  const primaryColor = colors[0];

  switch (effect) {
    case 'sparkles':
      return (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 rounded-full"
              style={{
                backgroundColor: primaryColor,
                top: `${20 + Math.random() * 60}%`,
                left: `${20 + Math.random() * 60}%`,
              }}
              animate={{
                scale: [0, 1, 0],
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.25,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>
      );

    case 'particles':
      return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-full">
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-0.5 h-0.5 rounded-full"
              style={{
                backgroundColor: colors[i % colors.length],
                left: '50%',
                top: '50%',
              }}
              animate={{
                x: [0, Math.cos((i / 8) * Math.PI * 2) * 30],
                y: [0, Math.sin((i / 8) * Math.PI * 2) * 30],
                opacity: [1, 0],
                scale: [0, 1.5],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.25,
                ease: 'easeOut',
              }}
            />
          ))}
        </div>
      );

    case 'shimmer':
      return (
        <motion.div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background: `linear-gradient(135deg, transparent 40%, ${primaryColor}40 50%, transparent 60%)`,
          }}
          animate={{
            rotate: [0, 360],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      );

    case 'flame':
      return (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(4)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute bottom-1/4 w-1.5 h-3 rounded-full"
              style={{
                backgroundColor: colors[i % colors.length],
                left: `${25 + i * 18}%`,
                filter: 'blur(1px)',
              }}
              animate={{
                scaleY: [1, 1.4, 1],
                opacity: [0.7, 1, 0.7],
                y: [0, -3, 0],
              }}
              transition={{
                duration: 0.5 + i * 0.1,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>
      );

    default:
      return null;
  }
}

// Helper to get border config from API response
export function parseBorderConfig(apiResponse: any): BorderConfig | null {
  if (!apiResponse) return null;
  return {
    id: apiResponse.id,
    name: apiResponse.name,
    tier: apiResponse.tier,
    colors: apiResponse.colors || ['#60a5fa', '#3b82f6', '#2563eb'],
    spinSpeed: apiResponse.spinSpeed || 4,
    glowIntensity: apiResponse.glowIntensity || 1,
    specialEffect: apiResponse.specialEffect || null,
  };
}

export default AnimatedBorder;
