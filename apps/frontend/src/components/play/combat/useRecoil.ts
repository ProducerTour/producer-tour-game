/**
 * Recoil System Hook
 * Manages weapon bloom (spread increase during fire) and camera recoil
 */

import { useRef, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { useCombatStore, WEAPON_CONFIG } from './useCombatStore';

export interface RecoilState {
  // Current spread bloom (added to base spread)
  currentBloom: number;
  // Camera recoil offsets (radians)
  recoilPitch: number;
  recoilYaw: number;
}

export interface UseRecoilResult {
  /** Get current total spread (base + bloom) */
  getCurrentSpread: () => number;
  /** Call when weapon fires - adds bloom and recoil */
  onFire: () => void;
  /** Get current camera recoil offsets */
  getRecoilOffset: () => { pitch: number; yaw: number };
  /** Reset all recoil state (on weapon switch, etc.) */
  reset: () => void;
}

export function useRecoil(): UseRecoilResult {
  // Use selector to prevent re-renders when unrelated state changes
  const currentWeapon = useCombatStore((s) => s.currentWeapon);

  // Recoil state
  const bloomRef = useRef(0);
  const recoilPitchRef = useRef(0);
  const recoilYawRef = useRef(0);
  const lastFrameTime = useRef(Date.now());

  // Get weapon config safely
  const getConfig = useCallback(() => {
    if (currentWeapon === 'none') return null;
    return WEAPON_CONFIG[currentWeapon];
  }, [currentWeapon]);

  // Decay bloom and recoil each frame
  useFrame(() => {
    const now = Date.now();
    const delta = (now - lastFrameTime.current) / 1000;
    lastFrameTime.current = now;

    const config = getConfig();
    if (!config) {
      // Reset when no weapon
      bloomRef.current = 0;
      recoilPitchRef.current = 0;
      recoilYawRef.current = 0;
      return;
    }

    // Decay bloom back to 0
    if (bloomRef.current > 0) {
      bloomRef.current = Math.max(0, bloomRef.current - config.bloomDecay * delta);
    }

    // Decay camera recoil back to center
    const recovery = config.recoilRecovery * delta;
    if (Math.abs(recoilPitchRef.current) > 0.0001) {
      recoilPitchRef.current *= Math.max(0, 1 - recovery);
    } else {
      recoilPitchRef.current = 0;
    }
    if (Math.abs(recoilYawRef.current) > 0.0001) {
      recoilYawRef.current *= Math.max(0, 1 - recovery);
    } else {
      recoilYawRef.current = 0;
    }
  });

  // Get current total spread
  const getCurrentSpread = useCallback((): number => {
    const config = getConfig();
    if (!config) return 0;
    return config.spread + bloomRef.current;
  }, [getConfig]);

  // Called when weapon fires
  const onFire = useCallback(() => {
    const config = getConfig();
    if (!config) return;

    // Add bloom (capped at max)
    bloomRef.current = Math.min(
      config.maxBloom - config.spread,
      bloomRef.current + config.bloomPerShot
    );

    // Add camera recoil
    recoilPitchRef.current += config.recoilPitch;
    // Random horizontal kick
    recoilYawRef.current += (Math.random() - 0.5) * config.recoilYaw * 2;
  }, [getConfig]);

  // Get current recoil offset
  const getRecoilOffset = useCallback(() => ({
    pitch: recoilPitchRef.current,
    yaw: recoilYawRef.current,
  }), []);

  // Reset all state
  const reset = useCallback(() => {
    bloomRef.current = 0;
    recoilPitchRef.current = 0;
    recoilYawRef.current = 0;
  }, []);

  return {
    getCurrentSpread,
    onFire,
    getRecoilOffset,
    reset,
  };
}

export default useRecoil;
