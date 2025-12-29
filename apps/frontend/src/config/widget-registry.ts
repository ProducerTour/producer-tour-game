import { lazy } from 'react';
import type { WidgetDefinition, WidgetType, WidgetCategory } from '../types/productivity.types';

// Lazy-load all widget components for code splitting
// Phase 1 - Core Widgets
const QuickActionsWidget = lazy(() => import('../components/productivity/widgets/QuickActionsWidget'));
const NotesWidget = lazy(() => import('../components/productivity/widgets/NotesWidget'));
const DailyGoalsWidget = lazy(() => import('../components/productivity/widgets/DailyGoalsWidget'));
const PomodoroWidget = lazy(() => import('../components/productivity/widgets/PomodoroWidget'));

// Phase 2 - Real-Time Widgets
const ActivityFeedWidget = lazy(() => import('../components/productivity/widgets/ActivityFeedWidget'));
const WhosOnlineWidget = lazy(() => import('../components/productivity/widgets/WhosOnlineWidget'));
const EngagementHeatmapWidget = lazy(() => import('../components/productivity/widgets/EngagementHeatmapWidget'));

// Phase 3 - Gamification Widgets
const LeaderboardWidget = lazy(() => import('../components/productivity/widgets/LeaderboardWidget'));
const AchievementsWidget = lazy(() => import('../components/productivity/widgets/AchievementsWidget'));
const ReferralScoreboardWidget = lazy(() => import('../components/productivity/widgets/ReferralScoreboardWidget'));

// Phase 5 - External Integrations
const WeatherWidget = lazy(() => import('../components/productivity/widgets/WeatherWidget'));
const CryptoTrackerWidget = lazy(() => import('../components/productivity/widgets/CryptoTrackerWidget'));
const CalendarAgendaWidget = lazy(() => import('../components/productivity/widgets/CalendarAgendaWidget'));
const SpotifyChartsWidget = lazy(() => import('../components/productivity/widgets/SpotifyChartsWidget'));

// Phase 6 - Wellness & Fun
const InspirationalQuotesWidget = lazy(() => import('../components/productivity/widgets/InspirationalQuotesWidget'));
const AmbientSoundsWidget = lazy(() => import('../components/productivity/widgets/AmbientSoundsWidget'));

/**
 * Widget Registry - Central source of truth for all widget definitions
 *
 * Each widget definition includes:
 * - Metadata (name, description, icon, category)
 * - Size constraints (default, min, max)
 * - Default configuration
 * - Lazy-loaded component reference
 */
export const WIDGET_REGISTRY: Record<string, WidgetDefinition> = {
  // ========================================
  // PHASE 1 - Core Widgets
  // ========================================

  'quick-actions': {
    id: 'quick-actions',
    type: 'quick-actions' as WidgetType,
    name: 'Quick Actions',
    description: 'One-click buttons for common admin tasks',
    category: 'business-intelligence' as WidgetCategory,
    icon: 'Zap',
    defaultSize: 'MEDIUM',
    minSize: { w: 2, h: 2 },
    maxSize: { w: 4, h: 3 },
    defaultConfig: {
      actions: ['new-invoice', 'approve-placement', 'view-statements'],
    },
    component: QuickActionsWidget,
  },

  'notes': {
    id: 'notes',
    type: 'notes' as WidgetType,
    name: 'Notes',
    description: 'Quick note-taking scratchpad',
    category: 'productivity' as WidgetCategory,
    icon: 'StickyNote',
    defaultSize: 'MEDIUM',
    minSize: { w: 2, h: 2 },
    maxSize: { w: 4, h: 4 },
    defaultConfig: {},
    component: NotesWidget,
  },

  'daily-goals': {
    id: 'daily-goals',
    type: 'daily-goals' as WidgetType,
    name: 'Daily Goals',
    description: 'Track your daily tasks with progress rings',
    category: 'productivity' as WidgetCategory,
    icon: 'Target',
    defaultSize: 'MEDIUM',
    minSize: { w: 2, h: 2 },
    maxSize: { w: 4, h: 5 },
    defaultConfig: {
      showCompleted: true,
    },
    component: DailyGoalsWidget,
  },

  'pomodoro': {
    id: 'pomodoro',
    type: 'pomodoro' as WidgetType,
    name: 'Pomodoro Timer',
    description: 'Focus timer with session tracking',
    category: 'productivity' as WidgetCategory,
    icon: 'Timer',
    defaultSize: 'MEDIUM',
    minSize: { w: 2, h: 2 },
    maxSize: { w: 3, h: 3 },
    defaultConfig: {
      duration: 25,
      breakDuration: 5,
      longBreakDuration: 15,
      sessionsBeforeLongBreak: 4,
    },
    component: PomodoroWidget,
  },

  // ========================================
  // PHASE 2 - Real-Time Widgets
  // ========================================

  'activity-feed': {
    id: 'activity-feed',
    type: 'activity-feed' as WidgetType,
    name: 'Activity Feed',
    description: 'Live feed of platform activity',
    category: 'business-intelligence' as WidgetCategory,
    icon: 'Activity',
    defaultSize: 'LARGE',
    minSize: { w: 2, h: 3 },
    maxSize: { w: 4, h: 6 },
    defaultConfig: {
      refreshInterval: 30000,
      showCount: 10,
      activityTypes: ['all'],
    },
    component: ActivityFeedWidget,
  },

  'whos-online': {
    id: 'whos-online',
    type: 'whos-online' as WidgetType,
    name: "Who's Online",
    description: 'See who is currently using the platform',
    category: 'business-intelligence' as WidgetCategory,
    icon: 'Users',
    defaultSize: 'MEDIUM',
    minSize: { w: 2, h: 2 },
    maxSize: { w: 3, h: 4 },
    defaultConfig: {
      refreshInterval: 10000,
    },
    component: WhosOnlineWidget,
  },

  'engagement-heatmap': {
    id: 'engagement-heatmap',
    type: 'engagement-heatmap' as WidgetType,
    name: 'Engagement Heatmap',
    description: 'GitHub-style activity calendar showing platform engagement',
    category: 'business-intelligence' as WidgetCategory,
    icon: 'Grid3x3',
    defaultSize: 'WIDE',
    minSize: { w: 3, h: 2 },
    maxSize: { w: 6, h: 3 },
    defaultConfig: {
      weeks: 12,
    },
    component: EngagementHeatmapWidget,
  },

  // ========================================
  // PHASE 3 - Gamification Widgets
  // ========================================

  'leaderboard': {
    id: 'leaderboard',
    type: 'leaderboard' as WidgetType,
    name: 'Tour Miles Leaderboard',
    description: 'Top performers by Tour Miles earned',
    category: 'gamification' as WidgetCategory,
    icon: 'Trophy',
    defaultSize: 'MEDIUM',
    minSize: { w: 2, h: 2 },
    maxSize: { w: 3, h: 5 },
    defaultConfig: {
      showCount: 5,
      timeframe: 'monthly',
    },
    component: LeaderboardWidget,
  },

  'achievements': {
    id: 'achievements',
    type: 'achievements' as WidgetType,
    name: 'Recent Achievements',
    description: 'Latest achievement unlocks across the platform',
    category: 'gamification' as WidgetCategory,
    icon: 'Award',
    defaultSize: 'MEDIUM',
    minSize: { w: 2, h: 2 },
    maxSize: { w: 4, h: 4 },
    defaultConfig: {
      showCount: 5,
    },
    component: AchievementsWidget,
  },

  'referral-scoreboard': {
    id: 'referral-scoreboard',
    type: 'referral-scoreboard' as WidgetType,
    name: 'Referral Scoreboard',
    description: 'Your referral stats and top referrers',
    category: 'gamification' as WidgetCategory,
    icon: 'Share2',
    defaultSize: 'MEDIUM',
    minSize: { w: 2, h: 2 },
    maxSize: { w: 3, h: 4 },
    defaultConfig: {},
    component: ReferralScoreboardWidget,
  },

  // ========================================
  // PHASE 5 - External Integrations
  // ========================================

  'weather': {
    id: 'weather',
    type: 'weather' as WidgetType,
    name: 'Weather',
    description: 'Current weather conditions',
    category: 'time-planning' as WidgetCategory,
    icon: 'Cloud',
    defaultSize: 'SMALL',
    minSize: { w: 2, h: 2 },
    maxSize: { w: 3, h: 3 },
    defaultConfig: {
      location: '',
      units: 'imperial',
    },
    component: WeatherWidget,
  },

  'crypto-tracker': {
    id: 'crypto-tracker',
    type: 'crypto-tracker' as WidgetType,
    name: 'Crypto Tracker',
    description: 'Real-time cryptocurrency prices',
    category: 'external-integrations' as WidgetCategory,
    icon: 'Bitcoin',
    defaultSize: 'MEDIUM',
    minSize: { w: 2, h: 2 },
    maxSize: { w: 3, h: 4 },
    defaultConfig: {
      coins: ['bitcoin', 'ethereum', 'solana', 'cardano'],
      currency: 'usd',
    },
    component: CryptoTrackerWidget,
  },

  'calendar-agenda': {
    id: 'calendar-agenda',
    type: 'calendar-agenda' as WidgetType,
    name: 'Calendar Agenda',
    description: "Today's schedule at a glance",
    category: 'time-planning' as WidgetCategory,
    icon: 'Calendar',
    defaultSize: 'MEDIUM',
    minSize: { w: 2, h: 2 },
    maxSize: { w: 3, h: 5 },
    defaultConfig: {},
    component: CalendarAgendaWidget,
  },

  'spotify-charts': {
    id: 'spotify-charts',
    type: 'spotify-charts' as WidgetType,
    name: 'Spotify Charts',
    description: 'Trending songs on Spotify',
    category: 'music-industry' as WidgetCategory,
    icon: 'Music2',
    defaultSize: 'MEDIUM',
    minSize: { w: 2, h: 2 },
    maxSize: { w: 3, h: 5 },
    defaultConfig: {},
    component: SpotifyChartsWidget,
  },

  // ========================================
  // PHASE 6 - Wellness & Fun
  // ========================================

  'inspirational-quotes': {
    id: 'inspirational-quotes',
    type: 'inspirational-quotes' as WidgetType,
    name: 'Inspirational Quotes',
    description: 'Daily motivation and inspiration',
    category: 'wellness' as WidgetCategory,
    icon: 'Quote',
    defaultSize: 'MEDIUM',
    minSize: { w: 2, h: 2 },
    maxSize: { w: 4, h: 3 },
    defaultConfig: {},
    component: InspirationalQuotesWidget,
  },

  'ambient-sounds': {
    id: 'ambient-sounds',
    type: 'ambient-sounds' as WidgetType,
    name: 'Ambient Sounds',
    description: 'Focus-enhancing background audio',
    category: 'wellness' as WidgetCategory,
    icon: 'Volume2',
    defaultSize: 'MEDIUM',
    minSize: { w: 2, h: 2 },
    maxSize: { w: 4, h: 3 },
    defaultConfig: {
      volume: 0.5,
      activeSounds: [],
    },
    component: AmbientSoundsWidget,
  },
};

/**
 * Get widgets by category
 */
export const getWidgetsByCategory = (category: WidgetCategory): WidgetDefinition[] => {
  return Object.values(WIDGET_REGISTRY).filter(w => w.category === category);
};

/**
 * Get a single widget definition
 */
export const getWidget = (type: string): WidgetDefinition | undefined => {
  return WIDGET_REGISTRY[type];
};

/**
 * Get all available widgets
 */
export const getAllWidgets = (): WidgetDefinition[] => {
  return Object.values(WIDGET_REGISTRY);
};

/**
 * Get all widget categories with their widgets
 */
export const getWidgetCategories = (): { category: WidgetCategory; label: string; widgets: WidgetDefinition[] }[] => {
  const categories: { category: WidgetCategory; label: string }[] = [
    { category: 'business-intelligence', label: 'Business Intelligence' },
    { category: 'productivity', label: 'Productivity' },
    { category: 'gamification', label: 'Gamification' },
    { category: 'time-planning', label: 'Time & Planning' },
    { category: 'wellness', label: 'Wellness & Fun' },
    { category: 'music-industry', label: 'Music Industry' },
    { category: 'external-integrations', label: 'External Integrations' },
  ];

  return categories
    .map(cat => ({
      ...cat,
      widgets: getWidgetsByCategory(cat.category),
    }))
    .filter(cat => cat.widgets.length > 0);
};

/**
 * Convert widget size to grid dimensions
 */
export const sizeToGrid = (size: string): { w: number; h: number } => {
  switch (size) {
    case 'SMALL':
      return { w: 1, h: 1 };
    case 'MEDIUM':
      return { w: 2, h: 2 };
    case 'LARGE':
      return { w: 2, h: 3 };
    case 'WIDE':
      return { w: 3, h: 2 };
    case 'TALL':
      return { w: 2, h: 3 };
    default:
      return { w: 2, h: 2 };
  }
};
