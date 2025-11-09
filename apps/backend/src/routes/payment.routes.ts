import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { stripeService } from '../services/stripe.service';
import { prisma } from '../lib/prisma';

const router = Router();

/**
 * GET /api/payments/status
 * Get current user's Stripe payment status
 */
router.get('/status', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        stripeAccountId: true,
        stripeOnboardingComplete: true,
        stripeAccountStatus: true,
        stripeDetailsSubmitted: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // If user has a Stripe account, refresh its status
    if (user.stripeAccountId) {
      try {
        const status = await stripeService.updateAccountStatus(userId);
        return res.json({
          hasAccount: true,
          ...status,
        });
      } catch (error) {
        console.error('Error refreshing Stripe status:', error);
        // Return cached status if refresh fails
        return res.json({
          hasAccount: true,
          onboardingComplete: user.stripeOnboardingComplete,
          accountStatus: user.stripeAccountStatus,
          detailsSubmitted: user.stripeDetailsSubmitted,
        });
      }
    }

    // No Stripe account yet
    res.json({
      hasAccount: false,
      onboardingComplete: false,
      accountStatus: null,
      detailsSubmitted: false,
    });
  } catch (error) {
    console.error('Get payment status error:', error);
    res.status(500).json({ error: 'Failed to get payment status' });
  }
});

/**
 * POST /api/payments/onboard
 * Create or get Stripe onboarding link for writer
 */
router.post('/onboard', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { returnUrl, refreshUrl } = req.body;

    if (!returnUrl || !refreshUrl) {
      return res.status(400).json({
        error: 'returnUrl and refreshUrl are required',
      });
    }

    const onboardingUrl = await stripeService.createOnboardingLink(
      userId,
      returnUrl,
      refreshUrl
    );

    res.json({ url: onboardingUrl });
  } catch (error: any) {
    console.error('Create onboarding link error:', error);
    res.status(500).json({ error: error.message || 'Failed to create onboarding link' });
  }
});

/**
 * POST /api/payments/dashboard-link
 * Get Stripe Express dashboard login link
 */
router.post('/dashboard-link', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { stripeAccountId: true, stripeOnboardingComplete: true },
    });

    if (!user?.stripeAccountId) {
      return res.status(400).json({
        error: 'No Stripe account connected. Please complete onboarding first.',
      });
    }

    if (!user.stripeOnboardingComplete) {
      return res.status(400).json({
        error: 'Onboarding not complete. Please finish setting up your payment account.',
      });
    }

    const dashboardUrl = await stripeService.createDashboardLink(userId);

    res.json({ url: dashboardUrl });
  } catch (error: any) {
    console.error('Create dashboard link error:', error);
    res.status(500).json({ error: error.message || 'Failed to create dashboard link' });
  }
});

/**
 * GET /api/payments/history
 * Get payment history for current writer
 */
router.get('/history', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // Get all statement items for this writer where payment was processed
    const paidItems = await prisma.statementItem.findMany({
      where: {
        userId,
        isVisibleToWriter: true,
        paidAt: { not: null },
      },
      include: {
        statement: {
          select: {
            id: true,
            filename: true,
            proType: true,
            paymentStatus: true,
            paymentProcessedAt: true,
            stripeTransferIds: true,
          },
        },
      },
      orderBy: { paidAt: 'desc' },
    });

    // Group by statement
    const paymentsByStatement = new Map();

    for (const item of paidItems) {
      const statementId = item.statement.id;

      if (!paymentsByStatement.has(statementId)) {
        paymentsByStatement.set(statementId, {
          statementId,
          filename: item.statement.filename,
          proType: item.statement.proType,
          paymentStatus: item.statement.paymentStatus,
          paidAt: item.paidAt,
          processedAt: item.statement.paymentProcessedAt,
          grossRevenue: 0,
          commissionAmount: 0,
          netAmount: 0,
          itemCount: 0,
        });
      }

      const payment = paymentsByStatement.get(statementId);
      payment.grossRevenue += Number(item.grossRevenue);
      payment.commissionAmount += Number(item.commissionAmount);
      payment.netAmount += Number(item.netAmount);
      payment.itemCount += 1;
    }

    res.json({
      payments: Array.from(paymentsByStatement.values()),
      total: paymentsByStatement.size,
    });
  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({ error: 'Failed to get payment history' });
  }
});

export default router;
