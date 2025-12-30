/**
 * Character Movement Hook
 *
 * Handles movement input processing, velocity calculation, and character rotation.
 * Separated from physics controller following industry-standard separation of concerns.
 *
 * @see ARCHITECTURE_ANALYSIS.md for design rationale
 */

import { useRef, useCallback, useMemo } from 'react';
import * as THREE from 'three';

/**
 * Movement configuration
 */
const CONFIG = {
  // Speed settings
  WALK_SPEED: 2.5,
  SPRINT_SPEED: 5,
  CROUCH_SPEED: 1.5,
  AIM_SPEED_MULTIPLIER: 0.5,

  // Acceleration settings - tuned for tight, responsive control
  ACCELERATION: 40,       // m/s² - how fast we reach target speed (increased)
  DECELERATION: 50,       // m/s² - how fast we stop (increased)
  TURN_ACCELERATION: 80,  // m/s² - extra fast when changing direction (increased)
  AIR_CONTROL: 0.5,       // Reduced control while airborne (increased from 0.3)
  TURN_THRESHOLD: 0.7,    // Dot product threshold for turn detection (~45°, was 0.5/~60°)

  // Rotation
  ROTATION_SPEED: 25,     // Character rotation speed (higher = faster turn)
  ROTATION_SNAP_THRESHOLD: 0.05, // Snap to target when diff is below this (radians, ~3°)

  // Velocity limits
  MAX_VELOCITY: 15,
  MAX_FALL_SPEED: 20,
};

/**
 * Movement input from keyboard/controller
 */
export interface MovementInput {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  sprint: boolean;
  crouch: boolean;
}

/**
 * Movement state output
 */
export interface MovementState {
  /** Target velocity X component */
  velocityX: number;
  /** Target velocity Z component */
  velocityZ: number;
  /** Current smoothed velocity X */
  currentVelocityX: number;
  /** Current smoothed velocity Z */
  currentVelocityZ: number;
  /** Character facing angle (radians) */
  facingAngle: number;
  /** Whether character is moving */
  isMoving: boolean;
  /** Whether character is running */
  isRunning: boolean;
  /** Whether character wants to crouch */
  isCrouching: boolean;
  /** Movement speed magnitude */
  speed: number;
}

interface UseCharacterMovementProps {
  /** Movement input */
  input: MovementInput;
  /** Camera direction (for relative movement) */
  cameraDirection: THREE.Vector3;
  /** Whether character is grounded */
  isGrounded: boolean;
  /** Whether character is aiming */
  isAiming: boolean;
  /** Whether character is firing */
  isFiring: boolean;
  /** Speed multiplier (e.g., from dev tools) */
  speedMultiplier?: number;
  /** Frame delta time */
  delta: number;
}

/**
 * Hook for character movement calculation
 */
export function useCharacterMovement() {
  // Smooth velocity tracking
  const currentSpeed = useRef({ x: 0, z: 0 });
  const facingAngle = useRef(Math.PI); // Start facing away from camera

  // Reusable vectors
  const vectors = useMemo(
    () => ({
      cameraDir: new THREE.Vector3(),
      cameraRight: new THREE.Vector3(),
      moveDir: new THREE.Vector3(),
      up: new THREE.Vector3(0, 1, 0),
    }),
    []
  );

  /**
   * Calculate movement for current frame
   */
  const calculate = useCallback(
    ({
      input,
      cameraDirection,
      isGrounded,
      isAiming,
      isFiring,
      speedMultiplier = 1,
      delta,
    }: UseCharacterMovementProps): MovementState => {
      const { cameraDir, cameraRight, moveDir, up } = vectors;

      // Process input
      let ix = 0,
        iz = 0;
      if (input.forward) iz = -1;
      if (input.backward) iz = 1;
      if (input.left) ix = -1;
      if (input.right) ix = 1;

      const hasInput = ix !== 0 || iz !== 0;
      const isCrouching = input.crouch && isGrounded;

      // Calculate target velocity
      let targetVx = 0,
        targetVz = 0;

      if (hasInput || isAiming) {
        // Normalize diagonal input
        if (hasInput) {
          const len = Math.sqrt(ix * ix + iz * iz);
          ix /= len;
          iz /= len;
        }

        // Get camera-relative directions
        cameraDir.copy(cameraDirection);
        cameraDir.y = 0;
        cameraDir.normalize();
        cameraRight.crossVectors(cameraDir, up).normalize();

        if (hasInput) {
          // Calculate movement direction
          moveDir.set(0, 0, 0);
          moveDir.addScaledVector(cameraDir, -iz);
          moveDir.addScaledVector(cameraRight, ix);
          moveDir.normalize();

          // Determine target speed
          let targetSpeed = CONFIG.WALK_SPEED;
          if (isCrouching) {
            targetSpeed = CONFIG.CROUCH_SPEED;
          } else if (input.sprint && !isAiming && !isFiring) {
            targetSpeed = CONFIG.SPRINT_SPEED;
          }

          // Apply aim slowdown
          if (isAiming) {
            targetSpeed *= CONFIG.AIM_SPEED_MULTIPLIER;
          }

          // Apply speed multiplier
          targetSpeed *= speedMultiplier;

          targetVx = moveDir.x * targetSpeed;
          targetVz = moveDir.z * targetSpeed;
        }

        // Character rotation
        if (isAiming) {
          // Face camera direction when aiming
          facingAngle.current = Math.atan2(cameraDir.x, cameraDir.z);
        } else if (hasInput) {
          // Face movement direction
          const targetAngle = Math.atan2(moveDir.x, moveDir.z);
          let diff = targetAngle - facingAngle.current;
          // Normalize to [-PI, PI]
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;

          // Snap to target when close enough to prevent perpetual small offset
          if (Math.abs(diff) < CONFIG.ROTATION_SNAP_THRESHOLD) {
            facingAngle.current = targetAngle;
          } else {
            // Frame-rate independent exponential decay (deterministic for multiplayer)
            const rotationT = 1 - Math.exp(-CONFIG.ROTATION_SPEED * delta);
            facingAngle.current += diff * rotationT;
          }
        }
      }

      // Apply acceleration/deceleration
      if (!hasInput && isGrounded) {
        // Instant stop when grounded with no input
        currentSpeed.current.x = 0;
        currentSpeed.current.z = 0;
      } else {
        // Detect turning
        const currentMag = Math.sqrt(
          currentSpeed.current.x ** 2 + currentSpeed.current.z ** 2
        );
        const targetMag = Math.sqrt(targetVx ** 2 + targetVz ** 2);
        let isTurning = false;

        if (currentMag > 0.5 && targetMag > 0.5) {
          const dot =
            (currentSpeed.current.x * targetVx + currentSpeed.current.z * targetVz) /
            (currentMag * targetMag);
          isTurning = dot < CONFIG.TURN_THRESHOLD; // Turning more than ~45°
        }

        // Select acceleration rate
        let accelRate = hasInput ? CONFIG.ACCELERATION : CONFIG.DECELERATION;
        if (isTurning && isGrounded) {
          accelRate = CONFIG.TURN_ACCELERATION;
        }

        const controlMult = isGrounded ? 1 : CONFIG.AIR_CONTROL;
        const effectiveAccel = accelRate * controlMult;
        const maxChange = effectiveAccel * delta;

        // Apply acceleration
        const diffX = targetVx - currentSpeed.current.x;
        const diffZ = targetVz - currentSpeed.current.z;

        if (Math.abs(diffX) < maxChange) {
          currentSpeed.current.x = targetVx;
        } else {
          currentSpeed.current.x += Math.sign(diffX) * maxChange;
        }

        if (Math.abs(diffZ) < maxChange) {
          currentSpeed.current.z = targetVz;
        } else {
          currentSpeed.current.z += Math.sign(diffZ) * maxChange;
        }
      }

      // Clamp velocity
      const currentMag = Math.sqrt(
        currentSpeed.current.x ** 2 + currentSpeed.current.z ** 2
      );
      if (currentMag > CONFIG.MAX_VELOCITY) {
        const scale = CONFIG.MAX_VELOCITY / currentMag;
        currentSpeed.current.x *= scale;
        currentSpeed.current.z *= scale;
      }

      return {
        velocityX: targetVx,
        velocityZ: targetVz,
        currentVelocityX: currentSpeed.current.x,
        currentVelocityZ: currentSpeed.current.z,
        facingAngle: facingAngle.current,
        isMoving: hasInput,
        isRunning: hasInput && input.sprint && !isAiming && !isFiring,
        isCrouching,
        speed: currentMag,
      };
    },
    [vectors]
  );

  /**
   * Reset movement state (e.g., after respawn)
   */
  const reset = useCallback(() => {
    currentSpeed.current.x = 0;
    currentSpeed.current.z = 0;
    facingAngle.current = Math.PI;
  }, []);

  /**
   * Get current facing angle (for external use)
   */
  const getFacingAngle = useCallback(() => facingAngle.current, []);

  /**
   * Set facing angle (for external use)
   */
  const setFacingAngle = useCallback((angle: number) => {
    facingAngle.current = angle;
  }, []);

  return { calculate, reset, getFacingAngle, setFacingAngle, CONFIG };
}

export default useCharacterMovement;
