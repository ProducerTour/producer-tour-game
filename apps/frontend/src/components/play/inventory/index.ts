/**
 * Inventory System - Rust + GTA V style inventory UI
 *
 * Usage:
 * ```tsx
 * import { InventorySystem } from '@/components/play/inventory';
 *
 * function PlayPage() {
 *   const [inventoryOpen, setInventoryOpen] = useState(false);
 *
 *   return (
 *     <>
 *       <Canvas>...</Canvas>
 *       <InventorySystem
 *         isOpen={inventoryOpen}
 *         onClose={() => setInventoryOpen(false)}
 *         avatarUrl="https://models.readyplayer.me/..."
 *       />
 *     </>
 *   );
 * }
 * ```
 *
 * Keyboard shortcuts:
 * - Tab / I: Toggle inventory
 * - Escape: Close inventory
 * - 1-9, 0: Use hotbar item
 * - R: Sort inventory
 * - X: Drop selected item
 * - Shift+Drag: Split stack
 */

// Main component
export { InventorySystem } from './InventorySystem';
export { default } from './InventorySystem';

// Sub-components (for customization)
export { InventoryPanel } from './InventoryPanel';
export { InventoryHeader } from './InventoryHeader';
export { InventoryGrid } from './InventoryGrid';
export { GridSlot } from './GridSlot';
export { EquipmentPanel } from './EquipmentPanel';
export { EquipmentSlot } from './EquipmentSlot';
export { PlayerPanel } from './PlayerPanel';
export { ContextPanel } from './ContextPanel';
export { ItemTooltip } from './ItemTooltip';
export { Hotbar } from './Hotbar';

// Hooks
export { useInventoryDrag } from './hooks/useInventoryDrag';
export { useInventoryKeyboard } from './hooks/useInventoryKeyboard';

// Types
export type {
  InventorySystemProps,
  EquipmentSlotType,
  DragSource,
  DragState,
  GridSlotProps,
  EquipmentSlotProps,
  HotbarSlotProps,
  TooltipData,
} from './types';

// Constants
export {
  RARITY_COLORS,
  SLOT_STYLES,
  EQUIPMENT_SLOT_POSITIONS,
  EQUIPMENT_SLOT_LABELS,
  EQUIPMENT_SLOT_ACCEPTS,
  GRID_CONFIG,
  HOTBAR_CONFIG,
  KEYBINDS,
} from './constants';
