/**
 * ChunkCliffs.tsx
 *
 * RUST-STYLE CLIFF PLACEMENT
 *
 * Key principles (from Rust/RustEdit):
 * 1. Cliffs spawn on STEEP slopes (where rock texture appears)
 * 2. Cliffs face OUTWARD from the slope (perpendicular to gradient)
 * 3. Cliffs EMBED into terrain to hide seams
 * 4. Natural distribution via Poisson disk sampling
 * 5. Scale varies with slope steepness
 *
 * Uses the new TerrainGenerator for consistent height/slope sampling.
 */

import React, { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import type { GLTF } from 'three-stdlib';
import {
  TerrainGenerator,
  CHUNK_SIZE,
  getChunkOrigin,
  WATER_LEVEL,
} from '../../../lib/terrain';
import { LAYERS } from '../constants/layers';
import { getModelPath } from '../../../config/assetPaths';

const DEBUG_CLIFFS = false;

// Physics only within this radius from player (expensive, so keep small)
const CLIFF_PHYSICS_RADIUS = 30;

// =============================================================================
// TYPES
// =============================================================================

export interface ChunkCliffsProps {
  chunkX: number;
  chunkZ: number;
  seed: number;
  chunkRadius?: number;

  /**
   * Pre-initialized TerrainGenerator with hydrology attached.
   * Pass this from StaticTerrain to ensure river/lake detection works.
   * If not provided, creates a new instance (without hydrology - rivers/lakes won't be detected)
   */
  terrainGen?: TerrainGenerator;

  // Density
  gridDensity?: number;
  minSpacing?: number;
  rockWeightThreshold?: number;
  minElevation?: number;
  mountainMaskThreshold?: number;

  // Scale
  scaleMin?: number;
  scaleMax?: number;
  slopeScaleInfluence?: number;
  xzScaleMin?: number;
  xzScaleMax?: number;
  yScaleMin?: number;
  yScaleMax?: number;

  // Orientation
  slopeAlignment?: number;
  randomTilt?: number;
  randomYaw?: number;

  // Stacking
  verticalStackingEnabled?: boolean;
  verticalSpacing?: number;
  maxStackHeight?: number;

  // Embedding
  embedDepth?: number;

  // Player position for proximity-based physics
  playerPosition?: { x: number; z: number };
}

interface CliffPlacement {
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  scale: THREE.Vector3;
}

type GLTFResult = GLTF & {
  nodes: Record<string, THREE.Mesh | THREE.Object3D>;
  materials: Record<string, THREE.Material>;
  scene: THREE.Group;
};

// =============================================================================
// HELPERS
// =============================================================================

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

/**
 * Calculate rock weight based on slope and height (matches terrain shader)
 * Rock appears on steep slopes
 */
function calculateRockWeight(normalY: number, height: number): number {
  // normalY = 1 (flat), 0 (vertical cliff)
  const slope = 1 - normalY; // 0 (flat) to 1 (vertical)

  // Cliff threshold: rock appears above ~35 degrees (normalY < 0.82)
  const cliffThreshold = 0.18; // slope > 0.18 = ~35 degrees
  const cliffBlend = 0.15;

  if (slope < cliffThreshold) return 0;

  // Smoothstep transition
  const t = Math.min(1, (slope - cliffThreshold) / cliffBlend);
  let rockWeight = t * t * (3 - 2 * t);

  // Increase rock at higher elevations
  const elevationBoost = Math.min(1, height / 30) * 0.3;
  rockWeight = Math.min(1, rockWeight + elevationBoost);

  return rockWeight;
}

// Alaskan cliff rock - rounded organic 3D rock (looks good from all angles)
// Uses CDN in production, local in development
const CLIFF_MODEL_PATH = getModelPath('Cliffside/alaskan-cliff-rock-9-free/alaskan_cliff_rock.glb');

// Performance limits
const MAX_INSTANCES_PER_CHUNK = 200;

// =============================================================================
// COMPONENT
// =============================================================================

export const ChunkCliffs = React.memo(function ChunkCliffs({
  chunkX,
  chunkZ,
  seed,
  chunkRadius,
  terrainGen: passedTerrainGen,
  // Density - tuned for Rust-style sparse but impactful placement
  gridDensity = 10,             // 10x10 grid = 100 sample points (was 8)
  minSpacing = 8,               // 8m minimum between cliffs
  rockWeightThreshold = 0.3,    // Only on steep rocky terrain
  minElevation = 18,            // High elevation only - mountain zones (was 3)
  mountainMaskThreshold = 0.4,  // REQUIRE mountain zones (was 0.1 - too permissive)
  // Scale - wider, flatter rocks (not spiky)
  scaleMin = 0.8,
  scaleMax = 2.0,
  slopeScaleInfluence = 0.3,
  xzScaleMin = 1.0,
  xzScaleMax = 1.6,             // Wider base
  yScaleMin = 0.4,              // Flatter (less spiky)
  yScaleMax = 0.7,
  // Orientation
  slopeAlignment = 1.0,         // Full alignment with slope (was 0.3)
  randomTilt = 8,               // Subtle random tilt (degrees)
  randomYaw = 180,              // Full rotation variety
  // Stacking - for cliff faces
  verticalStackingEnabled = true,
  verticalSpacing = 4,
  maxStackHeight = 3,
  // Embedding
  embedDepth = 0.5,
  // Player position for proximity-based physics
  playerPosition,
}: ChunkCliffsProps) {
  const instancedMeshRef = useRef<THREE.InstancedMesh>(null);

  // Load cliff model
  const gltf = useGLTF(CLIFF_MODEL_PATH) as GLTFResult;

  // Extract geometry and material
  const { geometry, material } = useMemo(() => {
    let geo: THREE.BufferGeometry | null = null;
    let mat: THREE.Material | null = null;

    gltf.scene.traverse((node) => {
      if ((node as THREE.Mesh).isMesh && !geo) {
        const mesh = node as THREE.Mesh;
        geo = mesh.geometry;
        mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
      }
    });

    if (mat) {
      const cliffMat = (mat as THREE.MeshStandardMaterial).clone();
      cliffMat.roughness = 0.9;
      cliffMat.metalness = 0;
      cliffMat.fog = true; // Ensure cliffs fade with fog
      mat = cliffMat;
    }

    return {
      geometry: geo || new THREE.BoxGeometry(3, 3, 3),
      material: mat || new THREE.MeshStandardMaterial({ color: 0x666666 }),
    };
  }, [gltf.scene]);

  // ==========================================================================
  // RUST-STYLE PLACEMENT
  // Simple, predictable, and visually coherent
  // ==========================================================================

  const placements = useMemo(() => {
    // Use passed terrainGen (has hydrology) or create fallback (no hydrology)
    const terrainGen = passedTerrainGen ?? new TerrainGenerator(seed, chunkRadius);
    const origin = getChunkOrigin(chunkX, chunkZ);
    const chunkSeed = seed + chunkX * 7777 + chunkZ * 3333;
    const cellSize = CHUNK_SIZE / gridDensity;

    const result: CliffPlacement[] = [];
    const placedPositions: THREE.Vector2[] = [];

    // Sample grid with jitter
    for (let gz = 0; gz < gridDensity; gz++) {
      for (let gx = 0; gx < gridDensity; gx++) {
        const idx = gz * gridDensity + gx;

        // Jitter for natural distribution
        const jitterX = (seededRandom(chunkSeed + idx * 17) - 0.5) * 0.8;
        const jitterZ = (seededRandom(chunkSeed + idx * 17 + 1) - 0.5) * 0.8;

        const worldX = origin.x + (gx + 0.5 + jitterX) * cellSize;
        const worldZ = origin.z + (gz + 0.5 + jitterZ) * cellSize;

        // Sample terrain using new generator
        const terrain = terrainGen.sampleTerrain(worldX, worldZ);
        const height = terrain.height;
        const normal = new THREE.Vector3(terrain.normal.x, terrain.normal.y, terrain.normal.z);

        // =================================================================
        // STRICT FILTERING: Prevent cliffs in invalid locations
        // =================================================================

        // 1. Skip invalid heights (NaN, void, ocean)
        if (!Number.isFinite(height)) continue;
        if (height < WATER_LEVEL) continue; // Skip anything at or below water

        // 2. Skip near-water zones (use elevation-based check with higher margin)
        if (height < WATER_LEVEL + Math.max(minElevation, 5)) continue;

        // 3. Skip rivers and lakes - never spawn cliffs in water features
        if (terrain.isRiver) continue;

        // 4. Check if within valid island bounds (not in ocean falloff) - stricter
        const distFromCenter = Math.sqrt(worldX * worldX + worldZ * worldZ);
        const worldRadius = (chunkRadius ?? 5) * CHUNK_SIZE;
        if (distFromCenter > worldRadius * 0.85) continue; // Skip outer 15% (ocean transition)

        // 5. Skip if island mask is too low (ocean/coastal area) - stricter threshold
        const islandMask = terrainGen.getIslandMask(worldX, worldZ);
        if (islandMask < 0.55) continue; // Skip areas near ocean

        // 5. Calculate rock weight (steep slopes only)
        const rockWeight = calculateRockWeight(terrain.normal.y, height);
        if (rockWeight < rockWeightThreshold) continue;

        // 6. Skip flat terrain (cliffs need slopes)
        const terrainSlope = 1 - terrain.normal.y;
        if (terrainSlope < 0.15) continue; // At least ~15 degree slope

        // 7. REQUIRED: Cliffs ONLY in mountain zones (Rust-style)
        const mountainMask = terrainGen.getMountainZoneMask(worldX, worldZ);
        if (mountainMask < mountainMaskThreshold) continue;

        // Minimum spacing check (Poisson-disk style)
        const pos2D = new THREE.Vector2(worldX, worldZ);
        let tooClose = false;
        for (const existing of placedPositions) {
          if (pos2D.distanceTo(existing) < minSpacing) {
            tooClose = true;
            break;
          }
        }
        if (tooClose) continue;

        placedPositions.push(pos2D);

        // =================================================================
        // ORIENTATION: Face outward from slope
        // =================================================================

        // Get slope direction (horizontal gradient)
        const slopeDir = new THREE.Vector2(normal.x, normal.z);
        const slopeMag = slopeDir.length();

        // Default facing direction (outward from slope)
        let facingAngle = 0;
        if (slopeMag > 0.01) {
          // Face perpendicular to slope (outward)
          facingAngle = Math.atan2(slopeDir.y, slopeDir.x);
        } else {
          // Flat area: random facing
          facingAngle = seededRandom(chunkSeed + idx * 17 + 2) * Math.PI * 2;
        }

        // Add random yaw variation
        const yawVariation = ((seededRandom(chunkSeed + idx * 17 + 3) - 0.5) * 2 * randomYaw * Math.PI) / 180;
        facingAngle += yawVariation;

        // Build rotation quaternion
        const quaternion = new THREE.Quaternion();

        // Start with yaw rotation (facing direction)
        quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), facingAngle);

        // Apply slope alignment (lean into terrain)
        if (slopeAlignment > 0 && slopeMag > 0.1) {
          const tiltAxis = new THREE.Vector3(-slopeDir.y, 0, slopeDir.x).normalize();
          const tiltAmount = Math.asin(Math.min(slopeMag, 0.8)) * slopeAlignment;
          const tiltQuat = new THREE.Quaternion().setFromAxisAngle(tiltAxis, tiltAmount);
          quaternion.premultiply(tiltQuat);
        }

        // Add random tilt for variety
        if (randomTilt > 0) {
          const tiltRad = (randomTilt * Math.PI) / 180;
          const randTilt = (seededRandom(chunkSeed + idx * 17 + 4) - 0.5) * 2 * tiltRad;
          const tiltAxis = new THREE.Vector3(1, 0, 0).applyQuaternion(quaternion);
          const tiltQuat = new THREE.Quaternion().setFromAxisAngle(tiltAxis, randTilt);
          quaternion.multiply(tiltQuat);
        }

        // =================================================================
        // SCALE: Varies with slope steepness
        // =================================================================

        const slope = 1 - terrain.normal.y; // 0 = flat, 1 = vertical
        const scaleRand = seededRandom(chunkSeed + idx * 17 + 5);

        // Base scale with random variation
        let baseScale = scaleMin + scaleRand * (scaleMax - scaleMin);

        // Slope influence: steeper = larger
        baseScale *= 1 + slope * slopeScaleInfluence;

        // Per-axis scale for organic shapes (wider, flatter)
        const xScale = baseScale * (xzScaleMin + seededRandom(chunkSeed + idx * 17 + 6) * (xzScaleMax - xzScaleMin));
        const yScale = baseScale * (yScaleMin + seededRandom(chunkSeed + idx * 17 + 7) * (yScaleMax - yScaleMin));
        const zScale = baseScale * (xzScaleMin + seededRandom(chunkSeed + idx * 17 + 8) * (xzScaleMax - xzScaleMin));

        // =================================================================
        // POSITION: Embed into terrain
        // =================================================================

        const embedAmount = Math.max(xScale, yScale, zScale) * embedDepth;
        const position = new THREE.Vector3(
          worldX,
          height - embedAmount,
          worldZ
        );

        result.push({ position, quaternion, scale: new THREE.Vector3(xScale, yScale, zScale) });

        // =================================================================
        // VERTICAL STACKING: For cliff faces
        // =================================================================

        if (verticalStackingEnabled && slope > 0.4 && rockWeight > 0.5) {
          // Determine stack count based on steepness
          const maxStacks = Math.min(maxStackHeight - 1, Math.floor(slope * 2));

          for (let s = 1; s <= maxStacks; s++) {
            // Position offset upward along slope
            const stackY = s * verticalSpacing;
            const stackPos = position.clone();
            stackPos.y += stackY;

            // Slight horizontal offset for variety
            stackPos.x += (seededRandom(chunkSeed + idx * 17 + s * 100) - 0.5) * 2;
            stackPos.z += (seededRandom(chunkSeed + idx * 17 + s * 100 + 1) - 0.5) * 2;

            // Slightly smaller as we go up
            const stackScale = 0.85 - s * 0.1;
            const stackScaleVar = 0.9 + seededRandom(chunkSeed + idx * 17 + s * 100 + 2) * 0.2;

            // Varied rotation
            const stackYaw = seededRandom(chunkSeed + idx * 17 + s * 100 + 3) * Math.PI * 0.5;
            const stackQuat = quaternion.clone();
            stackQuat.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), stackYaw));

            result.push({
              position: stackPos,
              quaternion: stackQuat,
              scale: new THREE.Vector3(
                xScale * stackScale * stackScaleVar,
                yScale * stackScale * stackScaleVar,
                zScale * stackScale * stackScaleVar
              ),
            });
          }
        }
      }
    }

    // Performance cap
    if (result.length > MAX_INSTANCES_PER_CHUNK) {
      result.length = MAX_INSTANCES_PER_CHUNK;
    }

    if (DEBUG_CLIFFS && result.length > 0) {
      console.log(`🪨 Chunk [${chunkX},${chunkZ}] placed ${result.length} cliffs`);
    }

    return result;
  }, [
    chunkX, chunkZ, seed, chunkRadius, passedTerrainGen,
    gridDensity, minSpacing, rockWeightThreshold, minElevation, mountainMaskThreshold,
    scaleMin, scaleMax, slopeScaleInfluence, xzScaleMin, xzScaleMax, yScaleMin, yScaleMax,
    slopeAlignment, randomTilt, randomYaw,
    verticalStackingEnabled, verticalSpacing, maxStackHeight,
    embedDepth,
  ]);

  // Update instanced mesh matrices
  useEffect(() => {
    if (!instancedMeshRef.current || placements.length === 0) return;

    const matrix = new THREE.Matrix4();

    placements.forEach((placement, i) => {
      matrix.compose(placement.position, placement.quaternion, placement.scale);
      instancedMeshRef.current!.setMatrixAt(i, matrix);
    });

    instancedMeshRef.current.instanceMatrix.needsUpdate = true;
    instancedMeshRef.current.count = placements.length;

    // Recompute bounding sphere for proper frustum culling
    // Without this, cliffs disappear when camera looks at certain angles
    instancedMeshRef.current.computeBoundingSphere();

    // PERF: Disable auto matrix updates for static geometry
    instancedMeshRef.current.matrixAutoUpdate = false;
    instancedMeshRef.current.updateMatrix();

    // PERF: Enable vegetation layer to exclude from camera collision raycasts
    // Use enable() not set() - set() removes from default layer (0) making it invisible!
    instancedMeshRef.current.layers.enable(LAYERS.VEGETATION);
  }, [placements]);

  // Only add physics colliders for cliffs near player (expensive, so limit radius)
  const physicsPlacements = useMemo(() => {
    if (!playerPosition) {
      // No player position - limit to first few cliffs as fallback
      return placements.slice(0, 4);
    }

    const radiusSq = CLIFF_PHYSICS_RADIUS * CLIFF_PHYSICS_RADIUS;
    return placements.filter((p) => {
      const dx = p.position.x - playerPosition.x;
      const dz = p.position.z - playerPosition.z;
      return dx * dx + dz * dz < radiusSq;
    });
  }, [placements, playerPosition]);

  if (placements.length === 0) {
    return null;
  }

  const maxInstances = gridDensity * gridDensity * (verticalStackingEnabled ? maxStackHeight : 1);

  return (
    <group name={`chunk-cliffs-${chunkX}-${chunkZ}`}>
      {/* Visual mesh - instanced for performance */}
      <instancedMesh
        ref={instancedMeshRef}
        args={[geometry, material, Math.min(maxInstances, MAX_INSTANCES_PER_CHUNK)]}
        frustumCulled={true}
        castShadow={false}
        receiveShadow={false}
      />

      {/* Physics colliders only for nearby cliffs (performance optimization) */}
      {physicsPlacements.map((p) => {
        // Use half-extents for CuboidCollider (box dimensions)
        // Scale down slightly for tighter collision
        const halfX = p.scale.x * 0.4;
        const halfY = p.scale.y * 0.5;
        const halfZ = p.scale.z * 0.4;

        return (
          <RigidBody
            key={`cliff-collider-${p.position.x.toFixed(1)}-${p.position.z.toFixed(1)}`}
            type="fixed"
            position={[p.position.x, p.position.y + halfY, p.position.z]}
            quaternion={[p.quaternion.x, p.quaternion.y, p.quaternion.z, p.quaternion.w]}
            colliders={false}
          >
            <CuboidCollider args={[halfX, halfY, halfZ]} />
          </RigidBody>
        );
      })}
    </group>
  );
});

(ChunkCliffs as any).preload = () => {
  useGLTF.preload(CLIFF_MODEL_PATH);
};

export default ChunkCliffs;
