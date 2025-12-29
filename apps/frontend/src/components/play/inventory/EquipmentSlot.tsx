/**
 * EquipmentSlot - Individual equipment slot positioned around body silhouette
 */

import { motion } from 'framer-motion';
import { useMemo, useCallback } from 'react';
import { RARITY_COLORS, SLOT_STYLES, EQUIPMENT_SLOT_LABELS } from './constants';
import type { EquipmentSlotProps } from './types';
import { cn } from '../../../lib/utils';

export function EquipmentSlot({
  slotType,
  slot,
  isDropTarget,
  onDragStart,
  onDragEnd,
  onDrop,
  onUnequip,
}: EquipmentSlotProps) {
  // Get rarity colors for equipped item
  const rarityStyle = useMemo(() => {
    if (!slot || !slot.item) return null;
    return RARITY_COLORS[slot.item.rarity];
  }, [slot]);

  // Slot accepts types defined in EQUIPMENT_SLOT_ACCEPTS[slotType]
  // Used for validation during drag-drop operations

  // Handle drag start
  const handleDragStart = useCallback(() => {
    if (!slot) return;
    // Use slotType as the slotId for equipment slots
    onDragStart(slotType, slot);
  }, [slot, slotType, onDragStart]);

  // Handle drop on this slot
  const handleDrop = useCallback(() => {
    onDrop(slotType);
  }, [slotType, onDrop]);

  // Handle right-click to unequip
  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      if (slot) {
        onUnequip(slotType);
      }
    },
    [slot, slotType, onUnequip]
  );

  // Determine slot styling
  const slotClassName = useMemo(() => {
    const base = 'relative w-14 h-14 rounded-lg transition-all duration-150 cursor-pointer';

    if (isDropTarget) {
      return cn(base, SLOT_STYLES.dropTarget);
    }

    if (slot && rarityStyle) {
      return cn(
        base,
        `bg-gradient-to-br ${rarityStyle.gradient}`,
        `border ${rarityStyle.border}`,
        'hover:brightness-110'
      );
    }

    // Empty slot with type indicator
    return cn(
      base,
      'bg-black/30 border border-dashed border-white/20',
      'hover:border-white/40 hover:bg-white/5'
    );
  }, [slot, rarityStyle, isDropTarget]);

  return (
    <motion.div
      className={slotClassName}
      drag={!!slot}
      dragSnapToOrigin
      dragElastic={0.1}
      dragMomentum={false}
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
      onPointerUp={isDropTarget ? handleDrop : undefined}
      onContextMenu={handleContextMenu}
      whileHover={{ scale: 1.05 }}
      whileDrag={{ scale: 1.1, zIndex: 100 }}
      title={EQUIPMENT_SLOT_LABELS[slotType]}
    >
      {slot && slot.item ? (
        <>
          {/* Equipped item icon - prefer thumbnail, fallback to icon, then emoji */}
          <div className="absolute inset-1.5 flex items-center justify-center">
            {slot.item.thumbnail || slot.item.icon ? (
              <img
                src={slot.item.thumbnail || slot.item.icon}
                alt={slot.item.name}
                className="w-full h-full object-contain pointer-events-none"
                draggable={false}
              />
            ) : (
              <EquipmentTypeFallback type={slot.item.type} />
            )}
          </div>
        </>
      ) : (
        <>
          {/* Empty slot indicator */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <SlotTypeIcon slotType={slotType} />
            <span className="text-[8px] text-white/30 mt-0.5 uppercase tracking-wider">
              {EQUIPMENT_SLOT_LABELS[slotType]}
            </span>
          </div>
        </>
      )}
    </motion.div>
  );
}

/**
 * Icon for empty equipment slot
 */
function SlotTypeIcon({ slotType }: { slotType: string }) {
  const icons: Record<string, string> = {
    head: '🎭',
    chest: '👕',
    hands: '🧤',
    legs: '👖',
    feet: '👟',
    primaryWeapon: '🔫',
    secondaryWeapon: '🗡️',
  };

  return (
    <span className="text-lg opacity-30">
      {icons[slotType] || '📦'}
    </span>
  );
}

/**
 * Fallback icon for equipped item
 */
function EquipmentTypeFallback({ type }: { type: string }) {
  const icons: Record<string, string> = {
    weapon: '⚔️',
    armor: '🛡️',
  };

  return (
    <span className="text-xl opacity-80">
      {icons[type] || '📦'}
    </span>
  );
}
