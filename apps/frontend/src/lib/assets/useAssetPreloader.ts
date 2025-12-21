/**
 * useAssetPreloader.ts
 *
 * React hooks for asset preloading with progress tracking.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  AssetPriority,
  getAssetsByPriority,
} from './AssetManifest';
import {
  PreloadProgress,
  preloadAssets,
  preloadEssentials,
  isAssetLoaded,
  isPriorityLoaded,
  getPreloadProgress,
} from './AssetPreloader';

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Preload assets at a specific priority level.
 * Returns progress state that updates during loading.
 *
 * @example
 * ```tsx
 * function LoadingScreen() {
 *   const { progress, isComplete } = usePreloadPriority('critical');
 *
 *   if (!isComplete) {
 *     return (
 *       <div>
 *         Loading {progress.currentAsset}... {progress.percent}%
 *       </div>
 *     );
 *   }
 *
 *   return <Game />;
 * }
 * ```
 */
export function usePreloadPriority(
  priority: AssetPriority,
  options: { autoStart?: boolean } = {}
): {
  progress: PreloadProgress;
  isComplete: boolean;
  startLoading: () => void;
} {
  const { autoStart = true } = options;

  const [progress, setProgress] = useState<PreloadProgress>(() =>
    getPreloadProgress(priority)
  );
  const [started, setStarted] = useState(autoStart);

  const startLoading = useCallback(() => {
    setStarted(true);
  }, []);

  useEffect(() => {
    if (!started) return;

    // Check if already loaded
    if (isPriorityLoaded(priority)) {
      setProgress(getPreloadProgress(priority));
      return;
    }

    // Start preloading
    preloadAssets(priority, setProgress);
  }, [priority, started]);

  return {
    progress,
    isComplete: progress.isComplete,
    startLoading,
  };
}

/**
 * Preload essential assets (critical + gameplay).
 * Typical usage for game startup.
 *
 * @example
 * ```tsx
 * function App() {
 *   const { isReady, progress } = usePreloadEssentials();
 *
 *   if (!isReady) {
 *     return <LoadingScreen progress={progress} />;
 *   }
 *
 *   return <Game />;
 * }
 * ```
 */
export function usePreloadEssentials(): {
  progress: PreloadProgress;
  isReady: boolean;
} {
  const [progress, setProgress] = useState<PreloadProgress>({
    loaded: 0,
    total: 0,
    percent: 0,
    currentAsset: null,
    isComplete: false,
    errors: [],
  });

  useEffect(() => {
    preloadEssentials(setProgress);
  }, []);

  return {
    progress,
    isReady: progress.isComplete,
  };
}

/**
 * Check if a specific asset is loaded.
 * Useful for conditional rendering.
 *
 * @example
 * ```tsx
 * function Weapon() {
 *   const isRifleLoaded = useIsAssetLoaded('/models/weapons/rifle.glb');
 *
 *   if (!isRifleLoaded) {
 *     return <PlaceholderWeapon />;
 *   }
 *
 *   return <Rifle />;
 * }
 * ```
 */
export function useIsAssetLoaded(path: string): boolean {
  const [loaded, setLoaded] = useState(() => isAssetLoaded(path));

  useEffect(() => {
    // Check periodically if not loaded
    if (loaded) return;

    const interval = setInterval(() => {
      if (isAssetLoaded(path)) {
        setLoaded(true);
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [path, loaded]);

  return loaded;
}

/**
 * Check if all assets at a priority level are loaded.
 */
export function useIsPriorityLoaded(priority: AssetPriority): boolean {
  const [loaded, setLoaded] = useState(() => isPriorityLoaded(priority));

  useEffect(() => {
    if (loaded) return;

    const interval = setInterval(() => {
      if (isPriorityLoaded(priority)) {
        setLoaded(true);
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [priority, loaded]);

  return loaded;
}

/**
 * Get count of assets at a priority level.
 */
export function useAssetCount(priority: AssetPriority): {
  total: number;
  loaded: number;
} {
  const assets = getAssetsByPriority(priority);
  const loadedCount = assets.filter((a) => isAssetLoaded(a.path)).length;

  return {
    total: assets.length,
    loaded: loadedCount,
  };
}
