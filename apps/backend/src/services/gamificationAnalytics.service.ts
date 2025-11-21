import { prisma } from '../lib/prisma';

/**
 * Gamification Analytics Service
 * Tracks KPIs and success metrics for the gamification system
 */

// Helper to get date range
const getDateRange = (days: number) => {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  return { start, end };
};

// Get start of day
const getStartOfDay = (date: Date = new Date()) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

// ==================== ENGAGEMENT METRICS ====================

/**
 * Daily Active Users (DAU)
 * Users who checked in or earned points today
 */
export const getDailyActiveUsers = async (date: Date = new Date()) => {
  const startOfDay = getStartOfDay(date);
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);

  // Users who had any gamification event today
  const activeUsers = await prisma.gamificationEvent.findMany({
    where: {
      createdAt: {
        gte: startOfDay,
        lt: endOfDay,
      },
    },
    select: {
      userId: true,
    },
    distinct: ['userId'],
  });

  return {
    count: activeUsers.length,
    date: startOfDay.toISOString().split('T')[0],
  };
};

/**
 * DAU Trend over time
 */
export const getDAUTrend = async (days: number = 30) => {
  const trend: Array<{ date: string; count: number }> = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dau = await getDailyActiveUsers(date);
    trend.push(dau);
  }

  // Calculate average
  const totalDAU = trend.reduce((sum, day) => sum + day.count, 0);
  const averageDAU = days > 0 ? Math.round(totalDAU / days) : 0;

  return { trend, averageDAU };
};

/**
 * Participation Rate
 * % of active users with at least 1 point earned
 */
export const getParticipationRate = async () => {
  const totalUsers = await prisma.user.count({
    where: { role: 'WRITER' },
  });

  const participatingUsers = await prisma.gamificationPoints.count({
    where: {
      totalEarned: { gt: 0 },
    },
  });

  const rate = totalUsers > 0 ? (participatingUsers / totalUsers) * 100 : 0;

  return {
    totalUsers,
    participatingUsers,
    rate: Math.round(rate * 10) / 10,
    target: 70,
  };
};

/**
 * Daily Check-In Rate
 * % of active users checking in each day
 */
export const getDailyCheckInRate = async (date: Date = new Date()) => {
  const startOfDay = getStartOfDay(date);
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);

  // Total users with gamification initialized
  const totalGamifiedUsers = await prisma.gamificationPoints.count();

  // Users who checked in today
  const checkIns = await prisma.gamificationEvent.count({
    where: {
      eventType: 'DAILY_CHECK_IN',
      createdAt: {
        gte: startOfDay,
        lt: endOfDay,
      },
    },
  });

  const rate = totalGamifiedUsers > 0 ? (checkIns / totalGamifiedUsers) * 100 : 0;

  return {
    totalUsers: totalGamifiedUsers,
    checkIns,
    rate: Math.round(rate * 10) / 10,
    target: 50,
  };
};

/**
 * 7-Day Streak Rate
 * % of users reaching 7-day streak milestone
 */
export const getStreakRates = async () => {
  const totalGamifiedUsers = await prisma.gamificationPoints.count();

  const streakCounts = await prisma.gamificationPoints.groupBy({
    by: ['currentStreak'],
    _count: true,
  });

  // Calculate users at different streak milestones
  const usersWithStreak7Plus = await prisma.gamificationPoints.count({
    where: { currentStreak: { gte: 7 } },
  });

  const usersWithStreak30Plus = await prisma.gamificationPoints.count({
    where: { currentStreak: { gte: 30 } },
  });

  const usersWithStreak100Plus = await prisma.gamificationPoints.count({
    where: { currentStreak: { gte: 100 } },
  });

  const avgStreak = await prisma.gamificationPoints.aggregate({
    _avg: { currentStreak: true },
    _max: { longestStreak: true },
  });

  return {
    totalUsers: totalGamifiedUsers,
    streak7Plus: {
      count: usersWithStreak7Plus,
      rate: totalGamifiedUsers > 0 ? Math.round((usersWithStreak7Plus / totalGamifiedUsers) * 1000) / 10 : 0,
      target: 30,
    },
    streak30Plus: {
      count: usersWithStreak30Plus,
      rate: totalGamifiedUsers > 0 ? Math.round((usersWithStreak30Plus / totalGamifiedUsers) * 1000) / 10 : 0,
    },
    streak100Plus: {
      count: usersWithStreak100Plus,
      rate: totalGamifiedUsers > 0 ? Math.round((usersWithStreak100Plus / totalGamifiedUsers) * 1000) / 10 : 0,
    },
    averageStreak: Math.round((avgStreak._avg.currentStreak || 0) * 10) / 10,
    longestStreak: avgStreak._max.longestStreak || 0,
  };
};

// ==================== GROWTH METRICS ====================

/**
 * Referral Signups
 * Users who signed up via referral link
 */
export const getReferralMetrics = async (days: number = 30) => {
  const { start, end } = getDateRange(days);

  // Total new users in period
  const totalNewUsers = await prisma.user.count({
    where: {
      role: 'WRITER',
      createdAt: {
        gte: start,
        lte: end,
      },
    },
  });

  // Referral signups (users referred by others)
  const referralSignups = await prisma.gamificationEvent.count({
    where: {
      eventType: 'REFERRAL_SIGNUP',
      createdAt: {
        gte: start,
        lte: end,
      },
    },
  });

  // Referral conversions (referred users who became paying)
  const referralConversions = await prisma.gamificationEvent.count({
    where: {
      eventType: 'REFERRAL_CONVERSION',
      createdAt: {
        gte: start,
        lte: end,
      },
    },
  });

  // Top referrers - count REFERRAL_SIGNUP events per referral code owner
  const referralEvents = await prisma.gamificationEvent.groupBy({
    by: ['userId'],
    where: {
      eventType: 'REFERRAL_SIGNUP',
    },
    _count: true,
  });

  // Get user details for top referrers
  const topReferrerIds = referralEvents
    .sort((a, b) => b._count - a._count)
    .slice(0, 10)
    .map(r => r.userId);

  const topReferrerUsers = await prisma.user.findMany({
    where: { id: { in: topReferrerIds } },
    select: { id: true, email: true, firstName: true, lastName: true },
  });

  const userMap = new Map(topReferrerUsers.map(u => [u.id, u]));

  const signupRate = totalNewUsers > 0 ? (referralSignups / totalNewUsers) * 100 : 0;
  const conversionRate = referralSignups > 0 ? (referralConversions / referralSignups) * 100 : 0;

  return {
    period: `${days} days`,
    totalNewUsers,
    referralSignups,
    referralConversions,
    signupRate: Math.round(signupRate * 10) / 10,
    conversionRate: Math.round(conversionRate * 10) / 10,
    targets: {
      signupGrowth: 25,
      conversionRate: 20,
    },
    topReferrers: referralEvents
      .sort((a, b) => b._count - a._count)
      .slice(0, 10)
      .map(r => {
        const user = userMap.get(r.userId);
        return {
          userId: r.userId,
          name: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email : 'Unknown',
          referralCount: r._count,
        };
      }),
  };
};

/**
 * Social Share Rate
 * % of users using social share feature
 */
export const getSocialShareMetrics = async (days: number = 30) => {
  const { start, end } = getDateRange(days);

  const totalGamifiedUsers = await prisma.gamificationPoints.count();

  // Users who shared (grouped by platform)
  const sharesByPlatform = await prisma.gamificationEvent.groupBy({
    by: ['description'],
    where: {
      eventType: 'SOCIAL_SHARE',
      createdAt: {
        gte: start,
        lte: end,
      },
    },
    _count: true,
  });

  // Unique users who shared
  const uniqueSharers = await prisma.gamificationEvent.findMany({
    where: {
      eventType: 'SOCIAL_SHARE',
      createdAt: {
        gte: start,
        lte: end,
      },
    },
    select: { userId: true },
    distinct: ['userId'],
  });

  const shareRate = totalGamifiedUsers > 0 ? (uniqueSharers.length / totalGamifiedUsers) * 100 : 0;

  // Parse platform shares
  const platformShares: Record<string, number> = {};
  sharesByPlatform.forEach(share => {
    const platform = share.description?.replace('Share on ', '') || 'Unknown';
    platformShares[platform] = share._count;
  });

  return {
    period: `${days} days`,
    totalUsers: totalGamifiedUsers,
    uniqueSharers: uniqueSharers.length,
    shareRate: Math.round(shareRate * 10) / 10,
    target: 40,
    platformBreakdown: platformShares,
    totalShares: sharesByPlatform.reduce((sum, s) => sum + s._count, 0),
  };
};

// ==================== PLATFORM HEALTH METRICS ====================

/**
 * Work Registration Metrics
 * Track work/placement submissions
 */
export const getWorkRegistrationMetrics = async (days: number = 30) => {
  const { start, end } = getDateRange(days);
  const previousStart = new Date(start);
  previousStart.setDate(previousStart.getDate() - days);

  // Current period submissions (use WORK_SUBMITTED or count placements)
  const currentSubmissions = await prisma.gamificationEvent.count({
    where: {
      eventType: 'WORK_SUBMITTED',
      createdAt: {
        gte: start,
        lte: end,
      },
    },
  });

  // Previous period submissions
  const previousSubmissions = await prisma.gamificationEvent.count({
    where: {
      eventType: 'WORK_SUBMITTED',
      createdAt: {
        gte: previousStart,
        lt: start,
      },
    },
  });

  // Calculate growth
  const growth = previousSubmissions > 0
    ? ((currentSubmissions - previousSubmissions) / previousSubmissions) * 100
    : currentSubmissions > 0 ? 100 : 0;

  return {
    period: `${days} days`,
    currentSubmissions,
    previousSubmissions,
    growth: Math.round(growth * 10) / 10,
    target: 30,
  };
};

/**
 * Profile Completion Rate
 * % of users with complete profiles
 */
export const getProfileCompletionMetrics = async () => {
  const totalWriters = await prisma.user.count({
    where: { role: 'WRITER' },
  });

  // Check for profile completion (user with firstName, lastName, and producer with IPI)
  const completeProfiles = await prisma.user.count({
    where: {
      role: 'WRITER',
      firstName: { not: null },
      lastName: { not: null },
      producer: {
        writerIpiNumber: { not: null },
      },
    },
  });

  // Partial profiles (have some fields but not all)
  const partialProfiles = await prisma.user.count({
    where: {
      role: 'WRITER',
      OR: [
        { firstName: null },
        { lastName: null },
      ],
    },
  });

  const noProfile = totalWriters - completeProfiles - partialProfiles;
  const completionRate = totalWriters > 0 ? (completeProfiles / totalWriters) * 100 : 0;

  return {
    totalWriters,
    completeProfiles,
    partialProfiles,
    noProfile: Math.max(0, noProfile),
    completionRate: Math.round(completionRate * 10) / 10,
    target: 80,
  };
};

/**
 * Stripe Onboarding Rate
 * % of writers who completed Stripe setup
 */
export const getStripeOnboardingMetrics = async () => {
  const totalWriters = await prisma.user.count({
    where: { role: 'WRITER' },
  });

  const stripeOnboarded = await prisma.user.count({
    where: {
      role: 'WRITER',
      stripeAccountId: { not: null },
      stripeOnboardingComplete: true,
    },
  });

  const stripePending = await prisma.user.count({
    where: {
      role: 'WRITER',
      stripeAccountId: { not: null },
      stripeOnboardingComplete: false,
    },
  });

  const onboardingRate = totalWriters > 0 ? (stripeOnboarded / totalWriters) * 100 : 0;

  return {
    totalWriters,
    stripeOnboarded,
    stripePending,
    noStripe: totalWriters - stripeOnboarded - stripePending,
    onboardingRate: Math.round(onboardingRate * 10) / 10,
    target: 20, // +20% improvement target
  };
};

/**
 * Reward Redemption Rate
 * % of users who redeemed at least one reward
 */
export const getRewardRedemptionMetrics = async () => {
  const totalGamifiedUsers = await prisma.gamificationPoints.count();

  // Unique users who redeemed
  const usersWhoRedeemed = await prisma.rewardRedemption.findMany({
    select: { userId: true },
    distinct: ['userId'],
  });

  // Redemptions by status
  const redemptionsByStatus = await prisma.rewardRedemption.groupBy({
    by: ['status'],
    _count: true,
  });

  // Most popular rewards
  const popularRewards = await prisma.rewardRedemption.groupBy({
    by: ['rewardId'],
    _count: true,
    orderBy: { _count: { rewardId: 'desc' } },
    take: 5,
  });

  // Get reward details
  const rewardIds = popularRewards.map(r => r.rewardId);
  const rewards = await prisma.reward.findMany({
    where: { id: { in: rewardIds } },
  });

  const rewardMap = new Map(rewards.map(r => [r.id, r]));

  const redemptionRate = totalGamifiedUsers > 0
    ? (usersWhoRedeemed.length / totalGamifiedUsers) * 100
    : 0;

  const statusMap: Record<string, number> = {};
  redemptionsByStatus.forEach(s => {
    statusMap[s.status] = s._count;
  });

  return {
    totalUsers: totalGamifiedUsers,
    usersWhoRedeemed: usersWhoRedeemed.length,
    redemptionRate: Math.round(redemptionRate * 10) / 10,
    target: 35,
    statusBreakdown: statusMap,
    popularRewards: popularRewards.map(r => ({
      rewardId: r.rewardId,
      name: rewardMap.get(r.rewardId)?.name || 'Unknown',
      redemptions: r._count,
    })),
  };
};

// ==================== TIER & ACHIEVEMENT METRICS ====================

/**
 * Tier Distribution
 * How users are distributed across tiers
 */
export const getTierDistribution = async () => {
  const distribution = await prisma.gamificationPoints.groupBy({
    by: ['tier'],
    _count: true,
  });

  const total = distribution.reduce((sum, t) => sum + t._count, 0);

  return {
    total,
    tiers: distribution.map(t => ({
      tier: t.tier,
      count: t._count,
      percentage: total > 0 ? Math.round((t._count / total) * 1000) / 10 : 0,
    })),
  };
};

/**
 * Achievement Unlock Rates
 * How many users have unlocked each achievement
 */
export const getAchievementMetrics = async () => {
  const totalGamifiedUsers = await prisma.gamificationPoints.count();

  // Achievement unlock counts
  const achievementCounts = await prisma.userAchievement.groupBy({
    by: ['achievementId'],
    _count: true,
  });

  // Get achievement details
  const achievementIds = achievementCounts.map(a => a.achievementId);
  const achievements = await prisma.achievement.findMany({
    where: { id: { in: achievementIds } },
  });

  const achievementMap = new Map(achievements.map(a => [a.id, a]));

  // Sort by unlock count
  const sorted = achievementCounts.sort((a, b) => b._count - a._count);

  return {
    totalUsers: totalGamifiedUsers,
    achievements: sorted.map(a => {
      const achievement = achievementMap.get(a.achievementId);
      return {
        id: a.achievementId,
        name: achievement?.name || 'Unknown',
        category: achievement?.category,
        unlockCount: a._count,
        unlockRate: totalGamifiedUsers > 0
          ? Math.round((a._count / totalGamifiedUsers) * 1000) / 10
          : 0,
      };
    }),
  };
};

// ==================== POINT ECONOMY METRICS ====================

/**
 * Point Economy Health
 * Balance between points earned and spent
 */
export const getPointEconomyMetrics = async (days: number = 30) => {
  const { start, end } = getDateRange(days);

  // Points earned in period (positive points values)
  const earnedStats = await prisma.gamificationEvent.aggregate({
    where: {
      points: { gt: 0 },
      createdAt: {
        gte: start,
        lte: end,
      },
    },
    _sum: { points: true },
    _count: true,
  });

  // Points spent in period (negative points values)
  const spentStats = await prisma.gamificationEvent.aggregate({
    where: {
      points: { lt: 0 },
      createdAt: {
        gte: start,
        lte: end,
      },
    },
    _sum: { points: true },
    _count: true,
  });

  // Total points in circulation
  const totalPoints = await prisma.gamificationPoints.aggregate({
    _sum: { points: true, totalEarned: true, totalSpent: true },
  });

  // Points by event type (only positive/earning events)
  const pointsByEvent = await prisma.gamificationEvent.groupBy({
    by: ['eventType'],
    where: {
      points: { gt: 0 },
      createdAt: {
        gte: start,
        lte: end,
      },
    },
    _sum: { points: true },
    _count: true,
  });

  const earned = earnedStats._sum.points || 0;
  const spent = Math.abs(spentStats._sum.points || 0); // Make positive for display
  const ratio = earned > 0 ? spent / earned : 0;

  return {
    period: `${days} days`,
    pointsEarned: earned,
    pointsSpent: spent,
    earnToSpendRatio: Math.round(ratio * 100) / 100,
    transactions: {
      earns: earnedStats._count,
      spends: spentStats._count,
    },
    circulation: {
      totalInCirculation: totalPoints._sum.points || 0,
      totalEverEarned: totalPoints._sum.totalEarned || 0,
      totalEverSpent: totalPoints._sum.totalSpent || 0,
    },
    breakdown: pointsByEvent.map(e => ({
      eventType: e.eventType,
      points: e._sum.points || 0,
      count: e._count,
    })),
  };
};

// ==================== COMPREHENSIVE DASHBOARD ====================

/**
 * Get all analytics for admin dashboard
 */
export const getComprehensiveDashboard = async () => {
  const [
    dau,
    dauTrend,
    participation,
    checkInRate,
    streaks,
    referrals,
    socialShares,
    workRegistration,
    profileCompletion,
    stripeOnboarding,
    rewardRedemption,
    tierDistribution,
    achievements,
    pointEconomy,
  ] = await Promise.all([
    getDailyActiveUsers(),
    getDAUTrend(7),
    getParticipationRate(),
    getDailyCheckInRate(),
    getStreakRates(),
    getReferralMetrics(30),
    getSocialShareMetrics(30),
    getWorkRegistrationMetrics(30),
    getProfileCompletionMetrics(),
    getStripeOnboardingMetrics(),
    getRewardRedemptionMetrics(),
    getTierDistribution(),
    getAchievementMetrics(),
    getPointEconomyMetrics(30),
  ]);

  return {
    timestamp: new Date().toISOString(),
    engagement: {
      dau,
      dauTrend,
      participation,
      checkInRate,
      streaks,
    },
    growth: {
      referrals,
      socialShares,
    },
    platformHealth: {
      workRegistration,
      profileCompletion,
      stripeOnboarding,
      rewardRedemption,
    },
    gamification: {
      tierDistribution,
      achievements,
      pointEconomy,
    },
  };
};
