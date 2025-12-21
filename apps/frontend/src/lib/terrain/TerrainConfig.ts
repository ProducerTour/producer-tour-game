/**
 * TerrainConfig.ts
 * World constants and configuration for procedural terrain generation
 * Rust-style island: 5-chunk playable area (320m radius, ~640m diameter)
 */

// =============================================================================
// WORLD SIZE (5-chunk Rust-style island)
// =============================================================================

/** Total world size in meters (includes ocean buffer) */
export const WORLD_SIZE = 768;

/** Size of each terrain chunk in meters */
export const CHUNK_SIZE = 64;

/** Number of vertices per chunk edge (33x33 = 1024 vertices per chunk) */
export const CHUNK_RESOLUTION = 33;

/** Total chunks per axis */
export const CHUNKS_PER_AXIS = Math.ceil(WORLD_SIZE / CHUNK_SIZE);

/** Total number of chunks in the world */
export const TOTAL_CHUNKS = CHUNKS_PER_AXIS * CHUNKS_PER_AXIS;

// =============================================================================
// TERRAIN HEIGHT
// =============================================================================

/** Maximum terrain height in meters (moderate mountains) */
export const MAX_HEIGHT = 40;

/** Minimum terrain height (ocean floor) */
export const MIN_HEIGHT = -10;

/** Height at which water appears */
export const WATER_LEVEL = 0;

/** Height range for different biome blending (scaled for 40m max) */
export const BIOME_HEIGHTS = {
  /** Beach/shore zone */
  beach: { min: -2, max: 6 },
  /** Grassland/plains */
  grass: { min: 6, max: 20 },
  /** Forest zone */
  forest: { min: 12, max: 30 },
  /** Mountain/rock zone */
  mountain: { min: 25, max: MAX_HEIGHT },
};

// =============================================================================
// WORLD BOUNDARY (5-chunk island)
// =============================================================================

/** Radius of intended play area in meters (5 chunks × 64m = 320m) */
export const WORLD_PLAY_RADIUS = 320;

/** Width of the edge transition band in meters (ocean falloff) */
export const WORLD_TRANSITION_WIDTH = 64;

/** Target height at world edge (below water for clean coastline) */
export const WORLD_EDGE_TARGET = WATER_LEVEL - 8;

/** Total boundary distance (play area + transition) */
export const WORLD_BOUNDARY = WORLD_PLAY_RADIUS + WORLD_TRANSITION_WIDTH;

// =============================================================================
// NOISE CONFIGURATION (base settings)
// =============================================================================

/** Default world seed for reproducible terrain */
export const DEFAULT_SEED = 12345;

/** Noise generation parameters */
export const NOISE_CONFIG = {
  /** Random seed for terrain generation */
  seed: DEFAULT_SEED,

  /** Number of noise octaves */
  octaves: 4,

  /** Amplitude decrease per octave */
  persistence: 0.5,

  /** Frequency increase per octave */
  lacunarity: 2.0,

  /** Base noise scale */
  baseScale: 0.01,

  /** Scale for ridged noise (mountains) */
  ridgeScale: 0.04,

  /** Weight of ridged noise in final terrain */
  ridgeWeight: 0.3,
};

// =============================================================================
// RUST-STYLE ISLAND CONFIGURATION
// =============================================================================

/**
 * Island shape configuration
 * Controls the distance falloff that creates the island shape
 */
export const ISLAND_CONFIG = {
  /** Start transition at this fraction of play radius (0.6 = 60%) */
  falloffStart: 0.6,
  /** Full ocean at this fraction of play radius */
  falloffEnd: 1.0,
  /** Scale of coastline noise (creates bays/peninsulas) */
  coastNoiseScale: 0.02,
  /** Strength of coastline variation (0-1) */
  coastNoiseStrength: 0.15,
};

/**
 * Mountain range configuration
 * Rust-style: Coherent chains running diagonally across the island
 */
export const MOUNTAIN_CONFIG = {
  // Zone control (WHERE mountains can appear)
  // FIX: Larger zones for coherent Rust-style mountain chains
  /** Scale of mountain zone noise (~333m regions for coherent chains) */
  zoneScale: 0.003,  // Was 0.008 - too small, created fragmented mountains
  /** Threshold for zone activation (higher = fewer, more distinct zones) */
  zoneThreshold: 0.55,  // Was 0.35 - too low, 65% of terrain qualified
  /** Persistence for smoother zones */
  zonePersistence: 0.25,  // Was 0.3 - smoother for cleaner chain edges

  // Belt direction (linear ranges)
  /** Primary mountain chain angle (radians, 45° diagonal) */
  primaryAngle: Math.PI / 4,
  /** Secondary mountain chain angle (135° cross-range) */
  secondaryAngle: (Math.PI * 3) / 4,
  /** Secondary chain strength (0-1) - reduced to prevent too many ranges */
  secondaryStrength: 0.25,  // Was 0.5 - too prominent, created extra chains

  // Ridge noise (actual peaks)
  /** Scale of ridge noise (~25m ridge width) */
  ridgeScale: 0.04,
  /** Octaves for ridge detail */
  ridgeOctaves: 3,          // Reduced from 4 for smoother ridges
  /** Persistence for ridge noise */
  ridgePersistence: 0.4,    // Lower = less high-frequency spikes (was 0.5)

  // Heights (moderate - user preference: 20-35m)
  /** Maximum mountain height in meters */
  maxHeight: 35,
  /** Base plateau height in mountain zones */
  baseHeight: 6,

  // Spawn protection
  /** No mountains within this radius of center (meters) */
  spawnRadius: 60,

  // Plateau/Mesa configuration (flat-top mountains)
  /** Enable plateau clamping for mesa-style mountains */
  plateauEnabled: true,
  /** Height threshold above which peaks become flat (fraction of maxHeight) */
  plateauThreshold: 0.5,  // Lower = more flattening (was 0.7)
  /** Smoothness of plateau transition (0=sharp, 1=gradual) */
  plateauSmooth: 0.5,     // Smoother transition (was 0.3)
  /** Number of terrace steps (0=smooth, 2-5=visible steps) */
  terraceSteps: 0,
};

/**
 * Beach zone configuration
 * Rust-style: Gradual sandy beaches with dunes
 */
export const BEACH_CONFIG = {
  // Elevation zones
  /** Water level height */
  waterLevel: 0,
  /** Wet sand zone (0-1m above water) */
  wetSandMax: 1,
  /** Dry beach zone (1-3m) */
  drySandMax: 3,
  /** Dune transition zone (3-6m) */
  duneMax: 6,

  // Beach width control
  /** Target beach width in meters */
  targetWidth: 25,
  /** How much to flatten coast toward beach profile (0-1) */
  erosionStrength: 0.6,

  // Dune variation
  /** Scale of dune noise */
  duneScale: 0.08,
  /** Maximum dune bump height in meters */
  duneHeight: 1.5,
};

/**
 * Detail noise configuration
 * Micro-variation for natural terrain feel
 */
export const DETAIL_CONFIG = {
  /** Scale of detail noise (~7m features) */
  scale: 0.12,           // Slightly larger features (was 0.15)
  /** Amplitude of detail variation in meters */
  amplitude: 1,          // Reduced to prevent spikes (was 2)
  /** Octaves for detail noise */
  octaves: 2,            // Less octaves = smoother (was 3)
  /** Persistence for detail noise */
  persistence: 0.3,      // Less high-frequency detail (was 0.4)
};

/**
 * Hydrology configuration (rivers)
 * Flow-based simulation for natural river paths
 */
export const HYDROLOGY_CONFIG = {
  /** Resolution of hydrology grid (meters per cell) */
  resolution: 8,
  /** Flow accumulation threshold for river formation */
  riverThreshold: 15,
  /** Maximum river carving depth in meters */
  riverMaxDepth: 4,
  /** River width multiplier */
  riverWidth: 2,
  /** Flow threshold for lake formation */
  lakeThreshold: 100,
  /** Size of hydrology grid (cells per axis) */
  gridSize: 100,
  /** Enable river generation */
  enabled: true,
};

/**
 * Climate configuration (for biome determination)
 */
export const CLIMATE_CONFIG = {
  /** Scale of moisture noise */
  moistureScale: 0.01,
  /** Scale of temperature noise */
  temperatureScale: 0.008,
  /** Moisture boost near rivers (0-1) */
  riverMoistureBoost: 0.3,
  /** Moisture boost near coast (0-1) */
  coastMoistureBoost: 0.2,
  /** Temperature decrease per meter of altitude */
  altitudeTemperatureDrop: 0.01,
};

// =============================================================================
// CHUNK LOADING (optimized for 5-chunk world)
// =============================================================================

/** Distance within which chunks are loaded (meters) */
export const CHUNK_LOAD_RADIUS = 384;

/** Distance beyond which chunks are unloaded (meters) */
export const CHUNK_UNLOAD_RADIUS = 448;

/** Maximum chunks to load per frame */
export const MAX_CHUNK_LOADS_PER_FRAME = 4;

/** Distance at which chunks switch to lower LOD */
export const LOD_DISTANCES = {
  /** Full detail (33x33 vertices) */
  lod0: 128,
  /** Half detail (17x17 vertices) */
  lod1: 256,
  /** Quarter detail (9x9 vertices) */
  lod2: 320,
};

// =============================================================================
// TEXTURE SPLATTING
// =============================================================================

/** Slope angle thresholds for texture blending (radians) */
export const SLOPE_THRESHOLDS = {
  /** Below this slope: grass/dirt (30 degrees) */
  grassMax: Math.PI / 6,
  /** Above this slope: rock (45 degrees) */
  rockMin: Math.PI / 4,
};

/** Texture tiling scale (UV repeat per chunk) */
export const TEXTURE_SCALE = {
  grass: 8,
  dirt: 8,
  rock: 4,
  road: 2,
};

// =============================================================================
// COLLISION
// =============================================================================

/** How far above terrain counts as "grounded" */
export const GROUND_THRESHOLD = 1.1;

/** Normal sampling distance for slope calculation (meters) */
export const NORMAL_SAMPLE_DISTANCE = 0.5;

/** Maximum walkable slope angle (radians, 60 degrees) */
export const MAX_WALKABLE_SLOPE = Math.PI / 3;

// =============================================================================
// SPAWN (beach spawn for Rust-style)
// =============================================================================

/** Default spawn position - will be overridden by beach finder */
export const DEFAULT_SPAWN = {
  x: 0,
  y: 0,
  z: 0,
};

/** Height offset above terrain for spawn */
export const SPAWN_HEIGHT_OFFSET = 2;

/** Spawn on beach (edge of island) */
export const SPAWN_ON_BEACH = true;

/** Distance from center for beach spawn (fraction of play radius) */
export const SPAWN_BEACH_DISTANCE = 0.85;

// =============================================================================
// TYPES
// =============================================================================

/** Chunk coordinate (grid position, not world position) */
export interface ChunkCoord {
  x: number;
  z: number;
}

/** Chunk state for lifecycle management */
export enum ChunkState {
  Unloaded = 'unloaded',
  Loading = 'loading',
  Active = 'active',
  Sleeping = 'sleeping',
}

/** LOD level */
export enum LODLevel {
  LOD0 = 0, // Full detail (33x33)
  LOD1 = 1, // Half detail (17x17)
  LOD2 = 2, // Quarter detail (9x9)
}

/** Resolution for each LOD level */
export const LOD_RESOLUTIONS: Record<LODLevel, number> = {
  [LODLevel.LOD0]: 33,
  [LODLevel.LOD1]: 17,
  [LODLevel.LOD2]: 9,
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Convert world position to chunk coordinates
 */
export function worldToChunk(worldX: number, worldZ: number): ChunkCoord {
  return {
    x: Math.floor((worldX + WORLD_SIZE / 2) / CHUNK_SIZE),
    z: Math.floor((worldZ + WORLD_SIZE / 2) / CHUNK_SIZE),
  };
}

/**
 * Convert chunk coordinates to world position (chunk center)
 */
export function chunkToWorld(chunkX: number, chunkZ: number): { x: number; z: number } {
  return {
    x: chunkX * CHUNK_SIZE - WORLD_SIZE / 2 + CHUNK_SIZE / 2,
    z: chunkZ * CHUNK_SIZE - WORLD_SIZE / 2 + CHUNK_SIZE / 2,
  };
}

/**
 * Get chunk corner position (bottom-left in world space)
 */
export function getChunkOrigin(chunkX: number, chunkZ: number): { x: number; z: number } {
  return {
    x: chunkX * CHUNK_SIZE - WORLD_SIZE / 2,
    z: chunkZ * CHUNK_SIZE - WORLD_SIZE / 2,
  };
}

/**
 * Calculate distance from player to chunk center
 */
export function distanceToChunk(
  playerX: number,
  playerZ: number,
  chunkX: number,
  chunkZ: number
): number {
  const chunkCenter = chunkToWorld(chunkX, chunkZ);
  const dx = playerX - chunkCenter.x;
  const dz = playerZ - chunkCenter.z;
  return Math.sqrt(dx * dx + dz * dz);
}

/**
 * Check if position is within world bounds
 */
export function isInWorldBounds(worldX: number, worldZ: number): boolean {
  const halfSize = WORLD_SIZE / 2;
  return (
    worldX >= -halfSize &&
    worldX <= halfSize &&
    worldZ >= -halfSize &&
    worldZ <= halfSize
  );
}

/**
 * Clamp position to world bounds
 */
export function clampToWorldBounds(worldX: number, worldZ: number): { x: number; z: number } {
  const halfSize = WORLD_SIZE / 2;
  return {
    x: Math.max(-halfSize, Math.min(halfSize, worldX)),
    z: Math.max(-halfSize, Math.min(halfSize, worldZ)),
  };
}

/**
 * Get appropriate LOD level based on distance
 */
export function getLODLevel(distance: number): LODLevel {
  if (distance <= LOD_DISTANCES.lod0) return LODLevel.LOD0;
  if (distance <= LOD_DISTANCES.lod1) return LODLevel.LOD1;
  return LODLevel.LOD2;
}

/**
 * Smooth interpolation function (hermite/smoothstep)
 */
export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Linear interpolation
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
