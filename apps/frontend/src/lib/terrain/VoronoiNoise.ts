/**
 * Voronoi Noise for Grass Clumping
 *
 * Implements Worley/Voronoi noise for natural grass cluster distribution.
 * Based on Ghost of Tsushima GDC talk - grass clumps form around cell centers,
 * creating organic patches rather than uniform distribution.
 *
 * Features:
 * - F1 (distance to nearest point) for clumping
 * - F2-F1 (cellular pattern) for edge detection
 * - Jittered cell points for organic look
 * - Deterministic seeding for consistent chunks
 */

/**
 * Hash function for deterministic pseudo-random values
 * Returns value in range [0, 1)
 */
function hash2D(x: number, y: number, seed: number = 0): number {
  const n = Math.sin(x * 127.1 + y * 311.7 + seed * 758.5453) * 43758.5453;
  return n - Math.floor(n);
}

/**
 * Hash function returning 2D vector for cell point offset
 */
function hash2DVector(
  cellX: number,
  cellY: number,
  seed: number = 0
): { x: number; y: number } {
  return {
    x: hash2D(cellX, cellY, seed),
    y: hash2D(cellX + 127.1, cellY + 269.5, seed),
  };
}

export interface VoronoiResult {
  /** Distance to nearest feature point (F1) - use for clumping */
  f1: number;
  /** Distance to second nearest point (F2) */
  f2: number;
  /** F2 - F1: useful for edge/border detection */
  edge: number;
  /** Position of the nearest feature point */
  nearestPoint: { x: number; y: number };
  /** Cell coordinates of nearest point */
  nearestCell: { x: number; y: number };
}

/**
 * Voronoi noise sampling
 *
 * @param x World X coordinate
 * @param y World Y/Z coordinate (treated as 2D)
 * @param cellSize Size of each Voronoi cell (larger = bigger clumps)
 * @param jitter How much feature points move within cells (0-1, 0.8 recommended)
 * @param seed Random seed for deterministic results
 * @returns VoronoiResult with distances and nearest point info
 */
export function voronoiNoise(
  x: number,
  y: number,
  cellSize: number = 8.0,
  jitter: number = 0.8,
  seed: number = 12345
): VoronoiResult {
  // Convert to cell space
  const cellX = x / cellSize;
  const cellY = y / cellSize;

  // Get integer cell coordinates
  const cellIX = Math.floor(cellX);
  const cellIY = Math.floor(cellY);

  // Track nearest and second nearest distances
  let f1 = Infinity;
  let f2 = Infinity;
  let nearestPoint = { x: 0, y: 0 };
  let nearestCell = { x: 0, y: 0 };

  // Check 3x3 neighborhood of cells
  for (let offsetY = -1; offsetY <= 1; offsetY++) {
    for (let offsetX = -1; offsetX <= 1; offsetX++) {
      const neighborCellX = cellIX + offsetX;
      const neighborCellY = cellIY + offsetY;

      // Get feature point in this cell (jittered from center)
      const jitterOffset = hash2DVector(neighborCellX, neighborCellY, seed);

      // Feature point position in cell space
      const featureX = neighborCellX + 0.5 + (jitterOffset.x - 0.5) * jitter;
      const featureY = neighborCellY + 0.5 + (jitterOffset.y - 0.5) * jitter;

      // Distance from sample point to feature point
      const dx = cellX - featureX;
      const dy = cellY - featureY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Update nearest and second nearest
      if (dist < f1) {
        f2 = f1;
        f1 = dist;
        nearestPoint = {
          x: featureX * cellSize,
          y: featureY * cellSize,
        };
        nearestCell = {
          x: neighborCellX,
          y: neighborCellY,
        };
      } else if (dist < f2) {
        f2 = dist;
      }
    }
  }

  return {
    f1,
    f2,
    edge: f2 - f1,
    nearestPoint,
    nearestCell,
  };
}

/**
 * Get grass density multiplier based on Voronoi clumping
 *
 * @param x World X coordinate
 * @param z World Z coordinate
 * @param config Clumping configuration
 * @returns Density multiplier (0-1) where 1 = full density, 0 = no grass
 */
export function getVoronoiGrassDensity(
  x: number,
  z: number,
  config: {
    cellSize?: number;      // Size of clumps (default 6m)
    jitter?: number;        // Feature point jitter (default 0.7)
    falloff?: number;       // How quickly density falls off from center (default 2.0)
    minDensity?: number;    // Minimum density at cell edges (default 0.1)
    seed?: number;          // Random seed
  } = {}
): number {
  const {
    cellSize = 6.0,       // 6 meter clumps - creates nice patches
    jitter = 0.7,         // Organic point distribution
    falloff = 2.0,        // Exponential falloff
    minDensity = 0.1,     // Some grass even at edges
    seed = 42,
  } = config;

  const result = voronoiNoise(x, z, cellSize, jitter, seed);

  // F1 is distance to nearest feature point (in cell units)
  // Max F1 is roughly 0.7-0.8 for jittered cells
  // Normalize to 0-1 range where 0 = at center, 1 = at edge
  const normalizedDist = Math.min(result.f1 / 0.7, 1.0);

  // Apply falloff curve - higher falloff = tighter clumps
  // exponential falloff: density = e^(-distance * falloff)
  const density = Math.exp(-normalizedDist * falloff);

  // Remap to minDensity..1 range
  return minDensity + density * (1.0 - minDensity);
}

/**
 * Multi-scale Voronoi clumping
 * Combines multiple scales for varied cluster sizes
 *
 * @param x World X coordinate
 * @param z World Z coordinate
 * @returns Density multiplier (0-1)
 */
export function getMultiScaleVoronoiDensity(
  x: number,
  z: number,
  config: {
    largeCellSize?: number;   // Large cluster size (default 12m)
    smallCellSize?: number;   // Small cluster size (default 4m)
    largeWeight?: number;     // Weight of large clusters (default 0.6)
    smallWeight?: number;     // Weight of small clusters (default 0.4)
    seed?: number;
  } = {}
): number {
  const {
    largeCellSize = 12.0,
    smallCellSize = 4.0,
    largeWeight = 0.6,
    smallWeight = 0.4,
    seed = 42,
  } = config;

  // Large-scale clumping (big meadow patches)
  const largeDensity = getVoronoiGrassDensity(x, z, {
    cellSize: largeCellSize,
    falloff: 1.5,
    minDensity: 0.2,
    seed,
  });

  // Small-scale clumping (individual grass clumps within patches)
  const smallDensity = getVoronoiGrassDensity(x, z, {
    cellSize: smallCellSize,
    falloff: 2.5,
    minDensity: 0.3,
    seed: seed + 1000,
  });

  // Combine scales (multiply for natural falloff)
  return largeDensity * largeWeight + smallDensity * smallWeight;
}

export default {
  voronoiNoise,
  getVoronoiGrassDensity,
  getMultiScaleVoronoiDensity,
};
