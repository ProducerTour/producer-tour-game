/**
 * LOD System Types
 * Type definitions for mesh level-of-detail management
 */

import type * as THREE from 'three';

/**
 * LOD level enum for tree meshes
 */
export enum MeshLODLevel {
  /** Full detail - original geometry */
  LOD0 = 0,
  /** Medium detail - 40% triangles */
  LOD1 = 1,
  /** Low detail - 15% triangles */
  LOD2 = 2,
  /** Billboard - 2D sprite (handled by BillboardLODSystem) */
  Billboard = 3,
  /** Culled - not rendered */
  Culled = 4,
}

/**
 * Configuration for mesh LOD system
 */
export interface MeshLODConfig {
  /** Distance threshold for LOD0 (full detail) */
  lod0Distance: number;
  /** Distance threshold for LOD1 (medium detail) */
  lod1Distance: number;
  /** Distance threshold for LOD2 (low detail) */
  lod2Distance: number;
  /** Distance where billboard takes over (from BillboardLODSystem) */
  billboardDistance: number;
  /** Triangle ratio for LOD1 (0-1) */
  lod1Ratio: number;
  /** Triangle ratio for LOD2 (0-1) */
  lod2Ratio: number;
  /** Enable debug logging */
  debug: boolean;
}

/**
 * Default mesh LOD configuration
 */
export const DEFAULT_MESH_LOD_CONFIG: MeshLODConfig = {
  lod0Distance: 30,
  lod1Distance: 60,
  lod2Distance: 100,
  billboardDistance: 100, // Matches BillboardLODSystem crossfadeStart
  lod1Ratio: 0.4,
  lod2Ratio: 0.15,
  debug: false,
};

/**
 * Simplified geometry data for a single LOD level
 */
export interface SimplifiedGeometry {
  /** The simplified BufferGeometry */
  geometry: THREE.BufferGeometry;
  /** Original triangle count */
  originalTriangles: number;
  /** Simplified triangle count */
  simplifiedTriangles: number;
  /** Reduction ratio achieved */
  reductionRatio: number;
}

/**
 * LOD geometry set for a single mesh
 */
export interface LODGeometrySet {
  /** Original geometry (LOD0) */
  lod0: THREE.BufferGeometry;
  /** Medium detail geometry (LOD1) */
  lod1: THREE.BufferGeometry;
  /** Low detail geometry (LOD2) */
  lod2: THREE.BufferGeometry;
  /** Statistics about simplification */
  stats: {
    lod0Triangles: number;
    lod1Triangles: number;
    lod2Triangles: number;
    simplificationTimeMs: number;
  };
}

/**
 * Tree type identifier
 */
export type TreeType = 'deciduous' | 'conifer' | 'tropical';

/**
 * LOD state for a single tree instance
 */
export interface TreeMeshLODState {
  /** Instance index */
  index: number;
  /** Current mesh LOD level */
  meshLOD: MeshLODLevel;
  /** Distance from camera */
  distance: number;
  /** World position */
  position: THREE.Vector3;
}

/**
 * Result of mesh LOD calculation
 */
export interface MeshLODResult {
  /** Indices at LOD0 (full detail) */
  lod0Indices: number[];
  /** Indices at LOD1 (medium detail) */
  lod1Indices: number[];
  /** Indices at LOD2 (low detail) */
  lod2Indices: number[];
  /** Indices transitioning to billboard */
  billboardIndices: number[];
  /** Count of instances at each level */
  counts: Record<MeshLODLevel, number>;
  /** Time taken for LOD calculation (ms) */
  calcTimeMs: number;
}

/**
 * Mesh simplification options
 */
export interface SimplifyOptions {
  /** Target ratio of triangles to keep (0-1) */
  targetRatio: number;
  /** Lock boundary edges to prevent mesh artifacts */
  lockBoundary: boolean;
  /** Error threshold for simplification quality */
  errorThreshold: number;
}

/**
 * Default simplification options
 */
export const DEFAULT_SIMPLIFY_OPTIONS: SimplifyOptions = {
  targetRatio: 0.5,
  lockBoundary: true,
  errorThreshold: 0.01,
};
