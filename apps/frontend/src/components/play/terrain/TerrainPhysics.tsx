/**
 * TerrainPhysics.tsx
 * Creates a Rapier HeightfieldCollider from procedural terrain
 * This is the proper way to do terrain collision - let physics engine handle it
 *
 * IMPORTANT: Must use TerrainGenerator (not HeightmapGenerator) to match visual terrain!
 *
 * ANTI-TWITCH: Adds a small height margin (3cm) to all samples so the character
 * capsule "floats" slightly above micro-bumps instead of settling into them.
 *
 * Reference: https://rapier.rs/docs/user_guides/javascript/colliders/
 * Reference: https://github.com/pmndrs/react-three-rapier
 */

// Height margin added to all samples to prevent character micro-bouncing
// The capsule will rest ~3cm above the visual terrain instead of exactly on it
const PHYSICS_HEIGHT_MARGIN = 0.03;

import React, { useMemo } from 'react';
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
export const TerrainPhysics = React.memo(function TerrainPhysics({
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
        // Add small margin so capsule floats above micro-bumps (reduces twitching)
        const height = terrainGen.getHeight(worldX + position[0], worldZ + position[2]);
        data.push(height + PHYSICS_HEIGHT_MARGIN);
      }
    }

    // Debug logging - disabled for performance
    // Uncomment to debug physics alignment issues
    // console.log(`🔧 TerrainPhysics: Generated ${data.length} height samples`);
    // console.log(`   Physics grid: ${width}×${depth}, Scale: (${scale.x}, 1, ${scale.z})`);
    // console.log(`   Position: (${position[0]}, ${position[1]}, ${position[2]})`);
    // const centerIdx = Math.floor(width / 2) * depth + Math.floor(depth / 2);
    // console.log(`   Height at center: ${data[centerIdx]?.toFixed(2)}m`);

    return data;
  // Use individual position values as dependencies to avoid array reference issues
  }, [seed, chunkRadius, width, depth, scale.x, scale.z, position[0], position[1], position[2]]);

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
});

export default TerrainPhysics;
