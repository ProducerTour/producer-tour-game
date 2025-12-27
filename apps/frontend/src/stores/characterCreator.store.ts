/**
 * Character Creator Store
 * Manages state for the character creation page including:
 * - Manual customization (body, face, hair)
 * - Selfie-to-avatar AI generation
 * - Undo/redo history
 * - Save/load persistence
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { persist } from 'zustand/middleware';
import type { CharacterConfig, BodyType, BuildType } from '../lib/character/types';
import { createDefaultCharacterConfig, FACE_PRESETS } from '../lib/character/defaults';
import { avatarApi } from '../lib/api';

// Generation status for AI selfie-to-avatar
export type GenerationStatus =
  | 'idle'
  | 'capturing'
  | 'uploading'
  | 'analyzing'
  | 'generating_mesh'
  | 'applying_textures'
  | 'finalizing'
  | 'complete'
  | 'error';

// Tab modes for the character creator
export type CreatorMode = 'customize' | 'selfie';
export type CustomizeCategory = 'body' | 'face' | 'hair';

// Preview animation options
export type PreviewAnimation = 'idle' | 'walk' | 'dance' | 'wave';

interface CharacterCreatorState {
  // === Mode & Navigation ===
  mode: CreatorMode;
  customizeCategory: CustomizeCategory;

  // === Character Configuration ===
  config: CharacterConfig;
  originalConfig: CharacterConfig | null;
  isDirty: boolean;

  // === Selfie-to-Avatar State ===
  selfieImage: string | null; // Base64 or URL
  selfieSource: 'camera' | 'upload' | null;
  generationStatus: GenerationStatus;
  generationProgress: number; // 0-100
  generationError: string | null;

  // === 3D Preview State ===
  previewAnimation: PreviewAnimation;
  cameraRotation: number; // degrees
  cameraZoom: number; // 0.5 - 2.0

  // === History (Undo/Redo) ===
  history: CharacterConfig[];
  historyIndex: number;
  maxHistoryLength: number;

  // === Loading States ===
  isLoading: boolean;
  isSaving: boolean;

  // === Actions ===
  // Mode
  setMode: (mode: CreatorMode) => void;
  setCustomizeCategory: (category: CustomizeCategory) => void;

  // Config updates
  setBodyType: (bodyType: BodyType) => void;
  setSkinTone: (hex: string) => void;
  setHeight: (value: number) => void;
  setBuild: (build: BuildType) => void;
  setFacePreset: (presetId: number) => void;
  setFaceMorph: (key: string, value: number) => void;
  setHairStyle: (styleId: string | null) => void;
  setHairColor: (hex: string) => void;
  setHairHighlight: (hex: string | undefined) => void;
  setEyeColor: (hex: string) => void;

  // Batch update
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

  // Loading
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
        // Don't push history on every color change - debounced externally
      },

      setHeight: (value) => {
        set((state) => {
          state.config.height = Math.max(0, Math.min(1, value));
          state.config.updatedAt = new Date().toISOString();
          state.isDirty = true;
        });
      },

      setBuild: (build) => {
        set((state) => {
          state.config.build = build;
          state.config.updatedAt = new Date().toISOString();
          state.isDirty = true;
        });
        get().pushHistory();
      },

      setFacePreset: (presetId) => {
        const preset = FACE_PRESETS.find((p) => p.id === presetId);
        set((state) => {
          state.config.facePreset = presetId;
          if (preset) {
            // Apply preset's default morph values
            state.config.eyeSize = preset.morphDefaults.eyeSize;
            state.config.eyeSpacing = preset.morphDefaults.eyeSpacing;
            state.config.noseWidth = preset.morphDefaults.noseWidth;
            state.config.noseLength = preset.morphDefaults.noseLength;
            state.config.jawWidth = preset.morphDefaults.jawWidth;
            state.config.chinLength = preset.morphDefaults.chinLength;
            state.config.lipFullness = preset.morphDefaults.lipFullness;
            state.config.cheekboneHeight = preset.morphDefaults.cheekboneHeight;
          }
          state.config.updatedAt = new Date().toISOString();
          state.isDirty = true;
        });
        get().pushHistory();
      },

      setFaceMorph: (key, value) => {
        set((state) => {
          const clampedValue = Math.max(-1, Math.min(1, value));
          (state.config as Record<string, unknown>)[key] = clampedValue;
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

      setEyeColor: (hex) => {
        set((state) => {
          state.config.eyeColor = hex;
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
          state.mode = 'customize'; // Switch to customize mode for fine-tuning
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
          // Create a deep copy of current config
          const configCopy = JSON.parse(JSON.stringify(state.config));

          // If we're not at the end of history, truncate forward history
          if (state.historyIndex < state.history.length - 1) {
            state.history = state.history.slice(0, state.historyIndex + 1);
          }

          // Add new state
          state.history.push(configCopy);

          // Trim history if too long
          if (state.history.length > state.maxHistoryLength) {
            state.history = state.history.slice(-state.maxHistoryLength);
          }

          state.historyIndex = state.history.length - 1;
        });
      },

      undo: () => {
        set((state) => {
          if (state.historyIndex > 0) {
            state.historyIndex -= 1;
            state.config = JSON.parse(JSON.stringify(state.history[state.historyIndex]));
            state.isDirty = true;
          }
        });
      },

      redo: () => {
        set((state) => {
          if (state.historyIndex < state.history.length - 1) {
            state.historyIndex += 1;
            state.config = JSON.parse(JSON.stringify(state.history[state.historyIndex]));
            state.isDirty = true;
          }
        });
      },

      canUndo: () => {
        const state = get();
        return state.historyIndex > 0;
      },

      canRedo: () => {
        const state = get();
        return state.historyIndex < state.history.length - 1;
      },

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

      setOriginalConfig: (config) => {
        set((state) => {
          state.originalConfig = JSON.parse(JSON.stringify(config));
        });
      },

      loadFromServer: async () => {
        set({ isLoading: true });

        try {
          const response = await avatarApi.getConfig();
          const { config } = response.data;

          if (config) {
            set((state) => {
              state.config = config;
              state.originalConfig = JSON.parse(JSON.stringify(config));
              state.isDirty = false;
              state.history = [JSON.parse(JSON.stringify(config))];
              state.historyIndex = 0;
              state.isLoading = false;
            });
          } else {
            // No saved config, use default
            const defaultConfig = createDefaultCharacterConfig();
            set((state) => {
              state.config = defaultConfig;
              state.originalConfig = null;
              state.isDirty = false;
              state.history = [JSON.parse(JSON.stringify(defaultConfig))];
              state.historyIndex = 0;
              state.isLoading = false;
            });
          }
        } catch (error) {
          console.error('Failed to load avatar config:', error);
          set({ isLoading: false });
          // Don't throw - just use current/default config
        }
      },

      saveConfig: async () => {
        const state = get();
        set({ isSaving: true });

        try {
          await avatarApi.saveConfig(state.config);

          set((s) => {
            s.originalConfig = JSON.parse(JSON.stringify(s.config));
            s.isDirty = false;
            s.isSaving = false;
          });
        } catch (error) {
          console.error('Failed to save avatar config:', error);
          set({ isSaving: false });
          throw new Error('Failed to save character configuration');
        }
      },

      resetToOriginal: () => {
        set((state) => {
          if (state.originalConfig) {
            state.config = JSON.parse(JSON.stringify(state.originalConfig));
            state.isDirty = false;
          } else {
            state.config = createDefaultCharacterConfig();
            state.isDirty = false;
          }
        });
        get().pushHistory();
      },

      randomize: () => {
        const randomFrom = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
        const randomRange = (min: number, max: number) => Math.random() * (max - min) + min;

        set((state) => {
          // Randomize body
          state.config.skinTone = randomFrom([
            '#FFE0BD', '#FFCD94', '#EAC086', '#DFAD69',
            '#D09B5C', '#C68642', '#B07B47', '#A66E3D',
            '#8D5524', '#6B4423', '#4A3021', '#3B2417',
          ]);
          state.config.height = randomRange(0.2, 0.8);
          state.config.build = randomFrom(['slim', 'average', 'athletic', 'heavy']);

          // Randomize face
          state.config.facePreset = Math.floor(randomRange(1, 7));
          state.config.eyeSize = randomRange(-0.5, 0.5);
          state.config.eyeSpacing = randomRange(-0.3, 0.3);
          state.config.noseWidth = randomRange(-0.5, 0.5);
          state.config.noseLength = randomRange(-0.3, 0.3);
          state.config.jawWidth = randomRange(-0.5, 0.5);
          state.config.chinLength = randomRange(-0.3, 0.3);
          state.config.lipFullness = randomRange(-0.5, 0.5);
          state.config.cheekboneHeight = randomRange(-0.3, 0.3);

          // Randomize hair
          state.config.hairStyleId = randomFrom([
            'bald', 'buzzcut', 'short_fade', 'short_textured',
            'curly_short', 'medium_wavy', 'medium_straight',
            'afro_medium', 'long_straight', 'ponytail',
          ]);
          state.config.hairColor = randomFrom([
            '#1A1A1A', '#3B2417', '#6B4423', '#A67B5B',
            '#D4A853', '#B55239', '#6D3222', '#808080',
          ]);

          // Randomize eyes
          state.config.eyeColor = randomFrom([
            '#6B4423', '#3D2314', '#8E7618', '#4A7023',
            '#4B88A2', '#6B7B8C', '#B5651D',
          ]);

          state.config.updatedAt = new Date().toISOString();
          state.isDirty = true;
        });
        get().pushHistory();
      },

      // === Loading Actions ===
      setLoading: (loading) => {
        set({ isLoading: loading });
      },

      setSaving: (saving) => {
        set({ isSaving: saving });
      },
    })),
    {
      name: 'character-creator-draft',
      // Only persist the draft config, not UI state
      partialize: (state) => ({
        config: state.config,
        isDirty: state.isDirty,
      }),
    }
  )
);

// Selector hooks for performance
export const useCharacterConfig = () => useCharacterCreatorStore((s) => s.config);
export const useCreatorMode = () => useCharacterCreatorStore((s) => s.mode);
export const useCustomizeCategory = () => useCharacterCreatorStore((s) => s.customizeCategory);
export const useGenerationStatus = () => useCharacterCreatorStore((s) => ({
  status: s.generationStatus,
  progress: s.generationProgress,
  error: s.generationError,
}));
export const usePreviewState = () => useCharacterCreatorStore((s) => ({
  animation: s.previewAnimation,
  rotation: s.cameraRotation,
  zoom: s.cameraZoom,
}));
