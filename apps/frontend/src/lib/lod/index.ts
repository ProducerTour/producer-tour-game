/**
 * LOD System
 *
 * Runtime mesh level-of-detail management for Three.js/React Three Fiber
 *
 * Features:
 * - Runtime mesh simplification using quadric error metrics
 * - 3-tier LOD for tree meshes (LOD0: full, LOD1: 40%, LOD2: 15%)
 * - Integrates with BillboardLODSystem for distant rendering
 * - Geometry caching to avoid re-simplification
 *
 * Usage:
 * ```tsx
 * import { getTreeMeshLOD, MeshLODLevel } from '@/lib/lod';
 *
 * // Register tree geometry
 * const lodManager = getTreeMeshLOD();
 * lodManager.registerTreeGeometrySync('deciduous', geometry, materials);
 *
 * // Get LOD geometry for rendering
 * const lodGeometry = lodManager.getGeometryForLOD('deciduous', MeshLODLevel.LOD1);
 * ```
 */

// Types
export type {
  MeshLODConfig,
  SimplifiedGeometry,
  LODGeometrySet,
  TreeType,
  TreeMeshLODState,
  MeshLODResult,
  SimplifyOptions,
} from './types';

// Enums and constants
export {
  MeshLODLevel,
  DEFAULT_MESH_LOD_CONFIG,
  DEFAULT_SIMPLIFY_OPTIONS,
} from './types';

// Classes
export {
  MeshSimplifier,
  getMeshSimplifier,
  resetMeshSimplifier,
} from './MeshSimplifier';

export {
  TreeMeshLOD,
  getTreeMeshLOD,
  resetTreeMeshLOD,
} from './TreeMeshLOD';
