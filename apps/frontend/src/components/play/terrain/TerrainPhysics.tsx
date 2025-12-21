/**
 * TerrainPhysics.tsx
 * Creates a Rapier HeightfieldCollider from procedural terrain
 * This is the proper way to do terrain collision - let physics engine handle it
 *
 * IMPORTANT: Must use TerrainGenerator (not HeightmapGenerator) to match visual terrain!
 *
 * Reference: https://rapier.rs/docs/user_guides/javascript/colliders/
 * Reference: https://github.com/pmndrs/react-three-rapier
 */

import { useMemo } from 'react';
import { RigidBody, HeightfieldCollider } from '@react-three/rapier';
import {
  TerrainGenerator,
  HydrologySimulator,
  NOISE_CONFIG,
  CHUNK_SIZE,
} from '../../../lib/terrain';

export interface TerrainPhysicsProps {
  /** World seed */
  seed?: number;

  /** Chunk radius (for terrain bounds calculation) */
  chunkRadius?: number;

  /** Number of height samples in X direction */
  width?: number;

  /** Number of height samples in Z direction */
  depth?: number;

  /** World scale (how big the terrain is in meters) */
  scale?: { x: number; y: number; z: number };

  /** Position offset */
  position?: [number, number, number];
}

/**
 * TerrainPhysics - Creates a physics heightfield for terrain collision
 *
 * Uses Rapier's HeightfieldCollider which is optimized for terrain.
 * Much more efficient and stable than manual collision detection.
 */
export function TerrainPhysics({
  seed = NOISE_CONFIG.seed,
  chunkRadius,
  width = 64,
  depth = 64,
  scale = { x: 512, y: 1, z: 512 },
  position = [0, 0, 0],
}: TerrainPhysicsProps) {
  // Generate height data for the heightfield using NEW TerrainGenerator
  // MUST match what ProceduralTerrain uses for visual terrain!
  const heights = useMemo(() => {
    // Create TerrainGenerator with same parameters as visual terrain
    const terrainGen = new TerrainGenerator(seed, chunkRadius);

    // Initialize hydrology (rivers) - same as ProceduralTerrain
    const worldRadius = (chunkRadius ?? 5) * CHUNK_SIZE;
    const hydro = new HydrologySimulator();
    hydro.initialize(
      (x, z) => terrainGen.getRawHeight(x, z),
      0, // centerX
      0, // centerZ
      worldRadius
    );
    terrainGen.setHydrology(hydro);

    const data: number[] = [];

    // HeightfieldCollider expects heights in row-major order
    // rows = X axis subdivisions, cols = Z axis subdivisions
    // The collider spans from -scale/2 to +scale/2 relative to RigidBody position
    const halfWidth = scale.x / 2;
    const halfDepth = scale.z / 2;
    const stepX = scale.x / (width - 1);
    const stepZ = scale.z / (depth - 1);

    // Rapier expects row-major order: X is rows (outer), Z is columns (inner)
    for (let x = 0; x < width; x++) {
      for (let z = 0; z < depth; z++) {
        // Convert grid position to world position
        // RigidBody handles the position offset, so we sample relative to center
        const worldX = -halfWidth + x * stepX;
        const worldZ = -halfDepth + z * stepZ;

        // Sample terrain height using NEW TerrainGenerator (matches visual terrain)
        const height = terrainGen.getHeight(worldX + position[0], worldZ + position[2]);
        data.push(height);
      }
    }

    // Debug: Log alignment info
    console.log(`🔧 TerrainPhysics: Generated ${data.length} height samples for collision mesh`);
    console.log(`   Physics grid: ${width}×${depth} samples`);
    console.log(`   Scale: (${scale.x}, ${scale.y}, ${scale.z})`);
    console.log(`   Position offset: (${position[0]}, ${position[1]}, ${position[2]})`);
    console.log(`   Collider spans: X[${-scale.x/2 + position[0]} to ${scale.x/2 + position[0]}]`);
    console.log(`   Collider spans: Z[${-scale.z/2 + position[2]} to ${scale.z/2 + position[2]}]`);
    console.log(`   Height samples cover: X[${-halfWidth + position[0]} to ${halfWidth + position[0]}]`);
    console.log(`   Height samples cover: Z[${-halfDepth + position[2]} to ${halfDepth + position[2]}]`);

    // Sample a few heights for debugging
    const centerIdx = Math.floor(width / 2) * depth + Math.floor(depth / 2);
    console.log(`   Height at center: ${data[centerIdx]?.toFixed(2)}m`);
    console.log(`   Height at (0,0): ${data[0]?.toFixed(2)}m`);
    console.log(`   Height at (max,max): ${data[data.length - 1]?.toFixed(2)}m`);

    return data;
  }, [seed, chunkRadius, width, depth, scale.x, scale.z, position]);

  return (
    <RigidBody type="fixed" colliders={false} position={position}>
      <HeightfieldCollider
        args={[
          width - 1,  // Number of rows (X subdivisions)
          depth - 1,  // Number of columns (Z subdivisions)
          heights,    // Height values array
          scale,      // Scale in each dimension
        ]}
      />
    </RigidBody>
  );
}

export default TerrainPhysics;
