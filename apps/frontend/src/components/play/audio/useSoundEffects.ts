/**
 * Sound Effects Hook
 * Play one-shot sound effects with pooling
 */

import { useRef, useCallback, useEffect } from 'react';
import { useSoundStore, type SoundCategory } from './useSoundStore';
import { getAudioPath } from '../../../config/assetPaths';

// Sound effect definitions - use getAudioPath for CDN support
export const SFX = {
  // UI
  uiClick: getAudioPath('sfx/ui_click.mp3'),
  uiHover: getAudioPath('sfx/ui_hover.mp3'),
  uiOpen: getAudioPath('sfx/ui_open.mp3'),
  uiClose: getAudioPath('sfx/ui_close.mp3'),

  // Player - Footsteps (existing surfaces)
  footstepConcrete1: getAudioPath('sfx/footstep_concrete_1.mp3'),
  footstepConcrete2: getAudioPath('sfx/footstep_concrete_2.mp3'),
  footstepConcrete3: getAudioPath('sfx/footstep_concrete_3.mp3'),
  footstepGrass1: getAudioPath('sfx/footstep_grass_1.mp3'),
  footstepGrass2: getAudioPath('sfx/footstep_grass_2.mp3'),
  footstepMetal1: getAudioPath('sfx/footstep_metal_1.mp3'),
  footstepMetal2: getAudioPath('sfx/footstep_metal_2.mp3'),

  // Player - Footsteps (terrain surfaces)
  footstepSand1: getAudioPath('sfx/footstep_sand_1.mp3'),
  footstepSand2: getAudioPath('sfx/footstep_sand_2.mp3'),
  footstepRock1: getAudioPath('sfx/footstep_rock_1.mp3'),
  footstepRock2: getAudioPath('sfx/footstep_rock_2.mp3'),
  footstepSnow1: getAudioPath('sfx/footstep_snow_1.mp3'),
  footstepSnow2: getAudioPath('sfx/footstep_snow_2.mp3'),
  footstepMud1: getAudioPath('sfx/footstep_mud_1.mp3'),
  footstepMud2: getAudioPath('sfx/footstep_mud_2.mp3'),

  // Player - Swimming
  swimStroke1: getAudioPath('sfx/swim_stroke_1.mp3'),
  swimStroke2: getAudioPath('sfx/swim_stroke_2.mp3'),

  // Player - Movement
  jump: getAudioPath('sfx/jump.mp3'),
  land: getAudioPath('sfx/land.mp3'),
  dash: getAudioPath('sfx/dash.mp3'),

  // Combat - Generic (fallbacks)
  rifleShot: getAudioPath('sfx/rifle_shot.mp3'),
  pistolShot: getAudioPath('sfx/pistol_shot.mp3'),
  reload: getAudioPath('sfx/reload.mp3'),
  hitMarker: getAudioPath('sfx/hit_marker.mp3'),
  criticalHit: getAudioPath('sfx/critical_hit.mp3'),
  emptyClip: getAudioPath('sfx/empty_clip.mp3'),

  // Combat - AK-47 specific
  ak47Fire: getAudioPath('sfx/weapons/ak47/AK-47_fire.wav'),
  ak47FireTail: getAudioPath('sfx/weapons/ak47/AK-47_fire_tail.wav'),
  ak47Reload: getAudioPath('sfx/weapons/ak47/AK-47_reload.wav'),
  ak47Empty: getAudioPath('sfx/weapons/ak47/AK-47_empty.wav'),

  // Quest
  questAccept: getAudioPath('sfx/quest_accept.mp3'),
  questComplete: getAudioPath('sfx/quest_complete.mp3'),
  objectiveComplete: getAudioPath('sfx/objective_complete.mp3'),

  // Interaction
  pickup: getAudioPath('sfx/pickup.mp3'),
  doorOpen: getAudioPath('sfx/door_open.mp3'),
  doorClose: getAudioPath('sfx/door_close.mp3'),
} as const;

export type SFXName = keyof typeof SFX;

interface SoundPool {
  audio: HTMLAudioElement[];
  index: number;
}

interface UseSoundEffectsOptions {
  poolSize?: number;
  category?: SoundCategory;
}

export function useSoundEffects(options: UseSoundEffectsOptions = {}) {
  const { poolSize = 4, category = 'sfx' } = options;
  // Use individual selectors to prevent re-renders on unrelated store changes
  const getEffectiveVolume = useSoundStore((s) => s.getEffectiveVolume);
  const isInitialized = useSoundStore((s) => s.isInitialized);
  const initialize = useSoundStore((s) => s.initialize);

  // Sound pool for each sound type
  const pools = useRef<Map<string, SoundPool>>(new Map());

  // Preloaded sounds
  const preloaded = useRef<Set<string>>(new Set());

  // Get or create a sound pool
  const getPool = useCallback(
    (url: string): SoundPool => {
      let pool = pools.current.get(url);

      if (!pool) {
        pool = {
          audio: Array(poolSize)
            .fill(null)
            .map(() => {
              const audio = new Audio(url);
              audio.preload = 'auto';
              return audio;
            }),
          index: 0,
        };
        pools.current.set(url, pool);
      }

      return pool;
    },
    [poolSize]
  );

  // Preload a sound
  const preload = useCallback(
    (name: SFXName | string) => {
      const url = name in SFX ? SFX[name as SFXName] : name;

      if (preloaded.current.has(url)) return;

      getPool(url);
      preloaded.current.add(url);
    },
    [getPool]
  );

  // Preload multiple sounds
  const preloadMany = useCallback(
    (names: (SFXName | string)[]) => {
      names.forEach(preload);
    },
    [preload]
  );

  // Play a sound effect
  const play = useCallback(
    async (
      name: SFXName | string,
      options?: {
        volume?: number;
        playbackRate?: number;
        loop?: boolean;
      }
    ): Promise<HTMLAudioElement | null> => {
      // Initialize audio context if needed
      if (!isInitialized) {
        await initialize();
      }

      const url = name in SFX ? SFX[name as SFXName] : name;
      const pool = getPool(url);

      // Get next audio element from pool
      const audio = pool.audio[pool.index];
      pool.index = (pool.index + 1) % pool.audio.length;

      // Configure and play
      const effectiveVolume = getEffectiveVolume(category);
      audio.volume = effectiveVolume * (options?.volume ?? 1);
      audio.playbackRate = options?.playbackRate ?? 1;
      audio.loop = options?.loop ?? false;
      audio.currentTime = 0;

      try {
        await audio.play();
        return audio;
      } catch (error) {
        // Play was prevented (user hasn't interacted yet)
        console.warn('🔇 Sound play prevented:', name, error);
        return null;
      }
    },
    [getPool, getEffectiveVolume, category, isInitialized, initialize]
  );

  // Play random from array
  const playRandom = useCallback(
    (names: (SFXName | string)[], options?: { volume?: number; playbackRate?: number }) => {
      const randomIndex = Math.floor(Math.random() * names.length);
      return play(names[randomIndex], options);
    },
    [play]
  );

  // Stop all instances of a sound
  const stop = useCallback((name: SFXName | string) => {
    const url = name in SFX ? SFX[name as SFXName] : name;
    const pool = pools.current.get(url);

    if (pool) {
      pool.audio.forEach((audio) => {
        audio.pause();
        audio.currentTime = 0;
      });
    }
  }, []);

  // Stop all sounds
  const stopAll = useCallback(() => {
    pools.current.forEach((pool) => {
      pool.audio.forEach((audio) => {
        audio.pause();
        audio.currentTime = 0;
      });
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAll();
    };
  }, [stopAll]);

  return {
    play,
    playRandom,
    stop,
    stopAll,
    preload,
    preloadMany,
  };
}

export default useSoundEffects;
