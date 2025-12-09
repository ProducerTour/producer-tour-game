import { prisma } from '../lib/prisma';
import { WidgetSize } from '../generated/client';

// ========================================
// TYPES
// ========================================

export interface LayoutItem {
  i: string;           // Widget instance ID
  x: number;           // X position in grid
  y: number;           // Y position in grid
  w: number;           // Width in grid units
  h: number;           // Height in grid units
  widgetType: string;  // Widget type identifier
  config?: any;        // Widget-specific configuration
}

export interface WidgetConfigInput {
  refreshInterval?: number;
  [key: string]: any;
}

// ========================================
// LAYOUT MANAGEMENT
// ========================================

/**
 * Get user's current dashboard layout
 */
export const getUserLayout = async (userId: string): Promise<LayoutItem[]> => {
  const widgets = await prisma.dashboardWidget.findMany({
    where: { userId, isVisible: true },
    orderBy: { displayOrder: 'asc' },
  });

  return widgets.map(w => ({
    i: w.id,
    x: w.gridX,
    y: w.gridY,
    w: w.gridW,
    h: w.gridH,
    widgetType: w.widgetType,
    config: w.config as any,
  }));
};

/**
 * Save user's dashboard layout
 */
export const saveUserLayout = async (
  userId: string,
  widgets: LayoutItem[]
): Promise<LayoutItem[]> => {
  // Delete widgets that are no longer in the layout
  const widgetTypes = widgets.map(w => w.widgetType);
  await prisma.dashboardWidget.deleteMany({
    where: {
      userId,
      widgetType: { notIn: widgetTypes },
    },
  });

  // Upsert each widget position
  const upsertPromises = widgets.map((widget, index) =>
    prisma.dashboardWidget.upsert({
      where: {
        userId_widgetType: { userId, widgetType: widget.widgetType },
      },
      create: {
        userId,
        widgetType: widget.widgetType,
        gridX: widget.x,
        gridY: widget.y,
        gridW: widget.w,
        gridH: widget.h,
        displayOrder: index,
        config: widget.config || {},
      },
      update: {
        gridX: widget.x,
        gridY: widget.y,
        gridW: widget.w,
        gridH: widget.h,
        displayOrder: index,
        config: widget.config,
      },
    })
  );

  await Promise.all(upsertPromises);
  return getUserLayout(userId);
};

/**
 * Add a single widget to the layout
 */
export const addWidget = async (
  userId: string,
  widgetType: string,
  position: { x: number; y: number; w: number; h: number },
  config?: any
) => {
  // Check if widget already exists
  const existing = await prisma.dashboardWidget.findUnique({
    where: { userId_widgetType: { userId, widgetType } },
  });

  if (existing) {
    return prisma.dashboardWidget.update({
      where: { id: existing.id },
      data: { isVisible: true, ...position },
    });
  }

  // Get max display order
  const maxOrder = await prisma.dashboardWidget.aggregate({
    where: { userId },
    _max: { displayOrder: true },
  });

  return prisma.dashboardWidget.create({
    data: {
      userId,
      widgetType,
      gridX: position.x,
      gridY: position.y,
      gridW: position.w,
      gridH: position.h,
      displayOrder: (maxOrder._max.displayOrder ?? 0) + 1,
      config: config || {},
    },
  });
};

/**
 * Remove a widget from the layout
 */
export const removeWidget = async (userId: string, widgetType: string) => {
  return prisma.dashboardWidget.updateMany({
    where: { userId, widgetType },
    data: { isVisible: false },
  });
};

// ========================================
// PRESET MANAGEMENT
// ========================================

/**
 * Get all presets for a user
 */
export const getUserPresets = async (userId: string) => {
  return prisma.dashboardLayoutPreset.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  });
};

/**
 * Create a new preset from current layout
 */
export const createPreset = async (
  userId: string,
  name: string,
  layout: LayoutItem[]
) => {
  // Deactivate other presets
  await prisma.dashboardLayoutPreset.updateMany({
    where: { userId },
    data: { isActive: false },
  });

  return prisma.dashboardLayoutPreset.create({
    data: {
      userId,
      name,
      layout: layout as any,
      isActive: true,
    },
  });
};

/**
 * Update a preset
 */
export const updatePreset = async (
  userId: string,
  presetId: string,
  data: { name?: string; layout?: LayoutItem[]; isActive?: boolean }
) => {
  // If activating this preset, deactivate others
  if (data.isActive) {
    await prisma.dashboardLayoutPreset.updateMany({
      where: { userId, id: { not: presetId } },
      data: { isActive: false },
    });
  }

  return prisma.dashboardLayoutPreset.update({
    where: { id: presetId, userId },
    data: {
      name: data.name,
      layout: data.layout as any,
      isActive: data.isActive,
    },
  });
};

/**
 * Delete a preset
 */
export const deletePreset = async (userId: string, presetId: string) => {
  return prisma.dashboardLayoutPreset.delete({
    where: { id: presetId, userId },
  });
};

/**
 * Load a preset (apply it to current layout)
 */
export const loadPreset = async (userId: string, presetId: string) => {
  const preset = await prisma.dashboardLayoutPreset.findUnique({
    where: { id: presetId, userId },
  });

  if (!preset) {
    throw new Error('Preset not found');
  }

  // Apply preset layout to current widgets
  const layout = preset.layout as unknown as LayoutItem[];
  await saveUserLayout(userId, layout);

  // Mark preset as active
  await prisma.dashboardLayoutPreset.updateMany({
    where: { userId },
    data: { isActive: false },
  });
  await prisma.dashboardLayoutPreset.update({
    where: { id: presetId },
    data: { isActive: true },
  });

  return layout;
};

// ========================================
// WIDGET CONFIGURATION
// ========================================

/**
 * Get widget configuration
 */
export const getWidgetConfig = async (userId: string, widgetType: string) => {
  const widget = await prisma.dashboardWidget.findUnique({
    where: { userId_widgetType: { userId, widgetType } },
  });

  return widget?.config || {};
};

/**
 * Update widget configuration
 */
export const updateWidgetConfig = async (
  userId: string,
  widgetType: string,
  config: WidgetConfigInput
) => {
  return prisma.dashboardWidget.update({
    where: { userId_widgetType: { userId, widgetType } },
    data: { config },
  });
};

// ========================================
// NOTES / SCRATCHPAD
// ========================================

/**
 * Get admin note
 */
export const getAdminNote = async (userId: string) => {
  const note = await prisma.adminNote.findUnique({
    where: { userId },
  });

  return note || { content: '', updatedAt: new Date() };
};

/**
 * Update admin note
 */
export const updateAdminNote = async (userId: string, content: string) => {
  return prisma.adminNote.upsert({
    where: { userId },
    create: { userId, content },
    update: { content },
  });
};

// ========================================
// DAILY GOALS
// ========================================

/**
 * Get daily goals for a specific date
 */
export const getDailyGoals = async (userId: string, date: Date) => {
  // Normalize date to start of day
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  return prisma.dailyGoal.findMany({
    where: {
      userId,
      date: startOfDay,
    },
    orderBy: { displayOrder: 'asc' },
  });
};

/**
 * Create a daily goal
 */
export const createDailyGoal = async (
  userId: string,
  data: { title: string; date?: Date }
) => {
  const date = data.date ? new Date(data.date) : new Date();
  date.setHours(0, 0, 0, 0);

  // Get max display order for the day
  const maxOrder = await prisma.dailyGoal.aggregate({
    where: { userId, date },
    _max: { displayOrder: true },
  });

  return prisma.dailyGoal.create({
    data: {
      userId,
      title: data.title,
      date,
      displayOrder: (maxOrder._max.displayOrder ?? 0) + 1,
    },
  });
};

/**
 * Update a daily goal
 */
export const updateDailyGoal = async (
  userId: string,
  goalId: string,
  data: { title?: string; isCompleted?: boolean; displayOrder?: number }
) => {
  return prisma.dailyGoal.update({
    where: { id: goalId, userId },
    data,
  });
};

/**
 * Delete a daily goal
 */
export const deleteDailyGoal = async (userId: string, goalId: string) => {
  return prisma.dailyGoal.delete({
    where: { id: goalId, userId },
  });
};

/**
 * Get goal statistics for a user
 */
export const getGoalStats = async (userId: string, days: number = 7) => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  const goals = await prisma.dailyGoal.findMany({
    where: {
      userId,
      date: { gte: startDate },
    },
  });

  const totalGoals = goals.length;
  const completedGoals = goals.filter(g => g.isCompleted).length;
  const completionRate = totalGoals > 0 ? (completedGoals / totalGoals) * 100 : 0;

  return {
    totalGoals,
    completedGoals,
    completionRate: Math.round(completionRate),
    streak: await calculateGoalStreak(userId),
  };
};

/**
 * Calculate consecutive days of completing all goals
 */
const calculateGoalStreak = async (userId: string): Promise<number> => {
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < 365; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    const dayGoals = await prisma.dailyGoal.findMany({
      where: { userId, date },
    });

    // Skip days with no goals
    if (dayGoals.length === 0) {
      if (i === 0) continue; // Today might not have goals yet
      break;
    }

    const allCompleted = dayGoals.every(g => g.isCompleted);
    if (allCompleted) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
};

// ========================================
// POMODORO SESSIONS
// ========================================

/**
 * Start a pomodoro session
 */
export const startPomodoroSession = async (
  userId: string,
  data: { duration: number; label?: string; isBreak?: boolean }
) => {
  return prisma.pomodoroSession.create({
    data: {
      userId,
      startedAt: new Date(),
      duration: data.duration,
      label: data.label,
      isBreak: data.isBreak || false,
    },
  });
};

/**
 * Complete a pomodoro session
 */
export const completePomodoroSession = async (userId: string, sessionId: string) => {
  return prisma.pomodoroSession.update({
    where: { id: sessionId, userId },
    data: {
      completedAt: new Date(),
      wasCompleted: true,
    },
  });
};

/**
 * Abandon a pomodoro session
 */
export const abandonPomodoroSession = async (userId: string, sessionId: string) => {
  return prisma.pomodoroSession.update({
    where: { id: sessionId, userId },
    data: {
      completedAt: new Date(),
      wasCompleted: false,
    },
  });
};

/**
 * Get pomodoro statistics
 */
export const getPomodoroStats = async (userId: string, days: number = 7) => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const sessions = await prisma.pomodoroSession.findMany({
    where: {
      userId,
      startedAt: { gte: startDate },
    },
    orderBy: { startedAt: 'desc' },
  });

  const completedSessions = sessions.filter(s => s.wasCompleted && !s.isBreak);
  const totalMinutes = completedSessions.reduce((sum, s) => sum + s.duration, 0);

  // Group by day
  const dailyStats: Record<string, { completed: number; minutes: number }> = {};
  completedSessions.forEach(session => {
    const dateKey = session.startedAt.toISOString().split('T')[0];
    if (!dailyStats[dateKey]) {
      dailyStats[dateKey] = { completed: 0, minutes: 0 };
    }
    dailyStats[dateKey].completed++;
    dailyStats[dateKey].minutes += session.duration;
  });

  return {
    totalSessions: completedSessions.length,
    totalMinutes,
    totalHours: Math.round(totalMinutes / 60 * 10) / 10,
    averagePerDay: Math.round(completedSessions.length / days * 10) / 10,
    dailyStats,
    recentSessions: sessions.slice(0, 10),
  };
};

// ========================================
// ACTIVITY FEED
// ========================================

/**
 * Log a platform activity
 */
export const logActivity = async (data: {
  activityType: string;
  actorId?: string;
  actorName?: string;
  targetType?: string;
  targetId?: string;
  targetName?: string;
  metadata?: any;
}) => {
  return prisma.productivityActivity.create({
    data,
  });
};

/**
 * Get recent platform activity
 */
export const getRecentActivity = async (options: {
  limit?: number;
  types?: string[];
  since?: Date;
}) => {
  const { limit = 20, types, since } = options;

  return prisma.productivityActivity.findMany({
    where: {
      ...(types?.length ? { activityType: { in: types } } : {}),
      ...(since ? { createdAt: { gte: since } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
};

// ========================================
// ONLINE USERS (uses socket.io tracking)
// ========================================

// This will be populated by socket.io events
let onlineUsersMap: Map<string, { socketId: string; connectedAt: Date }> = new Map();

export const setOnlineUsersMap = (map: Map<string, { socketId: string; connectedAt: Date }>) => {
  onlineUsersMap = map;
};

/**
 * Get online users with their details
 */
export const getOnlineUsersWithDetails = async () => {
  const onlineUserIds = Array.from(onlineUsersMap.keys());

  if (onlineUserIds.length === 0) return [];

  const users = await prisma.user.findMany({
    where: { id: { in: onlineUserIds } },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      profilePhotoUrl: true,
    },
  });

  return users.map(user => ({
    ...user,
    connectedAt: onlineUsersMap.get(user.id)?.connectedAt,
  }));
};

/**
 * Get online user count
 */
export const getOnlineUserCount = () => {
  return onlineUsersMap.size;
};

// ========================================
// DEFAULT LAYOUT
// ========================================

/**
 * Get default widget layout for new users
 */
export const getDefaultLayout = (): LayoutItem[] => {
  return [
    { i: 'quick-actions', x: 0, y: 0, w: 3, h: 2, widgetType: 'quick-actions', config: {} },
    { i: 'daily-goals', x: 3, y: 0, w: 3, h: 3, widgetType: 'daily-goals', config: {} },
    { i: 'pomodoro', x: 6, y: 0, w: 3, h: 2, widgetType: 'pomodoro', config: { duration: 25 } },
    { i: 'notes', x: 9, y: 0, w: 3, h: 3, widgetType: 'notes', config: {} },
  ];
};

/**
 * Initialize default layout for a user
 */
export const initializeDefaultLayout = async (userId: string) => {
  const existingWidgets = await prisma.dashboardWidget.count({
    where: { userId },
  });

  if (existingWidgets > 0) {
    return getUserLayout(userId);
  }

  const defaultLayout = getDefaultLayout();
  return saveUserLayout(userId, defaultLayout);
};
