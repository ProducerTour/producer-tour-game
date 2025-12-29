import { useState } from 'react';
import {
  BronzeBorderV1,
  BronzeBorderV2,
  BronzeBorderV3,
  BronzeBorderV4,
  BronzeBorderV5,
  BronzeBorderV6,
  BronzeBorderV7,
  BronzeBorderV8,
  SilverBorder,
  GoldBorder,
  DiamondBorder,
  EliteInferno,
  EliteCrimsonSmoke,
  EliteSpectral,
  SilverSolarFlare,
  StarterFirstSubmission,
  StarterPaymentReady,
  BronzeFirstSubmission,
  BronzePaymentConnected,
} from './EnhancedBorders';

// Sample avatar placeholder
const AvatarPlaceholder = ({ size }: { size: number }) => (
  <div
    className="w-full h-full bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center"
  >
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className="text-zinc-500"
      style={{ width: size * 0.4, height: size * 0.4 }}
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  </div>
);

// Sample real avatar
const SampleAvatar = () => (
  <img
    src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face"
    alt="Sample avatar"
    className="w-full h-full object-cover"
  />
);

interface TierBorder {
  id: string;
  name: string;
  tier: string;
  description: string;
  component: React.ComponentType<{
    children: React.ReactNode;
    size?: number;
    className?: string;
  }>;
  color: string;
}

const TIER_BORDERS: TierBorder[] = [
  {
    id: 'bronze',
    name: 'Bronze',
    tier: 'BRONZE',
    description: 'Smooth metallic gradient with 12 color stops. Warm amber tones with pulsing outer glow.',
    component: BronzeBorderV1,
    color: 'from-amber-600 to-amber-800',
  },
  {
    id: 'silver',
    name: 'Silver',
    tier: 'SILVER',
    description: 'Sleek silver metallic with dual-layer shimmer effect. Cool tones with elegant shine.',
    component: SilverBorder,
    color: 'from-gray-400 to-gray-600',
  },
  {
    id: 'gold',
    name: 'Gold',
    tier: 'GOLD',
    description: 'Rich gold gradient with animated sparkle particles. Luxurious warm glow.',
    component: GoldBorder,
    color: 'from-yellow-400 to-amber-500',
  },
  {
    id: 'diamond',
    name: 'Diamond',
    tier: 'DIAMOND',
    description: 'Brilliant ice blue with prismatic diamond-shaped sparkles. Intense crystalline effect.',
    component: DiamondBorder,
    color: 'from-cyan-400 to-cyan-600',
  },
  {
    id: 'elite',
    name: 'Elite',
    tier: 'ELITE',
    description: 'Ethereal crimson smoke ring with flowing wisps and glowing red particles.',
    component: EliteCrimsonSmoke,
    color: 'from-red-600 to-red-800',
  },
];

interface BronzeVariant {
  id: string;
  name: string;
  description: string;
  component: React.ComponentType<{
    children: React.ReactNode;
    size?: number;
    className?: string;
  }>;
}

interface EliteVariant {
  id: string;
  name: string;
  description: string;
  component: React.ComponentType<{
    children: React.ReactNode;
    size?: number;
    className?: string;
  }>;
}

const ELITE_VARIANTS: EliteVariant[] = [
  {
    id: 'v1',
    name: 'V1: Crimson Smoke',
    description: 'Ethereal red smoke ring with flowing wispy tendrils, dual-layer rotation, and drifting particles.',
    component: EliteCrimsonSmoke,
  },
  {
    id: 'v2',
    name: 'V2: Molten Ring',
    description: 'Glowing yellow-orange ring with 24 radiating spark streaks + 16 floating ember particles.',
    component: EliteInferno,
  },
  {
    id: 'v3',
    name: 'V3: Forge Ring',
    description: 'White-hot welding ring with 32 burst sparks + 40 ember dots scattering in all directions.',
    component: EliteSpectral,
  },
];

// Unlockable borders - purchasable with Tour Miles
interface UnlockableBorder {
  id: string;
  name: string;
  tier: string;
  cost: number;
  description: string;
  component: React.ComponentType<{
    children: React.ReactNode;
    size?: number;
    className?: string;
  }>;
}

const UNLOCKABLE_BORDERS: UnlockableBorder[] = [
  {
    id: 'solar-flare',
    name: 'Solar Flare',
    tier: 'SILVER',
    cost: 150,
    description: 'Intense blazing ring with 20 curved spark streaks + 30 scattered ember dots flying outward.',
    component: SilverSolarFlare,
  },
];

// Achievement borders - earned through specific actions
interface AchievementBorder {
  id: string;
  name: string;
  tier: 'starter' | 'bronze';
  achievement: string;
  emoji: string;
  description: string;
  component: React.ComponentType<{
    children: React.ReactNode;
    size?: number;
    className?: string;
  }>;
}

const ACHIEVEMENT_BORDERS: AchievementBorder[] = [
  {
    id: 'starter-first-submission',
    name: 'First Notes',
    tier: 'starter',
    achievement: 'First Submission',
    emoji: '🎵',
    description: 'Green music-themed border with floating musical notes. Earned by submitting your first work to the platform.',
    component: StarterFirstSubmission,
  },
  {
    id: 'starter-payment-ready',
    name: 'Connected',
    tier: 'starter',
    achievement: 'Payment Ready',
    emoji: '💳',
    description: 'Blue connection-themed border with pulsing rings and connection dots. Earned by connecting your Stripe account.',
    component: StarterPaymentReady,
  },
  {
    id: 'bronze-first-submission',
    name: 'Bronze Melody',
    tier: 'bronze',
    achievement: 'First Submission',
    emoji: '🎵',
    description: 'Bronze-green metallic blend with floating musical notes. A prestigious upgrade to the starter music border.',
    component: BronzeFirstSubmission,
  },
  {
    id: 'bronze-payment-connected',
    name: 'Bronze Circuit',
    tier: 'bronze',
    achievement: 'Payment Ready',
    emoji: '💳',
    description: 'Bronze-blue metallic with circuit connection lines and pulsing nodes. The premium payment connection border.',
    component: BronzePaymentConnected,
  },
];

const BRONZE_VARIANTS: BronzeVariant[] = [
  {
    id: 'v1',
    name: 'V1: Smooth Metallic',
    description: 'Clean conic gradient with 12 color stops for a smooth metallic appearance. Slow spin with pulsing outer glow.',
    component: BronzeBorderV1,
  },
  {
    id: 'v2',
    name: 'V2: Dual Ring',
    description: 'Two concentric rings spinning in opposite directions. Features a traveling highlight that catches the eye.',
    component: BronzeBorderV2,
  },
  {
    id: 'v3',
    name: 'V3: Ember Glow',
    description: 'Warm ember colors with a pulsing orange glow. Hot spot highlight creates a forging metal effect.',
    component: BronzeBorderV3,
  },
  {
    id: 'v4',
    name: 'V4: Liquid Metal',
    description: 'Static metallic base with floating liquid-like reflections. Gives a premium polished look.',
    component: BronzeBorderV4,
  },
  {
    id: 'v5',
    name: 'V5: Segmented Ring',
    description: 'SVG-based segmented ring with individual segment animations. Each segment pulses independently.',
    component: BronzeBorderV5,
  },
  {
    id: 'v6',
    name: 'V6: Orbital Particles',
    description: 'Solid bronze ring with orbiting glowing particles. Particles pulse and scale as they rotate.',
    component: BronzeBorderV6,
  },
  {
    id: 'v7',
    name: 'V7: Molten Bronze',
    description: 'Intense fire/lava effect with flickering flames. Perfect for active/hot streaks.',
    component: BronzeBorderV7,
  },
  {
    id: 'v8',
    name: 'V8: Luxury Bevel',
    description: '3D beveled appearance with subtle traveling shine. Premium, understated luxury feel.',
    component: BronzeBorderV8,
  },
];

export default function BorderPreview() {
  const [size, setSize] = useState(120);
  const [useRealAvatar, setUseRealAvatar] = useState(false);
  const [activeTab, setActiveTab] = useState<'tiers' | 'bronze' | 'elite' | 'unlockables' | 'achievements'>('tiers');

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-amber-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
            Social Border System
          </h1>
          <p className="text-zinc-400 text-lg">
            High-quality animated borders for profile avatars
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center mb-8">
          <div className="bg-zinc-900 rounded-xl p-1 flex gap-1">
            <button
              onClick={() => setActiveTab('tiers')}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                activeTab === 'tiers'
                  ? 'bg-gradient-to-r from-amber-500 to-pink-500 text-white'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              All Tiers
            </button>
            <button
              onClick={() => setActiveTab('bronze')}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                activeTab === 'bronze'
                  ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              Bronze Variants
            </button>
            <button
              onClick={() => setActiveTab('elite')}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                activeTab === 'elite'
                  ? 'bg-gradient-to-r from-red-600 to-red-700 text-white'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              Elite Variants
            </button>
            <button
              onClick={() => setActiveTab('unlockables')}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                activeTab === 'unlockables'
                  ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              🔓 Unlockables
            </button>
            <button
              onClick={() => setActiveTab('achievements')}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                activeTab === 'achievements'
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              🏅 Achievements
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-6 justify-center mb-12 p-6 bg-zinc-900/50 rounded-xl border border-zinc-800">
          <div className="flex items-center gap-4">
            <label className="text-zinc-400 font-medium">Size:</label>
            <input
              type="range"
              min="60"
              max="200"
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
              className="w-40 accent-amber-500"
            />
            <span className="text-amber-400 font-mono w-16">{size}px</span>
          </div>

          <div className="flex items-center gap-4">
            <label className="text-zinc-400 font-medium">Avatar:</label>
            <button
              onClick={() => setUseRealAvatar(!useRealAvatar)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                useRealAvatar
                  ? 'bg-amber-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              {useRealAvatar ? 'Real Photo' : 'Placeholder'}
            </button>
          </div>
        </div>

        {/* ALL TIERS VIEW */}
        {activeTab === 'tiers' && (
          <>
            {/* Tier Showcase - Large Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-16">
              {TIER_BORDERS.map((tier) => {
                const BorderComponent = tier.component;

                return (
                  <div
                    key={tier.id}
                    className="flex flex-col items-center p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition-all"
                  >
                    {/* Border Preview */}
                    <div className="mb-6 flex items-center justify-center" style={{ minHeight: size + 40 }}>
                      <BorderComponent size={size}>
                        {useRealAvatar ? <SampleAvatar /> : <AvatarPlaceholder size={size} />}
                      </BorderComponent>
                    </div>

                    {/* Tier Badge */}
                    <div className={`px-4 py-1.5 rounded-full bg-gradient-to-r ${tier.color} text-white font-bold text-sm mb-3`}>
                      {tier.tier}
                    </div>

                    {/* Info */}
                    <h3 className="text-lg font-semibold text-white mb-2">
                      {tier.name}
                    </h3>
                    <p className="text-sm text-zinc-500 text-center leading-relaxed">
                      {tier.description}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Side-by-Side Comparison Row */}
            <div className="mb-16">
              <h2 className="text-2xl font-bold text-center mb-8 text-zinc-300">
                Tier Progression (Same Size)
              </h2>
              <div className="flex flex-wrap justify-center items-center gap-8 p-8 bg-zinc-900/30 rounded-2xl border border-zinc-800">
                {TIER_BORDERS.map((tier) => {
                  const BorderComponent = tier.component;
                  return (
                    <div key={tier.id} className="flex flex-col items-center gap-3">
                      <BorderComponent size={100}>
                        {useRealAvatar ? <SampleAvatar /> : <AvatarPlaceholder size={100} />}
                      </BorderComponent>
                      <span className={`text-sm font-medium bg-gradient-to-r ${tier.color} bg-clip-text text-transparent`}>
                        {tier.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Size Comparison */}
            <div>
              <h2 className="text-2xl font-bold text-center mb-8 text-zinc-300">
                Size Scaling Test (Elite Crimson Smoke)
              </h2>
              <div className="flex flex-wrap justify-center items-end gap-8 p-8 bg-zinc-900/30 rounded-2xl border border-zinc-800">
                {[60, 80, 100, 140, 180].map((testSize) => (
                  <div key={testSize} className="flex flex-col items-center gap-3">
                    <EliteCrimsonSmoke size={testSize}>
                      {useRealAvatar ? <SampleAvatar /> : <AvatarPlaceholder size={testSize} />}
                    </EliteCrimsonSmoke>
                    <span className="text-sm text-zinc-500">{testSize}px</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* BRONZE VARIANTS VIEW */}
        {activeTab === 'bronze' && (
          <>
            <div className="text-center mb-8">
              <p className="text-amber-400 text-lg font-medium">
                8 different bronze border styles to choose from
              </p>
            </div>

            {/* Bronze Variants Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
              {BRONZE_VARIANTS.map((variant) => {
                const BorderComponent = variant.component;

                return (
                  <div
                    key={variant.id}
                    className="flex flex-col items-center p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800 hover:border-amber-700/50 transition-all"
                  >
                    {/* Border Preview */}
                    <div className="mb-6 flex items-center justify-center" style={{ minHeight: size + 40 }}>
                      <BorderComponent size={size}>
                        {useRealAvatar ? <SampleAvatar /> : <AvatarPlaceholder size={size} />}
                      </BorderComponent>
                    </div>

                    {/* Info */}
                    <h3 className="text-lg font-semibold text-amber-400 mb-2">
                      {variant.name}
                    </h3>
                    <p className="text-sm text-zinc-500 text-center leading-relaxed">
                      {variant.description}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Bronze Comparison Row */}
            <div>
              <h2 className="text-2xl font-bold text-center mb-8 text-zinc-300">
                All Bronze Variants (80px)
              </h2>
              <div className="flex flex-wrap justify-center gap-6 p-8 bg-zinc-900/30 rounded-2xl border border-zinc-800">
                {BRONZE_VARIANTS.map((variant) => {
                  const BorderComponent = variant.component;
                  return (
                    <div key={variant.id} className="flex flex-col items-center gap-2">
                      <BorderComponent size={80}>
                        {useRealAvatar ? <SampleAvatar /> : <AvatarPlaceholder size={80} />}
                      </BorderComponent>
                      <span className="text-xs text-zinc-500">{variant.id.toUpperCase()}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* ELITE VARIANTS VIEW */}
        {activeTab === 'elite' && (
          <>
            <div className="text-center mb-8">
              <p className="text-red-400 text-lg font-medium">
                3 Elite flame styles - Pure CSS animations with SVG fire effects
              </p>
              <p className="text-zinc-500 text-sm mt-2">
                Flames that dissolve into the page void • No Framer Motion
              </p>
            </div>

            {/* Elite Variants Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
              {ELITE_VARIANTS.map((variant) => {
                const BorderComponent = variant.component;

                return (
                  <div
                    key={variant.id}
                    className="flex flex-col items-center p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800 hover:border-red-700/50 transition-all"
                  >
                    {/* Border Preview */}
                    <div className="mb-6 flex items-center justify-center" style={{ minHeight: size + 40 }}>
                      <BorderComponent size={size}>
                        {useRealAvatar ? <SampleAvatar /> : <AvatarPlaceholder size={size} />}
                      </BorderComponent>
                    </div>

                    {/* Info */}
                    <h3 className="text-lg font-semibold text-red-400 mb-2">
                      {variant.name}
                    </h3>
                    <p className="text-sm text-zinc-500 text-center leading-relaxed">
                      {variant.description}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Elite Comparison Row */}
            <div>
              <h2 className="text-2xl font-bold text-center mb-8 text-zinc-300">
                All Elite Variants (100px)
              </h2>
              <div className="flex flex-wrap justify-center gap-8 p-8 bg-zinc-900/30 rounded-2xl border border-zinc-800">
                {ELITE_VARIANTS.map((variant) => {
                  const BorderComponent = variant.component;
                  return (
                    <div key={variant.id} className="flex flex-col items-center gap-3">
                      <BorderComponent size={100}>
                        {useRealAvatar ? <SampleAvatar /> : <AvatarPlaceholder size={100} />}
                      </BorderComponent>
                      <span className="text-xs text-zinc-500">{variant.id.toUpperCase()}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* UNLOCKABLES VIEW */}
        {activeTab === 'unlockables' && (
          <>
            <div className="text-center mb-8">
              <p className="text-yellow-400 text-lg font-medium">
                🏆 Special borders purchasable with Tour Miles
              </p>
              <p className="text-zinc-500 text-sm mt-2">
                Unlock exclusive borders once you reach the required tier
              </p>
            </div>

            {/* Unlockable Borders Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
              {UNLOCKABLE_BORDERS.map((border) => {
                const BorderComponent = border.component;

                return (
                  <div
                    key={border.id}
                    className="flex flex-col items-center p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800 hover:border-yellow-700/50 transition-all"
                  >
                    {/* Border Preview */}
                    <div className="mb-6 flex items-center justify-center" style={{ minHeight: size + 40 }}>
                      <BorderComponent size={size}>
                        {useRealAvatar ? <SampleAvatar /> : <AvatarPlaceholder size={size} />}
                      </BorderComponent>
                    </div>

                    {/* Requirements Badge */}
                    <div className="flex items-center gap-2 mb-3">
                      <span className="px-3 py-1 rounded-full bg-zinc-800 text-zinc-400 text-xs font-medium">
                        {border.tier} Tier Required
                      </span>
                      <span className="px-3 py-1 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs font-bold">
                        ✨ {border.cost} Tour Miles
                      </span>
                    </div>

                    {/* Info */}
                    <h3 className="text-lg font-semibold text-yellow-400 mb-2">
                      {border.name}
                    </h3>
                    <p className="text-sm text-zinc-500 text-center leading-relaxed">
                      {border.description}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Size scaling preview for unlockables */}
            <div>
              <h2 className="text-2xl font-bold text-center mb-8 text-zinc-300">
                Size Scaling (Solar Flare)
              </h2>
              <div className="flex flex-wrap justify-center items-end gap-8 p-8 bg-zinc-900/30 rounded-2xl border border-zinc-800">
                {[60, 80, 100, 140, 180].map((testSize) => (
                  <div key={testSize} className="flex flex-col items-center gap-3">
                    <SilverSolarFlare size={testSize}>
                      {useRealAvatar ? <SampleAvatar /> : <AvatarPlaceholder size={testSize} />}
                    </SilverSolarFlare>
                    <span className="text-sm text-zinc-500">{testSize}px</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ACHIEVEMENTS VIEW */}
        {activeTab === 'achievements' && (
          <>
            <div className="text-center mb-8">
              <p className="text-green-400 text-lg font-medium">
                🏅 Borders earned through specific achievements
              </p>
              <p className="text-zinc-500 text-sm mt-2">
                Complete milestones to unlock these special borders
              </p>
            </div>

            {/* Starter Achievement Borders */}
            <div className="mb-12">
              <h2 className="text-xl font-bold mb-6 text-zinc-300 flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-green-600/20 text-green-400 text-sm">Starter</span>
                Achievement Borders
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {ACHIEVEMENT_BORDERS.filter(b => b.tier === 'starter').map((border) => {
                  const BorderComponent = border.component;
                  return (
                    <div
                      key={border.id}
                      className="flex flex-col items-center p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800 hover:border-green-700/50 transition-all"
                    >
                      <div className="mb-6 flex items-center justify-center" style={{ minHeight: size + 40 }}>
                        <BorderComponent size={size}>
                          {useRealAvatar ? <SampleAvatar /> : <AvatarPlaceholder size={size} />}
                        </BorderComponent>
                      </div>

                      {/* Achievement Badge */}
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-2xl">{border.emoji}</span>
                        <span className="px-3 py-1 rounded-full bg-zinc-800 text-zinc-400 text-xs font-medium">
                          {border.achievement}
                        </span>
                      </div>

                      <h3 className="text-lg font-semibold text-green-400 mb-2">
                        {border.name}
                      </h3>
                      <p className="text-sm text-zinc-500 text-center leading-relaxed">
                        {border.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bronze Achievement Borders */}
            <div className="mb-12">
              <h2 className="text-xl font-bold mb-6 text-zinc-300 flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-amber-600/20 text-amber-400 text-sm">Bronze</span>
                Achievement Borders
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {ACHIEVEMENT_BORDERS.filter(b => b.tier === 'bronze').map((border) => {
                  const BorderComponent = border.component;
                  return (
                    <div
                      key={border.id}
                      className="flex flex-col items-center p-6 rounded-2xl bg-zinc-900/50 border border-zinc-800 hover:border-amber-700/50 transition-all"
                    >
                      <div className="mb-6 flex items-center justify-center" style={{ minHeight: size + 40 }}>
                        <BorderComponent size={size}>
                          {useRealAvatar ? <SampleAvatar /> : <AvatarPlaceholder size={size} />}
                        </BorderComponent>
                      </div>

                      {/* Achievement Badge */}
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-2xl">{border.emoji}</span>
                        <span className="px-3 py-1 rounded-full bg-amber-900/50 text-amber-400 text-xs font-medium">
                          {border.achievement}
                        </span>
                      </div>

                      <h3 className="text-lg font-semibold text-amber-400 mb-2">
                        {border.name}
                      </h3>
                      <p className="text-sm text-zinc-500 text-center leading-relaxed">
                        {border.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* All Achievement Borders Comparison */}
            <div>
              <h2 className="text-2xl font-bold text-center mb-8 text-zinc-300">
                Achievement Border Comparison (80px)
              </h2>
              <div className="flex flex-wrap justify-center gap-8 p-8 bg-zinc-900/30 rounded-2xl border border-zinc-800">
                {ACHIEVEMENT_BORDERS.map((border) => {
                  const BorderComponent = border.component;
                  return (
                    <div key={border.id} className="flex flex-col items-center gap-3">
                      <BorderComponent size={80}>
                        {useRealAvatar ? <SampleAvatar /> : <AvatarPlaceholder size={80} />}
                      </BorderComponent>
                      <div className="text-center">
                        <span className="text-xs text-zinc-400 block">{border.emoji} {border.achievement}</span>
                        <span className={`text-xs font-medium ${border.tier === 'starter' ? 'text-green-400' : 'text-amber-400'}`}>
                          {border.tier.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Usage Code */}
        <div className="mt-16 p-6 bg-zinc-900/50 rounded-xl border border-zinc-800">
          <h2 className="text-xl font-bold mb-4 text-zinc-300">Usage Example</h2>
          <pre className="bg-zinc-950 p-4 rounded-lg overflow-x-auto text-sm">
            <code className="text-amber-400">{`import { BronzeBorderV1, SilverBorder, GoldBorder, DiamondBorder, EliteBorder } from './test/EnhancedBorders';

// Use directly with any tier:
<GoldBorder size={120}>
  <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
</GoldBorder>

// Or use the TIER_BORDERS map:
import { TIER_BORDERS } from './test/EnhancedBorders';
const BorderComponent = TIER_BORDERS[user.socialTier.toLowerCase()];
<BorderComponent size={120}>{avatar}</BorderComponent>`}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}
