/**
 * useHotbarSelection - Handle number key presses for hotbar slot selection
 *
 * Features:
 * - Press 1-9 to select hotbar slots 1-9 (0 for slot 10)
 * - Press same number again to put away/deselect
 * - Automatically switches weapons when selecting weapon slots
 * - Puts away weapons when selecting non-weapon items (e.g., campfire)
 * - Use items with E key (consumables apply effect, placeables enter placement mode)
 */

import { useEffect, useCallback } from 'react';
import { useInventoryStore } from '../../../lib/economy/inventoryStore';
import { useCombatStore } from '../combat/useCombatStore';
import { usePlacementStore } from '../../../lib/economy/usePlacementStore';
import { useFlashlightStore } from '../../../stores/useFlashlightStore';
import type { ConsumableEffect, PlaceableConfig } from '../../../lib/economy/itemEffects';

/** Light configuration from flashlight item metadata */
interface LightConfig {
  type: 'spotlight';
  color: string;
  intensity: number;
  distance: number;
  angle: number;
  penumbra: number;
}

interface UseHotbarSelectionOptions {
  /** Whether hotbar selection is enabled (disable during menus, chat, etc.) */
  enabled?: boolean;
}

export function useHotbarSelection({ enabled = true }: UseHotbarSelectionOptions = {}) {
  const toggleHotbarSlot = useInventoryStore((s) => s.toggleHotbarSlot);
  const setHotbarSlot = useInventoryStore((s) => s.setHotbarSlot);
  const hotbarSlots = useInventoryStore((s) => s.hotbarSlots);
  const activeHotbarSlot = useInventoryStore((s) => s.activeHotbarSlot);

  const setWeapon = useCombatStore((s) => s.setWeapon);
  const heal = useCombatStore((s) => s.heal);

  const enterPlacementMode = usePlacementStore((s) => s.enterPlacementMode);
  const exitPlacementMode = usePlacementStore((s) => s.exitPlacementMode);
  const isPlacementMode = usePlacementStore((s) => s.isPlacementMode);

  // Flashlight state
  const toggleFlashlight = useFlashlightStore((s) => s.toggle);
  const setLightConfig = useFlashlightStore((s) => s.setLightConfig);
  const clearLightConfig = useFlashlightStore((s) => s.clearLightConfig);

  // Handle hotbar slot selection and weapon switching
  const selectHotbarSlot = useCallback(
    (slotIndex: number) => {
      const currentActiveSlot = useInventoryStore.getState().activeHotbarSlot;
      const slot = hotbarSlots[slotIndex];

      // If pressing the same slot, toggle off (put away)
      if (currentActiveSlot === slotIndex) {
        toggleHotbarSlot(slotIndex);
        // Put away any weapon
        setWeapon('none');
        // Clear flashlight config when unequipping
        clearLightConfig();
        // Exit placement mode if active
        if (isPlacementMode) {
          exitPlacementMode();
        }
        return;
      }

      // Select the new slot
      toggleHotbarSlot(slotIndex);

      // Handle weapon switching based on item type
      if (slot?.item) {
        if (slot.item.type === 'weapon') {
          // It's a weapon - equip it
          const weaponType = slot.item.metadata?.weaponType as 'rifle' | 'pistol' | undefined;
          if (weaponType) {
            setWeapon(weaponType);
          }
          // Clear flashlight when switching to weapon
          clearLightConfig();
          // Exit placement mode if switching to weapon
          if (isPlacementMode) {
            exitPlacementMode();
          }
        } else {
          // It's not a weapon (e.g., campfire, consumable) - put away any equipped weapon
          setWeapon('none');

          // Check if it's a flashlight item
          const lightConfig = slot.item.metadata?.lightConfig as LightConfig | undefined;
          if (lightConfig) {
            setLightConfig(lightConfig);
          } else {
            clearLightConfig();
          }

          // Check if it's a placeable item - enter placement mode immediately
          const placeableConfig = slot.item.metadata?.placeableConfig as PlaceableConfig | undefined;
          if (placeableConfig) {
            const syntheticSlotId = `hotbar-${slotIndex}`;
            enterPlacementMode(syntheticSlotId, placeableConfig);
            console.log(`🏗️ Entering placement mode for ${slot.item.name}`);
          } else if (isPlacementMode) {
            // Exit placement mode if switching to non-placeable
            exitPlacementMode();
          }
        }
      } else {
        // Empty slot - put away weapon and clear flashlight
        setWeapon('none');
        clearLightConfig();
        // Exit placement mode if switching to empty slot
        if (isPlacementMode) {
          exitPlacementMode();
        }
      }
    },
    [hotbarSlots, toggleHotbarSlot, setWeapon, setLightConfig, clearLightConfig, isPlacementMode, enterPlacementMode, exitPlacementMode]
  );

  /**
   * Use the currently selected hotbar item
   * - Consumables: apply effect and decrement quantity
   * - Placeables: enter placement mode
   * - Flashlight: toggle on/off
   * Returns true if item was used
   */
  const useActiveItem = useCallback((): boolean => {
    const activeSlot = useInventoryStore.getState().activeHotbarSlot;
    if (activeSlot < 0) return false;

    const slot = useInventoryStore.getState().hotbarSlots[activeSlot];
    if (!slot?.item) return false;

    const item = slot.item;

    // Handle flashlight toggle (check first before other types)
    const lightConfig = item.metadata?.lightConfig as LightConfig | undefined;
    if (lightConfig) {
      toggleFlashlight();
      const isNowOn = !useFlashlightStore.getState().isOn; // Will be toggled
      console.log(`🔦 Flashlight ${isNowOn ? 'OFF' : 'ON'}`);
      return true;
    }

    // Handle consumables
    if (item.type === 'consumable') {
      const effect = item.metadata?.consumableEffect as ConsumableEffect | undefined;
      if (!effect) {
        console.warn(`Consumable ${item.name} has no effect defined`);
        return false;
      }

      // Apply effect based on type
      switch (effect.type) {
        case 'heal':
          heal(effect.value);
          console.log(`Used ${item.name}: +${effect.value} HP`);
          break;

        case 'healOverTime':
          // Apply instant heal for now (TODO: implement HoT)
          heal(effect.value);
          console.log(`Used ${item.name}: +${effect.value} HP over time`);
          break;

        case 'stamina':
          console.log(`Used ${item.name}: +${effect.value} Stamina`);
          break;

        case 'buff':
          console.log(`Used ${item.name}: Buff activated for ${effect.duration}ms`);
          break;

        case 'cure':
          console.log(`Used ${item.name}: Debuffs cured`);
          break;

        default:
          console.warn(`Unknown effect type: ${effect.type}`);
          return false;
      }

      // Decrement quantity or remove from hotbar
      if (slot.quantity > 1) {
        setHotbarSlot(activeSlot, { ...slot, quantity: slot.quantity - 1 });
      } else {
        // Last one - clear the slot and deselect
        setHotbarSlot(activeSlot, null);
        toggleHotbarSlot(activeSlot); // Deselect
      }

      return true;
    }

    // Handle placeables
    const placeableConfig = item.metadata?.placeableConfig as PlaceableConfig | undefined;
    if (placeableConfig) {
      // Enter placement mode with a synthetic slot ID
      const syntheticSlotId = `hotbar-${activeSlot}`;
      enterPlacementMode(syntheticSlotId, placeableConfig);
      console.log(`🏗️ Entering placement mode for ${item.name}`);
      return true;
    }

    // Debug: item has no usable effect
    console.log(`⚠️ Item "${item.name}" (type: ${item.type}) cannot be used - no consumable effect, placeable config, or light config`, item.metadata);
    return false;
  }, [heal, setHotbarSlot, toggleHotbarSlot, enterPlacementMode, toggleFlashlight]);

  // Handle keyboard input
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const key = e.code;

      // E key to use active item (only if not a weapon and not in placement mode)
      if (key === 'KeyE' && !isPlacementMode) {
        const activeSlot = useInventoryStore.getState().activeHotbarSlot;
        if (activeSlot >= 0) {
          const slot = useInventoryStore.getState().hotbarSlots[activeSlot];
          // Only use E for non-weapon items
          if (slot?.item && slot.item.type !== 'weapon') {
            e.preventDefault();
            useActiveItem();
            return;
          }
        }
      }

      // Check for number keys 1-9 and 0
      let slotIndex = -1;

      if (key === 'Digit1') slotIndex = 0;
      else if (key === 'Digit2') slotIndex = 1;
      else if (key === 'Digit3') slotIndex = 2;
      else if (key === 'Digit4') slotIndex = 3;
      else if (key === 'Digit5') slotIndex = 4;
      else if (key === 'Digit6') slotIndex = 5;
      else if (key === 'Digit7') slotIndex = 6;
      else if (key === 'Digit8') slotIndex = 7;
      else if (key === 'Digit9') slotIndex = 8;
      else if (key === 'Digit0') slotIndex = 9; // Slot 10

      if (slotIndex >= 0) {
        e.preventDefault();
        selectHotbarSlot(slotIndex);
      }
    },
    [enabled, selectHotbarSlot, useActiveItem, isPlacementMode]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // Get current slot info
  const currentSlot = activeHotbarSlot >= 0 ? hotbarSlots[activeHotbarSlot] : null;

  // Return useful state for components
  return {
    activeHotbarSlot,
    selectHotbarSlot,
    useActiveItem,
    /** Whether the currently selected item is a weapon */
    isWeaponSelected: currentSlot?.item?.type === 'weapon',
    /** Whether the currently selected item is a consumable */
    isConsumableSelected: currentSlot?.item?.type === 'consumable',
    /** Whether the currently selected item is a placeable */
    isPlaceableSelected: currentSlot?.item?.metadata?.placeableConfig !== undefined,
    /** Whether the currently selected item is a flashlight */
    isFlashlightSelected: currentSlot?.item?.metadata?.lightConfig !== undefined,
    /** Whether the currently selected item is usable (not a weapon) */
    isUsableSelected: currentSlot?.item && currentSlot.item.type !== 'weapon',
    /** Get the currently selected item */
    selectedItem: currentSlot,
  };
}

export default useHotbarSelection;
