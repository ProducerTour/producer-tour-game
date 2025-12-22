/**
 * AssetManifest.ts
 *
 * Centralized asset manifest with priority-based loading.
 * Assets are grouped by when they're needed:
 *
 * - **critical**: Required before showing anything (player avatar, core textures)
 * - **gameplay**: Needed for core gameplay (weapons, cliffs, NPCs)
 * - **environment**: Visual polish (trees, rocks, skybox)
 * - **optional**: Nice to have, load in background (decorations, particles)
 *
 * Usage:
 * ```tsx
 * // Preload critical assets before rendering world
 * await preloadAssets('critical');
 *
 * // Check if asset is loaded
 * if (isAssetLoaded(getModelPath('weapons/rifle.glb'))) {
 *   // Safe to render rifle
 * }
 * ```
 */

import { getModelPath, getTexturePath, getSkyboxPath, getAudioPath } from '../../config/assetPaths';

// =============================================================================
// TYPES
// =============================================================================

export type AssetPriority = 'critical' | 'gameplay' | 'environment' | 'optional';

export type AssetType = 'model' | 'texture' | 'audio' | 'hdri';

export interface AssetEntry {
  /** Path relative to public folder */
  path: string;
  /** Asset type for appropriate loader */
  type: AssetType;
  /** Human-readable name for loading UI */
  name: string;
  /** Estimated size in KB (for progress estimation) */
  sizeKB?: number;
}

export interface AssetManifest {
  critical: AssetEntry[];
  gameplay: AssetEntry[];
  environment: AssetEntry[];
  optional: AssetEntry[];
}

// =============================================================================
// MANIFEST
// =============================================================================

export const ASSET_MANIFEST: AssetManifest = {
  // Required before world renders
  critical: [
    // Player avatar handled separately via RPM
    {
      path: getTexturePath('terrain/grass.png'),
      type: 'texture',
      name: 'Grass Texture',
      sizeKB: 500,
    },
    {
      path: getTexturePath('terrain/rock.png'),
      type: 'texture',
      name: 'Rock Texture',
      sizeKB: 500,
    },
    {
      path: getTexturePath('terrain/sand.png'),
      type: 'texture',
      name: 'Sand Texture',
      sizeKB: 500,
    },
  ],

  // Core gameplay assets
  gameplay: [
    {
      path: getModelPath('weapons/pistol.glb'),
      type: 'model',
      name: 'Pistol',
      sizeKB: 200,
    },
    {
      path: getModelPath('weapons/rifle.glb'),
      type: 'model',
      name: 'Rifle',
      sizeKB: 300,
    },
    {
      path: getModelPath('Cliffside/alpine_rock.glb'),
      type: 'model',
      name: 'Cliff Mesh',
      sizeKB: 800,
    },
    {
      path: getModelPath('Bandit/bandit.glb'),
      type: 'model',
      name: 'Bandit NPC',
      sizeKB: 1500,
    },
  ],

  // Environmental polish
  environment: [
    {
      path: getModelPath('trees/oak_tree.glb'),
      type: 'model',
      name: 'Oak Tree',
      sizeKB: 400,
    },
    {
      path: getModelPath('trees/palm_tree.glb'),
      type: 'model',
      name: 'Palm Tree',
      sizeKB: 300,
    },
    {
      path: getModelPath('rocks/rock_1.glb'),
      type: 'model',
      name: 'Rock 1',
      sizeKB: 150,
    },
    {
      path: getSkyboxPath('hilly_terrain_4k.jpg'),
      type: 'hdri',
      name: 'HDRI Skybox',
      sizeKB: 4000,
    },
  ],

  // Background loading
  optional: [
    {
      path: getModelPath('campfire/campfire.glb'),
      type: 'model',
      name: 'Campfire',
      sizeKB: 500,
    },
    {
      path: getAudioPath('ambient/wind.mp3'),
      type: 'audio',
      name: 'Wind Ambience',
      sizeKB: 1000,
    },
    {
      path: getAudioPath('sfx/footsteps_grass.mp3'),
      type: 'audio',
      name: 'Footsteps (Grass)',
      sizeKB: 200,
    },
  ],
};

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Get all assets for a priority level.
 */
export function getAssetsByPriority(priority: AssetPriority): AssetEntry[] {
  return ASSET_MANIFEST[priority];
}

/**
 * Get all assets up to and including a priority level.
 * Useful for progressive loading.
 */
export function getAssetsUpTo(priority: AssetPriority): AssetEntry[] {
  const priorities: AssetPriority[] = ['critical', 'gameplay', 'environment', 'optional'];
  const index = priorities.indexOf(priority);

  return priorities
    .slice(0, index + 1)
    .flatMap((p) => ASSET_MANIFEST[p]);
}

/**
 * Get total estimated size for a priority level.
 */
export function getEstimatedSize(priority: AssetPriority): number {
  return ASSET_MANIFEST[priority].reduce((sum, asset) => sum + (asset.sizeKB ?? 100), 0);
}

/**
 * Get all asset paths for a priority level.
 */
export function getAssetPaths(priority: AssetPriority): string[] {
  return ASSET_MANIFEST[priority].map((a) => a.path);
}

/**
 * Find which priority an asset belongs to.
 */
export function getAssetPriority(path: string): AssetPriority | null {
  const priorities: AssetPriority[] = ['critical', 'gameplay', 'environment', 'optional'];

  for (const priority of priorities) {
    if (ASSET_MANIFEST[priority].some((a) => a.path === path)) {
      return priority;
    }
  }

  return null;
}

/**
 * Get asset entry by path.
 */
export function getAssetEntry(path: string): AssetEntry | null {
  const priorities: AssetPriority[] = ['critical', 'gameplay', 'environment', 'optional'];

  for (const priority of priorities) {
    const entry = ASSET_MANIFEST[priority].find((a) => a.path === path);
    if (entry) return entry;
  }

  return null;
}
