import { ComponentType, LazyExoticComponent } from 'react';

// ========================================
// WIDGET TYPES
// ========================================

export type WidgetSize = 'SMALL' | 'MEDIUM' | 'LARGE' | 'WIDE' | 'TALL';

export type WidgetCategory =
  | 'business-intelligence'
  | 'music-industry'
  | 'productivity'
  | 'time-planning'
  | 'gamification'
  | 'wellness'
  | 'external-integrations';

export type WidgetType =
  | 'quick-actions'
  | 'activity-feed'
  | 'whos-online'
  | 'spotify-charts'
  | 'pomodoro'
  | 'daily-goals'
  | 'notes'
  | 'meeting-scheduler'
  | 'calendar-agenda'
  | 'weather'
  | 'leaderboard'
  | 'achievements'
  | 'referral-scoreboard'
  | 'engagement-heatmap'
  | 'inspirational-quotes'
  | 'ambient-sounds'
  | 'crypto-tracker'
  | 'social-stats'
  | 'email-preview';

// ========================================
// LAYOUT TYPES
// ========================================

export interface LayoutItem {
  i: string;          // Widget instance ID
  x: number;          // X position in grid
  y: number;          // Y position in grid
  w: number;          // Width in grid units
  h: number;          // Height in grid units
  widgetType: string; // Widget type identifier
  config?: WidgetConfig;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
}

export interface WidgetConfig {
  refreshInterval?: number;
  [key: string]: unknown;
}

// ========================================
// WIDGET DEFINITION
// ========================================

export interface WidgetProps {
  id: string;
  config: WidgetConfig;
  size: WidgetSize;
  onConfigChange: (config: WidgetConfig) => void;
  isEditing: boolean;
}

export interface WidgetDefinition {
  id: string;
  type: WidgetType;
  name: string;
  description: string;
  category: WidgetCategory;
  icon: string;
  defaultSize: WidgetSize;
  minSize: { w: number; h: number };
  maxSize: { w: number; h: number };
  defaultConfig: WidgetConfig;
  component: LazyExoticComponent<ComponentType<WidgetProps>> | ComponentType<WidgetProps>;
}

// ========================================
// PRESET TYPES
// ========================================

export interface DashboardPreset {
  id: string;
  userId: string;
  name: string;
  isActive: boolean;
  isDefault: boolean;
  columns: number;
  rowHeight: number;
  layout: LayoutItem[];
  createdAt: string;
  updatedAt: string;
}

// ========================================
// DAILY GOAL TYPES
// ========================================

export interface DailyGoal {
  id: string;
  userId: string;
  date: string;
  title: string;
  isCompleted: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface GoalStats {
  totalGoals: number;
  completedGoals: number;
  completionRate: number;
  streak: number;
}

// ========================================
// POMODORO TYPES
// ========================================

export interface PomodoroSession {
  id: string;
  userId: string;
  startedAt: string;
  completedAt?: string;
  duration: number;
  isBreak: boolean;
  wasCompleted: boolean;
  label?: string;
  createdAt: string;
}

export interface PomodoroStats {
  totalSessions: number;
  totalMinutes: number;
  totalHours: number;
  averagePerDay: number;
  dailyStats: Record<string, { completed: number; minutes: number }>;
  recentSessions: PomodoroSession[];
}

// ========================================
// ACTIVITY TYPES
// ========================================

export type ActivityType =
  | 'USER_SIGNUP'
  | 'USER_LOGIN'
  | 'PLACEMENT_CREATED'
  | 'PLACEMENT_APPROVED'
  | 'PLACEMENT_DENIED'
  | 'STATEMENT_UPLOADED'
  | 'STATEMENT_PROCESSED'
  | 'PAYMENT_SENT'
  | 'PAYOUT_REQUESTED'
  | 'PAYOUT_COMPLETED'
  | 'INVOICE_SUBMITTED'
  | 'INVOICE_APPROVED'
  | 'ACHIEVEMENT_UNLOCKED'
  | 'TIER_UP';

export interface PlatformActivity {
  id: string;
  activityType: ActivityType | string;
  actorId?: string;
  actorName?: string;
  targetType?: string;
  targetId?: string;
  targetName?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

// ========================================
// ONLINE USERS TYPES
// ========================================

export interface OnlineUser {
  id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  role: string;
  profilePhotoUrl?: string;
  connectedAt?: string;
}

export interface OnlineUsersResponse {
  count: number;
  users: OnlineUser[];
}

// ========================================
// ADMIN NOTE TYPES
// ========================================

export interface AdminNote {
  content: string;
  updatedAt: string;
}

// ========================================
// WIDGET CONFIG TYPES (Per Widget)
// ========================================

export interface QuickActionsConfig extends WidgetConfig {
  actions?: string[];
}

export interface ActivityFeedConfig extends WidgetConfig {
  showCount?: number;
  activityTypes?: string[];
}

export interface PomodoroConfig extends WidgetConfig {
  duration?: number;
  breakDuration?: number;
  longBreakDuration?: number;
  sessionsBeforeLongBreak?: number;
}

export interface DailyGoalsConfig extends WidgetConfig {
  showCompleted?: boolean;
}

export interface WeatherConfig extends WidgetConfig {
  location?: string;
  units?: 'metric' | 'imperial';
}

export interface CryptoConfig extends WidgetConfig {
  coins?: string[];
  currency?: string;
}

export interface AmbientSoundConfig extends WidgetConfig {
  volume?: number;
  activeSounds?: string[];
}
