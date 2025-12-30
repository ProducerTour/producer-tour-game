/**
 * useSpineAiming Hook
 * Rotates the spine bone to follow camera pitch for upper body aiming.
 *
 * When a weapon is equipped, the player's upper body should rotate to
 * follow where the camera is looking, creating a natural aiming pose.
 */

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { combatFrameData } from '../../combat/useCombatStore';

export interface SpineAimingOptions {
  /** Reference to the spine bone to rotate */
  spineRef: React.MutableRefObject<THREE.Bone | null>;
  /** Whether a weapon is currently equipped */
  hasWeapon: boolean;
  /** Whether the player is currently aiming */
  isAiming: boolean;
  /** Enable spine tracking */
  enabled?: boolean;
  /** Track mouse always (not just when aiming) */
  trackAlways?: boolean;
  /** Multiplier for pitch amount (0-1.5) */
  pitchMultiplier?: number;
  /** Maximum rotation angle in degrees */
  maxAngle?: number;
  /** Smoothing speed for rotation interpolation */
  smoothing?: number;
}

/**
 * Rotates a spine bone to follow camera pitch.
 *
 * @param options - Configuration for spine aiming behavior
 *
 * @example
 * ```tsx
 * useSpineAiming({
 *   spineRef,
 *   hasWeapon: weapon !== null,
 *   isAiming,
 *   enabled: true,
 *   trackAlways: true,
 * });
 * ```
 */
export function useSpineAiming({
  spineRef,
  hasWeapon,
  isAiming,
  enabled = true,
  trackAlways = true,
  pitchMultiplier = 1.0,
  maxAngle = 45,
  smoothing = 10,
}: SpineAimingOptions): void {
  // Refs for smooth interpolation
  const currentSpinePitch = useRef(0);
  const baseSpineRotationX = useRef(0);

  useFrame((_, delta) => {
    // Read cameraPitch from singleton (avoids per-frame store overhead)
    const cameraPitch = combatFrameData.cameraPitch;

    // Only track spine when weapon equipped and (always tracking OR aiming)
    const shouldTrackSpine = enabled && hasWeapon && (trackAlways || isAiming);

    if (spineRef.current && shouldTrackSpine) {
      // Capture the animation's base rotation BEFORE we modify it
      baseSpineRotationX.current = spineRef.current.rotation.x;

      // Calculate target spine pitch based on camera pitch
      // cameraPitch is negative when looking up, positive when looking down
      const maxAngleRad = (maxAngle * Math.PI) / 180;
      const targetSpinePitch = Math.max(
        -maxAngleRad,
        Math.min(maxAngleRad, cameraPitch * pitchMultiplier)
      );

      // Smooth interpolation for natural movement
      const spineT = 1 - Math.exp(-smoothing * delta);
      currentSpinePitch.current += (targetSpinePitch - currentSpinePitch.current) * spineT;

      // Apply offset FROM BASE rotation (prevents 360 accumulation)
      spineRef.current.rotation.x = baseSpineRotationX.current + currentSpinePitch.current;
    } else if (spineRef.current) {
      // Capture base rotation for return-to-neutral
      baseSpineRotationX.current = spineRef.current.rotation.x;

      // Smoothly return to neutral when no weapon equipped
      const returnT = 1 - Math.exp(-smoothing * delta);
      currentSpinePitch.current *= 1 - returnT;

      // Only apply if there's significant rotation to avoid jitter
      if (Math.abs(currentSpinePitch.current) > 0.001) {
        spineRef.current.rotation.x = baseSpineRotationX.current + currentSpinePitch.current;
      }
    }
  });
}

export default useSpineAiming;
