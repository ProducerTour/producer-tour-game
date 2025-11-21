import { prisma } from '../lib/prisma';
import {
  GamificationTier,
  GamificationEventType,
  AchievementCategory,
  RewardCategory,
  RedemptionStatus
} from '../generated/client';

// Helper function to generate unique referral code
const generateReferralCode = async (): Promise<string> => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  let isUnique = false;

  while (!isUnique) {
    code = '';
    for (let i = 0; i < 8; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }

    const existing = await prisma.gamificationPoints.findUnique({
      where: { referralCode: code }
    });

    if (!existing) {
      isUnique = true;
    }
  }

  return code;
};

// Calculate tier based on points
const calculateTier = (points: number): GamificationTier => {
  if (points >= 50000) return 'ELITE';
  if (points >= 15000) return 'DIAMOND';
  if (points >= 5000) return 'GOLD';
  if (points >= 1000) return 'SILVER';
  return 'BRONZE';
};

// Initialize gamification for a new user
export const initializeUserGamification = async (userId: string) => {
  const existing = await prisma.gamificationPoints.findUnique({
    where: { userId }
  });

  if (existing) {
    return existing;
  }

  const referralCode = await generateReferralCode();

  return await prisma.gamificationPoints.create({
    data: {
      userId,
      referralCode,
      points: 0,
      totalEarned: 0,
      totalSpent: 0,
      tier: 'BRONZE',
      currentStreak: 0,
      longestStreak: 0
    }
  });
};

// Award points to a user
export const awardPoints = async (
  userId: string,
  eventType: GamificationEventType,
  points: number,
  description?: string,
  metadata?: any,
  adminId?: string,
  adminReason?: string
) => {
  await initializeUserGamification(userId);

  const [updatedPoints, event] = await prisma.$transaction(async (tx) => {
    const current = await tx.gamificationPoints.findUnique({
      where: { userId }
    });

    if (!current) {
      throw new Error('User gamification not found');
    }

    const newTotalEarned = current.totalEarned + points;
    const newPoints = current.points + points;
    const newTier = calculateTier(newPoints);
    const tierChanged = newTier !== current.tier;

    const updated = await tx.gamificationPoints.update({
      where: { userId },
      data: {
        points: newPoints,
        totalEarned: newTotalEarned,
        tier: newTier
      }
    });

    const eventRecord = await tx.gamificationEvent.create({
      data: {
        userId,
        eventType,
        points,
        description,
        metadata,
        adminId,
        adminReason
      }
    });

    if (tierChanged) {
      await tx.gamificationEvent.create({
        data: {
          userId,
          eventType: 'LEVEL_UP',
          points: 0,
          description: `Leveled up to ${newTier}`,
          metadata: { previousTier: current.tier, newTier }
        }
      });
    }

    return [updated, eventRecord];
  });

  return { updatedPoints, event };
};

// Deduct points from a user
export const deductPoints = async (
  userId: string,
  eventType: GamificationEventType,
  points: number,
  description?: string,
  metadata?: any,
  adminId?: string,
  adminReason?: string
) => {
  const [updatedPoints, event] = await prisma.$transaction(async (tx) => {
    const current = await tx.gamificationPoints.findUnique({
      where: { userId }
    });

    if (!current) {
      throw new Error('User gamification not found');
    }

    if (current.points < points) {
      throw new Error('Insufficient points');
    }

    const newTotalSpent = current.totalSpent + points;
    const newPoints = current.points - points;
    const newTier = calculateTier(newPoints);

    const updated = await tx.gamificationPoints.update({
      where: { userId },
      data: {
        points: newPoints,
        totalSpent: newTotalSpent,
        tier: newTier
      }
    });

    const eventRecord = await tx.gamificationEvent.create({
      data: {
        userId,
        eventType,
        points: -points,
        description,
        metadata,
        adminId,
        adminReason
      }
    });

    return [updated, eventRecord];
  });

  return { updatedPoints, event };
};

// Daily check-in
export const dailyCheckIn = async (userId: string) => {
  await initializeUserGamification(userId);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const existingCheckIn = await prisma.dailyCheckIn.findFirst({
    where: {
      userId,
      checkInDate: today
    }
  });

  if (existingCheckIn) {
    return {
      success: false,
      message: 'Already checked in today',
      checkIn: existingCheckIn
    };
  }

  const gamificationPoints = await prisma.gamificationPoints.findUnique({
    where: { userId }
  });

  if (!gamificationPoints) {
    throw new Error('User gamification not found');
  }

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const yesterdayCheckIn = await prisma.dailyCheckIn.findFirst({
    where: {
      userId,
      checkInDate: yesterday
    }
  });

  let newStreak = 1;
  let basePoints = 10;

  if (yesterdayCheckIn) {
    newStreak = gamificationPoints.currentStreak + 1;
  }

  let bonusPoints = 0;
  let bonusDescription = '';

  if (newStreak === 7) {
    bonusPoints = 50;
    bonusDescription = 'Weekly streak bonus!';
  } else if (newStreak === 30) {
    bonusPoints = 200;
    bonusDescription = 'Monthly streak bonus!';
  }

  const totalPoints = basePoints + bonusPoints;

  const [checkIn, updatedGamification] = await prisma.$transaction(async (tx) => {
    const checkInRecord = await tx.dailyCheckIn.create({
      data: {
        userId,
        checkInDate: today,
        pointsEarned: totalPoints,
        streakDay: newStreak
      }
    });

    const newPoints = gamificationPoints.points + totalPoints;
    const newTier = calculateTier(newPoints);

    const updated = await tx.gamificationPoints.update({
      where: { userId },
      data: {
        points: newPoints,
        totalEarned: gamificationPoints.totalEarned + totalPoints,
        currentStreak: newStreak,
        longestStreak: Math.max(newStreak, gamificationPoints.longestStreak),
        lastCheckIn: new Date(),
        tier: newTier
      }
    });

    await tx.gamificationEvent.create({
      data: {
        userId,
        eventType: 'DAILY_CHECK_IN',
        points: basePoints,
        description: `Daily check-in (${newStreak} day streak)`
      }
    });

    if (bonusPoints > 0) {
      const bonusEventType = newStreak === 7 ? 'WEEKLY_STREAK_BONUS' : 'MONTHLY_STREAK_BONUS';
      await tx.gamificationEvent.create({
        data: {
          userId,
          eventType: bonusEventType,
          points: bonusPoints,
          description: bonusDescription
        }
      });
    }

    return [checkInRecord, updated];
  });

  return {
    success: true,
    message: bonusPoints > 0 ? bonusDescription : 'Check-in successful!',
    checkIn,
    pointsEarned: totalPoints,
    streak: newStreak,
    gamificationPoints: updatedGamification
  };
};

// Get user gamification stats
export const getUserStats = async (userId: string) => {
  await initializeUserGamification(userId);

  const gamificationPoints = await prisma.gamificationPoints.findUnique({
    where: { userId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true
        }
      }
    }
  });

  const achievementsCount = await prisma.userAchievement.count({
    where: { userId }
  });

  const recentEvents = await prisma.gamificationEvent.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 10
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const canCheckInToday = !(await prisma.dailyCheckIn.findFirst({
    where: {
      userId,
      checkInDate: today
    }
  }));

  return {
    ...gamificationPoints,
    achievementsUnlocked: achievementsCount,
    recentEvents,
    canCheckInToday
  };
};

// Get leaderboard
export const getLeaderboard = async (limit: number = 10, tier?: GamificationTier) => {
  const where = tier ? { tier } : {};

  const topUsers = await prisma.gamificationPoints.findMany({
    where,
    orderBy: { points: 'desc' },
    take: limit,
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          role: true
        }
      }
    }
  });

  return topUsers;
};

// Redeem a reward
export const redeemReward = async (userId: string, rewardId: string) => {
  await initializeUserGamification(userId);

  const [reward, userPoints, user] = await Promise.all([
    prisma.reward.findUnique({ where: { id: rewardId } }),
    prisma.gamificationPoints.findUnique({ where: { userId } }),
    prisma.user.findUnique({ where: { id: userId } })
  ]);

  if (!reward || !reward.isActive) {
    throw new Error('Reward not found or not available');
  }

  if (!userPoints) {
    throw new Error('User gamification not found');
  }

  if (!user) {
    throw new Error('User not found');
  }

  if (userPoints.points < reward.cost) {
    throw new Error('Insufficient points');
  }

  if (reward.tierRestriction && userPoints.tier !== reward.tierRestriction) {
    const tierOrder = ['BRONZE', 'SILVER', 'GOLD', 'DIAMOND', 'ELITE'];
    const userTierIndex = tierOrder.indexOf(userPoints.tier);
    const requiredTierIndex = tierOrder.indexOf(reward.tierRestriction);

    if (userTierIndex < requiredTierIndex) {
      throw new Error(`This reward requires ${reward.tierRestriction} tier`);
    }
  }

  if (reward.roleRestriction && user.role !== reward.roleRestriction) {
    throw new Error(`This reward is only available to ${reward.roleRestriction} users`);
  }

  if (reward.inventory !== null && reward.inventory <= 0) {
    throw new Error('Reward out of stock');
  }

  const redemption = await prisma.$transaction(async (tx) => {
    const newPoints = userPoints.points - reward.cost;
    const newTier = calculateTier(newPoints);

    await tx.gamificationPoints.update({
      where: { userId },
      data: {
        points: newPoints,
        totalSpent: userPoints.totalSpent + reward.cost,
        tier: newTier
      }
    });

    if (reward.inventory !== null) {
      await tx.reward.update({
        where: { id: rewardId },
        data: { inventory: reward.inventory - 1 }
      });
    }

    // Auto-approve digital rewards (commission reduction, payout speed)
    // Physical items require admin approval
    const isAutoApproved = reward.type === 'COMMISSION_REDUCTION' || reward.type === 'PAYOUT_SPEED';
    let expiresAt: Date | undefined;

    if (isAutoApproved && reward.metadata) {
      const metadata = reward.metadata as any;
      const durationDays = metadata.durationDays || 30;
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + durationDays);
    }

    const redemptionRecord = await tx.rewardRedemption.create({
      data: {
        userId,
        rewardId,
        pointsCost: reward.cost,
        status: isAutoApproved ? 'APPROVED' : 'PENDING',
        expiresAt,
        isActive: isAutoApproved
      },
      include: {
        reward: true
      }
    });

    await tx.gamificationEvent.create({
      data: {
        userId,
        eventType: 'REWARD_REDEEMED',
        points: -reward.cost,
        description: `Redeemed: ${reward.name}`,
        metadata: { rewardId, redemptionId: redemptionRecord.id }
      }
    });

    return redemptionRecord;
  });

  return redemption;
};

// Get available rewards for user
export const getAvailableRewards = async (userId: string) => {
  const userPoints = await prisma.gamificationPoints.findUnique({
    where: { userId }
  });

  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!userPoints || !user) {
    return [];
  }

  const rewards = await prisma.reward.findMany({
    where: {
      isActive: true,
      OR: [
        { roleRestriction: null },
        { roleRestriction: user.role }
      ]
    },
    orderBy: { cost: 'asc' }
  });

  const tierOrder = ['BRONZE', 'SILVER', 'GOLD', 'DIAMOND', 'ELITE'];
  const userTierIndex = tierOrder.indexOf(userPoints.tier);

  return rewards.map(reward => {
    const canAfford = userPoints.points >= reward.cost;
    const inStock = reward.inventory === null || reward.inventory > 0;

    let tierAllowed = true;
    if (reward.tierRestriction) {
      const requiredTierIndex = tierOrder.indexOf(reward.tierRestriction);
      tierAllowed = userTierIndex >= requiredTierIndex;
    }

    const canRedeem = canAfford && inStock && tierAllowed;

    return {
      ...reward,
      canAfford,
      inStock,
      tierAllowed,
      canRedeem
    };
  });
};

// Track social share
export const trackSocialShare = async (
  userId: string,
  platform: string
) => {
  const existing = await prisma.socialShare.findFirst({
    where: { userId, platform }
  });

  if (existing) {
    return await prisma.socialShare.update({
      where: { id: existing.id },
      data: { lastUsedAt: new Date() }
    });
  }

  const share = await prisma.socialShare.create({
    data: {
      userId,
      platform
    }
  });

  await awardPoints(
    userId,
    'SOCIAL_SHARE',
    50,
    `Shared on ${platform}`
  );

  return share;
};

// Record referral signup (when someone uses a referral code)
export const recordReferralSignup = async (referralCode: string, newUserId: string) => {
  const referrer = await prisma.gamificationPoints.findUnique({
    where: { referralCode }
  });

  if (!referrer) {
    return null;
  }

  await awardPoints(
    referrer.userId,
    'REFERRAL_SIGNUP',
    100,
    'New user signed up with your referral code',
    { newUserId, referralCode }
  );

  return referrer;
};

// Record referral conversion (when referred user makes first payment/contribution)
export const recordReferralConversion = async (userId: string) => {
  const referredUserPoints = await prisma.gamificationPoints.findUnique({
    where: { userId }
  });

  if (!referredUserPoints) {
    return null;
  }

  const signupEvent = await prisma.gamificationEvent.findFirst({
    where: {
      eventType: 'REFERRAL_SIGNUP',
      metadata: {
        path: ['newUserId'],
        equals: userId
      }
    }
  });

  if (!signupEvent) {
    return null;
  }

  await awardPoints(
    signupEvent.userId,
    'REFERRAL_CONVERSION',
    250,
    'Referred user made their first contribution',
    { convertedUserId: userId }
  );

  return signupEvent;
};

// Check and unlock achievements for a user
export const checkAchievements = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      gamificationPoints: true,
      achievements: {
        include: { achievement: true }
      },
      dailyCheckIns: true,
      gamificationEvents: true,
      socialShares: true
    }
  });

  if (!user || !user.gamificationPoints) {
    return [];
  }

  const allAchievements = await prisma.achievement.findMany({
    where: { isActive: true }
  });

  const unlockedAchievementIds = user.achievements.map(a => a.achievementId);
  const newlyUnlocked: any[] = [];

  for (const achievement of allAchievements) {
    if (unlockedAchievementIds.includes(achievement.id)) {
      continue;
    }

    let unlocked = false;
    const criteria: any = achievement.criteria;

    switch (criteria.type) {
      case 'check_in_streak':
        unlocked = user.gamificationPoints.currentStreak >= criteria.requiredStreak;
        break;

      case 'social_share_count':
        unlocked = user.socialShares.length >= criteria.requiredShares;
        break;

      case 'referral_count':
        const referralCount = user.gamificationEvents.filter(
          e => e.eventType === 'REFERRAL_SIGNUP'
        ).length;
        unlocked = referralCount >= criteria.requiredReferrals;
        break;

      case 'profile_complete':
        unlocked = !!(user.firstName && user.lastName && user.email);
        break;

      case 'stripe_connected':
        unlocked = !!user.stripeOnboardingComplete;
        break;

      case 'first_work_submission':
        const workSubmissions = await prisma.workRegistration.count({
          where: { userId }
        });
        unlocked = workSubmissions > 0;
        break;

      case 'revenue_milestone':
        unlocked = Number(user.lifetimeEarnings) >= criteria.requiredRevenue;
        break;

      case 'tier_milestone':
        const tierOrder = ['BRONZE', 'SILVER', 'GOLD', 'DIAMOND', 'ELITE'];
        const currentTierIndex = tierOrder.indexOf(user.gamificationPoints.tier);
        const requiredTierIndex = tierOrder.indexOf(criteria.requiredTier);
        unlocked = currentTierIndex >= requiredTierIndex;
        break;

      case 'feedback_count':
        const feedbackCount = user.gamificationEvents.filter(
          e => e.eventType === 'FEEDBACK_SUBMITTED' || e.eventType === 'BUG_REPORTED'
        ).length;
        unlocked = feedbackCount >= criteria.requiredSubmissions;
        break;

      default:
        break;
    }

    if (unlocked) {
      const userAchievement = await prisma.userAchievement.create({
        data: {
          userId,
          achievementId: achievement.id
        },
        include: {
          achievement: true
        }
      });

      await awardPoints(
        userId,
        'ACHIEVEMENT_UNLOCKED',
        achievement.points,
        `Unlocked: ${achievement.name}`,
        { achievementId: achievement.id }
      );

      newlyUnlocked.push(userAchievement);
    }
  }

  return newlyUnlocked;
};

// Get all achievements for a user (locked and unlocked)
export const getUserAchievements = async (userId: string) => {
  const allAchievements = await prisma.achievement.findMany({
    where: { isActive: true },
    orderBy: [
      { category: 'asc' },
      { tier: 'asc' }
    ]
  });

  const userAchievements = await prisma.userAchievement.findMany({
    where: { userId }
  });

  const unlockedIds = userAchievements.map(ua => ua.achievementId);

  return allAchievements.map(achievement => ({
    ...achievement,
    unlocked: unlockedIds.includes(achievement.id),
    unlockedAt: userAchievements.find(ua => ua.achievementId === achievement.id)?.unlockedAt
  }));
};
