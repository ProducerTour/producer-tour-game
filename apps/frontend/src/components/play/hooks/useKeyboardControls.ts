import { useEffect, useState, useCallback } from 'react';

interface KeyState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  sprint: boolean;
}

export function useKeyboardControls() {
  const [keys, setKeys] = useState<KeyState>({
    forward: false,
    backward: false,
    left: false,
    right: false,
    sprint: false,
  });

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Ignore if typing in an input
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
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

  return keys;
}
