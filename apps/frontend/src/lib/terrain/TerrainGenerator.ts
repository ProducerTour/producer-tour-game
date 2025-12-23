/**
 * TerrainGenerator.ts
 * Rust-style terrain generation for 5-chunk island
 *
 * Architecture:
 * Layer 1: Island Mask (distance falloff + coast noise)
 * Layer 2: Base Height (continental noise)
 * Layer 3: Mountain Zones (dual diagonal chains)
 * Layer 4: Mountain Ridges (ridged multifractal in zones only)
 * Layer 5: Beach Erosion (gradual profile near coast)
 * Layer 6: Detail Noise (micro variation)
 * Layer 7: River Carving (hydrology simulation)
 */

import { NoiseGenerator } from '../city/NoiseGenerator';
import {
  CHUNK_SIZE,
  WATER_LEVEL,
  LOD_RESOLUTIONS,
  LODLevel,
  getChunkOrigin,
  WORLD_PLAY_RADIUS,
  ISLAND_CONFIG,
  MOUNTAIN_CONFIG,
  BEACH_CONFIG,
  DETAIL_CONFIG,
  HYDROLOGY_CONFIG,
  CLIMATE_CONFIG,
  SPAWN_BEACH_DISTANCE,
  smoothstep,
  lerp,
  type ChunkCoord,
} from './TerrainConfig';
import { BiomeLookupTable, BiomeType } from './BiomeLookupTable';
import type { HydrologySimulator } from './HydrologySimulator';

// =============================================================================
// TYPES
// =============================================================================

export interface TerrainSample {
  height: number;
  normal: { x: number; y: number; z: number };
  slope: number;
  biome: BiomeType;
  moisture: number;
  temperature: number;
  isRiver: boolean;
  riverDepth: number;
  /** Is this a lake cell (from hydrology simulation) */
  isLake: boolean;
  /**
   * RUST-STYLE TOPOLOGY FLAG: Is this position submerged/underwater?
   * True if: height <= WATER_LEVEL OR isRiver OR isLake
   * Use this single flag to prevent ANY object spawning in water
   */
  isSubmerged: boolean;
}

export interface ChunkTerrainData {
  coord: ChunkCoord;
  heights: Float32Array;
  biomes: Uint8Array;
  moisture: Uint8Array;
  resolution: number;
  minHeight: number;
  maxHeight: number;
}

// =============================================================================
// TERRAIN GENERATOR CLASS
// =============================================================================

export class TerrainGenerator {
  private noise: NoiseGenerator;
  private seed: number;
  private hydrology: HydrologySimulator | null = null;
  private heightCache: Map<string, number> = new Map();
  private maxCacheSize = 10000;

  // World boundaries
  private worldPlayRadius: number;

  constructor(seed: number, chunkRadius?: number) {
    this.seed = seed;
    this.noise = new NoiseGenerator(seed);

    // Set up world boundaries based on chunk radius or global config
    this.worldPlayRadius = chunkRadius !== undefined
      ? chunkRadius * CHUNK_SIZE
      : WORLD_PLAY_RADIUS;
  }

  // ===========================================================================
  // HYDROLOGY INTEGRATION
  // ===========================================================================

  setHydrology(hydrology: HydrologySimulator): void {
    this.hydrology = hydrology;
    this.clearCache();
  }

  // ===========================================================================
  // LAYER 1: ISLAND MASK (Rust-style: center = land, edge = ocean)
  // ===========================================================================

  getIslandMask(worldX: number, worldZ: number): number {
    const cfg = ISLAND_CONFIG;

    // Distance from world center (normalized to play radius)
    const dist = Math.sqrt(worldX * worldX + worldZ * worldZ);
    const normalized = dist / this.worldPlayRadius;

    // Add coastline noise for organic shape (bays, peninsulas)
    const coastNoise = this.noise.fbm2(
      worldX * cfg.coastNoiseScale,
      worldZ * cfg.coastNoiseScale,
      3,
      0.5,
      2.0,
      1.0
    ) * cfg.coastNoiseStrength;

    // Smooth falloff from land to ocean
    const falloff = smoothstep(
      cfg.falloffStart + coastNoise,
      cfg.falloffEnd + coastNoise * 0.5,
      normalized
    );

    return 1 - falloff;
  }

  // ===========================================================================
  // LAYER 2: BASE HEIGHT (continental variation)
  // ===========================================================================

  getBaseHeight(worldX: number, worldZ: number): number {
    // Large-scale terrain variation (gentle hills/valleys)
    const baseNoise = this.noise.fbm2(
      worldX * 0.008,
      worldZ * 0.008,
      3,
      0.45,
      2.0,
      1.0
    );

    // Map noise (-1 to 1) to height range (8-20m base)
    return baseNoise * 6 + 14;
  }

  // ===========================================================================
  // LAYER 3: MOUNTAIN ZONES (Rust-style: linear ranges, not random peaks)
  // ===========================================================================

  getMountainMask(worldX: number, worldZ: number): number {
    const cfg = MOUNTAIN_CONFIG;

    // Skip near spawn (protected zone)
    const distFromCenter = Math.sqrt(worldX * worldX + worldZ * worldZ);
    if (distFromCenter < cfg.spawnRadius) return 0;

    // === PRIMARY MOUNTAIN CHAIN ===
    // Rotate coordinates to align with primary belt direction (45°)
    const cos1 = Math.cos(cfg.primaryAngle);
    const sin1 = Math.sin(cfg.primaryAngle);
    const px = worldX * cos1 - worldZ * sin1;
    const pz = worldX * sin1 + worldZ * cos1;

    // Domain warp for organic shapes
    const warpStrength = 60;
    const warpX = this.noise.fbm2(worldX + 5000, worldZ, 2, 0.5, 2.0, 0.005) * warpStrength;
    const warpZ = this.noise.fbm2(worldX, worldZ + 5000, 2, 0.5, 2.0, 0.005) * warpStrength;

    // Stretch noise along chain direction (creates linear ranges)
    const stretchFactor = 0.15;
    const primaryNoise = this.noise.fbm2(
      (px + warpX) * stretchFactor * cfg.zoneScale,
      (pz + warpZ) * cfg.zoneScale,
      3,
      cfg.zonePersistence,
      2.0,
      1.0
    );

    // Convert to 0-1 range
    const primaryMask = primaryNoise * 0.5 + 0.5;

    // === SECONDARY MOUNTAIN CHAIN (cross-range) ===
    const cos2 = Math.cos(cfg.secondaryAngle);
    const sin2 = Math.sin(cfg.secondaryAngle);
    const sx = worldX * cos2 - worldZ * sin2;
    const sz = worldX * sin2 + worldZ * cos2;

    const secondaryNoise = this.noise.fbm2(
      (sx + warpX * 0.8) * stretchFactor * cfg.zoneScale * 1.2,
      (sz + warpZ * 0.8) * cfg.zoneScale * 1.2,
      3,
      cfg.zonePersistence,
      2.0,
      1.0
    );

    const secondaryMask = (secondaryNoise * 0.5 + 0.5) * cfg.secondaryStrength;

    // Combine chains
    const combined = Math.max(primaryMask, secondaryMask);

    // Fade mountains near coast
    const coastFade = smoothstep(
      this.worldPlayRadius * 0.95,
      this.worldPlayRadius * 0.6,
      distFromCenter
    );

    // Fade mountains near spawn center
    const centerFade = smoothstep(cfg.spawnRadius, cfg.spawnRadius * 2.5, distFromCenter);

    // Apply threshold with smooth falloff
    const thresholded = smoothstep(
      cfg.zoneThreshold - 0.1,
      cfg.zoneThreshold + 0.1,
      combined
    );

    return thresholded * coastFade * centerFade;
  }

  // ===========================================================================
  // LAYER 4: MOUNTAIN RIDGES (ridged multifractal in zones only)
  // ===========================================================================

  getMountainHeight(worldX: number, worldZ: number, mask: number): number {
    if (mask < 0.01) return 0;

    const cfg = MOUNTAIN_CONFIG;

    // RIDGED MULTIFRACTAL: Creates mountain ridges (softened for rounder peaks)
    let ridged = 0;
    let amplitude = 1;
    let frequency = cfg.ridgeScale;
    let weight = 1;

    for (let i = 0; i < cfg.ridgeOctaves; i++) {
      let signal = this.noise.simplex2(worldX * frequency, worldZ * frequency);

      // Create ridges: 1 - |noise| creates V-shaped valleys
      signal = 1 - Math.abs(signal);

      // Softer sharpening (1.3 instead of 2.0 = more rounded peaks)
      signal = Math.pow(signal, 1.3);

      // Weight by previous octave (erosion-like detail)
      signal *= weight;
      weight = Math.min(1, Math.max(0, signal * 2));

      ridged += signal * amplitude;
      amplitude *= cfg.ridgePersistence;
      frequency *= 2.0;
    }

    // Normalize ridged noise (0-1 range)
    let normalizedRidged = ridged / 2.0;

    // PLATEAU/MESA CLAMPING: Flatten peaks above threshold for walkable mountain tops
    if (cfg.plateauEnabled) {
      const threshold = cfg.plateauThreshold;
      const smooth = cfg.plateauSmooth;
      const maxExcessFactor = cfg.plateauMaxExcess ?? 0.15;

      if (normalizedRidged > threshold) {
        // Apply terracing if enabled (creates step-like levels)
        if (cfg.terraceSteps > 0) {
          // Quantize to discrete steps
          const step = 1.0 / cfg.terraceSteps;
          normalizedRidged = Math.floor(normalizedRidged / step) * step;
        } else {
          // Improved plateau clamping for flatter, more walkable mountain tops
          const excess = normalizedRidged - threshold;
          const maxExcess = 1.0 - threshold;

          // Use asymptotic curve: rises quickly at first, then flattens
          // This creates broad, flat plateaus with gentle variation
          const t = excess / maxExcess;  // 0-1 range of "how far above threshold"
          const flattenedT = 1 - Math.exp(-t * 3 * smooth);  // Asymptotic curve

          // Limit the maximum height above threshold
          normalizedRidged = threshold + flattenedT * maxExcess * maxExcessFactor;
        }
      }
    }

    const baseHeight = cfg.baseHeight * mask;
    const peakHeight = normalizedRidged * mask * cfg.maxHeight;

    return baseHeight + peakHeight;
  }

  // ===========================================================================
  // LAYER 5: BEACH EROSION (Rust-style: gradual sandy beaches)
  // ===========================================================================

  applyBeachErosion(rawHeight: number, worldX: number, worldZ: number): number {
    const cfg = BEACH_CONFIG;

    // Only apply near water level and coast
    if (rawHeight < cfg.waterLevel - 2 || rawHeight > cfg.duneMax * 2.5) {
      return rawHeight;
    }

    // Distance from coastline (approximate using radial distance)
    const distFromCenter = Math.sqrt(worldX * worldX + worldZ * worldZ);
    const distFromCoast = this.worldPlayRadius - distFromCenter;

    // Beach only near edge of island
    if (distFromCoast > cfg.targetWidth * 2.5) return rawHeight;
    if (distFromCoast < 0) return cfg.waterLevel - 2; // Underwater

    // Target beach profile (gently rising from water)
    const beachProgress = Math.max(0, distFromCoast / cfg.targetWidth);
    const targetHeight = cfg.waterLevel + beachProgress * cfg.duneMax;

    // Add dune bumps in transition zone
    let duneHeight = 0;
    if (beachProgress > 0.3 && beachProgress < 0.9) {
      duneHeight = this.noise.fbm2(
        worldX * cfg.duneScale,
        worldZ * cfg.duneScale,
        2,
        0.5,
        2.0,
        1.0
      ) * cfg.duneHeight * (beachProgress - 0.3);
    }

    // Blend raw height toward beach profile
    const blendFactor = smoothstep(cfg.targetWidth * 2.5, 0, distFromCoast) * cfg.erosionStrength;
    return lerp(rawHeight, targetHeight + duneHeight, blendFactor);
  }

  // ===========================================================================
  // LAYER 6: DETAIL NOISE (micro variation)
  // ===========================================================================

  getDetailHeight(worldX: number, worldZ: number, mountainMask?: number): number {
    const cfg = DETAIL_CONFIG;

    const detail = this.noise.fbm2(
      worldX * cfg.scale,
      worldZ * cfg.scale,
      cfg.octaves,
      cfg.persistence,
      2.0,
      1.0
    );

    // Reduce detail noise on mountain tops for smoother, more walkable surfaces
    // Mountain tops (high mask value) get 30% of normal detail noise
    const mountainReduction = mountainMask !== undefined
      ? 0.3 + 0.7 * (1 - mountainMask)  // 0.3-1.0 multiplier based on mountain mask
      : 1.0;

    return detail * cfg.amplitude * mountainReduction;
  }

  // ===========================================================================
  // COMBINED HEIGHT
  // ===========================================================================

  /**
   * Get raw height WITHOUT river carving.
   * Used by hydrology simulator to compute flow before rivers are carved.
   */
  getRawHeight(worldX: number, worldZ: number): number {
    // Layer 1: Island mask
    const islandMask = this.getIslandMask(worldX, worldZ);

    // Early exit for ocean
    if (islandMask < 0.01) {
      return WATER_LEVEL - 5;
    }

    // Layer 2: Base height
    const baseHeight = this.getBaseHeight(worldX, worldZ);

    // Layer 3 & 4: Mountains (only in zones)
    const mountainMask = this.getMountainMask(worldX, worldZ);
    const mountainHeight = this.getMountainHeight(worldX, worldZ, mountainMask);

    // Layer 6: Detail variation (reduced on mountain tops for smoother surfaces)
    const detailHeight = this.getDetailHeight(worldX, worldZ, mountainMask);

    // Combine layers with island mask
    let height = (baseHeight + mountainHeight + detailHeight) * islandMask;

    // Layer 5: Apply beach erosion (but NOT river carving)
    height = this.applyBeachErosion(height, worldX, worldZ);

    return height;
  }

  getHeight(worldX: number, worldZ: number): number {
    // Check cache
    const cacheKey = `${Math.round(worldX * 10)},${Math.round(worldZ * 10)}`;
    const cached = this.heightCache.get(cacheKey);
    if (cached !== undefined) return cached;

    // Layer 1: Island mask
    const islandMask = this.getIslandMask(worldX, worldZ);

    // Early exit for ocean
    if (islandMask < 0.01) {
      const oceanHeight = WATER_LEVEL - 5;
      this.heightCache.set(cacheKey, oceanHeight);
      return oceanHeight;
    }

    // Layer 2: Base height
    const baseHeight = this.getBaseHeight(worldX, worldZ);

    // Layer 3 & 4: Mountains (only in zones)
    const mountainMask = this.getMountainMask(worldX, worldZ);
    const mountainHeight = this.getMountainHeight(worldX, worldZ, mountainMask);

    // Layer 6: Detail variation (reduced on mountain tops for smoother surfaces)
    const detailHeight = this.getDetailHeight(worldX, worldZ, mountainMask);

    // Combine layers with island mask
    let height = (baseHeight + mountainHeight + detailHeight) * islandMask;

    // Layer 5: Apply beach erosion
    height = this.applyBeachErosion(height, worldX, worldZ);

    // Layer 6: Prevent internal lakes (clamp inland terrain above water)
    // Only apply to inland areas (not ocean transition or beach)
    const distFromCenter = Math.sqrt(worldX * worldX + worldZ * worldZ);
    const isInland = distFromCenter < this.worldPlayRadius * 0.85;
    if (isInland && height < WATER_LEVEL + 0.5) {
      // Clamp to just above water level to prevent walkable underwater areas
      height = WATER_LEVEL + 0.5;
    }

    // Layer 7: Apply river carving (if hydrology enabled)
    if (this.hydrology && HYDROLOGY_CONFIG.enabled) {
      const flow = this.hydrology.getFlowAt(worldX, worldZ);
      if (flow?.isRiver) {
        height = Math.min(height, WATER_LEVEL - flow.depth);
      }
    }

    // Cache result
    if (this.heightCache.size >= this.maxCacheSize) {
      this.heightCache.clear();
    }
    this.heightCache.set(cacheKey, height);

    return height;
  }

  // ===========================================================================
  // SPAWN POINT HELPERS
  // ===========================================================================

  /**
   * Find a beach spawn point (Rust-style: on the edge of the island)
   */
  findBeachSpawnPoint(): { x: number; y: number; z: number } {
    const searchAngles = 16;
    const targetDist = this.worldPlayRadius * SPAWN_BEACH_DISTANCE;

    for (let i = 0; i < searchAngles; i++) {
      const angle = (i / searchAngles) * Math.PI * 2;
      const x = Math.cos(angle) * targetDist;
      const z = Math.sin(angle) * targetDist;
      const height = this.getHeight(x, z);

      // Good spawn: above water, in beach zone (1-5m), not too steep
      if (height > 1 && height < 5) {
        return { x, y: height + 1, z };
      }
    }

    // Fallback: center of island
    const centerHeight = this.getHeight(0, 0);
    return { x: 0, y: centerHeight + 2, z: 0 };
  }

  /**
   * Find a position in the beach biome (for campfire, etc.)
   */
  findBeachPosition(searchRadius?: number): { x: number; y: number; z: number } | null {
    const radius = searchRadius ?? this.worldPlayRadius;

    // Spiral search from edge inward
    for (let r = radius * 0.9; r > radius * 0.7; r -= 10) {
      for (let angle = 0; angle < Math.PI * 2; angle += 0.3) {
        const x = Math.cos(angle) * r;
        const z = Math.sin(angle) * r;
        const height = this.getHeight(x, z);

        // Beach zone check
        if (height > 0.5 && height < BEACH_CONFIG.duneMax) {
          return { x, y: height, z };
        }
      }
    }

    return null;
  }

  // ===========================================================================
  // CLIMATE: MOISTURE & TEMPERATURE
  // ===========================================================================

  getMoisture(worldX: number, worldZ: number): number {
    const cfg = CLIMATE_CONFIG;

    const baseMoisture = this.noise.fbm2(
      worldX + 5000,
      worldZ + 5000,
      3,
      0.5,
      2.0,
      cfg.moistureScale
    ) * 0.5 + 0.5;

    let moisture = baseMoisture;

    // Boost near rivers
    if (this.hydrology) {
      const flow = this.hydrology.getFlowAt(worldX, worldZ);
      if (flow) {
        const riverProximity = Math.max(0, 1 - flow.distanceToRiver / 50);
        moisture = Math.min(1, moisture + riverProximity * cfg.riverMoistureBoost);
      }
    }

    // Boost near coast
    const distFromCenter = Math.sqrt(worldX * worldX + worldZ * worldZ);
    const coastProximity = smoothstep(this.worldPlayRadius, this.worldPlayRadius * 0.7, distFromCenter);
    moisture = Math.min(1, moisture + coastProximity * cfg.coastMoistureBoost);

    return moisture;
  }

  getTemperature(worldX: number, worldZ: number): number {
    const cfg = CLIMATE_CONFIG;

    const baseTemp = this.noise.fbm2(
      worldX + 10000,
      worldZ + 10000,
      2,
      0.5,
      2.0,
      cfg.temperatureScale
    ) * 0.5 + 0.5;

    // Decrease with altitude
    const height = this.getHeight(worldX, worldZ);
    const altitudeEffect = Math.max(0, height) * cfg.altitudeTemperatureDrop;

    return Math.max(0, Math.min(1, baseTemp - altitudeEffect));
  }

  // ===========================================================================
  // BIOME SAMPLING
  // ===========================================================================

  getBiome(worldX: number, worldZ: number): BiomeType {
    const height = this.getHeight(worldX, worldZ);
    const moisture = this.getMoisture(worldX, worldZ);
    const temperature = this.getTemperature(worldX, worldZ);

    return BiomeLookupTable.lookup(height, moisture, temperature);
  }

  sampleTerrain(worldX: number, worldZ: number): TerrainSample {
    const height = this.getHeight(worldX, worldZ);
    const moisture = this.getMoisture(worldX, worldZ);
    const temperature = this.getTemperature(worldX, worldZ);
    const biome = BiomeLookupTable.lookup(height, moisture, temperature);

    // Calculate normal via central differences
    const delta = 0.5;
    const hL = this.getHeight(worldX - delta, worldZ);
    const hR = this.getHeight(worldX + delta, worldZ);
    const hD = this.getHeight(worldX, worldZ - delta);
    const hU = this.getHeight(worldX, worldZ + delta);

    const nx = (hL - hR) / (2 * delta);
    const nz = (hD - hU) / (2 * delta);
    const ny = 1;
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz);

    const normal = { x: nx / len, y: ny / len, z: nz / len };
    const slope = Math.acos(normal.y);

    let isRiver = false;
    let riverDepth = 0;
    let isLake = false;

    if (this.hydrology) {
      const flow = this.hydrology.getFlowAt(worldX, worldZ);
      if (flow) {
        if (flow.isRiver) {
          isRiver = true;
          riverDepth = flow.depth;
        }
        if (flow.isLake) {
          isLake = true;
        }
      }
    }

    // RUST-STYLE: Single submerged flag for easy vegetation filtering
    // True if: below water level OR in river OR in lake
    const isSubmerged = height <= WATER_LEVEL || isRiver || isLake;

    return { height, normal, slope, biome, moisture, temperature, isRiver, riverDepth, isLake, isSubmerged };
  }

  // ===========================================================================
  // CHUNK GENERATION
  // ===========================================================================

  generateChunk(chunkX: number, chunkZ: number, lod: LODLevel = LODLevel.LOD0): ChunkTerrainData {
    const resolution = LOD_RESOLUTIONS[lod];
    const origin = getChunkOrigin(chunkX, chunkZ);
    const step = CHUNK_SIZE / (resolution - 1);

    const heights = new Float32Array(resolution * resolution);
    const biomes = new Uint8Array(resolution * resolution);
    const moisture = new Uint8Array(resolution * resolution);

    let minHeight = Infinity;
    let maxHeight = -Infinity;

    for (let z = 0; z < resolution; z++) {
      for (let x = 0; x < resolution; x++) {
        const worldX = origin.x + x * step;
        const worldZ = origin.z + z * step;
        const idx = z * resolution + x;

        const h = this.getHeight(worldX, worldZ);
        const m = this.getMoisture(worldX, worldZ);
        const t = this.getTemperature(worldX, worldZ);
        const b = BiomeLookupTable.lookup(h, m, t);

        heights[idx] = h;
        biomes[idx] = Object.values(BiomeType).indexOf(b);
        moisture[idx] = Math.round(m * 255);

        minHeight = Math.min(minHeight, h);
        maxHeight = Math.max(maxHeight, h);
      }
    }

    return { coord: { x: chunkX, z: chunkZ }, heights, biomes, moisture, resolution, minHeight, maxHeight };
  }

  // ===========================================================================
  // LEGACY-COMPATIBLE METHODS
  // ===========================================================================

  generateChunkHeightmap(chunkX: number, chunkZ: number, lod: LODLevel = LODLevel.LOD0) {
    const resolution = LOD_RESOLUTIONS[lod];
    const heights = new Float32Array(resolution * resolution);
    const origin = getChunkOrigin(chunkX, chunkZ);
    const step = CHUNK_SIZE / (resolution - 1);

    let minHeight = Infinity;
    let maxHeight = -Infinity;

    for (let z = 0; z < resolution; z++) {
      for (let x = 0; x < resolution; x++) {
        const worldX = origin.x + x * step;
        const worldZ = origin.z + z * step;
        const height = this.getHeight(worldX, worldZ);

        heights[z * resolution + x] = height;
        minHeight = Math.min(minHeight, height);
        maxHeight = Math.max(maxHeight, height);
      }
    }

    return { coord: { x: chunkX, z: chunkZ }, heights, resolution, minHeight, maxHeight };
  }

  generateChunkVertices(chunkX: number, chunkZ: number, lod: LODLevel = LODLevel.LOD0): Float32Array {
    const resolution = LOD_RESOLUTIONS[lod];
    const vertices = new Float32Array(resolution * resolution * 3);
    const origin = getChunkOrigin(chunkX, chunkZ);
    const step = CHUNK_SIZE / (resolution - 1);

    let idx = 0;
    for (let z = 0; z < resolution; z++) {
      for (let x = 0; x < resolution; x++) {
        const worldX = origin.x + x * step;
        const worldZ = origin.z + z * step;
        const height = this.getHeight(worldX, worldZ);

        vertices[idx++] = worldX;
        vertices[idx++] = height;
        vertices[idx++] = worldZ;
      }
    }

    return vertices;
  }

  generateChunkNormals(chunkX: number, chunkZ: number, lod: LODLevel = LODLevel.LOD0): Float32Array {
    const resolution = LOD_RESOLUTIONS[lod];
    const normals = new Float32Array(resolution * resolution * 3);
    const origin = getChunkOrigin(chunkX, chunkZ);
    const step = CHUNK_SIZE / (resolution - 1);

    let idx = 0;
    for (let z = 0; z < resolution; z++) {
      for (let x = 0; x < resolution; x++) {
        const worldX = origin.x + x * step;
        const worldZ = origin.z + z * step;

        const delta = step * 0.5;
        const hL = this.getHeight(worldX - delta, worldZ);
        const hR = this.getHeight(worldX + delta, worldZ);
        const hD = this.getHeight(worldX, worldZ - delta);
        const hU = this.getHeight(worldX, worldZ + delta);

        const nx = (hL - hR) / (2 * delta);
        const nz = (hD - hU) / (2 * delta);
        const ny = 1;
        const len = Math.sqrt(nx * nx + ny * ny + nz * nz);

        normals[idx++] = nx / len;
        normals[idx++] = ny / len;
        normals[idx++] = nz / len;
      }
    }

    return normals;
  }

  generateChunkUVs(lod: LODLevel = LODLevel.LOD0): Float32Array {
    const resolution = LOD_RESOLUTIONS[lod];
    const uvs = new Float32Array(resolution * resolution * 2);

    let idx = 0;
    for (let z = 0; z < resolution; z++) {
      for (let x = 0; x < resolution; x++) {
        uvs[idx++] = x / (resolution - 1);
        uvs[idx++] = z / (resolution - 1);
      }
    }

    return uvs;
  }

  generateChunkIndices(lod: LODLevel = LODLevel.LOD0): Uint32Array {
    const resolution = LOD_RESOLUTIONS[lod];
    const quads = (resolution - 1) * (resolution - 1);
    const indices = new Uint32Array(quads * 6);

    let idx = 0;
    for (let z = 0; z < resolution - 1; z++) {
      for (let x = 0; x < resolution - 1; x++) {
        const topLeft = z * resolution + x;
        const topRight = topLeft + 1;
        const bottomLeft = (z + 1) * resolution + x;
        const bottomRight = bottomLeft + 1;

        indices[idx++] = topLeft;
        indices[idx++] = bottomLeft;
        indices[idx++] = topRight;

        indices[idx++] = topRight;
        indices[idx++] = bottomLeft;
        indices[idx++] = bottomRight;
      }
    }

    return indices;
  }

  sampleHeight(worldX: number, worldZ: number): number {
    return this.getHeight(worldX, worldZ);
  }

  getMountainZoneMask(worldX: number, worldZ: number): number {
    return this.getMountainMask(worldX, worldZ);
  }

  // ===========================================================================
  // CACHE MANAGEMENT
  // ===========================================================================

  clearCache(): void {
    this.heightCache.clear();
  }

  getSeed(): number {
    return this.seed;
  }

  setSeed(seed: number): void {
    this.seed = seed;
    this.noise = new NoiseGenerator(seed);
    this.clearCache();
  }

  getWorldPlayRadius(): number {
    return this.worldPlayRadius;
  }
}

// Export singleton for convenience
export const terrainGenerator = new TerrainGenerator(12345);
