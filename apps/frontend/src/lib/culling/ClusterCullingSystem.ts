/**
 * ClusterCullingSystem.ts
 * Sub-chunk cluster-based visibility culling
 *
 * Divides each 64m chunk into 16 clusters (4×4 grid of 16m each)
 * for finer-grained HZB occlusion testing and vegetation culling.
 *
 * Cluster grid within a chunk:
 * ┌──────────┬──────────┬──────────┬──────────┐
 * │ [0,3]    │ [1,3]    │ [2,3]    │ [3,3]    │
 * ├──────────┼──────────┼──────────┼──────────┤
 * │ [0,2]    │ [1,2]    │ [2,2]    │ [3,2]    │
 * ├──────────┼──────────┼──────────┼──────────┤
 * │ [0,1]    │ [1,1]    │ [2,1]    │ [3,1]    │
 * ├──────────┼──────────┼──────────┼──────────┤
 * │ [0,0]    │ [1,0]    │ [2,0]    │ [3,0]    │
 * └──────────┴──────────┴──────────┴──────────┘
 */

import * as THREE from 'three';

/** Size of each cluster in meters (4 clusters per chunk edge = 16m each) */
export const CLUSTER_SIZE = 16;

/** Number of clusters per chunk edge */
export const CLUSTERS_PER_CHUNK_EDGE = 4;

/** Total clusters per chunk */
export const CLUSTERS_PER_CHUNK = CLUSTERS_PER_CHUNK_EDGE * CLUSTERS_PER_CHUNK_EDGE;

/**
 * Cluster identifier
 */
export interface ClusterId {
  /** Parent chunk X coordinate */
  chunkX: number;
  /** Parent chunk Z coordinate */
  chunkZ: number;
  /** Cluster X within chunk (0-3) */
  clusterX: number;
  /** Cluster Z within chunk (0-3) */
  clusterZ: number;
}

/**
 * Cluster data
 */
export interface ClusterData {
  /** Cluster identifier */
  id: ClusterId;
  /** Unique string key for this cluster */
  key: string;
  /** World-space bounding box */
  bounds: THREE.Box3;
  /** Center point in world space */
  center: THREE.Vector3;
  /** Visibility state (updated per frame) */
  visible: boolean;
  /** Last frame this cluster was tested */
  lastTestedFrame: number;
  /** Instances within this cluster (indices into parent array) */
  instanceIndices: number[];
  /** Height range for vegetation in this cluster */
  heightRange: { min: number; max: number };
}

/**
 * Cluster visibility result
 */
export interface ClusterVisibilityResult {
  /** Total clusters */
  totalClusters: number;
  /** Visible clusters */
  visibleClusters: number;
  /** Culled clusters */
  culledClusters: number;
  /** Visible instance count */
  visibleInstances: number;
  /** Culled instance count */
  culledInstances: number;
  /** Time taken (ms) */
  timeMs: number;
}

/**
 * ClusterCullingSystem manages sub-chunk cluster visibility
 */
export class ClusterCullingSystem {
  /** Registered clusters by key */
  private clusters: Map<string, ClusterData> = new Map();

  /** Clusters grouped by parent chunk */
  private clustersByChunk: Map<string, ClusterData[]> = new Map();

  /** Current frame number */
  private frameNumber = 0;

  /** Debug mode */
  private debug: boolean;

  constructor(debug = false) {
    this.debug = debug;
  }

  /**
   * Generate cluster key from identifiers
   */
  private getClusterKey(id: ClusterId): string {
    return `${id.chunkX}_${id.chunkZ}_${id.clusterX}_${id.clusterZ}`;
  }

  /**
   * Generate chunk key
   */
  private getChunkKey(chunkX: number, chunkZ: number): string {
    return `${chunkX}_${chunkZ}`;
  }

  /**
   * Register a chunk's clusters
   * Call this when a chunk is loaded
   */
  registerChunk(
    chunkX: number,
    chunkZ: number,
    chunkOrigin: { x: number; z: number },
    heightSampler?: (x: number, z: number) => number
  ): ClusterData[] {
    const chunkKey = this.getChunkKey(chunkX, chunkZ);

    // Remove existing clusters for this chunk
    this.unregisterChunk(chunkX, chunkZ);

    const clusters: ClusterData[] = [];

    for (let cz = 0; cz < CLUSTERS_PER_CHUNK_EDGE; cz++) {
      for (let cx = 0; cx < CLUSTERS_PER_CHUNK_EDGE; cx++) {
        const id: ClusterId = {
          chunkX,
          chunkZ,
          clusterX: cx,
          clusterZ: cz,
        };

        const key = this.getClusterKey(id);

        // Calculate cluster bounds in world space
        const minX = chunkOrigin.x + cx * CLUSTER_SIZE;
        const minZ = chunkOrigin.z + cz * CLUSTER_SIZE;
        const maxX = minX + CLUSTER_SIZE;
        const maxZ = minZ + CLUSTER_SIZE;

        // Sample heights if sampler provided
        let minY = 0;
        let maxY = 50; // Default reasonable height

        if (heightSampler) {
          // Sample at cluster corners and center
          const samples = [
            heightSampler(minX, minZ),
            heightSampler(maxX, minZ),
            heightSampler(minX, maxZ),
            heightSampler(maxX, maxZ),
            heightSampler((minX + maxX) / 2, (minZ + maxZ) / 2),
          ];

          minY = Math.min(...samples) - 2; // Below ground
          maxY = Math.max(...samples) + 15; // Above trees
        }

        const bounds = new THREE.Box3(
          new THREE.Vector3(minX, minY, minZ),
          new THREE.Vector3(maxX, maxY, maxZ)
        );

        const center = new THREE.Vector3();
        bounds.getCenter(center);

        const cluster: ClusterData = {
          id,
          key,
          bounds,
          center,
          visible: true, // Default visible
          lastTestedFrame: 0,
          instanceIndices: [],
          heightRange: { min: minY, max: maxY },
        };

        clusters.push(cluster);
        this.clusters.set(key, cluster);
      }
    }

    this.clustersByChunk.set(chunkKey, clusters);

    if (this.debug) {
      console.log(
        `[ClusterCullingSystem] Registered ${clusters.length} clusters for chunk [${chunkX}, ${chunkZ}]`
      );
    }

    return clusters;
  }

  /**
   * Unregister a chunk's clusters
   * Call this when a chunk is unloaded
   */
  unregisterChunk(chunkX: number, chunkZ: number): void {
    const chunkKey = this.getChunkKey(chunkX, chunkZ);
    const clusters = this.clustersByChunk.get(chunkKey);

    if (clusters) {
      for (const cluster of clusters) {
        this.clusters.delete(cluster.key);
      }
      this.clustersByChunk.delete(chunkKey);
    }
  }

  /**
   * Assign instances to clusters based on their positions
   */
  assignInstancesToCluster(
    chunkX: number,
    chunkZ: number,
    positions: THREE.Vector3[]
  ): void {
    const chunkKey = this.getChunkKey(chunkX, chunkZ);
    const clusters = this.clustersByChunk.get(chunkKey);

    if (!clusters) return;

    // Clear existing assignments
    for (const cluster of clusters) {
      cluster.instanceIndices = [];
    }

    // Assign each instance to its containing cluster
    for (let i = 0; i < positions.length; i++) {
      const pos = positions[i];

      for (const cluster of clusters) {
        if (cluster.bounds.containsPoint(pos)) {
          cluster.instanceIndices.push(i);
          break;
        }
      }
    }

    if (this.debug) {
      const counts = clusters.map((c) => c.instanceIndices.length);
      console.log(
        `[ClusterCullingSystem] Assigned instances to chunk [${chunkX}, ${chunkZ}]:`,
        counts
      );
    }
  }

  /**
   * Update cluster visibility using frustum culling
   */
  updateVisibility(
    camera: THREE.Camera,
    frustum?: THREE.Frustum
  ): ClusterVisibilityResult {
    const startTime = performance.now();
    this.frameNumber++;

    // Create frustum if not provided
    const testFrustum =
      frustum ??
      (() => {
        const f = new THREE.Frustum();
        const projScreenMatrix = new THREE.Matrix4();
        projScreenMatrix.multiplyMatrices(
          camera.projectionMatrix,
          camera.matrixWorldInverse
        );
        f.setFromProjectionMatrix(projScreenMatrix);
        return f;
      })();

    let visibleClusters = 0;
    let culledClusters = 0;
    let visibleInstances = 0;
    let culledInstances = 0;

    for (const cluster of this.clusters.values()) {
      // Frustum test
      cluster.visible = testFrustum.intersectsBox(cluster.bounds);
      cluster.lastTestedFrame = this.frameNumber;

      if (cluster.visible) {
        visibleClusters++;
        visibleInstances += cluster.instanceIndices.length;
      } else {
        culledClusters++;
        culledInstances += cluster.instanceIndices.length;
      }
    }

    const timeMs = performance.now() - startTime;

    if (this.debug && this.frameNumber % 60 === 0) {
      console.log(
        `[ClusterCullingSystem] Frame ${this.frameNumber}: ` +
          `${visibleClusters}/${this.clusters.size} clusters visible, ` +
          `${visibleInstances}/${visibleInstances + culledInstances} instances`
      );
    }

    return {
      totalClusters: this.clusters.size,
      visibleClusters,
      culledClusters,
      visibleInstances,
      culledInstances,
      timeMs,
    };
  }

  /**
   * Get visibility for a specific cluster
   */
  isClusterVisible(id: ClusterId): boolean {
    const key = this.getClusterKey(id);
    return this.clusters.get(key)?.visible ?? true;
  }

  /**
   * Get visibility for a cluster by chunk and local coordinates
   */
  isClusterVisibleAt(
    chunkX: number,
    chunkZ: number,
    clusterX: number,
    clusterZ: number
  ): boolean {
    return this.isClusterVisible({ chunkX, chunkZ, clusterX, clusterZ });
  }

  /**
   * Get all visible clusters for a chunk
   */
  getVisibleClustersInChunk(chunkX: number, chunkZ: number): ClusterData[] {
    const chunkKey = this.getChunkKey(chunkX, chunkZ);
    const clusters = this.clustersByChunk.get(chunkKey);
    return clusters?.filter((c) => c.visible) ?? [];
  }

  /**
   * Get visible instance indices for a chunk
   */
  getVisibleInstanceIndices(chunkX: number, chunkZ: number): number[] {
    const visible = this.getVisibleClustersInChunk(chunkX, chunkZ);
    const indices: number[] = [];

    for (const cluster of visible) {
      indices.push(...cluster.instanceIndices);
    }

    return indices;
  }

  /**
   * Get cluster containing a world position
   */
  getClusterAtPosition(
    chunkX: number,
    chunkZ: number,
    worldX: number,
    worldZ: number
  ): ClusterData | null {
    const chunkKey = this.getChunkKey(chunkX, chunkZ);
    const clusters = this.clustersByChunk.get(chunkKey);

    if (!clusters) return null;

    for (const cluster of clusters) {
      // Only check X/Z containment
      if (
        worldX >= cluster.bounds.min.x &&
        worldX <= cluster.bounds.max.x &&
        worldZ >= cluster.bounds.min.z &&
        worldZ <= cluster.bounds.max.z
      ) {
        return cluster;
      }
    }

    return null;
  }

  /**
   * Get cluster bounding boxes for debug visualization
   */
  getClusterBounds(chunkX: number, chunkZ: number): THREE.Box3[] {
    const chunkKey = this.getChunkKey(chunkX, chunkZ);
    const clusters = this.clustersByChunk.get(chunkKey);
    return clusters?.map((c) => c.bounds.clone()) ?? [];
  }

  /**
   * Get all cluster centers (for debug visualization)
   */
  getAllClusterCenters(): THREE.Vector3[] {
    return Array.from(this.clusters.values()).map((c) => c.center.clone());
  }

  /**
   * Get visibility statistics
   */
  getStats(): {
    totalClusters: number;
    visibleClusters: number;
    totalInstances: number;
    visibleInstances: number;
  } {
    let visibleClusters = 0;
    let totalInstances = 0;
    let visibleInstances = 0;

    for (const cluster of this.clusters.values()) {
      totalInstances += cluster.instanceIndices.length;

      if (cluster.visible) {
        visibleClusters++;
        visibleInstances += cluster.instanceIndices.length;
      }
    }

    return {
      totalClusters: this.clusters.size,
      visibleClusters,
      totalInstances,
      visibleInstances,
    };
  }

  /**
   * Clear all clusters
   */
  clear(): void {
    this.clusters.clear();
    this.clustersByChunk.clear();
    this.frameNumber = 0;
  }

  /**
   * Dispose
   */
  dispose(): void {
    this.clear();
  }
}

/**
 * Singleton instance
 */
let clusterSystemInstance: ClusterCullingSystem | null = null;

/**
 * Get or create the cluster culling system
 */
export function getClusterCullingSystem(debug = false): ClusterCullingSystem {
  if (!clusterSystemInstance) {
    clusterSystemInstance = new ClusterCullingSystem(debug);
  }
  return clusterSystemInstance;
}

/**
 * Reset the cluster culling system
 */
export function resetClusterCullingSystem(): void {
  if (clusterSystemInstance) {
    clusterSystemInstance.dispose();
    clusterSystemInstance = null;
  }
}
