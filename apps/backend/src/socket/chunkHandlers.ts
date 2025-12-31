/**
 * Chunk Streaming Socket Handlers
 *
 * Socket.IO event handlers for chunk subscription and entity updates.
 * Import and call setupChunkHandlers() from the main socket index.ts
 *
 * @module socket/chunkHandlers
 */

import type { Server, Socket } from 'socket.io';
import {
  getChunkRegistry,
  type ChunkId,
  type ChunkEntity,
  ServerChunkState,
  isValidChunkId,
  parseChunkId,
  createChunkId,
} from '../lib/streaming';

// =============================================================================
// SOCKET EVENT NAMES (matching frontend protocol)
// =============================================================================

const CHUNK_EVENTS = {
  // Client → Server
  SUBSCRIBE: 'chunk:subscribe',
  UNSUBSCRIBE: 'chunk:unsubscribe',
  POSITION_UPDATE: 'chunk:position',
  ENTITY_INTERACT: 'chunk:entity-interact',
  ENTITY_UPDATE: 'chunk:entity-update-request',

  // Server → Client
  CHUNK_DATA: 'chunk:data',
  ENTITY_DELTA: 'chunk:entity-delta',
  PLAYER_PRESENCE: 'chunk:player-presence',
  SUBSCRIBE_ACK: 'chunk:subscribe-ack',
  UNSUBSCRIBE_ACK: 'chunk:unsubscribe-ack',
  STATE_CHANGE: 'chunk:state-change',
  ERROR: 'chunk:error',
} as const;

// =============================================================================
// TYPES
// =============================================================================

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
}

interface ChunkSubscribePayload {
  chunks: ChunkId[];
  position: { x: number; y: number; z: number };
  lodLevels?: Partial<Record<ChunkId, number>>;
}

interface ChunkUnsubscribePayload {
  chunks: ChunkId[];
}

interface ChunkPositionUpdatePayload {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
  currentChunk: ChunkId;
  animationState?: string;
  weaponType?: 'none' | 'rifle' | 'pistol';
  clientTime: number;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

const CHUNK_CONFIG = {
  chunkSize: 64,
  worldSize: 768,
  maxSubscriptionsPerPlayer: 25, // ~5x5 grid
  positionUpdateThrottleMs: 50, // 20Hz
  entityBroadcastThrottleMs: 100, // 10Hz
};

// =============================================================================
// STATE
// =============================================================================

// Track last position update time per player
const lastPositionUpdate = new Map<string, number>();

// Track current chunk per player
const playerCurrentChunk = new Map<string, ChunkId>();

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Calculate chunk ID from world position
 */
function worldToChunkId(x: number, z: number): ChunkId {
  const { chunkSize, worldSize } = CHUNK_CONFIG;
  const chunkX = Math.floor((x + worldSize / 2) / chunkSize);
  const chunkZ = Math.floor((z + worldSize / 2) / chunkSize);
  return createChunkId(chunkX, chunkZ);
}

/**
 * Validate subscription payload
 */
function isValidSubscribePayload(payload: unknown): payload is ChunkSubscribePayload {
  if (!payload || typeof payload !== 'object') return false;
  const p = payload as Record<string, unknown>;

  if (!Array.isArray(p.chunks)) return false;
  if (!p.chunks.every(isValidChunkId)) return false;
  if (p.chunks.length > CHUNK_CONFIG.maxSubscriptionsPerPlayer) return false;

  if (!p.position || typeof p.position !== 'object') return false;
  const pos = p.position as Record<string, unknown>;
  if (typeof pos.x !== 'number' || typeof pos.y !== 'number' || typeof pos.z !== 'number') {
    return false;
  }

  return true;
}

/**
 * Validate position update payload
 */
function isValidPositionPayload(payload: unknown): payload is ChunkPositionUpdatePayload {
  if (!payload || typeof payload !== 'object') return false;
  const p = payload as Record<string, unknown>;

  if (!p.position || typeof p.position !== 'object') return false;
  if (!p.currentChunk || !isValidChunkId(p.currentChunk)) return false;
  if (typeof p.clientTime !== 'number') return false;

  return true;
}

// =============================================================================
// SETUP FUNCTION
// =============================================================================

/**
 * Set up chunk streaming socket handlers
 *
 * @param io Socket.IO server instance
 * @param socket Authenticated socket connection
 */
export function setupChunkHandlers(io: Server, socket: AuthenticatedSocket): void {
  const registry = getChunkRegistry();
  const playerId = socket.userId || socket.id;

  console.log(`[ChunkHandlers] Setting up for player ${playerId}`);

  // ---------------------------------------------------------------------------
  // SUBSCRIBE TO CHUNKS
  // ---------------------------------------------------------------------------
  socket.on(CHUNK_EVENTS.SUBSCRIBE, (payload: unknown) => {
    if (!isValidSubscribePayload(payload)) {
      socket.emit(CHUNK_EVENTS.ERROR, {
        code: 'INVALID_PAYLOAD',
        message: 'Invalid subscribe payload',
        serverTime: Date.now(),
      });
      return;
    }

    const subscribed: ChunkId[] = [];
    const failed: Array<{ chunkId: ChunkId; reason: string }> = [];

    for (const chunkId of payload.chunks) {
      try {
        // Subscribe player to chunk
        registry.subscribePlayer(
          chunkId,
          playerId,
          socket.id,
          { x: payload.position.x, z: payload.position.z },
          payload.lodLevels?.[chunkId]
        );

        // Join Socket.IO room for this chunk
        socket.join(`chunk:${chunkId}`);

        subscribed.push(chunkId);

        // Send chunk data to player
        const entities = registry.getVisibleEntities(chunkId);
        const chunk = registry.getChunk(chunkId);

        socket.emit(CHUNK_EVENTS.CHUNK_DATA, {
          chunkId,
          entities,
          overlapEntities: [], // TODO: Include overlap entities from adjacent chunks
          serverState: chunk?.state || ServerChunkState.Warm,
          serverTime: Date.now(),
          sequence: 0,
        });

        console.log(`[ChunkHandlers] Player ${playerId} subscribed to chunk ${chunkId}`);
      } catch (error) {
        failed.push({
          chunkId,
          reason: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Send acknowledgment
    socket.emit(CHUNK_EVENTS.SUBSCRIBE_ACK, {
      subscribed,
      failed,
      serverTime: Date.now(),
    });
  });

  // ---------------------------------------------------------------------------
  // UNSUBSCRIBE FROM CHUNKS
  // ---------------------------------------------------------------------------
  socket.on(CHUNK_EVENTS.UNSUBSCRIBE, (payload: unknown) => {
    if (!payload || typeof payload !== 'object') return;
    const p = payload as { chunks?: unknown[] };

    if (!Array.isArray(p.chunks)) return;

    const unsubscribed: ChunkId[] = [];

    for (const chunkId of p.chunks) {
      if (!isValidChunkId(chunkId)) continue;

      registry.unsubscribePlayer(chunkId, playerId);
      socket.leave(`chunk:${chunkId}`);
      unsubscribed.push(chunkId);

      console.log(`[ChunkHandlers] Player ${playerId} unsubscribed from chunk ${chunkId}`);
    }

    socket.emit(CHUNK_EVENTS.UNSUBSCRIBE_ACK, {
      unsubscribed,
      serverTime: Date.now(),
    });
  });

  // ---------------------------------------------------------------------------
  // POSITION UPDATE
  // ---------------------------------------------------------------------------
  socket.on(CHUNK_EVENTS.POSITION_UPDATE, (payload: unknown) => {
    if (!isValidPositionPayload(payload)) return;

    // Throttle updates
    const now = Date.now();
    const lastUpdate = lastPositionUpdate.get(playerId) || 0;
    if (now - lastUpdate < CHUNK_CONFIG.positionUpdateThrottleMs) return;
    lastPositionUpdate.set(playerId, now);

    const oldChunk = playerCurrentChunk.get(playerId);
    const newChunk = payload.currentChunk;

    // Update player presence if chunk changed
    if (oldChunk !== newChunk) {
      if (oldChunk) {
        registry.setPlayerPresent(oldChunk, playerId, false);

        // Broadcast player left to old chunk subscribers
        io.to(`chunk:${oldChunk}`).emit(CHUNK_EVENTS.PLAYER_PRESENCE, {
          playerId,
          username: playerId, // TODO: Get actual username
          chunkId: oldChunk,
          action: 'left',
          playerCount: registry.getChunk(oldChunk)?.presentPlayers.size || 0,
          serverTime: now,
        });
      }

      registry.setPlayerPresent(newChunk, playerId, true);
      playerCurrentChunk.set(playerId, newChunk);

      // Broadcast player entered to new chunk subscribers
      io.to(`chunk:${newChunk}`).emit(CHUNK_EVENTS.PLAYER_PRESENCE, {
        playerId,
        username: playerId, // TODO: Get actual username
        chunkId: newChunk,
        action: 'entered',
        playerCount: registry.getChunk(newChunk)?.presentPlayers.size || 0,
        serverTime: now,
      });
    }
  });

  // ---------------------------------------------------------------------------
  // ENTITY INTERACTION
  // ---------------------------------------------------------------------------
  socket.on(CHUNK_EVENTS.ENTITY_INTERACT, (payload: unknown) => {
    if (!payload || typeof payload !== 'object') return;
    const p = payload as {
      chunkId?: unknown;
      entityId?: unknown;
      interactionType?: unknown;
      data?: unknown;
    };

    if (!isValidChunkId(p.chunkId) || typeof p.entityId !== 'string') {
      socket.emit(CHUNK_EVENTS.ERROR, {
        code: 'INVALID_PAYLOAD',
        message: 'Invalid interaction payload',
        serverTime: Date.now(),
      });
      return;
    }

    const entity = registry.findEntity(p.entityId);
    if (!entity) {
      socket.emit(CHUNK_EVENTS.ERROR, {
        code: 'ENTITY_NOT_FOUND',
        message: `Entity ${p.entityId} not found`,
        entityId: p.entityId,
        serverTime: Date.now(),
      });
      return;
    }

    // TODO: Process interaction based on type
    // This is where game-specific logic would go
    console.log(`[ChunkHandlers] Player ${playerId} interacting with entity ${p.entityId}: ${p.interactionType}`);
  });

  // ---------------------------------------------------------------------------
  // DISCONNECT CLEANUP
  // ---------------------------------------------------------------------------
  socket.on('disconnect', () => {
    // Clean up all subscriptions
    registry.unsubscribePlayerFromAll(playerId);

    // Clean up presence
    const currentChunk = playerCurrentChunk.get(playerId);
    if (currentChunk) {
      registry.setPlayerPresent(currentChunk, playerId, false);

      io.to(`chunk:${currentChunk}`).emit(CHUNK_EVENTS.PLAYER_PRESENCE, {
        playerId,
        username: playerId,
        chunkId: currentChunk,
        action: 'left',
        playerCount: registry.getChunk(currentChunk)?.presentPlayers.size || 0,
        serverTime: Date.now(),
      });
    }

    // Clean up tracking
    lastPositionUpdate.delete(playerId);
    playerCurrentChunk.delete(playerId);

    console.log(`[ChunkHandlers] Cleaned up for player ${playerId}`);
  });
}

// =============================================================================
// BROADCAST HELPERS
// =============================================================================

/**
 * Broadcast entity update to all subscribers of affected chunks
 */
export function broadcastEntityUpdate(
  io: Server,
  chunkId: ChunkId,
  entityId: string,
  updateType: 'create' | 'update' | 'delete' | 'handoff',
  entity?: ChunkEntity,
  handoffTo?: ChunkId
): void {
  const registry = getChunkRegistry();
  const affectedChunks = registry.getChunksForEntity(chunkId, entityId);

  for (const affectedChunkId of affectedChunks) {
    io.to(`chunk:${affectedChunkId}`).emit(CHUNK_EVENTS.ENTITY_DELTA, {
      chunkId: affectedChunkId,
      updates: [{
        entityId,
        type: updateType,
        entity,
        handoffTo,
      }],
      serverTime: Date.now(),
      sequence: 0, // TODO: Implement sequence numbers
    });
  }
}

/**
 * Broadcast chunk state change
 */
export function broadcastChunkStateChange(
  io: Server,
  chunkId: ChunkId,
  previousState: ServerChunkState,
  newState: ServerChunkState
): void {
  io.to(`chunk:${chunkId}`).emit(CHUNK_EVENTS.STATE_CHANGE, {
    chunkId,
    previousState,
    newState,
    serverTime: Date.now(),
  });
}
