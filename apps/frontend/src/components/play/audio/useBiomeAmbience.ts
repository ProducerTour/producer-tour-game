/**
 * useBiomeAmbience.ts
 * Hook for biome-based ambient audio with smooth crossfading.
 *
 * Queries the terrain at the player's position and plays the appropriate
 * ambient audio track with crossfade transitions between biomes.
 */

import { useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { useSoundStore } from './useSoundStore';
import { TerrainGenerator } from '../../../lib/terrain';
import {
  BIOME_TO_ZONE,
  ZONE_AUDIO,
  CROSSFADE_DURATION,
  POSITION_CHECK_INTERVAL,
  MIN_MOVEMENT_DISTANCE,
  BIOME_BASE_VOLUME,
  type AmbientZone,
  type TimeOfDay,
} from './ambientConfig';

interface BiomeAmbienceState {
  currentZone: AmbientZone | null;
  currentAudio: HTMLAudioElement | null;
  nextAudio: HTMLAudioElement | null;
  isCrossfading: boolean;
}

interface UseBiomeAmbienceReturn {
  /** Call this with player position to update ambient audio */
  updateForPosition: (playerPos: THREE.Vector3) => void;
  /** Current ambient zone (for debugging) */
  currentZone: AmbientZone | null;
  /** Stop all ambient audio */
  stop: () => void;
}

/**
 * Hook for biome-based ambient audio.
 *
 * @param timeOfDay - Current time of day ('day' or 'night')
 * @param terrainSeed - Terrain seed for biome lookups
 * @param terrainRadius - Terrain chunk radius
 *
 * @example
 * const timeOfDay = useTimeOfDay();
 * const { updateForPosition } = useBiomeAmbience(timeOfDay, 12345, 5);
 *
 * useFrame(() => {
 *   updateForPosition(playerPosition);
 * });
 */
export function useBiomeAmbience(
  timeOfDay: TimeOfDay,
  terrainSeed: number = 12345,
  terrainRadius: number = 5
): UseBiomeAmbienceReturn {
  // Use individual selectors to prevent re-renders on unrelated store changes
  const ambientVolume = useSoundStore((s) => s.ambientVolume);
  const masterVolume = useSoundStore((s) => s.masterVolume);

  // Terrain generator for biome lookups
  const terrainGen = useRef<TerrainGenerator | null>(null);

  // Audio state
  const state = useRef<BiomeAmbienceState>({
    currentZone: null,
    currentAudio: null,
    nextAudio: null,
    isCrossfading: false,
  });

  // Throttling state
  const lastCheckTime = useRef(0);
  const lastPosition = useRef(new THREE.Vector3());

  // Calculate effective volume
  const effectiveVolume = masterVolume * ambientVolume * BIOME_BASE_VOLUME;

  // Initialize terrain generator
  useEffect(() => {
    terrainGen.current = new TerrainGenerator(terrainSeed, terrainRadius);
  }, [terrainSeed, terrainRadius]);

  /**
   * Crossfade to a new ambient zone
   */
  const crossfadeTo = useCallback(
    (newZone: AmbientZone) => {
      // Don't start a new crossfade if one is in progress
      if (state.current.isCrossfading) return;

      const audioPath = ZONE_AUDIO[newZone]?.[timeOfDay];
      if (!audioPath) {
        console.warn(`[useBiomeAmbience] No audio path for zone: ${newZone}, time: ${timeOfDay}`);
        return;
      }

      const newAudio = new Audio(audioPath);
      newAudio.loop = true;
      newAudio.volume = 0;

      state.current.nextAudio = newAudio;
      state.current.isCrossfading = true;

      // Start playing the new audio (may fail if no user interaction yet)
      newAudio.play().catch((err) => {
        console.warn('[useBiomeAmbience] Audio autoplay blocked:', err.message);
        state.current.isCrossfading = false;
        state.current.nextAudio = null;
      });

      const startTime = Date.now();
      const oldAudio = state.current.currentAudio;
      const oldVolume = oldAudio?.volume ?? effectiveVolume;

      const fadeStep = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(1, elapsed / CROSSFADE_DURATION);

        // Ease function for smoother crossfade
        const eased = progress * progress * (3 - 2 * progress); // smoothstep

        // Fade out old audio
        if (oldAudio) {
          oldAudio.volume = Math.max(0, oldVolume * (1 - eased));
        }

        // Fade in new audio
        newAudio.volume = eased * effectiveVolume;

        if (progress < 1) {
          requestAnimationFrame(fadeStep);
        } else {
          // Crossfade complete - cleanup old audio
          if (oldAudio) {
            oldAudio.pause();
            oldAudio.src = '';
          }

          state.current.currentAudio = newAudio;
          state.current.nextAudio = null;
          state.current.currentZone = newZone;
          state.current.isCrossfading = false;

          console.log(`[useBiomeAmbience] Now playing: ${newZone} (${timeOfDay})`);
        }
      };

      requestAnimationFrame(fadeStep);
    },
    [timeOfDay, effectiveVolume]
  );

  /**
   * Update ambient audio based on player position
   */
  const updateForPosition = useCallback(
    (playerPos: THREE.Vector3) => {
      const now = Date.now();

      // Throttle position checks
      if (now - lastCheckTime.current < POSITION_CHECK_INTERVAL) return;

      // Skip if player hasn't moved significantly
      if (lastPosition.current.distanceTo(playerPos) < MIN_MOVEMENT_DISTANCE) return;

      lastCheckTime.current = now;
      lastPosition.current.copy(playerPos);

      // Get biome at player position
      if (!terrainGen.current) return;

      const terrain = terrainGen.current.sampleTerrain(playerPos.x, playerPos.z);
      const biome = terrain.biome;
      const zone = BIOME_TO_ZONE[biome];

      if (!zone) {
        console.warn(`[useBiomeAmbience] Unknown biome: ${biome}`);
        return;
      }

      // Check if zone changed
      if (zone !== state.current.currentZone) {
        crossfadeTo(zone);
      }
    },
    [crossfadeTo]
  );

  /**
   * Stop all ambient audio
   */
  const stop = useCallback(() => {
    if (state.current.currentAudio) {
      state.current.currentAudio.pause();
      state.current.currentAudio.src = '';
      state.current.currentAudio = null;
    }
    if (state.current.nextAudio) {
      state.current.nextAudio.pause();
      state.current.nextAudio.src = '';
      state.current.nextAudio = null;
    }
    state.current.currentZone = null;
    state.current.isCrossfading = false;
  }, []);

  // Handle time of day changes - crossfade to new track for same zone
  useEffect(() => {
    if (state.current.currentZone && !state.current.isCrossfading) {
      crossfadeTo(state.current.currentZone);
    }
  }, [timeOfDay, crossfadeTo]);

  // Update volume when settings change
  useEffect(() => {
    if (state.current.currentAudio && !state.current.isCrossfading) {
      state.current.currentAudio.volume = effectiveVolume;
    }
  }, [effectiveVolume]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return {
    updateForPosition,
    currentZone: state.current.currentZone,
    stop,
  };
}

export default useBiomeAmbience;
