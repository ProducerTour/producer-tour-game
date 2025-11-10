import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest, requireAdmin } from '../middleware/auth.middleware';
import { prisma } from '../lib/prisma';
import { stripeService } from '../services/stripe.service';

const router = Router();

// Validation schemas
const requestPayoutSchema = z.object({
  amount: z.number().positive(), // Minimum validated dynamically
});

const approvePayoutSchema = z.object({
  adminNotes: z.string().optional(),
});

/**
 * GET /api/payouts/balance
 * Get current user's wallet balance
 */
router.get('/balance', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // Get system settings for minimum withdrawal
    let settings = await prisma.systemSettings.findFirst();
    if (!settings) {
      settings = await prisma.systemSettings.create({
        data: { minimumWithdrawalAmount: 50.00 }
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        availableBalance: true,
        pendingBalance: true,
        lifetimeEarnings: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      availableBalance: Number(user.availableBalance),
      pendingBalance: Number(user.pendingBalance),
      lifetimeEarnings: Number(user.lifetimeEarnings),
      minimumWithdrawalAmount: Number(settings.minimumWithdrawalAmount),
    });
  } catch (error) {
    console.error('Get balance error:', error);
    res.status(500).json({ error: 'Failed to get balance' });
  }
});

/**
 * POST /api/payouts/request
 * Writer requests a payout from their available balance
 */
router.post('/request', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { amount } = requestPayoutSchema.parse(req.body);

    // Get system settings for minimum withdrawal amount
    let settings = await prisma.systemSettings.findFirst();
    if (!settings) {
      settings = await prisma.systemSettings.create({
        data: { minimumWithdrawalAmount: 50.00 }
      });
    }
    const minimumAmount = Number(settings.minimumWithdrawalAmount);

    // Get user with balance and Stripe account info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        availableBalance: true,
        stripeAccountId: true,
        stripeOnboardingComplete: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user has Stripe account connected
    if (!user.stripeAccountId || !user.stripeOnboardingComplete) {
      return res.status(400).json({
        error: 'Please connect your payment account before requesting a payout',
        requiresStripeSetup: true,
      });
    }

    // Check if user has sufficient balance
    const availableBalance = Number(user.availableBalance);
    if (amount > availableBalance) {
      return res.status(400).json({
        error: `Insufficient balance. Available: $${availableBalance.toFixed(2)}`,
        availableBalance,
      });
    }

    // Check minimum payout amount (dynamic)
    if (amount < minimumAmount) {
      return res.status(400).json({
        error: `Minimum payout amount is $${minimumAmount.toFixed(2)}`,
        minimumAmount,
      });
    }

    // Create payout request
    const payoutRequest = await prisma.payoutRequest.create({
      data: {
        userId,
        amount,
        status: 'PENDING',
      },
    });

    // Move amount from available to pending balance
    await prisma.user.update({
      where: { id: userId },
      data: {
        availableBalance: { decrement: amount },
        pendingBalance: { increment: amount },
      },
    });

    res.status(201).json({
      message: 'Payout request submitted successfully',
      request: {
        id: payoutRequest.id,
        amount: Number(payoutRequest.amount),
        status: payoutRequest.status,
        requestedAt: payoutRequest.requestedAt,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Request payout error:', error);
    res.status(500).json({ error: 'Failed to request payout' });
  }
});

/**
 * GET /api/payouts/history
 * Get current user's payout request history
 */
router.get('/history', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const payouts = await prisma.payoutRequest.findMany({
      where: { userId },
      orderBy: { requestedAt: 'desc' },
    });

    res.json({
      payouts: payouts.map((p) => ({
        id: p.id,
        amount: Number(p.amount),
        status: p.status,
        requestedAt: p.requestedAt,
        approvedAt: p.approvedAt,
        processedAt: p.processedAt,
        completedAt: p.completedAt,
        failureReason: p.failureReason,
      })),
      total: payouts.length,
    });
  } catch (error) {
    console.error('Get payout history error:', error);
    res.status(500).json({ error: 'Failed to get payout history' });
  }
});

/**
 * GET /api/payouts/pending
 * Get all pending payout requests (Admin only)
 */
router.get('/pending', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const payouts = await prisma.payoutRequest.findMany({
      where: {
        status: { in: ['PENDING', 'APPROVED', 'PROCESSING'] },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            stripeAccountId: true,
            stripeOnboardingComplete: true,
            stripeAccountStatus: true,
          },
        },
      },
      orderBy: { requestedAt: 'asc' },
    });

    res.json({
      payouts: payouts.map((p) => ({
        id: p.id,
        amount: Number(p.amount),
        status: p.status,
        requestedAt: p.requestedAt,
        approvedAt: p.approvedAt,
        processedAt: p.processedAt,
        user: {
          id: p.user.id,
          email: p.user.email,
          name: `${p.user.firstName || ''} ${p.user.lastName || ''}`.trim() || 'No name',
          stripeConnected: !!p.user.stripeAccountId,
          stripeOnboardingComplete: p.user.stripeOnboardingComplete,
          stripeAccountStatus: p.user.stripeAccountStatus,
        },
        adminNotes: p.adminNotes,
      })),
      total: payouts.length,
    });
  } catch (error) {
    console.error('Get pending payouts error:', error);
    res.status(500).json({ error: 'Failed to get pending payouts' });
  }
});

/**
 * POST /api/payouts/:id/approve
 * Admin approves a payout request and initiates Stripe transfer
 */
router.post('/:id/approve', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id: payoutId } = req.params;
    const { adminNotes } = approvePayoutSchema.parse(req.body);

    // Get payout request
    const payout = await prisma.payoutRequest.findUnique({
      where: { id: payoutId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            stripeAccountId: true,
            stripeOnboardingComplete: true,
          },
        },
      },
    });

    if (!payout) {
      return res.status(404).json({ error: 'Payout request not found' });
    }

    if (payout.status !== 'PENDING') {
      return res.status(400).json({
        error: `Cannot approve payout with status: ${payout.status}`,
      });
    }

    // Check if user has Stripe account
    if (!payout.user.stripeAccountId || !payout.user.stripeOnboardingComplete) {
      return res.status(400).json({
        error: 'Writer has not completed Stripe Connect onboarding',
      });
    }

    // Update status to APPROVED
    await prisma.payoutRequest.update({
      where: { id: payoutId },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
        adminNotes,
      },
    });

    // Note: Actual Stripe transfer happens automatically since money is already
    // in their Stripe Connect account from when admin processed statement payments.
    // Stripe Connect accounts have automatic payouts to the bank based on their schedule.

    // Mark as processing (Stripe will handle the bank transfer)
    await prisma.payoutRequest.update({
      where: { id: payoutId },
      data: {
        status: 'PROCESSING',
        processedAt: new Date(),
      },
    });

    // In test mode or with instant payouts, mark as completed immediately
    // In production, we'd need a webhook to update this when Stripe confirms
    const isTestMode = process.env.STRIPE_SECRET_KEY?.includes('test');
    if (isTestMode) {
      await prisma.payoutRequest.update({
        where: { id: payoutId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });

      // Move from pending to completed (remove from pending balance)
      await prisma.user.update({
        where: { id: payout.userId },
        data: {
          pendingBalance: { decrement: Number(payout.amount) },
        },
      });
    }

    res.json({
      message: isTestMode
        ? 'Payout approved and completed (test mode)'
        : 'Payout approved and processing',
      payoutId,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Approve payout error:', error);
    res.status(500).json({ error: 'Failed to approve payout' });
  }
});

/**
 * POST /api/payouts/:id/cancel
 * Cancel a pending payout request (Writer or Admin)
 */
router.post('/:id/cancel', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id: payoutId } = req.params;
    const userId = req.user!.id;
    const isAdmin = req.user!.role === 'ADMIN';

    const payout = await prisma.payoutRequest.findUnique({
      where: { id: payoutId },
    });

    if (!payout) {
      return res.status(404).json({ error: 'Payout request not found' });
    }

    // Check permissions: writer can only cancel their own pending requests
    if (!isAdmin && payout.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized to cancel this payout' });
    }

    // Can only cancel pending requests
    if (payout.status !== 'PENDING') {
      return res.status(400).json({
        error: `Cannot cancel payout with status: ${payout.status}`,
      });
    }

    // Cancel the request and return balance to available
    await prisma.payoutRequest.update({
      where: { id: payoutId },
      data: { status: 'CANCELLED' },
    });

    await prisma.user.update({
      where: { id: payout.userId },
      data: {
        availableBalance: { increment: Number(payout.amount) },
        pendingBalance: { decrement: Number(payout.amount) },
      },
    });

    res.json({
      message: 'Payout request cancelled successfully',
      payoutId,
    });
  } catch (error) {
    console.error('Cancel payout error:', error);
    res.status(500).json({ error: 'Failed to cancel payout' });
  }
});

export default router;
