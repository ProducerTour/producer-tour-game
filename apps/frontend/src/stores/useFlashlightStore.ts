/**
 * Flashlight Store - Manages flashlight on/off state
 * Toggle with E key when flashlight item is equipped
 */

import { create } from 'zustand';
import * as THREE from 'three';

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

  /** World-space position of the spotlight (for terrain shader) */
  worldPosition: THREE.Vector3;

  /** World-space direction the spotlight is pointing (normalized) */
  worldDirection: THREE.Vector3;

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

  /** Update world-space position and direction (called each frame by EquipmentAttachment) */
  updateWorldData: (position: THREE.Vector3, direction: THREE.Vector3) => void;
}

export const useFlashlightStore = create<FlashlightState>((set) => ({
  isOn: false,
  isEquipped: false,
  lightConfig: null,
  worldPosition: new THREE.Vector3(),
  worldDirection: new THREE.Vector3(0, 0, -1),

  toggle: () => set((s) => ({ isOn: !s.isOn })),

  turnOn: () => set({ isOn: true }),

  turnOff: () => set({ isOn: false }),

  setEquipped: (equipped) => set({ isEquipped: equipped }),

  setLightConfig: (config) => set({ lightConfig: config }),

  clearLightConfig: () => set({ lightConfig: null, isOn: false, isEquipped: false }),

  updateWorldData: (position, direction) =>
    set((s) => ({
      worldPosition: s.worldPosition.copy(position),
      worldDirection: s.worldDirection.copy(direction),
    })),
}));

export default useFlashlightStore;
