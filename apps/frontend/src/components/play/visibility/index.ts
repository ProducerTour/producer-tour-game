/**
 * Visibility System Components
 *
 * React Three Fiber integration for the visibility/occlusion culling system.
 */

export {
  VisibilityUpdater,
  useVisibilityManager,
  useChunkVisibility,
  useObjectVisibility,
} from './VisibilityUpdater';

export { VisibilityDebug } from './VisibilityDebug';

// Re-export lib types for convenience
export type {
  VisibilityConfig,
  VisibilityStats,
  ChunkVisibility,
} from '../../../lib/visibility';
