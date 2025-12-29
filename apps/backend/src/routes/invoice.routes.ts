import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, requireAdmin, type AuthRequest } from '../middleware/auth.middleware';
import type { InvoiceType, InvoiceStatus, AdvanceType } from '../generated/client';

const router = Router();

// =====================
// COMMISSION RATES BY INVOICE TYPE
// =====================

const COMMISSION_RATES: Record<InvoiceType, number> = {
  SESSION: 0,      // No commission for sessions
  ADVANCE: 20,     // 20% commission for advances
  FEE: 20,         // 20% commission for fees
};

// =====================
// HELPER: Generate unique invoice number
// Format: INV-YYYY-#### (e.g., INV-2025-0001)
// =====================

async function generateInvoiceNumber(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = `INV-${currentYear}-`;

  // Find the highest invoice number for this year
  const latestInvoice = await prisma.invoice.findFirst({
    where: {
      invoiceNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      invoiceNumber: 'desc',
    },
    select: {
      invoiceNumber: true,
    },
  });

  let nextSequence = 1;

  if (latestInvoice?.invoiceNumber) {
    // Extract the sequence number from the latest invoice
    const sequencePart = latestInvoice.invoiceNumber.split('-')[2];
    if (sequencePart) {
      nextSequence = parseInt(sequencePart, 10) + 1;
    }
  }

  // Pad to 4 digits
  const sequenceStr = nextSequence.toString().padStart(4, '0');
  return `${prefix}${sequenceStr}`;
}

// =====================
// HELPER: Calculate commission
// =====================

function calculateCommission(type: InvoiceType, grossAmount: number): {
  commissionRate: number;
  commissionAmount: number;
  netAmount: number;
} {
  const commissionRate = COMMISSION_RATES[type] || 0;
  const commissionAmount = (grossAmount * commissionRate) / 100;
  const netAmount = grossAmount - commissionAmount;

  return {
    commissionRate,
    commissionAmount, // No rounding - preserve full precision
    netAmount,
  };
}

// =====================
// INVOICE SUBMISSION (Authenticated users)
// =====================

/**
 * GET /api/invoices/next-number
 * Get the next auto-generated invoice number
 */
router.get('/next-number', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const invoiceNumber = await generateInvoiceNumber();
    res.json({ invoiceNumber });
  } catch (error: any) {
    console.error('Get next invoice number error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate invoice number' });
  }
});

/**
 * POST /api/invoices
 * Submit a new invoice
 */
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const {
      type,
      grossAmount,
      description,
      details,
      placementDealId,
      advanceType,
      submittedByName,
      submittedByEmail,
    } = req.body;

    // Validate required fields
    if (!type || !COMMISSION_RATES.hasOwnProperty(type)) {
      return res.status(400).json({ error: 'Valid invoice type is required (SESSION, ADVANCE, or FEE)' });
    }

    if (!grossAmount || grossAmount <= 0) {
      return res.status(400).json({ error: 'Gross amount must be greater than 0' });
    }

    // Calculate commission based on type
    const { commissionRate, commissionAmount, netAmount } = calculateCommission(
      type as InvoiceType,
      parseFloat(grossAmount)
    );

    // Auto-generate invoice number
    const invoiceNumber = await generateInvoiceNumber();

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        type: type as InvoiceType,
        submittedById: user.id,
        submittedByName: submittedByName || user.email || 'Unknown',
        submittedByEmail: submittedByEmail || user.email,
        grossAmount: parseFloat(grossAmount),
        commissionRate,
        commissionAmount,
        netAmount,
        description: description || null,
        details: details || null,
        placementDealId: placementDealId || null,
        advanceType: advanceType as AdvanceType || null,
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
        placementDeal: {
          select: {
            id: true,
            clientFullName: true,
            songTitle: true,
            artistName: true,
          },
        },
      },
    });

    res.status(201).json(invoice);
  } catch (error: any) {
    console.error('Create invoice error:', error);
    res.status(500).json({ error: error.message || 'Failed to submit invoice' });
  }
});

/**
 * GET /api/invoices
 * Get invoices (user: their own, admin: all)
 */
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { status, type, limit, offset } = req.query;

    const where: any = {};

    // Non-admins can only see their own invoices
    if (user.role !== 'ADMIN') {
      where.submittedById = user.id;
    }

    if (status) {
      where.status = status as InvoiceStatus;
    }

    if (type) {
      where.type = type as InvoiceType;
    }

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
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
          placementDeal: {
            select: {
              id: true,
              clientFullName: true,
              songTitle: true,
              artistName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit ? parseInt(limit as string) : 50,
        skip: offset ? parseInt(offset as string) : 0,
      }),
      prisma.invoice.count({ where }),
    ]);

    res.json({ invoices, total });
  } catch (error: any) {
    console.error('Get invoices error:', error);
    res.status(500).json({ error: error.message || 'Failed to get invoices' });
  }
});

/**
 * GET /api/invoices/pending
 * Get pending invoices count (for notifications)
 */
router.get('/pending', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const [pendingInvoices, count] = await Promise.all([
      prisma.invoice.findMany({
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
      prisma.invoice.count({
        where: { status: 'PENDING' },
      }),
    ]);

    res.json({ pendingInvoices, count });
  } catch (error: any) {
    console.error('Get pending invoices error:', error);
    res.status(500).json({ error: error.message || 'Failed to get pending invoices' });
  }
});

/**
 * GET /api/invoices/stats
 * Get invoice statistics (admin only)
 */
router.get('/stats', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const [pending, approved, processing, paid, rejected, totalGross, totalNet] = await Promise.all([
      prisma.invoice.count({ where: { status: 'PENDING' } }),
      prisma.invoice.count({ where: { status: 'APPROVED' } }),
      prisma.invoice.count({ where: { status: 'PROCESSING' } }),
      prisma.invoice.count({ where: { status: 'PAID' } }),
      prisma.invoice.count({ where: { status: 'REJECTED' } }),
      prisma.invoice.aggregate({
        where: { status: 'PAID' },
        _sum: { grossAmount: true },
      }),
      prisma.invoice.aggregate({
        where: { status: 'PAID' },
        _sum: { netAmount: true },
      }),
    ]);

    res.json({
      counts: { pending, approved, processing, paid, rejected },
      totals: {
        grossPaid: totalGross._sum.grossAmount || 0,
        netPaid: totalNet._sum.netAmount || 0,
      },
    });
  } catch (error: any) {
    console.error('Get invoice stats error:', error);
    res.status(500).json({ error: error.message || 'Failed to get invoice stats' });
  }
});

/**
 * GET /api/invoices/:id
 * Get a single invoice by ID
 */
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { id } = req.params;

    const invoice = await prisma.invoice.findUnique({
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
        placementDeal: {
          select: {
            id: true,
            clientFullName: true,
            songTitle: true,
            artistName: true,
            advance: true,
          },
        },
      },
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Non-admins can only view their own
    if (user.role !== 'ADMIN' && invoice.submittedById !== user.id) {
      return res.status(403).json({ error: 'Not authorized to view this invoice' });
    }

    res.json(invoice);
  } catch (error: any) {
    console.error('Get invoice error:', error);
    res.status(500).json({ error: error.message || 'Failed to get invoice' });
  }
});

// =====================
// ADMIN ACTIONS
// =====================

/**
 * POST /api/invoices/:id/approve
 * Approve an invoice (admin only)
 */
router.post('/:id/approve', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const admin = req.user!;
    const { id } = req.params;
    const { adminNotes } = req.body;

    const invoice = await prisma.invoice.findUnique({
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

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    if (invoice.status !== 'PENDING') {
      return res.status(400).json({ error: `Cannot approve invoice with status ${invoice.status}` });
    }

    // Update to APPROVED status
    const updatedInvoice = await prisma.invoice.update({
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

    res.json(updatedInvoice);
  } catch (error: any) {
    console.error('Approve invoice error:', error);
    res.status(500).json({ error: error.message || 'Failed to approve invoice' });
  }
});

/**
 * POST /api/invoices/:id/reject
 * Reject an invoice (admin only)
 */
router.post('/:id/reject', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const admin = req.user!;
    const { id } = req.params;
    const { rejectionReason, adminNotes } = req.body;

    if (!rejectionReason) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id },
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    if (invoice.status !== 'PENDING') {
      return res.status(400).json({ error: `Cannot reject invoice with status ${invoice.status}` });
    }

    const updatedInvoice = await prisma.invoice.update({
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

    res.json(updatedInvoice);
  } catch (error: any) {
    console.error('Reject invoice error:', error);
    res.status(500).json({ error: error.message || 'Failed to reject invoice' });
  }
});

/**
 * POST /api/invoices/:id/process-payment
 * Process Stripe payment for approved invoice (admin only)
 */
router.post('/:id/process-payment', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const invoice = await prisma.invoice.findUnique({
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

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    if (invoice.status !== 'APPROVED') {
      return res.status(400).json({ error: `Cannot process payment for invoice with status ${invoice.status}. Must be APPROVED first.` });
    }

    // Check if submitter has Stripe connected
    if (!invoice.submittedBy.stripeAccountId || !invoice.submittedBy.stripeOnboardingComplete) {
      return res.status(400).json({
        error: 'Submitter has not completed Stripe onboarding',
        details: 'The submitter must connect their Stripe account before receiving payouts.',
      });
    }

    // Import and use Stripe service
    const { stripeService } = await import('../services/stripe.service');

    // Update status to PROCESSING
    await prisma.invoice.update({
      where: { id },
      data: { status: 'PROCESSING' },
    });

    try {
      // Create Stripe transfer for the NET amount (after commission)
      const amountCents = Math.round(Number(invoice.netAmount) * 100);
      const transferId = await stripeService.createTransfer(
        invoice.submittedBy.stripeAccountId,
        amountCents,
        invoice.id,
        `Invoice ${invoice.invoiceNumber}: ${invoice.type} - ${invoice.description || 'Payment'}`,
        `invoice-${invoice.id}`
      );

      // Update with success
      const updatedInvoice = await prisma.invoice.update({
        where: { id },
        data: {
          status: 'PAID',
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

      res.json(updatedInvoice);
    } catch (stripeError: any) {
      // Revert to APPROVED if Stripe fails
      await prisma.invoice.update({
        where: { id },
        data: {
          status: 'APPROVED',
          adminNotes: `Payment failed: ${stripeError.message}`,
        },
      });

      throw stripeError;
    }
  } catch (error: any) {
    console.error('Process invoice payment error:', error);
    res.status(500).json({ error: error.message || 'Failed to process payment' });
  }
});

export default router;
