/**
 * Centralized Asset Paths Configuration
 *
 * Single source of truth for all DEV vs PRODUCTION asset URL switching.
 * In development: assets load from local public/ folder
 * In production: assets load from Cloudflare R2 CDN
 *
 * Usage:
 *   import { ASSETS_BASE, getAnimationPath, getModelPath } from '@/config/assetPaths';
 *
 *   // For animations:
 *   const idleUrl = getAnimationPath('idle.glb');
 *
 *   // For models:
 *   const rifleUrl = getModelPath('weapons/ak47.gltf');
 *
 *   // For other assets:
 *   const textureUrl = `${ASSETS_BASE}/textures/floor.png`;
 */

/**
 * Base URL for all assets.
 * Uses VITE_ASSETS_URL (Cloudflare R2 CDN) when set, otherwise falls back to local.
 * This allows both dev and prod to use the CDN, while still supporting local assets
 * if you explicitly want to test with files in public/
 */
export const ASSETS_BASE = import.meta.env.VITE_ASSETS_URL || '';

/**
 * Check if we're in development mode
 */
export const IS_DEV = import.meta.env.DEV;

/**
 * Check if animations should load from local public/animations/ folder
 * Set VITE_ANIMATIONS_LOCAL=true in .env to test local animation files
 */
export const ANIMATIONS_LOCAL = import.meta.env.VITE_ANIMATIONS_LOCAL === 'true';

/**
 * Get the full path for an animation file
 * @param filename - Animation filename (e.g., 'idle.glb', 'crouch_walk.glb')
 */
export function getAnimationPath(filename: string): string {
  // Use local path if VITE_ANIMATIONS_LOCAL=true, otherwise use CDN
  const base = ANIMATIONS_LOCAL ? '' : ASSETS_BASE;
  return `${base}/animations/${filename}`;
}

/**
 * Get the full path for a model file
 * @param path - Model path relative to /models/ (e.g., 'weapons/ak47.gltf', 'Monkey/Monkey.glb')
 */
export function getModelPath(path: string): string {
  return `${ASSETS_BASE}/models/${path}`;
}

/**
 * Get the full path for a texture file
 * @param path - Texture path relative to /textures/ (e.g., 'floor.png')
 */
export function getTexturePath(path: string): string {
  return `${ASSETS_BASE}/textures/${path}`;
}

/**
 * Get the full path for a skybox file
 * @param filename - Skybox filename (e.g., 'hilly_terrain_4k.jpg')
 */
export function getSkyboxPath(filename: string): string {
  return `${ASSETS_BASE}/skybox/${filename}`;
}

/**
 * Get the full path for an audio file
 * @param path - Audio path relative to /audio/ (e.g., 'sfx/weapons/ak47/AK-47_fire.wav')
 */
export function getAudioPath(path: string): string {
  return `${ASSETS_BASE}/audio/${path}`;
}

/**
 * Get the full path for any asset
 * @param path - Asset path starting with / (e.g., '/models/foo.glb')
 */
export function getAssetPath(path: string): string {
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${ASSETS_BASE}${normalizedPath}`;
}
