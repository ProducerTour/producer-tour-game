/**
 * HydrologySimulator.ts
 * Flow-based river generation using D8 algorithm
 *
 * Flow-based rivers (correct approach):
 * 1. Sample heights on a grid
 * 2. For each cell, compute steepest downhill direction (D8)
 * 3. Accumulate flow downstream
 * 4. High flow = river
 *
 * This creates rivers that naturally flow downhill and merge.
 */

import { HYDROLOGY_CONFIG, WATER_LEVEL } from './TerrainConfig';

// =============================================================================
// TYPES
// =============================================================================

export interface FlowData {
  /** Flow accumulation value */
  flow: number;
  /** Direction to downstream cell (0-7 for D8, -1 for sink) */
  direction: number;
  /** Is this cell a river */
  isRiver: boolean;
  /** Is this cell a lake */
  isLake: boolean;
  /** River depth at this cell */
  depth: number;
  /** Distance to nearest river cell */
  distanceToRiver: number;
}

export interface HydrologyGrid {
  /** Grid width in cells */
  width: number;
  /** Grid height in cells */
  height: number;
  /** World position of grid origin (bottom-left) */
  originX: number;
  /** World position of grid origin */
  originZ: number;
  /** Cell size in world units */
  cellSize: number;
  /** Height values for each cell */
  heights: Float32Array;
  /** Flow direction for each cell (D8: 0-7, -1 for sink) */
  flowDirection: Int8Array;
  /** Flow accumulation for each cell */
  flowAccumulation: Float32Array;
  /** River flags */
  isRiver: Uint8Array;
  /** Lake flags */
  isLake: Uint8Array;
  /** Distance to nearest river */
  riverDistance: Float32Array;
}

// D8 direction offsets: [dx, dz] for directions 0-7
// 0=N, 1=NE, 2=E, 3=SE, 4=S, 5=SW, 6=W, 7=NW
const D8_OFFSETS = [
  [0, -1],  // 0: N
  [1, -1],  // 1: NE
  [1, 0],   // 2: E
  [1, 1],   // 3: SE
  [0, 1],   // 4: S
  [-1, 1],  // 5: SW
  [-1, 0],  // 6: W
  [-1, -1], // 7: NW
];

// Distance for each direction (1 for cardinal, sqrt(2) for diagonal)
const D8_DISTANCES = [
  1, Math.SQRT2, 1, Math.SQRT2, 1, Math.SQRT2, 1, Math.SQRT2,
];

// =============================================================================
// HYDROLOGY SIMULATOR CLASS
// =============================================================================

export class HydrologySimulator {
  private grid: HydrologyGrid | null = null;
  private heightFunction: ((x: number, z: number) => number) | null = null;

  /**
   * Initialize the hydrology simulator with a height sampling function
   */
  initialize(
    heightFn: (x: number, z: number) => number,
    centerX: number,
    centerZ: number,
    radius: number
  ): void {
    this.heightFunction = heightFn;
    const config = HYDROLOGY_CONFIG;

    // Calculate grid dimensions
    const worldSize = radius * 2;
    const width = Math.ceil(worldSize / config.resolution);
    const height = width;
    const cellSize = config.resolution;

    // Create grid
    this.grid = {
      width,
      height,
      originX: centerX - radius,
      originZ: centerZ - radius,
      cellSize,
      heights: new Float32Array(width * height),
      flowDirection: new Int8Array(width * height),
      flowAccumulation: new Float32Array(width * height),
      isRiver: new Uint8Array(width * height),
      isLake: new Uint8Array(width * height),
      riverDistance: new Float32Array(width * height),
    };

    // Sample heights
    this.sampleHeights();

    // Compute flow
    this.computeFlowDirections();
    this.fillSinks();
    this.accumulateFlow();

    // Identify features
    this.identifyRivers();
    this.computeRiverDistances();
  }

  /**
   * Sample heights from the terrain
   */
  private sampleHeights(): void {
    if (!this.grid || !this.heightFunction) return;

    const { width, height, originX, originZ, cellSize, heights } = this.grid;

    for (let z = 0; z < height; z++) {
      for (let x = 0; x < width; x++) {
        const worldX = originX + x * cellSize;
        const worldZ = originZ + z * cellSize;
        heights[z * width + x] = this.heightFunction(worldX, worldZ);
      }
    }
  }

  /**
   * Compute D8 flow directions (steepest descent)
   */
  private computeFlowDirections(): void {
    if (!this.grid) return;

    const { width, height, heights, flowDirection } = this.grid;

    for (let z = 0; z < height; z++) {
      for (let x = 0; x < width; x++) {
        const idx = z * width + x;
        const currentHeight = heights[idx];

        let steepestDir = -1; // -1 = sink (no downhill neighbor)
        let steepestSlope = 0;

        // Check all 8 neighbors
        for (let d = 0; d < 8; d++) {
          const nx = x + D8_OFFSETS[d][0];
          const nz = z + D8_OFFSETS[d][1];

          // Boundary check
          if (nx < 0 || nx >= width || nz < 0 || nz >= height) continue;

          const neighborHeight = heights[nz * width + nx];
          const slope = (currentHeight - neighborHeight) / D8_DISTANCES[d];

          if (slope > steepestSlope) {
            steepestSlope = slope;
            steepestDir = d;
          }
        }

        flowDirection[idx] = steepestDir;
      }
    }
  }

  /**
   * Fill sinks using priority-flood algorithm
   * Sinks are local minima that would trap water
   */
  private fillSinks(): void {
    if (!this.grid) return;

    const { width, height, heights, flowDirection } = this.grid;

    // Simple sink filling: raise sink cells to spill level
    let changed = true;
    let iterations = 0;
    const maxIterations = 100;

    while (changed && iterations < maxIterations) {
      changed = false;
      iterations++;

      for (let z = 1; z < height - 1; z++) {
        for (let x = 1; x < width - 1; x++) {
          const idx = z * width + x;

          // Skip if already has downhill neighbor
          if (flowDirection[idx] !== -1) continue;

          // Find lowest neighbor
          let lowestNeighborHeight = Infinity;
          let lowestDir = -1;

          for (let d = 0; d < 8; d++) {
            const nx = x + D8_OFFSETS[d][0];
            const nz = z + D8_OFFSETS[d][1];
            const neighborIdx = nz * width + nx;
            const neighborHeight = heights[neighborIdx];

            if (neighborHeight < lowestNeighborHeight) {
              lowestNeighborHeight = neighborHeight;
              lowestDir = d;
            }
          }

          // If lowest neighbor is lower than us, we have a sink
          // Raise our height slightly above the neighbor to create flow
          if (lowestNeighborHeight < heights[idx]) {
            // This is already handled - we found a downhill direction
            flowDirection[idx] = lowestDir;
            changed = true;
          } else if (lowestNeighborHeight < Infinity) {
            // Raise to just above lowest neighbor
            heights[idx] = lowestNeighborHeight + 0.001;
            flowDirection[idx] = lowestDir;
            changed = true;
          }
        }
      }

      // Recompute flow directions after height changes
      if (changed) {
        this.computeFlowDirections();
      }
    }
  }

  /**
   * Accumulate flow downstream using topological sort
   */
  private accumulateFlow(): void {
    if (!this.grid) return;

    const { width, height, flowDirection, flowAccumulation } = this.grid;
    const size = width * height;

    // Initialize all cells with flow = 1 (their own catchment)
    flowAccumulation.fill(1);

    // Count incoming edges for each cell (for topological sort)
    const inDegree = new Uint16Array(size);
    for (let i = 0; i < size; i++) {
      const dir = flowDirection[i];
      if (dir >= 0) {
        const x = i % width;
        const z = Math.floor(i / width);
        const nx = x + D8_OFFSETS[dir][0];
        const nz = z + D8_OFFSETS[dir][1];

        if (nx >= 0 && nx < width && nz >= 0 && nz < height) {
          inDegree[nz * width + nx]++;
        }
      }
    }

    // Start with cells that have no incoming edges (headwaters)
    const queue: number[] = [];
    for (let i = 0; i < size; i++) {
      if (inDegree[i] === 0) {
        queue.push(i);
      }
    }

    // Process in topological order
    while (queue.length > 0) {
      const idx = queue.shift()!;
      const dir = flowDirection[idx];

      if (dir < 0) continue; // Sink, no downstream

      const x = idx % width;
      const z = Math.floor(idx / width);
      const nx = x + D8_OFFSETS[dir][0];
      const nz = z + D8_OFFSETS[dir][1];

      if (nx < 0 || nx >= width || nz < 0 || nz >= height) continue;

      const downstreamIdx = nz * width + nx;

      // Add our flow to downstream
      flowAccumulation[downstreamIdx] += flowAccumulation[idx];

      // Decrement in-degree and add to queue if ready
      inDegree[downstreamIdx]--;
      if (inDegree[downstreamIdx] === 0) {
        queue.push(downstreamIdx);
      }
    }
  }

  /**
   * Identify river cells based on flow threshold
   */
  private identifyRivers(): void {
    if (!this.grid) return;

    const { width, height, flowAccumulation, isRiver, heights } = this.grid;
    const config = HYDROLOGY_CONFIG;

    for (let i = 0; i < width * height; i++) {
      // Cell is a river if flow exceeds threshold and above water level
      if (flowAccumulation[i] >= config.riverThreshold && heights[i] > WATER_LEVEL - 5) {
        isRiver[i] = 1;
      }
    }

    // Widen rivers based on flow
    const riverCopy = new Uint8Array(isRiver);
    for (let z = 0; z < height; z++) {
      for (let x = 0; x < width; x++) {
        const idx = z * width + x;
        if (riverCopy[idx] !== 1) continue;

        const flow = flowAccumulation[idx];
        // Calculate river width based on flow
        const riverWidth = Math.min(config.riverWidth, Math.floor(Math.log2(flow / config.riverThreshold) + 1));

        // Mark neighboring cells as river
        for (let dz = -riverWidth; dz <= riverWidth; dz++) {
          for (let dx = -riverWidth; dx <= riverWidth; dx++) {
            const dist = Math.sqrt(dx * dx + dz * dz);
            if (dist > riverWidth) continue;

            const nx = x + dx;
            const nz = z + dz;
            if (nx >= 0 && nx < width && nz >= 0 && nz < height) {
              isRiver[nz * width + nx] = 1;
            }
          }
        }
      }
    }
  }

  /**
   * Compute distance to nearest river for each cell
   */
  private computeRiverDistances(): void {
    if (!this.grid) return;

    const { width, height, isRiver, riverDistance, cellSize } = this.grid;
    const size = width * height;

    // Initialize distances
    riverDistance.fill(Infinity);

    // Start BFS from river cells
    const queue: number[] = [];
    for (let i = 0; i < size; i++) {
      if (isRiver[i] === 1) {
        riverDistance[i] = 0;
        queue.push(i);
      }
    }

    // BFS to compute distances
    while (queue.length > 0) {
      const idx = queue.shift()!;
      const x = idx % width;
      const z = Math.floor(idx / width);
      const currentDist = riverDistance[idx];

      for (let d = 0; d < 8; d++) {
        const nx = x + D8_OFFSETS[d][0];
        const nz = z + D8_OFFSETS[d][1];

        if (nx < 0 || nx >= width || nz < 0 || nz >= height) continue;

        const neighborIdx = nz * width + nx;
        const newDist = currentDist + D8_DISTANCES[d] * cellSize;

        if (newDist < riverDistance[neighborIdx]) {
          riverDistance[neighborIdx] = newDist;
          queue.push(neighborIdx);
        }
      }
    }
  }

  /**
   * Get flow data at a world position
   */
  getFlowAt(worldX: number, worldZ: number): FlowData | null {
    if (!this.grid) return null;

    const { width, height, originX, originZ, cellSize } = this.grid;
    const { flowAccumulation, flowDirection, isRiver, isLake, riverDistance } = this.grid;

    // Convert world to grid coordinates
    const gridX = Math.floor((worldX - originX) / cellSize);
    const gridZ = Math.floor((worldZ - originZ) / cellSize);

    // Boundary check
    if (gridX < 0 || gridX >= width || gridZ < 0 || gridZ >= height) {
      return null;
    }

    const idx = gridZ * width + gridX;

    // Calculate river depth based on flow
    const flow = flowAccumulation[idx];
    const isRiverCell = isRiver[idx] === 1;
    let depth = 0;
    if (isRiverCell) {
      // Depth increases with flow, up to max
      depth = Math.min(
        HYDROLOGY_CONFIG.riverMaxDepth,
        Math.log2(flow / HYDROLOGY_CONFIG.riverThreshold + 1) * 2
      );
    }

    return {
      flow,
      direction: flowDirection[idx],
      isRiver: isRiverCell,
      isLake: isLake[idx] === 1,
      depth,
      distanceToRiver: riverDistance[idx],
    };
  }

  /**
   * Check if hydrology has been computed
   */
  isInitialized(): boolean {
    return this.grid !== null;
  }

  /**
   * Get the grid for debugging/visualization
   */
  getGrid(): HydrologyGrid | null {
    return this.grid;
  }

  /**
   * Clear the hydrology data
   */
  clear(): void {
    this.grid = null;
  }
}

// Export singleton
export const hydrologySimulator = new HydrologySimulator();
