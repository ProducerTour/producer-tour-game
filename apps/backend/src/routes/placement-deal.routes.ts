import { Router, Response } from 'express';
import { authenticate, AuthRequest, requireAdmin } from '../middleware/auth.middleware';
import { prisma } from '../lib/prisma';

const router = Router();

/**
 * GET /api/placement-deals
 * Get all placement deals (admin only)
 */
router.get('/', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { status, dealType, search } = req.query;

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (dealType) {
      where.dealType = dealType;
    }

    if (search && typeof search === 'string') {
      where.OR = [
        { clientFullName: { contains: search, mode: 'insensitive' } },
        { clientPKA: { contains: search, mode: 'insensitive' } },
        { songTitle: { contains: search, mode: 'insensitive' } },
        { artistName: { contains: search, mode: 'insensitive' } },
        { label: { contains: search, mode: 'insensitive' } },
        { billingInvoiceNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    const deals = await prisma.placementDeal.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    res.json({ deals, total: deals.length });
  } catch (error) {
    console.error('Get placement deals error:', error);
    res.status(500).json({ error: 'Failed to get placement deals' });
  }
});

/**
 * GET /api/placement-deals/:id
 * Get a single placement deal by ID
 */
router.get('/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const deal = await prisma.placementDeal.findUnique({
      where: { id },
    });

    if (!deal) {
      return res.status(404).json({ error: 'Placement deal not found' });
    }

    res.json(deal);
  } catch (error) {
    console.error('Get placement deal error:', error);
    res.status(500).json({ error: 'Failed to get placement deal' });
  }
});

/**
 * POST /api/placement-deals
 * Create a new placement deal
 */
router.post('/', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const dealData = req.body;

    const deal = await prisma.placementDeal.create({
      data: {
        ...dealData,
        createdById: userId,
        lastModifiedBy: userId,
      },
    });

    res.status(201).json(deal);
  } catch (error) {
    console.error('Create placement deal error:', error);
    res.status(500).json({ error: 'Failed to create placement deal' });
  }
});

/**
 * PUT /api/placement-deals/:id
 * Update a placement deal
 */
router.put('/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const dealData = req.body;

    const deal = await prisma.placementDeal.update({
      where: { id },
      data: {
        ...dealData,
        lastModifiedBy: userId,
      },
    });

    res.json(deal);
  } catch (error) {
    console.error('Update placement deal error:', error);
    res.status(500).json({ error: 'Failed to update placement deal' });
  }
});

/**
 * DELETE /api/placement-deals/:id
 * Delete a placement deal
 */
router.delete('/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.placementDeal.delete({
      where: { id },
    });

    res.json({ message: 'Placement deal deleted successfully' });
  } catch (error) {
    console.error('Delete placement deal error:', error);
    res.status(500).json({ error: 'Failed to delete placement deal' });
  }
});

/**
 * POST /api/placement-deals/:id/generate-invoice
 * Generate invoice data for a placement deal
 */
router.post('/:id/generate-invoice', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const deal = await prisma.placementDeal.findUnique({
      where: { id },
    });

    if (!deal) {
      return res.status(404).json({ error: 'Placement deal not found' });
    }

    // Generate invoice number if not exists
    if (!deal.billingInvoiceNumber) {
      const count = await prisma.placementDeal.count({
        where: { billingInvoiceNumber: { not: null } },
      });
      const invoiceNumber = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

      await prisma.placementDeal.update({
        where: { id },
        data: {
          billingInvoiceNumber: invoiceNumber,
          billingIssueDate: deal.billingIssueDate || new Date().toISOString().split('T')[0],
        },
      });

      const updatedDeal = await prisma.placementDeal.findUnique({
        where: { id },
      });

      return res.json(updatedDeal);
    }

    res.json(deal);
  } catch (error) {
    console.error('Generate invoice error:', error);
    res.status(500).json({ error: 'Failed to generate invoice' });
  }
});

/**
 * GET /api/placement-deals/stats/summary
 * Get summary statistics for placement deals
 */
router.get('/stats/summary', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const [totalDeals, releasedDeals, withInvoices, completedAgreements] = await Promise.all([
      prisma.placementDeal.count(),
      prisma.placementDeal.count({ where: { released: true } }),
      prisma.placementDeal.count({
        where: { billingInvoiceNumber: { not: null } },
      }),
      prisma.placementDeal.count({
        where: { agreement: { contains: 'Fully Executed' } },
      }),
    ]);

    res.json({
      totalDeals,
      releasedDeals,
      withInvoices,
      completedAgreements,
    });
  } catch (error) {
    console.error('Get placement stats error:', error);
    res.status(500).json({ error: 'Failed to get placement statistics' });
  }
});

export default router;
