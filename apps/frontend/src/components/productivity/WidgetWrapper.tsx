import React, { Suspense } from 'react';
import { Settings, X, GripVertical, Loader2 } from 'lucide-react';
import { getWidget } from '../../config/widget-registry';
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
  const widgetDef = getWidget(widgetType);
  const WidgetComponent = widgetDef?.component;

  if (!widgetDef || !WidgetComponent) {
    return (
      <div className="h-full bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-center text-red-400">
        Unknown widget: {widgetType}
      </div>
    );
  }

  // Dynamically import Lucide icon
  const IconComponent = React.useMemo(() => {
    // Common icons used in widgets
    const iconMap: Record<string, React.ReactNode> = {
      Zap: <span className="text-yellow-400">⚡</span>,
      StickyNote: <span className="text-blue-400">📝</span>,
      Target: <span className="text-green-400">🎯</span>,
      Timer: <span className="text-purple-400">⏱️</span>,
      Activity: <span className="text-orange-400">📊</span>,
      Users: <span className="text-cyan-400">👥</span>,
    };
    return iconMap[widgetDef.icon] || <span>📦</span>;
  }, [widgetDef.icon]);

  return (
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
          <span className="flex-shrink-0">{IconComponent}</span>
          <span className="text-sm font-medium text-theme-foreground truncate">
            {widgetDef.name}
          </span>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Settings Button - always visible */}
          <button
            onClick={() => {
              // TODO: Open settings modal
              console.log('Open settings for', widgetType);
            }}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
            title="Widget Settings"
          >
            <Settings className="w-3.5 h-3.5 text-white/60 hover:text-white" />
          </button>

          {/* Remove Button - only in edit mode */}
          {isEditMode && (
            <button
              onClick={onRemove}
              className="p-1.5 hover:bg-red-500/20 rounded-lg transition-colors group"
              title="Remove Widget"
            >
              <X className="w-3.5 h-3.5 text-white/60 group-hover:text-red-400" />
            </button>
          )}
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
  );
}
