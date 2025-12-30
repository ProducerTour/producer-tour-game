/**
 * VFX Store
 * Zustand store for visual effects management
 */

import { create } from 'zustand';
import * as THREE from 'three';
import { vfxTimers } from '../../../lib/utils/TimerManager';

export type VFXType =
  | 'muzzleFlash'
  | 'bulletImpact'
  | 'bloodSplatter'
  | 'sparkle'
  | 'smoke'
  | 'explosion'
  | 'heal'
  | 'levelUp'
  | 'footstepDust'
  | 'dashTrail';

export interface VFXInstance {
  id: string;
  type: VFXType;
  position: { x: number; y: number; z: number };
  rotation?: { x: number; y: number; z: number };
  scale?: number;
  color?: string;
  createdAt: number;
  duration: number; // ms
  data?: Record<string, unknown>; // Extra data for specific effects
}

interface VFXStore {
  effects: VFXInstance[];
  isEnabled: boolean;
  quality: 'low' | 'medium' | 'high';

  // Actions
  spawn: (type: VFXType, position: { x: number; y: number; z: number }, options?: Partial<VFXInstance>) => string;
  remove: (id: string) => void;
  clear: () => void;
  cleanup: () => void; // Remove expired effects

  // Settings
  setEnabled: (enabled: boolean) => void;
  setQuality: (quality: 'low' | 'medium' | 'high') => void;
}

// Default durations for each effect type
const DEFAULT_DURATIONS: Record<VFXType, number> = {
  muzzleFlash: 100,
  bulletImpact: 500,
  bloodSplatter: 1000,
  sparkle: 800,
  smoke: 2000,
  explosion: 1500,
  heal: 1200,
  levelUp: 2000,
  footstepDust: 400,
  dashTrail: 300,
};

// ID counter
let vfxIdCounter = 0;
const generateVFXId = () => `vfx_${++vfxIdCounter}`;

export const useVFXStore = create<VFXStore>((set, get) => ({
  effects: [],
  isEnabled: true,
  quality: 'medium',

  spawn: (type, position, options = {}) => {
    if (!get().isEnabled) return '';

    const id = generateVFXId();
    const effect: VFXInstance = {
      id,
      type,
      position,
      createdAt: Date.now(),
      duration: options.duration ?? DEFAULT_DURATIONS[type],
      ...options,
    };

    set((state) => ({
      effects: [...state.effects, effect],
    }));

    // Auto-remove after duration (keyed to allow cancellation)
    vfxTimers.setTimeout(`effect-${id}`, () => {
      get().remove(id);
    }, effect.duration);

    return id;
  },

  remove: (id) => {
    // Cancel the auto-remove timer if effect is manually removed
    vfxTimers.clearTimeout(`effect-${id}`);

    set((state) => ({
      effects: state.effects.filter((e) => e.id !== id),
    }));
  },

  clear: () => {
    // Cancel all VFX timers
    vfxTimers.clearAll();
    set({ effects: [] });
  },

  cleanup: () => {
    const now = Date.now();
    set((state) => ({
      effects: state.effects.filter((e) => now - e.createdAt < e.duration),
    }));
  },

  setEnabled: (enabled) => set({ isEnabled: enabled }),
  setQuality: (quality) => set({ quality }),
}));

// Helper functions to spawn common effects
export function spawnMuzzleFlash(position: { x: number; y: number; z: number }, direction?: THREE.Vector3) {
  return useVFXStore.getState().spawn('muzzleFlash', position, {
    rotation: direction ? {
      x: 0,
      y: Math.atan2(direction.x, direction.z),
      z: 0,
    } : undefined,
  });
}

export function spawnBulletImpact(position: { x: number; y: number; z: number }, normal?: THREE.Vector3) {
  return useVFXStore.getState().spawn('bulletImpact', position, {
    rotation: normal ? {
      x: Math.asin(normal.y),
      y: Math.atan2(normal.x, normal.z),
      z: 0,
    } : undefined,
  });
}

export function spawnHitEffect(position: { x: number; y: number; z: number }, isCritical = false) {
  const type = isCritical ? 'bloodSplatter' : 'bulletImpact';
  const color = isCritical ? '#fbbf24' : '#ef4444';
  return useVFXStore.getState().spawn(type, position, { color, scale: isCritical ? 1.5 : 1 });
}

export function spawnHealEffect(position: { x: number; y: number; z: number }) {
  return useVFXStore.getState().spawn('heal', position, { color: '#22c55e' });
}

export function spawnFootstepDust(position: { x: number; y: number; z: number }) {
  return useVFXStore.getState().spawn('footstepDust', position, { scale: 0.5 });
}

export default useVFXStore;

// ============================================================
// Selectors - Use these to prevent unnecessary re-renders
// ============================================================

/** All active effects (use sparingly - updates frequently) */
export const useVFXEffects = () => useVFXStore((s) => s.effects);

/** Whether VFX system is enabled */
export const useVFXEnabled = () => useVFXStore((s) => s.isEnabled);

/** Current VFX quality setting */
export const useVFXQuality = () => useVFXStore((s) => s.quality);

/** Count of active effects */
export const useVFXCount = () => useVFXStore((s) => s.effects.length);

/** Get effects of a specific type */
export const useVFXByType = (type: VFXType) =>
  useVFXStore((s) => s.effects.filter((e) => e.type === type));
