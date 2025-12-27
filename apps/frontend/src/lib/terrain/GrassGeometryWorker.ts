/**
 * Grass Geometry Worker
 *
 * Offloads grass geometry data generation to a Web Worker to prevent
 * main thread blocking. The worker generates the raw offset arrays,
 * which are then used by ProceduralGrass to create THREE.js geometries.
 *
 * NOTE: This is a simplified worker that generates offset data without
 * terrain sampling (terrain sampling must happen on main thread due to
 * noise generator dependencies). The main optimization is moving the
 * Float16 conversion and array building off the main thread.
 */

// Worker message types
export interface GrassWorkerRequest {
  type: 'generate';
  chunkX: number;
  chunkZ: number;
  chunkCenterX: number;
  chunkCenterZ: number;
  patchSize: number;
  bladeAttempts: number;
  seed: number;
  // Pre-computed terrain data for each grid cell
  terrainData: TerrainSample[];
}

export interface TerrainSample {
  localX: number;
  localZ: number;
  height: number;
  isValid: boolean; // false if filtered by biome/water/slope
}

export interface GrassWorkerResponse {
  type: 'complete';
  chunkX: number;
  chunkZ: number;
  // Flat array of [localX, localZ, height] for each valid blade
  offsets: Float32Array;
  validCount: number;
  avgHeight: number;
}

/**
 * Create the worker code as a blob URL
 * This allows us to bundle the worker with the main code
 */
export function createGrassWorkerBlob(): string {
  const workerCode = `
    // Float16 conversion (matches THREE.DataUtils.toHalfFloat)
    function toHalfFloat(val) {
      const floatView = new Float32Array(1);
      const int32View = new Int32Array(floatView.buffer);
      floatView[0] = val;
      const f = int32View[0];
      const e = (f >> 23) & 0x1ff;
      const m = f & 0x007fffff;
      // Simplified half-float conversion
      if (e < 103) return 0;
      if (e > 142) return ((f >> 16) & 0x8000) | 0x7c00 | (m ? 1 : 0);
      if (e < 113) {
        const shift = 113 - e;
        return ((f >> 16) & 0x8000) | ((0x800000 | m) >> (shift + 1));
      }
      return ((f >> 16) & 0x8000) | ((e - 112) << 10) | (m >> 13);
    }

    self.onmessage = function(e) {
      const { type, chunkX, chunkZ, terrainData, patchSize, bladeAttempts } = e.data;

      if (type !== 'generate') return;

      // Build offsets array from pre-filtered terrain data
      const offsets = [];
      let totalHeight = 0;
      let validCount = 0;

      for (const sample of terrainData) {
        if (!sample.isValid) continue;

        offsets.push(sample.localX);
        offsets.push(sample.localZ);
        offsets.push(sample.height);

        totalHeight += sample.height;
        validCount++;
      }

      // Convert to Float32Array for transfer
      const offsetsArray = new Float32Array(offsets);
      const avgHeight = validCount > 0 ? totalHeight / validCount : 0;

      self.postMessage({
        type: 'complete',
        chunkX,
        chunkZ,
        offsets: offsetsArray,
        validCount,
        avgHeight
      }, [offsetsArray.buffer]); // Transfer ownership of buffer
    };
  `;

  const blob = new Blob([workerCode], { type: 'application/javascript' });
  return URL.createObjectURL(blob);
}

// Worker pool for parallel processing
let workerPool: Worker[] = [];
let workerIndex = 0;
let workerBlobUrl: string | null = null;

/**
 * Initialize the grass geometry worker pool
 * @param poolSize Number of workers to create (default: navigator.hardwareConcurrency or 4)
 */
export function initGrassWorkerPool(poolSize = Math.min(navigator.hardwareConcurrency || 4, 4)): void {
  if (workerPool.length > 0) return; // Already initialized

  try {
    workerBlobUrl = createGrassWorkerBlob();

    for (let i = 0; i < poolSize; i++) {
      const worker = new Worker(workerBlobUrl);
      workerPool.push(worker);
    }

    console.log(`🌾 Grass worker pool initialized with ${poolSize} workers`);
  } catch (error) {
    console.warn('Failed to create grass workers, falling back to main thread:', error);
    workerPool = [];
  }
}

/**
 * Get the next available worker from the pool (round-robin)
 */
export function getNextGrassWorker(): Worker | null {
  if (workerPool.length === 0) return null;

  const worker = workerPool[workerIndex];
  workerIndex = (workerIndex + 1) % workerPool.length;
  return worker;
}

/**
 * Check if grass workers are available
 */
export function hasGrassWorkers(): boolean {
  return workerPool.length > 0;
}

/**
 * Terminate all grass workers and cleanup
 */
export function terminateGrassWorkers(): void {
  for (const worker of workerPool) {
    worker.terminate();
  }
  workerPool = [];
  workerIndex = 0;

  if (workerBlobUrl) {
    URL.revokeObjectURL(workerBlobUrl);
    workerBlobUrl = null;
  }
}
