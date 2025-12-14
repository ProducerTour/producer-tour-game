// Chunk Manager - handles world streaming and LOD
import {
  ChunkState,
  ChunkData,
  WorldConfig,
  DEFAULT_WORLD_CONFIG,
  AssetManifest,
} from './types';

export type ChunkLoadCallback = (chunk: ChunkData, lod: 0 | 1 | 2) => Promise<string[]>;
export type ChunkUnloadCallback = (chunkId: string, entityIds: string[]) => void;

export class ChunkManager {
  private chunks = new Map<string, ChunkState>();
  private config: WorldConfig;
  private playerChunkX = 0;
  private playerChunkZ = 0;
  private onChunkLoad: ChunkLoadCallback;
  private onChunkUnload: ChunkUnloadCallback;
  private pendingLoads = new Set<string>();
  private assetManifests = new Map<string, AssetManifest>();

  constructor(
    onLoad: ChunkLoadCallback,
    onUnload: ChunkUnloadCallback,
    config: Partial<WorldConfig> = {}
  ) {
    this.config = { ...DEFAULT_WORLD_CONFIG, ...config };
    this.onChunkLoad = onLoad;
    this.onChunkUnload = onUnload;
  }

  // Update chunks based on player position
  update(playerX: number, playerZ: number): void {
    const newChunkX = Math.floor(playerX / this.config.chunkSize);
    const newChunkZ = Math.floor(playerZ / this.config.chunkSize);

    // Only process if player moved to a new chunk
    if (newChunkX === this.playerChunkX && newChunkZ === this.playerChunkZ) {
      return;
    }

    this.playerChunkX = newChunkX;
    this.playerChunkZ = newChunkZ;

    // Determine required chunks and their LOD levels
    const requiredChunks = new Map<string, 0 | 1 | 2>();
    const viewRadius = Math.ceil(this.config.lodDistances[2] / this.config.chunkSize);

    for (let dx = -viewRadius; dx <= viewRadius; dx++) {
      for (let dz = -viewRadius; dz <= viewRadius; dz++) {
        const cx = newChunkX + dx;
        const cz = newChunkZ + dz;
        const chunkId = this.getChunkId(cx, cz);

        // Calculate distance in world units
        const dist = Math.max(Math.abs(dx), Math.abs(dz)) * this.config.chunkSize;

        // Determine LOD level
        let lod: 0 | 1 | 2 | -1 = -1;
        if (dist < this.config.lodDistances[0]) {
          lod = 0;
        } else if (dist < this.config.lodDistances[1]) {
          lod = 1;
        } else if (dist < this.config.lodDistances[2]) {
          lod = 2;
        }

        if (lod >= 0) {
          requiredChunks.set(chunkId, lod as 0 | 1 | 2);
        }
      }
    }

    // Schedule chunks for unloading
    const now = Date.now();
    for (const [chunkId, chunk] of this.chunks) {
      if (!requiredChunks.has(chunkId)) {
        // Mark for unload if not accessed recently
        if (chunk.loaded && now - chunk.lastAccess > this.config.unloadDelay) {
          this.unloadChunk(chunkId);
        }
      }
    }

    // Load or update required chunks
    for (const [chunkId, lod] of requiredChunks) {
      const existing = this.chunks.get(chunkId);

      if (!existing) {
        // Load new chunk
        this.loadChunk(chunkId, lod);
      } else if (existing.loaded && existing.lod !== lod) {
        // LOD changed, reload with new LOD
        this.updateChunkLOD(chunkId, lod);
      }

      // Update access time
      if (existing) {
        existing.lastAccess = now;
      }
    }
  }

  private getChunkId(x: number, z: number): string {
    return `${x},${z}`;
  }

  private parseChunkId(id: string): { x: number; z: number } {
    const [x, z] = id.split(',').map(Number);
    return { x, z };
  }

  private async loadChunk(chunkId: string, lod: 0 | 1 | 2): Promise<void> {
    if (this.pendingLoads.has(chunkId)) return;

    const { x, z } = this.parseChunkId(chunkId);

    // Create chunk state
    const chunk: ChunkState = {
      id: chunkId,
      x,
      z,
      lod,
      loaded: false,
      loading: true,
      entities: [],
      lastAccess: Date.now(),
    };
    this.chunks.set(chunkId, chunk);
    this.pendingLoads.add(chunkId);

    try {
      // Fetch chunk data (would come from server/CDN in production)
      const chunkData = await this.fetchChunkData(x, z);

      // Call load callback to create entities
      const entityIds = await this.onChunkLoad(chunkData, lod);

      // Update chunk state
      chunk.entities = entityIds;
      chunk.loaded = true;
      chunk.loading = false;
    } catch (error) {
      console.error(`Failed to load chunk ${chunkId}:`, error);
      chunk.loading = false;
      this.chunks.delete(chunkId);
    } finally {
      this.pendingLoads.delete(chunkId);
    }
  }

  private async updateChunkLOD(chunkId: string, newLOD: 0 | 1 | 2): Promise<void> {
    const chunk = this.chunks.get(chunkId);
    if (!chunk || chunk.loading) return;

    // For now, just unload and reload with new LOD
    // In production, you'd want to swap LOD meshes without full reload
    this.unloadChunk(chunkId);
    await this.loadChunk(chunkId, newLOD);
  }

  private unloadChunk(chunkId: string): void {
    const chunk = this.chunks.get(chunkId);
    if (!chunk) return;

    // Call unload callback
    this.onChunkUnload(chunkId, chunk.entities);

    // Remove chunk
    this.chunks.delete(chunkId);
  }

  private async fetchChunkData(x: number, z: number): Promise<ChunkData> {
    // In production, this would fetch from server
    // For now, return empty chunk data
    return {
      x,
      z,
      entities: [],
    };
  }

  // Register asset manifest for later use
  registerAsset(manifest: AssetManifest): void {
    this.assetManifests.set(manifest.id, manifest);
  }

  getAssetManifest(id: string): AssetManifest | undefined {
    return this.assetManifests.get(id);
  }

  // Get all loaded chunks
  getLoadedChunks(): ChunkState[] {
    return Array.from(this.chunks.values()).filter((c) => c.loaded);
  }

  // Get chunk at position
  getChunkAt(worldX: number, worldZ: number): ChunkState | undefined {
    const cx = Math.floor(worldX / this.config.chunkSize);
    const cz = Math.floor(worldZ / this.config.chunkSize);
    return this.chunks.get(this.getChunkId(cx, cz));
  }

  // Force reload all chunks
  reloadAll(): void {
    const chunks = Array.from(this.chunks.values());
    for (const chunk of chunks) {
      this.unloadChunk(chunk.id);
    }
    // Trigger update to reload
    const tempX = this.playerChunkX;
    const tempZ = this.playerChunkZ;
    this.playerChunkX = Infinity;
    this.playerChunkZ = Infinity;
    this.update(tempX * this.config.chunkSize, tempZ * this.config.chunkSize);
  }

  // Get stats
  getStats(): {
    loaded: number;
    loading: number;
    total: number;
    entities: number;
  } {
    let loaded = 0;
    let loading = 0;
    let entities = 0;

    for (const chunk of this.chunks.values()) {
      if (chunk.loaded) {
        loaded++;
        entities += chunk.entities.length;
      }
      if (chunk.loading) loading++;
    }

    return {
      loaded,
      loading,
      total: this.chunks.size,
      entities,
    };
  }

  // Clean up
  destroy(): void {
    for (const chunkId of this.chunks.keys()) {
      this.unloadChunk(chunkId);
    }
    this.chunks.clear();
    this.assetManifests.clear();
  }
}
