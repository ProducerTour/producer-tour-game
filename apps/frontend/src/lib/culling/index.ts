/**
 * Culling System
 *
 * CPU-based frustum and cluster culling for optimal rendering performance.
 *
 * Features:
 * - Per-instance culling for InstancedMesh
 * - Sub-chunk cluster culling (16m clusters within 64m chunks)
 * - Hierarchical grid-based culling
 *
 * Usage:
 * ```tsx
 * import { useInstanceCulling, getClusterCullingSystem } from '@/lib/culling';
 *
 * function Trees() {
 *   const { registerFromMesh } = useInstanceCulling({
 *     enabled: true,
 *     onCull: (result) => console.log(`Visible: ${result.visibleCount}`),
 *   });
 *   // ...
 * }
 * ```
 */

// Types
export type {
  InstanceBounds,
  GridCell,
  InstanceCullingConfig,
  CullingResult,
  ClusterCullingResult,
} from './types';

export { DEFAULT_CULLING_CONFIG } from './types';

// Instance Culling
export { InstanceCullingSystem } from './InstanceCullingSystem';

// Cluster Culling
export {
  ClusterCullingSystem,
  getClusterCullingSystem,
  resetClusterCullingSystem,
  CLUSTER_SIZE,
  CLUSTERS_PER_CHUNK_EDGE,
  CLUSTERS_PER_CHUNK,
  type ClusterId,
  type ClusterData,
  type ClusterVisibilityResult,
} from './ClusterCullingSystem';

// Hooks
export {
  useInstanceCulling,
  useInstancedMeshCulling,
  type UseInstanceCullingOptions,
  type UseInstanceCullingReturn,
} from './useInstanceCulling';
