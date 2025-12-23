/**
 * useItemUsage - Central hook for using consumables and placeable items
 */

import { useCallback } from 'react';
import { useInventoryStore } from '../../../../lib/economy/inventoryStore';
import { useCombatStore } from '../../combat/useCombatStore';
import { usePlacementStore } from '../../../../lib/economy/usePlacementStore';
import type { ConsumableEffect, PlaceableConfig } from '../../../../lib/economy/itemEffects';

interface UseItemUsageReturn {
  // Use a consumable item (apply effect, remove from inventory)
  useConsumable: (slotId: string) => boolean;

  // Check if an item is a placeable
  isPlaceable: (slotId: string) => PlaceableConfig | null;

  // Get placeable config for an item
  getPlaceableConfig: (slotId: string) => PlaceableConfig | null;

  // Start placement mode for an item
  startPlacement: (slotId: string) => boolean;
}

export function useItemUsage(): UseItemUsageReturn {
  // Combat store for applying effects
  const heal = useCombatStore((s) => s.heal);

  // Inventory store
  const useItem = useInventoryStore((s) => s.useItem);
  const getItem = useInventoryStore((s) => s.getItem);

  // Placement store
  const enterPlacementMode = usePlacementStore((s) => s.enterPlacementMode);

  /**
   * Use a consumable item - apply effect and remove from inventory
   */
  const useConsumable = useCallback(
    (slotId: string): boolean => {
      const slot = getItem(slotId);
      if (!slot) return false;

      // Check if it's a consumable
      if (slot.item.type !== 'consumable') return false;

      // Get effect from metadata
      const effect = slot.item.metadata?.consumableEffect as ConsumableEffect | undefined;
      if (!effect) {
        console.warn(`Consumable ${slot.item.name} has no effect defined`);
        return false;
      }

      // Apply effect based on type
      switch (effect.type) {
        case 'heal':
          heal(effect.value);
          console.log(`Used ${slot.item.name}: +${effect.value} HP`);
          break;

        case 'healOverTime':
          // TODO: Implement HoT with interval
          heal(effect.value);
          console.log(`Used ${slot.item.name}: +${effect.value} HP over time`);
          break;

        case 'stamina':
          // TODO: Add stamina system to combat store
          console.log(`Used ${slot.item.name}: +${effect.value} Stamina`);
          break;

        case 'buff':
          // TODO: Implement buff system
          console.log(`Used ${slot.item.name}: Buff activated for ${effect.duration}ms`);
          break;

        case 'cure':
          // TODO: Implement debuff system
          console.log(`Used ${slot.item.name}: Debuffs cured`);
          break;

        default:
          console.warn(`Unknown effect type: ${effect.type}`);
          return false;
      }

      // Remove item from inventory
      const used = useItem(slotId, 1);
      if (!used) {
        console.error('Failed to remove item from inventory');
        return false;
      }

      return true;
    },
    [getItem, heal, useItem]
  );

  /**
   * Check if an item is placeable and return its config
   */
  const getPlaceableConfig = useCallback(
    (slotId: string): PlaceableConfig | null => {
      const slot = getItem(slotId);
      if (!slot) return null;

      const config = slot.item.metadata?.placeableConfig as PlaceableConfig | undefined;
      return config ?? null;
    },
    [getItem]
  );

  /**
   * Check if an item is placeable (returns config if true)
   */
  const isPlaceable = useCallback(
    (slotId: string): PlaceableConfig | null => {
      return getPlaceableConfig(slotId);
    },
    [getPlaceableConfig]
  );

  /**
   * Start placement mode for a placeable item
   */
  const startPlacement = useCallback(
    (slotId: string): boolean => {
      const config = getPlaceableConfig(slotId);
      if (!config) return false;

      enterPlacementMode(slotId, config);
      return true;
    },
    [getPlaceableConfig, enterPlacementMode]
  );

  return {
    useConsumable,
    isPlaceable,
    getPlaceableConfig,
    startPlacement,
  };
}
