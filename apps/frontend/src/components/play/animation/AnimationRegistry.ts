/**
 * AnimationRegistry - Single source of truth for all character animations
 *
 * All humanoid characters share the same animation files.
 * Animations are applied to any Mixamo-rigged skeleton.
 */

import * as THREE from 'three';

const ANIM_BASE = '/assets/animations';

export interface AnimationConfig {
  url: string;
  loop: boolean;
  fadeTime: number;
  clamp?: boolean;
}

export type WeaponType = 'none' | 'rifle' | 'pistol';

// ============================================================
// ANIMATION NAMES BY CATEGORY
// ============================================================

export type LocomotionAnimation =
  | 'idle'
  | 'walk'
  | 'run'
  | 'jump'
  | 'strafeLeftRun'
  | 'strafeRightRun'
  | 'strafeLeftWalk'
  | 'strafeRightWalk'
  | 'turnLeft'
  | 'turnRight';

export type RifleAnimation =
  // Idle
  | 'rifleIdle'
  | 'rifleAimIdle'
  | 'rifleCrouchIdle'
  | 'rifleCrouchAimIdle'
  // Walk 8-way
  | 'rifleWalkFwd'
  | 'rifleWalkFwdLeft'
  | 'rifleWalkFwdRight'
  | 'rifleWalkBack'
  | 'rifleWalkBackLeft'
  | 'rifleWalkBackRight'
  | 'rifleWalkLeft'
  | 'rifleWalkRight'
  // Run 8-way
  | 'rifleRunFwd'
  | 'rifleRunFwdLeft'
  | 'rifleRunFwdRight'
  | 'rifleRunBack'
  | 'rifleRunBackLeft'
  | 'rifleRunBackRight'
  | 'rifleRunLeft'
  | 'rifleRunRight'
  // Sprint 8-way
  | 'rifleSprintFwd'
  | 'rifleSprintFwdLeft'
  | 'rifleSprintFwdRight'
  | 'rifleSprintBack'
  | 'rifleSprintBackLeft'
  | 'rifleSprintBackRight'
  | 'rifleSprintLeft'
  | 'rifleSprintRight'
  // Crouch 8-way
  | 'rifleCrouchFwd'
  | 'rifleCrouchFwdLeft'
  | 'rifleCrouchFwdRight'
  | 'rifleCrouchBack'
  | 'rifleCrouchBackLeft'
  | 'rifleCrouchBackRight'
  | 'rifleCrouchLeft'
  | 'rifleCrouchRight'
  // Turns
  | 'rifleTurnLeft'
  | 'rifleTurnRight'
  | 'rifleCrouchTurnLeft'
  | 'rifleCrouchTurnRight'
  // Jump
  | 'rifleJumpUp'
  | 'rifleJumpLoop'
  | 'rifleJumpDown'
  // Death
  | 'rifleDeathFront'
  | 'rifleDeathBack'
  | 'rifleDeathRight'
  | 'rifleDeathHeadshotFront'
  | 'rifleDeathHeadshotBack'
  | 'rifleDeathCrouchHeadshot';

export type PistolAnimation =
  | 'pistolIdle'
  | 'pistolKneelIdle'
  | 'pistolStandToKneel'
  | 'pistolKneelToStand'
  | 'pistolWalkFwd'
  | 'pistolWalkBack'
  | 'pistolWalkLeft'
  | 'pistolWalkRight'
  | 'pistolWalkBackLeft'
  | 'pistolWalkBackRight'
  | 'pistolRunFwd'
  | 'pistolRunBack'
  | 'pistolRunLeft'
  | 'pistolRunRight'
  | 'pistolRunBackLeft'
  | 'pistolRunBackRight'
  | 'pistolStrafeLeft'
  | 'pistolStrafeRight'
  | 'pistolJump'
  | 'pistolJumpLoop';

export type AnimationName = LocomotionAnimation | RifleAnimation | PistolAnimation;

// ============================================================
// ANIMATION CONFIGURATIONS
// ============================================================

const locomotion = (file: string) => `${ANIM_BASE}/locomotion/${file}`;
const rifle = (file: string) => `${ANIM_BASE}/rifle/${file}`;
const pistol = (file: string) => `${ANIM_BASE}/pistol/${file}`;

export const ANIMATIONS: Record<AnimationName, AnimationConfig> = {
  // ============================================================
  // LOCOMOTION (unarmed)
  // ============================================================
  idle: { url: locomotion('idle.glb'), loop: true, fadeTime: 0.2 },
  walk: { url: locomotion('walk.glb'), loop: true, fadeTime: 0.2 },
  run: { url: locomotion('run.glb'), loop: true, fadeTime: 0.15 },
  jump: { url: locomotion('jump.glb'), loop: false, fadeTime: 0.1, clamp: true },
  strafeLeftRun: { url: locomotion('strafe_left_run.glb'), loop: true, fadeTime: 0.15 },
  strafeRightRun: { url: locomotion('strafe_right_run.glb'), loop: true, fadeTime: 0.15 },
  strafeLeftWalk: { url: locomotion('strafe_left_walk.glb'), loop: true, fadeTime: 0.2 },
  strafeRightWalk: { url: locomotion('strafe_right_walk.glb'), loop: true, fadeTime: 0.2 },
  turnLeft: { url: locomotion('turn_left.glb'), loop: false, fadeTime: 0.15 },
  turnRight: { url: locomotion('turn_right.glb'), loop: false, fadeTime: 0.15 },

  // ============================================================
  // RIFLE
  // ============================================================
  rifleIdle: { url: rifle('rifle_idle.glb'), loop: true, fadeTime: 0.2 },
  rifleAimIdle: { url: rifle('rifle_aim_idle.glb'), loop: true, fadeTime: 0.15 },
  rifleCrouchIdle: { url: rifle('rifle_crouch_idle.glb'), loop: true, fadeTime: 0.25 },
  rifleCrouchAimIdle: { url: rifle('rifle_crouch_aim_idle.glb'), loop: true, fadeTime: 0.2 },

  rifleWalkFwd: { url: rifle('rifle_walk_fwd.glb'), loop: true, fadeTime: 0.2 },
  rifleWalkFwdLeft: { url: rifle('rifle_walk_fwd_left.glb'), loop: true, fadeTime: 0.2 },
  rifleWalkFwdRight: { url: rifle('rifle_walk_fwd_right.glb'), loop: true, fadeTime: 0.2 },
  rifleWalkBack: { url: rifle('rifle_walk_back.glb'), loop: true, fadeTime: 0.2 },
  rifleWalkBackLeft: { url: rifle('rifle_walk_back_left.glb'), loop: true, fadeTime: 0.2 },
  rifleWalkBackRight: { url: rifle('rifle_walk_back_right.glb'), loop: true, fadeTime: 0.2 },
  rifleWalkLeft: { url: rifle('rifle_walk_left.glb'), loop: true, fadeTime: 0.2 },
  rifleWalkRight: { url: rifle('rifle_walk_right.glb'), loop: true, fadeTime: 0.2 },

  rifleRunFwd: { url: rifle('rifle_run_fwd.glb'), loop: true, fadeTime: 0.15 },
  rifleRunFwdLeft: { url: rifle('rifle_run_fwd_left.glb'), loop: true, fadeTime: 0.15 },
  rifleRunFwdRight: { url: rifle('rifle_run_fwd_right.glb'), loop: true, fadeTime: 0.15 },
  rifleRunBack: { url: rifle('rifle_run_back.glb'), loop: true, fadeTime: 0.15 },
  rifleRunBackLeft: { url: rifle('rifle_run_back_left.glb'), loop: true, fadeTime: 0.15 },
  rifleRunBackRight: { url: rifle('rifle_run_back_right.glb'), loop: true, fadeTime: 0.15 },
  rifleRunLeft: { url: rifle('rifle_run_left.glb'), loop: true, fadeTime: 0.15 },
  rifleRunRight: { url: rifle('rifle_run_right.glb'), loop: true, fadeTime: 0.15 },

  rifleSprintFwd: { url: rifle('rifle_sprint_fwd.glb'), loop: true, fadeTime: 0.15 },
  rifleSprintFwdLeft: { url: rifle('rifle_sprint_fwd_left.glb'), loop: true, fadeTime: 0.15 },
  rifleSprintFwdRight: { url: rifle('rifle_sprint_fwd_right.glb'), loop: true, fadeTime: 0.15 },
  rifleSprintBack: { url: rifle('rifle_sprint_back.glb'), loop: true, fadeTime: 0.15 },
  rifleSprintBackLeft: { url: rifle('rifle_sprint_back_left.glb'), loop: true, fadeTime: 0.15 },
  rifleSprintBackRight: { url: rifle('rifle_sprint_back_right.glb'), loop: true, fadeTime: 0.15 },
  rifleSprintLeft: { url: rifle('rifle_sprint_left.glb'), loop: true, fadeTime: 0.15 },
  rifleSprintRight: { url: rifle('rifle_sprint_right.glb'), loop: true, fadeTime: 0.15 },

  rifleCrouchFwd: { url: rifle('rifle_crouch_fwd.glb'), loop: true, fadeTime: 0.2 },
  rifleCrouchFwdLeft: { url: rifle('rifle_crouch_fwd_left.glb'), loop: true, fadeTime: 0.2 },
  rifleCrouchFwdRight: { url: rifle('rifle_crouch_fwd_right.glb'), loop: true, fadeTime: 0.2 },
  rifleCrouchBack: { url: rifle('rifle_crouch_back.glb'), loop: true, fadeTime: 0.2 },
  rifleCrouchBackLeft: { url: rifle('rifle_crouch_back_left.glb'), loop: true, fadeTime: 0.2 },
  rifleCrouchBackRight: { url: rifle('rifle_crouch_back_right.glb'), loop: true, fadeTime: 0.2 },
  rifleCrouchLeft: { url: rifle('rifle_crouch_left.glb'), loop: true, fadeTime: 0.2 },
  rifleCrouchRight: { url: rifle('rifle_crouch_right.glb'), loop: true, fadeTime: 0.2 },

  rifleTurnLeft: { url: rifle('rifle_turn_left.glb'), loop: false, fadeTime: 0.15 },
  rifleTurnRight: { url: rifle('rifle_turn_right.glb'), loop: false, fadeTime: 0.15 },
  rifleCrouchTurnLeft: { url: rifle('rifle_crouch_turn_left.glb'), loop: false, fadeTime: 0.15 },
  rifleCrouchTurnRight: { url: rifle('rifle_crouch_turn_right.glb'), loop: false, fadeTime: 0.15 },

  rifleJumpUp: { url: rifle('rifle_jump_up.glb'), loop: false, fadeTime: 0.1, clamp: true },
  rifleJumpLoop: { url: rifle('rifle_jump_loop.glb'), loop: true, fadeTime: 0.1 },
  rifleJumpDown: { url: rifle('rifle_jump_down.glb'), loop: false, fadeTime: 0.1, clamp: true },

  rifleDeathFront: { url: rifle('rifle_death_front.glb'), loop: false, fadeTime: 0.1, clamp: true },
  rifleDeathBack: { url: rifle('rifle_death_back.glb'), loop: false, fadeTime: 0.1, clamp: true },
  rifleDeathRight: { url: rifle('rifle_death_right.glb'), loop: false, fadeTime: 0.1, clamp: true },
  rifleDeathHeadshotFront: { url: rifle('rifle_death_headshot_front.glb'), loop: false, fadeTime: 0.1, clamp: true },
  rifleDeathHeadshotBack: { url: rifle('rifle_death_headshot_back.glb'), loop: false, fadeTime: 0.1, clamp: true },
  rifleDeathCrouchHeadshot: { url: rifle('rifle_death_crouch_headshot.glb'), loop: false, fadeTime: 0.1, clamp: true },

  // ============================================================
  // PISTOL
  // ============================================================
  pistolIdle: { url: pistol('pistol_idle.glb'), loop: true, fadeTime: 0.2 },
  pistolKneelIdle: { url: pistol('pistol_kneel_idle.glb'), loop: true, fadeTime: 0.25 },
  pistolStandToKneel: { url: pistol('pistol_stand_to_kneel.glb'), loop: false, fadeTime: 0.15, clamp: true },
  pistolKneelToStand: { url: pistol('pistol_kneel_to_stand.glb'), loop: false, fadeTime: 0.15, clamp: true },

  pistolWalkFwd: { url: pistol('pistol_walk_fwd.glb'), loop: true, fadeTime: 0.2 },
  pistolWalkBack: { url: pistol('pistol_walk_back.glb'), loop: true, fadeTime: 0.2 },
  pistolWalkLeft: { url: pistol('pistol_walk_left.glb'), loop: true, fadeTime: 0.2 },
  pistolWalkRight: { url: pistol('pistol_walk_right.glb'), loop: true, fadeTime: 0.2 },
  pistolWalkBackLeft: { url: pistol('pistol_walk_back_left.glb'), loop: true, fadeTime: 0.2 },
  pistolWalkBackRight: { url: pistol('pistol_walk_back_right.glb'), loop: true, fadeTime: 0.2 },

  pistolRunFwd: { url: pistol('pistol_run_fwd.glb'), loop: true, fadeTime: 0.15 },
  pistolRunBack: { url: pistol('pistol_run_back.glb'), loop: true, fadeTime: 0.15 },
  pistolRunLeft: { url: pistol('pistol_run_left.glb'), loop: true, fadeTime: 0.15 },
  pistolRunRight: { url: pistol('pistol_run_right.glb'), loop: true, fadeTime: 0.15 },
  pistolRunBackLeft: { url: pistol('pistol_run_back_left.glb'), loop: true, fadeTime: 0.15 },
  pistolRunBackRight: { url: pistol('pistol_run_back_right.glb'), loop: true, fadeTime: 0.15 },

  pistolStrafeLeft: { url: pistol('pistol_strafe_left.glb'), loop: true, fadeTime: 0.15 },
  pistolStrafeRight: { url: pistol('pistol_strafe_right.glb'), loop: true, fadeTime: 0.15 },

  pistolJump: { url: pistol('pistol_jump.glb'), loop: false, fadeTime: 0.1, clamp: true },
  pistolJumpLoop: { url: pistol('pistol_jump_loop.glb'), loop: true, fadeTime: 0.1 },
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

export function getLoopMode(name: AnimationName): THREE.AnimationActionLoopStyles {
  return ANIMATIONS[name].loop ? THREE.LoopRepeat : THREE.LoopOnce;
}

export function getAllAnimationUrls(): string[] {
  return Object.values(ANIMATIONS).map((c) => c.url);
}

export function getAnimationsByCategory(category: 'locomotion' | 'rifle' | 'pistol'): AnimationName[] {
  const prefix = category === 'locomotion' ? '' : category;
  return (Object.keys(ANIMATIONS) as AnimationName[]).filter((name) => {
    if (category === 'locomotion') {
      return !name.startsWith('rifle') && !name.startsWith('pistol');
    }
    return name.startsWith(prefix);
  });
}

// Critical animations to preload for fast startup
export const CRITICAL_ANIMATIONS: AnimationName[] = [
  'idle',
  'walk',
  'run',
  'rifleIdle',
  'rifleRunFwd',
  'pistolIdle',
  'pistolRunFwd',
];

// ============================================================
// ANIMATION STATE MACHINE
// ============================================================

export interface AnimationState {
  isMoving: boolean;
  isRunning: boolean;
  isSprinting: boolean;
  isJumping: boolean;
  isGrounded: boolean;
  isCrouching: boolean;
  isAiming: boolean;
  isStrafingLeft: boolean;
  isStrafingRight: boolean;
  isMovingBackward: boolean;
  isDying: boolean;
  weaponType: WeaponType;
}

export function getAnimationForState(state: AnimationState): AnimationName {
  const {
    weaponType,
    isMoving,
    isRunning,
    isSprinting,
    isJumping,
    isGrounded,
    isCrouching,
    isAiming,
    isStrafingLeft,
    isStrafingRight,
    isMovingBackward,
    isDying,
  } = state;

  // Death
  if (isDying) return 'rifleDeathFront';

  // Jump
  if (isJumping || !isGrounded) {
    if (weaponType === 'rifle') return 'rifleJumpLoop';
    if (weaponType === 'pistol') return 'pistolJump';
    return 'jump';
  }

  // RIFLE
  if (weaponType === 'rifle') {
    if (isCrouching) {
      if (isMoving) {
        if (isMovingBackward) {
          if (isStrafingLeft) return 'rifleCrouchBackLeft';
          if (isStrafingRight) return 'rifleCrouchBackRight';
          return 'rifleCrouchBack';
        }
        if (isStrafingLeft) return 'rifleCrouchLeft';
        if (isStrafingRight) return 'rifleCrouchRight';
        return 'rifleCrouchFwd';
      }
      return isAiming ? 'rifleCrouchAimIdle' : 'rifleCrouchIdle';
    }

    if (isAiming && !isMoving) return 'rifleAimIdle';

    if (isMoving) {
      if (isSprinting) {
        if (isMovingBackward) {
          if (isStrafingLeft) return 'rifleSprintBackLeft';
          if (isStrafingRight) return 'rifleSprintBackRight';
          return 'rifleSprintBack';
        }
        if (isStrafingLeft) return 'rifleSprintLeft';
        if (isStrafingRight) return 'rifleSprintRight';
        return 'rifleSprintFwd';
      }

      if (isRunning) {
        if (isMovingBackward) {
          if (isStrafingLeft) return 'rifleRunBackLeft';
          if (isStrafingRight) return 'rifleRunBackRight';
          return 'rifleRunBack';
        }
        if (isStrafingLeft) return 'rifleRunLeft';
        if (isStrafingRight) return 'rifleRunRight';
        return 'rifleRunFwd';
      }

      if (isMovingBackward) {
        if (isStrafingLeft) return 'rifleWalkBackLeft';
        if (isStrafingRight) return 'rifleWalkBackRight';
        return 'rifleWalkBack';
      }
      if (isStrafingLeft) return 'rifleWalkLeft';
      if (isStrafingRight) return 'rifleWalkRight';
      return 'rifleWalkFwd';
    }

    return 'rifleIdle';
  }

  // PISTOL
  if (weaponType === 'pistol') {
    if (isCrouching && !isMoving) return 'pistolKneelIdle';

    if (isMoving) {
      if (isRunning) {
        if (isMovingBackward) {
          if (isStrafingLeft) return 'pistolRunBackLeft';
          if (isStrafingRight) return 'pistolRunBackRight';
          return 'pistolRunBack';
        }
        if (isStrafingLeft) return 'pistolRunLeft';
        if (isStrafingRight) return 'pistolRunRight';
        return 'pistolRunFwd';
      }

      if (isMovingBackward) {
        if (isStrafingLeft) return 'pistolWalkBackLeft';
        if (isStrafingRight) return 'pistolWalkBackRight';
        return 'pistolWalkBack';
      }
      if (isStrafingLeft) return 'pistolWalkLeft';
      if (isStrafingRight) return 'pistolWalkRight';
      return 'pistolWalkFwd';
    }

    return 'pistolIdle';
  }

  // UNARMED
  if (isMoving) {
    if (isStrafingLeft) return isRunning ? 'strafeLeftRun' : 'strafeLeftWalk';
    if (isStrafingRight) return isRunning ? 'strafeRightRun' : 'strafeRightWalk';
    return isRunning ? 'run' : 'walk';
  }

  return 'idle';
}

// ============================================================
// MODEL REGISTRY
// ============================================================

export const MODELS = {
  xbot: '/assets/models/xbot.glb',
  // Add more models here as they're added
  // swatOperator: '/assets/models/swat_operator.glb',
  // zombie: '/assets/models/zombie.glb',
} as const;

export type ModelName = keyof typeof MODELS;
