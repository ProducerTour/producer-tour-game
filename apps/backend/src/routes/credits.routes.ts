import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
const prisma = new PrismaClient();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/credits
 * Get all credits for the authenticated user
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const credits = await prisma.credit.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      count: credits.length,
      credits,
    });
  } catch (error) {
    console.error('Get credits error:', error);
    res.status(500).json({ error: 'Failed to fetch credits' });
  }
});

/**
 * GET /api/credits/:id
 * Get a specific credit by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const credit = await prisma.credit.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!credit) {
      return res.status(404).json({ error: 'Credit not found' });
    }

    res.json({
      success: true,
      credit,
    });
  } catch (error) {
    console.error('Get credit error:', error);
    res.status(500).json({ error: 'Failed to fetch credit' });
  }
});

/**
 * POST /api/credits
 * Create a new credit
 * Body: { songTitle, role, ipiNumber?, splitPercentage, metadata?, notes? }
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      songTitle,
      role,
      ipiNumber,
      splitPercentage,
      metadata,
      notes,
    } = req.body;

    // Validation
    if (!songTitle || !role || splitPercentage === undefined) {
      return res.status(400).json({ error: 'Song title, role, and split percentage are required' });
    }

    if (splitPercentage < 0 || splitPercentage > 100) {
      return res.status(400).json({ error: 'Split percentage must be between 0 and 100' });
    }

    const credit = await prisma.credit.create({
      data: {
        userId,
        songTitle,
        role,
        ipiNumber,
        splitPercentage,
        metadata,
        notes,
      },
    });

    res.status(201).json({
      success: true,
      credit,
    });
  } catch (error) {
    console.error('Create credit error:', error);
    res.status(500).json({ error: 'Failed to create credit' });
  }
});

/**
 * PUT /api/credits/:id
 * Update a credit
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check ownership
    const existing = await prisma.credit.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Credit not found' });
    }

    const {
      songTitle,
      role,
      ipiNumber,
      splitPercentage,
      metadata,
      notes,
    } = req.body;

    // Validation
    if (splitPercentage !== undefined && (splitPercentage < 0 || splitPercentage > 100)) {
      return res.status(400).json({ error: 'Split percentage must be between 0 and 100' });
    }

    const credit = await prisma.credit.update({
      where: { id },
      data: {
        ...(songTitle && { songTitle }),
        ...(role && { role }),
        ...(ipiNumber !== undefined && { ipiNumber }),
        ...(splitPercentage !== undefined && { splitPercentage }),
        ...(metadata !== undefined && { metadata }),
        ...(notes !== undefined && { notes }),
        updatedAt: new Date(),
      },
    });

    res.json({
      success: true,
      credit,
    });
  } catch (error) {
    console.error('Update credit error:', error);
    res.status(500).json({ error: 'Failed to update credit' });
  }
});

/**
 * DELETE /api/credits/:id
 * Delete a credit
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check ownership
    const existing = await prisma.credit.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Credit not found' });
    }

    await prisma.credit.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Credit deleted successfully',
    });
  } catch (error) {
    console.error('Delete credit error:', error);
    res.status(500).json({ error: 'Failed to delete credit' });
  }
});

export default router;
