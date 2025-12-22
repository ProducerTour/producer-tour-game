/**
 * Ground Detection Hook
 *
 * Provides clean ground state by combining raycast detection with slope validation.
 * Separated from physics controller following industry-standard separation of concerns.
 *
 * @see ARCHITECTURE_ANALYSIS.md for design rationale
 */

import { useRef, useCallback } from 'react';
import type { RapierRigidBody } from '@react-three/rapier';

// Ground detection constants
const GROUND_RAY_LENGTH = 2.0;      // How far down to raycast
// Hysteresis thresholds prevent flickering on uneven terrain
const GROUND_THRESHOLD_ENTER = 0.95;  // Must be closer to become grounded
const GROUND_THRESHOLD_EXIT = 1.2;    // Must be farther to become airborne
const MIN_GROUND_NORMAL_Y = 0.7;      // Slope tolerance (~45° max)
const MAX_ASCENDING_VELOCITY = 1.5;   // Max upward velocity to count as grounded
// Stability counter - require multiple consistent frames to change state
const STABILITY_FRAMES = 2;           // Frames of consistent state before changing

/**
 * 3D ground normal vector for slope alignment
 */
export interface GroundNormal {
  x: number;
  y: number;
  z: number;
}

/**
 * Ground state returned by the hook
 */
export interface GroundState {
  /** Whether the character is currently on valid ground */
  isGrounded: boolean;
  /** Ground surface normal Y component (1.0 = flat, 0.0 = vertical) */
  groundNormalY: number;
  /** Full 3D ground normal for slope alignment */
  groundNormal: GroundNormal;
  /** Whether the slope is walkable (within tolerance) */
  isValidSlope: boolean;
  /** Distance to ground from raycast */
  groundDistance: number;
  /** Current vertical velocity */
  verticalVelocity: number;
}

// Use 'any' for Rapier types to avoid complex type gymnastics
// The actual types come from @dimforge/rapier3d-compat
/* eslint-disable @typescript-eslint/no-explicit-any */
interface UseGroundDetectionProps {
  rigidBody: RapierRigidBody | null;
  world: any;  // Rapier World
  rapier: any; // Rapier namespace
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * Hook for detecting ground state via raycast
 *
 * Returns a function that can be called each frame to get current ground state.
 * This design allows the physics controller to call it at the right time in the frame.
 */
export function useGroundDetection({ rigidBody, world, rapier }: UseGroundDetectionProps) {
  // Cache last ground state to avoid recalculation
  const lastState = useRef<GroundState>({
    isGrounded: true,
    groundNormalY: 1.0,
    groundNormal: { x: 0, y: 1, z: 0 },
    isValidSlope: true,
    groundDistance: 0,
    verticalVelocity: 0,
  });

  // Hysteresis state - track previous grounded state and stability counter
  const wasGrounded = useRef(true);
  const stabilityCounter = useRef(0);

  /**
   * Detect ground state for current frame
   * Call this once per frame in useFrame
   */
  const detectGround = useCallback((): GroundState => {
    if (!rigidBody) {
      return lastState.current;
    }

    const linvel = rigidBody.linvel();
    const verticalVelocity = linvel.y;

    // Cast ray downward from player position
    const position = rigidBody.translation();
    const ray = new rapier.Ray(
      { x: position.x, y: position.y, z: position.z },
      { x: 0, y: -1, z: 0 }
    );

    const hit = world.castRayAndGetNormal(
      ray,
      GROUND_RAY_LENGTH,
      true,
      undefined,
      undefined,
      undefined,
      rigidBody
    );

    // Extract ground info from raycast
    const groundDistance = hit?.timeOfImpact ?? Infinity;
    const groundNormal: GroundNormal = hit ? {
      x: hit.normal?.x ?? 0,
      y: hit.normal?.y ?? 1,
      z: hit.normal?.z ?? 0,
    } : { x: 0, y: 1, z: 0 };
    const groundNormalY = groundNormal.y;
    const isValidSlope = groundNormalY > MIN_GROUND_NORMAL_Y;

    // Not grounded if ascending (jumping through ground)
    const isAscending = verticalVelocity > MAX_ASCENDING_VELOCITY;

    // Hysteresis: use different thresholds based on current state
    // This prevents flickering when distance hovers near threshold
    const currentThreshold = wasGrounded.current ? GROUND_THRESHOLD_EXIT : GROUND_THRESHOLD_ENTER;
    const distanceCheck = groundDistance < currentThreshold;

    // Raw ground check (before stability filtering)
    const rawIsGrounded = distanceCheck && isValidSlope && !isAscending;

    // Stability counter: require consistent state for multiple frames
    let isGrounded: boolean;
    if (rawIsGrounded === wasGrounded.current) {
      // State is consistent - use current raw value
      stabilityCounter.current = 0;
      isGrounded = rawIsGrounded;
    } else {
      // State wants to change - require stability
      stabilityCounter.current++;
      if (stabilityCounter.current >= STABILITY_FRAMES) {
        // Changed state consistently - accept the change
        isGrounded = rawIsGrounded;
        stabilityCounter.current = 0;
      } else {
        // Not yet stable - keep previous state
        isGrounded = wasGrounded.current;
      }
    }

    // Update hysteresis state for next frame
    wasGrounded.current = isGrounded;

    lastState.current = {
      isGrounded,
      groundNormalY,
      groundNormal,
      isValidSlope,
      groundDistance,
      verticalVelocity,
    };

    return lastState.current;
  }, [rigidBody, world, rapier]);

  return { detectGround, lastState: lastState.current };
}

export default useGroundDetection;
