/**
 * Terrain System
 * Procedural heightmap-based terrain following Rust game architecture
 */

// Configuration and constants
export * from './TerrainConfig';

// =============================================================================
// NEW TERRAIN SYSTEM (v2)
// =============================================================================

// New terrain generator with hybrid height generation
export { TerrainGenerator, terrainGenerator } from './TerrainGenerator';
export type { TerrainSample as TerrainSampleV2, ChunkTerrainData } from './TerrainGenerator';

// Flow-based hydrology simulation
export { HydrologySimulator, hydrologySimulator } from './HydrologySimulator';
export type { FlowData, HydrologyGrid } from './HydrologySimulator';

// Data-driven biome lookup
export { BiomeLookupTable, BiomeType, BIOME_PROPERTIES } from './BiomeLookupTable';
export type { BiomeProperties } from './BiomeLookupTable';

// =============================================================================
// LEGACY TERRAIN SYSTEM (v1) - Keep for backwards compatibility
// =============================================================================

// Core generation (legacy)
export { HeightmapGenerator, heightmapGenerator } from './HeightmapGenerator';
export type { ChunkHeightmap, TerrainSample, MountainConfig, ValleyConfig } from './HeightmapGenerator';

// Chunk management
export { ChunkManager, chunkManager } from './ChunkManager';
export type { ChunkData, ChunkUpdate } from './ChunkManager';

// Collision detection
export { TerrainCollision, terrainCollision } from './TerrainCollision';
export type {
  TerrainCollisionResult,
  TerrainRaycastResult,
  TerrainSweepResult,
} from './TerrainCollision';
