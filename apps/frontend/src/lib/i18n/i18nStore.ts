// i18n Store - internationalization and localization
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Locale = 'en' | 'es' | 'fr' | 'de' | 'ja' | 'zh' | 'ko' | 'pt' | 'ru' | 'it';

export interface TranslationFile {
  locale: Locale;
  namespace: string;
  translations: Record<string, string | Record<string, string>>;
}

interface I18nState {
  // Current state
  locale: Locale;
  fallbackLocale: Locale;

  // Loaded translations
  translations: Map<string, Record<string, string | Record<string, string>>>;
  loadedNamespaces: Set<string>;

  // Loading state
  loading: boolean;

  // Actions
  setLocale: (locale: Locale) => Promise<void>;
  loadNamespace: (namespace: string) => Promise<void>;
  addTranslations: (file: TranslationFile) => void;

  // Translation
  t: (key: string, params?: Record<string, string | number>) => string;
  tc: (key: string, count: number, params?: Record<string, string | number>) => string;

  // Formatting
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatDate: (date: Date | number, options?: Intl.DateTimeFormatOptions) => string;
  formatCurrency: (value: number, currency?: string) => string;
  formatRelativeTime: (value: number, unit: Intl.RelativeTimeFormatUnit) => string;

  // Queries
  getLocale: () => Locale;
  isRTL: () => boolean;
  getAvailableLocales: () => Locale[];

  // Utility
  reset: () => void;
}

const RTL_LOCALES: Locale[] = []; // Add 'ar', 'he' when supported

// Get browser locale
function getBrowserLocale(): Locale {
  const browserLang = navigator.language.split('-')[0] as Locale;
  const supported: Locale[] = ['en', 'es', 'fr', 'de', 'ja', 'zh', 'ko', 'pt', 'ru', 'it'];
  return supported.includes(browserLang) ? browserLang : 'en';
}

export const useI18nStore = create<I18nState>()(
  persist(
    (set, get) => ({
      locale: getBrowserLocale(),
      fallbackLocale: 'en',
      translations: new Map(),
      loadedNamespaces: new Set(),
      loading: false,

      setLocale: async (locale) => {
        set({ locale, loading: true });

        // Reload all namespaces for new locale
        const namespaces = Array.from(get().loadedNamespaces);
        await Promise.all(namespaces.map((ns) => get().loadNamespace(ns)));

        set({ loading: false });
        console.log(`🌍 Locale changed to: ${locale}`);
      },

      loadNamespace: async (namespace) => {
        const { locale, fallbackLocale } = get();

        try {
          // Load locale translations
          const translations = await loadTranslationFile(locale, namespace);

          // Load fallback if different
          let fallbackTranslations = {};
          if (locale !== fallbackLocale) {
            fallbackTranslations = await loadTranslationFile(fallbackLocale, namespace);
          }

          set((s) => {
            const key = `${locale}:${namespace}`;
            const newTranslations = new Map(s.translations);
            newTranslations.set(key, { ...fallbackTranslations, ...translations });

            const newNamespaces = new Set(s.loadedNamespaces);
            newNamespaces.add(namespace);

            return { translations: newTranslations, loadedNamespaces: newNamespaces };
          });
        } catch (error) {
          console.error(`Failed to load translations: ${namespace}`, error);
        }
      },

      addTranslations: (file) => {
        set((s) => {
          const key = `${file.locale}:${file.namespace}`;
          const newTranslations = new Map(s.translations);
          const existing = newTranslations.get(key) || {};
          newTranslations.set(key, { ...existing, ...file.translations });

          return { translations: newTranslations };
        });
      },

      t: (key, params) => {
        const { locale, translations, fallbackLocale } = get();

        // Parse key: namespace.path.to.key or just path.to.key
        const parts = key.split('.');
        const namespace = parts.length > 1 ? parts[0] : 'common';
        const path = parts.length > 1 ? parts.slice(1) : parts;

        // Try current locale
        let value = getNestedValue(translations.get(`${locale}:${namespace}`), path);

        // Try fallback
        if (!value && locale !== fallbackLocale) {
          value = getNestedValue(translations.get(`${fallbackLocale}:${namespace}`), path);
        }

        // Return key if not found
        if (!value || typeof value !== 'string') {
          return key;
        }

        // Interpolate params
        if (params) {
          return interpolate(value, params);
        }

        return value;
      },

      tc: (key, count, params) => {
        const { t } = get();

        // Try plural keys: key_zero, key_one, key_few, key_many, key_other
        const pluralKey = getPluralKey(key, count, get().locale);
        const translation = t(pluralKey, { ...params, count });

        // Fallback to regular key
        if (translation === pluralKey) {
          return t(key, { ...params, count });
        }

        return translation;
      },

      formatNumber: (value, options) => {
        return new Intl.NumberFormat(get().locale, options).format(value);
      },

      formatDate: (date, options) => {
        const d = typeof date === 'number' ? new Date(date) : date;
        return new Intl.DateTimeFormat(get().locale, options).format(d);
      },

      formatCurrency: (value, currency = 'USD') => {
        return new Intl.NumberFormat(get().locale, {
          style: 'currency',
          currency,
        }).format(value);
      },

      formatRelativeTime: (value, unit) => {
        return new Intl.RelativeTimeFormat(get().locale, {
          numeric: 'auto',
        }).format(value, unit);
      },

      getLocale: () => get().locale,

      isRTL: () => RTL_LOCALES.includes(get().locale),

      getAvailableLocales: () => ['en', 'es', 'fr', 'de', 'ja', 'zh', 'ko', 'pt', 'ru', 'it'],

      reset: () => {
        set({
          locale: 'en',
          translations: new Map(),
          loadedNamespaces: new Set(),
        });
      },
    }),
    {
      name: 'i18n-storage',
      partialize: (state) => ({
        locale: state.locale,
      }),
    }
  )
);

// Helper to load translation file
async function loadTranslationFile(
  locale: Locale,
  namespace: string
): Promise<Record<string, string>> {
  try {
    // Would load from /locales/{locale}/{namespace}.json
    // For now, return embedded translations
    return getEmbeddedTranslations(locale, namespace);
  } catch {
    return {};
  }
}

// Get nested value from object using path array
function getNestedValue(
  obj: Record<string, unknown> | undefined,
  path: string[]
): string | undefined {
  if (!obj) return undefined;

  let current: unknown = obj;
  for (const key of path) {
    if (current && typeof current === 'object' && key in current) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }

  return typeof current === 'string' ? current : undefined;
}

// Interpolate params into string
function interpolate(str: string, params: Record<string, string | number>): string {
  return str.replace(/\{\{(\w+)\}\}/g, (_, key) => String(params[key] ?? `{{${key}}}`));
}

// Get plural key based on count
function getPluralKey(key: string, count: number, locale: Locale): string {
  const pluralRules = new Intl.PluralRules(locale);
  const category = pluralRules.select(count);
  return `${key}_${category}`;
}

// Embedded translations (would normally load from files)
function getEmbeddedTranslations(
  locale: Locale,
  namespace: string
): Record<string, string> {
  const translations: Record<Locale, Record<string, Record<string, string>>> = {
    en: {
      common: {
        'menu.play': 'Play',
        'menu.settings': 'Settings',
        'menu.quit': 'Quit',
        'menu.resume': 'Resume',
        'menu.save': 'Save Game',
        'menu.load': 'Load Game',
        'button.confirm': 'Confirm',
        'button.cancel': 'Cancel',
        'button.ok': 'OK',
        'button.back': 'Back',
        'loading.please_wait': 'Please wait...',
        'loading.loading': 'Loading...',
        'error.generic': 'An error occurred',
      },
      ui: {
        'hud.health': 'Health',
        'hud.stamina': 'Stamina',
        'hud.level': 'Level {{level}}',
        'inventory.title': 'Inventory',
        'inventory.empty': 'No items',
        'quest.title': 'Quests',
        'quest.active': 'Active Quests',
        'quest.completed': 'Completed',
        'settings.audio': 'Audio',
        'settings.graphics': 'Graphics',
        'settings.controls': 'Controls',
      },
      game: {
        'notification.quest_started': 'Quest started: {{name}}',
        'notification.quest_completed': 'Quest completed: {{name}}',
        'notification.level_up': 'Level up! You are now level {{level}}',
        'notification.achievement': 'Achievement unlocked: {{name}}',
        'notification.item_received': 'Received: {{item}} x{{count}}',
        'chat.global': 'Global',
        'chat.party': 'Party',
        'chat.whisper': 'Whisper',
      },
    },
    es: {
      common: {
        'menu.play': 'Jugar',
        'menu.settings': 'Configuración',
        'menu.quit': 'Salir',
        'menu.resume': 'Continuar',
        'menu.save': 'Guardar',
        'menu.load': 'Cargar',
        'button.confirm': 'Confirmar',
        'button.cancel': 'Cancelar',
        'button.ok': 'OK',
        'button.back': 'Atrás',
        'loading.please_wait': 'Por favor espera...',
        'loading.loading': 'Cargando...',
        'error.generic': 'Ocurrió un error',
      },
      ui: {
        'hud.health': 'Salud',
        'hud.stamina': 'Resistencia',
        'hud.level': 'Nivel {{level}}',
        'inventory.title': 'Inventario',
        'inventory.empty': 'Sin objetos',
        'quest.title': 'Misiones',
        'quest.active': 'Misiones Activas',
        'quest.completed': 'Completadas',
        'settings.audio': 'Audio',
        'settings.graphics': 'Gráficos',
        'settings.controls': 'Controles',
      },
      game: {
        'notification.quest_started': 'Misión iniciada: {{name}}',
        'notification.quest_completed': 'Misión completada: {{name}}',
        'notification.level_up': '¡Subiste de nivel! Ahora eres nivel {{level}}',
        'notification.achievement': 'Logro desbloqueado: {{name}}',
        'notification.item_received': 'Recibido: {{item}} x{{count}}',
        'chat.global': 'Global',
        'chat.party': 'Grupo',
        'chat.whisper': 'Susurro',
      },
    },
    fr: {
      common: {
        'menu.play': 'Jouer',
        'menu.settings': 'Paramètres',
        'menu.quit': 'Quitter',
        'menu.resume': 'Reprendre',
        'menu.save': 'Sauvegarder',
        'menu.load': 'Charger',
        'button.confirm': 'Confirmer',
        'button.cancel': 'Annuler',
        'button.ok': 'OK',
        'button.back': 'Retour',
        'loading.please_wait': 'Veuillez patienter...',
        'loading.loading': 'Chargement...',
        'error.generic': 'Une erreur est survenue',
      },
      ui: {},
      game: {},
    },
    de: { common: {}, ui: {}, game: {} },
    ja: { common: {}, ui: {}, game: {} },
    zh: { common: {}, ui: {}, game: {} },
    ko: { common: {}, ui: {}, game: {} },
    pt: { common: {}, ui: {}, game: {} },
    ru: { common: {}, ui: {}, game: {} },
    it: { common: {}, ui: {}, game: {} },
  };

  return translations[locale]?.[namespace] || {};
}

// React hook for translation
export function useTranslation(namespace?: string) {
  const { t, tc, locale, loading } = useI18nStore();

  // Namespace-prefixed t function
  const tns = (key: string, params?: Record<string, string | number>) => {
    const fullKey = namespace ? `${namespace}.${key}` : key;
    return t(fullKey, params);
  };

  return { t: tns, tc, locale, loading };
}
