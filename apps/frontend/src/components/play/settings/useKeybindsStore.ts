/**
 * Keybinds Store
 * Manages customizable key bindings with localStorage persistence
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// All bindable actions in the game
export type GameAction =
  | 'moveForward'
  | 'moveBackward'
  | 'moveLeft'
  | 'moveRight'
  | 'sprint'
  | 'jump'
  | 'crouch'
  | 'dance'
  | 'toggleWeapon'
  | 'reload'
  | 'freeLook'
  | 'fullscreen';

// Key binding can be a keyboard key or mouse button
export interface KeyBinding {
  type: 'keyboard' | 'mouse';
  code: string; // e.g., 'KeyW', 'Space', 'Mouse0'
  display: string; // Human-readable name, e.g., 'W', 'Space', 'Left Click'
}

// Map of action to its key binding(s)
export type KeybindMap = Record<GameAction, KeyBinding[]>;

// Human-readable action names for the UI
export const ACTION_LABELS: Record<GameAction, string> = {
  moveForward: 'Move Forward',
  moveBackward: 'Move Backward',
  moveLeft: 'Move Left',
  moveRight: 'Move Right',
  sprint: 'Sprint',
  jump: 'Jump',
  crouch: 'Crouch (Toggle)',
  dance: 'Dance',
  toggleWeapon: 'Toggle Weapon',
  reload: 'Reload',
  freeLook: 'Free Look (Hold)',
  fullscreen: 'Toggle Fullscreen',
};

// Action categories for organized display
export const ACTION_CATEGORIES: Record<string, GameAction[]> = {
  Movement: ['moveForward', 'moveBackward', 'moveLeft', 'moveRight', 'sprint', 'jump', 'crouch'],
  Combat: ['toggleWeapon', 'reload'],
  Camera: ['freeLook', 'fullscreen'],
  Social: ['dance'],
};

// Default key bindings
export const DEFAULT_KEYBINDS: KeybindMap = {
  moveForward: [
    { type: 'keyboard', code: 'KeyW', display: 'W' },
    { type: 'keyboard', code: 'ArrowUp', display: '↑' },
  ],
  moveBackward: [
    { type: 'keyboard', code: 'KeyS', display: 'S' },
    { type: 'keyboard', code: 'ArrowDown', display: '↓' },
  ],
  moveLeft: [
    { type: 'keyboard', code: 'KeyA', display: 'A' },
    { type: 'keyboard', code: 'ArrowLeft', display: '←' },
  ],
  moveRight: [
    { type: 'keyboard', code: 'KeyD', display: 'D' },
    { type: 'keyboard', code: 'ArrowRight', display: '→' },
  ],
  sprint: [
    { type: 'keyboard', code: 'ShiftLeft', display: 'Shift' },
  ],
  jump: [
    { type: 'keyboard', code: 'Space', display: 'Space' },
  ],
  crouch: [
    { type: 'keyboard', code: 'KeyC', display: 'C' },
  ],
  dance: [
    { type: 'keyboard', code: 'KeyV', display: 'V' },
  ],
  toggleWeapon: [
    { type: 'keyboard', code: 'KeyQ', display: 'Q' },
  ],
  reload: [
    { type: 'keyboard', code: 'KeyR', display: 'R' },
  ],
  freeLook: [
    { type: 'keyboard', code: 'Tab', display: 'Tab' },
  ],
  fullscreen: [
    { type: 'keyboard', code: 'KeyF', display: 'F' },
  ],
};

// Convert keyboard event to KeyBinding
export function eventToKeyBinding(e: KeyboardEvent): KeyBinding {
  let display = e.key;

  // Make display names more readable
  if (e.code.startsWith('Key')) {
    display = e.code.replace('Key', '');
  } else if (e.code.startsWith('Digit')) {
    display = e.code.replace('Digit', '');
  } else if (e.code === 'Space') {
    display = 'Space';
  } else if (e.code.startsWith('Arrow')) {
    const arrows: Record<string, string> = {
      ArrowUp: '↑',
      ArrowDown: '↓',
      ArrowLeft: '←',
      ArrowRight: '→',
    };
    display = arrows[e.code] || e.code;
  } else if (e.code.includes('Shift')) {
    display = 'Shift';
  } else if (e.code.includes('Control')) {
    display = 'Ctrl';
  } else if (e.code.includes('Alt')) {
    display = 'Alt';
  } else if (e.code === 'Tab') {
    display = 'Tab';
  } else if (e.code === 'Escape') {
    display = 'Esc';
  } else if (e.code === 'Backquote') {
    display = '`';
  } else if (e.code === 'CapsLock') {
    display = 'Caps';
  }

  return {
    type: 'keyboard',
    code: e.code,
    display,
  };
}

// Convert mouse event to KeyBinding
export function mouseToKeyBinding(button: number): KeyBinding {
  const displays: Record<number, string> = {
    0: 'Left Click',
    1: 'Middle Click',
    2: 'Right Click',
    3: 'Mouse 4',
    4: 'Mouse 5',
  };

  return {
    type: 'mouse',
    code: `Mouse${button}`,
    display: displays[button] || `Mouse ${button}`,
  };
}

interface KeybindsState {
  keybinds: KeybindMap;

  // Check if a key code matches an action
  isAction: (action: GameAction, code: string) => boolean;

  // Get all codes for an action
  getCodesForAction: (action: GameAction) => string[];

  // Set a keybind (replaces existing at index, or adds new)
  setKeybind: (action: GameAction, binding: KeyBinding, index?: number) => void;

  // Remove a keybind
  removeKeybind: (action: GameAction, index: number) => void;

  // Reset to defaults
  resetToDefaults: () => void;

  // Reset single action to default
  resetAction: (action: GameAction) => void;
}

export const useKeybindsStore = create<KeybindsState>()(
  persist(
    (set, get) => ({
      keybinds: { ...DEFAULT_KEYBINDS },

      isAction: (action, code) => {
        const bindings = get().keybinds[action];
        return bindings?.some(b => b.code === code) ?? false;
      },

      getCodesForAction: (action) => {
        const bindings = get().keybinds[action];
        return bindings?.map(b => b.code) ?? [];
      },

      setKeybind: (action, binding, index) => {
        set((state) => {
          const newBindings = [...(state.keybinds[action] || [])];

          if (index !== undefined && index < newBindings.length) {
            newBindings[index] = binding;
          } else {
            // Add as new binding (max 2 per action)
            if (newBindings.length < 2) {
              newBindings.push(binding);
            } else {
              // Replace the first one if we already have 2
              newBindings[0] = binding;
            }
          }

          return {
            keybinds: {
              ...state.keybinds,
              [action]: newBindings,
            },
          };
        });
      },

      removeKeybind: (action, index) => {
        set((state) => {
          const newBindings = [...(state.keybinds[action] || [])];

          if (index >= 0 && index < newBindings.length && newBindings.length > 1) {
            newBindings.splice(index, 1);
          }

          return {
            keybinds: {
              ...state.keybinds,
              [action]: newBindings,
            },
          };
        });
      },

      resetToDefaults: () => {
        set({ keybinds: { ...DEFAULT_KEYBINDS } });
      },

      resetAction: (action) => {
        set((state) => ({
          keybinds: {
            ...state.keybinds,
            [action]: [...DEFAULT_KEYBINDS[action]],
          },
        }));
      },
    }),
    {
      name: 'producer-tour-keybinds',
      version: 1,
    }
  )
);

export default useKeybindsStore;
