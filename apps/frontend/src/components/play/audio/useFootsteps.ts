/**
 * Footsteps Hook
 * Plays footstep sounds based on movement and ground surface
 */

import { useRef, useCallback, useEffect } from 'react';
import { useSoundEffects, SFX } from './useSoundEffects';

export type GroundSurface = 'concrete' | 'grass' | 'metal' | 'wood' | 'water';

// Surface-specific footstep sounds
const FOOTSTEP_SOUNDS: Record<GroundSurface, string[]> = {
  concrete: [SFX.footstepConcrete1, SFX.footstepConcrete2, SFX.footstepConcrete3],
  grass: [SFX.footstepGrass1, SFX.footstepGrass2],
  metal: [SFX.footstepMetal1, SFX.footstepMetal2],
  wood: [SFX.footstepConcrete1, SFX.footstepConcrete2], // Fallback
  water: [SFX.footstepGrass1, SFX.footstepGrass2], // Fallback
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

  // Preload footstep sounds
  useEffect(() => {
    preloadMany([
      ...FOOTSTEP_SOUNDS.concrete,
      ...FOOTSTEP_SOUNDS.grass,
      ...FOOTSTEP_SOUNDS.metal,
    ]);
  }, [preloadMany]);

  // Update state
  const updateState = useCallback((state: Partial<FootstepsState>) => {
    currentState.current = { ...currentState.current, ...state };
  }, []);

  // Get current step interval
  const getStepInterval = useCallback(() => {
    const { isCrouching, isRunning } = currentState.current;
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
    const finalVolume = volume * volumeVariation * speedVolume;

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
