import { useState, useCallback, Suspense, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import GridLayout, { Layout } from 'react-grid-layout';
import { productivityApi } from '../../lib/api';
import { getWidget, sizeToGrid } from '../../config/widget-registry';
import { WidgetWrapper } from './WidgetWrapper';
import { WidgetPicker } from './WidgetPicker';
import { PresetManager } from './PresetManager';
import type { LayoutItem, WidgetConfig } from '../../types/productivity.types';
import { Settings, Plus, Save, RotateCcw, Loader2 } from 'lucide-react';

import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

/**
 * ProductivityDashboard - Main container for the admin productivity widget dashboard
 *
 * Features:
 * - Drag-and-drop widget positioning via react-grid-layout
 * - Resizable widgets with constraints
 * - Persistent layout saved to database
 * - Edit mode toggle for customization
 * - Widget picker to add new widgets
 * - Preset management for saving/loading layouts
 */
export default function ProductivityDashboard() {
  const queryClient = useQueryClient();
  const [isEditMode, setIsEditMode] = useState(false);
  const [showWidgetPicker, setShowWidgetPicker] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [localLayout, setLocalLayout] = useState<LayoutItem[]>([]);

  // Fetch user's dashboard layout
  const { data: layout, isLoading: layoutLoading } = useQuery({
    queryKey: ['productivity-layout'],
    queryFn: async () => {
      const response = await productivityApi.getLayout();
      return response.data as LayoutItem[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Sync local layout with server layout
  useEffect(() => {
    if (layout) {
      setLocalLayout(layout);
    }
  }, [layout]);

  // Save layout mutation
  const saveLayoutMutation = useMutation({
    mutationFn: async (widgets: LayoutItem[]) => {
      const response = await productivityApi.saveLayout(widgets);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productivity-layout'] });
      setHasUnsavedChanges(false);
    },
  });

  // Handle layout changes from react-grid-layout
  const handleLayoutChange = useCallback((newLayout: Layout[]) => {
    if (!isEditMode) return;

    const updatedLayout = localLayout.map(item => {
      const gridItem = newLayout.find(l => l.i === item.i);
      if (gridItem) {
        return {
          ...item,
          x: gridItem.x,
          y: gridItem.y,
          w: gridItem.w,
          h: gridItem.h,
        };
      }
      return item;
    });

    setLocalLayout(updatedLayout);
    setHasUnsavedChanges(true);
  }, [isEditMode, localLayout]);

  // Handle adding a new widget
  const handleAddWidget = useCallback((widgetType: string) => {
    const widgetDef = getWidget(widgetType);
    if (!widgetDef) return;

    const size = sizeToGrid(widgetDef.defaultSize);

    // Find empty position
    const newWidget: LayoutItem = {
      i: `${widgetType}-${Date.now()}`,
      x: 0,
      y: Infinity, // Will be placed at bottom
      w: size.w,
      h: size.h,
      widgetType,
      config: widgetDef.defaultConfig,
    };

    setLocalLayout(prev => [...prev, newWidget]);
    setHasUnsavedChanges(true);
    setShowWidgetPicker(false);
  }, []);

  // Handle removing a widget
  const handleRemoveWidget = useCallback((widgetId: string) => {
    setLocalLayout(prev => prev.filter(item => item.i !== widgetId));
    setHasUnsavedChanges(true);
  }, []);

  // Handle widget config change
  const handleConfigChange = useCallback((widgetId: string, config: WidgetConfig) => {
    setLocalLayout(prev =>
      prev.map(item =>
        item.i === widgetId ? { ...item, config: { ...item.config, ...config } } : item
      )
    );
    setHasUnsavedChanges(true);
  }, []);

  // Save layout
  const handleSave = useCallback(() => {
    saveLayoutMutation.mutate(localLayout);
  }, [localLayout, saveLayoutMutation]);

  // Reset to saved layout
  const handleReset = useCallback(() => {
    if (layout) {
      setLocalLayout(layout);
      setHasUnsavedChanges(false);
    }
  }, [layout]);

  // Convert layout items to react-grid-layout format
  const gridLayout: Layout[] = localLayout.map(item => {
    const widgetDef = getWidget(item.widgetType);
    return {
      i: item.i,
      x: item.x,
      y: item.y,
      w: item.w,
      h: item.h,
      minW: widgetDef?.minSize.w || 1,
      minH: widgetDef?.minSize.h || 1,
      maxW: widgetDef?.maxSize.w || 6,
      maxH: widgetDef?.maxSize.h || 6,
    };
  });

  if (layoutLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-theme-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-theme-foreground">Productivity Hub</h2>
          <p className="text-sm text-theme-foreground-muted">
            Customize your dashboard with widgets
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Preset Manager */}
          <PresetManager currentLayout={localLayout} onLoadPreset={setLocalLayout} />

          {/* Edit Mode Actions */}
          {isEditMode && (
            <>
              {hasUnsavedChanges && (
                <button
                  onClick={handleReset}
                  className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg
                    bg-white/5 hover:bg-white/10 text-theme-foreground-muted
                    transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset
                </button>
              )}

              <button
                onClick={handleSave}
                disabled={!hasUnsavedChanges || saveLayoutMutation.isPending}
                className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg
                  bg-theme-primary hover:bg-theme-primary/90 text-white
                  disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saveLayoutMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save Layout
              </button>

              <button
                onClick={() => setShowWidgetPicker(true)}
                className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg
                  bg-green-600 hover:bg-green-700 text-white transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Widget
              </button>
            </>
          )}

          {/* Edit Mode Toggle */}
          <button
            onClick={() => setIsEditMode(!isEditMode)}
            className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-colors ${
              isEditMode
                ? 'bg-theme-primary text-white'
                : 'bg-white/5 hover:bg-white/10 text-theme-foreground'
            }`}
          >
            <Settings className="w-4 h-4" />
            {isEditMode ? 'Done Editing' : 'Customize'}
          </button>
        </div>
      </div>

      {/* Edit Mode Banner */}
      {isEditMode && (
        <div className="bg-theme-primary/10 border border-theme-primary/20 rounded-lg p-3 text-sm text-theme-foreground">
          <strong>Edit Mode:</strong> Drag widgets to reposition, resize from corners, or click the X to remove.
          {hasUnsavedChanges && (
            <span className="ml-2 text-yellow-400">• Unsaved changes</span>
          )}
        </div>
      )}

      {/* Widget Grid */}
      {localLayout.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-white/10 rounded-xl">
          <p className="text-theme-foreground-muted mb-4">No widgets added yet</p>
          <button
            onClick={() => {
              setIsEditMode(true);
              setShowWidgetPicker(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-theme-primary hover:bg-theme-primary/90
              text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Your First Widget
          </button>
        </div>
      ) : (
        <GridLayout
          className="layout"
          layout={gridLayout}
          cols={12}
          rowHeight={80}
          width={1200}
          isDraggable={isEditMode}
          isResizable={isEditMode}
          onLayoutChange={handleLayoutChange}
          draggableHandle=".widget-drag-handle"
          margin={[16, 16]}
          containerPadding={[0, 0]}
          useCSSTransforms={true}
        >
          {localLayout.map((item) => (
            <div key={item.i}>
              <Suspense
                fallback={
                  <div className="h-full bg-theme-card border border-theme-border rounded-xl flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-theme-primary" />
                  </div>
                }
              >
                <WidgetWrapper
                  widgetId={item.i}
                  widgetType={item.widgetType}
                  config={item.config || {}}
                  isEditMode={isEditMode}
                  onRemove={() => handleRemoveWidget(item.i)}
                  onConfigChange={(config) => handleConfigChange(item.i, config)}
                />
              </Suspense>
            </div>
          ))}
        </GridLayout>
      )}

      {/* Widget Picker Modal */}
      {showWidgetPicker && (
        <WidgetPicker
          onAdd={handleAddWidget}
          onClose={() => setShowWidgetPicker(false)}
          currentWidgets={localLayout.map(w => w.widgetType)}
        />
      )}
    </div>
  );
}
