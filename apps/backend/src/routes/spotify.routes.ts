import { Router, Request, Response } from 'express';
import { spotifyService } from '../services/spotify.service';
import { geniusService } from '../services/genius.service';

const router = Router();

// Hit songs data with Spotify track IDs and producer info
// These are the songs featured on the landing page carousel
const HIT_SONGS = [
  { spotifyId: '', title: 'Special K', artist: 'BLP Kosher', producer: '' },
  { spotifyId: '', title: 'Get In With Me', artist: 'Bossman Dlow', producer: '' },
  { spotifyId: '', title: 'Come Outside', artist: 'Icewear Vezzo', producer: '' },
  { spotifyId: '0JdjU6m2ClqIsYMUivSuPv', title: 'Gangsta Groove', artist: 'Flogo', producer: 'Doc Rolds & Lockhard Beats' },
  { spotifyId: '', title: 'Pink Molly', artist: 'YTB Fatt', producer: '' },
  { spotifyId: '', title: 'Pressure', artist: 'Bossman Dlow', producer: '' },
  { spotifyId: '', title: 'OG Crashout', artist: 'Bhad Bhabie', producer: '' },
];

/**
 * GET /api/spotify/hit-songs
 * Get all hit songs for the landing page carousel
 * Searches Spotify for each song and returns formatted data
 */
router.get('/hit-songs', async (req: Request, res: Response) => {
  try {
    if (!spotifyService.isEnabled()) {
      // Return static data if Spotify is not configured
      return res.json({
        success: true,
        source: 'static',
        songs: HIT_SONGS.map((song, index) => ({
          id: `static-${index}`,
          title: song.title,
          artist: song.artist,
          producer: song.producer,
          coverArt: null,
          previewUrl: null,
          spotifyUrl: null,
          gradient: getGradient(index),
        })),
      });
    }

    // Search for each song on Spotify and get producer credits from Genius
    const songsWithData = await Promise.all(
      HIT_SONGS.map(async (song, index) => {
        try {
          let spotifyData = null;
          let producerName = song.producer || 'Producer Tour Member';

          // Fetch Spotify data
          if (song.spotifyId) {
            const track = await spotifyService.getTrackById(song.spotifyId);
            spotifyData = spotifyService.formatForLandingPage(track, producerName);
          } else {
            const searchQuery = `${song.title} ${song.artist}`;
            const tracks = await spotifyService.searchTracks(searchQuery, 1);
            if (tracks.length > 0) {
              spotifyData = spotifyService.formatForLandingPage(tracks[0], producerName);
            }
          }

          // Fetch producer credits from Genius if enabled (skip if producer is hardcoded)
          if (geniusService.isEnabled() && !song.producer) {
            try {
              const producers = await geniusService.getProducerCredits(song.title, song.artist);
              if (producers.length > 0) {
                producerName = geniusService.formatProducers(producers);
              }
            } catch (geniusError) {
              console.error(`Failed to fetch Genius data for ${song.title}:`, geniusError);
            }
          }

          if (spotifyData) {
            return {
              ...spotifyData,
              producer: producerName,
              gradient: getGradient(index),
            };
          }

          // Fallback to static data if Spotify search fails
          return {
            id: `static-${index}`,
            title: song.title,
            artist: song.artist,
            producer: producerName,
            coverArt: null,
            previewUrl: null,
            spotifyUrl: null,
            gradient: getGradient(index),
          };
        } catch (error) {
          console.error(`Failed to fetch data for ${song.title}:`, error);
          return {
            id: `static-${index}`,
            title: song.title,
            artist: song.artist,
            producer: song.producer || 'Producer Tour Member',
            coverArt: null,
            previewUrl: null,
            spotifyUrl: null,
            gradient: getGradient(index),
          };
        }
      })
    );

    res.json({
      success: true,
      source: 'spotify',
      songs: songsWithData,
    });
  } catch (error) {
    console.error('Error fetching hit songs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch hit songs',
    });
  }
});

/**
 * GET /api/spotify/search
 * Search for tracks by query
 */
router.get('/search', async (req: Request, res: Response) => {
  try {
    const { q, limit = '10' } = req.query;

    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'Search query is required' });
    }

    if (!spotifyService.isEnabled()) {
      return res.status(503).json({ error: 'Spotify integration is not configured' });
    }

    const tracks = await spotifyService.searchTracks(q, parseInt(limit as string, 10));
    const formattedTracks = tracks.map((track) => spotifyService.formatTrackData(track));

    res.json({
      success: true,
      tracks: formattedTracks,
    });
  } catch (error) {
    console.error('Spotify search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

/**
 * GET /api/spotify/track/:id
 * Get a single track by Spotify ID
 */
router.get('/track/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!spotifyService.isEnabled()) {
      return res.status(503).json({ error: 'Spotify integration is not configured' });
    }

    const track = await spotifyService.getTrackById(id);
    const formattedTrack = spotifyService.formatTrackData(track);

    res.json({
      success: true,
      track: formattedTrack,
    });
  } catch (error) {
    console.error('Track lookup error:', error);
    res.status(500).json({ error: 'Failed to get track' });
  }
});

// Helper function to assign gradients
function getGradient(index: number): string {
  const gradients = [
    'from-purple-600 to-pink-500',
    'from-blue-600 to-cyan-500',
    'from-green-600 to-emerald-500',
    'from-red-600 to-orange-500',
    'from-pink-600 to-rose-500',
    'from-amber-600 to-yellow-500',
    'from-indigo-600 to-violet-500',
  ];
  return gradients[index % gradients.length];
}

export default router;
