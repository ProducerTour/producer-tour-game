import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { prisma } from '../lib/prisma';

const router = Router();

// All routes require authentication
router.use(authenticate);

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
    } = req.body;

    // Validation
    if (!title || !artist || !releaseDate) {
      return res.status(400).json({ error: 'Title, artist, and release date are required' });
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
            })),
          },
        }),
      },
      include: {
        credits: true,
      },
    });

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
 * Update a placement
 */
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check ownership
    const existing = await prisma.placement.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Placement not found' });
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

    res.json({
      success: true,
      placement,
    });
  } catch (error) {
    console.error('Update placement error:', error);
    res.status(500).json({ error: 'Failed to update placement' });
  }
});

/**
 * DELETE /api/placements/:id
 * Delete a placement
 */
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check ownership
    const existing = await prisma.placement.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Placement not found' });
    }

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
