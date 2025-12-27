/**
 * Character Creator Defaults
 * Default values, presets, and palettes for character customization
 */

import type {
  CharacterConfig,
  SkinToneOption,
  FacePreset,
  HairStyle,
  BodyType,
} from './types';

/**
 * Current schema version for migrations
 */
export const CHARACTER_CONFIG_VERSION = 1;

/**
 * Default character configuration
 */
export function createDefaultCharacterConfig(): CharacterConfig {
  const now = new Date().toISOString();
  return {
    version: CHARACTER_CONFIG_VERSION,
    bodyType: 'male',

    // Body
    skinTone: '#C68642', // Medium brown
    height: 0.5, // Average height (1.75m)
    build: 'average',

    // Face
    facePreset: 1,
    eyeSize: 0,
    eyeSpacing: 0,
    noseWidth: 0,
    noseLength: 0,
    jawWidth: 0,
    chinLength: 0,
    lipFullness: 0,
    cheekboneHeight: 0,

    // Hair
    hairStyleId: 'short_fade',
    hairColor: '#1A1A1A', // Near black
    hairHighlightColor: undefined,

    // Eyes
    eyeColor: '#6B4423', // Brown

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
 * Face presets - predefined face shapes
 */
export const FACE_PRESETS: FacePreset[] = [
  {
    id: 1,
    name: 'Classic',
    thumbnailPath: '/images/character/faces/preset_01.webp',
    morphDefaults: {
      eyeSize: 0,
      eyeSpacing: 0,
      noseWidth: 0,
      noseLength: 0,
      jawWidth: 0,
      chinLength: 0,
      lipFullness: 0,
      cheekboneHeight: 0,
    },
  },
  {
    id: 2,
    name: 'Sharp',
    thumbnailPath: '/images/character/faces/preset_02.webp',
    morphDefaults: {
      eyeSize: -0.2,
      eyeSpacing: 0.1,
      noseWidth: -0.3,
      noseLength: 0.2,
      jawWidth: -0.2,
      chinLength: 0.2,
      lipFullness: -0.2,
      cheekboneHeight: 0.3,
    },
  },
  {
    id: 3,
    name: 'Soft',
    thumbnailPath: '/images/character/faces/preset_03.webp',
    morphDefaults: {
      eyeSize: 0.2,
      eyeSpacing: 0,
      noseWidth: 0.1,
      noseLength: -0.1,
      jawWidth: 0.2,
      chinLength: -0.2,
      lipFullness: 0.3,
      cheekboneHeight: -0.1,
    },
  },
  {
    id: 4,
    name: 'Strong',
    thumbnailPath: '/images/character/faces/preset_04.webp',
    morphDefaults: {
      eyeSize: -0.1,
      eyeSpacing: 0.15,
      noseWidth: 0.2,
      noseLength: 0,
      jawWidth: 0.4,
      chinLength: 0.1,
      lipFullness: 0,
      cheekboneHeight: 0.2,
    },
  },
  {
    id: 5,
    name: 'Refined',
    thumbnailPath: '/images/character/faces/preset_05.webp',
    morphDefaults: {
      eyeSize: 0.1,
      eyeSpacing: -0.1,
      noseWidth: -0.2,
      noseLength: 0.1,
      jawWidth: -0.3,
      chinLength: 0.15,
      lipFullness: 0.1,
      cheekboneHeight: 0.15,
    },
  },
  {
    id: 6,
    name: 'Natural',
    thumbnailPath: '/images/character/faces/preset_06.webp',
    morphDefaults: {
      eyeSize: 0.05,
      eyeSpacing: 0.05,
      noseWidth: 0.1,
      noseLength: 0.05,
      jawWidth: 0.1,
      chinLength: 0,
      lipFullness: 0.15,
      cheekboneHeight: 0,
    },
  },
];

/**
 * Hair styles catalog
 * Note: These will need actual GLB files to be created
 */
export const HAIR_STYLES: HairStyle[] = [
  // Short styles
  {
    id: 'bald',
    name: 'Bald',
    modelPath: '', // No model needed
    thumbnailPath: '/images/character/hair/bald.webp',
    compatibleWith: ['male', 'female', 'neutral'],
    supportsHighlights: false,
  },
  {
    id: 'buzzcut',
    name: 'Buzz Cut',
    modelPath: '/models/Characters/Hair/buzzcut.glb',
    thumbnailPath: '/images/character/hair/buzzcut.webp',
    compatibleWith: ['male', 'female', 'neutral'],
    supportsHighlights: false,
  },
  {
    id: 'short_fade',
    name: 'Short Fade',
    modelPath: '/models/Characters/Hair/short_fade.glb',
    thumbnailPath: '/images/character/hair/short_fade.webp',
    compatibleWith: ['male', 'female', 'neutral'],
    supportsHighlights: true,
  },
  {
    id: 'short_textured',
    name: 'Short Textured',
    modelPath: '/models/Characters/Hair/short_textured.glb',
    thumbnailPath: '/images/character/hair/short_textured.webp',
    compatibleWith: ['male', 'female', 'neutral'],
    supportsHighlights: true,
  },
  {
    id: 'curly_short',
    name: 'Curly Short',
    modelPath: '/models/Characters/Hair/curly_short.glb',
    thumbnailPath: '/images/character/hair/curly_short.webp',
    compatibleWith: ['male', 'female', 'neutral'],
    supportsHighlights: true,
  },

  // Medium styles
  {
    id: 'medium_wavy',
    name: 'Medium Wavy',
    modelPath: '/models/Characters/Hair/medium_wavy.glb',
    thumbnailPath: '/images/character/hair/medium_wavy.webp',
    compatibleWith: ['male', 'female', 'neutral'],
    supportsHighlights: true,
  },
  {
    id: 'medium_straight',
    name: 'Medium Straight',
    modelPath: '/models/Characters/Hair/medium_straight.glb',
    thumbnailPath: '/images/character/hair/medium_straight.webp',
    compatibleWith: ['male', 'female', 'neutral'],
    supportsHighlights: true,
  },
  {
    id: 'afro_medium',
    name: 'Afro',
    modelPath: '/models/Characters/Hair/afro_medium.glb',
    thumbnailPath: '/images/character/hair/afro_medium.webp',
    compatibleWith: ['male', 'female', 'neutral'],
    supportsHighlights: true,
  },

  // Long styles
  {
    id: 'long_straight',
    name: 'Long Straight',
    modelPath: '/models/Characters/Hair/long_straight.glb',
    thumbnailPath: '/images/character/hair/long_straight.webp',
    compatibleWith: ['male', 'female', 'neutral'],
    supportsHighlights: true,
  },
  {
    id: 'long_wavy',
    name: 'Long Wavy',
    modelPath: '/models/Characters/Hair/long_wavy.glb',
    thumbnailPath: '/images/character/hair/long_wavy.webp',
    compatibleWith: ['male', 'female', 'neutral'],
    supportsHighlights: true,
  },
  {
    id: 'ponytail',
    name: 'Ponytail',
    modelPath: '/models/Characters/Hair/ponytail.glb',
    thumbnailPath: '/images/character/hair/ponytail.webp',
    compatibleWith: ['male', 'female', 'neutral'],
    supportsHighlights: true,
  },
  {
    id: 'braids',
    name: 'Braids',
    modelPath: '/models/Characters/Hair/braids.glb',
    thumbnailPath: '/images/character/hair/braids.webp',
    compatibleWith: ['male', 'female', 'neutral'],
    supportsHighlights: true,
  },
];

/**
 * Build type descriptions
 */
export const BUILD_TYPES: { type: BodyType extends infer T ? T : never; id: string; name: string; description: string }[] = [
  { type: 'male' as BodyType, id: 'slim', name: 'Slim', description: 'Lean and slender build' },
  { type: 'male' as BodyType, id: 'average', name: 'Average', description: 'Balanced proportions' },
  { type: 'male' as BodyType, id: 'athletic', name: 'Athletic', description: 'Toned and fit' },
  { type: 'male' as BodyType, id: 'heavy', name: 'Heavy', description: 'Broad and sturdy' },
];

/**
 * Height range configuration
 */
export const HEIGHT_CONFIG = {
  min: 1.55, // meters
  max: 1.95, // meters
  default: 1.75, // meters
  /** Convert 0-1 slider value to actual height in meters */
  toMeters: (value: number): number => {
    return HEIGHT_CONFIG.min + value * (HEIGHT_CONFIG.max - HEIGHT_CONFIG.min);
  },
  /** Convert height in meters to 0-1 slider value */
  toSlider: (meters: number): number => {
    return (meters - HEIGHT_CONFIG.min) / (HEIGHT_CONFIG.max - HEIGHT_CONFIG.min);
  },
  /** Format height for display */
  format: (value: number): string => {
    const meters = HEIGHT_CONFIG.toMeters(value);
    const feet = Math.floor(meters * 3.28084);
    const inches = Math.round((meters * 3.28084 - feet) * 12);
    return `${meters.toFixed(2)}m / ${feet}'${inches}"`;
  },
};

/**
 * Morph target name mapping
 * Maps our config keys to actual morph target names in the GLB
 */
export const MORPH_TARGET_NAMES = {
  // Face morphs (on Head mesh)
  facePreset_1: 'FacePreset_01',
  facePreset_2: 'FacePreset_02',
  facePreset_3: 'FacePreset_03',
  facePreset_4: 'FacePreset_04',
  facePreset_5: 'FacePreset_05',
  facePreset_6: 'FacePreset_06',
  eyeSize: 'EyeSize',
  eyeSpacing: 'EyeSpacing',
  noseWidth: 'NoseWidth',
  noseLength: 'NoseLength',
  jawWidth: 'JawWidth',
  chinLength: 'ChinLength',
  lipFullness: 'LipFullness',
  cheekboneHeight: 'CheekboneHeight',

  // Body morphs (on Body mesh)
  build_slim: 'Build_Slim',
  build_athletic: 'Build_Athletic',
  build_heavy: 'Build_Heavy',
  shoulderWidth: 'ShoulderWidth',
};
