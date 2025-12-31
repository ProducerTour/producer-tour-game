/**
 * Chunk Streaming Socket.IO Protocol
 *
 * Defines the socket events and payloads for chunk-based streaming.
 * This file should be shared between frontend and backend.
 *
 * @module streaming/protocol
 */

import type { ChunkId, ChunkEntity, LODLevel, ServerChunkState } from './types';

// =============================================================================
// SOCKET EVENT NAMES
// =============================================================================

/**
 * Socket event names for chunk streaming
 */
export const CHUNK_EVENTS = {
  // === Client → Server ===

  /** Subscribe to chunk updates */
  SUBSCRIBE: 'chunk:subscribe',

  /** Unsubscribe from chunk updates */
  UNSUBSCRIBE: 'chunk:unsubscribe',

  /** Player position update with chunk context */
  POSITION_UPDATE: 'chunk:position',

  /** Entity interaction request */
  ENTITY_INTERACT: 'chunk:entity-interact',

  /** Entity update (client-authoritative for owned entities) */
  ENTITY_UPDATE: 'chunk:entity-update-request',

  // === Server → Client ===

  /** Full chunk data payload */
  CHUNK_DATA: 'chunk:data',

  /** Entity delta updates */
  ENTITY_DELTA: 'chunk:entity-delta',

  /** Player entered/left chunk notification */
  PLAYER_PRESENCE: 'chunk:player-presence',

  /** Subscription acknowledgment */
  SUBSCRIBE_ACK: 'chunk:subscribe-ack',

  /** Unsubscription acknowledgment */
  UNSUBSCRIBE_ACK: 'chunk:unsubscribe-ack',

  /** Error response */
  ERROR: 'chunk:error',

  /** Chunk state change notification */
  STATE_CHANGE: 'chunk:state-change',
} as const;

// =============================================================================
// CLIENT → SERVER PAYLOADS
// =============================================================================

/**
 * Client → Server: Subscribe to chunks
 */
export interface ChunkSubscribePayload {
  /** Chunks to subscribe to */
  chunks: ChunkId[];

  /** Current player position */
  position: { x: number; y: number; z: number };

  /** Requested LOD levels per chunk (optional) */
  lodLevels?: Partial<Record<ChunkId, LODLevel>>;
}

/**
 * Client → Server: Unsubscribe from chunks
 */
export interface ChunkUnsubscribePayload {
  /** Chunks to unsubscribe from */
  chunks: ChunkId[];
}

/**
 * Client → Server: Player position update with chunk context
 */
export interface ChunkPositionUpdatePayload {
  /** Current position */
  position: { x: number; y: number; z: number };

  /** Current rotation (euler angles) */
  rotation: { x: number; y: number; z: number };

  /** Current velocity */
  velocity: { x: number; y: number; z: number };

  /** Current chunk the player is in */
  currentChunk: ChunkId;

  /** Animation state for other players */
  animationState?: string;

  /** Equipped weapon */
  weaponType?: 'none' | 'rifle' | 'pistol';

  /** Timestamp for latency calculation */
  clientTime: number;
}

/**
 * Client → Server: Entity interaction request
 */
export interface EntityInteractPayload {
  /** Chunk containing the entity */
  chunkId: ChunkId;

  /** Entity ID to interact with */
  entityId: string;

  /** Interaction type */
  interactionType: 'use' | 'pickup' | 'attack' | 'talk';

  /** Additional interaction data */
  data?: Record<string, unknown>;
}

/**
 * Client → Server: Entity update request (for client-authoritative entities)
 */
export interface EntityUpdateRequestPayload {
  /** Chunk containing the entity */
  chunkId: ChunkId;

  /** Entity ID */
  entityId: string;

  /** Updated entity data */
  updates: Partial<ChunkEntity>;

  /** Sequence number for ordering */
  sequence: number;
}

// =============================================================================
// SERVER → CLIENT PAYLOADS
// =============================================================================

/**
 * Server → Client: Full chunk data payload
 */
export interface ChunkDataPayload {
  /** Chunk ID */
  chunkId: ChunkId;

  /** Entities owned by this chunk */
  entities: ChunkEntity[];

  /** Overlap entities from adjacent chunks (visible due to border proximity) */
  overlapEntities: Array<{
    entity: ChunkEntity;
    sourceChunk: ChunkId;
  }>;

  /** Current chunk state on server */
  serverState: ServerChunkState;

  /** Server timestamp for sync */
  serverTime: number;

  /** Sequence number for ordering */
  sequence: number;
}

/**
 * Server → Client: Entity delta updates
 */
export interface EntityDeltaPayload {
  /** Chunk ID */
  chunkId: ChunkId;

  /** Entity updates */
  updates: EntityUpdate[];

  /** Server timestamp */
  serverTime: number;

  /** Sequence number for ordering */
  sequence: number;
}

/**
 * Individual entity update within a delta
 */
export interface EntityUpdate {
  /** Entity ID */
  entityId: string;

  /** Update type */
  type: 'create' | 'update' | 'delete' | 'handoff';

  /** Entity data (for create/update) */
  entity?: ChunkEntity;

  /** Partial entity data (for update - only changed fields) */
  changes?: Partial<ChunkEntity>;

  /** For handoffs, the destination chunk */
  handoffTo?: ChunkId;

  /** For handoffs, the source chunk */
  handoffFrom?: ChunkId;
}

/**
 * Server → Client: Player presence in chunk
 */
export interface PlayerPresencePayload {
  /** Player ID */
  playerId: string;

  /** Player display name */
  username: string;

  /** Chunk ID */
  chunkId: ChunkId;

  /** Action type */
  action: 'entered' | 'left';

  /** Player count in chunk after this action */
  playerCount: number;

  /** Server timestamp */
  serverTime: number;
}

/**
 * Server → Client: Subscription acknowledgment
 */
export interface SubscribeAckPayload {
  /** Chunks that were successfully subscribed */
  subscribed: ChunkId[];

  /** Chunks that failed to subscribe (with reasons) */
  failed: Array<{
    chunkId: ChunkId;
    reason: string;
  }>;

  /** Server timestamp */
  serverTime: number;
}

/**
 * Server → Client: Unsubscription acknowledgment
 */
export interface UnsubscribeAckPayload {
  /** Chunks that were successfully unsubscribed */
  unsubscribed: ChunkId[];

  /** Server timestamp */
  serverTime: number;
}

/**
 * Server → Client: Chunk state change
 */
export interface ChunkStateChangePayload {
  /** Chunk ID */
  chunkId: ChunkId;

  /** Previous state */
  previousState: ServerChunkState;

  /** New state */
  newState: ServerChunkState;

  /** Server timestamp */
  serverTime: number;
}

/**
 * Server → Client: Error response
 */
export interface ChunkErrorPayload {
  /** Error code */
  code:
    | 'INVALID_CHUNK'
    | 'NOT_SUBSCRIBED'
    | 'ENTITY_NOT_FOUND'
    | 'PERMISSION_DENIED'
    | 'RATE_LIMITED'
    | 'SERVER_ERROR';

  /** Human-readable message */
  message: string;

  /** Related chunk ID (if applicable) */
  chunkId?: ChunkId;

  /** Related entity ID (if applicable) */
  entityId?: string;

  /** Server timestamp */
  serverTime: number;
}

// =============================================================================
// TYPE GUARDS
// =============================================================================

/**
 * Check if an object is a valid ChunkId
 */
export function isValidChunkId(value: unknown): value is ChunkId {
  if (typeof value !== 'string') return false;
  const parts = value.split(',');
  if (parts.length !== 2) return false;
  const [x, z] = parts.map(Number);
  return !isNaN(x) && !isNaN(z) && Number.isInteger(x) && Number.isInteger(z);
}

/**
 * Validate a subscribe payload
 */
export function isValidSubscribePayload(
  payload: unknown
): payload is ChunkSubscribePayload {
  if (!payload || typeof payload !== 'object') return false;
  const p = payload as Record<string, unknown>;

  if (!Array.isArray(p.chunks)) return false;
  if (!p.chunks.every(isValidChunkId)) return false;

  if (!p.position || typeof p.position !== 'object') return false;
  const pos = p.position as Record<string, unknown>;
  if (typeof pos.x !== 'number' || typeof pos.y !== 'number' || typeof pos.z !== 'number') {
    return false;
  }

  return true;
}

/**
 * Validate a position update payload
 */
export function isValidPositionPayload(
  payload: unknown
): payload is ChunkPositionUpdatePayload {
  if (!payload || typeof payload !== 'object') return false;
  const p = payload as Record<string, unknown>;

  if (!p.position || typeof p.position !== 'object') return false;
  if (!p.rotation || typeof p.rotation !== 'object') return false;
  if (!p.velocity || typeof p.velocity !== 'object') return false;
  if (!isValidChunkId(p.currentChunk)) return false;
  if (typeof p.clientTime !== 'number') return false;

  return true;
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

/**
 * Socket event handler map for client-side
 */
export interface ChunkClientEventHandlers {
  [CHUNK_EVENTS.CHUNK_DATA]: (payload: ChunkDataPayload) => void;
  [CHUNK_EVENTS.ENTITY_DELTA]: (payload: EntityDeltaPayload) => void;
  [CHUNK_EVENTS.PLAYER_PRESENCE]: (payload: PlayerPresencePayload) => void;
  [CHUNK_EVENTS.SUBSCRIBE_ACK]: (payload: SubscribeAckPayload) => void;
  [CHUNK_EVENTS.UNSUBSCRIBE_ACK]: (payload: UnsubscribeAckPayload) => void;
  [CHUNK_EVENTS.STATE_CHANGE]: (payload: ChunkStateChangePayload) => void;
  [CHUNK_EVENTS.ERROR]: (payload: ChunkErrorPayload) => void;
}

/**
 * Socket event handler map for server-side
 */
export interface ChunkServerEventHandlers {
  [CHUNK_EVENTS.SUBSCRIBE]: (payload: ChunkSubscribePayload) => void;
  [CHUNK_EVENTS.UNSUBSCRIBE]: (payload: ChunkUnsubscribePayload) => void;
  [CHUNK_EVENTS.POSITION_UPDATE]: (payload: ChunkPositionUpdatePayload) => void;
  [CHUNK_EVENTS.ENTITY_INTERACT]: (payload: EntityInteractPayload) => void;
  [CHUNK_EVENTS.ENTITY_UPDATE]: (payload: EntityUpdateRequestPayload) => void;
}
