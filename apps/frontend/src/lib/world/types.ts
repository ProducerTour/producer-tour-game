// World streaming types

export interface AssetLOD {
  level: 0 | 1 | 2;
  url: string;
  triangles: number;
  textureSize: number;
  fileSize: number;
}

export interface AssetManifest {
  id: string;
  name: string;
  category: 'environment' | 'prop' | 'character' | 'vehicle' | 'building';
  lods: AssetLOD[];
  collision?: {
    type: 'box' | 'sphere' | 'capsule' | 'mesh';
    url?: string; // For mesh colliders
    dimensions?: number[]; // For primitive colliders
  };
  bounds: {
    min: [number, number, number];
    max: [number, number, number];
  };
  spawnPoints?: {
    position: [number, number, number];
    rotation: number;
  }[];
}

export interface ChunkEntity {
  id: string;
  assetId: string;
  position: [number, number, number];
  rotation: [number, number, number, number];
  scale: [number, number, number];
  persistent?: boolean;
}

export interface ChunkData {
  x: number;
  z: number;
  entities: ChunkEntity[];
  terrain?: {
    heightmapUrl?: string;
    textureUrls?: string[];
  };
}

export interface ChunkState {
  id: string;
  x: number;
  z: number;
  lod: 0 | 1 | 2;
  loaded: boolean;
  loading: boolean;
  entities: string[]; // Entity IDs
  lastAccess: number;
}

export interface WorldConfig {
  chunkSize: number; // meters
  lodDistances: [number, number, number]; // LOD0, LOD1, LOD2 transition distances
  maxLoadedChunks: number;
  unloadDelay: number; // ms before unloading unused chunks
}

export const DEFAULT_WORLD_CONFIG: WorldConfig = {
  chunkSize: 64,
  lodDistances: [64, 192, 384],
  maxLoadedChunks: 49, // 7x7 grid
  unloadDelay: 5000,
};
