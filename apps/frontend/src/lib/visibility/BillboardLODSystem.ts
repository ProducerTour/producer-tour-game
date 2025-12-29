/**
 * BillboardLODSystem.ts
 * Manages LOD transitions between 3D trees and billboard sprites
 *
 * Distance thresholds (with mesh LOD):
 * - 0-30m: Full 3D mesh (LOD0 - 1000 tris)
 * - 30-60m: Medium 3D mesh (LOD1 - 400 tris)
 * - 60-100m: Low 3D mesh (LOD2 - 150 tris)
 * - 100-150m: Crossfade (LOD2 → billboard)
 * - 150-500m: Billboard only
 * - 500m+: Culled entirely
 */

import * as THREE from 'three';

/**
 * LOD level for trees (includes mesh LOD stages)
 */
export enum TreeLODLevel {
  /** Full detail 3D mesh (LOD0) */
  Full3D = 0,
  /** Medium detail 3D mesh (LOD1) */
  MeshLOD1 = 1,
  /** Low detail 3D mesh (LOD2) */
  MeshLOD2 = 2,
  /** Crossfading between 3D and billboard */
  Crossfade = 3,
  /** Billboard sprite only */
  Billboard = 4,
  /** Culled (too far) */
  Culled = 5,
}

/**
 * Configuration for billboard LOD system
 */
export interface BillboardLODConfig {
  /** Distance threshold for LOD0 → LOD1 transition */
  meshLOD1Distance: number;
  /** Distance threshold for LOD1 → LOD2 transition */
  meshLOD2Distance: number;
  /** Distance where crossfade starts (3D to billboard) */
  crossfadeStart: number;
  /** Distance where crossfade ends (full billboard) */
  crossfadeEnd: number;
  /** Distance where billboards are culled */
  cullDistance: number;
  /** Enable crossfade animation */
  enableCrossfade: boolean;
  /** Billboard scale multiplier */
  billboardScale: number;
  /** Enable mesh LOD (if false, use full 3D until crossfade) */
  enableMeshLOD: boolean;
}

/**
 * Default configuration
 */
export const DEFAULT_BILLBOARD_LOD_CONFIG: BillboardLODConfig = {
  meshLOD1Distance: 30,
  meshLOD2Distance: 60,
  crossfadeStart: 100,
  crossfadeEnd: 150,
  cullDistance: 500,
  enableCrossfade: true,
  billboardScale: 1.0,
  enableMeshLOD: true,
};

/**
 * LOD state for a single tree instance
 */
export interface TreeLODState {
  /** Instance index */
  index: number;
  /** Current LOD level */
  lodLevel: TreeLODLevel;
  /** Distance from camera */
  distance: number;
  /** Crossfade alpha (0 = full 3D, 1 = full billboard) */
  crossfadeAlpha: number;
  /** World position */
  position: THREE.Vector3;
}

/**
 * Result of LOD calculation
 */
export interface LODResult {
  /** Indices of instances at LOD0 (full 3D) */
  full3DIndices: number[];
  /** Indices of instances at LOD1 (medium 3D) */
  meshLOD1Indices: number[];
  /** Indices of instances at LOD2 (low 3D) */
  meshLOD2Indices: number[];
  /** Indices of instances in crossfade zone (render both) */
  crossfadeIndices: number[];
  /** Crossfade alpha values for crossfade instances */
  crossfadeAlphas: Float32Array;
  /** Indices of instances that should render as billboards */
  billboardIndices: number[];
  /** Count of culled instances */
  culledCount: number;
  /** Time taken for LOD calculation (ms) */
  calcTimeMs: number;
}

/**
 * BillboardLODSystem manages LOD transitions for trees
 */
export class BillboardLODSystem {
  private config: BillboardLODConfig;

  /** Registered tree positions */
  private positions: THREE.Vector3[] = [];

  /** LOD state per instance */
  private lodStates: TreeLODState[] = [];

  /** Camera position for distance calculations */
  private cameraPosition = new THREE.Vector3();

  /** Reusable result arrays */
  private full3DIndices: number[] = [];
  private meshLOD1Indices: number[] = [];
  private meshLOD2Indices: number[] = [];
  private crossfadeIndices: number[] = [];
  private crossfadeAlphas: Float32Array = new Float32Array(0);
  private billboardIndices: number[] = [];

  constructor(config?: Partial<BillboardLODConfig>) {
    this.config = { ...DEFAULT_BILLBOARD_LOD_CONFIG, ...config };
  }

  /**
   * Register tree positions for LOD management
   */
  registerTrees(positions: THREE.Vector3[]): void {
    this.positions = positions.map((p) => p.clone());
    this.lodStates = positions.map((position, index) => ({
      index,
      lodLevel: TreeLODLevel.Full3D,
      distance: 0,
      crossfadeAlpha: 0,
      position: position.clone(),
    }));
    this.crossfadeAlphas = new Float32Array(positions.length);
  }

  /**
   * Register trees from an InstancedMesh
   */
  registerFromMesh(mesh: THREE.InstancedMesh): void {
    const positions: THREE.Vector3[] = [];
    const matrix = new THREE.Matrix4();

    for (let i = 0; i < mesh.count; i++) {
      mesh.getMatrixAt(i, matrix);
      const position = new THREE.Vector3();
      matrix.decompose(position, new THREE.Quaternion(), new THREE.Vector3());
      positions.push(position);
    }

    this.registerTrees(positions);
  }

  /**
   * Calculate LOD levels for all trees
   */
  calculateLOD(camera: THREE.Camera): LODResult {
    const startTime = performance.now();

    // Get camera position
    camera.getWorldPosition(this.cameraPosition);

    // Clear result arrays
    this.full3DIndices.length = 0;
    this.meshLOD1Indices.length = 0;
    this.meshLOD2Indices.length = 0;
    this.crossfadeIndices.length = 0;
    this.billboardIndices.length = 0;
    let culledCount = 0;

    const useMeshLOD = this.config.enableMeshLOD;

    for (const state of this.lodStates) {
      // Calculate distance
      state.distance = state.position.distanceTo(this.cameraPosition);

      // Determine LOD level with mesh LOD stages
      if (useMeshLOD && state.distance < this.config.meshLOD1Distance) {
        // LOD0 - Full 3D mesh
        state.lodLevel = TreeLODLevel.Full3D;
        state.crossfadeAlpha = 0;
        this.full3DIndices.push(state.index);
      } else if (useMeshLOD && state.distance < this.config.meshLOD2Distance) {
        // LOD1 - Medium 3D mesh
        state.lodLevel = TreeLODLevel.MeshLOD1;
        state.crossfadeAlpha = 0;
        this.meshLOD1Indices.push(state.index);
      } else if (state.distance < this.config.crossfadeStart) {
        // LOD2 - Low 3D mesh (or Full3D if mesh LOD disabled)
        state.lodLevel = useMeshLOD ? TreeLODLevel.MeshLOD2 : TreeLODLevel.Full3D;
        state.crossfadeAlpha = 0;
        if (useMeshLOD) {
          this.meshLOD2Indices.push(state.index);
        } else {
          this.full3DIndices.push(state.index);
        }
      } else if (state.distance < this.config.crossfadeEnd) {
        // Crossfade zone
        state.lodLevel = TreeLODLevel.Crossfade;
        state.crossfadeAlpha =
          (state.distance - this.config.crossfadeStart) /
          (this.config.crossfadeEnd - this.config.crossfadeStart);
        this.crossfadeIndices.push(state.index);
        this.crossfadeAlphas[state.index] = state.crossfadeAlpha;
      } else if (state.distance < this.config.cullDistance) {
        // Billboard
        state.lodLevel = TreeLODLevel.Billboard;
        state.crossfadeAlpha = 1;
        this.billboardIndices.push(state.index);
      } else {
        // Culled
        state.lodLevel = TreeLODLevel.Culled;
        state.crossfadeAlpha = 1;
        culledCount++;
      }
    }

    return {
      full3DIndices: this.full3DIndices,
      meshLOD1Indices: this.meshLOD1Indices,
      meshLOD2Indices: this.meshLOD2Indices,
      crossfadeIndices: this.crossfadeIndices,
      crossfadeAlphas: this.crossfadeAlphas,
      billboardIndices: this.billboardIndices,
      culledCount,
      calcTimeMs: performance.now() - startTime,
    };
  }

  /**
   * Get LOD level for a single instance
   */
  getLODLevel(index: number): TreeLODLevel {
    return this.lodStates[index]?.lodLevel ?? TreeLODLevel.Full3D;
  }

  /**
   * Get crossfade alpha for a single instance
   */
  getCrossfadeAlpha(index: number): number {
    return this.lodStates[index]?.crossfadeAlpha ?? 0;
  }

  /**
   * Get all instances at a specific LOD level
   */
  getInstancesAtLOD(level: TreeLODLevel): number[] {
    return this.lodStates
      .filter((s) => s.lodLevel === level)
      .map((s) => s.index);
  }

  /**
   * Get count of instances at each LOD level
   */
  getLODCounts(): Record<TreeLODLevel, number> {
    const counts = {
      [TreeLODLevel.Full3D]: 0,
      [TreeLODLevel.MeshLOD1]: 0,
      [TreeLODLevel.MeshLOD2]: 0,
      [TreeLODLevel.Crossfade]: 0,
      [TreeLODLevel.Billboard]: 0,
      [TreeLODLevel.Culled]: 0,
    };

    for (const state of this.lodStates) {
      counts[state.lodLevel]++;
    }

    return counts;
  }

  /**
   * Get instance count
   */
  getInstanceCount(): number {
    return this.positions.length;
  }

  /**
   * Get configuration
   */
  getConfig(): BillboardLODConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<BillboardLODConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.positions = [];
    this.lodStates = [];
    this.full3DIndices = [];
    this.meshLOD1Indices = [];
    this.meshLOD2Indices = [];
    this.crossfadeIndices = [];
    this.billboardIndices = [];
    this.crossfadeAlphas = new Float32Array(0);
  }

  /**
   * Dispose
   */
  dispose(): void {
    this.clear();
  }
}
