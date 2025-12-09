import { Router, Response } from 'express';
import { authenticate, AuthRequest, requireAdmin } from '../middleware/auth.middleware';
import * as productivityService from '../services/productivity.service';

const router = Router();

// ========================================
// LAYOUT ENDPOINTS
// ========================================

/**
 * Get user's dashboard layout
 */
router.get('/layout', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // Initialize default layout if none exists
    const layout = await productivityService.initializeDefaultLayout(userId);
    res.json(layout);
  } catch (error) {
    console.error('Get layout error:', error);
    res.status(500).json({ error: 'Failed to get dashboard layout' });
  }
});

/**
 * Save user's dashboard layout
 */
router.put('/layout', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { widgets } = req.body;

    if (!Array.isArray(widgets)) {
      return res.status(400).json({ error: 'Widgets must be an array' });
    }

    const layout = await productivityService.saveUserLayout(userId, widgets);
    res.json(layout);
  } catch (error) {
    console.error('Save layout error:', error);
    res.status(500).json({ error: 'Failed to save dashboard layout' });
  }
});

/**
 * Add a widget to the layout
 */
router.post('/layout/widget', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { widgetType, position, config } = req.body;

    if (!widgetType || !position) {
      return res.status(400).json({ error: 'Widget type and position are required' });
    }

    const widget = await productivityService.addWidget(userId, widgetType, position, config);
    res.json(widget);
  } catch (error) {
    console.error('Add widget error:', error);
    res.status(500).json({ error: 'Failed to add widget' });
  }
});

/**
 * Remove a widget from the layout
 */
router.delete('/layout/widget/:widgetType', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { widgetType } = req.params;

    await productivityService.removeWidget(userId, widgetType);
    res.json({ success: true });
  } catch (error) {
    console.error('Remove widget error:', error);
    res.status(500).json({ error: 'Failed to remove widget' });
  }
});

// ========================================
// PRESET ENDPOINTS
// ========================================

/**
 * Get all presets for user
 */
router.get('/presets', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const presets = await productivityService.getUserPresets(userId);
    res.json(presets);
  } catch (error) {
    console.error('Get presets error:', error);
    res.status(500).json({ error: 'Failed to get presets' });
  }
});

/**
 * Create a new preset
 */
router.post('/presets', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { name, layout } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Preset name is required' });
    }

    const preset = await productivityService.createPreset(userId, name, layout || []);
    res.json(preset);
  } catch (error: any) {
    console.error('Create preset error:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'A preset with this name already exists' });
    }
    res.status(500).json({ error: 'Failed to create preset' });
  }
});

/**
 * Update a preset
 */
router.put('/presets/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { name, layout, isActive } = req.body;

    const preset = await productivityService.updatePreset(userId, id, { name, layout, isActive });
    res.json(preset);
  } catch (error) {
    console.error('Update preset error:', error);
    res.status(500).json({ error: 'Failed to update preset' });
  }
});

/**
 * Delete a preset
 */
router.delete('/presets/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    await productivityService.deletePreset(userId, id);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete preset error:', error);
    res.status(500).json({ error: 'Failed to delete preset' });
  }
});

/**
 * Load a preset (apply to current layout)
 */
router.post('/presets/:id/load', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const layout = await productivityService.loadPreset(userId, id);
    res.json(layout);
  } catch (error) {
    console.error('Load preset error:', error);
    res.status(500).json({ error: 'Failed to load preset' });
  }
});

// ========================================
// WIDGET CONFIG ENDPOINTS
// ========================================

/**
 * Get widget configuration
 */
router.get('/widgets/:widgetType/config', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { widgetType } = req.params;

    const config = await productivityService.getWidgetConfig(userId, widgetType);
    res.json(config);
  } catch (error) {
    console.error('Get widget config error:', error);
    res.status(500).json({ error: 'Failed to get widget configuration' });
  }
});

/**
 * Update widget configuration
 */
router.put('/widgets/:widgetType/config', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { widgetType } = req.params;
    const config = req.body;

    const widget = await productivityService.updateWidgetConfig(userId, widgetType, config);
    res.json(widget);
  } catch (error) {
    console.error('Update widget config error:', error);
    res.status(500).json({ error: 'Failed to update widget configuration' });
  }
});

// ========================================
// NOTES / SCRATCHPAD ENDPOINTS
// ========================================

/**
 * Get admin note
 */
router.get('/notes', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const note = await productivityService.getAdminNote(userId);
    res.json(note);
  } catch (error) {
    console.error('Get note error:', error);
    res.status(500).json({ error: 'Failed to get note' });
  }
});

/**
 * Update admin note
 */
router.put('/notes', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { content } = req.body;

    if (typeof content !== 'string') {
      return res.status(400).json({ error: 'Content must be a string' });
    }

    const note = await productivityService.updateAdminNote(userId, content);
    res.json(note);
  } catch (error) {
    console.error('Update note error:', error);
    res.status(500).json({ error: 'Failed to update note' });
  }
});

// ========================================
// DAILY GOALS ENDPOINTS
// ========================================

/**
 * Get daily goals
 */
router.get('/goals', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const dateStr = req.query.date as string;
    const date = dateStr ? new Date(dateStr) : new Date();

    const goals = await productivityService.getDailyGoals(userId, date);
    res.json(goals);
  } catch (error) {
    console.error('Get goals error:', error);
    res.status(500).json({ error: 'Failed to get goals' });
  }
});

/**
 * Get goal statistics
 */
router.get('/goals/stats', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const days = parseInt(req.query.days as string) || 7;

    const stats = await productivityService.getGoalStats(userId, days);
    res.json(stats);
  } catch (error) {
    console.error('Get goal stats error:', error);
    res.status(500).json({ error: 'Failed to get goal statistics' });
  }
});

/**
 * Create a daily goal
 */
router.post('/goals', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { title, date } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Goal title is required' });
    }

    const goal = await productivityService.createDailyGoal(userId, { title, date });
    res.json(goal);
  } catch (error: any) {
    console.error('Create goal error:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'This goal already exists for today' });
    }
    res.status(500).json({ error: 'Failed to create goal' });
  }
});

/**
 * Update a daily goal
 */
router.put('/goals/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { title, isCompleted, displayOrder } = req.body;

    const goal = await productivityService.updateDailyGoal(userId, id, {
      title,
      isCompleted,
      displayOrder,
    });
    res.json(goal);
  } catch (error) {
    console.error('Update goal error:', error);
    res.status(500).json({ error: 'Failed to update goal' });
  }
});

/**
 * Delete a daily goal
 */
router.delete('/goals/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    await productivityService.deleteDailyGoal(userId, id);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete goal error:', error);
    res.status(500).json({ error: 'Failed to delete goal' });
  }
});

// ========================================
// POMODORO ENDPOINTS
// ========================================

/**
 * Get pomodoro statistics
 */
router.get('/pomodoro/stats', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const days = parseInt(req.query.days as string) || 7;

    const stats = await productivityService.getPomodoroStats(userId, days);
    res.json(stats);
  } catch (error) {
    console.error('Get pomodoro stats error:', error);
    res.status(500).json({ error: 'Failed to get pomodoro statistics' });
  }
});

/**
 * Start a pomodoro session
 */
router.post('/pomodoro/start', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { duration = 25, label, isBreak = false } = req.body;

    const session = await productivityService.startPomodoroSession(userId, {
      duration,
      label,
      isBreak,
    });
    res.json(session);
  } catch (error) {
    console.error('Start pomodoro error:', error);
    res.status(500).json({ error: 'Failed to start pomodoro session' });
  }
});

/**
 * Complete a pomodoro session
 */
router.post('/pomodoro/:id/complete', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const session = await productivityService.completePomodoroSession(userId, id);
    res.json(session);
  } catch (error) {
    console.error('Complete pomodoro error:', error);
    res.status(500).json({ error: 'Failed to complete pomodoro session' });
  }
});

/**
 * Abandon a pomodoro session
 */
router.post('/pomodoro/:id/abandon', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const session = await productivityService.abandonPomodoroSession(userId, id);
    res.json(session);
  } catch (error) {
    console.error('Abandon pomodoro error:', error);
    res.status(500).json({ error: 'Failed to abandon pomodoro session' });
  }
});

// ========================================
// ACTIVITY FEED ENDPOINTS
// ========================================

/**
 * Get recent platform activity
 */
router.get('/activity', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const types = req.query.types ? String(req.query.types).split(',') : undefined;
    const since = req.query.since ? new Date(String(req.query.since)) : undefined;

    const activities = await productivityService.getRecentActivity({ limit, types, since });
    res.json(activities);
  } catch (error) {
    console.error('Get activity error:', error);
    res.status(500).json({ error: 'Failed to get activity feed' });
  }
});

// ========================================
// ONLINE USERS ENDPOINT
// ========================================

/**
 * Get online users with details
 */
router.get('/online-users', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const onlineUsers = await productivityService.getOnlineUsersWithDetails();
    res.json({
      count: productivityService.getOnlineUserCount(),
      users: onlineUsers,
    });
  } catch (error) {
    console.error('Get online users error:', error);
    res.status(500).json({ error: 'Failed to get online users' });
  }
});

export default router;
