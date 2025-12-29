/**
 * Assets module barrel export
 *
 * Asset pipeline with manifest and preloading.
 */

// Manifest
export {
  ASSET_MANIFEST,
  getAssetsByPriority,
  getAssetsUpTo,
  getEstimatedSize,
  getAssetPaths,
  getAssetPriority,
  getAssetEntry,
  type AssetPriority,
  type AssetType,
  type AssetEntry,
  type AssetManifest,
} from './AssetManifest';

// Preloader
export {
  preloadAssets,
  preloadPriorities,
  preloadEssentials,
  isAssetLoaded,
  isPriorityLoaded,
  getPreloadProgress,
  clearPreloadCache,
  estimateLoadTime,
  type PreloadProgress,
  type PreloadProgressCallback,
} from './AssetPreloader';

// React hooks
export {
  usePreloadPriority,
  usePreloadEssentials,
  useIsAssetLoaded,
  useIsPriorityLoaded,
  useAssetCount,
} from './useAssetPreloader';
