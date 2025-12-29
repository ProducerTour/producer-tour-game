/**
 * InventoryHeader - Currency display and sort controls
 */

import { ArrowsDownUp, Backpack } from '@phosphor-icons/react';
import { useInventoryStore } from '../../../lib/economy/inventoryStore';

interface InventoryHeaderProps {
  onSort: (by: 'name' | 'type' | 'rarity' | 'value') => void;
}

export function InventoryHeader({ onSort }: InventoryHeaderProps) {
  const currencies = useInventoryStore((s) => s.currencies);
  const slots = useInventoryStore((s) => s.slots);
  const maxSlots = useInventoryStore((s) => s.maxSlots);

  const gold = currencies.get('gold')?.amount ?? 0;
  const gems = currencies.get('gems')?.amount ?? 0;
  const usedSlots = slots.size;

  return (
    <div className="flex items-center justify-between mb-6">
      {/* Title and slot count */}
      <div className="flex items-center gap-3">
        <Backpack className="w-6 h-6 text-violet-400" weight="duotone" />
        <h2 className="text-xl font-semibold text-white">Inventory</h2>
        <span className="text-sm text-gray-400">
          {usedSlots}/{maxSlots} slots
        </span>
      </div>

      {/* Currency display */}
      <div className="flex items-center gap-6">
        {/* Gold */}
        <div className="flex items-center gap-2">
          <span className="text-lg">💰</span>
          <span className="text-amber-400 font-medium tabular-nums">
            {gold.toLocaleString()}
          </span>
        </div>

        {/* Gems */}
        <div className="flex items-center gap-2">
          <span className="text-lg">💎</span>
          <span className="text-cyan-400 font-medium tabular-nums">
            {gems.toLocaleString()}
          </span>
        </div>

        {/* Sort dropdown */}
        <div className="relative group">
          <button
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
            aria-label="Sort inventory"
          >
            <ArrowsDownUp className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-300">Sort</span>
          </button>

          {/* Dropdown menu */}
          <div className="absolute right-0 top-full mt-1 py-1 bg-[#1a1a24] rounded-lg border border-white/10 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20 min-w-[120px]">
            <SortOption label="Name" value="name" onClick={onSort} />
            <SortOption label="Type" value="type" onClick={onSort} />
            <SortOption label="Rarity" value="rarity" onClick={onSort} />
            <SortOption label="Value" value="value" onClick={onSort} />
          </div>
        </div>
      </div>
    </div>
  );
}

interface SortOptionProps {
  label: string;
  value: 'name' | 'type' | 'rarity' | 'value';
  onClick: (by: 'name' | 'type' | 'rarity' | 'value') => void;
}

function SortOption({ label, value, onClick }: SortOptionProps) {
  return (
    <button
      onClick={() => onClick(value)}
      className="w-full px-3 py-1.5 text-left text-sm text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
    >
      {label}
    </button>
  );
}
