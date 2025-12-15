/**
 * Combat System Exports
 */

export { useCombatStore, WEAPON_CONFIG } from './useCombatStore';
export type { DamageNumber, CombatTarget } from './useCombatStore';

export { useHitDetection } from './useHitDetection';
export type { HitResult } from './useHitDetection';

export { DamageNumbers } from './DamageNumbers';

export {
  PlayerHealthBar,
  AmmoDisplay,
  WorldHealthBar,
  Crosshair,
} from './HealthBar';
