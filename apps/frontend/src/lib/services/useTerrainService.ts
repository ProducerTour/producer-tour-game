/**
 * useTerrainService.ts
 *
 * React hook for accessing TerrainService.
 */

import { useMemo, useCallback } from 'react';
import {
  TerrainService,
  getTerrainService,
  type TerrainServiceConfig,
  type TerrainPoint,
  type BiomeInfo,
} from './TerrainService';

export interface UseTerrainServiceResult {
  /** Get terrain height at position */
  getHeight: (x: number, z: number) => number;
  /** Get full terrain point (x, y, z) */
  getTerrainPoint: (x: number, z: number) => TerrainPoint;
  /** Get biome info at position */
  getBiome: (x: number, z: number) => BiomeInfo;
  /** Get slope at position (0 = flat, 1 = vertical) */
  getSlope: (x: number, z: number) => number;
  /** Check if position is underwater */
  isUnderwater: (x: number, z: number) => boolean;
  /** Check if terrain is walkable */
  isWalkable: (x: number, z: number, maxSlope?: number) => boolean;
  /** Get mountain mask value */
  getMountainMask: (x: number, z: number) => number;
  /** Find a position in a specific biome */
  findBiomePosition: (
    biome: 'grass' | 'sand' | 'rock' | 'forest',
    minWeight?: number
  ) => TerrainPoint | null;
  /** Current terrain seed */
  seed: number;
  /** World size info */
  worldSize: { width: number; depth: number; playRadius: number };
  /** The underlying service (for advanced use) */
  service: TerrainService;
}

/**
 * React hook for terrain operations.
 *
 * @example
 * ```tsx
 * function NPC({ x, z }) {
 *   const { getHeight, getBiome } = useTerrainService();
 *   const y = getHeight(x, z);
 *   const biome = getBiome(x, z);
 *
 *   return <mesh position={[x, y, z]} />;
 * }
 * ```
 */
export function useTerrainService(
  config?: Partial<TerrainServiceConfig>
): UseTerrainServiceResult {
  // Get or create service with config
  const service = useMemo(() => {
    const svc = getTerrainService();
    // Apply config if seed changed
    if (config?.seed !== undefined && svc.getSeed() !== config.seed) {
      svc.setSeed(config.seed);
    }
    return svc;
  }, [config?.seed]);

  const getHeight = useCallback(
    (x: number, z: number) => service.getHeight(x, z),
    [service]
  );

  const getTerrainPoint = useCallback(
    (x: number, z: number) => service.getTerrainPoint(x, z),
    [service]
  );

  const getBiome = useCallback(
    (x: number, z: number) => service.getBiome(x, z),
    [service]
  );

  const getSlope = useCallback(
    (x: number, z: number) => service.getSlope(x, z),
    [service]
  );

  const isUnderwater = useCallback(
    (x: number, z: number) => service.isUnderwater(x, z),
    [service]
  );

  const isWalkable = useCallback(
    (x: number, z: number, maxSlope?: number) =>
      service.isWalkable(x, z, maxSlope),
    [service]
  );

  const getMountainMask = useCallback(
    (x: number, z: number) => service.getMountainMask(x, z),
    [service]
  );

  const findBiomePosition = useCallback(
    (biome: 'grass' | 'sand' | 'rock' | 'forest', minWeight?: number) =>
      service.findBiomePosition(biome, minWeight),
    [service]
  );

  const worldSize = useMemo(() => service.getWorldSize(), [service]);

  return {
    getHeight,
    getTerrainPoint,
    getBiome,
    getSlope,
    isUnderwater,
    isWalkable,
    getMountainMask,
    findBiomePosition,
    seed: service.getSeed(),
    worldSize,
    service,
  };
}
