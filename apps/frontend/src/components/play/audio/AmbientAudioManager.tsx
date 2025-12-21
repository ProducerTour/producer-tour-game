/**
 * AmbientAudioManager.tsx
 * React Three Fiber component for biome-based ambient audio.
 *
 * Manages ambient audio that changes based on player biome,
 * time of day, and weather conditions.
 */

import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useBiomeAmbience } from './useBiomeAmbience';
import { useTimeOfDay } from './useTimeOfDay';
import { useWeatherAudio } from './useWeatherAudio';
import type { WeatherType } from './ambientConfig';

interface AmbientAudioManagerProps {
  /** Player's current world position */
  playerPosition: THREE.Vector3;

  /** Terrain seed for biome lookups */
  terrainSeed?: number;

  /** Terrain chunk radius */
  terrainRadius?: number;

  /**
   * Game time in hours (0-24).
   * Pass null to use real-world time.
   */
  gameTime?: number | null;

  /** Current weather state */
  weather?: WeatherType;

  /** Enable/disable ambient audio */
  enabled?: boolean;
}

/**
 * AmbientAudioManager - Integrates biome, time, and weather audio.
 *
 * Add this component inside your R3F Canvas to enable biome-based ambient audio.
 *
 * @example
 * <Canvas>
 *   <AmbientAudioManager
 *     playerPosition={playerPos}
 *     terrainSeed={12345}
 *     terrainRadius={5}
 *     enabled={settings.ambientAudioEnabled}
 *   />
 * </Canvas>
 */
export function AmbientAudioManager({
  playerPosition,
  terrainSeed = 12345,
  terrainRadius = 5,
  gameTime = null,
  weather = 'clear',
  enabled = true,
}: AmbientAudioManagerProps) {
  // Track enabled state changes
  const wasEnabled = useRef(enabled);

  // Time of day detection
  const timeOfDay = useTimeOfDay({ gameTime });

  // Biome ambient audio
  const biomeAmbience = useBiomeAmbience(timeOfDay, terrainSeed, terrainRadius);

  // Weather overlay audio
  const weatherAudio = useWeatherAudio();

  // Handle enable/disable
  useEffect(() => {
    if (enabled && !wasEnabled.current) {
      // Re-enable: will start playing on next position update
      console.log('[AmbientAudioManager] Enabled');
    } else if (!enabled && wasEnabled.current) {
      // Disable: stop all audio
      console.log('[AmbientAudioManager] Disabled');
      biomeAmbience.stop();
      weatherAudio.stop();
    }
    wasEnabled.current = enabled;
  }, [enabled, biomeAmbience, weatherAudio]);

  // Update weather audio
  useEffect(() => {
    if (enabled) {
      weatherAudio.setWeather(weather);
    }
  }, [weather, enabled, weatherAudio]);

  // Update biome audio based on player position (throttled internally)
  useFrame(() => {
    if (enabled) {
      biomeAmbience.updateForPosition(playerPosition);
    }
  });

  // This component renders nothing - audio only
  return null;
}

export default AmbientAudioManager;
