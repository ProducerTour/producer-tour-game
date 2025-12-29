/**
 * VisibilityUpdater.tsx
 * React Three Fiber component that updates the visibility system each frame
 *
 * Runs at useFrame priority -1 (before other updates) to ensure
 * visibility data is available for rendering decisions.
 */

import { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  getVisibilityManager,
  type VisibilityConfig,
} from '../../../lib/visibility';

interface VisibilityUpdaterProps {
  /** Enable/disable the visibility system */
  enabled?: boolean;
  /** Configuration overrides */
  config?: Partial<VisibilityConfig>;
  /** Called when stats are updated (for debug display) */
  onStatsUpdate?: (stats: ReturnType<ReturnType<typeof getVisibilityManager>['getStats']>) => void;
}

/**
 * VisibilityUpdater initializes and runs the visibility system
 *
 * Place this component early in your scene (before terrain/objects)
 * to ensure visibility is computed before rendering.
 *
 * @example
 * ```tsx
 * <Canvas>
 *   <VisibilityUpdater enabled={true} />
 *   <Terrain />
 *   <Trees />
 * </Canvas>
 * ```
 */
export function VisibilityUpdater({
  enabled = true,
  config,
  onStatsUpdate,
}: VisibilityUpdaterProps) {
  const { gl, scene, camera } = useThree();
  const initializedRef = useRef(false);
  const visibilityManager = getVisibilityManager();

  // Initialize visibility system on mount
  useEffect(() => {
    if (!enabled) return;

    // Initialize with WebGL renderer
    if (!initializedRef.current) {
      visibilityManager.initialize(gl);
      initializedRef.current = true;
    }

    // Apply config overrides
    if (config) {
      visibilityManager.setConfig(config);
    }

    // Cleanup on unmount
    return () => {
      // Don't reset on hot reload, only on actual unmount
      // resetVisibilityManager();
    };
  }, [gl, enabled, config, visibilityManager]);

  // Update config when it changes
  useEffect(() => {
    if (config && enabled) {
      visibilityManager.setConfig(config);
    }
  }, [config, enabled, visibilityManager]);

  // Run visibility update before other systems
  // Priority -1 ensures this runs before default (0) useFrame callbacks
  useFrame((_, delta) => {
    if (!enabled || !initializedRef.current) return;

    // Update visibility system
    visibilityManager.update(camera, scene, delta);

    // Report stats if callback provided
    if (onStatsUpdate) {
      onStatsUpdate(visibilityManager.getStats());
    }
  }, -1); // Priority -1 = run before default

  return null;
}

/**
 * Hook to access the visibility manager from any component
 */
export function useVisibilityManager() {
  return getVisibilityManager();
}

/**
 * Hook to check if a chunk is visible
 * Useful for conditional rendering of chunk contents
 */
export function useChunkVisibility(chunkX: number, chunkZ: number): boolean {
  const manager = getVisibilityManager();

  // Register chunk on mount
  useEffect(() => {
    manager.registerChunk(chunkX, chunkZ);
    return () => manager.unregisterChunk(chunkX, chunkZ);
  }, [manager, chunkX, chunkZ]);

  // Return current visibility (will update after useFrame runs)
  return manager.isChunkVisible(chunkX, chunkZ);
}

/**
 * Hook to register an object for visibility tracking
 */
export function useObjectVisibility(
  id: string,
  boundsRef: React.RefObject<THREE.Box3 | null>,
  options?: {
    type?: 'chunk' | 'vegetation' | 'prop' | 'building';
    priority?: number;
    alwaysVisible?: boolean;
  }
): boolean {
  const manager = getVisibilityManager();

  // Register object when bounds are available
  useEffect(() => {
    if (!boundsRef.current) return;

    manager.registerObject(id, boundsRef.current, options);
    return () => manager.unregisterObject(id);
  }, [manager, id, boundsRef, options]);

  return manager.isObjectVisible(id);
}

// Re-export types for convenience
export type { VisibilityConfig };
