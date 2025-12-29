/**
 * useInventoryDrag - Local drag state management for inventory
 *
 * Drag state is kept LOCAL (not in Zustand) because:
 * - High frequency updates during drag (60fps)
 * - Transient UI state, not game state
 * - Store updates only happen on successful drop
 */

import { useState, useCallback, useRef } from 'react';
import type { DragState, DragSource, InventorySlot, EquipmentSlotType } from '../types';
import { useInventoryStore } from '../../../../lib/economy/inventoryStore';
import { EQUIPMENT_SLOT_ACCEPTS } from '../constants';

const initialDragState: DragState = {
  isDragging: false,
  draggedSlotId: null,
  draggedItem: null,
  dragSource: null,
  dropTarget: null,
  dragPosition: { x: 0, y: 0 },
  isSplitting: false,
};

export function useInventoryDrag() {
  const [dragState, setDragState] = useState<DragState>(initialDragState);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  // Store actions
  const moveItem = useInventoryStore((s) => s.moveItem);
  const equipItem = useInventoryStore((s) => s.equipItem);
  const unequipItem = useInventoryStore((s) => s.unequipItem);
  const equippedItems = useInventoryStore((s) => s.equippedItems);
  const moveToHotbar = useInventoryStore((s) => s.moveToHotbar);
  const moveFromHotbar = useInventoryStore((s) => s.moveFromHotbar);

  /**
   * Start dragging an item
   */
  const startDrag = useCallback(
    (slotId: string, slot: InventorySlot, source: DragSource, position: { x: number; y: number }) => {
      setDragState({
        isDragging: true,
        draggedSlotId: slotId,
        draggedItem: slot,
        dragSource: source,
        dropTarget: null,
        dragPosition: position,
        isSplitting: false,
      });
    },
    []
  );

  /**
   * Update drag position (called during drag)
   */
  const updateDragPosition = useCallback((position: { x: number; y: number }) => {
    setDragState((prev) => ({
      ...prev,
      dragPosition: position,
    }));
  }, []);

  /**
   * Set current drop target (for highlighting)
   */
  const setDropTarget = useCallback((targetId: string | null) => {
    setDragState((prev) => ({
      ...prev,
      dropTarget: targetId,
    }));
  }, []);

  /**
   * Enable/disable split mode (Shift held)
   */
  const setSplitting = useCallback((splitting: boolean) => {
    setDragState((prev) => ({
      ...prev,
      isSplitting: splitting,
    }));
  }, []);

  /**
   * Cancel drag without dropping
   */
  const cancelDrag = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    setDragState(initialDragState);
  }, []);

  /**
   * Check if a drop target is valid for the dragged item
   */
  const isValidDropTarget = useCallback(
    (targetSlotId: string, targetType: 'inventory' | 'equipment'): boolean => {
      if (!dragState.draggedItem) return false;

      // Dropping on equipment slot - check item type compatibility
      if (targetType === 'equipment') {
        const slotType = targetSlotId as EquipmentSlotType;
        const acceptedTypes = EQUIPMENT_SLOT_ACCEPTS[slotType];
        return acceptedTypes.includes(dragState.draggedItem.item.type);
      }

      // Dropping on inventory slot - always valid
      return true;
    },
    [dragState.draggedItem]
  );

  /**
   * Handle drop on inventory slot
   */
  const dropOnInventory = useCallback(
    (targetSlotId: string): boolean => {
      if (!dragState.draggedSlotId || !dragState.dragSource) return false;

      // If dragging from equipment, unequip first
      if (dragState.dragSource === 'equipment') {
        // Find which equipment slot this item is in
        for (const [equipSlot, slotId] of equippedItems) {
          if (slotId === dragState.draggedSlotId) {
            unequipItem(equipSlot);
            break;
          }
        }
      }

      // Move to target slot (handles stacking and swapping)
      const success = moveItem(dragState.draggedSlotId, targetSlotId);
      cancelDrag();
      return success;
    },
    [dragState, moveItem, unequipItem, equippedItems, cancelDrag]
  );

  /**
   * Handle drop on equipment slot
   */
  const dropOnEquipment = useCallback(
    (equipSlot: EquipmentSlotType): boolean => {
      if (!dragState.draggedSlotId || !dragState.draggedItem) return false;

      // Check if item type is valid for this slot
      if (!isValidDropTarget(equipSlot, 'equipment')) {
        cancelDrag();
        return false;
      }

      // If there's already an item equipped, swap them
      const currentEquipped = equippedItems.get(equipSlot);
      if (currentEquipped && currentEquipped !== dragState.draggedSlotId) {
        // Unequip current item first
        unequipItem(equipSlot);
      }

      // Equip the new item
      const success = equipItem(dragState.draggedSlotId, equipSlot);
      cancelDrag();
      return success;
    },
    [dragState, isValidDropTarget, equipItem, unequipItem, equippedItems, cancelDrag]
  );

  /**
   * Handle unequipping an item (drag from equipment to inventory)
   */
  const unequipToInventory = useCallback(
    (equipSlot: EquipmentSlotType): boolean => {
      const success = unequipItem(equipSlot);
      cancelDrag();
      return success;
    },
    [unequipItem, cancelDrag]
  );

  /**
   * Handle drop on hotbar slot
   * Moves the item from inventory to hotbar (not just a reference)
   */
  const dropOnHotbar = useCallback(
    (hotbarIndex: number): boolean => {
      if (!dragState.draggedSlotId || !dragState.draggedItem) {
        cancelDrag();
        return false;
      }

      // Move the item from inventory to hotbar
      const success = moveToHotbar(dragState.draggedSlotId, hotbarIndex);
      cancelDrag();
      return success;
    },
    [dragState, cancelDrag, moveToHotbar]
  );

  /**
   * Handle drop from hotbar to inventory
   * Moves the item from hotbar back to inventory grid
   */
  const dropFromHotbarToInventory = useCallback(
    (): boolean => {
      if (dragState.dragSource !== 'hotbar' || !dragState.draggedSlotId) {
        cancelDrag();
        return false;
      }

      // Extract hotbar index from synthetic slotId (e.g., "hotbar-0" -> 0)
      const hotbarIndex = parseInt(dragState.draggedSlotId.replace('hotbar-', ''), 10);
      if (isNaN(hotbarIndex)) {
        cancelDrag();
        return false;
      }

      // Move the item from hotbar back to inventory
      const success = moveFromHotbar(hotbarIndex);
      cancelDrag();
      return success;
    },
    [dragState, cancelDrag, moveFromHotbar]
  );

  /**
   * Long press handler for touch devices
   */
  const startLongPress = useCallback(
    (slotId: string, slot: InventorySlot, source: DragSource, position: { x: number; y: number }) => {
      longPressTimer.current = setTimeout(() => {
        // Haptic feedback if available
        if (navigator.vibrate) {
          navigator.vibrate(50);
        }
        startDrag(slotId, slot, source, position);
      }, 300);
    },
    [startDrag]
  );

  /**
   * Cancel long press (finger moved or lifted)
   */
  const cancelLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  return {
    dragState,
    startDrag,
    updateDragPosition,
    setDropTarget,
    setSplitting,
    cancelDrag,
    isValidDropTarget,
    dropOnInventory,
    dropOnEquipment,
    dropOnHotbar,
    dropFromHotbarToInventory,
    unequipToInventory,
    startLongPress,
    cancelLongPress,
  };
}
