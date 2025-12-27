/**
 * Air State Machine Hook
 *
 * Single authoritative state machine for jump/fall/land animations.
 * Replaces scattered timing variables with explicit state transitions.
 *
 * State Flow:
 * ┌──────────┐  jump   ┌──────────┐
 * │ GROUNDED │────────▶│ JUMPING  │
 * └──────────┘         └──────────┘
 *      ▲                    │
 *      │                    │ land OR long fall
 *      │               ┌────┴────┐
 *      │               ▼         ▼
 * ┌──────────┐    ┌──────────┐
 * │ LANDING  │◀───│ FALLING  │
 * └──────────┘    └──────────┘
 *      │               ▲
 *      │ 100ms         │ walk off edge
 *      ▼               │
 * ┌──────────┐         │
 * │ GROUNDED │─────────┘
 * └──────────┘
 *
 * @see ARCHITECTURE_ANALYSIS.md for design rationale
 */

import { useRef, useCallback } from 'react';
import type { GroundState } from './useGroundDetection';

/**
 * Extended ground state with Y position for fall distance tracking
 */
export interface GroundStateWithPosition extends GroundState {
  /** Current Y position of the player */
  positionY: number;
}

/**
 * Air state enum - single source of truth for animation
 */
export enum AirState {
  GROUNDED = 'grounded',
  JUMPING = 'jumping',
  FALLING = 'falling',
  LANDING = 'landing',
}

/**
 * Configuration for state transitions
 * All timing in one place - no scattered magic numbers
 *
 * AAA Design Notes:
 * - Jump only allowed in GROUNDED state (not LANDING, JUMPING, FALLING)
 * - Require significant airborne time before hasJumped can reset
 * - This prevents multi-jump exploits from ground detection flicker
 */
const CONFIG = {
  /** Time airborne before triggering fall animation when walking off edge */
  FALL_DELAY: 0.15,
  /** Velocity threshold for walking-off-edge fall detection */
  FALL_VELOCITY: -3,
  /** Minimum distance fallen before triggering fall animation (meters) */
  FALL_DISTANCE_THRESHOLD: 1.5,
  /** Time in jump before allowing transition to fall (long descent) */
  LONG_JUMP_TIME: 0.6,
  /** Velocity threshold for long jump → fall transition */
  LONG_FALL_VELOCITY: -8,
  /** Minimum distance fallen during jump before triggering fall animation */
  LONG_FALL_DISTANCE: 3.0,
  /** Duration of landing state before returning to grounded */
  LANDING_DURATION: 0.08,  // Slightly longer for proper animation
  /** Max velocity magnitude to be considered "stable" for landing */
  STABLE_VELOCITY: 12.0,
  /** Grace period for jump input (coyote time) */
  COYOTE_TIME: 0.12,       // Standard coyote time
  /** Cooldown between jumps - prevents accidental double-jumps */
  JUMP_COOLDOWN: 0.15,     // Increased to prevent spam
  /** Time grounded before clearing jump flag - CRITICAL for preventing multi-jump */
  STABLE_LAND_TIME: 0.15,  // Increased significantly - must be truly grounded
  /** Jump buffer window - press jump before landing, execute on touchdown */
  JUMP_BUFFER_TIME: 0.15,
  /** Force landing after being grounded for this long, regardless of velocity */
  FORCE_LAND_TIME: 0.1,
  /** Minimum time that must pass in air before hasJumped can reset */
  MIN_AIRBORNE_FOR_RESET: 0.08,  // Must be airborne for 80ms before jump can reset (short hops still count)
};

/**
 * Air state result from the hook
 */
export interface AirStateResult {
  /** Current air state */
  state: AirState;
  /** Time spent in current state */
  stateTime: number;
  /** Time spent airborne (cumulative) */
  airborneTime: number;
  /** Time spent grounded (cumulative) */
  groundedTime: number;
  /** Distance fallen from last grounded position (meters) - resets when grounded */
  fallDistance: number;
  /** Fall distance preserved on landing (for damage calculation) - stays until fully grounded */
  landingFallDistance: number;
  /** Whether player can jump (grounded or coyote time) */
  canJump: boolean;
  /** Whether player has jumped and hasn't landed yet */
  hasJumped: boolean;
  /** Whether a buffered jump should be executed this frame */
  shouldExecuteBufferedJump: boolean;
  /** Derived flags for animation */
  isJumping: boolean;
  isFalling: boolean;
  isLanding: boolean;
  isGrounded: boolean;
}

interface UseAirStateProps {
  /** Current ground detection state */
  groundState: GroundState;
  /** Current Y position of the player (for fall distance tracking) */
  positionY: number;
  /** Whether jump was requested this frame */
  jumpRequested: boolean;
  /** Frame delta time */
  delta: number;
}

/**
 * Hook for managing air state machine
 *
 * Provides clean state transitions for jump/fall/land animations.
 * Call update() each frame with current ground state and jump input.
 */
export function useAirState() {
  // State machine state
  const currentState = useRef<AirState>(AirState.GROUNDED);
  const stateTime = useRef(0);

  // Timing accumulators
  const airborneTime = useRef(0);
  const groundedTime = useRef(0);
  const groundedStableTime = useRef(0);

  // Jump state
  const hasJumped = useRef(false);
  const jumpCooldown = useRef(0);
  const wasGrounded = useRef(true);

  // Track cumulative airborne time since last jump - used to prevent multi-jump exploits
  const airborneTimeSinceJump = useRef(0);

  // Jump buffer - stores time since jump was buffered (0 = no buffer)
  const jumpBufferTime = useRef(0);

  // Fall distance tracking - measures from PEAK of jump, not ground level
  const lastGroundedY = useRef(0);    // Y position when player was last grounded
  const peakAirborneY = useRef(0);    // Highest Y reached while airborne (for fall distance)
  const fallDistance = useRef(0);      // Current fall distance (from peak)
  const landingFallDistance = useRef(0); // Preserved fall distance when landing (for damage calc)

  /**
   * Update state machine for current frame
   */
  const update = useCallback(
    ({ groundState, positionY, jumpRequested, delta }: UseAirStateProps): AirStateResult => {
      const { isGrounded, verticalVelocity } = groundState;
      const vy = verticalVelocity;

      // Update timing accumulators and fall distance
      if (isGrounded) {
        // Preserve fall distance on the FIRST frame of landing (before resetting)
        // This allows fall damage to be calculated correctly
        if (fallDistance.current > 0 && groundedStableTime.current < 0.05) {
          landingFallDistance.current = fallDistance.current;
        } else if (groundedStableTime.current > 0.2) {
          // Clear landing fall distance after we've been grounded for a bit
          landingFallDistance.current = 0;
        }

        groundedTime.current = 0;
        airborneTime.current = 0;
        groundedStableTime.current += delta;
        wasGrounded.current = true;

        // Track grounded Y position and reset fall tracking
        lastGroundedY.current = positionY;
        peakAirborneY.current = positionY;  // Reset peak to ground level
        fallDistance.current = 0;

        // Reset jump flag when TRULY stably grounded
        // AAA FIX: Multiple conditions must be met to prevent multi-jump exploits:
        // 1. Must be in GROUNDED or LANDING state (not just raycast grounded)
        // 2. Must be grounded for STABLE_LAND_TIME
        // 3. Must have been airborne for MIN_AIRBORNE_FOR_RESET since last jump
        const isStableState = currentState.current === AirState.GROUNDED ||
                               currentState.current === AirState.LANDING;
        const isStableTime = groundedStableTime.current > CONFIG.STABLE_LAND_TIME;
        const wasAirborneEnough = airborneTimeSinceJump.current > CONFIG.MIN_AIRBORNE_FOR_RESET;

        if (hasJumped.current && isStableState && isStableTime && wasAirborneEnough) {
          hasJumped.current = false;
          airborneTimeSinceJump.current = 0;  // Reset for next jump
        }
      } else {
        groundedTime.current += delta;
        airborneTime.current += delta;

        // Track airborne time since last jump (for preventing multi-jump)
        if (hasJumped.current) {
          airborneTimeSinceJump.current += delta;
        }

        // Decay stable time with hysteresis
        groundedStableTime.current = Math.max(0, groundedStableTime.current - delta * 10);

        // Track peak Y position while airborne (highest point reached)
        if (positionY > peakAirborneY.current) {
          peakAirborneY.current = positionY;
        }

        // Calculate fall distance from PEAK, not from ground
        // This prevents normal jumps from triggering fall animation
        const currentFallDistance = peakAirborneY.current - positionY;
        if (currentFallDistance > 0) {
          fallDistance.current = currentFallDistance;
        }
      }

      // Update jump cooldown
      if (jumpCooldown.current > 0) {
        jumpCooldown.current -= delta;
      }

      // Update jump buffer timer (decay)
      if (jumpBufferTime.current > 0) {
        jumpBufferTime.current -= delta;
      }

      // Buffer jump input when airborne (FALLING or JUMPING)
      // This allows pressing jump slightly before landing
      const isAirborne = currentState.current === AirState.FALLING ||
                         currentState.current === AirState.JUMPING;
      if (jumpRequested && isAirborne && !hasJumped.current) {
        jumpBufferTime.current = CONFIG.JUMP_BUFFER_TIME;
      }

      // Check if can jump - AAA FIX: Much stricter conditions
      // 1. Must NOT have already jumped (hasJumped prevents multi-jump)
      // 2. Must be off cooldown
      // 3. Must be in GROUNDED state OR within coyote time of leaving GROUNDED
      // NOTE: We check state machine state, not just raw isGrounded from raycast
      const isInGroundedState = currentState.current === AirState.GROUNDED;
      const inCoyoteTime = wasGrounded.current &&
                           groundedTime.current < CONFIG.COYOTE_TIME &&
                           currentState.current !== AirState.JUMPING;  // No coyote after jump

      const canJump =
        !hasJumped.current &&
        jumpCooldown.current <= 0 &&
        (isInGroundedState || inCoyoteTime);

      // Check for buffered jump on landing - AAA FIX: require GROUNDED or LANDING state
      const inLandingState = currentState.current === AirState.LANDING ||
                              currentState.current === AirState.GROUNDED;
      const hasBufferedJump = jumpBufferTime.current > 0 && inLandingState && !hasJumped.current;
      let shouldExecuteBufferedJump = false;

      // Handle jump request (direct or buffered)
      let jumped = false;
      if ((jumpRequested && canJump) || hasBufferedJump) {
        jumped = true;
        hasJumped.current = true;
        jumpCooldown.current = CONFIG.JUMP_COOLDOWN;
        wasGrounded.current = false;
        groundedTime.current = CONFIG.COYOTE_TIME + 0.1;

        // Clear buffer and signal if this was a buffered jump
        if (hasBufferedJump && !jumpRequested) {
          shouldExecuteBufferedJump = true;
        }
        jumpBufferTime.current = 0;
      }

      // State machine transitions
      const isLowVelocity = Math.abs(vy) < CONFIG.STABLE_VELOCITY;
      const isDescending = vy < -1.0; // Must be clearly descending, not at apex (vy ≈ 0)
      const prevState = currentState.current;

      switch (currentState.current) {
        case AirState.GROUNDED:
          // Only transition to JUMPING if a NEW jump was executed this frame
          // hasJumped being true alone shouldn't cause a jump!
          if (jumped) {
            currentState.current = AirState.JUMPING;
            stateTime.current = 0;
          } else if (
            !isGrounded &&
            vy < CONFIG.FALL_VELOCITY &&
            airborneTime.current > CONFIG.FALL_DELAY &&
            fallDistance.current > CONFIG.FALL_DISTANCE_THRESHOLD &&
            stateTime.current > 0.1  // Must have been grounded for 100ms to prevent jitter
          ) {
            // Walked off edge - only trigger after falling enough distance
            // AND being stably grounded first (prevents false triggers after landing)
            currentState.current = AirState.FALLING;
            stateTime.current = 0;
          }
          break;

        case AirState.JUMPING:
          // CRITICAL FIX: Don't transition to LANDING at jump apex!
          // Ground detection can report "grounded" at apex due to hysteresis (threshold ~1.2m, apex ~1.225m)
          // We must require BOTH low velocity AND actually descending (not at apex where vy ≈ 0)
          if (isGrounded && isLowVelocity && isDescending) {
            // Normal landing - velocity is low AND we're descending
            currentState.current = AirState.LANDING;
            stateTime.current = 0;
            // NOTE: Do NOT reset hasJumped here! Let the proper reset logic handle it
            // after player has been grounded for STABLE_LAND_TIME and was airborne for MIN_AIRBORNE_FOR_RESET
          } else if (isGrounded && groundedStableTime.current > CONFIG.FORCE_LAND_TIME) {
            // Force landing - grounded for long enough, velocity doesn't matter
            // This prevents getting stuck in jump state on slopes where velocity spikes
            currentState.current = AirState.LANDING;
            stateTime.current = 0;
            // NOTE: Do NOT reset hasJumped here! Let the proper reset logic handle it
          } else if (
            !isGrounded &&
            vy < CONFIG.LONG_FALL_VELOCITY &&
            airborneTime.current > CONFIG.LONG_JUMP_TIME &&
            fallDistance.current > CONFIG.LONG_FALL_DISTANCE  // Must fall significant distance
          ) {
            // Long fall (jumped off tall building) - only after falling far enough
            currentState.current = AirState.FALLING;
            stateTime.current = 0;
          }
          break;

        case AirState.FALLING:
          if (isGrounded && isLowVelocity) {
            // Normal landing from fall - velocity is low enough
            currentState.current = AirState.LANDING;
            stateTime.current = 0;
          } else if (isGrounded && groundedStableTime.current > CONFIG.FORCE_LAND_TIME) {
            // Force landing - grounded for long enough, velocity doesn't matter
            currentState.current = AirState.LANDING;
            stateTime.current = 0;
          }
          break;

        case AirState.LANDING:
          stateTime.current += delta;
          // Only allow bunny hop if a NEW jump was executed this frame
          // hasJumped being true alone doesn't mean we should jump again!
          if (jumped) {
            // Bunny hop - a new jump was requested and executed during landing
            currentState.current = AirState.JUMPING;
            stateTime.current = 0;
          } else if (stateTime.current > CONFIG.LANDING_DURATION) {
            // Landing complete
            currentState.current = isGrounded ? AirState.GROUNDED : AirState.FALLING;
            stateTime.current = 0;
          }
          break;
      }

      // Update state time if we didn't transition
      if (currentState.current === prevState && currentState.current !== AirState.LANDING) {
        stateTime.current += delta;
      }

      // Return state result
      return {
        state: currentState.current,
        stateTime: stateTime.current,
        airborneTime: airborneTime.current,
        groundedTime: groundedTime.current,
        fallDistance: fallDistance.current,
        landingFallDistance: landingFallDistance.current,
        canJump,
        hasJumped: hasJumped.current,
        shouldExecuteBufferedJump,
        // Derived boolean flags for animation input
        isJumping: currentState.current === AirState.JUMPING,
        isFalling: currentState.current === AirState.FALLING,
        isLanding: currentState.current === AirState.LANDING,
        isGrounded:
          currentState.current === AirState.GROUNDED ||
          currentState.current === AirState.LANDING,
      };
    },
    []
  );

  /**
   * Notify that a jump was executed (for external jump logic)
   */
  const notifyJump = useCallback(() => {
    hasJumped.current = true;
    jumpCooldown.current = CONFIG.JUMP_COOLDOWN;
    wasGrounded.current = false;
    groundedTime.current = CONFIG.COYOTE_TIME + 0.1;
  }, []);

  /**
   * Reset state machine (e.g., after respawn)
   */
  const reset = useCallback(() => {
    currentState.current = AirState.GROUNDED;
    stateTime.current = 0;
    airborneTime.current = 0;
    groundedTime.current = 0;
    groundedStableTime.current = 0;
    hasJumped.current = false;
    jumpCooldown.current = 0;
    jumpBufferTime.current = 0;
    airborneTimeSinceJump.current = 0;
    wasGrounded.current = true;
    lastGroundedY.current = 0;
    peakAirborneY.current = 0;
    fallDistance.current = 0;
    landingFallDistance.current = 0;
  }, []);

  return { update, notifyJump, reset, CONFIG };
}

export default useAirState;
