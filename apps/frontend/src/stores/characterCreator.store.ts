/**
 * Character Creator Store
 * Simplified for colors-only customization (MVP)
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { persist } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import type { CharacterConfig, BodyType } from '../lib/character/types';
import { createDefaultCharacterConfig } from '../lib/character/defaults';
import { avatarApi } from '../lib/api';

// Generation status for AI selfie-to-avatar
export type GenerationStatus =
  | 'idle'
  | 'capturing'
  | 'uploading'
  | 'analyzing'
  | 'generating'
  | 'complete'
  | 'error';

// Tab modes for the character creator
export type CreatorMode = 'customize' | 'selfie';
export type CustomizeCategory = 'body' | 'hair';

// Preview animation options
export type PreviewAnimation = 'idle' | 'walk' | 'dance';

interface CharacterCreatorState {
  // === Mode & Navigation ===
  mode: CreatorMode;
  customizeCategory: CustomizeCategory;

  // === Character Configuration ===
  config: CharacterConfig;
  originalConfig: CharacterConfig | null;
  isDirty: boolean;

  // === Selfie-to-Avatar State ===
  selfieImage: string | null;
  selfieSource: 'camera' | 'upload' | null;
  generationStatus: GenerationStatus;
  generationProgress: number;
  generationError: string | null;

  // === 3D Preview State ===
  previewAnimation: PreviewAnimation;
  cameraRotation: number;
  cameraZoom: number;

  // === History (Undo/Redo) ===
  history: CharacterConfig[];
  historyIndex: number;
  maxHistoryLength: number;

  // === Loading States ===
  isLoading: boolean;
  isSaving: boolean;

  // === Actions ===
  setMode: (mode: CreatorMode) => void;
  setCustomizeCategory: (category: CustomizeCategory) => void;

  // Config updates
  setBodyType: (bodyType: BodyType) => void;
  setSkinTone: (hex: string) => void;
  setEyeColor: (hex: string) => void;
  setHairStyle: (styleId: string | null) => void;
  setHairColor: (hex: string) => void;
  setHairHighlight: (hex: string | undefined) => void;
  updateConfig: (partial: Partial<CharacterConfig>) => void;

  // Selfie-to-Avatar
  setSelfieImage: (image: string | null, source: 'camera' | 'upload' | null) => void;
  startGeneration: () => void;
  updateGenerationProgress: (status: GenerationStatus, progress: number) => void;
  setGenerationError: (error: string | null) => void;
  applyGeneratedConfig: (config: CharacterConfig) => void;
  resetSelfieFlow: () => void;

  // Preview
  setPreviewAnimation: (animation: PreviewAnimation) => void;
  setCameraRotation: (rotation: number) => void;
  setCameraZoom: (zoom: number) => void;
  resetCamera: () => void;

  // History
  undo: () => void;
  redo: () => void;
  pushHistory: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Persistence
  loadConfig: (config: CharacterConfig) => void;
  loadFromServer: () => Promise<void>;
  saveConfig: () => Promise<void>;
  resetToOriginal: () => void;
  randomize: () => void;
  setOriginalConfig: (config: CharacterConfig) => void;
  setLoading: (loading: boolean) => void;
  setSaving: (saving: boolean) => void;
}

export const useCharacterCreatorStore = create<CharacterCreatorState>()(
  persist(
    immer((set, get) => ({
      // === Initial State ===
      mode: 'customize',
      customizeCategory: 'body',

      config: createDefaultCharacterConfig(),
      originalConfig: null,
      isDirty: false,

      selfieImage: null,
      selfieSource: null,
      generationStatus: 'idle',
      generationProgress: 0,
      generationError: null,

      previewAnimation: 'idle',
      cameraRotation: 0,
      cameraZoom: 1.0,

      history: [],
      historyIndex: -1,
      maxHistoryLength: 50,

      isLoading: false,
      isSaving: false,

      // === Mode Actions ===
      setMode: (mode) => {
        set((state) => {
          state.mode = mode;
        });
      },

      setCustomizeCategory: (category) => {
        set((state) => {
          state.customizeCategory = category;
        });
      },

      // === Config Update Actions ===
      setBodyType: (bodyType) => {
        set((state) => {
          state.config.bodyType = bodyType;
          state.config.updatedAt = new Date().toISOString();
          state.isDirty = true;
        });
        get().pushHistory();
      },

      setSkinTone: (hex) => {
        set((state) => {
          state.config.skinTone = hex;
          state.config.updatedAt = new Date().toISOString();
          state.isDirty = true;
        });
      },

      setEyeColor: (hex) => {
        set((state) => {
          state.config.eyeColor = hex;
          state.config.updatedAt = new Date().toISOString();
          state.isDirty = true;
        });
      },

      setHairStyle: (styleId) => {
        set((state) => {
          state.config.hairStyleId = styleId;
          state.config.updatedAt = new Date().toISOString();
          state.isDirty = true;
        });
        get().pushHistory();
      },

      setHairColor: (hex) => {
        set((state) => {
          state.config.hairColor = hex;
          state.config.updatedAt = new Date().toISOString();
          state.isDirty = true;
        });
      },

      setHairHighlight: (hex) => {
        set((state) => {
          state.config.hairHighlightColor = hex;
          state.config.updatedAt = new Date().toISOString();
          state.isDirty = true;
        });
      },

      updateConfig: (partial) => {
        set((state) => {
          Object.assign(state.config, partial);
          state.config.updatedAt = new Date().toISOString();
          state.isDirty = true;
        });
        get().pushHistory();
      },

      // === Selfie-to-Avatar Actions ===
      setSelfieImage: (image, source) => {
        set((state) => {
          state.selfieImage = image;
          state.selfieSource = source;
          state.generationStatus = 'idle';
          state.generationProgress = 0;
          state.generationError = null;
        });
      },

      startGeneration: () => {
        set((state) => {
          state.generationStatus = 'analyzing';
          state.generationProgress = 0;
          state.generationError = null;
        });
      },

      updateGenerationProgress: (status, progress) => {
        set((state) => {
          state.generationStatus = status;
          state.generationProgress = progress;
        });
      },

      setGenerationError: (error) => {
        set((state) => {
          state.generationStatus = 'error';
          state.generationError = error;
        });
      },

      applyGeneratedConfig: (config) => {
        set((state) => {
          state.config = config;
          state.generationStatus = 'complete';
          state.generationProgress = 100;
          state.isDirty = true;
          state.mode = 'customize';
        });
        get().pushHistory();
      },

      resetSelfieFlow: () => {
        set((state) => {
          state.selfieImage = null;
          state.selfieSource = null;
          state.generationStatus = 'idle';
          state.generationProgress = 0;
          state.generationError = null;
        });
      },

      // === Preview Actions ===
      setPreviewAnimation: (animation) => {
        set((state) => {
          state.previewAnimation = animation;
        });
      },

      setCameraRotation: (rotation) => {
        set((state) => {
          state.cameraRotation = rotation % 360;
        });
      },

      setCameraZoom: (zoom) => {
        set((state) => {
          state.cameraZoom = Math.max(0.5, Math.min(2.0, zoom));
        });
      },

      resetCamera: () => {
        set((state) => {
          state.cameraRotation = 0;
          state.cameraZoom = 1.0;
        });
      },

      // === History Actions ===
      pushHistory: () => {
        set((state) => {
          const currentConfig = JSON.parse(JSON.stringify(state.config));

          // Remove any future history if we're not at the end
          if (state.historyIndex < state.history.length - 1) {
            state.history = state.history.slice(0, state.historyIndex + 1);
          }

          // Add new state
          state.history.push(currentConfig);

          // Trim if too long
          if (state.history.length > state.maxHistoryLength) {
            state.history.shift();
          }

          state.historyIndex = state.history.length - 1;
        });
      },

      undo: () => {
        const { historyIndex, history } = get();
        if (historyIndex > 0) {
          set((state) => {
            state.historyIndex = historyIndex - 1;
            state.config = JSON.parse(JSON.stringify(history[historyIndex - 1]));
            state.isDirty = true;
          });
        }
      },

      redo: () => {
        const { historyIndex, history } = get();
        if (historyIndex < history.length - 1) {
          set((state) => {
            state.historyIndex = historyIndex + 1;
            state.config = JSON.parse(JSON.stringify(history[historyIndex + 1]));
            state.isDirty = true;
          });
        }
      },

      canUndo: () => get().historyIndex > 0,
      canRedo: () => get().historyIndex < get().history.length - 1,

      // === Persistence Actions ===
      loadConfig: (config) => {
        set((state) => {
          state.config = config;
          state.originalConfig = JSON.parse(JSON.stringify(config));
          state.isDirty = false;
          state.history = [JSON.parse(JSON.stringify(config))];
          state.historyIndex = 0;
        });
      },

      loadFromServer: async () => {
        set((state) => {
          state.isLoading = true;
        });

        try {
          const response = await avatarApi.getConfig();
          if (response.data?.config) {
            get().loadConfig(response.data.config as CharacterConfig);
          }
        } catch (error) {
          console.error('Failed to load config from server:', error);
        } finally {
          set((state) => {
            state.isLoading = false;
          });
        }
      },

      saveConfig: async () => {
        set((state) => {
          state.isSaving = true;
        });

        try {
          const config = get().config;
          await avatarApi.saveConfig(config);
          set((state) => {
            state.originalConfig = JSON.parse(JSON.stringify(config));
            state.isDirty = false;
          });
        } catch (error) {
          console.error('Failed to save config:', error);
          throw error;
        } finally {
          set((state) => {
            state.isSaving = false;
          });
        }
      },

      resetToOriginal: () => {
        const { originalConfig } = get();
        if (originalConfig) {
          set((state) => {
            state.config = JSON.parse(JSON.stringify(originalConfig));
            state.isDirty = false;
          });
        }
      },

      randomize: () => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const defaults = require('../lib/character/defaults');
        const SKIN_TONE_PALETTE = defaults.SKIN_TONE_PALETTE as { hex: string }[];
        const EYE_COLOR_PALETTE = defaults.EYE_COLOR_PALETTE as { hex: string }[];
        const HAIR_COLOR_PALETTE = defaults.HAIR_COLOR_PALETTE as { hex: string }[];
        const HAIR_STYLES = defaults.HAIR_STYLES as { id: string }[];

        const randomFrom = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

        set((state) => {
          state.config.bodyType = Math.random() > 0.5 ? 'male' : 'female';
          state.config.skinTone = randomFrom(SKIN_TONE_PALETTE).hex;
          state.config.eyeColor = randomFrom(EYE_COLOR_PALETTE).hex;
          state.config.hairStyleId = randomFrom(HAIR_STYLES).id;
          state.config.hairColor = randomFrom(HAIR_COLOR_PALETTE).hex;
          state.config.updatedAt = new Date().toISOString();
          state.isDirty = true;
        });
        get().pushHistory();
      },

      setOriginalConfig: (config) => {
        set((state) => {
          state.originalConfig = JSON.parse(JSON.stringify(config));
        });
      },

      setLoading: (loading) => {
        set((state) => {
          state.isLoading = loading;
        });
      },

      setSaving: (saving) => {
        set((state) => {
          state.isSaving = saving;
        });
      },
    })),
    {
      name: 'character-creator-storage',
      partialize: (state) => ({
        config: state.config,
      }),
    }
  )
);

// === Selector Hooks ===

export const useCharacterConfig = () =>
  useCharacterCreatorStore(useShallow((state) => state.config));

export const usePreviewState = () =>
  useCharacterCreatorStore(
    useShallow((state) => ({
      animation: state.previewAnimation,
      rotation: state.cameraRotation,
      zoom: state.cameraZoom,
    }))
  );

export const useSelfieState = () =>
  useCharacterCreatorStore(
    useShallow((state) => ({
      selfieImage: state.selfieImage,
      selfieSource: state.selfieSource,
      generationStatus: state.generationStatus,
      generationProgress: state.generationProgress,
      generationError: state.generationError,
    }))
  );

export const useCreatorMode = () =>
  useCharacterCreatorStore((state) => state.mode);

export const useCustomizeCategory = () =>
  useCharacterCreatorStore((state) => state.customizeCategory);

export const useGenerationStatus = () =>
  useCharacterCreatorStore(
    useShallow((state) => ({
      status: state.generationStatus,
      progress: state.generationProgress,
      error: state.generationError,
    }))
  );
