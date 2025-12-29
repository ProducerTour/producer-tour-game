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
 * POST /api/placements/backfill-credits
 * Backfill existing placement credits to link them to users by name matching.
 * This is a one-time operation to fix credits created before auto-linking was added.
 * Admin only.
 */
router.post('/backfill-credits', async (req: AuthRequest, res: Response) => {
  try {
    const userRole = req.user?.role;

    // Admin only
    if (userRole !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    console.log('[Placements] Starting credit backfill...');

    // Find all credits without a userId
    const unlinkedCredits = await prisma.placementCredit.findMany({
      where: {
        userId: null,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        ipiNumber: true,
        pro: true,
        publisherIpiNumber: true,
        placement: {
          select: {
            id: true,
            title: true,
          }
        }
      }
    });

    console.log(`[Placements] Found ${unlinkedCredits.length} unlinked credits`);

    const results = {
      total: unlinkedCredits.length,
      linked: 0,
      notFound: 0,
      errors: 0,
      details: [] as { creditId: string; name: string; song: string; status: string; userId?: string }[],
    };

    // Process each unlinked credit
    for (const credit of unlinkedCredits) {
      try {
        if (!credit.firstName || !credit.lastName) {
          results.notFound++;
          results.details.push({
            creditId: credit.id,
            name: `${credit.firstName || ''} ${credit.lastName || ''}`.trim() || 'Unknown',
            song: credit.placement?.title || 'Unknown',
            status: 'skipped - missing name',
          });
          continue;
        }

        // Find user by name (case-insensitive) - prefer writers
        const matchedUser = await prisma.user.findFirst({
          where: {
            firstName: { equals: credit.firstName, mode: 'insensitive' },
            lastName: { equals: credit.lastName, mode: 'insensitive' },
          },
          select: {
            id: true,
            role: true,
            writerIpiNumber: true,
            publisherIpiNumber: true,
            writerProAffiliation: true,  // Use consolidated field on User
            producer: {
              select: {
                proAffiliation: true,  // Fallback for legacy data
              }
            }
          }
        });

        if (!matchedUser) {
          results.notFound++;
          results.details.push({
            creditId: credit.id,
            name: `${credit.firstName} ${credit.lastName}`,
            song: credit.placement?.title || 'Unknown',
            status: 'no matching user found',
          });
          continue;
        }

        // Get PRO from User.writerProAffiliation first, fallback to Producer
        const userPro = matchedUser.writerProAffiliation || matchedUser.producer?.proAffiliation;

        // Update the credit with user info
        await prisma.placementCredit.update({
          where: { id: credit.id },
          data: {
            userId: matchedUser.id,
            // Only update IPI/PRO if not already set
            ...((!credit.ipiNumber && matchedUser.writerIpiNumber) && {
              ipiNumber: matchedUser.writerIpiNumber,
            }),
            ...((!credit.pro && userPro) && {
              pro: userPro,
            }),
            ...((!credit.publisherIpiNumber && matchedUser.publisherIpiNumber) && {
              publisherIpiNumber: matchedUser.publisherIpiNumber,
            }),
          },
        });

        results.linked++;
        results.details.push({
          creditId: credit.id,
          name: `${credit.firstName} ${credit.lastName}`,
          song: credit.placement?.title || 'Unknown',
          status: 'linked',
          userId: matchedUser.id,
        });

        console.log(`[Placements] Linked credit "${credit.firstName} ${credit.lastName}" to user ${matchedUser.id}`);
      } catch (err) {
        results.errors++;
        results.details.push({
          creditId: credit.id,
          name: `${credit.firstName || ''} ${credit.lastName || ''}`.trim() || 'Unknown',
          song: credit.placement?.title || 'Unknown',
          status: `error: ${err}`,
        });
      }
    }

    console.log(`[Placements] Backfill complete. Linked: ${results.linked}, Not found: ${results.notFound}, Errors: ${results.errors}`);

    res.json({
      success: true,
      message: `Backfill complete. Linked ${results.linked} of ${results.total} credits.`,
      results,
    });
  } catch (error) {
    console.error('Backfill credits error:', error);
    res.status(500).json({ error: 'Failed to backfill credits', details: String(error) });
  }
});

/**
 * GET /api/placements/my-credits
 * Get all placements where the user has a credit (is listed as a writer/collaborator)
 * Includes revenue data from StatementItems
 */
router.get('/my-credits', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Find all placement credits for this user
    const userCredits = await prisma.placementCredit.findMany({
      where: { userId },
      include: {
        placement: {
          include: {
            credits: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                role: true,
                splitPercentage: true,
                userId: true,
              }
            }
          }
        }
      }
    });

    // Get unique placement IDs
    const placementIds = [...new Set(userCredits.map(c => c.placementId))];

    // Get revenue data for these placements from StatementItems
    // Group by workTitle to match placement titles
    const revenueByPlacement: Record<string, {
      totalRevenue: number;
      netRevenue: number;
      itemCount: number;
      territories: Record<string, { revenue: number; count: number }>;
      periods: Record<string, { revenue: number; net: number }>;
    }> = {};

    // Get the user's statement items
    const statementItems = await prisma.statementItem.findMany({
      where: { userId },
      include: {
        statement: {
          select: {
            periodStart: true,
            periodEnd: true,
          }
        }
      }
    });

    // Aggregate by workTitle
    for (const item of statementItems) {
      const title = item.workTitle?.toLowerCase().trim() || '';
      if (!revenueByPlacement[title]) {
        revenueByPlacement[title] = {
          totalRevenue: 0,
          netRevenue: 0,
          itemCount: 0,
          territories: {},
          periods: {},
        };
      }

      const revenue = Number(item.revenue) || 0;
      const net = Number(item.netRevenue) || 0;

      revenueByPlacement[title].totalRevenue += revenue;
      revenueByPlacement[title].netRevenue += net;
      revenueByPlacement[title].itemCount += 1;

      // Track by territory
      const territory = item.territory || 'Unknown';
      if (!revenueByPlacement[title].territories[territory]) {
        revenueByPlacement[title].territories[territory] = { revenue: 0, count: 0 };
      }
      revenueByPlacement[title].territories[territory].revenue += revenue;
      revenueByPlacement[title].territories[territory].count += 1;

      // Track by period
      if (item.statement?.periodStart) {
        const period = item.statement.periodStart.toISOString().slice(0, 7); // YYYY-MM
        if (!revenueByPlacement[title].periods[period]) {
          revenueByPlacement[title].periods[period] = { revenue: 0, net: 0 };
        }
        revenueByPlacement[title].periods[period].revenue += revenue;
        revenueByPlacement[title].periods[period].net += net;
      }
    }

    // Build enriched placement data
    const enrichedPlacements = userCredits.map(credit => {
      const placement = credit.placement;
      const titleKey = placement.title?.toLowerCase().trim() || '';
      const revenueData = revenueByPlacement[titleKey] || {
        totalRevenue: 0,
        netRevenue: 0,
        itemCount: 0,
        territories: {},
        periods: {},
      };

      return {
        id: placement.id,
        title: placement.title,
        artist: placement.artist,
        albumName: placement.albumName,
        albumArtUrl: placement.albumArtUrl,
        releaseDate: placement.releaseDate,
        status: placement.status,
        isrc: placement.isrc,
        genre: placement.genre,
        label: placement.label,
        // User's credit info
        userCredit: {
          role: credit.role,
          splitPercentage: Number(credit.splitPercentage),
        },
        // All credits on this placement
        credits: placement.credits,
        // Revenue data
        revenue: {
          total: revenueData.totalRevenue,
          net: revenueData.netRevenue,
          userShare: revenueData.netRevenue, // Already their share from StatementItems
          itemCount: revenueData.itemCount,
        },
        // Territory breakdown (top 5)
        topTerritories: Object.entries(revenueData.territories)
          .map(([territory, data]) => ({ territory, ...data }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5),
        // Period breakdown (recent 6)
        recentPeriods: Object.entries(revenueData.periods)
          .map(([period, data]) => ({ period, ...data }))
          .sort((a, b) => b.period.localeCompare(a.period))
          .slice(0, 6),
      };
    });

    // Remove duplicates (same placement appearing multiple times)
    const uniquePlacements = enrichedPlacements.filter((p, index, self) =>
      index === self.findIndex(t => t.id === p.id)
    );

    // Sort by total revenue descending
    uniquePlacements.sort((a, b) => b.revenue.total - a.revenue.total);

    res.json({
      success: true,
      count: uniquePlacements.length,
      placements: uniquePlacements,
      summary: {
        totalPlacements: uniquePlacements.length,
        totalRevenue: uniquePlacements.reduce((sum, p) => sum + p.revenue.total, 0),
        totalNet: uniquePlacements.reduce((sum, p) => sum + p.revenue.net, 0),
      }
    });
  } catch (error) {
    console.error('Get my credits error:', error);
    res.status(500).json({ error: 'Failed to fetch placements' });
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
              writerProAffiliation: true,  // Use consolidated field on User
              producer: {
                select: {
                  proAffiliation: true  // Fallback for legacy data
                }
              }
            }
          });

          if (matchedUser) {
            credit.userId = matchedUser.id;
            // Get PRO from User.writerProAffiliation first, fallback to Producer
            const userPro = matchedUser.writerProAffiliation || matchedUser.producer?.proAffiliation;
            // Copy user's IPI and PRO info to credit if not already set
            if (!credit.ipiNumber && matchedUser.writerIpiNumber) {
              credit.ipiNumber = matchedUser.writerIpiNumber;
            }
            if (!credit.pro && userPro) {
              credit.pro = userPro;
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
              writerProAffiliation: true,  // Use consolidated field on User
              producer: {
                select: {
                  proAffiliation: true  // Fallback for legacy data
                }
              }
            }
          });

          if (matchedUser) {
            credit.userId = matchedUser.id;
            // Get PRO from User.writerProAffiliation first, fallback to Producer
            const userPro = matchedUser.writerProAffiliation || matchedUser.producer?.proAffiliation;
            // Copy user's IPI and PRO info to credit if not already set
            if (!credit.ipiNumber && matchedUser.writerIpiNumber) {
              credit.ipiNumber = matchedUser.writerIpiNumber;
            }
            if (!credit.pro && userPro) {
              credit.pro = userPro;
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
