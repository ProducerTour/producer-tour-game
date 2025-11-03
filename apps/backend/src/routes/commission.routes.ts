import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { prisma } from '../lib/prisma';

const router = Router();

/**
 * GET /api/commission/settings
 * Get current active commission settings
 */
router.get('/settings', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const settings = await prisma.commissionSettings.findFirst({
      where: { isActive: true },
      orderBy: { effectiveDate: 'desc' },
    });

    if (!settings) {
      // Return default if no settings exist
      return res.json({
        commissionRate: 0.00,
        recipientName: 'Producer Tour',
        description: null,
        effectiveDate: new Date(),
        isActive: true,
      });
    }

    res.json(settings);
  } catch (error) {
    console.error('Get commission settings error:', error);
    res.status(500).json({ error: 'Failed to fetch commission settings' });
  }
});

/**
 * GET /api/commission/settings/history
 * Get commission settings history (admin only)
 */
router.get('/settings/history', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const history = await prisma.commissionSettings.findMany({
      orderBy: { effectiveDate: 'desc' },
    });

    res.json({ history });
  } catch (error) {
    console.error('Get commission history error:', error);
    res.status(500).json({ error: 'Failed to fetch commission history' });
  }
});

/**
 * PUT /api/commission/settings
 * Update commission settings (admin only)
 * This creates a new settings record and marks the old one as inactive
 */
router.put('/settings', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { commissionRate, recipientName, description } = req.body;

    // Validate input
    if (typeof commissionRate !== 'number' || commissionRate < 0 || commissionRate > 100) {
      return res.status(400).json({ error: 'Commission rate must be between 0 and 100' });
    }

    if (!recipientName || typeof recipientName !== 'string') {
      return res.status(400).json({ error: 'Recipient name is required' });
    }

    // Use transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Deactivate all existing settings
      await tx.commissionSettings.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      });

      // Create new active settings
      const newSettings = await tx.commissionSettings.create({
        data: {
          commissionRate,
          recipientName,
          description: description || null,
          effectiveDate: new Date(),
          isActive: true,
        },
      });

      return newSettings;
    });

    res.json({
      message: 'Commission settings updated successfully',
      settings: result,
    });
  } catch (error) {
    console.error('Update commission settings error:', error);
    res.status(500).json({ error: 'Failed to update commission settings' });
  }
});

export default router;
