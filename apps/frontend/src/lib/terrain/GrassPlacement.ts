/**
 * Grass Placement Algorithm
 * SimonDev Quick_Grass style - simple position offsets
 *
 * Key change: All per-blade variation (rotation, scale, color) is computed
 * in the shader using hash functions for consistency and performance.
 * We only need to generate world position offsets here.
 */

import type { TerrainGenerator } from './TerrainGenerator';
import { WATER_LEVEL, CHUNK_SIZE, WORLD_SIZE } from './TerrainConfig';
import { BiomeType } from './BiomeLookupTable';
import { getMultiScaleVoronoiDensity } from './VoronoiNoise';

// Simple grass instance - just position offset
// Rotation, scale, color computed in shader via hash(position.xz)
export interface GrassInstance {
  x: number;  // World X position
  y: number;  // Terrain height at this position
  z: number;  // World Z position
}

// Placement configuration
export interface GrassPlacementConfig {
  bladesPerChunk: number;     // Target number of blades
  minHeight: number;          // Minimum terrain height for grass
  maxHeight: number;          // Maximum terrain height for grass
  minSlope: number;           // Minimum normal.y (flat = 1, vertical = 0)
  mountainMaskThreshold: number; // Max mountain mask value for grass
  jitterFactor: number;       // How much to jitter within cell (0-1)
  // Voronoi clumping settings
  voronoiClumpingEnabled: boolean;
  voronoiLargeCellSize: number;
  voronoiSmallCellSize: number;
  voronoiDensityThreshold: number;
}

const DEFAULT_CONFIG: GrassPlacementConfig = {
  bladesPerChunk: 3072,  // SimonDev: NUM_GRASS = 32 * 32 * 3 = 3072
  minHeight: 2,
  maxHeight: 60,
  minSlope: 0.3,
  mountainMaskThreshold: 0.7,
  jitterFactor: 0.7,
  voronoiClumpingEnabled: true,
  voronoiLargeCellSize: 10.0,
  voronoiSmallCellSize: 3.0,
  voronoiDensityThreshold: 0.25,
};

// Biomes where grass should NOT grow
const NO_GRASS_BIOMES: Set<BiomeType> = new Set([
  BiomeType.DEEP_OCEAN,
  BiomeType.SHALLOW_OCEAN,
  BiomeType.BEACH,
  BiomeType.MARSH,
  BiomeType.SWAMP,
  BiomeType.DESERT,
  BiomeType.ROCKY_MOUNTAIN,
  BiomeType.SNOW_PEAK,
  BiomeType.GLACIER,
]);

// Biomes with reduced grass density
const LOW_GRASS_BIOMES: Map<BiomeType, number> = new Map([
  [BiomeType.SAVANNA, 0.4],
  [BiomeType.SCRUBLAND, 0.3],
  [BiomeType.ALPINE_MEADOW, 0.6],
  [BiomeType.BOREAL_FOREST, 0.5],
]);

/**
 * Seeded random number generator
 */
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898 + seed * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Generate a deterministic seed from chunk coordinates
 */
function getChunkSeed(chunkX: number, chunkZ: number): number {
  return chunkX * 73856093 + chunkZ * 19349663;
}

/**
 * Generate grass placements for a single chunk
 * Returns simple (x, y, z) positions - all variation computed in shader
 */
export function generateGrassPlacement(
  chunkX: number,
  chunkZ: number,
  terrainGen: TerrainGenerator,
  config: Partial<GrassPlacementConfig> = {}
): GrassInstance[] {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const instances: GrassInstance[] = [];

  // Chunk origin in world coordinates
  const chunkOriginX = chunkX * CHUNK_SIZE - WORLD_SIZE / 2;
  const chunkOriginZ = chunkZ * CHUNK_SIZE - WORLD_SIZE / 2;

  // Grid dimensions for jittered placement
  const cellsPerAxis = Math.ceil(Math.sqrt(cfg.bladesPerChunk));
  const cellSize = CHUNK_SIZE / cellsPerAxis;

  // Base seed for this chunk
  const chunkSeed = getChunkSeed(chunkX, chunkZ);

  for (let gz = 0; gz < cellsPerAxis; gz++) {
    for (let gx = 0; gx < cellsPerAxis; gx++) {
      // Unique seed for this cell
      const cellSeed = chunkSeed + gx * 1000 + gz;

      // Jitter position within cell
      const jitterX = (seededRandom(cellSeed) - 0.5) * cellSize * cfg.jitterFactor;
      const jitterZ = (seededRandom(cellSeed + 1) - 0.5) * cellSize * cfg.jitterFactor;

      // Calculate world position
      const worldX = chunkOriginX + (gx + 0.5) * cellSize + jitterX;
      const worldZ = chunkOriginZ + (gz + 0.5) * cellSize + jitterZ;

      // Sample terrain at this position
      const terrain = terrainGen.sampleTerrain(worldX, worldZ);

      // === FILTER CONDITIONS ===

      // Skip if underwater
      if (terrain.isSubmerged) continue;
      if (terrain.height <= WATER_LEVEL + 0.5) continue;

      // Skip if outside valid height range
      if (terrain.height < cfg.minHeight || terrain.height > cfg.maxHeight) continue;

      // Skip if slope too steep
      if (terrain.normal.y < cfg.minSlope) continue;

      // Skip if in mountain zone
      const mountainMask = terrainGen.getMountainZoneMask(worldX, worldZ);
      if (mountainMask > cfg.mountainMaskThreshold) continue;

      // Skip if biome doesn't support grass
      if (NO_GRASS_BIOMES.has(terrain.biome)) continue;

      // Random density reduction for low-grass biomes
      const densityMultiplier = LOW_GRASS_BIOMES.get(terrain.biome) ?? 1.0;
      if (seededRandom(cellSeed + 5) > densityMultiplier) continue;

      // === VORONOI CLUMPING ===
      if (cfg.voronoiClumpingEnabled) {
        const voronoiDensity = getMultiScaleVoronoiDensity(worldX, worldZ, {
          largeCellSize: cfg.voronoiLargeCellSize,
          smallCellSize: cfg.voronoiSmallCellSize,
          largeWeight: 0.6,
          smallWeight: 0.4,
          seed: chunkSeed,
        });

        if (voronoiDensity < cfg.voronoiDensityThreshold) continue;
        if (seededRandom(cellSeed + 6) > voronoiDensity) continue;
      }

      // === PLACEMENT PASSED ===
      // Just store position - shader computes rotation/scale/color from hash(x, z)
      instances.push({
        x: worldX,
        y: terrain.height,
        z: worldZ,
      });
    }
  }

  return instances;
}

/**
 * Create instance offset attribute from grass placements
 * SimonDev style: just (x, y, z) per instance
 */
export function createGrassInstanceOffsets(instances: GrassInstance[]): Float32Array {
  const count = instances.length;
  const offsets = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    offsets[i * 3 + 0] = instances[i].x;
    offsets[i * 3 + 1] = instances[i].y;
    offsets[i * 3 + 2] = instances[i].z;
  }

  return offsets;
}

// Legacy export for backward compatibility
export function createGrassInstanceAttributes(instances: GrassInstance[]): {
  instancePosition: Float32Array;
  instanceRotation: Float32Array;
  instanceScale: Float32Array;
  instanceColorSeed: Float32Array;
  instanceNormal: Float32Array;
} {
  const count = instances.length;
  return {
    instancePosition: createGrassInstanceOffsets(instances),
    instanceRotation: new Float32Array(count),
    instanceScale: new Float32Array(count).fill(1),
    instanceColorSeed: new Float32Array(count),
    instanceNormal: new Float32Array(count * 3),
  };
}

export default {
  generateGrassPlacement,
  createGrassInstanceOffsets,
  createGrassInstanceAttributes,
  DEFAULT_CONFIG,
};
