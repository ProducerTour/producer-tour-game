// Streaming Manager - progressive loading and texture streaming
import * as THREE from 'three';

export interface StreamingAsset {
  id: string;
  url: string;
  type: 'texture' | 'model' | 'audio';
  priority: number;
  size: number; // bytes
  loaded: boolean;
  loading: boolean;
  lod?: number;
  dependencies?: string[];
}

export interface StreamingConfig {
  maxConcurrentLoads: number;
  maxMemoryMB: number;
  textureMaxSize: number;
  enableMipmaps: boolean;
  priorityBoostNearby: number;
  unloadDistanceMultiplier: number;
}

const DEFAULT_CONFIG: StreamingConfig = {
  maxConcurrentLoads: 4,
  maxMemoryMB: 512,
  textureMaxSize: 2048,
  enableMipmaps: true,
  priorityBoostNearby: 10,
  unloadDistanceMultiplier: 2,
};

export class StreamingManager {
  private config: StreamingConfig;
  private assets: Map<string, StreamingAsset> = new Map();
  private loadQueue: StreamingAsset[] = [];
  private activeLoads = 0;
  private textureLoader: THREE.TextureLoader;
  private loadedTextures: Map<string, THREE.Texture> = new Map();
  private estimatedMemoryUsage = 0;
  private playerPosition: THREE.Vector3 = new THREE.Vector3();

  // Callbacks
  private onAssetLoaded?: (asset: StreamingAsset) => void;
  private onProgress?: (loaded: number, total: number) => void;

  constructor(config: Partial<StreamingConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.textureLoader = new THREE.TextureLoader();
  }

  // Register an asset for streaming
  registerAsset(asset: Omit<StreamingAsset, 'loaded' | 'loading'>): void {
    this.assets.set(asset.id, {
      ...asset,
      loaded: false,
      loading: false,
    });
  }

  // Register multiple assets
  registerAssets(assets: Array<Omit<StreamingAsset, 'loaded' | 'loading'>>): void {
    assets.forEach((asset) => this.registerAsset(asset));
  }

  // Update player position for priority calculation
  updatePlayerPosition(position: THREE.Vector3): void {
    this.playerPosition.copy(position);
  }

  // Request an asset to be loaded
  requestAsset(assetId: string, priorityBoost: number = 0): void {
    const asset = this.assets.get(assetId);
    if (!asset || asset.loaded || asset.loading) return;

    asset.priority += priorityBoost;
    this.addToQueue(asset);
  }

  // Request multiple assets
  requestAssets(assetIds: string[], priorityBoost: number = 0): void {
    assetIds.forEach((id) => this.requestAsset(id, priorityBoost));
  }

  // Add to load queue with priority sorting
  private addToQueue(asset: StreamingAsset): void {
    if (this.loadQueue.includes(asset)) return;

    this.loadQueue.push(asset);
    this.loadQueue.sort((a, b) => b.priority - a.priority);
    this.processQueue();
  }

  // Process the load queue
  private processQueue(): void {
    while (
      this.activeLoads < this.config.maxConcurrentLoads &&
      this.loadQueue.length > 0
    ) {
      // Check memory limit
      if (this.estimatedMemoryUsage >= this.config.maxMemoryMB * 1024 * 1024) {
        this.unloadLeastImportant();
      }

      const asset = this.loadQueue.shift();
      if (asset && !asset.loaded && !asset.loading) {
        this.loadAsset(asset);
      }
    }
  }

  // Load a single asset
  private async loadAsset(asset: StreamingAsset): Promise<void> {
    asset.loading = true;
    this.activeLoads++;

    try {
      switch (asset.type) {
        case 'texture':
          await this.loadTexture(asset);
          break;
        case 'model':
          await this.loadModel(asset);
          break;
        case 'audio':
          await this.loadAudio(asset);
          break;
      }

      asset.loaded = true;
      this.estimatedMemoryUsage += asset.size;
      this.onAssetLoaded?.(asset);
    } catch (error) {
      console.error(`Failed to load asset: ${asset.id}`, error);
    } finally {
      asset.loading = false;
      this.activeLoads--;
      this.updateProgress();
      this.processQueue();
    }
  }

  // Load texture with streaming options
  private loadTexture(asset: StreamingAsset): Promise<THREE.Texture> {
    return new Promise((resolve, reject) => {
      this.textureLoader.load(
        asset.url,
        (texture) => {
          // Configure texture
          texture.generateMipmaps = this.config.enableMipmaps;
          texture.minFilter = this.config.enableMipmaps
            ? THREE.LinearMipmapLinearFilter
            : THREE.LinearFilter;
          texture.magFilter = THREE.LinearFilter;

          // Resize if too large
          if (texture.image) {
            const maxSize = this.config.textureMaxSize;
            const img = texture.image as HTMLImageElement;
            if (img.width > maxSize || img.height > maxSize) {
              const scale = maxSize / Math.max(img.width, img.height);
              const canvas = document.createElement('canvas');
              canvas.width = img.width * scale;
              canvas.height = img.height * scale;
              const ctx = canvas.getContext('2d');
              ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
              texture.image = canvas as unknown as HTMLImageElement;
              texture.needsUpdate = true;
            }
          }

          this.loadedTextures.set(asset.id, texture);
          resolve(texture);
        },
        undefined,
        reject
      );
    });
  }

  // Load model (placeholder - integrate with AssetLoader)
  private async loadModel(_asset: StreamingAsset): Promise<void> {
    // Would integrate with existing AssetLoader
    // This is a placeholder for the streaming integration
  }

  // Load audio (placeholder - integrate with AudioManager)
  private async loadAudio(_asset: StreamingAsset): Promise<void> {
    // Would integrate with existing AudioManager
    // This is a placeholder for the streaming integration
  }

  // Get a loaded texture
  getTexture(assetId: string): THREE.Texture | null {
    return this.loadedTextures.get(assetId) || null;
  }

  // Unload least important assets to free memory
  private unloadLeastImportant(): void {
    const loaded = Array.from(this.assets.values())
      .filter((a) => a.loaded && a.type === 'texture')
      .sort((a, b) => a.priority - b.priority);

    // Unload lowest priority
    for (const asset of loaded) {
      if (this.estimatedMemoryUsage < this.config.maxMemoryMB * 1024 * 1024 * 0.8) {
        break;
      }

      this.unloadAsset(asset.id);
    }
  }

  // Unload a specific asset
  unloadAsset(assetId: string): void {
    const asset = this.assets.get(assetId);
    if (!asset || !asset.loaded) return;

    if (asset.type === 'texture') {
      const texture = this.loadedTextures.get(assetId);
      if (texture) {
        texture.dispose();
        this.loadedTextures.delete(assetId);
      }
    }

    asset.loaded = false;
    this.estimatedMemoryUsage -= asset.size;
  }

  // Update progress callback
  private updateProgress(): void {
    const total = this.assets.size;
    const loaded = Array.from(this.assets.values()).filter((a) => a.loaded).length;
    this.onProgress?.(loaded, total);
  }

  // Set callbacks
  setCallbacks(callbacks: {
    onAssetLoaded?: (asset: StreamingAsset) => void;
    onProgress?: (loaded: number, total: number) => void;
  }): void {
    this.onAssetLoaded = callbacks.onAssetLoaded;
    this.onProgress = callbacks.onProgress;
  }

  // Get loading progress
  getProgress(): { loaded: number; total: number; percentage: number } {
    const total = this.assets.size;
    const loaded = Array.from(this.assets.values()).filter((a) => a.loaded).length;
    return {
      loaded,
      total,
      percentage: total > 0 ? (loaded / total) * 100 : 100,
    };
  }

  // Get memory usage
  getMemoryUsage(): { used: number; max: number; percentage: number } {
    const max = this.config.maxMemoryMB * 1024 * 1024;
    return {
      used: this.estimatedMemoryUsage,
      max,
      percentage: (this.estimatedMemoryUsage / max) * 100,
    };
  }

  // Prioritize assets near player
  updatePriorities(assetPositions: Map<string, THREE.Vector3>): void {
    for (const [assetId, position] of assetPositions) {
      const asset = this.assets.get(assetId);
      if (!asset) continue;

      const distance = this.playerPosition.distanceTo(position);

      // Higher priority for closer assets
      const proximityBoost = Math.max(0, this.config.priorityBoostNearby - distance);
      asset.priority = proximityBoost;
    }

    // Re-sort queue
    this.loadQueue.sort((a, b) => b.priority - a.priority);
  }

  // Preload essential assets
  async preloadEssential(assetIds: string[]): Promise<void> {
    const assets = assetIds
      .map((id) => this.assets.get(id))
      .filter((a): a is StreamingAsset => a !== undefined && !a.loaded);

    // Set highest priority
    assets.forEach((a) => (a.priority = 1000));

    // Add all to queue
    assets.forEach((a) => this.addToQueue(a));

    // Wait for all to load
    return new Promise((resolve) => {
      const checkComplete = () => {
        const allLoaded = assets.every((a) => a.loaded);
        if (allLoaded) {
          resolve();
        } else {
          requestAnimationFrame(checkComplete);
        }
      };
      checkComplete();
    });
  }

  // Clear all assets
  dispose(): void {
    for (const texture of this.loadedTextures.values()) {
      texture.dispose();
    }
    this.loadedTextures.clear();
    this.assets.clear();
    this.loadQueue = [];
    this.estimatedMemoryUsage = 0;
  }
}

// Singleton instance
let streamingInstance: StreamingManager | null = null;

export function getStreamingManager(): StreamingManager {
  if (!streamingInstance) {
    streamingInstance = new StreamingManager();
  }
  return streamingInstance;
}

export function resetStreamingManager(): void {
  if (streamingInstance) {
    streamingInstance.dispose();
    streamingInstance = null;
  }
}
