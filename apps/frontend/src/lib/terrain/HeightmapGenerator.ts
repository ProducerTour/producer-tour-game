/**
 * HeightmapGenerator.ts
 * Extends NoiseGenerator with terrain-specific heightmap generation
 * Provides height sampling for both mesh generation and collision
 */

import { NoiseGenerator } from './NoiseGenerator';
import {
  NOISE_CONFIG,
  MAX_HEIGHT,
  MIN_HEIGHT,
  CHUNK_SIZE,
  LOD_RESOLUTIONS,
  LODLevel,
  getChunkOrigin,
  WORLD_PLAY_RADIUS,
  WORLD_TRANSITION_WIDTH,
  WORLD_EDGE_TARGET,
  type ChunkCoord,
} from './TerrainConfig';

// =============================================================================
// HEIGHTMAP DATA TYPES
// =============================================================================

/**
 * Heightmap data for a single chunk
 */
export interface ChunkHeightmap {
  /** Chunk grid coordinates */
  coord: ChunkCoord;

  /** Raw height values (resolution x resolution) */
  heights: Float32Array;

  /** Resolution of this heightmap */
  resolution: number;

  /** Min height in this chunk (for frustum culling) */
  minHeight: number;

  /** Max height in this chunk (for frustum culling) */
  maxHeight: number;
}

/**
 * Terrain sample result at a single point
 */
export interface TerrainSample {
  /** Height at this position */
  height: number;

  /** Surface normal */
  normal: { x: number; y: number; z: number };

  /** Slope angle in radians (0 = flat, PI/2 = vertical) */
  slope: number;

  /** Biome weight for texture splatting */
  biome: {
    grass: number;
    rock: number;
    dirt: number;
    sand: number;
    snow: number;
    forest: number;
  };
}

// =============================================================================
// HEIGHTMAP GENERATOR CLASS
// =============================================================================

/**
 * Mountain configuration options for runtime adjustment
 */
export interface MountainConfig {
  /** Ridge width multiplier (1.0 = default, <1 = wider, >1 = narrower) */
  ridgeScale: number;
  /** Peak sharpness (1.0 = default, <1 = rounder, >1 = sharper) */
  peakSharpness: number;
  /** Height multiplier (1.0 = default ~100m, range 0.5-2.0) */
  heightScale: number;
  /** Region size (1.0 = default, <1 = larger regions, >1 = smaller) */
  regionScale: number;
}

/**
 * Valley and river configuration options for runtime adjustment
 */
export interface ValleyConfig {
  /** Valley depth multiplier (1.0 = default 8m, range 0.3-2.0) */
  valleyDepth: number;
  /** Valley frequency (1.0 = default, <1 = wider valleys, >1 = narrower) */
  valleyScale: number;
  /** River depth multiplier (1.0 = default 8m, range 0.3-2.0) */
  riverDepth: number;
  /** River width (1.0 = default, <1 = narrower, >1 = wider rivers) */
  riverWidth: number;
}

export class HeightmapGenerator {
  private noise: NoiseGenerator;
  private seed: number;

  // Cache for frequently sampled positions
  private heightCache: Map<string, number> = new Map();
  private maxCacheSize = 10000;

  // Cache for mountain biome mask (separate for performance)
  private mountainMaskCache: Map<string, number> = new Map();
  private maxMountainCacheSize = 5000;

  // Cache for coastline distance
  private coastlineCache: Map<string, number> = new Map();
  private maxCoastlineCacheSize = 5000;

  // Dynamic world bounds (can be set based on chunk radius)
  private worldPlayRadius: number;
  private worldTransitionWidth: number;
  private worldEdgeTarget: number;
  private worldBoundary: number;

  // Mountain configuration (runtime adjustable)
  private mountainConfig: MountainConfig = {
    ridgeScale: 1.0,
    peakSharpness: 1.0,
    heightScale: 1.0,
    regionScale: 1.0,
  };

  // Valley/river configuration (runtime adjustable)
  private valleyConfig: ValleyConfig = {
    valleyDepth: 1.0,
    valleyScale: 1.0,
    riverDepth: 1.0,
    riverWidth: 1.0,
  };

  constructor(seed: number = NOISE_CONFIG.seed, chunkRadius?: number) {
    this.seed = seed;
    this.noise = new NoiseGenerator(seed);

    // If chunk radius provided, calculate world bounds from it
    // Otherwise use defaults from config
    if (chunkRadius !== undefined) {
      // Play radius = edge of the inner chunks (leave outer ring for coast transition)
      // For radius=4: total = 9 chunks * 64m = 576m, half = 288m
      // We want coast transition in the outer chunk, so play radius = (radius - 0.5) * CHUNK_SIZE
      this.worldPlayRadius = (chunkRadius - 0.5) * CHUNK_SIZE;
      // Transition happens over 1 chunk width
      this.worldTransitionWidth = CHUNK_SIZE;
    } else {
      this.worldPlayRadius = WORLD_PLAY_RADIUS;
      this.worldTransitionWidth = WORLD_TRANSITION_WIDTH;
    }
    this.worldEdgeTarget = WORLD_EDGE_TARGET;
    this.worldBoundary = this.worldPlayRadius + this.worldTransitionWidth;
  }

  // ===========================================================================
  // MOUNTAIN CONFIGURATION
  // ===========================================================================

  /**
   * Update mountain configuration at runtime.
   * Clears caches to regenerate terrain with new settings.
   */
  setMountainConfig(config: Partial<MountainConfig>): void {
    const changed =
      config.ridgeScale !== this.mountainConfig.ridgeScale ||
      config.peakSharpness !== this.mountainConfig.peakSharpness ||
      config.heightScale !== this.mountainConfig.heightScale ||
      config.regionScale !== this.mountainConfig.regionScale;

    if (changed) {
      this.mountainConfig = { ...this.mountainConfig, ...config };
      // Clear caches to regenerate with new settings
      this.clearCache();
    }
  }

  /**
   * Get current mountain configuration
   */
  getMountainConfig(): MountainConfig {
    return { ...this.mountainConfig };
  }

  // ===========================================================================
  // VALLEY/RIVER CONFIGURATION
  // ===========================================================================

  /**
   * Update valley/river configuration at runtime.
   * Clears caches to regenerate terrain with new settings.
   */
  setValleyConfig(config: Partial<ValleyConfig>): void {
    const changed =
      config.valleyDepth !== this.valleyConfig.valleyDepth ||
      config.valleyScale !== this.valleyConfig.valleyScale ||
      config.riverDepth !== this.valleyConfig.riverDepth ||
      config.riverWidth !== this.valleyConfig.riverWidth;

    if (changed) {
      this.valleyConfig = { ...this.valleyConfig, ...config };
      // Clear caches to regenerate with new settings
      this.clearCache();
    }
  }

  /**
   * Get current valley/river configuration
   */
  getValleyConfig(): ValleyConfig {
    return { ...this.valleyConfig };
  }

  // ===========================================================================
  // RUST-STYLE IRREGULAR COASTLINE
  // ===========================================================================

  /**
   * Generate distance to coastline with IRREGULAR, jagged edge.
   * Uses layered noise to create peninsulas, bays, and inlets.
   * Returns: positive = inland, negative = ocean, 0 = coastline
   */
  private getCoastlineDistance(worldX: number, worldZ: number): number {
    // Check cache first
    const cacheKey = `${Math.floor(worldX / 4)},${Math.floor(worldZ / 4)}`;
    const cached = this.coastlineCache.get(cacheKey);
    if (cached !== undefined) return cached;

    // Base radial distance (circular island baseline)
    const radialDist = Math.hypot(worldX, worldZ);
    const baseCoastDist = this.worldPlayRadius - radialDist;

    // === RUST-STYLE COASTLINE NOISE ===
    // Layer 1: Large peninsulas and bays (~400m features)
    const largeScale = 0.003;
    const largeWarp = this.noise.fbm2(worldX + 2000, worldZ + 2000, 3, 0.5, 2.0, largeScale);
    const largePeninsula = largeWarp * this.worldPlayRadius * 0.35; // Up to 35% radius variation

    // Layer 2: Medium inlets and headlands (~150m features)
    const medScale = 0.008;
    const medWarp = this.noise.fbm2(worldX + 4000, worldZ, 2, 0.5, 2.0, medScale);
    const medInlets = medWarp * this.worldPlayRadius * 0.15;

    // Layer 3: Small coves and points (~50m features)
    const smallScale = 0.02;
    const smallWarp = this.noise.fbm2(worldX, worldZ + 4000, 2, 0.5, 2.0, smallScale);
    const smallCoves = smallWarp * this.worldPlayRadius * 0.06;

    // Layer 4: Angular/direction-based variation (creates asymmetric coastline)
    const angle = Math.atan2(worldZ, worldX);
    const angularWarp = this.noise.fbm2(
      Math.cos(angle * 3) * 500 + 6000,
      Math.sin(angle * 5) * 500,
      2, 0.5, 2.0, 0.01
    ) * this.worldPlayRadius * 0.2;

    // Combine all layers
    const coastOffset = largePeninsula + medInlets + smallCoves + angularWarp;
    const coastDist = baseCoastDist + coastOffset;

    // Cache result
    if (this.coastlineCache.size >= this.maxCoastlineCacheSize) {
      const entries = Array.from(this.coastlineCache.keys());
      for (let i = 0; i < this.maxCoastlineCacheSize / 2; i++) {
        this.coastlineCache.delete(entries[i]);
      }
    }
    this.coastlineCache.set(cacheKey, coastDist);

    return coastDist;
  }

  /**
   * Get regional biome influence based on world position.
   * Creates Rust-style regional biomes (snow in NE, desert in SW, etc.)
   */
  private getRegionalBiome(worldX: number, worldZ: number): {
    snow: number;
    desert: number;
    temperate: number;
  } {
    // Normalize position to -1 to 1 range
    const nx = worldX / this.worldPlayRadius;
    const nz = worldZ / this.worldPlayRadius;

    // Snow biome: Northeast quadrant (+X, +Z)
    // Stronger toward corner, with noise for organic edges
    const snowBase = (nx + nz) * 0.5; // -1 to 1, max at NE corner
    const snowNoise = this.noise.fbm2(worldX + 8000, worldZ, 2, 0.5, 2.0, 0.002) * 0.3;
    const snowWeight = this.smoothstep(0.1, 0.6, snowBase + snowNoise);

    // Desert biome: Southwest/West quadrant (-X, some -Z)
    const desertBase = (-nx * 0.7 - nz * 0.3); // Stronger west influence
    const desertNoise = this.noise.fbm2(worldX, worldZ + 8000, 2, 0.5, 2.0, 0.002) * 0.25;
    const desertWeight = this.smoothstep(0.0, 0.5, desertBase + desertNoise);

    // Temperate (grass/forest): Fills remaining areas
    const temperateWeight = Math.max(0, 1 - snowWeight - desertWeight);

    // Normalize
    const total = snowWeight + desertWeight + temperateWeight;
    return {
      snow: snowWeight / total,
      desert: desertWeight / total,
      temperate: temperateWeight / total,
    };
  }

  /**
   * Generate river channel value at a world position.
   * Creates Rust-style river networks flowing from inland to coast.
   * Returns: 0 = no river, 1 = river center
   */
  private getRiverValue(worldX: number, worldZ: number): number {
    // River width config: affects threshold and smoothness
    const widthScale = this.valleyConfig.riverWidth;

    // === PRIMARY RIVER (flows NE to SW) ===
    const primaryAngle = Math.PI * 0.75; // ~135 degrees (NE to SW)
    const cos1 = Math.cos(primaryAngle);
    const sin1 = Math.sin(primaryAngle);
    const px = worldX * cos1 - worldZ * sin1;
    const pz = worldX * sin1 + worldZ * cos1;

    // Domain warp for meandering - smoother, larger scale
    const warpX = this.noise.fbm2(worldX + 9000, worldZ, 2, 0.4, 2.0, 0.0015) * 100;
    const warpZ = this.noise.fbm2(worldX, worldZ + 9000, 2, 0.4, 2.0, 0.0015) * 100;

    // === SMOOTH FBM for river channels (replaces ridged noise) ===
    // Use smooth FBM and threshold to create gentle river beds
    const riverFBM1 = this.noise.fbm2(
      (px + warpX) * 0.002,
      (pz + warpZ) * 0.0005,
      2, 0.35, 1.8, 1.0
    );
    // Normalize and create smooth channel with wider transition
    const river1Norm = riverFBM1 * 0.5 + 0.5;
    const river1Threshold = 0.65 / widthScale; // Lower threshold = wider rivers
    const river1 = this.smoothstep(river1Threshold, river1Threshold + 0.15, river1Norm);

    // === SECONDARY RIVER (flows E to W) ===
    const secondaryAngle = Math.PI * 0.1; // ~20 degrees
    const cos2 = Math.cos(secondaryAngle);
    const sin2 = Math.sin(secondaryAngle);
    const sx = worldX * cos2 - worldZ * sin2;
    const sz = worldX * sin2 + worldZ * cos2;

    const riverFBM2 = this.noise.fbm2(
      (sx + warpX * 0.8) * 0.0018,
      (sz + warpZ * 0.8) * 0.0004,
      2, 0.35, 1.8, 1.0
    );
    const river2Norm = riverFBM2 * 0.5 + 0.5;
    const river2Threshold = 0.68 / widthScale;
    const river2 = this.smoothstep(river2Threshold, river2Threshold + 0.15, river2Norm);

    // === TRIBUTARY STREAMS (smaller, gentler) ===
    const streamFBM = this.noise.fbm2(
      (worldX + warpX * 0.5) * 0.003,
      (worldZ + warpZ * 0.5) * 0.003,
      2, 0.3, 1.8, 1.0
    );
    const streamNorm = streamFBM * 0.5 + 0.5;
    const streamThreshold = 0.72 / widthScale;
    const streams = this.smoothstep(streamThreshold, streamThreshold + 0.12, streamNorm) * 0.4;

    // Combine rivers with smooth blend (not max - prevents sharp edges)
    const combinedRiver = Math.max(river1, river2, streams);

    // Suppress rivers in mountains and at map center
    const coastDist = this.getCoastlineDistance(worldX, worldZ);
    const centerDist = Math.hypot(worldX, worldZ);
    const mountainMask = this.generateMountainBiomeMask(worldX, worldZ);

    // Rivers don't cut through mountain cores - wider transition
    const mountainSuppress = 1 - this.smoothstep(0.3, 0.6, mountainMask);
    // Rivers need to reach coast (fade near coastline, appear inland)
    const coastFade = this.smoothstep(15, 100, coastDist);
    // No rivers right at spawn - wider fade
    const centerFade = this.smoothstep(30, 150, centerDist);

    return combinedRiver * mountainSuppress * coastFade * centerFade;
  }

  // ===========================================================================
  // MOUNTAIN BIOME MASK (NOISE-BASED, OPPOSITE OF SAND)
  // ===========================================================================

  /**
   * Generate mountain biome mask at a world position.
   * RUST-STYLE: Organic mountain regions with smooth, walkable transitions.
   * Uses IRREGULAR COASTLINE for edge detection.
   *
   * @returns 0-1 value indicating mountain strength
   */
  private generateMountainBiomeMask(worldX: number, worldZ: number): number {
    // Use irregular coastline distance instead of radial
    const coastDist = this.getCoastlineDistance(worldX, worldZ);

    // Early exit: no mountains in ocean or very close to center
    const centerDist = Math.hypot(worldX, worldZ);
    if (coastDist < 0 || centerDist < 60) return 0;

    // === BEACH ZONE ===
    // No mountains within beach zone of coastline
    const beachWidth = 40; // 40m beach zone
    if (coastDist < beachWidth) return 0;

    // Fade mountains as they approach beach
    const beachFade = this.smoothstep(beachWidth, beachWidth + 80, coastDist);

    // === RUST-STYLE: ORGANIC REGION NOISE ===
    const warpStrength = 150;
    const warpScale = 0.0004;
    const warpX = this.noise.fbm2(worldX + 5000, worldZ, 2, 0.5, 2.0, warpScale) * warpStrength;
    const warpZ = this.noise.fbm2(worldX, worldZ + 5000, 2, 0.5, 2.0, warpScale) * warpStrength;

    const warpedX = worldX + warpX;
    const warpedZ = worldZ + warpZ;

    // Large-scale mountain regions
    // Apply regionScale config: smaller scale = larger regions (wider mountains)
    const baseRegionScale = 0.0003;
    const regionScale = baseRegionScale * this.mountainConfig.regionScale;
    const regionNoise = this.noise.fbm2(warpedX, warpedZ, 3, 0.5, 2.0, regionScale);
    const mountainBase = this.smoothstep(-0.1, 0.5, regionNoise);

    // === COASTAL SUPPRESSION ===
    const baseHeight = this.getBaseTerrainHeight(worldX, worldZ);
    const coastalFade = this.smoothstep(6, 20, baseHeight);

    // === INNER FADE (no mountains right at spawn) ===
    const innerFade = this.smoothstep(60, 150, centerDist);

    // === COMBINE ===
    let mountainMask = mountainBase * coastalFade * beachFade * innerFade;

    // Peak variation
    const peakNoise = this.noise.fbm2(warpedX * 1.3, warpedZ * 1.3, 2, 0.5, 2.0, 0.0007);
    const peakVariation = this.smoothstep(0.25, 0.65, peakNoise);
    mountainMask *= 0.75 + peakVariation * 0.25;

    return Math.max(0, Math.min(1, mountainMask));
  }

  /**
   * Generate ridge-line mask for connected alpine mountain chains.
   * Creates linear features that mountains concentrate along.
   *
   * Uses rotated, stretched noise to create directional ridges,
   * then adds secondary ridges at an angle for complexity.
   * This creates the characteristic "alpine range" look with
   * connected chains and valleys between.
   *
   * @returns 0-1 ridge strength value
   */
  private generateRidgeLineMask(worldX: number, worldZ: number): number {
    // Ridge orientation - tilted to create diagonal chains across the map
    const ridgeAngle = Math.PI * 0.3; // ~55 degrees
    const cos = Math.cos(ridgeAngle);
    const sin = Math.sin(ridgeAngle);

    // Rotate coordinates to align with ridge direction
    const rx = worldX * cos - worldZ * sin;
    const rz = worldX * sin + worldZ * cos;

    // Domain warp for organic variation (prevents perfectly straight ridges)
    const warpStrength = 80;
    const warpScale = 0.0006;
    const warpX = this.noise.fbm2(worldX + 3000, worldZ, 2, 0.5, 2.0, warpScale) * warpStrength;
    const warpZ = this.noise.fbm2(worldX, worldZ + 3000, 2, 0.5, 2.0, warpScale) * warpStrength;

    const warpedRx = rx + warpX;
    const warpedRz = rz + warpZ;

    // === SMOOTH FBM APPROACH (replaces ridged noise to prevent spikes) ===
    // Use smooth FBM with low persistence for rolling ridge lines
    const ridgeScale = this.mountainConfig.ridgeScale;

    // Primary ridges - smooth FBM stretched along ridge direction
    const primaryFBM = this.noise.fbm2(
      warpedRx * 0.0015 * ridgeScale,
      warpedRz * 0.0003 * ridgeScale,
      2, 0.35, 1.8, 1.0  // Low persistence, low lacunarity = smooth
    );
    // Normalize to 0-1 and apply smooth curve
    const primaryRidge = Math.pow(primaryFBM * 0.5 + 0.5, 0.8);

    // Secondary ridges at different angle (creates valleys between)
    const secondaryAngle = ridgeAngle + Math.PI * 0.4; // ~125 degrees (70° offset)
    const cos2 = Math.cos(secondaryAngle);
    const sin2 = Math.sin(secondaryAngle);
    const rx2 = worldX * cos2 - worldZ * sin2;
    const rz2 = worldX * sin2 + worldZ * cos2;

    const secondaryFBM = this.noise.fbm2(
      (rx2 + warpX) * 0.0012 * ridgeScale,
      (rz2 + warpZ) * 0.00025 * ridgeScale,
      2, 0.35, 1.8, 1.0
    );
    const secondaryRidge = Math.pow(secondaryFBM * 0.5 + 0.5, 0.8);

    // Combine ridges - primary dominant, secondary adds complexity
    const combinedRidge = primaryRidge * 0.7 + secondaryRidge * 0.3;

    // WIDENED TRANSITION for smooth mountain slopes (prevents abrupt walls)
    // Goes from 0 at 0.2 to 1 at 0.7 - much gentler transition
    const ridgeThreshold = 0.45;
    const ridgeMask = this.smoothstep(ridgeThreshold - 0.25, ridgeThreshold + 0.25, combinedRidge);

    return ridgeMask;
  }

  /**
   * Get base terrain height without mountain contribution.
   * Used for anti-sand constraint in mountain biome mask.
   * Must match the Rust-style rolling hills formula in generateHeight().
   */
  private getBaseTerrainHeight(worldX: number, worldZ: number): number {
    const { octaves, persistence, lacunarity, baseScale } = NOISE_CONFIG;

    // === RUST-STYLE ROLLING HILLS (same as generateHeight) ===
    const largeScale = 0.0002;
    const largeFBM = this.noise.fbm2(worldX + 1000, worldZ + 1000, 2, 0.5, 2.0, largeScale);
    const largeHills = largeFBM * 0.5 + 0.5;

    const mediumScale = 0.0006;
    const mediumFBM = this.noise.fbm2(worldX, worldZ, 3, 0.55, 2.0, mediumScale);
    const mediumHills = mediumFBM * 0.5 + 0.5;

    const baseFBM = this.noise.fbm2(worldX, worldZ, octaves, persistence, lacunarity, baseScale);
    const smallDetail = baseFBM * 0.5 + 0.5;

    const combinedHeight = largeHills * 0.35 + mediumHills * 0.45 + smallDetail * 0.2;
    const biased = Math.pow(combinedHeight, 1.6);
    const baseHeight = biased * 48 - 3;

    // Valley noise (frequency adjusted by valleyScale config)
    const valleyFreq = 0.0003 * this.valleyConfig.valleyScale;
    const valleyNoise = this.noise.fbm2(worldX, worldZ, 3, 0.5, 2.0, valleyFreq);
    const valleyDepth = Math.max(0, -valleyNoise) * 8 * this.valleyConfig.valleyDepth;

    return baseHeight - valleyDepth;
  }

  // ===========================================================================
  // DOMAIN WARPED RIDGES & EROSION
  // ===========================================================================

  /**
   * Generate warped ridge noise for organic, non-linear mountain ridges.
   * Domain warping prevents unnaturally straight ridgelines.
   *
   * @returns Ridge height contribution (0-1 normalized)
   */
  private generateWarpedRidgeHeight(worldX: number, worldZ: number, scale: number = 0.0003): number {
    // Domain warp with low-frequency noise to bend ridge lines
    const warpStrength = 80; // meters of displacement
    const warpScale = 0.0004; // ~2.5km wavelength for large-scale bending

    const warpX = this.noise.fbm2(worldX + 7000, worldZ, 2, 0.5, 2.0, warpScale) * warpStrength;
    const warpZ = this.noise.fbm2(worldX, worldZ + 7000, 2, 0.5, 2.0, warpScale) * warpStrength;

    const warpedX = worldX + warpX;
    const warpedZ = worldZ + warpZ;

    // Ridged multifractal on warped coordinates
    const ridged = this.noise.ridged2(warpedX, warpedZ, 4, 0.5, 2.0, scale);

    return ridged;
  }

  /**
   * Calculate erosion factor based on local curvature.
   * Positive curvature (ridges) = erosion, negative (valleys) = deposition.
   * This is a lightweight approximation, not a full hydraulic simulation.
   *
   * @returns Erosion factor (-1 to 1, positive = erode, negative = deposit)
   */
  private getErosionFactor(worldX: number, worldZ: number): number {
    // Sample heights in a cross pattern for Laplacian approximation
    const sampleDist = 2.0; // 2m sampling distance

    const hCenter = this.sampleHeightRaw(worldX, worldZ);
    const hL = this.sampleHeightRaw(worldX - sampleDist, worldZ);
    const hR = this.sampleHeightRaw(worldX + sampleDist, worldZ);
    const hU = this.sampleHeightRaw(worldX, worldZ + sampleDist);
    const hD = this.sampleHeightRaw(worldX, worldZ - sampleDist);

    // Laplacian curvature: positive = ridge (convex), negative = valley (concave)
    const laplacian = (hL + hR + hU + hD) / 4 - hCenter;

    // Normalize to -1..1 range with sensitivity tuning
    // Typical terrain curvature is small, scale up for effect
    const curvature = Math.max(-1, Math.min(1, laplacian * 0.3));

    // Calculate slope from raw heights (avoids recursion through calculateNormal -> sampleHeight)
    const nx = hL - hR;
    const ny = sampleDist * 2;
    const nz = hD - hU;
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
    const normalY = ny / len; // Vertical component of normal

    // Erosion strength scales with slope (steep = more erosion)
    const slopeFactor = 1 - normalY; // 0 = flat, 1 = vertical
    const slopeBoost = 1 + slopeFactor * 2; // Up to 3x on steep slopes

    return curvature * slopeBoost;
  }

  /**
   * Sample raw height without caching (for erosion calculation).
   * Uses simplified generation to avoid infinite recursion.
   * Must match Rust-style rolling hills formula.
   */
  private sampleHeightRaw(worldX: number, worldZ: number): number {
    const { octaves, persistence, lacunarity, baseScale } = NOISE_CONFIG;

    // === RUST-STYLE ROLLING HILLS (simplified for performance) ===
    const largeScale = 0.0002;
    const largeFBM = this.noise.fbm2(worldX + 1000, worldZ + 1000, 2, 0.5, 2.0, largeScale);
    const largeHills = largeFBM * 0.5 + 0.5;

    const mediumScale = 0.0006;
    const mediumFBM = this.noise.fbm2(worldX, worldZ, 2, 0.55, 2.0, mediumScale); // Fewer octaves
    const mediumHills = mediumFBM * 0.5 + 0.5;

    const baseFBM = this.noise.fbm2(worldX, worldZ, Math.min(octaves, 4), persistence, lacunarity, baseScale);
    const smallDetail = baseFBM * 0.5 + 0.5;

    const combinedHeight = largeHills * 0.35 + mediumHills * 0.45 + smallDetail * 0.2;
    const biased = Math.pow(combinedHeight, 1.6);
    const baseHeight = biased * 48 - 3;

    // Warped ridge contribution (without erosion to avoid recursion)
    const warpedRidge = this.generateWarpedRidgeHeight(worldX, worldZ, NOISE_CONFIG.ridgeScale);
    const ridgeHeight = warpedRidge * MAX_HEIGHT * NOISE_CONFIG.ridgeWeight * 0.3;

    // Valley noise (frequency adjusted by valleyScale config)
    const valleyFreq = 0.0003 * this.valleyConfig.valleyScale;
    const valleyNoise = this.noise.fbm2(worldX, worldZ, 3, 0.5, 2.0, valleyFreq);
    const valleyDepth = Math.max(0, -valleyNoise) * 8 * this.valleyConfig.valleyDepth;

    // Basic mountain contribution (simplified)
    // Apply heightScale config for consistency with main generation
    const mountainMask = this.generateMountainBiomeMask(worldX, worldZ);
    const baseMaxMountainHeight = Math.min(120, this.worldPlayRadius * 0.4);
    const maxMountainHeight = baseMaxMountainHeight * this.mountainConfig.heightScale;
    const mountainLift = mountainMask * maxMountainHeight * 0.5;

    let height = baseHeight + ridgeHeight - valleyDepth + mountainLift;

    // Edge shaping
    const dist = Math.hypot(worldX, worldZ);
    const t = Math.min(1, Math.max(0, (dist - this.worldPlayRadius) / this.worldTransitionWidth));
    const edge = t * t * (3 - 2 * t);
    height = height * (1 - edge) + this.worldEdgeTarget * edge;

    if (dist > this.worldBoundary) {
      height = this.worldEdgeTarget;
    }

    return Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, height));
  }

  // ===========================================================================
  // CORE HEIGHT SAMPLING
  // ===========================================================================

  /**
   * Sample height at a world position (meters)
   * This is the primary method for collision detection
   * Uses IRREGULAR COASTLINE for edge detection
   */
  sampleHeight(worldX: number, worldZ: number): number {
    // === EARLY EXIT: Far beyond any possible land ===
    const radialDist = Math.hypot(worldX, worldZ);
    const maxPossibleLand = this.worldPlayRadius * 1.5; // Account for peninsulas
    if (radialDist > maxPossibleLand) {
      return this.worldEdgeTarget;
    }

    // === MULTI-RESOLUTION CACHING ===
    // Use coastline distance to determine cache resolution
    const coastDist = this.getCoastlineDistance(worldX, worldZ);
    const inOcean = coastDist < -20; // Deep in ocean
    const cacheResolution = inOcean ? 1 : 10; // 1m for ocean, 0.1m for land

    const cacheKey = `${Math.floor(worldX * cacheResolution)},${Math.floor(worldZ * cacheResolution)}`;
    const cached = this.heightCache.get(cacheKey);
    if (cached !== undefined) return cached;

    // === GENERATE HEIGHT ===
    // Deep ocean gets simplified calculation
    let height: number;
    if (inOcean) {
      height = this.generateEdgeHeight(worldX, worldZ, coastDist);
    } else {
      height = this.generateHeight(worldX, worldZ);
    }

    // Cache the result with LRU-style eviction
    if (this.heightCache.size >= this.maxCacheSize) {
      // Clear oldest entries (roughly LRU behavior)
      const entries = Array.from(this.heightCache.keys());
      const toDelete = Math.min(entries.length, this.maxCacheSize / 4);
      for (let i = 0; i < toDelete; i++) {
        this.heightCache.delete(entries[i]);
      }
    }
    this.heightCache.set(cacheKey, height);

    return height;
  }

  /**
   * Simplified height generation for ocean/edge zone.
   * Uses coastline distance for underwater terrain.
   */
  private generateEdgeHeight(worldX: number, worldZ: number, coastDist: number): number {
    // coastDist is negative in ocean (distance below coastline)
    const oceanDepth = -coastDist; // Positive depth value

    // Simple ocean floor with some variation
    const oceanNoise = this.noise.fbm2(worldX, worldZ, 2, 0.5, 2.0, 0.005);
    const oceanVariation = oceanNoise * 3; // ±3m variation

    // Deeper = lower, with smooth transition
    const transitionWidth = 40;
    const t = Math.min(1, oceanDepth / transitionWidth);
    const edge = t * t * (3 - 2 * t); // smoothstep

    // Beach edge starts at ~3m, sinks to target
    const beachEdgeHeight = 3 + oceanVariation;
    const height = beachEdgeHeight * (1 - edge) + this.worldEdgeTarget * edge;

    // Clamp deep ocean
    if (oceanDepth > transitionWidth * 1.5) {
      return this.worldEdgeTarget;
    }

    return Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, height));
  }

  /**
   * Core height generation using layered noise
   * RUST-STYLE: Rolling hills with gradual elevation changes
   * Terrain shape only - biome classification happens separately
   */
  private generateHeight(worldX: number, worldZ: number): number {
    const { octaves, persistence, lacunarity, baseScale, ridgeScale, ridgeWeight } = NOISE_CONFIG;

    // === RUST-STYLE ROLLING HILLS ===
    // Layer 1: Large-scale terrain undulation (controls overall elevation zones)
    const largeScale = 0.0002; // ~5km wavelength
    const largeFBM = this.noise.fbm2(worldX + 1000, worldZ + 1000, 2, 0.5, 2.0, largeScale);
    const largeHills = largeFBM * 0.5 + 0.5; // 0-1

    // Layer 2: Medium rolling hills (the classic Rust look)
    const mediumScale = 0.0006; // ~1.6km wavelength
    const mediumFBM = this.noise.fbm2(worldX, worldZ, 3, 0.55, 2.0, mediumScale);
    const mediumHills = mediumFBM * 0.5 + 0.5; // 0-1

    // Layer 3: Small detail undulation
    const baseFBM = this.noise.fbm2(worldX, worldZ, octaves, persistence, lacunarity, baseScale);
    const smallDetail = baseFBM * 0.5 + 0.5; // 0-1

    // Combine layers with Rust-style weighting
    // Large hills set the "zone", medium creates the rolling look, small adds texture
    const combinedHeight = largeHills * 0.35 + mediumHills * 0.45 + smallDetail * 0.2;

    // Softer bias curve (1.6 instead of 2.0) - allows more mid-elevation terrain
    // This creates the characteristic Rust rolling grassland look
    const biased = Math.pow(combinedHeight, 1.6);

    // Scale to height range: -3m to 45m base (wider range for rolling hills)
    const baseHeight = biased * 48 - 3;

    // === REDUCED RIDGE CONTRIBUTION ===
    // Ridged noise creates spiky peaks - reduce its influence significantly
    // Use smooth FBM for terrain variation instead
    const smoothVariation = this.noise.fbm2(worldX + 2000, worldZ + 2000, 2, 0.3, 2.0, ridgeScale * 0.5);
    const ridgeHeightRaw = smoothVariation * MAX_HEIGHT * ridgeWeight * 0.15; // Reduced from 0.3

    // Attenuate ridge contribution at low elevations
    const ridgeStart = -5;
    const ridgeFull = 12;
    const ridgeT = Math.max(0, Math.min(1, (baseHeight - ridgeStart) / (ridgeFull - ridgeStart)));
    const ridgeAttenuation = ridgeT * ridgeT * (3 - 2 * ridgeT);
    const ridgeHeight = ridgeHeightRaw * ridgeAttenuation;

    // Combine base layers
    let height = baseHeight + ridgeHeight;

    // Valley noise - creates natural depressions (rivers/lakes)
    // Frequency and depth adjusted by valleyConfig
    const valleyFreq = 0.0003 * this.valleyConfig.valleyScale;
    const valleyNoise = this.noise.fbm2(worldX, worldZ, 3, 0.5, 2.0, valleyFreq);
    const valleyDepth = Math.max(0, -valleyNoise) * 8 * this.valleyConfig.valleyDepth;
    height -= valleyDepth;

    // === MOUNTAIN BIOME (noise-based, opposite of sand) ===
    // RUST-STYLE: Walkable mountains with gradual slopes
    const mountainMask = this.generateMountainBiomeMask(worldX, worldZ);

    // === RUST-STYLE FOOT-SLOPE RAMPING ===
    // Uses cubic ramp for very gentle initial slope (walkable everywhere)
    // pow(x, 1.5) creates gradual transition that steepens toward center
    const rampedMask = Math.pow(mountainMask, 1.5); // Gentler than quadratic

    // Apply mountain lift FIRST (before carving) for proper layering
    if (mountainMask > 0) {
      // === SMOOTH FBM APPROACH (not ridged noise) ===
      // Based on research: ridged noise creates spiky peaks, FBM creates smooth rolling terrain
      // Reference: https://www.redblobgames.com/maps/terrain-from-noise/

      // Mountain feature frequency - smaller = wider/smoother features
      const mountainFreq = 0.0002 * this.mountainConfig.ridgeScale;

      // Use LOW PERSISTENCE (0.35) for smoother terrain - less high-frequency detail
      // Higher persistence creates more jagged terrain
      const smoothPersistence = 0.35;

      // Smooth FBM noise for rolling mountain tops
      const mountainFBM = this.noise.fbm2(
        worldX + 6000, worldZ + 6000,
        3,                    // Only 3 octaves (less detail = smoother)
        smoothPersistence,    // Low persistence for smooth output
        1.8,                  // Lower lacunarity for gentler frequency scaling
        mountainFreq
      );

      // Normalize to 0-1 range
      const mountainSmooth = mountainFBM * 0.5 + 0.5;

      // === POWER REDISTRIBUTION for peak shape ===
      // Based on research: raising elevation to a power controls peak sharpness
      // peakSharpness < 1 = flatter plateau tops
      // peakSharpness > 1 = more peaked mountains
      const redistributed = Math.pow(mountainSmooth, 1.0 / this.mountainConfig.peakSharpness);

      // Secondary variation at even larger scale for natural variety
      const variationFreq = 0.00015 * this.mountainConfig.ridgeScale;
      const variation = this.noise.fbm2(worldX * 1.1, worldZ * 1.1, 2, 0.3, 2.0, variationFreq);
      const variationNorm = (variation * 0.5 + 0.5) * 0.15; // Small influence

      // Combine for total peak factor
      const peakFactor = Math.min(1.0, redistributed * 0.85 + variationNorm);

      // Apply heightScale config to max mountain height
      const baseMaxHeight = Math.min(100, this.worldPlayRadius * 0.35);
      const maxMountainHeight = baseMaxHeight * this.mountainConfig.heightScale;

      // More plateau-like profile (0.65 base + 0.35 peak variation)
      const mountainLift = rampedMask * (0.65 + peakFactor * 0.35) * maxMountainHeight;
      height += mountainLift;
    }

    // Apply gentle erosion (reduced strength for walkable terrain)
    if (mountainMask > 0.4) {
      const erosionFactor = this.getErosionFactor(worldX, worldZ);
      const erosionStrength = 0.8; // Reduced from 1.5
      height -= erosionFactor * erosionStrength * mountainMask;
    }

    // === GENTLE VALLEY CARVING ===
    // RUST-STYLE: Shallow valleys, not deep V-shaped gorges
    if (mountainMask > 0.5) {
      const valleyNoise = 1.0 - this.generateRidgeLineMask(worldX, worldZ);
      // U-shaped valleys (gentler sides with higher power)
      const valleyShape = Math.pow(valleyNoise, 0.7); // Higher power = gentler
      // Valley depth scales with core mountain region (adjusted by valleyDepth config)
      const coreStrength = this.smoothstep(0.5, 0.85, mountainMask);
      const valleyCarveDepth = valleyShape * coreStrength * 12 * this.valleyConfig.valleyDepth;
      height -= valleyCarveDepth;
    }

    // === RIVER CARVING ===
    // Rust-style rivers cutting through terrain
    const riverValue = this.getRiverValue(worldX, worldZ);
    if (riverValue > 0.1) {
      // River depth increases toward center (adjusted by riverDepth config)
      const riverDepthVal = riverValue * 8 * this.valleyConfig.riverDepth; // Up to 8m deep * multiplier
      // Rivers carve below water level (negative height = underwater)
      const riverFloor = -2 - riverValue * 3 * this.valleyConfig.riverDepth; // Deeper with higher multiplier
      // Blend toward river floor
      const carvedHeight = height - riverDepthVal;
      // Don't carve below river floor
      height = Math.max(riverFloor, carvedHeight);
    }

    // === RUST-STYLE IRREGULAR COASTLINE ===
    // Use noise-based coastline instead of radial distance
    const coastDist = this.getCoastlineDistance(worldX, worldZ);

    // === BEACH ZONE ===
    // Terrain lowers to beach height as it approaches coastline
    const beachWidth = 50; // 50m beach zone
    const beachTargetHeight = 2.5; // Low enough for sand biome

    if (coastDist > 0 && coastDist < beachWidth) {
      // Smoothly lower terrain to beach height
      const beachT = coastDist / beachWidth;
      const beachSmooth = beachT * beachT; // Quadratic - more beach at edge

      // Blend toward beach height
      const targetHeight = beachTargetHeight + beachSmooth * 8; // 2.5m at edge, up to 10.5m inland
      height = Math.min(height, targetHeight);
    }

    // === COAST TRANSITION (terrain to water) ===
    const transitionWidth = 30; // 30m water transition

    if (coastDist < 0) {
      // We're in the ocean - below coastline
      const oceanDepth = -coastDist; // Positive value for depth
      const t = Math.min(1, oceanDepth / transitionWidth);
      const edge = t * t * (3 - 2 * t); // smoothstep

      // Sink terrain to underwater
      height = height * (1 - edge) + this.worldEdgeTarget * edge;

      // Beyond transition, force underwater
      if (oceanDepth > transitionWidth) {
        height = this.worldEdgeTarget;
      }
    }

    // === HARD BOUNDARY (safety clamp) ===
    const radialDist = Math.hypot(worldX, worldZ);
    const maxRadius = this.worldPlayRadius + this.worldTransitionWidth * 1.5;
    if (radialDist > maxRadius) {
      height = this.worldEdgeTarget;
    }

    // Clamp to valid range
    return Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, height));
  }

  /**
   * Sample terrain with full detail (height, normal, slope, biome)
   */
  sampleTerrain(worldX: number, worldZ: number): TerrainSample {
    const height = this.sampleHeight(worldX, worldZ);
    const normal = this.calculateNormal(worldX, worldZ);
    const slope = Math.acos(normal.y); // Angle from up vector

    // Calculate biome weights based on height, slope, and neighborhood context
    const biome = this.calculateBiomeWeights(worldX, worldZ, height, slope);

    return { height, normal, slope, biome };
  }

  /**
   * Calculate surface normal at a position
   */
  calculateNormal(
    worldX: number,
    worldZ: number,
    sampleDist: number = 0.5
  ): { x: number; y: number; z: number } {
    // Sample 4 neighbors
    const hL = this.sampleHeight(worldX - sampleDist, worldZ);
    const hR = this.sampleHeight(worldX + sampleDist, worldZ);
    const hD = this.sampleHeight(worldX, worldZ - sampleDist);
    const hU = this.sampleHeight(worldX, worldZ + sampleDist);

    // Calculate normal from cross product of tangent vectors
    const nx = hL - hR;
    const ny = sampleDist * 2;
    const nz = hD - hU;

    // Normalize
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
    return {
      x: nx / len,
      y: ny / len,
      z: nz / len,
    };
  }

  /**
   * Smoothstep interpolation matching GLSL smoothstep
   */
  private smoothstep(edge0: number, edge1: number, x: number): number {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  }

  /**
   * Calculate biome weights for texture splatting
   * RUST-STYLE: Regional biomes (snow NE, desert SW) combined with altitude
   * - Snow: Northeast region + high altitude
   * - Desert/sand: Southwest/West region + coastal
   * - Forest: Temperate regions at mid elevation
   * - Rock: Steep slopes everywhere
   * - Grass: Default filler
   */
  private calculateBiomeWeights(
    worldX: number,
    worldZ: number,
    height: number,
    slope: number
  ): { grass: number; rock: number; dirt: number; sand: number; snow: number; forest: number } {
    // === GET REGIONAL BIOME INFLUENCE ===
    const regional = this.getRegionalBiome(worldX, worldZ);
    const coastDist = this.getCoastlineDistance(worldX, worldZ);

    // === ALTITUDE GATES (adjusted for regional biomes) ===
    const SAND_MAX = 6.0;
    const FOREST_MIN = 12.0;
    const FOREST_MAX = 65.0;
    // Snow altitude lowered significantly in snow regions
    const SNOW_MIN_BASE = 80.0;
    const SNOW_MIN_REGIONAL = 25.0; // Much lower in snow biome region
    const SNOW_MIN = SNOW_MIN_BASE - (SNOW_MIN_BASE - SNOW_MIN_REGIONAL) * regional.snow;

    // Convert slope (radians) to shader's slope format: 1 - normal.y
    const slopeFactor = 1 - Math.cos(slope);

    // === INITIALIZE WEIGHTS ===
    let grass = 0;
    let rock = 0;
    let dirt = 0;
    let sand = 0;
    let snow = 0;
    let forest = 0;

    // === SNOW BIOME (regional + altitude) ===
    // In snow region, snow appears at much lower altitudes
    const snowAltitude = this.smoothstep(SNOW_MIN - 15, SNOW_MIN + 10, height);
    const snowSlope = 1 - this.smoothstep(0.1, 0.4, slopeFactor);
    // Regional snow influence (strong in NE)
    const snowRegional = regional.snow * 0.8 + snowAltitude * 0.2;
    snow = snowRegional * snowSlope * (0.3 + snowAltitude * 0.7);

    // === ROCK WEIGHT (steep slopes) ===
    const rockSteep = this.smoothstep(0.15, 0.35, slopeFactor);
    const normalizedHeight = (height - MIN_HEIGHT) / (MAX_HEIGHT - MIN_HEIGHT);
    let heightRock = this.smoothstep(0.5, 0.75, normalizedHeight);
    heightRock *= (1 - snow * 0.7); // Snow partially covers rock
    rock = Math.max(rockSteep, heightRock);

    // === SAND/DESERT BIOME ===
    // Coastal beaches + desert regions
    const coastalSand = coastDist > 0 && coastDist < 60 && height < SAND_MAX && slopeFactor < 0.3;
    const desertSand = regional.desert > 0.3 && height > 5 && height < 40 && slopeFactor < 0.2;

    if (coastalSand) {
      // Beach sand near coast
      const beachT = coastDist / 60;
      sand = (1 - beachT * beachT) * (1 - rock * 0.5);
    }
    if (desertSand) {
      // Desert sand in arid region
      const desertStrength = this.smoothstep(0.3, 0.6, regional.desert);
      sand = Math.max(sand, desertStrength * 0.8 * (1 - rock));
    }

    // === FOREST BIOME (temperate regions, mid elevation) ===
    if (height > FOREST_MIN && height < FOREST_MAX && slopeFactor < 0.25) {
      const forestAltLow = this.smoothstep(FOREST_MIN - 5, FOREST_MIN + 10, height);
      const forestAltHigh = 1 - this.smoothstep(FOREST_MAX - 15, FOREST_MAX, height);
      const forestAltitude = forestAltLow * forestAltHigh;
      const forestSlope = 1 - this.smoothstep(0.1, 0.25, slopeFactor);

      // Moisture noise
      const moistureNoise = this.noise.fbm2(worldX, worldZ, 3, 0.5, 2.0, 0.0004);
      const moisture = this.smoothstep(-0.2, 0.4, moistureNoise);

      // Forest reduced in snow and desert regions
      const temperateBoost = regional.temperate * 1.2;
      forest = forestAltitude * forestSlope * moisture * temperateBoost;
      forest *= (1 - rock) * (1 - snow * 0.8) * (1 - sand * 0.5);
    }

    // === DIRT (desert ground in arid areas) ===
    if (regional.desert > 0.2 && sand < 0.5) {
      dirt = regional.desert * 0.4 * (1 - sand) * (1 - rock) * (1 - snow);
    }

    // === GRASS BIOME (fills remaining space) ===
    // Grass is the default - whatever isn't covered by other biomes
    grass = 1 - Math.max(snow, rock, sand, forest);
    grass = Math.max(0, grass);

    // Dirt is minimal - fills small gaps
    dirt = Math.max(0, 1 - grass - rock - sand - snow - forest) * 0.05;

    // === NORMALIZE WEIGHTS ===
    const total = grass + rock + dirt + sand + snow + forest;
    if (total > 0) {
      grass /= total;
      rock /= total;
      dirt /= total;
      sand /= total;
      snow /= total;
      forest /= total;
    } else {
      grass = 1;
    }

    return { grass, rock, dirt, sand, snow, forest };
  }

  // ===========================================================================
  // CHUNK HEIGHTMAP GENERATION
  // ===========================================================================

  /**
   * Generate heightmap for a chunk (for mesh generation)
   */
  generateChunkHeightmap(chunkX: number, chunkZ: number, lod: LODLevel = LODLevel.LOD0): ChunkHeightmap {
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
        const height = this.sampleHeight(worldX, worldZ);

        heights[z * resolution + x] = height;
        minHeight = Math.min(minHeight, height);
        maxHeight = Math.max(maxHeight, height);
      }
    }

    return {
      coord: { x: chunkX, z: chunkZ },
      heights,
      resolution,
      minHeight,
      maxHeight,
    };
  }

  /**
   * Generate vertex positions for a chunk mesh
   * Returns Float32Array of [x, y, z, x, y, z, ...] positions
   */
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
        const height = this.sampleHeight(worldX, worldZ);

        vertices[idx++] = worldX;
        vertices[idx++] = height;
        vertices[idx++] = worldZ;
      }
    }

    return vertices;
  }

  /**
   * Generate normals for a chunk mesh
   */
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
        const normal = this.calculateNormal(worldX, worldZ);

        normals[idx++] = normal.x;
        normals[idx++] = normal.y;
        normals[idx++] = normal.z;
      }
    }

    return normals;
  }

  /**
   * Generate UVs for a chunk mesh
   */
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

  /**
   * Generate indices for a chunk mesh (triangle list)
   */
  generateChunkIndices(lod: LODLevel = LODLevel.LOD0): Uint32Array {
    const resolution = LOD_RESOLUTIONS[lod];
    const quads = (resolution - 1) * (resolution - 1);
    const indices = new Uint32Array(quads * 6); // 2 triangles per quad

    let idx = 0;
    for (let z = 0; z < resolution - 1; z++) {
      for (let x = 0; x < resolution - 1; x++) {
        const topLeft = z * resolution + x;
        const topRight = topLeft + 1;
        const bottomLeft = (z + 1) * resolution + x;
        const bottomRight = bottomLeft + 1;

        // First triangle (top-left, bottom-left, top-right)
        indices[idx++] = topLeft;
        indices[idx++] = bottomLeft;
        indices[idx++] = topRight;

        // Second triangle (top-right, bottom-left, bottom-right)
        indices[idx++] = topRight;
        indices[idx++] = bottomLeft;
        indices[idx++] = bottomRight;
      }
    }

    return indices;
  }

  // ===========================================================================
  // UTILITY
  // ===========================================================================

  /**
   * Clear all caches (height, mountain mask, and coastline)
   */
  clearCache(): void {
    this.heightCache.clear();
    this.mountainMaskCache.clear();
    this.coastlineCache.clear();
  }

  /**
   * Change seed and regenerate
   */
  setSeed(seed: number): void {
    this.seed = seed;
    this.noise.setSeed(seed);
    this.clearCache();
  }

  /**
   * Get current seed
   */
  getSeed(): number {
    return this.seed;
  }

  /**
   * Get noise generator for custom operations
   */
  getNoise(): NoiseGenerator {
    return this.noise;
  }

  /**
   * Get the mountain mask value at a world position (0-1)
   * Use this to skip grass spawning on mountain terrain.
   * Uses cached values for performance.
   */
  getMountainMask(worldX: number, worldZ: number): number {
    // Check cache first (lower resolution for performance)
    const cacheKey = `${Math.floor(worldX / 2)},${Math.floor(worldZ / 2)}`;
    const cached = this.mountainMaskCache.get(cacheKey);
    if (cached !== undefined) return cached;

    // Generate the mask
    const mask = this.generateMountainBiomeMask(worldX, worldZ);

    // Cache the result
    if (this.mountainMaskCache.size >= this.maxMountainCacheSize) {
      // Clear half the cache when full
      const entries = Array.from(this.mountainMaskCache.keys());
      for (let i = 0; i < this.maxMountainCacheSize / 2; i++) {
        this.mountainMaskCache.delete(entries[i]);
      }
    }
    this.mountainMaskCache.set(cacheKey, mask);

    return mask;
  }

  /**
   * Find a position in a sand biome (for placing objects like campfires)
   * Searches in a spiral pattern from the origin outwards
   * @param minSandWeight - Minimum sand biome weight (0-1, default 0.5)
   * @param searchRadius - Maximum search radius in meters (default 200)
   * @param stepSize - Distance between sample points (default 10)
   * @returns Position {x, y, z} if found, or null if no sand biome found
   */
  findSandBiomePosition(
    minSandWeight: number = 0.5,
    searchRadius: number = 200,
    stepSize: number = 10
  ): { x: number; y: number; z: number } | null {
    // Search in a spiral pattern from center outwards
    // This ensures we find a reasonably close sand position
    const maxSteps = Math.ceil(searchRadius / stepSize);

    for (let ring = 1; ring <= maxSteps; ring++) {
      const radius = ring * stepSize;
      const circumference = 2 * Math.PI * radius;
      const pointsInRing = Math.max(8, Math.floor(circumference / stepSize));

      for (let i = 0; i < pointsInRing; i++) {
        const angle = (i / pointsInRing) * 2 * Math.PI;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;

        // Sample terrain at this position
        const terrain = this.sampleTerrain(x, z);

        // Check if this is a valid sand position
        // Must be above water and have sufficient sand weight
        if (terrain.biome.sand >= minSandWeight && terrain.height > 0) {
          // Found a sand position - return it with terrain height
          return { x, y: terrain.height, z };
        }
      }
    }

    // No sand biome found within search radius
    return null;
  }

  /**
   * Find multiple sand biome positions (for placing multiple objects)
   * @param count - Number of positions to find
   * @param minSandWeight - Minimum sand biome weight
   * @param minSpacing - Minimum distance between positions
   * @returns Array of positions found
   */
  findMultipleSandPositions(
    count: number = 1,
    minSandWeight: number = 0.5,
    minSpacing: number = 20
  ): Array<{ x: number; y: number; z: number }> {
    const positions: Array<{ x: number; y: number; z: number }> = [];
    const searchRadius = 300;
    const stepSize = 8;
    const maxSteps = Math.ceil(searchRadius / stepSize);

    for (let ring = 1; ring <= maxSteps && positions.length < count; ring++) {
      const radius = ring * stepSize;
      const circumference = 2 * Math.PI * radius;
      const pointsInRing = Math.max(8, Math.floor(circumference / stepSize));

      for (let i = 0; i < pointsInRing && positions.length < count; i++) {
        const angle = (i / pointsInRing) * 2 * Math.PI;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;

        // Check if too close to existing positions
        const tooClose = positions.some(
          (pos) => Math.hypot(pos.x - x, pos.z - z) < minSpacing
        );
        if (tooClose) continue;

        const terrain = this.sampleTerrain(x, z);

        if (terrain.biome.sand >= minSandWeight && terrain.height > 0) {
          positions.push({ x, y: terrain.height, z });
        }
      }
    }

    return positions;
  }
}

// Export singleton instance
export const heightmapGenerator = new HeightmapGenerator();
