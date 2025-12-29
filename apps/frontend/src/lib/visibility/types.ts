/**
 * types.ts
 * Core types and interfaces for the visibility/occlusion culling system
 */

import * as THREE from 'three';

// =============================================================================
// CONFIGURATION
// =============================================================================

/**
 * Quality levels for visibility system
 * Integrates with PerformanceMonitor quality settings
 */
export type VisibilityQualityLevel = 'high' | 'medium' | 'low';

/**
 * Visibility system configuration
 * All values exposed via Leva for runtime tuning
 */
export interface VisibilityConfig {
  // Enable/disable subsystems
  enabled: boolean;
  hzbEnabled: boolean;
  occlusionQueriesEnabled: boolean;
  temporalCoherenceEnabled: boolean;
  perInstanceCullingEnabled: boolean;

  // HZB settings
  hzbResolution: 256 | 512 | 1024;
  hzbMipLevels: number;

  // Occlusion query settings
  maxQueriesPerFrame: number;
  queryPoolSize: number;

  // Temporal coherence
  historyFrames: number;
  confidenceThreshold: number;

  // Culling margins (conservative culling)
  /** Expand bounding boxes by this factor (1.1 = 10% larger) */
  conservativeMargin: number;
  /** Never cull chunks closer than this distance (prevents pop-in) */
  nearChunkDistance: number;

  // Performance fallbacks
  cpuFrustumOnly: boolean;
  disableInstanceCulling: boolean;

  // Debug
  debugMode: boolean;
  showOccluders: boolean;
  showCulledChunks: boolean;
  showHZB: boolean;
  hzbMipLevelToShow: number;
}

/**
 * Default visibility configuration
 */
export const DEFAULT_VISIBILITY_CONFIG: VisibilityConfig = {
  // Subsystems
  enabled: true,
  hzbEnabled: true,
  occlusionQueriesEnabled: true,
  temporalCoherenceEnabled: true,
  perInstanceCullingEnabled: true,

  // HZB
  hzbResolution: 1024,
  hzbMipLevels: 5,

  // Queries
  maxQueriesPerFrame: 64,
  queryPoolSize: 256,

  // Temporal
  historyFrames: 8,
  confidenceThreshold: 0.75,

  // Margins
  conservativeMargin: 1.1,
  nearChunkDistance: 64, // One chunk size

  // Fallbacks
  cpuFrustumOnly: false,
  disableInstanceCulling: false,

  // Debug
  debugMode: false,
  showOccluders: false,
  showCulledChunks: false,
  showHZB: false,
  hzbMipLevelToShow: 0,
};

// =============================================================================
// VISIBILITY OBJECTS
// =============================================================================

/**
 * Visibility state for a single object (chunk, mesh, etc.)
 */
export interface VisibilityState {
  /** Was visible last frame */
  visibleLastFrame: boolean;
  /** Is visible this frame (result of culling tests) */
  visibleThisFrame: boolean;
  /** Number of consecutive frames with same visibility */
  stableFrames: number;
  /** Is an occlusion query pending for this object */
  queryPending: boolean;
  /** Frame number when last tested */
  lastTestedFrame: number;
  /** Distance to nearest frustum plane (for temporal coherence) */
  frustumMargin: number;
}

/**
 * Object registered with the visibility system
 */
export interface VisibilityObject {
  /** Unique identifier */
  id: string;
  /** Object type for priority/batching */
  type: 'chunk' | 'vegetation' | 'prop' | 'building';
  /** Axis-aligned bounding box in world space */
  bounds: THREE.Box3;
  /** Bounding sphere for fast rejection */
  sphere: THREE.Sphere;
  /** Current visibility state */
  state: VisibilityState;
  /** Priority for query ordering (lower = higher priority) */
  priority: number;
  /** Never cull this object (e.g., player, important objects) */
  alwaysVisible: boolean;
}

// =============================================================================
// CHUNK VISIBILITY
// =============================================================================

/**
 * Chunk visibility data (optimized for terrain chunks)
 */
export interface ChunkVisibility {
  /** Chunk grid coordinates */
  chunkX: number;
  chunkZ: number;
  /** Is chunk visible this frame */
  visible: boolean;
  /** Distance from camera */
  distance: number;
  /** Was visible last frame */
  wasVisible: boolean;
}

// =============================================================================
// INSTANCE VISIBILITY
// =============================================================================

/**
 * Per-instance visibility data for instanced meshes
 * Uses bit-packed array for memory efficiency
 */
export interface InstanceVisibilityBuffer {
  /** Chunk key (e.g., "5,3") */
  chunkKey: string;
  /** Number of instances in this chunk */
  instanceCount: number;
  /** Bit-packed visibility (32 instances per Uint32) */
  visibilityMask: Uint32Array;
  /** Number of visible instances */
  visibleCount: number;
}

// =============================================================================
// FRUSTUM
// =============================================================================

/**
 * Extracted frustum planes from camera
 * Used for CPU-side frustum culling
 */
export interface FrustumPlanes {
  /** Left plane */
  left: THREE.Plane;
  /** Right plane */
  right: THREE.Plane;
  /** Top plane */
  top: THREE.Plane;
  /** Bottom plane */
  bottom: THREE.Plane;
  /** Near plane */
  near: THREE.Plane;
  /** Far plane */
  far: THREE.Plane;
}

// =============================================================================
// STATISTICS
// =============================================================================

/**
 * Per-frame visibility statistics
 */
export interface VisibilityStats {
  /** Number of chunks visible */
  chunksVisible: number;
  /** Number of chunks culled */
  chunksCulled: number;
  /** Total chunks registered */
  chunksTotal: number;

  /** Number of instances visible */
  instancesVisible: number;
  /** Number of instances culled */
  instancesCulled: number;
  /** Total instances registered */
  instancesTotal: number;

  /** Queries issued this frame */
  queriesIssued: number;
  /** Queries skipped due to temporal coherence */
  queriesSkipped: number;

  /** Time spent on HZB generation (ms) */
  hzbTimeMs: number;
  /** Time spent on CPU culling (ms) */
  cpuCullTimeMs: number;
  /** Time spent on query processing (ms) */
  queryTimeMs: number;

  /** Current frame number */
  frameNumber: number;
}

/**
 * Default/empty statistics
 */
export const DEFAULT_VISIBILITY_STATS: VisibilityStats = {
  chunksVisible: 0,
  chunksCulled: 0,
  chunksTotal: 0,
  instancesVisible: 0,
  instancesCulled: 0,
  instancesTotal: 0,
  queriesIssued: 0,
  queriesSkipped: 0,
  hzbTimeMs: 0,
  cpuCullTimeMs: 0,
  queryTimeMs: 0,
  frameNumber: 0,
};

// =============================================================================
// CALLBACKS
// =============================================================================

/**
 * Callback for visibility changes
 */
export type VisibilityChangeCallback = (
  objectId: string,
  visible: boolean,
  previouslyVisible: boolean
) => void;

/**
 * Callback for quality level changes
 */
export type QualityChangeCallback = (
  level: VisibilityQualityLevel,
  previousLevel: VisibilityQualityLevel
) => void;
