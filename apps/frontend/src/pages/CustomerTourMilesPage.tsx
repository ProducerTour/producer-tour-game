import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gamificationApi } from '../lib/api';
import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import ImpersonationBanner from '../components/ImpersonationBanner';
import AchievementGallery from '../components/gamification/AchievementGallery';
import Leaderboard from '../components/gamification/Leaderboard';
import SocialShareButtons from '../components/gamification/SocialShareButtons';
import LevelUpModal from '../components/gamification/LevelUpModal';
import AchievementUnlockModal from '../components/gamification/AchievementUnlockModal';
import PointsToast from '../components/gamification/PointsToast';
import { CustomizationGallery } from '../components/CustomizationGallery';
import { Trophy, Gift, Users, Calendar, Zap, Sparkles, Target } from 'lucide-react';
import { rewardRedeemedToast, errorToast, checkInToast } from '../lib/toast';

const TIER_THRESHOLDS = {
  BRONZE: 0,
  SILVER: 1000,
  GOLD: 5000,
  DIAMOND: 15000,
  ELITE: 50000
};

const getTierProgress = (points: number, tier: string) => {
  const tiers = ['BRONZE', 'SILVER', 'GOLD', 'DIAMOND', 'ELITE'];
  const currentIndex = tiers.indexOf(tier);

  if (currentIndex === tiers.length - 1) {
    return 100;
  }

  const currentThreshold = TIER_THRESHOLDS[tier as keyof typeof TIER_THRESHOLDS];
  const nextTier = tiers[currentIndex + 1];
  const nextThreshold = TIER_THRESHOLDS[nextTier as keyof typeof TIER_THRESHOLDS];

  const progress = ((points - currentThreshold) / (nextThreshold - currentThreshold)) * 100;
  return Math.min(Math.max(progress, 0), 100);
};

const getNextTier = (tier: string) => {
  const tiers = ['BRONZE', 'SILVER', 'GOLD', 'DIAMOND', 'ELITE'];
  const currentIndex = tiers.indexOf(tier);
  if (currentIndex === tiers.length - 1) return null;
  return tiers[currentIndex + 1];
};

export default function CustomerTourMilesPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'achievements' | 'rewards' | 'leaderboard' | 'customize'>('overview');
  const [showRedemptionModal, setShowRedemptionModal] = useState(false);
  const [selectedReward, setSelectedReward] = useState<any>(null);

  // Celebration modals state
  const [showLevelUpModal, setShowLevelUpModal] = useState(false);
  const [levelUpData, setLevelUpData] = useState<{ newTier: string; previousTier: string; points: number } | null>(null);
  const [showAchievementModal, setShowAchievementModal] = useState(false);
  const [unlockedAchievement, setUnlockedAchievement] = useState<any>(null);
  const [showPointsToast, setShowPointsToast] = useState(false);
  const [toastData, _setToastData] = useState<{ points: number; message: string }>({ points: 0, message: '' });

  // Track sidebar collapse state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('sidebar-collapsed') === 'true';
  });

  useEffect(() => {
    const handleSidebarToggle = (e: CustomEvent<{ isCollapsed: boolean }>) => {
      setSidebarCollapsed(e.detail.isCollapsed);
    };
    window.addEventListener('sidebar-toggle', handleSidebarToggle as EventListener);
    return () => window.removeEventListener('sidebar-toggle', handleSidebarToggle as EventListener);
  }, []);

  const queryClient = useQueryClient();

  const { data: stats, isLoading: _statsLoading } = useQuery({
    queryKey: ['gamification-stats'],
    queryFn: async () => {
      const response = await gamificationApi.getStats();
      return response.data;
    },
  });

  // Filter rewards to only show customer-relevant ones (tool access, badges, etc.)
  const { data: rewards, isLoading: rewardsLoading } = useQuery({
    queryKey: ['gamification-rewards'],
    queryFn: async () => {
      const response = await gamificationApi.getRewards();
      // Filter out writer-only rewards (payouts, commissions, statement processing)
      const customerRewards = response.data.filter((reward: any) => {
        const excludedTypes = ['STATEMENT_PROCESSING', 'PAYOUT_BONUS', 'COMMISSION_BOOST'];
        return !excludedTypes.includes(reward.type);
      });
      return customerRewards;
    },
  });

  const checkInMutation = useMutation({
    mutationFn: () => gamificationApi.checkIn(),
    onSuccess: async (response) => {
      const data = response.data;
      queryClient.invalidateQueries({ queryKey: ['gamification-stats'] });

      // Show check-in toast
      checkInToast(data.points, data.streakDay);

      // Check for level up
      if (data.leveledUp) {
        setLevelUpData({
          newTier: data.newTier,
          previousTier: data.previousTier,
          points: stats?.points || 0,
        });
        setShowLevelUpModal(true);
      }

      // Check for new achievements
      if (data.newAchievements && data.newAchievements.length > 0) {
        setUnlockedAchievement(data.newAchievements[0]);
        setShowAchievementModal(true);
      }
    },
    onError: (error: any) => {
      errorToast(error.response?.data?.error || 'Check-in failed');
    },
  });

  const redeemMutation = useMutation({
    mutationFn: (rewardId: string) => gamificationApi.redeemReward(rewardId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gamification-stats'] });
      queryClient.invalidateQueries({ queryKey: ['gamification-rewards'] });
      queryClient.invalidateQueries({ queryKey: ['user-tool-access'] });
      rewardRedeemedToast(selectedReward?.name, selectedReward?.cost);
      setShowRedemptionModal(false);
      setSelectedReward(null);
    },
    onError: (error: any) => {
      errorToast(error.response?.data?.error || 'Redemption failed');
    },
  });

  const handleRedeemClick = (reward: any) => {
    setSelectedReward(reward);
    setShowRedemptionModal(true);
  };

  const confirmRedemption = () => {
    if (selectedReward) {
      redeemMutation.mutate(selectedReward.id);
    }
  };

  const currentTier = stats?.tier || 'BRONZE';
  const tierProgress = getTierProgress(stats?.points || 0, currentTier);
  const nextTier = getNextTier(currentTier);

  const tierColors: Record<string, { bg: string; border: string; text: string; gradient: string }> = {
    BRONZE: { bg: 'from-amber-700/20 to-amber-900/20', border: 'border-amber-600/40', text: 'text-amber-400', gradient: 'from-amber-600 to-amber-800' },
    SILVER: { bg: 'from-slate-400/20 to-slate-600/20', border: 'border-slate-400/40', text: 'text-slate-300', gradient: 'from-slate-400 to-slate-600' },
    GOLD: { bg: 'from-yellow-500/20 to-amber-500/20', border: 'border-yellow-500/40', text: 'text-yellow-400', gradient: 'from-yellow-400 to-amber-500' },
    DIAMOND: { bg: 'from-blue-400/20 to-purple-500/20', border: 'border-blue-400/40', text: 'text-blue-300', gradient: 'from-blue-400 to-purple-500' },
    ELITE: { bg: 'from-purple-500/20 to-pink-500/20', border: 'border-purple-500/40', text: 'text-purple-300', gradient: 'from-purple-500 to-pink-500' },
  };

  const tierStyle = tierColors[currentTier] || tierColors.BRONZE;

  return (
    <div className="min-h-screen bg-surface">
      {/* Background Effects - Hidden on mobile for performance and better UX */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none hidden md:block">
        <div className="absolute top-0 right-0 w-[600px] h-[400px] bg-amber-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-[100px]" />
      </div>

      <ImpersonationBanner />

      <div className="flex min-h-screen relative">
        <Sidebar />

        <main className={`flex-1 ml-0 ${sidebarCollapsed ? 'md:ml-20' : 'md:ml-64'} transition-all duration-300 overflow-x-hidden overflow-y-auto`}>
          <div className="w-full max-w-full overflow-hidden sm:max-w-7xl sm:mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 pt-16 md:pt-8 pb-24 md:pb-8">

            {/* Mobile Header - Compact */}
            <div className="mb-3 sm:mb-8">
              <h1 className="text-lg sm:text-2xl md:text-3xl font-bold text-white break-words">Tour Miles</h1>
              <p className="text-text-secondary text-xs sm:text-base hidden sm:block">Earn points, unlock rewards, and level up your profile.</p>
            </div>

            {/* Mobile: 2x2 Grid Stats | Desktop: 4-column Grid */}
            <div className="grid grid-cols-2 gap-2 sm:hidden mb-3">
              {/* Tour Miles Balance */}
              <div className={`bg-gradient-to-br ${tierStyle.bg} border ${tierStyle.border} rounded-lg p-2`}>
                <div className="flex items-center gap-1 mb-0.5">
                  <Sparkles className={`w-3 h-3 ${tierStyle.text}`} />
                  <span className={`text-[8px] font-bold uppercase ${tierStyle.text}`}>{currentTier}</span>
                </div>
                <p className="text-base font-bold text-white leading-tight">{stats?.points?.toLocaleString() || 0}</p>
                <p className="text-[9px] text-text-secondary">Tour Miles</p>
                {nextTier && (
                  <div className="mt-0.5">
                    <div className="h-0.5 bg-white/10 rounded-full overflow-hidden">
                      <div className={`h-full bg-gradient-to-r ${tierStyle.gradient}`} style={{ width: `${tierProgress}%` }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Daily Streak */}
              <div className="bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/30 rounded-lg p-2">
                <Zap className="w-3 h-3 text-orange-400 mb-0.5" />
                <p className="text-base font-bold text-white leading-tight">{stats?.currentStreak || 0}</p>
                <p className="text-[9px] text-text-secondary mb-1">Day Streak</p>
                <button
                  onClick={() => checkInMutation.mutate()}
                  disabled={checkInMutation.isPending || stats?.checkedInToday}
                  className={`w-full py-0.5 rounded text-[9px] font-semibold ${
                    stats?.checkedInToday
                      ? 'bg-white/10 text-text-secondary'
                      : 'bg-gradient-to-r from-orange-500 to-red-500 text-white'
                  }`}
                >
                  {stats?.checkedInToday ? '✓' : 'Check In'}
                </button>
              </div>

              {/* Achievements */}
              <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-lg p-2">
                <Trophy className="w-3 h-3 text-purple-400 mb-0.5" />
                <p className="text-base font-bold text-white leading-tight">{stats?.achievementsUnlocked || 0}</p>
                <p className="text-[9px] text-text-secondary">Badges</p>
              </div>

              {/* Rewards */}
              <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-lg p-2">
                <Gift className="w-3 h-3 text-green-400 mb-0.5" />
                <p className="text-base font-bold text-white leading-tight">{rewards?.length || 0}</p>
                <p className="text-[9px] text-text-secondary">Rewards</p>
              </div>
            </div>

            {/* Desktop Stats Grid */}
            <div className="hidden sm:grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {/* Tour Miles Balance */}
              <div className={`bg-gradient-to-br ${tierStyle.bg} border ${tierStyle.border} rounded-2xl p-6`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                    <Sparkles className={`w-6 h-6 ${tierStyle.text}`} />
                  </div>
                  <span className={`text-xs font-bold uppercase tracking-wider ${tierStyle.text}`}>
                    {currentTier}
                  </span>
                </div>
                <p className="text-3xl font-bold text-white mb-1">
                  {stats?.points?.toLocaleString() || 0}
                </p>
                <p className="text-sm text-text-secondary">Tour Miles</p>
                {nextTier && (
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-text-secondary mb-1">
                      <span>Progress to {nextTier}</span>
                      <span>{Math.round(tierProgress)}%</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full bg-gradient-to-r ${tierStyle.gradient} transition-all duration-500`}
                        style={{ width: `${tierProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Daily Streak */}
              <div className="bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/30 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                    <Zap className="w-6 h-6 text-orange-400" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-white mb-1">{stats?.currentStreak || 0}</p>
                <p className="text-sm text-text-secondary">Day Streak</p>
                <button
                  onClick={() => checkInMutation.mutate()}
                  disabled={checkInMutation.isPending || stats?.checkedInToday}
                  className={`mt-4 w-full py-2 px-4 rounded-lg text-sm font-semibold transition-all ${
                    stats?.checkedInToday
                      ? 'bg-white/10 text-text-secondary cursor-not-allowed'
                      : 'bg-gradient-to-r from-orange-500 to-red-500 text-white hover:opacity-90'
                  }`}
                >
                  {checkInMutation.isPending ? 'Checking...' : stats?.checkedInToday ? '✓ Checked In' : 'Daily Check-In (+10 TP)'}
                </button>
              </div>

              {/* Achievements */}
              <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                    <Trophy className="w-6 h-6 text-purple-400" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-white mb-1">{stats?.achievementsUnlocked || 0}</p>
                <p className="text-sm text-text-secondary">Achievements</p>
                <button
                  onClick={() => setActiveTab('achievements')}
                  className="mt-4 w-full py-2 px-4 rounded-lg text-sm font-semibold bg-white/10 text-white hover:bg-white/20 transition-all"
                >
                  View All
                </button>
              </div>

              {/* Rewards Available */}
              <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                    <Gift className="w-6 h-6 text-green-400" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-white mb-1">{rewards?.length || 0}</p>
                <p className="text-sm text-text-secondary">Rewards Available</p>
                <button
                  onClick={() => setActiveTab('rewards')}
                  className="mt-4 w-full py-2 px-4 rounded-lg text-sm font-semibold bg-white/10 text-white hover:bg-white/20 transition-all"
                >
                  Browse Rewards
                </button>
              </div>
            </div>

            {/* Tab Navigation - Mobile: icon only, Desktop: full labels */}
            <div className="flex gap-1 sm:gap-2 mb-2 sm:mb-6 overflow-x-auto scrollbar-hide">
              {(['overview', 'achievements', 'rewards', 'leaderboard', 'customize'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-2 py-1 sm:px-4 sm:py-2 rounded-md sm:rounded-lg text-[10px] sm:text-sm font-medium whitespace-nowrap transition-all flex items-center gap-1 sm:gap-2 flex-shrink-0 ${
                    activeTab === tab
                      ? 'bg-white/15 text-white'
                      : 'text-text-secondary hover:text-white/70'
                  }`}
                >
                  <span className="text-sm sm:text-base">
                    {tab === 'overview' ? '🏠' :
                     tab === 'achievements' ? '🏆' :
                     tab === 'rewards' ? '🎁' :
                     tab === 'leaderboard' ? '📊' :
                     tab === 'customize' ? '🎨' : ''}
                  </span>
                  <span className="hidden sm:inline">{tab.charAt(0).toUpperCase() + tab.slice(1)}</span>
                </button>
              ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
              <div className="space-y-3 sm:space-y-6">
                {/* How to Earn Points */}
                <div className="bg-white/5 border border-white/10 rounded-lg sm:rounded-2xl p-3 sm:p-6">
                  <h2 className="text-sm sm:text-lg font-semibold text-white mb-2 sm:mb-4">How to Earn Tour Miles</h2>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-1.5 sm:gap-4">
                    <div className="bg-white/5 rounded-lg p-2 sm:p-4">
                      <Calendar className="w-4 h-4 sm:w-8 sm:h-8 text-orange-400 mb-1 sm:mb-3" />
                      <h3 className="font-semibold text-white text-[11px] sm:text-base mb-0.5">Check-In</h3>
                      <p className="text-[9px] sm:text-sm text-text-secondary">+10 TP daily</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-2 sm:p-4">
                      <Users className="w-4 h-4 sm:w-8 sm:h-8 text-blue-400 mb-1 sm:mb-3" />
                      <h3 className="font-semibold text-white text-[11px] sm:text-base mb-0.5">Referrals</h3>
                      <p className="text-[9px] sm:text-sm text-text-secondary">+100 TP</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-2 sm:p-4">
                      <Target className="w-4 h-4 sm:w-8 sm:h-8 text-green-400 mb-1 sm:mb-3" />
                      <h3 className="font-semibold text-white text-[11px] sm:text-base mb-0.5">Tools</h3>
                      <p className="text-[9px] sm:text-sm text-text-secondary">Earn TP</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-2 sm:p-4">
                      <Trophy className="w-4 h-4 sm:w-8 sm:h-8 text-purple-400 mb-1 sm:mb-3" />
                      <h3 className="font-semibold text-white text-[11px] sm:text-base mb-0.5">Achieve</h3>
                      <p className="text-[9px] sm:text-sm text-text-secondary">50-500 TP</p>
                    </div>
                  </div>
                </div>

                {/* Referral Section */}
                <div className="bg-white/5 border border-white/10 rounded-lg sm:rounded-2xl p-3 sm:p-6">
                  <h2 className="text-sm sm:text-lg font-semibold text-white mb-2 sm:mb-4">Share & Earn</h2>
                  <SocialShareButtons referralCode={stats?.referralCode} />
                </div>
              </div>
            )}

            {activeTab === 'achievements' && (
              <div className="w-full max-w-full overflow-hidden">
                <AchievementGallery />
              </div>
            )}

            {activeTab === 'rewards' && (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
                {rewardsLoading ? (
                  <div className="col-span-full text-center py-6 sm:py-12">
                    <div className="animate-spin rounded-full h-5 w-5 sm:h-8 sm:w-8 border-b-2 border-brand-blue mx-auto mb-2 sm:mb-4" />
                    <p className="text-text-secondary text-xs sm:text-base">Loading...</p>
                  </div>
                ) : rewards && rewards.length > 0 ? (
                  rewards.map((reward: any) => {
                    const canAfford = (stats?.points || 0) >= reward.cost;
                    const tierLocked = reward.tierRestriction &&
                      ['BRONZE', 'SILVER', 'GOLD', 'DIAMOND', 'ELITE'].indexOf(currentTier) <
                      ['BRONZE', 'SILVER', 'GOLD', 'DIAMOND', 'ELITE'].indexOf(reward.tierRestriction);

                    return (
                      <div
                        key={reward.id}
                        className="bg-white/5 border border-white/10 rounded-lg sm:rounded-2xl p-2 sm:p-6 hover:bg-white/10 transition-all"
                      >
                        <div className="flex items-start justify-between mb-1.5 sm:mb-4">
                          <div className="w-7 h-7 sm:w-12 sm:h-12 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-md sm:rounded-xl flex items-center justify-center">
                            {reward.type === 'TOOL_ACCESS' ? (
                              <Zap className="w-3.5 h-3.5 sm:w-6 sm:h-6 text-amber-400" />
                            ) : (
                              <Gift className="w-3.5 h-3.5 sm:w-6 sm:h-6 text-amber-400" />
                            )}
                          </div>
                          {tierLocked && (
                            <span className="text-[8px] sm:text-xs bg-purple-500/20 text-purple-300 px-1 sm:px-2 py-0.5 rounded-full">
                              {reward.tierRestriction}
                            </span>
                          )}
                        </div>
                        <h3 className="font-semibold text-white text-[11px] sm:text-base mb-0.5 sm:mb-2 line-clamp-1">{reward.name}</h3>
                        <p className="text-[9px] sm:text-sm text-text-secondary mb-2 sm:mb-4 line-clamp-2 hidden sm:block">{reward.description}</p>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
                          <span className="text-amber-400 font-bold text-[10px] sm:text-base">{reward.cost.toLocaleString()} TP</span>
                          <button
                            onClick={() => handleRedeemClick(reward)}
                            disabled={!canAfford || tierLocked || reward.stock === 0}
                            className={`px-2 sm:px-4 py-1 sm:py-2 rounded text-[9px] sm:text-sm font-semibold transition-all ${
                              !canAfford
                                ? 'bg-white/10 text-text-secondary cursor-not-allowed'
                                : tierLocked
                                ? 'bg-purple-500/20 text-purple-300 cursor-not-allowed'
                                : reward.stock === 0
                                ? 'bg-white/10 text-text-secondary cursor-not-allowed'
                                : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:opacity-90'
                            }`}
                          >
                            {!canAfford ? 'Need TP' : tierLocked ? '🔒' : reward.stock === 0 ? 'Out' : 'Redeem'}
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="col-span-full text-center py-6 sm:py-12">
                    <Gift className="w-10 h-10 sm:w-16 sm:h-16 text-text-secondary mx-auto mb-2 sm:mb-4 opacity-50" />
                    <p className="text-text-secondary text-xs sm:text-base">No rewards available.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'leaderboard' && (
              <Leaderboard />
            )}

            {activeTab === 'customize' && (
              <CustomizationGallery />
            )}
          </div>
        </main>
      </div>

      {/* Redemption Modal */}
      {showRedemptionModal && selectedReward && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-white/10 rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">Confirm Redemption</h3>
            <p className="text-text-secondary mb-6">
              Are you sure you want to redeem <span className="text-white font-semibold">{selectedReward.name}</span> for{' '}
              <span className="text-amber-400 font-bold">{selectedReward.cost.toLocaleString()} Tour Miles</span>?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowRedemptionModal(false)}
                className="flex-1 py-3 px-4 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={confirmRedemption}
                disabled={redeemMutation.isPending}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold hover:opacity-90 transition-all disabled:opacity-50"
              >
                {redeemMutation.isPending ? 'Redeeming...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Celebration Modals */}
      {showLevelUpModal && levelUpData && (
        <LevelUpModal
          isOpen={showLevelUpModal}
          onClose={() => setShowLevelUpModal(false)}
          newTier={levelUpData.newTier}
          previousTier={levelUpData.previousTier}
          points={levelUpData.points}
        />
      )}

      {showAchievementModal && unlockedAchievement && (
        <AchievementUnlockModal
          isOpen={showAchievementModal}
          onClose={() => setShowAchievementModal(false)}
          achievement={unlockedAchievement}
        />
      )}

      <PointsToast
        points={toastData.points}
        message={toastData.message}
        isVisible={showPointsToast}
        onClose={() => setShowPointsToast(false)}
      />
    </div>
  );
}
