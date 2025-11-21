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

export default router;
