/**
 * ChunkPalmTrees.tsx
 * Palm tree instances owned by a single terrain chunk
 * Places palm trees in sand biomes (beaches, desert edges)
 */

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { SkeletonUtils } from 'three-stdlib';
import type { GLTF } from 'three-stdlib';
import {
  TerrainGenerator,
  CHUNK_SIZE,
  getChunkOrigin,
  WATER_LEVEL,
  WORLD_PLAY_RADIUS,
} from '../../../lib/terrain';

const DEBUG_PALM_TREES = false; // DISABLED for performance

export interface ChunkPalmTreesProps {
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
  minTreeSpacing?: number;
}

function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

interface TreePlacement {
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: THREE.Vector3;
}

type GLTFResult = GLTF & {
  nodes: Record<string, THREE.Mesh | THREE.Object3D>;
  materials: Record<string, THREE.Material>;
  scene: THREE.Group;
};

export const ChunkPalmTrees = React.memo(function ChunkPalmTrees({
  chunkX,
  chunkZ,
  seed,
  chunkRadius,
  terrainGen: passedTerrainGen,
  instancesPerChunk = 4,
  minTreeSpacing = 12,
}: ChunkPalmTreesProps) {
  const gltf = useGLTF('/models/Foliage/Trees/palm_tree.glb') as GLTFResult;

  // Configure materials
  useMemo(() => {
    gltf.scene.traverse((node) => {
      if ((node as THREE.Mesh).isMesh) {
        const mesh = node as THREE.Mesh;
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

        materials.forEach((mat) => {
          const m = mat as THREE.MeshStandardMaterial;
          m.side = THREE.DoubleSide;

          if (m.map) {
            m.alphaTest = 0.5;
            m.transparent = false;
            m.depthWrite = true;
            m.map.colorSpace = THREE.SRGBColorSpace;
            m.map.anisotropy = 8;
            m.map.generateMipmaps = true;
            m.map.minFilter = THREE.LinearMipmapLinearFilter;
            m.map.magFilter = THREE.LinearFilter;
            m.map.needsUpdate = true;
            // Matte tropical leaves
            m.roughness = 0.85;
            m.metalness = 0;
          }
          m.needsUpdate = true;
        });
      }
    });
  }, [gltf]);

  // Get the palm tree object
  const palmTreeObject = useMemo(() => {
    // Find the main mesh
    let mainMesh: THREE.Object3D | null = null;
    gltf.scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh && !mainMesh) {
        mainMesh = child;
      }
    });
    return mainMesh || gltf.scene;
  }, [gltf.scene]);

  const treeBounds = useMemo(() => {
    return new THREE.Box3().setFromObject(palmTreeObject);
  }, [palmTreeObject]);

  // Generate palm tree placements for beach zones (Rust-style: near coast)
  // NOTE: Uses HEIGHT-BASED filtering, NOT biome lookup (which is unreliable)
  const placements = useMemo(() => {
    if (!palmTreeObject) return [];

    // Use passed terrainGen (has hydrology) or create fallback (no hydrology)
    const terrainGen = passedTerrainGen ?? new TerrainGenerator(seed, chunkRadius);
    const origin = getChunkOrigin(chunkX, chunkZ);
    const chunkSeed = seed + chunkX * 2000 + chunkZ + 777777;

    const result: TreePlacement[] = [];
    const placedPositions: THREE.Vector2[] = [];

    // CRITICAL: Palm trees use HEIGHT-BASED placement, not biome lookup
    // Beach heights: 0.5m to 8m (water level to above dunes)
    const minPalmHeight = WATER_LEVEL + 0.5;  // Just above waterline
    const maxPalmHeight = 10;  // Extended range for dune/grass transition

    const worldRadius = chunkRadius ? chunkRadius * CHUNK_SIZE : WORLD_PLAY_RADIUS;

    // Debug: track rejection reasons
    let rejections = { height: 0, distance: 0, slope: 0, spacing: 0, density: 0, river: 0, lake: 0, total: 0 };

    for (let i = 0; i < instancesPerChunk * 6; i++) {  // More attempts
      rejections.total++;
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
      if (tooClose) { rejections.spacing++; continue; }

      // Sample terrain (height only, skip biome check)
      const terrain = terrainGen.sampleTerrain(x, z);
      const height = terrain.height;

      // Skip invalid heights
      if (!Number.isFinite(height)) continue;

      // =================================================================
      // RUST-STYLE TOPOLOGY: Skip ALL submerged areas (rivers, lakes, underwater)
      // Uses single flag from TerrainSample for reliable water detection
      // =================================================================
      if (terrain.isSubmerged) { rejections.lake++; continue; }

      // =================================================================
      // DISTANCE-BASED FILTERING: Palm trees near coast ONLY
      // This is the PRIMARY filter - palm trees are a coastal feature
      // =================================================================
      const distFromCenter = Math.sqrt(x * x + z * z);
      const distFromCoast = worldRadius - distFromCenter;

      // Palm trees only within 100m of coastline
      if (distFromCoast < 3) { rejections.distance++; continue; }    // Not in water
      if (distFromCoast > 100) { rejections.distance++; continue; }  // Not too far inland

      // =================================================================
      // HEIGHT-BASED FILTERING: Beach/dune elevation zone
      // =================================================================
      if (height < minPalmHeight) { rejections.height++; continue; }
      if (height > maxPalmHeight) { rejections.height++; continue; }

      // =================================================================
      // SLOPE FILTERING: Gentle terrain only
      // =================================================================
      if (terrain.normal.y < 0.8) { rejections.slope++; continue; }

      // =================================================================
      // DENSITY VARIATION: Natural clumping (less strict)
      // =================================================================
      const densityNoise = (terrainGen as any).noise?.fbm2?.(x * 0.02, z * 0.02, 2, 0.5, 2.0, 1.0) ?? 0;
      const palmDensity = 0.7 + densityNoise * 0.3;  // Higher base density
      if (randDensity > palmDensity) { rejections.density++; continue; }

      if (placedPositions.length >= instancesPerChunk) break;
      placedPositions.push(pos2D);

      // Place at ground level
      const y = height - treeBounds.min.y - 0.05;

      // Scale variation
      const s = 0.5 + randScaleVar * 0.5;

      result.push({
        position: new THREE.Vector3(x, y, z),
        rotation: new THREE.Euler(0, randRot * Math.PI * 2, 0),
        scale: new THREE.Vector3(s, s, s),
      });
    }

    if (DEBUG_PALM_TREES) {
      console.log(`🌴 Chunk [${chunkX},${chunkZ}]: ${result.length} palm trees placed. Rejections:`, rejections);
      if (result.length > 0) {
        console.log(`  First palm at: (${result[0].position.x.toFixed(1)}, ${result[0].position.y.toFixed(1)}, ${result[0].position.z.toFixed(1)})`);
      }
    }

    return result;
  }, [chunkX, chunkZ, seed, chunkRadius, passedTerrainGen, instancesPerChunk, palmTreeObject, treeBounds, minTreeSpacing]);

  // Create cloned instances
  // NOTE: This hook must run unconditionally (before any early returns) to satisfy React's rules of hooks
  const treeInstances = useMemo(() => {
    if (placements.length === 0) return [];

    return placements.map((placement) => {
      const clone = SkeletonUtils.clone(palmTreeObject);

      clone.position.copy(placement.position);
      clone.rotation.copy(placement.rotation);
      clone.scale.copy(placement.scale);

      clone.traverse((node) => {
        if ((node as THREE.Mesh).isMesh) {
          const mesh = node as THREE.Mesh;
          mesh.castShadow = true;
          mesh.receiveShadow = true;

          const m = mesh.material as THREE.MeshStandardMaterial;
          if (m.map) {
            m.alphaTest = 0.5;
            m.transparent = false;
            m.depthWrite = true;
            m.side = THREE.DoubleSide;
            m.map.anisotropy = 8;
            m.roughness = 0.85;
            m.metalness = 0;
          }
        }
      });

      return clone;
    });
  }, [placements, palmTreeObject]);

  // Don't render if no trees
  if (treeInstances.length === 0) {
    return null;
  }

  return (
    <group name={`chunk-palm-trees-${chunkX}-${chunkZ}`}>
      {treeInstances.map((tree, i) => (
        <primitive key={i} object={tree} />
      ))}
    </group>
  );
});

(ChunkPalmTrees as any).preload = () => {
  useGLTF.preload('/models/Foliage/Trees/palm_tree.glb');
};

export default ChunkPalmTrees;
