/**
 * VFX System Exports
 */

export {
  useVFXStore,
  spawnMuzzleFlash,
  spawnBulletImpact,
  spawnHitEffect,
  spawnHealEffect,
  spawnFootstepDust,
} from './useVFXStore';
export type { VFXType, VFXInstance } from './useVFXStore';

export {
  VFXRenderer,
  MuzzleFlash,
  BulletImpact,
  Sparkle,
  Smoke,
  HealEffect,
  FootstepDust,
} from './ParticleEffects';

export { VFXManager } from './VFXManager';
