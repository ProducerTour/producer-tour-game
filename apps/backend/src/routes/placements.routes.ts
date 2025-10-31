import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
const prisma = new PrismaClient();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/placements
 * Get all placements for the authenticated user
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const placements = await prisma.placement.findMany({
      where: { userId },
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
router.get('/analytics', async (req: Request, res: Response) => {
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
router.get('/:id', async (req: Request, res: Response) => {
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
 * Body: { title, artist, platform, releaseDate, isrc?, spotifyTrackId?, streams?, status?, metadata? }
 */
router.post('/', async (req: Request, res: Response) => {
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
    } = req.body;

    // Validation
    if (!title || !artist || !releaseDate) {
      return res.status(400).json({ error: 'Title, artist, and release date are required' });
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
router.put('/:id', async (req: Request, res: Response) => {
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
router.delete('/:id', async (req: Request, res: Response) => {
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
