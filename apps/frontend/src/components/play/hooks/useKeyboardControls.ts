import { useEffect, useState, useCallback, useRef } from 'react';

export interface KeyState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  sprint: boolean;
  jump: boolean;
  dance: boolean;
  toggleWeapon: boolean;
  crouch: boolean;
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
    dance: false,
    toggleWeapon: false,
    crouch: false,
  });

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

    // Game keys - prevent default browser behavior
    const gameKeys = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyE', 'KeyQ', 'KeyC', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'ShiftLeft', 'ShiftRight'];
    if (gameKeys.includes(e.code)) {
      e.preventDefault();
    }

    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        setKeys((k) => ({ ...k, forward: true }));
        break;
      case 'KeyS':
      case 'ArrowDown':
        setKeys((k) => ({ ...k, backward: true }));
        break;
      case 'KeyA':
      case 'ArrowLeft':
        setKeys((k) => ({ ...k, left: true }));
        break;
      case 'KeyD':
      case 'ArrowRight':
        setKeys((k) => ({ ...k, right: true }));
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        setKeys((k) => ({ ...k, sprint: true }));
        break;
      case 'Space':
        setKeys((k) => ({ ...k, jump: true }));
        break;
      case 'KeyE':
        setKeys((k) => ({ ...k, dance: true }));
        break;
      case 'KeyQ':
        setKeys((k) => ({ ...k, toggleWeapon: true }));
        break;
      case 'KeyC':
        // Toggle crouch on press (not hold)
        setKeys((k) => ({ ...k, crouch: !k.crouch }));
        break;
    }
  }, []);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    switch (e.code) {
      case 'KeyW':
      case 'ArrowUp':
        setKeys((k) => ({ ...k, forward: false }));
        break;
      case 'KeyS':
      case 'ArrowDown':
        setKeys((k) => ({ ...k, backward: false }));
        break;
      case 'KeyA':
      case 'ArrowLeft':
        setKeys((k) => ({ ...k, left: false }));
        break;
      case 'KeyD':
      case 'ArrowRight':
        setKeys((k) => ({ ...k, right: false }));
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        setKeys((k) => ({ ...k, sprint: false }));
        break;
      case 'Space':
        setKeys((k) => ({ ...k, jump: false }));
        break;
      case 'KeyE':
        setKeys((k) => ({ ...k, dance: false }));
        break;
      case 'KeyQ':
        setKeys((k) => ({ ...k, toggleWeapon: false }));
        break;
      // KeyC (crouch) is a toggle, no action on keyup
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  // Return keys with buffer functions
  return {
    ...keys,
    bufferInput,
    consumeBuffer,
    hasBufferedInput,
  };
}
