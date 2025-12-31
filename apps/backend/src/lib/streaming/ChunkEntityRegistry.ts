/**
 * Chunk Entity Registry
 *
 * Server-side registry for chunk entity ownership and player subscriptions.
 * Manages entity handoffs between chunks and overlap zone visibility.
 *
 * @module streaming/ChunkEntityRegistry
 */

import {
  type ChunkId,
  type ServerChunk,
  type ChunkEntity,
  type ChunkSubscription,
  type OwnershipChangeEvent,
  type PendingHandoff,
  type ServerChunkConfig,
  type ChunkRegistryStats,
  ServerChunkState,
  DEFAULT_SERVER_CHUNK_CONFIG,
  parseChunkId,
  createChunkId,
} from './types';

// =============================================================================
// CHUNK ENTITY REGISTRY
// =============================================================================

/**
 * Server-side chunk entity registry.
 * Manages entity ownership, player subscriptions, and chunk state.
 */
export class ChunkEntityRegistry {
  private chunks: Map<ChunkId, ServerChunk> = new Map();
  private pendingHandoffs: Map<string, PendingHandoff> = new Map();
  private config: ServerChunkConfig;

  // Entity lookup cache: entityId -> chunkId
  private entityChunkMap: Map<string, ChunkId> = new Map();

  // Player subscription lookup: playerId -> Set<ChunkId>
  private playerSubscriptions: Map<string, Set<ChunkId>> = new Map();

  // Ownership change listeners
  private ownershipListeners: Set<(event: OwnershipChangeEvent) => void> = new Set();

  constructor(config: Partial<ServerChunkConfig> = {}) {
    this.config = { ...DEFAULT_SERVER_CHUNK_CONFIG, ...config };
  }

  // ===========================================================================
  // CHUNK MANAGEMENT
  // ===========================================================================

  /**
   * Get or create a chunk in the registry
   */
  getOrCreateChunk(chunkId: ChunkId): ServerChunk {
    let chunk = this.chunks.get(chunkId);

    if (!chunk) {
      const { x, z } = parseChunkId(chunkId);
      chunk = {
        id: chunkId,
        x,
        z,
        state: ServerChunkState.Cold,
        subscribers: new Map(),
        presentPlayers: new Set(),
        entities: new Map(),
        overlapEntities: new Map(),
        lastUpdate: Date.now(),
        coolingStart: 0,
        isDirty: false,
      };
      this.chunks.set(chunkId, chunk);
    }

    return chunk;
  }

  /**
   * Get chunk by ID (returns null if not exists)
   */
  getChunk(chunkId: ChunkId): ServerChunk | null {
    return this.chunks.get(chunkId) ?? null;
  }

  /**
   * Get chunk state
   */
  getChunkState(chunkId: ChunkId): ServerChunkState | null {
    return this.chunks.get(chunkId)?.state ?? null;
  }

  /**
   * Transition chunk to new state
   */
  transitionChunkState(chunkId: ChunkId, newState: ServerChunkState): void {
    const chunk = this.chunks.get(chunkId);
    if (!chunk) return;

    const oldState = chunk.state;
    chunk.state = newState;
    chunk.lastUpdate = Date.now();

    if (newState === ServerChunkState.Cooling) {
      chunk.coolingStart = Date.now();
    } else {
      chunk.coolingStart = 0;
    }

    console.log(`[ChunkRegistry] Chunk ${chunkId}: ${oldState} -> ${newState}`);
  }

  /**
   * Get all hot chunks (for simulation tick)
   */
  getHotChunks(): ServerChunk[] {
    return Array.from(this.chunks.values()).filter(
      (c) => c.state === ServerChunkState.Hot
    );
  }

  /**
   * Get all cooling chunks (for background simulation)
   */
  getCoolingChunks(): ServerChunk[] {
    return Array.from(this.chunks.values()).filter(
      (c) => c.state === ServerChunkState.Cooling
    );
  }

  /**
   * Get all warm chunks
   */
  getWarmChunks(): ServerChunk[] {
    return Array.from(this.chunks.values()).filter(
      (c) => c.state === ServerChunkState.Warm
    );
  }

  // ===========================================================================
  // PLAYER SUBSCRIPTION
  // ===========================================================================

  /**
   * Subscribe player to chunk updates
   */
  subscribePlayer(
    chunkId: ChunkId,
    playerId: string,
    socketId: string,
    position: { x: number; z: number },
    lodLevel?: number
  ): void {
    const chunk = this.getOrCreateChunk(chunkId);

    // Add subscription
    const subscription: ChunkSubscription = {
      playerId,
      socketId,
      subscribedAt: Date.now(),
      position,
      lodLevel,
    };
    chunk.subscribers.set(playerId, subscription);

    // Track player subscriptions
    if (!this.playerSubscriptions.has(playerId)) {
      this.playerSubscriptions.set(playerId, new Set());
    }
    this.playerSubscriptions.get(playerId)!.add(chunkId);

    // Transition to Warm if Cold
    if (chunk.state === ServerChunkState.Cold) {
      this.transitionChunkState(chunkId, ServerChunkState.Warm);
    }

    chunk.lastUpdate = Date.now();
  }

  /**
   * Unsubscribe player from chunk
   */
  unsubscribePlayer(chunkId: ChunkId, playerId: string): void {
    const chunk = this.chunks.get(chunkId);
    if (!chunk) return;

    chunk.subscribers.delete(playerId);
    chunk.presentPlayers.delete(playerId);

    // Update player subscriptions tracking
    this.playerSubscriptions.get(playerId)?.delete(chunkId);

    // If no subscribers and chunk is Hot, transition to Cooling
    if (chunk.subscribers.size === 0 && chunk.state === ServerChunkState.Hot) {
      this.transitionChunkState(chunkId, ServerChunkState.Cooling);
    }

    chunk.lastUpdate = Date.now();
  }

  /**
   * Unsubscribe player from all chunks
   */
  unsubscribePlayerFromAll(playerId: string): void {
    const subscriptions = this.playerSubscriptions.get(playerId);
    if (!subscriptions) return;

    for (const chunkId of subscriptions) {
      this.unsubscribePlayer(chunkId, playerId);
    }

    this.playerSubscriptions.delete(playerId);
  }

  /**
   * Get players subscribed to a chunk
   */
  getSubscribers(chunkId: ChunkId): ChunkSubscription[] {
    const chunk = this.chunks.get(chunkId);
    return chunk ? Array.from(chunk.subscribers.values()) : [];
  }

  /**
   * Get subscriber socket IDs for a chunk
   */
  getSubscriberSocketIds(chunkId: ChunkId): string[] {
    const chunk = this.chunks.get(chunkId);
    if (!chunk) return [];
    return Array.from(chunk.subscribers.values()).map((s) => s.socketId);
  }

  /**
   * Mark player as physically present in chunk
   */
  setPlayerPresent(chunkId: ChunkId, playerId: string, present: boolean): void {
    const chunk = this.chunks.get(chunkId);
    if (!chunk) return;

    if (present) {
      chunk.presentPlayers.add(playerId);

      // Transition to Hot if Warm or Cooling
      if (
        chunk.state === ServerChunkState.Warm ||
        chunk.state === ServerChunkState.Cooling
      ) {
        this.transitionChunkState(chunkId, ServerChunkState.Hot);
      }
    } else {
      chunk.presentPlayers.delete(playerId);

      // If no present players and still Hot, transition to Cooling
      if (
        chunk.presentPlayers.size === 0 &&
        chunk.state === ServerChunkState.Hot
      ) {
        this.transitionChunkState(chunkId, ServerChunkState.Cooling);
      }
    }

    chunk.lastUpdate = Date.now();
  }

  /**
   * Get chunks a player is subscribed to
   */
  getPlayerSubscriptions(playerId: string): ChunkId[] {
    return Array.from(this.playerSubscriptions.get(playerId) ?? []);
  }

  // ===========================================================================
  // ENTITY MANAGEMENT
  // ===========================================================================

  /**
   * Register entity in chunk
   */
  registerEntity(chunkId: ChunkId, entity: ChunkEntity): void {
    const chunk = this.getOrCreateChunk(chunkId);

    chunk.entities.set(entity.id, entity);
    this.entityChunkMap.set(entity.id, chunkId);

    // Check if entity is in overlap zone
    this.updateEntityOverlapZones(chunkId, entity);

    chunk.isDirty = true;
    chunk.lastUpdate = Date.now();
  }

  /**
   * Unregister entity from chunk
   */
  unregisterEntity(chunkId: ChunkId, entityId: string): ChunkEntity | null {
    const chunk = this.chunks.get(chunkId);
    if (!chunk) return null;

    const entity = chunk.entities.get(entityId);
    if (!entity) return null;

    chunk.entities.delete(entityId);
    this.entityChunkMap.delete(entityId);

    // Remove from overlap zones
    chunk.overlapEntities.delete(entityId);

    chunk.isDirty = true;
    chunk.lastUpdate = Date.now();

    return entity;
  }

  /**
   * Move entity between chunks (handoff)
   */
  handoffEntity(
    fromChunk: ChunkId,
    toChunk: ChunkId,
    entityId: string
  ): OwnershipChangeEvent | null {
    const sourceChunk = this.chunks.get(fromChunk);
    if (!sourceChunk) return null;

    const entity = sourceChunk.entities.get(entityId);
    if (!entity) return null;

    // Create pending handoff
    const handoff: PendingHandoff = {
      entityId,
      fromChunk,
      toChunk,
      startTime: Date.now(),
      phase: 'pending',
      entity: { ...entity },
    };

    this.pendingHandoffs.set(entityId, handoff);

    // Add to destination overlap zone immediately
    this.addToOverlapZone(entityId, fromChunk, toChunk);

    handoff.phase = 'transitioning';

    // Schedule completion after overlap window
    setTimeout(() => {
      this.completeHandoff(entityId);
    }, this.config.handoffOverlapTime);

    const event: OwnershipChangeEvent = {
      type: 'handoff',
      entityId,
      fromChunk,
      toChunk,
      timestamp: Date.now(),
    };

    this.emitOwnershipChange(event);
    return event;
  }

  /**
   * Complete a pending handoff
   */
  private completeHandoff(entityId: string): void {
    const handoff = this.pendingHandoffs.get(entityId);
    if (!handoff || handoff.phase === 'complete') return;

    // Move entity from source to destination
    const sourceChunk = this.chunks.get(handoff.fromChunk);
    const destChunk = this.getOrCreateChunk(handoff.toChunk);

    if (sourceChunk) {
      sourceChunk.entities.delete(entityId);
      sourceChunk.isDirty = true;
    }

    destChunk.entities.set(entityId, handoff.entity);
    this.entityChunkMap.set(entityId, handoff.toChunk);
    destChunk.isDirty = true;

    // Remove from overlap zone
    this.removeFromOverlapZone(entityId, handoff.toChunk);

    handoff.phase = 'complete';
    this.pendingHandoffs.delete(entityId);

    console.log(`[ChunkRegistry] Handoff complete: ${entityId} from ${handoff.fromChunk} to ${handoff.toChunk}`);
  }

  /**
   * Find entity by ID (searches all chunks)
   */
  findEntity(entityId: string): { entity: ChunkEntity; chunkId: ChunkId } | null {
    const chunkId = this.entityChunkMap.get(entityId);
    if (!chunkId) return null;

    const chunk = this.chunks.get(chunkId);
    const entity = chunk?.entities.get(entityId);

    return entity ? { entity, chunkId } : null;
  }

  /**
   * Get entities in chunk
   */
  getChunkEntities(chunkId: ChunkId): ChunkEntity[] {
    const chunk = this.chunks.get(chunkId);
    return chunk ? Array.from(chunk.entities.values()) : [];
  }

  /**
   * Update entity data
   */
  updateEntity(chunkId: ChunkId, entityId: string, updates: Partial<ChunkEntity>): void {
    const chunk = this.chunks.get(chunkId);
    if (!chunk) return;

    const entity = chunk.entities.get(entityId);
    if (!entity) return;

    Object.assign(entity, updates);
    entity.isDirty = true;
    chunk.isDirty = true;
    chunk.lastUpdate = Date.now();

    // Recheck overlap zones if position changed
    if (updates.position) {
      this.updateEntityOverlapZones(chunkId, entity);
    }
  }

  // ===========================================================================
  // OVERLAP ZONE MANAGEMENT
  // ===========================================================================

  /**
   * Add entity to overlap zone of adjacent chunk
   */
  addToOverlapZone(
    entityId: string,
    owningChunk: ChunkId,
    overlapChunk: ChunkId
  ): void {
    const chunk = this.chunks.get(owningChunk);
    if (!chunk) return;

    if (!chunk.overlapEntities.has(entityId)) {
      chunk.overlapEntities.set(entityId, new Set());
    }
    chunk.overlapEntities.get(entityId)!.add(overlapChunk);
  }

  /**
   * Remove entity from overlap zone
   */
  removeFromOverlapZone(entityId: string, overlapChunk: ChunkId): void {
    for (const chunk of this.chunks.values()) {
      const overlaps = chunk.overlapEntities.get(entityId);
      if (overlaps) {
        overlaps.delete(overlapChunk);
        if (overlaps.size === 0) {
          chunk.overlapEntities.delete(entityId);
        }
      }
    }
  }

  /**
   * Update overlap zones for an entity based on its position
   */
  private updateEntityOverlapZones(chunkId: ChunkId, entity: ChunkEntity): void {
    const chunk = this.chunks.get(chunkId);
    if (!chunk) return;

    const { chunkSize, worldSize, overlapMargin } = this.config;

    // Calculate entity's local position within chunk
    const chunkOriginX = chunk.x * chunkSize - worldSize / 2;
    const chunkOriginZ = chunk.z * chunkSize - worldSize / 2;

    const localX = entity.position[0] - chunkOriginX;
    const localZ = entity.position[2] - chunkOriginZ;

    // Clear existing overlaps for this entity
    chunk.overlapEntities.delete(entity.id);

    const overlappingChunks: ChunkId[] = [];

    // Check each edge
    if (localX < overlapMargin) {
      overlappingChunks.push(createChunkId(chunk.x - 1, chunk.z));
    }
    if (localX > chunkSize - overlapMargin) {
      overlappingChunks.push(createChunkId(chunk.x + 1, chunk.z));
    }
    if (localZ < overlapMargin) {
      overlappingChunks.push(createChunkId(chunk.x, chunk.z - 1));
    }
    if (localZ > chunkSize - overlapMargin) {
      overlappingChunks.push(createChunkId(chunk.x, chunk.z + 1));
    }

    // Check corners
    if (localX < overlapMargin && localZ < overlapMargin) {
      overlappingChunks.push(createChunkId(chunk.x - 1, chunk.z - 1));
    }
    if (localX > chunkSize - overlapMargin && localZ < overlapMargin) {
      overlappingChunks.push(createChunkId(chunk.x + 1, chunk.z - 1));
    }
    if (localX < overlapMargin && localZ > chunkSize - overlapMargin) {
      overlappingChunks.push(createChunkId(chunk.x - 1, chunk.z + 1));
    }
    if (localX > chunkSize - overlapMargin && localZ > chunkSize - overlapMargin) {
      overlappingChunks.push(createChunkId(chunk.x + 1, chunk.z + 1));
    }

    if (overlappingChunks.length > 0) {
      chunk.overlapEntities.set(entity.id, new Set(overlappingChunks));
    }
  }

  /**
   * Get all entities visible in a chunk (owned + overlap from neighbors)
   */
  getVisibleEntities(chunkId: ChunkId): ChunkEntity[] {
    const chunk = this.chunks.get(chunkId);
    if (!chunk) return [];

    const entities: ChunkEntity[] = Array.from(chunk.entities.values());

    // Add overlap entities from neighboring chunks
    const { x, z } = parseChunkId(chunkId);
    const neighbors = [
      createChunkId(x - 1, z - 1),
      createChunkId(x, z - 1),
      createChunkId(x + 1, z - 1),
      createChunkId(x - 1, z),
      createChunkId(x + 1, z),
      createChunkId(x - 1, z + 1),
      createChunkId(x, z + 1),
      createChunkId(x + 1, z + 1),
    ];

    for (const neighborId of neighbors) {
      const neighbor = this.chunks.get(neighborId);
      if (!neighbor) continue;

      for (const [entityId, overlaps] of neighbor.overlapEntities) {
        if (overlaps.has(chunkId)) {
          const entity = neighbor.entities.get(entityId);
          if (entity) {
            entities.push(entity);
          }
        }
      }
    }

    return entities;
  }

  /**
   * Get chunks that should receive updates about an entity
   */
  getChunksForEntity(chunkId: ChunkId, entityId: string): ChunkId[] {
    const chunk = this.chunks.get(chunkId);
    if (!chunk) return [chunkId];

    const chunks = [chunkId];
    const overlaps = chunk.overlapEntities.get(entityId);

    if (overlaps) {
      chunks.push(...overlaps);
    }

    return chunks;
  }

  // ===========================================================================
  // PERSISTENCE
  // ===========================================================================

  /**
   * Get dirty entities that need persistence
   */
  getDirtyEntities(): Map<ChunkId, ChunkEntity[]> {
    const dirty = new Map<ChunkId, ChunkEntity[]>();

    for (const [chunkId, chunk] of this.chunks) {
      if (!chunk.isDirty) continue;

      const dirtyEntities = Array.from(chunk.entities.values()).filter(
        (e) => e.isDirty
      );

      if (dirtyEntities.length > 0) {
        dirty.set(chunkId, dirtyEntities);
      }
    }

    return dirty;
  }

  /**
   * Mark entities as persisted
   */
  markEntitiesPersisted(chunkId: ChunkId, entityIds: string[]): void {
    const chunk = this.chunks.get(chunkId);
    if (!chunk) return;

    for (const entityId of entityIds) {
      const entity = chunk.entities.get(entityId);
      if (entity) {
        entity.isDirty = false;
        entity.lastSaved = Date.now();
      }
    }

    // Check if chunk still has dirty entities
    chunk.isDirty = Array.from(chunk.entities.values()).some((e) => e.isDirty);
  }

  // ===========================================================================
  // TICK PROCESSING
  // ===========================================================================

  /**
   * Process cooling chunks - transition to Cold/Warm if timeout elapsed
   */
  processCoolingChunks(): void {
    const now = Date.now();

    for (const chunk of this.getCoolingChunks()) {
      if (now - chunk.coolingStart >= this.config.coolingTimeout) {
        const newState = chunk.entities.size > 0
          ? ServerChunkState.Warm
          : ServerChunkState.Cold;

        this.transitionChunkState(chunk.id, newState);
      }
    }
  }

  // ===========================================================================
  // OWNERSHIP LISTENERS
  // ===========================================================================

  /**
   * Register listener for ownership changes
   */
  onOwnershipChange(listener: (event: OwnershipChangeEvent) => void): () => void {
    this.ownershipListeners.add(listener);
    return () => this.ownershipListeners.delete(listener);
  }

  private emitOwnershipChange(event: OwnershipChangeEvent): void {
    for (const listener of this.ownershipListeners) {
      listener(event);
    }
  }

  // ===========================================================================
  // STATISTICS
  // ===========================================================================

  /**
   * Get registry statistics
   */
  getStats(): ChunkRegistryStats {
    let hotChunks = 0;
    let warmChunks = 0;
    let coolingChunks = 0;
    let coldChunks = 0;
    let totalSubscriptions = 0;
    let totalEntities = 0;

    for (const chunk of this.chunks.values()) {
      switch (chunk.state) {
        case ServerChunkState.Hot:
          hotChunks++;
          break;
        case ServerChunkState.Warm:
          warmChunks++;
          break;
        case ServerChunkState.Cooling:
          coolingChunks++;
          break;
        case ServerChunkState.Cold:
          coldChunks++;
          break;
      }

      totalSubscriptions += chunk.subscribers.size;
      totalEntities += chunk.entities.size;
    }

    return {
      totalChunks: this.chunks.size,
      hotChunks,
      warmChunks,
      coolingChunks,
      coldChunks,
      totalSubscriptions,
      totalEntities,
      pendingHandoffs: this.pendingHandoffs.size,
    };
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.chunks.clear();
    this.pendingHandoffs.clear();
    this.entityChunkMap.clear();
    this.playerSubscriptions.clear();
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

let registryInstance: ChunkEntityRegistry | null = null;

/**
 * Get the singleton chunk entity registry
 */
export function getChunkRegistry(): ChunkEntityRegistry {
  if (!registryInstance) {
    registryInstance = new ChunkEntityRegistry();
  }
  return registryInstance;
}

/**
 * Reset the singleton registry
 */
export function resetChunkRegistry(): void {
  if (registryInstance) {
    registryInstance.clear();
    registryInstance = null;
  }
}
