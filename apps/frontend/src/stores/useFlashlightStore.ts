/**
 * Flashlight Store - Manages flashlight on/off state
 * Toggle with E key when flashlight item is equipped
 */

import { create } from 'zustand';

interface FlashlightState {
  /** Whether the flashlight is currently on */
  isOn: boolean;

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

  /** Set light configuration from item metadata */
  setLightConfig: (config: FlashlightState['lightConfig']) => void;

  /** Clear light config (when flashlight is unequipped) */
  clearLightConfig: () => void;
}

export const useFlashlightStore = create<FlashlightState>((set) => ({
  isOn: false,
  lightConfig: null,

  toggle: () => set((s) => ({ isOn: !s.isOn })),

  turnOn: () => set({ isOn: true }),

  turnOff: () => set({ isOn: false }),

  setLightConfig: (config) => set({ lightConfig: config }),

  clearLightConfig: () => set({ lightConfig: null, isOn: false }),
}));

export default useFlashlightStore;
