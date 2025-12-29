/**
 * useWeatherAudio.ts
 * Hook for weather overlay audio (rain, wind, storm).
 *
 * Weather audio layers on top of biome ambient audio.
 * Supports crossfading between weather states.
 */

import { useRef, useEffect, useCallback } from 'react';
import { useSoundStore } from './useSoundStore';
import {
  WEATHER_AUDIO,
  CROSSFADE_DURATION,
  WEATHER_VOLUMES,
  type WeatherType,
} from './ambientConfig';

interface UseWeatherAudioReturn {
  /** Set the current weather (triggers crossfade) */
  setWeather: (weather: WeatherType) => void;
  /** Current weather state */
  currentWeather: WeatherType;
  /** Stop weather audio */
  stop: () => void;
}

/**
 * Hook for weather overlay audio.
 *
 * @example
 * const { setWeather } = useWeatherAudio();
 *
 * // Start rain
 * setWeather('rain_light');
 *
 * // Stop weather effects
 * setWeather('clear');
 */
export function useWeatherAudio(): UseWeatherAudioReturn {
  // Use individual selectors to prevent re-renders on unrelated store changes
  const ambientVolume = useSoundStore((s) => s.ambientVolume);
  const masterVolume = useSoundStore((s) => s.masterVolume);

  const currentWeather = useRef<WeatherType>('clear');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isCrossfading = useRef(false);

  const effectiveVolume = masterVolume * ambientVolume;

  /**
   * Set weather state with crossfade
   */
  const setWeather = useCallback(
    (weather: WeatherType) => {
      if (weather === currentWeather.current) return;
      if (isCrossfading.current) return;

      currentWeather.current = weather;

      const oldAudio = audioRef.current;
      const oldVolume = oldAudio?.volume ?? 0;

      // If clearing weather, just fade out
      if (weather === 'clear') {
        if (oldAudio) {
          isCrossfading.current = true;
          const startTime = Date.now();

          const fadeOut = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(1, elapsed / CROSSFADE_DURATION);
            const eased = progress * progress * (3 - 2 * progress);

            oldAudio.volume = Math.max(0, oldVolume * (1 - eased));

            if (progress < 1) {
              requestAnimationFrame(fadeOut);
            } else {
              oldAudio.pause();
              oldAudio.src = '';
              audioRef.current = null;
              isCrossfading.current = false;
              console.log('[useWeatherAudio] Weather cleared');
            }
          };

          requestAnimationFrame(fadeOut);
        }
        return;
      }

      // Start new weather audio
      const audioPath = WEATHER_AUDIO[weather];
      if (!audioPath) {
        console.warn(`[useWeatherAudio] No audio path for weather: ${weather}`);
        return;
      }

      const newAudio = new Audio(audioPath);
      newAudio.loop = true;
      newAudio.volume = 0;

      newAudio.play().catch((err) => {
        console.warn('[useWeatherAudio] Audio autoplay blocked:', err.message);
      });

      isCrossfading.current = true;
      const startTime = Date.now();
      const targetVolume = WEATHER_VOLUMES[weather] * effectiveVolume;

      const crossfade = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(1, elapsed / CROSSFADE_DURATION);
        const eased = progress * progress * (3 - 2 * progress);

        // Fade out old
        if (oldAudio) {
          oldAudio.volume = Math.max(0, oldVolume * (1 - eased));
        }

        // Fade in new
        newAudio.volume = eased * targetVolume;

        if (progress < 1) {
          requestAnimationFrame(crossfade);
        } else {
          // Cleanup old audio
          if (oldAudio) {
            oldAudio.pause();
            oldAudio.src = '';
          }

          audioRef.current = newAudio;
          isCrossfading.current = false;
          console.log(`[useWeatherAudio] Weather changed to: ${weather}`);
        }
      };

      requestAnimationFrame(crossfade);
    },
    [effectiveVolume]
  );

  /**
   * Stop weather audio immediately
   */
  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    currentWeather.current = 'clear';
    isCrossfading.current = false;
  }, []);

  // Update volume when settings change
  useEffect(() => {
    if (audioRef.current && !isCrossfading.current && currentWeather.current !== 'clear') {
      const targetVolume = WEATHER_VOLUMES[currentWeather.current] * effectiveVolume;
      audioRef.current.volume = targetVolume;
    }
  }, [effectiveVolume]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return {
    setWeather,
    currentWeather: currentWeather.current,
    stop,
  };
}

export default useWeatherAudio;
