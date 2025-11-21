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
    if (redemption.reward.metadata) {
      const metadata = redemption.reward.metadata as any;
      const durationDays = metadata.durationDays;
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

export default router;
