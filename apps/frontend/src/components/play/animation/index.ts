/**
 * Animation System
 *
 * Unified animation system for all character models.
 */

export { CharacterRenderer, type CharacterRendererProps } from './CharacterRenderer';
export {
  ANIMATIONS,
  MODELS,
  CRITICAL_ANIMATIONS,
  getLoopMode,
  getAllAnimationUrls,
  getAnimationsByCategory,
  getAnimationForState,
  type AnimationName,
  type AnimationConfig,
  type AnimationState,
  type WeaponType,
  type ModelName,
  type LocomotionAnimation,
  type RifleAnimation,
  type PistolAnimation,
} from './AnimationRegistry';
