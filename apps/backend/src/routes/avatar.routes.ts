/**
 * Avatar Routes
 * API endpoints for character creator avatar configuration
 */

import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { avatarService } from '../services/avatar.service';

const router = Router();

/**
 * GET /api/avatar/config
 * Get current user's avatar configuration
 */
router.get('/config', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const { config, version } = await avatarService.getConfig(userId);

    if (!config) {
      // Return null config for new users (they haven't created an avatar yet)
      return res.json({
        config: null,
        version: 0,
        message: 'No avatar configuration found. Create one in the character creator.',
      });
    }

    res.json({
      config,
      version,
    });
  } catch (error) {
    console.error('Get avatar config error:', error);
    res.status(500).json({ error: 'Failed to get avatar configuration' });
  }
});

/**
 * PUT /api/avatar/config
 * Save or update current user's avatar configuration
 */
router.put('/config', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { config } = req.body;

    if (!config) {
      return res.status(400).json({ error: 'config is required' });
    }

    // Validate the config
    const validation = avatarService.validateConfig(config);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Invalid avatar configuration',
        details: validation.errors,
      });
    }

    const result = await avatarService.saveConfig(userId, config);

    res.json({
      success: true,
      avatarId: result.avatar.id,
      version: result.avatar.version,
    });
  } catch (error) {
    console.error('Save avatar config error:', error);
    res.status(500).json({ error: 'Failed to save avatar configuration' });
  }
});

/**
 * GET /api/avatar/player/:userId
 * Get another player's avatar configuration (for multiplayer)
 */
router.get('/player/:userId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;

    const { config, bodyType } = await avatarService.getPlayerConfig(userId);

    if (!config) {
      return res.json({
        config: null,
        bodyType: null,
      });
    }

    res.json({
      config,
      bodyType,
    });
  } catch (error) {
    console.error('Get player avatar config error:', error);
    res.status(500).json({ error: 'Failed to get player avatar configuration' });
  }
});

/**
 * POST /api/avatar/players
 * Get multiple players' avatar configurations (batch for multiplayer)
 */
router.post('/players', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { playerIds } = req.body;

    if (!Array.isArray(playerIds)) {
      return res.status(400).json({ error: 'playerIds must be an array' });
    }

    if (playerIds.length > 50) {
      return res.status(400).json({ error: 'Maximum 50 player IDs per request' });
    }

    const configMap = await avatarService.getPlayerConfigs(playerIds);

    // Convert Map to object for JSON response
    const configs: Record<string, unknown> = {};
    configMap.forEach((config, id) => {
      configs[id] = config;
    });

    res.json({ configs });
  } catch (error) {
    console.error('Get player avatars batch error:', error);
    res.status(500).json({ error: 'Failed to get player avatar configurations' });
  }
});

/**
 * DELETE /api/avatar/config
 * Delete current user's avatar configuration
 */
router.delete('/config', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const deleted = await avatarService.deleteConfig(userId);

    if (!deleted) {
      return res.status(404).json({ error: 'No avatar configuration found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete avatar config error:', error);
    res.status(500).json({ error: 'Failed to delete avatar configuration' });
  }
});

export default router;
