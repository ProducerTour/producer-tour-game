/**
 * InventoryGrid - Rust-style grid of inventory slots
 */

import { useMemo } from 'react';
import { useInventoryStore } from '../../../lib/economy/inventoryStore';
import { GridSlot } from './GridSlot';
import { GRID_CONFIG } from './constants';
import type { InventorySlot } from './types';

interface InventoryGridProps {
  dropTargetSlotId: string | null;
  selectedSlotId?: string | null;
  onDragStart: (slotId: string, slot: InventorySlot) => void;
  onDragEnd: () => void;
  onDrop: (targetSlotId: string) => void;
  onDoubleClick: (slotId: string) => void;
  onSelect?: (slotId: string | null) => void;
}

export function InventoryGrid({
  dropTargetSlotId,
  selectedSlotId,
  onDragStart,
  onDragEnd,
  onDrop,
  onDoubleClick,
  onSelect,
}: InventoryGridProps) {
  const slots = useInventoryStore((s) => s.slots);
  const maxSlots = useInventoryStore((s) => s.maxSlots);

  // Convert slots Map to array and pad with empty slots
  const gridSlots = useMemo(() => {
    const slotsArray: Array<{ slotId: string; slot: InventorySlot | null }> = [];

    // Add existing items
    for (const [slotId, slot] of slots) {
      slotsArray.push({ slotId, slot });
    }

    // Pad with empty slots up to maxSlots
    const emptyCount = Math.max(0, maxSlots - slotsArray.length);
    for (let i = 0; i < emptyCount; i++) {
      slotsArray.push({
        slotId: `empty-${i}`,
        slot: null,
      });
    }

    return slotsArray;
  }, [slots, maxSlots]);

  const handleSelect = (slotId: string, slot: InventorySlot | null) => {
    if (slot && onSelect) {
      onSelect(slotId);
    }
  };

  return (
    <div
      className="grid gap-[2px]"
      style={{
        gridTemplateColumns: `repeat(${GRID_CONFIG.columns}, minmax(0, 1fr))`,
      }}
    >
      {gridSlots.map(({ slotId, slot }, index) => (
        <GridSlot
          key={slotId}
          slotId={slotId}
          slot={slot}
          index={index}
          isDropTarget={dropTargetSlotId === slotId}
          isSelected={selectedSlotId === slotId}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onDrop={onDrop}
          onDoubleClick={onDoubleClick}
          onClick={() => handleSelect(slotId, slot)}
        />
      ))}
    </div>
  );
}
