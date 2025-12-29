/**
 * Character Creator Defaults
 * Default values, presets, and palettes for character customization
 *
 * NOTE: Simplified to colors-only for MVP - no morph targets
 */

import type {
  CharacterConfig,
  SkinToneOption,
  HairStyle,
  BodyType,
} from './types';

/**
 * Current schema version for migrations
 */
export const CHARACTER_CONFIG_VERSION = 2; // Bumped for simplified schema

/**
 * Default character configuration
 */
export function createDefaultCharacterConfig(): CharacterConfig {
  const now = new Date().toISOString();
  return {
    version: CHARACTER_CONFIG_VERSION,
    bodyType: 'male',

    // Colors
    skinTone: '#C68642', // Medium brown
    eyeColor: '#6B4423', // Brown

    // Hair
    hairStyleId: 'short_fade',
    hairColor: '#1A1A1A', // Near black
    hairHighlightColor: undefined,

    // Metadata
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Skin tone palette - inclusive range of options
 */
export const SKIN_TONE_PALETTE: SkinToneOption[] = [
  // Light tones
  { id: 'pale', name: 'Pale', hex: '#FFE0BD' },
  { id: 'fair', name: 'Fair', hex: '#FFCD94' },
  { id: 'light', name: 'Light', hex: '#EAC086' },
  { id: 'light_tan', name: 'Light Tan', hex: '#DFAD69' },

  // Medium tones
  { id: 'tan', name: 'Tan', hex: '#D09B5C' },
  { id: 'medium', name: 'Medium', hex: '#C68642' },
  { id: 'olive', name: 'Olive', hex: '#B07B47' },
  { id: 'caramel', name: 'Caramel', hex: '#A66E3D' },

  // Dark tones
  { id: 'brown', name: 'Brown', hex: '#8D5524' },
  { id: 'dark_brown', name: 'Dark Brown', hex: '#6B4423' },
  { id: 'deep', name: 'Deep', hex: '#4A3021' },
  { id: 'espresso', name: 'Espresso', hex: '#3B2417' },
];

/**
 * Eye color palette
 */
export const EYE_COLOR_PALETTE: SkinToneOption[] = [
  { id: 'brown', name: 'Brown', hex: '#6B4423' },
  { id: 'dark_brown', name: 'Dark Brown', hex: '#3D2314' },
  { id: 'hazel', name: 'Hazel', hex: '#8E7618' },
  { id: 'green', name: 'Green', hex: '#4A7023' },
  { id: 'blue', name: 'Blue', hex: '#4B88A2' },
  { id: 'gray', name: 'Gray', hex: '#6B7B8C' },
  { id: 'amber', name: 'Amber', hex: '#B5651D' },
  { id: 'black', name: 'Black', hex: '#1A1A1A' },
];

/**
 * Hair color palette
 */
export const HAIR_COLOR_PALETTE: SkinToneOption[] = [
  // Natural colors
  { id: 'black', name: 'Black', hex: '#1A1A1A' },
  { id: 'dark_brown', name: 'Dark Brown', hex: '#3B2417' },
  { id: 'brown', name: 'Brown', hex: '#6B4423' },
  { id: 'light_brown', name: 'Light Brown', hex: '#A67B5B' },
  { id: 'blonde', name: 'Blonde', hex: '#D4A853' },
  { id: 'platinum', name: 'Platinum', hex: '#E8E4C9' },
  { id: 'ginger', name: 'Ginger', hex: '#B55239' },
  { id: 'auburn', name: 'Auburn', hex: '#6D3222' },
  { id: 'gray', name: 'Gray', hex: '#808080' },
  { id: 'white', name: 'White', hex: '#E8E8E8' },

  // Fashion colors
  { id: 'purple', name: 'Purple', hex: '#7B2D8E' },
  { id: 'blue', name: 'Blue', hex: '#2E5EAA' },
  { id: 'pink', name: 'Pink', hex: '#E75480' },
  { id: 'red', name: 'Red', hex: '#C41E3A' },
  { id: 'green', name: 'Green', hex: '#228B22' },
  { id: 'teal', name: 'Teal', hex: '#008B8B' },
];

/**
 * Hair styles catalog
 */
export const HAIR_STYLES: HairStyle[] = [
  // Short styles
  {
    id: 'bald',
    name: 'Bald',
    modelPath: '', // No model needed
    thumbnailPath: '/images/character/hair/bald.webp',
    compatibleWith: ['male', 'female'],
    supportsHighlights: false,
  },
  {
    id: 'buzzcut',
    name: 'Buzz Cut',
    modelPath: '/models/Characters/Hair/buzzcut.glb',
    thumbnailPath: '/images/character/hair/buzzcut.webp',
    compatibleWith: ['male', 'female'],
    supportsHighlights: false,
  },
  {
    id: 'short_fade',
    name: 'Short Fade',
    modelPath: '/models/Characters/Hair/short_fade.glb',
    thumbnailPath: '/images/character/hair/short_fade.webp',
    compatibleWith: ['male', 'female'],
    supportsHighlights: true,
  },
  {
    id: 'short_textured',
    name: 'Short Textured',
    modelPath: '/models/Characters/Hair/short_textured.glb',
    thumbnailPath: '/images/character/hair/short_textured.webp',
    compatibleWith: ['male', 'female'],
    supportsHighlights: true,
  },
  {
    id: 'curly_short',
    name: 'Curly Short',
    modelPath: '/models/Characters/Hair/curly_short.glb',
    thumbnailPath: '/images/character/hair/curly_short.webp',
    compatibleWith: ['male', 'female'],
    supportsHighlights: true,
  },

  // Medium styles
  {
    id: 'medium_wavy',
    name: 'Medium Wavy',
    modelPath: '/models/Characters/Hair/medium_wavy.glb',
    thumbnailPath: '/images/character/hair/medium_wavy.webp',
    compatibleWith: ['male', 'female'],
    supportsHighlights: true,
  },
  {
    id: 'medium_straight',
    name: 'Medium Straight',
    modelPath: '/models/Characters/Hair/medium_straight.glb',
    thumbnailPath: '/images/character/hair/medium_straight.webp',
    compatibleWith: ['male', 'female'],
    supportsHighlights: true,
  },
  {
    id: 'afro_medium',
    name: 'Afro',
    modelPath: '/models/Characters/Hair/afro_medium.glb',
    thumbnailPath: '/images/character/hair/afro_medium.webp',
    compatibleWith: ['male', 'female'],
    supportsHighlights: true,
  },

  // Long styles
  {
    id: 'long_straight',
    name: 'Long Straight',
    modelPath: '/models/Characters/Hair/long_straight.glb',
    thumbnailPath: '/images/character/hair/long_straight.webp',
    compatibleWith: ['male', 'female'],
    supportsHighlights: true,
  },
  {
    id: 'long_wavy',
    name: 'Long Wavy',
    modelPath: '/models/Characters/Hair/long_wavy.glb',
    thumbnailPath: '/images/character/hair/long_wavy.webp',
    compatibleWith: ['male', 'female'],
    supportsHighlights: true,
  },
  {
    id: 'ponytail',
    name: 'Ponytail',
    modelPath: '/models/Characters/Hair/ponytail.glb',
    thumbnailPath: '/images/character/hair/ponytail.webp',
    compatibleWith: ['male', 'female'],
    supportsHighlights: true,
  },
  {
    id: 'braids',
    name: 'Braids',
    modelPath: '/models/Characters/Hair/braids.glb',
    thumbnailPath: '/images/character/hair/braids.webp',
    compatibleWith: ['male', 'female'],
    supportsHighlights: true,
  },
  {
    id: 'mohawk',
    name: 'Mohawk',
    modelPath: '/models/Characters/Hair/mohawk.glb',
    thumbnailPath: '/images/character/hair/mohawk.webp',
    compatibleWith: ['male', 'female'],
    supportsHighlights: true,
  },
];

/**
 * Body type options for UI
 */
export const BODY_TYPES: { id: BodyType; name: string; description: string }[] = [
  { id: 'male', name: 'Male', description: 'Masculine body type' },
  { id: 'female', name: 'Female', description: 'Feminine body type' },
];
