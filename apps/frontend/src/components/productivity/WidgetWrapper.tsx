import { Suspense, useMemo, useState } from 'react';
import { Settings, X, GripVertical, Loader2 } from 'lucide-react';
import { getWidget } from '../../config/widget-registry';
import { WidgetSettingsModal } from './WidgetSettingsModal';
import type { WidgetConfig, WidgetSize } from '../../types/productivity.types';

interface WidgetWrapperProps {
  widgetId: string;
  widgetType: string;
  config: WidgetConfig;
  isEditMode: boolean;
  onRemove: () => void;
  onConfigChange: (config: WidgetConfig) => void;
}

/**
 * WidgetWrapper - Common container for all widgets
 *
 * Provides:
 * - Consistent header with title and actions
 * - Drag handle for repositioning (edit mode)
 * - Settings and remove buttons
 * - Loading states via Suspense
 * - Glass-morphism styling consistent with the app theme
 */
export function WidgetWrapper({
  widgetId,
  widgetType,
  config,
  isEditMode,
  onRemove,
  onConfigChange,
}: WidgetWrapperProps) {
  const [showSettings, setShowSettings] = useState(false);
  const widgetDef = getWidget(widgetType);
  const WidgetComponent = widgetDef?.component;

  // Dynamically get icon based on widget type
  const IconComponent = useMemo(() => {
    const iconMap: Record<string, string> = {
      Zap: '⚡',
      StickyNote: '📝',
      Target: '🎯',
      Timer: '⏱️',
      Activity: '📊',
      Users: '👥',
      Trophy: '🏆',
      Award: '🏅',
      Share2: '🔗',
      Grid3x3: '📈',
      Cloud: '☁️',
      Bitcoin: '₿',
      Calendar: '📅',
      Music2: '🎵',
      Quote: '💬',
      Volume2: '🔊',
    };
    return iconMap[widgetDef?.icon || ''] || '📦';
  }, [widgetDef?.icon]);

  if (!widgetDef || !WidgetComponent) {
    return (
      <div className="h-full bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-center text-red-400">
        Unknown widget: {widgetType}
      </div>
    );
  }

  const handleSettingsSave = (newConfig: WidgetConfig) => {
    onConfigChange(newConfig);
  };

  return (
    <>
      <div
        className="h-full bg-gradient-to-b from-white/[0.08] to-white/[0.02]
          border border-white/[0.08] rounded-xl overflow-hidden flex flex-col
          shadow-lg backdrop-blur-sm"
      >
        {/* Widget Header */}
        <div
          className={`flex items-center justify-between px-3 py-2 border-b border-white/[0.08]
            bg-white/[0.02] ${isEditMode ? 'widget-drag-handle cursor-grab active:cursor-grabbing' : ''}`}
        >
          <div className="flex items-center gap-2 min-w-0">
            {isEditMode && (
              <GripVertical className="w-4 h-4 text-white/40 flex-shrink-0" />
            )}
            <span className="flex-shrink-0 text-base">{IconComponent}</span>
            <span className="text-sm font-medium text-theme-foreground truncate">
              {widgetDef.name}
            </span>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Settings Button - always visible */}
            <button
              onClick={() => setShowSettings(true)}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors group"
              title="Widget Settings"
            >
              <Settings className="w-3.5 h-3.5 text-white/60 group-hover:text-white transition-colors" />
            </button>

            {/* Remove Button - always visible but styled differently in edit mode */}
            <button
              onClick={onRemove}
              className={`p-1.5 rounded-lg transition-colors group ${
                isEditMode
                  ? 'hover:bg-red-500/30 bg-red-500/10'
                  : 'hover:bg-red-500/20'
              }`}
              title="Remove Widget"
            >
              <X className={`w-3.5 h-3.5 transition-colors ${
                isEditMode
                  ? 'text-red-400 group-hover:text-red-300'
                  : 'text-white/60 group-hover:text-red-400'
              }`} />
            </button>
          </div>
        </div>

        {/* Widget Content */}
        <div className="flex-1 overflow-auto">
          <Suspense
            fallback={
              <div className="h-full flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-theme-primary" />
              </div>
            }
          >
            <WidgetComponent
              id={widgetId}
              config={config}
              size={widgetDef.defaultSize as WidgetSize}
              onConfigChange={onConfigChange}
              isEditing={isEditMode}
            />
          </Suspense>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <WidgetSettingsModal
          widgetType={widgetType}
          config={config}
          onSave={handleSettingsSave}
          onClose={() => setShowSettings(false)}
        />
      )}
    </>
  );
}
