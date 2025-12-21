/**
 * Slope Alignment Hook
 *
 * Calculates avatar body tilt to align with terrain slope.
 * Provides smooth interpolation to prevent jarring rotations.
 *
 * The avatar leans into slopes naturally, similar to how a real person
 * would adjust their posture when walking on uneven terrain.
 *
 * @see ARCHITECTURE_ANALYSIS.md for design rationale
 */

import { useRef, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import type { GroundNormal } from './useGroundDetection';

/**
 * Configuration for slope alignment
 */
const CONFIG = {
  /** Maximum tilt angle in radians (~15 degrees) */
  MAX_TILT_ANGLE: 0.26,
  /** How fast to interpolate to target tilt (higher = faster) */
  TILT_LERP_SPEED: 8,
  /** Minimum slope angle to start tilting (prevents jitter on flat ground) */
  MIN_SLOPE_THRESHOLD: 0.05,
  /** How much to reduce tilt when airborne (0 = full tilt, 1 = no tilt) */
  AIRBORNE_TILT_REDUCTION: 0.9,
  /** How fast to return to upright when airborne */
  AIRBORNE_LERP_SPEED: 12,
};

/**
 * Slope alignment result
 */
export interface SlopeAlignmentResult {
  /** Rotation around X axis (pitch - forward/backward tilt) */
  tiltX: number;
  /** Rotation around Z axis (roll - left/right tilt) */
  tiltZ: number;
  /** Euler rotation object for direct application */
  euler: THREE.Euler;
  /** Whether currently tilting (for debugging) */
  isTilting: boolean;
}

interface UseSlopeAlignmentProps {
  /** Ground normal from raycast */
  groundNormal: GroundNormal;
  /** Whether player is grounded */
  isGrounded: boolean;
  /** Player's current facing angle (radians) */
  facingAngle: number;
  /** Frame delta time */
  delta: number;
}

/**
 * Hook for calculating slope-aligned avatar tilt
 *
 * Returns smooth rotation values to apply to the avatar group.
 * The tilt is calculated relative to the player's facing direction,
 * so forward slopes cause forward lean, side slopes cause side lean.
 */
export function useSlopeAlignment() {
  // Current smoothed tilt values
  const currentTiltX = useRef(0);
  const currentTiltZ = useRef(0);

  // Reusable THREE objects to avoid garbage collection
  const vectors = useMemo(
    () => ({
      up: new THREE.Vector3(0, 1, 0),
      groundNormal: new THREE.Vector3(),
      slopeDirection: new THREE.Vector3(),
      facingDir: new THREE.Vector3(),
      rightDir: new THREE.Vector3(),
      euler: new THREE.Euler(0, 0, 0, 'YXZ'),
    }),
    []
  );

  /**
   * Calculate slope alignment for current frame
   */
  const calculate = useCallback(
    ({
      groundNormal,
      isGrounded,
      facingAngle,
      delta,
    }: UseSlopeAlignmentProps): SlopeAlignmentResult => {
      const { up, slopeDirection, facingDir, rightDir, euler } = vectors;

      // Set ground normal vector
      vectors.groundNormal.set(groundNormal.x, groundNormal.y, groundNormal.z);

      // Calculate slope direction (horizontal component of ground normal)
      // This tells us which way the slope is facing
      slopeDirection.set(groundNormal.x, 0, groundNormal.z);
      const slopeMagnitude = slopeDirection.length();

      // Target tilt values
      let targetTiltX = 0;
      let targetTiltZ = 0;

      // Only tilt if on ground and slope is significant
      if (isGrounded && slopeMagnitude > CONFIG.MIN_SLOPE_THRESHOLD) {
        // Normalize slope direction
        slopeDirection.normalize();

        // Get player's facing direction (forward vector)
        facingDir.set(Math.sin(facingAngle), 0, Math.cos(facingAngle));

        // Get player's right direction
        rightDir.crossVectors(up, facingDir).normalize();

        // Project slope onto facing direction (forward/backward tilt)
        // Negative because leaning INTO the slope
        const forwardSlope = slopeDirection.dot(facingDir);
        targetTiltX = -forwardSlope * slopeMagnitude * CONFIG.MAX_TILT_ANGLE;

        // Project slope onto right direction (left/right tilt)
        const sideSlope = slopeDirection.dot(rightDir);
        targetTiltZ = sideSlope * slopeMagnitude * CONFIG.MAX_TILT_ANGLE;

        // Clamp to max tilt
        targetTiltX = THREE.MathUtils.clamp(
          targetTiltX,
          -CONFIG.MAX_TILT_ANGLE,
          CONFIG.MAX_TILT_ANGLE
        );
        targetTiltZ = THREE.MathUtils.clamp(
          targetTiltZ,
          -CONFIG.MAX_TILT_ANGLE,
          CONFIG.MAX_TILT_ANGLE
        );
      }

      // Reduce tilt when airborne (gradually return to upright)
      if (!isGrounded) {
        targetTiltX *= 1 - CONFIG.AIRBORNE_TILT_REDUCTION;
        targetTiltZ *= 1 - CONFIG.AIRBORNE_TILT_REDUCTION;
      }

      // Smooth interpolation
      const lerpSpeed = isGrounded ? CONFIG.TILT_LERP_SPEED : CONFIG.AIRBORNE_LERP_SPEED;
      const lerpFactor = 1 - Math.exp(-lerpSpeed * delta);

      currentTiltX.current = THREE.MathUtils.lerp(
        currentTiltX.current,
        targetTiltX,
        lerpFactor
      );
      currentTiltZ.current = THREE.MathUtils.lerp(
        currentTiltZ.current,
        targetTiltZ,
        lerpFactor
      );

      // Update euler (Y rotation handled separately by facing angle)
      euler.set(currentTiltX.current, 0, currentTiltZ.current, 'YXZ');

      // Determine if we're actively tilting
      const isTilting =
        Math.abs(currentTiltX.current) > 0.01 ||
        Math.abs(currentTiltZ.current) > 0.01;

      return {
        tiltX: currentTiltX.current,
        tiltZ: currentTiltZ.current,
        euler,
        isTilting,
      };
    },
    [vectors]
  );

  /**
   * Reset tilt to upright (e.g., after respawn)
   */
  const reset = useCallback(() => {
    currentTiltX.current = 0;
    currentTiltZ.current = 0;
  }, []);

  return { calculate, reset, CONFIG };
}

export default useSlopeAlignment;
