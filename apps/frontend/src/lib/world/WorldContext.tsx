/**
 * WorldContext.tsx
 *
 * Dependency injection for world services via React Context.
 * Provides world-scoped services to all child components.
 *
 * Benefits:
 * - Multiple worlds (for replays, testing, split-screen)
 * - Proper cleanup when world unmounts
 * - Type-safe access to services
 * - Testable (can inject mock services)
 *
 * Usage:
 * ```tsx
 * // Wrap your world in WorldProvider
 * <WorldProvider seed={12345} chunkRadius={4}>
 *   <PlayWorld />
 * </WorldProvider>
 *
 * // Access services anywhere in the tree
 * function NPC() {
 *   const { terrain, environment } = useWorld();
 *   const height = terrain.getHeight(x, z);
 * }
 * ```
 */

import {
  createContext,
  useContext,
  useMemo,
  useEffect,
  type ReactNode,
} from 'react';
import {
  TerrainService,
  type TerrainServiceConfig,
} from '../services/TerrainService';
import {
  EnvironmentService,
  type EnvironmentConfig,
} from '../services/EnvironmentService';
import {
  WorldLifecycle,
  WorldState,
} from './WorldLifecycle';

// =============================================================================
// TYPES
// =============================================================================

export interface WorldServices {
  /** Terrain height, biome, and slope queries */
  terrain: TerrainService;
  /** Sky, fog, water, lighting configuration */
  environment: EnvironmentService;
  /** World state machine (loading, running, paused) */
  lifecycle: WorldLifecycle;
  /** Current terrain seed */
  seed: number;
  /** Chunk radius for terrain generation */
  chunkRadius: number;
}

export interface WorldProviderProps {
  /** Terrain seed for procedural generation */
  seed?: number;
  /** Chunk radius (affects world size) */
  chunkRadius?: number;
  /** Initial environment config */
  environmentConfig?: Partial<EnvironmentConfig>;
  /** Child components */
  children: ReactNode;
  /** Optional custom services (for testing) */
  services?: Partial<WorldServices>;
}

// =============================================================================
// CONTEXT
// =============================================================================

const WorldContext = createContext<WorldServices | null>(null);

// =============================================================================
// PROVIDER
// =============================================================================

/**
 * WorldProvider creates and manages world-scoped services.
 * All services are tied to this provider's lifecycle.
 */
export function WorldProvider({
  seed = 12345,
  chunkRadius = 4,
  environmentConfig,
  children,
  services: customServices,
}: WorldProviderProps) {
  // Create services scoped to this world instance
  const services = useMemo<WorldServices>(() => {
    // Use custom services if provided (for testing)
    if (customServices?.terrain && customServices?.environment && customServices?.lifecycle) {
      return {
        terrain: customServices.terrain,
        environment: customServices.environment,
        lifecycle: customServices.lifecycle,
        seed,
        chunkRadius,
      };
    }

    // Create new service instances
    const terrainConfig: Partial<TerrainServiceConfig> = {
      seed,
      chunkRadius,
    };

    return {
      terrain: new TerrainService(terrainConfig),
      environment: new EnvironmentService(environmentConfig),
      lifecycle: new WorldLifecycle(),
      seed,
      chunkRadius,
    };
  }, [seed, chunkRadius]); // Recreate if seed or radius changes

  // Handle seed changes - update terrain service
  useEffect(() => {
    if (services.terrain.getSeed() !== seed) {
      services.terrain.setSeed(seed);
    }
  }, [seed, services.terrain]);

  // Transition to loading state when mounted
  useEffect(() => {
    const init = async () => {
      try {
        // Start loading terrain
        await services.lifecycle.transitionTo(WorldState.LoadingTerrain);
        // Terrain loads synchronously for now, so move to spawning
        await services.lifecycle.transitionTo(WorldState.SpawningEntities);
        // NPCs/props spawn synchronously, so move to running
        await services.lifecycle.transitionTo(WorldState.Running);
      } catch (err) {
        console.error('[WorldProvider] Initialization error:', err);
      }
    };
    init();
  }, [services.lifecycle]);

  // Cleanup when unmounting
  useEffect(() => {
    return () => {
      services.terrain.clearCache();
    };
  }, [services.terrain]);

  return (
    <WorldContext.Provider value={services}>
      {children}
    </WorldContext.Provider>
  );
}

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Access all world services.
 * Must be used within a WorldProvider.
 *
 * @throws Error if used outside WorldProvider
 */
export function useWorld(): WorldServices {
  const context = useContext(WorldContext);
  if (!context) {
    throw new Error('useWorld must be used within a WorldProvider');
  }
  return context;
}

/**
 * Access only the terrain service.
 * Convenience hook for components that only need terrain.
 */
export function useWorldTerrain(): TerrainService {
  return useWorld().terrain;
}

/**
 * Access only the environment service.
 * Convenience hook for components that only need environment.
 */
export function useWorldEnvironment(): EnvironmentService {
  return useWorld().environment;
}

/**
 * Access only the lifecycle state machine.
 * Convenience hook for components that only need state.
 */
export function useWorldLifecycle(): WorldLifecycle {
  return useWorld().lifecycle;
}

/**
 * Check if we're inside a WorldProvider.
 * Useful for components that can work with or without context.
 */
export function useWorldOptional(): WorldServices | null {
  return useContext(WorldContext);
}
