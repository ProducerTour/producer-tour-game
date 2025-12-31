/**
 * Game Integration
 *
 * React bridge to the @producer-tour/engine.
 */

// Provider and hooks
export {
  GameProvider,
  useGame,
  useGameStrict,
  useGameReady,
  useGameControl,
} from './GameProvider';

// UI Snapshot hooks
export {
  useUISnapshot,
  useUISnapshotField,
  usePlayerHealth,
  usePlayerPosition,
  usePerformanceMetrics,
  useCombatState,
  useMultiplayerInfo,
  useChunkStats,
} from './useUISnapshot';

// R3F integration
export { GameLoop, GameLoopSync } from './GameLoop';

// Player sync
export {
  usePlayerSync,
  usePlayerEntity,
  type UsePlayerSyncReturn,
} from './usePlayerSync';

// Animation bridge
export {
  useAnimationBridge,
  type AnimationState,
  type UseAnimationBridgeReturn,
  ANIMATION_CLIP_FILES,
  getAnimationPath,
} from './useAnimationBridge';

// Re-export engine types for convenience
export type {
  Game,
  EntityStore,
  UISnapshot,
  InputSnapshot,
  GameConfig,
  EntityId,
} from '@producer-tour/engine';

export {
  EntityTag,
  AirState,
  AnimationClip,
  INVALID_ENTITY,
  entityIndex,
  entityGeneration,
} from '@producer-tour/engine';
