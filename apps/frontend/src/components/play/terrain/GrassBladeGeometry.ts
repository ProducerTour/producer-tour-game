/**
 * Grass Blade Geometry Generator
 * SimonDev Quick_Grass style - vertex index based geometry
 *
 * Key concept: Blade shape is computed entirely in the vertex shader
 * Geometry only provides:
 * - vertIndex: vertex index (0 to VERTICES*2 for front + back faces)
 * - Triangle indices for rendering
 *
 * The shader uses vertIndex to compute:
 * - heightPercent: position along blade (0 = base, 1 = tip)
 * - xSide: left (0) or right (1) of blade
 * - zSide: front (+1) or back (-1) face
 */

import * as THREE from 'three';

// SimonDev's exact constants
export const GRASS_SEGMENTS_LOW = 1;
export const GRASS_SEGMENTS_HIGH = 6;
export const GRASS_VERTICES_LOW = (GRASS_SEGMENTS_LOW + 1) * 2;  // 4
export const GRASS_VERTICES_HIGH = (GRASS_SEGMENTS_HIGH + 1) * 2; // 14

// LOD Configuration - matches SimonDev's GRASS_LOD_DIST=15, GRASS_MAX_DIST=100
export const GRASS_LOD_CONFIG = {
  lod0: { maxDistance: 15, segments: GRASS_SEGMENTS_HIGH, bladesPerChunk: 3072 },  // High detail
  lod1: { maxDistance: 100, segments: GRASS_SEGMENTS_LOW, bladesPerChunk: 3072 },   // Low detail
} as const;

export type GrassLODLevel = 0 | 1;

// SimonDev's grass dimensions
export const GRASS_WIDTH = 0.1;
export const GRASS_HEIGHT = 1.5;
export const GRASS_PATCH_SIZE = 10; // 5 * 2

/**
 * Create grass blade geometry using SimonDev's vertIndex approach
 *
 * Geometry structure:
 * - vertIndex attribute: 0 to (VERTICES * 2 - 1)
 *   - First VERTICES indices are front face
 *   - Next VERTICES indices are back face (same positions, flipped normals)
 *
 * In shader, vertex properties are computed as:
 *   vertID = mod(vertIndex, VERTICES)
 *   zSide = -(floor(vertIndex / VERTICES) * 2.0 - 1.0)  // 1 = front, -1 = back
 *   xSide = mod(vertID, 2.0)  // 0 = left, 1 = right
 *   heightPercent = (vertID - xSide) / (SEGMENTS * 2.0)
 */
export function createGrassBladeGeometry(options: { segments?: number } = {}): THREE.BufferGeometry {
  const segments = options.segments ?? GRASS_SEGMENTS_HIGH;
  const VERTICES = (segments + 1) * 2;

  // Generate triangle indices for both front and back faces
  const indices: number[] = [];

  for (let i = 0; i < segments; i++) {
    const vi = i * 2;

    // Front face triangles (first VERTICES worth of indices)
    indices.push(vi + 0, vi + 1, vi + 2);  // Triangle 1
    indices.push(vi + 2, vi + 1, vi + 3);  // Triangle 2

    // Back face triangles (offset by VERTICES, reversed winding)
    const fi = VERTICES + vi;
    indices.push(fi + 2, fi + 1, fi + 0);  // Triangle 1 (reversed)
    indices.push(fi + 3, fi + 1, fi + 2);  // Triangle 2 (reversed)
  }

  // Vertex indices: 0 to (VERTICES * 2 - 1)
  const vertIndex = new Uint8Array(VERTICES * 2);
  for (let i = 0; i < VERTICES * 2; i++) {
    vertIndex[i] = i;
  }

  // Create geometry
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('vertIndex', new THREE.BufferAttribute(vertIndex, 1));
  geometry.setIndex(indices);

  // Set a reasonable bounding sphere for culling
  geometry.boundingSphere = new THREE.Sphere(
    new THREE.Vector3(0, GRASS_HEIGHT / 2, 0),
    GRASS_HEIGHT
  );

  return geometry;
}

/**
 * Cached grass blade geometries for each LOD level
 */
const geometryCache: Map<number, THREE.BufferGeometry> = new Map();

/**
 * Get or create grass blade geometry for a specific segment count
 */
export function getGrassBladeGeometry(
  lod: GrassLODLevel,
  _height?: number // Ignored - height is a shader uniform now
): THREE.BufferGeometry {
  const segments = lod === 0 ? GRASS_SEGMENTS_HIGH : GRASS_SEGMENTS_LOW;

  let geometry = geometryCache.get(segments);
  if (!geometry) {
    geometry = createGrassBladeGeometry({ segments });
    geometryCache.set(segments, geometry);
  }

  return geometry;
}

/**
 * Get the appropriate LOD level based on distance from camera
 */
export function getGrassLODLevel(distance: number): GrassLODLevel {
  if (distance < GRASS_LOD_CONFIG.lod0.maxDistance) return 0;
  return 1;
}

/**
 * Get blade count for a given LOD level
 */
export function getBladesPerChunk(lod: GrassLODLevel): number {
  const config = lod === 0 ? GRASS_LOD_CONFIG.lod0 : GRASS_LOD_CONFIG.lod1;
  return config.bladesPerChunk;
}

/**
 * Get segment count for shader uniforms
 */
export function getSegmentsForLOD(lod: GrassLODLevel): { segments: number; vertices: number } {
  if (lod === 0) {
    return { segments: GRASS_SEGMENTS_HIGH, vertices: GRASS_VERTICES_HIGH };
  }
  return { segments: GRASS_SEGMENTS_LOW, vertices: GRASS_VERTICES_LOW };
}

/**
 * Clear geometry cache (call on unmount or when config changes)
 */
export function clearGrassGeometryCache(): void {
  geometryCache.forEach((geometry) => geometry.dispose());
  geometryCache.clear();
}

export default {
  createGrassBladeGeometry,
  getGrassBladeGeometry,
  getGrassLODLevel,
  getBladesPerChunk,
  getSegmentsForLOD,
  clearGrassGeometryCache,
  GRASS_LOD_CONFIG,
  GRASS_WIDTH,
  GRASS_HEIGHT,
  GRASS_PATCH_SIZE,
  GRASS_SEGMENTS_LOW,
  GRASS_SEGMENTS_HIGH,
  GRASS_VERTICES_LOW,
  GRASS_VERTICES_HIGH,
};
