/**
 * ChunkTreesInstanced.tsx
 * OPTIMIZED: Uses InstancedMesh with low-poly merged tree models
 *
 * PERFORMANCE:
 * - Draw calls per chunk: 3 tree types × 3 primitives each = 9 max
 * - ~1000 triangles per tree (vs 54,000 before = 50x reduction!)
 * - Models have multiple primitives (trunk + branch materials)
 *
 * Tree Types by Biome:
 * - tree-01 (deciduous): Temperate Forest, Meadow (mid elevations)
 * - tree-02 (conifer): Boreal Forest, Highland (high elevations)
 * - tree-03 (tropical): Rainforest, Swamp (low/wet areas)
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
} from '../../../lib/terrain';
import { LAYERS } from '../constants/layers';

// Debug logging
const DEBUG_TREES = false;

// Physics only within this radius from player (expensive, so keep small)
const TREE_PHYSICS_RADIUS = 50;

// Maximum trees per chunk per type (for InstancedMesh pre-allocation)
const MAX_TREES_PER_TYPE = 12;

// Tree model paths - using new lowpoly models
const TREE_MODELS = {
  deciduous: '/models/Foliage/Trees/lowpoly/tree-01-1.glb',
  conifer: '/models/Foliage/Trees/lowpoly/tree-02-1.glb',
  tropical: '/models/Foliage/Trees/lowpoly/tree-03-1.glb',
} as const;

export interface ChunkTreesInstancedProps {
  chunkX: number;
  chunkZ: number;
  seed: number;
  chunkRadius?: number;
  terrainGen?: TerrainGenerator;
  instancesPerChunk?: number;
  minTreeSpacing?: number;
  playerPosition?: { x: number; z: number };
}

// Seeded random for deterministic tree placement
function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// Tree type categories
type TreeType = 'deciduous' | 'conifer' | 'tropical';

// Tree placement data
interface TreePlacement {
  position: THREE.Vector3;
  rotation: number;
  scale: number;
  treeType: TreeType;
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
 * Extract ALL primitives (geometry + material pairs) from a tree model
 * Multi-material meshes have multiple primitives that need separate InstancedMeshes
 */
function extractAllPrimitives(scene: THREE.Group): PrimitiveData[] {
  const primitives: PrimitiveData[] = [];

  scene.traverse((node) => {
    if ((node as THREE.Mesh).isMesh) {
      const mesh = node as THREE.Mesh;
      const geometry = mesh.geometry;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

      // Each material corresponds to a draw group in the geometry
      // For simple meshes, there's just one material for the whole geometry
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
  // Ensure fog is enabled for distance fading
  m.fog = true;
  if (m.map) {
    m.alphaTest = 0.5;
    m.transparent = false;
    m.depthWrite = true;
    m.side = THREE.DoubleSide;
    m.map.colorSpace = THREE.SRGBColorSpace;
    m.map.anisotropy = 8;
    m.roughness = 0.9;
    m.metalness = 0;
    m.needsUpdate = true;
  }
}

export const ChunkTreesInstanced = React.memo(function ChunkTreesInstanced({
  chunkX,
  chunkZ,
  seed,
  chunkRadius,
  terrainGen: passedTerrainGen,
  instancesPerChunk = 12,
  minTreeSpacing = 10,
  playerPosition,
}: ChunkTreesInstancedProps) {
  // Refs for InstancedMesh arrays (one per primitive per tree type)
  const deciduousMeshRefs = useRef<(THREE.InstancedMesh | null)[]>([]);
  const coniferMeshRefs = useRef<(THREE.InstancedMesh | null)[]>([]);
  const tropicalMeshRefs = useRef<(THREE.InstancedMesh | null)[]>([]);

  // Load tree models (cached by drei)
  const deciduousGltf = useGLTF(TREE_MODELS.deciduous) as GLTFResult;
  const coniferGltf = useGLTF(TREE_MODELS.conifer) as GLTFResult;
  const tropicalGltf = useGLTF(TREE_MODELS.tropical) as GLTFResult;

  // Extract all primitives from each model
  const primitiveData = useMemo(() => {
    const deciduous = extractAllPrimitives(deciduousGltf.scene);
    const conifer = extractAllPrimitives(coniferGltf.scene);
    const tropical = extractAllPrimitives(tropicalGltf.scene);

    // Configure materials
    [...deciduous, ...conifer, ...tropical].forEach((p) => {
      configureFoliageMaterial(p.material);
    });

    if (DEBUG_TREES) {
      console.log('🌳 Tree primitives loaded:', {
        deciduous: deciduous.length,
        conifer: conifer.length,
        tropical: tropical.length,
      });
    }

    return { deciduous, conifer, tropical };
  }, [deciduousGltf.scene, coniferGltf.scene, tropicalGltf.scene]);

  // Compute bounds for each tree type for proper ground placement
  const treeBounds = useMemo(() => {
    return {
      deciduous: new THREE.Box3().setFromObject(deciduousGltf.scene),
      conifer: new THREE.Box3().setFromObject(coniferGltf.scene),
      tropical: new THREE.Box3().setFromObject(tropicalGltf.scene),
    };
  }, [deciduousGltf.scene, coniferGltf.scene, tropicalGltf.scene]);

  // Generate tree placements for this chunk
  const placements = useMemo(() => {
    const terrainGen = passedTerrainGen ?? new TerrainGenerator(seed, chunkRadius);
    const origin = getChunkOrigin(chunkX, chunkZ);
    const chunkSeed = seed + chunkX * 1000 + chunkZ + 999999;

    const result: TreePlacement[] = [];
    const placedPositions: THREE.Vector2[] = [];

    // Height zones for different tree types
    const FOREST_MIN_HEIGHT = 8;
    const FOREST_MAX_HEIGHT = 50;
    const BOREAL_MIN_HEIGHT = 35;
    const BOREAL_MAX_HEIGHT = 80;

    const worldRadius = (chunkRadius ?? 5) * CHUNK_SIZE;
    const maxTotalTrees = instancesPerChunk * 3;

    for (let i = 0; i < maxTotalTrees * 3 && result.length < instancesPerChunk; i++) {
      const randX = seededRandom(chunkSeed + i * 7);
      const randZ = seededRandom(chunkSeed + i * 7 + 1);
      const randRot = seededRandom(chunkSeed + i * 7 + 2);
      const randScaleVar = seededRandom(chunkSeed + i * 7 + 3);
      const randDensity = seededRandom(chunkSeed + i * 7 + 4);
      const randTreeType = seededRandom(chunkSeed + i * 7 + 5);

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
      if (height <= WATER_LEVEL + 1.0) continue;

      // Distance checks
      const distFromCenter = Math.sqrt(x * x + z * z);
      const distFromCoast = worldRadius - distFromCenter;
      if (distFromCoast < 60) continue;
      if (distFromCenter > worldRadius * 0.9) continue;

      // Height bounds for any tree
      if (height < FOREST_MIN_HEIGHT) continue;
      if (height > BOREAL_MAX_HEIGHT) continue;

      // Slope check - trees can't grow on steep terrain
      if (terrain.normal.y < 0.7) continue;

      // Mountain zone check
      const mountainMask = terrainGen.getMountainZoneMask(x, z);
      if (mountainMask > 0.7) continue;

      // Density variation using noise
      const densityNoise = (terrainGen as any).noise?.fbm2?.(x * 0.015, z * 0.015, 2, 0.5, 2.0, 1.0) ?? 0;
      const forestDensity = 0.5 + densityNoise * 0.35;
      if (randDensity > forestDensity) continue;

      placedPositions.push(pos2D);

      // Determine tree type based on height and randomness
      let treeType: TreeType;

      if (height >= BOREAL_MIN_HEIGHT && height <= BOREAL_MAX_HEIGHT) {
        treeType = randTreeType < 0.8 ? 'conifer' : 'deciduous';
      } else if (height >= FOREST_MIN_HEIGHT && height <= FOREST_MAX_HEIGHT) {
        if (randTreeType < 0.55) {
          treeType = 'deciduous';
        } else if (randTreeType < 0.85) {
          treeType = 'conifer';
        } else {
          treeType = 'tropical';
        }
      } else {
        treeType = randTreeType < 0.5 ? 'tropical' : 'deciduous';
      }

      // Scale variation (0.7x to 1.3x for variety)
      const s = 0.7 + randScaleVar * 0.6;

      // Get bounds for this tree type and compute proper Y position
      // Offset by -bounds.min.y to ensure base is at ground level, then embed slightly
      const bounds = treeBounds[treeType];
      const yOffset = bounds ? -bounds.min.y * s - 0.1 : 0;
      const y = height + yOffset;

      result.push({
        position: new THREE.Vector3(x, y, z),
        rotation: randRot * Math.PI * 2,
        scale: s,
        treeType,
      });
    }

    if (DEBUG_TREES && result.length > 0) {
      const counts = { deciduous: 0, conifer: 0, tropical: 0 };
      result.forEach((p) => counts[p.treeType]++);
      console.log(`🌳 Chunk [${chunkX},${chunkZ}]: ${result.length} trees`, counts);
    }

    return result;
  }, [chunkX, chunkZ, seed, chunkRadius, passedTerrainGen, instancesPerChunk, minTreeSpacing, treeBounds]);

  // PERF: Don't filter visuals by player position - let GPU frustum culling handle it
  // This avoids expensive re-renders every time player moves
  const visiblePlacements = placements;

  // Only add physics colliders for trees near player (expensive, so limit radius)
  // If no playerPosition, limit to first few trees per chunk as fallback
  const physicsTreesNearPlayer = useMemo(() => {
    if (!playerPosition) {
      // Fallback: limit physics bodies when no player position available
      return placements.slice(0, 4);
    }

    const radiusSq = TREE_PHYSICS_RADIUS * TREE_PHYSICS_RADIUS;
    return placements.filter((p) => {
      const dx = p.position.x - playerPosition.x;
      const dz = p.position.z - playerPosition.z;
      return dx * dx + dz * dz < radiusSq;
    });
  }, [placements, playerPosition]);

  // Separate placements by tree type
  const placementsByType = useMemo(() => {
    const deciduous: TreePlacement[] = [];
    const conifer: TreePlacement[] = [];
    const tropical: TreePlacement[] = [];

    visiblePlacements.forEach((p) => {
      if (p.treeType === 'deciduous') deciduous.push(p);
      else if (p.treeType === 'conifer') conifer.push(p);
      else tropical.push(p);
    });

    return { deciduous, conifer, tropical };
  }, [visiblePlacements]);

  // Update instance matrices for all primitives of each tree type
  useEffect(() => {
    const updateMeshes = (
      meshRefs: React.MutableRefObject<(THREE.InstancedMesh | null)[]>,
      treePlacements: TreePlacement[]
    ) => {
      const count = Math.min(treePlacements.length, MAX_TREES_PER_TYPE);

      meshRefs.current.forEach((mesh) => {
        if (!mesh) return;

        for (let i = 0; i < count; i++) {
          const p = treePlacements[i];

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
    };

    updateMeshes(deciduousMeshRefs, placementsByType.deciduous);
    updateMeshes(coniferMeshRefs, placementsByType.conifer);
    updateMeshes(tropicalMeshRefs, placementsByType.tropical);
  }, [placementsByType]);

  // Early return if no placements
  if (visiblePlacements.length === 0) {
    return null;
  }

  const { deciduous, conifer, tropical } = primitiveData;

  // Helper to render all primitives for a tree type
  const renderTreeType = (
    primitives: PrimitiveData[],
    meshRefs: React.MutableRefObject<(THREE.InstancedMesh | null)[]>,
    placementCount: number,
    keyPrefix: string
  ) => {
    if (placementCount === 0 || primitives.length === 0) return null;

    // Ensure refs array is correct size
    meshRefs.current = new Array(primitives.length).fill(null);

    return primitives.map((prim, idx) => (
      <instancedMesh
        key={`${keyPrefix}-${idx}`}
        ref={(el) => { meshRefs.current[idx] = el; }}
        args={[prim.geometry, prim.material, MAX_TREES_PER_TYPE]}
        frustumCulled
        receiveShadow
      />
    ));
  };

  return (
    <group name={`chunk-trees-instanced-${chunkX}-${chunkZ}`}>
      {/* Deciduous trees - all primitives */}
      {renderTreeType(deciduous, deciduousMeshRefs, placementsByType.deciduous.length, 'deciduous')}

      {/* Conifer trees - all primitives */}
      {renderTreeType(conifer, coniferMeshRefs, placementsByType.conifer.length, 'conifer')}

      {/* Tropical trees - all primitives */}
      {renderTreeType(tropical, tropicalMeshRefs, placementsByType.tropical.length, 'tropical')}

      {/* Physics colliders for tree trunks - only near player for performance */}
      {physicsTreesNearPlayer.map((p) => {
        const trunkRadius = 0.25 * p.scale;
        const trunkHeight = 1.8 * p.scale;

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

// Preload all tree models
(ChunkTreesInstanced as any).preload = () => {
  useGLTF.preload(TREE_MODELS.deciduous);
  useGLTF.preload(TREE_MODELS.conifer);
  useGLTF.preload(TREE_MODELS.tropical);
};

export default ChunkTreesInstanced;
