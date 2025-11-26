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
  // Exclude admins from earning gamification points (they can still manage/award)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true }
  });

  if (user?.role === 'ADMIN') {
    console.log(`🚫 Skipping gamification points for admin user ${userId}`);
    return null;
  }

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
    // Tiers are based on totalEarned, not current points (prevents tier downgrade when spending)
    const newTier = calculateTier(current.totalEarned);

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

// Get user's referral statistics
export const getUserReferralStats = async (userId: string) => {
  // Get user's gamification points to get their referral code
  const gamificationPoints = await prisma.gamificationPoints.findUnique({
    where: { userId }
  });

  if (!gamificationPoints || !gamificationPoints.referralCode) {
    return {
      referralCode: null,
      totalReferrals: 0,
      activeReferrals: 0,
      pendingReferrals: 0,
      totalPointsEarned: 0,
      recentReferrals: []
    };
  }

  // Count referral events for this user
  const referralSignups = await prisma.gamificationEvent.count({
    where: {
      userId,
      eventType: 'REFERRAL_SIGNUP'
    }
  });

  const referralConversions = await prisma.gamificationEvent.count({
    where: {
      userId,
      eventType: 'REFERRAL_CONVERSION'
    }
  });

  // Get total points earned from referrals
  const referralEvents = await prisma.gamificationEvent.findMany({
    where: {
      userId,
      eventType: {
        in: ['REFERRAL_SIGNUP', 'REFERRAL_CONVERSION']
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 10
  });

  const totalPointsEarned = referralEvents.reduce((sum, e) => sum + e.points, 0);

  return {
    referralCode: gamificationPoints.referralCode,
    totalReferrals: referralSignups,
    activeReferrals: referralConversions,
    pendingReferrals: referralSignups - referralConversions,
    totalPointsEarned,
    recentReferrals: referralEvents.map(e => ({
      id: e.id,
      type: e.eventType,
      points: e.points,
      description: e.description,
      date: e.createdAt
    }))
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
          role: true,
          profilePhotoUrl: true
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

    // Auto-approve digital rewards
    // Physical items require admin approval
    const autoApproveTypes = [
      'COMMISSION_REDUCTION',
      'PAYOUT_SPEED',
      'TOOL_ACCESS',
      'MONTHLY_PAYOUT',
      'ZERO_FEE_PAYOUT',
      'PRIORITY_PAYOUT',
      'EARLY_STATEMENT_ACCESS'
    ];
    const isAutoApproved = autoApproveTypes.includes(reward.type);
    let expiresAt: Date | undefined;

    // Set expiration based on reward details
    const details = reward.details as any;
    if (isAutoApproved && details?.durationDays) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + details.durationDays);
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
        const workSubmissions = await prisma.placement.count({
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

      // Auto-grant badge if achievement has a linked badge
      const linkedBadge = await prisma.badge.findFirst({
        where: { achievementId: achievement.id, isActive: true }
      });

      if (linkedBadge) {
        // Check if user already owns this badge
        const existingBadge = await prisma.userBadge.findUnique({
          where: { userId_badgeId: { userId, badgeId: linkedBadge.id } }
        });

        if (!existingBadge) {
          await prisma.userBadge.create({
            data: { userId, badgeId: linkedBadge.id }
          });
          console.log(`🏅 Auto-granted badge "${linkedBadge.name}" to user ${userId} for achievement "${achievement.name}"`);
        }
      }

      // Auto-grant border if achievement has a linked border
      const linkedBorder = await prisma.profileBorder.findFirst({
        where: { achievementId: achievement.id, isActive: true }
      });

      if (linkedBorder) {
        // Check if user already owns this border
        const existingBorder = await prisma.userBorder.findUnique({
          where: { userId_borderId: { userId, borderId: linkedBorder.id } }
        });

        if (!existingBorder) {
          await prisma.userBorder.create({
            data: { userId, borderId: linkedBorder.id }
          });
          console.log(`🔲 Auto-granted border "${linkedBorder.name}" to user ${userId} for achievement "${achievement.name}"`);
        }
      }

      newlyUnlocked.push(userAchievement);
    }
  }

  return newlyUnlocked;
};

// Get all achievements for a user (locked and unlocked)
// Filters achievements based on user's role - hides WRITER-only achievements from CUSTOMER users
export const getUserAchievements = async (userId: string) => {
  // Get user's role to filter role-restricted achievements
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true }
  });

  const userRole = user?.role || 'WRITER';

  const allAchievements = await prisma.achievement.findMany({
    where: { isActive: true },
    orderBy: [
      { category: 'asc' },
      { tier: 'asc' }
    ]
  });

  // Filter achievements based on roleRestriction in criteria
  const roleFilteredAchievements = allAchievements.filter(achievement => {
    const criteria = achievement.criteria as any;
    if (!criteria || !criteria.roleRestriction) {
      // No restriction, show to everyone
      return true;
    }
    // Only show if user's role matches the restriction
    return criteria.roleRestriction === userRole;
  });

  const userAchievements = await prisma.userAchievement.findMany({
    where: { userId }
  });

  const unlockedIds = userAchievements.map(ua => ua.achievementId);

  return roleFilteredAchievements.map(achievement => ({
    ...achievement,
    unlocked: unlockedIds.includes(achievement.id),
    unlockedAt: userAchievements.find(ua => ua.achievementId === achievement.id)?.unlockedAt
  }));
};

// Check if user has access to a specific tool via Tour Miles or Paid Subscription
export const checkToolAccess = async (userId: string, toolId: string) => {
  // First check for paid ToolSubscription (from shop purchases)
  const paidSubscription = await prisma.toolSubscription.findFirst({
    where: {
      userId,
      toolId,
      status: 'ACTIVE',
      OR: [
        { expiresAt: null },
        { expiresAt: { gte: new Date() } }
      ]
    }
  });

  if (paidSubscription) {
    return {
      hasAccess: true,
      subscriptionType: paidSubscription.type,
      toolSubscription: paidSubscription,
      expiresAt: paidSubscription.expiresAt
    };
  }

  // Check for Tour Miles redemption
  const activeRedemption = await prisma.rewardRedemption.findFirst({
    where: {
      userId,
      isActive: true,
      status: 'APPROVED',
      reward: {
        type: 'TOOL_ACCESS',
      },
      OR: [
        { expiresAt: null },
        { expiresAt: { gte: new Date() } }
      ]
    },
    include: { reward: true }
  });

  // Check if this redemption is for the requested tool
  if (activeRedemption) {
    const details = activeRedemption.reward.details as any;
    if (details?.toolId === toolId) {
      return {
        hasAccess: true,
        subscriptionType: 'TOUR_MILES',
        redemption: activeRedemption,
        expiresAt: activeRedemption.expiresAt
      };
    }
  }

  // Check for any tool access matching the toolId
  const toolRedemption = await prisma.rewardRedemption.findFirst({
    where: {
      userId,
      isActive: true,
      status: 'APPROVED',
      reward: {
        type: 'TOOL_ACCESS',
        details: {
          path: ['toolId'],
          equals: toolId
        }
      },
      OR: [
        { expiresAt: null },
        { expiresAt: { gte: new Date() } }
      ]
    },
    include: { reward: true }
  });

  return {
    hasAccess: !!toolRedemption,
    subscriptionType: toolRedemption ? 'TOUR_MILES' : undefined,
    redemption: toolRedemption ?? undefined,
    expiresAt: toolRedemption?.expiresAt ?? undefined
  };
};

// Get all tools a user has access to via Tour Miles or Paid Subscription
export const getUserToolAccess = async (userId: string) => {
  // Get paid ToolSubscriptions
  const toolSubscriptions = await prisma.toolSubscription.findMany({
    where: {
      userId,
      status: 'ACTIVE',
      OR: [
        { expiresAt: null },
        { expiresAt: { gte: new Date() } }
      ]
    }
  });

  // Get Tour Miles redemptions
  const redemptions = await prisma.rewardRedemption.findMany({
    where: {
      userId,
      isActive: true,
      status: 'APPROVED',
      reward: { type: 'TOOL_ACCESS' },
      OR: [
        { expiresAt: null },
        { expiresAt: { gte: new Date() } }
      ]
    },
    include: { reward: true }
  });

  // Combine both sources
  const toolsFromSubscriptions = toolSubscriptions.map(s => ({
    toolId: s.toolId,
    name: s.toolName,
    expiresAt: s.expiresAt,
    subscriptionId: s.id,
    type: s.type // FREE_TRIAL, TOUR_MILES, or PAID
  }));

  const toolsFromRedemptions = redemptions.map(r => {
    const details = r.reward.details as any;
    return {
      toolId: details?.toolId,
      name: r.reward.name,
      expiresAt: r.expiresAt,
      redemptionId: r.id,
      type: 'TOUR_MILES' as const
    };
  }).filter(t => t.toolId);

  // Merge and deduplicate by toolId (prefer paid subscriptions)
  const toolMap = new Map<string, any>();

  // Add redemptions first
  for (const tool of toolsFromRedemptions) {
    toolMap.set(tool.toolId, tool);
  }

  // Paid subscriptions override redemptions
  for (const tool of toolsFromSubscriptions) {
    toolMap.set(tool.toolId, tool);
  }

  return Array.from(toolMap.values());
};

// Check if user has active monthly payout reward
export const hasMonthlyPayoutAccess = async (userId: string) => {
  const redemption = await prisma.rewardRedemption.findFirst({
    where: {
      userId,
      isActive: true,
      status: 'APPROVED',
      reward: { type: 'MONTHLY_PAYOUT' },
      OR: [
        { expiresAt: null },
        { expiresAt: { gte: new Date() } }
      ]
    },
    include: { reward: true }
  });

  return {
    hasAccess: !!redemption,
    expiresAt: redemption?.expiresAt ?? undefined
  };
};
