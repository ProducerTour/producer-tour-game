/**
 * types.ts
 * Types for per-instance culling system
 */

import * as THREE from 'three';

/**
 * Bounding data for an instance
 */
export interface InstanceBounds {
  /** Instance index in the InstancedMesh */
  index: number;
  /** World-space position */
  position: THREE.Vector3;
  /** Bounding sphere radius */
  radius: number;
  /** Grid cell key for hierarchical culling */
  cellKey: string;
  /** Chunk coordinate (optional, for cluster culling) */
  chunkKey?: string;
  /** Cluster index within chunk (0-15, for cluster culling) */
  clusterIndex?: number;
}

/**
 * Grid cell for hierarchical culling
 */
export interface GridCell {
  /** Cell key (e.g., "1,2" for x=1, z=2) */
  key: string;
  /** World-space cell bounds */
  bounds: THREE.Box3;
  /** Instances in this cell */
  instances: InstanceBounds[];
  /** Is the cell visible this frame */
  visible: boolean;
}

/**
 * Configuration for instance culling
 */
export interface InstanceCullingConfig {
  /** Grid cell size for hierarchical culling */
  cellSize: number;
  /** Enable hierarchical culling */
  useHierarchicalCulling: boolean;
  /** Conservative margin for bounding spheres */
  margin: number;
  /** Skip culling for instances closer than this distance */
  nearDistance: number;
  /** Enable cluster-aware culling (uses 16m sub-chunk clusters) */
  useClusterCulling: boolean;
  /** Early-out if cluster is invisible (skip per-instance tests) */
  clusterEarlyOut: boolean;
}

/**
 * Default culling configuration
 */
export const DEFAULT_CULLING_CONFIG: InstanceCullingConfig = {
  cellSize: 8, // 8m grid cells
  useHierarchicalCulling: true,
  margin: 1.1,
  nearDistance: 16, // Don't cull within 16m
  useClusterCulling: true, // Use 16m cluster visibility
  clusterEarlyOut: true, // Skip per-instance tests for invisible clusters
};

/**
 * Cluster-aware culling result
 */
export interface ClusterCullingResult extends CullingResult {
  /** Number of clusters tested */
  clustersTested: number;
  /** Number of clusters visible */
  clustersVisible: number;
  /** Number of instances skipped via cluster early-out */
  earlyOutCount: number;
}

/**
 * Culling result for a set of instances
 */
export interface CullingResult {
  /** Visible instance indices (sorted for optimal rendering) */
  visibleIndices: number[];
  /** Number of visible instances */
  visibleCount: number;
  /** Number of culled instances */
  culledCount: number;
  /** Total instances processed */
  totalCount: number;
  /** Time taken for culling (ms) */
  cullTimeMs: number;
}
