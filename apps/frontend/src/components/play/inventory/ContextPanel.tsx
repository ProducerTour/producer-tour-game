/**
 * ContextPanel - Right panel showing item details and crafting
 * Urban/Street aesthetic - clean but edgy
 */

import { useMemo } from 'react';
import { RARITY_COLORS } from './constants';
import type { InventorySlot } from './types';

interface ContextPanelProps {
  selectedItem: InventorySlot | null;
  onSort: (by: 'name' | 'type' | 'rarity' | 'value') => void;
}

export function ContextPanel({ selectedItem, onSort }: ContextPanelProps) {
  const rarityStyle = useMemo(() => {
    if (!selectedItem || !selectedItem.item) return null;
    return RARITY_COLORS[selectedItem.item.rarity];
  }, [selectedItem]);

  // Mock weight data - would come from inventory store
  const currentWeight = 54.7;
  const maxWeight = 150;
  const weightPercent = (currentWeight / maxWeight) * 100;

  return (
    <div className="w-[320px] h-full bg-[#12151a]/95 border border-[#2a2d31] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#1a1d21] border-b border-[#2a2d31]">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[#d4d4d4] tracking-wide">CONTEXT</span>
          <span className="text-xs text-[#5a6068]">&gt;</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {selectedItem && selectedItem.item ? (
          <ItemDetails item={selectedItem} rarityStyle={rarityStyle} />
        ) : (
          <CraftingPanel onSort={onSort} />
        )}
      </div>

      {/* Footer - Weight */}
      <div className="px-4 py-3 bg-[#1a1d21] border-t border-[#2a2d31]">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-[#5a6068]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3L4 9v12h16V9l-8-6zm0 2.5L18 10v9H6v-9l6-4.5z" />
            </svg>
          </div>
          <span className="text-sm text-[#d4d4d4] font-mono">
            {currentWeight.toFixed(1)} / {maxWeight} kg
          </span>
        </div>
        <div className="h-1.5 bg-[#2a2d31] overflow-hidden">
          <div
            className={`h-full transition-all ${
              weightPercent > 90 ? 'bg-[#d47a7a]' : 'bg-[#5a7a9a]'
            }`}
            style={{ width: `${weightPercent}%` }}
          />
        </div>
        <div className="flex justify-end mt-1">
          <span className="text-[10px] text-[#5a6068]">F3</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Item Details View
 */
function ItemDetails({
  item,
  rarityStyle,
}: {
  item: InventorySlot;
  rarityStyle: typeof RARITY_COLORS[keyof typeof RARITY_COLORS] | null;
}) {
  return (
    <div className="p-4 space-y-4">
      {/* Item Header */}
      <div className="flex items-start gap-3">
        <div
          className={`w-16 h-16 flex items-center justify-center bg-gradient-to-br ${rarityStyle?.gradient ?? 'from-[#3d4249] to-[#2d3238]'} border border-[#3d4249]`}
        >
          {item.item.icon ? (
            <img
              src={item.item.icon}
              alt={item.item.name}
              className="w-12 h-12 object-contain"
            />
          ) : (
            <span className="text-2xl opacity-60">📦</span>
          )}
        </div>
        <div className="flex-1">
          <h3 className={`font-medium ${rarityStyle?.text ?? 'text-[#d4d4d4]'}`}>
            {item.item.name}
          </h3>
          <p className="text-xs text-[#5a6068] capitalize">{item.item.type}</p>
          {item.quantity > 1 && (
            <p className="text-xs text-[#8a8a8a]">x{item.quantity}</p>
          )}
        </div>
      </div>

      {/* Item Description */}
      {item.item.description && (
        <p className="text-xs text-[#8a8a8a] leading-relaxed">
          {item.item.description}
        </p>
      )}

      {/* Item Stats */}
      {item.item.metadata && (
        <div className="space-y-2">
          <div className="text-[10px] text-[#5a6068] uppercase tracking-wider">Stats</div>
          {Object.entries(item.item.metadata).map(([key, value]) => (
            <div key={key} className="flex justify-between text-xs">
              <span className="text-[#8a8a8a] capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
              <span className="text-[#d4d4d4]">{String(value)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="pt-2 border-t border-[#2a2d31] space-y-2">
        <button className="w-full py-2 bg-[#3d5a3d]/40 hover:bg-[#3d5a3d]/60 border border-[#5a8a5a]/40 text-[#7cb87c] text-sm font-medium transition-colors">
          USE
        </button>
        <button className="w-full py-2 bg-[#5a3d3d]/40 hover:bg-[#5a3d3d]/60 border border-[#9a5a5a]/40 text-[#d47a7a] text-sm font-medium transition-colors">
          DROP
        </button>
      </div>

      {/* Value */}
      {item.item.value && (
        <div className="flex justify-between text-xs pt-2 border-t border-[#2a2d31]">
          <span className="text-[#5a6068]">Value</span>
          <span className="text-[#c9a227]">${item.item.value.toLocaleString()}</span>
        </div>
      )}
    </div>
  );
}

/**
 * Crafting Panel - shown when no item selected
 */
function CraftingPanel({ onSort }: { onSort: (by: 'name' | 'type' | 'rarity' | 'value') => void }) {
  return (
    <div className="p-4 space-y-4">
      {/* Crafting Header */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-[#5a6068] uppercase tracking-wider">▲ CRAFTING</span>
      </div>

      {/* Mock Crafting Items */}
      <div className="space-y-2">
        <CraftingItem name="Gunpowder" time="20 s" progress={45} />
        <CraftingItem name="Ammo +7 s" time="0.7" />
        <CraftingItem name="Gunpowder" time="15s" />
        <CraftingItem name="Gunpowder" time="15s" />
      </div>

      {/* Divider */}
      <div className="border-t border-[#2a2d31]" />

      {/* Sort Options */}
      <div className="space-y-1">
        <div className="text-[10px] text-[#5a6068] uppercase tracking-wider mb-2">Sort By</div>
        {(['name', 'type', 'rarity', 'value'] as const).map((sortBy) => (
          <button
            key={sortBy}
            onClick={() => onSort(sortBy)}
            className="w-full py-1.5 px-2 text-left text-xs text-[#8a8a8a] hover:text-[#d4d4d4] hover:bg-[#2a2d31]/50 transition-colors capitalize"
          >
            {sortBy}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Crafting Item Row
 */
function CraftingItem({
  name,
  time,
  progress,
}: {
  name: string;
  time: string;
  progress?: number;
}) {
  return (
    <div className="flex items-center gap-2 p-2 bg-[#1a1d21]/60 border border-[#2a2d31]">
      <div className="w-8 h-8 bg-[#2a2d31] flex items-center justify-center">
        <span className="text-sm opacity-60">📦</span>
      </div>
      <div className="flex-1">
        <div className="text-xs text-[#d4d4d4]">{name}</div>
        {progress !== undefined ? (
          <div className="h-1 bg-[#2a2d31] mt-1">
            <div
              className="h-full bg-[#5a7a9a]"
              style={{ width: `${progress}%` }}
            />
          </div>
        ) : (
          <div className="text-[10px] text-[#5a6068]">⏱ {time}</div>
        )}
      </div>
    </div>
  );
}
