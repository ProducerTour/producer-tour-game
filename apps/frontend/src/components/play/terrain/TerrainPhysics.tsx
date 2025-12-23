/**
 * TerrainPhysics.tsx
 * Creates a Rapier TrimeshCollider from exact terrain geometry
 *
 * Uses the same vertices and indices as the visual terrain mesh,
 * ensuring physics collisions match what the player sees exactly.
 *
 * The geometry is preloaded during the loading screen to avoid
 * any delay when the game starts.
 *
 * Reference: https://rapier.rs/docs/user_guides/javascript/colliders/
 * Reference: https://github.com/pmndrs/react-three-rapier
 */

import React, { useMemo } from 'react';
import { RigidBody, TrimeshCollider } from '@react-three/rapier';
import type { PreloadedTerrain } from '../hooks/useTerrainPreloader';
import {
  TerrainGenerator,
  HydrologySimulator,
  NOISE_CONFIG,
  CHUNK_SIZE,
  CHUNKS_PER_AXIS,
  LODLevel,
  LOD_RESOLUTIONS,
} from '../../../lib/terrain';

export interface TerrainPhysicsProps {
  /** World seed (used for fallback generation if no preload) */
  seed?: number;

  /** Chunk radius (for fallback generation if no preload) */
  chunkRadius?: number;

  /** Preloaded terrain geometry from useTerrainPreloader */
  preloadedTerrain?: PreloadedTerrain | null;
}

/**
 * TerrainPhysics - Creates physics collision from exact terrain geometry
 *
 * Uses Rapier's TrimeshCollider with the exact same vertices and indices
 * as the visual terrain mesh. This ensures perfect collision matching.
 */
export const TerrainPhysics = React.memo(function TerrainPhysics({
  seed = NOISE_CONFIG.seed,
  chunkRadius = 4,
  preloadedTerrain,
}: TerrainPhysicsProps) {

  // Use preloaded terrain if available, otherwise generate on demand (fallback)
  const { vertices, indices } = useMemo(() => {
    // If we have preloaded terrain, use it directly
    if (preloadedTerrain) {
      const v = preloadedTerrain.vertices;
      const numVerts = v.length / 3;

      // Calculate terrain bounds for debugging
      let minX = Infinity, maxX = -Infinity;
      let minY = Infinity, maxY = -Infinity;
      let minZ = Infinity, maxZ = -Infinity;
      for (let i = 0; i < v.length; i += 3) {
        if (v[i] < minX) minX = v[i];
        if (v[i] > maxX) maxX = v[i];
        if (v[i+1] < minY) minY = v[i+1];
        if (v[i+1] > maxY) maxY = v[i+1];
        if (v[i+2] < minZ) minZ = v[i+2];
        if (v[i+2] > maxZ) maxZ = v[i+2];
      }

      console.log(`🏔️ TerrainPhysics: Using preloaded mesh`);
      console.log(`   ${numVerts.toLocaleString()} vertices, ${preloadedTerrain.triangleCount.toLocaleString()} triangles`);
      console.log(`   X range: ${minX.toFixed(1)} to ${maxX.toFixed(1)}`);
      console.log(`   Y range: ${minY.toFixed(1)} to ${maxY.toFixed(1)}`);
      console.log(`   Z range: ${minZ.toFixed(1)} to ${maxZ.toFixed(1)}`);
      console.log(`   First vertex: (${v[0]?.toFixed(2)}, ${v[1]?.toFixed(2)}, ${v[2]?.toFixed(2)})`);
      console.log(`   First 3 indices: ${preloadedTerrain.indices[0]}, ${preloadedTerrain.indices[1]}, ${preloadedTerrain.indices[2]}`);

      return {
        vertices: preloadedTerrain.vertices,
        indices: preloadedTerrain.indices,
      };
    }

    // Fallback: generate terrain geometry on demand
    // This shouldn't happen normally since we preload, but provides safety
    console.warn('⚠️ TerrainPhysics: No preloaded terrain, generating on demand (may cause stutter)');

    const terrainGen = new TerrainGenerator(seed, chunkRadius);

    // Initialize hydrology (rivers) - same as visual terrain
    const worldRadius = chunkRadius * CHUNK_SIZE;
    const hydro = new HydrologySimulator();
    hydro.initialize(
      (x, z) => terrainGen.getRawHeight(x, z),
      0,
      0,
      worldRadius
    );
    terrainGen.setHydrology(hydro);

    // Generate all chunks - MUST match StaticTerrain logic exactly!
    const chunksPerAxis = chunkRadius * 2 + 1;
    const totalChunks = chunksPerAxis * chunksPerAxis;
    const resolution = LOD_RESOLUTIONS[LODLevel.LOD0];
    const verticesPerChunk = resolution * resolution;
    const indicesPerChunk = (resolution - 1) * (resolution - 1) * 6;

    const combinedVertices = new Float32Array(totalChunks * verticesPerChunk * 3);
    const combinedIndices = new Uint32Array(totalChunks * indicesPerChunk);

    // Calculate center chunk - same as StaticTerrain
    const centerChunk = Math.floor(CHUNKS_PER_AXIS / 2);

    let vertexOffset = 0;
    let indexWritePos = 0;

    // Loop from -radius to +radius - same as StaticTerrain
    for (let dz = -chunkRadius; dz <= chunkRadius; dz++) {
      for (let dx = -chunkRadius; dx <= chunkRadius; dx++) {
        const chunkX = centerChunk + dx;
        const chunkZ = centerChunk + dz;

        const chunkVertices = terrainGen.generateChunkVertices(chunkX, chunkZ, LODLevel.LOD0);
        combinedVertices.set(chunkVertices, vertexOffset * 3);

        const chunkIndices = terrainGen.generateChunkIndices(LODLevel.LOD0);
        for (let i = 0; i < chunkIndices.length; i++) {
          combinedIndices[indexWritePos++] = chunkIndices[i] + vertexOffset;
        }

        vertexOffset += verticesPerChunk;
      }
    }

    return {
      vertices: combinedVertices,
      indices: combinedIndices,
    };
  }, [preloadedTerrain, seed, chunkRadius]);

  // Don't render if we have no geometry
  if (!vertices || !indices || vertices.length === 0) {
    console.error('TerrainPhysics: No terrain geometry available');
    return null;
  }

  return (
    <RigidBody type="fixed" colliders={false}>
      <TrimeshCollider args={[vertices, indices]} />
    </RigidBody>
  );
});

export default TerrainPhysics;
