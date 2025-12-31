/**
 * Animation Bridge Hook
 *
 * Bridges the engine's AnimationSystem with Three.js AnimationMixers.
 * Components use this to sync their mixers with the engine's animation state.
 *
 * Usage:
 * ```tsx
 * function Avatar({ entityIndex }) {
 *   const mixer = useRef<THREE.AnimationMixer>();
 *   const { getAnimationState, subscribeToChanges } = useAnimationBridge();
 *
 *   useEffect(() => {
 *     return subscribeToChanges(entityIndex, (clip, blendTime) => {
 *       // Transition mixer to new clip
 *     });
 *   }, [entityIndex]);
 *
 *   useFrame(() => {
 *     const state = getAnimationState(entityIndex);
 *     mixer.current?.setTime(state.time);
 *   });
 * }
 * ```
 */

import { useCallback, useEffect, useRef } from 'react';
import {
  AnimationClip,
  AnimationSystem,
  type AnimationChangeEvent,
} from '@producer-tour/engine';
import { useGame } from './GameProvider';

export interface AnimationState {
  clip: AnimationClip;
  prevClip: AnimationClip;
  time: number;
  speed: number;
  blendAlpha: number;
}

type AnimationChangeCallback = (
  newClip: AnimationClip,
  prevClip: AnimationClip,
  blendTime: number
) => void;

export interface UseAnimationBridgeReturn {
  /** Get current animation state for an entity */
  getAnimationState: (entityIndex: number) => AnimationState | null;

  /** Subscribe to animation changes for an entity */
  subscribeToChanges: (
    entityIndex: number,
    callback: AnimationChangeCallback
  ) => () => void;

  /** Get the AnimationSystem instance */
  getSystem: () => AnimationSystem | null;
}

export function useAnimationBridge(): UseAnimationBridgeReturn {
  const game = useGame();
  const callbacksRef = useRef<Map<number, Set<AnimationChangeCallback>>>(new Map());

  // Setup system listener
  useEffect(() => {
    if (!game) return;

    const system = game.getSystem('AnimationSystem') as AnimationSystem | undefined;
    if (!system) return;

    const unsubscribe = system.onAnimationChange((event: AnimationChangeEvent) => {
      const callbacks = callbacksRef.current.get(event.entityIndex);
      if (callbacks) {
        for (const callback of callbacks) {
          callback(event.newClip, event.previousClip, event.blendTime);
        }
      }
    });

    return unsubscribe;
  }, [game]);

  // Get animation state for an entity
  const getAnimationState = useCallback(
    (entityIndex: number): AnimationState | null => {
      if (!game) return null;

      const system = game.getSystem('AnimationSystem') as AnimationSystem | undefined;
      if (!system) return null;

      const store = game.getEntityStore();
      return system.getAnimationState(store, entityIndex);
    },
    [game]
  );

  // Subscribe to animation changes for an entity
  const subscribeToChanges = useCallback(
    (entityIndex: number, callback: AnimationChangeCallback): (() => void) => {
      if (!callbacksRef.current.has(entityIndex)) {
        callbacksRef.current.set(entityIndex, new Set());
      }

      callbacksRef.current.get(entityIndex)!.add(callback);

      return () => {
        const callbacks = callbacksRef.current.get(entityIndex);
        if (callbacks) {
          callbacks.delete(callback);
          if (callbacks.size === 0) {
            callbacksRef.current.delete(entityIndex);
          }
        }
      };
    },
    []
  );

  // Get the AnimationSystem instance
  const getSystem = useCallback((): AnimationSystem | null => {
    if (!game) return null;
    return game.getSystem('AnimationSystem') as AnimationSystem | null;
  }, [game]);

  return {
    getAnimationState,
    subscribeToChanges,
    getSystem,
  };
}

/**
 * Map AnimationClip enum to animation file names.
 * Used by avatar components to load the correct animation.
 */
export const ANIMATION_CLIP_FILES: Record<AnimationClip, string> = {
  [AnimationClip.IDLE]: 'idle',
  [AnimationClip.WALK]: 'walk',
  [AnimationClip.RUN]: 'run',
  [AnimationClip.SPRINT]: 'sprint',
  [AnimationClip.JUMP]: 'jump',
  [AnimationClip.FALL]: 'fall',
  [AnimationClip.LAND]: 'land',
  [AnimationClip.CROUCH_IDLE]: 'crouch_idle',
  [AnimationClip.CROUCH_WALK]: 'crouch_walk',
  [AnimationClip.STRAFE_LEFT]: 'strafe_left',
  [AnimationClip.STRAFE_RIGHT]: 'strafe_right',
  [AnimationClip.AIM_IDLE]: 'aim_idle',
  [AnimationClip.AIM_WALK]: 'aim_walk',
  [AnimationClip.FIRE]: 'fire',
  [AnimationClip.RELOAD]: 'reload',
  [AnimationClip.DANCE]: 'dance',
};

/**
 * Get animation file path from clip enum.
 */
export function getAnimationPath(clip: AnimationClip, basePath: string): string {
  const filename = ANIMATION_CLIP_FILES[clip];
  return `${basePath}/${filename}.glb`;
}
