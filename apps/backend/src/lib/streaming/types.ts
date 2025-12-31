/**
 * Server-Side Chunk Streaming Types
 *
 * Type definitions for server-side chunk management.
 * These types mirror the frontend types for consistency.
 *
 * @module streaming/types
 */

// =============================================================================
// CHUNK IDENTIFICATION
// =============================================================================

/**
 * Deterministic chunk identifier using grid coordinates.
 * Format: "${chunkX},${chunkZ}" e.g., "5,3" or "-2,7"
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
 * Check if a string is a valid ChunkId
 */
export function isValidChunkId(value: unknown): value is ChunkId {
  if (typeof value !== 'string') return false;
  const parts = value.split(',');
  if (parts.length !== 2) return false;
  const [x, z] = parts.map(Number);
  return !isNaN(x) && !isNaN(z) && Number.isInteger(x) && Number.isInteger(z);
}

// =============================================================================
// SERVER-SIDE CHUNK STATES
// =============================================================================

/**
 * Server-side chunk lifecycle states
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
// ENTITY TYPES
// =============================================================================

/**
 * Persistence tier for entities
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
  position: [number, number, number];

  /** Rotation as quaternion [x, y, z, w] */
  rotation: [number, number, number, number];

  /** Uniform or per-axis scale */
  scale: [number, number, number] | number;

  /** Persistence tier */
  persistenceTier: PersistenceTier;

  /** If true, entity respawns when chunk reloads */
  respawnable: boolean;

  /** Entity type for filtering */
  entityType: string;

  /** Entity-specific metadata */
  metadata?: Record<string, unknown>;

  /** Dirty flag - entity has unsaved changes */
  isDirty?: boolean;

  /** Timestamp of last save */
  lastSaved?: number;
}

// =============================================================================
// PLAYER SUBSCRIPTION
// =============================================================================

/**
 * Player subscription to a chunk
 */
export interface ChunkSubscription {
  /** Player's user ID */
  playerId: string;

  /** Socket ID for this connection */
  socketId: string;

  /** When the subscription was created */
  subscribedAt: number;

  /** Player's position when they subscribed */
  position: { x: number; z: number };

  /** Requested LOD level */
  lodLevel?: number;
}

// =============================================================================
// SERVER CHUNK
// =============================================================================

/**
 * Server-side chunk state
 */
export interface ServerChunk {
  /** Chunk identifier */
  id: ChunkId;

  /** Grid coordinates */
  x: number;
  z: number;

  /** Current state */
  state: ServerChunkState;

  /** Players subscribed to this chunk's updates */
  subscribers: Map<string, ChunkSubscription>;

  /** Players physically present in this chunk */
  presentPlayers: Set<string>;

  /** Entities owned by this chunk */
  entities: Map<string, ChunkEntity>;

  /** Entities visible from adjacent chunks (within overlap margin) */
  overlapEntities: Map<string, Set<ChunkId>>;

  /** Last update timestamp */
  lastUpdate: number;

  /** Cooling start time (0 if not cooling) */
  coolingStart: number;

  /** Dirty flag - has entities that need persistence */
  isDirty: boolean;
}

// =============================================================================
// ENTITY HANDOFF
// =============================================================================

/**
 * Entity ownership change event
 */
export interface OwnershipChangeEvent {
  /** Change type */
  type: 'handoff' | 'claim' | 'release';

  /** Entity ID */
  entityId: string;

  /** Source chunk (null for claims) */
  fromChunk: ChunkId | null;

  /** Destination chunk (null for releases) */
  toChunk: ChunkId | null;

  /** Timestamp */
  timestamp: number;
}

/**
 * Pending handoff state
 */
export interface PendingHandoff {
  /** Entity being handed off */
  entityId: string;

  /** Source chunk */
  fromChunk: ChunkId;

  /** Destination chunk */
  toChunk: ChunkId;

  /** Handoff start time */
  startTime: number;

  /** Current phase */
  phase: 'pending' | 'transitioning' | 'complete';

  /** Entity data snapshot */
  entity: ChunkEntity;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

/**
 * Server-side chunk configuration
 */
export interface ServerChunkConfig {
  /** Chunk size in meters */
  chunkSize: number;

  /** World size in meters */
  worldSize: number;

  /** Overlap margin for border entities (meters) */
  overlapMargin: number;

  /** Cooling timeout before transitioning to Cold (ms) */
  coolingTimeout: number;

  /** Handoff overlap window (ms) */
  handoffOverlapTime: number;

  /** Hot chunk simulation tick rate (ms) */
  hotTickRate: number;

  /** Cooling chunk simulation tick rate (ms) */
  coolingTickRate: number;
}

/**
 * Default server chunk configuration
 */
export const DEFAULT_SERVER_CHUNK_CONFIG: ServerChunkConfig = {
  chunkSize: 64,
  worldSize: 768,
  overlapMargin: 8,
  coolingTimeout: 10000, // 10 seconds
  handoffOverlapTime: 200, // 200ms
  hotTickRate: 50, // 20Hz
  coolingTickRate: 200, // 5Hz
};

// =============================================================================
// REGISTRY STATISTICS
// =============================================================================

/**
 * Registry statistics
 */
export interface ChunkRegistryStats {
  /** Total chunks in registry */
  totalChunks: number;

  /** Hot chunks */
  hotChunks: number;

  /** Warm chunks */
  warmChunks: number;

  /** Cooling chunks */
  coolingChunks: number;

  /** Cold chunks */
  coldChunks: number;

  /** Total subscriptions across all chunks */
  totalSubscriptions: number;

  /** Total entities across all chunks */
  totalEntities: number;

  /** Pending handoffs */
  pendingHandoffs: number;
}
