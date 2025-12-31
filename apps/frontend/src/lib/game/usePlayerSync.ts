/**
 * Player Entity Sync Hook
 *
 * Bridges the React-based PhysicsPlayerController with the engine's EntityStore.
 * This enables the engine systems (AnimationSystem, etc.) to operate on player data.
 *
 * Usage:
 * ```tsx
 * function PhysicsPlayerController() {
 *   const { syncToStore, getInterpolatedPosition } = usePlayerSync();
 *
 *   useFrame(() => {
 *     // After physics update, sync to store
 *     syncToStore(position, velocity, grounded, crouching, sprinting);
 *   });
 * }
 * ```
 */

import { useEffect, useRef, useCallback } from 'react';
import {
  EntityTag,
  AirState as EngineAirState,
  entityIndex,
  INVALID_ENTITY,
} from '@producer-tour/engine';
import { useGame } from './GameProvider';

// Player entity index (0 = local player by convention)
const PLAYER_ENTITY_INDEX = 0;

interface SyncState {
  posX: number;
  posY: number;
  posZ: number;
  rotY: number;
  velX: number;
  velY: number;
  velZ: number;
  grounded: boolean;
  airState: 'grounded' | 'jumping' | 'falling' | 'landing';
  crouching: boolean;
  sprinting: boolean;
}

export interface UsePlayerSyncReturn {
  /** Entity index for the player (for direct EntityStore access) */
  entityIndex: number;

  /** Sync player state to EntityStore */
  syncToStore: (state: SyncState) => void;

  /** Get interpolated position from EntityStore */
  getInterpolatedPosition: (
    alpha: number
  ) => { x: number; y: number; z: number } | null;

  /** Check if player entity is initialized */
  isReady: boolean;
}

/**
 * Map frontend air state to engine air state.
 */
function mapAirState(
  airState: 'grounded' | 'jumping' | 'falling' | 'landing'
): EngineAirState {
  switch (airState) {
    case 'grounded':
      return EngineAirState.GROUNDED;
    case 'jumping':
      return EngineAirState.JUMPING;
    case 'falling':
      return EngineAirState.FALLING;
    case 'landing':
      return EngineAirState.LANDING;
    default:
      return EngineAirState.GROUNDED;
  }
}

export function usePlayerSync(): UsePlayerSyncReturn {
  const game = useGame();
  const entityIdRef = useRef(INVALID_ENTITY);
  const isReadyRef = useRef(false);
  const interpolatedPos = useRef({ x: 0, y: 0, z: 0 });

  // Create player entity on mount
  useEffect(() => {
    if (!game) return;

    const store = game.getEntityStore();
    const entityId = store.create();

    if (entityId !== INVALID_ENTITY) {
      const idx = entityIndex(entityId);
      entityIdRef.current = entityId;

      // Tag as player with physics and animation
      store.addTag(idx, EntityTag.PLAYER);
      store.addTag(idx, EntityTag.HAS_PHYSICS);
      store.addTag(idx, EntityTag.HAS_ANIMATION);
      store.addTag(idx, EntityTag.VISIBLE);

      isReadyRef.current = true;
    }

    return () => {
      // Destroy entity on unmount
      if (entityIdRef.current !== INVALID_ENTITY) {
        store.destroy(entityIdRef.current);
        entityIdRef.current = INVALID_ENTITY;
        isReadyRef.current = false;
      }
    };
  }, [game]);

  // Sync player state to EntityStore
  const syncToStore = useCallback(
    (state: SyncState) => {
      if (!game || entityIdRef.current === INVALID_ENTITY) return;

      const store = game.getEntityStore();
      const idx = entityIndex(entityIdRef.current);

      // Position
      store.posX[idx] = state.posX;
      store.posY[idx] = state.posY;
      store.posZ[idx] = state.posZ;

      // Rotation
      store.rotY[idx] = state.rotY;

      // Velocity
      store.velX[idx] = state.velX;
      store.velY[idx] = state.velY;
      store.velZ[idx] = state.velZ;

      // State
      store.grounded[idx] = state.grounded ? 1 : 0;
      store.airState[idx] = mapAirState(state.airState);

      // Input state (for AnimationSystem)
      store.inputCrouch[idx] = state.crouching ? 1 : 0;
      store.inputSprint[idx] = state.sprinting ? 1 : 0;
    },
    [game]
  );

  // Get interpolated position
  const getInterpolatedPosition = useCallback(
    (alpha: number) => {
      if (!game || entityIdRef.current === INVALID_ENTITY) return null;

      const store = game.getEntityStore();
      const idx = entityIndex(entityIdRef.current);

      store.getInterpolatedPosition(idx, alpha, interpolatedPos.current);
      return interpolatedPos.current;
    },
    [game]
  );

  return {
    entityIndex: entityIdRef.current !== INVALID_ENTITY
      ? entityIndex(entityIdRef.current)
      : -1,
    syncToStore,
    getInterpolatedPosition,
    isReady: isReadyRef.current,
  };
}

/**
 * Hook to get the player entity directly.
 * For components that need to read player data from EntityStore.
 */
export function usePlayerEntity() {
  const game = useGame();

  const getPlayerState = useCallback(() => {
    if (!game) return null;

    const store = game.getEntityStore();
    const idx = PLAYER_ENTITY_INDEX;

    if (!store.isAlive(idx)) return null;

    return {
      position: {
        x: store.posX[idx],
        y: store.posY[idx],
        z: store.posZ[idx],
      },
      velocity: {
        x: store.velX[idx],
        y: store.velY[idx],
        z: store.velZ[idx],
      },
      rotationY: store.rotY[idx],
      grounded: store.grounded[idx] === 1,
      airState: store.airState[idx] as EngineAirState,
    };
  }, [game]);

  return { getPlayerState };
}
