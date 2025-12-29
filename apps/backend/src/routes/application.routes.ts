import { Router, Request, Response } from 'express';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth.middleware';
import { prisma } from '../lib/prisma';

const router = Router();

/**
 * Calculate application score (from WordPress logic)
 */
function calculateScore(data: any): { score: number; tier: string } {
  let score = 0;

  // Catalog size
  if (data.catalogSize === '50+') score += 25;
  else if (data.catalogSize === '10-50') score += 15;
  else score += 5;

  // Placements
  if (data.placements === 'major') score += 25;
  else if (data.placements === 'regional') score += 15;
  else if (data.placements === 'indie') score += 10;

  // Royalties
  if (data.royalties === 'uncollected') score += 20;
  else if (data.royalties === 'unpaid') score += 10;

  // Readiness
  const readiness = Array.isArray(data.readiness) ? data.readiness : [];
  if (readiness.includes('llc') && readiness.includes('contracts')) score += 15;
  else if (readiness.includes('llc') || readiness.includes('contracts')) score += 8;
  else score += 5;

  // Engagement
  if (data.engagement === 'high') score += 15;
  else if (data.engagement === 'medium') score += 10;
  else score += 5;

  // Determine tier
  let tier = 'PRIORITY_D';
  if (score >= 80) tier = 'PRIORITY_A';
  else if (score >= 60) tier = 'PRIORITY_B';
  else if (score >= 40) tier = 'PRIORITY_C';

  return { score, tier };
}

/**
 * POST /api/applications
 * Submit application (public)
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const data = req.body;

    // Calculate score and tier
    const { score, tier } = calculateScore(data);

    const application = await prisma.application.create({
      data: {
        ...data,
        score,
        tier: tier as any,
        readiness: data.readiness || [],
        needs: data.needs || [],
      },
    });

    // TODO: Send notification email to admin

    res.status(201).json({
      message: 'Application submitted successfully',
      application: {
        id: application.id,
        score,
        tier,
      },
    });
  } catch (error) {
    console.error('Submit application error:', error);
    res.status(500).json({ error: 'Failed to submit application' });
  }
});

/**
 * GET /api/applications
 * List applications (Admin only)
 */
router.get('/', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { status, tier, limit = '50', offset = '0' } = req.query;

    const where: any = {};
    if (status) where.status = status;
    if (tier) where.tier = tier;

    const applications = await prisma.application.findMany({
      where,
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
      orderBy: [{ score: 'desc' }, { submittedAt: 'desc' }],
    });

    const total = await prisma.application.count({ where });

    res.json({ applications, total });
  } catch (error) {
    console.error('List applications error:', error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

/**
 * PUT /api/applications/:id
 * Update application (Admin only)
 */
router.put('/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const application = await prisma.application.update({
      where: { id },
      data: req.body,
    });

    res.json(application);
  } catch (error) {
    console.error('Update application error:', error);
    res.status(500).json({ error: 'Failed to update application' });
  }
});

export default router;
