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
  | 'crouchPistolIdle'
  | 'crouchPistolWalk';

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
  'crouchRifleIdle', 'crouchRifleWalk', 'crouchPistolIdle', 'crouchPistolWalk',
];
const DANCE_STATES: AnimState[] = ['dance1', 'dance2', 'dance3'];
const WEAPON_STANDING_STATES: AnimState[] = [
  'rifleIdle', 'rifleWalk', 'rifleRun',
  'pistolIdle', 'pistolWalk', 'pistolRun',
];
const TRANSITION_STATES: AnimState[] = ['standToCrouch', 'crouchToStand', 'crouchToSprint', 'land'];

// Define all state transitions with priorities
const TRANSITIONS: Transition[] = [
  // ===== HIGHEST PRIORITY: Air states =====
  {
    from: '*',
    to: 'jump',
    condition: (i) => i.isJumping && !i.isGrounded,
    priority: 100,
    cooldown: 200,
  },
  {
    from: '*',
    to: 'fall',
    condition: (i) => !i.isGrounded && (i.velocityY ?? 0) < -2 && !i.isJumping,
    priority: 95,
  },
  {
    from: ['jump', 'fall'],
    to: 'land',
    condition: (i, time) => i.isGrounded && time > 100,
    priority: 90,
  },
  {
    from: 'land',
    to: 'idle',
    condition: (i, time) => time > 300 && !i.isMoving && !i.isCrouching,
    priority: 85,
  },
  {
    from: 'land',
    to: 'walk',
    condition: (i, time) => time > 200 && i.isMoving && !i.isRunning && !i.isCrouching,
    priority: 85,
  },
  {
    from: 'land',
    to: 'run',
    condition: (i, time) => time > 150 && i.isMoving && i.isRunning && !i.isCrouching,
    priority: 85,
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
  // Rifle crouching
  {
    from: ['crouchIdle', 'crouchWalk', 'standToCrouch'],
    to: 'crouchRifleIdle',
    condition: (i) => i.isCrouching && i.weapon === 'rifle' && !i.isMoving,
    priority: 65,
  },
  {
    from: ['crouchIdle', 'crouchWalk', 'crouchRifleIdle', 'standToCrouch'],
    to: 'crouchRifleWalk',
    condition: (i) => i.isCrouching && i.weapon === 'rifle' && i.isMoving,
    priority: 65,
  },
  // Pistol crouching
  {
    from: ['crouchIdle', 'crouchWalk', 'standToCrouch'],
    to: 'crouchPistolIdle',
    condition: (i) => i.isCrouching && i.weapon === 'pistol' && !i.isMoving,
    priority: 65,
  },
  {
    from: ['crouchIdle', 'crouchWalk', 'crouchPistolIdle', 'standToCrouch'],
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
    from: ['crouchRifleWalk', 'crouchPistolWalk'],
    to: 'crouchWalk',
    condition: (i) => i.isCrouching && i.weapon === 'none' && i.isMoving,
    priority: 64,
  },

  // ===== CROUCH MOVEMENT (no weapon) =====
  {
    from: ['crouchIdle', 'standToCrouch'],
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
  // Rifle
  {
    from: ['idle', 'walk', 'run', 'pistolIdle', 'pistolWalk', 'pistolRun'],
    to: 'rifleIdle',
    condition: (i) => !i.isCrouching && i.weapon === 'rifle' && !i.isMoving,
    priority: 50,
  },
  {
    from: ['idle', 'walk', 'run', 'rifleIdle', 'pistolWalk'],
    to: 'rifleWalk',
    condition: (i) => !i.isCrouching && i.weapon === 'rifle' && i.isMoving && !i.isRunning,
    priority: 50,
  },
  {
    from: ['idle', 'walk', 'run', 'rifleIdle', 'rifleWalk', 'pistolRun'],
    to: 'rifleRun',
    condition: (i) => !i.isCrouching && i.weapon === 'rifle' && i.isMoving && i.isRunning,
    priority: 50,
  },
  // Pistol
  {
    from: ['idle', 'walk', 'run', 'rifleIdle', 'rifleWalk', 'rifleRun'],
    to: 'pistolIdle',
    condition: (i) => !i.isCrouching && i.weapon === 'pistol' && !i.isMoving,
    priority: 50,
  },
  {
    from: ['idle', 'walk', 'run', 'pistolIdle', 'rifleWalk'],
    to: 'pistolWalk',
    condition: (i) => !i.isCrouching && i.weapon === 'pistol' && i.isMoving && !i.isRunning,
    priority: 50,
  },
  {
    from: ['idle', 'walk', 'run', 'pistolIdle', 'pistolWalk', 'rifleRun'],
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
  crouchPistolIdle: 'crouchPistolIdle',
  crouchPistolWalk: 'crouchPistolWalk',
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
  crouchPistolIdle: ['crouchIdle', 'pistolIdle'],
  crouchPistolWalk: ['crouchWalk', 'pistolWalk'],
  rifleIdle: ['idle'],
  rifleWalk: ['walk'],
  rifleRun: ['run'],
  pistolIdle: ['idle'],
  pistolWalk: ['walk'],
  pistolRun: ['run'],
};

export interface AnimationStateMachineResult {
  currentState: AnimState;
  previousState: AnimState | null;
  isTransitioning: boolean;
  timeSinceTransition: number;
}

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
        if (success) break;
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

  return {
    currentState: currentState.current,
    previousState: previousState.current,
    isTransitioning: isTransitioning.current,
    timeSinceTransition: Date.now() - lastTransitionTime.current,
  };
}

export default useAnimationStateMachine;
