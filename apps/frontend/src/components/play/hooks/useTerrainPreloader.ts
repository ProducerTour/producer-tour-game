/**
 * useTerrainPreloader.ts
 *
 * Preloads exact terrain geometry for physics collisions.
 * Uses the same TerrainGenerator.generateChunkVertices/Indices as the visual mesh
 * to ensure physics matches visual terrain exactly.
 *
 * This enables a loading screen with real progress tracking.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  TerrainGenerator,
  HydrologySimulator,
  NOISE_CONFIG,
  CHUNK_SIZE,
  CHUNKS_PER_AXIS,
  LODLevel,
  LOD_RESOLUTIONS,
} from '../../../lib/terrain';

/**
 * Preloaded terrain data for TrimeshCollider
 */
export interface PreloadedTerrain {
  /** Combined vertex positions (x,y,z) from all chunks */
  vertices: Float32Array;
  /** Combined triangle indices with proper offsets */
  indices: Uint32Array;
  /** Total number of vertices */
  vertexCount: number;
  /** Total number of triangles */
  triangleCount: number;
}

/**
 * Loading stage for UI feedback
 */
export type LoadingStage =
  | 'initializing'
  | 'generating'
  | 'combining'
  | 'ready';

/**
 * Result from the preloader hook
 */
export interface TerrainPreloaderResult {
  /** Progress 0-100 */
  progress: number;
  /** Current loading stage */
  stage: LoadingStage;
  /** Human-readable status message */
  message: string;
  /** Whether terrain is fully loaded */
  isReady: boolean;
  /** Preloaded terrain data (null until ready) */
  terrain: PreloadedTerrain | null;
}

interface UseTerrainPreloaderProps {
  /** Terrain seed */
  seed?: number;
  /** Chunk radius (number of chunks from center) */
  chunkRadius?: number;
  /** Whether to start loading immediately */
  autoStart?: boolean;
}

/**
 * Hook to preload exact terrain geometry for physics
 *
 * Generates terrain in chunks with progress tracking, then combines
 * into a single mesh for TrimeshCollider.
 */
export function useTerrainPreloader({
  seed = NOISE_CONFIG.seed,
  chunkRadius = 4,
  autoStart = true,
}: UseTerrainPreloaderProps = {}): TerrainPreloaderResult {
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState<LoadingStage>('initializing');
  const [message, setMessage] = useState('Initializing...');
  const [terrain, setTerrain] = useState<PreloadedTerrain | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Track if we've started loading
  const hasStarted = useRef(false);

  // Calculate total chunks
  const chunksPerAxis = chunkRadius * 2 + 1;
  const totalChunks = chunksPerAxis * chunksPerAxis;

  // Resolution for physics (use LOD0 for exact match)
  const resolution = LOD_RESOLUTIONS[LODLevel.LOD0]; // 33
  const verticesPerChunk = resolution * resolution; // 1089
  const indicesPerChunk = (resolution - 1) * (resolution - 1) * 6; // 6144

  /**
   * Generate all terrain chunks and combine into single mesh
   */
  const generateTerrain = useCallback(async () => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    setStage('initializing');
    setMessage('Initializing terrain generator...');
    setProgress(0);

    // Create terrain generator with same params as visual terrain
    const terrainGen = new TerrainGenerator(seed, chunkRadius);

    // Initialize hydrology (rivers) - same as ProceduralTerrain
    const worldRadius = chunkRadius * CHUNK_SIZE;
    const hydro = new HydrologySimulator();
    hydro.initialize(
      (x, z) => terrainGen.getRawHeight(x, z),
      0, // centerX
      0, // centerZ
      worldRadius
    );
    terrainGen.setHydrology(hydro);

    // Allocate combined arrays
    const totalVertices = totalChunks * verticesPerChunk * 3; // x,y,z per vertex
    const totalIndices = totalChunks * indicesPerChunk;

    const combinedVertices = new Float32Array(totalVertices);
    const combinedIndices = new Uint32Array(totalIndices);

    setStage('generating');

    let chunkCount = 0;
    let vertexOffset = 0;
    let indexWritePos = 0;

    // Calculate center chunk - MUST match StaticTerrain logic exactly!
    // StaticTerrain uses: centerChunk = floor(CHUNKS_PER_AXIS / 2)
    const centerChunk = Math.floor(CHUNKS_PER_AXIS / 2);

    // Generate each chunk with progress updates
    // Use setTimeout to yield to UI thread for smooth progress updates
    const generateChunk = (dx: number, dz: number): Promise<void> => {
      return new Promise((resolve) => {
        setTimeout(() => {
          // Calculate actual chunk coordinates - same as StaticTerrain
          const chunkX = centerChunk + dx;
          const chunkZ = centerChunk + dz;

          // Generate chunk vertices using exact same method as visual terrain
          const chunkVertices = terrainGen.generateChunkVertices(chunkX, chunkZ, LODLevel.LOD0);

          // Copy vertices to combined array
          combinedVertices.set(chunkVertices, vertexOffset * 3);

          // Get indices (same for all chunks of same LOD)
          const chunkIndices = terrainGen.generateChunkIndices(LODLevel.LOD0);

          // Copy indices with offset applied
          for (let i = 0; i < chunkIndices.length; i++) {
            combinedIndices[indexWritePos++] = chunkIndices[i] + vertexOffset;
          }

          // Move to next chunk
          vertexOffset += verticesPerChunk;
          chunkCount++;

          // Update progress
          const percent = Math.round((chunkCount / totalChunks) * 90); // 0-90% for chunk generation
          setProgress(percent);
          setMessage(`Generating terrain: ${chunkCount}/${totalChunks} chunks`);

          resolve();
        }, 0);
      });
    };

    // Generate all chunks - use same iteration as StaticTerrain
    // Loop from -radius to +radius (inclusive) for both axes
    for (let dz = -chunkRadius; dz <= chunkRadius; dz++) {
      for (let dx = -chunkRadius; dx <= chunkRadius; dx++) {
        await generateChunk(dx, dz);
      }
    }

    // Final combining step
    setStage('combining');
    setMessage('Building physics mesh...');
    setProgress(95);

    // Small delay for UI update
    await new Promise(resolve => setTimeout(resolve, 50));

    // Create final terrain data
    const terrainData: PreloadedTerrain = {
      vertices: combinedVertices,
      indices: combinedIndices,
      vertexCount: totalChunks * verticesPerChunk,
      triangleCount: totalChunks * indicesPerChunk / 3,
    };

    console.log(`🏔️ Terrain preloaded: ${terrainData.vertexCount.toLocaleString()} vertices, ${terrainData.triangleCount.toLocaleString()} triangles`);

    setTerrain(terrainData);
    setProgress(100);
    setStage('ready');
    setMessage('Ready!');
    setIsReady(true);

  }, [seed, chunkRadius, totalChunks, verticesPerChunk, indicesPerChunk, chunksPerAxis]);

  // Start loading when component mounts
  useEffect(() => {
    if (autoStart && !hasStarted.current) {
      generateTerrain();
    }
  }, [autoStart, generateTerrain]);

  return {
    progress,
    stage,
    message,
    isReady,
    terrain,
  };
}

export default useTerrainPreloader;
