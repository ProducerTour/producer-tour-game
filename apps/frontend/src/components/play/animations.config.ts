/**
 * Animation Configuration
 * Central config for all character animations - metadata lives here, not scattered in code.
 */
import * as THREE from 'three';

export interface AnimationConfig {
  url: string;
  loop: boolean;
  fadeTime: number;
  clamp?: boolean;        // For one-shot animations, hold final frame
  fallback?: string;      // Fallback animation name if this one fails to load
  mixamo?: boolean;       // True if this is a Mixamo animation (needs scale track filtering)
}

/**
 * All animation configurations in one place.
 *
 * loop: true = LoopRepeat (continuous), false = LoopOnce (plays once)
 * fadeTime: crossfade duration in seconds
 * clamp: if true, holds the final frame (for one-shot animations)
 * fallback: animation to use if this one isn't available
 * mixamo: if true, strips scale/position tracks to prevent model glitching
 */
export const ANIMATION_CONFIG: Record<string, AnimationConfig> = {
  // Core locomotion (RPM native - not Mixamo)
  idle: { url: '/animations/idle.glb', loop: true, fadeTime: 0.15 },
  idleVar1: { url: '/animations/idle_var1.glb', loop: true, fadeTime: 0.15, fallback: 'idle' },
  idleVar2: { url: '/animations/idle_var2.glb', loop: true, fadeTime: 0.15, fallback: 'idle' },
  walking: { url: '/animations/walking.glb', loop: true, fadeTime: 0.15 },
  running: { url: '/animations/running.glb', loop: true, fadeTime: 0.15 },

  // Jumps (one-shot, RPM native)
  jump: { url: '/animations/jump.glb', loop: false, fadeTime: 0.1, clamp: true },
  jumpJog: { url: '/animations/jump_jog.glb', loop: false, fadeTime: 0.1, clamp: true },
  jumpRun: { url: '/animations/jump_run.glb', loop: false, fadeTime: 0.1, clamp: true },

  // Dances (RPM native)
  dance1: { url: '/animations/dance1.glb', loop: true, fadeTime: 0.3 },
  dance2: { url: '/animations/dance2.glb', loop: true, fadeTime: 0.3 },
  dance3: { url: '/animations/dance3.glb', loop: true, fadeTime: 0.3 },

  // Crouch base (Mixamo)
  crouchIdle: { url: '/animations/crouch_idle.glb', loop: true, fadeTime: 0.15, fallback: 'crouchWalk', mixamo: true },
  crouchWalk: { url: '/animations/crouch_walk.glb', loop: true, fadeTime: 0.15, mixamo: true },
  crouchStrafeLeft: { url: '/animations/crouch_strafe_left.glb', loop: true, fadeTime: 0.15, fallback: 'crouchWalk', mixamo: true },
  crouchStrafeRight: { url: '/animations/crouch_strafe_right.glb', loop: true, fadeTime: 0.15, fallback: 'crouchWalk', mixamo: true },

  // Crouch transitions (Mixamo, one-shot)
  standToCrouch: { url: '/animations/stand_to_crouch.glb', loop: false, fadeTime: 0.15, clamp: true, mixamo: true },
  crouchToStand: { url: '/animations/crouch_to_stand.glb', loop: false, fadeTime: 0.15, clamp: true, mixamo: true },
  crouchToSprint: { url: '/animations/crouch_to_sprint.glb', loop: false, fadeTime: 0.15, clamp: true, mixamo: true },

  // Crouch + weapon (Mixamo)
  crouchRifleIdle: { url: '/animations/crouch_rifle_idle.glb', loop: true, fadeTime: 0.15, fallback: 'crouchIdle', mixamo: true },
  crouchRifleWalk: { url: '/animations/crouch_rifle_walk.glb', loop: true, fadeTime: 0.15, fallback: 'crouchWalk', mixamo: true },
  crouchPistolIdle: { url: '/animations/crouch_pistol_idle.glb', loop: true, fadeTime: 0.15, fallback: 'crouchIdle', mixamo: true },
  crouchPistolWalk: { url: '/animations/crouch_pistol_walk.glb', loop: true, fadeTime: 0.15, fallback: 'crouchWalk', mixamo: true },

  // Weapon standing (Mixamo, with cache bust query param)
  rifleIdle: { url: '/animations/rifle_idle.glb?v=2', loop: true, fadeTime: 0.15, fallback: 'idle', mixamo: true },
  rifleWalk: { url: '/animations/rifle_walk.glb?v=2', loop: true, fadeTime: 0.15, fallback: 'walking', mixamo: true },
  rifleRun: { url: '/animations/rifle_run.glb?v=2', loop: true, fadeTime: 0.15, fallback: 'running', mixamo: true },
  pistolIdle: { url: '/animations/pistol_idle.glb?v=2', loop: true, fadeTime: 0.15, fallback: 'idle', mixamo: true },
  pistolWalk: { url: '/animations/pistol_walk.glb?v=2', loop: true, fadeTime: 0.15, fallback: 'walking', mixamo: true },
  pistolRun: { url: '/animations/pistol_run.glb?v=2', loop: true, fadeTime: 0.15, fallback: 'running', mixamo: true },
} as const;

/** Animation name type for type safety */
export type AnimationName = keyof typeof ANIMATION_CONFIG;

/** Get all animation URLs for preloading */
export function getAllAnimationUrls(): string[] {
  return Object.values(ANIMATION_CONFIG).map(config => config.url);
}

/** Get loop mode for an animation */
export function getLoopMode(name: AnimationName): THREE.AnimationActionLoopStyles {
  return ANIMATION_CONFIG[name]?.loop ? THREE.LoopRepeat : THREE.LoopOnce;
}

/** Get fade time for an animation */
export function getFadeTime(name: string): number {
  return (ANIMATION_CONFIG as Record<string, AnimationConfig>)[name]?.fadeTime ?? 0.15;
}

/** Check if animation should clamp when finished */
export function shouldClamp(name: AnimationName): boolean {
  return ANIMATION_CONFIG[name]?.clamp ?? false;
}

/** Get fallback animation name */
export function getFallback(name: AnimationName): AnimationName | undefined {
  return ANIMATION_CONFIG[name]?.fallback as AnimationName | undefined;
}

/** Check if animation is from Mixamo (needs special track filtering) */
export function isMixamoAnimation(name: string): boolean {
  return (ANIMATION_CONFIG as Record<string, AnimationConfig>)[name]?.mixamo ?? false;
}

/** Get all looping animation names */
export function getLoopingAnimations(): AnimationName[] {
  return (Object.keys(ANIMATION_CONFIG) as AnimationName[]).filter(
    name => ANIMATION_CONFIG[name].loop
  );
}

/** Get all one-shot animation names */
export function getOneShotAnimations(): AnimationName[] {
  return (Object.keys(ANIMATION_CONFIG) as AnimationName[]).filter(
    name => !ANIMATION_CONFIG[name].loop
  );
}

/** Get all Mixamo animation names */
export function getMixamoAnimations(): AnimationName[] {
  return (Object.keys(ANIMATION_CONFIG) as AnimationName[]).filter(
    name => ANIMATION_CONFIG[name].mixamo
  );
}
