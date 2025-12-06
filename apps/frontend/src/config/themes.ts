// Theme definitions for admin dashboard
// Each theme defines CSS variables that control the entire dashboard appearance

export type ThemeId = 'cassette' | 'light' | 'default';

export interface Theme {
  id: ThemeId;
  name: string;
  description: string;
  preview: {
    primary: string;
    background: string;
    card: string;
  };
  colors: {
    // Primary accent color
    primary: string;
    primaryHover: string;
    primaryForeground: string;
    primaryGlow: string;

    // Backgrounds
    background: string;
    backgroundAlt: string;
    card: string;
    cardHover: string;

    // Text colors
    foreground: string;
    foregroundSecondary: string;
    foregroundMuted: string;

    // Borders
    border: string;
    borderHover: string;
    borderStrong: string;

    // UI Elements
    input: string;
    inputFocus: string;

    // Status colors (consistent across themes)
    success: string;
    successBackground: string;
    error: string;
    errorBackground: string;
    warning: string;
    warningBackground: string;
    info: string;
    infoBackground: string;

    // Scrollbar
    scrollbarTrack: string;
    scrollbarThumb: string;
    scrollbarThumbHover: string;
  };
}

export const themes: Record<ThemeId, Theme> = {
  cassette: {
    id: 'cassette',
    name: 'Cassette',
    description: 'Dark theme with yellow accents and sharp edges',
    preview: {
      primary: '#f0e226',
      background: '#000000',
      card: '#19181a',
    },
    colors: {
      // Primary accent - cassette yellow
      primary: '#f0e226',
      primaryHover: '#d9cc22',
      primaryForeground: '#000000',
      primaryGlow: 'rgba(240, 226, 38, 0.3)',

      // Backgrounds
      background: '#000000',
      backgroundAlt: '#0a0a0a',
      card: '#19181a',
      cardHover: '#1f1e20',

      // Text colors
      foreground: '#ffffff',
      foregroundSecondary: 'rgba(255, 255, 255, 0.7)',
      foregroundMuted: 'rgba(255, 255, 255, 0.4)',

      // Borders
      border: 'rgba(255, 255, 255, 0.05)',
      borderHover: 'rgba(240, 226, 38, 0.2)',
      borderStrong: 'rgba(255, 255, 255, 0.1)',

      // UI Elements
      input: '#000000',
      inputFocus: 'rgba(240, 226, 38, 0.5)',

      // Status colors
      success: '#22c55e',
      successBackground: 'rgba(34, 197, 94, 0.1)',
      error: '#ef4444',
      errorBackground: 'rgba(239, 68, 68, 0.1)',
      warning: '#f59e0b',
      warningBackground: 'rgba(245, 158, 11, 0.1)',
      info: '#3b82f6',
      infoBackground: 'rgba(59, 130, 246, 0.1)',

      // Scrollbar
      scrollbarTrack: '#000000',
      scrollbarThumb: '#19181a',
      scrollbarThumbHover: '#f0e226',
    },
  },

  light: {
    id: 'light',
    name: 'Light',
    description: 'Clean light theme with blue accents',
    preview: {
      primary: '#2563eb',
      background: '#f8fafc',
      card: '#ffffff',
    },
    colors: {
      // Primary accent - professional blue
      primary: '#2563eb',
      primaryHover: '#1d4ed8',
      primaryForeground: '#ffffff',
      primaryGlow: 'rgba(37, 99, 235, 0.2)',

      // Backgrounds
      background: '#f8fafc',
      backgroundAlt: '#f1f5f9',
      card: '#ffffff',
      cardHover: '#f8fafc',

      // Text colors
      foreground: '#0f172a',
      foregroundSecondary: '#475569',
      foregroundMuted: '#94a3b8',

      // Borders
      border: '#e2e8f0',
      borderHover: '#2563eb',
      borderStrong: '#cbd5e1',

      // UI Elements
      input: '#ffffff',
      inputFocus: '#2563eb',

      // Status colors
      success: '#16a34a',
      successBackground: '#dcfce7',
      error: '#dc2626',
      errorBackground: '#fee2e2',
      warning: '#d97706',
      warningBackground: '#fef3c7',
      info: '#2563eb',
      infoBackground: '#dbeafe',

      // Scrollbar
      scrollbarTrack: '#f1f5f9',
      scrollbarThumb: '#cbd5e1',
      scrollbarThumbHover: '#94a3b8',
    },
  },

  default: {
    id: 'default',
    name: 'Default',
    description: 'Clean light theme with blue accents (inspired by fintech dashboards)',
    preview: {
      primary: '#3B82F6',
      background: '#F8FAFC',
      card: '#FFFFFF',
    },
    colors: {
      // Primary accent - professional blue
      primary: '#3B82F6',
      primaryHover: '#2563EB',
      primaryForeground: '#FFFFFF',
      primaryGlow: 'rgba(59, 130, 246, 0.2)',

      // Backgrounds - clean light grays
      background: '#F8FAFC',
      backgroundAlt: '#F1F5F9',
      card: '#FFFFFF',
      cardHover: '#F8FAFC',

      // Text colors - gray hierarchy
      foreground: '#1F2937',
      foregroundSecondary: '#4B5563',
      foregroundMuted: '#9CA3AF',

      // Borders - subtle
      border: '#E5E7EB',
      borderHover: '#3B82F6',
      borderStrong: '#D1D5DB',

      // UI Elements
      input: '#FFFFFF',
      inputFocus: '#3B82F6',

      // Status colors
      success: '#22C55E',
      successBackground: '#DCFCE7',
      error: '#EF4444',
      errorBackground: '#FEE2E2',
      warning: '#F97316',
      warningBackground: '#FEF3C7',
      info: '#3B82F6',
      infoBackground: '#DBEAFE',

      // Scrollbar
      scrollbarTrack: '#F1F5F9',
      scrollbarThumb: '#D1D5DB',
      scrollbarThumbHover: '#9CA3AF',
    },
  },
};

export const defaultTheme: ThemeId = 'default';

// Get theme by ID with fallback
export function getTheme(id: ThemeId | string): Theme {
  return themes[id as ThemeId] || themes[defaultTheme];
}

// Get all available themes as array
export function getAvailableThemes(): Theme[] {
  return Object.values(themes);
}
