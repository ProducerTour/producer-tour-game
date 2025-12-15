/**
 * Sound Store
 * Zustand store for audio state management
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type SoundCategory = 'master' | 'sfx' | 'music' | 'ambient' | 'voice';

interface SoundSettings {
  masterVolume: number;
  sfxVolume: number;
  musicVolume: number;
  ambientVolume: number;
  voiceVolume: number;
  isMuted: boolean;
}

interface SoundState extends SoundSettings {
  // Audio context
  audioContext: AudioContext | null;
  isInitialized: boolean;

  // Currently playing
  currentMusic: string | null;
  currentAmbient: string[];

  // Actions
  initialize: () => Promise<boolean>;
  setVolume: (category: SoundCategory, volume: number) => void;
  toggleMute: () => void;
  setMuted: (muted: boolean) => void;

  // Music control
  setCurrentMusic: (id: string | null) => void;

  // Ambient control
  addAmbient: (id: string) => void;
  removeAmbient: (id: string) => void;
  clearAmbient: () => void;

  // Get effective volume
  getEffectiveVolume: (category: SoundCategory) => number;
}

export const useSoundStore = create<SoundState>()(
  persist(
    (set, get) => ({
      // Default settings
      masterVolume: 1,
      sfxVolume: 0.8,
      musicVolume: 0.5,
      ambientVolume: 0.6,
      voiceVolume: 1,
      isMuted: false,

      // State
      audioContext: null,
      isInitialized: false,
      currentMusic: null,
      currentAmbient: [],

      // Initialize audio context (must be called after user interaction)
      initialize: async () => {
        if (get().isInitialized) return true;

        try {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          if (!AudioContextClass) {
            console.warn('Web Audio API not supported');
            return false;
          }

          const ctx = new AudioContextClass();

          // Resume if suspended (required for some browsers)
          if (ctx.state === 'suspended') {
            await ctx.resume();
          }

          set({ audioContext: ctx, isInitialized: true });
          console.log('🔊 Audio system initialized');
          return true;
        } catch (error) {
          console.error('Failed to initialize audio:', error);
          return false;
        }
      },

      // Volume control
      setVolume: (category, volume) => {
        const clampedVolume = Math.max(0, Math.min(1, volume));
        switch (category) {
          case 'master':
            set({ masterVolume: clampedVolume });
            break;
          case 'sfx':
            set({ sfxVolume: clampedVolume });
            break;
          case 'music':
            set({ musicVolume: clampedVolume });
            break;
          case 'ambient':
            set({ ambientVolume: clampedVolume });
            break;
          case 'voice':
            set({ voiceVolume: clampedVolume });
            break;
        }
      },

      toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),
      setMuted: (muted) => set({ isMuted: muted }),

      // Music
      setCurrentMusic: (id) => set({ currentMusic: id }),

      // Ambient
      addAmbient: (id) =>
        set((state) => ({
          currentAmbient: state.currentAmbient.includes(id)
            ? state.currentAmbient
            : [...state.currentAmbient, id],
        })),
      removeAmbient: (id) =>
        set((state) => ({
          currentAmbient: state.currentAmbient.filter((a) => a !== id),
        })),
      clearAmbient: () => set({ currentAmbient: [] }),

      // Get effective volume (category * master, accounting for mute)
      getEffectiveVolume: (category) => {
        const state = get();
        if (state.isMuted) return 0;

        const categoryVolume = (() => {
          switch (category) {
            case 'master':
              return 1;
            case 'sfx':
              return state.sfxVolume;
            case 'music':
              return state.musicVolume;
            case 'ambient':
              return state.ambientVolume;
            case 'voice':
              return state.voiceVolume;
          }
        })();

        return categoryVolume * state.masterVolume;
      },
    }),
    {
      name: 'producer-tour-sound-settings',
      partialize: (state) => ({
        masterVolume: state.masterVolume,
        sfxVolume: state.sfxVolume,
        musicVolume: state.musicVolume,
        ambientVolume: state.ambientVolume,
        voiceVolume: state.voiceVolume,
        isMuted: state.isMuted,
      }),
    }
  )
);

export default useSoundStore;
