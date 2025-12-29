/**
 * WorldConfig.ts
 *
 * Centralized world configuration with Leva integration.
 * Extracted from PlayWorld.tsx to reduce file size and enable:
 * - Preset system (default, performance, cinematic)
 * - Save/load configuration
 * - Headless mode for testing
 *
 * References:
 * - https://www.gamedeveloper.com/design/devs-weigh-in-on-the-best-ways-to-use-but-not-abuse-procedural-generation
 */

import { useRef, useEffect } from 'react';
import { useControls, folder, button } from 'leva';
import { FogType } from '../fog';

// =============================================================================
// TYPES
// =============================================================================

export const SKYBOX_PRESETS = ['none', 'stars', 'sunset', 'night', 'dawn', 'hdri', 'warehouse', 'forest', 'city'] as const;
export type SkyboxPreset = typeof SKYBOX_PRESETS[number];

export const HDRI_FILES = [
  'hilly_terrain_4k.jpg',
  'kloppenheim_02_puresky_4k.jpg',
  'kloppenheim_03_puresky_4k.jpg',
  'qwantani_noon_puresky_4k.jpg',
  'goegap_road_4k.jpg',
] as const;
export type HDRIFile = typeof HDRI_FILES[number];

export interface WorldConfig {
  // Skybox
  skyboxType: SkyboxPreset;
  hdriFile: HDRIFile;
  hdriIntensity: number;
  hdriBlur: number;
  sunPosition: { x: number; y: number; z: number };
  turbidity: number;
  rayleigh: number;
  mieCoefficient: number;
  mieDirectionalG: number;
  starsCount: number;
  starsFactor: number;

  // Enhanced Sky (procedural with sun disk and stars)
  enhancedSkyShowSunDisk: boolean;
  enhancedSkyShowStars: boolean;
  enhancedSkyStarsIntensity: number;

  // HDR Skybox
  hdriBackgroundIntensity: number;

  // View Distance & Fog
  fogEnabled: boolean;
  fogType: FogType;
  fogNear: number;
  fogFar: number;
  fogDensity: number;
  fogColor: string;
  fogHeightEnabled: boolean;
  fogBaseHeight: number;
  fogHeightFalloff: number;
  fogMinDensity: number;
  starsRadius: number;

  // Terrain (5-chunk Rust-style island)
  terrainSeed: number;
  terrainRadius: number;
  terrainTextured: boolean;
  terrainWireframe: boolean;
  terrainColor: string;
  physicsResolution: number;
  waterEnabled: boolean;

  // Foliage
  grassEnabled: boolean;
  grassDensity: number;
  windEnabled: boolean;
  treesEnabled: boolean;
  oakTreeDensity: number;
  palmTreeDensity: number;

  // Procedural Grass (SimonDev Quick_Grass style)
  proceduralGrassEnabled: boolean;
  proceduralGrassBladesPerChunk: number;
  proceduralGrassMaxRenderDistance: number;
  /** Coverage multiplier - scales patch area (1=10m, 6.4=full chunk 64m) */
  proceduralGrassDensity: number;
  /** Blade size multiplier (affects height/width proportionally) */
  proceduralGrassBladeScale: number;
  /** Wind animation speed (0=still, 0.3=calm, 1=normal) */
  proceduralGrassWindSpeed: number;
  // Legacy props (may still be used by some components)
  proceduralGrassBladeHeight: number;
  proceduralGrassWindStrength: number;
  proceduralGrassDisplacementEnabled: boolean;
  proceduralGrassDisplacementRadius: number;
  proceduralGrassBaseColor: string;
  proceduralGrassTipColor: string;
  proceduralGrassVoronoiClumping: boolean;
  proceduralGrassVoronoiLargeCellSize: number;
  proceduralGrassVoronoiSmallCellSize: number;
  proceduralGrassVoronoiDensityThreshold: number;

  // Rocks
  rockDensity: number;
  rockSizeMultiplier: number;
  rockSizeVariation: number;

  // Cliffs - Density
  cliffsEnabled: boolean;
  cliffGridDensity: number;
  cliffMinSpacing: number;
  cliffRockWeightThreshold: number;
  cliffMinElevation: number;
  cliffMountainMaskThreshold: number;

  // Cliffs - Scale
  cliffScaleMin: number;
  cliffScaleMax: number;
  cliffSlopeScaleInfluence: number;
  cliffXZScaleMin: number;
  cliffXZScaleMax: number;
  cliffYScaleMin: number;
  cliffYScaleMax: number;

  // Cliffs - Orientation
  cliffSlopeAlignment: number;
  cliffRandomTilt: number;
  cliffRandomYaw: number;

  // Cliffs - Stacking
  cliffVerticalStacking: boolean;
  cliffVerticalSpacing: number;
  cliffMaxStackHeight: number;

  // Cliffs - Embedding
  cliffEmbedDepth: number;

  // Campfire
  campfireEnabled: boolean;
  campfireScale: number;
  campfireFireScale: number;
  campfireLightIntensity: number;
  campfireLightDistance: number;
  campfireLit: boolean;
  campfireRange: number;

  // Grid & Bounds
  showGrid: boolean;
  showBoundaryWalls: boolean;
  gridLabelSize: number;

  // Audio
  ambientAudioEnabled: boolean;

  // Visibility/Occlusion Culling
  visibilityEnabled: boolean;
  visibilityHzbEnabled: boolean;
  visibilityTemporalCoherence: boolean;
  visibilityPerInstanceCulling: boolean;
  visibilityConservativeMargin: number;
  visibilityDebug: boolean;

  // Lighting & Shadows
  shadowsEnabled: boolean;
  shadowQuality: 'off' | 'low' | 'medium' | 'high' | 'ultra';
  shadowBias: number;
  shadowNormalBias: number;
  sunIntensity: number;
  sunColor: string;
  ambientIntensity: number;
  lightingSkyColor: string;
  lightingGroundColor: string;
  contactShadowsEnabled: boolean;
  contactShadowOpacity: number;
  timeOfDay: 'cycle' | 'custom' | 'dawn' | 'morning' | 'noon' | 'afternoon' | 'sunset' | 'night';
  shadowCameraSize: number;

  // Day/Night Cycle
  dayNightCycleEnabled: boolean;
  cycleDuration: number; // Full cycle in seconds (default 1800 = 30 min)
  timeSpeed: number; // Speed multiplier (1.0 = normal)
}

// =============================================================================
// DEFAULT VALUES
// =============================================================================

export const DEFAULT_WORLD_CONFIG: WorldConfig = {
  // Skybox
  skyboxType: 'sunset',  // Uses EnhancedSky with day/night cycle (not HDRI)
  hdriFile: 'hilly_terrain_4k.jpg',
  hdriIntensity: 1.0,
  hdriBlur: 0,
  sunPosition: { x: 100, y: 20, z: 100 },
  turbidity: 10,
  rayleigh: 2,
  mieCoefficient: 0.005,
  mieDirectionalG: 0.8,
  starsCount: 1000,
  starsFactor: 4,

  // Enhanced Sky (procedural with sun disk and stars)
  enhancedSkyShowSunDisk: true,
  enhancedSkyShowStars: true,
  enhancedSkyStarsIntensity: 1.0,

  // HDR Skybox
  hdriBackgroundIntensity: 1.0,

  // View Distance & Fog (ShaderX2 fog types)
  // NOTE: fogNear/fogFar are IGNORED - PlayWorld uses renderDistance from gameSettings.store
  fogEnabled: true,
  fogType: FogType.ExponentialSquared, // Best visual quality: smooth near camera, gradual falloff
  fogNear: 150,  // Not used - see gameSettings.store.ts
  fogFar: 384,   // Not used - synced to CHUNK_LOAD_RADIUS in gameSettings
  fogDensity: 0.008, // For exponential types (0.001-0.1 typical)
  fogColor: '#b3c4d9',
  fogHeightEnabled: false,
  fogBaseHeight: 0,
  fogHeightFalloff: 0.02,
  fogMinDensity: 0.3,
  starsRadius: 10000,

  // Terrain (5-chunk Rust-style island: 320m radius)
  terrainSeed: 12345,
  terrainRadius: 5, // 5 chunks = 320m playable radius
  terrainTextured: true,
  terrainWireframe: false,
  terrainColor: '#3d7a37',
  physicsResolution: 384, // Higher resolution = smoother collision (192→384 = ~1.83m per sample, reduces twitching)
  waterEnabled: true,

  // Foliage
  grassEnabled: false,  // Disable legacy grass when using procedural
  grassDensity: 50,
  windEnabled: true,
  treesEnabled: true,
  oakTreeDensity: 8,
  palmTreeDensity: 2,

  // Procedural Grass (SimonDev Quick_Grass style) - ENABLED BY DEFAULT
  proceduralGrassEnabled: true,
  proceduralGrassBladesPerChunk: 3072,  // SimonDev default: 32*32*3
  proceduralGrassMaxRenderDistance: 100,
  // New SimonDev-style controls
  proceduralGrassDensity: 6.4,          // Coverage: 1=10m patch, 6.4=full chunk (64m) - full terrain coverage
  proceduralGrassBladeScale: 0.5,       // Blade size multiplier (height/width) - half size for natural look
  proceduralGrassWindSpeed: 0.5,        // Wind speed: 0=still, 0.5=calm breeze, 1=normal
  // Legacy props (kept for backwards compatibility)
  proceduralGrassBladeHeight: 0.4,
  proceduralGrassWindStrength: 0.5,
  proceduralGrassDisplacementEnabled: true,
  proceduralGrassDisplacementRadius: 1.5,
  proceduralGrassBaseColor: '#1a4d1a',  // Dark green at base
  proceduralGrassTipColor: '#7ab356',   // Yellowish-green at tip
  // Voronoi clumping - creates natural grass patches like Ghost of Tsushima
  proceduralGrassVoronoiClumping: true,       // Enable by default for natural look
  proceduralGrassVoronoiLargeCellSize: 10.0,  // Large meadow patches ~10m
  proceduralGrassVoronoiSmallCellSize: 3.0,   // Small grass tufts ~3m
  proceduralGrassVoronoiDensityThreshold: 0.25, // Skip very sparse areas

  // Rocks
  rockDensity: 8,
  rockSizeMultiplier: 1.0,
  rockSizeVariation: 0.4,

  // Cliffs - Density (user-tuned settings, reduced for FPS)
  cliffsEnabled: true,
  cliffGridDensity: 4,
  cliffMinSpacing: 6,
  cliffRockWeightThreshold: 0.25,
  cliffMinElevation: 18,
  cliffMountainMaskThreshold: 0.4,

  // Cliffs - Scale (user-tuned for natural look)
  cliffScaleMin: 0.3,
  cliffScaleMax: 1.4,
  cliffSlopeScaleInfluence: 0.5,
  cliffXZScaleMin: 0.9,
  cliffXZScaleMax: 0.8,  // Can be less than min for variety
  cliffYScaleMin: 1.0,
  cliffYScaleMax: 1.2,

  // Cliffs - Orientation (aligned to slope, no random tilt)
  cliffSlopeAlignment: 1,
  cliffRandomTilt: 0,
  cliffRandomYaw: 45,

  // Cliffs - Stacking (disabled)
  cliffVerticalStacking: false,
  cliffVerticalSpacing: 3,
  cliffMaxStackHeight: 1,

  // Cliffs - Embedding (deeper for better ground integration)
  cliffEmbedDepth: 0.6,

  // Campfire
  campfireEnabled: true,
  campfireScale: 0.45,
  campfireFireScale: 0.05,
  campfireLightIntensity: 0.6,
  campfireLightDistance: 12,
  campfireLit: true,
  campfireRange: 4,

  // Grid & Bounds
  showGrid: false,
  showBoundaryWalls: false,
  gridLabelSize: 6,

  // Audio
  ambientAudioEnabled: true,

  // Visibility/Occlusion Culling
  visibilityEnabled: true,
  visibilityHzbEnabled: true,
  visibilityTemporalCoherence: true,
  visibilityPerInstanceCulling: true,
  visibilityConservativeMargin: 1.1,
  visibilityDebug: false,

  // Lighting & Shadows
  shadowsEnabled: true,
  shadowQuality: 'medium',
  shadowBias: -0.0001,
  shadowNormalBias: 0.02,
  sunIntensity: 1.2,
  sunColor: '#ffffff',
  ambientIntensity: 0.4,
  lightingSkyColor: '#87CEEB',
  lightingGroundColor: '#3d7a37',
  contactShadowsEnabled: true,
  contactShadowOpacity: 0.5,
  timeOfDay: 'cycle', // Default to automatic day/night cycle
  shadowCameraSize: 150,

  // Day/Night Cycle
  dayNightCycleEnabled: true,
  cycleDuration: 1800, // 30 minutes for full day
  timeSpeed: 1.0, // Normal speed
};

// =============================================================================
// PRESETS
// =============================================================================

export const WORLD_PRESETS = {
  default: DEFAULT_WORLD_CONFIG,

  performance: {
    ...DEFAULT_WORLD_CONFIG,
    terrainRadius: 3,
    grassEnabled: false,
    treesEnabled: false,
    cliffGridDensity: 6,
    cliffMinSpacing: 10,
    rockDensity: 4,
    fogFar: 200,
  },

  cinematic: {
    ...DEFAULT_WORLD_CONFIG,
    hdriIntensity: 1.2,
    fogEnabled: true,
    fogNear: 150,
    fogFar: 400,
    grassEnabled: true,
    grassDensity: 50,
    cliffScaleMax: 1.5,
  },
} as const;

// =============================================================================
// LEVA HOOK
// =============================================================================

/**
 * Custom hook that provides Leva controls for world configuration.
 * Returns the current configuration values.
 */
export function useWorldControls() {
  const cliffSettingsRef = useRef<Record<string, unknown>>({});

  const controls = useControls('🗺️ World', {
    'Skybox': folder({
      skyboxType: {
        value: DEFAULT_WORLD_CONFIG.skyboxType,
        options: SKYBOX_PRESETS as unknown as SkyboxPreset[],
        label: 'Type',
      },
      'HDRI': folder({
        hdriFile: {
          value: DEFAULT_WORLD_CONFIG.hdriFile,
          options: [...HDRI_FILES],
          label: 'File',
        },
        hdriIntensity: { value: DEFAULT_WORLD_CONFIG.hdriIntensity, min: 0.1, max: 3, step: 0.1, label: 'Intensity' },
        hdriBlur: { value: DEFAULT_WORLD_CONFIG.hdriBlur, min: 0, max: 1, step: 0.05, label: 'Blur' },
      }, { collapsed: true }),
      'Procedural': folder({
        sunPosition: { value: DEFAULT_WORLD_CONFIG.sunPosition, label: 'Sun Position' },
        turbidity: { value: DEFAULT_WORLD_CONFIG.turbidity, min: 0, max: 20, step: 0.5, label: 'Turbidity' },
        rayleigh: { value: DEFAULT_WORLD_CONFIG.rayleigh, min: 0, max: 4, step: 0.1, label: 'Rayleigh' },
        mieCoefficient: { value: DEFAULT_WORLD_CONFIG.mieCoefficient, min: 0, max: 0.1, step: 0.001, label: 'Mie Coeff' },
        mieDirectionalG: { value: DEFAULT_WORLD_CONFIG.mieDirectionalG, min: 0, max: 1, step: 0.05, label: 'Mie Dir G' },
      }, { collapsed: true }),
      'Stars': folder({
        starsCount: { value: DEFAULT_WORLD_CONFIG.starsCount, min: 500, max: 5000, step: 500, label: 'Count' },
        starsFactor: { value: DEFAULT_WORLD_CONFIG.starsFactor, min: 1, max: 10, step: 0.5, label: 'Size' },
      }, { collapsed: true }),
      'Enhanced Sky': folder({
        enhancedSkyShowSunDisk: { value: DEFAULT_WORLD_CONFIG.enhancedSkyShowSunDisk, label: 'Show Sun Disk' },
        enhancedSkyShowStars: { value: DEFAULT_WORLD_CONFIG.enhancedSkyShowStars, label: 'Show Stars' },
        enhancedSkyStarsIntensity: { value: DEFAULT_WORLD_CONFIG.enhancedSkyStarsIntensity, min: 0, max: 2, step: 0.1, label: 'Stars Intensity' },
        hdriBackgroundIntensity: { value: DEFAULT_WORLD_CONFIG.hdriBackgroundIntensity, min: 0.1, max: 2, step: 0.1, label: 'HDRI Background' },
      }, { collapsed: true }),
    }, { collapsed: true }),

    'View Distance': folder({
      fogEnabled: { value: DEFAULT_WORLD_CONFIG.fogEnabled, label: 'Enable Fog' },
      fogType: {
        value: DEFAULT_WORLD_CONFIG.fogType,
        options: {
          'None': FogType.None,
          'Linear': FogType.Linear,
          'Exponential': FogType.Exponential,
          'Exp Squared (Best)': FogType.ExponentialSquared,
        },
        label: 'Fog Type',
      },
      fogDensity: { value: DEFAULT_WORLD_CONFIG.fogDensity, min: 0.001, max: 0.05, step: 0.001, label: 'Fog Density' },
      // NOTE: fogNear/fogFar sliders removed - use Settings menu "Render Distance" instead
      // fogNear = renderDistance * 0.4, fogFar = renderDistance (from gameSettings.store)
      fogColor: { value: DEFAULT_WORLD_CONFIG.fogColor, label: 'Fog Color' },
      'Height Fog': folder({
        fogHeightEnabled: { value: DEFAULT_WORLD_CONFIG.fogHeightEnabled, label: 'Enable' },
        fogBaseHeight: { value: DEFAULT_WORLD_CONFIG.fogBaseHeight, min: -10, max: 50, step: 1, label: 'Base Height (m)' },
        fogHeightFalloff: { value: DEFAULT_WORLD_CONFIG.fogHeightFalloff, min: 0.01, max: 0.2, step: 0.01, label: 'Height Falloff' },
        fogMinDensity: { value: DEFAULT_WORLD_CONFIG.fogMinDensity, min: 0, max: 1, step: 0.05, label: 'Min Density' },
      }, { collapsed: true }),
      starsRadius: { value: DEFAULT_WORLD_CONFIG.starsRadius, min: 1000, max: 50000, step: 1000, label: 'Stars Radius' },
    }, { collapsed: true }),

    'Terrain': folder({
      terrainSeed: { value: DEFAULT_WORLD_CONFIG.terrainSeed, min: 1, max: 99999, step: 1, label: 'Seed' },
      terrainRadius: { value: DEFAULT_WORLD_CONFIG.terrainRadius, min: 3, max: 8, step: 1, label: 'Chunk Radius' },
      terrainTextured: { value: DEFAULT_WORLD_CONFIG.terrainTextured, label: 'Use Texture' },
      terrainWireframe: { value: DEFAULT_WORLD_CONFIG.terrainWireframe, label: 'Wireframe' },
      terrainColor: { value: DEFAULT_WORLD_CONFIG.terrainColor, label: 'Base Color' },
      physicsResolution: { value: DEFAULT_WORLD_CONFIG.physicsResolution, min: 64, max: 512, step: 64, label: 'Physics Resolution' },
      waterEnabled: { value: DEFAULT_WORLD_CONFIG.waterEnabled, label: 'Enable Water' },
    }, { collapsed: true }),

    '🌿 Foliage': folder({
      'Legacy Grass': folder({
        grassEnabled: { value: DEFAULT_WORLD_CONFIG.grassEnabled, label: 'Enable (legacy)' },
        grassDensity: { value: DEFAULT_WORLD_CONFIG.grassDensity, min: 0, max: 150, step: 10, label: 'Density' },
        windEnabled: { value: DEFAULT_WORLD_CONFIG.windEnabled, label: 'Wind' },
      }, { collapsed: true }),
      '🌾 Procedural Grass': folder({
        proceduralGrassEnabled: { value: DEFAULT_WORLD_CONFIG.proceduralGrassEnabled, label: 'Enable' },
        // Main controls (user requested)
        proceduralGrassDensity: { value: DEFAULT_WORLD_CONFIG.proceduralGrassDensity, min: 1.0, max: 6.4, step: 0.2, label: '🌱 Coverage (1=patch, 6.4=full)' },
        proceduralGrassBladeScale: { value: DEFAULT_WORLD_CONFIG.proceduralGrassBladeScale, min: 0.3, max: 2.0, step: 0.1, label: '📏 Blade Size' },
        proceduralGrassWindSpeed: { value: DEFAULT_WORLD_CONFIG.proceduralGrassWindSpeed, min: 0, max: 1, step: 0.05, label: '💨 Wind Speed' },
        proceduralGrassMaxRenderDistance: { value: DEFAULT_WORLD_CONFIG.proceduralGrassMaxRenderDistance, min: 30, max: 150, step: 10, label: 'Render Distance' },
        // Advanced settings
        'Advanced': folder({
          proceduralGrassBladesPerChunk: { value: DEFAULT_WORLD_CONFIG.proceduralGrassBladesPerChunk, min: 500, max: 5000, step: 100, label: 'Blades/Chunk' },
          proceduralGrassBladeHeight: { value: DEFAULT_WORLD_CONFIG.proceduralGrassBladeHeight, min: 0.2, max: 0.8, step: 0.05, label: 'Base Height (legacy)' },
          proceduralGrassDisplacementEnabled: { value: DEFAULT_WORLD_CONFIG.proceduralGrassDisplacementEnabled, label: 'Player Displacement' },
          proceduralGrassDisplacementRadius: { value: DEFAULT_WORLD_CONFIG.proceduralGrassDisplacementRadius, min: 0.5, max: 3, step: 0.1, label: 'Displacement Radius' },
          proceduralGrassBaseColor: { value: DEFAULT_WORLD_CONFIG.proceduralGrassBaseColor, label: 'Base Color' },
          proceduralGrassTipColor: { value: DEFAULT_WORLD_CONFIG.proceduralGrassTipColor, label: 'Tip Color' },
        }, { collapsed: true }),
        'Voronoi Clumping': folder({
          proceduralGrassVoronoiClumping: { value: DEFAULT_WORLD_CONFIG.proceduralGrassVoronoiClumping, label: 'Enable Clumping' },
          proceduralGrassVoronoiLargeCellSize: { value: DEFAULT_WORLD_CONFIG.proceduralGrassVoronoiLargeCellSize, min: 4, max: 20, step: 1, label: 'Large Cell Size (m)' },
          proceduralGrassVoronoiSmallCellSize: { value: DEFAULT_WORLD_CONFIG.proceduralGrassVoronoiSmallCellSize, min: 1, max: 8, step: 0.5, label: 'Small Cell Size (m)' },
          proceduralGrassVoronoiDensityThreshold: { value: DEFAULT_WORLD_CONFIG.proceduralGrassVoronoiDensityThreshold, min: 0, max: 0.5, step: 0.05, label: 'Density Threshold' },
        }, { collapsed: true }),
      }, { collapsed: true }),
      treesEnabled: { value: DEFAULT_WORLD_CONFIG.treesEnabled, label: 'Trees' },
      oakTreeDensity: { value: DEFAULT_WORLD_CONFIG.oakTreeDensity, min: 0, max: 20, step: 1, label: 'Oak Trees (grass)' },
      palmTreeDensity: { value: DEFAULT_WORLD_CONFIG.palmTreeDensity, min: 0, max: 12, step: 1, label: 'Palm Trees (sand)' },
    }, { collapsed: true }),

    '🪨 Rocks': folder({
      rockDensity: { value: DEFAULT_WORLD_CONFIG.rockDensity, min: 0, max: 30, step: 1, label: 'Density (per chunk)' },
      rockSizeMultiplier: { value: DEFAULT_WORLD_CONFIG.rockSizeMultiplier, min: 0.5, max: 2.0, step: 0.1, label: 'Size Multiplier' },
      rockSizeVariation: { value: DEFAULT_WORLD_CONFIG.rockSizeVariation, min: 0, max: 1.0, step: 0.1, label: 'Size Variation' },
    }, { collapsed: true }),

    '🏔️ Cliffs': folder({
      cliffsEnabled: { value: DEFAULT_WORLD_CONFIG.cliffsEnabled, label: 'Enable Cliffs' },

      'Density': folder({
        cliffGridDensity: { value: DEFAULT_WORLD_CONFIG.cliffGridDensity, min: 4, max: 16, step: 1, label: 'Grid (NxN)' },
        cliffMinSpacing: { value: DEFAULT_WORLD_CONFIG.cliffMinSpacing, min: 3, max: 15, step: 1, label: 'Min Spacing (m)' },
        cliffRockWeightThreshold: { value: DEFAULT_WORLD_CONFIG.cliffRockWeightThreshold, min: 0.1, max: 0.6, step: 0.05, label: 'Rock Threshold' },
        cliffMinElevation: { value: DEFAULT_WORLD_CONFIG.cliffMinElevation, min: 0, max: 20, step: 1, label: 'Min Elevation (m)' },
        cliffMountainMaskThreshold: { value: DEFAULT_WORLD_CONFIG.cliffMountainMaskThreshold, min: 0, max: 0.5, step: 0.05, label: 'Mountain Mask' },
      }, { collapsed: true }),

      'Scale': folder({
        cliffScaleMin: { value: DEFAULT_WORLD_CONFIG.cliffScaleMin, min: 0.1, max: 1.0, step: 0.1, label: 'Min Scale' },
        cliffScaleMax: { value: DEFAULT_WORLD_CONFIG.cliffScaleMax, min: 0.5, max: 3.0, step: 0.1, label: 'Max Scale' },
        cliffSlopeScaleInfluence: { value: DEFAULT_WORLD_CONFIG.cliffSlopeScaleInfluence, min: 0, max: 1.0, step: 0.1, label: 'Slope → Scale' },
        cliffXZScaleMin: { value: DEFAULT_WORLD_CONFIG.cliffXZScaleMin, min: 0.5, max: 2.0, step: 0.1, label: 'X/Z Min (width)' },
        cliffXZScaleMax: { value: DEFAULT_WORLD_CONFIG.cliffXZScaleMax, min: 0.8, max: 2.5, step: 0.1, label: 'X/Z Max (width)' },
        cliffYScaleMin: { value: DEFAULT_WORLD_CONFIG.cliffYScaleMin, min: 0.2, max: 1.0, step: 0.05, label: 'Y Min (height)' },
        cliffYScaleMax: { value: DEFAULT_WORLD_CONFIG.cliffYScaleMax, min: 0.3, max: 1.2, step: 0.05, label: 'Y Max (height)' },
      }, { collapsed: true }),

      'Orientation': folder({
        cliffSlopeAlignment: { value: DEFAULT_WORLD_CONFIG.cliffSlopeAlignment, min: 0, max: 1, step: 0.1, label: 'Slope Align' },
        cliffRandomTilt: { value: DEFAULT_WORLD_CONFIG.cliffRandomTilt, min: 0, max: 30, step: 2, label: 'Random Tilt (°)' },
        cliffRandomYaw: { value: DEFAULT_WORLD_CONFIG.cliffRandomYaw, min: 0, max: 90, step: 5, label: 'Random Yaw (°)' },
      }, { collapsed: true }),

      'Stacking': folder({
        cliffVerticalStacking: { value: DEFAULT_WORLD_CONFIG.cliffVerticalStacking, label: 'Enable' },
        cliffVerticalSpacing: { value: DEFAULT_WORLD_CONFIG.cliffVerticalSpacing, min: 3, max: 12, step: 1, label: 'Spacing (m)' },
        cliffMaxStackHeight: { value: DEFAULT_WORLD_CONFIG.cliffMaxStackHeight, min: 1, max: 5, step: 1, label: 'Max Height' },
      }, { collapsed: true }),

      cliffEmbedDepth: { value: DEFAULT_WORLD_CONFIG.cliffEmbedDepth, min: 0.1, max: 0.6, step: 0.05, label: 'Embed Depth' },

      'Copy Settings': button(() => {
        const json = JSON.stringify(cliffSettingsRef.current, null, 2);
        navigator.clipboard.writeText(json).then(() => {
          console.log('📋 Cliff settings copied to clipboard:', cliffSettingsRef.current);
        });
      }),
    }, { collapsed: true }),

    '🔥 Campfire': folder({
      campfireEnabled: { value: DEFAULT_WORLD_CONFIG.campfireEnabled, label: 'Show Campfire' },
      campfireScale: { value: DEFAULT_WORLD_CONFIG.campfireScale, min: 0.1, max: 3.0, step: 0.05, label: 'Model Scale' },
      campfireFireScale: { value: DEFAULT_WORLD_CONFIG.campfireFireScale, min: 0.01, max: 2.0, step: 0.01, label: 'Fire Scale' },
      campfireLightIntensity: { value: DEFAULT_WORLD_CONFIG.campfireLightIntensity, min: 0.1, max: 3.0, step: 0.1, label: 'Light Intensity' },
      campfireLightDistance: { value: DEFAULT_WORLD_CONFIG.campfireLightDistance, min: 4, max: 30, step: 1, label: 'Light Distance' },
      campfireLit: { value: DEFAULT_WORLD_CONFIG.campfireLit, label: 'Initially Lit' },
      campfireRange: { value: DEFAULT_WORLD_CONFIG.campfireRange, min: 1, max: 10, step: 0.5, label: 'Interaction Range' },
    }, { collapsed: true }),

    '📍 Grid & Bounds': folder({
      showGrid: { value: DEFAULT_WORLD_CONFIG.showGrid, label: 'Show Grid (A1, B2...)' },
      showBoundaryWalls: { value: DEFAULT_WORLD_CONFIG.showBoundaryWalls, label: 'Show Boundary Walls' },
      gridLabelSize: { value: DEFAULT_WORLD_CONFIG.gridLabelSize, min: 2, max: 12, step: 1, label: 'Grid Label Size' },
    }, { collapsed: true }),

    '🔊 Audio': folder({
      ambientAudioEnabled: { value: DEFAULT_WORLD_CONFIG.ambientAudioEnabled, label: 'Biome Ambient Audio' },
    }, { collapsed: true }),

    '👁️ Visibility': folder({
      visibilityEnabled: { value: DEFAULT_WORLD_CONFIG.visibilityEnabled, label: 'Enable Culling' },
      visibilityHzbEnabled: { value: DEFAULT_WORLD_CONFIG.visibilityHzbEnabled, label: 'HZB Occlusion (Phase 2)' },
      visibilityTemporalCoherence: { value: DEFAULT_WORLD_CONFIG.visibilityTemporalCoherence, label: 'Temporal Coherence' },
      visibilityPerInstanceCulling: { value: DEFAULT_WORLD_CONFIG.visibilityPerInstanceCulling, label: 'Per-Instance Culling' },
      visibilityConservativeMargin: { value: DEFAULT_WORLD_CONFIG.visibilityConservativeMargin, min: 1.0, max: 1.5, step: 0.05, label: 'Conservative Margin' },
      visibilityDebug: { value: DEFAULT_WORLD_CONFIG.visibilityDebug, label: 'Show Debug' },
    }, { collapsed: true }),

    '☀️ Lighting': folder({
      shadowsEnabled: { value: DEFAULT_WORLD_CONFIG.shadowsEnabled, label: 'Enable Shadows' },
      shadowQuality: {
        value: DEFAULT_WORLD_CONFIG.shadowQuality,
        options: ['off', 'low', 'medium', 'high', 'ultra'] as const,
        label: 'Shadow Quality',
      },
      '🌅 Day/Night Cycle': folder({
        dayNightCycleEnabled: { value: DEFAULT_WORLD_CONFIG.dayNightCycleEnabled, label: 'Enable Cycle' },
        timeOfDay: {
          value: DEFAULT_WORLD_CONFIG.timeOfDay,
          options: ['cycle', 'custom', 'dawn', 'morning', 'noon', 'afternoon', 'sunset', 'night'] as const,
          label: 'Time Mode',
        },
        cycleDuration: { value: DEFAULT_WORLD_CONFIG.cycleDuration, min: 60, max: 3600, step: 60, label: 'Cycle Duration (sec)' },
        timeSpeed: { value: DEFAULT_WORLD_CONFIG.timeSpeed, min: 0.1, max: 10, step: 0.1, label: 'Time Speed' },
      }, { collapsed: false }),
      'Sun': folder({
        sunIntensity: { value: DEFAULT_WORLD_CONFIG.sunIntensity, min: 0.1, max: 2.5, step: 0.1, label: 'Intensity' },
        sunColor: { value: DEFAULT_WORLD_CONFIG.sunColor, label: 'Color' },
      }, { collapsed: true }),
      'Ambient': folder({
        ambientIntensity: { value: DEFAULT_WORLD_CONFIG.ambientIntensity, min: 0.1, max: 1.0, step: 0.05, label: 'Intensity' },
        lightingSkyColor: { value: DEFAULT_WORLD_CONFIG.lightingSkyColor, label: 'Sky Color' },
        lightingGroundColor: { value: DEFAULT_WORLD_CONFIG.lightingGroundColor, label: 'Ground Color' },
      }, { collapsed: true }),
      'Contact Shadows': folder({
        contactShadowsEnabled: { value: DEFAULT_WORLD_CONFIG.contactShadowsEnabled, label: 'Enable' },
        contactShadowOpacity: { value: DEFAULT_WORLD_CONFIG.contactShadowOpacity, min: 0.1, max: 1.0, step: 0.1, label: 'Opacity' },
      }, { collapsed: true }),
      'Advanced': folder({
        shadowBias: { value: DEFAULT_WORLD_CONFIG.shadowBias, min: -0.001, max: 0, step: 0.0001, label: 'Shadow Bias' },
        shadowNormalBias: { value: DEFAULT_WORLD_CONFIG.shadowNormalBias, min: 0, max: 0.1, step: 0.005, label: 'Normal Bias' },
        shadowCameraSize: { value: DEFAULT_WORLD_CONFIG.shadowCameraSize, min: 50, max: 300, step: 10, label: 'Shadow Frustum' },
      }, { collapsed: true }),
    }, { collapsed: true }),
  }, { collapsed: true });

  // Keep cliff settings ref updated for copy button
  useEffect(() => {
    cliffSettingsRef.current = {
      // Density
      cliffsEnabled: controls.cliffsEnabled,
      cliffGridDensity: controls.cliffGridDensity,
      cliffMinSpacing: controls.cliffMinSpacing,
      cliffRockWeightThreshold: controls.cliffRockWeightThreshold,
      cliffMinElevation: controls.cliffMinElevation,
      cliffMountainMaskThreshold: controls.cliffMountainMaskThreshold,
      // Scale
      cliffScaleMin: controls.cliffScaleMin,
      cliffScaleMax: controls.cliffScaleMax,
      cliffSlopeScaleInfluence: controls.cliffSlopeScaleInfluence,
      cliffXZScaleMin: controls.cliffXZScaleMin,
      cliffXZScaleMax: controls.cliffXZScaleMax,
      cliffYScaleMin: controls.cliffYScaleMin,
      cliffYScaleMax: controls.cliffYScaleMax,
      // Orientation
      cliffSlopeAlignment: controls.cliffSlopeAlignment,
      cliffRandomTilt: controls.cliffRandomTilt,
      cliffRandomYaw: controls.cliffRandomYaw,
      // Stacking
      cliffVerticalStacking: controls.cliffVerticalStacking,
      cliffVerticalSpacing: controls.cliffVerticalSpacing,
      cliffMaxStackHeight: controls.cliffMaxStackHeight,
      // Embedding
      cliffEmbedDepth: controls.cliffEmbedDepth,
    };
  }, [
    controls.cliffsEnabled,
    controls.cliffGridDensity,
    controls.cliffMinSpacing,
    controls.cliffRockWeightThreshold,
    controls.cliffMinElevation,
    controls.cliffMountainMaskThreshold,
    controls.cliffScaleMin,
    controls.cliffScaleMax,
    controls.cliffSlopeScaleInfluence,
    controls.cliffXZScaleMin,
    controls.cliffXZScaleMax,
    controls.cliffYScaleMin,
    controls.cliffYScaleMax,
    controls.cliffSlopeAlignment,
    controls.cliffRandomTilt,
    controls.cliffRandomYaw,
    controls.cliffVerticalStacking,
    controls.cliffVerticalSpacing,
    controls.cliffMaxStackHeight,
    controls.cliffEmbedDepth,
  ]);

  return controls;
}

// Re-export for convenience
export type WorldControls = ReturnType<typeof useWorldControls>;
