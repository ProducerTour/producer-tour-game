import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { prisma } from '../lib/prisma';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/work-registration/my-submissions
 * Get current user's work submissions
 */
router.get('/my-submissions', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const submissions = await prisma.placement.findMany({
      where: { userId },
      orderBy: { submittedAt: 'desc' },
      select: {
        id: true,
        title: true,
        artist: true,
        albumName: true,
        albumArtUrl: true,
        status: true,
        submittedAt: true,
        reviewedAt: true,
        denialReason: true,
        documentsRequested: true,
        caseNumber: true,
        createdAt: true,
      },
    });

    res.json({
      success: true,
      submissions,
    });
  } catch (error) {
    console.error('Get submissions error:', error);
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
});

/**
 * GET /api/work-registration/pending
 * Get all pending submissions (ADMIN only)
 */
router.get('/pending', async (req: AuthRequest, res: Response) => {
  try {
    const userRole = req.user?.role;

    if (userRole !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const pending = await prisma.placement.findMany({
      where: {
        status: {
          in: ['PENDING', 'DOCUMENTS_REQUESTED'],
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { submittedAt: 'desc' },
    });

    res.json({
      success: true,
      pending,
      count: pending.length,
    });
  } catch (error) {
    console.error('Get pending submissions error:', error);
    res.status(500).json({ error: 'Failed to fetch pending submissions' });
  }
});

/**
 * POST /api/work-registration/:id/approve
 * Approve a submission and send to placement tracker (ADMIN only)
 */
router.post('/:id/approve', async (req: AuthRequest, res: Response) => {
  try {
    const userRole = req.user?.role;
    const adminId = req.user?.id;
    const { id } = req.params;
    const { dealTerms, advanceAmount, royaltyPercentage, notes } = req.body;

    if (userRole !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Get the submission
    const submission = await prisma.placement.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    if (submission.status !== 'PENDING' && submission.status !== 'DOCUMENTS_REQUESTED') {
      return res.status(400).json({ error: 'Submission is not pending review' });
    }

    // Generate case number: PT-YYYY-###
    const year = new Date().getFullYear();
    const lastCase = await prisma.placement.findFirst({
      where: {
        caseNumber: {
          startsWith: `PT-${year}-`,
        },
      },
      orderBy: { caseNumber: 'desc' },
    });

    let caseSequence = 1;
    if (lastCase && lastCase.caseNumber) {
      const lastSequence = parseInt(lastCase.caseNumber.split('-')[2]);
      caseSequence = lastSequence + 1;
    }

    const caseNumber = `PT-${year}-${caseSequence.toString().padStart(3, '0')}`;

    // Update submission to APPROVED status
    const approved = await prisma.placement.update({
      where: { id },
      data: {
        status: 'APPROVED',
        reviewedAt: new Date(),
        reviewedBy: adminId,
        caseNumber,
        dealTerms,
        advanceAmount: advanceAmount ? parseFloat(advanceAmount) : null,
        royaltyPercentage: royaltyPercentage ? parseFloat(royaltyPercentage) : null,
        notes: notes || submission.notes,
      },
    });

    // TODO: Send email notification to writer
    console.log(`Sending approval email to ${submission.user.email}`);

    res.json({
      success: true,
      message: 'Submission approved and sent to placement tracker',
      placement: approved,
      caseNumber,
    });
  } catch (error) {
    console.error('Approve submission error:', error);
    res.status(500).json({ error: 'Failed to approve submission' });
  }
});

/**
 * POST /api/work-registration/:id/deny
 * Deny a submission (ADMIN only)
 */
router.post('/:id/deny', async (req: AuthRequest, res: Response) => {
  try {
    const userRole = req.user?.role;
    const adminId = req.user?.id;
    const { id } = req.params;
    const { denialReason } = req.body;

    if (userRole !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    if (!denialReason) {
      return res.status(400).json({ error: 'Denial reason is required' });
    }

    // Get the submission
    const submission = await prisma.placement.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    if (submission.status !== 'PENDING' && submission.status !== 'DOCUMENTS_REQUESTED') {
      return res.status(400).json({ error: 'Submission is not pending review' });
    }

    // Update submission to DENIED status
    const denied = await prisma.placement.update({
      where: { id },
      data: {
        status: 'DENIED',
        reviewedAt: new Date(),
        reviewedBy: adminId,
        denialReason,
      },
    });

    // TODO: Send email notification to writer
    console.log(`Sending denial email to ${submission.user.email}`);

    res.json({
      success: true,
      message: 'Submission denied',
      placement: denied,
    });
  } catch (error) {
    console.error('Deny submission error:', error);
    res.status(500).json({ error: 'Failed to deny submission' });
  }
});

/**
 * POST /api/work-registration/:id/request-documents
 * Request additional documents from writer (ADMIN only)
 */
router.post('/:id/request-documents', async (req: AuthRequest, res: Response) => {
  try {
    const userRole = req.user?.role;
    const adminId = req.user?.id;
    const { id } = req.params;
    const { documentsRequested } = req.body;

    if (userRole !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    if (!documentsRequested) {
      return res.status(400).json({ error: 'Document requirements are required' });
    }

    // Get the submission
    const submission = await prisma.placement.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    if (submission.status !== 'PENDING') {
      return res.status(400).json({ error: 'Can only request documents for pending submissions' });
    }

    // Update submission to DOCUMENTS_REQUESTED status
    const updated = await prisma.placement.update({
      where: { id },
      data: {
        status: 'DOCUMENTS_REQUESTED',
        reviewedAt: new Date(),
        reviewedBy: adminId,
        documentsRequested,
      },
    });

    // TODO: Send email notification to writer
    console.log(`Sending document request email to ${submission.user.email}`);

    res.json({
      success: true,
      message: 'Document request sent to writer',
      placement: updated,
    });
  } catch (error) {
    console.error('Request documents error:', error);
    res.status(500).json({ error: 'Failed to request documents' });
  }
});

/**
 * POST /api/work-registration/:id/resubmit
 * Writer resubmits after providing requested documents
 */
router.post('/:id/resubmit', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { notes } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get the submission
    const submission = await prisma.placement.findUnique({
      where: { id },
    });

    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    if (submission.userId !== userId) {
      return res.status(403).json({ error: 'Not your submission' });
    }

    if (submission.status !== 'DOCUMENTS_REQUESTED') {
      return res.status(400).json({ error: 'Submission is not awaiting documents' });
    }

    // Update back to PENDING status
    const resubmitted = await prisma.placement.update({
      where: { id },
      data: {
        status: 'PENDING',
        submittedAt: new Date(), // Update submission time
        notes: notes || submission.notes,
        documentsRequested: null, // Clear document request
      },
    });

    res.json({
      success: true,
      message: 'Submission resubmitted for review',
      placement: resubmitted,
    });
  } catch (error) {
    console.error('Resubmit error:', error);
    res.status(500).json({ error: 'Failed to resubmit' });
  }
});

export default router;
