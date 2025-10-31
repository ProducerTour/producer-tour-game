import { Router, Request, Response } from 'express';
import { spotifyService } from '../services/spotify.service';

const router = Router();

/**
 * POST /api/tools/publishing-simulator
 * Calculate publishing deal scenarios
 */
router.post('/publishing-simulator', (req: Request, res: Response) => {
  try {
    const {
      dealType, // 'unpublished' | 'copublishing' | 'admin'
      grossIncome,
      writerOwnership = 100,
      adminFee = 0,
      publisherOverhead = 0,
      advance = 0,
      priorBalance = 0,
    } = req.body;

    let result: any = {};

    if (dealType === 'unpublished') {
      const writerShare = grossIncome * 0.5; // 50%
      const publisherShare = grossIncome * 0.5; // 50%
      const totalIncome = writerShare + publisherShare;
      const adminDeduction = totalIncome * (adminFee / 100);
      const netBeforeRecoup = totalIncome - adminDeduction;
      const recoupment = Math.min(netBeforeRecoup, priorBalance + advance);
      const finalPayout = netBeforeRecoup - recoupment;

      result = {
        dealType: 'Unpublished',
        grossIncome,
        writerShare,
        publisherShare,
        totalIncome,
        adminFee: adminDeduction,
        netBeforeRecoup,
        advance,
        priorBalance,
        recoupment,
        finalPayout,
      };
    } else if (dealType === 'copublishing') {
      const writerShare = grossIncome * 0.5;
      const publisherShare = grossIncome * 0.5;
      const writerOwnershipDecimal = writerOwnership / 100;
      const writerPublisherCut = publisherShare * writerOwnershipDecimal;
      const publisherCut = publisherShare * (1 - writerOwnershipDecimal);
      const adminDeduction = (writerShare + writerPublisherCut) * (adminFee / 100);
      const overheadDeduction = publisherCut * (publisherOverhead / 100);
      const netBeforeRecoup = writerShare + writerPublisherCut - adminDeduction;
      const recoupment = Math.min(netBeforeRecoup, priorBalance + advance);
      const finalPayout = netBeforeRecoup - recoupment;

      result = {
        dealType: 'Co-Publishing',
        grossIncome,
        writerShare,
        publisherShare,
        writerPublisherCut,
        publisherCut,
        adminFee: adminDeduction,
        publisherOverhead: overheadDeduction,
        netBeforeRecoup,
        advance,
        recoupment,
        finalPayout,
      };
    } else if (dealType === 'admin') {
      const adminDeduction = grossIncome * (adminFee / 100);
      const netAfterAdmin = grossIncome - adminDeduction;
      const recoupment = Math.min(netAfterAdmin, priorBalance + advance);
      const finalPayout = netAfterAdmin - recoupment;

      result = {
        dealType: 'Admin Deal',
        grossIncome,
        adminFee: adminDeduction,
        netAfterAdmin,
        advance,
        recoupment,
        finalPayout,
        note: 'Admin fees are non-recoupable',
      };
    } else {
      return res.status(400).json({ error: 'Invalid deal type' });
    }

    res.json(result);
  } catch (error) {
    console.error('Publishing simulator error:', error);
    res.status(500).json({ error: 'Calculation failed' });
  }
});

/**
 * POST /api/tools/spotify/search
 * Search for tracks on Spotify
 * Body: { query: string, limit?: number }
 */
router.post('/spotify/search', async (req: Request, res: Response) => {
  try {
    const { query, limit = 10 } = req.body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }

    const tracks = await spotifyService.searchTracks(query.trim(), limit);
    const formattedTracks = tracks.map((track) => spotifyService.formatTrackData(track));

    res.json({
      success: true,
      count: formattedTracks.length,
      tracks: formattedTracks,
    });
  } catch (error) {
    console.error('Spotify search error:', error);
    res.status(500).json({ error: 'Failed to search Spotify' });
  }
});

/**
 * POST /api/tools/spotify/isrc
 * Lookup track by ISRC code
 * Body: { isrc: string }
 */
router.post('/spotify/isrc', async (req: Request, res: Response) => {
  try {
    const { isrc } = req.body;

    if (!isrc || typeof isrc !== 'string' || isrc.trim().length === 0) {
      return res.status(400).json({ error: 'ISRC code is required' });
    }

    const track = await spotifyService.getTrackByISRC(isrc.trim());

    if (!track) {
      return res.status(404).json({ error: 'Track not found for ISRC code' });
    }

    res.json({
      success: true,
      track: spotifyService.formatTrackData(track),
    });
  } catch (error) {
    console.error('ISRC lookup error:', error);
    res.status(500).json({ error: 'Failed to lookup ISRC code' });
  }
});

/**
 * GET /api/tools/spotify/track/:trackId
 * Get track details by Spotify track ID
 */
router.get('/spotify/track/:trackId', async (req: Request, res: Response) => {
  try {
    const { trackId } = req.params;

    if (!trackId || trackId.trim().length === 0) {
      return res.status(400).json({ error: 'Track ID is required' });
    }

    const track = await spotifyService.getTrackById(trackId);
    res.json({
      success: true,
      track: spotifyService.formatTrackData(track),
    });
  } catch (error) {
    console.error('Track lookup error:', error);
    res.status(500).json({ error: 'Failed to get track details' });
  }
});

export default router;
