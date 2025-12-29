/**
 * useInventoryKeyboard - Keyboard shortcut handling for inventory
 */

import { useEffect, useCallback } from 'react';
import { KEYBINDS } from '../constants';

interface UseInventoryKeyboardProps {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  onSort: () => void;
  onDrop: () => void;
  onHotbarUse: (index: number) => void;
  onSplitStart: () => void;
  onSplitEnd: () => void;
}

export function useInventoryKeyboard({
  isOpen,
  onToggle,
  onClose,
  onSort,
  onDrop,
  onHotbarUse,
  onSplitStart,
  onSplitEnd,
}: UseInventoryKeyboardProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Toggle inventory (Tab or I)
      if (KEYBINDS.toggle.includes(e.code)) {
        e.preventDefault();
        onToggle();
        return;
      }

      // Close inventory (Escape) - only when open
      if (isOpen && KEYBINDS.close.includes(e.code)) {
        e.preventDefault();
        onClose();
        return;
      }

      // Sort inventory (R) - only when open
      if (isOpen && KEYBINDS.sort.includes(e.code)) {
        e.preventDefault();
        onSort();
        return;
      }

      // Drop selected item (X) - only when open
      if (isOpen && KEYBINDS.drop.includes(e.code)) {
        e.preventDefault();
        onDrop();
        return;
      }

      // Split stack (Shift) - only when open
      if (isOpen && KEYBINDS.split.includes(e.code)) {
        e.preventDefault();
        onSplitStart();
        return;
      }

      // Hotbar shortcuts (1-9, 0)
      if (KEYBINDS.hotbar.includes(e.code)) {
        e.preventDefault();
        const digit = parseInt(e.code.slice(5), 10);
        // 0 key = slot 9, otherwise digit - 1
        const index = digit === 0 ? 9 : digit - 1;
        onHotbarUse(index);
        return;
      }
    },
    [isOpen, onToggle, onClose, onSort, onDrop, onHotbarUse, onSplitStart]
  );

  const handleKeyUp = useCallback(
    (e: KeyboardEvent) => {
      // End split mode when Shift is released
      if (KEYBINDS.split.includes(e.code)) {
        onSplitEnd();
      }
    },
    [onSplitEnd]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);
}
