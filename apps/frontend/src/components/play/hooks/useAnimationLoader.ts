/**
 * useAnimationLoader Hook
 * Helper utilities for animation loading and configuration based on animations.config.ts
 *
 * Note: Individual animations still need to be loaded with useGLTF calls in the component
 * because React hooks can't be called in loops. This module provides:
 * - Preloading at module level
 * - Helper functions for configuring actions
 * - Centralized fade time / loop mode logic
 */
import { useCallback, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import {
  ANIMATION_CONFIG,
  getAllAnimationUrls,
  getFadeTime as getConfigFadeTime,
  getFallback,
  type AnimationName,
} from '../animations.config';

// Preload all animations at module level - runs once when module is imported
getAllAnimationUrls().forEach(url => useGLTF.preload(url));

/**
 * Strip root motion from animation clips to prevent character drift.
 * Keeps rotations but removes Hips position tracks.
 */
export function stripRootMotion(clip: THREE.AnimationClip): THREE.AnimationClip {
  const filteredTracks = clip.tracks.filter(track => {
    // Remove position tracks for Hips (root bone) - prevents drift
    if (track.name.includes('Hips') && track.name.endsWith('.position')) {
      return false;
    }
    // Remove scale tracks - prevents size glitches with Mixamo animations
    if (track.name.endsWith('.scale')) {
      return false;
    }
    return true;
  });

  return new THREE.AnimationClip(clip.name, clip.duration, filteredTracks);
}

/**
 * Configure a single action with proper loop mode and clamping from config
 */
export function configureAction(action: THREE.AnimationAction, name: string): void {
  const animName = name as AnimationName;
  const config = ANIMATION_CONFIG[animName];

  if (!config) {
    // Unknown animation, default to looping
    action.setLoop(THREE.LoopRepeat, Infinity);
    return;
  }

  if (config.loop) {
    action.setLoop(THREE.LoopRepeat, Infinity);
  } else {
    action.setLoop(THREE.LoopOnce, 1);
    if (config.clamp) {
      action.clampWhenFinished = true;
    }
  }
}

/**
 * Configure all actions in an actions object
 */
export function configureAllActions(
  actions: Record<string, THREE.AnimationAction | null>
): void {
  for (const [name, action] of Object.entries(actions)) {
    if (action) {
      configureAction(action, name);
    }
  }
}

/**
 * Get fade time for transitioning to an animation
 */
export function getFadeTime(targetAnimation: string): number {
  return getConfigFadeTime(targetAnimation);
}

/**
 * Get fallback animation name if the requested one doesn't exist
 */
export function getAnimationWithFallback(
  name: AnimationName,
  actions: Record<string, THREE.AnimationAction | null>
): string {
  if (actions[name]) {
    return name;
  }

  const fallback = getFallback(name);
  if (fallback && actions[fallback]) {
    return fallback;
  }

  // Ultimate fallback
  return 'idle';
}

/**
 * Hook that returns helper functions for animation management.
 * Use this in your component alongside individual useGLTF calls.
 */
export function useAnimationHelpers() {
  const configure = useCallback((action: THREE.AnimationAction, name: string) => {
    configureAction(action, name);
  }, []);

  const configureAll = useCallback(
    (actions: Record<string, THREE.AnimationAction | null>) => {
      configureAllActions(actions);
    },
    []
  );

  const getWithFallback = useCallback(
    (name: AnimationName, actions: Record<string, THREE.AnimationAction | null>) => {
      return getAnimationWithFallback(name, actions);
    },
    []
  );

  return useMemo(
    () => ({
      configureAction: configure,
      configureAllActions: configureAll,
      getFadeTime,
      getAnimationWithFallback: getWithFallback,
      stripRootMotion,
    }),
    [configure, configureAll, getWithFallback]
  );
}

// Re-export config for convenience
export { ANIMATION_CONFIG, type AnimationName } from '../animations.config';
