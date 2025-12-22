/**
 * Three.js Layers Configuration
 *
 * Layers are used for selective rendering and raycasting.
 * Objects can be assigned to layers, and cameras/raycasters can selectively
 * enable/disable which layers they interact with.
 *
 * PERFORMANCE: Using layers for raycasting is more efficient than
 * filtering in JavaScript after the raycast completes.
 *
 * Three.js supports 32 layers (0-31). Layer 0 is the default.
 */

// Layer indices
export const LAYERS = {
  /** Default layer - all objects start here */
  DEFAULT: 0,

  /** Vegetation layer - grass, trees, bushes (excluded from camera collision) */
  VEGETATION: 1,

  /** Interactive objects - NPCs, items, doors (included in gameplay raycasts) */
  INTERACTIVE: 2,

  /** Player layer - for excluding player from certain raycasts */
  PLAYER: 3,

  /** Terrain layer - ground, rocks, cliffs */
  TERRAIN: 4,

  /** UI layer - for world-space UI elements */
  UI: 5,
} as const;

export type LayerName = keyof typeof LAYERS;

/**
 * Helper to create a layer mask for raycaster.layers
 * Example: createLayerMask(['DEFAULT', 'TERRAIN', 'INTERACTIVE'])
 */
export function createLayerMask(layerNames: LayerName[]): number {
  let mask = 0;
  for (const name of layerNames) {
    mask |= (1 << LAYERS[name]);
  }
  return mask;
}

/**
 * Apply a layer to an Object3D and all its children
 */
export function setObjectLayer(object: THREE.Object3D, layer: number): void {
  object.layers.set(layer);
  object.traverse((child) => {
    child.layers.set(layer);
  });
}

/**
 * Enable multiple layers on an Object3D
 */
export function enableObjectLayers(object: THREE.Object3D, layers: number[]): void {
  layers.forEach((layer) => {
    object.layers.enable(layer);
    object.traverse((child) => {
      child.layers.enable(layer);
    });
  });
}

// Import THREE for type reference (used in JSDoc)
import type * as THREE from 'three';
