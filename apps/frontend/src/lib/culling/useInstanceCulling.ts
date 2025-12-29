/**
 * useInstanceCulling.ts
 * React hook for per-instance frustum culling
 */

import { useRef, useMemo, useCallback, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { InstanceCullingSystem } from './InstanceCullingSystem';
import type { InstanceCullingConfig, CullingResult } from './types';

export interface UseInstanceCullingOptions {
  /** Enable/disable culling */
  enabled?: boolean;
  /** Configuration overrides */
  config?: Partial<InstanceCullingConfig>;
  /** Called after culling each frame */
  onCull?: (result: CullingResult) => void;
  /** useFrame priority (default: -1, before rendering) */
  priority?: number;
}

export interface UseInstanceCullingReturn {
  /** Register instances for culling */
  registerInstances: (positions: THREE.Vector3[], radii: number | number[]) => void;
  /** Register from an InstancedMesh */
  registerFromMesh: (mesh: THREE.InstancedMesh, radius: number) => void;
  /** Get the culling system instance */
  getCullingSystem: () => InstanceCullingSystem;
  /** Get the last culling result */
  getLastResult: () => CullingResult | null;
  /** Force a cull this frame */
  forceCull: () => void;
}

/**
 * Hook for per-instance frustum culling
 *
 * @example
 * ```tsx
 * function Trees({ instances }: { instances: TreeInstance[] }) {
 *   const meshRef = useRef<THREE.InstancedMesh>(null);
 *   const { registerFromMesh, getLastResult } = useInstanceCulling({
 *     enabled: true,
 *     config: { cellSize: 8 },
 *     onCull: (result) => {
 *       if (meshRef.current) {
 *         meshRef.current.count = result.visibleCount;
 *         meshRef.current.instanceMatrix.needsUpdate = true;
 *       }
 *     },
 *   });
 *
 *   useEffect(() => {
 *     if (meshRef.current) {
 *       registerFromMesh(meshRef.current, 2); // 2m radius
 *     }
 *   }, [instances]);
 *
 *   return (
 *     <instancedMesh ref={meshRef} args={[geometry, material, instances.length]}>
 *       ...
 *     </instancedMesh>
 *   );
 * }
 * ```
 */
export function useInstanceCulling(
  options: UseInstanceCullingOptions = {}
): UseInstanceCullingReturn {
  const {
    enabled = true,
    config,
    onCull,
    priority = -1,
  } = options;

  const { camera } = useThree();

  // Create culling system
  const cullingSystem = useMemo(
    () => new InstanceCullingSystem(config),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // Update config when it changes
  useEffect(() => {
    if (config) {
      cullingSystem.setConfig(config);
    }
  }, [config, cullingSystem]);

  // Store last result
  const lastResultRef = useRef<CullingResult | null>(null);

  // Force cull flag
  const forceCullRef = useRef(false);

  // Register instances
  const registerInstances = useCallback(
    (positions: THREE.Vector3[], radii: number | number[]) => {
      cullingSystem.registerInstances(positions, radii);
    },
    [cullingSystem]
  );

  // Register from mesh
  const registerFromMesh = useCallback(
    (mesh: THREE.InstancedMesh, radius: number) => {
      cullingSystem.registerFromMesh(mesh, radius);
    },
    [cullingSystem]
  );

  // Get culling system
  const getCullingSystem = useCallback(() => cullingSystem, [cullingSystem]);

  // Get last result
  const getLastResult = useCallback(() => lastResultRef.current, []);

  // Force cull
  const forceCull = useCallback(() => {
    forceCullRef.current = true;
  }, []);

  // Run culling each frame
  useFrame(() => {
    if (!enabled && !forceCullRef.current) return;
    if (cullingSystem.getInstanceCount() === 0) return;

    const result = cullingSystem.cull(camera);
    lastResultRef.current = result;

    if (onCull) {
      onCull(result);
    }

    forceCullRef.current = false;
  }, priority);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cullingSystem.dispose();
    };
  }, [cullingSystem]);

  return {
    registerInstances,
    registerFromMesh,
    getCullingSystem,
    getLastResult,
    forceCull,
  };
}

/**
 * Simplified hook that automatically applies culling to an InstancedMesh
 */
export function useInstancedMeshCulling(
  meshRef: React.RefObject<THREE.InstancedMesh | null>,
  radius: number,
  options: Omit<UseInstanceCullingOptions, 'onCull'> = {}
): CullingResult | null {
  const { camera } = useThree();

  const cullingSystem = useMemo(
    () => new InstanceCullingSystem(options.config),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const lastResultRef = useRef<CullingResult | null>(null);
  const registeredRef = useRef(false);

  // Register mesh when it becomes available
  useEffect(() => {
    if (meshRef.current && !registeredRef.current) {
      cullingSystem.registerFromMesh(meshRef.current, radius);
      registeredRef.current = true;
    }
  }, [meshRef, radius, cullingSystem]);

  // Run culling and apply to mesh
  useFrame(() => {
    if (!options.enabled) return;
    if (!meshRef.current) return;
    if (cullingSystem.getInstanceCount() === 0) return;

    const result = cullingSystem.cull(camera);
    lastResultRef.current = result;

    // Apply to mesh
    cullingSystem.applyToMesh(meshRef.current, result);
  }, options.priority ?? -1);

  // Cleanup
  useEffect(() => {
    return () => {
      cullingSystem.dispose();
      registeredRef.current = false;
    };
  }, [cullingSystem]);

  return lastResultRef.current;
}

export type { CullingResult, InstanceCullingConfig };
