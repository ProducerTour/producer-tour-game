/**
 * Chunk Streaming State Store
 *
 * Singleton store for chunk streaming state that terrain components can read from
 * without causing React re-renders in parent components.
 *
 * The UnifiedChunkManager updates this store, and consumers read directly
 * in their useFrame loops. Uses a singleton pattern (not Zustand) to avoid
 * any React re-renders in the hot path.
 *
 * This follows the same pattern as useLightingStore.ts and useAnimationStore.ts
 */

import type { UnifiedChunk, ChunkStreamingStats, ChunkId, ClientChunkState } from './types';

export interface ChunkStreamingState {
  activeChunks: UnifiedChunk[];
  visibleChunks: UnifiedChunk[];
  stats: ChunkStreamingStats;
  activeChunkIds: Set<ChunkId>;
  version: number;
}

type ChunkStreamingListener = (state: ChunkStreamingState) => void;

// Default empty stats
const createEmptyStats = (): ChunkStreamingStats => ({
  totalChunks: 0,
  byState: {} as Record<ClientChunkState, number>,
  loadQueueLength: 0,
  unloadQueueLength: 0,
  totalEntities: 0,
  spawnedEntities: 0,
  estimatedMemoryBytes: 0,
  avgFrameTimeMs: 0,
  frameNumber: 0,
});

/**
 * Singleton chunk streaming state manager.
 * Use `chunkStreamingState` to read current values in useFrame.
 * Use `updateChunkStreamingState` to update values (called by manager).
 */
class ChunkStreamingStateManager {
  private state: ChunkStreamingState = {
    activeChunks: [],
    visibleChunks: [],
    stats: createEmptyStats(),
    activeChunkIds: new Set(),
    version: 0,
  };

  private listeners: Set<ChunkStreamingListener> = new Set();

  /**
   * Get current chunk streaming state (for direct reads in useFrame).
   */
  getState(): ChunkStreamingState {
    return this.state;
  }

  /**
   * Get version number for change detection.
   */
  getVersion(): number {
    return this.state.version;
  }

  /**
   * Update chunk streaming state.
   * This does NOT trigger React re-renders.
   * Only increments version if chunks actually changed.
   */
  update(
    activeChunks: UnifiedChunk[],
    visibleChunks: UnifiedChunk[],
    stats: ChunkStreamingStats
  ): boolean {
    // Check if active chunks changed
    const newIds = new Set(activeChunks.map(c => c.id));
    const oldIds = this.state.activeChunkIds;

    let changed = false;

    // Fast check: size difference
    if (newIds.size !== oldIds.size) {
      changed = true;
    } else {
      // Check if any IDs are different
      for (const id of newIds) {
        if (!oldIds.has(id)) {
          changed = true;
          break;
        }
      }
    }

    // Always update stats and visible chunks
    this.state.stats = stats;
    this.state.visibleChunks = visibleChunks;

    if (changed) {
      this.state.activeChunks = activeChunks;
      this.state.activeChunkIds = newIds;
      this.state.version++;

      // Notify listeners (for non-React consumers or throttled React updates)
      this.listeners.forEach((listener) => listener(this.state));
    }

    return changed;
  }

  /**
   * Subscribe to chunk streaming changes (for non-React code).
   * Returns unsubscribe function.
   */
  subscribe(listener: ChunkStreamingListener): () => void {
    this.listeners.add(listener);
    // Immediately call with current state
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  /**
   * Clear all state (for cleanup).
   */
  clear(): void {
    this.state = {
      activeChunks: [],
      visibleChunks: [],
      stats: createEmptyStats(),
      activeChunkIds: new Set(),
      version: 0,
    };
  }
}

// Singleton instance
export const chunkStreamingStateManager = new ChunkStreamingStateManager();

// Convenience exports - these are stable references
export const chunkStreamingState = chunkStreamingStateManager.getState();
export const updateChunkStreamingState = (
  activeChunks: UnifiedChunk[],
  visibleChunks: UnifiedChunk[],
  stats: ChunkStreamingStats
) => chunkStreamingStateManager.update(activeChunks, visibleChunks, stats);
export const subscribeChunkStreaming = (listener: ChunkStreamingListener) =>
  chunkStreamingStateManager.subscribe(listener);
export const getChunkStreamingVersion = () =>
  chunkStreamingStateManager.getVersion();
