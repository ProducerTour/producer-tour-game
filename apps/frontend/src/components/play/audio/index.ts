/**
 * Audio System Exports
 */

export { useSoundStore } from './useSoundStore';
export type { SoundCategory } from './useSoundStore';

export { useSoundEffects, SFX } from './useSoundEffects';
export type { SFXName } from './useSoundEffects';

export { useFootsteps } from './useFootsteps';
export type { GroundSurface } from './useFootsteps';

export { useTerrainFootsteps } from './useTerrainFootsteps';

export {
  BIOME_TO_SURFACE,
  SURFACE_SPEED_MODIFIER,
  SWIM_STROKE_INTERVAL,
  SWIM_VOLUME_MULTIPLIER,
  SURFACE_DESCRIPTIONS,
} from './footstepConfig';

export { useWeatherAudio } from './useWeatherAudio';

export { useCombatSounds } from './useCombatSounds';

export { PositionalAudioSource, AudioEmitter } from './PositionalAudio';
