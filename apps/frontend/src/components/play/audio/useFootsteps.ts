/**
 * Footsteps Hook
 * Plays footstep sounds based on movement and ground surface
 */

import { useRef, useCallback, useEffect } from 'react';
import { useSoundEffects, SFX } from './useSoundEffects';
import { SWIM_STROKE_INTERVAL, SWIM_VOLUME_MULTIPLIER } from './footstepConfig';

export type GroundSurface =
  | 'concrete'
  | 'grass'
  | 'metal'
  | 'wood'
  | 'sand'
  | 'rock'
  | 'snow'
  | 'mud'
  | 'water';

// Surface-specific footstep sounds
const FOOTSTEP_SOUNDS: Record<GroundSurface, string[]> = {
  // Existing surfaces
  concrete: [SFX.footstepConcrete1, SFX.footstepConcrete2, SFX.footstepConcrete3],
  grass: [SFX.footstepGrass1, SFX.footstepGrass2],
  metal: [SFX.footstepMetal1, SFX.footstepMetal2],
  wood: [SFX.footstepConcrete1, SFX.footstepConcrete2], // Fallback to concrete

  // Terrain surfaces
  sand: [SFX.footstepSand1, SFX.footstepSand2],
  rock: [SFX.footstepRock1, SFX.footstepRock2],
  snow: [SFX.footstepSnow1, SFX.footstepSnow2],
  mud: [SFX.footstepMud1, SFX.footstepMud2],

  // Swimming sounds (instead of footsteps)
  water: [SFX.swimStroke1, SFX.swimStroke2],
};

// Step intervals based on movement speed
const STEP_INTERVALS = {
  walk: 500, // ms between steps when walking
  run: 300, // ms between steps when running
  crouch: 700, // ms between steps when crouching
};

interface UseFootstepsOptions {
  enabled?: boolean;
  volume?: number;
}

interface FootstepsState {
  isMoving: boolean;
  isRunning: boolean;
  isCrouching: boolean;
  surface: GroundSurface;
}

export function useFootsteps(options: UseFootstepsOptions = {}) {
  const { enabled = true, volume = 0.5 } = options;
  const { play, preloadMany } = useSoundEffects();

  const lastStepTime = useRef(0);
  const isPlaying = useRef(false);
  const lastFootIndex = useRef(0); // Alternate left/right
  const currentState = useRef<FootstepsState>({
    isMoving: false,
    isRunning: false,
    isCrouching: false,
    surface: 'concrete',
  });

  // Preload footstep sounds (all surfaces including terrain types)
  useEffect(() => {
    preloadMany([
      ...FOOTSTEP_SOUNDS.concrete,
      ...FOOTSTEP_SOUNDS.grass,
      ...FOOTSTEP_SOUNDS.metal,
      ...FOOTSTEP_SOUNDS.sand,
      ...FOOTSTEP_SOUNDS.rock,
      ...FOOTSTEP_SOUNDS.snow,
      ...FOOTSTEP_SOUNDS.mud,
      ...FOOTSTEP_SOUNDS.water,
    ]);
  }, [preloadMany]);

  // Update state
  const updateState = useCallback((state: Partial<FootstepsState>) => {
    currentState.current = { ...currentState.current, ...state };
  }, []);

  // Get current step interval
  const getStepInterval = useCallback(() => {
    const { isCrouching, isRunning, surface } = currentState.current;
    // Swimming uses slower stroke interval
    if (surface === 'water') return SWIM_STROKE_INTERVAL;
    if (isCrouching) return STEP_INTERVALS.crouch;
    if (isRunning) return STEP_INTERVALS.run;
    return STEP_INTERVALS.walk;
  }, []);

  // Play a footstep
  const playStep = useCallback(async () => {
    if (!enabled || isPlaying.current) return;

    const { surface, isRunning, isCrouching } = currentState.current;
    const sounds = FOOTSTEP_SOUNDS[surface] || FOOTSTEP_SOUNDS.concrete;

    // Alternate between sounds for left/right foot feeling
    const soundIndex = lastFootIndex.current % sounds.length;
    lastFootIndex.current++;

    // Volume variation
    const volumeVariation = 0.8 + Math.random() * 0.4;
    const speedVolume = isRunning ? 1.2 : isCrouching ? 0.6 : 1;
    // Apply swim volume multiplier for water sounds
    const surfaceVolume = surface === 'water' ? SWIM_VOLUME_MULTIPLIER : 1;
    const finalVolume = volume * volumeVariation * speedVolume * surfaceVolume;

    // Pitch variation (slight randomization)
    const pitchVariation = 0.95 + Math.random() * 0.1;

    isPlaying.current = true;

    await play(sounds[soundIndex], {
      volume: Math.min(1, finalVolume),
      playbackRate: pitchVariation * (isRunning ? 1.1 : 1),
    });

    isPlaying.current = false;
  }, [enabled, volume, play]);

  // Tick function - call this every frame
  const tick = useCallback(() => {
    if (!enabled) return;

    const { isMoving } = currentState.current;
    const now = Date.now();
    const interval = getStepInterval();

    if (isMoving && now - lastStepTime.current >= interval) {
      playStep();
      lastStepTime.current = now;
    }
  }, [enabled, getStepInterval, playStep]);

  // Play specific sounds
  const playJump = useCallback(() => {
    if (!enabled) return;
    play('jump', { volume: volume * 0.8 });
  }, [enabled, play, volume]);

  const playLand = useCallback(() => {
    if (!enabled) return;
    play('land', { volume: volume * 1.2 });
    // Reset step timing on land
    lastStepTime.current = Date.now();
  }, [enabled, play, volume]);

  const playDash = useCallback(() => {
    if (!enabled) return;
    play('dash', { volume: volume * 0.9 });
  }, [enabled, play, volume]);

  return {
    tick,
    updateState,
    playStep,
    playJump,
    playLand,
    playDash,
    setMoving: (isMoving: boolean) => updateState({ isMoving }),
    setRunning: (isRunning: boolean) => updateState({ isRunning }),
    setCrouching: (isCrouching: boolean) => updateState({ isCrouching }),
    setSurface: (surface: GroundSurface) => updateState({ surface }),
  };
}

export default useFootsteps;
