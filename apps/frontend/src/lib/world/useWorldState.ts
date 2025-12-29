/**
 * useWorldState.ts
 *
 * React hook for accessing WorldLifecycle state.
 * Provides reactive updates when world state changes.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  WorldState,
  WorldLifecycle,
  WorldLifecycleState,
  getWorldLifecycle,
} from './WorldLifecycle';

export interface UseWorldStateResult {
  /** Current world state */
  state: WorldState;
  /** Previous world state */
  previousState: WorldState | null;
  /** Whether transitioning between states */
  isTransitioning: boolean;
  /** Any error from last transition */
  error: Error | null;
  /** Whether world is ready for gameplay */
  isReady: boolean;
  /** Whether world is loading */
  isLoading: boolean;
  /** Transition to a new state */
  transitionTo: (state: WorldState) => Promise<void>;
  /** Check if transition is valid */
  canTransitionTo: (state: WorldState) => boolean;
  /** Force reset to Initializing */
  forceReset: () => void;
}

/**
 * React hook for world lifecycle state management.
 *
 * @example
 * ```tsx
 * function LoadingScreen() {
 *   const { state, isLoading, transitionTo } = useWorldState();
 *
 *   if (isLoading) {
 *     return <div>Loading: {state}</div>;
 *   }
 *
 *   return null;
 * }
 * ```
 */
export function useWorldState(lifecycle?: WorldLifecycle): UseWorldStateResult {
  const worldLifecycle = lifecycle ?? getWorldLifecycle();

  const [snapshot, setSnapshot] = useState<WorldLifecycleState>(() =>
    worldLifecycle.getSnapshot()
  );

  useEffect(() => {
    // Subscribe to state changes
    const unsubscribe = worldLifecycle.subscribe(() => {
      setSnapshot(worldLifecycle.getSnapshot());
    });

    // Sync initial state
    setSnapshot(worldLifecycle.getSnapshot());

    return unsubscribe;
  }, [worldLifecycle]);

  const transitionTo = useCallback(
    async (state: WorldState) => {
      await worldLifecycle.transitionTo(state);
    },
    [worldLifecycle]
  );

  const canTransitionTo = useCallback(
    (state: WorldState) => worldLifecycle.canTransitionTo(state),
    [worldLifecycle]
  );

  const forceReset = useCallback(() => {
    worldLifecycle.forceReset();
  }, [worldLifecycle]);

  const isReady = useMemo(() => worldLifecycle.isReady(), [snapshot.current]);
  const isLoading = useMemo(() => worldLifecycle.isLoading(), [snapshot.current]);

  return {
    state: snapshot.current,
    previousState: snapshot.previous,
    isTransitioning: snapshot.isTransitioning,
    error: snapshot.error,
    isReady,
    isLoading,
    transitionTo,
    canTransitionTo,
    forceReset,
  };
}

/**
 * Hook that only re-renders when world enters/exits a specific state.
 * More efficient than useWorldState for components that only care about one state.
 *
 * @example
 * ```tsx
 * function NPCManager() {
 *   const isSpawning = useWorldStateIs(WorldState.SpawningEntities);
 *   // Only spawns NPCs when in spawning state
 * }
 * ```
 */
export function useWorldStateIs(
  targetState: WorldState,
  lifecycle?: WorldLifecycle
): boolean {
  const worldLifecycle = lifecycle ?? getWorldLifecycle();
  const [isInState, setIsInState] = useState(
    () => worldLifecycle.getState() === targetState
  );

  useEffect(() => {
    const unsubscribe = worldLifecycle.subscribe((newState) => {
      setIsInState(newState === targetState);
    });

    // Sync initial state
    setIsInState(worldLifecycle.getState() === targetState);

    return unsubscribe;
  }, [worldLifecycle, targetState]);

  return isInState;
}

/**
 * Hook that triggers a callback when world enters a specific state.
 *
 * @example
 * ```tsx
 * useOnWorldState(WorldState.Running, () => {
 *   console.log('World is now running!');
 *   startBackgroundMusic();
 * });
 * ```
 */
export function useOnWorldState(
  targetState: WorldState,
  callback: () => void,
  lifecycle?: WorldLifecycle
): void {
  const worldLifecycle = lifecycle ?? getWorldLifecycle();

  useEffect(() => {
    const unsubscribe = worldLifecycle.subscribe((newState, prevState) => {
      if (newState === targetState && prevState !== targetState) {
        callback();
      }
    });

    return unsubscribe;
  }, [worldLifecycle, targetState, callback]);
}

// Re-export types and enums for convenience
export { WorldState, type WorldLifecycleState } from './WorldLifecycle';
