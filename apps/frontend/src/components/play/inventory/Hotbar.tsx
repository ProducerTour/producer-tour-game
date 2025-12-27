/**
 * Hotbar - Full-width bottom bar (Rust/GTA V style)
 * Urban street aesthetic - clean with quantity displays
 * Integrated ammo display on weapon slots
 */

import React, { useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useCombatStore, WEAPON_CONFIG } from '../combat/useCombatStore';
import { RARITY_COLORS } from './constants';
import type { InventorySlot } from './types';

interface HotbarProps {
  hotbarSlots: (InventorySlot | null)[];
  activeSlot: number;
  onUse: (index: number) => void;
  /** Whether a drag is in progress (for drop target highlighting) */
  isDragging?: boolean;
  /** Called when an item is dropped on a hotbar slot */
  onDrop?: (index: number) => void;
  /** Called when starting to drag an item from hotbar */
  onDragStart?: (slotId: string, slot: InventorySlot) => void;
  /** Called when drag ends */
  onDragEnd?: () => void;
  /** Called when right-clicking a hotbar slot */
  onContextMenu?: (slotId: string, slot: InventorySlot, position: { x: number; y: number }) => void;
}

export function Hotbar({ hotbarSlots, activeSlot, onUse, onDrop, onDragStart, onDragEnd, isDragging = false, onContextMenu }: HotbarProps) {
  // Hotbar slots now contain InventorySlot objects directly (no lookup needed)

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
            <span className="text-[10px] text-[#5a6068]">DRAG UP › INVENTORY</span>
          </div>

          {/* Hotbar Slots */}
          <div className="flex gap-1">
            {hotbarSlots.map((slot, index) => (
              <HotbarSlot
                key={index}
                slot={slot}
                index={index}
                isActive={activeSlot === index}
                onUse={() => onUse(index)}
                isDragging={isDragging}
                onDrop={onDrop ? () => onDrop(index) : undefined}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                onContextMenu={onContextMenu}
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
  index: number;
  isActive: boolean;
  onUse: () => void;
  isDragging?: boolean;
  onDrop?: () => void;
  onDragStart?: (slotId: string, slot: InventorySlot) => void;
  onDragEnd?: () => void;
  onContextMenu?: (slotId: string, slot: InventorySlot, position: { x: number; y: number }) => void;
}

const HotbarSlot = React.memo(function HotbarSlot({ slot, index, isActive, onUse, isDragging = false, onDrop, onDragStart, onDragEnd, onContextMenu }: HotbarSlotProps) {
  const [isHovered, setIsHovered] = React.useState(false);

  // Handle right-click context menu
  const handleContextMenu = React.useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      if (!slot || !onContextMenu) return;
      // Generate a synthetic slotId for context menu (hotbar items don't have slotIds anymore)
      const syntheticSlotId = `hotbar-${index}`;
      onContextMenu(syntheticSlotId, slot, { x: e.clientX, y: e.clientY });
    },
    [slot, index, onContextMenu]
  );

  // Handle drag start - notify parent that we're dragging from hotbar
  const handleDragStart = useCallback(() => {
    if (!slot || !onDragStart) return;
    const syntheticSlotId = `hotbar-${index}`;
    onDragStart(syntheticSlotId, slot);
  }, [slot, index, onDragStart]);

  // Subscribe to combat store for ammo and reload state
  const ammo = useCombatStore((s) => s.ammo);
  const isReloading = useCombatStore((s) => s.isReloading);
  const currentWeapon = useCombatStore((s) => s.currentWeapon);

  const rarityStyle = useMemo(() => {
    if (!slot || !slot.item) return null;
    return RARITY_COLORS[slot.item.rarity];
  }, [slot]);

  // Detect if this slot contains a weapon and get its ammo info
  const weaponAmmoInfo = useMemo(() => {
    if (!slot || !slot.item || slot.item.type !== 'weapon') return null;

    // Map item name to weapon type (case insensitive match)
    const itemNameLower = slot.item.name.toLowerCase();
    let weaponType: 'rifle' | 'pistol' | null = null;

    if (itemNameLower.includes('ak') || itemNameLower.includes('rifle') || itemNameLower.includes('assault')) {
      weaponType = 'rifle';
    } else if (itemNameLower.includes('pistol') || itemNameLower.includes('glock') || itemNameLower.includes('handgun')) {
      weaponType = 'pistol';
    }

    if (!weaponType) return null;

    const currentAmmo = ammo[weaponType] ?? 0;
    const maxAmmo = WEAPON_CONFIG[weaponType].magazineSize;
    const isLowAmmo = currentAmmo <= 5;
    const isThisWeaponActive = currentWeapon === weaponType;
    const isThisWeaponReloading = isReloading && isThisWeaponActive;

    return {
      current: currentAmmo,
      max: maxAmmo,
      isLow: isLowAmmo,
      isReloading: isThisWeaponReloading,
      weaponType,
    };
  }, [slot, ammo, isReloading, currentWeapon]);

  // Get quantity display for non-weapon stackable items
  const quantityDisplay = useMemo(() => {
    if (!slot || !slot.item) return null;
    if (slot.item.type === 'weapon') return null; // Weapons use ammo display instead
    if (slot.quantity <= 1) return null;

    // Format large numbers
    if (slot.quantity >= 1000) {
      return `${(slot.quantity / 1000).toFixed(1)}k`;
    }
    return `×${slot.quantity}`;
  }, [slot]);

  // Check if this slot is a valid drop target
  const isDropTarget = isDragging && isHovered;

  return (
    <motion.div
      className={`
        relative w-14 h-14 cursor-pointer transition-all duration-100
        ${isDropTarget
          ? 'bg-[#3d5a3d]/60 border-2 border-[#7cb87c]'
          : isActive
            ? 'bg-[#3d4249] border-2 border-[#5a7a9a]'
            : slot
              ? `bg-gradient-to-b ${rarityStyle?.gradient ?? 'from-[#2a2d31] to-[#1a1d21]'} border border-[#3d4249]`
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
      whileDrag={{ scale: 1.1, zIndex: 100, opacity: 0.8 }}
      onClick={onUse}
      onContextMenu={handleContextMenu}
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={() => setIsHovered(false)}
      onPointerUp={isDropTarget && onDrop ? onDrop : undefined}
    >
      {/* Slot number indicator */}
      <div className="absolute top-0.5 left-1 text-[9px] font-mono text-[#5a6068]">
        {index + 1}
      </div>

      {slot && slot.item ? (
        <>
          {/* Item Icon - prefer thumbnail, fallback to icon, then emoji */}
          <div className="absolute inset-0 flex items-center justify-center">
            {slot.item.thumbnail || slot.item.icon ? (
              <img
                src={slot.item.thumbnail || slot.item.icon}
                alt={slot.item.name}
                className="w-full h-full object-cover"
                draggable={false}
              />
            ) : (
              <span className="text-xl opacity-70">
                {getItemEmoji(slot.item.type)}
              </span>
            )}
          </div>

          {/* Ammo Display for Weapons */}
          {weaponAmmoInfo && (
            <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center">
              {weaponAmmoInfo.isReloading ? (
                <span className="text-[9px] font-bold text-[#eab308] animate-pulse tracking-wide">
                  RELOAD
                </span>
              ) : (
                <span
                  className={`text-[10px] font-mono font-bold tracking-tight ${
                    weaponAmmoInfo.isLow ? 'text-[#ef4444]' : 'text-[#d4d4d4]'
                  }`}
                  style={{ textShadow: '0 0 4px rgba(0,0,0,0.8)' }}
                >
                  {weaponAmmoInfo.current}/{weaponAmmoInfo.max}
                </span>
              )}
            </div>
          )}

          {/* Quantity Badge (for non-weapons) */}
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
    </motion.div>
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
