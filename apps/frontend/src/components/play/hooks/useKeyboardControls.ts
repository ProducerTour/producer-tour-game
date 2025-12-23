import { useEffect, useState, useCallback, useRef } from 'react';
import { useKeybindsStore } from '../settings';

export interface KeyState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  sprint: boolean;
  jump: boolean;
  jumpPressed: boolean; // True only on the frame jump key is pressed (edge detection)
  dance: boolean;
  dancePressed: boolean; // True only on the frame dance key is pressed (for cycling)
  toggleWeapon: boolean;
  crouch: boolean;
  aim: boolean;     // Right mouse button held
  fire: boolean;    // Left mouse button pressed
}

// Input buffer for responsive combat
// Allows inputs to be "queued" and consumed within a time window
export interface BufferedInput {
  action: string;
  time: number;
}

// Buffer window in milliseconds - inputs are valid for this duration
const BUFFER_WINDOW = 150;

export interface KeyboardControlsResult extends KeyState {
  /** Buffer an input action for later consumption */
  bufferInput: (action: string) => void;
  /** Try to consume a buffered input, returns true if found */
  consumeBuffer: (action: string) => boolean;
  /** Check if an action is in the buffer (without consuming) */
  hasBufferedInput: (action: string) => boolean;
}

export function useKeyboardControls(): KeyboardControlsResult {
  const [keys, setKeys] = useState<KeyState>({
    forward: false,
    backward: false,
    left: false,
    right: false,
    sprint: false,
    jump: false,
    jumpPressed: false,
    dance: false,
    dancePressed: false,
    toggleWeapon: false,
    crouch: false,
    aim: false,
    fire: false,
  });

  // Refs to clear edge-detected states after one frame
  const jumpPressedTimeout = useRef<number | null>(null);
  const dancePressedTimeout = useRef<number | null>(null);

  // Get keybinds check function from store
  const isAction = useKeybindsStore((state) => state.isAction);

  // Input buffer for combat/action inputs
  const inputBuffer = useRef<BufferedInput[]>([]);

  // Buffer an input action
  const bufferInput = useCallback((action: string) => {
    const now = Date.now();
    inputBuffer.current.push({ action, time: now });
    // Clean old inputs
    inputBuffer.current = inputBuffer.current.filter(
      i => now - i.time < BUFFER_WINDOW
    );
  }, []);

  // Try to consume a buffered input
  const consumeBuffer = useCallback((action: string): boolean => {
    const now = Date.now();
    // Clean expired inputs first
    inputBuffer.current = inputBuffer.current.filter(
      i => now - i.time < BUFFER_WINDOW
    );

    const idx = inputBuffer.current.findIndex(i => i.action === action);
    if (idx !== -1) {
      inputBuffer.current.splice(idx, 1);
      return true;
    }
    return false;
  }, []);

  // Check if an action is buffered (without consuming)
  const hasBufferedInput = useCallback((action: string): boolean => {
    const now = Date.now();
    return inputBuffer.current.some(
      i => i.action === action && now - i.time < BUFFER_WINDOW
    );
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Ignore if typing in an input
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }

    const code = e.code;

    // Check each action against customizable keybinds
    if (isAction('moveForward', code)) {
      e.preventDefault();
      setKeys((k) => ({ ...k, forward: true }));
    }
    if (isAction('moveBackward', code)) {
      e.preventDefault();
      setKeys((k) => ({ ...k, backward: true }));
    }
    if (isAction('moveLeft', code)) {
      e.preventDefault();
      setKeys((k) => ({ ...k, left: true }));
    }
    if (isAction('moveRight', code)) {
      e.preventDefault();
      setKeys((k) => ({ ...k, right: true }));
    }
    if (isAction('sprint', code)) {
      e.preventDefault();
      setKeys((k) => ({ ...k, sprint: true }));
    }
    if (isAction('jump', code)) {
      e.preventDefault();
      // Edge detection: only set jumpPressed if jump wasn't already held
      setKeys((k) => {
        if (k.jump) return k; // Already held, don't trigger again
        return { ...k, jump: true, jumpPressed: true };
      });
      // Clear jumpPressed after one frame (edge detection - fires once per press)
      if (jumpPressedTimeout.current) {
        clearTimeout(jumpPressedTimeout.current);
      }
      jumpPressedTimeout.current = window.setTimeout(() => {
        setKeys((k) => ({ ...k, jumpPressed: false }));
      }, 50); // 50ms is enough for one frame at 60fps
    }
    if (isAction('dance', code)) {
      e.preventDefault();
      // Dance is a toggle - pressing V starts dancing, keeps dancing while pressing V again (for cycling)
      // Moving will exit dance mode (handled in PhysicsPlayerController)
      setKeys((k) => ({
        ...k,
        dance: true, // Always set to true - moving will reset it
        dancePressed: true, // For cycling detection
      }));
      // Clear dancePressed after one frame (for edge detection)
      if (dancePressedTimeout.current) {
        clearTimeout(dancePressedTimeout.current);
      }
      dancePressedTimeout.current = window.setTimeout(() => {
        setKeys((k) => ({ ...k, dancePressed: false }));
      }, 50); // 50ms is enough for one frame at 60fps
    }
    if (isAction('toggleWeapon', code)) {
      e.preventDefault();
      setKeys((k) => ({ ...k, toggleWeapon: true }));
    }
    if (isAction('crouch', code)) {
      e.preventDefault();
      // Toggle crouch on press (not hold)
      setKeys((k) => ({ ...k, crouch: !k.crouch }));
    }
  }, [isAction]);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    const code = e.code;

    if (isAction('moveForward', code)) {
      setKeys((k) => ({ ...k, forward: false }));
    }
    if (isAction('moveBackward', code)) {
      setKeys((k) => ({ ...k, backward: false }));
    }
    if (isAction('moveLeft', code)) {
      setKeys((k) => ({ ...k, left: false }));
    }
    if (isAction('moveRight', code)) {
      setKeys((k) => ({ ...k, right: false }));
    }
    if (isAction('sprint', code)) {
      setKeys((k) => ({ ...k, sprint: false }));
    }
    if (isAction('jump', code)) {
      setKeys((k) => ({ ...k, jump: false }));
    }
    // Dance is a toggle - don't reset on keyup, let movement reset it
    // if (isAction('dance', code)) {
    //   setKeys((k) => ({ ...k, dance: false }));
    // }
    if (isAction('toggleWeapon', code)) {
      setKeys((k) => ({ ...k, toggleWeapon: false }));
    }
    // Crouch is a toggle, no action on keyup
  }, [isAction]);

  // Mouse handlers for aim (right-click) and fire (left-click)
  const handleMouseDown = useCallback((e: MouseEvent) => {
    // Right-click = aim
    if (e.button === 2) {
      e.preventDefault();
      setKeys((k) => ({ ...k, aim: true }));
    }
    // Left-click = fire
    if (e.button === 0) {
      setKeys((k) => ({ ...k, fire: true }));
    }
  }, []);

  const handleMouseUp = useCallback((e: MouseEvent) => {
    // Right-click release = stop aiming
    if (e.button === 2) {
      setKeys((k) => ({ ...k, aim: false }));
    }
    // Left-click release = stop firing
    if (e.button === 0) {
      setKeys((k) => ({ ...k, fire: false }));
    }
  }, []);

  // Prevent context menu on right-click
  const handleContextMenu = useCallback((e: MouseEvent) => {
    e.preventDefault();
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('contextmenu', handleContextMenu);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [handleKeyDown, handleKeyUp, handleMouseDown, handleMouseUp, handleContextMenu]);

  // Return keys with buffer functions
  return {
    ...keys,
    bufferInput,
    consumeBuffer,
    hasBufferedInput,
  };
}
