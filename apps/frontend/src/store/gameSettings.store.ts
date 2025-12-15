import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type ShadowQuality = 'off' | 'low' | 'medium' | 'high';

interface GameSettingsState {
  // Graphics
  shadowQuality: ShadowQuality;
  renderDistance: number;
  fov: number;
  showFps: boolean;

  // Audio
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;

  // Controls
  mouseSensitivity: number;
  invertY: boolean;

  // Actions - Graphics
  setShadowQuality: (quality: ShadowQuality) => void;
  setRenderDistance: (distance: number) => void;
  setFov: (fov: number) => void;
  setShowFps: (show: boolean) => void;

  // Actions - Audio
  setMasterVolume: (volume: number) => void;
  setMusicVolume: (volume: number) => void;
  setSfxVolume: (volume: number) => void;

  // Actions - Controls
  setMouseSensitivity: (sensitivity: number) => void;
  setInvertY: (invert: boolean) => void;

  // Utilities
  resetToDefaults: () => void;
  getEffectiveVolume: (type: 'music' | 'sfx') => number;
}

const DEFAULT_SETTINGS = {
  // Graphics
  shadowQuality: 'medium' as ShadowQuality,
  renderDistance: 100,
  fov: 75,
  showFps: false,

  // Audio
  masterVolume: 1,
  musicVolume: 0.5,
  sfxVolume: 1,

  // Controls
  mouseSensitivity: 1,
  invertY: false,
};

export const useGameSettings = create<GameSettingsState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_SETTINGS,

      // Graphics setters
      setShadowQuality: (quality) => set({ shadowQuality: quality }),
      setRenderDistance: (distance) => set({ renderDistance: Math.max(10, Math.min(500, distance)) }),
      setFov: (fov) => set({ fov: Math.max(30, Math.min(120, fov)) }),
      setShowFps: (show) => set({ showFps: show }),

      // Audio setters
      setMasterVolume: (volume) => set({ masterVolume: Math.max(0, Math.min(1, volume)) }),
      setMusicVolume: (volume) => set({ musicVolume: Math.max(0, Math.min(1, volume)) }),
      setSfxVolume: (volume) => set({ sfxVolume: Math.max(0, Math.min(1, volume)) }),

      // Control setters
      setMouseSensitivity: (sensitivity) => set({ mouseSensitivity: Math.max(0.1, Math.min(3, sensitivity)) }),
      setInvertY: (invert) => set({ invertY: invert }),

      // Utilities
      resetToDefaults: () => set(DEFAULT_SETTINGS),
      getEffectiveVolume: (type) => {
        const state = get();
        const specificVolume = type === 'music' ? state.musicVolume : state.sfxVolume;
        return state.masterVolume * specificVolume;
      },
    }),
    {
      name: 'game-settings',
      partialize: (state) => ({
        shadowQuality: state.shadowQuality,
        renderDistance: state.renderDistance,
        fov: state.fov,
        showFps: state.showFps,
        masterVolume: state.masterVolume,
        musicVolume: state.musicVolume,
        sfxVolume: state.sfxVolume,
        mouseSensitivity: state.mouseSensitivity,
        invertY: state.invertY,
      }),
    }
  )
);

// Export shadow map sizes for use in components
export const SHADOW_MAP_SIZES: Record<ShadowQuality, number> = {
  off: 0,
  low: 512,
  medium: 1024,
  high: 2048,
};
