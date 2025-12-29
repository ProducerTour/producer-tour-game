import { motion } from 'framer-motion';
import { useMemo } from 'react';

/**
 * Enhanced Border Variations for Bronze Status
 * These are higher quality alternatives with more sophisticated effects
 */

interface EnhancedBorderProps {
  children: React.ReactNode;
  size?: number; // Size in pixels
  className?: string;
}

// =============================================================================
// VERSION 1: Smooth Metallic Gradient (No hard color stops)
// =============================================================================
export function BronzeBorderV1({ children, size = 120, className = '' }: EnhancedBorderProps) {
  const borderWidth = Math.max(4, size * 0.05);

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      {/* Outer glow */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background: 'radial-gradient(circle, #d9770640 0%, transparent 70%)',
        }}
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.5, 0.8, 0.5],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Main spinning gradient - smooth metallic */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background: `conic-gradient(
            from 0deg,
            #cd7f32 0deg,
            #e8a54b 30deg,
            #ffd699 60deg,
            #e8a54b 90deg,
            #cd7f32 120deg,
            #8b5a2b 150deg,
            #6b4423 180deg,
            #8b5a2b 210deg,
            #cd7f32 240deg,
            #e8a54b 270deg,
            #ffd699 300deg,
            #e8a54b 330deg,
            #cd7f32 360deg
          )`,
          boxShadow: '0 0 20px #cd7f3260, inset 0 0 10px #00000040',
        }}
        animate={{ rotate: 360 }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: 'linear',
        }}
      />

      {/* Inner circle cutout */}
      <div
        className="absolute rounded-full bg-zinc-900 overflow-hidden"
        style={{
          top: borderWidth,
          left: borderWidth,
          right: borderWidth,
          bottom: borderWidth,
        }}
      >
        {children}
      </div>
    </div>
  );
}

// =============================================================================
// VERSION 2: Dual Ring with Metallic Sheen
// =============================================================================
export function BronzeBorderV2({ children, size = 120, className = '' }: EnhancedBorderProps) {
  const borderWidth = Math.max(6, size * 0.06);

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      {/* Ambient glow */}
      <div
        className="absolute inset-0 rounded-full blur-md"
        style={{
          background: 'radial-gradient(circle, #cd7f3250 0%, transparent 60%)',
        }}
      />

      {/* Outer ring - slow spin */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background: `conic-gradient(
            from 0deg,
            #8b5a2b 0deg,
            #cd7f32 90deg,
            #daa06d 180deg,
            #cd7f32 270deg,
            #8b5a2b 360deg
          )`,
          padding: 2,
        }}
        animate={{ rotate: 360 }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: 'linear',
        }}
      />

      {/* Inner ring - faster counter-spin */}
      <motion.div
        className="absolute rounded-full"
        style={{
          top: 3,
          left: 3,
          right: 3,
          bottom: 3,
          background: `conic-gradient(
            from 180deg,
            #ffd699 0deg,
            #e8a54b 60deg,
            #cd7f32 120deg,
            #8b5a2b 180deg,
            #cd7f32 240deg,
            #e8a54b 300deg,
            #ffd699 360deg
          )`,
        }}
        animate={{ rotate: -360 }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: 'linear',
        }}
      />

      {/* Traveling highlight */}
      <motion.div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          background: 'conic-gradient(from 0deg, transparent 0deg, rgba(255,255,255,0.4) 10deg, transparent 20deg)',
        }}
        animate={{ rotate: 360 }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'linear',
        }}
      />

      {/* Inner circle cutout */}
      <div
        className="absolute rounded-full bg-zinc-900 overflow-hidden"
        style={{
          top: borderWidth,
          left: borderWidth,
          right: borderWidth,
          bottom: borderWidth,
        }}
      >
        {children}
      </div>
    </div>
  );
}

// =============================================================================
// VERSION 3: Pulsing Ember Glow
// =============================================================================
export function BronzeBorderV3({ children, size = 120, className = '' }: EnhancedBorderProps) {
  const borderWidth = Math.max(5, size * 0.055);

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      {/* Pulsing outer glow */}
      <motion.div
        className="absolute rounded-full"
        style={{
          top: -8,
          left: -8,
          right: -8,
          bottom: -8,
          background: 'radial-gradient(circle, #ff8c0030 0%, #cd7f3220 50%, transparent 70%)',
          filter: 'blur(8px)',
        }}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.6, 1, 0.6],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Main border with ember gradient */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background: `conic-gradient(
            from 0deg,
            #ff6b35 0deg,
            #ff8c42 40deg,
            #ffd699 80deg,
            #cd7f32 120deg,
            #8b4513 160deg,
            #5c3317 200deg,
            #8b4513 240deg,
            #cd7f32 280deg,
            #ffd699 320deg,
            #ff6b35 360deg
          )`,
          boxShadow: '0 0 15px #ff8c4260, 0 0 30px #cd7f3240',
        }}
        animate={{ rotate: 360 }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: 'linear',
        }}
      />

      {/* Hot spot highlight */}
      <motion.div
        className="absolute inset-1 rounded-full pointer-events-none"
        style={{
          background: 'conic-gradient(from 0deg, transparent 0deg, #fff8 5deg, #ff8c4280 15deg, transparent 30deg)',
        }}
        animate={{ rotate: 360 }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'linear',
        }}
      />

      {/* Inner circle cutout */}
      <div
        className="absolute rounded-full bg-zinc-900 overflow-hidden"
        style={{
          top: borderWidth,
          left: borderWidth,
          right: borderWidth,
          bottom: borderWidth,
        }}
      >
        {children}
      </div>
    </div>
  );
}

// =============================================================================
// VERSION 4: Liquid Metal Effect
// =============================================================================
export function BronzeBorderV4({ children, size = 120, className = '' }: EnhancedBorderProps) {
  const borderWidth = Math.max(5, size * 0.055);

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      {/* Soft ambient glow */}
      <div
        className="absolute rounded-full blur-xl opacity-50"
        style={{
          top: -10,
          left: -10,
          right: -10,
          bottom: -10,
          background: 'radial-gradient(circle, #cd7f32 0%, transparent 70%)',
        }}
      />

      {/* Base metallic ring */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: `linear-gradient(135deg, #8b5a2b 0%, #cd7f32 25%, #daa06d 50%, #cd7f32 75%, #8b5a2b 100%)`,
          boxShadow: 'inset 0 2px 4px #ffffff40, inset 0 -2px 4px #00000060',
        }}
      />

      {/* Animated liquid highlight layer 1 */}
      <motion.div
        className="absolute inset-0 rounded-full overflow-hidden"
        style={{ opacity: 0.7 }}
      >
        <motion.div
          className="absolute"
          style={{
            width: '200%',
            height: '200%',
            top: '-50%',
            left: '-50%',
            background: `radial-gradient(ellipse 30% 50% at 30% 30%, #ffd69980 0%, transparent 50%),
                         radial-gradient(ellipse 40% 30% at 70% 60%, #e8a54b60 0%, transparent 50%)`,
          }}
          animate={{
            rotate: 360,
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      </motion.div>

      {/* Animated liquid highlight layer 2 */}
      <motion.div
        className="absolute inset-0 rounded-full overflow-hidden"
        style={{ opacity: 0.5 }}
      >
        <motion.div
          className="absolute"
          style={{
            width: '200%',
            height: '200%',
            top: '-50%',
            left: '-50%',
            background: `radial-gradient(ellipse 25% 40% at 60% 40%, #ffffff50 0%, transparent 40%)`,
          }}
          animate={{
            rotate: -360,
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      </motion.div>

      {/* Inner circle cutout */}
      <div
        className="absolute rounded-full bg-zinc-900 overflow-hidden"
        style={{
          top: borderWidth,
          left: borderWidth,
          right: borderWidth,
          bottom: borderWidth,
          boxShadow: 'inset 0 0 10px #00000080',
        }}
      >
        {children}
      </div>
    </div>
  );
}

// =============================================================================
// VERSION 5: Segmented Bronze Ring
// =============================================================================
export function BronzeBorderV5({ children, size = 120, className = '' }: EnhancedBorderProps) {
  const borderWidth = Math.max(6, size * 0.06);
  const segments = 12;

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      {/* Glow */}
      <motion.div
        className="absolute rounded-full blur-lg"
        style={{
          top: -6,
          left: -6,
          right: -6,
          bottom: -6,
          background: 'radial-gradient(circle, #cd7f3240 0%, transparent 70%)',
        }}
        animate={{
          opacity: [0.4, 0.7, 0.4],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Segmented ring */}
      <svg
        className="absolute inset-0"
        viewBox="0 0 100 100"
        style={{ width: size, height: size }}
      >
        <defs>
          <linearGradient id="bronzeGradientV5" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffd699" />
            <stop offset="25%" stopColor="#e8a54b" />
            <stop offset="50%" stopColor="#cd7f32" />
            <stop offset="75%" stopColor="#8b5a2b" />
            <stop offset="100%" stopColor="#cd7f32" />
          </linearGradient>
          <filter id="glowV5">
            <feGaussianBlur stdDeviation="1" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {[...Array(segments)].map((_, i) => {
          const angle = (i / segments) * 360;
          const gap = 4;
          const segmentAngle = (360 / segments) - gap;

          return (
            <motion.circle
              key={i}
              cx="50"
              cy="50"
              r="46"
              fill="none"
              stroke="url(#bronzeGradientV5)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={`${(segmentAngle / 360) * 289} 289`}
              filter="url(#glowV5)"
              style={{
                transformOrigin: 'center',
                transform: `rotate(${angle}deg)`,
              }}
              animate={{
                opacity: [0.6, 1, 0.6],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.1,
                ease: 'easeInOut',
              }}
            />
          );
        })}
      </svg>

      {/* Slow rotation overlay */}
      <motion.div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          background: 'conic-gradient(from 0deg, transparent 0deg, #ffd69920 30deg, transparent 60deg)',
        }}
        animate={{ rotate: 360 }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: 'linear',
        }}
      />

      {/* Inner circle cutout */}
      <div
        className="absolute rounded-full bg-zinc-900 overflow-hidden"
        style={{
          top: borderWidth,
          left: borderWidth,
          right: borderWidth,
          bottom: borderWidth,
        }}
      >
        {children}
      </div>
    </div>
  );
}

// =============================================================================
// VERSION 6: Orbital Particles
// =============================================================================
export function BronzeBorderV6({ children, size = 120, className = '' }: EnhancedBorderProps) {
  const borderWidth = Math.max(4, size * 0.045);
  const particleCount = 8;

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      {/* Base glow */}
      <div
        className="absolute rounded-full blur-md opacity-60"
        style={{
          top: -4,
          left: -4,
          right: -4,
          bottom: -4,
          background: 'radial-gradient(circle, #cd7f32 0%, transparent 70%)',
        }}
      />

      {/* Solid bronze ring */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: `linear-gradient(145deg, #daa06d 0%, #cd7f32 30%, #8b5a2b 70%, #6b4423 100%)`,
          boxShadow: 'inset 0 2px 4px #ffd69960, inset 0 -2px 4px #00000080, 0 0 10px #cd7f3240',
        }}
      />

      {/* Orbiting particles container */}
      <motion.div
        className="absolute inset-0"
        animate={{ rotate: 360 }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: 'linear',
        }}
      >
        {[...Array(particleCount)].map((_, i) => {
          const angle = (i / particleCount) * 360;
          const radius = size / 2 - 2;
          const x = Math.cos((angle * Math.PI) / 180) * radius + size / 2;
          const y = Math.sin((angle * Math.PI) / 180) * radius + size / 2;

          return (
            <motion.div
              key={i}
              className="absolute rounded-full"
              style={{
                width: 6,
                height: 6,
                left: x - 3,
                top: y - 3,
                background: 'radial-gradient(circle, #ffd699 0%, #cd7f32 100%)',
                boxShadow: '0 0 8px #ffd699, 0 0 12px #cd7f32',
              }}
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.7, 1, 0.7],
              }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                delay: i * 0.15,
                ease: 'easeInOut',
              }}
            />
          );
        })}
      </motion.div>

      {/* Inner circle cutout */}
      <div
        className="absolute rounded-full bg-zinc-900 overflow-hidden"
        style={{
          top: borderWidth,
          left: borderWidth,
          right: borderWidth,
          bottom: borderWidth,
        }}
      >
        {children}
      </div>
    </div>
  );
}

// =============================================================================
// VERSION 7: Molten Bronze (Fire Effect)
// =============================================================================
export function BronzeBorderV7({ children, size = 120, className = '' }: EnhancedBorderProps) {
  const borderWidth = Math.max(5, size * 0.05);

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      {/* Fire glow layers */}
      <motion.div
        className="absolute rounded-full blur-xl"
        style={{
          top: -15,
          left: -15,
          right: -15,
          bottom: -15,
          background: 'radial-gradient(circle, #ff6b3540 0%, #cd7f3230 50%, transparent 70%)',
        }}
        animate={{
          scale: [1, 1.3, 1.1, 1.2, 1],
          opacity: [0.5, 0.8, 0.6, 0.7, 0.5],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Base molten ring */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background: `conic-gradient(
            from 0deg,
            #ff4500 0deg,
            #ff6b35 30deg,
            #ff8c42 60deg,
            #ffa500 90deg,
            #ffd699 120deg,
            #cd7f32 150deg,
            #8b4513 180deg,
            #5c3317 210deg,
            #8b4513 240deg,
            #cd7f32 270deg,
            #ff8c42 300deg,
            #ff6b35 330deg,
            #ff4500 360deg
          )`,
        }}
        animate={{ rotate: 360 }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: 'linear',
        }}
      />

      {/* Flickering heat distortion */}
      <motion.div
        className="absolute inset-0 rounded-full overflow-hidden"
        style={{ opacity: 0.4 }}
      >
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute"
            style={{
              width: 20,
              height: 40,
              left: `${15 + i * 14}%`,
              bottom: 0,
              background: `linear-gradient(to top, #ff8c4280, #ffd69940, transparent)`,
              borderRadius: '50% 50% 0 0',
              filter: 'blur(3px)',
            }}
            animate={{
              scaleY: [1, 1.5, 0.8, 1.3, 1],
              opacity: [0.4, 0.8, 0.5, 0.7, 0.4],
              y: [0, -5, -2, -8, 0],
            }}
            transition={{
              duration: 0.8 + i * 0.1,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        ))}
      </motion.div>

      {/* Inner circle cutout */}
      <div
        className="absolute rounded-full bg-zinc-900 overflow-hidden"
        style={{
          top: borderWidth,
          left: borderWidth,
          right: borderWidth,
          bottom: borderWidth,
          boxShadow: 'inset 0 0 15px #ff450040',
        }}
      >
        {children}
      </div>
    </div>
  );
}

// =============================================================================
// VERSION 8: Luxury Beveled Bronze
// =============================================================================
export function BronzeBorderV8({ children, size = 120, className = '' }: EnhancedBorderProps) {
  const borderWidth = Math.max(8, size * 0.08);

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      {/* Subtle ambient glow */}
      <div
        className="absolute rounded-full blur-lg opacity-40"
        style={{
          top: -8,
          left: -8,
          right: -8,
          bottom: -8,
          background: 'radial-gradient(circle, #cd7f32 0%, transparent 60%)',
        }}
      />

      {/* Outer bevel (dark) */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: `linear-gradient(135deg, #4a3520 0%, #6b4423 50%, #3d2914 100%)`,
        }}
      />

      {/* Main bronze surface */}
      <div
        className="absolute rounded-full"
        style={{
          top: 2,
          left: 2,
          right: 2,
          bottom: 2,
          background: `linear-gradient(135deg, #daa06d 0%, #cd7f32 30%, #b87333 50%, #8b5a2b 70%, #6b4423 100%)`,
          boxShadow: 'inset 2px 2px 4px #ffd69960, inset -2px -2px 4px #3d291480',
        }}
      />

      {/* Inner bevel (light edge) */}
      <div
        className="absolute rounded-full"
        style={{
          top: 4,
          left: 4,
          right: 4,
          bottom: 4,
          background: `linear-gradient(135deg, #e8a54b 0%, #cd7f32 50%, #8b5a2b 100%)`,
        }}
      />

      {/* Rotating shine */}
      <motion.div
        className="absolute rounded-full overflow-hidden pointer-events-none"
        style={{
          top: 4,
          left: 4,
          right: 4,
          bottom: 4,
        }}
      >
        <motion.div
          className="absolute"
          style={{
            width: '100%',
            height: '100%',
            background: 'linear-gradient(90deg, transparent 0%, transparent 40%, rgba(255,255,255,0.3) 50%, transparent 60%, transparent 100%)',
          }}
          animate={{
            x: ['-100%', '200%'],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
            repeatDelay: 2,
          }}
        />
      </motion.div>

      {/* Inner circle cutout */}
      <div
        className="absolute rounded-full bg-zinc-900 overflow-hidden"
        style={{
          top: borderWidth,
          left: borderWidth,
          right: borderWidth,
          bottom: borderWidth,
          boxShadow: 'inset 0 2px 8px #00000060',
        }}
      >
        {children}
      </div>
    </div>
  );
}

// =============================================================================
// SILVER BORDER - Sleek metallic with shimmer effect
// =============================================================================
export function SilverBorder({ children, size = 120, className = '' }: EnhancedBorderProps) {
  const borderWidth = Math.max(4, size * 0.05);

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      {/* Outer glow */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background: 'radial-gradient(circle, #9ca3af40 0%, transparent 70%)',
        }}
        animate={{
          scale: [1, 1.12, 1],
          opacity: [0.4, 0.7, 0.4],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Main spinning gradient - smooth silver metallic */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background: `conic-gradient(
            from 0deg,
            #9ca3af 0deg,
            #d1d5db 30deg,
            #f3f4f6 60deg,
            #e5e7eb 90deg,
            #9ca3af 120deg,
            #6b7280 150deg,
            #4b5563 180deg,
            #6b7280 210deg,
            #9ca3af 240deg,
            #d1d5db 270deg,
            #f3f4f6 300deg,
            #d1d5db 330deg,
            #9ca3af 360deg
          )`,
          boxShadow: '0 0 20px #9ca3af60, inset 0 0 10px #00000030',
        }}
        animate={{ rotate: 360 }}
        transition={{
          duration: 7,
          repeat: Infinity,
          ease: 'linear',
        }}
      />

      {/* Shimmer effect */}
      <motion.div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          background: `linear-gradient(135deg, transparent 40%, #ffffff60 50%, transparent 60%)`,
        }}
        animate={{ rotate: [0, 360] }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: 'linear',
        }}
      />

      {/* Inner circle cutout */}
      <div
        className="absolute rounded-full bg-zinc-900 overflow-hidden"
        style={{
          top: borderWidth,
          left: borderWidth,
          right: borderWidth,
          bottom: borderWidth,
        }}
      >
        {children}
      </div>
    </div>
  );
}

// =============================================================================
// GOLD BORDER - Luxurious with sparkles
// =============================================================================
export function GoldBorder({ children, size = 120, className = '' }: EnhancedBorderProps) {
  const borderWidth = Math.max(4, size * 0.05);

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      {/* Outer glow - warm gold */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background: 'radial-gradient(circle, #fbbf2450 0%, transparent 70%)',
        }}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.5, 0.9, 0.5],
        }}
        transition={{
          duration: 2.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Main spinning gradient - rich gold */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background: `conic-gradient(
            from 0deg,
            #fbbf24 0deg,
            #fcd34d 25deg,
            #fef3c7 50deg,
            #fde68a 75deg,
            #fbbf24 100deg,
            #f59e0b 130deg,
            #d97706 160deg,
            #b45309 180deg,
            #d97706 200deg,
            #f59e0b 230deg,
            #fbbf24 260deg,
            #fcd34d 290deg,
            #fef3c7 320deg,
            #fbbf24 360deg
          )`,
          boxShadow: '0 0 25px #fbbf2470, inset 0 0 10px #00000030',
        }}
        animate={{ rotate: 360 }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: 'linear',
        }}
      />

      {/* Sparkle particles */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(8)].map((_, i) => {
          const angle = (i / 8) * 360;
          const radius = size * 0.42;
          const x = Math.cos((angle * Math.PI) / 180) * radius + size / 2;
          const y = Math.sin((angle * Math.PI) / 180) * radius + size / 2;

          return (
            <motion.div
              key={i}
              className="absolute w-1.5 h-1.5 rounded-full"
              style={{
                left: x - 3,
                top: y - 3,
                background: '#fef3c7',
                boxShadow: '0 0 6px #fef3c7, 0 0 10px #fbbf24',
              }}
              animate={{
                scale: [0, 1.5, 0],
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: 1.8,
                repeat: Infinity,
                delay: i * 0.22,
                ease: 'easeInOut',
              }}
            />
          );
        })}
      </div>

      {/* Inner circle cutout */}
      <div
        className="absolute rounded-full bg-zinc-900 overflow-hidden"
        style={{
          top: borderWidth,
          left: borderWidth,
          right: borderWidth,
          bottom: borderWidth,
        }}
      >
        {children}
      </div>
    </div>
  );
}

// =============================================================================
// DIAMOND BORDER - Brilliant with prismatic sparkles
// =============================================================================
export function DiamondBorder({ children, size = 120, className = '' }: EnhancedBorderProps) {
  const borderWidth = Math.max(4, size * 0.05);

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      {/* Multi-color outer glow */}
      <motion.div
        className="absolute rounded-full blur-lg"
        style={{
          top: -8,
          left: -8,
          right: -8,
          bottom: -8,
          background: 'radial-gradient(circle, #67e8f950 0%, #22d3ee30 50%, transparent 70%)',
        }}
        animate={{
          scale: [1, 1.25, 1],
          opacity: [0.5, 0.9, 0.5],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Main spinning gradient - diamond ice blue */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background: `conic-gradient(
            from 0deg,
            #67e8f9 0deg,
            #a5f3fc 20deg,
            #ecfeff 40deg,
            #cffafe 60deg,
            #22d3ee 80deg,
            #06b6d4 100deg,
            #0891b2 120deg,
            #0e7490 140deg,
            #155e75 160deg,
            #0e7490 180deg,
            #0891b2 200deg,
            #06b6d4 220deg,
            #22d3ee 240deg,
            #67e8f9 260deg,
            #a5f3fc 280deg,
            #ecfeff 300deg,
            #a5f3fc 330deg,
            #67e8f9 360deg
          )`,
          boxShadow: '0 0 30px #22d3ee60, inset 0 0 10px #00000020',
        }}
        animate={{ rotate: 360 }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: 'linear',
        }}
      />

      {/* Prismatic sparkles */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(10)].map((_, i) => {
          const angle = (i / 10) * 360;
          const radius = size * 0.42;
          const x = Math.cos((angle * Math.PI) / 180) * radius + size / 2;
          const y = Math.sin((angle * Math.PI) / 180) * radius + size / 2;
          const colors = ['#67e8f9', '#a5f3fc', '#ecfeff', '#22d3ee', '#06b6d4'];

          return (
            <motion.div
              key={i}
              className="absolute w-2 h-2"
              style={{
                left: x - 4,
                top: y - 4,
                background: colors[i % colors.length],
                boxShadow: `0 0 8px ${colors[i % colors.length]}, 0 0 14px #22d3ee`,
                clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
              }}
              animate={{
                scale: [0, 1.2, 0],
                opacity: [0, 1, 0],
                rotate: [0, 180],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.15,
                ease: 'easeInOut',
              }}
            />
          );
        })}
      </div>

      {/* Inner circle cutout */}
      <div
        className="absolute rounded-full bg-zinc-900 overflow-hidden"
        style={{
          top: borderWidth,
          left: borderWidth,
          right: borderWidth,
          bottom: borderWidth,
        }}
      >
        {children}
      </div>
    </div>
  );
}

// =============================================================================
// ELITE BORDER V1 - Molten Ring (Glowing ring with radiating sparks)
// =============================================================================
export function EliteInferno({ children, size = 120, className = '' }: EnhancedBorderProps) {
  const borderWidth = Math.max(5, size * 0.055);
  const id = useMemo(() => `elite-inferno-${Math.random().toString(36).substr(2, 9)}`, []);

  // Generate consistent spark data
  const sparks = useMemo(() => {
    return [...Array(24)].map((_, i) => ({
      angle: (i / 24) * 360 + (i * 7) % 15, // Slightly randomized distribution
      length: 8 + (i % 5) * 4, // Varying lengths
      delay: (i * 0.12) % 2,
      duration: 1.5 + (i % 3) * 0.4,
      offset: (i % 3) * 2, // Slight radial offset variation
    }));
  }, []);

  // Generate ember particles
  const embers = useMemo(() => {
    return [...Array(16)].map((_, i) => ({
      angle: (i / 16) * 360,
      distance: 0.55 + (i % 4) * 0.08,
      size: 2 + (i % 3),
      delay: i * 0.2,
      duration: 2 + (i % 4) * 0.5,
    }));
  }, []);

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <style>{`
        @keyframes ${id}-spark-shoot {
          0% {
            transform: scaleX(0.3) translateX(0);
            opacity: 0;
          }
          15% {
            opacity: 1;
          }
          100% {
            transform: scaleX(1) translateX(var(--spark-dist));
            opacity: 0;
          }
        }
        @keyframes ${id}-ember-drift {
          0% {
            transform: translate(0, 0) scale(1);
            opacity: 0;
          }
          20% {
            opacity: 1;
          }
          100% {
            transform: translate(var(--drift-x), var(--drift-y)) scale(0.3);
            opacity: 0;
          }
        }
        @keyframes ${id}-ring-glow {
          0%, 100% {
            filter: drop-shadow(0 0 ${size * 0.08}px #ff8c00) drop-shadow(0 0 ${size * 0.15}px #ff6600);
          }
          50% {
            filter: drop-shadow(0 0 ${size * 0.12}px #ffaa00) drop-shadow(0 0 ${size * 0.2}px #ff7700);
          }
        }
        @keyframes ${id}-inner-pulse {
          0%, 100% { opacity: 0.8; }
          50% { opacity: 1; }
        }
      `}</style>

      {/* Outer warm glow - fades into page */}
      <div
        className="absolute rounded-full"
        style={{
          top: -size * 0.4,
          left: -size * 0.4,
          right: -size * 0.4,
          bottom: -size * 0.4,
          background: `radial-gradient(circle,
            rgba(255, 140, 0, 0.25) 0%,
            rgba(255, 100, 0, 0.15) 30%,
            rgba(255, 80, 0, 0.08) 50%,
            transparent 70%
          )`,
          pointerEvents: 'none',
        }}
      />

      {/* SVG for ring and sparks */}
      <svg
        className="absolute overflow-visible"
        style={{
          top: -size * 0.35,
          left: -size * 0.35,
          width: size * 1.7,
          height: size * 1.7,
          pointerEvents: 'none',
        }}
        viewBox="0 0 170 170"
      >
        <defs>
          {/* Ring gradient - bright yellow center to orange edges */}
          <linearGradient id={`${id}-ring-grad`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffdd00" />
            <stop offset="30%" stopColor="#ffbb00" />
            <stop offset="60%" stopColor="#ff9900" />
            <stop offset="100%" stopColor="#ff6600" />
          </linearGradient>

          {/* Spark gradient */}
          <linearGradient id={`${id}-spark-grad`} x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="#ffee88" stopOpacity="1" />
            <stop offset="40%" stopColor="#ffcc44" stopOpacity="0.9" />
            <stop offset="70%" stopColor="#ff9922" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#ff6600" stopOpacity="0" />
          </linearGradient>

          {/* Glow filter */}
          <filter id={`${id}-glow`} x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Strong glow for ring */}
          <filter id={`${id}-ring-glow`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Outer glow ring */}
        <circle
          cx="85"
          cy="85"
          r="50"
          fill="none"
          stroke="#ff880044"
          strokeWidth="12"
          filter={`url(#${id}-ring-glow)`}
        />

        {/* Main glowing ring */}
        <circle
          cx="85"
          cy="85"
          r="50"
          fill="none"
          stroke={`url(#${id}-ring-grad)`}
          strokeWidth="4"
          filter={`url(#${id}-glow)`}
          style={{
            animation: `${id}-ring-glow 2s ease-in-out infinite`,
          }}
        />

        {/* Inner bright line */}
        <circle
          cx="85"
          cy="85"
          r="50"
          fill="none"
          stroke="#ffee99"
          strokeWidth="1.5"
          style={{
            animation: `${id}-inner-pulse 1.5s ease-in-out infinite`,
          }}
        />

        {/* Radiating sparks */}
        {sparks.map((spark, i) => {
          const rad = (spark.angle * Math.PI) / 180;
          const startX = 85 + Math.cos(rad) * (50 + spark.offset);
          const startY = 85 + Math.sin(rad) * (50 + spark.offset);

          return (
            <line
              key={i}
              x1={startX}
              y1={startY}
              x2={startX + Math.cos(rad) * spark.length}
              y2={startY + Math.sin(rad) * spark.length}
              stroke={`url(#${id}-spark-grad)`}
              strokeWidth="2"
              strokeLinecap="round"
              filter={`url(#${id}-glow)`}
              style={{
                '--spark-dist': `${spark.length * 0.5}px`,
                transformOrigin: `${startX}px ${startY}px`,
                animation: `${id}-spark-shoot ${spark.duration}s ease-out infinite`,
                animationDelay: `${spark.delay}s`,
              } as React.CSSProperties}
            />
          );
        })}
      </svg>

      {/* Floating ember particles */}
      <div className="absolute inset-0 overflow-visible pointer-events-none">
        {embers.map((ember, i) => {
          const rad = (ember.angle * Math.PI) / 180;
          const x = Math.cos(rad) * (size * ember.distance);
          const y = Math.sin(rad) * (size * ember.distance);
          const driftX = (Math.cos(rad) * size * 0.3) + (Math.random() - 0.5) * size * 0.2;
          const driftY = (Math.sin(rad) * size * 0.3) - Math.random() * size * 0.2;

          return (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                left: '50%',
                top: '50%',
                marginLeft: x - ember.size / 2,
                marginTop: y - ember.size / 2,
                width: ember.size,
                height: ember.size,
                background: `radial-gradient(circle, #ffdd66 0%, #ffaa33 50%, #ff6600 100%)`,
                boxShadow: `0 0 ${ember.size * 2}px #ff8800, 0 0 ${ember.size * 4}px #ff6600`,
                '--drift-x': `${driftX}px`,
                '--drift-y': `${driftY}px`,
                animation: `${id}-ember-drift ${ember.duration}s ease-out infinite`,
                animationDelay: `${ember.delay}s`,
              } as React.CSSProperties}
            />
          );
        })}
      </div>

      {/* Core dark ring background */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: `radial-gradient(circle, #1a1210 0%, #0d0a08 100%)`,
          boxShadow: `inset 0 0 ${size * 0.15}px rgba(255, 136, 0, 0.2)`,
        }}
      />

      {/* Inner circle cutout */}
      <div
        className="absolute rounded-full bg-zinc-900 overflow-hidden"
        style={{
          top: borderWidth,
          left: borderWidth,
          right: borderWidth,
          bottom: borderWidth,
          boxShadow: `inset 0 0 ${size * 0.06}px rgba(0, 0, 0, 0.8)`,
        }}
      >
        {children}
      </div>
    </div>
  );
}

// =============================================================================
// SILVER TIER UNLOCKABLE - Solar Flare (150 points)
// Intense glow + curved spark streaks - purchasable at Silver tier
// =============================================================================
export function SilverSolarFlare({ children, size = 120, className = '' }: EnhancedBorderProps) {
  const borderWidth = Math.max(5, size * 0.055);
  const id = useMemo(() => `elite-solar-${Math.random().toString(36).substr(2, 9)}`, []);

  // Generate curved spark streaks
  const streaks = useMemo(() => {
    return [...Array(20)].map((_, i) => ({
      angle: (i / 20) * 360 + (i * 11) % 18,
      length: 12 + (i % 4) * 6,
      curve: (i % 2 === 0 ? 1 : -1) * (3 + (i % 3) * 2),
      delay: (i * 0.15) % 2.5,
      duration: 1.2 + (i % 4) * 0.3,
    }));
  }, []);

  // Generate small dot embers
  const dots = useMemo(() => {
    return [...Array(30)].map((_, i) => ({
      angle: (i / 30) * 360 + (i * 13) % 12,
      distance: 0.48 + (i % 5) * 0.06,
      size: 1.5 + (i % 3),
      delay: i * 0.1,
      duration: 1.5 + (i % 3) * 0.4,
    }));
  }, []);

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <style>{`
        @keyframes ${id}-streak-fly {
          0% {
            stroke-dashoffset: 30;
            opacity: 0;
          }
          20% {
            opacity: 1;
          }
          100% {
            stroke-dashoffset: -30;
            opacity: 0;
          }
        }
        @keyframes ${id}-dot-scatter {
          0% {
            transform: translate(0, 0) scale(1);
            opacity: 0;
          }
          15% {
            opacity: 1;
          }
          100% {
            transform: translate(var(--scatter-x), var(--scatter-y)) scale(0);
            opacity: 0;
          }
        }
        @keyframes ${id}-ring-blaze {
          0%, 100% {
            filter: drop-shadow(0 0 ${size * 0.1}px #ff9900) drop-shadow(0 0 ${size * 0.18}px #ff6600);
            stroke-width: 5;
          }
          50% {
            filter: drop-shadow(0 0 ${size * 0.15}px #ffbb00) drop-shadow(0 0 ${size * 0.25}px #ff8800);
            stroke-width: 6;
          }
        }
      `}</style>

      {/* Intense outer glow */}
      <div
        className="absolute rounded-full"
        style={{
          top: -size * 0.5,
          left: -size * 0.5,
          right: -size * 0.5,
          bottom: -size * 0.5,
          background: `radial-gradient(circle,
            rgba(255, 150, 0, 0.3) 0%,
            rgba(255, 120, 0, 0.18) 25%,
            rgba(255, 90, 0, 0.08) 45%,
            transparent 65%
          )`,
          pointerEvents: 'none',
        }}
      />

      {/* SVG Ring + Curved Streaks */}
      <svg
        className="absolute overflow-visible"
        style={{
          top: -size * 0.4,
          left: -size * 0.4,
          width: size * 1.8,
          height: size * 1.8,
          pointerEvents: 'none',
        }}
        viewBox="0 0 180 180"
      >
        <defs>
          <linearGradient id={`${id}-ring-grad`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffee44" />
            <stop offset="25%" stopColor="#ffcc00" />
            <stop offset="50%" stopColor="#ffaa00" />
            <stop offset="75%" stopColor="#ff8800" />
            <stop offset="100%" stopColor="#ff6600" />
          </linearGradient>

          <linearGradient id={`${id}-streak-grad`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ffee88" stopOpacity="1" />
            <stop offset="50%" stopColor="#ffbb44" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#ff7700" stopOpacity="0" />
          </linearGradient>

          <filter id={`${id}-glow`} x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Soft glow ring */}
        <circle cx="90" cy="90" r="52" fill="none" stroke="#ff990055" strokeWidth="16" filter={`url(#${id}-glow)`} />

        {/* Main blazing ring */}
        <circle
          cx="90"
          cy="90"
          r="52"
          fill="none"
          stroke={`url(#${id}-ring-grad)`}
          strokeWidth="5"
          filter={`url(#${id}-glow)`}
          style={{ animation: `${id}-ring-blaze 2s ease-in-out infinite` }}
        />

        {/* Hot white core line */}
        <circle cx="90" cy="90" r="52" fill="none" stroke="#ffffcc" strokeWidth="1.5" opacity="0.9" />

        {/* Curved spark streaks */}
        {streaks.map((streak, i) => {
          const rad = (streak.angle * Math.PI) / 180;
          const startX = 90 + Math.cos(rad) * 54;
          const startY = 90 + Math.sin(rad) * 54;
          const endX = startX + Math.cos(rad) * streak.length;
          const endY = startY + Math.sin(rad) * streak.length;
          const ctrlX = (startX + endX) / 2 + Math.cos(rad + Math.PI / 2) * streak.curve;
          const ctrlY = (startY + endY) / 2 + Math.sin(rad + Math.PI / 2) * streak.curve;

          return (
            <path
              key={i}
              d={`M ${startX} ${startY} Q ${ctrlX} ${ctrlY} ${endX} ${endY}`}
              fill="none"
              stroke={`url(#${id}-streak-grad)`}
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray="15 30"
              filter={`url(#${id}-glow)`}
              style={{
                animation: `${id}-streak-fly ${streak.duration}s ease-out infinite`,
                animationDelay: `${streak.delay}s`,
              }}
            />
          );
        })}
      </svg>

      {/* Scattered dot embers */}
      <div className="absolute inset-0 overflow-visible pointer-events-none">
        {dots.map((dot, i) => {
          const rad = (dot.angle * Math.PI) / 180;
          const x = Math.cos(rad) * (size * dot.distance);
          const y = Math.sin(rad) * (size * dot.distance);
          const scatterX = Math.cos(rad) * size * 0.35;
          const scatterY = Math.sin(rad) * size * 0.35;

          return (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                left: '50%',
                top: '50%',
                marginLeft: x - dot.size / 2,
                marginTop: y - dot.size / 2,
                width: dot.size,
                height: dot.size,
                background: `radial-gradient(circle, #ffee77 0%, #ffaa33 60%, transparent 100%)`,
                boxShadow: `0 0 ${dot.size * 2}px #ffaa00`,
                '--scatter-x': `${scatterX}px`,
                '--scatter-y': `${scatterY}px`,
                animation: `${id}-dot-scatter ${dot.duration}s ease-out infinite`,
                animationDelay: `${dot.delay}s`,
              } as React.CSSProperties}
            />
          );
        })}
      </div>

      {/* Core dark background */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: `radial-gradient(circle, #181008 0%, #0c0604 100%)`,
          boxShadow: `inset 0 0 ${size * 0.12}px rgba(255, 140, 0, 0.15)`,
        }}
      />

      {/* Inner circle cutout */}
      <div
        className="absolute rounded-full bg-zinc-900 overflow-hidden"
        style={{
          top: borderWidth,
          left: borderWidth,
          right: borderWidth,
          bottom: borderWidth,
        }}
      >
        {children}
      </div>
    </div>
  );
}

// =============================================================================
// ELITE BORDER V3 - Forge Ring (Welding sparks flying in all directions)
// =============================================================================
export function EliteSpectral({ children, size = 120, className = '' }: EnhancedBorderProps) {
  const borderWidth = Math.max(5, size * 0.055);
  const id = useMemo(() => `elite-forge-${Math.random().toString(36).substr(2, 9)}`, []);

  // Generate many spark lines in all directions
  const sparkLines = useMemo(() => {
    return [...Array(32)].map((_, i) => ({
      angle: (i / 32) * 360 + (i * 5) % 11,
      length: 6 + (i % 6) * 5,
      thickness: 1 + (i % 3) * 0.5,
      delay: (i * 0.08) % 2,
      duration: 0.8 + (i % 5) * 0.25,
    }));
  }, []);

  // Generate tiny ember dots
  const emberDots = useMemo(() => {
    return [...Array(40)].map((_, i) => ({
      angle: (i / 40) * 360,
      radius: 0.5 + (i % 6) * 0.08,
      size: 1 + (i % 4),
      delay: i * 0.08,
      duration: 1 + (i % 4) * 0.3,
    }));
  }, []);

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <style>{`
        @keyframes ${id}-spark-burst {
          0% {
            transform: scaleX(0) translateX(0);
            opacity: 0;
          }
          10% {
            opacity: 1;
            transform: scaleX(0.5) translateX(0);
          }
          100% {
            transform: scaleX(1) translateX(var(--fly-dist));
            opacity: 0;
          }
        }
        @keyframes ${id}-ember-scatter {
          0% {
            transform: translate(0, 0);
            opacity: 0;
          }
          10% { opacity: 1; }
          100% {
            transform: translate(var(--ex), var(--ey));
            opacity: 0;
          }
        }
        @keyframes ${id}-ring-forge {
          0%, 100% {
            filter: drop-shadow(0 0 ${size * 0.06}px #ffaa00) drop-shadow(0 0 ${size * 0.12}px #ff7700);
          }
          33% {
            filter: drop-shadow(0 0 ${size * 0.1}px #ffcc00) drop-shadow(0 0 ${size * 0.18}px #ff9900);
          }
          66% {
            filter: drop-shadow(0 0 ${size * 0.08}px #ffbb00) drop-shadow(0 0 ${size * 0.14}px #ff8800);
          }
        }
      `}</style>

      {/* Forge glow - warm ambient */}
      <div
        className="absolute rounded-full"
        style={{
          top: -size * 0.45,
          left: -size * 0.45,
          right: -size * 0.45,
          bottom: -size * 0.45,
          background: `radial-gradient(circle,
            rgba(255, 160, 50, 0.28) 0%,
            rgba(255, 120, 20, 0.15) 30%,
            rgba(255, 90, 10, 0.06) 50%,
            transparent 70%
          )`,
          pointerEvents: 'none',
        }}
      />

      {/* SVG Ring + Spark bursts */}
      <svg
        className="absolute overflow-visible"
        style={{
          top: -size * 0.45,
          left: -size * 0.45,
          width: size * 1.9,
          height: size * 1.9,
          pointerEvents: 'none',
        }}
        viewBox="0 0 190 190"
      >
        <defs>
          <linearGradient id={`${id}-ring`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffdd33" />
            <stop offset="40%" stopColor="#ffbb00" />
            <stop offset="70%" stopColor="#ff9500" />
            <stop offset="100%" stopColor="#ff7000" />
          </linearGradient>

          <linearGradient id={`${id}-spark`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ffffaa" stopOpacity="1" />
            <stop offset="30%" stopColor="#ffdd66" stopOpacity="0.9" />
            <stop offset="60%" stopColor="#ffaa33" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#ff6600" stopOpacity="0" />
          </linearGradient>

          <filter id={`${id}-hot-glow`} x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Outer glow */}
        <circle cx="95" cy="95" r="54" fill="none" stroke="#ff880055" strokeWidth="14" filter={`url(#${id}-hot-glow)`} />

        {/* Main glowing ring */}
        <circle
          cx="95"
          cy="95"
          r="54"
          fill="none"
          stroke={`url(#${id}-ring)`}
          strokeWidth="4.5"
          filter={`url(#${id}-hot-glow)`}
          style={{ animation: `${id}-ring-forge 1.5s ease-in-out infinite` }}
        />

        {/* White-hot core */}
        <circle cx="95" cy="95" r="54" fill="none" stroke="#ffffdd" strokeWidth="1.5" opacity="0.95" />

        {/* Spark burst lines */}
        {sparkLines.map((spark, i) => {
          const rad = (spark.angle * Math.PI) / 180;
          const startX = 95 + Math.cos(rad) * 56;
          const startY = 95 + Math.sin(rad) * 56;
          const endX = startX + Math.cos(rad) * spark.length;
          const endY = startY + Math.sin(rad) * spark.length;

          return (
            <line
              key={i}
              x1={startX}
              y1={startY}
              x2={endX}
              y2={endY}
              stroke={`url(#${id}-spark)`}
              strokeWidth={spark.thickness}
              strokeLinecap="round"
              filter={`url(#${id}-hot-glow)`}
              style={{
                '--fly-dist': `${spark.length * 0.6}px`,
                transformOrigin: `${startX}px ${startY}px`,
                animation: `${id}-spark-burst ${spark.duration}s ease-out infinite`,
                animationDelay: `${spark.delay}s`,
              } as React.CSSProperties}
            />
          );
        })}
      </svg>

      {/* Scattered ember dots */}
      <div className="absolute inset-0 overflow-visible pointer-events-none">
        {emberDots.map((ember, i) => {
          const rad = (ember.angle * Math.PI) / 180;
          const x = Math.cos(rad) * (size * ember.radius);
          const y = Math.sin(rad) * (size * ember.radius);
          const ex = Math.cos(rad) * size * 0.4 + (Math.random() - 0.5) * size * 0.2;
          const ey = Math.sin(rad) * size * 0.4 + (Math.random() - 0.5) * size * 0.2;

          return (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                left: '50%',
                top: '50%',
                marginLeft: x - ember.size / 2,
                marginTop: y - ember.size / 2,
                width: ember.size,
                height: ember.size,
                background: `radial-gradient(circle, #ffff99 0%, #ffcc44 50%, #ff8800 100%)`,
                boxShadow: `0 0 ${ember.size * 3}px #ffaa00, 0 0 ${ember.size}px #ffff88`,
                '--ex': `${ex}px`,
                '--ey': `${ey}px`,
                animation: `${id}-ember-scatter ${ember.duration}s ease-out infinite`,
                animationDelay: `${ember.delay}s`,
              } as React.CSSProperties}
            />
          );
        })}
      </div>

      {/* Core background */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: `radial-gradient(circle, #1a1008 0%, #0a0604 100%)`,
          boxShadow: `inset 0 0 ${size * 0.1}px rgba(255, 150, 50, 0.15)`,
        }}
      />

      {/* Inner circle cutout */}
      <div
        className="absolute rounded-full bg-zinc-900 overflow-hidden"
        style={{
          top: borderWidth,
          left: borderWidth,
          right: borderWidth,
          bottom: borderWidth,
        }}
      >
        {children}
      </div>
    </div>
  );
}

// =============================================================================
// ELITE BORDER - Crimson Smoke (Red ethereal smoke ring)
// Wispy smoke tendrils flowing organically around a glowing crimson ring
// =============================================================================
export function EliteCrimsonSmoke({ children, size = 120, className = '' }: EnhancedBorderProps) {
  const borderWidth = Math.max(5, size * 0.055);
  const id = useMemo(() => `elite-smoke-${Math.random().toString(36).substr(2, 9)}`, []);

  // Generate organic smoke wisps using bezier curves
  const smokeWisps = useMemo(() => {
    return [...Array(12)].map((_, i) => {
      const baseAngle = (i / 12) * 360;
      const variation = (i * 17) % 30 - 15; // -15 to +15 variation
      return {
        angle: baseAngle + variation,
        length: 15 + (i % 4) * 8,
        curve1: (i % 2 === 0 ? 1 : -1) * (8 + (i % 3) * 4),
        curve2: (i % 2 === 0 ? -1 : 1) * (5 + (i % 4) * 3),
        delay: (i * 0.4) % 5,
        duration: 8 + (i % 3) * 2,
        opacity: 0.4 + (i % 4) * 0.15,
        width: 3 + (i % 3) * 2,
      };
    });
  }, []);

  // Generate flowing particles
  const particles = useMemo(() => {
    return [...Array(20)].map((_, i) => ({
      angle: (i / 20) * 360,
      distance: 0.45 + (i % 5) * 0.08,
      size: 2 + (i % 3),
      delay: i * 0.25,
      duration: 6 + (i % 4) * 2,
      driftAngle: (i * 23) % 60 - 30, // Drift direction variance
    }));
  }, []);

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <style>{`
        @keyframes ${id}-smoke-flow {
          0% {
            stroke-dashoffset: 60;
            opacity: 0;
          }
          10% {
            opacity: var(--wisp-opacity);
          }
          90% {
            opacity: var(--wisp-opacity);
          }
          100% {
            stroke-dashoffset: -60;
            opacity: 0;
          }
        }
        @keyframes ${id}-particle-drift {
          0% {
            transform: translate(0, 0) scale(1);
            opacity: 0;
          }
          15% {
            opacity: 0.8;
          }
          85% {
            opacity: 0.6;
          }
          100% {
            transform: translate(var(--drift-x), var(--drift-y)) scale(0.2);
            opacity: 0;
          }
        }
        @keyframes ${id}-ring-pulse {
          0%, 100% {
            filter: drop-shadow(0 0 ${size * 0.08}px #cc0000) drop-shadow(0 0 ${size * 0.15}px #990000);
            opacity: 0.9;
          }
          50% {
            filter: drop-shadow(0 0 ${size * 0.12}px #ff1a1a) drop-shadow(0 0 ${size * 0.2}px #cc0000);
            opacity: 1;
          }
        }
        @keyframes ${id}-outer-glow {
          0%, 100% {
            transform: scale(1);
            opacity: 0.5;
          }
          50% {
            transform: scale(1.05);
            opacity: 0.7;
          }
        }
        @keyframes ${id}-smoke-rotate {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

      {/* Deep outer glow - fades into darkness */}
      <div
        className="absolute rounded-full"
        style={{
          top: -size * 0.5,
          left: -size * 0.5,
          right: -size * 0.5,
          bottom: -size * 0.5,
          background: `radial-gradient(circle,
            rgba(204, 0, 0, 0.25) 0%,
            rgba(153, 0, 0, 0.15) 25%,
            rgba(102, 0, 0, 0.08) 45%,
            transparent 65%
          )`,
          animation: `${id}-outer-glow 4s ease-in-out infinite`,
          pointerEvents: 'none',
        }}
      />

      {/* SVG for ring and smoke wisps */}
      <svg
        className="absolute overflow-visible"
        style={{
          top: -size * 0.45,
          left: -size * 0.45,
          width: size * 1.9,
          height: size * 1.9,
          pointerEvents: 'none',
        }}
        viewBox="0 0 190 190"
      >
        <defs>
          {/* Ring gradient - deep crimson */}
          <linearGradient id={`${id}-ring-grad`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ff3333" />
            <stop offset="30%" stopColor="#cc0000" />
            <stop offset="60%" stopColor="#990000" />
            <stop offset="100%" stopColor="#660000" />
          </linearGradient>

          {/* Smoke wisp gradient */}
          <linearGradient id={`${id}-smoke-grad`} x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="#ff4444" stopOpacity="0.8" />
            <stop offset="30%" stopColor="#cc0000" stopOpacity="0.5" />
            <stop offset="60%" stopColor="#990000" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#660000" stopOpacity="0" />
          </linearGradient>

          {/* Heavy blur for smoke effect */}
          <filter id={`${id}-smoke-blur`} x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Glow filter for ring */}
          <filter id={`${id}-ring-glow`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Soft outer glow ring */}
        <circle
          cx="95"
          cy="95"
          r="52"
          fill="none"
          stroke="#99000044"
          strokeWidth="20"
          filter={`url(#${id}-smoke-blur)`}
        />

        {/* Main glowing crimson ring */}
        <circle
          cx="95"
          cy="95"
          r="52"
          fill="none"
          stroke={`url(#${id}-ring-grad)`}
          strokeWidth="4"
          filter={`url(#${id}-ring-glow)`}
          style={{
            animation: `${id}-ring-pulse 3s ease-in-out infinite`,
          }}
        />

        {/* Inner bright core line */}
        <circle
          cx="95"
          cy="95"
          r="52"
          fill="none"
          stroke="#ff6666"
          strokeWidth="1.5"
          opacity="0.7"
        />

        {/* Smoke wisps - organic bezier curves */}
        <g style={{ animation: `${id}-smoke-rotate 30s linear infinite` }}>
          {smokeWisps.map((wisp, i) => {
            const rad = (wisp.angle * Math.PI) / 180;
            const startX = 95 + Math.cos(rad) * 54;
            const startY = 95 + Math.sin(rad) * 54;

            // Calculate bezier control points for organic S-curve
            const midRad = rad + (wisp.curve1 * Math.PI) / 180;
            const endRad = rad + (wisp.curve2 * Math.PI) / 180;

            const ctrl1X = startX + Math.cos(midRad) * (wisp.length * 0.4);
            const ctrl1Y = startY + Math.sin(midRad) * (wisp.length * 0.4);
            const ctrl2X = startX + Math.cos(endRad) * (wisp.length * 0.7);
            const ctrl2Y = startY + Math.sin(endRad) * (wisp.length * 0.7);
            const endX = startX + Math.cos(rad) * wisp.length;
            const endY = startY + Math.sin(rad) * wisp.length;

            return (
              <path
                key={i}
                d={`M ${startX} ${startY} C ${ctrl1X} ${ctrl1Y}, ${ctrl2X} ${ctrl2Y}, ${endX} ${endY}`}
                fill="none"
                stroke={`url(#${id}-smoke-grad)`}
                strokeWidth={wisp.width}
                strokeLinecap="round"
                strokeDasharray="30 60"
                filter={`url(#${id}-smoke-blur)`}
                style={{
                  '--wisp-opacity': wisp.opacity,
                  animation: `${id}-smoke-flow ${wisp.duration}s ease-in-out infinite`,
                  animationDelay: `${wisp.delay}s`,
                  mixBlendMode: 'screen',
                } as React.CSSProperties}
              />
            );
          })}
        </g>

        {/* Secondary smoke layer - counter-rotate for depth */}
        <g style={{ animation: `${id}-smoke-rotate 25s linear infinite reverse` }}>
          {smokeWisps.slice(0, 6).map((wisp, i) => {
            const rad = ((wisp.angle + 30) * Math.PI) / 180;
            const startX = 95 + Math.cos(rad) * 50;
            const startY = 95 + Math.sin(rad) * 50;

            const ctrl1X = startX + Math.cos(rad - 0.3) * (wisp.length * 0.5);
            const ctrl1Y = startY + Math.sin(rad - 0.3) * (wisp.length * 0.5);
            const endX = startX + Math.cos(rad + 0.2) * (wisp.length * 1.2);
            const endY = startY + Math.sin(rad + 0.2) * (wisp.length * 1.2);

            return (
              <path
                key={`inner-${i}`}
                d={`M ${startX} ${startY} Q ${ctrl1X} ${ctrl1Y}, ${endX} ${endY}`}
                fill="none"
                stroke="#cc000040"
                strokeWidth={wisp.width + 2}
                strokeLinecap="round"
                strokeDasharray="20 40"
                filter={`url(#${id}-smoke-blur)`}
                style={{
                  animation: `${id}-smoke-flow ${wisp.duration + 2}s ease-in-out infinite`,
                  animationDelay: `${wisp.delay + 1}s`,
                  mixBlendMode: 'screen',
                }}
              />
            );
          })}
        </g>
      </svg>

      {/* Floating ember particles */}
      <div className="absolute inset-0 overflow-visible pointer-events-none">
        {particles.map((particle, i) => {
          const rad = (particle.angle * Math.PI) / 180;
          const x = Math.cos(rad) * (size * particle.distance);
          const y = Math.sin(rad) * (size * particle.distance);
          const driftRad = ((particle.angle + particle.driftAngle) * Math.PI) / 180;
          const driftX = Math.cos(driftRad) * size * 0.25;
          const driftY = Math.sin(driftRad) * size * 0.25;

          return (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                left: '50%',
                top: '50%',
                marginLeft: x - particle.size / 2,
                marginTop: y - particle.size / 2,
                width: particle.size,
                height: particle.size,
                background: `radial-gradient(circle, #ff4444 0%, #cc0000 50%, #660000 100%)`,
                boxShadow: `0 0 ${particle.size * 3}px #cc0000, 0 0 ${particle.size * 6}px #99000080`,
                '--drift-x': `${driftX}px`,
                '--drift-y': `${driftY}px`,
                animation: `${id}-particle-drift ${particle.duration}s ease-in-out infinite`,
                animationDelay: `${particle.delay}s`,
              } as React.CSSProperties}
            />
          );
        })}
      </div>

      {/* Core dark background with inner glow */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: `radial-gradient(circle, #1a0808 0%, #0d0404 100%)`,
          boxShadow: `inset 0 0 ${size * 0.15}px rgba(153, 0, 0, 0.3)`,
        }}
      />

      {/* Inner circle cutout */}
      <div
        className="absolute rounded-full bg-zinc-900 overflow-hidden"
        style={{
          top: borderWidth,
          left: borderWidth,
          right: borderWidth,
          bottom: borderWidth,
          boxShadow: `inset 0 0 ${size * 0.08}px rgba(0, 0, 0, 0.9)`,
        }}
      >
        {children}
      </div>
    </div>
  );
}

// =============================================================================
// STARTER BORDERS - First achievements (simpler, elegant animations)
// =============================================================================

// First Submission - Music themed with gentle green glow and floating notes
export function StarterFirstSubmission({ children, size = 120, className = '' }: EnhancedBorderProps) {
  const borderWidth = Math.max(4, size * 0.045);
  const id = useMemo(() => `starter-submission-${Math.random().toString(36).substr(2, 9)}`, []);

  // Musical note particles
  const notes = useMemo(() => {
    return [...Array(6)].map((_, i) => ({
      angle: (i / 6) * 360 + 30,
      delay: i * 0.5,
      size: 3 + (i % 2) * 2,
    }));
  }, []);

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <style>{`
        @keyframes ${id}-pulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.05); }
        }
        @keyframes ${id}-note-float {
          0% { transform: translateY(0) scale(0); opacity: 0; }
          20% { transform: translateY(-5px) scale(1); opacity: 1; }
          80% { transform: translateY(-15px) scale(1); opacity: 0.8; }
          100% { transform: translateY(-25px) scale(0.5); opacity: 0; }
        }
        @keyframes ${id}-ring-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

      {/* Outer glow pulse */}
      <div
        className="absolute rounded-full"
        style={{
          top: -size * 0.15,
          left: -size * 0.15,
          right: -size * 0.15,
          bottom: -size * 0.15,
          background: `radial-gradient(circle, rgba(74, 222, 128, 0.3) 0%, rgba(34, 197, 94, 0.15) 40%, transparent 70%)`,
          animation: `${id}-pulse 3s ease-in-out infinite`,
        }}
      />

      {/* Main gradient ring */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background: `conic-gradient(
            from 0deg,
            #4ade80 0deg,
            #22c55e 60deg,
            #16a34a 120deg,
            #15803d 180deg,
            #16a34a 240deg,
            #22c55e 300deg,
            #4ade80 360deg
          )`,
          boxShadow: `0 0 ${size * 0.15}px #22c55e50, inset 0 0 ${size * 0.05}px #00000030`,
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
      />

      {/* Floating note particles */}
      {notes.map((note, i) => {
        const rad = (note.angle * Math.PI) / 180;
        const x = Math.cos(rad) * (size * 0.35);
        const y = Math.sin(rad) * (size * 0.35);
        return (
          <div
            key={i}
            className="absolute text-green-400 pointer-events-none"
            style={{
              left: '50%',
              top: '50%',
              marginLeft: x - note.size,
              marginTop: y - note.size,
              fontSize: note.size * 3,
              animation: `${id}-note-float 3s ease-out infinite`,
              animationDelay: `${note.delay}s`,
            }}
          >
            ♪
          </div>
        );
      })}

      {/* Inner circle */}
      <div
        className="absolute rounded-full bg-zinc-900 overflow-hidden"
        style={{
          top: borderWidth,
          left: borderWidth,
          right: borderWidth,
          bottom: borderWidth,
          boxShadow: `inset 0 0 ${size * 0.1}px rgba(0, 0, 0, 0.5)`,
        }}
      >
        {children}
      </div>
    </div>
  );
}

// Payment Ready - Blue connection theme with pulse rings
export function StarterPaymentReady({ children, size = 120, className = '' }: EnhancedBorderProps) {
  const borderWidth = Math.max(4, size * 0.045);
  const id = useMemo(() => `starter-payment-${Math.random().toString(36).substr(2, 9)}`, []);

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <style>{`
        @keyframes ${id}-pulse-ring {
          0% { transform: scale(0.98); opacity: 0.6; }
          50% { transform: scale(1.02); opacity: 0.2; }
          100% { transform: scale(0.98); opacity: 0.6; }
        }
        @keyframes ${id}-connection-pulse {
          0%, 100% { box-shadow: 0 0 ${size * 0.08}px #3b82f6, 0 0 ${size * 0.15}px #1d4ed880; }
          50% { box-shadow: 0 0 ${size * 0.12}px #60a5fa, 0 0 ${size * 0.2}px #3b82f680; }
        }
      `}</style>

      {/* Expanding pulse rings - subtle effect */}
      {[0, 1].map((i) => (
        <div
          key={i}
          className="absolute rounded-full border border-blue-400/20"
          style={{
            top: -size * 0.04 * (i + 1),
            left: -size * 0.04 * (i + 1),
            right: -size * 0.04 * (i + 1),
            bottom: -size * 0.04 * (i + 1),
            animation: `${id}-pulse-ring 3s ease-in-out infinite`,
            animationDelay: `${i * 0.5}s`,
          }}
        />
      ))}

      {/* Main gradient ring */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background: `conic-gradient(
            from 0deg,
            #60a5fa 0deg,
            #3b82f6 90deg,
            #2563eb 180deg,
            #3b82f6 270deg,
            #60a5fa 360deg
          )`,
          animation: `${id}-connection-pulse 2s ease-in-out infinite`,
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
      />

      {/* Connection indicator dots */}
      {[0, 90, 180, 270].map((angle, i) => {
        const rad = (angle * Math.PI) / 180;
        const x = Math.cos(rad) * (size * 0.42);
        const y = Math.sin(rad) * (size * 0.42);
        return (
          <motion.div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              left: '50%',
              top: '50%',
              marginLeft: x - 3,
              marginTop: y - 3,
              width: 6,
              height: 6,
              boxShadow: '0 0 8px #60a5fa',
            }}
            animate={{ scale: [1, 1.5, 1], opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
          />
        );
      })}

      {/* Inner circle */}
      <div
        className="absolute rounded-full bg-zinc-900 overflow-hidden"
        style={{
          top: borderWidth,
          left: borderWidth,
          right: borderWidth,
          bottom: borderWidth,
          boxShadow: `inset 0 0 ${size * 0.1}px rgba(0, 0, 0, 0.5)`,
        }}
      >
        {children}
      </div>
    </div>
  );
}

// =============================================================================
// BRONZE ACHIEVEMENT BORDERS - Upgraded starter achievements
// =============================================================================

// Bronze First Submission - Music theme with bronze + green metallic blend
export function BronzeFirstSubmission({ children, size = 120, className = '' }: EnhancedBorderProps) {
  const borderWidth = Math.max(5, size * 0.05);
  const id = useMemo(() => `bronze-submission-${Math.random().toString(36).substr(2, 9)}`, []);

  const notes = useMemo(() => {
    return [...Array(8)].map((_, i) => ({
      angle: (i / 8) * 360,
      delay: i * 0.4,
      size: 2 + (i % 3),
    }));
  }, []);

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <style>{`
        @keyframes ${id}-shimmer {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes ${id}-note-rise {
          0% { transform: translateY(0) rotate(0deg) scale(0); opacity: 0; }
          15% { transform: translateY(-3px) rotate(10deg) scale(1); opacity: 1; }
          85% { transform: translateY(-20px) rotate(-10deg) scale(0.8); opacity: 0.6; }
          100% { transform: translateY(-30px) rotate(0deg) scale(0); opacity: 0; }
        }
        @keyframes ${id}-glow-pulse {
          0%, 100% { filter: drop-shadow(0 0 ${size * 0.08}px #cd7f32) drop-shadow(0 0 ${size * 0.04}px #22c55e); }
          50% { filter: drop-shadow(0 0 ${size * 0.12}px #e8a54b) drop-shadow(0 0 ${size * 0.06}px #4ade80); }
        }
      `}</style>

      {/* Dual-color outer glow */}
      <div
        className="absolute rounded-full"
        style={{
          top: -size * 0.2,
          left: -size * 0.2,
          right: -size * 0.2,
          bottom: -size * 0.2,
          background: `radial-gradient(circle,
            rgba(205, 127, 50, 0.25) 0%,
            rgba(74, 222, 128, 0.15) 30%,
            transparent 60%
          )`,
        }}
      />

      {/* Bronze + Green gradient ring */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background: `conic-gradient(
            from 0deg,
            #cd7f32 0deg,
            #4ade80 45deg,
            #22c55e 90deg,
            #e8a54b 135deg,
            #cd7f32 180deg,
            #4ade80 225deg,
            #22c55e 270deg,
            #e8a54b 315deg,
            #cd7f32 360deg
          )`,
          animation: `${id}-glow-pulse 3s ease-in-out infinite`,
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
      />

      {/* Shimmer overlay */}
      <div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          background: `linear-gradient(135deg, transparent 30%, rgba(255, 255, 255, 0.2) 50%, transparent 70%)`,
          animation: `${id}-shimmer 4s linear infinite`,
        }}
      />

      {/* Floating musical notes */}
      {notes.map((note, i) => {
        const rad = (note.angle * Math.PI) / 180;
        const x = Math.cos(rad) * (size * 0.38);
        const y = Math.sin(rad) * (size * 0.38);
        return (
          <div
            key={i}
            className="absolute pointer-events-none"
            style={{
              left: '50%',
              top: '50%',
              marginLeft: x - note.size,
              marginTop: y - note.size,
              fontSize: note.size * 3.5,
              color: i % 2 === 0 ? '#cd7f32' : '#4ade80',
              textShadow: `0 0 8px ${i % 2 === 0 ? '#cd7f32' : '#22c55e'}`,
              animation: `${id}-note-rise 3.5s ease-out infinite`,
              animationDelay: `${note.delay}s`,
            }}
          >
            {i % 3 === 0 ? '♪' : i % 3 === 1 ? '♫' : '♬'}
          </div>
        );
      })}

      {/* Inner circle */}
      <div
        className="absolute rounded-full bg-zinc-900 overflow-hidden"
        style={{
          top: borderWidth,
          left: borderWidth,
          right: borderWidth,
          bottom: borderWidth,
          boxShadow: `inset 0 0 ${size * 0.1}px rgba(0, 0, 0, 0.6)`,
        }}
      >
        {children}
      </div>
    </div>
  );
}

// Bronze Payment Connected - Bronze + blue with connected circuit lines
export function BronzePaymentConnected({ children, size = 120, className = '' }: EnhancedBorderProps) {
  const borderWidth = Math.max(5, size * 0.05);
  const id = useMemo(() => `bronze-connected-${Math.random().toString(36).substr(2, 9)}`, []);

  // Circuit connection points
  const connections = useMemo(() => {
    return [...Array(8)].map((_, i) => ({
      angle: (i / 8) * 360,
      delay: i * 0.15,
    }));
  }, []);

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <style>{`
        @keyframes ${id}-circuit-flow {
          0% { stroke-dashoffset: 20; opacity: 0.3; }
          50% { stroke-dashoffset: 0; opacity: 1; }
          100% { stroke-dashoffset: -20; opacity: 0.3; }
        }
        @keyframes ${id}-node-pulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 4px #3b82f6; }
          50% { transform: scale(1.3); box-shadow: 0 0 12px #60a5fa, 0 0 20px #3b82f680; }
        }
        @keyframes ${id}-ring-glow {
          0%, 100% { box-shadow: 0 0 ${size * 0.1}px #cd7f32, 0 0 ${size * 0.05}px #3b82f6; }
          50% { box-shadow: 0 0 ${size * 0.15}px #e8a54b, 0 0 ${size * 0.08}px #60a5fa; }
        }
      `}</style>

      {/* Outer glow */}
      <div
        className="absolute rounded-full"
        style={{
          top: -size * 0.15,
          left: -size * 0.15,
          right: -size * 0.15,
          bottom: -size * 0.15,
          background: `radial-gradient(circle,
            rgba(205, 127, 50, 0.2) 0%,
            rgba(59, 130, 246, 0.15) 40%,
            transparent 65%
          )`,
        }}
      />

      {/* SVG for circuit lines */}
      <svg
        className="absolute overflow-visible pointer-events-none"
        style={{
          top: -size * 0.2,
          left: -size * 0.2,
          width: size * 1.4,
          height: size * 1.4,
        }}
        viewBox="0 0 140 140"
      >
        {connections.map((conn, i) => {
          const rad = (conn.angle * Math.PI) / 180;
          const innerR = 42;
          const outerR = 58;
          const x1 = 70 + Math.cos(rad) * innerR;
          const y1 = 70 + Math.sin(rad) * innerR;
          const x2 = 70 + Math.cos(rad) * outerR;
          const y2 = 70 + Math.sin(rad) * outerR;
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={i % 2 === 0 ? '#cd7f32' : '#3b82f6'}
              strokeWidth="2"
              strokeDasharray="5 5"
              style={{
                animation: `${id}-circuit-flow 1.5s ease-in-out infinite`,
                animationDelay: `${conn.delay}s`,
              }}
            />
          );
        })}
      </svg>

      {/* Main gradient ring */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background: `conic-gradient(
            from 0deg,
            #cd7f32 0deg,
            #3b82f6 45deg,
            #60a5fa 90deg,
            #e8a54b 135deg,
            #cd7f32 180deg,
            #3b82f6 225deg,
            #60a5fa 270deg,
            #e8a54b 315deg,
            #cd7f32 360deg
          )`,
          animation: `${id}-ring-glow 2.5s ease-in-out infinite`,
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
      />

      {/* Connection nodes */}
      {connections.map((conn, i) => {
        const rad = (conn.angle * Math.PI) / 180;
        const x = Math.cos(rad) * (size * 0.42);
        const y = Math.sin(rad) * (size * 0.42);
        return (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              left: '50%',
              top: '50%',
              marginLeft: x - 4,
              marginTop: y - 4,
              width: 8,
              height: 8,
              background: i % 2 === 0 ? '#e8a54b' : '#60a5fa',
              animation: `${id}-node-pulse 2s ease-in-out infinite`,
              animationDelay: `${conn.delay}s`,
            }}
          />
        );
      })}

      {/* Inner circle */}
      <div
        className="absolute rounded-full bg-zinc-900 overflow-hidden"
        style={{
          top: borderWidth,
          left: borderWidth,
          right: borderWidth,
          bottom: borderWidth,
          boxShadow: `inset 0 0 ${size * 0.1}px rgba(0, 0, 0, 0.6)`,
        }}
      >
        {children}
      </div>
    </div>
  );
}

export const ENHANCED_BORDERS = {
  'v1-smooth-metallic': BronzeBorderV1,
  'v2-dual-ring': BronzeBorderV2,
  'v3-ember-glow': BronzeBorderV3,
  'v4-liquid-metal': BronzeBorderV4,
  'v5-segmented': BronzeBorderV5,
  'v6-orbital': BronzeBorderV6,
  'v7-molten': BronzeBorderV7,
  'v8-luxury-bevel': BronzeBorderV8,
};

export const ELITE_BORDERS = {
  'crimson-smoke': EliteCrimsonSmoke, // New primary Elite border
  'inferno': EliteInferno,
  'spectral': EliteSpectral,
};

// Purchasable borders unlocked at specific tiers
export const UNLOCKABLE_BORDERS = {
  'solar-flare': {
    component: SilverSolarFlare,
    name: 'Solar Flare',
    tier: 'SILVER',
    cost: 150, // Tour Miles cost
    description: 'Intense golden glow with curved spark streaks',
  },
};

export const TIER_BORDERS = {
  bronze: BronzeBorderV1,
  silver: SilverBorder,
  gold: GoldBorder,
  diamond: DiamondBorder,
  elite: EliteCrimsonSmoke, // Default elite to Crimson Smoke style
};
