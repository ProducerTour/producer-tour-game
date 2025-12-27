/**
 * VisibilityBuffer.ts
 * Manages per-frame visibility state for chunks and instances
 * Supports temporal coherence through frame history
 */

import type {
  VisibilityState,
  VisibilityObject,
  ChunkVisibility,
  InstanceVisibilityBuffer,
  VisibilityConfig,
} from './types';

/**
 * Create initial visibility state for a new object
 */
function createInitialState(): VisibilityState {
  return {
    visibleLastFrame: true, // Assume visible initially (conservative)
    visibleThisFrame: true,
    stableFrames: 0,
    queryPending: false,
    lastTestedFrame: 0,
    frustumMargin: Infinity,
  };
}

/**
 * VisibilityBuffer manages all visibility state
 * - Chunk visibility (sparse, key-based)
 * - Instance visibility (dense, bit-packed)
 * - Frame history for temporal coherence
 */
export class VisibilityBuffer {
  /** Configuration */
  private config: VisibilityConfig;

  /** Registered objects by ID */
  private objects: Map<string, VisibilityObject> = new Map();

  /** Chunk visibility (chunkKey -> visibility) */
  private chunkVisibility: Map<string, ChunkVisibility> = new Map();

  /** Instance visibility buffers per chunk */
  private instanceBuffers: Map<string, InstanceVisibilityBuffer> = new Map();

  /** Current frame number */
  private frameNumber = 0;

  /** Objects that changed visibility this frame */
  private changedObjects: Set<string> = new Set();

  constructor(config: VisibilityConfig) {
    this.config = config;
  }

  /**
   * Update configuration
   */
  setConfig(config: VisibilityConfig): void {
    this.config = config;
  }

  // ===========================================================================
  // OBJECT REGISTRATION
  // ===========================================================================

  /**
   * Register an object with the visibility system
   */
  registerObject(object: Omit<VisibilityObject, 'state'>): void {
    const fullObject: VisibilityObject = {
      ...object,
      state: createInitialState(),
    };
    this.objects.set(object.id, fullObject);
  }

  /**
   * Unregister an object
   */
  unregisterObject(id: string): void {
    this.objects.delete(id);
    this.changedObjects.delete(id);
  }

  /**
   * Get a registered object
   */
  getObject(id: string): VisibilityObject | undefined {
    return this.objects.get(id);
  }

  /**
   * Check if object is registered
   */
  hasObject(id: string): boolean {
    return this.objects.has(id);
  }

  // ===========================================================================
  // CHUNK VISIBILITY
  // ===========================================================================

  /**
   * Register a chunk for visibility tracking
   */
  registerChunk(chunkX: number, chunkZ: number): void {
    const key = `${chunkX},${chunkZ}`;
    if (!this.chunkVisibility.has(key)) {
      this.chunkVisibility.set(key, {
        chunkX,
        chunkZ,
        visible: true, // Assume visible initially
        distance: 0,
        wasVisible: true,
      });
    }
  }

  /**
   * Unregister a chunk
   */
  unregisterChunk(chunkX: number, chunkZ: number): void {
    const key = `${chunkX},${chunkZ}`;
    this.chunkVisibility.delete(key);
    this.instanceBuffers.delete(key);
  }

  /**
   * Update chunk visibility
   */
  setChunkVisibility(
    chunkX: number,
    chunkZ: number,
    visible: boolean,
    distance: number
  ): void {
    const key = `${chunkX},${chunkZ}`;
    const chunk = this.chunkVisibility.get(key);
    if (chunk) {
      chunk.wasVisible = chunk.visible;
      chunk.visible = visible;
      chunk.distance = distance;
    }
  }

  /**
   * Get chunk visibility
   */
  isChunkVisible(chunkX: number, chunkZ: number): boolean {
    const key = `${chunkX},${chunkZ}`;
    const chunk = this.chunkVisibility.get(key);
    return chunk?.visible ?? true; // Default to visible
  }

  /**
   * Get chunk visibility data
   */
  getChunkVisibility(chunkX: number, chunkZ: number): ChunkVisibility | undefined {
    const key = `${chunkX},${chunkZ}`;
    return this.chunkVisibility.get(key);
  }

  /**
   * Get all visible chunks
   */
  getVisibleChunks(): ChunkVisibility[] {
    return Array.from(this.chunkVisibility.values()).filter((c) => c.visible);
  }

  /**
   * Get all culled chunks
   */
  getCulledChunks(): ChunkVisibility[] {
    return Array.from(this.chunkVisibility.values()).filter((c) => !c.visible);
  }

  // ===========================================================================
  // INSTANCE VISIBILITY
  // ===========================================================================

  /**
   * Create or get instance visibility buffer for a chunk
   */
  getOrCreateInstanceBuffer(
    chunkKey: string,
    instanceCount: number
  ): InstanceVisibilityBuffer {
    let buffer = this.instanceBuffers.get(chunkKey);

    if (!buffer || buffer.instanceCount !== instanceCount) {
      // Create new buffer with all instances visible initially
      const maskLength = Math.ceil(instanceCount / 32);
      const mask = new Uint32Array(maskLength);
      // Set all bits to 1 (visible)
      mask.fill(0xffffffff);
      // Clear unused bits in last element
      if (instanceCount % 32 !== 0) {
        const usedBits = instanceCount % 32;
        mask[maskLength - 1] = (1 << usedBits) - 1;
      }

      buffer = {
        chunkKey,
        instanceCount,
        visibilityMask: mask,
        visibleCount: instanceCount,
      };
      this.instanceBuffers.set(chunkKey, buffer);
    }

    return buffer;
  }

  /**
   * Update instance visibility for a chunk
   * @param chunkKey - Chunk identifier
   * @param visibleIndices - Array of visible instance indices
   */
  setInstanceVisibility(chunkKey: string, visibleIndices: number[]): void {
    const buffer = this.instanceBuffers.get(chunkKey);
    if (!buffer) return;

    // Clear all bits
    buffer.visibilityMask.fill(0);
    buffer.visibleCount = 0;

    // Set bits for visible instances
    for (const idx of visibleIndices) {
      if (idx >= 0 && idx < buffer.instanceCount) {
        const wordIdx = Math.floor(idx / 32);
        const bitIdx = idx % 32;
        buffer.visibilityMask[wordIdx] |= 1 << bitIdx;
        buffer.visibleCount++;
      }
    }
  }

  /**
   * Set all instances visible for a chunk
   */
  setAllInstancesVisible(chunkKey: string): void {
    const buffer = this.instanceBuffers.get(chunkKey);
    if (!buffer) return;

    buffer.visibilityMask.fill(0xffffffff);
    // Clear unused bits in last element
    if (buffer.instanceCount % 32 !== 0) {
      const maskLength = buffer.visibilityMask.length;
      const usedBits = buffer.instanceCount % 32;
      buffer.visibilityMask[maskLength - 1] = (1 << usedBits) - 1;
    }
    buffer.visibleCount = buffer.instanceCount;
  }

  /**
   * Check if a specific instance is visible
   */
  isInstanceVisible(chunkKey: string, instanceIndex: number): boolean {
    const buffer = this.instanceBuffers.get(chunkKey);
    if (!buffer || instanceIndex >= buffer.instanceCount) return true;

    const wordIdx = Math.floor(instanceIndex / 32);
    const bitIdx = instanceIndex % 32;
    return (buffer.visibilityMask[wordIdx] & (1 << bitIdx)) !== 0;
  }

  /**
   * Get instance visibility buffer for a chunk
   */
  getInstanceBuffer(chunkKey: string): InstanceVisibilityBuffer | undefined {
    return this.instanceBuffers.get(chunkKey);
  }

  /**
   * Get visible instance indices for a chunk
   */
  getVisibleInstanceIndices(chunkKey: string): number[] {
    const buffer = this.instanceBuffers.get(chunkKey);
    if (!buffer) return [];

    const indices: number[] = [];
    for (let i = 0; i < buffer.instanceCount; i++) {
      const wordIdx = Math.floor(i / 32);
      const bitIdx = i % 32;
      if (buffer.visibilityMask[wordIdx] & (1 << bitIdx)) {
        indices.push(i);
      }
    }
    return indices;
  }

  // ===========================================================================
  // OBJECT VISIBILITY
  // ===========================================================================

  /**
   * Update visibility for an object
   */
  setObjectVisibility(id: string, visible: boolean, frustumMargin = 0): void {
    const obj = this.objects.get(id);
    if (!obj) return;

    const wasVisible = obj.state.visibleThisFrame;

    // Update state
    obj.state.visibleLastFrame = wasVisible;
    obj.state.visibleThisFrame = visible;
    obj.state.lastTestedFrame = this.frameNumber;
    obj.state.frustumMargin = frustumMargin;
    obj.state.queryPending = false;

    // Track stability
    if (wasVisible === visible) {
      obj.state.stableFrames++;
    } else {
      obj.state.stableFrames = 0;
      this.changedObjects.add(id);
    }
  }

  /**
   * Mark object as having a pending query
   */
  setQueryPending(id: string, pending: boolean): void {
    const obj = this.objects.get(id);
    if (obj) {
      obj.state.queryPending = pending;
    }
  }

  /**
   * Check if object is visible
   */
  isObjectVisible(id: string): boolean {
    const obj = this.objects.get(id);
    if (!obj) return true; // Default to visible
    if (obj.alwaysVisible) return true;
    return obj.state.visibleThisFrame;
  }

  /**
   * Check if object visibility is stable (for temporal coherence)
   */
  isObjectStable(id: string): boolean {
    const obj = this.objects.get(id);
    if (!obj) return false;

    // Consider stable if same visibility for threshold frames
    // and far enough from frustum edges
    return (
      obj.state.stableFrames >= this.config.historyFrames &&
      obj.state.frustumMargin > 10 // meters from frustum edge
    );
  }

  /**
   * Get objects that need visibility testing
   * Filters out stable objects (temporal coherence)
   */
  getObjectsToTest(): VisibilityObject[] {
    if (!this.config.temporalCoherenceEnabled) {
      return Array.from(this.objects.values()).filter((o) => !o.alwaysVisible);
    }

    return Array.from(this.objects.values()).filter((obj) => {
      if (obj.alwaysVisible) return false;

      // Always test new objects
      if (obj.state.lastTestedFrame === 0) return true;

      // Always test objects with pending queries
      if (obj.state.queryPending) return true;

      // Skip stable objects (temporal coherence)
      if (this.isObjectStable(obj.id)) return false;

      // Test objects that changed visibility recently
      if (obj.state.stableFrames < 3) return true;

      // Test objects near frustum edges more frequently
      if (obj.state.frustumMargin < 20) return true;

      // Otherwise, test periodically based on distance
      const testInterval = Math.max(1, Math.floor(obj.state.frustumMargin / 50));
      return (this.frameNumber - obj.state.lastTestedFrame) >= testInterval;
    });
  }

  // ===========================================================================
  // FRAME MANAGEMENT
  // ===========================================================================

  /**
   * Begin a new frame - swap buffers
   */
  beginFrame(): void {
    this.frameNumber++;
    this.changedObjects.clear();

    // Swap visibility for all objects
    for (const obj of this.objects.values()) {
      obj.state.visibleLastFrame = obj.state.visibleThisFrame;
    }
  }

  /**
   * Get current frame number
   */
  getFrameNumber(): number {
    return this.frameNumber;
  }

  /**
   * Get objects that changed visibility this frame
   */
  getChangedObjects(): string[] {
    return Array.from(this.changedObjects);
  }

  // ===========================================================================
  // STATISTICS
  // ===========================================================================

  /**
   * Get visibility statistics
   */
  getStats(): {
    objectCount: number;
    visibleObjects: number;
    stableObjects: number;
    chunkCount: number;
    visibleChunks: number;
    instanceBufferCount: number;
  } {
    let visibleObjects = 0;
    let stableObjects = 0;

    for (const obj of this.objects.values()) {
      if (obj.state.visibleThisFrame) visibleObjects++;
      if (this.isObjectStable(obj.id)) stableObjects++;
    }

    let visibleChunks = 0;
    for (const chunk of this.chunkVisibility.values()) {
      if (chunk.visible) visibleChunks++;
    }

    return {
      objectCount: this.objects.size,
      visibleObjects,
      stableObjects,
      chunkCount: this.chunkVisibility.size,
      visibleChunks,
      instanceBufferCount: this.instanceBuffers.size,
    };
  }

  // ===========================================================================
  // CLEANUP
  // ===========================================================================

  /**
   * Clear all visibility data (on scene change, teleport, etc.)
   */
  clear(): void {
    this.objects.clear();
    this.chunkVisibility.clear();
    this.instanceBuffers.clear();
    this.changedObjects.clear();
    this.frameNumber = 0;
  }

  /**
   * Reset visibility (assume all visible)
   * Used after teleport to avoid pop-in
   */
  resetToVisible(): void {
    for (const obj of this.objects.values()) {
      obj.state.visibleThisFrame = true;
      obj.state.visibleLastFrame = true;
      obj.state.stableFrames = 0;
      obj.state.queryPending = false;
    }

    for (const chunk of this.chunkVisibility.values()) {
      chunk.visible = true;
      chunk.wasVisible = true;
    }

    for (const buffer of this.instanceBuffers.values()) {
      buffer.visibilityMask.fill(0xffffffff);
      if (buffer.instanceCount % 32 !== 0) {
        const maskLength = buffer.visibilityMask.length;
        const usedBits = buffer.instanceCount % 32;
        buffer.visibilityMask[maskLength - 1] = (1 << usedBits) - 1;
      }
      buffer.visibleCount = buffer.instanceCount;
    }
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.clear();
  }
}
