import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { Theme, ThemeId, themes, defaultTheme, getTheme } from '@/config/themes';

const THEME_STORAGE_KEY = 'producer-tour-admin-theme';

interface ThemeContextValue {
  theme: Theme;
  themeId: ThemeId;
  setTheme: (id: ThemeId) => void;
  availableThemes: Theme[];
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

// Inject CSS variables into the document
function injectThemeVariables(theme: Theme) {
  const root = document.documentElement;
  const { colors } = theme;

  // Primary colors
  root.style.setProperty('--theme-primary', colors.primary);
  root.style.setProperty('--theme-primary-hover', colors.primaryHover);
  root.style.setProperty('--theme-primary-foreground', colors.primaryForeground);
  root.style.setProperty('--theme-primary-glow', colors.primaryGlow);

  // Background colors
  root.style.setProperty('--theme-background', colors.background);
  root.style.setProperty('--theme-background-alt', colors.backgroundAlt);
  root.style.setProperty('--theme-card', colors.card);
  root.style.setProperty('--theme-card-hover', colors.cardHover);

  // Text colors
  root.style.setProperty('--theme-foreground', colors.foreground);
  root.style.setProperty('--theme-foreground-secondary', colors.foregroundSecondary);
  root.style.setProperty('--theme-foreground-muted', colors.foregroundMuted);

  // Borders
  root.style.setProperty('--theme-border', colors.border);
  root.style.setProperty('--theme-border-hover', colors.borderHover);
  root.style.setProperty('--theme-border-strong', colors.borderStrong);

  // UI Elements
  root.style.setProperty('--theme-input', colors.input);
  root.style.setProperty('--theme-input-focus', colors.inputFocus);

  // Status colors
  root.style.setProperty('--theme-success', colors.success);
  root.style.setProperty('--theme-success-bg', colors.successBackground);
  root.style.setProperty('--theme-error', colors.error);
  root.style.setProperty('--theme-error-bg', colors.errorBackground);
  root.style.setProperty('--theme-warning', colors.warning);
  root.style.setProperty('--theme-warning-bg', colors.warningBackground);
  root.style.setProperty('--theme-info', colors.info);
  root.style.setProperty('--theme-info-bg', colors.infoBackground);

  // Scrollbar
  root.style.setProperty('--theme-scrollbar-track', colors.scrollbarTrack);
  root.style.setProperty('--theme-scrollbar-thumb', colors.scrollbarThumb);
  root.style.setProperty('--theme-scrollbar-thumb-hover', colors.scrollbarThumbHover);

  // Add theme class to body for CSS selectors
  document.body.classList.remove('theme-cassette', 'theme-light', 'theme-default');
  document.body.classList.add(`theme-${theme.id}`);
}

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [themeId, setThemeId] = useState<ThemeId>(() => {
    // Get saved theme from localStorage or use default
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved && saved in themes) {
        return saved as ThemeId;
      }
    }
    return defaultTheme;
  });

  const theme = getTheme(themeId);

  // Apply theme variables on mount and when theme changes
  useEffect(() => {
    injectThemeVariables(theme);
  }, [theme]);

  const setTheme = useCallback((id: ThemeId) => {
    setThemeId(id);
    localStorage.setItem(THEME_STORAGE_KEY, id);
  }, []);

  const value: ThemeContextValue = {
    theme,
    themeId,
    setTheme,
    availableThemes: Object.values(themes),
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

// Hook to use theme context
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Optional hook that returns null if no provider (for components that may be outside provider)
export function useThemeOptional() {
  return useContext(ThemeContext);
}
