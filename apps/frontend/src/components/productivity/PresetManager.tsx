import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productivityApi } from '../../lib/api';
import { ChevronDown, Save, Trash2, Loader2, Layout } from 'lucide-react';
import type { LayoutItem, DashboardPreset } from '../../types/productivity.types';

interface PresetManagerProps {
  currentLayout: LayoutItem[];
  onLoadPreset: (layout: LayoutItem[]) => void;
}

/**
 * PresetManager - Dropdown for managing layout presets
 *
 * Features:
 * - Save current layout as a new preset
 * - Load existing presets
 * - Delete presets
 * - Shows which preset is currently active
 */
export function PresetManager({ currentLayout, onLoadPreset }: PresetManagerProps) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');

  // Fetch presets
  const { data: presets, isLoading } = useQuery({
    queryKey: ['productivity-presets'],
    queryFn: async () => {
      const response = await productivityApi.getPresets();
      return response.data as DashboardPreset[];
    },
  });

  // Create preset mutation
  const createPresetMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await productivityApi.createPreset(name, currentLayout);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productivity-presets'] });
      setShowSaveDialog(false);
      setNewPresetName('');
    },
  });

  // Load preset mutation
  const loadPresetMutation = useMutation({
    mutationFn: async (presetId: string) => {
      const response = await productivityApi.loadPreset(presetId);
      return response.data as LayoutItem[];
    },
    onSuccess: (layout) => {
      queryClient.invalidateQueries({ queryKey: ['productivity-layout'] });
      queryClient.invalidateQueries({ queryKey: ['productivity-presets'] });
      onLoadPreset(layout);
      setIsOpen(false);
    },
  });

  // Delete preset mutation
  const deletePresetMutation = useMutation({
    mutationFn: async (presetId: string) => {
      await productivityApi.deletePreset(presetId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productivity-presets'] });
    },
  });

  const activePreset = presets?.find(p => p.isActive);

  const handleSavePreset = () => {
    if (newPresetName.trim()) {
      createPresetMutation.mutate(newPresetName.trim());
    }
  };

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg
          bg-white/5 hover:bg-white/10 text-theme-foreground transition-colors"
      >
        <Layout className="w-4 h-4" />
        <span className="truncate max-w-[120px]">
          {activePreset?.name || 'Default Layout'}
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown Content */}
          <div
            className="absolute right-0 mt-2 w-64 bg-theme-card border border-white/10
              rounded-xl shadow-2xl z-50 overflow-hidden"
          >
            {/* Presets List */}
            <div className="p-2 max-h-64 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-theme-primary" />
                </div>
              ) : presets && presets.length > 0 ? (
                <div className="space-y-1">
                  {presets.map(preset => (
                    <div
                      key={preset.id}
                      className={`flex items-center justify-between p-2 rounded-lg transition-colors ${
                        preset.isActive
                          ? 'bg-theme-primary/20'
                          : 'hover:bg-white/5'
                      }`}
                    >
                      <button
                        onClick={() => loadPresetMutation.mutate(preset.id)}
                        disabled={loadPresetMutation.isPending}
                        className="flex-1 text-left text-sm text-theme-foreground"
                      >
                        {preset.name}
                        {preset.isActive && (
                          <span className="ml-2 text-xs text-theme-primary">Active</span>
                        )}
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Delete preset "${preset.name}"?`)) {
                            deletePresetMutation.mutate(preset.id);
                          }
                        }}
                        disabled={deletePresetMutation.isPending}
                        className="p-1 hover:bg-red-500/20 rounded transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-white/40 hover:text-red-400" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-4 text-center text-sm text-theme-foreground-muted">
                  No saved presets yet
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-white/10" />

            {/* Save New Preset */}
            <div className="p-2">
              {showSaveDialog ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Preset name..."
                    value={newPresetName}
                    onChange={(e) => setNewPresetName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSavePreset()}
                    className="w-full px-3 py-2 text-sm bg-white/5 border border-white/10
                      rounded-lg text-theme-foreground placeholder:text-white/40
                      focus:outline-none focus:ring-2 focus:ring-theme-primary/50"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowSaveDialog(false)}
                      className="flex-1 px-3 py-1.5 text-sm bg-white/5 hover:bg-white/10
                        text-theme-foreground rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSavePreset}
                      disabled={!newPresetName.trim() || createPresetMutation.isPending}
                      className="flex-1 px-3 py-1.5 text-sm bg-theme-primary hover:bg-theme-primary/90
                        text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                      {createPresetMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                      ) : (
                        'Save'
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowSaveDialog(true)}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm
                    bg-white/5 hover:bg-white/10 text-theme-foreground rounded-lg transition-colors"
                >
                  <Save className="w-4 h-4" />
                  Save Current as Preset
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
