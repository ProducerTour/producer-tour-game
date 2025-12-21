/**
 * ChunkManager.ts
 * Manages terrain chunk lifecycle: loading, unloading, LOD transitions
 * Following Rust architecture: distance-based streaming
 */

import {
  CHUNK_SIZE,
  CHUNK_LOAD_RADIUS,
  CHUNK_UNLOAD_RADIUS,
  MAX_CHUNK_LOADS_PER_FRAME,
  CHUNKS_PER_AXIS,
  ChunkState,
  LODLevel,
  worldToChunk,
  chunkToWorld,
  distanceToChunk,
  getLODLevel,
  WORLD_BOUNDARY,
  type ChunkCoord,
} from './TerrainConfig';

import { HeightmapGenerator, type ChunkHeightmap } from './HeightmapGenerator';

// =============================================================================
// CHUNK DATA TYPES
// =============================================================================

/**
 * Complete chunk data including geometry
 */
export interface ChunkData {
  /** Grid coordinates */
  coord: ChunkCoord;

  /** Current state */
  state: ChunkState;

  /** Current LOD level */
  lod: LODLevel;

  /** Distance from player (updated each frame) */
  distance: number;

  /** Heightmap data */
  heightmap: ChunkHeightmap | null;

  /** Vertex positions (x, y, z interleaved) */
  vertices: Float32Array | null;

  /** Vertex normals */
  normals: Float32Array | null;

  /** UV coordinates */
  uvs: Float32Array | null;

  /** Triangle indices */
  indices: Uint32Array | null;

  /** Last frame this chunk was accessed */
  lastAccess: number;

  /** Priority for loading (lower = higher priority) */
  priority: number;
}

/**
 * Chunk update event for React components
 */
export interface ChunkUpdate {
  type: 'load' | 'unload' | 'lod';
  coord: ChunkCoord;
  data?: ChunkData;
}

// =============================================================================
// CHUNK MANAGER CLASS
// =============================================================================

export class ChunkManager {
  private heightmapGen: HeightmapGenerator;
  private chunks: Map<string, ChunkData> = new Map();
  private loadQueue: ChunkCoord[] = [];
  private frameCount = 0;

  // Callbacks for React integration
  private onChunkLoad?: (chunk: ChunkData) => void;
  private onChunkUnload?: (coord: ChunkCoord) => void;
  private onChunkLODChange?: (chunk: ChunkData) => void;

  constructor(heightmapGen?: HeightmapGenerator) {
    this.heightmapGen = heightmapGen || new HeightmapGenerator();
  }

  // ===========================================================================
  // EVENT CALLBACKS
  // ===========================================================================

  setOnChunkLoad(callback: (chunk: ChunkData) => void): void {
    this.onChunkLoad = callback;
  }

  setOnChunkUnload(callback: (coord: ChunkCoord) => void): void {
    this.onChunkUnload = callback;
  }

  setOnChunkLODChange(callback: (chunk: ChunkData) => void): void {
    this.onChunkLODChange = callback;
  }

  // ===========================================================================
  // CORE UPDATE LOOP
  // ===========================================================================

  /**
   * Update chunks based on player position
   * Call this every frame
   */
  update(playerX: number, playerZ: number): ChunkUpdate[] {
    this.frameCount++;
    const updates: ChunkUpdate[] = [];

    // Calculate which chunks should be loaded
    const chunksToLoad = this.getChunksInRadius(playerX, playerZ, CHUNK_LOAD_RADIUS);

    // Update distances and priorities for all chunks
    for (const chunk of this.chunks.values()) {
      chunk.distance = distanceToChunk(playerX, playerZ, chunk.coord.x, chunk.coord.z);
      chunk.priority = chunk.distance;
    }

    // Mark chunks for loading
    for (const coord of chunksToLoad) {
      const key = this.coordKey(coord);
      if (!this.chunks.has(key)) {
        this.queueChunkLoad(coord, playerX, playerZ);
      }
    }

    // Process load queue (limited per frame)
    const loaded = this.processLoadQueue(MAX_CHUNK_LOADS_PER_FRAME);
    for (const chunk of loaded) {
      updates.push({ type: 'load', coord: chunk.coord, data: chunk });
    }

    // Check for chunks to unload
    const unloaded = this.unloadDistantChunks(playerX, playerZ);
    for (const coord of unloaded) {
      updates.push({ type: 'unload', coord });
    }

    // Check for LOD changes
    const lodChanges = this.updateLODs(playerX, playerZ);
    for (const chunk of lodChanges) {
      updates.push({ type: 'lod', coord: chunk.coord, data: chunk });
    }

    return updates;
  }

  // ===========================================================================
  // CHUNK LOADING
  // ===========================================================================

  /**
   * Queue a chunk for loading
   */
  private queueChunkLoad(coord: ChunkCoord, playerX: number, playerZ: number): void {
    // Check bounds
    if (coord.x < 0 || coord.x >= CHUNKS_PER_AXIS || coord.z < 0 || coord.z >= CHUNKS_PER_AXIS) {
      return;
    }

    const key = this.coordKey(coord);
    if (this.chunks.has(key)) return;

    // Create placeholder chunk
    const distance = distanceToChunk(playerX, playerZ, coord.x, coord.z);
    const chunk: ChunkData = {
      coord,
      state: ChunkState.Loading,
      lod: getLODLevel(distance),
      distance,
      heightmap: null,
      vertices: null,
      normals: null,
      uvs: null,
      indices: null,
      lastAccess: this.frameCount,
      priority: distance,
    };

    this.chunks.set(key, chunk);

    // Insert into queue sorted by priority
    const insertIdx = this.loadQueue.findIndex(
      (c) => distanceToChunk(playerX, playerZ, c.x, c.z) > distance
    );
    if (insertIdx === -1) {
      this.loadQueue.push(coord);
    } else {
      this.loadQueue.splice(insertIdx, 0, coord);
    }
  }

  /**
   * Process the load queue
   */
  private processLoadQueue(maxLoads: number): ChunkData[] {
    const loaded: ChunkData[] = [];

    for (let i = 0; i < maxLoads && this.loadQueue.length > 0; i++) {
      const coord = this.loadQueue.shift()!;
      const key = this.coordKey(coord);
      const chunk = this.chunks.get(key);

      if (chunk && chunk.state === ChunkState.Loading) {
        this.loadChunk(chunk);
        loaded.push(chunk);
        this.onChunkLoad?.(chunk);
      }
    }

    return loaded;
  }

  /**
   * Load chunk geometry data
   */
  private loadChunk(chunk: ChunkData): void {
    const { coord, lod } = chunk;

    // Generate heightmap
    chunk.heightmap = this.heightmapGen.generateChunkHeightmap(coord.x, coord.z, lod);

    // Generate geometry
    chunk.vertices = this.heightmapGen.generateChunkVertices(coord.x, coord.z, lod);
    chunk.normals = this.heightmapGen.generateChunkNormals(coord.x, coord.z, lod);
    chunk.uvs = this.heightmapGen.generateChunkUVs(lod);
    chunk.indices = this.heightmapGen.generateChunkIndices(lod);

    chunk.state = ChunkState.Active;
    chunk.lastAccess = this.frameCount;
  }

  // ===========================================================================
  // CHUNK UNLOADING
  // ===========================================================================

  /**
   * Unload chunks beyond the unload radius
   */
  private unloadDistantChunks(_playerX: number, _playerZ: number): ChunkCoord[] {
    const unloaded: ChunkCoord[] = [];

    for (const [key, chunk] of this.chunks.entries()) {
      if (chunk.distance > CHUNK_UNLOAD_RADIUS) {
        this.chunks.delete(key);
        unloaded.push(chunk.coord);
        this.onChunkUnload?.(chunk.coord);
      }
    }

    return unloaded;
  }

  // ===========================================================================
  // LOD MANAGEMENT
  // ===========================================================================

  /**
   * Update LOD levels for active chunks
   */
  private updateLODs(_playerX: number, _playerZ: number): ChunkData[] {
    const changed: ChunkData[] = [];

    for (const chunk of this.chunks.values()) {
      if (chunk.state !== ChunkState.Active) continue;

      const newLOD = getLODLevel(chunk.distance);
      if (newLOD !== chunk.lod) {
        this.regenerateChunkLOD(chunk, newLOD);
        changed.push(chunk);
        this.onChunkLODChange?.(chunk);
      }
    }

    return changed;
  }

  /**
   * Regenerate chunk geometry at new LOD
   */
  private regenerateChunkLOD(chunk: ChunkData, newLOD: LODLevel): void {
    chunk.lod = newLOD;
    chunk.heightmap = this.heightmapGen.generateChunkHeightmap(chunk.coord.x, chunk.coord.z, newLOD);
    chunk.vertices = this.heightmapGen.generateChunkVertices(chunk.coord.x, chunk.coord.z, newLOD);
    chunk.normals = this.heightmapGen.generateChunkNormals(chunk.coord.x, chunk.coord.z, newLOD);
    chunk.uvs = this.heightmapGen.generateChunkUVs(newLOD);
    chunk.indices = this.heightmapGen.generateChunkIndices(newLOD);
    chunk.lastAccess = this.frameCount;
  }

  // ===========================================================================
  // UTILITY
  // ===========================================================================

  /**
   * Get chunks within a radius of a position
   */
  private getChunksInRadius(worldX: number, worldZ: number, radius: number): ChunkCoord[] {
    const coords: ChunkCoord[] = [];
    const centerChunk = worldToChunk(worldX, worldZ);
    const chunkRadius = Math.ceil(radius / CHUNK_SIZE) + 1;

    for (let dz = -chunkRadius; dz <= chunkRadius; dz++) {
      for (let dx = -chunkRadius; dx <= chunkRadius; dx++) {
        const x = centerChunk.x + dx;
        const z = centerChunk.z + dz;

        // Check bounds
        if (x < 0 || x >= CHUNKS_PER_AXIS || z < 0 || z >= CHUNKS_PER_AXIS) {
          continue;
        }

        // Skip chunks beyond world boundary
        const chunkCenter = chunkToWorld(x, z);
        const chunkDistFromOrigin = Math.hypot(chunkCenter.x, chunkCenter.z);
        if (chunkDistFromOrigin > WORLD_BOUNDARY) {
          continue;
        }

        // Check actual distance from player
        const dist = distanceToChunk(worldX, worldZ, x, z);
        if (dist <= radius) {
          coords.push({ x, z });
        }
      }
    }

    // Sort by distance
    coords.sort((a, b) => {
      const distA = distanceToChunk(worldX, worldZ, a.x, a.z);
      const distB = distanceToChunk(worldX, worldZ, b.x, b.z);
      return distA - distB;
    });

    return coords;
  }

  /**
   * Create a unique key for a chunk coordinate
   */
  private coordKey(coord: ChunkCoord): string {
    return `${coord.x},${coord.z}`;
  }

  /**
   * Get chunk at coordinate (may be null if not loaded)
   */
  getChunk(chunkX: number, chunkZ: number): ChunkData | null {
    return this.chunks.get(`${chunkX},${chunkZ}`) || null;
  }

  /**
   * Get all active chunks
   */
  getActiveChunks(): ChunkData[] {
    return Array.from(this.chunks.values()).filter(
      (chunk) => chunk.state === ChunkState.Active
    );
  }

  /**
   * Get chunk count
   */
  getChunkCount(): number {
    return this.chunks.size;
  }

  /**
   * Get load queue length
   */
  getQueueLength(): number {
    return this.loadQueue.length;
  }

  /**
   * Force load all chunks in radius (for initial load)
   */
  forceLoadRadius(worldX: number, worldZ: number, radius: number): void {
    const coords = this.getChunksInRadius(worldX, worldZ, radius);
    for (const coord of coords) {
      const key = this.coordKey(coord);
      if (!this.chunks.has(key)) {
        const distance = distanceToChunk(worldX, worldZ, coord.x, coord.z);
        const chunk: ChunkData = {
          coord,
          state: ChunkState.Loading,
          lod: getLODLevel(distance),
          distance,
          heightmap: null,
          vertices: null,
          normals: null,
          uvs: null,
          indices: null,
          lastAccess: this.frameCount,
          priority: distance,
        };
        this.chunks.set(key, chunk);
        this.loadChunk(chunk);
      }
    }
  }

  /**
   * Clear all chunks
   */
  clear(): void {
    this.chunks.clear();
    this.loadQueue = [];
  }

  /**
   * Get heightmap generator
   */
  getHeightmapGenerator(): HeightmapGenerator {
    return this.heightmapGen;
  }
}

// Export singleton instance
export const chunkManager = new ChunkManager();
