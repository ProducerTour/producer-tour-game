/**
 * Character Creator Types
 * Core data models for the custom avatar system
 */

// Body type options
export type BodyType = 'male' | 'female' | 'neutral';

// Build presets
export type BuildType = 'slim' | 'average' | 'athletic' | 'heavy';

/**
 * CharacterConfig - The canonical data model stored per user
 * This replaces the RPM avatar URL with a structured configuration
 */
export interface CharacterConfig {
  /** Schema version for migrations */
  version: number;

  /** Base body mesh to use */
  bodyType: BodyType;

  // === Body Customization ===
  /** Skin color as hex string */
  skinTone: string;
  /** Height multiplier: 0.0 = 1.55m, 0.5 = 1.75m, 1.0 = 1.95m */
  height: number;
  /** Body build preset */
  build: BuildType;

  // === Face Customization ===
  /** Face preset index (1-6) */
  facePreset: number;
  /** Eye size adjustment: -1.0 to 1.0 */
  eyeSize: number;
  /** Eye spacing adjustment: -1.0 to 1.0 */
  eyeSpacing: number;
  /** Nose width adjustment: -1.0 to 1.0 */
  noseWidth: number;
  /** Nose length adjustment: -1.0 to 1.0 */
  noseLength: number;
  /** Jaw width adjustment: -1.0 to 1.0 */
  jawWidth: number;
  /** Chin length adjustment: -1.0 to 1.0 */
  chinLength: number;
  /** Lip fullness adjustment: -1.0 to 1.0 */
  lipFullness: number;
  /** Cheekbone height adjustment: -1.0 to 1.0 */
  cheekboneHeight: number;

  // === Hair Customization ===
  /** Hair style asset ID (null = bald) */
  hairStyleId: string | null;
  /** Primary hair color as hex string */
  hairColor: string;
  /** Optional secondary/highlight color */
  hairHighlightColor?: string;

  // === Eye Color ===
  /** Eye/iris color as hex string */
  eyeColor: string;

  // === Metadata ===
  createdAt: string;
  updatedAt: string;
}

/**
 * Hair style asset definition
 */
export interface HairStyle {
  id: string;
  name: string;
  /** Path to GLB file */
  modelPath: string;
  /** Thumbnail image path */
  thumbnailPath: string;
  /** Compatible body types */
  compatibleWith: BodyType[];
  /** Whether this style supports highlights */
  supportsHighlights: boolean;
}

/**
 * Face preset definition
 */
export interface FacePreset {
  id: number;
  name: string;
  /** Thumbnail/preview image */
  thumbnailPath: string;
  /** Default morph values for this preset */
  morphDefaults: {
    eyeSize: number;
    eyeSpacing: number;
    noseWidth: number;
    noseLength: number;
    jawWidth: number;
    chinLength: number;
    lipFullness: number;
    cheekboneHeight: number;
  };
}

/**
 * Skin tone palette option
 */
export interface SkinToneOption {
  id: string;
  name: string;
  hex: string;
}

/**
 * Morph target mapping for Three.js
 */
export interface MorphTargetMap {
  /** Maps our config keys to actual morph target names in the GLB */
  [configKey: string]: string;
}

/**
 * Character creator UI state
 */
export interface CharacterCreatorState {
  /** Current configuration being edited */
  config: CharacterConfig;
  /** Original config for detecting changes */
  originalConfig: CharacterConfig | null;
  /** Whether there are unsaved changes */
  isDirty: boolean;
  /** Currently active customization category */
  activeCategory: 'body' | 'face' | 'hair';
  /** Preview animation to play */
  previewAnimation: 'idle' | 'walk' | 'dance' | 'wave';
  /** Camera rotation angle (degrees) */
  cameraRotation: number;
  /** Camera zoom level */
  cameraZoom: number;
  /** Loading state */
  isLoading: boolean;
  /** Saving state */
  isSaving: boolean;
  /** History for undo/redo */
  history: CharacterConfig[];
  /** Current position in history */
  historyIndex: number;
}

/**
 * API response for avatar config
 */
export interface AvatarConfigResponse {
  id: string;
  userId: string;
  config: CharacterConfig;
  createdAt: string;
  updatedAt: string;
}
