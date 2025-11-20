import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import audioDBService from '../services/audiodb.service';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/audiodb/search/artist
 * Search for artists by name
 * Query params: q (artist name)
 */
router.get('/search/artist', async (req: AuthRequest, res: Response) => {
  try {
    const { q } = req.query;

    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    const artists = await audioDBService.searchArtist(q);

    res.json({
      success: true,
      count: artists.length,
      artists,
    });
  } catch (error) {
    console.error('AudioDB search artist error:', error);
    res.status(500).json({ error: 'Failed to search artists' });
  }
});

/**
 * GET /api/audiodb/search/album
 * Search for albums by artist and album name
 * Query params: artist (artist name), album (album name)
 */
router.get('/search/album', async (req: AuthRequest, res: Response) => {
  try {
    const { artist, album } = req.query;

    if (!artist || typeof artist !== 'string') {
      return res.status(400).json({ error: 'Query parameter "artist" is required' });
    }

    if (!album || typeof album !== 'string') {
      return res.status(400).json({ error: 'Query parameter "album" is required' });
    }

    const albums = await audioDBService.searchAlbum(artist, album);

    res.json({
      success: true,
      count: albums.length,
      albums,
    });
  } catch (error) {
    console.error('AudioDB search album error:', error);
    res.status(500).json({ error: 'Failed to search albums' });
  }
});

/**
 * GET /api/audiodb/search/track
 * Search for tracks by artist and track name
 * Query params: artist (artist name), track (track name)
 */
router.get('/search/track', async (req: AuthRequest, res: Response) => {
  try {
    const { artist, track } = req.query;

    if (!artist || typeof artist !== 'string') {
      return res.status(400).json({ error: 'Query parameter "artist" is required' });
    }

    if (!track || typeof track !== 'string') {
      return res.status(400).json({ error: 'Query parameter "track" is required' });
    }

    const tracks = await audioDBService.searchTrack(artist, track);

    res.json({
      success: true,
      count: tracks.length,
      tracks,
    });
  } catch (error) {
    console.error('AudioDB search track error:', error);
    res.status(500).json({ error: 'Failed to search tracks' });
  }
});

/**
 * GET /api/audiodb/artist/:id
 * Get detailed artist information by AudioDB artist ID
 * Params: id (AudioDB artist ID)
 */
router.get('/artist/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: 'Artist ID is required' });
    }

    const artist = await audioDBService.getArtist(id);

    if (!artist) {
      return res.status(404).json({ error: 'Artist not found in AudioDB' });
    }

    res.json({
      success: true,
      artist,
    });
  } catch (error) {
    console.error('AudioDB get artist error:', error);
    res.status(500).json({ error: 'Failed to fetch artist details' });
  }
});

/**
 * GET /api/audiodb/artist/:id/albums
 * Get all albums by an artist
 * Params: id (AudioDB artist ID)
 */
router.get('/artist/:id/albums', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: 'Artist ID is required' });
    }

    const albums = await audioDBService.getAlbumsByArtist(id);

    res.json({
      success: true,
      count: albums.length,
      albums,
    });
  } catch (error) {
    console.error('AudioDB get albums error:', error);
    res.status(500).json({ error: 'Failed to fetch artist albums' });
  }
});

/**
 * POST /api/audiodb/enrich
 * Enrich placement data with AudioDB metadata
 * Body: { artist, title?, albumName? }
 * Returns enriched data with artist, album, and track info
 */
router.post('/enrich', async (req: AuthRequest, res: Response) => {
  try {
    const { artist, title, albumName } = req.body;

    if (!artist || typeof artist !== 'string') {
      return res.status(400).json({ error: 'Artist name is required' });
    }

    const enrichedData = await audioDBService.enrichPlacementData(
      artist,
      title,
      albumName
    );

    res.json({
      success: true,
      data: enrichedData,
    });
  } catch (error) {
    console.error('AudioDB enrich error:', error);
    res.status(500).json({ error: 'Failed to enrich placement data' });
  }
});

/**
 * POST /api/audiodb/cache/clear
 * Clear AudioDB cache (admin/debugging)
 */
router.post('/cache/clear', async (req: AuthRequest, res: Response) => {
  try {
    // Optionally check if user is admin
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    audioDBService.clearCache();

    res.json({
      success: true,
      message: 'AudioDB cache cleared successfully',
    });
  } catch (error) {
    console.error('AudioDB clear cache error:', error);
    res.status(500).json({ error: 'Failed to clear cache' });
  }
});

export default router;
