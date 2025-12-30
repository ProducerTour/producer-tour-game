/**
 * useCrouchOffset Hook
 * Calculates Y offset for crouch states based on animation.
 *
 * Different crouch animations may have different vertical offsets that need
 * to be compensated for to keep the avatar grounded properly.
 */

import { useMemo } from 'react';

export interface CrouchOffsetOptions {
  /** Whether the avatar is crouching */
  isCrouching: boolean;
  /** Current animation state name */
  currentAnimState: string;
  /** Base crouch offset (default: -0.3) */
  baseCrouchOffset?: number;
  /** Animation-specific offsets (maps animation names to Y offsets) */
  animationOffsets?: Record<string, number>;
}

export interface CrouchOffsetResult {
  /** Y offset to apply to avatar position */
  yOffset: number;
  /** Whether crouch offset is currently active */
  isActive: boolean;
}

// Default animation-specific crouch offsets
const DEFAULT_CROUCH_OFFSETS: Record<string, number> = {
  crouchWalk: -0.3,
  crouchStrafeLeft: -0.3,
  crouchStrafeRight: -0.3,
  crouchRifleIdle: -0.3,
  crouchRifleWalk: -0.3,
  crouchPistolIdle: -0.3,
  crouchPistolWalk: -0.3,
};

/**
 * Calculates Y offset needed for crouch animations.
 *
 * @param options - Configuration for crouch offset calculation
 * @returns Object with yOffset value and isActive flag
 *
 * @example
 * ```tsx
 * const { yOffset, isActive } = useCrouchOffset({
 *   isCrouching,
 *   currentAnimState,
 * });
 *
 * <group position={[0, yOffset, 0]}>
 *   <primitive object={clonedScene} />
 * </group>
 * ```
 */
export function useCrouchOffset({
  isCrouching,
  currentAnimState,
  baseCrouchOffset = -0.3,
  animationOffsets = DEFAULT_CROUCH_OFFSETS,
}: CrouchOffsetOptions): CrouchOffsetResult {
  return useMemo(() => {
    if (!isCrouching) {
      return { yOffset: 0, isActive: false };
    }

    // Check for animation-specific offset
    const animOffset = animationOffsets[currentAnimState];
    if (animOffset !== undefined) {
      return { yOffset: animOffset, isActive: true };
    }

    // Fall back to base crouch offset
    return { yOffset: baseCrouchOffset, isActive: true };
  }, [isCrouching, currentAnimState, baseCrouchOffset, animationOffsets]);
}

export default useCrouchOffset;
