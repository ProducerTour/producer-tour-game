/**
 * ChunkTreesLOD.tsx
 * Tree rendering with mesh LOD support
 *
 * Extends ChunkTreesInstanced with 3-tier mesh LOD:
 * - LOD0 (0-30m): Full detail (~1000 tris)
 * - LOD1 (30-60m): Medium detail (~400 tris)
 * - LOD2 (60-100m): Low detail (~150 tris)
 * - Billboard (100m+): Handled by TreeBillboardMesh
 *
 * Uses THREE.LOD for automatic distance-based switching.
 */

import React, { useMemo, useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { RigidBody, CylinderCollider } from '@react-three/rapier';
import type { GLTF } from 'three-stdlib';
import {
  TerrainGenerator,
  CHUNK_SIZE,
  getChunkOrigin,
  WATER_LEVEL,
} from '../../../lib/terrain';
import { LAYERS } from '../constants/layers';
import { getModelPath } from '../../../config/assetPaths';
import {
  getTreeMeshLOD,
  MeshLODLevel,
  type TreeType,
  type MeshLODConfig,
} from '../../../lib/lod';

// Debug logging
const DEBUG_LOD = false;

// Physics only within this radius from player
const TREE_PHYSICS_RADIUS = 50;

// Maximum trees per chunk per type
const MAX_TREES_PER_TYPE = 12;

// Default LOD distances
const DEFAULT_LOD_DISTANCES: Pick<
  MeshLODConfig,
  'lod0Distance' | 'lod1Distance' | 'lod2Distance'
> = {
  lod0Distance: 30,
  lod1Distance: 60,
  lod2Distance: 100,
};

// Tree model paths
const TREE_MODELS = {
  deciduous: getModelPath('Foliage/Trees/lowpoly/tree-01-1.glb'),
  conifer: getModelPath('Foliage/Trees/lowpoly/tree-02-1.glb'),
  tropical: getModelPath('Foliage/Trees/lowpoly/tree-03-1.glb'),
};

export interface ChunkTreesLODProps {
  chunkX: number;
  chunkZ: number;
  seed: number;
  chunkRadius?: number;
  terrainGen?: TerrainGenerator;
  instancesPerChunk?: number;
  minTreeSpacing?: number;
  playerPosition?: { x: number; z: number };
  /** LOD distance configuration */
  lodDistances?: Partial<
    Pick<MeshLODConfig, 'lod0Distance' | 'lod1Distance' | 'lod2Distance'>
  >;
  /** Enable LOD system (default: true) */
  enableLOD?: boolean;
  /** Callback when LOD stats change */
  onLODChange?: (stats: {
    lod0: number;
    lod1: number;
    lod2: number;
    billboard: number;
  }) => void;
}

// Seeded random for deterministic tree placement
function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

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

// Pre-allocated objects for matrix computation
const _matrix = new THREE.Matrix4();
const _position = new THREE.Vector3();
const _quaternion = new THREE.Quaternion();
const _scale = new THREE.Vector3();
const _euler = new THREE.Euler();

/**
 * Extract ALL primitives from a tree model
 */
function extractAllPrimitives(scene: THREE.Group): PrimitiveData[] {
  const primitives: PrimitiveData[] = [];

  scene.traverse((node) => {
    if ((node as THREE.Mesh).isMesh) {
      const mesh = node as THREE.Mesh;
      const geometry = mesh.geometry;
      const materials = Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material];

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

/**
 * LOD-aware InstancedMesh component
 */
function LODInstancedMesh({
  treeType,
  primitives,
  placements,
  lodDistances,
  camera,
}: {
  treeType: TreeType;
  primitives: PrimitiveData[];
  placements: TreePlacement[];
  lodDistances: Pick<
    MeshLODConfig,
    'lod0Distance' | 'lod1Distance' | 'lod2Distance'
  >;
  camera: THREE.Camera;
}) {
  const lodManager = getTreeMeshLOD();
  const [lodReady, setLodReady] = useState(false);

  // Track LOD counts for stats
  const lodCounts = useRef({ lod0: 0, lod1: 0, lod2: 0 });

  // Refs for each LOD level's instanced meshes
  const lod0MeshRefs = useRef<(THREE.InstancedMesh | null)[]>([]);
  const lod1MeshRefs = useRef<(THREE.InstancedMesh | null)[]>([]);
  const lod2MeshRefs = useRef<(THREE.InstancedMesh | null)[]>([]);

  // Generate LOD geometries on first render
  useEffect(() => {
    if (primitives.length === 0) return;

    // Register each primitive's geometry with the LOD manager
    // For simplicity, we use the first primitive's geometry
    const mainGeometry = primitives[0].geometry;
    const materials = primitives.map((p) => p.material);

    lodManager.registerTreeGeometrySync(treeType, mainGeometry, materials);
    setLodReady(true);

    if (DEBUG_LOD) {
      const stats = lodManager.getStats();
      console.log(`[ChunkTreesLOD] ${treeType} LOD ready:`, stats[treeType]);
    }
  }, [treeType, primitives, lodManager]);

  // Update instance matrices when placements change
  useEffect(() => {
    if (!lodReady) return;

    const count = Math.min(placements.length, MAX_TREES_PER_TYPE);
    const lodSet = lodManager.getLODGeometries(treeType);
    if (!lodSet) return;

    // Update all LOD level meshes with the same transforms
    const updateMeshes = (
      meshRefs: React.MutableRefObject<(THREE.InstancedMesh | null)[]>
    ) => {
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
        mesh.matrixAutoUpdate = false;
        mesh.updateMatrix();
        mesh.layers.enable(LAYERS.VEGETATION);
      });
    };

    updateMeshes(lod0MeshRefs);
    updateMeshes(lod1MeshRefs);
    updateMeshes(lod2MeshRefs);
  }, [placements, lodReady, treeType, lodManager]);

  // Update LOD visibility each frame based on camera distance
  useFrame(() => {
    if (!lodReady || placements.length === 0) return;

    const cameraPos = new THREE.Vector3();
    camera.getWorldPosition(cameraPos);

    // Calculate chunk center
    let avgX = 0,
      avgZ = 0;
    for (const p of placements) {
      avgX += p.position.x;
      avgZ += p.position.z;
    }
    avgX /= placements.length;
    avgZ /= placements.length;

    const chunkDistance = Math.sqrt(
      (cameraPos.x - avgX) ** 2 + (cameraPos.z - avgZ) ** 2
    );

    // Determine which LOD level to show for this chunk
    let activeLOD: MeshLODLevel;
    if (chunkDistance < lodDistances.lod0Distance) {
      activeLOD = MeshLODLevel.LOD0;
    } else if (chunkDistance < lodDistances.lod1Distance) {
      activeLOD = MeshLODLevel.LOD1;
    } else if (chunkDistance < lodDistances.lod2Distance) {
      activeLOD = MeshLODLevel.LOD2;
    } else {
      activeLOD = MeshLODLevel.Billboard;
    }

    // Update visibility of each LOD level
    lod0MeshRefs.current.forEach((mesh) => {
      if (mesh) mesh.visible = activeLOD === MeshLODLevel.LOD0;
    });
    lod1MeshRefs.current.forEach((mesh) => {
      if (mesh) mesh.visible = activeLOD === MeshLODLevel.LOD1;
    });
    lod2MeshRefs.current.forEach((mesh) => {
      if (mesh) mesh.visible = activeLOD === MeshLODLevel.LOD2;
    });

    // Track counts
    const count = placements.length;
    lodCounts.current = {
      lod0: activeLOD === MeshLODLevel.LOD0 ? count : 0,
      lod1: activeLOD === MeshLODLevel.LOD1 ? count : 0,
      lod2: activeLOD === MeshLODLevel.LOD2 ? count : 0,
    };
  });

  if (!lodReady || primitives.length === 0) return null;

  const lodSet = lodManager.getLODGeometries(treeType);
  if (!lodSet) return null;

  // Initialize refs arrays
  if (lod0MeshRefs.current.length !== primitives.length) {
    lod0MeshRefs.current = new Array(primitives.length).fill(null);
    lod1MeshRefs.current = new Array(primitives.length).fill(null);
    lod2MeshRefs.current = new Array(primitives.length).fill(null);
  }

  return (
    <group name={`lod-trees-${treeType}`}>
      {/* LOD0 - Full detail */}
      {primitives.map((prim, idx) => (
        <instancedMesh
          key={`${treeType}-lod0-${idx}`}
          ref={(el) => {
            lod0MeshRefs.current[idx] = el;
          }}
          args={[lodSet.lod0, prim.material, MAX_TREES_PER_TYPE]}
          frustumCulled
          receiveShadow
        />
      ))}

      {/* LOD1 - Medium detail */}
      {primitives.map((prim, idx) => (
        <instancedMesh
          key={`${treeType}-lod1-${idx}`}
          ref={(el) => {
            lod1MeshRefs.current[idx] = el;
          }}
          args={[lodSet.lod1, prim.material, MAX_TREES_PER_TYPE]}
          frustumCulled
          receiveShadow
          visible={false}
        />
      ))}

      {/* LOD2 - Low detail */}
      {primitives.map((prim, idx) => (
        <instancedMesh
          key={`${treeType}-lod2-${idx}`}
          ref={(el) => {
            lod2MeshRefs.current[idx] = el;
          }}
          args={[lodSet.lod2, prim.material, MAX_TREES_PER_TYPE]}
          frustumCulled
          receiveShadow
          visible={false}
        />
      ))}
    </group>
  );
}

/**
 * ChunkTreesLOD - Tree rendering with mesh LOD support
 */
export const ChunkTreesLOD = React.memo(function ChunkTreesLOD({
  chunkX,
  chunkZ,
  seed,
  chunkRadius,
  terrainGen: passedTerrainGen,
  instancesPerChunk = 12,
  minTreeSpacing = 10,
  playerPosition,
  lodDistances: customLodDistances,
  enableLOD = true,
  onLODChange: _onLODChange,
}: ChunkTreesLODProps) {
  const { camera } = useThree();

  // LOD distances
  const lodDistances = useMemo(
    () => ({
      ...DEFAULT_LOD_DISTANCES,
      ...customLodDistances,
    }),
    [customLodDistances]
  );

  // Load tree models
  const deciduousGltf = useGLTF(TREE_MODELS.deciduous) as GLTFResult;
  const coniferGltf = useGLTF(TREE_MODELS.conifer) as GLTFResult;
  const tropicalGltf = useGLTF(TREE_MODELS.tropical) as GLTFResult;

  // Extract primitives from each model
  const primitiveData = useMemo(() => {
    const deciduous = extractAllPrimitives(deciduousGltf.scene);
    const conifer = extractAllPrimitives(coniferGltf.scene);
    const tropical = extractAllPrimitives(tropicalGltf.scene);

    [...deciduous, ...conifer, ...tropical].forEach((p) => {
      configureFoliageMaterial(p.material);
    });

    return { deciduous, conifer, tropical };
  }, [deciduousGltf.scene, coniferGltf.scene, tropicalGltf.scene]);

  // Compute bounds for each tree type
  const treeBounds = useMemo(
    () => ({
      deciduous: new THREE.Box3().setFromObject(deciduousGltf.scene),
      conifer: new THREE.Box3().setFromObject(coniferGltf.scene),
      tropical: new THREE.Box3().setFromObject(tropicalGltf.scene),
    }),
    [deciduousGltf.scene, coniferGltf.scene, tropicalGltf.scene]
  );

  // Generate tree placements (same logic as ChunkTreesInstanced)
  const placements = useMemo(() => {
    const terrainGen =
      passedTerrainGen ?? new TerrainGenerator(seed, chunkRadius);
    const origin = getChunkOrigin(chunkX, chunkZ);
    const chunkSeed = seed + chunkX * 1000 + chunkZ + 999999;

    const result: TreePlacement[] = [];
    const placedPositions: THREE.Vector2[] = [];

    const FOREST_MIN_HEIGHT = 8;
    const FOREST_MAX_HEIGHT = 50;
    const BOREAL_MIN_HEIGHT = 35;
    const BOREAL_MAX_HEIGHT = 80;

    const worldRadius = (chunkRadius ?? 5) * CHUNK_SIZE;
    const maxTotalTrees = instancesPerChunk * 3;

    for (
      let i = 0;
      i < maxTotalTrees * 3 && result.length < instancesPerChunk;
      i++
    ) {
      const randX = seededRandom(chunkSeed + i * 7);
      const randZ = seededRandom(chunkSeed + i * 7 + 1);
      const randRot = seededRandom(chunkSeed + i * 7 + 2);
      const randScaleVar = seededRandom(chunkSeed + i * 7 + 3);
      const randDensity = seededRandom(chunkSeed + i * 7 + 4);
      const randTreeType = seededRandom(chunkSeed + i * 7 + 5);

      const x = origin.x + randX * CHUNK_SIZE;
      const z = origin.z + randZ * CHUNK_SIZE;

      const pos2D = new THREE.Vector2(x, z);
      let tooClose = false;
      for (const existing of placedPositions) {
        if (pos2D.distanceTo(existing) < minTreeSpacing) {
          tooClose = true;
          break;
        }
      }
      if (tooClose) continue;

      const terrain = terrainGen.sampleTerrain(x, z);
      const height = terrain.height;

      if (!Number.isFinite(height)) continue;
      if (terrain.isSubmerged) continue;
      if (height <= WATER_LEVEL + 1.0) continue;

      const distFromCenter = Math.sqrt(x * x + z * z);
      const distFromCoast = worldRadius - distFromCenter;
      if (distFromCoast < 60) continue;
      if (distFromCenter > worldRadius * 0.9) continue;

      if (height < FOREST_MIN_HEIGHT) continue;
      if (height > BOREAL_MAX_HEIGHT) continue;

      if (terrain.normal.y < 0.7) continue;

      const mountainMask = terrainGen.getMountainZoneMask(x, z);
      if (mountainMask > 0.7) continue;

      const densityNoise =
        (terrainGen as any).noise?.fbm2?.(
          x * 0.015,
          z * 0.015,
          2,
          0.5,
          2.0,
          1.0
        ) ?? 0;
      const forestDensity = 0.5 + densityNoise * 0.35;
      if (randDensity > forestDensity) continue;

      placedPositions.push(pos2D);

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

      const s = 0.7 + randScaleVar * 0.6;
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

    return result;
  }, [
    chunkX,
    chunkZ,
    seed,
    chunkRadius,
    passedTerrainGen,
    instancesPerChunk,
    minTreeSpacing,
    treeBounds,
  ]);

  // Physics trees near player
  const physicsTreesNearPlayer = useMemo(() => {
    if (!playerPosition) {
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

    placements.forEach((p) => {
      if (p.treeType === 'deciduous') deciduous.push(p);
      else if (p.treeType === 'conifer') conifer.push(p);
      else tropical.push(p);
    });

    return { deciduous, conifer, tropical };
  }, [placements]);

  if (placements.length === 0) {
    return null;
  }

  const { deciduous, conifer, tropical } = primitiveData;

  return (
    <group name={`chunk-trees-lod-${chunkX}-${chunkZ}`}>
      {/* Deciduous trees with LOD */}
      {placementsByType.deciduous.length > 0 && enableLOD && (
        <LODInstancedMesh
          treeType="deciduous"
          primitives={deciduous}
          placements={placementsByType.deciduous}
          lodDistances={lodDistances}
          camera={camera}
        />
      )}

      {/* Conifer trees with LOD */}
      {placementsByType.conifer.length > 0 && enableLOD && (
        <LODInstancedMesh
          treeType="conifer"
          primitives={conifer}
          placements={placementsByType.conifer}
          lodDistances={lodDistances}
          camera={camera}
        />
      )}

      {/* Tropical trees with LOD */}
      {placementsByType.tropical.length > 0 && enableLOD && (
        <LODInstancedMesh
          treeType="tropical"
          primitives={tropical}
          placements={placementsByType.tropical}
          lodDistances={lodDistances}
          camera={camera}
        />
      )}

      {/* Physics colliders */}
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
(ChunkTreesLOD as any).preload = () => {
  useGLTF.preload(TREE_MODELS.deciduous);
  useGLTF.preload(TREE_MODELS.conifer);
  useGLTF.preload(TREE_MODELS.tropical);
};

export default ChunkTreesLOD;
