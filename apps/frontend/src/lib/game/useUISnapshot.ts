/**
 * UI Snapshot Hook
 *
 * Subscribe to throttled UI updates from the game engine (10Hz).
 * Use this for HUD elements that don't need 60fps updates.
 *
 * Usage:
 * ```tsx
 * function HealthBar() {
 *   const { playerHealth, playerMaxHealth } = useUISnapshot();
 *   return <div>{playerHealth}/{playerMaxHealth}</div>;
 * }
 * ```
 */

import { useState, useEffect } from 'react';
import { type UISnapshot, createEmptyUISnapshot } from '@producer-tour/engine';
import { useGame } from './GameProvider';

/**
 * Subscribe to the full UI snapshot.
 */
export function useUISnapshot(): UISnapshot {
  const game = useGame();
  const [snapshot, setSnapshot] = useState<UISnapshot>(createEmptyUISnapshot);

  useEffect(() => {
    if (!game) return;

    // Subscribe to UI updates
    const unsubscribe = game.subscribeUI(setSnapshot);

    return unsubscribe;
  }, [game]);

  return snapshot;
}

/**
 * Subscribe to a specific field of the UI snapshot.
 * More efficient than useUISnapshot when you only need one value.
 */
export function useUISnapshotField<K extends keyof UISnapshot>(
  field: K
): UISnapshot[K] {
  const snapshot = useUISnapshot();
  return snapshot[field];
}

/**
 * Subscribe to player health.
 */
export function usePlayerHealth(): { health: number; maxHealth: number } {
  const snapshot = useUISnapshot();
  return {
    health: snapshot.playerHealth,
    maxHealth: snapshot.playerMaxHealth,
  };
}

/**
 * Subscribe to player position.
 */
export function usePlayerPosition(): { x: number; y: number; z: number } {
  const snapshot = useUISnapshot();
  return snapshot.playerPosition;
}

/**
 * Subscribe to FPS and performance metrics.
 */
export function usePerformanceMetrics(): {
  fps: number;
  frameTime: number;
  simTime: number;
} {
  const snapshot = useUISnapshot();
  return {
    fps: snapshot.fps,
    frameTime: snapshot.frameTime,
    simTime: snapshot.simTime,
  };
}

/**
 * Subscribe to combat state.
 */
export function useCombatState(): {
  isInCombat: boolean;
  currentWeapon: string;
  isAiming: boolean;
  isReloading: boolean;
  ammo: number;
  maxAmmo: number;
} {
  const snapshot = useUISnapshot();
  return {
    isInCombat: snapshot.isInCombat,
    currentWeapon: snapshot.currentWeapon,
    isAiming: snapshot.isAiming,
    isReloading: snapshot.isReloading,
    ammo: snapshot.playerAmmo,
    maxAmmo: snapshot.playerMaxAmmo,
  };
}

/**
 * Subscribe to multiplayer info.
 */
export function useMultiplayerInfo(): {
  playerCount: number;
} {
  const snapshot = useUISnapshot();
  return {
    playerCount: snapshot.playerCount,
  };
}

/**
 * Subscribe to chunk streaming stats.
 */
export function useChunkStats(): {
  loaded: number;
  queued: number;
} {
  const snapshot = useUISnapshot();
  return snapshot.chunkStats;
}
