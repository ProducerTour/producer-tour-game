// Theme definitions for admin dashboard
// Each theme defines CSS variables that control the entire dashboard appearance

export type ThemeId = 'cassette' | 'light';

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
};

export const defaultTheme: ThemeId = 'cassette';

// Get theme by ID with fallback
export function getTheme(id: ThemeId | string): Theme {
  return themes[id as ThemeId] || themes[defaultTheme];
}

// Get all available themes as array
export function getAvailableThemes(): Theme[] {
  return Object.values(themes);
}
