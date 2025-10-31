import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
const prisma = new PrismaClient();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/pro-submissions
 * Get all PRO submissions for the authenticated user
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const submissions = await prisma.proSubmission.findMany({
      where: { userId },
      orderBy: { submittedAt: 'desc' },
    });

    res.json({
      success: true,
      count: submissions.length,
      submissions,
    });
  } catch (error) {
    console.error('Get PRO submissions error:', error);
    res.status(500).json({ error: 'Failed to fetch PRO submissions' });
  }
});

/**
 * GET /api/pro-submissions/latest
 * Get the latest submission date for each PRO
 */
router.get('/latest', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const submissions = await prisma.proSubmission.findMany({
      where: { userId },
      orderBy: { submittedAt: 'desc' },
    });

    // Group by PRO and get latest for each
    const latestByPro: Record<string, any> = {};

    submissions.forEach((submission) => {
      if (!latestByPro[submission.proName]) {
        latestByPro[submission.proName] = submission;
      }
    });

    res.json({
      success: true,
      latest: latestByPro,
    });
  } catch (error) {
    console.error('Get latest PRO submissions error:', error);
    res.status(500).json({ error: 'Failed to fetch latest submissions' });
  }
});

/**
 * GET /api/pro-submissions/:id
 * Get a specific PRO submission by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const submission = await prisma.proSubmission.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!submission) {
      return res.status(404).json({ error: 'PRO submission not found' });
    }

    res.json({
      success: true,
      submission,
    });
  } catch (error) {
    console.error('Get PRO submission error:', error);
    res.status(500).json({ error: 'Failed to fetch PRO submission' });
  }
});

/**
 * POST /api/pro-submissions
 * Create a new PRO submission record
 * Body: { proName, submittedAt, placementIds?, metadata?, notes? }
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      proName,
      submittedAt,
      placementIds,
      metadata,
      notes,
    } = req.body;

    // Validation
    if (!proName || !submittedAt) {
      return res.status(400).json({ error: 'PRO name and submission date are required' });
    }

    // Validate proName is a valid ProType
    const validProTypes = ['BMI', 'ASCAP', 'SESAC', 'OTHER'];
    if (!validProTypes.includes(proName)) {
      return res.status(400).json({ error: 'Invalid PRO name. Must be BMI, ASCAP, SESAC, or OTHER' });
    }

    const submission = await prisma.proSubmission.create({
      data: {
        userId,
        proName,
        submittedAt: new Date(submittedAt),
        placementIds,
        metadata,
        notes,
      },
    });

    res.status(201).json({
      success: true,
      submission,
    });
  } catch (error) {
    console.error('Create PRO submission error:', error);
    res.status(500).json({ error: 'Failed to create PRO submission' });
  }
});

/**
 * PUT /api/pro-submissions/:id
 * Update a PRO submission
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check ownership
    const existing = await prisma.proSubmission.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'PRO submission not found' });
    }

    const {
      proName,
      submittedAt,
      placementIds,
      metadata,
      notes,
    } = req.body;

    // Validate proName if provided
    if (proName) {
      const validProTypes = ['BMI', 'ASCAP', 'SESAC', 'OTHER'];
      if (!validProTypes.includes(proName)) {
        return res.status(400).json({ error: 'Invalid PRO name' });
      }
    }

    const submission = await prisma.proSubmission.update({
      where: { id },
      data: {
        ...(proName && { proName }),
        ...(submittedAt && { submittedAt: new Date(submittedAt) }),
        ...(placementIds !== undefined && { placementIds }),
        ...(metadata !== undefined && { metadata }),
        ...(notes !== undefined && { notes }),
        updatedAt: new Date(),
      },
    });

    res.json({
      success: true,
      submission,
    });
  } catch (error) {
    console.error('Update PRO submission error:', error);
    res.status(500).json({ error: 'Failed to update PRO submission' });
  }
});

/**
 * DELETE /api/pro-submissions/:id
 * Delete a PRO submission
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check ownership
    const existing = await prisma.proSubmission.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'PRO submission not found' });
    }

    await prisma.proSubmission.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'PRO submission deleted successfully',
    });
  } catch (error) {
    console.error('Delete PRO submission error:', error);
    res.status(500).json({ error: 'Failed to delete PRO submission' });
  }
});

export default router;
