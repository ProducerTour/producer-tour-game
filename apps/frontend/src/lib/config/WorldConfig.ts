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

  // View Distance
  fogEnabled: boolean;
  fogNear: number;
  fogFar: number;
  fogColor: string;
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
}

// =============================================================================
// DEFAULT VALUES
// =============================================================================

export const DEFAULT_WORLD_CONFIG: WorldConfig = {
  // Skybox
  skyboxType: 'hdri',
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

  // View Distance (scaled for 5-chunk Rust-style world)
  fogEnabled: true,
  fogNear: 150,
  fogFar: 350,
  fogColor: '#b3c4d9',
  starsRadius: 10000,

  // Terrain (5-chunk Rust-style island: 320m radius)
  terrainSeed: 12345,
  terrainRadius: 5, // 5 chunks = 320m playable radius
  terrainTextured: true,
  terrainWireframe: false,
  terrainColor: '#3d7a37',
  physicsResolution: 128, // Higher resolution = smoother collision on steep terrain
  waterEnabled: true,

  // Foliage
  grassEnabled: false,
  grassDensity: 30,
  windEnabled: true,
  treesEnabled: true,
  oakTreeDensity: 8,
  palmTreeDensity: 2,

  // Rocks
  rockDensity: 8,
  rockSizeMultiplier: 1.0,
  rockSizeVariation: 0.4,

  // Cliffs - Density (user-tuned settings)
  cliffsEnabled: true,
  cliffGridDensity: 10,
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
    }, { collapsed: true }),

    'View Distance': folder({
      fogEnabled: { value: DEFAULT_WORLD_CONFIG.fogEnabled, label: 'Enable Fog' },
      fogNear: { value: DEFAULT_WORLD_CONFIG.fogNear, min: 50, max: 400, step: 10, label: 'Fog Start (m)' },
      fogFar: { value: DEFAULT_WORLD_CONFIG.fogFar, min: 200, max: 800, step: 25, label: 'Fog End (m)' },
      fogColor: { value: DEFAULT_WORLD_CONFIG.fogColor, label: 'Fog Color' },
      starsRadius: { value: DEFAULT_WORLD_CONFIG.starsRadius, min: 1000, max: 50000, step: 1000, label: 'Stars Radius' },
    }, { collapsed: true }),

    'Terrain': folder({
      terrainSeed: { value: DEFAULT_WORLD_CONFIG.terrainSeed, min: 1, max: 99999, step: 1, label: 'Seed' },
      terrainRadius: { value: DEFAULT_WORLD_CONFIG.terrainRadius, min: 3, max: 8, step: 1, label: 'Chunk Radius' },
      terrainTextured: { value: DEFAULT_WORLD_CONFIG.terrainTextured, label: 'Use Texture' },
      terrainWireframe: { value: DEFAULT_WORLD_CONFIG.terrainWireframe, label: 'Wireframe' },
      terrainColor: { value: DEFAULT_WORLD_CONFIG.terrainColor, label: 'Base Color' },
      physicsResolution: { value: DEFAULT_WORLD_CONFIG.physicsResolution, min: 64, max: 256, step: 64, label: 'Physics Resolution' },
      waterEnabled: { value: DEFAULT_WORLD_CONFIG.waterEnabled, label: 'Enable Water' },
    }, { collapsed: false }),

    '🌿 Foliage': folder({
      grassEnabled: { value: DEFAULT_WORLD_CONFIG.grassEnabled, label: 'Grass' },
      grassDensity: { value: DEFAULT_WORLD_CONFIG.grassDensity, min: 0, max: 150, step: 10, label: 'Grass Density' },
      windEnabled: { value: DEFAULT_WORLD_CONFIG.windEnabled, label: 'Wind Animation' },
      treesEnabled: { value: DEFAULT_WORLD_CONFIG.treesEnabled, label: 'Trees' },
      oakTreeDensity: { value: DEFAULT_WORLD_CONFIG.oakTreeDensity, min: 0, max: 20, step: 1, label: 'Oak Trees (grass)' },
      palmTreeDensity: { value: DEFAULT_WORLD_CONFIG.palmTreeDensity, min: 0, max: 12, step: 1, label: 'Palm Trees (sand)' },
    }, { collapsed: false }),

    '🪨 Rocks': folder({
      rockDensity: { value: DEFAULT_WORLD_CONFIG.rockDensity, min: 0, max: 30, step: 1, label: 'Density (per chunk)' },
      rockSizeMultiplier: { value: DEFAULT_WORLD_CONFIG.rockSizeMultiplier, min: 0.5, max: 2.0, step: 0.1, label: 'Size Multiplier' },
      rockSizeVariation: { value: DEFAULT_WORLD_CONFIG.rockSizeVariation, min: 0, max: 1.0, step: 0.1, label: 'Size Variation' },
    }, { collapsed: false }),

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
    }, { collapsed: false }),

    '🔥 Campfire': folder({
      campfireEnabled: { value: DEFAULT_WORLD_CONFIG.campfireEnabled, label: 'Show Campfire' },
      campfireScale: { value: DEFAULT_WORLD_CONFIG.campfireScale, min: 0.1, max: 3.0, step: 0.05, label: 'Model Scale' },
      campfireFireScale: { value: DEFAULT_WORLD_CONFIG.campfireFireScale, min: 0.01, max: 2.0, step: 0.01, label: 'Fire Scale' },
      campfireLightIntensity: { value: DEFAULT_WORLD_CONFIG.campfireLightIntensity, min: 0.1, max: 3.0, step: 0.1, label: 'Light Intensity' },
      campfireLightDistance: { value: DEFAULT_WORLD_CONFIG.campfireLightDistance, min: 4, max: 30, step: 1, label: 'Light Distance' },
      campfireLit: { value: DEFAULT_WORLD_CONFIG.campfireLit, label: 'Initially Lit' },
      campfireRange: { value: DEFAULT_WORLD_CONFIG.campfireRange, min: 1, max: 10, step: 0.5, label: 'Interaction Range' },
    }, { collapsed: false }),

    '📍 Grid & Bounds': folder({
      showGrid: { value: DEFAULT_WORLD_CONFIG.showGrid, label: 'Show Grid (A1, B2...)' },
      showBoundaryWalls: { value: DEFAULT_WORLD_CONFIG.showBoundaryWalls, label: 'Show Boundary Walls' },
      gridLabelSize: { value: DEFAULT_WORLD_CONFIG.gridLabelSize, min: 2, max: 12, step: 1, label: 'Grid Label Size' },
    }, { collapsed: false }),

    '🔊 Audio': folder({
      ambientAudioEnabled: { value: DEFAULT_WORLD_CONFIG.ambientAudioEnabled, label: 'Biome Ambient Audio' },
    }, { collapsed: false }),
  }, { collapsed: false });

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
