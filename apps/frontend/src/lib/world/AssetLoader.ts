// Asset Loader - loads and caches 3D assets with LOD support
import * as THREE from 'three';
import { GLTFLoader, GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { AssetManifest } from './types';

interface CachedAsset {
  object: THREE.Object3D;
  lod: number;
  lastAccess: number;
  refCount: number;
}

export class AssetLoader {
  private gltfLoader: GLTFLoader;
  private dracoLoader: DRACOLoader;
  private cache = new Map<string, CachedAsset>();
  private loading = new Map<string, Promise<THREE.Object3D>>();
  private maxCacheSize: number;

  constructor(maxCacheSize: number = 100) {
    this.maxCacheSize = maxCacheSize;

    // Set up GLTF loader with DRACO support
    this.gltfLoader = new GLTFLoader();
    this.dracoLoader = new DRACOLoader();
    this.dracoLoader.setDecoderPath('/draco/');
    this.gltfLoader.setDRACOLoader(this.dracoLoader);
  }

  // Load an asset at specified LOD
  async load(url: string, lod: number = 0): Promise<THREE.Object3D> {
    const cacheKey = `${url}:${lod}`;

    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached) {
      cached.lastAccess = Date.now();
      cached.refCount++;
      return cached.object.clone();
    }

    // Check if already loading
    const pending = this.loading.get(cacheKey);
    if (pending) {
      const obj = await pending;
      const cachedNow = this.cache.get(cacheKey);
      if (cachedNow) {
        cachedNow.refCount++;
      }
      return obj.clone();
    }

    // Start loading
    const loadPromise = this.loadGLTF(url);
    this.loading.set(cacheKey, loadPromise);

    try {
      const object = await loadPromise;

      // Cache the result
      this.cache.set(cacheKey, {
        object,
        lod,
        lastAccess: Date.now(),
        refCount: 1,
      });

      // Evict old entries if cache is full
      this.evictIfNeeded();

      this.loading.delete(cacheKey);
      return object.clone();
    } catch (error) {
      this.loading.delete(cacheKey);
      throw error;
    }
  }

  // Load asset using manifest (auto-selects LOD)
  async loadFromManifest(manifest: AssetManifest, targetLOD: 0 | 1 | 2): Promise<THREE.Object3D> {
    const lodData = manifest.lods.find((l) => l.level === targetLOD) ?? manifest.lods[0];
    return this.load(lodData.url, lodData.level);
  }

  // Release a reference to an asset
  release(url: string, lod: number = 0): void {
    const cacheKey = `${url}:${lod}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      cached.refCount--;
    }
  }

  private async loadGLTF(url: string): Promise<THREE.Object3D> {
    return new Promise((resolve, reject) => {
      this.gltfLoader.load(
        url,
        (gltf: GLTF) => {
          const object = gltf.scene;

          // Set up shadows
          object.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });

          resolve(object);
        },
        undefined,
        (error) => {
          console.error(`Failed to load GLTF: ${url}`, error);
          reject(error);
        }
      );
    });
  }

  private evictIfNeeded(): void {
    if (this.cache.size <= this.maxCacheSize) return;

    // Find least recently used with 0 references
    const entries = Array.from(this.cache.entries())
      .filter(([_, v]) => v.refCount <= 0)
      .sort((a, b) => a[1].lastAccess - b[1].lastAccess);

    // Remove oldest unused entries
    const toRemove = entries.slice(0, this.cache.size - this.maxCacheSize + 10);
    for (const [key, value] of toRemove) {
      this.disposeObject(value.object);
      this.cache.delete(key);
    }
  }

  private disposeObject(object: THREE.Object3D): void {
    object.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (mesh.geometry) {
          mesh.geometry.dispose();
        }
        if (mesh.material) {
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => this.disposeMaterial(m));
          } else {
            this.disposeMaterial(mesh.material);
          }
        }
      }
    });
  }

  private disposeMaterial(material: THREE.Material): void {
    material.dispose();

    // Dispose textures
    const mat = material as THREE.MeshStandardMaterial;
    if (mat.map) mat.map.dispose();
    if (mat.normalMap) mat.normalMap.dispose();
    if (mat.roughnessMap) mat.roughnessMap.dispose();
    if (mat.metalnessMap) mat.metalnessMap.dispose();
    if (mat.aoMap) mat.aoMap.dispose();
    if (mat.emissiveMap) mat.emissiveMap.dispose();
  }

  // Preload assets
  async preload(urls: string[]): Promise<void> {
    await Promise.all(urls.map((url) => this.load(url).catch(() => {})));
  }

  // Clear entire cache
  clearCache(): void {
    for (const [_, value] of this.cache) {
      this.disposeObject(value.object);
    }
    this.cache.clear();
  }

  // Get cache stats
  getStats(): { cached: number; loading: number; totalRefs: number } {
    let totalRefs = 0;
    for (const v of this.cache.values()) {
      totalRefs += v.refCount;
    }
    return {
      cached: this.cache.size,
      loading: this.loading.size,
      totalRefs,
    };
  }

  // Destroy loader
  destroy(): void {
    this.clearCache();
    this.dracoLoader.dispose();
  }
}

// Singleton instance
let loaderInstance: AssetLoader | null = null;

export function getAssetLoader(): AssetLoader {
  if (!loaderInstance) {
    loaderInstance = new AssetLoader();
  }
  return loaderInstance;
}

export function resetAssetLoader(): void {
  if (loaderInstance) {
    loaderInstance.destroy();
    loaderInstance = null;
  }
}
