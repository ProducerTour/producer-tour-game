/**
 * ChunkBushes.tsx
 * OPTIMIZED: Uses InstancedMesh for bush undergrowth in forest biomes
 *
 * PERFORMANCE:
 * - Draw calls per chunk: 5 bush types × N primitives each
 * - ~100-900 triangles per bush (very lightweight)
 * - Static geometry optimizations (matrixAutoUpdate = false)
 *
 * Bush Types by Biome:
 * - bush-01, bush-02: Dense bushes for temperate forest
 * - bush-03, bush-04: Leafy bushes for mixed forest
 * - bush-05: Sparse bush for forest edges
 */

import React, { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import type { GLTF } from 'three-stdlib';
import {
  TerrainGenerator,
  CHUNK_SIZE,
  getChunkOrigin,
  WATER_LEVEL,
} from '../../../lib/terrain';
import { LAYERS } from '../constants/layers';

const DEBUG_BUSHES = false;

// LOD distance for bush rendering (bushes fade out earlier than trees)
const BUSH_LOD_CULL = 80;

// Maximum bushes per chunk per type
const MAX_BUSHES_PER_TYPE = 10;

// Bush model paths
const BUSH_MODELS = {
  dense1: '/models/Foliage/Trees/lowpoly/bush-01.glb',
  dense2: '/models/Foliage/Trees/lowpoly/bush-02.glb',
  leafy1: '/models/Foliage/Trees/lowpoly/bush-03.glb',
  leafy2: '/models/Foliage/Trees/lowpoly/bush-04.glb',
  sparse: '/models/Foliage/Trees/lowpoly/bush-05.glb',
} as const;

export interface ChunkBushesProps {
  chunkX: number;
  chunkZ: number;
  seed: number;
  chunkRadius?: number;
  terrainGen?: TerrainGenerator;
  instancesPerChunk?: number;
  minBushSpacing?: number;
  playerPosition?: { x: number; z: number };
}

function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

type BushType = 'dense1' | 'dense2' | 'leafy1' | 'leafy2' | 'sparse';

interface BushPlacement {
  position: THREE.Vector3;
  rotation: number;
  scale: number;
  bushType: BushType;
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
 * Extract ALL primitives (geometry + material pairs) from a bush model
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

export const ChunkBushes = React.memo(function ChunkBushes({
  chunkX,
  chunkZ,
  seed,
  chunkRadius,
  terrainGen: passedTerrainGen,
  instancesPerChunk = 15,
  minBushSpacing = 4,
  playerPosition,
}: ChunkBushesProps) {
  // Refs for InstancedMesh arrays (one per primitive per bush type)
  const dense1MeshRefs = useRef<(THREE.InstancedMesh | null)[]>([]);
  const dense2MeshRefs = useRef<(THREE.InstancedMesh | null)[]>([]);
  const leafy1MeshRefs = useRef<(THREE.InstancedMesh | null)[]>([]);
  const leafy2MeshRefs = useRef<(THREE.InstancedMesh | null)[]>([]);
  const sparseMeshRefs = useRef<(THREE.InstancedMesh | null)[]>([]);

  // Load bush models (cached by drei)
  const dense1Gltf = useGLTF(BUSH_MODELS.dense1) as GLTFResult;
  const dense2Gltf = useGLTF(BUSH_MODELS.dense2) as GLTFResult;
  const leafy1Gltf = useGLTF(BUSH_MODELS.leafy1) as GLTFResult;
  const leafy2Gltf = useGLTF(BUSH_MODELS.leafy2) as GLTFResult;
  const sparseGltf = useGLTF(BUSH_MODELS.sparse) as GLTFResult;

  // Extract all primitives from each model
  const primitiveData = useMemo(() => {
    const dense1 = extractAllPrimitives(dense1Gltf.scene);
    const dense2 = extractAllPrimitives(dense2Gltf.scene);
    const leafy1 = extractAllPrimitives(leafy1Gltf.scene);
    const leafy2 = extractAllPrimitives(leafy2Gltf.scene);
    const sparse = extractAllPrimitives(sparseGltf.scene);

    // Configure materials
    [...dense1, ...dense2, ...leafy1, ...leafy2, ...sparse].forEach((p) => {
      configureFoliageMaterial(p.material);
    });

    if (DEBUG_BUSHES) {
      console.log('🌿 Bush primitives loaded:', {
        dense1: dense1.length,
        dense2: dense2.length,
        leafy1: leafy1.length,
        leafy2: leafy2.length,
        sparse: sparse.length,
      });
    }

    return { dense1, dense2, leafy1, leafy2, sparse };
  }, [dense1Gltf.scene, dense2Gltf.scene, leafy1Gltf.scene, leafy2Gltf.scene, sparseGltf.scene]);

  // Compute bounds for each bush type for proper ground placement
  const bushBounds = useMemo(() => {
    return {
      dense1: new THREE.Box3().setFromObject(dense1Gltf.scene),
      dense2: new THREE.Box3().setFromObject(dense2Gltf.scene),
      leafy1: new THREE.Box3().setFromObject(leafy1Gltf.scene),
      leafy2: new THREE.Box3().setFromObject(leafy2Gltf.scene),
      sparse: new THREE.Box3().setFromObject(sparseGltf.scene),
    };
  }, [dense1Gltf.scene, dense2Gltf.scene, leafy1Gltf.scene, leafy2Gltf.scene, sparseGltf.scene]);

  // Generate bush placements for this chunk
  const placements = useMemo(() => {
    const terrainGen = passedTerrainGen ?? new TerrainGenerator(seed, chunkRadius);
    const origin = getChunkOrigin(chunkX, chunkZ);
    const chunkSeed = seed + chunkX * 3000 + chunkZ + 555555;

    const result: BushPlacement[] = [];
    const placedPositions: THREE.Vector2[] = [];

    // Height zones for bushes (forest floor)
    const BUSH_MIN_HEIGHT = 10;
    const BUSH_MAX_HEIGHT = 60;

    const worldRadius = (chunkRadius ?? 5) * CHUNK_SIZE;
    const maxAttempts = instancesPerChunk * 4;

    for (let i = 0; i < maxAttempts && result.length < instancesPerChunk; i++) {
      const randX = seededRandom(chunkSeed + i * 13);
      const randZ = seededRandom(chunkSeed + i * 13 + 1);
      const randRot = seededRandom(chunkSeed + i * 13 + 2);
      const randScaleVar = seededRandom(chunkSeed + i * 13 + 3);
      const randDensity = seededRandom(chunkSeed + i * 13 + 4);
      const randBushType = seededRandom(chunkSeed + i * 13 + 5);

      const x = origin.x + randX * CHUNK_SIZE;
      const z = origin.z + randZ * CHUNK_SIZE;

      // Check minimum spacing
      const pos2D = new THREE.Vector2(x, z);
      let tooClose = false;
      for (const existing of placedPositions) {
        if (pos2D.distanceTo(existing) < minBushSpacing) {
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
      if (height <= WATER_LEVEL + 2.0) continue;

      // Distance checks
      const distFromCenter = Math.sqrt(x * x + z * z);
      const distFromCoast = worldRadius - distFromCenter;
      if (distFromCoast < 80) continue;
      if (distFromCenter > worldRadius * 0.85) continue;

      // Height bounds for bushes
      if (height < BUSH_MIN_HEIGHT) continue;
      if (height > BUSH_MAX_HEIGHT) continue;

      // Slope check - bushes prefer flat ground
      if (terrain.normal.y < 0.75) continue;

      // Mountain zone check
      const mountainMask = terrainGen.getMountainZoneMask(x, z);
      if (mountainMask > 0.5) continue;

      // Density variation - bushes cluster more than trees
      const densityNoise = (terrainGen as any).noise?.fbm2?.(x * 0.03, z * 0.03, 2, 0.5, 2.0, 1.0) ?? 0;
      const bushDensity = 0.4 + densityNoise * 0.4;
      if (randDensity > bushDensity) continue;

      placedPositions.push(pos2D);

      // Select bush type with weighted distribution
      let bushType: BushType;
      if (randBushType < 0.25) {
        bushType = 'dense1';
      } else if (randBushType < 0.45) {
        bushType = 'dense2';
      } else if (randBushType < 0.65) {
        bushType = 'leafy1';
      } else if (randBushType < 0.85) {
        bushType = 'leafy2';
      } else {
        bushType = 'sparse';
      }

      // Scale variation (0.5x to 1.2x for variety)
      const s = 0.5 + randScaleVar * 0.7;

      // Get bounds for this bush type and compute proper Y position
      // Offset by -bounds.min.y to ensure base is at ground level, then embed slightly
      const bounds = bushBounds[bushType];
      const yOffset = bounds ? -bounds.min.y * s - 0.05 : 0;
      const y = height + yOffset;

      result.push({
        position: new THREE.Vector3(x, y, z),
        rotation: randRot * Math.PI * 2,
        scale: s,
        bushType,
      });
    }

    if (DEBUG_BUSHES && result.length > 0) {
      const counts = { dense1: 0, dense2: 0, leafy1: 0, leafy2: 0, sparse: 0 };
      result.forEach((p) => counts[p.bushType]++);
      console.log(`🌿 Chunk [${chunkX},${chunkZ}]: ${result.length} bushes`, counts);
    }

    return result;
  }, [chunkX, chunkZ, seed, chunkRadius, passedTerrainGen, instancesPerChunk, minBushSpacing, bushBounds]);

  // Filter by LOD distance
  const visiblePlacements = useMemo(() => {
    if (!playerPosition) return placements;

    return placements.filter((p) => {
      const dx = p.position.x - playerPosition.x;
      const dz = p.position.z - playerPosition.z;
      const distSq = dx * dx + dz * dz;
      return distSq < BUSH_LOD_CULL * BUSH_LOD_CULL;
    });
  }, [placements, playerPosition]);

  // Separate placements by bush type
  const placementsByType = useMemo(() => {
    const dense1: BushPlacement[] = [];
    const dense2: BushPlacement[] = [];
    const leafy1: BushPlacement[] = [];
    const leafy2: BushPlacement[] = [];
    const sparse: BushPlacement[] = [];

    visiblePlacements.forEach((p) => {
      if (p.bushType === 'dense1') dense1.push(p);
      else if (p.bushType === 'dense2') dense2.push(p);
      else if (p.bushType === 'leafy1') leafy1.push(p);
      else if (p.bushType === 'leafy2') leafy2.push(p);
      else sparse.push(p);
    });

    return { dense1, dense2, leafy1, leafy2, sparse };
  }, [visiblePlacements]);

  // Update instance matrices for all primitives of each bush type
  useEffect(() => {
    const updateMeshes = (
      meshRefs: React.MutableRefObject<(THREE.InstancedMesh | null)[]>,
      bushPlacements: BushPlacement[]
    ) => {
      const count = Math.min(bushPlacements.length, MAX_BUSHES_PER_TYPE);

      meshRefs.current.forEach((mesh) => {
        if (!mesh) return;

        for (let i = 0; i < count; i++) {
          const p = bushPlacements[i];

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

    updateMeshes(dense1MeshRefs, placementsByType.dense1);
    updateMeshes(dense2MeshRefs, placementsByType.dense2);
    updateMeshes(leafy1MeshRefs, placementsByType.leafy1);
    updateMeshes(leafy2MeshRefs, placementsByType.leafy2);
    updateMeshes(sparseMeshRefs, placementsByType.sparse);
  }, [placementsByType]);

  // Early return if no placements
  if (visiblePlacements.length === 0) {
    return null;
  }

  const { dense1, dense2, leafy1, leafy2, sparse } = primitiveData;

  // Helper to render all primitives for a bush type
  const renderBushType = (
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
        args={[prim.geometry, prim.material, MAX_BUSHES_PER_TYPE]}
        frustumCulled
        receiveShadow
      />
    ));
  };

  return (
    <group name={`chunk-bushes-${chunkX}-${chunkZ}`}>
      {/* Dense bushes type 1 */}
      {renderBushType(dense1, dense1MeshRefs, placementsByType.dense1.length, 'dense1')}

      {/* Dense bushes type 2 */}
      {renderBushType(dense2, dense2MeshRefs, placementsByType.dense2.length, 'dense2')}

      {/* Leafy bushes type 1 */}
      {renderBushType(leafy1, leafy1MeshRefs, placementsByType.leafy1.length, 'leafy1')}

      {/* Leafy bushes type 2 */}
      {renderBushType(leafy2, leafy2MeshRefs, placementsByType.leafy2.length, 'leafy2')}

      {/* Sparse bushes */}
      {renderBushType(sparse, sparseMeshRefs, placementsByType.sparse.length, 'sparse')}
    </group>
  );
});

// Preload all bush models
(ChunkBushes as any).preload = () => {
  useGLTF.preload(BUSH_MODELS.dense1);
  useGLTF.preload(BUSH_MODELS.dense2);
  useGLTF.preload(BUSH_MODELS.leafy1);
  useGLTF.preload(BUSH_MODELS.leafy2);
  useGLTF.preload(BUSH_MODELS.sparse);
};

export default ChunkBushes;
