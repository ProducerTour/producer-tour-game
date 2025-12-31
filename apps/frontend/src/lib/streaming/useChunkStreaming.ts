/**
 * useChunkStreaming Hook
 *
 * React hook for integrating the chunk streaming system with components.
 * Provides reactive access to chunk state and automatic cleanup.
 *
 * @module streaming/useChunkStreaming
 */

import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { Vector3, Frustum, Matrix4 } from 'three';
import { useFrame } from '@react-three/fiber';
import { UnifiedChunkManager } from './UnifiedChunkManager';
import type {
  ChunkId,
  UnifiedChunk,
  ChunkUpdateEvent,
  ChunkStreamingConfig,
  ChunkStreamingStats,
  PlayerVelocity,
  ChunkEntity,
} from './types';
import { createZeroVelocity } from './types';
// Singleton store for React-less hot path updates
import { updateChunkStreamingState } from './chunkStreamingStore';

// Throttle interval for React state updates (ms)
// Only trigger re-renders at 10Hz instead of 60fps
const REACT_UPDATE_INTERVAL = 100;

// =============================================================================
// HOOK OPTIONS
// =============================================================================

export interface UseChunkStreamingOptions {
  /** Streaming configuration overrides */
  config?: Partial<ChunkStreamingConfig>;

  /** Whether to automatically update on each frame */
  autoUpdate?: boolean;

  /** Whether to use camera frustum for visibility culling */
  useFrustumCulling?: boolean;

  /** Callback when chunk is loaded */
  onChunkLoad?: (chunk: UnifiedChunk) => void;

  /** Callback when chunk is unloaded */
  onChunkUnload?: (chunkId: ChunkId) => void;

  /** Callback when chunk enters hibernate */
  onChunkHibernate?: (chunk: UnifiedChunk) => void;

  /** Callback when chunk wakes from hibernate */
  onChunkWake?: (chunk: UnifiedChunk) => void;

  /** Callback when entity is added to a chunk */
  onEntityAdd?: (chunkId: ChunkId, entity: ChunkEntity) => void;

  /** Callback when entity is removed from a chunk */
  onEntityRemove?: (chunkId: ChunkId, entityId: string) => void;
}

// =============================================================================
// HOOK RETURN TYPE
// =============================================================================

export interface UseChunkStreamingReturn {
  /** The chunk manager instance */
  manager: UnifiedChunkManager;

  /** Current streaming statistics */
  stats: ChunkStreamingStats;

  /** All active chunks */
  activeChunks: UnifiedChunk[];

  /** Visible chunks (in frustum) */
  visibleChunks: UnifiedChunk[];

  /** Get chunk by ID */
  getChunk: (id: ChunkId) => UnifiedChunk | null;

  /** Get chunk at world position */
  getChunkAtPosition: (x: number, z: number) => UnifiedChunk | null;

  /** Force load specific chunks */
  forceLoadChunks: (chunkIds: ChunkId[]) => Promise<void>;

  /** Get entities in radius */
  getEntitiesInRadius: (
    position: Vector3,
    radius: number
  ) => Array<{ entity: ChunkEntity; chunkId: ChunkId }>;

  /** Manually update with player state */
  update: (position: Vector3, velocity: PlayerVelocity) => ChunkUpdateEvent[];
}

// =============================================================================
// SINGLETON MANAGER
// =============================================================================

let sharedManager: UnifiedChunkManager | null = null;

function getSharedManager(config?: Partial<ChunkStreamingConfig>): UnifiedChunkManager {
  if (!sharedManager) {
    sharedManager = new UnifiedChunkManager(config);
  } else if (config) {
    sharedManager.setConfig(config);
  }
  return sharedManager;
}

// =============================================================================
// MAIN HOOK
// =============================================================================

/**
 * React hook for chunk streaming integration.
 *
 * @example
 * ```tsx
 * function GameWorld() {
 *   const { activeChunks, stats } = useChunkStreaming({
 *     onChunkLoad: (chunk) => console.log('Loaded:', chunk.id),
 *   });
 *
 *   return (
 *     <>
 *       {activeChunks.map(chunk => (
 *         <TerrainChunk key={chunk.id} chunk={chunk} />
 *       ))}
 *     </>
 *   );
 * }
 * ```
 */
export function useChunkStreaming(
  options: UseChunkStreamingOptions = {}
): UseChunkStreamingReturn {
  const {
    config,
    autoUpdate = true,
    useFrustumCulling = true,
    onChunkLoad,
    onChunkUnload,
    onChunkHibernate,
    onChunkWake,
    onEntityAdd,
    onEntityRemove,
  } = options;

  // Get or create the manager
  const manager = useMemo(() => getSharedManager(config), []);

  // Update config when it changes
  useEffect(() => {
    if (config) {
      manager.setConfig(config);
    }
  }, [manager, config]);

  // State for reactive updates
  const [stats, setStats] = useState<ChunkStreamingStats>(manager.getStats());
  const [activeChunks, setActiveChunks] = useState<UnifiedChunk[]>([]);
  const [visibleChunks, setVisibleChunks] = useState<UnifiedChunk[]>([]);

  // Track player velocity
  const lastPosition = useRef(new Vector3());
  const lastTime = useRef(performance.now());
  const velocity = useRef<PlayerVelocity>(createZeroVelocity());

  // Register event callbacks
  useEffect(() => {
    const unsubscribe = manager.onChunkEvent((event) => {
      switch (event.type) {
        case 'load':
          if (event.chunk) onChunkLoad?.(event.chunk);
          break;
        case 'unload':
          onChunkUnload?.(event.chunkId);
          break;
        case 'hibernate':
          if (event.chunk) onChunkHibernate?.(event.chunk);
          break;
        case 'wake':
          if (event.chunk) onChunkWake?.(event.chunk);
          break;
        case 'entity-add':
          if (event.entityIds && event.chunk) {
            for (const entityId of event.entityIds) {
              const entity = event.chunk.entities.find((e) => e.id === entityId);
              if (entity) onEntityAdd?.(event.chunkId, entity);
            }
          }
          break;
        case 'entity-remove':
          if (event.entityIds) {
            for (const entityId of event.entityIds) {
              onEntityRemove?.(event.chunkId, entityId);
            }
          }
          break;
      }
    });

    return unsubscribe;
  }, [manager, onChunkLoad, onChunkUnload, onChunkHibernate, onChunkWake, onEntityAdd, onEntityRemove]);

  // Reusable frustum and matrix for performance
  const frustumRef = useRef(new Frustum());
  const projScreenMatrix = useRef(new Matrix4());

  // Throttle React state updates (not every frame!)
  const lastReactUpdate = useRef(0);

  // Frame update
  useFrame(({ camera: frameCamera }) => {
    if (!autoUpdate) return;

    // Calculate velocity from camera position
    const now = performance.now();
    const dt = (now - lastTime.current) / 1000;
    lastTime.current = now;

    if (dt > 0 && dt < 1) {
      const dx = frameCamera.position.x - lastPosition.current.x;
      const dz = frameCamera.position.z - lastPosition.current.z;

      velocity.current = {
        x: dx / dt,
        z: dz / dt,
        magnitude: Math.sqrt(dx * dx + dz * dz) / dt,
      };
    }

    lastPosition.current.copy(frameCamera.position);

    // Get frustum if enabled
    let frustum: Frustum | undefined = undefined;
    if (useFrustumCulling) {
      frameCamera.updateMatrixWorld();
      projScreenMatrix.current.multiplyMatrices(
        frameCamera.projectionMatrix,
        frameCamera.matrixWorldInverse
      );
      frustumRef.current.setFromProjectionMatrix(projScreenMatrix.current);
      frustum = frustumRef.current;
    }

    // Update the manager
    manager.update(frameCamera.position, velocity.current, frustum);

    // Update singleton store (fast, no React re-renders)
    const currentStats = manager.getStats();
    const currentActive = manager.getActiveChunks();
    const currentVisible = manager.getVisibleChunks(frustum);
    const changed = updateChunkStreamingState(currentActive, currentVisible, currentStats);

    // Only update React state when chunks changed AND throttle interval passed
    if (changed && now - lastReactUpdate.current >= REACT_UPDATE_INTERVAL) {
      lastReactUpdate.current = now;
      setStats(currentStats);
      setActiveChunks(currentActive);
      setVisibleChunks(currentVisible);
    }
  });

  // Manual update function
  const update = useCallback(
    (position: Vector3, vel: PlayerVelocity): ChunkUpdateEvent[] => {
      return manager.update(position, vel);
    },
    [manager]
  );

  // Memoized getters
  const getChunk = useCallback(
    (id: ChunkId) => manager.getChunk(id),
    [manager]
  );

  const getChunkAtPosition = useCallback(
    (x: number, z: number) => manager.getChunkAtPosition(x, z),
    [manager]
  );

  const forceLoadChunks = useCallback(
    (chunkIds: ChunkId[]) => manager.forceLoadChunks(chunkIds),
    [manager]
  );

  const getEntitiesInRadius = useCallback(
    (position: Vector3, radius: number) =>
      manager.getEntitiesInRadius(position, radius),
    [manager]
  );

  return {
    manager,
    stats,
    activeChunks,
    visibleChunks,
    getChunk,
    getChunkAtPosition,
    forceLoadChunks,
    getEntitiesInRadius,
    update,
  };
}

// =============================================================================
// SIMPLE HOOK (No R3F dependency)
// =============================================================================

/**
 * Simple hook for chunk streaming without React Three Fiber.
 * Use this when you need to manage chunks manually.
 */
export function useChunkManager(
  config?: Partial<ChunkStreamingConfig>
): UnifiedChunkManager {
  const manager = useMemo(() => getSharedManager(config), []);

  useEffect(() => {
    if (config) {
      manager.setConfig(config);
    }
  }, [manager, config]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Don't dispose the shared manager, just clear state
    };
  }, []);

  return manager;
}

// =============================================================================
// CHUNK STATS HOOK
// =============================================================================

/**
 * Hook for just the streaming statistics (for debug UI)
 */
export function useChunkStats(): ChunkStreamingStats {
  const manager = getSharedManager();
  const [stats, setStats] = useState<ChunkStreamingStats>(manager.getStats());

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(manager.getStats());
    }, 100); // Update 10 times per second

    return () => clearInterval(interval);
  }, [manager]);

  return stats;
}

// =============================================================================
// RE-EXPORTS FOR DIRECT ACCESS
// =============================================================================

/**
 * Direct access to chunk streaming state for useFrame loops.
 * Use these instead of React hooks when you need hot-path performance.
 *
 * @example
 * ```tsx
 * useFrame(() => {
 *   // Read directly - no React re-renders
 *   const state = chunkStreamingStateManager.getState();
 *   for (const chunk of state.visibleChunks) {
 *     // render chunk...
 *   }
 * });
 * ```
 */
export {
  chunkStreamingState,
  chunkStreamingStateManager,
  subscribeChunkStreaming,
  getChunkStreamingVersion,
} from './chunkStreamingStore';
