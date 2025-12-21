/**
 * TerrainService.ts
 *
 * Service layer for terrain operations.
 * Owns heightmapGenerator and provides a clean API for:
 * - Height sampling (for NPCs, physics, props)
 * - Biome queries (for vegetation, sound, etc.)
 * - Terrain configuration
 *
 * This replaces direct heightmapGenerator usage throughout the codebase.
 */

import {
  HeightmapGenerator,
  heightmapGenerator as globalHeightmapGenerator,
  type TerrainSample,
  type ChunkHeightmap,
} from '../terrain';
import {
  CHUNK_SIZE,
  LODLevel,
  WATER_LEVEL,
  WORLD_PLAY_RADIUS,
} from '../terrain/TerrainConfig';

// =============================================================================
// TYPES
// =============================================================================

export interface TerrainServiceConfig {
  seed: number;
  chunkRadius: number;
  physicsResolution: number;
}

export interface TerrainPoint {
  x: number;
  y: number;
  z: number;
}

export interface BiomeInfo {
  grass: number;
  rock: number;
  sand: number;
  snow: number;
  forest: number;
  /** Primary biome name */
  primary: 'grass' | 'rock' | 'sand' | 'snow' | 'forest';
  /** Whether this point is underwater */
  underwater: boolean;
  /** Whether this is in a mountain region */
  inMountainRegion: boolean;
}

// =============================================================================
// TERRAIN SERVICE
// =============================================================================

export class TerrainService {
  private heightmapGenerator: HeightmapGenerator;
  private config: TerrainServiceConfig;

  constructor(config?: Partial<TerrainServiceConfig>) {
    this.config = {
      seed: config?.seed ?? 12345,
      chunkRadius: config?.chunkRadius ?? 4,
      physicsResolution: config?.physicsResolution ?? 64,
    };

    // Use global generator or create new one with config
    this.heightmapGenerator = globalHeightmapGenerator;

    // Apply seed if different from current
    if (this.heightmapGenerator.getSeed() !== this.config.seed) {
      this.heightmapGenerator.setSeed(this.config.seed);
    }
  }

  // ===========================================================================
  // CORE HEIGHT SAMPLING
  // ===========================================================================

  /**
   * Get terrain height at world position.
   * This is the primary method for positioning entities on terrain.
   */
  getHeight(x: number, z: number): number {
    return this.heightmapGenerator.sampleHeight(x, z);
  }

  /**
   * Get terrain height with position object.
   * Convenience method for Vector3-like inputs.
   */
  getHeightAt(position: { x: number; z: number }): number {
    return this.getHeight(position.x, position.z);
  }

  /**
   * Get a 3D point on the terrain surface.
   */
  getTerrainPoint(x: number, z: number): TerrainPoint {
    return {
      x,
      y: this.getHeight(x, z),
      z,
    };
  }

  /**
   * Check if a point is below water level.
   */
  isUnderwater(x: number, z: number): boolean {
    return this.getHeight(x, z) < WATER_LEVEL;
  }

  /**
   * Get height relative to water level (positive = above, negative = below).
   */
  getHeightAboveWater(x: number, z: number): number {
    return this.getHeight(x, z) - WATER_LEVEL;
  }

  // ===========================================================================
  // TERRAIN SAMPLING (FULL DATA)
  // ===========================================================================

  /**
   * Get full terrain sample including normal, slope, and biome data.
   */
  sampleTerrain(x: number, z: number): TerrainSample {
    return this.heightmapGenerator.sampleTerrain(x, z);
  }

  /**
   * Get slope at position (0 = flat, 1 = vertical cliff).
   */
  getSlope(x: number, z: number): number {
    const sample = this.sampleTerrain(x, z);
    return 1.0 - sample.normal.y; // Convert normal.y to slope value
  }

  /**
   * Check if terrain is walkable (not too steep, not underwater).
   */
  isWalkable(x: number, z: number, maxSlope: number = 0.5): boolean {
    const slope = this.getSlope(x, z);
    return slope < maxSlope && !this.isUnderwater(x, z);
  }

  // ===========================================================================
  // BIOME QUERIES
  // ===========================================================================

  /**
   * Get biome information at position.
   */
  getBiome(x: number, z: number): BiomeInfo {
    const sample = this.sampleTerrain(x, z);
    const mountainMask = this.heightmapGenerator.getMountainMask(x, z);

    // Determine primary biome
    const biome = sample.biome;
    let primary: BiomeInfo['primary'] = 'grass';
    let maxWeight = biome.grass;

    if (biome.rock > maxWeight) {
      primary = 'rock';
      maxWeight = biome.rock;
    }
    if (biome.sand > maxWeight) {
      primary = 'sand';
      maxWeight = biome.sand;
    }
    if (biome.snow > maxWeight) {
      primary = 'snow';
      maxWeight = biome.snow;
    }
    if (biome.forest > maxWeight) {
      primary = 'forest';
    }

    return {
      grass: biome.grass,
      rock: biome.rock,
      sand: biome.sand,
      snow: biome.snow,
      forest: biome.forest,
      primary,
      underwater: sample.height < WATER_LEVEL,
      inMountainRegion: mountainMask > 0.5,
    };
  }

  /**
   * Get mountain mask value (0 = no mountains, 1 = full mountain region).
   */
  getMountainMask(x: number, z: number): number {
    return this.heightmapGenerator.getMountainMask(x, z);
  }

  /**
   * Find a position in a specific biome (for spawning, props, etc.).
   */
  findBiomePosition(
    biomeName: 'grass' | 'sand' | 'rock' | 'forest',
    minWeight: number = 0.5,
    searchRadius: number = 250,
    stepSize: number = 8
  ): TerrainPoint | null {
    // Spiral search from center
    for (let radius = stepSize; radius <= searchRadius; radius += stepSize) {
      for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const biome = this.getBiome(x, z);

        if (biome[biomeName] >= minWeight && !biome.underwater) {
          return this.getTerrainPoint(x, z);
        }
      }
    }
    return null;
  }

  // ===========================================================================
  // CHUNK OPERATIONS
  // ===========================================================================

  /**
   * Generate heightmap for a chunk.
   */
  generateChunkHeightmap(
    chunkX: number,
    chunkZ: number,
    lod: LODLevel = LODLevel.LOD0
  ): ChunkHeightmap {
    return this.heightmapGenerator.generateChunkHeightmap(chunkX, chunkZ, lod);
  }

  /**
   * Get world size based on chunk radius.
   */
  getWorldSize(): { width: number; depth: number; playRadius: number } {
    const totalChunks = this.config.chunkRadius * 2 + 1;
    const size = totalChunks * CHUNK_SIZE;
    return {
      width: size,
      depth: size,
      playRadius: WORLD_PLAY_RADIUS,
    };
  }

  // ===========================================================================
  // CONFIGURATION
  // ===========================================================================

  /**
   * Get current terrain seed.
   */
  getSeed(): number {
    return this.heightmapGenerator.getSeed();
  }

  /**
   * Change terrain seed (triggers terrain regeneration).
   */
  setSeed(seed: number): void {
    this.config.seed = seed;
    this.heightmapGenerator.setSeed(seed);
    this.heightmapGenerator.clearCache();
  }

  /**
   * Get current configuration.
   */
  getConfig(): Readonly<TerrainServiceConfig> {
    return { ...this.config };
  }

  /**
   * Clear all terrain caches.
   */
  clearCache(): void {
    this.heightmapGenerator.clearCache();
  }

  /**
   * Get the underlying heightmap generator (for advanced use).
   * Prefer using service methods when possible.
   */
  getHeightmapGenerator(): HeightmapGenerator {
    return this.heightmapGenerator;
  }
}

// =============================================================================
// SINGLETON ACCESS
// =============================================================================

let globalTerrainService: TerrainService | null = null;

/**
 * Get the global TerrainService instance.
 */
export function getTerrainService(): TerrainService {
  if (!globalTerrainService) {
    globalTerrainService = new TerrainService();
  }
  return globalTerrainService;
}

/**
 * Reset the global TerrainService (for testing or seed changes).
 */
export function resetTerrainService(config?: Partial<TerrainServiceConfig>): TerrainService {
  globalTerrainService = new TerrainService(config);
  return globalTerrainService;
}
