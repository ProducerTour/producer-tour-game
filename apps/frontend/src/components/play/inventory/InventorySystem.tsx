/**
 * InventorySystem - Rust-style inventory with horizontal 3-panel layout
 *
 * Layout: [PLAYER] [INVENTORY] [CONTEXT]
 * Bottom: [HOTBAR - full width]
 */

import { useState, useCallback, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useInventoryStore } from '../../../lib/economy/inventoryStore';
import { useCombatStore } from '../combat/useCombatStore';
import { PlayerPanel } from './PlayerPanel';
import { InventoryGrid } from './InventoryGrid';
import { ContextPanel } from './ContextPanel';
import { Hotbar } from './Hotbar';
import { ItemTooltip } from './ItemTooltip';
import { ItemContextMenu, ContextMenuPosition } from './ItemContextMenu';
import { useInventoryKeyboard } from './hooks/useInventoryKeyboard';
import { useInventoryDrag } from './hooks/useInventoryDrag';
import { useItemUsage } from './hooks/useItemUsage';
import { PANEL_COLORS } from './constants';
import type { InventorySystemProps, EquipmentSlotType, InventorySlot } from './types';

export function InventorySystem({ isOpen, onClose, avatarUrl }: InventorySystemProps) {
  // Inventory store actions
  const sortInventory = useInventoryStore((s) => s.sortInventory);
  const equipItem = useInventoryStore((s) => s.equipItem);
  const getItem = useInventoryStore((s) => s.getItem);
  const removeItem = useInventoryStore((s) => s.removeItem);
  const addItem = useInventoryStore((s) => s.addItem);

  // Hotbar from store (shared with HotbarHUD)
  const hotbarSlots = useInventoryStore((s) => s.hotbarSlots);
  const moveToHotbar = useInventoryStore((s) => s.moveToHotbar);

  // Combat store for weapon sync
  const setWeapon = useCombatStore((s) => s.setWeapon);

  // Item usage (consumables, placeables)
  const { useConsumable, isPlaceable, startPlacement } = useItemUsage();

  // Drag state
  const {
    dragState,
    startDrag,
    cancelDrag,
    setSplitting,
    dropOnInventory,
    dropOnEquipment,
    dropOnHotbar,
    dropFromHotbarToInventory,
    unequipToInventory,
  } = useInventoryDrag();

  // Active hotbar slot (local state for selection highlighting)
  const [activeHotbarSlot, setActiveHotbarSlot] = useState(0);

  // Tooltip state
  const [tooltipItem] = useState<{
    item: InventorySlot['item'];
    quantity: number;
    equipped: boolean;
    position: { x: number; y: number };
  } | null>(null);

  // Selected item for context panel
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    isVisible: boolean;
    position: ContextMenuPosition | null;
    slotId: string | null;
    slot: InventorySlot | null;
  }>({
    isVisible: false,
    position: null,
    slotId: null,
    slot: null,
  });

  // Handle sort
  const handleSort = useCallback(
    (by: 'name' | 'type' | 'rarity' | 'value') => {
      sortInventory(by);
    },
    [sortInventory]
  );

  // Handle drop
  const handleDrop = useCallback(() => {
    if (selectedSlotId) {
      console.log('Drop item:', selectedSlotId);
      setSelectedSlotId(null);
    }
  }, [selectedSlotId]);

  // Handle hotbar use
  const handleHotbarUse = useCallback(
    (index: number) => {
      setActiveHotbarSlot(index);
      const slot = hotbarSlots[index];
      if (slot) {
        if (slot.item.type === 'consumable') {
          // For consumables in hotbar, we need to handle them differently
          // since they're no longer in the inventory slots Map
          console.log('Used consumable from hotbar:', slot.item.name);
        } else if (slot.item.type === 'weapon') {
          const weaponType = slot.item.metadata?.weaponType as 'rifle' | 'pistol' | undefined;
          if (weaponType) {
            setWeapon(weaponType);
          }
        }
      }
    },
    [hotbarSlots, setWeapon]
  );

  // Handle hotbar drop (drag from inventory to hotbar)
  const handleHotbarDrop = useCallback(
    (index: number) => {
      dropOnHotbar(index);
    },
    [dropOnHotbar]
  );

  // Context menu handlers
  const handleContextMenuOpen = useCallback(
    (slotId: string, slot: InventorySlot, position: { x: number; y: number }) => {
      setContextMenu({
        isVisible: true,
        position,
        slotId,
        slot,
      });
      setSelectedSlotId(slotId);
    },
    []
  );

  const handleContextMenuClose = useCallback(() => {
    setContextMenu({
      isVisible: false,
      position: null,
      slotId: null,
      slot: null,
    });
  }, []);

  const handleContextMenuUse = useCallback(
    (slotId: string) => {
      const slot = getItem(slotId);
      if (!slot) return;

      if (slot.item.type === 'consumable') {
        useConsumable(slotId);
      } else if (isPlaceable(slotId)) {
        startPlacement(slotId);
        onClose();
      }
    },
    [getItem, useConsumable, isPlaceable, startPlacement, onClose]
  );

  const handleContextMenuDrop = useCallback(
    (slotId: string, quantity: number) => {
      // Remove items from inventory (dropped on ground)
      removeItem(slotId, quantity);
      console.log(`Dropped ${quantity} item(s) from slot ${slotId}`);
    },
    [removeItem]
  );

  const handleContextMenuSplit = useCallback(
    (slotId: string, quantity: number) => {
      const slot = getItem(slotId);
      if (!slot || !slot.item.stackable || slot.quantity <= 1) return;

      // Remove the split quantity from the original stack
      removeItem(slotId, quantity);

      // Add as a new stack
      addItem(slot.item, quantity);
      console.log(`Split ${quantity} from slot ${slotId}`);
    },
    [getItem, removeItem, addItem]
  );

  const handleContextMenuAssignHotbar = useCallback(
    (slotId: string, hotbarIndex: number) => {
      moveToHotbar(slotId, hotbarIndex);
    },
    [moveToHotbar]
  );

  // Keyboard handler
  useInventoryKeyboard({
    isOpen,
    onToggle: () => {},
    onClose,
    onSort: () => handleSort('rarity'),
    onDrop: handleDrop,
    onHotbarUse: handleHotbarUse,
    onSplitStart: () => setSplitting(true),
    onSplitEnd: () => setSplitting(false),
  });

  // Handle grid drag start
  const handleGridDragStart = useCallback(
    (slotId: string, slot: InventorySlot) => {
      startDrag(slotId, slot, 'inventory', { x: 0, y: 0 });
      setSelectedSlotId(slotId);
    },
    [startDrag]
  );

  // Handle hotbar drag start
  const handleHotbarDragStart = useCallback(
    (slotId: string, slot: InventorySlot) => {
      startDrag(slotId, slot, 'hotbar', { x: 0, y: 0 });
    },
    [startDrag]
  );

  // Handle grid drag end
  const handleGridDragEnd = useCallback(() => {
    // If dragging from hotbar and dropped on inventory area, move to inventory
    if (dragState.dragSource === 'hotbar') {
      dropFromHotbarToInventory();
    } else {
      cancelDrag();
    }
  }, [cancelDrag, dragState.dragSource, dropFromHotbarToInventory]);

  // Handle grid drop
  const handleGridDrop = useCallback(
    (targetSlotId: string) => {
      // If dragging from hotbar, move to inventory (ignore specific target slot)
      if (dragState.dragSource === 'hotbar') {
        dropFromHotbarToInventory();
      } else {
        dropOnInventory(targetSlotId);
      }
    },
    [dropOnInventory, dragState.dragSource, dropFromHotbarToInventory]
  );

  // Handle double-click
  const handleDoubleClick = useCallback(
    (slotId: string) => {
      const slot = getItem(slotId);
      if (!slot) return;

      if (slot.item.type === 'weapon') {
        equipItem(slotId, 'primaryWeapon');
        const weaponType = slot.item.metadata?.weaponType as 'rifle' | 'pistol' | undefined;
        if (weaponType) {
          setWeapon(weaponType);
        }
      } else if (slot.item.type === 'armor') {
        const armorSlot = slot.item.metadata?.slot as EquipmentSlotType | undefined;
        if (armorSlot) {
          equipItem(slotId, armorSlot);
        }
      } else if (slot.item.type === 'consumable') {
        // Use the consumable (apply effect, remove from inventory)
        useConsumable(slotId);
      } else if (isPlaceable(slotId)) {
        // Enter placement mode and close inventory
        startPlacement(slotId);
        onClose();
      }
    },
    [getItem, equipItem, setWeapon, useConsumable, isPlaceable, startPlacement, onClose]
  );

  // Handle equipment drop
  const handleEquipDrop = useCallback(
    (slotType: EquipmentSlotType) => {
      const success = dropOnEquipment(slotType);

      if (success && dragState.draggedItem?.item.type === 'weapon') {
        const weaponType = dragState.draggedItem.item.metadata?.weaponType as 'rifle' | 'pistol' | undefined;
        if (weaponType && (slotType === 'primaryWeapon' || slotType === 'secondaryWeapon')) {
          if (slotType === 'primaryWeapon') {
            setWeapon(weaponType);
          }
        }
      }
    },
    [dropOnEquipment, dragState.draggedItem, setWeapon]
  );

  // Handle unequip
  const handleUnequip = useCallback(
    (slotType: EquipmentSlotType) => {
      unequipToInventory(slotType);
      if (slotType === 'primaryWeapon') {
        setWeapon('none');
      }
    },
    [unequipToInventory, setWeapon]
  );

  // Calculate drop target for equipment slots
  const equipDropTarget = useMemo((): EquipmentSlotType | null => {
    if (!dragState.isDragging || !dragState.dropTarget) return null;
    const equipSlots: EquipmentSlotType[] = [
      'head', 'chest', 'hands', 'legs', 'feet', 'primaryWeapon', 'secondaryWeapon'
    ];
    if (equipSlots.includes(dragState.dropTarget as EquipmentSlotType)) {
      return dragState.dropTarget as EquipmentSlotType;
    }
    return null;
  }, [dragState.isDragging, dragState.dropTarget]);

  // Get selected item for context panel
  const selectedItem = selectedSlotId ? (getItem(selectedSlotId) ?? null) : null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex flex-col"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Main Content Area */}
          <div className="relative flex-1 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.2 }}
              className="flex gap-1 max-w-7xl w-full h-[600px]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Left Panel - PLAYER */}
              <PlayerPanel
                avatarUrl={avatarUrl}
                dropTargetSlotType={equipDropTarget}
                onEquipDrop={handleEquipDrop}
                onUnequip={handleUnequip}
              />

              {/* Center Panel - INVENTORY */}
              <div className={`flex-1 flex flex-col ${PANEL_COLORS.background} ${PANEL_COLORS.border} border rounded-sm overflow-hidden`}>
                {/* Header */}
                <div className={`flex items-center justify-between px-4 py-2 ${PANEL_COLORS.header} border-b ${PANEL_COLORS.border}`}>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${PANEL_COLORS.text}`}>INVENTORY</span>
                    <span className={`text-xs ${PANEL_COLORS.textMuted}`}>&gt;</span>
                  </div>
                </div>

                {/* Grid */}
                <div className="flex-1 p-3 overflow-auto">
                  <InventoryGrid
                    dropTargetSlotId={dragState.dropTarget}
                    onDragStart={handleGridDragStart}
                    onDragEnd={handleGridDragEnd}
                    onDrop={handleGridDrop}
                    onDoubleClick={handleDoubleClick}
                    onSelect={setSelectedSlotId}
                    selectedSlotId={selectedSlotId}
                    onContextMenu={handleContextMenuOpen}
                  />
                </div>

                {/* Footer */}
                <div className={`flex items-center justify-between px-4 py-2 ${PANEL_COLORS.header} border-t ${PANEL_COLORS.border}`}>
                  <span className={`text-xs ${PANEL_COLORS.textMuted}`}>F2 &gt; More Options (Deep Inventory)</span>
                </div>
              </div>

              {/* Right Panel - CONTEXT */}
              <ContextPanel
                selectedItem={selectedItem}
                onSort={handleSort}
              />
            </motion.div>
          </div>

          {/* Bottom - HOTBAR */}
          <Hotbar
            hotbarSlots={hotbarSlots}
            activeSlot={activeHotbarSlot}
            onUse={handleHotbarUse}
            isDragging={dragState.isDragging}
            onDrop={handleHotbarDrop}
            onDragStart={handleHotbarDragStart}
            onDragEnd={handleGridDragEnd}
            onContextMenu={handleContextMenuOpen}
          />

          {/* Item tooltip */}
          <ItemTooltip
            item={tooltipItem?.item ?? null}
            quantity={tooltipItem?.quantity ?? 0}
            equipped={tooltipItem?.equipped ?? false}
            position={tooltipItem?.position ?? null}
            isVisible={!!tooltipItem}
          />

          {/* Context menu */}
          <ItemContextMenu
            isVisible={contextMenu.isVisible}
            position={contextMenu.position}
            slot={contextMenu.slot}
            slotId={contextMenu.slotId}
            onClose={handleContextMenuClose}
            onUse={handleContextMenuUse}
            onDrop={handleContextMenuDrop}
            onSplit={handleContextMenuSplit}
            onAssignHotbar={handleContextMenuAssignHotbar}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default InventorySystem;
