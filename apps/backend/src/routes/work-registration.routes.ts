import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { prisma } from '../lib/prisma';
import { emailService } from '../services/email.service';

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
      include: {
        credits: true,
        documents: true,
      },
      orderBy: { submittedAt: 'desc' },
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
 * GET /api/work-registration/approved
 * Get all approved submissions (ADMIN only) - for Manage Placements tab
 */
router.get('/approved', async (req: AuthRequest, res: Response) => {
  try {
    const userRole = req.user?.role;

    if (userRole !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const approved = await prisma.placement.findMany({
      where: {
        status: {
          in: ['APPROVED', 'TRACKING', 'COMPLETED'],
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
        credits: true,
        documents: true,
      },
      orderBy: { reviewedAt: 'desc' },
    });

    res.json({
      success: true,
      placements: approved,
      count: approved.length,
    });
  } catch (error) {
    console.error('Get approved submissions error:', error);
    res.status(500).json({ error: 'Failed to fetch approved submissions' });
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
        credits: true,
        documents: true,
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
 * Approve a submission, send to writer's Placements, and create Producer Clearance entry (ADMIN only)
 */
router.post('/:id/approve', async (req: AuthRequest, res: Response) => {
  try {
    const userRole = req.user?.role;
    const adminId = req.user?.id;
    const { id } = req.params;
    const { notes } = req.body;

    if (userRole !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Get the submission with credits
    const submission = await prisma.placement.findUnique({
      where: { id },
      include: {
        user: true,
        credits: true,
      },
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

    // Auto-link unlinked credits to PT users before approval
    // This ensures all credits have complete data for statement processing
    for (const credit of submission.credits) {
      if (!credit.userId) {
        // Try to find matching writer by name
        const matchedUser = await prisma.user.findFirst({
          where: {
            firstName: { equals: credit.firstName, mode: 'insensitive' },
            lastName: { equals: credit.lastName, mode: 'insensitive' },
            role: 'writer'
          },
          select: {
            id: true,
            writerIpiNumber: true,
            publisherIpiNumber: true,
            writerProAffiliation: true,
            producer: {
              select: {
                proAffiliation: true
              }
            }
          }
        });

        if (matchedUser) {
          // Get PRO from User (prefer writerProAffiliation, fallback to Producer)
          const userPro = matchedUser.writerProAffiliation || matchedUser.producer?.proAffiliation;

          await prisma.placementCredit.update({
            where: { id: credit.id },
            data: {
              userId: matchedUser.id,
              pro: credit.pro || userPro || undefined,
              ipiNumber: credit.ipiNumber || matchedUser.writerIpiNumber || undefined,
              publisherIpiNumber: credit.publisherIpiNumber || matchedUser.publisherIpiNumber || undefined,
              isExternalWriter: false
            }
          });

          console.log(`[Approval] Auto-linked credit: ${credit.firstName} ${credit.lastName} → ${matchedUser.id}`);
        }
      }
    }

    // Update submission to APPROVED status
    const approved = await prisma.placement.update({
      where: { id },
      data: {
        status: 'APPROVED',
        reviewedAt: new Date(),
        reviewedBy: adminId,
        caseNumber,
        notes: notes || submission.notes,
      },
    });

    // Create a corresponding PlacementDeal (Producer Clearance) entry
    // with publicPerf and mech set to "Collecting"
    const writerName = submission.user.firstName && submission.user.lastName
      ? `${submission.user.firstName} ${submission.user.lastName}`
      : submission.user.email;

    // Get primary credit for p/k/a name
    const primaryCredit = submission.credits?.find(c => c.isPrimary);
    const pkaName = primaryCredit
      ? `${primaryCredit.firstName} ${primaryCredit.lastName}`.trim()
      : writerName;

    // Get co-producers (non-primary credits)
    const coProducers = submission.credits
      ?.filter(c => !c.isPrimary)
      .map(c => `${c.firstName} ${c.lastName}`.trim())
      .join(', ') || '';

    await prisma.placementDeal.create({
      data: {
        clientFullName: writerName,
        clientPKA: pkaName,
        songTitle: submission.title,
        artistName: submission.artist,
        streams: submission.streams?.toString() || '0',
        label: submission.label || '',
        coProducers: coProducers,
        status: 'Approved',
        // Set clearance fields to "Collecting"
        publicPerf: 'Collecting',
        mech: 'Collecting',
        createdById: adminId,
        notes: `Auto-created from work submission ${caseNumber}`,
      },
    });

    // Send email notification to writer (if they have notifications enabled)
    const fullUserData = await prisma.user.findUnique({
      where: { id: submission.userId },
      select: { emailNotificationsEnabled: true },
    });

    if (fullUserData?.emailNotificationsEnabled !== false) {
      await emailService.sendSubmissionApprovedEmail(
        submission.user.email,
        writerName,
        submission.title,
        caseNumber
      );
    }

    res.json({
      success: true,
      message: 'Submission approved, added to Placements, and created Producer Clearance entry',
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

    // Send email notification to writer (if they have notifications enabled)
    const writerName = submission.user.firstName && submission.user.lastName
      ? `${submission.user.firstName} ${submission.user.lastName}`
      : submission.user.email;

    // Check if user has email notifications enabled
    const fullUserData = await prisma.user.findUnique({
      where: { id: submission.userId },
      select: { emailNotificationsEnabled: true },
    });

    if (fullUserData?.emailNotificationsEnabled !== false) {
      await emailService.sendSubmissionDeniedEmail(
        submission.user.email,
        writerName,
        submission.title,
        denialReason
      );
    }

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

    // Send email notification to writer (if they have notifications enabled)
    const writerName = submission.user.firstName && submission.user.lastName
      ? `${submission.user.firstName} ${submission.user.lastName}`
      : submission.user.email;

    // Check if user has email notifications enabled
    const fullUserData = await prisma.user.findUnique({
      where: { id: submission.userId },
      select: { emailNotificationsEnabled: true },
    });

    if (fullUserData?.emailNotificationsEnabled !== false) {
      await emailService.sendDocumentRequestEmail(
        submission.user.email,
        writerName,
        submission.title,
        documentsRequested
      );
    }

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
 * PUT /api/work-registration/:id/edit
 * Writer edits their submission (only allowed for PENDING and DOCUMENTS_REQUESTED status)
 * Admin can edit any submission including APPROVED
 */
router.put('/:id/edit', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const isAdmin = userRole === 'ADMIN';
    const { id } = req.params;
    const { title, artist, albumName, albumArtUrl, isrc, genre, releaseYear, label, notes, credits } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get the submission
    const submission = await prisma.placement.findUnique({
      where: { id },
      include: { credits: true },
    });

    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    // Admin can edit any placement; writers can only edit their own
    if (!isAdmin && submission.userId !== userId) {
      return res.status(403).json({ error: 'Not your submission' });
    }

    // Writers can only edit PENDING and DOCUMENTS_REQUESTED; Admins can edit any status
    if (!isAdmin && submission.status !== 'PENDING' && submission.status !== 'DOCUMENTS_REQUESTED') {
      return res.status(400).json({
        error: 'Cannot edit submission. Only pending or documents-requested submissions can be edited.'
      });
    }

    // Update the placement
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (artist !== undefined) updateData.artist = artist;
    if (albumName !== undefined) updateData.albumName = albumName;
    if (albumArtUrl !== undefined) updateData.albumArtUrl = albumArtUrl;
    if (isrc !== undefined) updateData.isrc = isrc;
    if (genre !== undefined) updateData.genre = genre;
    if (releaseYear !== undefined) updateData.releaseYear = releaseYear;
    if (label !== undefined) updateData.label = label;
    if (notes !== undefined) updateData.notes = notes;

    const updatedPlacement = await prisma.placement.update({
      where: { id },
      data: updateData,
    });

    // If credits are provided, validate and update them
    if (credits && Array.isArray(credits)) {
      // Validate that splits sum to exactly 100%
      const totalSplit = credits.reduce((sum: number, c: any) => sum + (Number(c.splitPercentage) || 0), 0);
      if (Math.abs(totalSplit - 100) > 0.01) {
        return res.status(400).json({
          error: `Split percentages must equal exactly 100%. Current total: ${totalSplit.toFixed(2)}%`
        });
      }

      // Delete existing credits
      await prisma.placementCredit.deleteMany({
        where: { placementId: id },
      });

      // Create new credits
      if (credits.length > 0) {
        await prisma.placementCredit.createMany({
          data: credits.map((credit: any, index: number) => ({
            placementId: id,
            firstName: credit.firstName || '',
            lastName: credit.lastName || '',
            role: credit.role || 'WRITER',
            splitPercentage: credit.splitPercentage || 0,
            pro: credit.pro || null,
            ipiNumber: credit.ipiNumber || null,
            isPrimary: index === 0,
            notes: credit.notes || null,
            // NEW: Link to user if userId provided
            userId: credit.userId || null,
            publisherIpiNumber: credit.publisherIpiNumber || null,
            isExternalWriter: credit.isExternalWriter || false,
          })),
        });
      }
    }

    // Fetch updated placement with credits
    const result = await prisma.placement.findUnique({
      where: { id },
      include: {
        credits: true,
        documents: true,
      },
    });

    res.json({
      success: true,
      message: 'Submission updated successfully',
      placement: result,
    });
  } catch (error) {
    console.error('Edit submission error:', error);
    res.status(500).json({ error: 'Failed to edit submission' });
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
