/**
 * Unified Chunk Manager
 *
 * Core implementation of the chunk-based world streaming system.
 * Manages terrain geometry and entity streaming with velocity-based
 * predictive loading and hibernate state support.
 *
 * @module streaming/UnifiedChunkManager
 */

import { Vector3, Vector2, Box3, Frustum } from 'three';
import { ChunkPriorityQueue } from './PriorityQueue';
import type { IChunkManager, ChunkEventCallback, TerrainLoadCallback, EntityLoadCallback, EntitySpawnCallback, EntityDespawnCallback } from './IChunkManager';
import {
  type ChunkId,
  type UnifiedChunk,
  type ChunkUpdateEvent,
  type ChunkStreamingConfig,
  type ChunkStreamingStats,
  type ChunkEntity,
  type PlayerVelocity,
  ClientChunkState,
  LODLevel,
  DEFAULT_STREAMING_CONFIG,
  createChunkId,
  parseChunkId,
  createEmptyChunk,
} from './types';

// =============================================================================
// UNIFIED CHUNK MANAGER
// =============================================================================

/**
 * Unified ChunkManager implementation.
 * Manages both terrain geometry and entity streaming.
 */
export class UnifiedChunkManager implements IChunkManager {
  // Configuration
  private config: ChunkStreamingConfig;

  // Chunk storage
  private chunks: Map<ChunkId, UnifiedChunk> = new Map();

  // Load/unload queues
  private loadQueue: ChunkPriorityQueue = new ChunkPriorityQueue();
  private unloadQueue: ChunkId[] = [];

  // Server subscription tracking
  private subscribedChunks: Set<ChunkId> = new Set();
  private pendingSubscriptions: Set<ChunkId> = new Set();
  private pendingUnsubscriptions: Set<ChunkId> = new Set();

  // Frame tracking
  private frameCount = 0;
  private lastUpdateTime = 0;
  private frameTimes: number[] = [];

  // Player state
  private lastPlayerPosition: Vector3 = new Vector3();

  // Event callbacks
  private eventCallbacks: Set<ChunkEventCallback> = new Set();

  // Loader callbacks
  private terrainLoader?: TerrainLoadCallback;
  private entityLoader?: EntityLoadCallback;
  private entitySpawnCallback?: EntitySpawnCallback;
  private entityDespawnCallback?: EntityDespawnCallback;

  // Reusable objects for performance
  private tempVector2 = new Vector2();
  private tempBox = new Box3();

  constructor(config: Partial<ChunkStreamingConfig> = {}) {
    this.config = { ...DEFAULT_STREAMING_CONFIG, ...config };
  }

  // ===========================================================================
  // CONFIGURATION
  // ===========================================================================

  getConfig(): ChunkStreamingConfig {
    return { ...this.config };
  }

  setConfig(config: Partial<ChunkStreamingConfig>): void {
    this.config = { ...this.config, ...config };
  }

  // ===========================================================================
  // CORE UPDATE LOOP
  // ===========================================================================

  update(
    playerPosition: Vector3,
    playerVelocity: PlayerVelocity,
    cameraFrustum?: Frustum
  ): ChunkUpdateEvent[] {
    const startTime = performance.now();
    const events: ChunkUpdateEvent[] = [];
    this.frameCount++;

    // 1. Predict position based on velocity
    const predictedPosition = this.config.predictiveLoading
      ? this.predictPosition(playerPosition, playerVelocity)
      : playerPosition;

    // 2. Calculate required chunks
    const requiredChunks = this.calculateRequiredChunks(
      playerPosition,
      predictedPosition,
      playerVelocity
    );

    // 3. Update priorities for all chunks
    this.updateChunkPriorities(playerPosition, playerVelocity, cameraFrustum);

    // 4. Queue new chunks for loading
    for (const chunkId of requiredChunks) {
      if (!this.chunks.has(chunkId) && !this.loadQueue.contains(chunkId)) {
        this.queueChunkLoad(chunkId, playerPosition, playerVelocity);
      }
    }

    // 5. Process state transitions
    const transitionEvents = this.processStateTransitions(
      requiredChunks,
      playerPosition
    );
    events.push(...transitionEvents);

    // 6. Process load queue (budgeted)
    const loadEvents = this.processLoadQueue();
    events.push(...loadEvents);

    // 7. Process unload queue (budgeted)
    const unloadEvents = this.processUnloadQueue();
    events.push(...unloadEvents);

    // 8. Update LOD levels
    const lodEvents = this.updateLODLevels(playerPosition);
    events.push(...lodEvents);

    // 9. Cache state for next frame
    this.lastPlayerPosition.copy(playerPosition);

    // Track frame time
    const frameTime = performance.now() - startTime;
    this.frameTimes.push(frameTime);
    if (this.frameTimes.length > 60) this.frameTimes.shift();
    this.lastUpdateTime = Date.now();

    return events;
  }

  // ===========================================================================
  // POSITION PREDICTION
  // ===========================================================================

  private predictPosition(
    currentPosition: Vector3,
    velocity: PlayerVelocity
  ): Vector3 {
    const lookahead = this.config.velocityLookahead;
    return new Vector3(
      currentPosition.x + velocity.x * lookahead,
      currentPosition.y,
      currentPosition.z + velocity.z * lookahead
    );
  }

  // ===========================================================================
  // REQUIRED CHUNKS CALCULATION
  // ===========================================================================

  private calculateRequiredChunks(
    playerPosition: Vector3,
    predictedPosition: Vector3,
    velocity: PlayerVelocity
  ): Set<ChunkId> {
    const required = new Set<ChunkId>();
    const loadRadius = this.config.loadRadius;

    // Get chunks in radius around current position
    const currentChunks = this.getChunksInRadius(playerPosition, loadRadius);
    for (const id of currentChunks) {
      required.add(id);
    }

    // If moving fast, also include chunks toward predicted position
    if (velocity.magnitude > 2) {
      const predictedChunks = this.getChunksInRadius(
        predictedPosition,
        loadRadius * 0.5
      );
      for (const id of predictedChunks) {
        required.add(id);
      }
    }

    return required;
  }

  private getChunksInRadius(position: Vector3, radius: number): ChunkId[] {
    const chunks: ChunkId[] = [];
    const { chunkSize, worldSize } = this.config;
    const chunkRadius = Math.ceil(radius / chunkSize) + 1;
    const chunksPerAxis = Math.ceil(worldSize / chunkSize);

    const centerX = Math.floor((position.x + worldSize / 2) / chunkSize);
    const centerZ = Math.floor((position.z + worldSize / 2) / chunkSize);

    for (let dz = -chunkRadius; dz <= chunkRadius; dz++) {
      for (let dx = -chunkRadius; dx <= chunkRadius; dx++) {
        const x = centerX + dx;
        const z = centerZ + dz;

        // Skip out of bounds
        if (x < 0 || x >= chunksPerAxis || z < 0 || z >= chunksPerAxis) {
          continue;
        }

        const distance = this.distanceToChunk(position.x, position.z, x, z);
        if (distance <= radius) {
          chunks.push(createChunkId(x, z));
        }
      }
    }

    return chunks;
  }

  private distanceToChunk(
    worldX: number,
    worldZ: number,
    chunkX: number,
    chunkZ: number
  ): number {
    const { chunkSize, worldSize } = this.config;
    const chunkCenterX = chunkX * chunkSize - worldSize / 2 + chunkSize / 2;
    const chunkCenterZ = chunkZ * chunkSize - worldSize / 2 + chunkSize / 2;
    const dx = worldX - chunkCenterX;
    const dz = worldZ - chunkCenterZ;
    return Math.sqrt(dx * dx + dz * dz);
  }

  // ===========================================================================
  // PRIORITY CALCULATION
  // ===========================================================================

  private updateChunkPriorities(
    playerPosition: Vector3,
    velocity: PlayerVelocity,
    frustum?: Frustum
  ): void {
    const { chunkSize, worldSize } = this.config;

    for (const chunk of this.chunks.values()) {
      const distance = this.distanceToChunk(
        playerPosition.x,
        playerPosition.z,
        chunk.x,
        chunk.z
      );

      chunk.distance = distance;
      chunk.priority.distance = distance;

      // Visibility penalty
      if (frustum) {
        const chunkCenterX = chunk.x * chunkSize - worldSize / 2 + chunkSize / 2;
        const chunkCenterZ = chunk.z * chunkSize - worldSize / 2 + chunkSize / 2;

        this.tempBox.min.set(
          chunkCenterX - chunkSize / 2,
          -10,
          chunkCenterZ - chunkSize / 2
        );
        this.tempBox.max.set(
          chunkCenterX + chunkSize / 2,
          100,
          chunkCenterZ + chunkSize / 2
        );

        const isVisible = frustum.intersectsBox(this.tempBox);
        chunk.priority.visibilityPenalty = isVisible ? 0 : 1000;
      } else {
        chunk.priority.visibilityPenalty = 0;
      }

      // Velocity bonus
      if (velocity.magnitude > 1) {
        const chunkCenterX = chunk.x * chunkSize - worldSize / 2 + chunkSize / 2;
        const chunkCenterZ = chunk.z * chunkSize - worldSize / 2 + chunkSize / 2;

        this.tempVector2.set(
          chunkCenterX - playerPosition.x,
          chunkCenterZ - playerPosition.z
        ).normalize();

        const velocityDir = new Vector2(velocity.x, velocity.z).normalize();
        const dot = this.tempVector2.dot(velocityDir);

        // dot = 1 means ahead, -1 means behind
        chunk.priority.velocityBonus = -dot * 100;
      } else {
        chunk.priority.velocityBonus = 0;
      }

      // Compute final priority
      chunk.priority.final =
        chunk.priority.distance +
        chunk.priority.visibilityPenalty +
        chunk.priority.velocityBonus;

      // Update queue priority if in queue
      if (this.loadQueue.contains(chunk.id)) {
        this.loadQueue.updatePriority(chunk.id, chunk.priority.final);
      }
    }
  }

  // ===========================================================================
  // STATE TRANSITIONS
  // ===========================================================================

  private processStateTransitions(
    requiredChunks: Set<ChunkId>,
    _playerPosition: Vector3
  ): ChunkUpdateEvent[] {
    const events: ChunkUpdateEvent[] = [];
    const now = Date.now();

    for (const [chunkId, chunk] of this.chunks) {
      switch (chunk.state) {
        case ClientChunkState.Active:
          // Check if should hibernate
          if (
            !requiredChunks.has(chunkId) &&
            chunk.distance > this.config.hibernateRadius
          ) {
            if (chunk.hibernationStart === 0) {
              chunk.hibernationStart = now;
            } else if (now - chunk.hibernationStart > this.config.gracePeriod) {
              chunk.state = ClientChunkState.Hibernating;
              this.freezeChunkEntities(chunk);
              events.push(this.createEvent('hibernate', chunkId, chunk));
            }
          } else {
            chunk.hibernationStart = 0;
          }
          break;

        case ClientChunkState.Hibernating:
          // Check if should wake
          if (
            requiredChunks.has(chunkId) ||
            chunk.distance < this.config.hibernateRadius
          ) {
            chunk.state = ClientChunkState.Active;
            chunk.hibernationStart = 0;
            this.wakeChunkEntities(chunk);
            events.push(this.createEvent('wake', chunkId, chunk));
          }
          // Check if should unload
          else if (
            chunk.distance > this.config.unloadRadius ||
            now - chunk.hibernationStart > this.config.hibernationTimeout
          ) {
            chunk.state = ClientChunkState.Unloading;
            this.unloadQueue.push(chunkId);
          }
          break;

        case ClientChunkState.Loading:
          // Loading is handled by processLoadQueue
          break;

        case ClientChunkState.Unloading:
          // Unloading is handled by processUnloadQueue
          break;
      }
    }

    return events;
  }

  private freezeChunkEntities(_chunk: UnifiedChunk): void {
    // Mark entities as frozen - actual freeze logic handled by spawn callback
    // Entities remain spawned but frozen - no-op for now
  }

  private wakeChunkEntities(_chunk: UnifiedChunk): void {
    // Wake frozen entities - actual wake logic handled by spawn callback
    // Entities resume updates - no-op for now
  }

  // ===========================================================================
  // LOAD QUEUE PROCESSING
  // ===========================================================================

  private queueChunkLoad(
    chunkId: ChunkId,
    playerPosition: Vector3,
    velocity: PlayerVelocity
  ): void {
    const { x, z } = parseChunkId(chunkId);
    const distance = this.distanceToChunk(playerPosition.x, playerPosition.z, x, z);

    // Create placeholder chunk
    const chunk = createEmptyChunk(chunkId, x, z, this.getLODForDistance(distance));
    chunk.state = ClientChunkState.Loading;
    chunk.distance = distance;
    chunk.lastAccessFrame = this.frameCount;

    // Calculate priority
    this.updateSingleChunkPriority(chunk, playerPosition, velocity);

    this.chunks.set(chunkId, chunk);
    this.loadQueue.enqueue(chunkId, chunk.priority.final);

    // Mark for server subscription
    if (!this.subscribedChunks.has(chunkId)) {
      this.pendingSubscriptions.add(chunkId);
    }
  }

  private updateSingleChunkPriority(
    chunk: UnifiedChunk,
    playerPosition: Vector3,
    velocity: PlayerVelocity
  ): void {
    const { chunkSize, worldSize } = this.config;
    const chunkCenterX = chunk.x * chunkSize - worldSize / 2 + chunkSize / 2;
    const chunkCenterZ = chunk.z * chunkSize - worldSize / 2 + chunkSize / 2;

    chunk.priority.distance = chunk.distance;
    chunk.priority.visibilityPenalty = 0; // Assume visible initially

    if (velocity.magnitude > 1) {
      this.tempVector2.set(
        chunkCenterX - playerPosition.x,
        chunkCenterZ - playerPosition.z
      ).normalize();

      const velocityDir = new Vector2(velocity.x, velocity.z).normalize();
      const dot = this.tempVector2.dot(velocityDir);
      chunk.priority.velocityBonus = -dot * 100;
    } else {
      chunk.priority.velocityBonus = 0;
    }

    chunk.priority.final =
      chunk.priority.distance +
      chunk.priority.visibilityPenalty +
      chunk.priority.velocityBonus;
  }

  private processLoadQueue(): ChunkUpdateEvent[] {
    const events: ChunkUpdateEvent[] = [];
    const maxLoads = this.config.maxLoadsPerFrame;

    for (let i = 0; i < maxLoads && !this.loadQueue.isEmpty(); i++) {
      const chunkId = this.loadQueue.dequeue() as ChunkId | undefined;
      if (!chunkId) break;

      const chunk = this.chunks.get(chunkId);
      if (!chunk || chunk.state !== ClientChunkState.Loading) continue;

      // Synchronous terrain generation (async would need different handling)
      this.loadChunkSync(chunk);

      // loadChunkSync sets state to Active on success
      if (chunk.state === (ClientChunkState.Active as ClientChunkState)) {
        events.push(this.createEvent('load', chunkId, chunk));
      }
    }

    return events;
  }

  private loadChunkSync(chunk: UnifiedChunk): void {
    try {
      // Note: For async terrain/entity loading, use loadChunkAsync instead
      // This sync version is for when HeightmapGenerator provides terrain data
      // If loaders are set, they indicate async loading is available but not used here
      const hasAsyncLoaders = !!(this.terrainLoader || this.entityLoader);
      if (hasAsyncLoaders) {
        // Async loaders available - in production these would be called
        // For now, proceed with sync loading
      }

      chunk.state = ClientChunkState.Active;
      chunk.lastAccessFrame = this.frameCount;
      chunk.loadRetries = 0;

      // Spawn entities
      for (const entity of chunk.entities) {
        if (!chunk.spawnedEntityIds.has(entity.id)) {
          this.entitySpawnCallback?.(chunk.id, entity);
          chunk.spawnedEntityIds.add(entity.id);
        }
      }
    } catch (error) {
      chunk.loadRetries++;
      if (chunk.loadRetries < this.config.maxLoadRetries) {
        this.loadQueue.enqueue(chunk.id, chunk.priority.final + 500);
      } else {
        console.error(`Failed to load chunk ${chunk.id} after ${chunk.loadRetries} retries`);
        this.chunks.delete(chunk.id);
      }
    }
  }

  // ===========================================================================
  // UNLOAD QUEUE PROCESSING
  // ===========================================================================

  private processUnloadQueue(): ChunkUpdateEvent[] {
    const events: ChunkUpdateEvent[] = [];
    const maxUnloads = this.config.maxUnloadsPerFrame;

    for (let i = 0; i < maxUnloads && this.unloadQueue.length > 0; i++) {
      const chunkId = this.unloadQueue.shift();
      if (!chunkId) break;

      const chunk = this.chunks.get(chunkId);
      if (!chunk) continue;

      // Despawn entities
      for (const entityId of chunk.spawnedEntityIds) {
        this.entityDespawnCallback?.(chunkId, entityId);
      }
      chunk.spawnedEntityIds.clear();

      // Mark for server unsubscription
      if (this.subscribedChunks.has(chunkId)) {
        this.pendingUnsubscriptions.add(chunkId);
      }

      // Remove chunk
      this.chunks.delete(chunkId);
      events.push(this.createEvent('unload', chunkId));
    }

    return events;
  }

  // ===========================================================================
  // LOD MANAGEMENT
  // ===========================================================================

  private updateLODLevels(_playerPosition: Vector3): ChunkUpdateEvent[] {
    const events: ChunkUpdateEvent[] = [];

    for (const chunk of this.chunks.values()) {
      if (chunk.state !== ClientChunkState.Active) continue;

      const newLOD = this.getLODForDistance(chunk.distance);
      if (newLOD !== chunk.lod) {
        chunk.lod = newLOD;
        events.push(this.createEvent('lod-change', chunk.id, chunk));
      }
    }

    return events;
  }

  getLODForDistance(distance: number): LODLevel {
    const { lodDistances } = this.config;
    if (distance <= lodDistances.lod0) return LODLevel.LOD0;
    if (distance <= lodDistances.lod1) return LODLevel.LOD1;
    if (distance <= lodDistances.lod2) return LODLevel.LOD2;
    return LODLevel.LOD3;
  }

  updateChunkLOD(chunkId: ChunkId, lod: LODLevel): void {
    const chunk = this.chunks.get(chunkId);
    if (chunk && chunk.lod !== lod) {
      chunk.lod = lod;
      this.emitEvent(this.createEvent('lod-change', chunkId, chunk));
    }
  }

  // ===========================================================================
  // CHUNK QUERIES
  // ===========================================================================

  getChunk(id: ChunkId): UnifiedChunk | null {
    return this.chunks.get(id) ?? null;
  }

  getChunkAtPosition(worldX: number, worldZ: number): UnifiedChunk | null {
    const chunkId = this.getChunkIdAtPosition(worldX, worldZ);
    return this.chunks.get(chunkId) ?? null;
  }

  getChunkIdAtPosition(worldX: number, worldZ: number): ChunkId {
    const { chunkSize, worldSize } = this.config;
    const x = Math.floor((worldX + worldSize / 2) / chunkSize);
    const z = Math.floor((worldZ + worldSize / 2) / chunkSize);
    return createChunkId(x, z);
  }

  getChunksByState(state: ClientChunkState): UnifiedChunk[] {
    return Array.from(this.chunks.values()).filter((c) => c.state === state);
  }

  getActiveChunks(): UnifiedChunk[] {
    return this.getChunksByState(ClientChunkState.Active);
  }

  getHibernatingChunks(): UnifiedChunk[] {
    return this.getChunksByState(ClientChunkState.Hibernating);
  }

  getVisibleChunks(frustum?: Frustum): UnifiedChunk[] {
    const active = this.getActiveChunks();
    if (!frustum) return active;

    const { chunkSize, worldSize } = this.config;
    return active.filter((chunk) => {
      const chunkCenterX = chunk.x * chunkSize - worldSize / 2 + chunkSize / 2;
      const chunkCenterZ = chunk.z * chunkSize - worldSize / 2 + chunkSize / 2;

      this.tempBox.min.set(
        chunkCenterX - chunkSize / 2,
        -10,
        chunkCenterZ - chunkSize / 2
      );
      this.tempBox.max.set(
        chunkCenterX + chunkSize / 2,
        100,
        chunkCenterZ + chunkSize / 2
      );

      return frustum.intersectsBox(this.tempBox);
    });
  }

  isChunkLoaded(id: ChunkId): boolean {
    const chunk = this.chunks.get(id);
    return chunk?.state === ClientChunkState.Active ||
           chunk?.state === ClientChunkState.Hibernating;
  }

  isChunkQueued(id: ChunkId): boolean {
    return this.loadQueue.contains(id);
  }

  // ===========================================================================
  // ENTITY MANAGEMENT
  // ===========================================================================

  getChunkEntities(chunkId: ChunkId): ChunkEntity[] {
    return this.chunks.get(chunkId)?.entities ?? [];
  }

  getEntitiesInRadius(
    position: Vector3,
    radius: number
  ): Array<{ entity: ChunkEntity; chunkId: ChunkId }> {
    const results: Array<{ entity: ChunkEntity; chunkId: ChunkId }> = [];
    const radiusSq = radius * radius;

    for (const [chunkId, chunk] of this.chunks) {
      for (const entity of chunk.entities) {
        const dx = entity.position[0] - position.x;
        const dy = entity.position[1] - position.y;
        const dz = entity.position[2] - position.z;
        const distSq = dx * dx + dy * dy + dz * dz;

        if (distSq <= radiusSq) {
          results.push({ entity, chunkId });
        }
      }
    }

    return results;
  }

  getEntitiesByType(
    entityType: string
  ): Array<{ entity: ChunkEntity; chunkId: ChunkId }> {
    const results: Array<{ entity: ChunkEntity; chunkId: ChunkId }> = [];

    for (const [chunkId, chunk] of this.chunks) {
      for (const entity of chunk.entities) {
        if (entity.entityType === entityType) {
          results.push({ entity, chunkId });
        }
      }
    }

    return results;
  }

  markEntityDirty(chunkId: ChunkId, entityId: string): void {
    const chunk = this.chunks.get(chunkId);
    if (!chunk) return;

    const entity = chunk.entities.find((e) => e.id === entityId);
    if (entity) {
      entity.isDirty = true;
      chunk.isDirty = true;
    }
  }

  addEntity(chunkId: ChunkId, entity: ChunkEntity): void {
    const chunk = this.chunks.get(chunkId);
    if (!chunk) return;

    // Check if entity already exists
    const existingIndex = chunk.entities.findIndex((e) => e.id === entity.id);
    if (existingIndex >= 0) {
      chunk.entities[existingIndex] = entity;
    } else {
      chunk.entities.push(entity);
    }

    // Spawn if chunk is active
    if (chunk.state === ClientChunkState.Active && !chunk.spawnedEntityIds.has(entity.id)) {
      this.entitySpawnCallback?.(chunkId, entity);
      chunk.spawnedEntityIds.add(entity.id);
    }

    this.emitEvent(this.createEvent('entity-add', chunkId, chunk, [entity.id]));
  }

  removeEntity(chunkId: ChunkId, entityId: string): ChunkEntity | null {
    const chunk = this.chunks.get(chunkId);
    if (!chunk) return null;

    const index = chunk.entities.findIndex((e) => e.id === entityId);
    if (index < 0) return null;

    const [removed] = chunk.entities.splice(index, 1);

    // Despawn if spawned
    if (chunk.spawnedEntityIds.has(entityId)) {
      this.entityDespawnCallback?.(chunkId, entityId);
      chunk.spawnedEntityIds.delete(entityId);
    }

    this.emitEvent(this.createEvent('entity-remove', chunkId, chunk, [entityId]));
    return removed;
  }

  updateEntity(
    chunkId: ChunkId,
    entityId: string,
    updates: Partial<ChunkEntity>
  ): void {
    const chunk = this.chunks.get(chunkId);
    if (!chunk) return;

    const entity = chunk.entities.find((e) => e.id === entityId);
    if (!entity) return;

    Object.assign(entity, updates);
    this.emitEvent(this.createEvent('entity-update', chunkId, chunk, [entityId]));
  }

  // ===========================================================================
  // LIFECYCLE CONTROLS
  // ===========================================================================

  async forceLoadChunks(chunkIds: ChunkId[]): Promise<void> {
    for (const chunkId of chunkIds) {
      if (this.chunks.has(chunkId)) continue;

      const { x, z } = parseChunkId(chunkId);
      const chunk = createEmptyChunk(chunkId, x, z);
      chunk.state = ClientChunkState.Loading;
      chunk.lastAccessFrame = this.frameCount;

      this.chunks.set(chunkId, chunk);
      this.loadChunkSync(chunk);
    }
  }

  forceUnloadChunks(chunkIds: ChunkId[]): void {
    for (const chunkId of chunkIds) {
      const chunk = this.chunks.get(chunkId);
      if (!chunk) continue;

      // Despawn entities
      for (const entityId of chunk.spawnedEntityIds) {
        this.entityDespawnCallback?.(chunkId, entityId);
      }

      this.chunks.delete(chunkId);
      this.loadQueue.remove(chunkId);
      this.pendingUnsubscriptions.add(chunkId);
    }
  }

  hibernateChunk(chunkId: ChunkId): void {
    const chunk = this.chunks.get(chunkId);
    if (!chunk || chunk.state !== ClientChunkState.Active) return;

    chunk.state = ClientChunkState.Hibernating;
    chunk.hibernationStart = Date.now();
    this.freezeChunkEntities(chunk);
    this.emitEvent(this.createEvent('hibernate', chunkId, chunk));
  }

  wakeChunk(chunkId: ChunkId): void {
    const chunk = this.chunks.get(chunkId);
    if (!chunk || chunk.state !== ClientChunkState.Hibernating) return;

    chunk.state = ClientChunkState.Active;
    chunk.hibernationStart = 0;
    this.wakeChunkEntities(chunk);
    this.emitEvent(this.createEvent('wake', chunkId, chunk));
  }

  clear(): void {
    for (const [chunkId, chunk] of this.chunks) {
      for (const entityId of chunk.spawnedEntityIds) {
        this.entityDespawnCallback?.(chunkId, entityId);
      }
    }

    this.chunks.clear();
    this.loadQueue.clear();
    this.unloadQueue = [];
    this.subscribedChunks.clear();
    this.pendingSubscriptions.clear();
    this.pendingUnsubscriptions.clear();
  }

  dispose(): void {
    this.clear();
    this.eventCallbacks.clear();
  }

  // ===========================================================================
  // EVENT CALLBACKS
  // ===========================================================================

  onChunkEvent(callback: ChunkEventCallback): () => void {
    this.eventCallbacks.add(callback);
    return () => this.eventCallbacks.delete(callback);
  }

  setTerrainLoader(callback: TerrainLoadCallback): void {
    this.terrainLoader = callback;
  }

  setEntityLoader(callback: EntityLoadCallback): void {
    this.entityLoader = callback;
  }

  setEntitySpawnCallback(callback: EntitySpawnCallback): void {
    this.entitySpawnCallback = callback;
  }

  setEntityDespawnCallback(callback: EntityDespawnCallback): void {
    this.entityDespawnCallback = callback;
  }

  private emitEvent(event: ChunkUpdateEvent): void {
    for (const callback of this.eventCallbacks) {
      callback(event);
    }
  }

  private createEvent(
    type: ChunkUpdateEvent['type'],
    chunkId: ChunkId,
    chunk?: UnifiedChunk,
    entityIds?: string[]
  ): ChunkUpdateEvent {
    return {
      type,
      chunkId,
      chunk,
      entityIds,
      timestamp: Date.now(),
    };
  }

  // ===========================================================================
  // STATISTICS
  // ===========================================================================

  getStats(): ChunkStreamingStats {
    const byState: Record<ClientChunkState, number> = {
      [ClientChunkState.Unloaded]: 0,
      [ClientChunkState.Loading]: 0,
      [ClientChunkState.Active]: 0,
      [ClientChunkState.Hibernating]: 0,
      [ClientChunkState.Unloading]: 0,
    };

    let totalEntities = 0;
    let spawnedEntities = 0;
    let estimatedMemory = 0;

    for (const chunk of this.chunks.values()) {
      byState[chunk.state]++;
      totalEntities += chunk.entities.length;
      spawnedEntities += chunk.spawnedEntityIds.size;

      // Rough memory estimate
      if (chunk.vertices) estimatedMemory += chunk.vertices.byteLength;
      if (chunk.normals) estimatedMemory += chunk.normals.byteLength;
      if (chunk.uvs) estimatedMemory += chunk.uvs.byteLength;
      if (chunk.indices) estimatedMemory += chunk.indices.byteLength;
    }

    const avgFrameTime = this.frameTimes.length > 0
      ? this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length
      : 0;

    return {
      totalChunks: this.chunks.size,
      byState,
      loadQueueLength: this.loadQueue.size,
      unloadQueueLength: this.unloadQueue.length,
      totalEntities,
      spawnedEntities,
      estimatedMemoryBytes: estimatedMemory,
      avgFrameTimeMs: avgFrameTime,
      frameNumber: this.frameCount,
    };
  }

  /**
   * Get the timestamp of the last update call (for debug/monitoring)
   */
  getLastUpdateTime(): number {
    return this.lastUpdateTime;
  }

  // ===========================================================================
  // SERVER SYNC
  // ===========================================================================

  getChunksToSubscribe(): ChunkId[] {
    return Array.from(this.pendingSubscriptions);
  }

  getChunksToUnsubscribe(): ChunkId[] {
    return Array.from(this.pendingUnsubscriptions);
  }

  markSubscribed(chunkIds: ChunkId[]): void {
    for (const chunkId of chunkIds) {
      this.subscribedChunks.add(chunkId);
      this.pendingSubscriptions.delete(chunkId);
    }
  }

  markUnsubscribed(chunkIds: ChunkId[]): void {
    for (const chunkId of chunkIds) {
      this.subscribedChunks.delete(chunkId);
      this.pendingUnsubscriptions.delete(chunkId);
    }
  }

  handleServerEntityUpdates(
    chunkId: ChunkId,
    updates: Array<{
      entityId: string;
      type: 'create' | 'update' | 'delete' | 'handoff';
      entity?: ChunkEntity;
      handoffTo?: ChunkId;
    }>
  ): void {
    const chunk = this.chunks.get(chunkId);

    for (const update of updates) {
      switch (update.type) {
        case 'create':
          if (update.entity && chunk) {
            this.addEntity(chunkId, update.entity);
          }
          break;

        case 'update':
          if (update.entity && chunk) {
            this.updateEntity(chunkId, update.entityId, update.entity);
          }
          break;

        case 'delete':
          if (chunk) {
            this.removeEntity(chunkId, update.entityId);
          }
          break;

        case 'handoff':
          if (chunk && update.handoffTo && update.entity) {
            this.removeEntity(chunkId, update.entityId);
            this.addEntity(update.handoffTo, update.entity);
          }
          break;
      }
    }
  }

  getDirtyEntities(): Map<ChunkId, ChunkEntity[]> {
    const dirty = new Map<ChunkId, ChunkEntity[]>();

    for (const [chunkId, chunk] of this.chunks) {
      if (!chunk.isDirty) continue;

      const dirtyEntities = chunk.entities.filter((e) => e.isDirty);
      if (dirtyEntities.length > 0) {
        dirty.set(chunkId, dirtyEntities);
      }
    }

    return dirty;
  }

  markEntitiesSynced(chunkId: ChunkId, entityIds: string[]): void {
    const chunk = this.chunks.get(chunkId);
    if (!chunk) return;

    for (const entityId of entityIds) {
      const entity = chunk.entities.find((e) => e.id === entityId);
      if (entity) {
        entity.isDirty = false;
        entity.lastSaved = Date.now();
      }
    }

    // Check if chunk is still dirty
    chunk.isDirty = chunk.entities.some((e) => e.isDirty);
    chunk.lastServerSync = Date.now();
  }
}
