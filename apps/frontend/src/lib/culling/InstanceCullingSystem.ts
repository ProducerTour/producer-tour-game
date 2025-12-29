/**
 * InstanceCullingSystem.ts
 * CPU-based per-instance frustum culling for InstancedMesh
 *
 * Uses hierarchical culling:
 * 1. Test grid cells against frustum
 * 2. Only test instances in visible cells
 * 3. Reorder instance matrices for optimal rendering
 */

import * as THREE from 'three';
import {
  type InstanceBounds,
  type GridCell,
  type InstanceCullingConfig,
  type CullingResult,
  type ClusterCullingResult,
  DEFAULT_CULLING_CONFIG,
} from './types';
import {
  getClusterCullingSystem,
  CLUSTER_SIZE,
  CLUSTERS_PER_CHUNK_EDGE,
  type ClusterCullingSystem,
} from './ClusterCullingSystem';
import { CHUNK_SIZE } from '../terrain/TerrainConfig';

/**
 * Pre-allocated objects for culling calculations
 */
const _frustum = new THREE.Frustum();
const _projScreenMatrix = new THREE.Matrix4();
const _sphere = new THREE.Sphere();
const _position = new THREE.Vector3();

/**
 * InstanceCullingSystem provides per-instance frustum culling
 */
export class InstanceCullingSystem {
  private config: InstanceCullingConfig;

  /** Grid cells for hierarchical culling */
  private cells: Map<string, GridCell> = new Map();

  /** All registered instance bounds */
  private instances: InstanceBounds[] = [];

  /** Instances grouped by cluster key (chunkKey:clusterIndex) */
  private clusterInstances: Map<string, InstanceBounds[]> = new Map();

  /** Cluster visibility cache for this frame */
  private clusterVisibility: Map<string, boolean> = new Map();

  /** Reference to cluster culling system */
  private clusterSystem: ClusterCullingSystem | null = null;

  /** Camera position for distance calculations */
  private cameraPosition = new THREE.Vector3();

  /** Reusable visible indices array */
  private visibleIndices: number[] = [];

  constructor(config?: Partial<InstanceCullingConfig>) {
    this.config = { ...DEFAULT_CULLING_CONFIG, ...config };

    // Get cluster system reference if cluster culling is enabled
    if (this.config.useClusterCulling) {
      this.clusterSystem = getClusterCullingSystem();
    }
  }

  /**
   * Clear all registered instances
   */
  clear(): void {
    this.cells.clear();
    this.instances = [];
    this.visibleIndices = [];
    this.clusterInstances.clear();
    this.clusterVisibility.clear();
  }

  /**
   * Register instances for culling
   * Call this when the InstancedMesh is created or updated
   *
   * @param positions - Array of world-space positions for each instance
   * @param radii - Array of bounding sphere radii (or single value for all)
   */
  registerInstances(
    positions: THREE.Vector3[],
    radii: number | number[]
  ): void {
    this.clear();

    const singleRadius = typeof radii === 'number';
    const useCluster = this.config.useClusterCulling;

    for (let i = 0; i < positions.length; i++) {
      const position = positions[i];
      const radius = singleRadius ? radii : radii[i];

      // Calculate grid cell key
      const cellX = Math.floor(position.x / this.config.cellSize);
      const cellZ = Math.floor(position.z / this.config.cellSize);
      const cellKey = `${cellX},${cellZ}`;

      // Calculate chunk and cluster keys if cluster culling is enabled
      let chunkKey: string | undefined;
      let clusterIndex: number | undefined;

      if (useCluster) {
        const { chunkKey: ck, clusterIndex: ci } = this.positionToCluster(position);
        chunkKey = ck;
        clusterIndex = ci;
      }

      const instanceBounds: InstanceBounds = {
        index: i,
        position: position.clone(),
        radius,
        cellKey,
        chunkKey,
        clusterIndex,
      };

      this.instances.push(instanceBounds);

      // Add to grid cell
      this.getOrCreateCell(cellKey, cellX, cellZ).instances.push(instanceBounds);

      // Add to cluster map if cluster culling is enabled
      if (useCluster && chunkKey !== undefined && clusterIndex !== undefined) {
        const clusterKey = `${chunkKey}:${clusterIndex}`;
        let clusterList = this.clusterInstances.get(clusterKey);
        if (!clusterList) {
          clusterList = [];
          this.clusterInstances.set(clusterKey, clusterList);
        }
        clusterList.push(instanceBounds);
      }
    }
  }

  /**
   * Convert a world position to chunk and cluster keys
   */
  private positionToCluster(position: THREE.Vector3): {
    chunkKey: string;
    clusterIndex: number;
  } {
    // Calculate chunk coordinates (assuming world centered at 0,0)
    // Offset by half world size to handle negative coordinates
    const halfWorld = 384; // WORLD_SIZE / 2 from TerrainConfig
    const offsetX = position.x + halfWorld;
    const offsetZ = position.z + halfWorld;

    const chunkX = Math.floor(offsetX / CHUNK_SIZE);
    const chunkZ = Math.floor(offsetZ / CHUNK_SIZE);
    const chunkKey = `${chunkX},${chunkZ}`;

    // Calculate position within chunk
    const inChunkX = offsetX - chunkX * CHUNK_SIZE;
    const inChunkZ = offsetZ - chunkZ * CHUNK_SIZE;

    // Calculate cluster within chunk (4x4 grid of 16m clusters)
    const clusterX = Math.floor(inChunkX / CLUSTER_SIZE);
    const clusterZ = Math.floor(inChunkZ / CLUSTER_SIZE);

    // Clamp to valid range
    const cx = Math.max(0, Math.min(CLUSTERS_PER_CHUNK_EDGE - 1, clusterX));
    const cz = Math.max(0, Math.min(CLUSTERS_PER_CHUNK_EDGE - 1, clusterZ));

    const clusterIndex = cz * CLUSTERS_PER_CHUNK_EDGE + cx;

    return { chunkKey, clusterIndex };
  }

  /**
   * Register instances from an InstancedMesh
   * Extracts positions from instance matrices
   *
   * @param mesh - The InstancedMesh to register
   * @param radius - Bounding sphere radius for all instances
   */
  registerFromMesh(mesh: THREE.InstancedMesh, radius: number): void {
    const positions: THREE.Vector3[] = [];
    const matrix = new THREE.Matrix4();

    for (let i = 0; i < mesh.count; i++) {
      mesh.getMatrixAt(i, matrix);
      const position = new THREE.Vector3();
      matrix.decompose(position, new THREE.Quaternion(), new THREE.Vector3());
      positions.push(position);
    }

    this.registerInstances(positions, radius);
  }

  /**
   * Get or create a grid cell
   */
  private getOrCreateCell(key: string, cellX: number, cellZ: number): GridCell {
    let cell = this.cells.get(key);

    if (!cell) {
      const minX = cellX * this.config.cellSize;
      const minZ = cellZ * this.config.cellSize;
      const maxX = minX + this.config.cellSize;
      const maxZ = minZ + this.config.cellSize;

      cell = {
        key,
        bounds: new THREE.Box3(
          new THREE.Vector3(minX, -1000, minZ),
          new THREE.Vector3(maxX, 1000, maxZ)
        ),
        instances: [],
        visible: true,
      };

      this.cells.set(key, cell);
    }

    return cell;
  }

  /**
   * Perform frustum culling on all instances
   *
   * @param camera - The camera to cull against
   * @returns CullingResult with visible instance indices
   */
  cull(camera: THREE.Camera): ClusterCullingResult {
    const startTime = performance.now();

    // Update frustum from camera
    camera.updateMatrixWorld();
    _projScreenMatrix.multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse
    );
    _frustum.setFromProjectionMatrix(_projScreenMatrix);

    // Get camera position for distance checks
    camera.getWorldPosition(this.cameraPosition);

    // Clear visible indices and cluster visibility cache
    this.visibleIndices.length = 0;
    this.clusterVisibility.clear();

    let clustersTested = 0;
    let clustersVisible = 0;
    let earlyOutCount = 0;

    // Use cluster-aware culling if enabled and system is available
    const useCluster =
      this.config.useClusterCulling &&
      this.clusterSystem &&
      this.clusterInstances.size > 0;

    if (useCluster) {
      // Cluster-based culling with early-out
      for (const [clusterKey, instances] of this.clusterInstances) {
        clustersTested++;

        // Check cluster visibility (cached per frame)
        let isClusterVisible = this.clusterVisibility.get(clusterKey);

        if (isClusterVisible === undefined) {
          // Parse chunk and cluster from key
          const [chunkPart, clusterIndexStr] = clusterKey.split(':');
          const [chunkXStr, chunkZStr] = chunkPart.split(',');
          const chunkX = parseInt(chunkXStr, 10);
          const chunkZ = parseInt(chunkZStr, 10);
          const clusterIndex = parseInt(clusterIndexStr, 10);

          // Convert linear cluster index to x,z coordinates
          const clusterX = clusterIndex % CLUSTERS_PER_CHUNK_EDGE;
          const clusterZ = Math.floor(clusterIndex / CLUSTERS_PER_CHUNK_EDGE);

          // Get cluster visibility from system
          isClusterVisible = this.clusterSystem!.isClusterVisible({
            chunkX,
            chunkZ,
            clusterX,
            clusterZ,
          });
          this.clusterVisibility.set(clusterKey, isClusterVisible);
        }

        if (isClusterVisible) {
          clustersVisible++;

          // Test individual instances within visible cluster
          for (const instance of instances) {
            if (this.testInstance(instance)) {
              this.visibleIndices.push(instance.index);
            }
          }
        } else if (this.config.clusterEarlyOut) {
          // Skip all instances in invisible cluster
          earlyOutCount += instances.length;
        } else {
          // Still test instances even in invisible clusters
          for (const instance of instances) {
            if (this.testInstance(instance)) {
              this.visibleIndices.push(instance.index);
            }
          }
        }
      }
    } else if (this.config.useHierarchicalCulling) {
      // Fall back to grid-based hierarchical culling
      // Phase 1: Cull grid cells
      for (const cell of this.cells.values()) {
        cell.visible = _frustum.intersectsBox(cell.bounds);
      }

      // Phase 2: Cull instances in visible cells
      for (const cell of this.cells.values()) {
        if (!cell.visible) continue;

        for (const instance of cell.instances) {
          if (this.testInstance(instance)) {
            this.visibleIndices.push(instance.index);
          }
        }
      }
    } else {
      // Direct culling (no hierarchical)
      for (const instance of this.instances) {
        if (this.testInstance(instance)) {
          this.visibleIndices.push(instance.index);
        }
      }
    }

    const cullTimeMs = performance.now() - startTime;

    return {
      visibleIndices: this.visibleIndices,
      visibleCount: this.visibleIndices.length,
      culledCount: this.instances.length - this.visibleIndices.length,
      totalCount: this.instances.length,
      cullTimeMs,
      clustersTested,
      clustersVisible,
      earlyOutCount,
    };
  }

  /**
   * Test a single instance against the frustum
   */
  private testInstance(instance: InstanceBounds): boolean {
    // Check distance - don't cull nearby instances
    _position.copy(instance.position);
    const distance = _position.distanceTo(this.cameraPosition);

    if (distance < this.config.nearDistance) {
      return true;
    }

    // Set up bounding sphere with conservative margin
    _sphere.set(instance.position, instance.radius * this.config.margin);

    // Test against frustum
    return _frustum.intersectsSphere(_sphere);
  }

  /**
   * Apply culling result to an InstancedMesh by reordering matrices
   * Puts visible instances first, then sets mesh.count
   *
   * @param mesh - The InstancedMesh to update
   * @param result - The culling result from cull()
   */
  applyToMesh(mesh: THREE.InstancedMesh, result: CullingResult): void {
    if (result.visibleCount === result.totalCount) {
      // All visible, no reordering needed
      mesh.count = result.totalCount;
      return;
    }

    // Reorder matrices: visible instances first
    const tempMatrix = new THREE.Matrix4();
    let writeIndex = 0;

    // First pass: write visible instances
    for (const index of result.visibleIndices) {
      if (writeIndex !== index) {
        mesh.getMatrixAt(index, tempMatrix);
        mesh.setMatrixAt(writeIndex, tempMatrix);
      }
      writeIndex++;
    }

    // Update the count to only render visible instances
    mesh.count = result.visibleCount;
    mesh.instanceMatrix.needsUpdate = true;
  }

  /**
   * Get visible instance indices without modifying mesh
   * Useful for grass where we update a shader attribute instead
   */
  getVisibleIndices(camera: THREE.Camera): number[] {
    const result = this.cull(camera);
    return result.visibleIndices;
  }

  /**
   * Create a Float32Array visibility mask for shader use
   * 1.0 = visible, 0.0 = culled
   */
  createVisibilityMask(camera: THREE.Camera): Float32Array {
    const result = this.cull(camera);
    const mask = new Float32Array(this.instances.length);

    // Default to 0 (culled)
    mask.fill(0);

    // Set visible instances to 1
    for (const index of result.visibleIndices) {
      mask[index] = 1.0;
    }

    return mask;
  }

  /**
   * Get instance count
   */
  getInstanceCount(): number {
    return this.instances.length;
  }

  /**
   * Get cell count
   */
  getCellCount(): number {
    return this.cells.size;
  }

  /**
   * Get configuration
   */
  getConfig(): InstanceCullingConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<InstanceCullingConfig>): void {
    const needsRebuild =
      config.cellSize !== undefined && config.cellSize !== this.config.cellSize;

    const clusterToggled =
      config.useClusterCulling !== undefined &&
      config.useClusterCulling !== this.config.useClusterCulling;

    this.config = { ...this.config, ...config };

    // Update cluster system reference if cluster culling was toggled
    if (clusterToggled) {
      this.clusterSystem = this.config.useClusterCulling
        ? getClusterCullingSystem()
        : null;
    }

    if ((needsRebuild || clusterToggled) && this.instances.length > 0) {
      // Rebuild grid cells with new cell size or cluster grouping
      const positions = this.instances.map((i) => i.position);
      const radii = this.instances.map((i) => i.radius);
      this.registerInstances(positions, radii);
    }
  }

  /**
   * Get cluster statistics
   */
  getClusterStats(): { totalClusters: number; instancesPerCluster: number } {
    const totalClusters = this.clusterInstances.size;
    const totalInstances = Array.from(this.clusterInstances.values()).reduce(
      (sum, list) => sum + list.length,
      0
    );
    return {
      totalClusters,
      instancesPerCluster: totalClusters > 0 ? totalInstances / totalClusters : 0,
    };
  }

  /**
   * Dispose
   */
  dispose(): void {
    this.clear();
  }
}
