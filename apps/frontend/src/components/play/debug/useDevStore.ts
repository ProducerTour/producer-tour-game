/**
 * Dev Store
 * Zustand store for development/debug state
 * Provides cheats, debugging toggles, and dev tools
 */

import { create } from 'zustand';

interface DevState {
  // Cheats
  godMode: boolean;
  noclip: boolean;
  unlimitedAmmo: boolean;
  speedMultiplier: number;
  gravityMultiplier: number;

  // Avatar selection
  useXBotAvatar: boolean;

  // Debug Visuals
  showHitboxes: boolean;
  showWireframe: boolean;
  showStats: boolean;
  showColliders: boolean;
  showNavmesh: boolean;

  // Time control
  timeScale: number;
  isPaused: boolean;

  // Dev mode
  isDevMode: boolean;

  // Debug logging flags (environment-based)
  debugTerrain: boolean;
  debugPhysics: boolean;
  debugCombat: boolean;
  debugAnimation: boolean;

  // UI State (for disabling game input when menus are open)
  isConsoleOpen: boolean;

  // Actions - Cheats
  toggleGodMode: () => void;
  toggleNoclip: () => void;
  toggleUnlimitedAmmo: () => void;
  setSpeedMultiplier: (speed: number) => void;
  setGravityMultiplier: (gravity: number) => void;

  // Actions - Avatar
  toggleXBotAvatar: () => void;

  // Actions - Debug Visuals
  toggleHitboxes: () => void;
  toggleWireframe: () => void;
  toggleStats: () => void;
  toggleColliders: () => void;
  toggleNavmesh: () => void;

  // Actions - Time control
  setTimeScale: (scale: number) => void;
  togglePause: () => void;

  // Actions - Dev mode
  toggleDevMode: () => void;

  // Actions - Debug logging
  toggleDebugTerrain: () => void;
  toggleDebugPhysics: () => void;
  toggleDebugCombat: () => void;
  toggleDebugAnimation: () => void;

  // Actions - UI State
  setConsoleOpen: (isOpen: boolean) => void;

  // Utility
  reset: () => void;
}

const DEFAULT_DEV_STATE = {
  // Cheats
  godMode: false,
  noclip: false,
  unlimitedAmmo: false,
  speedMultiplier: 1,
  gravityMultiplier: 1,

  // Avatar selection
  useXBotAvatar: false,

  // Debug Visuals
  showHitboxes: false,
  showWireframe: false,
  showStats: false,
  showColliders: false,
  showNavmesh: false,

  // Time control
  timeScale: 1,
  isPaused: false,

  // Dev mode
  isDevMode: import.meta.env.DEV, // Auto-enable in dev builds

  // Debug logging flags - disabled by default, enable via env vars or toggles
  debugTerrain: import.meta.env.VITE_DEBUG_TERRAIN === 'true',
  debugPhysics: import.meta.env.VITE_DEBUG_PHYSICS === 'true',
  debugCombat: import.meta.env.VITE_DEBUG_COMBAT === 'true',
  debugAnimation: import.meta.env.VITE_DEBUG_ANIMATION === 'true',

  // UI State
  isConsoleOpen: false,
};

export const useDevStore = create<DevState>((set) => ({
  ...DEFAULT_DEV_STATE,

  // Cheats toggles
  toggleGodMode: () => set((state) => ({ godMode: !state.godMode })),
  toggleNoclip: () => set((state) => ({ noclip: !state.noclip })),
  toggleUnlimitedAmmo: () => set((state) => ({ unlimitedAmmo: !state.unlimitedAmmo })),
  setSpeedMultiplier: (speed) => set({ speedMultiplier: Math.max(0.1, Math.min(10, speed)) }),
  setGravityMultiplier: (gravity) => set({ gravityMultiplier: Math.max(0, Math.min(5, gravity)) }),

  // Avatar toggle
  toggleXBotAvatar: () => set((state) => ({ useXBotAvatar: !state.useXBotAvatar })),

  // Debug visual toggles
  toggleHitboxes: () => set((state) => ({ showHitboxes: !state.showHitboxes })),
  toggleWireframe: () => set((state) => ({ showWireframe: !state.showWireframe })),
  toggleStats: () => set((state) => ({ showStats: !state.showStats })),
  toggleColliders: () => set((state) => ({ showColliders: !state.showColliders })),
  toggleNavmesh: () => set((state) => ({ showNavmesh: !state.showNavmesh })),

  // Time control
  setTimeScale: (scale) => set({ timeScale: Math.max(0.1, Math.min(5, scale)) }),
  togglePause: () => set((state) => ({ isPaused: !state.isPaused })),

  // Dev mode
  toggleDevMode: () => set((state) => ({ isDevMode: !state.isDevMode })),

  // Debug logging toggles
  toggleDebugTerrain: () => set((state) => ({ debugTerrain: !state.debugTerrain })),
  toggleDebugPhysics: () => set((state) => ({ debugPhysics: !state.debugPhysics })),
  toggleDebugCombat: () => set((state) => ({ debugCombat: !state.debugCombat })),
  toggleDebugAnimation: () => set((state) => ({ debugAnimation: !state.debugAnimation })),

  // UI State
  setConsoleOpen: (isOpen) => set({ isConsoleOpen: isOpen }),

  // Reset to defaults
  reset: () => set(DEFAULT_DEV_STATE),
}));

export default useDevStore;
