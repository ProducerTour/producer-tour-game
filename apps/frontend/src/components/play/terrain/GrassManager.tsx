/**
 * GrassManager - Centralized Grass Rendering (SimonDev Quick_Grass Pattern)
 *
 * Key architectural changes from per-chunk ProceduralGrass:
 * - Single component manages ALL grass cells (not 121 separate components)
 * - Mesh pool (pre-allocated, never create/destroy at runtime)
 * - Single useFrame that:
 *   1. Hides ALL meshes first (prevents green plane)
 *   2. Calculates visible cells (frustum + distance culling)
 *   3. Staggers reveal (3 new cells per frame)
 *   4. Updates uniforms only for visible meshes
 * - No race conditions - centralized control
 *
 * Based on: https://github.com/simondevyoutube/Quick_Grass
 */

import { useRef, useEffect, useMemo, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

import {
  GRASS_WIDTH,
  GRASS_HEIGHT,
} from './GrassBladeGeometry';
import { grassVertexShader, grassFragmentShader, createGrassUniforms } from './grassShader';
import { getGlobalWindSystem } from './GrassWindSystem';

import type { TerrainGenerator } from '../../../lib/terrain/TerrainGenerator';
import type { ChunkData } from '../../../lib/terrain';
import { CHUNK_SIZE, WORLD_SIZE, WATER_LEVEL } from '../../../lib/terrain/TerrainConfig';
import { BiomeType } from '../../../lib/terrain/BiomeLookupTable';

// === CONSTANTS ===
const NUM_GRASS = 32 * 32 * 3;  // 3072 blades per patch
const BASE_PATCH_SIZE = 10;
const GRASS_SEGMENTS_LOW = 3;   // Increased from 1 - less spiky at distance
const GRASS_SEGMENTS_HIGH = 6;
const GRASS_VERTICES_LOW = (GRASS_SEGMENTS_LOW + 1) * 2;
const GRASS_VERTICES_HIGH = (GRASS_SEGMENTS_HIGH + 1) * 2;
const GRASS_LOD_DIST = 40;      // Increased from 15 - curved grass visible further
const GRASS_MAX_DIST = 100;
const CHUNKS_TO_REVEAL_PER_FRAME = 15;  // Increased from 3 for faster reveal (~0.17s vs ~0.8s)
const POOL_SIZE = 150;  // Slightly more than 121 chunks

// Biome filtering - no grass in these biomes
const NO_GRASS_BIOMES = new Set<BiomeType>([
  BiomeType.DEEP_OCEAN,
  BiomeType.SHALLOW_OCEAN,
  BiomeType.BEACH,
  BiomeType.MARSH,
  BiomeType.SWAMP,
  BiomeType.DESERT,
  BiomeType.ROCKY_MOUNTAIN,
  BiomeType.SNOW_PEAK,
  BiomeType.GLACIER,
]);

// Reduced grass density in these biomes
const LOW_GRASS_BIOMES = new Map<BiomeType, number>([
  [BiomeType.SAVANNA, 0.4],
  [BiomeType.SCRUBLAND, 0.3],
  [BiomeType.ALPINE_MEADOW, 0.6],
  [BiomeType.BOREAL_FOREST, 0.5],
]);

// Grass placement constraints
const MIN_GRASS_HEIGHT = 2;
const MAX_GRASS_HEIGHT = 60;
const MIN_SLOPE_NORMAL_Y = 0.5;

// Seeded random for deterministic placement
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898 + seed * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

// Cell data for each grass chunk
interface GrassCellData {
  chunkX: number;
  chunkZ: number;
  key: string;
  centerWorld: THREE.Vector3;
  instanceCount: number;
  avgHeight: number;
  positionBuffer: Float32Array;
  positionBufferHalf: Uint16Array;  // Pre-converted Float16 to avoid hot path allocation
  isGenerated: boolean;
  poolIndexLow: number;
  poolIndexHigh: number;
  isRevealed: boolean;
  isBound: boolean;  // Whether geometry is bound to pool mesh
  boundLOD: 'low' | 'high' | null;  // Track which LOD was bound for rebinding on LOD change
}

export interface GrassManagerProps {
  chunks: ChunkData[];
  terrainGen: TerrainGenerator;
  playerPosition: THREE.Vector3;
  enabled?: boolean;
  bladesPerChunk?: number;
  maxRenderDistance?: number;
  densityMultiplier?: number;
  bladeScale?: number;
  windSpeed?: number;
  fogColor?: THREE.Color;
  onFirstGrassVisible?: () => void;
  /** Called with progress percentage (0-100) during grass generation */
  onGenerationProgress?: (percent: number) => void;
}

export function GrassManager({
  chunks,
  terrainGen,
  playerPosition,
  enabled = true,
  bladesPerChunk = NUM_GRASS,
  maxRenderDistance = GRASS_MAX_DIST,
  densityMultiplier = 6.4,
  bladeScale = 0.5,
  windSpeed = 0.01,
  fogColor,
  onFirstGrassVisible,
  onGenerationProgress,
}: GrassManagerProps) {
  const groupRef = useRef<THREE.Group>(null);
  const poolRef = useRef<{ low: THREE.Mesh[], high: THREE.Mesh[] }>({ low: [], high: [] });
  const cellsRef = useRef<Map<string, GrassCellData>>(new Map());
  const firstVisibleRef = useRef(false);
  const isInitializedRef = useRef(false);
  const generationInProgressRef = useRef(false);

  // Frustum culling refs (reused each frame to avoid allocation)
  const frustumRef = useRef(new THREE.Frustum());
  const frustumMatrixRef = useRef(new THREE.Matrix4());
  const cellSphereRef = useRef(new THREE.Sphere(new THREE.Vector3(), CHUNK_SIZE * 0.7));

  const windSystem = useMemo(() => getGlobalWindSystem(), []);

  // Calculate chunk center in world coordinates
  const getChunkCenter = useCallback((chunkX: number, chunkZ: number): THREE.Vector3 => {
    return new THREE.Vector3(
      chunkX * CHUNK_SIZE - WORLD_SIZE / 2 + CHUNK_SIZE / 2,
      0,
      chunkZ * CHUNK_SIZE - WORLD_SIZE / 2 + CHUNK_SIZE / 2
    );
  }, []);

  // Generate indices for grass blade geometry
  const generateIndices = useCallback((segments: number): number[] => {
    const VERTICES = (segments + 1) * 2;
    const indices: number[] = [];
    for (let i = 0; i < segments; i++) {
      const vi = i * 2;
      indices[i * 12 + 0] = vi + 0;
      indices[i * 12 + 1] = vi + 1;
      indices[i * 12 + 2] = vi + 2;
      indices[i * 12 + 3] = vi + 2;
      indices[i * 12 + 4] = vi + 1;
      indices[i * 12 + 5] = vi + 3;

      const fi = VERTICES + vi;
      indices[i * 12 + 6] = fi + 2;
      indices[i * 12 + 7] = fi + 1;
      indices[i * 12 + 8] = fi + 0;
      indices[i * 12 + 9] = fi + 3;
      indices[i * 12 + 10] = fi + 1;
      indices[i * 12 + 11] = fi + 2;
    }
    return indices;
  }, []);

  // Create a grass material for the pool
  const createPoolMaterial = useCallback((segments: number, vertices: number): THREE.ShaderMaterial => {
    const uniforms = {
      ...THREE.UniformsLib.common,
      ...THREE.UniformsLib.lights,
      ...THREE.UniformsLib.fog,
      ...createGrassUniforms(),
    } as Record<string, THREE.IUniform>;

    (uniforms.grassSize.value as THREE.Vector2).set(GRASS_WIDTH, GRASS_HEIGHT);
    (uniforms.grassParams.value as THREE.Vector4).set(segments, vertices, 0, 0);
    (uniforms.grassDraw.value as THREE.Vector4).set(GRASS_LOD_DIST, maxRenderDistance, 0, 0);
    uniforms.fadeIn.value = 1.0;

    return new THREE.ShaderMaterial({
      vertexShader: grassVertexShader,
      fragmentShader: grassFragmentShader,
      uniforms,
      lights: true,
      fog: true,
      side: THREE.FrontSide,
    });
  }, [maxRenderDistance]);

  // Create an empty geometry template for the pool
  const createPoolGeometry = useCallback((segments: number): THREE.InstancedBufferGeometry => {
    const VERTICES = (segments + 1) * 2;
    const indices = generateIndices(segments);

    const vertIndex = new Uint8Array(VERTICES * 2);
    for (let i = 0; i < VERTICES * 2; i++) {
      vertIndex[i] = i;
    }

    const geo = new THREE.InstancedBufferGeometry();
    geo.instanceCount = 0;  // Start with no instances
    geo.setAttribute('vertIndex', new THREE.BufferAttribute(vertIndex, 1));
    geo.setIndex(indices);

    return geo;
  }, [generateIndices]);

  // Initialize mesh pool
  useEffect(() => {
    if (!groupRef.current || isInitializedRef.current) return;

    console.log(`🌾 GrassManager: Initializing mesh pool (${POOL_SIZE} × 2 meshes)`);

    for (let i = 0; i < POOL_SIZE; i++) {
      // LOW LOD mesh
      const geoLow = createPoolGeometry(GRASS_SEGMENTS_LOW);
      const matLow = createPoolMaterial(GRASS_SEGMENTS_LOW, GRASS_VERTICES_LOW);
      const meshLow = new THREE.Mesh(geoLow, matLow);
      meshLow.visible = false;
      meshLow.frustumCulled = true;
      meshLow.receiveShadow = true;
      meshLow.raycast = () => {};
      poolRef.current.low.push(meshLow);
      groupRef.current.add(meshLow);

      // HIGH LOD mesh
      const geoHigh = createPoolGeometry(GRASS_SEGMENTS_HIGH);
      const matHigh = createPoolMaterial(GRASS_SEGMENTS_HIGH, GRASS_VERTICES_HIGH);
      const meshHigh = new THREE.Mesh(geoHigh, matHigh);
      meshHigh.visible = false;
      meshHigh.frustumCulled = true;
      meshHigh.receiveShadow = true;
      meshHigh.raycast = () => {};
      poolRef.current.high.push(meshHigh);
      groupRef.current.add(meshHigh);
    }

    isInitializedRef.current = true;
    console.log(`🌾 GrassManager: Pool initialized`);

    return () => {
      // Cleanup pool on unmount
      for (const mesh of poolRef.current.low) {
        mesh.geometry.dispose();
        (mesh.material as THREE.ShaderMaterial).dispose();
      }
      for (const mesh of poolRef.current.high) {
        mesh.geometry.dispose();
        (mesh.material as THREE.ShaderMaterial).dispose();
      }
      poolRef.current = { low: [], high: [] };
      isInitializedRef.current = false;
    };
  }, [createPoolGeometry, createPoolMaterial]);

  // Generate cell data for a single chunk
  const generateCellData = useCallback((
    chunkX: number,
    chunkZ: number,
    poolIndex: number
  ): GrassCellData | null => {
    if (!terrainGen) return null;

    const chunkCenter = getChunkCenter(chunkX, chunkZ);
    const key = `${chunkX},${chunkZ}`;
    const seed = chunkX * 73856093 + chunkZ * 19349663;

    const patchSize = Math.min(BASE_PATCH_SIZE * densityMultiplier, CHUNK_SIZE);
    const areaRatio = (patchSize * patchSize) / (BASE_PATCH_SIZE * BASE_PATCH_SIZE);
    const bladeAttempts = Math.floor(bladesPerChunk * areaRatio);

    const cellsPerAxis = Math.ceil(Math.sqrt(bladeAttempts));
    const cellSize = patchSize / cellsPerAxis;
    const jitterAmount = cellSize * 0.4;

    const offsets: number[] = [];
    let totalHeight = 0;
    let validCount = 0;
    let bladeIndex = 0;

    for (let gx = 0; gx < cellsPerAxis && bladeIndex < bladeAttempts; gx++) {
      for (let gz = 0; gz < cellsPerAxis && bladeIndex < bladeAttempts; gz++) {
        const cellSeed = seed + gx * 1000 + gz;
        const cellCenterX = (gx + 0.5) * cellSize - patchSize / 2;
        const cellCenterZ = (gz + 0.5) * cellSize - patchSize / 2;
        const jitterX = (seededRandom(cellSeed) - 0.5) * jitterAmount;
        const jitterZ = (seededRandom(cellSeed + 1) - 0.5) * jitterAmount;
        const localX = cellCenterX + jitterX;
        const localZ = cellCenterZ + jitterZ;
        bladeIndex++;

        const worldX = chunkCenter.x + localX;
        const worldZ = chunkCenter.z + localZ;
        const terrain = terrainGen.sampleTerrain(worldX, worldZ);

        // Biome filtering
        if (terrain.isSubmerged) continue;
        if (terrain.height <= WATER_LEVEL + 0.5) continue;
        if (terrain.height < MIN_GRASS_HEIGHT) continue;
        if (terrain.height > MAX_GRASS_HEIGHT) continue;
        if (terrain.normal.y < MIN_SLOPE_NORMAL_Y) continue;
        if (NO_GRASS_BIOMES.has(terrain.biome)) continue;

        const mountainMask = terrainGen.getMountainZoneMask(worldX, worldZ);
        if (mountainMask > 0.7) continue;

        const biomeDensity = LOW_GRASS_BIOMES.get(terrain.biome) ?? 1.0;
        if (seededRandom(cellSeed + 2) > biomeDensity) continue;

        offsets.push(localX, localZ, terrain.height);
        totalHeight += terrain.height;
        validCount++;
      }
    }

    if (validCount === 0) {
      return null;  // No grass in this chunk
    }

    // Pre-convert to Float16 during generation (not binding) to avoid hot path allocation
    const positionBuffer = new Float32Array(offsets);
    const positionBufferHalf = new Uint16Array(offsets.length);
    for (let i = 0; i < offsets.length; i++) {
      positionBufferHalf[i] = THREE.DataUtils.toHalfFloat(offsets[i]);
    }

    return {
      chunkX,
      chunkZ,
      key,
      centerWorld: chunkCenter,
      instanceCount: validCount,
      avgHeight: totalHeight / validCount,
      positionBuffer,
      positionBufferHalf,  // Pre-converted Float16
      isGenerated: true,
      poolIndexLow: poolIndex,
      poolIndexHigh: poolIndex,
      isRevealed: false,
      isBound: false,
      boundLOD: null,
    };
  }, [terrainGen, getChunkCenter, densityMultiplier, bladesPerChunk]);

  // Bind cell data to a pool mesh (update geometry with position data)
  const bindCellToMesh = useCallback((cell: GrassCellData, isHighLOD: boolean) => {
    const requiredLOD = isHighLOD ? 'high' : 'low';

    // Skip if already bound to the correct LOD
    if (cell.isBound && cell.boundLOD === requiredLOD) return;

    const poolIndex = isHighLOD ? cell.poolIndexHigh : cell.poolIndexLow;
    const mesh = isHighLOD
      ? poolRef.current.high[poolIndex]
      : poolRef.current.low[poolIndex];

    if (!mesh) return;

    const geometry = mesh.geometry as THREE.InstancedBufferGeometry;

    // Use pre-converted Float16 buffer (no Array.from() in hot path!)
    const positionAttr = new THREE.InstancedBufferAttribute(
      cell.positionBufferHalf,
      3,
      false,  // normalized
      1       // meshPerAttribute
    );
    // Mark as Float16 for proper GPU handling
    (positionAttr as THREE.InstancedBufferAttribute & { isFloat16BufferAttribute: boolean }).isFloat16BufferAttribute = true;

    geometry.setAttribute('position', positionAttr);
    geometry.instanceCount = cell.instanceCount;

    // Update bounding sphere
    geometry.boundingSphere = new THREE.Sphere(
      new THREE.Vector3(0, cell.avgHeight + GRASS_HEIGHT / 2, 0),
      CHUNK_SIZE + 5
    );

    // Position mesh at chunk center
    mesh.position.set(cell.centerWorld.x, 0, cell.centerWorld.z);

    // Update material uniforms
    const uniforms = (mesh.material as THREE.ShaderMaterial).uniforms;
    uniforms.terrainHeight.value = cell.avgHeight;
    (uniforms.grassParams.value as THREE.Vector4).z = cell.avgHeight;

    cell.isBound = true;
    cell.boundLOD = requiredLOD;  // Track which LOD was bound
  }, []);

  // Generate all cell data (background processing)
  useEffect(() => {
    if (!isInitializedRef.current || !terrainGen || generationInProgressRef.current) return;
    if (chunks.length === 0) return;

    generationInProgressRef.current = true;

    const generateAllCells = async () => {
      let poolIndex = 0;
      let generated = 0;
      let skipped = 0;
      let lastProgressReport = 0;
      const totalChunks = chunks.length;

      for (const chunk of chunks) {
        const key = `${chunk.coord.x},${chunk.coord.z}`;

        // Skip if already generated
        if (cellsRef.current.has(key)) continue;

        // Generate cell data
        const cellData = generateCellData(chunk.coord.x, chunk.coord.z, poolIndex);

        if (cellData) {
          cellsRef.current.set(key, cellData);
          poolIndex++;
          generated++;
        } else {
          skipped++;
        }

        // Report progress (throttled to avoid excessive callbacks)
        const processed = generated + skipped;
        const progress = Math.round((processed / totalChunks) * 100);
        if (progress >= lastProgressReport + 5) {  // Report every 5%
          lastProgressReport = progress;
          onGenerationProgress?.(progress);
        }

        // Yield to main thread every 5 chunks
        if (processed % 5 === 0) {
          await new Promise(resolve => {
            if (typeof requestIdleCallback !== 'undefined') {
              requestIdleCallback(() => resolve(undefined), { timeout: 50 });
            } else {
              setTimeout(resolve, 8);
            }
          });
        }
      }

      console.log(`🌾 GrassManager: Generated ${generated} cells, skipped ${skipped} (no grass)`);
      onGenerationProgress?.(100);  // Report completion
      generationInProgressRef.current = false;
    };

    generateAllCells();
  }, [chunks, terrainGen, generateCellData, onGenerationProgress]);

  // THE CRITICAL PATTERN - Single useFrame that manages all grass
  useFrame((state, delta) => {
    if (!groupRef.current || !enabled || !isInitializedRef.current) return;

    // 0. UPDATE WIND SYSTEM - critical for wind animation!
    // StaticTerrain doesn't have a useFrame, so we update wind here
    windSystem.update(delta);

    // 1. HIDE ALL MESHES FIRST (prevents green plane)
    for (const mesh of poolRef.current.low) mesh.visible = false;
    for (const mesh of poolRef.current.high) mesh.visible = false;

    // 2. Get generated cells
    const cells = cellsRef.current;
    if (cells.size === 0) return;

    // 3. Update frustum for culling (reuse refs to avoid allocation)
    frustumMatrixRef.current.multiplyMatrices(
      state.camera.projectionMatrix,
      state.camera.matrixWorldInverse
    );
    frustumRef.current.setFromProjectionMatrix(frustumMatrixRef.current);

    // 4. Staggered reveal WITH binding (prevents green plane - bind BEFORE showing)
    let newlyRevealed = 0;
    for (const cell of cells.values()) {
      if (!cell.isGenerated) continue;
      if (!cell.isRevealed && newlyRevealed < CHUNKS_TO_REVEAL_PER_FRAME) {
        // Bind geometry BEFORE marking as revealed (prevents stale geometry flash)
        const distance = cell.centerWorld.distanceTo(playerPosition);
        const isHighLOD = distance < GRASS_LOD_DIST;
        bindCellToMesh(cell, isHighLOD);

        cell.isRevealed = true;
        newlyRevealed++;
      }
    }

    // 5. Notify when first grass becomes visible
    if (!firstVisibleRef.current && newlyRevealed > 0) {
      firstVisibleRef.current = true;
      onFirstGrassVisible?.();
      console.log(`🌾 GrassManager: First grass visible, terrain can show`);
    }

    // 6. Show + update only revealed AND bound cells within frustum + distance
    const time = windSystem.getTime() * windSpeed;

    for (const cell of cells.values()) {
      // Skip cells that aren't ready (generated + revealed + bound)
      if (!cell.isGenerated || !cell.isRevealed || !cell.isBound) continue;

      // Frustum culling - skip cells behind camera (reuse sphere ref)
      cellSphereRef.current.center.copy(cell.centerWorld);
      cellSphereRef.current.center.y = cell.avgHeight;
      if (!frustumRef.current.intersectsSphere(cellSphereRef.current)) continue;

      // Distance culling
      const distance = cell.centerWorld.distanceTo(playerPosition);
      if (distance > maxRenderDistance) continue;

      // Pick LOD based on distance
      const isHighLOD = distance < GRASS_LOD_DIST;
      const requiredLOD = isHighLOD ? 'high' : 'low';

      // Rebind if LOD changed (e.g., player moved closer/further)
      if (cell.boundLOD !== requiredLOD) {
        bindCellToMesh(cell, isHighLOD);
      }

      const poolIndex = isHighLOD ? cell.poolIndexHigh : cell.poolIndexLow;
      const mesh = isHighLOD
        ? poolRef.current.high[poolIndex]
        : poolRef.current.low[poolIndex];

      if (!mesh) continue;

      // Show mesh (only if bound)
      mesh.visible = true;

      // Update uniforms
      const uniforms = (mesh.material as THREE.ShaderMaterial).uniforms;
      uniforms.time.value = time;
      uniforms.fadeIn.value = 1.0;
      (uniforms.playerPos.value as THREE.Vector3).copy(playerPosition);
      (uniforms.viewMatrixInverse.value as THREE.Matrix4).copy(state.camera.matrixWorld);
      (uniforms.grassSize.value as THREE.Vector2).set(GRASS_WIDTH * bladeScale, GRASS_HEIGHT * bladeScale);
      if (fogColor) {
        (uniforms.fogColor.value as THREE.Color).copy(fogColor);
      }
    }
  });

  if (!enabled) {
    return null;
  }

  return <group ref={groupRef} name="grass-manager" />;
}

export default GrassManager;
