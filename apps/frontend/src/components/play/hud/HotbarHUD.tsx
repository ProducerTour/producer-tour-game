/**
 * HotbarHUD - Always-visible hotbar at bottom of screen (GTA V / Rust style)
 * Shows weapon slots with integrated ammo display
 * Reads from shared inventory store for consistency with inventory menu
 * Supports number key selection (1-9, 0) via useHotbarSelection hook
 */

import React, { useMemo, useEffect } from 'react';
import { useCombatStore, WEAPON_CONFIG } from '../combat/useCombatStore';
import { useInventoryStore, InventorySlot } from '../../../lib/economy/inventoryStore';
import { useHotbarSelection } from '../hooks/useHotbarSelection';
import { useDevStore } from '../debug/useDevStore';

/**
 * Hotbar slot data - represents items in the hotbar
 */
interface HotbarSlotData {
  id: string;
  name: string;
  type: 'weapon' | 'item' | 'empty';
  itemType?: string; // Original item type (consumable, material, etc.)
  weaponType?: 'rifle' | 'pistol';
  icon?: string;
  thumbnail?: string; // Pre-rendered 2D image of 3D model
  quantity?: number;
}

export function HotbarHUD() {
  // Subscribe to inventory store for hotbar slots (now contains InventorySlot objects directly)
  const hotbarSlots = useInventoryStore((s) => s.hotbarSlots);
  const initializeDefaultWeapons = useInventoryStore((s) => s.initializeDefaultWeapons);
  const isInventoryOpen = useInventoryStore((s) => s.isInventoryOpen);

  // Check if dev console is open
  const isConsoleOpen = useDevStore((s) => s.isConsoleOpen);

  // Disable hotbar keyboard input when inventory or dev console is open
  const hotbarEnabled = !isInventoryOpen && !isConsoleOpen;

  // Use hotbar selection hook for number key handling
  const { activeHotbarSlot } = useHotbarSelection({ enabled: hotbarEnabled });

  // Subscribe to combat store
  const ammo = useCombatStore((s) => s.ammo);
  const currentWeapon = useCombatStore((s) => s.currentWeapon);
  const isReloading = useCombatStore((s) => s.isReloading);

  // Initialize default weapons on first render
  useEffect(() => {
    initializeDefaultWeapons();
  }, [initializeDefaultWeapons]);

  // Build slot data from hotbar slots (first 6 slots for HUD)
  const slots = useMemo((): HotbarSlotData[] => {
    return hotbarSlots.slice(0, 6).map((inventorySlot: InventorySlot | null, index: number) => {
      if (!inventorySlot) {
        return { id: `empty-${index}`, name: '', type: 'empty' as const };
      }

      const item = inventorySlot.item;
      if (!item) {
        return { id: `empty-${index}`, name: '', type: 'empty' as const };
      }

      // Determine weapon type from metadata
      let weaponType: 'rifle' | 'pistol' | undefined;
      if (item.type === 'weapon' && item.metadata?.weaponType) {
        weaponType = item.metadata.weaponType as 'rifle' | 'pistol';
      }

      return {
        id: `hotbar-${index}`,
        name: item.name,
        type: item.type === 'weapon' ? 'weapon' : 'item',
        itemType: item.type,
        weaponType,
        icon: item.icon,
        thumbnail: item.thumbnail,
        quantity: inventorySlot.quantity,
      };
    });
  }, [hotbarSlots]);

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
      <div className="flex gap-1 p-2 bg-[#12151a]/90 border border-[#2a2d31] rounded-lg backdrop-blur-sm">
        {slots.map((slot, index) => (
          <HotbarSlotItem
            key={slot.id}
            slot={slot}
            index={index}
            isActive={activeHotbarSlot === index}
            ammo={ammo}
            currentWeapon={currentWeapon}
            isReloading={isReloading}
          />
        ))}
      </div>
    </div>
  );
}

interface HotbarSlotItemProps {
  slot: HotbarSlotData;
  index: number;
  isActive: boolean;
  ammo: Record<string, number>;
  currentWeapon: 'none' | 'rifle' | 'pistol';
  isReloading: boolean;
}

const HotbarSlotItem = React.memo(function HotbarSlotItem({
  slot,
  index,
  isActive,
  ammo,
  currentWeapon,
  isReloading,
}: HotbarSlotItemProps) {

  // Get ammo info for weapon slots
  const ammoInfo = useMemo(() => {
    if (slot.type !== 'weapon' || !slot.weaponType) return null;

    const currentAmmo = ammo[slot.weaponType] ?? 0;
    const maxAmmo = WEAPON_CONFIG[slot.weaponType].magazineSize;
    const isLow = currentAmmo <= 5;
    const isThisReloading = isReloading && currentWeapon === slot.weaponType;

    return { current: currentAmmo, max: maxAmmo, isLow, isReloading: isThisReloading };
  }, [slot, ammo, isReloading, currentWeapon]);

  return (
    <div
      className={`
        relative w-14 h-14 transition-all duration-100
        ${isActive
          ? 'bg-[#3d4249] border-2 border-[#5a7a9a] shadow-lg shadow-[#5a7a9a]/20'
          : slot.type !== 'empty'
            ? 'bg-gradient-to-b from-[#2a2d31] to-[#1a1d21] border border-[#3d4249]'
            : 'bg-[#1a1d21]/50 border border-[#2a2d31]/50'
        }
        rounded-md
      `}
    >
      {/* Slot number */}
      <div className="absolute top-0.5 left-1 text-[9px] font-mono text-[#5a6068]">
        {index + 1}
      </div>

      {slot.type === 'weapon' ? (
        <>
          {/* Weapon icon - prefer thumbnail, fallback to icon, then emoji */}
          <div className="absolute inset-0 flex items-center justify-center">
            {slot.thumbnail || slot.icon ? (
              <img src={slot.thumbnail || slot.icon} alt={slot.name} className="w-full h-full object-cover" draggable={false} />
            ) : (
              <span className="text-lg opacity-70">🔫</span>
            )}
          </div>

          {/* Weapon name (small) */}
          <div className="absolute top-3 left-0 right-0 text-center">
            <span className="text-[7px] uppercase tracking-wider text-[#5a6068]">
              {slot.name}
            </span>
          </div>

          {/* Ammo display */}
          {ammoInfo && (
            <div className="absolute bottom-0.5 left-0 right-0 flex justify-center">
              {ammoInfo.isReloading ? (
                <span className="text-[8px] font-bold text-[#eab308] animate-pulse tracking-wide">
                  RELOAD
                </span>
              ) : (
                <span
                  className={`text-[10px] font-mono font-bold tracking-tight ${
                    ammoInfo.isLow ? 'text-[#ef4444]' : 'text-[#d4d4d4]'
                  }`}
                  style={{ textShadow: '0 0 4px rgba(0,0,0,0.8)' }}
                >
                  {ammoInfo.current}/{ammoInfo.max}
                </span>
              )}
            </div>
          )}
        </>
      ) : slot.type === 'item' ? (
        <>
          {/* Item icon - prefer thumbnail, fallback to icon, then emoji */}
          <div className="absolute inset-0 flex items-center justify-center">
            {slot.thumbnail || slot.icon ? (
              <img src={slot.thumbnail || slot.icon} alt={slot.name} className="w-full h-full object-cover" draggable={false} />
            ) : (
              <span className="text-lg opacity-70">{getItemEmoji(slot.itemType)}</span>
            )}
          </div>

          {/* Item name (small) */}
          <div className="absolute top-3 left-0 right-0 text-center">
            <span className="text-[7px] uppercase tracking-wider text-[#5a6068] truncate px-0.5">
              {slot.name}
            </span>
          </div>

          {/* Quantity badge */}
          {slot.quantity && slot.quantity > 1 && (
            <div className="absolute bottom-0 right-0 px-1 py-0.5 bg-[#1a1d21]/90 border-l border-t border-[#3d4249] text-[9px] font-mono text-[#d4d4d4]">
              {slot.quantity >= 1000 ? `${(slot.quantity / 1000).toFixed(1)}k` : `×${slot.quantity}`}
            </div>
          )}
        </>
      ) : (
        /* Empty slot */
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[#3d4249]/50">—</span>
        </div>
      )}
    </div>
  );
});

/**
 * Get emoji icon for item type (fallback when no icon provided)
 */
function getItemEmoji(type?: string): string {
  const emojis: Record<string, string> = {
    weapon: '🔫',
    armor: '🦺',
    consumable: '💊',
    material: '🪵',
    currency: '💵',
    collectible: '💎',
    nft: '🎨',
    placeable: '🏕️',
  };
  return emojis[type || ''] || '📦';
}

export default HotbarHUD;
