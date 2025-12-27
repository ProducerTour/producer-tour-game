/**
 * TreeMeshLOD.ts
 * Manages LOD geometry levels for tree meshes
 *
 * Generates and caches simplified geometries for each tree type.
 * Integrates with BillboardLODSystem for distant rendering.
 */

import * as THREE from 'three';
import { getMeshSimplifier } from './MeshSimplifier';
import {
  MeshLODLevel,
  DEFAULT_MESH_LOD_CONFIG,
  type TreeType,
  type MeshLODConfig,
  type LODGeometrySet,
  type TreeMeshLODState,
  type MeshLODResult,
} from './types';

/**
 * TreeMeshLOD manages LOD geometry for tree types
 */
export class TreeMeshLOD {
  private config: MeshLODConfig;

  /** Cached LOD geometries per tree type */
  private geometryCache: Map<TreeType, LODGeometrySet> = new Map();

  /** Material cache per tree type (shared across LOD levels) */
  private materialCache: Map<TreeType, THREE.Material[]> = new Map();

  /** LOD state per instance */
  private lodStates: TreeMeshLODState[] = [];

  /** Camera position for distance calculations */
  private cameraPosition = new THREE.Vector3();

  /** Pending generation promises */
  private generationPromises: Map<TreeType, Promise<LODGeometrySet>> =
    new Map();

  constructor(config?: Partial<MeshLODConfig>) {
    this.config = { ...DEFAULT_MESH_LOD_CONFIG, ...config };
  }

  /**
   * Register original geometry for a tree type and generate LOD levels
   */
  async registerTreeGeometry(
    treeType: TreeType,
    geometry: THREE.BufferGeometry,
    materials?: THREE.Material[]
  ): Promise<LODGeometrySet> {
    // Check if already cached
    if (this.geometryCache.has(treeType)) {
      return this.geometryCache.get(treeType)!;
    }

    // Check if already generating
    if (this.generationPromises.has(treeType)) {
      return this.generationPromises.get(treeType)!;
    }

    // Start generation
    const promise = this.generateLODLevels(treeType, geometry);
    this.generationPromises.set(treeType, promise);

    const result = await promise;
    this.geometryCache.set(treeType, result);
    this.generationPromises.delete(treeType);

    // Cache materials if provided
    if (materials) {
      this.materialCache.set(treeType, materials);
    }

    return result;
  }

  /**
   * Generate LOD levels for a geometry
   */
  private async generateLODLevels(
    treeType: TreeType,
    geometry: THREE.BufferGeometry
  ): Promise<LODGeometrySet> {
    const startTime = performance.now();
    const simplifier = getMeshSimplifier(this.config.debug);

    // LOD0 is the original geometry
    const lod0 = geometry.clone();

    // Generate LOD1 (40% triangles)
    const lod1Result = simplifier.simplify(geometry, {
      targetRatio: this.config.lod1Ratio,
      lockBoundary: true,
      errorThreshold: 0.01,
    });

    // Generate LOD2 (15% triangles)
    const lod2Result = simplifier.simplify(geometry, {
      targetRatio: this.config.lod2Ratio,
      lockBoundary: true,
      errorThreshold: 0.02,
    });

    const endTime = performance.now();

    const result: LODGeometrySet = {
      lod0,
      lod1: lod1Result.geometry,
      lod2: lod2Result.geometry,
      stats: {
        lod0Triangles: lod1Result.originalTriangles,
        lod1Triangles: lod1Result.simplifiedTriangles,
        lod2Triangles: lod2Result.simplifiedTriangles,
        simplificationTimeMs: endTime - startTime,
      },
    };

    if (this.config.debug) {
      console.log(`[TreeMeshLOD] Generated LODs for ${treeType}:`, result.stats);
    }

    return result;
  }

  /**
   * Synchronously register geometry (blocks until LOD generation complete)
   * Use for preloading at startup
   */
  registerTreeGeometrySync(
    treeType: TreeType,
    geometry: THREE.BufferGeometry,
    materials?: THREE.Material[]
  ): LODGeometrySet {
    // Check if already cached
    if (this.geometryCache.has(treeType)) {
      return this.geometryCache.get(treeType)!;
    }

    const startTime = performance.now();
    const simplifier = getMeshSimplifier(this.config.debug);

    // LOD0 is the original geometry
    const lod0 = geometry.clone();

    // Generate LOD1 (40% triangles)
    const lod1Result = simplifier.simplify(geometry, {
      targetRatio: this.config.lod1Ratio,
      lockBoundary: true,
      errorThreshold: 0.01,
    });

    // Generate LOD2 (15% triangles)
    const lod2Result = simplifier.simplify(geometry, {
      targetRatio: this.config.lod2Ratio,
      lockBoundary: true,
      errorThreshold: 0.02,
    });

    const endTime = performance.now();

    const result: LODGeometrySet = {
      lod0,
      lod1: lod1Result.geometry,
      lod2: lod2Result.geometry,
      stats: {
        lod0Triangles: lod1Result.originalTriangles,
        lod1Triangles: lod1Result.simplifiedTriangles,
        lod2Triangles: lod2Result.simplifiedTriangles,
        simplificationTimeMs: endTime - startTime,
      },
    };

    this.geometryCache.set(treeType, result);

    // Cache materials if provided
    if (materials) {
      this.materialCache.set(treeType, materials);
    }

    if (this.config.debug) {
      console.log(`[TreeMeshLOD] Generated LODs for ${treeType}:`, result.stats);
    }

    return result;
  }

  /**
   * Get LOD geometry set for a tree type
   */
  getLODGeometries(treeType: TreeType): LODGeometrySet | null {
    return this.geometryCache.get(treeType) ?? null;
  }

  /**
   * Get geometry for a specific LOD level
   */
  getGeometryForLOD(
    treeType: TreeType,
    level: MeshLODLevel
  ): THREE.BufferGeometry | null {
    const lodSet = this.geometryCache.get(treeType);
    if (!lodSet) return null;

    switch (level) {
      case MeshLODLevel.LOD0:
        return lodSet.lod0;
      case MeshLODLevel.LOD1:
        return lodSet.lod1;
      case MeshLODLevel.LOD2:
        return lodSet.lod2;
      default:
        return null; // Billboard/Culled don't use mesh geometry
    }
  }

  /**
   * Get materials for a tree type
   */
  getMaterials(treeType: TreeType): THREE.Material[] | null {
    return this.materialCache.get(treeType) ?? null;
  }

  /**
   * Register tree positions for LOD calculations
   */
  registerPositions(positions: THREE.Vector3[]): void {
    this.lodStates = positions.map((position, index) => ({
      index,
      meshLOD: MeshLODLevel.LOD0,
      distance: 0,
      position: position.clone(),
    }));
  }

  /**
   * Calculate mesh LOD levels for all registered positions
   */
  calculateLOD(camera: THREE.Camera): MeshLODResult {
    const startTime = performance.now();

    // Get camera position
    camera.getWorldPosition(this.cameraPosition);

    // Result arrays
    const lod0Indices: number[] = [];
    const lod1Indices: number[] = [];
    const lod2Indices: number[] = [];
    const billboardIndices: number[] = [];

    const counts: Record<MeshLODLevel, number> = {
      [MeshLODLevel.LOD0]: 0,
      [MeshLODLevel.LOD1]: 0,
      [MeshLODLevel.LOD2]: 0,
      [MeshLODLevel.Billboard]: 0,
      [MeshLODLevel.Culled]: 0,
    };

    for (const state of this.lodStates) {
      // Calculate distance
      state.distance = state.position.distanceTo(this.cameraPosition);

      // Determine LOD level based on distance
      if (state.distance < this.config.lod0Distance) {
        state.meshLOD = MeshLODLevel.LOD0;
        lod0Indices.push(state.index);
        counts[MeshLODLevel.LOD0]++;
      } else if (state.distance < this.config.lod1Distance) {
        state.meshLOD = MeshLODLevel.LOD1;
        lod1Indices.push(state.index);
        counts[MeshLODLevel.LOD1]++;
      } else if (state.distance < this.config.lod2Distance) {
        state.meshLOD = MeshLODLevel.LOD2;
        lod2Indices.push(state.index);
        counts[MeshLODLevel.LOD2]++;
      } else {
        // Beyond mesh LOD range - billboard or culled
        // (BillboardLODSystem handles this)
        state.meshLOD = MeshLODLevel.Billboard;
        billboardIndices.push(state.index);
        counts[MeshLODLevel.Billboard]++;
      }
    }

    return {
      lod0Indices,
      lod1Indices,
      lod2Indices,
      billboardIndices,
      counts,
      calcTimeMs: performance.now() - startTime,
    };
  }

  /**
   * Get mesh LOD level for a single instance
   */
  getMeshLODLevel(index: number): MeshLODLevel {
    return this.lodStates[index]?.meshLOD ?? MeshLODLevel.LOD0;
  }

  /**
   * Get distance for a single instance
   */
  getDistance(index: number): number {
    return this.lodStates[index]?.distance ?? 0;
  }

  /**
   * Check if LOD geometries are ready for a tree type
   */
  isReady(treeType: TreeType): boolean {
    return this.geometryCache.has(treeType);
  }

  /**
   * Check if all tree types are ready
   */
  isAllReady(treeTypes: TreeType[]): boolean {
    return treeTypes.every((type) => this.isReady(type));
  }

  /**
   * Get statistics for all cached LOD geometries
   */
  getStats(): Record<TreeType, LODGeometrySet['stats']> {
    const stats: Record<string, LODGeometrySet['stats']> = {};
    for (const [type, lodSet] of this.geometryCache) {
      stats[type] = lodSet.stats;
    }
    return stats as Record<TreeType, LODGeometrySet['stats']>;
  }

  /**
   * Get current configuration
   */
  getConfig(): MeshLODConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<MeshLODConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Clear all cached geometries
   */
  clear(): void {
    // Dispose geometries
    for (const lodSet of this.geometryCache.values()) {
      lodSet.lod0.dispose();
      lodSet.lod1.dispose();
      lodSet.lod2.dispose();
    }
    this.geometryCache.clear();
    this.materialCache.clear();
    this.lodStates = [];
  }

  /**
   * Dispose
   */
  dispose(): void {
    this.clear();
    this.generationPromises.clear();
  }
}

/**
 * Singleton instance
 */
let treeMeshLODInstance: TreeMeshLOD | null = null;

/**
 * Get or create the TreeMeshLOD instance
 */
export function getTreeMeshLOD(config?: Partial<MeshLODConfig>): TreeMeshLOD {
  if (!treeMeshLODInstance) {
    treeMeshLODInstance = new TreeMeshLOD(config);
  }
  return treeMeshLODInstance;
}

/**
 * Reset the TreeMeshLOD instance (for testing)
 */
export function resetTreeMeshLOD(): void {
  if (treeMeshLODInstance) {
    treeMeshLODInstance.dispose();
    treeMeshLODInstance = null;
  }
}
