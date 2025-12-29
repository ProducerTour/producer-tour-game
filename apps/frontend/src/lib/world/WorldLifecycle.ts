/**
 * WorldLifecycle.ts
 *
 * State machine for managing world lifecycle.
 * Ensures safe transitions between states (e.g., no NPC spawning while terrain is loading).
 *
 * States:
 * - Initializing: World is being set up (services, configs)
 * - LoadingTerrain: Heightmap generation and chunk loading
 * - SpawningEntities: NPCs, props, vegetation placement
 * - Running: Normal gameplay
 * - Paused: Game paused (menus, etc.)
 * - Resetting: Cleaning up for terrain seed change
 *
 * References:
 * - https://gameprogrammingpatterns.com/state.html
 */

export enum WorldState {
  Initializing = 'initializing',
  LoadingTerrain = 'loading_terrain',
  SpawningEntities = 'spawning_entities',
  Running = 'running',
  Paused = 'paused',
  Resetting = 'resetting',
}

export type WorldStateListener = (state: WorldState, prevState: WorldState) => void;

// Valid state transitions
const VALID_TRANSITIONS: Record<WorldState, WorldState[]> = {
  [WorldState.Initializing]: [WorldState.LoadingTerrain],
  [WorldState.LoadingTerrain]: [WorldState.SpawningEntities, WorldState.Resetting],
  [WorldState.SpawningEntities]: [WorldState.Running, WorldState.Resetting],
  [WorldState.Running]: [WorldState.Paused, WorldState.Resetting],
  [WorldState.Paused]: [WorldState.Running, WorldState.Resetting],
  [WorldState.Resetting]: [WorldState.LoadingTerrain],
};

export interface WorldLifecycleState {
  current: WorldState;
  previous: WorldState | null;
  isTransitioning: boolean;
  error: Error | null;
}

/**
 * WorldLifecycle manages the game world's state machine.
 * Use this to coordinate subsystems during terrain changes, loading, etc.
 */
export class WorldLifecycle {
  private state: WorldState = WorldState.Initializing;
  private previousState: WorldState | null = null;
  private isTransitioning = false;
  private listeners: Set<WorldStateListener> = new Set();
  private error: Error | null = null;

  /**
   * Get current world state
   */
  getState(): WorldState {
    return this.state;
  }

  /**
   * Get previous world state (null if never transitioned)
   */
  getPreviousState(): WorldState | null {
    return this.previousState;
  }

  /**
   * Check if currently transitioning between states
   */
  isInTransition(): boolean {
    return this.isTransitioning;
  }

  /**
   * Get any error that occurred during last transition
   */
  getError(): Error | null {
    return this.error;
  }

  /**
   * Get full state snapshot
   */
  getSnapshot(): WorldLifecycleState {
    return {
      current: this.state,
      previous: this.previousState,
      isTransitioning: this.isTransitioning,
      error: this.error,
    };
  }

  /**
   * Check if a transition to the target state is valid
   */
  canTransitionTo(targetState: WorldState): boolean {
    return VALID_TRANSITIONS[this.state]?.includes(targetState) ?? false;
  }

  /**
   * Transition to a new state
   * @throws Error if transition is invalid
   */
  async transitionTo(targetState: WorldState): Promise<void> {
    if (this.isTransitioning) {
      throw new Error(`Cannot transition to ${targetState}: already transitioning`);
    }

    if (!this.canTransitionTo(targetState)) {
      throw new Error(
        `Invalid state transition: ${this.state} -> ${targetState}. ` +
        `Valid transitions: ${VALID_TRANSITIONS[this.state]?.join(', ') || 'none'}`
      );
    }

    this.isTransitioning = true;
    this.error = null;
    const prevState = this.state;

    try {
      this.previousState = prevState;
      this.state = targetState;
      this.notifyListeners(prevState);
    } catch (err) {
      this.error = err instanceof Error ? err : new Error(String(err));
      // Rollback on error
      this.state = prevState;
      throw this.error;
    } finally {
      this.isTransitioning = false;
    }
  }

  /**
   * Force reset to Initializing state (use sparingly)
   * Useful for error recovery
   */
  forceReset(): void {
    const prevState = this.state;
    this.state = WorldState.Initializing;
    this.previousState = prevState;
    this.isTransitioning = false;
    this.error = null;
    this.notifyListeners(prevState);
  }

  /**
   * Subscribe to state changes
   * @returns Unsubscribe function
   */
  subscribe(listener: WorldStateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Check if world is in a "ready" state (running or paused)
   */
  isReady(): boolean {
    return this.state === WorldState.Running || this.state === WorldState.Paused;
  }

  /**
   * Check if world is loading (terrain or entities)
   */
  isLoading(): boolean {
    return (
      this.state === WorldState.Initializing ||
      this.state === WorldState.LoadingTerrain ||
      this.state === WorldState.SpawningEntities
    );
  }

  private notifyListeners(prevState: WorldState): void {
    this.listeners.forEach((listener) => {
      try {
        listener(this.state, prevState);
      } catch (err) {
        console.error('[WorldLifecycle] Listener error:', err);
      }
    });
  }
}

// Singleton instance for global access
let globalWorldLifecycle: WorldLifecycle | null = null;

/**
 * Get the global WorldLifecycle instance
 * Creates one if it doesn't exist
 */
export function getWorldLifecycle(): WorldLifecycle {
  if (!globalWorldLifecycle) {
    globalWorldLifecycle = new WorldLifecycle();
  }
  return globalWorldLifecycle;
}

/**
 * Reset the global WorldLifecycle (for testing or full world reset)
 */
export function resetWorldLifecycle(): void {
  globalWorldLifecycle?.forceReset();
}
