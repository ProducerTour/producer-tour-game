/**
 * Game Server Routes
 * API endpoints for server browser functionality
 */

import { Router, Response, Request } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { prisma } from '../lib/prisma';

const router = Router();

// Environment variable for current server ID (set per deployment)
const CURRENT_SERVER_ID = process.env.GAME_SERVER_ID || 'local-dev';

/**
 * GET /api/servers
 * List all game servers with their current status and player counts
 * Public endpoint - no auth required for server browsing
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const servers = await prisma.gameServer.findMany({
      where: {
        status: { not: 'offline' }, // Hide offline servers
      },
      select: {
        id: true,
        name: true,
        host: true,
        port: true,
        region: true,
        gameMode: true,
        maxPlayers: true,
        playerCount: true,
        status: true,
        lastHeartbeat: true,
      },
      orderBy: [
        { region: 'asc' },
        { playerCount: 'desc' },
      ],
    });

    res.json({ servers });
  } catch (error) {
    console.error('Get servers error:', error);
    res.status(500).json({ error: 'Failed to fetch server list' });
  }
});

/**
 * GET /api/servers/:id
 * Get detailed info for a specific server
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const server = await prisma.gameServer.findUnique({
      where: { id },
    });

    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    res.json({ server });
  } catch (error) {
    console.error('Get server error:', error);
    res.status(500).json({ error: 'Failed to fetch server info' });
  }
});

/**
 * POST /api/servers/:id/heartbeat
 * Server reports its current status (internal use)
 * Should be called by game servers periodically
 */
router.post('/:id/heartbeat', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { playerCount, status } = req.body;

    // Validate server API key (simple check - enhance for production)
    const serverApiKey = req.headers['x-server-api-key'];
    if (serverApiKey !== process.env.SERVER_API_KEY && process.env.NODE_ENV === 'production') {
      return res.status(401).json({ error: 'Invalid server API key' });
    }

    const server = await prisma.gameServer.update({
      where: { id },
      data: {
        playerCount: typeof playerCount === 'number' ? playerCount : undefined,
        status: status || undefined,
        lastHeartbeat: new Date(),
      },
    });

    res.json({ success: true, server });
  } catch (error) {
    console.error('Server heartbeat error:', error);
    res.status(500).json({ error: 'Failed to update server status' });
  }
});

/**
 * GET /api/servers/current/info
 * Get info about the current server this backend is running on
 */
router.get('/current/info', async (_req: Request, res: Response) => {
  try {
    // For local dev, return mock server info
    if (CURRENT_SERVER_ID === 'local-dev') {
      return res.json({
        server: {
          id: 'local-dev',
          name: 'Local Development',
          host: 'localhost',
          port: parseInt(process.env.PORT || '3000'),
          region: 'local',
          gameMode: 'free-roam',
          maxPlayers: 50,
          playerCount: 0,
          status: 'online',
        },
      });
    }

    const server = await prisma.gameServer.findUnique({
      where: { id: CURRENT_SERVER_ID },
    });

    if (!server) {
      return res.status(404).json({ error: 'Current server not found in registry' });
    }

    res.json({ server });
  } catch (error) {
    console.error('Get current server error:', error);
    res.status(500).json({ error: 'Failed to fetch current server info' });
  }
});

/**
 * PATCH /api/servers/:id/player-count
 * Update player count for a server (called by socket server on join/leave)
 * Internal endpoint
 */
router.patch('/:id/player-count', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { delta } = req.body; // +1 for join, -1 for leave

    if (typeof delta !== 'number' || (delta !== 1 && delta !== -1)) {
      return res.status(400).json({ error: 'delta must be 1 or -1' });
    }

    const server = await prisma.gameServer.update({
      where: { id },
      data: {
        playerCount: {
          increment: delta,
        },
        lastHeartbeat: new Date(),
      },
    });

    // Ensure player count doesn't go negative
    if (server.playerCount < 0) {
      await prisma.gameServer.update({
        where: { id },
        data: { playerCount: 0 },
      });
    }

    res.json({ success: true, playerCount: Math.max(0, server.playerCount) });
  } catch (error) {
    console.error('Update player count error:', error);
    res.status(500).json({ error: 'Failed to update player count' });
  }
});

export default router;
