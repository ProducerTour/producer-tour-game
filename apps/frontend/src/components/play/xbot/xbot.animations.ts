/**
 * X Bot Animation Configuration
 *
 * Animation packs:
 * - Male Locomotion Pack (unarmed base)
 * - Rifle 8-Way Locomotion Pack 3
 * - Pistol Locomotion Pack 3
 */

import * as THREE from 'three';

const BASE = '/assets/animations/xbot';

export interface XBotAnimationConfig {
  url: string;
  loop: boolean;
  fadeTime: number;
  clamp?: boolean;
}

export type WeaponType = 'none' | 'rifle' | 'pistol';

export type XBotAnimationName =
  // Unarmed (Male Locomotion Pack)
  | 'idle'
  | 'walk'
  | 'run'
  | 'jump'
  | 'strafeLeftRun'
  | 'strafeRightRun'
  | 'strafeLeftWalk'
  | 'strafeRightWalk'
  | 'turnLeft'
  | 'turnRight'
  // Rifle idle
  | 'rifleIdle'
  | 'rifleAimIdle'
  | 'rifleCrouchIdle'
  | 'rifleCrouchAimIdle'
  // Rifle walk (8-way)
  | 'rifleWalkFwd'
  | 'rifleWalkFwdLeft'
  | 'rifleWalkFwdRight'
  | 'rifleWalkBack'
  | 'rifleWalkBackLeft'
  | 'rifleWalkBackRight'
  | 'rifleWalkLeft'
  | 'rifleWalkRight'
  // Rifle run (8-way)
  | 'rifleRunFwd'
  | 'rifleRunFwdLeft'
  | 'rifleRunFwdRight'
  | 'rifleRunBack'
  | 'rifleRunBackLeft'
  | 'rifleRunBackRight'
  | 'rifleRunLeft'
  | 'rifleRunRight'
  // Rifle sprint (8-way)
  | 'rifleSprintFwd'
  | 'rifleSprintFwdLeft'
  | 'rifleSprintFwdRight'
  | 'rifleSprintBack'
  | 'rifleSprintBackLeft'
  | 'rifleSprintBackRight'
  | 'rifleSprintLeft'
  | 'rifleSprintRight'
  // Rifle crouch (8-way)
  | 'rifleCrouchFwd'
  | 'rifleCrouchFwdLeft'
  | 'rifleCrouchFwdRight'
  | 'rifleCrouchBack'
  | 'rifleCrouchBackLeft'
  | 'rifleCrouchBackRight'
  | 'rifleCrouchLeft'
  | 'rifleCrouchRight'
  // Rifle turns
  | 'rifleTurnLeft'
  | 'rifleTurnRight'
  | 'rifleCrouchTurnLeft'
  | 'rifleCrouchTurnRight'
  // Rifle jump
  | 'rifleJumpUp'
  | 'rifleJumpLoop'
  | 'rifleJumpDown'
  // Rifle death
  | 'rifleDeathFront'
  | 'rifleDeathBack'
  | 'rifleDeathRight'
  | 'rifleDeathHeadshotFront'
  | 'rifleDeathHeadshotBack'
  | 'rifleDeathCrouchHeadshot'
  // Pistol idle
  | 'pistolIdle'
  | 'pistolKneelIdle'
  | 'pistolStandToKneel'
  | 'pistolKneelToStand'
  // Pistol walk
  | 'pistolWalkFwd'
  | 'pistolWalkBack'
  | 'pistolWalkLeft'
  | 'pistolWalkRight'
  | 'pistolWalkBackLeft'
  | 'pistolWalkBackRight'
  // Pistol run
  | 'pistolRunFwd'
  | 'pistolRunBack'
  | 'pistolRunLeft'
  | 'pistolRunRight'
  | 'pistolRunBackLeft'
  | 'pistolRunBackRight'
  // Pistol strafe
  | 'pistolStrafeLeft'
  | 'pistolStrafeRight'
  // Pistol jump
  | 'pistolJump'
  | 'pistolJumpLoop';

export const XBOT_ANIMATIONS: Record<XBotAnimationName, XBotAnimationConfig> = {
  // ============================================================
  // UNARMED (Male Locomotion Pack)
  // ============================================================
  idle: { url: `${BASE}/idle.glb`, loop: true, fadeTime: 0.2 },
  walk: { url: `${BASE}/walk.glb`, loop: true, fadeTime: 0.2 },
  run: { url: `${BASE}/run.glb`, loop: true, fadeTime: 0.15 },
  jump: { url: `${BASE}/jump.glb`, loop: false, fadeTime: 0.1, clamp: true },
  strafeLeftRun: { url: `${BASE}/strafe_left_run.glb`, loop: true, fadeTime: 0.15 },
  strafeRightRun: { url: `${BASE}/strafe_right_run.glb`, loop: true, fadeTime: 0.15 },
  strafeLeftWalk: { url: `${BASE}/strafe_left_walk.glb`, loop: true, fadeTime: 0.2 },
  strafeRightWalk: { url: `${BASE}/strafe_right_walk.glb`, loop: true, fadeTime: 0.2 },
  turnLeft: { url: `${BASE}/turn_left.glb`, loop: false, fadeTime: 0.15 },
  turnRight: { url: `${BASE}/turn_right.glb`, loop: false, fadeTime: 0.15 },

  // ============================================================
  // RIFLE (8-Way Locomotion Pack)
  // ============================================================
  // Idle states
  rifleIdle: { url: `${BASE}/rifle_idle.glb`, loop: true, fadeTime: 0.2 },
  rifleAimIdle: { url: `${BASE}/rifle_aim_idle.glb`, loop: true, fadeTime: 0.15 },
  rifleCrouchIdle: { url: `${BASE}/rifle_crouch_idle.glb`, loop: true, fadeTime: 0.25 },
  rifleCrouchAimIdle: { url: `${BASE}/rifle_crouch_aim_idle.glb`, loop: true, fadeTime: 0.2 },

  // Walk - 8 directions
  rifleWalkFwd: { url: `${BASE}/rifle_walk_fwd.glb`, loop: true, fadeTime: 0.2 },
  rifleWalkFwdLeft: { url: `${BASE}/rifle_walk_fwd_left.glb`, loop: true, fadeTime: 0.2 },
  rifleWalkFwdRight: { url: `${BASE}/rifle_walk_fwd_right.glb`, loop: true, fadeTime: 0.2 },
  rifleWalkBack: { url: `${BASE}/rifle_walk_back.glb`, loop: true, fadeTime: 0.2 },
  rifleWalkBackLeft: { url: `${BASE}/rifle_walk_back_left.glb`, loop: true, fadeTime: 0.2 },
  rifleWalkBackRight: { url: `${BASE}/rifle_walk_back_right.glb`, loop: true, fadeTime: 0.2 },
  rifleWalkLeft: { url: `${BASE}/rifle_walk_left.glb`, loop: true, fadeTime: 0.2 },
  rifleWalkRight: { url: `${BASE}/rifle_walk_right.glb`, loop: true, fadeTime: 0.2 },

  // Run - 8 directions
  rifleRunFwd: { url: `${BASE}/rifle_run_fwd.glb`, loop: true, fadeTime: 0.15 },
  rifleRunFwdLeft: { url: `${BASE}/rifle_run_fwd_left.glb`, loop: true, fadeTime: 0.15 },
  rifleRunFwdRight: { url: `${BASE}/rifle_run_fwd_right.glb`, loop: true, fadeTime: 0.15 },
  rifleRunBack: { url: `${BASE}/rifle_run_back.glb`, loop: true, fadeTime: 0.15 },
  rifleRunBackLeft: { url: `${BASE}/rifle_run_back_left.glb`, loop: true, fadeTime: 0.15 },
  rifleRunBackRight: { url: `${BASE}/rifle_run_back_right.glb`, loop: true, fadeTime: 0.15 },
  rifleRunLeft: { url: `${BASE}/rifle_run_left.glb`, loop: true, fadeTime: 0.15 },
  rifleRunRight: { url: `${BASE}/rifle_run_right.glb`, loop: true, fadeTime: 0.15 },

  // Sprint - 8 directions
  rifleSprintFwd: { url: `${BASE}/rifle_sprint_fwd.glb`, loop: true, fadeTime: 0.15 },
  rifleSprintFwdLeft: { url: `${BASE}/rifle_sprint_fwd_left.glb`, loop: true, fadeTime: 0.15 },
  rifleSprintFwdRight: { url: `${BASE}/rifle_sprint_fwd_right.glb`, loop: true, fadeTime: 0.15 },
  rifleSprintBack: { url: `${BASE}/rifle_sprint_back.glb`, loop: true, fadeTime: 0.15 },
  rifleSprintBackLeft: { url: `${BASE}/rifle_sprint_back_left.glb`, loop: true, fadeTime: 0.15 },
  rifleSprintBackRight: { url: `${BASE}/rifle_sprint_back_right.glb`, loop: true, fadeTime: 0.15 },
  rifleSprintLeft: { url: `${BASE}/rifle_sprint_left.glb`, loop: true, fadeTime: 0.15 },
  rifleSprintRight: { url: `${BASE}/rifle_sprint_right.glb`, loop: true, fadeTime: 0.15 },

  // Crouch walk - 8 directions
  rifleCrouchFwd: { url: `${BASE}/rifle_crouch_fwd.glb`, loop: true, fadeTime: 0.2 },
  rifleCrouchFwdLeft: { url: `${BASE}/rifle_crouch_fwd_left.glb`, loop: true, fadeTime: 0.2 },
  rifleCrouchFwdRight: { url: `${BASE}/rifle_crouch_fwd_right.glb`, loop: true, fadeTime: 0.2 },
  rifleCrouchBack: { url: `${BASE}/rifle_crouch_back.glb`, loop: true, fadeTime: 0.2 },
  rifleCrouchBackLeft: { url: `${BASE}/rifle_crouch_back_left.glb`, loop: true, fadeTime: 0.2 },
  rifleCrouchBackRight: { url: `${BASE}/rifle_crouch_back_right.glb`, loop: true, fadeTime: 0.2 },
  rifleCrouchLeft: { url: `${BASE}/rifle_crouch_left.glb`, loop: true, fadeTime: 0.2 },
  rifleCrouchRight: { url: `${BASE}/rifle_crouch_right.glb`, loop: true, fadeTime: 0.2 },

  // Turns
  rifleTurnLeft: { url: `${BASE}/rifle_turn_left.glb`, loop: false, fadeTime: 0.15 },
  rifleTurnRight: { url: `${BASE}/rifle_turn_right.glb`, loop: false, fadeTime: 0.15 },
  rifleCrouchTurnLeft: { url: `${BASE}/rifle_crouch_turn_left.glb`, loop: false, fadeTime: 0.15 },
  rifleCrouchTurnRight: { url: `${BASE}/rifle_crouch_turn_right.glb`, loop: false, fadeTime: 0.15 },

  // Jump
  rifleJumpUp: { url: `${BASE}/rifle_jump_up.glb`, loop: false, fadeTime: 0.1, clamp: true },
  rifleJumpLoop: { url: `${BASE}/rifle_jump_loop.glb`, loop: true, fadeTime: 0.1 },
  rifleJumpDown: { url: `${BASE}/rifle_jump_down.glb`, loop: false, fadeTime: 0.1, clamp: true },

  // Death
  rifleDeathFront: { url: `${BASE}/rifle_death_front.glb`, loop: false, fadeTime: 0.1, clamp: true },
  rifleDeathBack: { url: `${BASE}/rifle_death_back.glb`, loop: false, fadeTime: 0.1, clamp: true },
  rifleDeathRight: { url: `${BASE}/rifle_death_right.glb`, loop: false, fadeTime: 0.1, clamp: true },
  rifleDeathHeadshotFront: { url: `${BASE}/rifle_death_headshot_front.glb`, loop: false, fadeTime: 0.1, clamp: true },
  rifleDeathHeadshotBack: { url: `${BASE}/rifle_death_headshot_back.glb`, loop: false, fadeTime: 0.1, clamp: true },
  rifleDeathCrouchHeadshot: { url: `${BASE}/rifle_death_crouch_headshot.glb`, loop: false, fadeTime: 0.1, clamp: true },

  // ============================================================
  // PISTOL (Locomotion Pack)
  // ============================================================
  // Idle
  pistolIdle: { url: `${BASE}/pistol_idle.glb`, loop: true, fadeTime: 0.2 },
  pistolKneelIdle: { url: `${BASE}/pistol_kneel_idle.glb`, loop: true, fadeTime: 0.25 },
  pistolStandToKneel: { url: `${BASE}/pistol_stand_to_kneel.glb`, loop: false, fadeTime: 0.15, clamp: true },
  pistolKneelToStand: { url: `${BASE}/pistol_kneel_to_stand.glb`, loop: false, fadeTime: 0.15, clamp: true },

  // Walk
  pistolWalkFwd: { url: `${BASE}/pistol_walk_fwd.glb`, loop: true, fadeTime: 0.2 },
  pistolWalkBack: { url: `${BASE}/pistol_walk_back.glb`, loop: true, fadeTime: 0.2 },
  pistolWalkLeft: { url: `${BASE}/pistol_walk_left.glb`, loop: true, fadeTime: 0.2 },
  pistolWalkRight: { url: `${BASE}/pistol_walk_right.glb`, loop: true, fadeTime: 0.2 },
  pistolWalkBackLeft: { url: `${BASE}/pistol_walk_back_left.glb`, loop: true, fadeTime: 0.2 },
  pistolWalkBackRight: { url: `${BASE}/pistol_walk_back_right.glb`, loop: true, fadeTime: 0.2 },

  // Run
  pistolRunFwd: { url: `${BASE}/pistol_run_fwd.glb`, loop: true, fadeTime: 0.15 },
  pistolRunBack: { url: `${BASE}/pistol_run_back.glb`, loop: true, fadeTime: 0.15 },
  pistolRunLeft: { url: `${BASE}/pistol_run_left.glb`, loop: true, fadeTime: 0.15 },
  pistolRunRight: { url: `${BASE}/pistol_run_right.glb`, loop: true, fadeTime: 0.15 },
  pistolRunBackLeft: { url: `${BASE}/pistol_run_back_left.glb`, loop: true, fadeTime: 0.15 },
  pistolRunBackRight: { url: `${BASE}/pistol_run_back_right.glb`, loop: true, fadeTime: 0.15 },

  // Strafe
  pistolStrafeLeft: { url: `${BASE}/pistol_strafe_left.glb`, loop: true, fadeTime: 0.15 },
  pistolStrafeRight: { url: `${BASE}/pistol_strafe_right.glb`, loop: true, fadeTime: 0.15 },

  // Jump
  pistolJump: { url: `${BASE}/pistol_jump.glb`, loop: false, fadeTime: 0.1, clamp: true },
  pistolJumpLoop: { url: `${BASE}/pistol_jump_loop.glb`, loop: true, fadeTime: 0.1 },
};

export const XBOT_MODEL_PATH = '/assets/models/xbot.glb';

export function getLoopMode(name: XBotAnimationName): THREE.AnimationActionLoopStyles {
  return XBOT_ANIMATIONS[name].loop ? THREE.LoopRepeat : THREE.LoopOnce;
}

export function getAllAnimationUrls(): string[] {
  return Object.values(XBOT_ANIMATIONS).map((c) => c.url);
}

export const CRITICAL_ANIMATIONS: XBotAnimationName[] = [
  'idle',
  'walk',
  'run',
  'rifleIdle',
  'rifleRunFwd',
  'pistolIdle',
  'pistolRunFwd',
];

/**
 * Get animation for current state
 */
export function getAnimationForState(
  weaponType: WeaponType,
  isMoving: boolean,
  isRunning: boolean,
  isSprinting: boolean,
  isJumping: boolean,
  isGrounded: boolean,
  isCrouching: boolean,
  isAiming: boolean,
  isStrafingLeft: boolean,
  isStrafingRight: boolean,
  isMovingBackward: boolean,
  isDying: boolean
): XBotAnimationName {
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
      // Sprint
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

      // Run
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

      // Walk
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

      // Walk
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
