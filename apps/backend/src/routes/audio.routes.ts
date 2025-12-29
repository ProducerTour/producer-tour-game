import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

/**
 * Audio Proxy Routes
 *
 * Proxies external audio streams through our backend to avoid CORS issues.
 * This allows streaming royalty-free music from sources that don't support CORS headers.
 */

// Curated list of royalty-free music tracks
// Using SoundHelix test tracks (reliable CDN) - replace with your own hosted files for production
const MUSIC_LIBRARY: Record<string, { url: string; name: string; artist: string }> = {
  // Lo-Fi / Chill Beats (using SoundHelix instrumentals as placeholders)
  'lofi-chill': {
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    name: 'Chill Vibes',
    artist: 'SoundHelix',
  },
  'lofi-study': {
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    name: 'Study Flow',
    artist: 'SoundHelix',
  },
  'lofi-jazz': {
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    name: 'Smooth Jazz',
    artist: 'SoundHelix',
  },

  // Classical / Piano (using SoundHelix instrumentals as placeholders)
  'classical-piano': {
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
    name: 'Piano Dreams',
    artist: 'SoundHelix',
  },
  'classical-strings': {
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
    name: 'String Serenade',
    artist: 'SoundHelix',
  },
  'classical-ambient': {
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3',
    name: 'Ambient Space',
    artist: 'SoundHelix',
  },
};

/**
 * GET /api/audio/tracks
 * Returns list of available music tracks
 */
router.get('/tracks', authenticate, (_req: AuthRequest, res: Response) => {
  const tracks = Object.entries(MUSIC_LIBRARY).map(([id, track]) => ({
    id,
    name: track.name,
    artist: track.artist,
  }));

  res.json({ tracks });
});

/**
 * GET /api/audio/stream/:trackId
 * Proxies audio stream from external source to avoid CORS issues
 */
router.get('/stream/:trackId', authenticate, async (req: AuthRequest, res: Response) => {
  const { trackId } = req.params;
  const track = MUSIC_LIBRARY[trackId];

  if (!track) {
    return res.status(404).json({ error: 'Track not found' });
  }

  try {
    // Fetch audio from external source
    const response = await fetch(track.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ProducerTour/1.0)',
        'Accept': 'audio/*',
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch audio: ${response.status} ${response.statusText}`);
      return res.status(502).json({ error: 'Failed to fetch audio from source' });
    }

    // Get content info
    const contentType = response.headers.get('content-type') || 'audio/mpeg';
    const contentLength = response.headers.get('content-length');

    // Set response headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours

    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }

    // Handle range requests for seeking
    const range = req.headers.range;
    if (range && contentLength) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : parseInt(contentLength, 10) - 1;

      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${contentLength}`);
      res.setHeader('Content-Length', end - start + 1);
    }

    // Stream the audio
    if (response.body) {
      const reader = response.body.getReader();

      const stream = new ReadableStream({
        async start(controller) {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              controller.enqueue(value);
            }
            controller.close();
          } catch (err) {
            controller.error(err);
          }
        },
      });

      // Convert ReadableStream to Node stream and pipe to response
      const nodeStream = require('stream').Readable.fromWeb(stream);
      nodeStream.pipe(res);
    } else {
      res.status(500).json({ error: 'No response body' });
    }
  } catch (error) {
    console.error('Audio proxy error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
