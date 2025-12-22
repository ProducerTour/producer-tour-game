/**
 * Terrain Components
 * React Three Fiber components for procedural terrain rendering
 */

// Main terrain container
export { ProceduralTerrain, StaticTerrain } from './ProceduralTerrain';
export type { ProceduralTerrainProps, StaticTerrainProps } from './ProceduralTerrain';

// Physics heightfield collider (global)
export { TerrainPhysics } from './TerrainPhysics';
export type { TerrainPhysicsProps } from './TerrainPhysics';

// Chunk mesh rendering
export { TerrainChunkMesh, SimpleTerrainChunk } from './TerrainChunkMesh';
export type { TerrainChunkMeshProps, SimpleChunkProps } from './TerrainChunkMesh';

// Materials
export {
  useTerrainMaterial,
  useSimpleGrassMaterial,
  useFallbackMaterial,
} from './TerrainMaterial';
export type { TerrainMaterialProps } from './TerrainMaterial';

// Collision hook
export {
  useTerrainCollision,
  getGlobalTerrainCollision,
  resetGlobalTerrainCollision,
} from './useTerrainCollision';
export type { UseTerrainCollisionOptions, TerrainCollisionHook } from './useTerrainCollision';

// 3D Grass instances (global - deprecated, use ChunkGrass)
export { GrassInstances } from './GrassInstances';
export type { GrassInstancesProps } from './GrassInstances';

// Chunk-owned grass (preferred - loads/unloads with terrain chunks)
export { ChunkGrass } from './ChunkGrass';
export type { ChunkGrassProps } from './ChunkGrass';

// Chunk-owned trees (loads/unloads with terrain chunks)
export { ChunkTrees } from './ChunkTrees';
export type { ChunkTreesProps } from './ChunkTrees';

// Chunk-owned trees - INSTANCED version (optimized, fewer draw calls)
export { ChunkTreesInstanced } from './ChunkTreesInstanced';
export type { ChunkTreesInstancedProps } from './ChunkTreesInstanced';

// Chunk-owned palm trees (sand biomes)
export { ChunkPalmTrees } from './ChunkPalmTrees';
export type { ChunkPalmTreesProps } from './ChunkPalmTrees';

// Chunk-owned rocks (sand biomes)
export { ChunkRocks } from './ChunkRocks';
export type { ChunkRocksProps } from './ChunkRocks';

// Chunk-owned cliffs (steep slopes in mountain regions)
export { ChunkCliffs } from './ChunkCliffs';
export type { ChunkCliffsProps } from './ChunkCliffs';

// Chunk-owned bushes (forest undergrowth)
export { ChunkBushes } from './ChunkBushes';
export type { ChunkBushesProps } from './ChunkBushes';

// Re-export lib types for convenience
export type {
  ChunkCoord,
  ChunkState,
  LODLevel,
  ChunkData,
  TerrainCollisionResult,
} from '../../../lib/terrain';
