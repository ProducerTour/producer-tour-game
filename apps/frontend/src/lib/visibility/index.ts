/**
 * Visibility System
 *
 * Modern occlusion and visibility culling for Three.js/React Three Fiber
 *
 * Features:
 * - CPU frustum culling (Phase 1 - implemented)
 * - Hierarchical Z-Buffer (Phase 2 - implemented)
 * - GPU occlusion queries (Phase 3 - planned)
 * - Per-instance culling (Phase 4 - planned)
 * - Temporal coherence for query reduction
 *
 * Usage:
 * ```tsx
 * import { getVisibilityManager } from '@/lib/visibility';
 *
 * // In your component
 * const visibility = getVisibilityManager();
 * visibility.initialize(renderer);
 *
 * // In useFrame (priority: -1)
 * visibility.update(camera, scene, delta);
 *
 * // Check visibility
 * if (visibility.isChunkVisible(chunkX, chunkZ)) {
 *   // Render chunk
 * }
 * ```
 */

// Types
export type {
  VisibilityConfig,
  VisibilityState,
  VisibilityObject,
  VisibilityStats,
  VisibilityQualityLevel,
  ChunkVisibility,
  InstanceVisibilityBuffer,
  FrustumPlanes,
  VisibilityChangeCallback,
  QualityChangeCallback,
} from './types';

// Constants
export {
  DEFAULT_VISIBILITY_CONFIG,
  DEFAULT_VISIBILITY_STATS,
} from './types';

// Classes
export { VisibilityManager } from './VisibilityManager';
export { VisibilityBuffer } from './VisibilityBuffer';
export { FrustumCuller } from './FrustumCuller';
export { HZBGenerator, type HZBConfig, type OcclusionTestResult } from './HZBGenerator';
export {
  OcclusionQueryPool,
  type QueryState,
  type OcclusionQueryConfig,
} from './OcclusionQuery';
export {
  TemporalCoherence,
  type TemporalConfig,
  type VisibilityHistory,
  type QueryDecision,
} from './TemporalCoherence';
export {
  BillboardLODSystem,
  TreeLODLevel,
  type BillboardLODConfig,
  type TreeLODState,
  type LODResult,
  DEFAULT_BILLBOARD_LOD_CONFIG,
} from './BillboardLODSystem';

// Singleton access
export {
  getVisibilityManager,
  resetVisibilityManager,
} from './VisibilityManager';

// Utility functions
export {
  extractFrustumPlanes,
  sphereInFrustum,
  boxInFrustum,
} from './FrustumCuller';

// Quality management
export {
  VisibilityQualityAdapter,
  getVisibilityQualityAdapter,
  resetVisibilityQualityAdapter,
  detectCapabilities,
  initializeWithCapabilityDetection,
  VISIBILITY_QUALITY_PRESETS,
  type VisibilityQualityPreset,
} from './VisibilityQualityAdapter';
