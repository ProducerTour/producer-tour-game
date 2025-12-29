/**
 * useTerrainFootsteps.ts
 * Wraps useFootsteps with automatic terrain-based surface detection.
 *
 * Usage:
 *   const footsteps = useTerrainFootsteps({ terrainGen, enabled: true });
 *   // In useFrame:
 *   footsteps.update(playerPosition, { isMoving, isRunning, isCrouching });
 */

import { useRef, useCallback } from 'react';
import * as THREE from 'three';
import { useFootsteps, type GroundSurface } from './useFootsteps';
import { TerrainGenerator } from '../../../lib/terrain';
import { BIOME_TO_SURFACE } from './footstepConfig';

interface UseTerrainFootstepsOptions {
  /** Pre-initialized TerrainGenerator instance */
  terrainGen: TerrainGenerator;
  /** Enable/disable footstep sounds */
  enabled?: boolean;
  /** Base volume (0-1) */
  volume?: number;
}

interface MovementState {
  isMoving: boolean;
  isRunning: boolean;
  isCrouching: boolean;
}

interface TerrainFootstepsReturn {
  /** Update footsteps based on player position and movement state */
  update: (position: THREE.Vector3, movement: MovementState) => void;
  /** Check if currently swimming */
  isSwimming: () => boolean;
  /** Get current surface type */
  currentSurface: () => GroundSurface;
}

/**
 * Hook for terrain-aware footstep sounds.
 * Automatically detects surface type from biome and switches to swimming when submerged.
 */
export function useTerrainFootsteps(options: UseTerrainFootstepsOptions): TerrainFootstepsReturn {
  const { terrainGen, enabled = true, volume = 0.5 } = options;

  const footsteps = useFootsteps({ enabled, volume });
  const lastPosition = useRef(new THREE.Vector3());
  const lastSurface = useRef<GroundSurface>('grass');
  const isSwimmingRef = useRef(false);

  /**
   * Update footsteps based on player position and movement state.
   * Call this every frame from useFrame.
   */
  const update = useCallback(
    (position: THREE.Vector3, movement: MovementState) => {
      // Skip if player hasn't moved much (avoid excessive terrain queries)
      const distMoved = lastPosition.current.distanceTo(position);
      if (distMoved < 0.5) {
        // Still tick footsteps if moving
        if (movement.isMoving) {
          footsteps.tick();
        }
        return;
      }
      lastPosition.current.copy(position);

      // Sample terrain at player position
      const terrain = terrainGen.sampleTerrain(position.x, position.z);

      // Determine surface
      let surface: GroundSurface;

      if (terrain.isSubmerged) {
        // Player is in water - switch to swimming
        surface = 'water';
        if (!isSwimmingRef.current) {
          isSwimmingRef.current = true;
          // Could log for debugging: console.log('[TerrainFootsteps] Entered water - swimming');
        }
      } else {
        // On land - get surface from biome
        surface = BIOME_TO_SURFACE[terrain.biome] || 'grass';
        if (isSwimmingRef.current) {
          isSwimmingRef.current = false;
          // Could log for debugging: console.log('[TerrainFootsteps] Exited water');
        }
      }

      // Update footsteps surface if changed
      if (surface !== lastSurface.current) {
        footsteps.setSurface(surface);
        lastSurface.current = surface;
      }

      // Update movement state
      footsteps.setMoving(movement.isMoving);
      footsteps.setRunning(movement.isRunning);
      footsteps.setCrouching(movement.isCrouching);

      // Tick footsteps (handles timing internally)
      footsteps.tick();
    },
    [terrainGen, footsteps]
  );

  const isSwimming = useCallback(() => isSwimmingRef.current, []);
  const currentSurface = useCallback(() => lastSurface.current, []);

  return {
    update,
    isSwimming,
    currentSurface,
  };
}

export default useTerrainFootsteps;
