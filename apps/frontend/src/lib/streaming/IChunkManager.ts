/**
 * Unified ChunkManager Interface
 *
 * Defines the contract for the chunk streaming system.
 * Manages both terrain geometry and entity streaming in a unified way.
 *
 * @module streaming/IChunkManager
 */

import type { Frustum, Vector3 } from 'three';
import type {
  ChunkId,
  UnifiedChunk,
  ChunkUpdateEvent,
  ChunkStreamingConfig,
  ChunkStreamingStats,
  ChunkEntity,
  PlayerVelocity,
  LODLevel,
  ClientChunkState,
} from './types';

// =============================================================================
// CALLBACK TYPES
// =============================================================================

/**
 * Callback for chunk lifecycle events
 */
export type ChunkEventCallback = (event: ChunkUpdateEvent) => void;

/**
 * Callback for terrain geometry loading
 */
export type TerrainLoadCallback = (
  chunk: UnifiedChunk
) => Promise<{
  heightmap: Float32Array;
  vertices: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
  indices: Uint32Array;
}>;

/**
 * Callback for entity loading from server
 */
export type EntityLoadCallback = (chunkId: ChunkId) => Promise<ChunkEntity[]>;

/**
 * Callback for entity spawning in scene
 */
export type EntitySpawnCallback = (chunkId: ChunkId, entity: ChunkEntity) => void;

/**
 * Callback for entity despawning from scene
 */
export type EntityDespawnCallback = (chunkId: ChunkId, entityId: string) => void;

// =============================================================================
// CHUNK MANAGER INTERFACE
// =============================================================================

/**
 * Unified ChunkManager interface.
 * Manages both terrain geometry and entity streaming.
 */
export interface IChunkManager {
  // ===========================================================================
  // CONFIGURATION
  // ===========================================================================

  /**
   * Get current streaming configuration
   */
  getConfig(): ChunkStreamingConfig;

  /**
   * Update streaming configuration.
   * Changes take effect on next update() call.
   *
   * @param config Partial config to merge with existing
   */
  setConfig(config: Partial<ChunkStreamingConfig>): void;

  // ===========================================================================
  // CORE UPDATE LOOP
  // ===========================================================================

  /**
   * Main update function - call once per frame.
   *
   * This is the heart of the streaming system. Each frame:
   * 1. Predicts player position based on velocity
   * 2. Calculates which chunks are needed
   * 3. Updates priorities for all chunks
   * 4. Processes state transitions (active -> hibernate, etc.)
   * 5. Processes load queue (budgeted per frame)
   * 6. Processes unload queue (budgeted per frame)
   * 7. Updates LOD levels
   * 8. Syncs with server (throttled)
   *
   * @param playerPosition Current player world position
   * @param playerVelocity Current player velocity (for prediction)
   * @param cameraFrustum Optional frustum for visibility culling
   * @returns Array of chunk update events for this frame
   */
  update(
    playerPosition: Vector3,
    playerVelocity: PlayerVelocity,
    cameraFrustum?: Frustum
  ): ChunkUpdateEvent[];

  // ===========================================================================
  // CHUNK QUERIES
  // ===========================================================================

  /**
   * Get chunk by ID
   *
   * @param id Chunk ID in format "x,z"
   * @returns Chunk data or null if not loaded
   */
  getChunk(id: ChunkId): UnifiedChunk | null;

  /**
   * Get chunk at world position
   *
   * @param worldX World X coordinate
   * @param worldZ World Z coordinate
   * @returns Chunk data or null if not loaded
   */
  getChunkAtPosition(worldX: number, worldZ: number): UnifiedChunk | null;

  /**
   * Get chunk ID for a world position (even if not loaded)
   *
   * @param worldX World X coordinate
   * @param worldZ World Z coordinate
   * @returns Chunk ID
   */
  getChunkIdAtPosition(worldX: number, worldZ: number): ChunkId;

  /**
   * Get all chunks in a specific state
   *
   * @param state Client chunk state to filter by
   * @returns Array of chunks in that state
   */
  getChunksByState(state: ClientChunkState): UnifiedChunk[];

  /**
   * Get all active (rendered) chunks
   */
  getActiveChunks(): UnifiedChunk[];

  /**
   * Get all hibernating chunks
   */
  getHibernatingChunks(): UnifiedChunk[];

  /**
   * Get all visible chunks (active + in frustum)
   *
   * @param frustum Camera frustum for visibility test
   */
  getVisibleChunks(frustum?: Frustum): UnifiedChunk[];

  /**
   * Check if a chunk is loaded (active or hibernating)
   *
   * @param id Chunk ID
   */
  isChunkLoaded(id: ChunkId): boolean;

  /**
   * Check if a chunk is in the load queue
   *
   * @param id Chunk ID
   */
  isChunkQueued(id: ChunkId): boolean;

  // ===========================================================================
  // ENTITY MANAGEMENT
  // ===========================================================================

  /**
   * Get entities in a chunk
   *
   * @param chunkId Chunk ID
   * @returns Array of entities in the chunk
   */
  getChunkEntities(chunkId: ChunkId): ChunkEntity[];

  /**
   * Get entities within radius of a position (cross-chunk query)
   *
   * @param position World position center
   * @param radius Search radius in meters
   * @returns Array of entities with their chunk IDs
   */
  getEntitiesInRadius(
    position: Vector3,
    radius: number
  ): Array<{ entity: ChunkEntity; chunkId: ChunkId }>;

  /**
   * Get entities by type across all loaded chunks
   *
   * @param entityType Entity type to filter by (e.g., 'npc', 'resource')
   * @returns Array of entities with their chunk IDs
   */
  getEntitiesByType(
    entityType: string
  ): Array<{ entity: ChunkEntity; chunkId: ChunkId }>;

  /**
   * Mark an entity as dirty (needs server sync)
   *
   * @param chunkId Chunk containing the entity
   * @param entityId Entity ID
   */
  markEntityDirty(chunkId: ChunkId, entityId: string): void;

  /**
   * Add entity to chunk (from server update or local spawn)
   *
   * @param chunkId Target chunk ID
   * @param entity Entity to add
   */
  addEntity(chunkId: ChunkId, entity: ChunkEntity): void;

  /**
   * Remove entity from chunk
   *
   * @param chunkId Chunk containing the entity
   * @param entityId Entity ID to remove
   * @returns The removed entity or null
   */
  removeEntity(chunkId: ChunkId, entityId: string): ChunkEntity | null;

  /**
   * Update entity data
   *
   * @param chunkId Chunk containing the entity
   * @param entityId Entity ID
   * @param updates Partial entity data to merge
   */
  updateEntity(
    chunkId: ChunkId,
    entityId: string,
    updates: Partial<ChunkEntity>
  ): void;

  // ===========================================================================
  // LOD MANAGEMENT
  // ===========================================================================

  /**
   * Get LOD level for a distance
   *
   * @param distance Distance from player in meters
   * @returns Appropriate LOD level
   */
  getLODForDistance(distance: number): LODLevel;

  /**
   * Force LOD update for a chunk
   *
   * @param chunkId Chunk ID
   * @param lod New LOD level
   */
  updateChunkLOD(chunkId: ChunkId, lod: LODLevel): void;

  // ===========================================================================
  // LIFECYCLE CONTROLS
  // ===========================================================================

  /**
   * Force load specific chunks synchronously.
   * Used for initial spawn, teleport, etc.
   *
   * @param chunkIds Chunks to load
   */
  forceLoadChunks(chunkIds: ChunkId[]): Promise<void>;

  /**
   * Force unload specific chunks immediately
   *
   * @param chunkIds Chunks to unload
   */
  forceUnloadChunks(chunkIds: ChunkId[]): void;

  /**
   * Manually hibernate a chunk (keep geometry, freeze entities)
   *
   * @param chunkId Chunk to hibernate
   */
  hibernateChunk(chunkId: ChunkId): void;

  /**
   * Wake a hibernating chunk
   *
   * @param chunkId Chunk to wake
   */
  wakeChunk(chunkId: ChunkId): void;

  /**
   * Clear all chunks (scene reset)
   */
  clear(): void;

  /**
   * Dispose all resources and clean up
   */
  dispose(): void;

  // ===========================================================================
  // EVENT CALLBACKS
  // ===========================================================================

  /**
   * Register callback for chunk events
   *
   * @param callback Function to call on chunk events
   * @returns Unsubscribe function
   */
  onChunkEvent(callback: ChunkEventCallback): () => void;

  /**
   * Set terrain loading callback
   *
   * @param callback Function that loads terrain geometry
   */
  setTerrainLoader(callback: TerrainLoadCallback): void;

  /**
   * Set entity loading callback
   *
   * @param callback Function that loads entities from server
   */
  setEntityLoader(callback: EntityLoadCallback): void;

  /**
   * Set entity spawn callback
   *
   * @param callback Function called when entity should be spawned in scene
   */
  setEntitySpawnCallback(callback: EntitySpawnCallback): void;

  /**
   * Set entity despawn callback
   *
   * @param callback Function called when entity should be removed from scene
   */
  setEntityDespawnCallback(callback: EntityDespawnCallback): void;

  // ===========================================================================
  // STATISTICS
  // ===========================================================================

  /**
   * Get streaming statistics for debugging/monitoring
   */
  getStats(): ChunkStreamingStats;

  // ===========================================================================
  // SERVER SYNC
  // ===========================================================================

  /**
   * Get chunks that need to be subscribed to on server
   */
  getChunksToSubscribe(): ChunkId[];

  /**
   * Get chunks that should be unsubscribed from server
   */
  getChunksToUnsubscribe(): ChunkId[];

  /**
   * Mark chunks as subscribed on server
   *
   * @param chunkIds Chunks that were successfully subscribed
   */
  markSubscribed(chunkIds: ChunkId[]): void;

  /**
   * Mark chunks as unsubscribed from server
   *
   * @param chunkIds Chunks that were successfully unsubscribed
   */
  markUnsubscribed(chunkIds: ChunkId[]): void;

  /**
   * Handle incoming entity updates from server
   *
   * @param chunkId Chunk the update is for
   * @param updates Entity updates to apply
   */
  handleServerEntityUpdates(
    chunkId: ChunkId,
    updates: Array<{
      entityId: string;
      type: 'create' | 'update' | 'delete' | 'handoff';
      entity?: ChunkEntity;
      handoffTo?: ChunkId;
    }>
  ): void;

  /**
   * Get dirty entities that need to be synced to server
   *
   * @returns Map of chunk ID to dirty entities
   */
  getDirtyEntities(): Map<ChunkId, ChunkEntity[]>;

  /**
   * Mark entities as synced to server
   *
   * @param chunkId Chunk ID
   * @param entityIds Entity IDs that were synced
   */
  markEntitiesSynced(chunkId: ChunkId, entityIds: string[]): void;
}
