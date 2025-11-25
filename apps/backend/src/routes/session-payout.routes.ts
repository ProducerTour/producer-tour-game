import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, requireAdmin, type AuthRequest } from '../middleware/auth.middleware';
import type { SessionPayoutStatus } from '../generated/client';

const router = Router();

// =====================
// HELPER: Generate unique work order number
// Format: PT-YY-XXXX (e.g., PT-25-0001)
// =====================

async function generateWorkOrderNumber(): Promise<string> {
  const currentYear = new Date().getFullYear().toString().slice(-2); // "25" for 2025
  const prefix = `PT-${currentYear}-`;

  // Find the highest work order number for this year
  const latestPayout = await prisma.sessionPayout.findFirst({
    where: {
      workOrderNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      workOrderNumber: 'desc',
    },
    select: {
      workOrderNumber: true,
    },
  });

  let nextSequence = 1;

  if (latestPayout?.workOrderNumber) {
    // Extract the sequence number from the latest work order
    const sequencePart = latestPayout.workOrderNumber.split('-')[2];
    if (sequencePart) {
      nextSequence = parseInt(sequencePart, 10) + 1;
    }
  }

  // Pad to 4 digits
  const sequenceStr = nextSequence.toString().padStart(4, '0');
  return `${prefix}${sequenceStr}`;
}

// =====================
// SESSION PAYOUT SUBMISSION (Authenticated users)
// =====================

/**
 * GET /api/session-payouts/next-work-order
 * Get the next auto-generated work order number
 */
router.get('/next-work-order', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const workOrderNumber = await generateWorkOrderNumber();
    res.json({ workOrderNumber });
  } catch (error: any) {
    console.error('Get next work order error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate work order number' });
  }
});

/**
 * POST /api/session-payouts
 * Submit a new session payout request
 */
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const {
      sessionDate,
      workOrderNumber,
      artistName,
      songTitles,
      startTime,
      finishTime,
      totalHours,
      studioName,
      trackingEngineer,
      assistantEngineer,
      mixEngineer,
      masteringEngineer,
      sessionNotes,
      masterLink,
      sessionFilesLink,
      beatStemsLink,
      beatLink,
      sampleInfo,
      midiPresetsLink,
      studioRateType,
      studioRate,
      engineerRateType,
      engineerRate,
      paymentSplit,
      depositPaid,
      studioCost,
      engineerFee,
      totalSessionCost,
      payoutAmount,
      submittedByName,
      submittedByEmail,
    } = req.body;

    // Auto-generate work order number (ignore any passed value)
    const generatedWorkOrder = await generateWorkOrderNumber();

    const sessionPayout = await prisma.sessionPayout.create({
      data: {
        sessionDate: sessionDate ? new Date(sessionDate) : new Date(),
        workOrderNumber: generatedWorkOrder,
        artistName: artistName || '',
        songTitles: songTitles || '',
        startTime: startTime || '',
        finishTime: finishTime || '',
        totalHours: totalHours || 0,
        studioName: studioName || '',
        trackingEngineer: trackingEngineer || '',
        assistantEngineer: assistantEngineer || null,
        mixEngineer: mixEngineer || null,
        masteringEngineer: masteringEngineer || null,
        sessionNotes: sessionNotes || null,
        masterLink: masterLink || '',
        sessionFilesLink: sessionFilesLink || '',
        beatStemsLink: beatStemsLink || '',
        beatLink: beatLink || '',
        sampleInfo: sampleInfo || null,
        midiPresetsLink: midiPresetsLink || null,
        studioRateType: studioRateType || 'flat',
        studioRate: studioRate || 0,
        engineerRateType: engineerRateType || 'flat',
        engineerRate: engineerRate || 0,
        paymentSplit: paymentSplit || 'combined',
        depositPaid: depositPaid || 0,
        studioCost: studioCost || 0,
        engineerFee: engineerFee || 0,
        totalSessionCost: totalSessionCost || 0,
        payoutAmount: payoutAmount || 0,
        submittedById: user.id,
        submittedByName: submittedByName || user.firstName || user.email || 'Unknown',
        submittedByEmail: submittedByEmail || user.email,
        status: 'PENDING',
      },
      include: {
        submittedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    res.status(201).json(sessionPayout);
  } catch (error: any) {
    console.error('Create session payout error:', error);
    res.status(500).json({ error: error.message || 'Failed to submit session payout' });
  }
});

/**
 * GET /api/session-payouts
 * Get session payouts (user: their own, admin: all)
 */
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { status, limit, offset } = req.query;

    const where: any = {};

    // Non-admins can only see their own submissions
    if (user.role !== 'ADMIN') {
      where.submittedById = user.id;
    }

    if (status) {
      where.status = status as SessionPayoutStatus;
    }

    const [sessionPayouts, total] = await Promise.all([
      prisma.sessionPayout.findMany({
        where,
        include: {
          submittedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          reviewedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit ? parseInt(limit as string) : 50,
        skip: offset ? parseInt(offset as string) : 0,
      }),
      prisma.sessionPayout.count({ where }),
    ]);

    res.json({ sessionPayouts, total });
  } catch (error: any) {
    console.error('Get session payouts error:', error);
    res.status(500).json({ error: error.message || 'Failed to get session payouts' });
  }
});

/**
 * GET /api/session-payouts/pending
 * Get pending session payouts count (for notifications)
 */
router.get('/pending', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const [pendingPayouts, count] = await Promise.all([
      prisma.sessionPayout.findMany({
        where: { status: 'PENDING' },
        include: {
          submittedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      prisma.sessionPayout.count({
        where: { status: 'PENDING' },
      }),
    ]);

    res.json({ pendingPayouts, count });
  } catch (error: any) {
    console.error('Get pending session payouts error:', error);
    res.status(500).json({ error: error.message || 'Failed to get pending payouts' });
  }
});

/**
 * GET /api/session-payouts/:id
 * Get a single session payout by ID
 */
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { id } = req.params;

    const sessionPayout = await prisma.sessionPayout.findUnique({
      where: { id },
      include: {
        submittedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            stripeAccountId: true,
            stripeOnboardingComplete: true,
          },
        },
        reviewedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!sessionPayout) {
      return res.status(404).json({ error: 'Session payout not found' });
    }

    // Non-admins can only view their own
    if (user.role !== 'ADMIN' && sessionPayout.submittedById !== user.id) {
      return res.status(403).json({ error: 'Not authorized to view this payout' });
    }

    res.json(sessionPayout);
  } catch (error: any) {
    console.error('Get session payout error:', error);
    res.status(500).json({ error: error.message || 'Failed to get session payout' });
  }
});

// =====================
// ADMIN ACTIONS
// =====================

/**
 * POST /api/session-payouts/:id/approve
 * Approve a session payout (admin only)
 */
router.post('/:id/approve', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const admin = req.user!;
    const { id } = req.params;
    const { adminNotes } = req.body;

    const sessionPayout = await prisma.sessionPayout.findUnique({
      where: { id },
      include: {
        submittedBy: {
          select: {
            id: true,
            stripeAccountId: true,
            stripeOnboardingComplete: true,
          },
        },
      },
    });

    if (!sessionPayout) {
      return res.status(404).json({ error: 'Session payout not found' });
    }

    if (sessionPayout.status !== 'PENDING') {
      return res.status(400).json({ error: `Cannot approve payout with status ${sessionPayout.status}` });
    }

    // Update to APPROVED status
    const updatedPayout = await prisma.sessionPayout.update({
      where: { id },
      data: {
        status: 'APPROVED',
        reviewedAt: new Date(),
        reviewedById: admin.id,
        adminNotes,
      },
      include: {
        submittedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        reviewedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    res.json(updatedPayout);
  } catch (error: any) {
    console.error('Approve session payout error:', error);
    res.status(500).json({ error: error.message || 'Failed to approve session payout' });
  }
});

/**
 * POST /api/session-payouts/:id/reject
 * Reject a session payout (admin only)
 */
router.post('/:id/reject', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const admin = req.user!;
    const { id } = req.params;
    const { rejectionReason, adminNotes } = req.body;

    if (!rejectionReason) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }

    const sessionPayout = await prisma.sessionPayout.findUnique({
      where: { id },
    });

    if (!sessionPayout) {
      return res.status(404).json({ error: 'Session payout not found' });
    }

    if (sessionPayout.status !== 'PENDING') {
      return res.status(400).json({ error: `Cannot reject payout with status ${sessionPayout.status}` });
    }

    const updatedPayout = await prisma.sessionPayout.update({
      where: { id },
      data: {
        status: 'REJECTED',
        reviewedAt: new Date(),
        reviewedById: admin.id,
        rejectionReason,
        adminNotes,
      },
      include: {
        submittedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        reviewedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    res.json(updatedPayout);
  } catch (error: any) {
    console.error('Reject session payout error:', error);
    res.status(500).json({ error: error.message || 'Failed to reject session payout' });
  }
});

/**
 * POST /api/session-payouts/:id/process-payment
 * Process Stripe payment for approved session payout (admin only)
 */
router.post('/:id/process-payment', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const sessionPayout = await prisma.sessionPayout.findUnique({
      where: { id },
      include: {
        submittedBy: {
          select: {
            id: true,
            stripeAccountId: true,
            stripeOnboardingComplete: true,
            email: true,
          },
        },
      },
    });

    if (!sessionPayout) {
      return res.status(404).json({ error: 'Session payout not found' });
    }

    if (sessionPayout.status !== 'APPROVED') {
      return res.status(400).json({ error: `Cannot process payment for payout with status ${sessionPayout.status}. Must be APPROVED first.` });
    }

    // Check if engineer has Stripe connected
    if (!sessionPayout.submittedBy.stripeAccountId || !sessionPayout.submittedBy.stripeOnboardingComplete) {
      return res.status(400).json({
        error: 'Engineer has not completed Stripe onboarding',
        details: 'The engineer must connect their Stripe account before receiving payouts.',
      });
    }

    // Import and use Stripe service
    const { stripeService } = await import('../services/stripe.service');

    // Update status to PROCESSING
    await prisma.sessionPayout.update({
      where: { id },
      data: { status: 'PROCESSING' },
    });

    try {
      // Create Stripe transfer
      const amountCents = Math.round(Number(sessionPayout.payoutAmount) * 100);
      const transferId = await stripeService.createTransfer(
        sessionPayout.submittedBy.stripeAccountId,
        amountCents,
        sessionPayout.id,
        `Session Payout: ${sessionPayout.artistName} - ${sessionPayout.songTitles}`,
        `session-payout-${sessionPayout.id}`
      );

      // Update with success
      const updatedPayout = await prisma.sessionPayout.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          stripeTransferId: transferId,
          paidAt: new Date(),
        },
        include: {
          submittedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      res.json(updatedPayout);
    } catch (stripeError: any) {
      // Revert to APPROVED if Stripe fails
      await prisma.sessionPayout.update({
        where: { id },
        data: {
          status: 'APPROVED',
          adminNotes: `Payment failed: ${stripeError.message}`,
        },
      });

      throw stripeError;
    }
  } catch (error: any) {
    console.error('Process session payment error:', error);
    res.status(500).json({ error: error.message || 'Failed to process payment' });
  }
});

export default router;
