/**
 * ambientConfig.ts
 * Configuration for biome-based ambient audio system
 *
 * Maps 16 biomes to 8 ambient zones for efficient audio file management.
 * Supports day/night variation and weather overlays.
 */

import { BiomeType } from '../../../lib/terrain';

// =============================================================================
// TYPES
// =============================================================================

export type AmbientZone =
  | 'ocean'
  | 'beach'
  | 'wetland'
  | 'grassland'
  | 'forest'
  | 'dry'
  | 'mountain'
  | 'snow';

export type TimeOfDay = 'day' | 'night';

export type WeatherType = 'clear' | 'rain_light' | 'rain_heavy' | 'wind' | 'storm';

// =============================================================================
// BIOME TO ZONE MAPPING
// =============================================================================

/**
 * Maps 16 biomes to 8 ambient zones to reduce audio file count.
 * Similar biomes share the same ambient soundscape.
 */
export const BIOME_TO_ZONE: Record<BiomeType, AmbientZone> = {
  // Water biomes -> ocean zone
  [BiomeType.DEEP_OCEAN]: 'ocean',
  [BiomeType.SHALLOW_OCEAN]: 'ocean',

  // Coastal biomes -> beach zone
  [BiomeType.BEACH]: 'beach',

  // Wetland biomes -> wetland zone
  [BiomeType.MARSH]: 'wetland',
  [BiomeType.SWAMP]: 'wetland',

  // Grassland biomes -> grassland zone
  [BiomeType.GRASSLAND]: 'grassland',
  [BiomeType.MEADOW]: 'grassland',
  [BiomeType.SAVANNA]: 'grassland',

  // Forest biomes -> forest zone
  [BiomeType.TEMPERATE_FOREST]: 'forest',
  [BiomeType.BOREAL_FOREST]: 'forest',
  [BiomeType.RAINFOREST]: 'forest',

  // Dry biomes -> dry zone
  [BiomeType.DESERT]: 'dry',
  [BiomeType.SCRUBLAND]: 'dry',

  // Mountain biomes -> mountain zone
  [BiomeType.ALPINE_MEADOW]: 'mountain',
  [BiomeType.ROCKY_MOUNTAIN]: 'mountain',

  // Snow biomes -> snow zone
  [BiomeType.SNOW_PEAK]: 'snow',
  [BiomeType.GLACIER]: 'snow',
};

// =============================================================================
// AUDIO FILE PATHS (PLACEHOLDERS)
// =============================================================================

/**
 * Audio file paths for each zone and time of day.
 * Replace these placeholder paths with real audio files.
 *
 * Recommended audio specs:
 * - Format: MP3 or OGG
 * - Duration: 60-120 seconds (seamless loop)
 * - Bitrate: 128-192 kbps
 * - Stereo
 */
export const ZONE_AUDIO: Record<AmbientZone, Record<TimeOfDay, string>> = {
  ocean: {
    day: '/audio/ambient/zones/ocean_day.mp3',
    night: '/audio/ambient/zones/ocean_night.mp3',
  },
  beach: {
    day: '/audio/ambient/zones/beach_day.mp3',
    night: '/audio/ambient/zones/beach_night.mp3',
  },
  wetland: {
    day: '/audio/ambient/zones/wetland_day.mp3',
    night: '/audio/ambient/zones/wetland_night.mp3',
  },
  grassland: {
    day: '/audio/ambient/zones/grassland_day.mp3',
    night: '/audio/ambient/zones/grassland_night.mp3',
  },
  forest: {
    day: '/audio/ambient/zones/forest_day.mp3',
    night: '/audio/ambient/zones/forest_night.mp3',
  },
  dry: {
    day: '/audio/ambient/zones/dry_day.mp3',
    night: '/audio/ambient/zones/dry_night.mp3',
  },
  mountain: {
    day: '/audio/ambient/zones/mountain_day.mp3',
    night: '/audio/ambient/zones/mountain_night.mp3',
  },
  snow: {
    day: '/audio/ambient/zones/snow_day.mp3',
    night: '/audio/ambient/zones/snow_night.mp3',
  },
};

/**
 * Weather overlay audio paths.
 * These layer on top of biome audio.
 */
export const WEATHER_AUDIO: Record<Exclude<WeatherType, 'clear'>, string> = {
  rain_light: '/audio/ambient/weather/rain_light.mp3',
  rain_heavy: '/audio/ambient/weather/rain_heavy.mp3',
  wind: '/audio/ambient/weather/wind_strong.mp3',
  storm: '/audio/ambient/weather/storm.mp3',
};

// =============================================================================
// AUDIO SETTINGS
// =============================================================================

/** Crossfade duration in milliseconds */
export const CROSSFADE_DURATION = 2500;

/** Minimum interval between position checks (ms) */
export const POSITION_CHECK_INTERVAL = 500;

/** Minimum distance player must move to trigger biome check (meters) */
export const MIN_MOVEMENT_DISTANCE = 5;

/** Base volume for biome ambient audio (0-1) */
export const BIOME_BASE_VOLUME = 0.6;

/** Volume levels for weather overlays */
export const WEATHER_VOLUMES: Record<WeatherType, number> = {
  clear: 0,
  rain_light: 0.3,
  rain_heavy: 0.6,
  wind: 0.4,
  storm: 0.8,
};

/** How much to reduce biome volume during heavy weather */
export const WEATHER_BIOME_DUCKING: Record<WeatherType, number> = {
  clear: 1.0,
  rain_light: 0.9,
  rain_heavy: 0.6,
  wind: 0.8,
  storm: 0.2,
};

// =============================================================================
// ZONE DESCRIPTIONS (for debugging/UI)
// =============================================================================

export const ZONE_DESCRIPTIONS: Record<AmbientZone, { day: string; night: string }> = {
  ocean: {
    day: 'Underwater ambience, muffled waves',
    night: 'Deep, eerie underwater sounds',
  },
  beach: {
    day: 'Waves crashing, seagulls calling',
    night: 'Gentle waves, soft wind',
  },
  wetland: {
    day: 'Frogs, insects, water splashes',
    night: 'Crickets, owls, distant splashes',
  },
  grassland: {
    day: 'Wind through grass, birdsong',
    night: 'Crickets, distant howls',
  },
  forest: {
    day: 'Birds, rustling leaves, woodland creatures',
    night: 'Owls, nocturnal insects, wind',
  },
  dry: {
    day: 'Hot wind, heat shimmer, rattlesnake',
    night: 'Cold wind, coyotes',
  },
  mountain: {
    day: 'Wind gusts, eagles, echoes',
    night: 'Strong wind, silence',
  },
  snow: {
    day: 'Howling wind, ice creaking',
    night: 'Blizzard, distant wolves',
  },
};
