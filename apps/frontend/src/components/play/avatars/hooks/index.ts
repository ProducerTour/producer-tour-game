/**
 * Avatar Hooks
 *
 * Shared hooks for avatar components to reduce code duplication.
 * These hooks extract common logic from DefaultAvatar, CustomAvatar,
 * and MixamoAnimatedAvatar.
 */

export { useBoneDetection, type BonePrefix, type BoneDetectionResult, type UseBoneDetectionOptions } from './useBoneDetection';
export { useSpineAiming, type SpineAimingOptions } from './useSpineAiming';
export { useCrouchOffset, type CrouchOffsetOptions, type CrouchOffsetResult } from './useCrouchOffset';
