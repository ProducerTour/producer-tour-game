// World streaming module exports
export * from './types';
export { ChunkManager } from './ChunkManager';
export type { ChunkLoadCallback, ChunkUnloadCallback } from './ChunkManager';
export { AssetLoader, getAssetLoader, resetAssetLoader } from './AssetLoader';

// Lifecycle state machine
export {
  WorldState,
  WorldLifecycle,
  getWorldLifecycle,
  resetWorldLifecycle,
  type WorldStateListener,
  type WorldLifecycleState,
} from './WorldLifecycle';

// React hooks for world state
export {
  useWorldState,
  useWorldStateIs,
  useOnWorldState,
  type UseWorldStateResult,
} from './useWorldState';

// Dependency injection context
export {
  WorldProvider,
  useWorld,
  useWorldTerrain,
  useWorldEnvironment,
  useWorldLifecycle,
  useWorldOptional,
  type WorldServices,
  type WorldProviderProps,
} from './WorldContext';
