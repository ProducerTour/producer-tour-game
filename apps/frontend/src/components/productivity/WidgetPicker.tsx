import { useState } from 'react';
import { X, Check, Search } from 'lucide-react';
import { getWidgetCategories, getAllWidgets } from '../../config/widget-registry';
import type { WidgetDefinition } from '../../types/productivity.types';

interface WidgetPickerProps {
  onAdd: (widgetType: string) => void;
  onClose: () => void;
  currentWidgets: string[];
}

/**
 * WidgetPicker - Modal for selecting widgets to add to the dashboard
 *
 * Features:
 * - Search filtering
 * - Category grouping
 * - Shows which widgets are already added
 * - Preview of widget capabilities
 */
export function WidgetPicker({ onAdd, onClose, currentWidgets }: WidgetPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = getWidgetCategories();
  const allWidgets = getAllWidgets();

  // Filter widgets based on search
  const filteredWidgets = allWidgets.filter(widget => {
    const matchesSearch =
      searchQuery === '' ||
      widget.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      widget.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === null || widget.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  // Group by category for display
  const groupedWidgets = categories
    .map(cat => ({
      ...cat,
      widgets: filteredWidgets.filter(w => w.category === cat.category),
    }))
    .filter(cat => cat.widgets.length > 0);

  // Icon mapping
  const getIcon = (iconName: string) => {
    const iconMap: Record<string, string> = {
      Zap: '⚡',
      StickyNote: '📝',
      Target: '🎯',
      Timer: '⏱️',
      Activity: '📊',
      Users: '👥',
      Calendar: '📅',
      Cloud: '☁️',
      TrendingUp: '📈',
      Music: '🎵',
      Coffee: '☕',
      Quote: '💬',
      Mail: '📧',
    };
    return iconMap[iconName] || '📦';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div
        className="bg-theme-card border border-white/10 rounded-2xl shadow-2xl
          w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div>
            <h2 className="text-xl font-bold text-theme-foreground">Add Widget</h2>
            <p className="text-sm text-theme-foreground-muted">
              Choose widgets to add to your productivity dashboard
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white/60" />
          </button>
        </div>

        {/* Search & Filters */}
        <div className="px-6 py-4 border-b border-white/10 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              placeholder="Search widgets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10
                rounded-lg text-theme-foreground placeholder:text-white/40
                focus:outline-none focus:ring-2 focus:ring-theme-primary/50"
            />
          </div>

          {/* Category Filters */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-3 py-1 text-sm rounded-full transition-colors ${
                selectedCategory === null
                  ? 'bg-theme-primary text-white'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              All
            </button>
            {categories.map(cat => (
              <button
                key={cat.category}
                onClick={() => setSelectedCategory(cat.category)}
                className={`px-3 py-1 text-sm rounded-full transition-colors ${
                  selectedCategory === cat.category
                    ? 'bg-theme-primary text-white'
                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Widget List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {groupedWidgets.length === 0 ? (
            <div className="text-center py-8 text-theme-foreground-muted">
              No widgets found matching your search.
            </div>
          ) : (
            groupedWidgets.map(category => (
              <div key={category.category}>
                <h3 className="text-sm font-semibold text-theme-foreground-muted uppercase tracking-wide mb-3">
                  {category.label}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {category.widgets.map(widget => {
                    const isAdded = currentWidgets.includes(widget.type);

                    return (
                      <WidgetCard
                        key={widget.id}
                        widget={widget}
                        icon={getIcon(widget.icon)}
                        isAdded={isAdded}
                        onAdd={() => onAdd(widget.type)}
                      />
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

interface WidgetCardProps {
  widget: WidgetDefinition;
  icon: string;
  isAdded: boolean;
  onAdd: () => void;
}

function WidgetCard({ widget, icon, isAdded, onAdd }: WidgetCardProps) {
  return (
    <div
      className={`p-4 rounded-xl border transition-all ${
        isAdded
          ? 'bg-green-500/10 border-green-500/30'
          : 'bg-white/5 border-white/10 hover:border-theme-primary/50 hover:bg-white/10'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="text-2xl flex-shrink-0">{icon}</div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-theme-foreground">{widget.name}</h4>
          <p className="text-sm text-theme-foreground-muted line-clamp-2">
            {widget.description}
          </p>
        </div>

        {/* Action */}
        <div className="flex-shrink-0">
          {isAdded ? (
            <span className="flex items-center gap-1 text-xs text-green-400 bg-green-500/20 px-2 py-1 rounded-full">
              <Check className="w-3 h-3" />
              Added
            </span>
          ) : (
            <button
              onClick={onAdd}
              className="px-3 py-1.5 text-sm bg-theme-primary hover:bg-theme-primary/90
                text-white rounded-lg transition-colors"
            >
              Add
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
