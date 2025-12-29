/**
 * ItemContextMenu - Right-click context menu for inventory items
 * Options: Use, Split, Drop, Assign to Hotbar
 */

import React, { useCallback, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PANEL_COLORS } from './constants';
import type { InventorySlot } from './types';

export interface ContextMenuPosition {
  x: number;
  y: number;
}

export interface ItemContextMenuProps {
  isVisible: boolean;
  position: ContextMenuPosition | null;
  slot: InventorySlot | null;
  slotId: string | null;
  onClose: () => void;
  onUse: (slotId: string) => void;
  onDrop: (slotId: string, quantity: number) => void;
  onSplit: (slotId: string, quantity: number) => void;
  onAssignHotbar?: (slotId: string, hotbarIndex: number) => void;
}

interface SplitDialogProps {
  maxQuantity: number;
  onConfirm: (quantity: number) => void;
  onCancel: () => void;
}

function SplitDialog({ maxQuantity, onConfirm, onCancel }: SplitDialogProps) {
  const [quantity, setQuantity] = useState(Math.floor(maxQuantity / 2));

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuantity(parseInt(e.target.value, 10));
  };

  return (
    <div className="p-2 border-t border-[#3d4249]">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs text-[#8a8a8a]">Split:</span>
        <input
          type="range"
          min="1"
          max={maxQuantity - 1}
          value={quantity}
          onChange={handleSliderChange}
          className="flex-1 h-1 bg-[#3d4249] rounded-lg appearance-none cursor-pointer"
        />
        <span className="text-xs text-[#d4d4d4] w-8 text-right">{quantity}</span>
      </div>
      <div className="flex gap-1">
        <button
          onClick={() => onConfirm(quantity)}
          className="flex-1 px-2 py-1 text-[10px] bg-[#5a7a9a] hover:bg-[#6a8aaa] text-white rounded transition-colors"
        >
          Confirm
        </button>
        <button
          onClick={onCancel}
          className="flex-1 px-2 py-1 text-[10px] bg-[#3d4249] hover:bg-[#4d5259] text-[#8a8a8a] rounded transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export function ItemContextMenu({
  isVisible,
  position,
  slot,
  slotId,
  onClose,
  onUse,
  onDrop,
  onSplit,
  onAssignHotbar,
}: ItemContextMenuProps) {
  const [showSplitDialog, setShowSplitDialog] = useState(false);
  const [showHotbarSelect, setShowHotbarSelect] = useState(false);

  // Close menu when clicking outside
  useEffect(() => {
    if (!isVisible) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-context-menu]')) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isVisible, onClose]);

  // Reset dialogs when menu closes
  useEffect(() => {
    if (!isVisible) {
      setShowSplitDialog(false);
      setShowHotbarSelect(false);
    }
  }, [isVisible]);

  const handleUse = useCallback(() => {
    if (slotId) {
      onUse(slotId);
      onClose();
    }
  }, [slotId, onUse, onClose]);

  const handleDrop = useCallback(() => {
    if (slotId && slot) {
      onDrop(slotId, slot.quantity);
      onClose();
    }
  }, [slotId, slot, onDrop, onClose]);

  const handleSplitClick = useCallback(() => {
    setShowSplitDialog(true);
  }, []);

  const handleSplitConfirm = useCallback(
    (quantity: number) => {
      if (slotId) {
        onSplit(slotId, quantity);
        onClose();
      }
    },
    [slotId, onSplit, onClose]
  );

  const handleHotbarClick = useCallback(() => {
    setShowHotbarSelect(true);
  }, []);

  const handleHotbarSelect = useCallback(
    (index: number) => {
      if (slotId && onAssignHotbar) {
        onAssignHotbar(slotId, index);
        onClose();
      }
    },
    [slotId, onAssignHotbar, onClose]
  );

  if (!isVisible || !position || !slot) return null;

  const canUse = slot.item.type === 'consumable' || slot.item.type === 'material';
  const canSplit = slot.item.stackable && slot.quantity > 1;
  const itemName = slot.item.name;

  // Adjust position to keep menu on screen
  const menuWidth = 140;
  const menuHeight = 160;
  const adjustedX = Math.min(position.x, window.innerWidth - menuWidth - 10);
  const adjustedY = Math.min(position.y, window.innerHeight - menuHeight - 10);

  return (
    <AnimatePresence>
      <motion.div
        data-context-menu
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.1 }}
        className={`fixed z-[100] ${PANEL_COLORS.background} border ${PANEL_COLORS.border} rounded shadow-xl`}
        style={{
          left: adjustedX,
          top: adjustedY,
          minWidth: menuWidth,
        }}
      >
        {/* Header */}
        <div className={`px-3 py-2 border-b ${PANEL_COLORS.border} ${PANEL_COLORS.header}`}>
          <span className={`text-xs font-medium ${PANEL_COLORS.text} truncate block`}>
            {itemName}
          </span>
          <span className="text-[10px] text-[#5a6068]">
            {slot.quantity > 1 ? `x${slot.quantity}` : slot.item.type}
          </span>
        </div>

        {/* Actions */}
        {!showSplitDialog && !showHotbarSelect && (
          <div className="py-1">
            {canUse && (
              <ContextMenuItem label="Use" shortcut="E" onClick={handleUse} />
            )}
            {canSplit && (
              <ContextMenuItem label="Split" shortcut="Shift+Click" onClick={handleSplitClick} />
            )}
            {onAssignHotbar && (
              <ContextMenuItem label="Assign to Hotbar" onClick={handleHotbarClick} />
            )}
            <ContextMenuItem label="Drop" shortcut="X" onClick={handleDrop} variant="danger" />
          </div>
        )}

        {/* Split dialog */}
        {showSplitDialog && canSplit && (
          <SplitDialog
            maxQuantity={slot.quantity}
            onConfirm={handleSplitConfirm}
            onCancel={() => setShowSplitDialog(false)}
          />
        )}

        {/* Hotbar selection */}
        {showHotbarSelect && (
          <div className="p-2 border-t border-[#3d4249]">
            <span className="text-[10px] text-[#5a6068] block mb-2">Select slot:</span>
            <div className="grid grid-cols-6 gap-1">
              {Array.from({ length: 12 }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => handleHotbarSelect(i)}
                  className="w-6 h-6 text-[10px] bg-[#2a2d31] hover:bg-[#5a7a9a] text-[#8a8a8a] hover:text-white rounded transition-colors"
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowHotbarSelect(false)}
              className="w-full mt-2 px-2 py-1 text-[10px] bg-[#3d4249] hover:bg-[#4d5259] text-[#8a8a8a] rounded transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

interface ContextMenuItemProps {
  label: string;
  shortcut?: string;
  onClick: () => void;
  variant?: 'default' | 'danger';
}

function ContextMenuItem({ label, shortcut, onClick, variant = 'default' }: ContextMenuItemProps) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full px-3 py-1.5 flex items-center justify-between text-left
        ${variant === 'danger'
          ? 'text-[#ef4444] hover:bg-[#ef4444]/10'
          : 'text-[#d4d4d4] hover:bg-[#3d4249]'
        }
        transition-colors
      `}
    >
      <span className="text-xs">{label}</span>
      {shortcut && (
        <span className="text-[10px] text-[#5a6068]">{shortcut}</span>
      )}
    </button>
  );
}

export default ItemContextMenu;
