import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth.middleware';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/opportunities
 * List opportunities (public or authenticated)
 */
router.get('/', async (req, res: Response) => {
  try {
    const { status = 'OPEN', limit = '50', offset = '0' } = req.query;

    const opportunities = await prisma.opportunity.findMany({
      where: status ? { status: status as any } : undefined,
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
      orderBy: [{ priority: 'desc' }, { deadline: 'asc' }],
    });

    res.json({ opportunities });
  } catch (error) {
    console.error('List opportunities error:', error);
    res.status(500).json({ error: 'Failed to fetch opportunities' });
  }
});

/**
 * POST /api/opportunities
 * Create opportunity (Admin only)
 */
router.post('/', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const opportunity = await prisma.opportunity.create({
      data: req.body,
    });

    res.status(201).json(opportunity);
  } catch (error) {
    console.error('Create opportunity error:', error);
    res.status(500).json({ error: 'Failed to create opportunity' });
  }
});

/**
 * PUT /api/opportunities/:id
 * Update opportunity (Admin only)
 */
router.put('/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const opportunity = await prisma.opportunity.update({
      where: { id },
      data: req.body,
    });

    res.json(opportunity);
  } catch (error) {
    console.error('Update opportunity error:', error);
    res.status(500).json({ error: 'Failed to update opportunity' });
  }
});

/**
 * DELETE /api/opportunities/:id
 * Delete opportunity (Admin only)
 */
router.delete('/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.opportunity.delete({ where: { id } });

    res.json({ message: 'Opportunity deleted successfully' });
  } catch (error) {
    console.error('Delete opportunity error:', error);
    res.status(500).json({ error: 'Failed to delete opportunity' });
  }
});

export default router;
