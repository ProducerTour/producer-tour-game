/**
 * Flashlight Store - Manages flashlight on/off state
 * Toggle with E key when flashlight item is equipped
 *
 * PERFORMANCE NOTE: Per-frame position/direction updates use the singleton
 * `flashlightData` object below instead of Zustand set() to avoid
 * triggering subscriber callbacks 60 times per second.
 */

import { create } from 'zustand';
import * as THREE from 'three';

/**
 * Singleton for per-frame flashlight data (position/direction).
 *
 * This is mutated directly in useFrame without triggering React re-renders.
 * Components that need this data should read from here in their own useFrame hooks.
 *
 * This pattern follows Simon Dev's approach: per-frame data should live outside
 * React's state system to avoid unnecessary overhead.
 */
export const flashlightData = {
  /** World-space position of the spotlight */
  worldPosition: new THREE.Vector3(),
  /** World-space direction the spotlight is pointing (normalized) */
  worldDirection: new THREE.Vector3(0, 0, -1),
};

interface FlashlightState {
  /** Whether the flashlight is currently on */
  isOn: boolean;

  /** Whether the flashlight is currently equipped (in active hotbar slot) */
  isEquipped: boolean;

  /** Light configuration from the equipped item */
  lightConfig: {
    type: 'spotlight';
    color: string;
    intensity: number;
    distance: number;
    angle: number;
    penumbra: number;
  } | null;

  /** Toggle flashlight on/off */
  toggle: () => void;

  /** Turn flashlight on */
  turnOn: () => void;

  /** Turn flashlight off */
  turnOff: () => void;

  /** Set flashlight equipped state */
  setEquipped: (equipped: boolean) => void;

  /** Set light configuration from item metadata */
  setLightConfig: (config: FlashlightState['lightConfig']) => void;

  /** Clear light config (when flashlight is unequipped) */
  clearLightConfig: () => void;
}

export const useFlashlightStore = create<FlashlightState>((set) => ({
  isOn: false,
  isEquipped: false,
  lightConfig: null,

  toggle: () => set((s) => ({ isOn: !s.isOn })),

  turnOn: () => set({ isOn: true }),

  turnOff: () => set({ isOn: false }),

  setEquipped: (equipped) => set({ isEquipped: equipped }),

  setLightConfig: (config) => set({ lightConfig: config }),

  clearLightConfig: () => set({ lightConfig: null, isOn: false, isEquipped: false }),
}));

export default useFlashlightStore;
