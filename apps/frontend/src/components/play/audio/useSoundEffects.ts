/**
 * Sound Effects Hook
 * Play one-shot sound effects with pooling
 */

import { useRef, useCallback, useEffect } from 'react';
import { useSoundStore, type SoundCategory } from './useSoundStore';

// Sound effect definitions
export const SFX = {
  // UI
  uiClick: '/audio/sfx/ui_click.mp3',
  uiHover: '/audio/sfx/ui_hover.mp3',
  uiOpen: '/audio/sfx/ui_open.mp3',
  uiClose: '/audio/sfx/ui_close.mp3',

  // Player
  footstepConcrete1: '/audio/sfx/footstep_concrete_1.mp3',
  footstepConcrete2: '/audio/sfx/footstep_concrete_2.mp3',
  footstepConcrete3: '/audio/sfx/footstep_concrete_3.mp3',
  footstepGrass1: '/audio/sfx/footstep_grass_1.mp3',
  footstepGrass2: '/audio/sfx/footstep_grass_2.mp3',
  footstepMetal1: '/audio/sfx/footstep_metal_1.mp3',
  footstepMetal2: '/audio/sfx/footstep_metal_2.mp3',
  jump: '/audio/sfx/jump.mp3',
  land: '/audio/sfx/land.mp3',
  dash: '/audio/sfx/dash.mp3',

  // Combat - Generic (fallbacks)
  rifleShot: '/audio/sfx/rifle_shot.mp3',
  pistolShot: '/audio/sfx/pistol_shot.mp3',
  reload: '/audio/sfx/reload.mp3',
  hitMarker: '/audio/sfx/hit_marker.mp3',
  criticalHit: '/audio/sfx/critical_hit.mp3',
  emptyClip: '/audio/sfx/empty_clip.mp3',

  // Combat - AK-47 specific
  ak47Fire: '/audio/sfx/weapons/ak47/AK-47_fire.wav',
  ak47FireTail: '/audio/sfx/weapons/ak47/AK-47_fire_tail.wav',
  ak47Reload: '/audio/sfx/weapons/ak47/AK-47_reload.wav',
  ak47Empty: '/audio/sfx/weapons/ak47/AK-47_empty.wav',

  // Quest
  questAccept: '/audio/sfx/quest_accept.mp3',
  questComplete: '/audio/sfx/quest_complete.mp3',
  objectiveComplete: '/audio/sfx/objective_complete.mp3',

  // Interaction
  pickup: '/audio/sfx/pickup.mp3',
  doorOpen: '/audio/sfx/door_open.mp3',
  doorClose: '/audio/sfx/door_close.mp3',
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
  const { getEffectiveVolume, isInitialized, initialize } = useSoundStore();

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
        console.debug('Sound play prevented:', name);
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
