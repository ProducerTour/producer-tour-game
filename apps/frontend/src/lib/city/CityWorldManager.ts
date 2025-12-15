/**
 * City World Manager
 * Orchestrates chunk loading, LOD management, and procedural city generation
 */

import * as THREE from 'three';
import {
  WORLD_SIZE,
  CHUNK_SIZE,
  MAX_VIEW_DISTANCE,
  LOD_DISTANCES,
  PERFORMANCE_CONFIG,
  DEFAULT_WORLD_SEED,
  type DistrictType,
} from './CityConfig';
import {
  CityLayoutGenerator,
  type CityLayoutData,
  type Plot,
  type RoadSegment,
} from './CityLayout';
import { noiseGenerator } from './NoiseGenerator';
import { getDistrictAtPosition, type DistrictBoundary } from './DistrictTypes';

// Chunk state
export interface ChunkState {
  key: string;
  x: number;
  z: number;
  district: DistrictType;
  lod: 0 | 1 | 2;
  loaded: boolean;
  visible: boolean;
  priority: number;
  lastAccess: number;
  terrainMesh?: THREE.Mesh;
  roadMeshes?: THREE.Group;
  buildingMeshes?: THREE.Group;
}

// Visible chunk data for React components
export interface VisibleChunk {
  key: string;
  x: number;
  z: number;
  district: DistrictType;
  lod: 0 | 1 | 2;
  distance: number;
}

// World state for React
export interface CityWorldState {
  seed: number;
  playerPosition: { x: number; z: number };
  visibleChunks: VisibleChunk[];
  loadedChunkCount: number;
  totalChunkCount: number;
  currentDistrict: DistrictType;
  nearbyPlots: Plot[];
  nearbyRoads: RoadSegment[];
}

/**
 * City World Manager class
 */
export class CityWorldManager {
  private seed: number;
  private layout: CityLayoutData;
  private layoutGenerator: CityLayoutGenerator;
  private chunks: Map<string, ChunkState> = new Map();
  private playerPosition: THREE.Vector3 = new THREE.Vector3();
  private districtBoundaries: DistrictBoundary[];

  // Performance tracking
  private chunkLoadQueue: string[] = [];
  private chunkUnloadQueue: string[] = [];

  // Callbacks for React state updates
  private onStateChange?: (state: CityWorldState) => void;

  constructor(seed: number = DEFAULT_WORLD_SEED) {
    this.seed = seed;
    noiseGenerator.setSeed(seed);

    // Generate city layout
    this.layoutGenerator = new CityLayoutGenerator(seed, WORLD_SIZE);
    this.layout = this.layoutGenerator.generate();
    this.districtBoundaries = this.layout.districts;

    console.log('[CityWorldManager] Initialized with seed:', seed);
    console.log('[CityWorldManager] Layout generated:', {
      plots: this.layout.plots.length,
      roads: this.layout.roads.length,
      blocks: this.layout.blocks.length,
    });
  }

  /**
   * Set callback for state changes
   */
  setOnStateChange(callback: (state: CityWorldState) => void): void {
    this.onStateChange = callback;
  }

  /**
   * Update player position and trigger chunk loading
   */
  updatePlayerPosition(x: number, y: number, z: number): void {
    this.playerPosition.set(x, y, z);
    this.updateVisibleChunks();
  }

  /**
   * Get current world state for React
   */
  getWorldState(): CityWorldState {
    const visibleChunks: VisibleChunk[] = [];
    let loadedCount = 0;

    this.chunks.forEach((chunk) => {
      if (chunk.loaded) loadedCount++;
      if (chunk.visible) {
        const distance = this.getChunkDistance(chunk.x, chunk.z);
        visibleChunks.push({
          key: chunk.key,
          x: chunk.x,
          z: chunk.z,
          district: chunk.district,
          lod: chunk.lod,
          distance,
        });
      }
    });

    // Sort by distance
    visibleChunks.sort((a, b) => a.distance - b.distance);

    const currentDistrict = this.getDistrictAt(
      this.playerPosition.x,
      this.playerPosition.z
    );

    // Get nearby plots (within 2 chunks)
    const nearbyPlots = this.getNearbyPlots(
      this.playerPosition.x,
      this.playerPosition.z,
      CHUNK_SIZE * 2
    );

    // Get nearby roads
    const nearbyRoads = this.getNearbyRoads(
      this.playerPosition.x,
      this.playerPosition.z,
      CHUNK_SIZE * 2
    );

    return {
      seed: this.seed,
      playerPosition: { x: this.playerPosition.x, z: this.playerPosition.z },
      visibleChunks,
      loadedChunkCount: loadedCount,
      totalChunkCount: this.chunks.size,
      currentDistrict,
      nearbyPlots,
      nearbyRoads,
    };
  }

  /**
   * Update which chunks are visible based on player position
   */
  private updateVisibleChunks(): void {
    const playerChunkX = Math.floor(this.playerPosition.x / CHUNK_SIZE);
    const playerChunkZ = Math.floor(this.playerPosition.z / CHUNK_SIZE);

    // Calculate view range in chunks
    const viewRangeChunks = Math.ceil(MAX_VIEW_DISTANCE / CHUNK_SIZE);

    // Determine which chunks should be visible
    const newVisibleChunks = new Set<string>();

    for (let dx = -viewRangeChunks; dx <= viewRangeChunks; dx++) {
      for (let dz = -viewRangeChunks; dz <= viewRangeChunks; dz++) {
        const chunkX = playerChunkX + dx;
        const chunkZ = playerChunkZ + dz;

        // Skip chunks outside world bounds
        const worldX = chunkX * CHUNK_SIZE;
        const worldZ = chunkZ * CHUNK_SIZE;
        if (
          worldX < -WORLD_SIZE / 2 ||
          worldX > WORLD_SIZE / 2 ||
          worldZ < -WORLD_SIZE / 2 ||
          worldZ > WORLD_SIZE / 2
        ) {
          continue;
        }

        const distance = this.getChunkDistance(chunkX, chunkZ);
        if (distance <= MAX_VIEW_DISTANCE) {
          const key = this.getChunkKey(chunkX, chunkZ);
          newVisibleChunks.add(key);

          // Ensure chunk exists
          if (!this.chunks.has(key)) {
            this.createChunk(chunkX, chunkZ);
          }

          // Update chunk state
          const chunk = this.chunks.get(key)!;
          chunk.visible = true;
          chunk.lastAccess = Date.now();
          chunk.priority = this.calculatePriority(distance);
          chunk.lod = this.calculateLOD(distance);

          // Queue for loading if not loaded
          if (!chunk.loaded && !this.chunkLoadQueue.includes(key)) {
            this.chunkLoadQueue.push(key);
          }
        }
      }
    }

    // Mark non-visible chunks
    this.chunks.forEach((chunk, key) => {
      if (!newVisibleChunks.has(key)) {
        chunk.visible = false;

        // Queue for unloading if far enough
        const distance = this.getChunkDistance(chunk.x, chunk.z);
        if (
          distance > PERFORMANCE_CONFIG.CHUNK_UNLOAD_DISTANCE &&
          !this.chunkUnloadQueue.includes(key)
        ) {
          this.chunkUnloadQueue.push(key);
        }
      }
    });

    // Sort load queue by priority
    this.chunkLoadQueue.sort((a, b) => {
      const chunkA = this.chunks.get(a);
      const chunkB = this.chunks.get(b);
      return (chunkB?.priority ?? 0) - (chunkA?.priority ?? 0);
    });

    // Notify state change
    if (this.onStateChange) {
      this.onStateChange(this.getWorldState());
    }
  }

  /**
   * Create a new chunk state
   */
  private createChunk(x: number, z: number): ChunkState {
    const key = this.getChunkKey(x, z);
    const worldX = x * CHUNK_SIZE + CHUNK_SIZE / 2;
    const worldZ = z * CHUNK_SIZE + CHUNK_SIZE / 2;
    const district = this.getDistrictAt(worldX, worldZ);
    const distance = this.getChunkDistance(x, z);

    const chunk: ChunkState = {
      key,
      x,
      z,
      district,
      lod: this.calculateLOD(distance),
      loaded: false,
      visible: false,
      priority: this.calculatePriority(distance),
      lastAccess: Date.now(),
    };

    this.chunks.set(key, chunk);
    return chunk;
  }

  /**
   * Get chunk key from coordinates
   */
  getChunkKey(x: number, z: number): string {
    return `${x},${z}`;
  }

  /**
   * Parse chunk key to coordinates
   */
  parseChunkKey(key: string): { x: number; z: number } {
    const [x, z] = key.split(',').map(Number);
    return { x, z };
  }

  /**
   * Calculate distance from player to chunk center
   */
  private getChunkDistance(chunkX: number, chunkZ: number): number {
    const chunkCenterX = chunkX * CHUNK_SIZE + CHUNK_SIZE / 2;
    const chunkCenterZ = chunkZ * CHUNK_SIZE + CHUNK_SIZE / 2;

    return Math.sqrt(
      Math.pow(chunkCenterX - this.playerPosition.x, 2) +
        Math.pow(chunkCenterZ - this.playerPosition.z, 2)
    );
  }

  /**
   * Calculate LOD level based on distance
   */
  private calculateLOD(distance: number): 0 | 1 | 2 {
    if (distance <= LOD_DISTANCES.LOD0) return 0;
    if (distance <= LOD_DISTANCES.LOD1) return 1;
    return 2;
  }

  /**
   * Calculate loading priority (higher = more important)
   */
  private calculatePriority(distance: number): number {
    // Inverse of distance, with boost for close chunks
    if (distance <= PERFORMANCE_CONFIG.CHUNK_LOAD_PRIORITY_DISTANCE) {
      return 1000 - distance;
    }
    return 500 - distance;
  }

  /**
   * Get district at world position
   */
  getDistrictAt(x: number, z: number): DistrictType {
    return getDistrictAtPosition(x, z, this.districtBoundaries);
  }

  /**
   * Get plots near a position
   */
  getNearbyPlots(x: number, z: number, radius: number): Plot[] {
    return this.layout.plots.filter((plot) => {
      const dx = plot.position.x - x;
      const dz = plot.position.z - z;
      return Math.sqrt(dx * dx + dz * dz) <= radius;
    });
  }

  /**
   * Get roads near a position
   */
  getNearbyRoads(x: number, z: number, radius: number): RoadSegment[] {
    return this.layout.roads.filter((road) => {
      // Check distance to road segment
      const midX = (road.start.x + road.end.x) / 2;
      const midZ = (road.start.z + road.end.z) / 2;
      const dx = midX - x;
      const dz = midZ - z;
      return Math.sqrt(dx * dx + dz * dz) <= radius;
    });
  }

  /**
   * Get plot at exact position
   */
  getPlotAt(x: number, z: number): Plot | null {
    return this.layoutGenerator.getPlotAt(x, z);
  }

  /**
   * Get all plots in a chunk
   */
  getPlotsInChunk(chunkX: number, chunkZ: number): Plot[] {
    return this.layoutGenerator.getPlotsInChunk(chunkX, chunkZ);
  }

  /**
   * Get all roads in a chunk
   */
  getRoadsInChunk(chunkX: number, chunkZ: number): RoadSegment[] {
    return this.layoutGenerator.getRoadsInChunk(chunkX, chunkZ);
  }

  /**
   * Get visible chunk keys
   */
  getVisibleChunkKeys(): string[] {
    const visible: string[] = [];
    this.chunks.forEach((chunk, key) => {
      if (chunk.visible) {
        visible.push(key);
      }
    });
    return visible;
  }

  /**
   * Get chunk state by key
   */
  getChunk(key: string): ChunkState | undefined {
    return this.chunks.get(key);
  }

  /**
   * Mark chunk as loaded
   */
  markChunkLoaded(key: string): void {
    const chunk = this.chunks.get(key);
    if (chunk) {
      chunk.loaded = true;
      // Remove from load queue
      const idx = this.chunkLoadQueue.indexOf(key);
      if (idx !== -1) {
        this.chunkLoadQueue.splice(idx, 1);
      }
    }
  }

  /**
   * Get next chunk to load
   */
  getNextChunkToLoad(): string | null {
    return this.chunkLoadQueue.length > 0 ? this.chunkLoadQueue[0] : null;
  }

  /**
   * Get city layout data
   */
  getLayout(): CityLayoutData {
    return this.layout;
  }

  /**
   * Get terrain height at position
   */
  getTerrainHeight(x: number, z: number): number {
    // Simply return the terrain height at the given position
    return noiseGenerator.getTerrainHeight(x, z, 0);
  }

  /**
   * Get all district boundaries
   */
  getDistrictBoundaries(): DistrictBoundary[] {
    return this.districtBoundaries;
  }

  /**
   * Reset and regenerate with new seed
   */
  regenerate(seed: number): void {
    this.seed = seed;
    noiseGenerator.setSeed(seed);
    this.chunks.clear();
    this.chunkLoadQueue = [];
    this.chunkUnloadQueue = [];

    this.layoutGenerator = new CityLayoutGenerator(seed, WORLD_SIZE);
    this.layout = this.layoutGenerator.generate();
    this.districtBoundaries = this.layout.districts;

    // Re-update visible chunks
    this.updateVisibleChunks();
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.chunks.forEach((chunk) => {
      chunk.terrainMesh?.geometry.dispose();
      chunk.roadMeshes?.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (child.material instanceof THREE.Material) {
            child.material.dispose();
          }
        }
      });
      chunk.buildingMeshes?.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (child.material instanceof THREE.Material) {
            child.material.dispose();
          }
        }
      });
    });
    this.chunks.clear();
  }
}

// Singleton instance
let worldManagerInstance: CityWorldManager | null = null;

export function getCityWorldManager(seed?: number): CityWorldManager {
  if (!worldManagerInstance || (seed !== undefined && seed !== worldManagerInstance['seed'])) {
    worldManagerInstance = new CityWorldManager(seed);
  }
  return worldManagerInstance;
}

export function disposeCityWorldManager(): void {
  if (worldManagerInstance) {
    worldManagerInstance.dispose();
    worldManagerInstance = null;
  }
}
