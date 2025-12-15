/**
 * Noise Generator
 * Simplex noise implementation for procedural terrain and city generation
 */

import {
  TERRAIN_OCTAVES,
  TERRAIN_PERSISTENCE,
  TERRAIN_LACUNARITY,
  TERRAIN_NOISE_SCALE,
  TERRAIN_HEIGHT_SCALE,
  DEFAULT_WORLD_SEED,
} from './CityConfig';

// Simplex noise permutation table
const PERM_SIZE = 256;

/**
 * Seeded random number generator
 */
function seededRandom(seed: number): () => number {
  return () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
}

/**
 * Generate permutation table from seed
 */
function generatePermutation(seed: number): Uint8Array {
  const perm = new Uint8Array(PERM_SIZE * 2);
  const random = seededRandom(seed);

  // Fill with sequential values
  for (let i = 0; i < PERM_SIZE; i++) {
    perm[i] = i;
  }

  // Fisher-Yates shuffle
  for (let i = PERM_SIZE - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }

  // Duplicate for overflow
  for (let i = 0; i < PERM_SIZE; i++) {
    perm[PERM_SIZE + i] = perm[i];
  }

  return perm;
}

// Gradient vectors for 2D simplex noise
const GRAD2 = [
  [1, 1],
  [-1, 1],
  [1, -1],
  [-1, -1],
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

// Gradient vectors for 3D simplex noise
const GRAD3 = [
  [1, 1, 0],
  [-1, 1, 0],
  [1, -1, 0],
  [-1, -1, 0],
  [1, 0, 1],
  [-1, 0, 1],
  [1, 0, -1],
  [-1, 0, -1],
  [0, 1, 1],
  [0, -1, 1],
  [0, 1, -1],
  [0, -1, -1],
];

// Skewing factors for 2D
const F2 = 0.5 * (Math.sqrt(3) - 1);
const G2 = (3 - Math.sqrt(3)) / 6;

// Skewing factors for 3D
const F3 = 1 / 3;
const G3 = 1 / 6;

export class NoiseGenerator {
  private perm: Uint8Array;
  private seed: number;

  constructor(seed: number = DEFAULT_WORLD_SEED) {
    this.seed = seed;
    this.perm = generatePermutation(seed);
  }

  /**
   * 2D Simplex noise
   * Returns value in range [-1, 1]
   */
  simplex2(x: number, y: number): number {
    const perm = this.perm;

    // Skew input space to determine simplex cell
    const s = (x + y) * F2;
    const i = Math.floor(x + s);
    const j = Math.floor(y + s);

    // Unskew back to (x, y) space
    const t = (i + j) * G2;
    const X0 = i - t;
    const Y0 = j - t;
    const x0 = x - X0;
    const y0 = y - Y0;

    // Determine which simplex we're in
    const i1 = x0 > y0 ? 1 : 0;
    const j1 = x0 > y0 ? 0 : 1;

    // Offsets for corners
    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2;
    const y2 = y0 - 1 + 2 * G2;

    // Hash coordinates of corners
    const ii = i & 255;
    const jj = j & 255;

    // Calculate contributions from corners
    let n0 = 0,
      n1 = 0,
      n2 = 0;

    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 >= 0) {
      const gi0 = perm[ii + perm[jj]] % 8;
      t0 *= t0;
      n0 = t0 * t0 * (GRAD2[gi0][0] * x0 + GRAD2[gi0][1] * y0);
    }

    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 >= 0) {
      const gi1 = perm[ii + i1 + perm[jj + j1]] % 8;
      t1 *= t1;
      n1 = t1 * t1 * (GRAD2[gi1][0] * x1 + GRAD2[gi1][1] * y1);
    }

    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 >= 0) {
      const gi2 = perm[ii + 1 + perm[jj + 1]] % 8;
      t2 *= t2;
      n2 = t2 * t2 * (GRAD2[gi2][0] * x2 + GRAD2[gi2][1] * y2);
    }

    // Scale to [-1, 1]
    return 70 * (n0 + n1 + n2);
  }

  /**
   * 3D Simplex noise
   * Returns value in range [-1, 1]
   */
  simplex3(x: number, y: number, z: number): number {
    const perm = this.perm;

    // Skew input space
    const s = (x + y + z) * F3;
    const i = Math.floor(x + s);
    const j = Math.floor(y + s);
    const k = Math.floor(z + s);

    // Unskew
    const t = (i + j + k) * G3;
    const X0 = i - t;
    const Y0 = j - t;
    const Z0 = k - t;
    const x0 = x - X0;
    const y0 = y - Y0;
    const z0 = z - Z0;

    // Determine simplex
    let i1, j1, k1, i2, j2, k2;
    if (x0 >= y0) {
      if (y0 >= z0) {
        i1 = 1;
        j1 = 0;
        k1 = 0;
        i2 = 1;
        j2 = 1;
        k2 = 0;
      } else if (x0 >= z0) {
        i1 = 1;
        j1 = 0;
        k1 = 0;
        i2 = 1;
        j2 = 0;
        k2 = 1;
      } else {
        i1 = 0;
        j1 = 0;
        k1 = 1;
        i2 = 1;
        j2 = 0;
        k2 = 1;
      }
    } else {
      if (y0 < z0) {
        i1 = 0;
        j1 = 0;
        k1 = 1;
        i2 = 0;
        j2 = 1;
        k2 = 1;
      } else if (x0 < z0) {
        i1 = 0;
        j1 = 1;
        k1 = 0;
        i2 = 0;
        j2 = 1;
        k2 = 1;
      } else {
        i1 = 0;
        j1 = 1;
        k1 = 0;
        i2 = 1;
        j2 = 1;
        k2 = 0;
      }
    }

    const x1 = x0 - i1 + G3;
    const y1 = y0 - j1 + G3;
    const z1 = z0 - k1 + G3;
    const x2 = x0 - i2 + 2 * G3;
    const y2 = y0 - j2 + 2 * G3;
    const z2 = z0 - k2 + 2 * G3;
    const x3 = x0 - 1 + 3 * G3;
    const y3 = y0 - 1 + 3 * G3;
    const z3 = z0 - 1 + 3 * G3;

    const ii = i & 255;
    const jj = j & 255;
    const kk = k & 255;

    let n0 = 0,
      n1 = 0,
      n2 = 0,
      n3 = 0;

    let t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
    if (t0 >= 0) {
      const gi0 = perm[ii + perm[jj + perm[kk]]] % 12;
      t0 *= t0;
      n0 = t0 * t0 * (GRAD3[gi0][0] * x0 + GRAD3[gi0][1] * y0 + GRAD3[gi0][2] * z0);
    }

    let t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
    if (t1 >= 0) {
      const gi1 = perm[ii + i1 + perm[jj + j1 + perm[kk + k1]]] % 12;
      t1 *= t1;
      n1 = t1 * t1 * (GRAD3[gi1][0] * x1 + GRAD3[gi1][1] * y1 + GRAD3[gi1][2] * z1);
    }

    let t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
    if (t2 >= 0) {
      const gi2 = perm[ii + i2 + perm[jj + j2 + perm[kk + k2]]] % 12;
      t2 *= t2;
      n2 = t2 * t2 * (GRAD3[gi2][0] * x2 + GRAD3[gi2][1] * y2 + GRAD3[gi2][2] * z2);
    }

    let t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
    if (t3 >= 0) {
      const gi3 = perm[ii + 1 + perm[jj + 1 + perm[kk + 1]]] % 12;
      t3 *= t3;
      n3 = t3 * t3 * (GRAD3[gi3][0] * x3 + GRAD3[gi3][1] * y3 + GRAD3[gi3][2] * z3);
    }

    return 32 * (n0 + n1 + n2 + n3);
  }

  /**
   * Fractal Brownian Motion (fBm) using 2D simplex noise
   * Combines multiple octaves for more natural-looking terrain
   */
  fbm2(
    x: number,
    y: number,
    octaves: number = TERRAIN_OCTAVES,
    persistence: number = TERRAIN_PERSISTENCE,
    lacunarity: number = TERRAIN_LACUNARITY,
    scale: number = TERRAIN_NOISE_SCALE
  ): number {
    let value = 0;
    let amplitude = 1;
    let frequency = scale;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      value += amplitude * this.simplex2(x * frequency, y * frequency);
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
    }

    return value / maxValue;
  }

  /**
   * Fractal Brownian Motion using 3D simplex noise
   */
  fbm3(
    x: number,
    y: number,
    z: number,
    octaves: number = TERRAIN_OCTAVES,
    persistence: number = TERRAIN_PERSISTENCE,
    lacunarity: number = TERRAIN_LACUNARITY,
    scale: number = TERRAIN_NOISE_SCALE
  ): number {
    let value = 0;
    let amplitude = 1;
    let frequency = scale;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      value += amplitude * this.simplex3(x * frequency, y * frequency, z * frequency);
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
    }

    return value / maxValue;
  }

  /**
   * Ridged multifractal noise for mountain ridges
   */
  ridged2(
    x: number,
    y: number,
    octaves: number = TERRAIN_OCTAVES,
    persistence: number = TERRAIN_PERSISTENCE,
    lacunarity: number = TERRAIN_LACUNARITY,
    scale: number = TERRAIN_NOISE_SCALE
  ): number {
    let value = 0;
    let amplitude = 1;
    let frequency = scale;
    let weight = 1;

    for (let i = 0; i < octaves; i++) {
      let signal = this.simplex2(x * frequency, y * frequency);
      signal = 1 - Math.abs(signal); // Create ridges
      signal *= signal; // Sharpen ridges
      signal *= weight;
      weight = Math.min(1, Math.max(0, signal * 2)); // Weight for next octave

      value += signal * amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
    }

    return value;
  }

  /**
   * Generate terrain height at a world position
   */
  getTerrainHeight(worldX: number, worldZ: number, districtBias: number = 0): number {
    // Base terrain using fBm
    const baseHeight = this.fbm2(worldX, worldZ) * 0.5 + 0.5; // Normalize to [0, 1]

    // Add some ridged noise for hills
    const ridgeHeight = this.ridged2(worldX, worldZ, 3, 0.5, 2.0, 0.001) * 0.3;

    // Combine and scale
    const height = (baseHeight + ridgeHeight) * TERRAIN_HEIGHT_SCALE + districtBias;

    return Math.max(0, height);
  }

  /**
   * Generate a heightmap for a chunk
   */
  generateChunkHeightmap(
    chunkX: number,
    chunkZ: number,
    chunkSize: number,
    resolution: number,
    districtBias: number = 0
  ): Float32Array {
    const heightmap = new Float32Array(resolution * resolution);
    const step = chunkSize / (resolution - 1);
    const worldOffsetX = chunkX * chunkSize;
    const worldOffsetZ = chunkZ * chunkSize;

    for (let z = 0; z < resolution; z++) {
      for (let x = 0; x < resolution; x++) {
        const worldX = worldOffsetX + x * step;
        const worldZ = worldOffsetZ + z * step;
        heightmap[z * resolution + x] = this.getTerrainHeight(worldX, worldZ, districtBias);
      }
    }

    return heightmap;
  }

  /**
   * Get district influence at a position (for blending districts)
   * Returns a value for determining which district this position belongs to
   */
  getDistrictNoise(worldX: number, worldZ: number): number {
    // Use large-scale noise for district boundaries
    return this.fbm2(worldX, worldZ, 2, 0.5, 2.0, 0.0005);
  }

  /**
   * Get moisture/vegetation noise
   */
  getMoistureNoise(worldX: number, worldZ: number): number {
    // Offset by a large amount to decorrelate from terrain
    return this.fbm2(worldX + 1000, worldZ + 1000, 3, 0.5, 2.0, 0.001) * 0.5 + 0.5;
  }

  /**
   * Get building placement noise (for density variation)
   */
  getBuildingNoise(worldX: number, worldZ: number): number {
    return this.fbm2(worldX + 2000, worldZ + 2000, 2, 0.6, 2.5, 0.005) * 0.5 + 0.5;
  }

  /**
   * Get road variation noise (for organic road curves)
   */
  getRoadNoise(worldX: number, worldZ: number): number {
    return this.simplex2(worldX * 0.01, worldZ * 0.01);
  }

  /**
   * Reset with new seed
   */
  setSeed(seed: number): void {
    this.seed = seed;
    this.perm = generatePermutation(seed);
  }

  /**
   * Get current seed
   */
  getSeed(): number {
    return this.seed;
  }
}

// Export singleton instance
export const noiseGenerator = new NoiseGenerator();
