import { Router, Response } from 'express';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth.middleware';
import { prisma } from '../lib/prisma';

const router = Router();

// All routes require admin authentication
router.use(authenticate);
router.use(requireAdmin);

/**
 * GET /api/settings/publishers
 * Get all Producer Tour publishers
 */
router.get('/publishers', async (req: AuthRequest, res: Response) => {
  try {
    const publishers = await prisma.producerTourPublisher.findMany({
      orderBy: { createdAt: 'desc' }
    });

    res.json({ publishers });
  } catch (error) {
    console.error('Get publishers error:', error);
    res.status(500).json({ error: 'Failed to fetch publishers' });
  }
});

/**
 * POST /api/settings/publishers
 * Create a new Producer Tour publisher
 */
router.post('/publishers', async (req: AuthRequest, res: Response) => {
  try {
    const { ipiNumber, publisherName, notes } = req.body;

    // Validation
    if (!ipiNumber || !publisherName) {
      return res.status(400).json({ error: 'IPI number and publisher name are required' });
    }

    // Check if IPI already exists
    const existing = await prisma.producerTourPublisher.findFirst({
      where: { ipiNumber }
    });

    if (existing) {
      return res.status(400).json({ error: 'Publisher with this IPI number already exists' });
    }

    const publisher = await prisma.producerTourPublisher.create({
      data: {
        ipiNumber,
        publisherName,
        notes: notes || null,
        isActive: true
      }
    });

    res.status(201).json({ publisher });
  } catch (error) {
    console.error('Create publisher error:', error);
    res.status(500).json({ error: 'Failed to create publisher' });
  }
});

/**
 * PUT /api/settings/publishers/:id
 * Update a Producer Tour publisher
 */
router.put('/publishers/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { ipiNumber, publisherName, notes, isActive } = req.body;

    // Validation
    if (!ipiNumber || !publisherName) {
      return res.status(400).json({ error: 'IPI number and publisher name are required' });
    }

    // Check if IPI already exists for a different publisher
    const existing = await prisma.producerTourPublisher.findFirst({
      where: {
        ipiNumber,
        id: { not: id }
      }
    });

    if (existing) {
      return res.status(400).json({ error: 'Another publisher with this IPI number already exists' });
    }

    const publisher = await prisma.producerTourPublisher.update({
      where: { id },
      data: {
        ipiNumber,
        publisherName,
        notes: notes || null,
        isActive: isActive !== undefined ? isActive : true
      }
    });

    res.json({ publisher });
  } catch (error) {
    console.error('Update publisher error:', error);
    res.status(500).json({ error: 'Failed to update publisher' });
  }
});

/**
 * DELETE /api/settings/publishers/:id
 * Delete a Producer Tour publisher
 */
router.delete('/publishers/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.producerTourPublisher.delete({
      where: { id }
    });

    res.json({ message: 'Publisher deleted successfully' });
  } catch (error) {
    console.error('Delete publisher error:', error);
    res.status(500).json({ error: 'Failed to delete publisher' });
  }
});

/**
 * GET /api/settings/system
 * Get system-wide settings
 */
router.get('/system', async (req: AuthRequest, res: Response) => {
  try {
    // Get or create system settings (singleton pattern)
    let settings = await prisma.systemSettings.findFirst();
    console.log('📖 Fetching system settings, found:', settings);

    if (!settings) {
      console.log('🆕 No settings found, creating defaults');
      // Create default settings if none exist
      settings = await prisma.systemSettings.create({
        data: {
          minimumWithdrawalAmount: 50.00,
          emailsEnabled: true
        }
      });
      console.log('✅ Created default settings:', settings);
    }

    const response = {
      minimumWithdrawalAmount: Number(settings.minimumWithdrawalAmount),
      emailsEnabled: settings.emailsEnabled
    };
    console.log('📤 Returning to client:', response);

    res.json(response);
  } catch (error) {
    console.error('❌ Get system settings error:', error);
    res.status(500).json({ error: 'Failed to fetch system settings' });
  }
});

/**
 * PATCH /api/settings/system
 * Update system-wide settings
 */
router.patch('/system', async (req: AuthRequest, res: Response) => {
  try {
    const { minimumWithdrawalAmount, emailsEnabled } = req.body;
    console.log('📝 Received update request:', { minimumWithdrawalAmount, emailsEnabled });

    // Validation
    if (minimumWithdrawalAmount !== undefined) {
      const amount = Number(minimumWithdrawalAmount);
      if (isNaN(amount) || amount < 0 || amount > 10000) {
        return res.status(400).json({
          error: 'Minimum withdrawal amount must be between $0 and $10,000'
        });
      }
    }

    // Get or create settings
    let settings = await prisma.systemSettings.findFirst();
    console.log('📊 Current settings in DB:', settings);

    if (!settings) {
      console.log('🆕 Creating new settings record');
      settings = await prisma.systemSettings.create({
        data: {
          minimumWithdrawalAmount: minimumWithdrawalAmount || 50.00,
          emailsEnabled: emailsEnabled !== undefined ? emailsEnabled : true
        }
      });
    } else {
      console.log('✏️ Updating existing settings record');
      settings = await prisma.systemSettings.update({
        where: { id: settings.id },
        data: {
          minimumWithdrawalAmount: minimumWithdrawalAmount !== undefined
            ? minimumWithdrawalAmount
            : settings.minimumWithdrawalAmount,
          emailsEnabled: emailsEnabled !== undefined
            ? emailsEnabled
            : settings.emailsEnabled
        }
      });
    }

    console.log('✅ Settings after save:', settings);

    // Log email toggle changes for audit trail
    if (emailsEnabled !== undefined) {
      console.log(`📧 System emails ${emailsEnabled ? 'ENABLED' : 'DISABLED'} by admin ${req.user?.email}`);
    }

    res.json({
      message: 'System settings updated successfully',
      settings: {
        minimumWithdrawalAmount: Number(settings.minimumWithdrawalAmount),
        emailsEnabled: settings.emailsEnabled
      }
    });
  } catch (error) {
    console.error('❌ Update system settings error:', error);
    res.status(500).json({ error: 'Failed to update system settings' });
  }
});

export default router;
