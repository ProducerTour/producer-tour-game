import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Save, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { productivityApi } from '../../lib/api';
import { getWidget } from '../../config/widget-registry';
import type { WidgetConfig } from '../../types/productivity.types';

interface WidgetSettingsModalProps {
  widgetType: string;
  config: WidgetConfig;
  onSave: (config: WidgetConfig) => void;
  onClose: () => void;
}

/**
 * WidgetSettingsModal - Modal for editing widget-specific settings
 *
 * Renders different settings fields based on widget type
 * Saves directly to database for immediate persistence
 */
export function WidgetSettingsModal({
  widgetType,
  config,
  onSave,
  onClose,
}: WidgetSettingsModalProps) {
  const queryClient = useQueryClient();
  const [localConfig, setLocalConfig] = useState<WidgetConfig>(config);
  const widgetDef = getWidget(widgetType);

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  // Save config directly to database
  const saveConfigMutation = useMutation({
    mutationFn: async (newConfig: WidgetConfig) => {
      const response = await productivityApi.updateWidgetConfig(widgetType, newConfig);
      return response.data;
    },
    onSuccess: () => {
      // Update local state via parent callback
      onSave(localConfig);
      // Invalidate layout query to refresh widget configs
      queryClient.invalidateQueries({ queryKey: ['productivity-layout'] });
      toast.success('Widget settings saved');
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to save settings');
    },
  });

  const handleSave = () => {
    saveConfigMutation.mutate(localConfig);
  };

  // Render settings based on widget type
  const renderSettings = () => {
    switch (widgetType) {
      case 'pomodoro':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-theme-foreground mb-1">
                Focus Duration (minutes)
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={(localConfig as { duration?: number }).duration || 25}
                onChange={(e) =>
                  setLocalConfig({ ...localConfig, duration: parseInt(e.target.value) || 25 })
                }
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg
                  text-theme-foreground focus:outline-none focus:ring-2 focus:ring-theme-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-theme-foreground mb-1">
                Break Duration (minutes)
              </label>
              <input
                type="number"
                min="1"
                max="30"
                value={(localConfig as { breakDuration?: number }).breakDuration || 5}
                onChange={(e) =>
                  setLocalConfig({ ...localConfig, breakDuration: parseInt(e.target.value) || 5 })
                }
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg
                  text-theme-foreground focus:outline-none focus:ring-2 focus:ring-theme-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-theme-foreground mb-1">
                Long Break Duration (minutes)
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={(localConfig as { longBreakDuration?: number }).longBreakDuration || 15}
                onChange={(e) =>
                  setLocalConfig({ ...localConfig, longBreakDuration: parseInt(e.target.value) || 15 })
                }
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg
                  text-theme-foreground focus:outline-none focus:ring-2 focus:ring-theme-primary"
              />
            </div>
          </div>
        );

      case 'weather':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-theme-foreground mb-1">
                Location (city name or leave empty for auto-detect)
              </label>
              <input
                type="text"
                placeholder="e.g., Los Angeles"
                value={(localConfig as { location?: string }).location || ''}
                onChange={(e) =>
                  setLocalConfig({ ...localConfig, location: e.target.value })
                }
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg
                  text-theme-foreground placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-theme-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-theme-foreground mb-1">
                Temperature Unit
              </label>
              <select
                value={(localConfig as { units?: string }).units || 'imperial'}
                onChange={(e) =>
                  setLocalConfig({ ...localConfig, units: e.target.value as 'metric' | 'imperial' })
                }
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg
                  text-theme-foreground focus:outline-none focus:ring-2 focus:ring-theme-primary"
              >
                <option value="imperial">Fahrenheit (°F)</option>
                <option value="metric">Celsius (°C)</option>
              </select>
            </div>
          </div>
        );

      case 'crypto-tracker':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-theme-foreground mb-1">
                Cryptocurrencies to Track
              </label>
              <p className="text-xs text-theme-foreground-muted mb-2">
                Enter coin IDs separated by commas (e.g., bitcoin, ethereum, solana)
              </p>
              <input
                type="text"
                placeholder="bitcoin, ethereum, solana"
                value={((localConfig as { coins?: string[] }).coins || ['bitcoin', 'ethereum', 'solana']).join(', ')}
                onChange={(e) =>
                  setLocalConfig({
                    ...localConfig,
                    coins: e.target.value.split(',').map(c => c.trim().toLowerCase()).filter(Boolean)
                  })
                }
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg
                  text-theme-foreground placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-theme-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-theme-foreground mb-1">
                Currency
              </label>
              <select
                value={(localConfig as { currency?: string }).currency || 'usd'}
                onChange={(e) =>
                  setLocalConfig({ ...localConfig, currency: e.target.value })
                }
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg
                  text-theme-foreground focus:outline-none focus:ring-2 focus:ring-theme-primary"
              >
                <option value="usd">USD ($)</option>
                <option value="eur">EUR (€)</option>
                <option value="gbp">GBP (£)</option>
                <option value="jpy">JPY (¥)</option>
              </select>
            </div>
          </div>
        );

      case 'daily-goals':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-theme-foreground">
                Show Completed Goals
              </label>
              <button
                onClick={() =>
                  setLocalConfig({
                    ...localConfig,
                    showCompleted: !(localConfig as { showCompleted?: boolean }).showCompleted
                  })
                }
                className={`w-12 h-6 rounded-full transition-colors ${
                  (localConfig as { showCompleted?: boolean }).showCompleted !== false
                    ? 'bg-theme-primary'
                    : 'bg-white/20'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    (localConfig as { showCompleted?: boolean }).showCompleted !== false
                      ? 'translate-x-6'
                      : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          </div>
        );

      case 'activity-feed':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-theme-foreground mb-1">
                Number of Activities to Show
              </label>
              <input
                type="number"
                min="5"
                max="50"
                value={(localConfig as { showCount?: number }).showCount || 10}
                onChange={(e) =>
                  setLocalConfig({ ...localConfig, showCount: parseInt(e.target.value) || 10 })
                }
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg
                  text-theme-foreground focus:outline-none focus:ring-2 focus:ring-theme-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-theme-foreground mb-1">
                Refresh Interval (seconds)
              </label>
              <input
                type="number"
                min="10"
                max="300"
                value={((localConfig as { refreshInterval?: number }).refreshInterval || 30000) / 1000}
                onChange={(e) =>
                  setLocalConfig({ ...localConfig, refreshInterval: (parseInt(e.target.value) || 30) * 1000 })
                }
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg
                  text-theme-foreground focus:outline-none focus:ring-2 focus:ring-theme-primary"
              />
            </div>
          </div>
        );

      case 'leaderboard':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-theme-foreground mb-1">
                Number of Users to Show
              </label>
              <input
                type="number"
                min="3"
                max="20"
                value={(localConfig as { showCount?: number }).showCount || 5}
                onChange={(e) =>
                  setLocalConfig({ ...localConfig, showCount: parseInt(e.target.value) || 5 })
                }
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg
                  text-theme-foreground focus:outline-none focus:ring-2 focus:ring-theme-primary"
              />
            </div>
          </div>
        );

      default:
        return (
          <div className="text-center py-4 text-theme-foreground-muted">
            <p>No configurable settings for this widget.</p>
            <p className="text-xs mt-2">This widget uses default settings.</p>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div
        className="bg-theme-card border border-white/10 rounded-xl w-full max-w-md
          shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/5">
          <div>
            <h3 className="text-lg font-semibold text-theme-foreground">
              {widgetDef?.name || 'Widget'} Settings
            </h3>
            <p className="text-xs text-theme-foreground-muted">
              {widgetDef?.description}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-theme-foreground-muted" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {renderSettings()}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-white/10 bg-white/5">
          <button
            onClick={onClose}
            disabled={saveConfigMutation.isPending}
            className="px-4 py-2 text-sm rounded-lg bg-white/5 hover:bg-white/10
              text-theme-foreground transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saveConfigMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg
              bg-theme-primary hover:bg-theme-primary/90 text-white transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saveConfigMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saveConfigMutation.isPending ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
