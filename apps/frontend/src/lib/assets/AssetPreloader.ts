/**
 * AssetPreloader.ts
 *
 * Handles preloading assets with progress tracking.
 * Uses drei's preload utilities for GLB/texture caching.
 */

import { useGLTF, useTexture } from '@react-three/drei';
import {
  AssetPriority,
  AssetEntry,
  getAssetsByPriority,
  getEstimatedSize,
} from './AssetManifest';

// =============================================================================
// TYPES
// =============================================================================

export interface PreloadProgress {
  /** Number of assets loaded */
  loaded: number;
  /** Total number of assets to load */
  total: number;
  /** Percentage complete (0-100) */
  percent: number;
  /** Currently loading asset name */
  currentAsset: string | null;
  /** Whether loading is complete */
  isComplete: boolean;
  /** Any errors that occurred */
  errors: string[];
}

export type PreloadProgressCallback = (progress: PreloadProgress) => void;

// =============================================================================
// PRELOAD STATE
// =============================================================================

// Track which assets have been loaded
const loadedAssets = new Set<string>();
const loadingPromises = new Map<string, Promise<void>>();
const loadErrors: string[] = [];

/**
 * Check if an asset is already loaded.
 */
export function isAssetLoaded(path: string): boolean {
  return loadedAssets.has(path);
}

/**
 * Check if all assets at a priority level are loaded.
 */
export function isPriorityLoaded(priority: AssetPriority): boolean {
  const assets = getAssetsByPriority(priority);
  return assets.every((a) => loadedAssets.has(a.path));
}

/**
 * Get loading progress for a priority level.
 */
export function getPreloadProgress(priority: AssetPriority): PreloadProgress {
  const assets = getAssetsByPriority(priority);
  const loaded = assets.filter((a) => loadedAssets.has(a.path)).length;

  return {
    loaded,
    total: assets.length,
    percent: assets.length > 0 ? Math.round((loaded / assets.length) * 100) : 100,
    currentAsset: null,
    isComplete: loaded === assets.length,
    errors: [...loadErrors],
  };
}

// =============================================================================
// PRELOAD FUNCTIONS
// =============================================================================

/**
 * Preload a single asset.
 */
async function preloadAsset(asset: AssetEntry): Promise<void> {
  // Skip if already loaded
  if (loadedAssets.has(asset.path)) {
    return;
  }

  // Return existing promise if already loading
  const existing = loadingPromises.get(asset.path);
  if (existing) {
    return existing;
  }

  // Create loading promise
  const promise = (async () => {
    try {
      switch (asset.type) {
        case 'model':
          // Use drei's preload for GLB caching
          await useGLTF.preload(asset.path);
          break;

        case 'texture':
          // Use drei's texture preload
          await useTexture.preload(asset.path);
          break;

        case 'hdri':
          // HDRIs are loaded via Environment component
          // Just mark as loaded since they're lazy loaded
          break;

        case 'audio':
          // Preload audio via Audio API
          await preloadAudio(asset.path);
          break;
      }

      loadedAssets.add(asset.path);
    } catch (err) {
      const errorMsg = `Failed to load ${asset.name}: ${err}`;
      console.warn(`[AssetPreloader] ${errorMsg}`);
      loadErrors.push(errorMsg);
      // Still mark as "loaded" to prevent infinite retries
      loadedAssets.add(asset.path);
    }
  })();

  loadingPromises.set(asset.path, promise);
  return promise;
}

/**
 * Preload audio file.
 */
async function preloadAudio(path: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    audio.preload = 'auto';
    audio.oncanplaythrough = () => resolve();
    audio.onerror = () => reject(new Error(`Audio failed to load: ${path}`));
    audio.src = path;
  });
}

/**
 * Preload all assets at a priority level.
 */
export async function preloadAssets(
  priority: AssetPriority,
  onProgress?: PreloadProgressCallback
): Promise<void> {
  const assets = getAssetsByPriority(priority);

  if (assets.length === 0) {
    onProgress?.({
      loaded: 0,
      total: 0,
      percent: 100,
      currentAsset: null,
      isComplete: true,
      errors: [],
    });
    return;
  }

  let loaded = 0;

  for (const asset of assets) {
    onProgress?.({
      loaded,
      total: assets.length,
      percent: Math.round((loaded / assets.length) * 100),
      currentAsset: asset.name,
      isComplete: false,
      errors: [...loadErrors],
    });

    await preloadAsset(asset);
    loaded++;
  }

  onProgress?.({
    loaded,
    total: assets.length,
    percent: 100,
    currentAsset: null,
    isComplete: true,
    errors: [...loadErrors],
  });
}

/**
 * Preload multiple priority levels in order.
 */
export async function preloadPriorities(
  priorities: AssetPriority[],
  onProgress?: PreloadProgressCallback
): Promise<void> {
  const allAssets = priorities.flatMap((p) => getAssetsByPriority(p));
  let loaded = 0;

  for (const priority of priorities) {
    const assets = getAssetsByPriority(priority);

    for (const asset of assets) {
      onProgress?.({
        loaded,
        total: allAssets.length,
        percent: Math.round((loaded / allAssets.length) * 100),
        currentAsset: asset.name,
        isComplete: false,
        errors: [...loadErrors],
      });

      await preloadAsset(asset);
      loaded++;
    }
  }

  onProgress?.({
    loaded,
    total: allAssets.length,
    percent: 100,
    currentAsset: null,
    isComplete: true,
    errors: [...loadErrors],
  });
}

/**
 * Preload critical and gameplay assets (typical game start).
 */
export async function preloadEssentials(
  onProgress?: PreloadProgressCallback
): Promise<void> {
  return preloadPriorities(['critical', 'gameplay'], onProgress);
}

/**
 * Clear preload cache (for testing or reset).
 */
export function clearPreloadCache(): void {
  loadedAssets.clear();
  loadingPromises.clear();
  loadErrors.length = 0;
}

/**
 * Get estimated total load time based on sizes.
 * Assumes ~1MB/s for rough estimation.
 */
export function estimateLoadTime(priority: AssetPriority): number {
  const sizeKB = getEstimatedSize(priority);
  return Math.ceil(sizeKB / 1000); // seconds
}
