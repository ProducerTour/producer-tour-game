/**
 * Character Creator Types
 * Simplified data models for the custom avatar system
 *
 * NOTE: Morphs have been removed - using colors-only customization for MVP
 */

// Body type options
export type BodyType = 'male' | 'female';

/**
 * CharacterConfig - The canonical data model stored per user
 * Simplified to colors-only customization (no morph targets)
 */
export interface CharacterConfig {
  /** Schema version for migrations */
  version: number;

  /** Base body mesh to use */
  bodyType: BodyType;

  // === Colors ===
  /** Skin color as hex string */
  skinTone: string;
  /** Eye/iris color as hex string */
  eyeColor: string;

  // === Hair ===
  /** Hair style asset ID (null = bald) */
  hairStyleId: string | null;
  /** Primary hair color as hex string */
  hairColor: string;
  /** Optional secondary/highlight color */
  hairHighlightColor?: string;

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
 * Skin tone palette option
 */
export interface SkinToneOption {
  id: string;
  name: string;
  hex: string;
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
  activeCategory: 'body' | 'hair';
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
