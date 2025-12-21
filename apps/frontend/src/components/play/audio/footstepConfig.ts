/**
 * footstepConfig.ts
 * Configuration for terrain-based footstep sounds.
 *
 * Maps biomes to surface types and defines timing modifiers.
 */

import { BiomeType } from '../../../lib/terrain';
import type { GroundSurface } from './useFootsteps';

// =============================================================================
// BIOME TO SURFACE MAPPING
// =============================================================================

/**
 * Maps 18 biomes to footstep surface types.
 * Used by useTerrainFootsteps to auto-detect walking surface.
 */
export const BIOME_TO_SURFACE: Record<BiomeType, GroundSurface> = {
  // Water biomes -> swimming
  [BiomeType.DEEP_OCEAN]: 'water',
  [BiomeType.SHALLOW_OCEAN]: 'water',

  // Beach -> sand
  [BiomeType.BEACH]: 'sand',

  // Wetland -> mud
  [BiomeType.MARSH]: 'mud',
  [BiomeType.SWAMP]: 'mud',

  // Grassland -> grass
  [BiomeType.GRASSLAND]: 'grass',
  [BiomeType.MEADOW]: 'grass',
  [BiomeType.SAVANNA]: 'grass',

  // Forest -> grass (forest floor)
  [BiomeType.TEMPERATE_FOREST]: 'grass',
  [BiomeType.BOREAL_FOREST]: 'grass',
  [BiomeType.RAINFOREST]: 'mud', // Tropical = muddy

  // Dry -> sand
  [BiomeType.DESERT]: 'sand',
  [BiomeType.SCRUBLAND]: 'sand',

  // Mountain -> rock
  [BiomeType.ALPINE_MEADOW]: 'rock',
  [BiomeType.ROCKY_MOUNTAIN]: 'rock',

  // Snow -> snow
  [BiomeType.SNOW_PEAK]: 'snow',
  [BiomeType.GLACIER]: 'snow',
};

// =============================================================================
// STEP INTERVAL MODIFIERS
// =============================================================================

/**
 * Step interval multipliers by surface.
 * Values > 1.0 = slower steps (harder to walk on).
 * Values < 1.0 = faster steps (easier surface).
 */
export const SURFACE_SPEED_MODIFIER: Record<GroundSurface, number> = {
  concrete: 1.0,
  grass: 1.0,
  metal: 1.0,
  wood: 1.0,
  sand: 1.15, // Slightly slower on sand
  rock: 0.95, // Slightly faster on rock
  snow: 1.2, // Slower in snow
  mud: 1.25, // Slowest in mud
  water: 1.5, // Swimming is slower
};

// =============================================================================
// SWIMMING SETTINGS
// =============================================================================

/** Interval between swim strokes (ms) */
export const SWIM_STROKE_INTERVAL = 800;

/** Volume multiplier for swimming sounds */
export const SWIM_VOLUME_MULTIPLIER = 0.8;

// =============================================================================
// SURFACE DESCRIPTIONS (for debugging/UI)
// =============================================================================

export const SURFACE_DESCRIPTIONS: Record<GroundSurface, string> = {
  concrete: 'Hard surface, clear footsteps',
  grass: 'Soft rustling, muffled steps',
  metal: 'Metallic clanking',
  wood: 'Hollow wooden thuds',
  sand: 'Soft crunching, shifting sand',
  rock: 'Hard stone clacking',
  snow: 'Crunchy snow compression',
  mud: 'Squelchy, wet steps',
  water: 'Swimming strokes',
};
