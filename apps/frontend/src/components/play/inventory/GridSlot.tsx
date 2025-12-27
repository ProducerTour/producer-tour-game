/**
 * GridSlot - Rust-style inventory slot with drag-and-drop support
 * Memoized to prevent unnecessary re-renders (30+ slots in grid)
 */

import React, { useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { RARITY_COLORS } from './constants';
import type { InventorySlot } from './types';

interface GridSlotProps {
  slotId: string;
  slot: InventorySlot | null;
  index: number;
  isDropTarget: boolean;
  isSelected?: boolean;
  onDragStart: (slotId: string, slot: InventorySlot) => void;
  onDragEnd: () => void;
  onDrop: (slotId: string) => void;
  onDoubleClick: (slotId: string) => void;
  onClick?: () => void;
  onContextMenu?: (slotId: string, slot: InventorySlot, position: { x: number; y: number }) => void;
}

export const GridSlot = React.memo(function GridSlot({
  slotId,
  slot,
  index,
  isDropTarget,
  isSelected,
  onDragStart,
  onDragEnd,
  onDrop,
  onDoubleClick,
  onClick,
  onContextMenu,
}: GridSlotProps) {
  // Get rarity colors for the item
  const rarityStyle = useMemo(() => {
    if (!slot || !slot.item) return null;
    return RARITY_COLORS[slot.item.rarity];
  }, [slot]);

  // Handle drag start
  const handleDragStart = useCallback(() => {
    if (!slot) return;
    onDragStart(slotId, slot);
  }, [slot, slotId, onDragStart]);

  // Handle double click (quick equip/use)
  const handleDoubleClick = useCallback(() => {
    if (!slot) return;
    onDoubleClick(slotId);
  }, [slot, slotId, onDoubleClick]);

  // Handle drop on this slot
  const handleDrop = useCallback(() => {
    onDrop(slotId);
  }, [slotId, onDrop]);

  // Handle click for selection
  const handleClick = useCallback(() => {
    onClick?.();
  }, [onClick]);

  // Handle right-click context menu
  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      if (!slot || !onContextMenu) return;
      onContextMenu(slotId, slot, { x: e.clientX, y: e.clientY });
    },
    [slot, slotId, onContextMenu]
  );

  // Quantity display
  const quantityDisplay = useMemo(() => {
    if (!slot || slot.quantity <= 1) return null;
    if (slot.quantity >= 1000) {
      return `${(slot.quantity / 1000).toFixed(1)}k`;
    }
    return slot.quantity;
  }, [slot]);

  return (
    <motion.div
      className={`
        relative aspect-square cursor-pointer
        ${isDropTarget
          ? 'bg-[#3d5a3d]/40 border-2 border-[#7cb87c]'
          : isSelected
            ? 'bg-[#2a3d4a] border-2 border-[#5a7a9a]'
            : slot && rarityStyle
              ? `bg-gradient-to-b ${rarityStyle.gradient} border border-[#3d4249]`
              : 'bg-[#1a1d21] border border-[#2a2d31]'
        }
        hover:border-[#5a6068]
      `}
      drag={!!slot}
      dragSnapToOrigin
      dragElastic={0}
      dragMomentum={false}
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
      onDoubleClick={handleDoubleClick}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onPointerUp={isDropTarget ? handleDrop : undefined}
      whileDrag={{ scale: 1.1, zIndex: 100, opacity: 0.8 }}
    >
      {slot && slot.item ? (
        <>
          {/* Item icon - prefer thumbnail, fallback to icon, then emoji */}
          <div className="absolute inset-1 flex items-center justify-center">
            {slot.item.thumbnail || slot.item.icon ? (
              <img
                src={slot.item.thumbnail || slot.item.icon}
                alt={slot.item.name}
                className="w-full h-full object-contain pointer-events-none"
                draggable={false}
              />
            ) : (
              <ItemTypeFallback type={slot.item.type} />
            )}
          </div>

          {/* Quantity badge */}
          {quantityDisplay && (
            <div className="absolute -bottom-0.5 -right-0.5 px-1 py-0.5 bg-[#1a1d21] border border-[#3d4249] text-[10px] font-mono text-[#d4d4d4]">
              {quantityDisplay}
            </div>
          )}

          {/* Equipped indicator */}
          {slot.equipped && (
            <div className="absolute top-1 left-1 w-2 h-2 bg-[#7cb87c]" />
          )}
        </>
      ) : (
        // Empty slot
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[#2a2d31] text-xs">{index + 1}</span>
        </div>
      )}
    </motion.div>
  );
});

/**
 * Fallback icon based on item type
 */
function ItemTypeFallback({ type }: { type: string }) {
  const icons: Record<string, string> = {
    weapon: '🔫',
    armor: '🦺',
    consumable: '💊',
    material: '🪵',
    currency: '💵',
    collectible: '💎',
    nft: '🎨',
  };

  return (
    <span className="text-xl opacity-70">
      {icons[type] || '📦'}
    </span>
  );
}
