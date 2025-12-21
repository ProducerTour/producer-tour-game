/**
 * ChunkTrees.tsx
 * Tree instances owned by a single terrain chunk
 * Places trees in grass biomes with natural distribution
 * Uses Clone for proper material/texture preservation
 */

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { RigidBody, CylinderCollider } from '@react-three/rapier';
import { SkeletonUtils } from 'three-stdlib';
import type { GLTF } from 'three-stdlib';
import {
  TerrainGenerator,
  CHUNK_SIZE,
  getChunkOrigin,
  WATER_LEVEL,
} from '../../../lib/terrain';

// Debug logging
const DEBUG_TREES = false; // DISABLED for performance

export interface ChunkTreesProps {
  /** Chunk X coordinate (grid index, not world position) */
  chunkX: number;

  /** Chunk Z coordinate (grid index, not world position) */
  chunkZ: number;

  /** World seed for terrain/biome sampling */
  seed: number;

  /** Chunk radius for terrain bounds calculation */
  chunkRadius?: number;

  /**
   * Pre-initialized TerrainGenerator with hydrology attached.
   * Pass this from StaticTerrain to ensure river/lake detection works.
   * If not provided, creates a new instance (without hydrology - rivers/lakes won't be detected)
   */
  terrainGen?: TerrainGenerator;

  /** Tree instances per chunk (before biome filtering) - much lower than grass */
  instancesPerChunk?: number;

  /** Enable subtle wind sway animation (not implemented yet) */
  windEnabled?: boolean;

  /** Wind strength (trees sway less than grass) */
  windStrength?: number;

  /** Minimum distance between trees (meters) */
  minTreeSpacing?: number;
}

// Seeded random for deterministic tree placement
function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// Tree placement data
interface TreePlacement {
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: THREE.Vector3;
  treeIndex: number;
}

type GLTFResult = GLTF & {
  nodes: Record<string, THREE.Mesh | THREE.Object3D>;
  materials: Record<string, THREE.Material>;
  scene: THREE.Group;
};

export const ChunkTrees = React.memo(function ChunkTrees({
  chunkX,
  chunkZ,
  seed,
  chunkRadius,
  terrainGen: passedTerrainGen,
  instancesPerChunk = 8,
  windEnabled: _windEnabled = true,
  windStrength: _windStrength = 0.5,
  minTreeSpacing = 8,
}: ChunkTreesProps) {
  // Load oak tree model (cached by drei)
  const gltf = useGLTF('/models/Foliage/Trees/oak_trees.glb') as GLTFResult;

  // Configure materials on the source GLTF (cached, so this runs once)
  useMemo(() => {
    gltf.scene.traverse((node) => {
      if ((node as THREE.Mesh).isMesh) {
        const mesh = node as THREE.Mesh;
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

        materials.forEach((mat) => {
          const m = mat as THREE.MeshStandardMaterial;
          const isLeafMaterial = m.name?.toLowerCase().includes('material') ||
                                  mesh.name.toLowerCase().includes('leaves');

          if (m.map) {
            // Fix alpha/mipmap bleed on cutout foliage
            m.alphaTest = 0.5;
            m.transparent = false;
            m.depthWrite = true;
            m.side = THREE.DoubleSide;
            m.map.colorSpace = THREE.SRGBColorSpace;
            m.map.anisotropy = 8;
            m.map.generateMipmaps = true;
            m.map.minFilter = THREE.LinearMipmapLinearFilter;
            m.map.magFilter = THREE.LinearFilter;
            m.map.needsUpdate = true;
            // Make completely matte (no reflections)
            m.roughness = 1.0;
            m.metalness = 0;

            // Tint leaves green (overrides pale/white texture)
            if (isLeafMaterial) {
              m.color = new THREE.Color(0.15, 0.45, 0.12); // Forest green
            }
          }
          m.needsUpdate = true;
        });
      }
    });
  }, [gltf]);

  // Find tree objects to clone (static meshes - "tree" contains trunk + leaves as child)
  const treeObjects = useMemo(() => {
    const trees: THREE.Object3D[] = [];

    // Find "tree" mesh which has "leaves" as child (trunk + leaves together)
    gltf.scene.traverse((child) => {
      if (child.name === 'tree') {
        trees.push(child);
      }
    });

    // Fallback: use entire scene if no tree meshes found
    if (trees.length === 0) {
      trees.push(gltf.scene);
    }

    return trees;
  }, [gltf.scene]);

  // Get bounding boxes for placement
  const treeBounds = useMemo(() => {
    return treeObjects.map((tree) => new THREE.Box3().setFromObject(tree));
  }, [treeObjects]);

  // Generate tree placements for this chunk
  // NOTE: Uses HEIGHT + DISTANCE filtering (not biome lookup) for reliability
  const placements = useMemo(() => {
    if (treeObjects.length === 0 || treeBounds.length === 0) return [];

    // Use passed terrainGen (has hydrology) or create fallback (no hydrology)
    const terrainGen = passedTerrainGen ?? new TerrainGenerator(seed, chunkRadius);
    const origin = getChunkOrigin(chunkX, chunkZ);
    const chunkSeed = seed + chunkX * 1000 + chunkZ + 999999;

    const result: TreePlacement[] = [];
    const placedPositions: THREE.Vector2[] = [];

    // HEIGHT-BASED FILTERING:
    // Oak trees grow in the "forest zone" - above beach, below mountain peaks
    const minTreeHeight = 8;   // Above beach/dune zone
    const maxTreeHeight = 45;  // Below high mountain peaks

    const worldRadius = (chunkRadius ?? 5) * CHUNK_SIZE;

    // Debug: track rejection reasons
    let rejections = { height: 0, distance: 0, slope: 0, spacing: 0, density: 0, river: 0, lake: 0, mountain: 0, total: 0 };

    for (let i = 0; i < instancesPerChunk * 4; i++) {
      rejections.total++;
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
      if (tooClose) { rejections.spacing++; continue; }

      // Sample terrain
      const terrain = terrainGen.sampleTerrain(x, z);
      const height = terrain.height;

      // Skip invalid heights
      if (!Number.isFinite(height)) continue;

      // =================================================================
      // RUST-STYLE TOPOLOGY: Skip ALL submerged areas (rivers, lakes, underwater)
      // Uses single flag from TerrainSample for reliable water detection
      // =================================================================
      if (terrain.isSubmerged) { rejections.lake++; continue; }

      // Additional safety margin above water level
      if (height <= WATER_LEVEL + 1.0) { rejections.lake++; continue; }

      // =================================================================
      // DISTANCE-BASED FILTERING: Trees NOT on coast
      // =================================================================
      const distFromCenter = Math.sqrt(x * x + z * z);
      const distFromCoast = worldRadius - distFromCenter;

      // Oak trees must be INLAND (not in beach zone)
      if (distFromCoast < 80) { rejections.distance++; continue; }  // Not too close to coast
      if (distFromCenter > worldRadius * 0.85) { rejections.distance++; continue; }  // Not in ocean

      // =================================================================
      // HEIGHT-BASED FILTERING: Forest elevation zone
      // =================================================================
      if (height < minTreeHeight) { rejections.height++; continue; }
      if (height > maxTreeHeight) { rejections.height++; continue; }

      // =================================================================
      // SLOPE FILTERING: Trees can't grow on steep cliffs
      // =================================================================
      if (terrain.normal.y < 0.75) { rejections.slope++; continue; }  // ~42 degrees max

      // =================================================================
      // MOUNTAIN ZONE FILTERING: Reduce density in rocky areas
      // =================================================================
      const mountainMask = terrainGen.getMountainZoneMask(x, z);
      if (mountainMask > 0.6) { rejections.mountain++; continue; }

      // =================================================================
      // DENSITY VARIATION: Natural forest distribution
      // =================================================================
      const densityNoise = (terrainGen as any).noise?.fbm2?.(x * 0.02, z * 0.02, 2, 0.5, 2.0, 1.0) ?? 0;
      const forestDensity = 0.6 + densityNoise * 0.3;  // Higher base density
      if (randDensity > forestDensity) { rejections.density++; continue; }

      if (placedPositions.length >= instancesPerChunk) break;
      placedPositions.push(pos2D);

      // Select tree variant
      const treeIndex = Math.floor(randTreeType * treeObjects.length);
      const bounds = treeBounds[treeIndex];

      // Place at ground level (slightly embedded)
      const y = height - bounds.min.y - 0.1;

      // Scale variation (0.4x to 0.8x)
      const s = 0.4 + randScaleVar * 0.4;

      result.push({
        position: new THREE.Vector3(x, y, z),
        rotation: new THREE.Euler(0, randRot * Math.PI * 2, 0),
        scale: new THREE.Vector3(s, s, s),
        treeIndex,
      });
    }

    if (DEBUG_TREES) {
      console.log(`🌳 Chunk [${chunkX},${chunkZ}]: ${result.length} trees placed. Rejections:`, rejections);
    }

    return result;
  }, [chunkX, chunkZ, seed, chunkRadius, passedTerrainGen, instancesPerChunk, treeObjects, treeBounds, minTreeSpacing]);

  // Create cloned tree instances with proper material preservation
  // NOTE: This hook must run unconditionally (before any early returns) to satisfy React's rules of hooks
  const treeInstances = useMemo(() => {
    if (placements.length === 0) return [];

    // Build a map of original mesh names to their materials
    const materialMap = new Map<string, THREE.Material | THREE.Material[]>();
    treeObjects.forEach((tree) => {
      tree.traverse((node) => {
        if ((node as THREE.Mesh).isMesh) {
          const mesh = node as THREE.Mesh;
          materialMap.set(mesh.name, mesh.material);
        }
      });
    });

    return placements.map((placement) => {
      const source = treeObjects[placement.treeIndex];
      const clone = SkeletonUtils.clone(source);

      clone.position.copy(placement.position);
      clone.rotation.copy(placement.rotation);
      clone.scale.copy(placement.scale);

      // Restore original materials and apply alpha cutout settings
      clone.traverse((node) => {
        if ((node as THREE.Mesh).isMesh) {
          const mesh = node as THREE.Mesh;
          // Restore the original material (which has the texture)
          const originalMat = materialMap.get(mesh.name);
          if (originalMat) {
            mesh.material = originalMat;
          }
          mesh.castShadow = true;
          mesh.receiveShadow = true;

          // Ensure alpha cutout and green tint for foliage
          const m = mesh.material as THREE.MeshStandardMaterial;
          const isLeaf = mesh.name.toLowerCase().includes('leaves');
          if (m.map) {
            m.alphaTest = 0.5;
            m.transparent = false;
            m.depthWrite = true;
            m.side = THREE.DoubleSide;
            m.map.anisotropy = 8;
            m.roughness = 1.0; // Completely matte
            m.metalness = 0;
            if (isLeaf) {
              m.color = new THREE.Color(0.15, 0.45, 0.12); // Forest green
            }
          }
        }
      });

      return { clone, placement };
    });
  }, [placements, treeObjects]);

  // Don't render if no trees
  if (treeInstances.length === 0) {
    return null;
  }

  // Optimized rendering: separate visual tree meshes from physics colliders
  // This reduces React reconciliation overhead by not wrapping each tree in RigidBody
  return (
    <group name={`chunk-trees-${chunkX}-${chunkZ}`}>
      {/* Visual tree meshes - no physics wrapper */}
      {treeInstances.map(({ clone }, i) => (
        <primitive key={`tree-${i}`} object={clone} />
      ))}

      {/* Physics colliders for tree trunks - separate from visuals */}
      {treeInstances.map(({ placement }, i) => {
        const scale = placement.scale.x;
        // Trunk-only collision - smaller than visual for better gameplay
        const trunkRadius = 0.4 * scale;
        const trunkHeight = 2.5 * scale;

        return (
          <RigidBody
            key={`collider-${i}`}
            type="fixed"
            position={[placement.position.x, placement.position.y, placement.position.z]}
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

// Preload the tree model
(ChunkTrees as any).preload = () => {
  useGLTF.preload('/models/Foliage/Trees/oak_trees.glb');
};

export default ChunkTrees;
