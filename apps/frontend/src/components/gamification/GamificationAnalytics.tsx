import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp,
  Users,
  Target,
  Award,
  Share2,
  Gift,
  Flame,
  CheckCircle,
  ArrowUp,
  ArrowDown,
  Minus,
  RefreshCw
} from 'lucide-react';

interface AnalyticsDashboard {
  timestamp: string;
  engagement: {
    dau: { count: number; date: string };
    dauTrend: { trend: Array<{ date: string; count: number }>; averageDAU: number };
    participation: { totalUsers: number; participatingUsers: number; rate: number; target: number };
    checkInRate: { totalUsers: number; checkIns: number; rate: number; target: number };
    streaks: {
      totalUsers: number;
      streak7Plus: { count: number; rate: number; target: number };
      streak30Plus: { count: number; rate: number };
      streak100Plus: { count: number; rate: number };
      averageStreak: number;
      longestStreak: number;
    };
  };
  growth: {
    referrals: {
      period: string;
      totalNewUsers: number;
      referralSignups: number;
      referralConversions: number;
      signupRate: number;
      conversionRate: number;
      targets: { signupGrowth: number; conversionRate: number };
      topReferrers: Array<{ userId: string; name: string; referralCount: number; referralConversions: number }>;
    };
    socialShares: {
      period: string;
      totalUsers: number;
      uniqueSharers: number;
      shareRate: number;
      target: number;
      platformBreakdown: Record<string, number>;
      totalShares: number;
    };
  };
  platformHealth: {
    workRegistration: { period: string; currentSubmissions: number; previousSubmissions: number; growth: number; target: number };
    profileCompletion: { totalWriters: number; completeProfiles: number; partialProfiles: number; noProfile: number; completionRate: number; target: number };
    stripeOnboarding: { totalWriters: number; stripeOnboarded: number; stripePending: number; noStripe: number; onboardingRate: number; target: number };
    rewardRedemption: {
      totalUsers: number;
      usersWhoRedeemed: number;
      redemptionRate: number;
      target: number;
      statusBreakdown: Record<string, number>;
      popularRewards: Array<{ rewardId: string; name: string; redemptions: number }>;
    };
  };
  gamification: {
    tierDistribution: { total: number; tiers: Array<{ tier: string; count: number; percentage: number }> };
    achievements: { totalUsers: number; achievements: Array<{ id: string; name: string; category: string; unlockCount: number; unlockRate: number }> };
    pointEconomy: {
      period: string;
      pointsEarned: number;
      pointsSpent: number;
      earnToSpendRatio: number;
      transactions: { earns: number; spends: number };
      circulation: { totalInCirculation: number; totalEverEarned: number; totalEverSpent: number };
      breakdown: Array<{ eventType: string; points: number; count: number }>;
    };
  };
}

const MetricCard = ({
  title,
  value,
  target,
  icon: Icon,
  suffix = '',
  trend
}: {
  title: string;
  value: number | string;
  target?: number;
  icon: any;
  suffix?: string;
  trend?: 'up' | 'down' | 'neutral';
}) => {
  const numValue = typeof value === 'number' ? value : parseFloat(value);
  const meetsTarget = target ? numValue >= target : true;

  return (
    <div className="bg-white/[0.06] rounded-xl p-4 border border-white/[0.08]">
      <div className="flex items-center justify-between mb-2">
        <span className="text-text-muted text-sm">{title}</span>
        <Icon className="w-5 h-5 text-text-muted" />
      </div>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-bold text-white">{value}{suffix}</span>
        {trend && (
          <span className={`flex items-center text-sm ${
            trend === 'up' ? 'text-green-400' : trend === 'down' ? 'text-red-400' : 'text-text-muted'
          }`}>
            {trend === 'up' ? <ArrowUp className="w-4 h-4" /> :
             trend === 'down' ? <ArrowDown className="w-4 h-4" /> :
             <Minus className="w-4 h-4" />}
          </span>
        )}
      </div>
      {target && (
        <div className="mt-2">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-text-muted">Target: {target}{suffix}</span>
            <span className={meetsTarget ? 'text-green-400' : 'text-yellow-400'}>
              {meetsTarget ? 'On Track' : 'Below Target'}
            </span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full ${meetsTarget ? 'bg-green-500' : 'bg-yellow-500'}`}
              style={{ width: `${Math.min(100, (numValue / target) * 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

const TierBadge = ({ tier, count, percentage }: { tier: string; count: number; percentage: number }) => {
  const tierColors: Record<string, string> = {
    BRONZE: 'from-amber-700 to-amber-900 border-amber-600',
    SILVER: 'from-slate-400 to-slate-600 border-slate-300',
    GOLD: 'from-yellow-500 to-yellow-700 border-yellow-400',
    DIAMOND: 'from-cyan-400 to-blue-600 border-cyan-300',
    ELITE: 'from-purple-500 to-pink-600 border-purple-400',
  };

  return (
    <div className={`bg-gradient-to-br ${tierColors[tier] || tierColors.BRONZE} rounded-lg p-3 border`}>
      <div className="text-center">
        <span className="text-lg font-bold text-white">{tier}</span>
        <div className="text-2xl font-black text-white">{count}</div>
        <div className="text-xs text-white/70">{percentage}%</div>
      </div>
    </div>
  );
};

export default function GamificationAnalytics() {
  const { data, isLoading, error, refetch } = useQuery<AnalyticsDashboard>({
    queryKey: ['gamification-analytics'],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/gamification/admin/analytics`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch analytics');
      return response.json();
    },
    refetchInterval: 60000, // Refresh every minute
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
        <p className="text-red-400">Failed to load analytics data</p>
        <button
          onClick={() => refetch()}
          className="mt-2 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30"
        >
          Retry
        </button>
      </div>
    );
  }

  const { engagement, growth, platformHealth, gamification } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Gamification Analytics</h2>
          <p className="text-text-muted text-sm">Last updated: {new Date(data.timestamp).toLocaleString()}</p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/15"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Engagement Metrics */}
      <div className="rounded-2xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/[0.08] p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-400" />
          Engagement Metrics
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            title="Daily Active Users"
            value={engagement.dau.count}
            icon={Users}
            trend={engagement.dauTrend.averageDAU > 0 ? 'up' : 'neutral'}
          />
          <MetricCard
            title="Participation Rate"
            value={engagement.participation.rate}
            target={engagement.participation.target}
            suffix="%"
            icon={Target}
          />
          <MetricCard
            title="Daily Check-In Rate"
            value={engagement.checkInRate.rate}
            target={engagement.checkInRate.target}
            suffix="%"
            icon={CheckCircle}
          />
          <MetricCard
            title="7-Day Streak Rate"
            value={engagement.streaks.streak7Plus.rate}
            target={engagement.streaks.streak7Plus.target}
            suffix="%"
            icon={Flame}
          />
        </div>

        {/* DAU Trend Chart (simple bar representation) */}
        <div className="mt-6">
          <h4 className="text-sm font-medium text-text-muted mb-3">DAU Trend (Last 7 Days)</h4>
          {engagement.dauTrend.trend.length === 0 || engagement.dauTrend.trend.every(d => d.count === 0) ? (
            <div className="h-24 flex items-center justify-center bg-white/[0.03] rounded-lg border border-white/[0.05]">
              <p className="text-text-muted text-sm">No activity data available yet</p>
            </div>
          ) : (
            <div className="flex items-end gap-1 h-24">
              {engagement.dauTrend.trend.map((day, i) => {
                const maxCount = Math.max(...engagement.dauTrend.trend.map(d => d.count), 1);
                const height = (day.count / maxCount) * 100;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs text-blue-400 font-medium">{day.count}</span>
                    <div
                      className="w-full bg-blue-500/50 rounded-t hover:bg-blue-500/70 transition-colors"
                      style={{ height: `${Math.max(height, 8)}%` }}
                      title={`${day.date}: ${day.count} users`}
                    />
                    <span className="text-xs text-text-muted">{day.date.split('-')[2]}</span>
                  </div>
                );
              })}
            </div>
          )}
          <p className="text-sm text-text-muted mt-2">Average: {engagement.dauTrend.averageDAU} users/day</p>
        </div>

        {/* Streak Stats */}
        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="bg-white/[0.06] rounded-lg p-3 border border-white/[0.08] text-center">
            <div className="text-2xl font-bold text-orange-400">{engagement.streaks.streak30Plus.count}</div>
            <div className="text-xs text-text-muted">30+ Day Streaks</div>
          </div>
          <div className="bg-white/[0.06] rounded-lg p-3 border border-white/[0.08] text-center">
            <div className="text-2xl font-bold text-yellow-400">{engagement.streaks.averageStreak}</div>
            <div className="text-xs text-text-muted">Avg Streak Days</div>
          </div>
          <div className="bg-white/[0.06] rounded-lg p-3 border border-white/[0.08] text-center">
            <div className="text-2xl font-bold text-red-400">{engagement.streaks.longestStreak}</div>
            <div className="text-xs text-text-muted">Longest Streak</div>
          </div>
        </div>
      </div>

      {/* Growth Metrics */}
      <div className="rounded-2xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/[0.08] p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-green-400" />
          Growth Metrics
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            title="Referral Signups"
            value={growth.referrals.referralSignups}
            icon={Users}
          />
          <MetricCard
            title="Referral Conversion"
            value={growth.referrals.conversionRate}
            target={growth.referrals.targets.conversionRate}
            suffix="%"
            icon={TrendingUp}
          />
          <MetricCard
            title="Social Share Rate"
            value={growth.socialShares.shareRate}
            target={growth.socialShares.target}
            suffix="%"
            icon={Share2}
          />
          <MetricCard
            title="Total Shares"
            value={growth.socialShares.totalShares}
            icon={Share2}
          />
        </div>

        {/* Top Referrers */}
        {growth.referrals.topReferrers.length > 0 && (
          <div className="mt-6">
            <h4 className="text-sm font-medium text-text-muted mb-3">Top Referrers</h4>
            <div className="space-y-2">
              {growth.referrals.topReferrers.slice(0, 5).map((referrer, i) => (
                <div key={referrer.userId} className="flex items-center justify-between bg-white/[0.06] rounded-lg p-3 border border-white/[0.08]">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-text-muted">#{i + 1}</span>
                    <span className="text-white">{referrer.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-blue-400">{referrer.referralCount} referrals</span>
                    <span className="text-green-400">{referrer.referralConversions} converted</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Social Platform Breakdown */}
        <div className="mt-6">
          <h4 className="text-sm font-medium text-text-muted mb-3">Shares by Platform</h4>
          <div className="grid grid-cols-4 gap-2">
            {Object.entries(growth.socialShares.platformBreakdown).map(([platform, count]) => (
              <div key={platform} className="bg-white/[0.06] rounded-lg p-3 border border-white/[0.08] text-center">
                <div className="text-lg font-bold text-white">{count}</div>
                <div className="text-xs text-text-muted">{platform}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Platform Health */}
      <div className="rounded-2xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/[0.08] p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-purple-400" />
          Platform Health
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            title="Work Submissions Growth"
            value={platformHealth.workRegistration.growth}
            target={platformHealth.workRegistration.target}
            suffix="%"
            icon={TrendingUp}
            trend={platformHealth.workRegistration.growth > 0 ? 'up' : 'down'}
          />
          <MetricCard
            title="Profile Completion"
            value={platformHealth.profileCompletion.completionRate}
            target={platformHealth.profileCompletion.target}
            suffix="%"
            icon={Users}
          />
          <MetricCard
            title="Stripe Onboarding"
            value={platformHealth.stripeOnboarding.onboardingRate}
            suffix="%"
            icon={CheckCircle}
          />
          <MetricCard
            title="Reward Redemption"
            value={platformHealth.rewardRedemption.redemptionRate}
            target={platformHealth.rewardRedemption.target}
            suffix="%"
            icon={Gift}
          />
        </div>

        {/* Popular Rewards */}
        {platformHealth.rewardRedemption.popularRewards.length > 0 && (
          <div className="mt-6">
            <h4 className="text-sm font-medium text-text-muted mb-3">Most Popular Rewards</h4>
            <div className="space-y-2">
              {platformHealth.rewardRedemption.popularRewards.map((reward) => (
                <div key={reward.rewardId} className="flex items-center justify-between bg-white/[0.06] rounded-lg p-3 border border-white/[0.08]">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">🎁</span>
                    <span className="text-white">{reward.name}</span>
                  </div>
                  <span className="text-yellow-400">{reward.redemptions} redeemed</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Tier Distribution & Point Economy */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tier Distribution */}
        <div className="rounded-2xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/[0.08] p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-yellow-400" />
            Tier Distribution
          </h3>
          <div className="grid grid-cols-5 gap-2">
            {gamification.tierDistribution.tiers.map(tier => (
              <TierBadge key={tier.tier} {...tier} />
            ))}
          </div>
          <p className="text-text-muted text-sm mt-4 text-center">
            Total Users: {gamification.tierDistribution.total}
          </p>
        </div>

        {/* Point Economy */}
        <div className="rounded-2xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/[0.08] p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-400" />
            Point Economy (30 Days)
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-text-muted">Points Earned</span>
              <span className="text-green-400 font-bold">+{gamification.pointEconomy.pointsEarned.toLocaleString()} TP</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-text-muted">Points Spent</span>
              <span className="text-red-400 font-bold">-{gamification.pointEconomy.pointsSpent.toLocaleString()} TP</span>
            </div>
            <div className="border-t border-white/[0.08] pt-4">
              <div className="flex justify-between items-center">
                <span className="text-text-muted">In Circulation</span>
                <span className="text-yellow-400 font-bold">{gamification.pointEconomy.circulation.totalInCirculation.toLocaleString()} TP</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-text-muted">Earn:Spend Ratio</span>
              <span className={`font-bold ${gamification.pointEconomy.earnToSpendRatio > 0.3 ? 'text-green-400' : 'text-yellow-400'}`}>
                {gamification.pointEconomy.earnToSpendRatio.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Achievement Unlock Rates */}
      <div className="rounded-2xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/[0.08] p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Award className="w-5 h-5 text-purple-400" />
          Achievement Unlock Rates
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {gamification.achievements.achievements.slice(0, 8).map(achievement => (
            <div key={achievement.id} className="bg-white/[0.06] rounded-lg p-3 border border-white/[0.08]">
              <div className="text-sm font-medium text-white truncate">{achievement.name}</div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-text-muted">{achievement.unlockCount} users</span>
                <span className="text-xs text-purple-400">{achievement.unlockRate}%</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-1 mt-2">
                <div
                  className="h-1 rounded-full bg-purple-500"
                  style={{ width: `${achievement.unlockRate}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
