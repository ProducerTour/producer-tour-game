import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gamificationApi, getAuthToken } from '../lib/api';
import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import ImpersonationBanner from '../components/ImpersonationBanner';
import AchievementGallery from '../components/gamification/AchievementGallery';
import Leaderboard from '../components/gamification/Leaderboard';
import SocialShareButtons from '../components/gamification/SocialShareButtons';
import LevelUpModal from '../components/gamification/LevelUpModal';
import AchievementUnlockModal from '../components/gamification/AchievementUnlockModal';
import PointsToast from '../components/gamification/PointsToast';
import { Trophy, Gift, Star, TrendingUp, Users, Calendar, Zap, Award } from 'lucide-react';
import { rewardRedeemedToast, errorToast } from '../lib/toast';

const TIER_COLORS = {
  BRONZE: '#CD7F32',
  SILVER: '#C0C0C0',
  GOLD: '#FFD700',
  DIAMOND: '#B9F2FF',
  ELITE: '#9333EA'
};

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

export default function ProducerTourMilesPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'achievements' | 'rewards' | 'leaderboard'>('overview');
  const [showRedemptionModal, setShowRedemptionModal] = useState(false);
  const [selectedReward, setSelectedReward] = useState<any>(null);

  // Celebration modals state
  const [showLevelUpModal, setShowLevelUpModal] = useState(false);
  const [levelUpData, setLevelUpData] = useState<{ newTier: string; previousTier: string; points: number } | null>(null);
  const [showAchievementModal, setShowAchievementModal] = useState(false);
  const [unlockedAchievement, setUnlockedAchievement] = useState<any>(null);
  const [showPointsToast, setShowPointsToast] = useState(false);
  const [toastData, setToastData] = useState<{ points: number; message: string }>({ points: 0, message: '' });

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

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['gamification-stats'],
    queryFn: async () => {
      const response = await gamificationApi.getStats();
      return response.data;
    },
  });

  const { data: rewards, isLoading: rewardsLoading } = useQuery({
    queryKey: ['gamification-rewards'],
    queryFn: async () => {
      const response = await gamificationApi.getRewards();
      return response.data;
    },
  });

  const checkInMutation = useMutation({
    mutationFn: () => gamificationApi.checkIn(),
    onSuccess: async (response) => {
      const previousTier = stats?.tier;

      // Invalidate and refetch stats
      await queryClient.invalidateQueries({ queryKey: ['gamification-stats'] });
      const updatedStats = queryClient.getQueryData(['gamification-stats']) as any;

      // Show points toast
      const pointsEarned = response.data?.pointsEarned || 10;
      setToastData({ points: pointsEarned, message: 'Daily check-in complete!' });
      setShowPointsToast(true);

      // Check for tier upgrade
      if (updatedStats && previousTier && updatedStats.tier !== previousTier) {
        setTimeout(() => {
          setLevelUpData({
            newTier: updatedStats.tier,
            previousTier: previousTier,
            points: updatedStats.points,
          });
          setShowLevelUpModal(true);
        }, 1000);
      }

      // Check for newly unlocked achievements
      checkForAchievements();
    },
  });

  const redeemMutation = useMutation({
    mutationFn: (rewardId: string) => gamificationApi.redeemReward(rewardId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gamification-stats'] });
      queryClient.invalidateQueries({ queryKey: ['gamification-rewards'] });
      // Show toast notification
      if (selectedReward) {
        rewardRedeemedToast(selectedReward.name, selectedReward.cost);
      }
      setShowRedemptionModal(false);
      setSelectedReward(null);
    },
    onError: () => {
      errorToast('Failed to redeem reward. Please try again.');
    },
  });

  // Check for newly unlocked achievements
  const checkForAchievements = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/gamification/achievements/check`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${getAuthToken()}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.newlyUnlocked && data.newlyUnlocked.length > 0) {
          // Show first unlocked achievement
          const achievement = data.newlyUnlocked[0];
          setTimeout(() => {
            setUnlockedAchievement(achievement);
            setShowAchievementModal(true);
          }, showLevelUpModal ? 4000 : 1500); // Delay if level-up modal is showing

          // Invalidate achievements query
          queryClient.invalidateQueries({ queryKey: ['gamification-stats'] });
        }
      }
    } catch (error) {
      console.error('Error checking achievements:', error);
    }
  };

  const handleCheckIn = async () => {
    try {
      await checkInMutation.mutateAsync();
    } catch (error: any) {
      console.error('Check-in error:', error);
    }
  };

  const handleRedeemReward = (reward: any) => {
    setSelectedReward(reward);
    setShowRedemptionModal(true);
  };

  const confirmRedemption = async () => {
    if (selectedReward) {
      try {
        await redeemMutation.mutateAsync(selectedReward.id);
      } catch (error: any) {
        console.error('Redemption error:', error);
      }
    }
  };

  const nextTier = stats ? getNextTier(stats.tier) : null;
  const progress = stats ? getTierProgress(stats.points, stats.tier) : 0;
  const pointsToNextTier = nextTier && stats ? TIER_THRESHOLDS[nextTier as keyof typeof TIER_THRESHOLDS] - stats.points : 0;

  return (
    <div className="flex h-screen bg-surface overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-0 right-0 w-[600px] h-[400px] bg-brand-blue/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 left-0 w-[300px] h-[300px] bg-amber-500/5 rounded-full blur-[80px]" />
      </div>

      <Sidebar />
      <div className={`flex-1 ml-0 ${sidebarCollapsed ? 'md:ml-20' : 'md:ml-64'} flex flex-col min-h-0 relative z-10 transition-all duration-300`}>
        <ImpersonationBanner />
        <div className="flex-1 overflow-y-auto p-4 md:p-8 pt-20 md:pt-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Producer Tour Miles</h1>
            <p className="text-gray-400">Earn points, unlock rewards, and level up your producer journey</p>
          </div>

          {/* Stats Cards */}
          {!statsLoading && stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {/* Points Card */}
              <div className="rounded-2xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/[0.08] backdrop-blur-sm p-6 border-l-4" style={{ borderLeftColor: TIER_COLORS[stats.tier as keyof typeof TIER_COLORS] }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-400">Tour Points</span>
                  <Star className="w-5 h-5" style={{ color: TIER_COLORS[stats.tier as keyof typeof TIER_COLORS] }} />
                </div>
                <div className="text-3xl font-bold text-white">{stats.points.toLocaleString()}</div>
                <div className="text-xs text-gray-500 mt-1">Lifetime: {stats.totalEarned.toLocaleString()} TP</div>
              </div>

              {/* Tier Card */}
              <div className="rounded-2xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/[0.08] backdrop-blur-sm p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-400">Current Tier</span>
                  <Trophy className="w-5 h-5" style={{ color: TIER_COLORS[stats.tier as keyof typeof TIER_COLORS] }} />
                </div>
                <div className="text-2xl font-bold" style={{ color: TIER_COLORS[stats.tier as keyof typeof TIER_COLORS] }}>
                  {stats.tier}
                </div>
                {nextTier && (
                  <>
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>Progress to {nextTier}</span>
                        <span>{progress.toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-white/10 rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all duration-500"
                          style={{
                            width: `${progress}%`,
                            backgroundColor: TIER_COLORS[nextTier as keyof typeof TIER_COLORS]
                          }}
                        />
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                      {pointsToNextTier.toLocaleString()} TP until {nextTier}
                    </div>
                  </>
                )}
              </div>

              {/* Streak Card */}
              <div className="rounded-2xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/[0.08] backdrop-blur-sm p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-400">Check-in Streak</span>
                  <Zap className="w-5 h-5 text-orange-400" />
                </div>
                <div className="text-3xl font-bold text-white">{stats.currentStreak}</div>
                <div className="text-xs text-gray-500 mt-1">Longest: {stats.longestStreak} days</div>
                {stats.canCheckInToday && (
                  <button
                    onClick={handleCheckIn}
                    disabled={checkInMutation.isPending}
                    className="mt-3 w-full px-3 py-2 bg-brand-blue text-white text-sm font-medium rounded-lg hover:bg-brand-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {checkInMutation.isPending ? 'Checking in...' : 'Check In Today (+10 TP)'}
                  </button>
                )}
                {!stats.canCheckInToday && (
                  <div className="mt-3 text-center text-xs text-emerald-400 font-medium">
                    ✓ Checked in today
                  </div>
                )}
              </div>

              {/* Achievements Card */}
              <div className="rounded-2xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/[0.08] backdrop-blur-sm p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-400">Achievements</span>
                  <Award className="w-5 h-5 text-purple-400" />
                </div>
                <div className="text-3xl font-bold text-white">{stats.achievementsUnlocked}</div>
                <div className="text-xs text-gray-500 mt-1">Unlocked</div>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="rounded-2xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/[0.08] backdrop-blur-sm mb-6">
            <div className="border-b border-white/[0.08]">
              <nav className="flex -mb-px">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'overview'
                      ? 'border-brand-blue text-brand-blue'
                      : 'border-transparent text-gray-400 hover:text-white hover:border-white/30'
                  }`}
                >
                  <TrendingUp className="w-4 h-4 inline-block mr-2" />
                  Overview
                </button>
                <button
                  onClick={() => setActiveTab('achievements')}
                  className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'achievements'
                      ? 'border-brand-blue text-brand-blue'
                      : 'border-transparent text-gray-400 hover:text-white hover:border-white/30'
                  }`}
                >
                  <Award className="w-4 h-4 inline-block mr-2" />
                  Achievements
                </button>
                <button
                  onClick={() => setActiveTab('rewards')}
                  className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'rewards'
                      ? 'border-brand-blue text-brand-blue'
                      : 'border-transparent text-gray-400 hover:text-white hover:border-white/30'
                  }`}
                >
                  <Gift className="w-4 h-4 inline-block mr-2" />
                  Rewards Store
                </button>
                <button
                  onClick={() => setActiveTab('leaderboard')}
                  className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'leaderboard'
                      ? 'border-brand-blue text-brand-blue'
                      : 'border-transparent text-gray-400 hover:text-white hover:border-white/30'
                  }`}
                >
                  <Users className="w-4 h-4 inline-block mr-2" />
                  Leaderboard
                </button>
              </nav>
            </div>

            <div className="p-6">
              {/* Overview Tab */}
              {activeTab === 'overview' && !statsLoading && stats && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">How to Earn Points</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-start p-4 bg-white/[0.04] border border-white/[0.06] rounded-xl">
                        <Calendar className="w-5 h-5 text-brand-blue mt-1 mr-3 flex-shrink-0" />
                        <div>
                          <div className="font-medium text-white">Daily Check-in</div>
                          <div className="text-sm text-gray-400">+10 TP per day</div>
                          <div className="text-xs text-gray-500 mt-1">Bonus: +50 TP at 7 days, +200 TP at 30 days</div>
                        </div>
                      </div>
                      <div className="flex items-start p-4 bg-white/[0.04] border border-white/[0.06] rounded-xl">
                        <Users className="w-5 h-5 text-emerald-400 mt-1 mr-3 flex-shrink-0" />
                        <div>
                          <div className="font-medium text-white">Referrals</div>
                          <div className="text-sm text-gray-400">+100 TP per signup, +250 TP per conversion</div>
                          <div className="text-xs text-gray-500 mt-1">Your code: <span className="font-mono font-bold text-brand-blue">{stats.referralCode}</span></div>
                        </div>
                      </div>
                      <div className="flex items-start p-4 bg-white/[0.04] border border-white/[0.06] rounded-xl">
                        <Star className="w-5 h-5 text-purple-400 mt-1 mr-3 flex-shrink-0" />
                        <div>
                          <div className="font-medium text-white">Platform Activity</div>
                          <div className="text-sm text-gray-400">Earn points for engagement</div>
                          <div className="text-xs text-gray-500 mt-1">Work submissions, payouts, feedback</div>
                        </div>
                      </div>
                      <div className="flex items-start p-4 bg-white/[0.04] border border-white/[0.06] rounded-xl">
                        <Trophy className="w-5 h-5 text-amber-400 mt-1 mr-3 flex-shrink-0" />
                        <div>
                          <div className="font-medium text-white">Achievements</div>
                          <div className="text-sm text-gray-400">Unlock achievements for milestones</div>
                          <div className="text-xs text-gray-500 mt-1">50-2500 TP per achievement</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Social Sharing */}
                  <div className="mb-6">
                    <SocialShareButtons referralCode={stats.referralCode} />
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
                    {stats.recentEvents && stats.recentEvents.length > 0 ? (
                      <div className="space-y-2">
                        {stats.recentEvents.map((event: any) => (
                          <div key={event.id} className="flex items-center justify-between p-3 bg-white/[0.04] border border-white/[0.06] rounded-xl">
                            <div>
                              <div className="text-sm font-medium text-white">{event.description || event.eventType}</div>
                              <div className="text-xs text-gray-500">{new Date(event.createdAt).toLocaleDateString()}</div>
                            </div>
                            <div className={`text-sm font-bold ${event.points >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              {event.points >= 0 ? '+' : ''}{event.points} TP
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <p>No recent activity. Start earning points today!</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Achievements Tab */}
              {activeTab === 'achievements' && (
                <AchievementGallery />
              )}

              {/* Rewards Tab */}
              {activeTab === 'rewards' && !rewardsLoading && rewards && (
                <div>
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-white mb-2">Redeem Your Points</h3>
                    <p className="text-sm text-gray-400">Browse available rewards and redeem with your Tour Points</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {rewards.map((reward: any) => (
                      <div key={reward.id} className={`rounded-xl p-4 border ${reward.canRedeem ? 'bg-white/[0.04] border-white/[0.08]' : 'bg-white/[0.02] border-white/[0.04] opacity-60'}`}>
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-semibold text-white">{reward.name}</h4>
                            <p className="text-xs text-gray-400 mt-1">{reward.description}</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-4">
                          <div className="text-lg font-bold text-brand-blue">{reward.cost.toLocaleString()} TP</div>
                          <button
                            onClick={() => handleRedeemReward(reward)}
                            disabled={!reward.canRedeem || redeemMutation.isPending}
                            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                              reward.canRedeem
                                ? 'bg-brand-blue text-white hover:bg-brand-blue/90'
                                : 'bg-white/10 text-gray-500 cursor-not-allowed'
                            }`}
                          >
                            {!reward.canAfford ? 'Insufficient Points' : !reward.tierAllowed ? 'Tier Locked' : !reward.inStock ? 'Out of Stock' : 'Redeem'}
                          </button>
                        </div>

                        {reward.tierRestriction && (
                          <div className="mt-2 text-xs text-gray-500">
                            Requires: <span className="font-semibold" style={{ color: TIER_COLORS[reward.tierRestriction as keyof typeof TIER_COLORS] }}>{reward.tierRestriction}</span> tier
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Leaderboard Tab */}
              {activeTab === 'leaderboard' && (
                <Leaderboard />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Redemption Confirmation Modal */}
      {showRedemptionModal && selectedReward && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface-elevated border border-white/[0.08] rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4">Confirm Redemption</h3>
            <p className="text-gray-400 mb-6">
              Are you sure you want to redeem <span className="font-semibold text-white">{selectedReward.name}</span> for{' '}
              <span className="font-bold text-brand-blue">{selectedReward.cost.toLocaleString()} TP</span>?
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowRedemptionModal(false);
                  setSelectedReward(null);
                }}
                className="flex-1 px-4 py-2 border border-white/[0.15] text-gray-300 font-medium rounded-lg hover:bg-white/[0.05] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmRedemption}
                disabled={redeemMutation.isPending}
                className="flex-1 px-4 py-2 bg-brand-blue text-white font-medium rounded-lg hover:bg-brand-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {redeemMutation.isPending ? 'Redeeming...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Level Up Modal */}
      {levelUpData && (
        <LevelUpModal
          isOpen={showLevelUpModal}
          newTier={levelUpData.newTier}
          previousTier={levelUpData.previousTier}
          points={levelUpData.points}
          onClose={() => {
            setShowLevelUpModal(false);
            setLevelUpData(null);
          }}
        />
      )}

      {/* Achievement Unlock Modal */}
      {unlockedAchievement && (
        <AchievementUnlockModal
          isOpen={showAchievementModal}
          achievement={unlockedAchievement.achievement}
          onClose={() => {
            setShowAchievementModal(false);
            setUnlockedAchievement(null);
          }}
        />
      )}

      {/* Points Toast */}
      <PointsToast
        points={toastData.points}
        message={toastData.message}
        isVisible={showPointsToast}
        onClose={() => setShowPointsToast(false)}
      />
    </div>
  );
}
