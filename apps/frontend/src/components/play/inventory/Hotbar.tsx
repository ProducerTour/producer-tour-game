/**
 * Hotbar - Full-width bottom bar (Rust/GTA V style)
 * Urban street aesthetic - clean with quantity displays
 */

import React, { useMemo } from 'react';
import { useInventoryStore } from '../../../lib/economy/inventoryStore';
import { RARITY_COLORS } from './constants';
import type { InventorySlot } from './types';

interface HotbarProps {
  hotbarSlots: (string | null)[];
  activeSlot: number;
  onUse: (index: number) => void;
  onAssign: (index: number, slotId: string) => void;
}

export function Hotbar({ hotbarSlots, activeSlot, onUse }: HotbarProps) {
  const getItem = useInventoryStore((s) => s.getItem);

  // Get items for each hotbar slot
  const items = useMemo(() => {
    return hotbarSlots.map((slotId) => {
      if (!slotId) return null;
      return getItem(slotId) ?? null;
    });
  }, [hotbarSlots, getItem]);

  return (
    <div className="relative z-20 bg-[#12151a]/95 border-t border-[#2a2d31]">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Left Label */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-[#5a6068] uppercase tracking-wider">INVENTORY BAR</span>
            <div className="flex items-center gap-1">
              <span className="px-2 py-0.5 bg-[#2a2d31] text-[10px] text-[#8a8a8a]">L1</span>
              <span className="w-4 h-[2px] bg-[#3d4249]" />
              <span className="px-2 py-0.5 bg-[#2a2d31] text-[10px] text-[#8a8a8a]">R1</span>
            </div>
            <span className="text-[10px] text-[#5a6068]">DRAG UP › INSPECT</span>
          </div>

          {/* Hotbar Slots */}
          <div className="flex gap-1">
            {items.map((slot, index) => (
              <HotbarSlot
                key={index}
                slot={slot}
                isActive={activeSlot === index}
                onUse={() => onUse(index)}
              />
            ))}
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-4">
            <span className="text-[10px] text-[#5a6068]">
              <span className="text-[#8a8a8a]">HOLD</span> ESC
            </span>
            <span className="text-xs text-[#d4d4d4]">
              <span className="text-[#5a7a9a]">H</span> TO EXIT
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

interface HotbarSlotProps {
  slot: InventorySlot | null;
  isActive: boolean;
  onUse: () => void;
}

const HotbarSlot = React.memo(function HotbarSlot({ slot, isActive, onUse }: HotbarSlotProps) {
  const rarityStyle = useMemo(() => {
    if (!slot) return null;
    return RARITY_COLORS[slot.item.rarity];
  }, [slot]);

  // Get quantity display
  const quantityDisplay = useMemo(() => {
    if (!slot) return null;
    if (slot.quantity <= 1) return null;

    // Format large numbers
    if (slot.quantity >= 1000) {
      return `${(slot.quantity / 1000).toFixed(1)}k`;
    }
    return `×${slot.quantity}`;
  }, [slot]);

  return (
    <div
      className={`
        relative w-14 h-14 cursor-pointer transition-all duration-100
        ${isActive
          ? 'bg-[#3d4249] border-2 border-[#5a7a9a]'
          : slot
            ? `bg-gradient-to-b ${rarityStyle?.gradient ?? 'from-[#2a2d31] to-[#1a1d21]'} border border-[#3d4249]`
            : 'bg-[#1a1d21] border border-[#2a2d31]'
        }
        hover:border-[#5a6068]
      `}
      onClick={onUse}
    >
      {slot ? (
        <>
          {/* Item Icon */}
          <div className="absolute inset-1 flex items-center justify-center">
            {slot.item.icon ? (
              <img
                src={slot.item.icon}
                alt={slot.item.name}
                className="w-full h-full object-contain"
                draggable={false}
              />
            ) : (
              <span className="text-xl opacity-70">
                {getItemEmoji(slot.item.type)}
              </span>
            )}
          </div>

          {/* Quantity Badge */}
          {quantityDisplay && (
            <div className="absolute -bottom-1 -right-1 px-1.5 py-0.5 bg-[#1a1d21] border border-[#3d4249] text-[10px] font-mono text-[#d4d4d4]">
              {quantityDisplay}
            </div>
          )}
        </>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[#3d4249]">—</span>
        </div>
      )}
    </div>
  );
});

function getItemEmoji(type: string): string {
  const emojis: Record<string, string> = {
    weapon: '🔫',
    armor: '🦺',
    consumable: '💊',
    material: '🪵',
    currency: '💵',
    collectible: '💎',
    nft: '🎨',
  };
  return emojis[type] || '📦';
}
