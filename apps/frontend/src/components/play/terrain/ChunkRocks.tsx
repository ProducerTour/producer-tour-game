/**
 * ChunkRocks.tsx
 * Rock instances owned by a single terrain chunk
 * Places rocks in sand biomes (small pebbles) and grass biomes (larger boulders)
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

const DEBUG_ROCKS = false; // DISABLED for performance

export interface ChunkRocksProps {
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
  instancesPerChunk?: number;
  minRockSpacing?: number;
  /** Size multiplier for grass biome boulders (sand rocks stay small) */
  sizeMultiplier?: number;
  /** Size variation amount (0-1) */
  sizeVariation?: number;
}

function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

interface RockPlacement {
  position: THREE.Vector3;
  rotation: THREE.Euler;
  quaternion: THREE.Quaternion;
  scale: THREE.Vector3;
}

type GLTFResult = GLTF & {
  nodes: Record<string, THREE.Mesh | THREE.Object3D>;
  materials: Record<string, THREE.Material>;
  scene: THREE.Group;
};

export const ChunkRocks = React.memo(function ChunkRocks({
  chunkX,
  chunkZ,
  seed,
  chunkRadius,
  terrainGen: passedTerrainGen,
  instancesPerChunk = 8,
  minRockSpacing = 8,
  sizeMultiplier = 1.0,
  sizeVariation = 0.4,
}: ChunkRocksProps) {
  const gltf = useGLTF('/models/Rocks/rock_1.glb') as GLTFResult;

  // Configure materials
  useMemo(() => {
    gltf.scene.traverse((node) => {
      if ((node as THREE.Mesh).isMesh) {
        const mesh = node as THREE.Mesh;
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

        materials.forEach((mat) => {
          const m = mat as THREE.MeshStandardMaterial;
          if (m.map) {
            m.map.colorSpace = THREE.SRGBColorSpace;
            m.map.anisotropy = 4;
            m.map.generateMipmaps = true;
            m.map.minFilter = THREE.LinearMipmapLinearFilter;
            m.map.magFilter = THREE.LinearFilter;
            m.map.needsUpdate = true;
            // Matte rock surface
            m.roughness = 0.9;
            m.metalness = 0;
          }
          m.needsUpdate = true;
        });
      }
    });
  }, [gltf]);

  // Get the rock object
  const rockObject = useMemo(() => {
    let mainMesh: THREE.Object3D | null = null;
    gltf.scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh && !mainMesh) {
        mainMesh = child;
      }
    });
    return mainMesh || gltf.scene;
  }, [gltf.scene]);

  const rockBounds = useMemo(() => {
    return new THREE.Box3().setFromObject(rockObject);
  }, [rockObject]);

  // Generate rock placements - HEIGHT-BASED filtering
  const placements = useMemo(() => {
    if (!rockObject) return [];

    // Use passed terrainGen (has hydrology) or create fallback (no hydrology)
    const terrainGen = passedTerrainGen ?? new TerrainGenerator(seed, chunkRadius);
    const origin = getChunkOrigin(chunkX, chunkZ);
    const chunkSeed = seed + chunkX * 3000 + chunkZ + 555555;
    const worldRadius = (chunkRadius ?? 5) * CHUNK_SIZE;

    const result: RockPlacement[] = [];
    const placedPositions: THREE.Vector2[] = [];

    // HEIGHT-BASED ZONES
    const beachMinHeight = 2;    // Just above water
    const beachMaxHeight = 8;    // Dune zone
    const grassMinHeight = 8;    // Forest zone
    const grassMaxHeight = 35;   // Below mountain peaks

    let rejections = { height: 0, distance: 0, slope: 0, spacing: 0, density: 0, river: 0, lake: 0, mountain: 0, total: 0 };

    for (let i = 0; i < instancesPerChunk * 5; i++) {
      rejections.total++;
      const randX = seededRandom(chunkSeed + i * 13);
      const randZ = seededRandom(chunkSeed + i * 13 + 1);
      const randRotX = seededRandom(chunkSeed + i * 13 + 2);
      const randRotY = seededRandom(chunkSeed + i * 13 + 3);
      const randRotZ = seededRandom(chunkSeed + i * 13 + 4);
      const randScaleVar = seededRandom(chunkSeed + i * 13 + 5);
      const randDensity = seededRandom(chunkSeed + i * 13 + 6);

      const x = origin.x + randX * CHUNK_SIZE;
      const z = origin.z + randZ * CHUNK_SIZE;
      const pos2D = new THREE.Vector2(x, z);

      const terrain = terrainGen.sampleTerrain(x, z);
      const height = terrain.height;

      // Skip invalid heights
      if (!Number.isFinite(height)) continue;

      // =================================================================
      // RUST-STYLE TOPOLOGY: Skip ALL submerged areas (rivers, lakes, underwater)
      // Uses single flag from TerrainSample for reliable water detection
      // =================================================================
      if (terrain.isSubmerged) { rejections.lake++; continue; }

      // Additional safety margin above water level (rocks need clearance)
      if (height < WATER_LEVEL + 2) { rejections.height++; continue; }

      // =================================================================
      // DISTANCE-BASED FILTERING
      // =================================================================
      const distFromCenter = Math.sqrt(x * x + z * z);
      if (distFromCenter > worldRadius * 0.88) { rejections.distance++; continue; }

      // =================================================================
      // SLOPE FILTERING: Rocks on stable terrain
      // =================================================================
      if (terrain.normal.y < 0.7) { rejections.slope++; continue; }

      // =================================================================
      // MOUNTAIN FILTERING: Skip high mountain zones
      // =================================================================
      const mountainMask = terrainGen.getMountainZoneMask(x, z);
      if (mountainMask > 0.65) { rejections.mountain++; continue; }

      // =================================================================
      // HEIGHT-BASED ZONE DETERMINATION
      // =================================================================
      const distFromCoast = worldRadius - distFromCenter;
      const isBeachZone = distFromCoast < 60 && height >= beachMinHeight && height < beachMaxHeight;
      const isGrassZone = distFromCoast >= 60 && height >= grassMinHeight && height < grassMaxHeight;

      if (!isBeachZone && !isGrassZone) { rejections.height++; continue; }

      // Different spacing for each zone
      const effectiveSpacing = isGrassZone ? minRockSpacing * 2.5 : minRockSpacing;
      let tooClose = false;
      for (const existing of placedPositions) {
        if (pos2D.distanceTo(existing) < effectiveSpacing) {
          tooClose = true;
          break;
        }
      }
      if (tooClose) { rejections.spacing++; continue; }

      // Probabilistic filtering
      if (isBeachZone) {
        if (randDensity > 0.5) { rejections.density++; continue; }
      } else {
        if (randDensity > 0.25) { rejections.density++; continue; }
      }

      if (placedPositions.length >= instancesPerChunk) break;
      placedPositions.push(pos2D);

      // Scale based on zone
      let baseScale: number;
      if (isBeachZone) {
        baseScale = 0.02 + randScaleVar * 0.03;
      } else {
        const randSize = seededRandom(chunkSeed + i * 13 + 7);
        const isFullSize = randSize < 0.8;
        if (isFullSize) {
          baseScale = (0.08 + randScaleVar * 0.10 * sizeVariation) * sizeMultiplier;
        } else {
          baseScale = (0.04 + randScaleVar * 0.04) * sizeMultiplier;
        }
      }

      const rockHeight = (rockBounds.max.y - rockBounds.min.y) * baseScale;
      const y = terrain.height + rockHeight * 0.2;

      const rotation = new THREE.Euler(
        (randRotX - 0.5) * 0.3,
        randRotY * Math.PI * 2,
        (randRotZ - 0.5) * 0.3
      );
      const quaternion = new THREE.Quaternion().setFromEuler(rotation);

      result.push({
        position: new THREE.Vector3(x, y, z),
        rotation,
        quaternion,
        scale: new THREE.Vector3(baseScale, baseScale, baseScale),
      });
    }

    if (DEBUG_ROCKS) {
      console.log(`🪨 Chunk [${chunkX},${chunkZ}]: ${result.length} rocks placed. Rejections:`, rejections);
    }

    return result;
  }, [chunkX, chunkZ, seed, chunkRadius, passedTerrainGen, instancesPerChunk, rockObject, rockBounds, minRockSpacing, sizeMultiplier, sizeVariation]);

  // Extract geometry and material from rock mesh for instancing
  const { geometry, material } = useMemo(() => {
    let geo: THREE.BufferGeometry | null = null;
    let mat: THREE.Material | null = null;

    rockObject.traverse((node) => {
      if ((node as THREE.Mesh).isMesh && !geo) {
        const mesh = node as THREE.Mesh;
        geo = mesh.geometry;
        mat = mesh.material as THREE.Material;
      }
    });

    return { geometry: geo, material: mat };
  }, [rockObject]);

  // Ref for the instanced mesh
  const instancedMeshRef = useRef<THREE.InstancedMesh>(null);

  // Update instance matrices
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
    instancedMeshRef.current.computeBoundingSphere();
  }, [placements]);

  // Separate boulders for physics (visual handled by InstancedMesh)
  // Higher threshold = fewer physics bodies = better FPS
  const BOULDER_THRESHOLD = 0.15;
  const boulders = useMemo(() =>
    placements.filter(p => p.scale.x >= BOULDER_THRESHOLD),
    [placements]
  );

  // Don't render if no geometry
  if (!geometry || !material || placements.length === 0) {
    return null;
  }

  return (
    <group name={`chunk-rocks-${chunkX}-${chunkZ}`}>
      {/* Single instanced mesh for ALL rocks (1 draw call instead of many) */}
      <instancedMesh
        ref={instancedMeshRef}
        args={[geometry, material, Math.min(placements.length, 100)]}
        frustumCulled={true}
        castShadow={false}
        receiveShadow={false}
      />

      {/* Physics colliders only for large boulders (invisible) */}
      {boulders.map((placement, i) => {
        const scale = placement.scale.x;
        const colliderRadius = scale * 2.5 * 0.7;
        const colliderHeight = scale * 3 * 0.7;

        return (
          <RigidBody
            key={`boulder-${i}`}
            type="fixed"
            position={[placement.position.x, placement.position.y, placement.position.z]}
            colliders={false}
          >
            <CylinderCollider args={[colliderHeight / 2, colliderRadius]} />
          </RigidBody>
        );
      })}
    </group>
  );
});

(ChunkRocks as any).preload = () => {
  useGLTF.preload('/models/Rocks/rock_1.glb');
};

export default ChunkRocks;
