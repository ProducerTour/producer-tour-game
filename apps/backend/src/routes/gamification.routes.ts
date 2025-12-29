import { Router, Response } from 'express';
import { authenticate, AuthRequest, requireAdmin } from '../middleware/auth.middleware';
import * as gamificationService from '../services/gamification.service';
import * as analyticsService from '../services/gamificationAnalytics.service';
import { GamificationTier } from '../generated/client';
import { prisma } from '../lib/prisma';

const router = Router();

router.get('/stats', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const stats = await gamificationService.getUserStats(userId);
    res.json(stats);
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to get gamification stats' });
  }
});

router.post('/check-in', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const result = await gamificationService.dailyCheckIn(userId);
    res.json(result);
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({ error: 'Failed to process check-in' });
  }
});

// Get user's referral stats
router.get('/referral/stats', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const stats = await gamificationService.getUserReferralStats(userId);
    res.json(stats);
  } catch (error) {
    console.error('Get referral stats error:', error);
    res.status(500).json({ error: 'Failed to get referral stats' });
  }
});

router.get('/leaderboard', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const tier = req.query.tier as GamificationTier | undefined;
    const leaderboard = await gamificationService.getLeaderboard(limit, tier);
    res.json(leaderboard);
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({ error: 'Failed to get leaderboard' });
  }
});

router.get('/rewards', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const rewards = await gamificationService.getAvailableRewards(userId);
    res.json(rewards);
  } catch (error) {
    console.error('Get rewards error:', error);
    res.status(500).json({ error: 'Failed to get rewards' });
  }
});

router.post('/rewards/:rewardId/redeem', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { rewardId } = req.params;
    const redemption = await gamificationService.redeemReward(userId, rewardId);
    res.json(redemption);
  } catch (error: any) {
    console.error('Redeem reward error:', error);
    res.status(400).json({ error: error.message || 'Failed to redeem reward' });
  }
});

router.post('/social-share', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { platform } = req.body;

    if (!platform) {
      return res.status(400).json({ error: 'Platform is required' });
    }

    const share = await gamificationService.trackSocialShare(userId, platform);
    res.json(share);
  } catch (error) {
    console.error('Track social share error:', error);
    res.status(500).json({ error: 'Failed to track social share' });
  }
});

router.post('/referral/signup', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { referralCode, newUserId } = req.body;

    if (!referralCode || !newUserId) {
      return res.status(400).json({ error: 'Referral code and new user ID are required' });
    }

    const result = await gamificationService.recordReferralSignup(referralCode, newUserId);

    if (!result) {
      return res.status(404).json({ error: 'Invalid referral code' });
    }

    res.json({ success: true, referrer: result });
  } catch (error) {
    console.error('Record referral signup error:', error);
    res.status(500).json({ error: 'Failed to record referral signup' });
  }
});

// Get all achievements for user (locked and unlocked)
router.get('/achievements', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const achievements = await gamificationService.getUserAchievements(userId);
    res.json(achievements);
  } catch (error) {
    console.error('Get achievements error:', error);
    res.status(500).json({ error: 'Failed to get achievements' });
  }
});

// Check for newly unlocked achievements
router.post('/achievements/check', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const newlyUnlocked = await gamificationService.checkAchievements(userId);
    res.json({ newlyUnlocked, count: newlyUnlocked.length });
  } catch (error) {
    console.error('Check achievements error:', error);
    res.status(500).json({ error: 'Failed to check achievements' });
  }
});

// ===== TOOL ACCESS ENDPOINTS =====

// Check if user has access to a specific tool
router.get('/tools/:toolId/access', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { toolId } = req.params;

    // Check user role - Admins and Writers have access to all tools
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    if (user?.role === 'ADMIN') {
      return res.json({ hasAccess: true, isAdmin: true });
    }

    // Writers have free access to all tools
    if (user?.role === 'WRITER') {
      return res.json({ hasAccess: true, isWriter: true });
    }

    // For other roles (like CUSTOMER), check gamification-based access
    const access = await gamificationService.checkToolAccess(userId, toolId);
    res.json(access);
  } catch (error) {
    console.error('Check tool access error:', error);
    res.status(500).json({ error: 'Failed to check tool access' });
  }
});

// Get all tools user has access to via Tour Miles
router.get('/tools/access', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const toolAccess = await gamificationService.getUserToolAccess(userId);
    res.json({ tools: toolAccess });
  } catch (error) {
    console.error('Get user tool access error:', error);
    res.status(500).json({ error: 'Failed to get tool access' });
  }
});

// Check if user has monthly payout access
router.get('/payout/monthly-access', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const access = await gamificationService.hasMonthlyPayoutAccess(userId);
    res.json(access);
  } catch (error) {
    console.error('Check monthly payout access error:', error);
    res.status(500).json({ error: 'Failed to check monthly payout access' });
  }
});

// ===== ADMIN ENDPOINTS =====

// Get all pending reward redemptions (Admin only)
router.get('/admin/redemptions', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.query;

    const where: any = {};
    if (status && typeof status === 'string') {
      where.status = status;
    } else {
      // Default to pending physical rewards
      where.status = 'PENDING';
      where.reward = {
        type: { in: ['PHYSICAL_ITEM', 'CUSTOM'] }
      };
    }

    const redemptions = await prisma.rewardRedemption.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          }
        },
        reward: true
      },
      orderBy: { redeemedAt: 'desc' }
    });

    res.json({
      redemptions: redemptions.map((r) => ({
        id: r.id,
        userId: r.userId,
        userName: `${r.user.firstName || ''} ${r.user.lastName || ''}`.trim() || r.user.email,
        userEmail: r.user.email,
        reward: {
          id: r.reward.id,
          name: r.reward.name,
          description: r.reward.description,
          type: r.reward.type,
          cost: r.reward.cost
        },
        pointsCost: r.pointsCost,
        status: r.status,
        redeemedAt: r.redeemedAt,
        adminNotes: r.adminNotes
      })),
      total: redemptions.length
    });
  } catch (error) {
    console.error('Get admin redemptions error:', error);
    res.status(500).json({ error: 'Failed to get redemptions' });
  }
});

// Approve reward redemption (Admin only)
router.post('/admin/redemptions/:id/approve', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { adminNotes } = req.body;
    const adminId = req.user!.id;

    const redemption = await prisma.rewardRedemption.findUnique({
      where: { id },
      include: { reward: true }
    });

    if (!redemption) {
      return res.status(404).json({ error: 'Redemption not found' });
    }

    if (redemption.status !== 'PENDING') {
      return res.status(400).json({ error: `Cannot approve redemption with status: ${redemption.status}` });
    }

    // Set expiration date for temporary rewards
    let expiresAt: Date | undefined;
    if (redemption.reward.details) {
      const details = redemption.reward.details as any;
      const durationDays = details.durationDays;
      if (durationDays) {
        expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + durationDays);
      }
    }

    await prisma.rewardRedemption.update({
      where: { id },
      data: {
        status: 'APPROVED',
        adminId,
        adminNotes,
        isActive: true,
        expiresAt
      }
    });

    res.json({ success: true, message: 'Redemption approved successfully' });
  } catch (error) {
    console.error('Approve redemption error:', error);
    res.status(500).json({ error: 'Failed to approve redemption' });
  }
});

// Deny reward redemption (Admin only)
router.post('/admin/redemptions/:id/deny', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { adminNotes } = req.body;
    const adminId = req.user!.id;

    const redemption = await prisma.rewardRedemption.findUnique({
      where: { id },
      include: { user: true }
    });

    if (!redemption) {
      return res.status(404).json({ error: 'Redemption not found' });
    }

    if (redemption.status !== 'PENDING') {
      return res.status(400).json({ error: `Cannot deny redemption with status: ${redemption.status}` });
    }

    // Refund the points to the user
    await prisma.$transaction(async (tx) => {
      // Update redemption status
      await tx.rewardRedemption.update({
        where: { id },
        data: {
          status: 'DENIED',
          adminId,
          adminNotes,
          isActive: false
        }
      });

      // Refund points
      await tx.gamificationPoints.update({
        where: { userId: redemption.userId },
        data: {
          points: { increment: redemption.pointsCost },
          totalSpent: { decrement: redemption.pointsCost }
        }
      });

      // Log the refund
      await tx.gamificationEvent.create({
        data: {
          userId: redemption.userId,
          eventType: 'REWARD_REFUNDED',
          points: redemption.pointsCost,
          description: `Refunded: ${redemption.pointsCost} TP (Redemption denied)`,
          metadata: { redemptionId: id, reason: adminNotes }
        }
      });
    });

    res.json({ success: true, message: 'Redemption denied and points refunded' });
  } catch (error) {
    console.error('Deny redemption error:', error);
    res.status(500).json({ error: 'Failed to deny redemption' });
  }
});

// ===== ANALYTICS ENDPOINTS (Admin only) =====

// Get comprehensive dashboard analytics
router.get('/admin/analytics', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const dashboard = await analyticsService.getComprehensiveDashboard();
    res.json(dashboard);
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

// Get DAU trend
router.get('/admin/analytics/dau', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const dauTrend = await analyticsService.getDAUTrend(days);
    res.json(dauTrend);
  } catch (error) {
    console.error('Get DAU error:', error);
    res.status(500).json({ error: 'Failed to get DAU data' });
  }
});

// Get engagement metrics
router.get('/admin/analytics/engagement', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const [participation, checkInRate, streaks] = await Promise.all([
      analyticsService.getParticipationRate(),
      analyticsService.getDailyCheckInRate(),
      analyticsService.getStreakRates(),
    ]);
    res.json({ participation, checkInRate, streaks });
  } catch (error) {
    console.error('Get engagement error:', error);
    res.status(500).json({ error: 'Failed to get engagement metrics' });
  }
});

// Get growth metrics
router.get('/admin/analytics/growth', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const [referrals, socialShares] = await Promise.all([
      analyticsService.getReferralMetrics(days),
      analyticsService.getSocialShareMetrics(days),
    ]);
    res.json({ referrals, socialShares });
  } catch (error) {
    console.error('Get growth error:', error);
    res.status(500).json({ error: 'Failed to get growth metrics' });
  }
});

// Get platform health metrics
router.get('/admin/analytics/health', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const [workRegistration, profileCompletion, stripeOnboarding, rewardRedemption] = await Promise.all([
      analyticsService.getWorkRegistrationMetrics(days),
      analyticsService.getProfileCompletionMetrics(),
      analyticsService.getStripeOnboardingMetrics(),
      analyticsService.getRewardRedemptionMetrics(),
    ]);
    res.json({ workRegistration, profileCompletion, stripeOnboarding, rewardRedemption });
  } catch (error) {
    console.error('Get platform health error:', error);
    res.status(500).json({ error: 'Failed to get platform health metrics' });
  }
});

// Get tier distribution
router.get('/admin/analytics/tiers', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const tierDistribution = await analyticsService.getTierDistribution();
    res.json(tierDistribution);
  } catch (error) {
    console.error('Get tiers error:', error);
    res.status(500).json({ error: 'Failed to get tier distribution' });
  }
});

// Get achievement metrics
router.get('/admin/analytics/achievements', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const achievements = await analyticsService.getAchievementMetrics();
    res.json(achievements);
  } catch (error) {
    console.error('Get achievements error:', error);
    res.status(500).json({ error: 'Failed to get achievement metrics' });
  }
});

// Get point economy metrics
router.get('/admin/analytics/points', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const pointEconomy = await analyticsService.getPointEconomyMetrics(days);
    res.json(pointEconomy);
  } catch (error) {
    console.error('Get points error:', error);
    res.status(500).json({ error: 'Failed to get point economy metrics' });
  }
});

// ===== ADMIN USER MANAGEMENT ENDPOINTS =====

// Get all users with gamification stats
router.get('/admin/users', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;
    const tier = req.query.tier as GamificationTier | undefined;
    const sortBy = (req.query.sortBy as string) || 'points';
    const sortOrder = (req.query.sortOrder as string) || 'desc';

    const where: any = {
      role: { not: 'ADMIN' }, // Exclude admins from gamification user list
    };

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (tier) {
      where.gamificationPoints = { tier };
    }

    // Get total count
    const total = await prisma.user.count({ where });

    // Get users with gamification data
    const users = await prisma.user.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
        gamificationPoints: {
          select: {
            points: true,
            totalEarned: true,
            totalSpent: true,
            tier: true,
            currentStreak: true,
            longestStreak: true,
            referralCode: true,
          },
        },
        _count: {
          select: {
            achievements: true,
            rewardRedemptions: true,
          },
        },
      },
      orderBy: sortBy === 'points'
        ? { gamificationPoints: { points: sortOrder === 'asc' ? 'asc' : 'desc' } }
        : sortBy === 'tier'
        ? { gamificationPoints: { tier: sortOrder === 'asc' ? 'asc' : 'desc' } }
        : sortBy === 'createdAt'
        ? { createdAt: sortOrder === 'asc' ? 'asc' : 'desc' }
        : { gamificationPoints: { points: 'desc' } },
    });

    res.json({
      users: users.map((u) => ({
        id: u.id,
        email: u.email,
        name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
        role: u.role,
        createdAt: u.createdAt,
        points: u.gamificationPoints?.points || 0,
        totalEarned: u.gamificationPoints?.totalEarned || 0,
        totalSpent: u.gamificationPoints?.totalSpent || 0,
        tier: u.gamificationPoints?.tier || 'BRONZE',
        currentStreak: u.gamificationPoints?.currentStreak || 0,
        longestStreak: u.gamificationPoints?.longestStreak || 0,
        referralCode: u.gamificationPoints?.referralCode,
        achievementCount: u._count.achievements,
        redemptionCount: u._count.rewardRedemptions,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get admin users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// Get specific user's detailed gamification data
router.get('/admin/users/:userId', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
        gamificationPoints: true,
        achievements: {
          include: { achievement: true },
          orderBy: { unlockedAt: 'desc' },
        },
        rewardRedemptions: {
          include: { reward: true },
          orderBy: { redeemedAt: 'desc' },
        },
        gamificationEvents: {
          orderBy: { createdAt: 'desc' },
          take: 50, // Recent 50 events
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
      gamification: user.gamificationPoints || {
        points: 0,
        totalEarned: 0,
        totalSpent: 0,
        tier: 'BRONZE',
        currentStreak: 0,
        longestStreak: 0,
      },
      achievements: user.achievements.map((ua) => ({
        id: ua.achievement.id,
        name: ua.achievement.name,
        description: ua.achievement.description,
        unlockedAt: ua.unlockedAt,
        pointsAwarded: ua.achievement.points,
      })),
      redemptions: user.rewardRedemptions.map((r) => ({
        id: r.id,
        rewardName: r.reward.name,
        pointsCost: r.pointsCost,
        status: r.status,
        redeemedAt: r.redeemedAt,
      })),
      recentEvents: user.gamificationEvents.map((e) => ({
        id: e.id,
        type: e.eventType,
        points: e.points,
        description: e.description,
        createdAt: e.createdAt,
      })),
    });
  } catch (error) {
    console.error('Get admin user detail error:', error);
    res.status(500).json({ error: 'Failed to get user details' });
  }
});

// Manually award points to a user (Admin only)
router.post('/admin/users/:userId/award-points', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { points, reason } = req.body;
    const adminId = req.user!.id;

    if (!points || typeof points !== 'number' || points <= 0) {
      return res.status(400).json({ error: 'Points must be a positive number' });
    }

    if (!reason || typeof reason !== 'string' || reason.trim().length < 3) {
      return res.status(400).json({ error: 'Reason is required (min 3 characters)' });
    }

    // Check user exists and is not an admin
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, email: true },
    });

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (targetUser.role === 'ADMIN') {
      return res.status(400).json({ error: 'Cannot award points to admin users' });
    }

    // Ensure gamification points exist first (outside transaction)
    await gamificationService.initializeUserGamification(userId);

    // Award points using a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update points
      const updated = await tx.gamificationPoints.update({
        where: { userId },
        data: {
          points: { increment: points },
          totalEarned: { increment: points },
        },
      });

      // Log the admin action
      const event = await tx.gamificationEvent.create({
        data: {
          userId,
          eventType: 'ADMIN_AWARDED',
          points,
          description: `Admin awarded ${points} TP: ${reason.trim()}`,
          metadata: { adminId, reason: reason.trim() },
        },
      });

      // Check for tier upgrade
      const tierThresholds = [
        { tier: 'DIAMOND', points: 10000 },
        { tier: 'ELITE', points: 5000 },
        { tier: 'GOLD', points: 2500 },
        { tier: 'SILVER', points: 1000 },
        { tier: 'BRONZE', points: 0 },
      ];

      let newTier = 'BRONZE';
      for (const t of tierThresholds) {
        if (updated.totalEarned >= t.points) {
          newTier = t.tier;
          break;
        }
      }

      if (newTier !== updated.tier) {
        await tx.gamificationPoints.update({
          where: { userId },
          data: { tier: newTier as GamificationTier },
        });
      }

      return { updated, event, newTier };
    });

    res.json({
      success: true,
      message: `Awarded ${points} Tour Points to ${targetUser.email}`,
      newBalance: result.updated.points + points,
      newTier: result.newTier,
      eventId: result.event.id,
    });
  } catch (error) {
    console.error('Admin award points error:', error);
    res.status(500).json({ error: 'Failed to award points' });
  }
});

// Manually deduct points from a user (Admin only)
router.post('/admin/users/:userId/deduct-points', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { points, reason } = req.body;
    const adminId = req.user!.id;

    if (!points || typeof points !== 'number' || points <= 0) {
      return res.status(400).json({ error: 'Points must be a positive number' });
    }

    if (!reason || typeof reason !== 'string' || reason.trim().length < 3) {
      return res.status(400).json({ error: 'Reason is required (min 3 characters)' });
    }

    // Check user exists and has gamification points
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        gamificationPoints: { select: { points: true } },
      },
    });

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (targetUser.role === 'ADMIN') {
      return res.status(400).json({ error: 'Cannot deduct points from admin users' });
    }

    const currentPoints = targetUser.gamificationPoints?.points || 0;
    if (currentPoints < points) {
      return res.status(400).json({
        error: `User only has ${currentPoints} points. Cannot deduct ${points} points.`
      });
    }

    // Deduct points using a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update points
      const updated = await tx.gamificationPoints.update({
        where: { userId },
        data: {
          points: { decrement: points },
        },
      });

      // Log the admin action
      const event = await tx.gamificationEvent.create({
        data: {
          userId,
          eventType: 'ADMIN_DEDUCTED',
          points: -points, // Negative to indicate deduction
          description: `Admin deducted ${points} TP: ${reason.trim()}`,
          metadata: { adminId, reason: reason.trim() },
        },
      });

      return { updated, event };
    });

    res.json({
      success: true,
      message: `Deducted ${points} Tour Points from ${targetUser.email}`,
      newBalance: result.updated.points,
      eventId: result.event.id,
    });
  } catch (error) {
    console.error('Admin deduct points error:', error);
    res.status(500).json({ error: 'Failed to deduct points' });
  }
});

// ===== ADMIN REWARD MANAGEMENT =====

// Get all rewards (including inactive)
router.get('/admin/rewards', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const includeInactive = req.query.includeInactive === 'true';

    const rewards = await prisma.reward.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: [{ category: 'asc' }, { cost: 'asc' }],
    });

    res.json({ rewards, total: rewards.length });
  } catch (error) {
    console.error('Get admin rewards error:', error);
    res.status(500).json({ error: 'Failed to get rewards' });
  }
});

// Create a new reward
router.post('/admin/rewards', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const {
      name, description, cost, category, type,
      roleRestriction, tierRestriction, details, inventory
    } = req.body;

    if (!name || !description || !cost || !category || !type) {
      return res.status(400).json({
        error: 'name, description, cost, category, and type are required'
      });
    }

    // Generate ID from name
    const id = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    // Check for duplicate ID
    const existing = await prisma.reward.findUnique({ where: { id } });
    if (existing) {
      return res.status(400).json({ error: 'A reward with this name already exists' });
    }

    const reward = await prisma.reward.create({
      data: {
        id,
        name,
        description,
        cost: parseInt(cost),
        category,
        type,
        roleRestriction: roleRestriction || null,
        tierRestriction: tierRestriction || null,
        details: details || {},
        inventory: inventory ? parseInt(inventory) : null,
        isActive: true,
      },
    });

    res.status(201).json({ reward, message: 'Reward created successfully' });
  } catch (error) {
    console.error('Create reward error:', error);
    res.status(500).json({ error: 'Failed to create reward' });
  }
});

// Update a reward
router.put('/admin/rewards/:rewardId', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { rewardId } = req.params;
    const {
      name, description, cost, category, type,
      roleRestriction, tierRestriction, details, inventory, isActive
    } = req.body;

    const existing = await prisma.reward.findUnique({ where: { id: rewardId } });
    if (!existing) {
      return res.status(404).json({ error: 'Reward not found' });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (cost !== undefined) updateData.cost = parseInt(cost);
    if (category !== undefined) updateData.category = category;
    if (type !== undefined) updateData.type = type;
    if (roleRestriction !== undefined) updateData.roleRestriction = roleRestriction || null;
    if (tierRestriction !== undefined) updateData.tierRestriction = tierRestriction || null;
    if (details !== undefined) updateData.details = details;
    if (inventory !== undefined) updateData.inventory = inventory ? parseInt(inventory) : null;
    if (isActive !== undefined) updateData.isActive = isActive;

    const reward = await prisma.reward.update({
      where: { id: rewardId },
      data: updateData,
    });

    res.json({ reward, message: 'Reward updated successfully' });
  } catch (error) {
    console.error('Update reward error:', error);
    res.status(500).json({ error: 'Failed to update reward' });
  }
});

// Delete (deactivate) a reward
router.delete('/admin/rewards/:rewardId', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { rewardId } = req.params;
    const hardDelete = req.query.hard === 'true';

    const existing = await prisma.reward.findUnique({ where: { id: rewardId } });
    if (!existing) {
      return res.status(404).json({ error: 'Reward not found' });
    }

    if (hardDelete) {
      // Check if any redemptions exist
      const redemptions = await prisma.rewardRedemption.count({ where: { rewardId } });
      if (redemptions > 0) {
        return res.status(400).json({
          error: `Cannot hard delete: ${redemptions} redemptions exist. Use soft delete instead.`
        });
      }
      await prisma.reward.delete({ where: { id: rewardId } });
      res.json({ message: 'Reward permanently deleted' });
    } else {
      // Soft delete (deactivate)
      await prisma.reward.update({
        where: { id: rewardId },
        data: { isActive: false },
      });
      res.json({ message: 'Reward deactivated' });
    }
  } catch (error) {
    console.error('Delete reward error:', error);
    res.status(500).json({ error: 'Failed to delete reward' });
  }
});

// ===== ADMIN ACHIEVEMENT MANAGEMENT =====

// Get all achievements
router.get('/admin/achievements', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const achievements = await prisma.achievement.findMany({
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
      include: {
        _count: { select: { userAchievements: true } },
      },
    });

    res.json({
      achievements: achievements.map((a) => ({
        ...a,
        unlockCount: a._count.userAchievements,
      })),
      total: achievements.length
    });
  } catch (error) {
    console.error('Get admin achievements error:', error);
    res.status(500).json({ error: 'Failed to get achievements' });
  }
});

// Create a new achievement
router.post('/admin/achievements', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const {
      name, description, category, icon, tier,
      points, criteria, isSecret
    } = req.body;

    if (!name || !description || !category || !tier) {
      return res.status(400).json({
        error: 'name, description, category, and tier are required'
      });
    }

    // Generate ID from name
    const id = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    // Check for duplicate ID
    const existing = await prisma.achievement.findUnique({ where: { id } });
    if (existing) {
      return res.status(400).json({ error: 'An achievement with this name already exists' });
    }

    const achievement = await prisma.achievement.create({
      data: {
        id,
        name,
        description,
        category,
        tier,
        icon: icon || '🏆',
        points: points ? parseInt(points) : 0,
        criteria: criteria || {},
        isActive: true,
      },
    });

    res.status(201).json({ achievement, message: 'Achievement created successfully' });
  } catch (error) {
    console.error('Create achievement error:', error);
    res.status(500).json({ error: 'Failed to create achievement' });
  }
});

// Update an achievement
router.put('/admin/achievements/:achievementId', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { achievementId } = req.params;
    const {
      name, description, category, icon, tier,
      points, criteria, isActive
    } = req.body;

    const existing = await prisma.achievement.findUnique({ where: { id: achievementId } });
    if (!existing) {
      return res.status(404).json({ error: 'Achievement not found' });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.category = category;
    if (tier !== undefined) updateData.tier = tier;
    if (icon !== undefined) updateData.icon = icon;
    if (points !== undefined) updateData.points = parseInt(points);
    if (criteria !== undefined) updateData.criteria = criteria;
    if (isActive !== undefined) updateData.isActive = isActive;

    const achievement = await prisma.achievement.update({
      where: { id: achievementId },
      data: updateData,
    });

    res.json({ achievement, message: 'Achievement updated successfully' });
  } catch (error) {
    console.error('Update achievement error:', error);
    res.status(500).json({ error: 'Failed to update achievement' });
  }
});

// Delete an achievement
router.delete('/admin/achievements/:achievementId', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { achievementId } = req.params;

    const existing = await prisma.achievement.findUnique({ where: { id: achievementId } });
    if (!existing) {
      return res.status(404).json({ error: 'Achievement not found' });
    }

    // Check if anyone has unlocked this
    const unlocks = await prisma.userAchievement.count({ where: { achievementId } });
    if (unlocks > 0) {
      return res.status(400).json({
        error: `Cannot delete: ${unlocks} users have unlocked this achievement.`
      });
    }

    await prisma.achievement.delete({ where: { id: achievementId } });
    res.json({ message: 'Achievement deleted successfully' });
  } catch (error) {
    console.error('Delete achievement error:', error);
    res.status(500).json({ error: 'Failed to delete achievement' });
  }
});

// Manually grant an achievement to a user
router.post('/admin/achievements/:achievementId/grant', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { achievementId } = req.params;
    const { userId, reason } = req.body;
    const adminId = req.user!.id;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const achievement = await prisma.achievement.findUnique({ where: { id: achievementId } });
    if (!achievement) {
      return res.status(404).json({ error: 'Achievement not found' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true },
    });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.role === 'ADMIN') {
      return res.status(400).json({ error: 'Cannot grant achievements to admin users' });
    }

    // Check if already unlocked
    const existing = await prisma.userAchievement.findFirst({
      where: { userId, achievementId },
    });
    if (existing) {
      return res.status(400).json({ error: 'User has already unlocked this achievement' });
    }

    // Ensure gamification points exist first
    await gamificationService.initializeUserGamification(userId);

    // Grant the achievement
    await prisma.$transaction(async (tx) => {
      await tx.userAchievement.create({
        data: {
          userId,
          achievementId,
        },
      });

      if (achievement.points > 0) {
        await tx.gamificationPoints.update({
          where: { userId },
          data: {
            points: { increment: achievement.points },
            totalEarned: { increment: achievement.points },
          },
        });

        await tx.gamificationEvent.create({
          data: {
            userId,
            eventType: 'ACHIEVEMENT_UNLOCKED',
            points: achievement.points,
            description: `Admin granted achievement: ${achievement.name}`,
            metadata: { adminId, achievementId, reason: reason || 'Manual grant' },
          },
        });
      }
    });

    res.json({
      success: true,
      message: `Achievement "${achievement.name}" granted to ${user.email}`,
      pointsAwarded: achievement.points,
    });
  } catch (error) {
    console.error('Grant achievement error:', error);
    res.status(500).json({ error: 'Failed to grant achievement' });
  }
});

// ===== ADMIN AFFILIATE MANAGEMENT =====

// Get affiliate program stats
router.get('/admin/affiliates/stats', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    // Get all users with referral codes and their stats
    const [
      totalAffiliates,
      referralSignups,
      referralConversions,
      totalOrdersWithReferral,
      totalRevenueFromReferrals,
    ] = await Promise.all([
      // Count users with referral codes
      prisma.gamificationPoints.count({
        where: { referralCode: { not: null } },
      }),
      // Count referral signup events
      prisma.gamificationEvent.count({
        where: { eventType: 'REFERRAL_SIGNUP' },
      }),
      // Count referral conversion events
      prisma.gamificationEvent.count({
        where: { eventType: 'REFERRAL_CONVERSION' },
      }),
      // Count orders with referral codes
      prisma.order.count({
        where: {
          referralCode: { not: null },
          status: { in: ['PROCESSING', 'COMPLETED'] },
        },
      }),
      // Sum revenue from referred orders
      prisma.order.aggregate({
        where: {
          referralCode: { not: null },
          status: { in: ['PROCESSING', 'COMPLETED'] },
        },
        _sum: { totalAmount: true },
      }),
    ]);

    // Calculate conversion rate
    const conversionRate = referralSignups > 0
      ? Math.round((referralConversions / referralSignups) * 100)
      : 0;

    // Get total Tour Miles earned from referrals
    const referralPoints = await prisma.gamificationEvent.aggregate({
      where: {
        eventType: { in: ['REFERRAL_SIGNUP', 'REFERRAL_CONVERSION'] },
      },
      _sum: { points: true },
    });

    res.json({
      totalAffiliates,
      activeAffiliates: referralSignups > 0 ? Math.min(totalAffiliates, referralSignups) : 0,
      totalReferrals: referralSignups,
      totalConversions: referralConversions,
      conversionRate,
      totalOrdersWithReferral,
      totalRevenueFromReferrals: Number(totalRevenueFromReferrals._sum.totalAmount || 0),
      totalTourMilesEarned: referralPoints._sum.points || 0,
    });
  } catch (error) {
    console.error('Get affiliate stats error:', error);
    res.status(500).json({ error: 'Failed to get affiliate stats' });
  }
});

// Get all affiliates with their stats
router.get('/admin/affiliates', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;
    const sortBy = (req.query.sortBy as string) || 'referrals';
    const sortOrder = (req.query.sortOrder as string) || 'desc';

    // Get all users with referral codes
    const where: any = {
      gamificationPoints: {
        referralCode: { not: null },
      },
    };

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const total = await prisma.user.count({ where });

    const users = await prisma.user.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
        gamificationPoints: {
          select: {
            referralCode: true,
            points: true,
            tier: true,
          },
        },
      },
    });

    // Get referral stats for each user
    const affiliatesWithStats = await Promise.all(
      users.map(async (user) => {
        const [signups, conversions, ordersFromReferral] = await Promise.all([
          prisma.gamificationEvent.count({
            where: {
              userId: user.id,
              eventType: 'REFERRAL_SIGNUP',
            },
          }),
          prisma.gamificationEvent.count({
            where: {
              userId: user.id,
              eventType: 'REFERRAL_CONVERSION',
            },
          }),
          // Get orders where this user's code was used
          prisma.order.aggregate({
            where: {
              referredByUserId: user.id,
              status: { in: ['PROCESSING', 'COMPLETED'] },
            },
            _count: true,
            _sum: { totalAmount: true },
          }),
        ]);

        // Calculate Tour Miles earned from referrals
        const referralPointsEarned = await prisma.gamificationEvent.aggregate({
          where: {
            userId: user.id,
            eventType: { in: ['REFERRAL_SIGNUP', 'REFERRAL_CONVERSION'] },
          },
          _sum: { points: true },
        });

        return {
          id: user.id,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
          email: user.email,
          role: user.role,
          referralCode: user.gamificationPoints?.referralCode,
          tier: user.gamificationPoints?.tier || 'BRONZE',
          totalReferrals: signups,
          conversions,
          conversionRate: signups > 0 ? Math.round((conversions / signups) * 100) : 0,
          ordersFromReferral: ordersFromReferral._count,
          revenueFromReferrals: Number(ordersFromReferral._sum.totalAmount || 0),
          tourMilesEarned: referralPointsEarned._sum.points || 0,
          joinedAt: user.createdAt,
        };
      })
    );

    // Sort the results
    affiliatesWithStats.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'referrals':
          comparison = a.totalReferrals - b.totalReferrals;
          break;
        case 'conversions':
          comparison = a.conversions - b.conversions;
          break;
        case 'revenue':
          comparison = a.revenueFromReferrals - b.revenueFromReferrals;
          break;
        case 'tourMiles':
          comparison = a.tourMilesEarned - b.tourMilesEarned;
          break;
        default:
          comparison = a.totalReferrals - b.totalReferrals;
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    res.json({
      affiliates: affiliatesWithStats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get affiliates error:', error);
    res.status(500).json({ error: 'Failed to get affiliates' });
  }
});

// Get detailed affiliate info for a specific user
router.get('/admin/affiliates/:userId', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
        gamificationPoints: {
          select: {
            referralCode: true,
            points: true,
            tier: true,
            totalEarned: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get referral events
    const referralEvents = await prisma.gamificationEvent.findMany({
      where: {
        userId,
        eventType: { in: ['REFERRAL_SIGNUP', 'REFERRAL_CONVERSION'] },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // Get orders made with this user's referral code
    const referredOrders = await prisma.order.findMany({
      where: {
        referredByUserId: userId,
        status: { in: ['PROCESSING', 'COMPLETED'] },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        orderNumber: true,
        email: true,
        totalAmount: true,
        status: true,
        createdAt: true,
        referralCode: true,
      },
    });

    const totalRevenue = referredOrders.reduce(
      (sum, order) => sum + Number(order.totalAmount),
      0
    );

    res.json({
      user: {
        id: user.id,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
        email: user.email,
        role: user.role,
        referralCode: user.gamificationPoints?.referralCode,
        tier: user.gamificationPoints?.tier || 'BRONZE',
        totalPoints: user.gamificationPoints?.points || 0,
        joinedAt: user.createdAt,
      },
      stats: {
        totalReferrals: referralEvents.filter((e) => e.eventType === 'REFERRAL_SIGNUP').length,
        conversions: referralEvents.filter((e) => e.eventType === 'REFERRAL_CONVERSION').length,
        totalOrders: referredOrders.length,
        totalRevenue,
        tourMilesEarned: referralEvents.reduce((sum, e) => sum + e.points, 0),
      },
      recentEvents: referralEvents.map((e) => ({
        id: e.id,
        type: e.eventType,
        points: e.points,
        description: e.description,
        date: e.createdAt,
      })),
      referredOrders: referredOrders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        customerEmail: o.email,
        amount: Number(o.totalAmount),
        status: o.status,
        date: o.createdAt,
      })),
    });
  } catch (error) {
    console.error('Get affiliate detail error:', error);
    res.status(500).json({ error: 'Failed to get affiliate details' });
  }
});

// Get all orders with referral codes (for commission tracking)
router.get('/admin/affiliates/orders', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: {
          referralCode: { not: null },
          status: { in: ['PROCESSING', 'COMPLETED'] },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          orderNumber: true,
          email: true,
          userId: true,
          totalAmount: true,
          status: true,
          referralCode: true,
          referredByUserId: true,
          createdAt: true,
        },
      }),
      prisma.order.count({
        where: {
          referralCode: { not: null },
          status: { in: ['PROCESSING', 'COMPLETED'] },
        },
      }),
    ]);

    // Get referrer info for each order
    const ordersWithReferrer = await Promise.all(
      orders.map(async (order) => {
        let referrer = null;
        if (order.referredByUserId) {
          const referrerUser = await prisma.user.findUnique({
            where: { id: order.referredByUserId },
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          });
          if (referrerUser) {
            referrer = {
              id: referrerUser.id,
              name: `${referrerUser.firstName || ''} ${referrerUser.lastName || ''}`.trim() || referrerUser.email,
              email: referrerUser.email,
            };
          }
        }
        return {
          ...order,
          totalAmount: Number(order.totalAmount),
          referrer,
        };
      })
    );

    res.json({
      orders: ordersWithReferrer,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get affiliate orders error:', error);
    res.status(500).json({ error: 'Failed to get affiliate orders' });
  }
});

// ===== BADGE & BORDER SYSTEM =====

// Get all available badges
router.get('/badges', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const badges = await prisma.badge.findMany({
      where: { isActive: true },
      orderBy: [{ rarity: 'asc' }, { name: 'asc' }],
    });
    res.json({ badges });
  } catch (error) {
    console.error('Get badges error:', error);
    res.status(500).json({ error: 'Failed to get badges' });
  }
});

// Get user's badge collection
router.get('/badges/collection', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // Get all badges with user ownership status
    const [allBadges, userBadges, user] = await Promise.all([
      prisma.badge.findMany({
        where: { isActive: true },
        orderBy: [{ rarity: 'asc' }, { name: 'asc' }],
      }),
      prisma.userBadge.findMany({
        where: { userId },
        include: { badge: true },
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { equippedBadgeId: true },
      }),
    ]);

    const ownedBadgeIds = new Set(userBadges.map((ub) => ub.badgeId));
    const equippedBadge = userBadges.find((ub) => ub.isEquipped);

    const collection = allBadges.map((badge) => ({
      ...badge,
      owned: ownedBadgeIds.has(badge.id),
      isEquipped: equippedBadge?.badgeId === badge.id,
      unlockedAt: userBadges.find((ub) => ub.badgeId === badge.id)?.unlockedAt,
    }));

    res.json({
      collection,
      owned: userBadges.length,
      total: allBadges.length,
      equippedBadgeId: user?.equippedBadgeId || equippedBadge?.badgeId || null,
    });
  } catch (error) {
    console.error('Get badge collection error:', error);
    res.status(500).json({ error: 'Failed to get badge collection' });
  }
});

// Equip a badge
router.post('/badges/:badgeId/equip', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { badgeId } = req.params;

    // Check if user owns this badge
    const userBadge = await prisma.userBadge.findUnique({
      where: { userId_badgeId: { userId, badgeId } },
    });

    if (!userBadge) {
      return res.status(403).json({ error: 'You do not own this badge' });
    }

    // Unequip all badges, equip the selected one
    await prisma.$transaction([
      prisma.userBadge.updateMany({
        where: { userId, isEquipped: true },
        data: { isEquipped: false },
      }),
      prisma.userBadge.update({
        where: { userId_badgeId: { userId, badgeId } },
        data: { isEquipped: true },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { equippedBadgeId: badgeId },
      }),
    ]);

    res.json({ success: true, message: 'Badge equipped' });
  } catch (error) {
    console.error('Equip badge error:', error);
    res.status(500).json({ error: 'Failed to equip badge' });
  }
});

// Unequip current badge
router.post('/badges/unequip', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    await prisma.$transaction([
      prisma.userBadge.updateMany({
        where: { userId, isEquipped: true },
        data: { isEquipped: false },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { equippedBadgeId: null },
      }),
    ]);

    res.json({ success: true, message: 'Badge unequipped' });
  } catch (error) {
    console.error('Unequip badge error:', error);
    res.status(500).json({ error: 'Failed to unequip badge' });
  }
});

// Get all available borders
router.get('/borders', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const borders = await prisma.profileBorder.findMany({
      where: { isActive: true },
      orderBy: [{ tier: 'asc' }, { name: 'asc' }],
    });
    res.json({ borders });
  } catch (error) {
    console.error('Get borders error:', error);
    res.status(500).json({ error: 'Failed to get borders' });
  }
});

// Get user's border collection
router.get('/borders/collection', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const [allBorders, userBorders, user] = await Promise.all([
      prisma.profileBorder.findMany({
        where: { isActive: true },
        orderBy: [{ tier: 'asc' }, { name: 'asc' }],
      }),
      prisma.userBorder.findMany({
        where: { userId },
        include: { border: true },
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { equippedBorderId: true },
      }),
    ]);

    const ownedBorderIds = new Set(userBorders.map((ub) => ub.borderId));
    const equippedBorder = userBorders.find((ub) => ub.isEquipped);

    const collection = allBorders.map((border) => ({
      ...border,
      owned: ownedBorderIds.has(border.id),
      isEquipped: equippedBorder?.borderId === border.id,
      unlockedAt: userBorders.find((ub) => ub.borderId === border.id)?.unlockedAt,
    }));

    res.json({
      collection,
      owned: userBorders.length,
      total: allBorders.length,
      equippedBorderId: user?.equippedBorderId || equippedBorder?.borderId || null,
    });
  } catch (error) {
    console.error('Get border collection error:', error);
    res.status(500).json({ error: 'Failed to get border collection' });
  }
});

// Equip a border
router.post('/borders/:borderId/equip', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { borderId } = req.params;

    // Check if user owns this border
    const userBorder = await prisma.userBorder.findUnique({
      where: { userId_borderId: { userId, borderId } },
    });

    if (!userBorder) {
      return res.status(403).json({ error: 'You do not own this border' });
    }

    // Unequip all borders, equip the selected one
    await prisma.$transaction([
      prisma.userBorder.updateMany({
        where: { userId, isEquipped: true },
        data: { isEquipped: false },
      }),
      prisma.userBorder.update({
        where: { userId_borderId: { userId, borderId } },
        data: { isEquipped: true },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { equippedBorderId: borderId },
      }),
    ]);

    res.json({ success: true, message: 'Border equipped' });
  } catch (error) {
    console.error('Equip border error:', error);
    res.status(500).json({ error: 'Failed to equip border' });
  }
});

// Unequip current border
router.post('/borders/unequip', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    await prisma.$transaction([
      prisma.userBorder.updateMany({
        where: { userId, isEquipped: true },
        data: { isEquipped: false },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { equippedBorderId: null },
      }),
    ]);

    res.json({ success: true, message: 'Border unequipped' });
  } catch (error) {
    console.error('Unequip border error:', error);
    res.status(500).json({ error: 'Failed to unequip border' });
  }
});

// Get user's equipped customizations (badge + border) - useful for profile display
router.get('/customizations', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        equippedBadgeId: true,
        equippedBorderId: true,
        badges: {
          where: { isEquipped: true },
          include: { badge: true },
        },
        borders: {
          where: { isEquipped: true },
          include: { border: true },
        },
      },
    });

    res.json({
      badge: user?.badges[0]?.badge || null,
      border: user?.borders[0]?.border || null,
    });
  } catch (error) {
    console.error('Get customizations error:', error);
    res.status(500).json({ error: 'Failed to get customizations' });
  }
});

// Get another user's equipped customizations (for viewing profiles)
router.get('/customizations/:userId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        badges: {
          where: { isEquipped: true },
          include: { badge: true },
        },
        borders: {
          where: { isEquipped: true },
          include: { border: true },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      badge: user.badges[0]?.badge || null,
      border: user.borders[0]?.border || null,
    });
  } catch (error) {
    console.error('Get user customizations error:', error);
    res.status(500).json({ error: 'Failed to get customizations' });
  }
});

// ===== ADMIN BADGE & BORDER MANAGEMENT =====

// Admin: Get all badges
router.get('/admin/badges', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const badges = await prisma.badge.findMany({
      orderBy: [{ rarity: 'asc' }, { name: 'asc' }],
      include: {
        _count: { select: { owners: true } },
        achievement: { select: { id: true, name: true } },
        reward: { select: { id: true, name: true } },
      },
    });

    res.json({
      badges: badges.map((b) => ({
        ...b,
        ownersCount: b._count.owners,
      })),
      total: badges.length,
    });
  } catch (error) {
    console.error('Get admin badges error:', error);
    res.status(500).json({ error: 'Failed to get badges' });
  }
});

// Admin: Create a badge
router.post('/admin/badges', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, imageUrl, rarity, category, achievementId, rewardId } = req.body;

    if (!name || !imageUrl || !category) {
      return res.status(400).json({ error: 'name, imageUrl, and category are required' });
    }

    const badge = await prisma.badge.create({
      data: {
        name,
        description,
        imageUrl,
        rarity: rarity || 'COMMON',
        category,
        achievementId: achievementId || null,
        rewardId: rewardId || null,
      },
    });

    res.status(201).json({ badge, message: 'Badge created successfully' });
  } catch (error) {
    console.error('Create badge error:', error);
    res.status(500).json({ error: 'Failed to create badge' });
  }
});

// Admin: Update a badge
router.put('/admin/badges/:badgeId', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { badgeId } = req.params;
    const { name, description, imageUrl, rarity, category, achievementId, rewardId, isActive } = req.body;

    const existing = await prisma.badge.findUnique({ where: { id: badgeId } });
    if (!existing) {
      return res.status(404).json({ error: 'Badge not found' });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    if (rarity !== undefined) updateData.rarity = rarity;
    if (category !== undefined) updateData.category = category;
    if (achievementId !== undefined) updateData.achievementId = achievementId || null;
    if (rewardId !== undefined) updateData.rewardId = rewardId || null;
    if (isActive !== undefined) updateData.isActive = isActive;

    const badge = await prisma.badge.update({
      where: { id: badgeId },
      data: updateData,
    });

    res.json({ badge, message: 'Badge updated successfully' });
  } catch (error) {
    console.error('Update badge error:', error);
    res.status(500).json({ error: 'Failed to update badge' });
  }
});

// Admin: Delete a badge
router.delete('/admin/badges/:badgeId', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { badgeId } = req.params;

    const owners = await prisma.userBadge.count({ where: { badgeId } });
    if (owners > 0) {
      // Soft delete
      await prisma.badge.update({
        where: { id: badgeId },
        data: { isActive: false },
      });
      return res.json({ message: `Badge deactivated (${owners} users own this badge)` });
    }

    await prisma.badge.delete({ where: { id: badgeId } });
    res.json({ message: 'Badge deleted successfully' });
  } catch (error) {
    console.error('Delete badge error:', error);
    res.status(500).json({ error: 'Failed to delete badge' });
  }
});

// Admin: Grant a badge to a user
router.post('/admin/badges/:badgeId/grant', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { badgeId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const [badge, user, existing] = await Promise.all([
      prisma.badge.findUnique({ where: { id: badgeId } }),
      prisma.user.findUnique({ where: { id: userId }, select: { email: true } }),
      prisma.userBadge.findUnique({ where: { userId_badgeId: { userId, badgeId } } }),
    ]);

    if (!badge) return res.status(404).json({ error: 'Badge not found' });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (existing) return res.status(400).json({ error: 'User already owns this badge' });

    await prisma.userBadge.create({
      data: { userId, badgeId },
    });

    res.json({ success: true, message: `Badge "${badge.name}" granted to ${user.email}` });
  } catch (error) {
    console.error('Grant badge error:', error);
    res.status(500).json({ error: 'Failed to grant badge' });
  }
});

// Admin: Get all borders
router.get('/admin/borders', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const borders = await prisma.profileBorder.findMany({
      orderBy: [{ tier: 'asc' }, { name: 'asc' }],
      include: {
        _count: { select: { owners: true } },
        achievement: { select: { id: true, name: true } },
      },
    });

    res.json({
      borders: borders.map((b) => ({
        ...b,
        ownersCount: b._count.owners,
      })),
      total: borders.length,
    });
  } catch (error) {
    console.error('Get admin borders error:', error);
    res.status(500).json({ error: 'Failed to get borders' });
  }
});

// Admin: Create a border
router.post('/admin/borders', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { name, tier, colors, spinSpeed, glowIntensity, specialEffect, achievementId } = req.body;

    if (!name || !tier || !colors) {
      return res.status(400).json({ error: 'name, tier, and colors are required' });
    }

    const border = await prisma.profileBorder.create({
      data: {
        name,
        tier,
        colors,
        spinSpeed: spinSpeed || 4,
        glowIntensity: glowIntensity || 1,
        specialEffect: specialEffect || null,
        achievementId: achievementId || null,
      },
    });

    res.status(201).json({ border, message: 'Border created successfully' });
  } catch (error) {
    console.error('Create border error:', error);
    res.status(500).json({ error: 'Failed to create border' });
  }
});

// Admin: Update a border
router.put('/admin/borders/:borderId', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { borderId } = req.params;
    const { name, tier, colors, spinSpeed, glowIntensity, specialEffect, achievementId, isActive } = req.body;

    const existing = await prisma.profileBorder.findUnique({ where: { id: borderId } });
    if (!existing) {
      return res.status(404).json({ error: 'Border not found' });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (tier !== undefined) updateData.tier = tier;
    if (colors !== undefined) updateData.colors = colors;
    if (spinSpeed !== undefined) updateData.spinSpeed = spinSpeed;
    if (glowIntensity !== undefined) updateData.glowIntensity = glowIntensity;
    if (specialEffect !== undefined) updateData.specialEffect = specialEffect;
    if (achievementId !== undefined) updateData.achievementId = achievementId || null;
    if (isActive !== undefined) updateData.isActive = isActive;

    const border = await prisma.profileBorder.update({
      where: { id: borderId },
      data: updateData,
    });

    res.json({ border, message: 'Border updated successfully' });
  } catch (error) {
    console.error('Update border error:', error);
    res.status(500).json({ error: 'Failed to update border' });
  }
});

// Admin: Delete a border
router.delete('/admin/borders/:borderId', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { borderId } = req.params;

    const owners = await prisma.userBorder.count({ where: { borderId } });
    if (owners > 0) {
      // Soft delete
      await prisma.profileBorder.update({
        where: { id: borderId },
        data: { isActive: false },
      });
      return res.json({ message: `Border deactivated (${owners} users own this border)` });
    }

    await prisma.profileBorder.delete({ where: { id: borderId } });
    res.json({ message: 'Border deleted successfully' });
  } catch (error) {
    console.error('Delete border error:', error);
    res.status(500).json({ error: 'Failed to delete border' });
  }
});

// Admin: Grant a border to a user
router.post('/admin/borders/:borderId/grant', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { borderId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const [border, user, existing] = await Promise.all([
      prisma.profileBorder.findUnique({ where: { id: borderId } }),
      prisma.user.findUnique({ where: { id: userId }, select: { email: true } }),
      prisma.userBorder.findUnique({ where: { userId_borderId: { userId, borderId } } }),
    ]);

    if (!border) return res.status(404).json({ error: 'Border not found' });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (existing) return res.status(400).json({ error: 'User already owns this border' });

    await prisma.userBorder.create({
      data: { userId, borderId },
    });

    res.json({ success: true, message: `Border "${border.name}" granted to ${user.email}` });
  } catch (error) {
    console.error('Grant border error:', error);
    res.status(500).json({ error: 'Failed to grant border' });
  }
});

// ===== ADMIN POINT CONFIGURATION =====

// Get current point configuration
router.get('/admin/config/points', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    let config = await prisma.gamificationConfig.findFirst({
      where: { key: 'point_values' },
    });

    // Default point values if not configured
    const defaultConfig = {
      DAILY_CHECK_IN: 10,
      WORK_SUBMITTED: 25,
      WORK_APPROVED: 50,
      STATEMENT_VIEWED: 5,
      PROFILE_COMPLETE: 50,
      PAYMENT_RECEIVED: 100,
      REVENUE_MILESTONE: { $1: 25, $100: 100, $1000: 250, $10000: 500 },
      REFERRAL_SIGNUP: 100,
      REFERRAL_CONVERSION: 250,
      SOCIAL_SHARE: 15,
      STREAK_BONUS: { 7: 50, 30: 200, 100: 500 },
      MULTIPLIERS: {
        weekendBonus: 1.5,
        eventBonus: 2.0,
        tierMultipliers: { BRONZE: 1.0, SILVER: 1.1, GOLD: 1.25, ELITE: 1.5, DIAMOND: 2.0 }
      },
      TIER_THRESHOLDS: { BRONZE: 0, SILVER: 1000, GOLD: 2500, ELITE: 5000, DIAMOND: 10000 },
    };

    if (!config) {
      config = await prisma.gamificationConfig.create({
        data: {
          key: 'point_values',
          value: defaultConfig,
        },
      });
    }

    res.json({ config: config.value, updatedAt: config.updatedAt });
  } catch (error) {
    console.error('Get point config error:', error);
    res.status(500).json({ error: 'Failed to get point configuration' });
  }
});

// Update point configuration
router.put('/admin/config/points', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { config } = req.body;
    const adminId = req.user!.id;

    if (!config || typeof config !== 'object') {
      return res.status(400).json({ error: 'config object is required' });
    }

    const updated = await prisma.gamificationConfig.upsert({
      where: { key: 'point_values' },
      create: {
        key: 'point_values',
        value: config,
      },
      update: {
        value: config,
        updatedAt: new Date(),
      },
    });

    // Log the config change
    await prisma.gamificationEvent.create({
      data: {
        userId: adminId,
        eventType: 'CONFIG_UPDATED',
        points: 0,
        description: 'Point configuration updated',
        metadata: { changes: config },
      },
    });

    res.json({
      success: true,
      message: 'Point configuration updated',
      config: updated.value,
    });
  } catch (error) {
    console.error('Update point config error:', error);
    res.status(500).json({ error: 'Failed to update point configuration' });
  }
});

// ===== ADMIN TOOL PERMISSIONS MANAGEMENT =====

// Available tools that can be granted
const AVAILABLE_TOOLS = [
  { id: 'type-beat-video-maker', name: 'Type Beat Video Maker', description: 'Create professional videos for type beats' },
  { id: 'session-payout', name: 'Session Payout Tool', description: 'Calculate and manage session payouts' },
  { id: 'work-registration', name: 'Work Registration', description: 'Register musical works with PROs' },
  { id: 'metadata-index', name: 'Metadata Index', description: 'Search and explore music metadata' },
  { id: 'pub-deal-simulator', name: 'Pub Deal Simulator', description: 'Simulate publishing deal scenarios' },
  { id: 'advance-estimator', name: 'Advance Estimator', description: 'Estimate publishing advances' },
];

// Get list of available tools
router.get('/admin/tools/available', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  res.json({ tools: AVAILABLE_TOOLS });
});

// Get all tool permissions across users
router.get('/admin/tools/permissions', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;
    const toolId = req.query.toolId as string;
    const type = req.query.type as string;

    const where: any = {
      status: 'ACTIVE',
    };

    if (toolId) {
      where.toolId = toolId;
    }

    if (type) {
      where.type = type;
    }

    if (search) {
      where.user = {
        OR: [
          { email: { contains: search, mode: 'insensitive' } },
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    const [permissions, total] = await Promise.all([
      prisma.toolSubscription.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.toolSubscription.count({ where }),
    ]);

    res.json({
      permissions: permissions.map((p) => ({
        id: p.id,
        userId: p.userId,
        userName: `${p.user.firstName || ''} ${p.user.lastName || ''}`.trim() || p.user.email,
        userEmail: p.user.email,
        userRole: p.user.role,
        toolId: p.toolId,
        toolName: p.toolName,
        type: p.type,
        status: p.status,
        expiresAt: p.expiresAt,
        grantedById: p.grantedById,
        grantReason: p.grantReason,
        createdAt: p.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get tool permissions error:', error);
    res.status(500).json({ error: 'Failed to get tool permissions' });
  }
});

// Get a specific user's tool permissions
router.get('/admin/users/:userId/tools', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const permissions = await prisma.toolSubscription.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    // Check which tools user has access to
    const toolAccess = AVAILABLE_TOOLS.map((tool) => {
      const permission = permissions.find(
        (p) => p.toolId === tool.id && p.status === 'ACTIVE' && (!p.expiresAt || p.expiresAt > new Date())
      );
      return {
        ...tool,
        hasAccess: !!permission || user.role === 'ADMIN' || user.role === 'WRITER',
        accessType: permission?.type || (user.role === 'ADMIN' || user.role === 'WRITER' ? 'ROLE_BASED' : null),
        expiresAt: permission?.expiresAt,
        grantReason: permission?.grantReason,
        permissionId: permission?.id,
      };
    });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
        role: user.role,
      },
      tools: toolAccess,
      permissions,
    });
  } catch (error) {
    console.error('Get user tools error:', error);
    res.status(500).json({ error: 'Failed to get user tool permissions' });
  }
});

// Grant tool access to a user
router.post('/admin/users/:userId/tools/grant', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { toolId, reason, expiresInDays } = req.body;
    const adminId = req.user!.id;

    if (!toolId) {
      return res.status(400).json({ error: 'toolId is required' });
    }

    // Validate tool exists
    const tool = AVAILABLE_TOOLS.find((t) => t.id === toolId);
    if (!tool) {
      return res.status(400).json({ error: 'Invalid toolId' });
    }

    // Check user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user already has admin-granted access to this tool
    const existingPermission = await prisma.toolSubscription.findFirst({
      where: {
        userId,
        toolId,
        type: 'ADMIN_GRANTED',
        status: 'ACTIVE',
      },
    });

    if (existingPermission) {
      return res.status(400).json({
        error: 'User already has admin-granted access to this tool',
        existingPermission,
      });
    }

    // Calculate expiration date
    let expiresAt: Date | null = null;
    if (expiresInDays && expiresInDays > 0) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    }

    // Create the permission
    const permission = await prisma.toolSubscription.create({
      data: {
        userId,
        toolId,
        toolName: tool.name,
        type: 'ADMIN_GRANTED',
        status: 'ACTIVE',
        usesRemaining: 0, // Unlimited
        usesTotal: 0,
        grantedById: adminId,
        grantReason: reason || 'Admin granted access',
        expiresAt,
      },
    });

    res.status(201).json({
      success: true,
      message: `Granted "${tool.name}" access to ${user.email}`,
      permission: {
        id: permission.id,
        toolId: permission.toolId,
        toolName: permission.toolName,
        expiresAt: permission.expiresAt,
        grantReason: permission.grantReason,
      },
    });
  } catch (error) {
    console.error('Grant tool access error:', error);
    res.status(500).json({ error: 'Failed to grant tool access' });
  }
});

// Revoke tool access from a user
router.post('/admin/users/:userId/tools/revoke', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { toolId, permissionId } = req.body;

    if (!toolId && !permissionId) {
      return res.status(400).json({ error: 'toolId or permissionId is required' });
    }

    // Check user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Find and update the permission
    const where: any = { userId };
    if (permissionId) {
      where.id = permissionId;
    } else {
      where.toolId = toolId;
      where.type = 'ADMIN_GRANTED';
      where.status = 'ACTIVE';
    }

    const permission = await prisma.toolSubscription.findFirst({ where });

    if (!permission) {
      return res.status(404).json({ error: 'Permission not found' });
    }

    // Only allow revoking admin-granted permissions
    if (permission.type !== 'ADMIN_GRANTED') {
      return res.status(400).json({
        error: 'Can only revoke admin-granted permissions. This permission is type: ' + permission.type
      });
    }

    // Revoke by setting status to CANCELLED
    await prisma.toolSubscription.update({
      where: { id: permission.id },
      data: { status: 'CANCELLED' },
    });

    res.json({
      success: true,
      message: `Revoked "${permission.toolName}" access from ${user.email}`,
    });
  } catch (error) {
    console.error('Revoke tool access error:', error);
    res.status(500).json({ error: 'Failed to revoke tool access' });
  }
});

// Bulk grant tool access to multiple users
router.post('/admin/tools/bulk-grant', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { userIds, toolId, reason, expiresInDays } = req.body;
    const adminId = req.user!.id;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: 'userIds array is required' });
    }

    if (!toolId) {
      return res.status(400).json({ error: 'toolId is required' });
    }

    // Validate tool exists
    const tool = AVAILABLE_TOOLS.find((t) => t.id === toolId);
    if (!tool) {
      return res.status(400).json({ error: 'Invalid toolId' });
    }

    // Calculate expiration date
    let expiresAt: Date | null = null;
    if (expiresInDays && expiresInDays > 0) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    }

    // Get existing permissions to avoid duplicates
    const existingPermissions = await prisma.toolSubscription.findMany({
      where: {
        userId: { in: userIds },
        toolId,
        type: 'ADMIN_GRANTED',
        status: 'ACTIVE',
      },
      select: { userId: true },
    });

    const existingUserIds = new Set(existingPermissions.map((p) => p.userId));
    const newUserIds = userIds.filter((id: string) => !existingUserIds.has(id));

    if (newUserIds.length === 0) {
      return res.status(400).json({ error: 'All users already have access to this tool' });
    }

    // Verify all users exist
    const users = await prisma.user.findMany({
      where: { id: { in: newUserIds } },
      select: { id: true, email: true },
    });

    const validUserIds = users.map((u) => u.id);

    // Create permissions for valid users
    const created = await prisma.toolSubscription.createMany({
      data: validUserIds.map((uid) => ({
        userId: uid,
        toolId,
        toolName: tool.name,
        type: 'ADMIN_GRANTED' as const,
        status: 'ACTIVE' as const,
        usesRemaining: 0,
        usesTotal: 0,
        grantedById: adminId,
        grantReason: reason || 'Admin granted access',
        expiresAt,
      })),
    });

    res.status(201).json({
      success: true,
      message: `Granted "${tool.name}" access to ${created.count} users`,
      granted: created.count,
      skipped: userIds.length - created.count,
      skippedReason: existingUserIds.size > 0 ? 'Already had access' : 'Invalid user IDs',
    });
  } catch (error) {
    console.error('Bulk grant tool access error:', error);
    res.status(500).json({ error: 'Failed to bulk grant tool access' });
  }
});

// Ensure default tool access rewards exist (Admin only)
// This creates the Tour Miles rewards for tools if they don't exist
router.post('/admin/rewards/ensure-defaults', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const defaultToolRewards = [
      {
        name: 'Video Maker Tool Access',
        description: 'Unlock the Type Beat Video Maker tool for 30 days. Create professional videos by combining beats with images and upload directly to YouTube.',
        cost: 750,
        category: 'PLATFORM' as const,
        type: 'TOOL_ACCESS',
        roleRestriction: 'CUSTOMER',
        details: {
          toolId: 'type-beat-video-maker',
          durationDays: 30,
          features: ['Batch processing', 'YouTube upload', '16:9 and 9:16 formats', 'Custom artwork']
        },
      },
    ];

    const results = [];

    for (const reward of defaultToolRewards) {
      // Check if reward already exists
      const existing = await prisma.reward.findFirst({
        where: {
          type: reward.type,
          details: {
            path: ['toolId'],
            equals: (reward.details as any).toolId
          }
        }
      });

      if (existing) {
        results.push({ name: reward.name, status: 'already_exists', id: existing.id });
      } else {
        const created = await prisma.reward.create({
          data: reward
        });
        results.push({ name: reward.name, status: 'created', id: created.id });
      }
    }

    res.json({
      success: true,
      message: 'Default rewards ensured',
      results
    });
  } catch (error) {
    console.error('Ensure default rewards error:', error);
    res.status(500).json({ error: 'Failed to ensure default rewards' });
  }
});

// Get or create a specific tool reward (for customers needing to unlock tools)
router.get('/tools/:toolId/reward', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { toolId } = req.params;

    // Find the reward for this tool
    let reward = await prisma.reward.findFirst({
      where: {
        type: 'TOOL_ACCESS',
        isActive: true,
        details: {
          path: ['toolId'],
          equals: toolId
        }
      }
    });

    // If reward doesn't exist, create it (for type-beat-video-maker)
    if (!reward && toolId === 'type-beat-video-maker') {
      reward = await prisma.reward.create({
        data: {
          name: 'Video Maker Tool Access',
          description: 'Unlock the Type Beat Video Maker tool for 30 days. Create professional videos by combining beats with images and upload directly to YouTube.',
          cost: 750,
          category: 'PLATFORM',
          type: 'TOOL_ACCESS',
          roleRestriction: 'CUSTOMER',
          details: {
            toolId: 'type-beat-video-maker',
            durationDays: 30,
            features: ['Batch processing', 'YouTube upload', '16:9 and 9:16 formats', 'Custom artwork']
          },
        }
      });
    }

    if (!reward) {
      return res.status(404).json({ error: 'Tool reward not found' });
    }

    res.json(reward);
  } catch (error) {
    console.error('Get tool reward error:', error);
    res.status(500).json({ error: 'Failed to get tool reward' });
  }
});

export default router;
