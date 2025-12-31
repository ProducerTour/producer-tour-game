// Streaming module exports

// Asset streaming (textures, models, audio)
export {
  StreamingManager,
  getStreamingManager,
  resetStreamingManager,
} from './StreamingManager';
export type { StreamingAsset, StreamingConfig } from './StreamingManager';

// Chunk streaming types
export {
  ClientChunkState,
  ServerChunkState,
  LODLevel,
  LOD_RESOLUTIONS,
  DEFAULT_STREAMING_CONFIG,
  createChunkId,
  parseChunkId,
  worldToChunkCoord,
  chunkCoordToWorld,
  createEmptyChunk,
  createDefaultPriority,
  createZeroVelocity,
} from './types';

export type {
  ChunkId,
  ChunkPriority,
  ChunkEntity,
  PersistenceTier,
  UnifiedChunk,
  ChunkUpdateEvent,
  ChunkEventType,
  ChunkStreamingConfig,
  ChunkStreamingStats,
  PlayerVelocity,
} from './types';

// Chunk manager interface
export type {
  IChunkManager,
  ChunkEventCallback,
  TerrainLoadCallback,
  EntityLoadCallback,
  EntitySpawnCallback,
  EntityDespawnCallback,
} from './IChunkManager';

// Chunk manager implementation
export { UnifiedChunkManager } from './UnifiedChunkManager';

// Priority queue
export { PriorityQueue, ChunkPriorityQueue } from './PriorityQueue';

// Socket protocol
export { CHUNK_EVENTS, isValidChunkId, isValidSubscribePayload, isValidPositionPayload } from './protocol';
export type {
  ChunkSubscribePayload,
  ChunkUnsubscribePayload,
  ChunkPositionUpdatePayload,
  EntityInteractPayload,
  EntityUpdateRequestPayload,
  ChunkDataPayload,
  EntityDeltaPayload,
  EntityUpdate,
  PlayerPresencePayload,
  SubscribeAckPayload,
  UnsubscribeAckPayload,
  ChunkStateChangePayload,
  ChunkErrorPayload,
  ChunkClientEventHandlers,
  ChunkServerEventHandlers,
} from './protocol';

// React hooks
export {
  useChunkStreaming,
  useChunkManager,
  useChunkStats,
} from './useChunkStreaming';
export type {
  UseChunkStreamingOptions,
  UseChunkStreamingReturn,
} from './useChunkStreaming';
