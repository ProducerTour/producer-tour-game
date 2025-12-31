/**
 * Unified Chunk Streaming Types
 *
 * Type definitions for the chunk-based world streaming system.
 * Used by both client-side ChunkManager and server-side ChunkEntityRegistry.
 *
 * @module streaming/types
 */

import type { Vector3Tuple } from 'three';

// =============================================================================
// CHUNK IDENTIFICATION
// =============================================================================

/**
 * Deterministic chunk identifier using grid coordinates.
 * Format: "${chunkX},${chunkZ}" e.g., "5,3" or "-2,7"
 *
 * This format ensures:
 * - Unique identification across the world grid
 * - Easy parsing back to coordinates
 * - Consistent hashing for Map/Set operations
 */
export type ChunkId = `${number},${number}`;

/**
 * Parse a ChunkId into grid coordinates
 */
export function parseChunkId(id: ChunkId): { x: number; z: number } {
  const [x, z] = id.split(',').map(Number);
  return { x, z };
}

/**
 * Create a ChunkId from grid coordinates
 */
export function createChunkId(x: number, z: number): ChunkId {
  return `${x},${z}`;
}

/**
 * Convert world position to chunk grid coordinates
 */
export function worldToChunkCoord(
  worldX: number,
  worldZ: number,
  chunkSize: number,
  worldSize: number
): { x: number; z: number } {
  return {
    x: Math.floor((worldX + worldSize / 2) / chunkSize),
    z: Math.floor((worldZ + worldSize / 2) / chunkSize),
  };
}

/**
 * Convert chunk grid coordinates to world position (chunk center)
 */
export function chunkCoordToWorld(
  chunkX: number,
  chunkZ: number,
  chunkSize: number,
  worldSize: number
): { x: number; z: number } {
  return {
    x: chunkX * chunkSize - worldSize / 2 + chunkSize / 2,
    z: chunkZ * chunkSize - worldSize / 2 + chunkSize / 2,
  };
}

// =============================================================================
// CLIENT-SIDE CHUNK STATES
// =============================================================================

/**
 * Client-side chunk lifecycle states
 *
 * State transitions:
 * UNLOADED -> LOADING -> ACTIVE <-> HIBERNATING -> UNLOADING -> UNLOADED
 */
export enum ClientChunkState {
  /** No data loaded, chunk not in memory */
  Unloaded = 'unloaded',

  /** Currently fetching terrain/entity data */
  Loading = 'loading',

  /** Fully loaded, rendered, physics active */
  Active = 'active',

  /** Geometry retained in GPU, entities frozen, no physics updates */
  Hibernating = 'hibernating',

  /** Disposing resources, syncing dirty state to server */
  Unloading = 'unloading',
}

// =============================================================================
// SERVER-SIDE CHUNK STATES
// =============================================================================

/**
 * Server-side chunk lifecycle states
 *
 * State transitions:
 * COLD -> WARM <-> HOT -> COOLING -> COLD/WARM
 */
export enum ServerChunkState {
  /** Data on disk only, no memory allocation */
  Cold = 'cold',

  /** Entity registry loaded, no active simulation */
  Warm = 'warm',

  /** Full simulation, broadcasting to subscribed players */
  Hot = 'hot',

  /** Grace period before transitioning to Cold/Warm */
  Cooling = 'cooling',
}

// =============================================================================
// LOD (Level of Detail)
// =============================================================================

/**
 * LOD level for terrain and entities.
 * LOD0 = highest detail (closest to player)
 */
export enum LODLevel {
  /** Full detail: 33x33 vertices, full entity meshes */
  LOD0 = 0,

  /** Half detail: 17x17 vertices, simplified entity meshes */
  LOD1 = 1,

  /** Quarter detail: 9x9 vertices, billboard entities */
  LOD2 = 2,

  /** Ultra-low detail: 5x5 vertices, no entities rendered */
  LOD3 = 3,
}

/**
 * Resolution (vertices per edge) for each LOD level
 */
export const LOD_RESOLUTIONS: Record<LODLevel, number> = {
  [LODLevel.LOD0]: 33,
  [LODLevel.LOD1]: 17,
  [LODLevel.LOD2]: 9,
  [LODLevel.LOD3]: 5,
};

// =============================================================================
// PRIORITY SYSTEM
// =============================================================================

/**
 * Streaming priority factors.
 * Lower total value = higher priority for loading.
 */
export interface ChunkPriority {
  /** Base priority from distance to player (0 = at player position) */
  distance: number;

  /** Visibility penalty: +1000 if chunk is not in camera frustum */
  visibilityPenalty: number;

  /**
   * Velocity bonus: negative value means chunk is ahead of movement direction.
   * Range: -100 (directly ahead) to +100 (directly behind)
   */
  velocityBonus: number;

  /** Final computed priority: sum of all factors */
  final: number;
}

/**
 * Create a default priority object
 */
export function createDefaultPriority(): ChunkPriority {
  return {
    distance: Infinity,
    visibilityPenalty: 0,
    velocityBonus: 0,
    final: Infinity,
  };
}

// =============================================================================
// ENTITY TYPES
// =============================================================================

/**
 * Persistence tier for entities.
 * Determines when and how entities are saved.
 */
export type PersistenceTier = 'ephemeral' | 'chunk' | 'immediate';

/**
 * Entity within a chunk
 */
export interface ChunkEntity {
  /** Unique entity ID (UUID) */
  id: string;

  /** Asset/prefab ID for instantiation */
  assetId: string;

  /** World-space position [x, y, z] */
  position: Vector3Tuple;

  /** Rotation as quaternion [x, y, z, w] */
  rotation: [number, number, number, number];

  /** Uniform or per-axis scale */
  scale: Vector3Tuple | number;

  /**
   * Persistence tier:
   * - 'ephemeral': In-memory only, lost on chunk unload (projectiles, particles)
   * - 'chunk': Saved when chunk transitions to COOLING (resources, loot)
   * - 'immediate': Saved immediately with debounce (player structures)
   */
  persistenceTier: PersistenceTier;

  /** If true, entity respawns when chunk reloads (for ephemeral NPCs) */
  respawnable: boolean;

  /** Entity type for filtering (npc, resource, structure, pickup, etc.) */
  entityType: string;

  /** Entity-specific metadata */
  metadata?: Record<string, unknown>;

  /** Dirty flag - entity has unsaved changes */
  isDirty?: boolean;

  /** Timestamp of last save */
  lastSaved?: number;
}

// =============================================================================
// UNIFIED CHUNK DATA
// =============================================================================

/**
 * Unified chunk data structure.
 * Combines terrain geometry and entity data.
 */
export interface UnifiedChunk {
  /** Deterministic chunk ID */
  id: ChunkId;

  /** Grid X coordinate */
  x: number;

  /** Grid Z coordinate */
  z: number;

  /** Current LOD level */
  lod: LODLevel;

  /** Current lifecycle state */
  state: ClientChunkState;

  /** Distance from player (meters) */
  distance: number;

  /** Streaming priority */
  priority: ChunkPriority;

  // === Terrain Geometry ===

  /** Heightmap data (null if not loaded) */
  heightmap: Float32Array | null;

  /** Vertex positions (interleaved x, y, z) */
  vertices: Float32Array | null;

  /** Vertex normals */
  normals: Float32Array | null;

  /** UV coordinates */
  uvs: Float32Array | null;

  /** Triangle indices */
  indices: Uint32Array | null;

  // === Entity Data ===

  /** Entities owned by this chunk */
  entities: ChunkEntity[];

  /** Entity IDs currently spawned in scene (for tracking) */
  spawnedEntityIds: Set<string>;

  // === Lifecycle Metadata ===

  /** Frame number when last accessed */
  lastAccessFrame: number;

  /** Timestamp when entered hibernation (0 if not hibernating) */
  hibernationStart: number;

  /** Number of load retry attempts */
  loadRetries: number;

  /** Dirty flag - chunk has entities that need server sync */
  isDirty: boolean;

  /** Timestamp of last server sync */
  lastServerSync: number;
}

/**
 * Create a new empty chunk
 */
export function createEmptyChunk(
  id: ChunkId,
  x: number,
  z: number,
  lod: LODLevel = LODLevel.LOD0
): UnifiedChunk {
  return {
    id,
    x,
    z,
    lod,
    state: ClientChunkState.Unloaded,
    distance: Infinity,
    priority: createDefaultPriority(),
    heightmap: null,
    vertices: null,
    normals: null,
    uvs: null,
    indices: null,
    entities: [],
    spawnedEntityIds: new Set(),
    lastAccessFrame: 0,
    hibernationStart: 0,
    loadRetries: 0,
    isDirty: false,
    lastServerSync: 0,
  };
}

// =============================================================================
// CHUNK EVENTS
// =============================================================================

/**
 * Chunk update event types
 */
export type ChunkEventType =
  | 'load'
  | 'unload'
  | 'lod-change'
  | 'hibernate'
  | 'wake'
  | 'entity-add'
  | 'entity-remove'
  | 'entity-update';

/**
 * Chunk update event emitted to React components
 */
export interface ChunkUpdateEvent {
  /** Event type */
  type: ChunkEventType;

  /** Affected chunk ID */
  chunkId: ChunkId;

  /** Chunk data (if applicable) */
  chunk?: UnifiedChunk;

  /** For entity events, the affected entity IDs */
  entityIds?: string[];

  /** Timestamp of the event */
  timestamp: number;
}

// =============================================================================
// STREAMING CONFIGURATION
// =============================================================================

/**
 * Configuration for the streaming system
 */
export interface ChunkStreamingConfig {
  /** Chunk size in meters (default: 64) */
  chunkSize: number;

  /** World size in meters (default: 768) */
  worldSize: number;

  /** Load radius in meters - chunks within this distance are loaded (default: 192) */
  loadRadius: number;

  /** Hibernate radius in meters - between load and unload (default: 224) */
  hibernateRadius: number;

  /** Unload radius in meters - must be > loadRadius for hysteresis (default: 256) */
  unloadRadius: number;

  /** Maximum chunks to load per frame (default: 4) */
  maxLoadsPerFrame: number;

  /** Maximum chunks to unload per frame (default: 2) */
  maxUnloadsPerFrame: number;

  /** LOD distance thresholds */
  lodDistances: {
    lod0: number;
    lod1: number;
    lod2: number;
    lod3: number;
  };

  /** Hibernation timeout before unload in ms (default: 30000) */
  hibernationTimeout: number;

  /** Grace period before hibernating in ms (default: 2000) */
  gracePeriod: number;

  /** Enable velocity-based predictive loading (default: true) */
  predictiveLoading: boolean;

  /** Velocity lookahead time in seconds (default: 1.5) */
  velocityLookahead: number;

  /** Chunk overlap margin for border entities in meters (default: 8) */
  overlapMargin: number;

  /** Maximum load retries before giving up (default: 3) */
  maxLoadRetries: number;
}

/**
 * Default streaming configuration
 */
export const DEFAULT_STREAMING_CONFIG: ChunkStreamingConfig = {
  chunkSize: 64,
  worldSize: 768,
  loadRadius: 192, // 3 chunks
  hibernateRadius: 224, // Between load and unload
  unloadRadius: 256, // 4 chunks (hysteresis buffer)
  maxLoadsPerFrame: 4,
  maxUnloadsPerFrame: 2,
  lodDistances: {
    lod0: 96,
    lod1: 192,
    lod2: 384,
    lod3: 768,
  },
  hibernationTimeout: 30000, // 30 seconds
  gracePeriod: 2000, // 2 seconds
  predictiveLoading: true,
  velocityLookahead: 1.5, // 1.5 seconds ahead
  overlapMargin: 8, // 8 meter overlap zone
  maxLoadRetries: 3,
};

// =============================================================================
// PLAYER VELOCITY
// =============================================================================

/**
 * Player velocity for predictive loading
 */
export interface PlayerVelocity {
  /** X component (meters/second) */
  x: number;

  /** Z component (meters/second) */
  z: number;

  /** Magnitude in m/s */
  magnitude: number;
}

/**
 * Create a zero velocity
 */
export function createZeroVelocity(): PlayerVelocity {
  return { x: 0, z: 0, magnitude: 0 };
}

// =============================================================================
// STREAMING STATISTICS
// =============================================================================

/**
 * Streaming statistics for debugging/monitoring
 */
export interface ChunkStreamingStats {
  /** Total chunks in memory */
  totalChunks: number;

  /** Chunks by state */
  byState: Record<ClientChunkState, number>;

  /** Chunks in load queue */
  loadQueueLength: number;

  /** Chunks in unload queue */
  unloadQueueLength: number;

  /** Total entities across all chunks */
  totalEntities: number;

  /** Spawned entities (actually in scene) */
  spawnedEntities: number;

  /** Memory estimate (bytes) */
  estimatedMemoryBytes: number;

  /** Average frame time for streaming updates (ms) */
  avgFrameTimeMs: number;

  /** Current frame number */
  frameNumber: number;
}
