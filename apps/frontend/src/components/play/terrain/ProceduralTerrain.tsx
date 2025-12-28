/**
 * ProceduralTerrain.tsx
 * Main container component for procedural terrain rendering
 * Manages chunk streaming based on player position
 */

import { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
// Debug logging - set to true to debug terrain issues
const DEBUG_TERRAIN = false;

import {
  ChunkManager,
  HeightmapGenerator,
  NOISE_CONFIG,
  CHUNK_LOAD_RADIUS,
  ChunkState,
  WATER_LEVEL,
  chunkToWorld,
  WORLD_BOUNDARY,
  CHUNK_SIZE,
  CHUNKS_PER_AXIS,
  // New terrain system v2
  TerrainGenerator,
  HydrologySimulator,
  type ChunkData,
  type ChunkCoord,
} from '../../../lib/terrain';

// Feature flag for new terrain system
// Set to true to use the new hybrid height generation with flow-based rivers
const USE_NEW_TERRAIN = true;

import { TerrainChunkMesh } from './TerrainChunkMesh';
import { ChunkGrass } from './ChunkGrass';
import { GrassManager } from './GrassManager';
import { ChunkTreesInstanced } from './ChunkTreesInstanced';
import { ChunkPalmTrees } from './ChunkPalmTrees';
import { ChunkRocks } from './ChunkRocks';
import { ChunkCliffs } from './ChunkCliffs';
import { ChunkBushes } from './ChunkBushes';
import { useFallbackMaterial, useTerrainMaterial } from './TerrainMaterial';
import { getVisibilityManager } from '../../../lib/visibility';
import { getGlobalWindSystem } from './GrassWindSystem';

export interface ProceduralTerrainProps {
  /** World seed for terrain generation */
  seed?: number;

  /** Player position for chunk streaming */
  playerPosition?: THREE.Vector3;

  /** Show wireframe debug */
  wireframe?: boolean;

  /** Show chunk boundaries debug */
  showChunkBounds?: boolean;

  /** Initial load radius (defaults to CHUNK_LOAD_RADIUS) */
  initialLoadRadius?: number;

  /** Enable grass rendering per chunk */
  grassEnabled?: boolean;

  /** Grass instances per chunk */
  grassDensity?: number;

  /** Enable wind animation on grass */
  windEnabled?: boolean;

  /** Enable tree rendering per chunk */
  treesEnabled?: boolean;

  /** Tree instances per chunk (before biome filtering) */
  treesDensity?: number;

  /** Called when terrain is ready */
  onReady?: () => void;

  /** Called when chunk is loaded */
  onChunkLoad?: (coord: ChunkCoord) => void;
}

/**
 * ProceduralTerrain - Main terrain rendering component
 *
 * Renders procedurally generated terrain using chunk streaming.
 * Chunks are loaded/unloaded based on player position.
 */
export function ProceduralTerrain({
  seed = NOISE_CONFIG.seed,
  playerPosition,
  wireframe = false,
  showChunkBounds = false,
  initialLoadRadius = CHUNK_LOAD_RADIUS,
  grassEnabled = true,
  grassDensity = 150,
  windEnabled = true,
  treesEnabled = true,
  treesDensity = 8,
  onReady,
  onChunkLoad,
}: ProceduralTerrainProps) {
  // State for rendered chunks
  const [chunks, setChunks] = useState<Map<string, ChunkData>>(new Map());
  const [isReady, setIsReady] = useState(false);

  // Refs for managers (persist across renders)
  const heightmapGenRef = useRef<HeightmapGenerator | null>(null);
  const chunkManagerRef = useRef<ChunkManager | null>(null);

  // Debounced chunk updates - batch changes to reduce React re-renders
  const pendingChunkUpdates = useRef<Map<string, ChunkData | null>>(new Map());
  const lastChunkSync = useRef(0);
  const CHUNK_SYNC_INTERVAL = 100; // Sync chunk state every 100ms

  // Create material
  const material = useFallbackMaterial('#3d7a37');

  // Global wind system - updated once per frame for ALL grass chunks
  // Must be declared before useFrame that uses it
  const windSystem = useMemo(() => getGlobalWindSystem(), []);

  // Initialize terrain system
  useEffect(() => {
    // Create heightmap generator with seed
    const heightmapGen = new HeightmapGenerator(seed);
    heightmapGenRef.current = heightmapGen;

    // Create chunk manager
    const chunkManager = new ChunkManager(heightmapGen);
    chunkManagerRef.current = chunkManager;

    // Set up callbacks - batch updates to pendingChunkUpdates ref (synced in useFrame)
    chunkManager.setOnChunkLoad((chunk) => {
      pendingChunkUpdates.current.set(`${chunk.coord.x},${chunk.coord.z}`, chunk);
      onChunkLoad?.(chunk.coord);
    });

    chunkManager.setOnChunkUnload((coord) => {
      pendingChunkUpdates.current.set(`${coord.x},${coord.z}`, null); // null = delete
    });

    chunkManager.setOnChunkLODChange((chunk) => {
      pendingChunkUpdates.current.set(`${chunk.coord.x},${chunk.coord.z}`, chunk);
    });

    // Initial load at origin
    const startX = playerPosition?.x ?? 0;
    const startZ = playerPosition?.z ?? 0;
    chunkManager.forceLoadRadius(startX, startZ, initialLoadRadius);

    // Immediately sync initial chunks to state (don't wait for debounce)
    if (pendingChunkUpdates.current.size > 0) {
      const initialChunks = new Map<string, ChunkData>();
      for (const [key, chunk] of pendingChunkUpdates.current) {
        if (chunk !== null) {
          initialChunks.set(key, chunk);
        }
      }
      pendingChunkUpdates.current.clear();
      setChunks(initialChunks);
    }

    setIsReady(true);
    onReady?.();

    // Cleanup
    return () => {
      chunkManager.clear();
    };
  }, [seed, initialLoadRadius]);

  // Diagnostic: Log global min/max terrain heights
  useEffect(() => {
    if (!DEBUG_TERRAIN) return;
    console.log(`[TERRAIN] Chunks loaded: ${chunks.size}`);
    if (chunks.size === 0) return;

    let globalMin = Infinity;
    let globalMax = -Infinity;
    let chunksWithHeightmap = 0;

    for (const chunk of chunks.values()) {
      if (chunk.heightmap) {
        chunksWithHeightmap++;
        globalMin = Math.min(globalMin, chunk.heightmap.minHeight);
        globalMax = Math.max(globalMax, chunk.heightmap.maxHeight);
      }
    }

    console.log('=== TERRAIN HEIGHT DIAGNOSTIC ===');
    console.log(`Total chunks: ${chunks.size}`);
    console.log(`Chunks with heightmap: ${chunksWithHeightmap}`);
    if (globalMin !== Infinity) {
      console.log(`Global Min Height: ${globalMin.toFixed(2)}m`);
      console.log(`Global Max Height: ${globalMax.toFixed(2)}m`);
      console.log(`Water Level: ${WATER_LEVEL}m`);
      console.log(`Terrain intersects water: ${globalMin < WATER_LEVEL ? 'YES ✓' : 'NO ✗'}`);
    } else {
      console.log('No heightmap data found in chunks');
    }
    console.log('=================================');
  }, [chunks]);

  // Update chunks based on player position each frame
  useFrame((_, delta) => {
    // Update wind system ONCE globally for all grass chunks
    // This was previously called 121x per frame (once per grass chunk) - now just once!
    windSystem.update(delta);

    if (!chunkManagerRef.current) return;

    const x = playerPosition?.x ?? 0;
    const z = playerPosition?.z ?? 0;

    // Update chunk manager (handles load/unload/LOD)
    chunkManagerRef.current.update(x, z);

    // Sync batched chunk updates to React state (debounced)
    const now = Date.now();
    if (pendingChunkUpdates.current.size > 0 && now - lastChunkSync.current > CHUNK_SYNC_INTERVAL) {
      lastChunkSync.current = now;

      // Apply all pending updates in a single setState call
      setChunks((prev) => {
        const next = new Map(prev);
        for (const [key, chunk] of pendingChunkUpdates.current) {
          if (chunk === null) {
            next.delete(key);
          } else {
            next.set(key, chunk);
          }
        }
        pendingChunkUpdates.current.clear();
        return next;
      });
    }
  });

  // Render all active chunks with their grass
  const chunkMeshes = useMemo(() => {
    const meshes: JSX.Element[] = [];

    for (const [key, chunk] of chunks) {
      if (chunk.vertices && chunk.indices) {
        meshes.push(
          <group key={key}>
            <TerrainChunkMesh
              chunk={chunk}
              wireframe={wireframe}
              material={material}
            />
            {grassEnabled && (
              <ChunkGrass
                chunkX={chunk.coord.x}
                chunkZ={chunk.coord.z}
                seed={seed}
                instancesPerChunk={grassDensity}
                windEnabled={windEnabled}
              />
            )}
            {treesEnabled && (
              <ChunkTreesInstanced
                chunkX={chunk.coord.x}
                chunkZ={chunk.coord.z}
                seed={seed}
                instancesPerChunk={treesDensity}
              />
            )}
            {treesEnabled && (
              <ChunkPalmTrees
                chunkX={chunk.coord.x}
                chunkZ={chunk.coord.z}
                seed={seed}
                instancesPerChunk={4}
              />
            )}
            {treesEnabled && (
              <ChunkBushes
                chunkX={chunk.coord.x}
                chunkZ={chunk.coord.z}
                seed={seed}
                instancesPerChunk={15}
              />
            )}
          </group>
        );
      }
    }

    return meshes;
  }, [chunks, wireframe, material, grassEnabled, grassDensity, windEnabled, treesEnabled, treesDensity, seed]);

  // Debug: chunk bounds visualization
  const chunkBoundsViz = useMemo(() => {
    if (!showChunkBounds) return null;

    const lines: JSX.Element[] = [];
    for (const [key, chunk] of chunks) {
      const minHeight = chunk.heightmap?.minHeight ?? 0;
      const maxHeight = chunk.heightmap?.maxHeight ?? 100;

      lines.push(
        <mesh
          key={`bounds-${key}`}
          position={[0, (minHeight + maxHeight) / 2, 0]}
        >
          <boxGeometry args={[64, maxHeight - minHeight, 64]} />
          <meshBasicMaterial color="#ff0" wireframe transparent opacity={0.2} />
        </mesh>
      );
    }

    return <>{lines}</>;
  }, [chunks, showChunkBounds]);

  if (!isReady) {
    return null;
  }

  return (
    <group name="procedural-terrain">
      {chunkMeshes}
      {chunkBoundsViz}
    </group>
  );
}

/**
 * Simple static terrain (no streaming, loads once)
 * Use this for simpler setups or testing
 */
export interface StaticTerrainProps {
  /** World seed */
  seed?: number;

  /** Chunks to load in each direction from center */
  radius?: number;

  /** Player position for physics culling (optional) */
  playerPosition?: { x: number; z: number };

  /** Wireframe mode */
  wireframe?: boolean;

  /** Use grass texture instead of solid color */
  textured?: boolean;

  /** Terrain color (when not textured) */
  color?: string;

  /** Enable grass rendering per chunk */
  grassEnabled?: boolean;

  /** Grass instances per chunk */
  grassDensity?: number;

  /** Enable wind animation on grass */
  windEnabled?: boolean;

  /** Enable tree rendering per chunk */
  treesEnabled?: boolean;

  /** Oak tree instances per chunk (grass biomes) */
  oakTreeDensity?: number;

  /** Palm tree instances per chunk (sand biomes) */
  palmTreeDensity?: number;

  /** Bush instances per chunk (forest undergrowth) */
  bushDensity?: number;

  // === PROCEDURAL GRASS (SimonDev Quick_Grass style) ===
  /** Enable procedural grass rendering */
  proceduralGrassEnabled?: boolean;

  /** Number of grass blades per chunk (default: 3072 = 32*32*3) */
  proceduralGrassBladesPerChunk?: number;

  /** Maximum render distance for grass (meters) */
  proceduralGrassMaxRenderDistance?: number;

  /** Density multiplier for fuller grass coverage (1.0 = normal, 2.0 = double) */
  proceduralGrassDensity?: number;

  /** Wind animation speed (0 = still, 0.5 = calm, 1.0 = normal) */
  proceduralGrassWindSpeed?: number;

  /** Blade size multiplier (affects height/width proportionally, 1.0 = normal) */
  proceduralGrassBladeScale?: number;

  /** Rock instances per chunk */
  rockDensity?: number;

  /** Rock size multiplier (affects grass biome boulders only) */
  rockSizeMultiplier?: number;

  /** Rock size variation (0-1, how much randomness) */
  rockSizeVariation?: number;

  /** Enable cliff meshes on steep slopes */
  cliffsEnabled?: boolean;

  // === RUST-STYLE CLIFF PROPS - Hybrid Mesh Integration ===
  /** Grid density for cliff sampling (higher = more sample points) */
  cliffGridDensity?: number;

  /** Minimum spacing between cliffs (meters) - lower = more overlap/stitching */
  cliffMinSpacing?: number;

  /** Minimum rock weight (0-1) to place cliff - matches shader rock texture */
  cliffRockWeightThreshold?: number;

  /** Minimum elevation above water (meters) */
  cliffMinElevation?: number;

  /** Minimum mountain biome mask value to place cliffs (0-1) */
  cliffMountainMaskThreshold?: number;

  // === SCALE ===
  /** Minimum scale for cliff meshes */
  cliffScaleMin?: number;

  /** Maximum scale for cliff meshes */
  cliffScaleMax?: number;

  /** How much slope influences scale (0 = no effect, 1 = steeper = larger) */
  cliffSlopeScaleInfluence?: number;

  /** X/Z-axis scale minimum (higher = wider cliffs) */
  cliffXZScaleMin?: number;

  /** X/Z-axis scale maximum (higher = wider cliffs) */
  cliffXZScaleMax?: number;

  /** Y-axis scale minimum (lower = flatter cliffs, reduces spikes) */
  cliffYScaleMin?: number;

  /** Y-axis scale maximum (lower = flatter cliffs, reduces spikes) */
  cliffYScaleMax?: number;

  // === ORIENTATION ===
  /** How much cliff tilts to follow slope (0 = upright, 1 = fully aligned) */
  cliffSlopeAlignment?: number;

  /** Random tilt variation in degrees */
  cliffRandomTilt?: number;

  /** Random yaw (rotation around Y) variation in degrees */
  cliffRandomYaw?: number;

  // === STACKING ===
  /** Enable vertical stacking for tall cliff faces */
  cliffVerticalStacking?: boolean;

  /** Vertical spacing between stacked cliffs (meters) */
  cliffVerticalSpacing?: number;

  /** Maximum cliffs in a vertical stack */
  cliffMaxStackHeight?: number;

  /** How deep to embed cliffs into terrain (0-1, fraction of scale) */
  cliffEmbedDepth?: number;

  /** Enable terrain fog */
  fogEnabled?: boolean;

  /** Fog start distance */
  fogNear?: number;

  /** Fog end distance */
  fogFar?: number;

  /** Fog color (hex string) */
  fogColor?: string;

  // === Dynamic Lighting (synced with time of day) ===

  /** Sun direction (normalized, from GameLighting) */
  sunDirection?: THREE.Vector3;

  /** Sun color (from GameLighting time of day) */
  sunColor?: THREE.Color;

  /** Sun intensity (from GameLighting time of day) */
  sunIntensity?: number;

  /** Ambient sky color for hemisphere lighting (from GameLighting) */
  ambientSkyColor?: THREE.Color;

  /** Ambient ground color for hemisphere lighting (from GameLighting) */
  ambientGroundColor?: THREE.Color;

  /** Fog color synced with time of day (for grass shader) */
  timeOfDayFogColor?: THREE.Color;

  /** Called with grass generation progress (0-100) during loading */
  onGrassGenerationProgress?: (percent: number) => void;

  // === Spotlight (Flashlight) ===

  /** Whether spotlight is enabled/on */
  spotlightEnabled?: boolean;

  /** Spotlight world position */
  spotlightPosition?: THREE.Vector3;

  /** Spotlight direction (normalized) */
  spotlightDirection?: THREE.Vector3;

  /** Spotlight color */
  spotlightColor?: THREE.Color;

  /** Spotlight intensity */
  spotlightIntensity?: number;

  /** Spotlight max distance */
  spotlightDistance?: number;

  /** Spotlight cone angle in radians */
  spotlightAngle?: number;

  /** Spotlight penumbra (0-1, edge softness) */
  spotlightPenumbra?: number;

  /** Spotlight decay (attenuation exponent) */
  spotlightDecay?: number;
}

export function StaticTerrain({
  seed = NOISE_CONFIG.seed,
  radius = 4,
  playerPosition,
  wireframe = false,
  textured = true,
  color = '#3d7a37',
  grassEnabled = true,
  grassDensity = 150,
  windEnabled = true,
  treesEnabled = true,
  oakTreeDensity = 8,
  palmTreeDensity = 2,
  bushDensity = 15,
  // Procedural grass (SimonDev Quick_Grass style)
  proceduralGrassEnabled = true,
  proceduralGrassBladesPerChunk = 3072,  // SimonDev: 32*32*3
  proceduralGrassMaxRenderDistance = 100,
  proceduralGrassDensity = 6.4,     // Full chunk coverage (64m)
  proceduralGrassWindSpeed = 0.5,   // Calm wind (0.5 = calm, 1.0 = normal)
  proceduralGrassBladeScale = 0.5,  // Half size for natural look
  rockDensity = 8,
  rockSizeMultiplier = 1.0,
  rockSizeVariation = 0.4,
  cliffsEnabled = true,
  // === DENSITY - Reduced to prevent "spike walls" ===
  cliffGridDensity = 10,           // 10x10 grid (was 12)
  cliffMinSpacing = 6,             // 6m spacing - INCREASED
  cliffRockWeightThreshold = 0.25, // Slightly higher threshold
  cliffMinElevation = 18,          // High elevation only - mountain zones
  cliffMountainMaskThreshold = 0.4, // REQUIRE mountain zones (Rust-style)
  // === SCALE - Wide range for visual variety ===
  cliffScaleMin = 0.3,             // Small filler rocks
  cliffScaleMax = 1.2,             // Large anchor cliffs
  cliffSlopeScaleInfluence = 0.5,  // Steeper slopes get larger cliffs
  cliffXZScaleMin = 0.9,           // X/Z-axis minimum (wider base)
  cliffXZScaleMax = 1.4,           // X/Z-axis maximum (wider base)
  cliffYScaleMin = 0.5,            // Y-axis minimum (flatter cliffs)
  cliffYScaleMax = 0.9,            // Y-axis maximum (flatter cliffs)
  // === ORIENTATION ===
  cliffSlopeAlignment = 1,         // Full alignment with slope
  cliffRandomTilt = 12,            // Natural randomness
  cliffRandomYaw = 45,             // Rotation variety
  // === STACKING ===
  cliffVerticalStacking = true,    // Stack cliffs on tall slopes
  cliffVerticalSpacing = 6,        // Meters between stacked cliffs
  cliffMaxStackHeight = 2,         // Allow stacking on steep faces
  cliffEmbedDepth = 0.4,           // Deeper embedding hides seams
  fogEnabled = true,
  fogNear = 150,
  fogFar = 400,
  fogColor = '#b3c4d9',
  // Dynamic lighting props (from GameLighting)
  sunDirection,
  sunColor,
  sunIntensity,
  ambientSkyColor,
  ambientGroundColor,
  timeOfDayFogColor,
  // Spotlight (flashlight) props
  spotlightEnabled,
  spotlightPosition,
  spotlightDirection,
  spotlightColor,
  spotlightIntensity,
  spotlightDistance,
  spotlightAngle,
  spotlightPenumbra,
  spotlightDecay,
  // Grass generation progress callback
  onGrassGenerationProgress,
}: StaticTerrainProps) {
  // =========================================================================
  // NEW TERRAIN SYSTEM (v2) - Hybrid height + flow-based rivers
  // =========================================================================
  const terrainGen = useMemo(() => {
    if (!USE_NEW_TERRAIN) return null;
    return new TerrainGenerator(seed, radius);
  }, [seed, radius]);

  // Initialize hydrology for new terrain system
  const hydrology = useMemo(() => {
    if (!USE_NEW_TERRAIN || !terrainGen) return null;

    const hydro = new HydrologySimulator();
    // Use raw height function (without river carving) for hydrology computation
    const worldRadius = radius * CHUNK_SIZE;
    hydro.initialize(
      (x, z) => terrainGen.getRawHeight(x, z),
      0, // centerX
      0, // centerZ
      worldRadius
    );
    // Connect hydrology to terrain generator
    terrainGen.setHydrology(hydro);
    return hydro;
  }, [terrainGen, radius]);

  // =========================================================================
  // LEGACY TERRAIN SYSTEM (v1) - Keep for fallback
  // =========================================================================
  const heightmapGen = useMemo(() => {
    if (USE_NEW_TERRAIN) return null;
    return new HeightmapGenerator(seed, radius);
  }, [seed, radius]);

  // Note: hydrology is used for side effects (initializing terrainGen)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  void hydrology; // Keep reference to prevent tree-shaking


  // Convert hex color to THREE.Color for terrain material
  const fogColorThree = useMemo(() => new THREE.Color(fogColor), [fogColor]);

  // Create THREE.Vector3 for procedural grass (needs full 3D position)
  const playerPositionVec3 = useMemo(() => {
    return new THREE.Vector3(
      playerPosition?.x ?? 0,
      0, // Y position updated during render
      playerPosition?.z ?? 0
    );
  }, [playerPosition?.x, playerPosition?.z]);

  // Use full terrain material with biome splatting (grass, rock, sand)
  const terrainMaterial = useTerrainMaterial({
    fogEnabled,
    fogNear,
    fogFar,
    fogColor: fogColorThree,
    // Dynamic lighting (synced with time of day)
    sunDirection,
    sunColor,
    sunIntensity,
    ambientSkyColor,
    ambientGroundColor,
    // Spotlight (flashlight) for terrain illumination
    spotlightEnabled,
    spotlightPosition,
    spotlightDirection,
    spotlightColor,
    spotlightIntensity,
    spotlightDistance,
    spotlightAngle,
    spotlightPenumbra,
    spotlightDecay,
  });
  const fallbackMaterial = useFallbackMaterial(color);
  const material = textured ? terrainMaterial : fallbackMaterial;

  // Generate chunks once using active generator (new or legacy)
  const chunks = useMemo(() => {
    // Use appropriate generator based on feature flag
    const gen = USE_NEW_TERRAIN ? terrainGen : heightmapGen;
    if (!gen) {
      console.warn('⚠️ No terrain generator available!');
      return [];
    }

    const result: ChunkData[] = [];
    const centerChunk = Math.floor(CHUNKS_PER_AXIS / 2); // Middle of chunk grid

    let globalMin = Infinity;
    let globalMax = -Infinity;
    let skippedCount = 0;
    let keptCount = 0;

    for (let dz = -radius; dz <= radius; dz++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const x = centerChunk + dx;
        const z = centerChunk + dz;

        // Skip chunks beyond world boundary
        const chunkCenter = chunkToWorld(x, z);
        const chunkDistFromOrigin = Math.hypot(chunkCenter.x, chunkCenter.z);
        if (chunkDistFromOrigin > WORLD_BOUNDARY) {
          skippedCount++;
          continue;
        }
        keptCount++;

        // Always use LOD0 for visual terrain to match physics exactly
        // This ensures the visual mesh matches the TrimeshCollider geometry
        // which is preloaded at LOD0 for accurate collisions
        const chunkDist = Math.sqrt(dx * dx + dz * dz) * 64;
        const lod = 0;  // Force LOD0 for physics accuracy

        const heightmap = gen.generateChunkHeightmap(x, z, lod);
        const vertices = gen.generateChunkVertices(x, z, lod);
        const normals = gen.generateChunkNormals(x, z, lod);
        const uvs = gen.generateChunkUVs(lod);
        const indices = gen.generateChunkIndices(lod);

        // Track global min/max
        globalMin = Math.min(globalMin, heightmap.minHeight);
        globalMax = Math.max(globalMax, heightmap.maxHeight);

        result.push({
          coord: { x, z },
          state: ChunkState.Active,
          lod,
          distance: chunkDist,
          heightmap,
          vertices,
          normals,
          uvs,
          indices,
          lastAccess: 0,
          priority: 0,
        });
      }
    }

    // Debug logging disabled for performance
    if (DEBUG_TERRAIN && result.length === 0) {
      console.warn('⚠️ No chunks generated! Check world boundary and chunk coordinates.');
    }

    return result;
  }, [terrainGen, heightmapGen, radius]);

  // Register chunks with visibility system
  useEffect(() => {
    const visibility = getVisibilityManager();

    // Register all chunks for visibility tracking
    for (const chunk of chunks) {
      visibility.registerChunk(chunk.coord.x, chunk.coord.z);
    }

    // Cleanup: unregister chunks on unmount
    return () => {
      for (const chunk of chunks) {
        visibility.unregisterChunk(chunk.coord.x, chunk.coord.z);
      }
    };
  }, [chunks]);

  // === TERRAIN VISIBILITY (hide until grass is ready to prevent green plane) ===
  const [terrainVisible, setTerrainVisible] = useState(!proceduralGrassEnabled);


  return (
    <group name="static-terrain">
      {/* Terrain chunks - hidden until grass is ready (prevents green plane) */}
      <group visible={terrainVisible}>
        {chunks.map((chunk) => (
          <group key={`${chunk.coord.x},${chunk.coord.z}`}>
            <TerrainChunkMesh
              chunk={chunk}
              wireframe={wireframe}
              material={material}
            />
            {/* Legacy grass (instanced patches) */}
            {grassEnabled && !proceduralGrassEnabled && (
              <ChunkGrass
                chunkX={chunk.coord.x}
                chunkZ={chunk.coord.z}
                seed={seed}
                chunkRadius={radius}
                terrainGen={terrainGen ?? undefined}
                instancesPerChunk={grassDensity}
                windEnabled={windEnabled}
              />
            )}
          {treesEnabled && oakTreeDensity > 0 && (
            <ChunkTreesInstanced
              chunkX={chunk.coord.x}
              chunkZ={chunk.coord.z}
              seed={seed}
              chunkRadius={radius}
              terrainGen={terrainGen ?? undefined}
              instancesPerChunk={oakTreeDensity}
              playerPosition={playerPosition}
            />
          )}
          {treesEnabled && palmTreeDensity > 0 && (
            <ChunkPalmTrees
              chunkX={chunk.coord.x}
              chunkZ={chunk.coord.z}
              seed={seed}
              chunkRadius={radius}
              terrainGen={terrainGen ?? undefined}
              instancesPerChunk={palmTreeDensity}
              playerPosition={playerPosition}
            />
          )}
          {treesEnabled && bushDensity > 0 && (
            <ChunkBushes
              chunkX={chunk.coord.x}
              chunkZ={chunk.coord.z}
              seed={seed}
              chunkRadius={radius}
              terrainGen={terrainGen ?? undefined}
              instancesPerChunk={bushDensity}
            />
          )}
          {rockDensity > 0 && (
            <ChunkRocks
              chunkX={chunk.coord.x}
              chunkZ={chunk.coord.z}
              seed={seed}
              chunkRadius={radius}
              terrainGen={terrainGen ?? undefined}
              instancesPerChunk={rockDensity}
              sizeMultiplier={rockSizeMultiplier}
              sizeVariation={rockSizeVariation}
            />
          )}
          {cliffsEnabled && (
            <ChunkCliffs
              chunkX={chunk.coord.x}
              chunkZ={chunk.coord.z}
              seed={seed}
              chunkRadius={radius}
              terrainGen={terrainGen ?? undefined}
              playerPosition={playerPosition ? { x: playerPosition.x, z: playerPosition.z } : undefined}
              // Density
              gridDensity={cliffGridDensity}
              minSpacing={cliffMinSpacing}
              rockWeightThreshold={cliffRockWeightThreshold}
              minElevation={cliffMinElevation}
              mountainMaskThreshold={cliffMountainMaskThreshold}
              // Scale
              scaleMin={cliffScaleMin}
              scaleMax={cliffScaleMax}
              slopeScaleInfluence={cliffSlopeScaleInfluence}
              xzScaleMin={cliffXZScaleMin}
              xzScaleMax={cliffXZScaleMax}
              yScaleMin={cliffYScaleMin}
              yScaleMax={cliffYScaleMax}
              // Orientation
              slopeAlignment={cliffSlopeAlignment}
              randomTilt={cliffRandomTilt}
              randomYaw={cliffRandomYaw}
              // Stacking
              verticalStackingEnabled={cliffVerticalStacking}
              verticalSpacing={cliffVerticalSpacing}
              maxStackHeight={cliffMaxStackHeight}
              // Embedding
              embedDepth={cliffEmbedDepth}
            />
          )}
        </group>
      ))}
      </group>

      {/* GrassManager - Single component manages ALL grass (SimonDev pattern) */}
      {proceduralGrassEnabled && terrainGen && (
        <GrassManager
          chunks={chunks}
          terrainGen={terrainGen}
          playerPosition={playerPositionVec3}
          enabled={proceduralGrassEnabled}
          onFirstGrassVisible={() => setTerrainVisible(true)}
          onGenerationProgress={onGrassGenerationProgress}
          bladesPerChunk={proceduralGrassBladesPerChunk}
          maxRenderDistance={proceduralGrassMaxRenderDistance}
          densityMultiplier={proceduralGrassDensity}
          bladeScale={proceduralGrassBladeScale}
          windSpeed={proceduralGrassWindSpeed}
          fogColor={timeOfDayFogColor}
        />
      )}
    </group>
  );
}

export default ProceduralTerrain;
