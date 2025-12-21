/**
 * useTerrainCollision.ts
 * React hook for terrain collision queries
 * Provides ground detection for player controller
 */

import { useCallback, useRef, useMemo } from 'react';
import * as THREE from 'three';
import {
  TerrainCollision,
  HeightmapGenerator,
  NOISE_CONFIG,
  type TerrainCollisionResult,
} from '../../../lib/terrain';

export interface UseTerrainCollisionOptions {
  /** World seed for terrain generation */
  seed?: number;

  /** Custom heightmap generator instance */
  heightmapGen?: HeightmapGenerator;

  /** Enable debug logging */
  debug?: boolean;
}

export interface TerrainCollisionHook {
  /** Check if position is grounded on terrain */
  checkGround: (position: THREE.Vector3) => TerrainCollisionResult;

  /** Get terrain height at x,z coordinates */
  getHeightAt: (x: number, z: number) => number;

  /** Get terrain normal at x,z coordinates */
  getNormalAt: (x: number, z: number) => THREE.Vector3;

  /** Snap a position to ground level */
  snapToGround: (position: THREE.Vector3, offset?: number) => THREE.Vector3;

  /** Check if slope is walkable at position */
  isWalkable: (x: number, z: number) => boolean;

  /** Query full terrain info at position */
  queryTerrain: (position: THREE.Vector3) => TerrainCollisionResult;

  /** Get the terrain collision instance */
  collision: TerrainCollision;

  /** Get the heightmap generator */
  heightmapGen: HeightmapGenerator;
}

/**
 * Hook for terrain collision detection
 * Provides ground checking for player controller integration
 */
export function useTerrainCollision({
  seed = NOISE_CONFIG.seed,
  heightmapGen: externalHeightmapGen,
  debug = false,
}: UseTerrainCollisionOptions = {}): TerrainCollisionHook {
  // Create or use provided heightmap generator
  const heightmapGen = useMemo(() => {
    if (externalHeightmapGen) return externalHeightmapGen;
    return new HeightmapGenerator(seed);
  }, [seed, externalHeightmapGen]);

  // Create collision system
  const collision = useMemo(() => {
    return new TerrainCollision(heightmapGen);
  }, [heightmapGen]);

  // Reusable vectors for performance
  const normalVec = useRef(new THREE.Vector3());
  const resultVec = useRef(new THREE.Vector3());

  /**
   * Check ground at a position
   */
  const checkGround = useCallback(
    (position: THREE.Vector3): TerrainCollisionResult => {
      const result = collision.queryTerrain(position.x, position.y, position.z);

      if (debug && result.grounded) {
        console.log(`[Terrain] Grounded at height ${result.height.toFixed(2)}, slope ${(result.slope * 180 / Math.PI).toFixed(1)}°`);
      }

      return result;
    },
    [collision, debug]
  );

  /**
   * Get height at x,z
   */
  const getHeightAt = useCallback(
    (x: number, z: number): number => {
      return collision.getHeightAt(x, z);
    },
    [collision]
  );

  /**
   * Get normal at x,z as THREE.Vector3
   */
  const getNormalAt = useCallback(
    (x: number, z: number): THREE.Vector3 => {
      const normal = collision.getNormalAt(x, z);
      normalVec.current.set(normal.x, normal.y, normal.z);
      return normalVec.current;
    },
    [collision]
  );

  /**
   * Snap position to ground
   */
  const snapToGround = useCallback(
    (position: THREE.Vector3, offset: number = 0): THREE.Vector3 => {
      const snapped = collision.snapToGround(position.x, position.z, offset);
      resultVec.current.set(snapped.x, snapped.y, snapped.z);
      return resultVec.current;
    },
    [collision]
  );

  /**
   * Check if position is walkable
   */
  const isWalkable = useCallback(
    (x: number, z: number): boolean => {
      return collision.isWalkable(x, z);
    },
    [collision]
  );

  /**
   * Full terrain query
   */
  const queryTerrain = useCallback(
    (position: THREE.Vector3): TerrainCollisionResult => {
      return collision.queryTerrain(position.x, position.y, position.z);
    },
    [collision]
  );

  return {
    checkGround,
    getHeightAt,
    getNormalAt,
    snapToGround,
    isWalkable,
    queryTerrain,
    collision,
    heightmapGen,
  };
}

/**
 * Singleton terrain collision for use outside React components
 */
let globalTerrainCollision: TerrainCollision | null = null;

export function getGlobalTerrainCollision(seed?: number): TerrainCollision {
  if (!globalTerrainCollision) {
    const heightmapGen = new HeightmapGenerator(seed ?? NOISE_CONFIG.seed);
    globalTerrainCollision = new TerrainCollision(heightmapGen);
  }
  return globalTerrainCollision;
}

export function resetGlobalTerrainCollision(): void {
  globalTerrainCollision = null;
}

export default useTerrainCollision;
