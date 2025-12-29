import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { gamificationApi } from '../lib/api';
import { successToast, errorToast } from '../lib/toast';
import { AnimatedBorder, parseBorderConfig } from './AnimatedBorder';
import { ProfileBadge, parseBadgeConfig, BadgeRarity } from './ProfileBadge';
import { User, Sparkles, Crown, Lock, Check, X } from 'lucide-react';

type TabType = 'badges' | 'borders';

interface CustomizationGalleryProps {
  onClose?: () => void;
  initialTab?: TabType;
}

export function CustomizationGallery({ onClose, initialTab = 'badges' }: CustomizationGalleryProps) {
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);

  return (
    <div className="w-full max-w-full bg-surface-light border border-white/10 rounded-xl sm:rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3 sm:px-6 sm:py-4 border-b border-white/10">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg sm:rounded-xl flex items-center justify-center">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div>
            <h2 className="text-sm sm:text-lg font-semibold text-white">Customize Profile</h2>
            <p className="text-xs sm:text-sm text-theme-foreground-muted hidden sm:block">Choose your badge and border</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1.5 sm:p-2 hover:bg-white/10 rounded-lg transition-colors">
            <X className="w-4 h-4 sm:w-5 sm:h-5 text-theme-foreground-muted" />
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10">
        <button
          onClick={() => setActiveTab('badges')}
          className={`flex-1 px-3 py-2 sm:px-6 sm:py-3 text-xs sm:text-sm font-medium transition-colors relative ${
            activeTab === 'badges' ? 'text-white' : 'text-theme-foreground-muted hover:text-white'
          }`}
        >
          <span className="flex items-center justify-center gap-1.5 sm:gap-2">
            <Crown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            Badges
          </span>
          {activeTab === 'badges' && (
            <motion.div
              layoutId="tab-indicator"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 to-pink-500"
            />
          )}
        </button>
        <button
          onClick={() => setActiveTab('borders')}
          className={`flex-1 px-3 py-2 sm:px-6 sm:py-3 text-xs sm:text-sm font-medium transition-colors relative ${
            activeTab === 'borders' ? 'text-white' : 'text-theme-foreground-muted hover:text-white'
          }`}
        >
          <span className="flex items-center justify-center gap-1.5 sm:gap-2">
            <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            Borders
          </span>
          {activeTab === 'borders' && (
            <motion.div
              layoutId="tab-indicator"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 to-pink-500"
            />
          )}
        </button>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-6 max-h-[60vh] sm:max-h-[500px] overflow-y-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'badges' ? (
            <motion.div
              key="badges"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <BadgeCollection />
            </motion.div>
          ) : (
            <motion.div
              key="borders"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <BorderCollection />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Badge Collection Tab
function BadgeCollection() {
  const queryClient = useQueryClient();

  const { data: collection, isLoading } = useQuery({
    queryKey: ['badge-collection'],
    queryFn: async () => {
      const response = await gamificationApi.getBadgeCollection();
      return response.data;
    },
  });

  const equipMutation = useMutation({
    mutationFn: async (badgeId: string) => {
      await gamificationApi.equipBadge(badgeId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['badge-collection'] });
      queryClient.invalidateQueries({ queryKey: ['customizations'] });
      successToast('Badge equipped!');
    },
    onError: () => {
      errorToast('Failed to equip badge');
    },
  });

  const unequipMutation = useMutation({
    mutationFn: async () => {
      await gamificationApi.unequipBadge();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['badge-collection'] });
      queryClient.invalidateQueries({ queryKey: ['customizations'] });
      successToast('Badge unequipped');
    },
    onError: () => {
      errorToast('Failed to unequip badge');
    },
  });

  if (isLoading) {
    return <CollectionSkeleton />;
  }

  const badges = collection?.collection || [];
  const equippedBadgeId = collection?.equippedBadgeId;

  // Group by rarity
  const groupedBadges: Record<BadgeRarity, any[]> = {
    LEGENDARY: [],
    EPIC: [],
    RARE: [],
    COMMON: [],
  };

  badges.forEach((badge: any) => {
    const rarity = badge.rarity as BadgeRarity;
    if (groupedBadges[rarity]) {
      groupedBadges[rarity].push(badge);
    }
  });

  const rarityOrder: BadgeRarity[] = ['LEGENDARY', 'EPIC', 'RARE', 'COMMON'];

  const handleBadgeClick = (badge: any) => {
    if (!badge.owned) return;
    if (badge.isEquipped) {
      unequipMutation.mutate();
    } else {
      equipMutation.mutate(badge.id);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Stats */}
      <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-white/5 rounded-lg sm:rounded-xl">
        <div className="text-center">
          <p className="text-lg sm:text-2xl font-bold text-white">{collection?.owned || 0}</p>
          <p className="text-[10px] sm:text-xs text-theme-foreground-muted">Owned</p>
        </div>
        <div className="w-px h-6 sm:h-8 bg-white/10" />
        <div className="text-center">
          <p className="text-lg sm:text-2xl font-bold text-theme-foreground-muted">{collection?.total || 0}</p>
          <p className="text-[10px] sm:text-xs text-theme-foreground-muted">Total</p>
        </div>
      </div>

      {/* Currently Equipped */}
      {equippedBadgeId && (
        <div className="p-3 sm:p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-lg sm:rounded-xl">
          <p className="text-[10px] sm:text-xs text-purple-400 font-medium mb-1.5 sm:mb-2">Currently Equipped</p>
          <div className="flex items-center gap-2 sm:gap-3">
            {badges.find((b: any) => b.id === equippedBadgeId) && (
              <>
                <ProfileBadge
                  badge={parseBadgeConfig(badges.find((b: any) => b.id === equippedBadgeId))!}
                  size="md"
                  owned={true}
                  isEquipped={true}
                  showTooltip={false}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm sm:text-base text-white font-medium truncate">
                    {badges.find((b: any) => b.id === equippedBadgeId)?.name}
                  </p>
                  <button
                    onClick={() => unequipMutation.mutate()}
                    className="text-[10px] sm:text-xs text-red-400 hover:text-red-300"
                  >
                    Remove
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Badge Grid by Rarity */}
      {rarityOrder.map((rarity) => {
        const rarityBadges = groupedBadges[rarity];
        if (!rarityBadges.length) return null;

        return (
          <div key={rarity}>
            <h4 className="text-sm font-medium text-theme-foreground-muted mb-3">
              {rarity.charAt(0) + rarity.slice(1).toLowerCase()} ({rarityBadges.length})
            </h4>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {rarityBadges.map((badge: any) => (
                <div
                  key={badge.id}
                  onClick={() => handleBadgeClick(badge)}
                  className={`
                    relative cursor-pointer transition-transform hover:scale-105
                    ${!badge.owned ? 'opacity-50 cursor-not-allowed hover:scale-100' : ''}
                  `}
                >
                  <ProfileBadge
                    badge={parseBadgeConfig(badge)!}
                    size="md"
                    owned={badge.owned}
                    isEquipped={badge.isEquipped}
                    showTooltip={true}
                  />
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {badges.length === 0 && (
        <div className="text-center py-8">
          <Crown className="w-12 h-12 text-theme-foreground-muted mx-auto mb-3 opacity-50" />
          <p className="text-theme-foreground-muted">No badges available yet</p>
          <p className="text-sm text-theme-foreground-muted mt-1">Complete achievements to unlock badges!</p>
        </div>
      )}
    </div>
  );
}

// Border Collection Tab
function BorderCollection() {
  const queryClient = useQueryClient();

  const { data: collection, isLoading } = useQuery({
    queryKey: ['border-collection'],
    queryFn: async () => {
      const response = await gamificationApi.getBorderCollection();
      return response.data;
    },
  });

  const equipMutation = useMutation({
    mutationFn: async (borderId: string) => {
      await gamificationApi.equipBorder(borderId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['border-collection'] });
      queryClient.invalidateQueries({ queryKey: ['customizations'] });
      successToast('Border equipped!');
    },
    onError: () => {
      errorToast('Failed to equip border');
    },
  });

  const unequipMutation = useMutation({
    mutationFn: async () => {
      await gamificationApi.unequipBorder();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['border-collection'] });
      queryClient.invalidateQueries({ queryKey: ['customizations'] });
      successToast('Border removed');
    },
    onError: () => {
      errorToast('Failed to remove border');
    },
  });

  if (isLoading) {
    return <CollectionSkeleton />;
  }

  const borders = collection?.collection || [];
  const equippedBorderId = collection?.equippedBorderId;

  const handleBorderClick = (border: any) => {
    if (!border.owned) return;
    if (border.isEquipped) {
      unequipMutation.mutate();
    } else {
      equipMutation.mutate(border.id);
    }
  };

  // Group by tier - chronological unlocking order (earliest first)
  const tierOrder = ['starter', 'week', 'month', 'streak', 'BRONZE', 'SILVER', 'GOLD', 'DIAMOND', 'ELITE', 'unlockable'];
  const tierLabels: Record<string, string> = {
    starter: 'Starter',
    week: 'Weekly',
    month: 'Monthly',
    streak: 'Streak',
    BRONZE: 'Bronze Tier',
    SILVER: 'Silver Tier',
    GOLD: 'Gold Tier',
    DIAMOND: 'Diamond Tier',
    ELITE: 'Elite Tier',
    unlockable: '✨ Unlockable (Tour Miles)',
  };

  const groupedBorders = borders.reduce((acc: Record<string, any[]>, border: any) => {
    const tier = border.tier || 'other';
    if (!acc[tier]) acc[tier] = [];
    acc[tier].push(border);
    return acc;
  }, {});

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Stats */}
      <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-white/5 rounded-lg sm:rounded-xl">
        <div className="text-center">
          <p className="text-lg sm:text-2xl font-bold text-white">{collection?.owned || 0}</p>
          <p className="text-[10px] sm:text-xs text-theme-foreground-muted">Owned</p>
        </div>
        <div className="w-px h-6 sm:h-8 bg-white/10" />
        <div className="text-center">
          <p className="text-lg sm:text-2xl font-bold text-theme-foreground-muted">{collection?.total || 0}</p>
          <p className="text-[10px] sm:text-xs text-theme-foreground-muted">Total</p>
        </div>
      </div>

      {/* Currently Equipped */}
      {equippedBorderId && (
        <div className="p-3 sm:p-4 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-lg sm:rounded-xl">
          <p className="text-[10px] sm:text-xs text-cyan-400 font-medium mb-1.5 sm:mb-2">Currently Equipped</p>
          <div className="flex items-center gap-2 sm:gap-3">
            {borders.find((b: any) => b.id === equippedBorderId) && (
              <>
                <AnimatedBorder
                  border={parseBorderConfig(borders.find((b: any) => b.id === equippedBorderId))}
                  size="md"
                >
                  <div className="w-full h-full bg-gray-700 rounded-full" />
                </AnimatedBorder>
                <div className="min-w-0 flex-1">
                  <p className="text-sm sm:text-base text-white font-medium truncate">
                    {borders.find((b: any) => b.id === equippedBorderId)?.name}
                  </p>
                  <button
                    onClick={() => unequipMutation.mutate()}
                    className="text-[10px] sm:text-xs text-red-400 hover:text-red-300"
                  >
                    Remove
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Border Grid by Tier */}
      {tierOrder.map((tier) => {
        const tierBorders = groupedBorders[tier];
        if (!tierBorders?.length) return null;

        return (
          <div key={tier}>
            <h4 className="text-sm font-medium text-theme-foreground-muted mb-3">
              {tierLabels[tier] || tier} ({tierBorders.length})
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
              {tierBorders.map((border: any) => (
                <div
                  key={border.id}
                  onClick={() => handleBorderClick(border)}
                  className={`
                    relative flex flex-col items-center gap-2 p-3 rounded-xl transition-all
                    ${border.owned ? 'cursor-pointer hover:bg-white/5' : 'opacity-50 cursor-not-allowed'}
                    ${border.isEquipped ? 'bg-white/10 ring-2 ring-cyan-500/50' : ''}
                  `}
                >
                  <AnimatedBorder
                    border={border.owned ? parseBorderConfig(border) : null}
                    size="lg"
                    showBorder={border.owned}
                  >
                    {border.owned ? (
                      <div className="w-full h-full bg-gradient-to-br from-gray-600 to-gray-700 rounded-full flex items-center justify-center">
                        <User className="w-6 h-6 text-gray-400" />
                      </div>
                    ) : (
                      <div className="w-full h-full bg-gray-800 rounded-full flex items-center justify-center">
                        <Lock className="w-6 h-6 text-gray-600" />
                      </div>
                    )}
                  </AnimatedBorder>
                  <p className="text-xs text-center text-theme-foreground-muted truncate w-full">
                    {border.name}
                  </p>
                  {border.isEquipped && (
                    <div className="absolute top-1 right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {borders.length === 0 && (
        <div className="text-center py-8">
          <User className="w-12 h-12 text-theme-foreground-muted mx-auto mb-3 opacity-50" />
          <p className="text-theme-foreground-muted">No borders available yet</p>
          <p className="text-sm text-theme-foreground-muted mt-1">Complete achievements to unlock borders!</p>
        </div>
      )}
    </div>
  );
}

// Loading skeleton
function CollectionSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-20 bg-white/5 rounded-xl animate-pulse" />
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="w-14 h-14 bg-white/5 rounded-full animate-pulse" />
        ))}
      </div>
    </div>
  );
}

export default CustomizationGallery;
