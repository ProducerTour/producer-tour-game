/**
 * Inventory UI Type Definitions
 */

import type { Item, InventorySlot } from '../../../lib/economy/inventoryStore';

// Re-export for convenience
export type { Item, InventorySlot };

/**
 * Equipment slot types that can hold items
 */
export type EquipmentSlotType =
  | 'head'
  | 'chest'
  | 'hands'
  | 'legs'
  | 'feet'
  | 'primaryWeapon'
  | 'secondaryWeapon';

/**
 * Drag source types
 */
export type DragSource = 'inventory' | 'equipment' | 'hotbar';

/**
 * Drag state for inventory interactions
 */
export interface DragState {
  isDragging: boolean;
  draggedSlotId: string | null;
  draggedItem: InventorySlot | null;
  dragSource: DragSource | null;
  dropTarget: string | null;
  dragPosition: { x: number; y: number };
  isSplitting: boolean;
}

/**
 * Inventory system props
 */
export interface InventorySystemProps {
  isOpen: boolean;
  onClose: () => void;
  avatarUrl?: string;
}

/**
 * Grid slot props
 */
export interface GridSlotProps {
  slotId: string;
  slot: InventorySlot | null;
  index: number;
  isDropTarget: boolean;
  onDragStart: (slotId: string, slot: InventorySlot) => void;
  onDragEnd: () => void;
  onDrop: (targetSlotId: string) => void;
  onDoubleClick: (slotId: string) => void;
}

/**
 * Equipment slot props
 */
export interface EquipmentSlotProps {
  slotType: EquipmentSlotType;
  slot: InventorySlot | null;
  isDropTarget: boolean;
  onDragStart: (slotId: string, slot: InventorySlot) => void;
  onDragEnd: () => void;
  onDrop: (slotType: EquipmentSlotType) => void;
  onUnequip: (slotType: EquipmentSlotType) => void;
}

/**
 * Hotbar slot props
 */
export interface HotbarSlotProps {
  index: number;
  slotId: string | null;
  slot: InventorySlot | null;
  isActive: boolean;
  onUse: (slotId: string) => void;
  onAssign: (hotbarIndex: number, slotId: string) => void;
}

/**
 * Item tooltip data
 */
export interface TooltipData {
  item: Item;
  quantity: number;
  equipped: boolean;
  position: { x: number; y: number };
}
