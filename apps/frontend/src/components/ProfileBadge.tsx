import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';

export type BadgeRarity = 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';

export interface BadgeConfig {
  id: string;
  name: string;
  description?: string;
  imageUrl: string;
  rarity: BadgeRarity;
  category: string; // 'achievement', 'store', 'special'
}

// Rarity color schemes
const RARITY_COLORS: Record<BadgeRarity, { bg: string; border: string; glow: string; text: string }> = {
  COMMON: {
    bg: 'bg-gray-700/50',
    border: 'border-gray-500',
    glow: '',
    text: 'text-gray-400',
  },
  RARE: {
    bg: 'bg-blue-900/50',
    border: 'border-blue-500',
    glow: 'shadow-blue-500/30',
    text: 'text-blue-400',
  },
  EPIC: {
    bg: 'bg-purple-900/50',
    border: 'border-purple-500',
    glow: 'shadow-purple-500/30',
    text: 'text-purple-400',
  },
  LEGENDARY: {
    bg: 'bg-amber-900/50',
    border: 'border-amber-500',
    glow: 'shadow-amber-500/40',
    text: 'text-amber-400',
  },
};

interface ProfileBadgeProps {
  badge: BadgeConfig;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  owned?: boolean;
  isEquipped?: boolean;
  onClick?: () => void;
  showTooltip?: boolean;
  className?: string;
}

export function ProfileBadge({
  badge,
  size = 'md',
  owned = true,
  isEquipped = false,
  onClick,
  showTooltip = true,
  className = '',
}: ProfileBadgeProps) {
  const colors = RARITY_COLORS[badge.rarity];

  // Size configurations
  const sizeConfig = {
    xs: { container: 'w-6 h-6', icon: 'w-4 h-4', ring: 'ring-1' },
    sm: { container: 'w-10 h-10', icon: 'w-6 h-6', ring: 'ring-2' },
    md: { container: 'w-14 h-14', icon: 'w-8 h-8', ring: 'ring-2' },
    lg: { container: 'w-20 h-20', icon: 'w-12 h-12', ring: 'ring-3' },
  }[size];

  const isClickable = !!onClick;

  return (
    <div className={`relative group ${className}`}>
      <motion.button
        className={`
          ${sizeConfig.container} rounded-full flex items-center justify-center
          ${colors.bg} border-2 ${colors.border}
          ${!owned ? 'opacity-40 grayscale' : ''}
          ${isEquipped ? `${sizeConfig.ring} ring-white/50 ring-offset-2 ring-offset-surface` : ''}
          ${colors.glow && owned ? `shadow-lg ${colors.glow}` : ''}
          ${isClickable ? 'cursor-pointer hover:scale-105 active:scale-95' : 'cursor-default'}
          transition-all duration-200
        `}
        onClick={onClick}
        disabled={!isClickable}
        whileHover={isClickable && owned ? { scale: 1.05 } : undefined}
        whileTap={isClickable && owned ? { scale: 0.95 } : undefined}
      >
        {owned ? (
          <img
            src={badge.imageUrl}
            alt={badge.name}
            className={`${sizeConfig.icon} object-contain`}
          />
        ) : (
          <Lock className={`${sizeConfig.icon} text-gray-500 opacity-60`} />
        )}

        {/* Legendary glow effect */}
        {owned && badge.rarity === 'LEGENDARY' && (
          <motion.div
            className="absolute inset-0 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20"
            animate={{
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        )}

        {/* Equipped indicator */}
        {isEquipped && (
          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-surface flex items-center justify-center">
            <span className="text-[8px] text-white font-bold">✓</span>
          </div>
        )}
      </motion.button>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-surface-light border border-white/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 whitespace-nowrap">
          <p className="text-sm font-semibold text-white">{badge.name}</p>
          {badge.description && (
            <p className="text-xs text-text-secondary mt-0.5 max-w-[200px] whitespace-normal">
              {badge.description}
            </p>
          )}
          <p className={`text-xs font-medium ${colors.text} mt-1`}>
            {badge.rarity.charAt(0) + badge.rarity.slice(1).toLowerCase()}
          </p>
          {!owned && (
            <p className="text-xs text-amber-400 mt-1">Locked</p>
          )}
          {/* Tooltip arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-white/10" />
        </div>
      )}
    </div>
  );
}

// Badge grid for collection display
interface BadgeGridProps {
  badges: Array<BadgeConfig & { owned: boolean; isEquipped: boolean }>;
  onBadgeClick?: (badge: BadgeConfig) => void;
  emptyMessage?: string;
}

export function BadgeGrid({ badges, onBadgeClick, emptyMessage = 'No badges yet' }: BadgeGridProps) {
  if (badges.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-text-secondary">{emptyMessage}</p>
      </div>
    );
  }

  // Group badges by rarity
  const groupedBadges = badges.reduce((acc, badge) => {
    if (!acc[badge.rarity]) acc[badge.rarity] = [];
    acc[badge.rarity].push(badge);
    return acc;
  }, {} as Record<BadgeRarity, typeof badges>);

  const rarityOrder: BadgeRarity[] = ['LEGENDARY', 'EPIC', 'RARE', 'COMMON'];

  return (
    <div className="space-y-6">
      {rarityOrder.map((rarity) => {
        const rarityBadges = groupedBadges[rarity];
        if (!rarityBadges?.length) return null;

        return (
          <div key={rarity}>
            <h4 className={`text-sm font-semibold mb-3 ${RARITY_COLORS[rarity].text}`}>
              {rarity.charAt(0) + rarity.slice(1).toLowerCase()} ({rarityBadges.length})
            </h4>
            <div className="flex flex-wrap gap-3">
              {rarityBadges.map((badge) => (
                <ProfileBadge
                  key={badge.id}
                  badge={badge}
                  owned={badge.owned}
                  isEquipped={badge.isEquipped}
                  onClick={onBadgeClick ? () => onBadgeClick(badge) : undefined}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Compact badge display for profiles/sidebar
interface BadgeDisplayProps {
  badge: BadgeConfig | null;
  size?: 'sm' | 'md';
  className?: string;
}

export function BadgeDisplay({ badge, size = 'sm', className = '' }: BadgeDisplayProps) {
  if (!badge) return null;

  return (
    <ProfileBadge
      badge={badge}
      size={size}
      owned={true}
      showTooltip={true}
      className={className}
    />
  );
}

// Helper to parse badge from API response
export function parseBadgeConfig(apiResponse: any): BadgeConfig | null {
  if (!apiResponse) return null;
  return {
    id: apiResponse.id,
    name: apiResponse.name,
    description: apiResponse.description,
    imageUrl: apiResponse.imageUrl || '/placeholder-badge.png',
    rarity: apiResponse.rarity || 'COMMON',
    category: apiResponse.category || 'achievement',
  };
}

export default ProfileBadge;
