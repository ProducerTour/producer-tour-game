/**
 * ChunkPalmTrees.tsx
 * OPTIMIZED: Uses InstancedMesh for palm trees in beach/coastal zones
 *
 * PERFORMANCE:
 * - Draw calls per chunk: 1 per primitive (trunk + fronds)
 * - ~2000 triangles per palm (already optimized model)
 * - Static geometry optimizations (matrixAutoUpdate = false)
 *
 * Placement: Coastal zones within 100m of world edge, height 0.5m - 10m
 */

import React, { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { RigidBody, CylinderCollider } from '@react-three/rapier';
import type { GLTF } from 'three-stdlib';
import {
  TerrainGenerator,
  CHUNK_SIZE,
  getChunkOrigin,
  WATER_LEVEL,
  WORLD_PLAY_RADIUS,
} from '../../../lib/terrain';
import { LAYERS } from '../constants/layers';
import { getModelPath } from '../../../config/assetPaths';

const DEBUG_PALM_TREES = false;

// Physics only within this radius from player (expensive, so keep small)
const PALM_PHYSICS_RADIUS = 50;

// Maximum palm trees per chunk (for InstancedMesh pre-allocation)
const MAX_PALMS_PER_CHUNK = 8;

// Palm tree model path - uses CDN in production, local in development
const PALM_MODEL = getModelPath('Foliage/Trees/palm_tree.glb');

export interface ChunkPalmTreesProps {
  chunkX: number;
  chunkZ: number;
  seed: number;
  chunkRadius?: number;
  terrainGen?: TerrainGenerator;
  instancesPerChunk?: number;
  minTreeSpacing?: number;
  playerPosition?: { x: number; z: number };
}

function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

interface TreePlacement {
  position: THREE.Vector3;
  rotation: number;
  scale: number;
}

type GLTFResult = GLTF & {
  nodes: Record<string, THREE.Mesh | THREE.Object3D>;
  materials: Record<string, THREE.Material>;
  scene: THREE.Group;
};

// Primitive data (geometry + material pair)
interface PrimitiveData {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
}

// Pre-allocated objects for matrix computation (avoid GC)
const _matrix = new THREE.Matrix4();
const _position = new THREE.Vector3();
const _quaternion = new THREE.Quaternion();
const _scale = new THREE.Vector3();
const _euler = new THREE.Euler();

/**
 * Extract ALL primitives (geometry + material pairs) from a palm tree model
 * Multi-material meshes have multiple primitives that need separate InstancedMeshes
 */
function extractAllPrimitives(scene: THREE.Group): PrimitiveData[] {
  const primitives: PrimitiveData[] = [];

  scene.traverse((node) => {
    if ((node as THREE.Mesh).isMesh) {
      const mesh = node as THREE.Mesh;
      const geometry = mesh.geometry;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

      materials.forEach((material) => {
        if (material && geometry) {
          primitives.push({ geometry, material });
        }
      });
    }
  });

  return primitives;
}

/**
 * Configure material for foliage rendering
 */
function configureFoliageMaterial(material: THREE.Material): void {
  const m = material as THREE.MeshStandardMaterial;
  m.side = THREE.DoubleSide;
  // Ensure fog is enabled for distance fading
  m.fog = true;

  if (m.map) {
    m.alphaTest = 0.5;
    m.transparent = false;
    m.depthWrite = true;
    m.map.colorSpace = THREE.SRGBColorSpace;
    m.map.anisotropy = 8;
    m.roughness = 0.85;
    m.metalness = 0;
    m.needsUpdate = true;
  }
}

export const ChunkPalmTrees = React.memo(function ChunkPalmTrees({
  chunkX,
  chunkZ,
  seed,
  chunkRadius,
  terrainGen: passedTerrainGen,
  instancesPerChunk = 4,
  minTreeSpacing = 12,
  playerPosition,
}: ChunkPalmTreesProps) {
  // Refs for InstancedMesh array (one per primitive)
  const meshRefs = useRef<(THREE.InstancedMesh | null)[]>([]);

  // Load palm tree model (cached by drei)
  const gltf = useGLTF(PALM_MODEL) as GLTFResult;

  // Extract all primitives from the model
  const primitives = useMemo(() => {
    const prims = extractAllPrimitives(gltf.scene);

    // Configure materials
    prims.forEach((p) => configureFoliageMaterial(p.material));

    if (DEBUG_PALM_TREES) {
      console.log('🌴 Palm primitives loaded:', prims.length);
    }

    return prims;
  }, [gltf.scene]);

  // Get tree bounds for proper ground placement
  const treeBounds = useMemo(() => {
    return new THREE.Box3().setFromObject(gltf.scene);
  }, [gltf.scene]);

  // Generate palm tree placements for beach zones
  const placements = useMemo(() => {
    const terrainGen = passedTerrainGen ?? new TerrainGenerator(seed, chunkRadius);
    const origin = getChunkOrigin(chunkX, chunkZ);
    const chunkSeed = seed + chunkX * 2000 + chunkZ + 777777;

    const result: TreePlacement[] = [];
    const placedPositions: THREE.Vector2[] = [];

    // Beach heights: just above water to dune level
    const minPalmHeight = WATER_LEVEL + 0.5;
    const maxPalmHeight = 10;

    const worldRadius = chunkRadius ? chunkRadius * CHUNK_SIZE : WORLD_PLAY_RADIUS;

    for (let i = 0; i < instancesPerChunk * 6 && result.length < instancesPerChunk; i++) {
      const randX = seededRandom(chunkSeed + i * 11);
      const randZ = seededRandom(chunkSeed + i * 11 + 1);
      const randRot = seededRandom(chunkSeed + i * 11 + 2);
      const randScaleVar = seededRandom(chunkSeed + i * 11 + 3);
      const randDensity = seededRandom(chunkSeed + i * 11 + 4);

      const x = origin.x + randX * CHUNK_SIZE;
      const z = origin.z + randZ * CHUNK_SIZE;

      // Check minimum spacing
      const pos2D = new THREE.Vector2(x, z);
      let tooClose = false;
      for (const existing of placedPositions) {
        if (pos2D.distanceTo(existing) < minTreeSpacing) {
          tooClose = true;
          break;
        }
      }
      if (tooClose) continue;

      // Sample terrain
      const terrain = terrainGen.sampleTerrain(x, z);
      const height = terrain.height;

      if (!Number.isFinite(height)) continue;
      if (terrain.isSubmerged) continue;

      // Distance-based filtering: palm trees near coast only
      const distFromCenter = Math.sqrt(x * x + z * z);
      const distFromCoast = worldRadius - distFromCenter;

      if (distFromCoast < 3) continue;    // Not in water
      if (distFromCoast > 100) continue;  // Not too far inland

      // Height-based filtering: beach/dune zone
      if (height < minPalmHeight) continue;
      if (height > maxPalmHeight) continue;

      // Slope filtering: gentle terrain only
      if (terrain.normal.y < 0.8) continue;

      // Density variation: natural clumping
      const densityNoise = (terrainGen as any).noise?.fbm2?.(x * 0.02, z * 0.02, 2, 0.5, 2.0, 1.0) ?? 0;
      const palmDensity = 0.7 + densityNoise * 0.3;
      if (randDensity > palmDensity) continue;

      placedPositions.push(pos2D);

      // Place at ground level (accounting for model origin offset)
      const y = height - treeBounds.min.y - 0.05;

      // Scale variation (0.5x to 1.0x)
      const s = 0.5 + randScaleVar * 0.5;

      result.push({
        position: new THREE.Vector3(x, y, z),
        rotation: randRot * Math.PI * 2,
        scale: s,
      });
    }

    if (DEBUG_PALM_TREES && result.length > 0) {
      console.log(`🌴 Chunk [${chunkX},${chunkZ}]: ${result.length} palm trees`);
    }

    return result;
  }, [chunkX, chunkZ, seed, chunkRadius, passedTerrainGen, instancesPerChunk, minTreeSpacing, treeBounds]);

  // Update instance matrices for all primitives
  useEffect(() => {
    const count = Math.min(placements.length, MAX_PALMS_PER_CHUNK);

    meshRefs.current.forEach((mesh) => {
      if (!mesh) return;

      for (let i = 0; i < count; i++) {
        const p = placements[i];

        _euler.set(0, p.rotation, 0);
        _quaternion.setFromEuler(_euler);
        _scale.setScalar(p.scale);
        _position.copy(p.position);

        _matrix.compose(_position, _quaternion, _scale);
        mesh.setMatrixAt(i, _matrix);
      }

      mesh.count = count;
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();

      // PERF: Static geometry optimizations
      mesh.matrixAutoUpdate = false;
      mesh.updateMatrix();
      mesh.layers.enable(LAYERS.VEGETATION);
    });
  }, [placements]);

  // Only add physics colliders for palms near player (expensive, so limit radius)
  // If no playerPosition, limit to first few palms per chunk as fallback
  const physicsTreesNearPlayer = useMemo(() => {
    if (!playerPosition) {
      // Fallback: limit physics bodies when no player position available
      return placements.slice(0, 2);
    }

    const radiusSq = PALM_PHYSICS_RADIUS * PALM_PHYSICS_RADIUS;
    return placements.filter((p) => {
      const dx = p.position.x - playerPosition.x;
      const dz = p.position.z - playerPosition.z;
      return dx * dx + dz * dz < radiusSq;
    });
  }, [placements, playerPosition]);

  // Early return if no placements or no primitives
  if (placements.length === 0 || primitives.length === 0) {
    return null;
  }

  // Ensure refs array is correct size
  meshRefs.current = new Array(primitives.length).fill(null);

  return (
    <group name={`chunk-palm-trees-${chunkX}-${chunkZ}`}>
      {/* Palm tree instances - all primitives */}
      {primitives.map((prim, idx) => (
        <instancedMesh
          key={`palm-${idx}`}
          ref={(el) => { meshRefs.current[idx] = el; }}
          args={[prim.geometry, prim.material, MAX_PALMS_PER_CHUNK]}
          frustumCulled
          receiveShadow
        />
      ))}

      {/* Physics colliders for palm tree trunks - only near player for performance */}
      {physicsTreesNearPlayer.map((p) => {
        const trunkRadius = 0.3 * p.scale;
        const trunkHeight = 3.0 * p.scale;

        return (
          <RigidBody
            key={`collider-${p.position.x.toFixed(1)}-${p.position.z.toFixed(1)}`}
            type="fixed"
            position={[p.position.x, p.position.y, p.position.z]}
            colliders={false}
          >
            <CylinderCollider
              args={[trunkHeight / 2, trunkRadius]}
              position={[0, trunkHeight / 2, 0]}
            />
          </RigidBody>
        );
      })}
    </group>
  );
});

// Preload palm tree model
(ChunkPalmTrees as any).preload = () => {
  useGLTF.preload(PALM_MODEL);
};

export default ChunkPalmTrees;
