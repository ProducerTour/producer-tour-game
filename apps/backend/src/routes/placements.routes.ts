import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { prisma } from '../lib/prisma';
import { awardPoints, checkAchievements } from '../services/gamification.service';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/placements/debug/status-breakdown
 * Diagnostic endpoint to see all placement statuses in the database
 * TEMPORARY - Remove after debugging
 */
router.get('/debug/status-breakdown', async (req: AuthRequest, res: Response) => {
  try {
    // Get ALL placements (not just user's)
    const allPlacements = await prisma.placement.findMany({
      select: {
        id: true,
        title: true,
        artist: true,
        status: true,
        createdAt: true,
        credits: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            splitPercentage: true,
            userId: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    // Group by status
    const statusBreakdown: Record<string, number> = {};
    allPlacements.forEach(p => {
      statusBreakdown[p.status] = (statusBreakdown[p.status] || 0) + 1;
    });

    // Get sample of APPROVED placements
    const approvedSamples = allPlacements
      .filter(p => p.status === 'APPROVED')
      .slice(0, 10);

    // Get sample of other statuses
    const otherSamples = allPlacements
      .filter(p => p.status !== 'APPROVED')
      .slice(0, 5);

    res.json({
      success: true,
      totalPlacements: allPlacements.length,
      statusBreakdown,
      approvedCount: allPlacements.filter(p => p.status === 'APPROVED').length,
      trackingCount: allPlacements.filter(p => p.status === 'TRACKING').length,
      approvedSamples: approvedSamples.map(p => ({
        id: p.id,
        title: p.title,
        artist: p.artist,
        status: p.status,
        creditsCount: p.credits.length,
        hasLinkedUsers: p.credits.some(c => c.userId !== null),
      })),
      otherSamples: otherSamples.map(p => ({
        id: p.id,
        title: p.title,
        status: p.status,
      })),
    });
  } catch (error) {
    console.error('Debug status-breakdown error:', error);
    res.status(500).json({ error: 'Failed to get status breakdown', details: String(error) });
  }
});

/**
 * GET /api/placements
 * Get all placements for the authenticated user
 */
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const placements = await prisma.placement.findMany({
      where: { userId },
      include: {
        credits: true,
        documents: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      count: placements.length,
      placements,
    });
  } catch (error) {
    console.error('Get placements error:', error);
    res.status(500).json({ error: 'Failed to fetch placements' });
  }
});

/**
 * GET /api/placements/analytics
 * Get analytics data calculated from user's placements
 */
router.get('/analytics', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const placements = await prisma.placement.findMany({
      where: { userId },
    });

    // Calculate totals
    const totalPlacements = placements.length;
    const totalStreams = placements.reduce((sum, p) => sum + p.streams, 0);
    const activePlacements = placements.filter((p) => p.status === 'ACTIVE').length;

    // Platform distribution
    const platformCounts: Record<string, number> = {};
    placements.forEach((p) => {
      platformCounts[p.platform] = (platformCounts[p.platform] || 0) + 1;
    });

    const platformDistribution = Object.entries(platformCounts).map(([platform, count]) => ({
      platform,
      count,
      percentage: (count / totalPlacements) * 100,
    }));

    // Top performing tracks (by streams)
    const topTracks = placements
      .sort((a, b) => b.streams - a.streams)
      .slice(0, 10)
      .map((p) => ({
        id: p.id,
        title: p.title,
        artist: p.artist,
        streams: p.streams,
        platform: p.platform,
      }));

    res.json({
      success: true,
      analytics: {
        totalPlacements,
        totalStreams,
        activePlacements,
        platformDistribution,
        topTracks,
      },
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ error: 'Failed to calculate analytics' });
  }
});

/**
 * GET /api/placements/:id
 * Get a specific placement by ID
 */
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const placement = await prisma.placement.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        credits: true,
        documents: true,
      },
    });

    if (!placement) {
      return res.status(404).json({ error: 'Placement not found' });
    }

    res.json({
      success: true,
      placement,
    });
  } catch (error) {
    console.error('Get placement error:', error);
    res.status(500).json({ error: 'Failed to fetch placement' });
  }
});

/**
 * GET /api/placements/check-duplicate
 * Check if a song title already exists in the Placement Tracker
 * Query: { title: string }
 */
router.get('/check-duplicate', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { title } = req.query;

    if (!title || typeof title !== 'string') {
      return res.status(400).json({ error: 'Title is required' });
    }

    // Check for existing placement with same title (case-insensitive)
    // Only check songs that are in the tracker (APPROVED, TRACKING, or COMPLETED)
    const existingPlacement = await prisma.placement.findFirst({
      where: {
        title: {
          equals: title.trim(),
          mode: 'insensitive',
        },
        status: {
          in: ['APPROVED', 'TRACKING', 'COMPLETED'],
        },
      },
      select: {
        id: true,
        title: true,
        artist: true,
        caseNumber: true,
        status: true,
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    res.json({
      success: true,
      isDuplicate: !!existingPlacement,
      existingPlacement,
    });
  } catch (error) {
    console.error('Check duplicate error:', error);
    res.status(500).json({ error: 'Failed to check for duplicates' });
  }
});

/**
 * POST /api/placements
 * Create a new placement
 * Body: { title, artist, platform, releaseDate, isrc?, spotifyTrackId?, streams?, status?, metadata?,
 *         albumName?, genre?, releaseYear?, label?, albumArtUrl?, albumArtHQUrl?, artistThumbUrl?,
 *         artistBio?, musicbrainzId?, audioDbArtistId?, audioDbAlbumId?, audioDbData?,
 *         credits?: [{ firstName, lastName, role, splitPercentage, ipiNumber?, isPrimary? }] }
 */
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      title,
      artist,
      platform = 'OTHER',
      releaseDate,
      isrc,
      spotifyTrackId,
      streams = 0,
      estimatedStreams = false,
      status = 'PENDING',
      metadata,
      notes,
      // AudioDB enrichment fields
      albumName,
      genre,
      releaseYear,
      label,
      albumArtUrl,
      albumArtHQUrl,
      artistThumbUrl,
      artistBio,
      musicbrainzId,
      audioDbArtistId,
      audioDbAlbumId,
      audioDbData,
      // Credits/Collaborators
      credits,
      // Skip duplicate check (for admin overrides)
      skipDuplicateCheck = false,
    } = req.body;

    // Validation
    if (!title || !artist || !releaseDate) {
      return res.status(400).json({ error: 'Title, artist, and release date are required' });
    }

    // Check for duplicate titles in the Placement Tracker
    // Only check songs that are already approved/tracking/completed
    if (!skipDuplicateCheck) {
      const existingPlacement = await prisma.placement.findFirst({
        where: {
          title: {
            equals: title.trim(),
            mode: 'insensitive',
          },
          status: {
            in: ['APPROVED', 'TRACKING', 'COMPLETED'],
          },
        },
        select: {
          id: true,
          title: true,
          artist: true,
          caseNumber: true,
        },
      });

      if (existingPlacement) {
        return res.status(409).json({
          error: 'Duplicate song detected',
          message: `A song with the title "${existingPlacement.title}" already exists in the Placement Tracker${existingPlacement.caseNumber ? ` (Case: ${existingPlacement.caseNumber})` : ''}.`,
          existingPlacement,
        });
      }
    }

    // Validate credits if provided
    if (credits && Array.isArray(credits)) {
      for (const credit of credits) {
        if (!credit.firstName || !credit.lastName || !credit.role || credit.splitPercentage === undefined) {
          return res.status(400).json({
            error: 'Each credit must have firstName, lastName, role, and splitPercentage'
          });
        }
        if (credit.splitPercentage < 0 || credit.splitPercentage > 100) {
          return res.status(400).json({
            error: 'Split percentage must be between 0 and 100'
          });
        }
      }

      // Validate that splits sum to exactly 100%
      const totalSplit = credits.reduce((sum: number, c: any) => sum + (Number(c.splitPercentage) || 0), 0);
      if (Math.abs(totalSplit - 100) > 0.01) {
        return res.status(400).json({
          error: `Split percentages must equal exactly 100%. Current total: ${totalSplit.toFixed(2)}%`
        });
      }

      // Auto-link credits to users based on name (simple matching)
      for (const credit of credits) {
        // Skip if already linked to a user
        if (credit.userId) continue;

        // Match by first name + last name (case-insensitive)
        if (credit.firstName && credit.lastName) {
          const matchedUser = await prisma.user.findFirst({
            where: {
              firstName: { equals: credit.firstName, mode: 'insensitive' },
              lastName: { equals: credit.lastName, mode: 'insensitive' }
            },
            select: {
              id: true,
              writerIpiNumber: true,
              publisherIpiNumber: true,
              producer: {
                select: {
                  proAffiliation: true
                }
              }
            }
          });

          if (matchedUser) {
            credit.userId = matchedUser.id;
            // Copy user's IPI and PRO info to credit if not already set
            if (!credit.ipiNumber && matchedUser.writerIpiNumber) {
              credit.ipiNumber = matchedUser.writerIpiNumber;
            }
            if (!credit.pro && matchedUser.producer?.proAffiliation) {
              credit.pro = matchedUser.producer.proAffiliation;
            }
            if (!credit.publisherIpiNumber && matchedUser.publisherIpiNumber) {
              credit.publisherIpiNumber = matchedUser.publisherIpiNumber;
            }
            console.log(`[Placements] Auto-linked credit "${credit.firstName} ${credit.lastName}" to user ${matchedUser.id}`);
          }
        }
      }
    }

    const placement = await prisma.placement.create({
      data: {
        userId,
        title,
        artist,
        platform,
        releaseDate: new Date(releaseDate),
        isrc,
        spotifyTrackId,
        streams,
        estimatedStreams,
        status,
        metadata,
        notes,
        // AudioDB fields
        albumName,
        genre,
        releaseYear,
        label,
        albumArtUrl,
        albumArtHQUrl,
        artistThumbUrl,
        artistBio,
        musicbrainzId,
        audioDbArtistId,
        audioDbAlbumId,
        audioDbData,
        // Work registration workflow
        submittedAt: new Date(), // Track when work was submitted
        // Create credits if provided
        ...(credits && credits.length > 0 && {
          credits: {
            create: credits.map((credit: any) => ({
              firstName: credit.firstName,
              lastName: credit.lastName,
              role: credit.role,
              splitPercentage: credit.splitPercentage,
              pro: credit.pro || null,
              ipiNumber: credit.ipiNumber || null,
              isPrimary: credit.isPrimary || false,
              notes: credit.notes || null,
              // NEW: Link to user for statement processing
              userId: credit.userId || null,
              publisherIpiNumber: credit.publisherIpiNumber || null,
              isExternalWriter: credit.isExternalWriter || false,
            })),
          },
        }),
      },
      include: {
        credits: true,
      },
    });

    // Gamification: Award points for work submission
    try {
      // Check if this is the user's first placement
      const placementCount = await prisma.placement.count({
        where: { userId }
      });

      if (placementCount === 1) {
        // Award 100 TP for first work submission
        await awardPoints(
          userId,
          'WORK_SUBMISSION',
          100,
          'First work submission'
        );

        // Check and unlock achievements (including "First Steps")
        await checkAchievements(userId);
      }
    } catch (gamificationError) {
      console.error('Failed to award work submission points:', gamificationError);
      // Continue even if gamification fails
    }

    res.status(201).json({
      success: true,
      placement,
    });
  } catch (error) {
    console.error('Create placement error:', error);
    res.status(500).json({ error: 'Failed to create placement' });
  }
});

/**
 * PUT /api/placements/:id
 * Update a placement (owner or admin can update)
 */
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if placement exists
    const existing = await prisma.placement.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Placement not found' });
    }

    // Allow if user is admin OR owns the placement
    if (userRole !== 'ADMIN' && existing.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized to update this placement' });
    }

    const {
      title,
      artist,
      platform,
      releaseDate,
      isrc,
      spotifyTrackId,
      streams,
      estimatedStreams,
      status,
      metadata,
      notes,
      credits,
      // AudioDB enrichment fields
      albumName,
      genre,
      releaseYear,
      label,
      albumArtUrl,
      albumArtHQUrl,
      artistThumbUrl,
      artistBio,
      musicbrainzId,
      audioDbArtistId,
      audioDbAlbumId,
      audioDbData,
    } = req.body;

    // Update placement
    const placement = await prisma.placement.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(artist && { artist }),
        ...(platform && { platform }),
        ...(releaseDate && { releaseDate: new Date(releaseDate) }),
        ...(isrc !== undefined && { isrc }),
        ...(spotifyTrackId !== undefined && { spotifyTrackId }),
        ...(streams !== undefined && { streams }),
        ...(estimatedStreams !== undefined && { estimatedStreams }),
        ...(status && { status }),
        ...(metadata !== undefined && { metadata }),
        ...(notes !== undefined && { notes }),
        // AudioDB fields
        ...(albumName !== undefined && { albumName }),
        ...(genre !== undefined && { genre }),
        ...(releaseYear !== undefined && { releaseYear }),
        ...(label !== undefined && { label }),
        ...(albumArtUrl !== undefined && { albumArtUrl }),
        ...(albumArtHQUrl !== undefined && { albumArtHQUrl }),
        ...(artistThumbUrl !== undefined && { artistThumbUrl }),
        ...(artistBio !== undefined && { artistBio }),
        ...(musicbrainzId !== undefined && { musicbrainzId }),
        ...(audioDbArtistId !== undefined && { audioDbArtistId }),
        ...(audioDbAlbumId !== undefined && { audioDbAlbumId }),
        ...(audioDbData !== undefined && { audioDbData }),
        updatedAt: new Date(),
      },
    });

    // Update credits if provided
    if (credits && Array.isArray(credits)) {
      // Validate splits equal 100%
      const totalSplit = credits.reduce((sum: number, c: any) => sum + (Number(c.splitPercentage) || 0), 0);
      if (Math.abs(totalSplit - 100) > 0.1) {
        return res.status(400).json({
          error: `Split percentages must equal 100%. Current total: ${totalSplit.toFixed(2)}%`
        });
      }

      // Delete existing credits
      await prisma.placementCredit.deleteMany({
        where: { placementId: id },
      });

      // Auto-link credits to users based on name (simple matching)
      for (const credit of credits) {
        // Skip if already linked to a user
        if (credit.userId) continue;

        // Match by first name + last name (case-insensitive)
        if (credit.firstName && credit.lastName) {
          const matchedUser = await prisma.user.findFirst({
            where: {
              firstName: { equals: credit.firstName, mode: 'insensitive' },
              lastName: { equals: credit.lastName, mode: 'insensitive' }
            },
            select: {
              id: true,
              writerIpiNumber: true,
              publisherIpiNumber: true,
              producer: {
                select: {
                  proAffiliation: true
                }
              }
            }
          });

          if (matchedUser) {
            credit.userId = matchedUser.id;
            // Copy user's IPI and PRO info to credit if not already set
            if (!credit.ipiNumber && matchedUser.writerIpiNumber) {
              credit.ipiNumber = matchedUser.writerIpiNumber;
            }
            if (!credit.pro && matchedUser.producer?.proAffiliation) {
              credit.pro = matchedUser.producer.proAffiliation;
            }
            if (!credit.publisherIpiNumber && matchedUser.publisherIpiNumber) {
              credit.publisherIpiNumber = matchedUser.publisherIpiNumber;
            }
            console.log(`[Placements] Auto-linked credit "${credit.firstName} ${credit.lastName}" to user ${matchedUser.id}`);
          }
        }
      }

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
            userId: credit.userId || null,
            publisherIpiNumber: credit.publisherIpiNumber || null,
            isExternalWriter: credit.isExternalWriter || false,
          })),
        });
      }
    }

    // Fetch updated placement with credits
    const updatedPlacement = await prisma.placement.findUnique({
      where: { id },
      include: {
        credits: true,
        documents: true,
      },
    });

    res.json({
      success: true,
      placement: updatedPlacement,
    });
  } catch (error) {
    console.error('Update placement error:', error);
    res.status(500).json({ error: 'Failed to update placement' });
  }
});

/**
 * DELETE /api/placements/:id
 * Delete a placement (owner or admin can delete)
 */
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if placement exists
    const existing = await prisma.placement.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Placement not found' });
    }

    // Allow if user is admin OR owns the placement
    if (userRole !== 'ADMIN' && existing.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized to delete this placement' });
    }

    // Delete associated credits first
    await prisma.placementCredit.deleteMany({
      where: { placementId: id },
    });

    // Delete associated documents
    await prisma.document.deleteMany({
      where: { placementId: id },
    });

    await prisma.placement.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Placement deleted successfully',
    });
  } catch (error) {
    console.error('Delete placement error:', error);
    res.status(500).json({ error: 'Failed to delete placement' });
  }
});

export default router;
