/**
 * Animation State Machine Hook
 * Manages transitions between animation states with proper blending.
 * Supports crouch, dance, weapon states, and transition callbacks.
 */

import { useRef, useEffect, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { ANIMATION_CONFIG, getFadeTime, type AnimationName } from '../animations.config';

// All possible animation states
export type AnimState =
  | 'idle'
  | 'walk'
  | 'run'
  | 'jump'
  | 'fall'
  | 'land'
  // Crouch states
  | 'crouchIdle'
  | 'crouchWalk'
  | 'crouchStrafeLeft'
  | 'crouchStrafeRight'
  | 'standToCrouch'
  | 'crouchToStand'
  | 'crouchToSprint'
  // Dance states
  | 'dance1'
  | 'dance2'
  | 'dance3'
  // Weapon states (standing)
  | 'rifleIdle'
  | 'rifleWalk'
  | 'rifleRun'
  | 'pistolIdle'
  | 'pistolWalk'
  | 'pistolRun'
  // Weapon states (crouching)
  | 'crouchRifleIdle'
  | 'crouchRifleWalk'
  | 'crouchRifleStrafeLeft'
  | 'crouchRifleStrafeRight'
  | 'crouchPistolIdle'
  | 'crouchPistolWalk'
  // Rifle jump state
  | 'rifleJump'
  // Rifle aiming/firing states
  | 'rifleAimIdle'
  | 'rifleAimWalk'
  | 'rifleFireStill'
  | 'rifleFireWalk'
  | 'rifleFireCrouch'
  // Crouch rifle firing (idle specific)
  | 'crouchFireRifleTap'
  | 'crouchRapidFireRifle'
  // Rifle reload states
  | 'rifleReloadStand'
  | 'rifleReloadWalk'
  | 'rifleReloadCrouch';

export type WeaponType = 'none' | 'rifle' | 'pistol';

export interface AnimationInput {
  isMoving: boolean;
  isRunning: boolean;
  isGrounded: boolean;
  isJumping: boolean;
  isCrouching: boolean;
  isDancing: boolean;
  isStrafeLeft: boolean;
  isStrafeRight: boolean;
  isAiming: boolean;
  isFiring: boolean;
  isReloading?: boolean;
  weapon: WeaponType;
  velocityY?: number;
}

interface Transition {
  from: AnimState | AnimState[] | '*';
  to: AnimState;
  condition: (input: AnimationInput, timeSinceLastTransition: number) => boolean;
  priority: number;
  cooldown?: number; // Min time before this transition can fire again (ms)
  onEnter?: () => void;
  onExit?: () => void;
}

// State category helpers
const CROUCH_STATES: AnimState[] = [
  'crouchIdle', 'crouchWalk', 'crouchStrafeLeft', 'crouchStrafeRight',
  'standToCrouch', 'crouchToStand', 'crouchToSprint',
  'crouchRifleIdle', 'crouchRifleWalk', 'crouchRifleStrafeLeft', 'crouchRifleStrafeRight',
  'crouchPistolIdle', 'crouchPistolWalk',
];
const DANCE_STATES: AnimState[] = ['dance1', 'dance2', 'dance3'];
const WEAPON_STANDING_STATES: AnimState[] = [
  'rifleIdle', 'rifleWalk', 'rifleRun',
  'pistolIdle', 'pistolWalk', 'pistolRun',
];
const RIFLE_AIM_STATES: AnimState[] = [
  'rifleAimIdle', 'rifleAimWalk',
];
const RIFLE_FIRE_STATES: AnimState[] = [
  'rifleFireStill', 'rifleFireWalk', 'rifleFireCrouch',
  'crouchFireRifleTap', 'crouchRapidFireRifle',
];
// Reload states (for future use when reload animation is implemented)
// const RIFLE_RELOAD_STATES: AnimState[] = [
//   'rifleReloadStand', 'rifleReloadWalk', 'rifleReloadCrouch',
// ];
const TRANSITION_STATES: AnimState[] = ['standToCrouch', 'crouchToStand', 'crouchToSprint'];

// Define all state transitions with priorities
const TRANSITIONS: Transition[] = [
  // ===== HIGHEST PRIORITY: Air states =====
  // Rifle jump - from rifle states when in air
  {
    from: ['rifleIdle', 'rifleWalk', 'rifleRun'],
    to: 'rifleJump',
    condition: (i) => i.isJumping,
    priority: 101,
  },
  // Landing from rifle jump - go straight to rifle state
  {
    from: 'rifleJump',
    to: 'rifleRun',
    condition: (i, time) => i.isGrounded && i.isMoving && i.isRunning && time > 150,
    priority: 92,
  },
  {
    from: 'rifleJump',
    to: 'rifleWalk',
    condition: (i, time) => i.isGrounded && i.isMoving && !i.isRunning && time > 150,
    priority: 92,
  },
  {
    from: 'rifleJump',
    to: 'rifleIdle',
    condition: (i, time) => i.isGrounded && !i.isMoving && time > 200,
    priority: 92,
  },
  // Regular jump (no weapon or pistol) - only when in air
  // Only trigger if NOT rifle (rifle has its own jump animation)
  {
    from: ['idle', 'walk', 'run', 'pistolIdle', 'pistolWalk', 'pistolRun'],
    to: 'jump',
    condition: (i) => i.isJumping && i.weapon !== 'rifle',
    priority: 100,
  },
  // Fall - from grounded states when falling (walked off edge)
  {
    from: ['idle', 'walk', 'run', 'rifleIdle', 'rifleWalk', 'rifleRun', 'pistolIdle', 'pistolWalk', 'pistolRun'],
    to: 'fall',
    condition: (i) => !i.isGrounded && (i.velocityY ?? 0) < -2,
    priority: 95,
  },
  // Landing while moving - go directly to locomotion (skip awkward 'land' state)
  {
    from: ['jump', 'fall'],
    to: 'run',
    condition: (i, time) => i.isGrounded && i.isMoving && i.isRunning && time > 100,
    priority: 91,
  },
  {
    from: ['jump', 'fall'],
    to: 'walk',
    condition: (i, time) => i.isGrounded && i.isMoving && !i.isRunning && time > 100,
    priority: 91,
  },
  // Landing while stationary - brief land state then idle
  {
    from: ['jump', 'fall'],
    to: 'idle',
    condition: (i, time) => i.isGrounded && !i.isMoving && time > 150,
    priority: 90,
  },

  // ===== RIFLE FIRING (high priority) =====
  // Firing works both with hip-fire and ADS
  {
    from: ['rifleAimIdle', 'rifleIdle'],
    to: 'rifleFireStill',
    condition: (i) => i.isFiring && !i.isMoving && !i.isCrouching && i.weapon === 'rifle',
    priority: 88,
  },
  {
    from: ['rifleAimWalk', 'rifleWalk', 'rifleRun'],
    to: 'rifleFireWalk',
    condition: (i) => i.isFiring && i.isMoving && !i.isCrouching && i.weapon === 'rifle',
    priority: 88,
  },
  // Crouch fire - idle uses dedicated idle fire anim, moving uses walk fire anim
  {
    from: 'crouchRifleIdle',
    to: 'crouchRapidFireRifle',
    condition: (i) => i.isFiring && i.isCrouching && !i.isMoving && i.weapon === 'rifle',
    priority: 89,
  },
  {
    from: ['crouchRifleWalk', 'crouchRifleStrafeLeft', 'crouchRifleStrafeRight'],
    to: 'rifleFireCrouch',
    condition: (i) => i.isFiring && i.isCrouching && i.isMoving && i.weapon === 'rifle',
    priority: 88,
  },
  // Fire animation exit - only when player STOPS firing (releases button)
  // Standing fire exit
  {
    from: 'rifleFireStill',
    to: 'rifleAimIdle',
    condition: (i) => !i.isFiring && i.isAiming && !i.isMoving,
    priority: 87,
  },
  {
    from: 'rifleFireStill',
    to: 'rifleAimWalk',
    condition: (i) => !i.isFiring && i.isAiming && i.isMoving,
    priority: 87,
  },
  {
    from: 'rifleFireStill',
    to: 'rifleIdle',
    condition: (i) => !i.isFiring && !i.isAiming && !i.isMoving,
    priority: 86,
  },
  {
    from: 'rifleFireStill',
    to: 'rifleWalk',
    condition: (i) => !i.isFiring && !i.isAiming && i.isMoving && !i.isRunning,
    priority: 86,
  },
  {
    from: 'rifleFireStill',
    to: 'rifleRun',
    condition: (i) => !i.isFiring && !i.isAiming && i.isMoving && i.isRunning,
    priority: 86,
  },
  // Walking fire exit
  {
    from: 'rifleFireWalk',
    to: 'rifleAimWalk',
    condition: (i) => !i.isFiring && i.isAiming && i.isMoving,
    priority: 87,
  },
  {
    from: 'rifleFireWalk',
    to: 'rifleAimIdle',
    condition: (i) => !i.isFiring && i.isAiming && !i.isMoving,
    priority: 87,
  },
  {
    from: 'rifleFireWalk',
    to: 'rifleWalk',
    condition: (i) => !i.isFiring && !i.isAiming && i.isMoving && !i.isRunning,
    priority: 86,
  },
  {
    from: 'rifleFireWalk',
    to: 'rifleRun',
    condition: (i) => !i.isFiring && !i.isAiming && i.isMoving && i.isRunning,
    priority: 86,
  },
  {
    from: 'rifleFireWalk',
    to: 'rifleIdle',
    condition: (i) => !i.isFiring && !i.isAiming && !i.isMoving,
    priority: 86,
  },
  // Crouch fire exit (moving crouch fire)
  {
    from: 'rifleFireCrouch',
    to: 'crouchRifleIdle',
    condition: (i) => !i.isFiring && !i.isMoving,
    priority: 87,
  },
  {
    from: 'rifleFireCrouch',
    to: 'crouchRifleWalk',
    condition: (i) => !i.isFiring && i.isMoving,
    priority: 87,
  },
  // Crouch idle fire exit (crouchRapidFireRifle)
  {
    from: 'crouchRapidFireRifle',
    to: 'crouchRifleIdle',
    condition: (i) => !i.isFiring && !i.isMoving,
    priority: 87,
  },
  {
    from: 'crouchRapidFireRifle',
    to: 'crouchRifleWalk',
    condition: (i) => !i.isFiring && i.isMoving,
    priority: 87,
  },

  // Aiming transitions (enter aim mode)
  {
    from: ['rifleIdle', 'rifleWalk', 'rifleRun'],
    to: 'rifleAimIdle',
    condition: (i) => i.isAiming && !i.isMoving && !i.isCrouching && i.weapon === 'rifle',
    priority: 85,
  },
  {
    from: ['rifleIdle', 'rifleWalk', 'rifleRun'],
    to: 'rifleAimWalk',
    condition: (i) => i.isAiming && i.isMoving && !i.isCrouching && i.weapon === 'rifle',
    priority: 85,
  },
  // Aim walk <-> aim idle
  {
    from: 'rifleAimIdle',
    to: 'rifleAimWalk',
    condition: (i) => i.isAiming && i.isMoving,
    priority: 84,
  },
  {
    from: 'rifleAimWalk',
    to: 'rifleAimIdle',
    condition: (i) => i.isAiming && !i.isMoving,
    priority: 84,
  },
  // Exit aim mode (stop aiming)
  {
    from: [...RIFLE_AIM_STATES, ...RIFLE_FIRE_STATES],
    to: 'rifleIdle',
    condition: (i) => !i.isAiming && !i.isMoving && !i.isCrouching && i.weapon === 'rifle',
    priority: 83,
  },
  {
    from: [...RIFLE_AIM_STATES, ...RIFLE_FIRE_STATES],
    to: 'rifleWalk',
    condition: (i) => !i.isAiming && i.isMoving && !i.isRunning && !i.isCrouching && i.weapon === 'rifle',
    priority: 83,
  },
  {
    from: [...RIFLE_AIM_STATES, ...RIFLE_FIRE_STATES],
    to: 'rifleRun',
    condition: (i) => !i.isAiming && i.isMoving && i.isRunning && !i.isCrouching && i.weapon === 'rifle',
    priority: 83,
  },

  // ===== DANCE (high priority, only when grounded and idle) =====
  {
    from: 'idle',
    to: 'dance1',
    condition: (i) => i.isDancing && i.isGrounded && !i.isMoving,
    priority: 80,
  },
  {
    from: DANCE_STATES,
    to: 'idle',
    condition: (i) => !i.isDancing || i.isMoving,
    priority: 80,
  },

  // ===== CROUCH TRANSITIONS (one-shot) =====
  {
    from: ['idle', 'walk', 'run', ...WEAPON_STANDING_STATES],
    to: 'standToCrouch',
    condition: (i) => i.isCrouching && i.isGrounded,
    priority: 70,
  },
  {
    from: 'standToCrouch',
    to: 'crouchIdle',
    condition: (_i, time) => time > 400, // After transition animation
    priority: 75,
  },
  {
    from: CROUCH_STATES.filter(s => s !== 'crouchToStand' && s !== 'crouchToSprint'),
    to: 'crouchToStand',
    condition: (i) => !i.isCrouching && i.isGrounded && !i.isRunning,
    priority: 70,
  },
  {
    from: CROUCH_STATES.filter(s => s !== 'crouchToStand' && s !== 'crouchToSprint'),
    to: 'crouchToSprint',
    condition: (i) => !i.isCrouching && i.isGrounded && i.isRunning && i.isMoving,
    priority: 70,
  },
  {
    from: 'crouchToStand',
    to: 'idle',
    condition: (i, time) => time > 400 && !i.isMoving,
    priority: 75,
  },
  {
    from: 'crouchToStand',
    to: 'walk',
    condition: (i, time) => time > 300 && i.isMoving && !i.isRunning,
    priority: 75,
  },
  {
    from: 'crouchToSprint',
    to: 'run',
    condition: (_i, time) => time > 300,
    priority: 75,
  },

  // ===== CROUCH + WEAPON STATES =====
  // Note: Don't include standToCrouch in 'from' - let the one-shot animation complete first
  // Rifle crouching
  {
    from: ['crouchIdle', 'crouchWalk', 'crouchRifleWalk', 'crouchRifleStrafeLeft', 'crouchRifleStrafeRight'],
    to: 'crouchRifleIdle',
    condition: (i) => i.isCrouching && i.weapon === 'rifle' && !i.isMoving,
    priority: 65,
  },
  {
    from: ['crouchIdle', 'crouchWalk', 'crouchRifleIdle', 'crouchRifleStrafeLeft', 'crouchRifleStrafeRight'],
    to: 'crouchRifleWalk',
    condition: (i) => i.isCrouching && i.weapon === 'rifle' && i.isMoving && !i.isStrafeLeft && !i.isStrafeRight,
    priority: 65,
  },
  {
    from: ['crouchRifleIdle', 'crouchRifleWalk', 'crouchRifleStrafeRight'],
    to: 'crouchRifleStrafeLeft',
    condition: (i) => i.isCrouching && i.weapon === 'rifle' && i.isStrafeLeft,
    priority: 66,
  },
  {
    from: ['crouchRifleIdle', 'crouchRifleWalk', 'crouchRifleStrafeLeft'],
    to: 'crouchRifleStrafeRight',
    condition: (i) => i.isCrouching && i.weapon === 'rifle' && i.isStrafeRight,
    priority: 66,
  },
  // Pistol crouching
  {
    from: ['crouchIdle', 'crouchWalk'],
    to: 'crouchPistolIdle',
    condition: (i) => i.isCrouching && i.weapon === 'pistol' && !i.isMoving,
    priority: 65,
  },
  {
    from: ['crouchIdle', 'crouchWalk', 'crouchPistolIdle'],
    to: 'crouchPistolWalk',
    condition: (i) => i.isCrouching && i.weapon === 'pistol' && i.isMoving,
    priority: 65,
  },
  // Weapon unequipped while crouching
  {
    from: ['crouchRifleIdle', 'crouchPistolIdle'],
    to: 'crouchIdle',
    condition: (i) => i.isCrouching && i.weapon === 'none' && !i.isMoving,
    priority: 64,
  },
  {
    from: ['crouchRifleWalk', 'crouchRifleStrafeLeft', 'crouchRifleStrafeRight', 'crouchPistolWalk'],
    to: 'crouchWalk',
    condition: (i) => i.isCrouching && i.weapon === 'none' && i.isMoving,
    priority: 64,
  },

  // ===== CROUCH MOVEMENT (no weapon) =====
  // Note: Don't include standToCrouch - let one-shot animation complete first
  {
    from: 'crouchIdle',
    to: 'crouchWalk',
    condition: (i) => i.isCrouching && i.isMoving && i.weapon === 'none' && !i.isStrafeLeft && !i.isStrafeRight,
    priority: 60,
  },
  {
    from: ['crouchWalk', 'crouchStrafeLeft', 'crouchStrafeRight'],
    to: 'crouchIdle',
    condition: (i) => i.isCrouching && !i.isMoving && i.weapon === 'none',
    priority: 60,
  },
  {
    from: ['crouchIdle', 'crouchWalk'],
    to: 'crouchStrafeLeft',
    condition: (i) => i.isCrouching && i.isStrafeLeft && i.weapon === 'none',
    priority: 61,
  },
  {
    from: ['crouchIdle', 'crouchWalk'],
    to: 'crouchStrafeRight',
    condition: (i) => i.isCrouching && i.isStrafeRight && i.weapon === 'none',
    priority: 61,
  },

  // ===== WEAPON STATES (standing) =====
  // Rifle - includes transitions within rifle states (run->walk->idle)
  {
    from: ['idle', 'walk', 'run', 'rifleWalk', 'rifleRun', 'pistolIdle', 'pistolWalk', 'pistolRun'],
    to: 'rifleIdle',
    condition: (i) => !i.isCrouching && i.weapon === 'rifle' && !i.isMoving,
    priority: 50,
  },
  {
    from: ['idle', 'walk', 'run', 'rifleIdle', 'rifleRun', 'pistolIdle', 'pistolWalk', 'pistolRun'],
    to: 'rifleWalk',
    condition: (i) => !i.isCrouching && i.weapon === 'rifle' && i.isMoving && !i.isRunning,
    priority: 50,
  },
  {
    from: ['idle', 'walk', 'run', 'rifleIdle', 'rifleWalk', 'pistolIdle', 'pistolWalk', 'pistolRun'],
    to: 'rifleRun',
    condition: (i) => !i.isCrouching && i.weapon === 'rifle' && i.isMoving && i.isRunning,
    priority: 50,
  },
  // Pistol - includes transitions within pistol states (run->walk->idle)
  {
    from: ['idle', 'walk', 'run', 'pistolWalk', 'pistolRun', 'rifleIdle', 'rifleWalk', 'rifleRun'],
    to: 'pistolIdle',
    condition: (i) => !i.isCrouching && i.weapon === 'pistol' && !i.isMoving,
    priority: 50,
  },
  {
    from: ['idle', 'walk', 'run', 'pistolIdle', 'pistolRun', 'rifleIdle', 'rifleWalk', 'rifleRun'],
    to: 'pistolWalk',
    condition: (i) => !i.isCrouching && i.weapon === 'pistol' && i.isMoving && !i.isRunning,
    priority: 50,
  },
  {
    from: ['idle', 'walk', 'run', 'pistolIdle', 'pistolWalk', 'rifleIdle', 'rifleWalk', 'rifleRun'],
    to: 'pistolRun',
    condition: (i) => !i.isCrouching && i.weapon === 'pistol' && i.isMoving && i.isRunning,
    priority: 50,
  },
  // Weapon unequipped
  {
    from: WEAPON_STANDING_STATES,
    to: 'idle',
    condition: (i) => !i.isCrouching && i.weapon === 'none' && !i.isMoving,
    priority: 49,
  },
  {
    from: WEAPON_STANDING_STATES,
    to: 'walk',
    condition: (i) => !i.isCrouching && i.weapon === 'none' && i.isMoving && !i.isRunning,
    priority: 49,
  },
  {
    from: WEAPON_STANDING_STATES,
    to: 'run',
    condition: (i) => !i.isCrouching && i.weapon === 'none' && i.isMoving && i.isRunning,
    priority: 49,
  },

  // ===== BASIC LOCOMOTION (lowest priority) =====
  {
    from: 'idle',
    to: 'walk',
    condition: (i) => i.isMoving && !i.isRunning && !i.isCrouching && i.weapon === 'none',
    priority: 10,
  },
  {
    from: 'idle',
    to: 'run',
    condition: (i) => i.isMoving && i.isRunning && !i.isCrouching && i.weapon === 'none',
    priority: 10,
  },
  {
    from: 'walk',
    to: 'run',
    condition: (i) => i.isRunning && !i.isCrouching && i.weapon === 'none',
    priority: 11,
  },
  {
    from: 'run',
    to: 'walk',
    condition: (i) => !i.isRunning && i.isMoving && !i.isCrouching && i.weapon === 'none',
    priority: 11,
  },
  {
    from: ['walk', 'run'],
    to: 'idle',
    condition: (i) => !i.isMoving && !i.isCrouching && i.weapon === 'none',
    priority: 10,
  },
];

// Map state names to animation action names
const STATE_TO_ACTION: Record<AnimState, string> = {
  idle: 'idle',
  walk: 'walking',
  run: 'running',
  jump: 'jump',
  fall: 'jump', // Use jump animation for falling (or create fall animation)
  land: 'idle', // Quick return to idle
  crouchIdle: 'crouchIdle',
  crouchWalk: 'crouchWalk',
  crouchStrafeLeft: 'crouchStrafeLeft',
  crouchStrafeRight: 'crouchStrafeRight',
  standToCrouch: 'standToCrouch',
  crouchToStand: 'crouchToStand',
  crouchToSprint: 'crouchToSprint',
  dance1: 'dance1',
  dance2: 'dance2',
  dance3: 'dance3',
  rifleIdle: 'rifleIdle',
  rifleWalk: 'rifleWalk',
  rifleRun: 'rifleRun',
  pistolIdle: 'pistolIdle',
  pistolWalk: 'pistolWalk',
  pistolRun: 'pistolRun',
  crouchRifleIdle: 'crouchRifleIdle',
  crouchRifleWalk: 'crouchRifleWalk',
  crouchRifleStrafeLeft: 'crouchRifleStrafeLeft',
  crouchRifleStrafeRight: 'crouchRifleStrafeRight',
  crouchPistolIdle: 'crouchPistolIdle',
  crouchPistolWalk: 'crouchPistolWalk',
  rifleJump: 'rifleJump',
  // Rifle aiming/firing (use existing idle animations as base for aim)
  rifleAimIdle: 'rifleIdle',  // Use rifleIdle as aim pose
  rifleAimWalk: 'rifleWalk',  // Use rifleWalk while aim-walking
  rifleFireStill: 'rifleFireStill',
  rifleFireWalk: 'rifleFireWalk',
  rifleFireCrouch: 'rifleFireCrouch',
  // Crouch rifle firing (idle specific)
  crouchFireRifleTap: 'crouchFireRifleTap',
  crouchRapidFireRifle: 'crouchRapidFireRifle',
  // Rifle reload
  rifleReloadStand: 'rifleReloadStand',
  rifleReloadWalk: 'rifleReloadWalk',
  rifleReloadCrouch: 'rifleReloadCrouch',
};

// Fallbacks for missing animations
const FALLBACKS: Partial<Record<AnimState, AnimState[]>> = {
  fall: ['jump', 'idle'],
  land: ['idle'],
  crouchIdle: ['crouchWalk', 'idle'],
  crouchStrafeLeft: ['crouchWalk'],
  crouchStrafeRight: ['crouchWalk'],
  standToCrouch: ['crouchIdle'],
  crouchToStand: ['idle'],
  crouchToSprint: ['run'],
  crouchRifleIdle: ['crouchIdle', 'rifleIdle'],
  crouchRifleWalk: ['crouchWalk', 'rifleWalk'],
  crouchRifleStrafeLeft: ['crouchRifleWalk', 'crouchStrafeLeft'],
  crouchRifleStrafeRight: ['crouchRifleWalk', 'crouchStrafeRight'],
  crouchPistolIdle: ['crouchIdle', 'pistolIdle'],
  crouchPistolWalk: ['crouchWalk', 'pistolWalk'],
  rifleIdle: ['idle'],
  rifleWalk: ['walk'],
  rifleRun: ['run'],
  pistolIdle: ['idle'],
  pistolWalk: ['walk'],
  pistolRun: ['run'],
  rifleJump: ['jump'],
  // Rifle aiming/firing fallbacks
  rifleAimIdle: ['rifleIdle', 'idle'],
  rifleAimWalk: ['rifleWalk', 'walk'],
  rifleFireStill: ['rifleIdle'],
  rifleFireWalk: ['rifleWalk'],
  rifleFireCrouch: ['crouchRifleIdle'],
  // Crouch rifle firing (idle specific) fallbacks
  crouchFireRifleTap: ['crouchRapidFireRifle', 'rifleFireCrouch', 'crouchRifleIdle'],
  crouchRapidFireRifle: ['rifleFireCrouch', 'crouchRifleIdle'],
  // Rifle reload fallbacks
  rifleReloadStand: ['rifleIdle'],
  rifleReloadWalk: ['rifleWalk'],
  rifleReloadCrouch: ['crouchRifleIdle'],
};

export interface AnimationStateMachineResult {
  currentState: AnimState;
  previousState: AnimState | null;
  isTransitioning: boolean;
  timeSinceTransition: number;
}

// Map one-shot animations to their target states after completion
// These functions determine the next state based on current input
const ONE_SHOT_NEXT_STATE: Partial<Record<AnimState, (input: AnimationInput) => AnimState>> = {
  standToCrouch: (i) => {
    if (i.weapon === 'rifle') {
      if (!i.isMoving) return 'crouchRifleIdle';
      if (i.isStrafeLeft) return 'crouchRifleStrafeLeft';
      if (i.isStrafeRight) return 'crouchRifleStrafeRight';
      return 'crouchRifleWalk';
    }
    if (i.weapon === 'pistol') return i.isMoving ? 'crouchPistolWalk' : 'crouchPistolIdle';
    return i.isMoving ? 'crouchWalk' : 'crouchIdle';
  },
  crouchToStand: (i) => {
    if (i.weapon === 'rifle') return i.isMoving ? (i.isRunning ? 'rifleRun' : 'rifleWalk') : 'rifleIdle';
    if (i.weapon === 'pistol') return i.isMoving ? (i.isRunning ? 'pistolRun' : 'pistolWalk') : 'pistolIdle';
    return i.isMoving ? (i.isRunning ? 'run' : 'walk') : 'idle';
  },
  crouchToSprint: (i) => {
    if (i.weapon === 'rifle') return 'rifleRun';
    if (i.weapon === 'pistol') return 'pistolRun';
    return 'run';
  },
  // Jump/rifleJump landings are handled by FSM directly for smoother blending
  // Only handle the "animation finished while still in air" case here
  jump: (i) => {
    if (!i.isGrounded) return 'fall';
    // If grounded, let FSM handle the transition with proper timing
    return i.isMoving ? (i.isRunning ? 'run' : 'walk') : 'idle';
  },
};

export function useAnimationStateMachine(
  actions: Record<string, THREE.AnimationAction | null>,
  input: AnimationInput,
  onStateChange?: (from: AnimState | null, to: AnimState) => void
): AnimationStateMachineResult {
  const currentState = useRef<AnimState>('idle');
  const previousState = useRef<AnimState | null>(null);
  const currentAction = useRef<THREE.AnimationAction | null>(null);
  const lastTransitionTime = useRef<number>(Date.now());
  const cooldowns = useRef<Map<AnimState, number>>(new Map());
  const isTransitioning = useRef(false);
  const inputRef = useRef(input); // Keep latest input for finished callback
  const finishedListenerRef = useRef<(() => void) | null>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);

  // Keep input ref updated for use in finished callback
  inputRef.current = input;

  // Sort transitions by priority once
  const sortedTransitions = useMemo(
    () => [...TRANSITIONS].sort((a, b) => b.priority - a.priority),
    []
  );

  // Get action with fallback support
  const getAction = useCallback(
    (state: AnimState): THREE.AnimationAction | null => {
      const actionName = STATE_TO_ACTION[state];
      if (actions[actionName]) {
        return actions[actionName];
      }

      // Try fallbacks
      const fallbacks = FALLBACKS[state] || [];
      for (const fallback of fallbacks) {
        const fallbackName = STATE_TO_ACTION[fallback];
        if (actions[fallbackName]) {
          return actions[fallbackName];
        }
      }

      // Last resort: idle
      return actions['idle'] || null;
    },
    [actions]
  );

  // Crossfade to new state
  const transitionTo = useCallback(
    (toState: AnimState, transition?: Transition) => {
      const toAction = getAction(toState);
      if (!toAction) {
        console.warn(`[AnimSM] No action for state: ${toState}`);
        return false;
      }

      // Don't re-enter same animation
      if (currentAction.current === toAction && currentState.current === toState) {
        return false;
      }

      // Check cooldown
      const lastCooldown = cooldowns.current.get(toState) || 0;
      if (transition?.cooldown && Date.now() - lastCooldown < transition.cooldown) {
        return false;
      }

      // Call exit callback
      transition?.onExit?.();

      // Get fade time from config or use default
      const actionName = STATE_TO_ACTION[toState];
      const fadeTime = getFadeTime(actionName) || 0.15;

      // Clean up previous finished listener
      if (finishedListenerRef.current && mixerRef.current) {
        mixerRef.current.removeEventListener('finished', finishedListenerRef.current);
        finishedListenerRef.current = null;
      }

      // Fade out current
      if (currentAction.current) {
        currentAction.current.fadeOut(fadeTime);
      }

      // Configure and play new action
      const config = ANIMATION_CONFIG[actionName as AnimationName];
      if (config) {
        toAction.setLoop(
          config.loop ? THREE.LoopRepeat : THREE.LoopOnce,
          config.loop ? Infinity : 1
        );
        if (config.clamp) {
          toAction.clampWhenFinished = true;
        }
      }

      toAction.reset().fadeIn(fadeTime).play();

      // Update refs
      previousState.current = currentState.current;
      currentState.current = toState;
      currentAction.current = toAction;
      lastTransitionTime.current = Date.now();
      isTransitioning.current = true;

      // Set cooldown
      if (transition?.cooldown) {
        cooldowns.current.set(toState, Date.now());
      }

      // Clear transitioning flag after fade
      setTimeout(() => {
        isTransitioning.current = false;
      }, fadeTime * 1000);

      // Set up finished listener for one-shot animations
      const nextStateFn = ONE_SHOT_NEXT_STATE[toState];
      if (nextStateFn && toAction.getMixer()) {
        mixerRef.current = toAction.getMixer();

        const handleFinished = (e: { action: THREE.AnimationAction }) => {
          // Only handle if this is our current action
          if (e.action === currentAction.current && currentState.current === toState) {
            const nextState = nextStateFn(inputRef.current);
            console.log(`[AnimSM] One-shot finished: ${toState} → ${nextState}`);

            // Small delay to ensure smooth transition
            setTimeout(() => {
              if (currentState.current === toState) {
                transitionTo(nextState);
              }
            }, 50);
          }
        };

        finishedListenerRef.current = handleFinished as () => void;
        mixerRef.current.addEventListener('finished', handleFinished);
      }

      // Call enter callback and state change handler
      transition?.onEnter?.();
      onStateChange?.(previousState.current, toState);

      return true;
    },
    [getAction, onStateChange]
  );

  // Process transitions on input change
  useEffect(() => {
    const timeSinceTransition = Date.now() - lastTransitionTime.current;

    // Don't interrupt one-shot transition animations too quickly
    if (TRANSITION_STATES.includes(currentState.current) && timeSinceTransition < 150) {
      return;
    }

    // Find first valid transition
    for (const transition of sortedTransitions) {
      // Check if 'from' matches current state
      const fromMatches =
        transition.from === '*' ||
        (Array.isArray(transition.from)
          ? transition.from.includes(currentState.current)
          : transition.from === currentState.current);

      if (!fromMatches) continue;

      // Don't transition to same state
      if (transition.to === currentState.current) continue;

      // Check condition
      if (transition.condition(input, timeSinceTransition)) {
        const success = transitionTo(transition.to, transition);
        if (success) {
          break;
        }
      }
    }
  }, [
    input.isMoving,
    input.isRunning,
    input.isGrounded,
    input.isJumping,
    input.isCrouching,
    input.isDancing,
    input.isStrafeLeft,
    input.isStrafeRight,
    input.isAiming,
    input.isFiring,
    input.isReloading,
    input.weapon,
    input.velocityY,
    sortedTransitions,
    transitionTo,
  ]);

  // Initialize with idle
  useEffect(() => {
    const idle = actions['idle'];
    if (idle && !currentAction.current) {
      idle.play();
      currentAction.current = idle;
    }
  }, [actions]);

  // Cleanup finished listener on unmount
  useEffect(() => {
    return () => {
      if (finishedListenerRef.current && mixerRef.current) {
        mixerRef.current.removeEventListener('finished', finishedListenerRef.current);
      }
    };
  }, []);

  return {
    currentState: currentState.current,
    previousState: previousState.current,
    isTransitioning: isTransitioning.current,
    timeSinceTransition: Date.now() - lastTransitionTime.current,
  };
}

export default useAnimationStateMachine;
