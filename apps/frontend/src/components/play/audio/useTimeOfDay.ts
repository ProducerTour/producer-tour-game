/**
 * useTimeOfDay.ts
 * Hook for detecting day/night cycle for ambient audio variation.
 *
 * Supports both real-world time and game time (for future day/night cycle).
 */

import { useState, useEffect } from 'react';
import type { TimeOfDay } from './ambientConfig';

interface UseTimeOfDayOptions {
  /**
   * Game time in hours (0-24).
   * Pass null to use real-world time.
   */
  gameTime?: number | null;

  /** Hour when day begins (default: 6 AM) */
  dawnHour?: number;

  /** Hour when night begins (default: 6 PM / 18:00) */
  duskHour?: number;

  /** Update interval for real-time mode (ms, default: 60000) */
  updateInterval?: number;
}

/**
 * Determines whether it's day or night based on game time or real time.
 *
 * @example
 * // Use real-world time
 * const timeOfDay = useTimeOfDay();
 *
 * @example
 * // Use game time (12 noon = day)
 * const timeOfDay = useTimeOfDay({ gameTime: 12 });
 *
 * @example
 * // Custom dawn/dusk hours
 * const timeOfDay = useTimeOfDay({ dawnHour: 5, duskHour: 20 });
 */
export function useTimeOfDay(options: UseTimeOfDayOptions = {}): TimeOfDay {
  const {
    gameTime = null,
    dawnHour = 6,
    duskHour = 18,
    updateInterval = 60000,
  } = options;

  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>(() => {
    const hour = gameTime ?? new Date().getHours();
    return hour >= dawnHour && hour < duskHour ? 'day' : 'night';
  });

  useEffect(() => {
    const checkTime = () => {
      const hour = gameTime ?? new Date().getHours();
      const isDay = hour >= dawnHour && hour < duskHour;
      setTimeOfDay(isDay ? 'day' : 'night');
    };

    // Initial check
    checkTime();

    // If using real time, set up interval
    if (gameTime === null) {
      const interval = setInterval(checkTime, updateInterval);
      return () => clearInterval(interval);
    }
  }, [gameTime, dawnHour, duskHour, updateInterval]);

  return timeOfDay;
}

export default useTimeOfDay;
