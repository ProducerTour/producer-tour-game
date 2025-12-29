# Rust-Style Procedural Terrain Architecture

Technical reference for the hybrid terrain generation system combining procedural heightmaps with 3D mesh prefabs.

---

## Overview

This terrain system replicates the procedural island generation found in **Rust by Facepunch**, adapted for a 5-chunk (~640m diameter) playable area in Three.js/React Three Fiber.

### Core Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        TERRAIN PIPELINE                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  TerrainConfig.ts          TerrainGenerator.ts                       │
│  ┌──────────────┐          ┌─────────────────────────────────┐      │
│  │ WORLD_SIZE   │          │ Layer 1: Island Mask            │      │
│  │ CHUNK_SIZE   │    ──►   │ Layer 2: Base Height (FBM)      │      │
│  │ BEACH_CONFIG │          │ Layer 3: Mountain Zones         │      │
│  │ MOUNTAIN_CFG │          │ Layer 4: Ridged Multifractal    │      │
│  └──────────────┘          │ Layer 5: Beach Erosion          │      │
│                            │ Layer 6: Detail Noise           │      │
│                            │ Layer 7: River Carving          │      │
│                            └─────────────────────────────────┘      │
│                                          │                           │
│                                          ▼                           │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    CHUNK GENERATION                          │    │
│  │  • Heightmap (Float32Array)                                  │    │
│  │  • Vertices (world-space positions)                          │    │
│  │  • Normals (for slope detection)                             │    │
│  │  • UVs (for texture sampling)                                │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                          │                           │
│              ┌───────────────────────────┼───────────────────────┐  │
│              ▼                           ▼                       ▼  │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────┐  │
│  │ TerrainMaterial  │    │  Vegetation      │    │ Cliff Prefabs│  │
│  │ (Splat Shader)   │    │  (Trees, Grass)  │    │ (InstancedMesh)│ │
│  └──────────────────┘    └──────────────────┘    └──────────────┘  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 1. Splat Map / Biome Weight System

A **splat map** (or weight map) is a control texture that tells the shader where to display each biome texture. Instead of one large terrain image, the splat map acts as a "blueprint" for blending grass, sand, rock, and snow.

### Channel Mapping

```
RGBA Splat Map (4 channels):
┌────────────────┬───────────────────────────────────────────┐
│ Channel        │ Biome / Usage                             │
├────────────────┼───────────────────────────────────────────┤
│ R (Red)        │ Rock weight (steep slopes, high altitude) │
│ G (Green)      │ Grass weight (default fill)               │
│ B (Blue)       │ Sand weight (beach zone, low elevation)   │
│ A (Alpha)      │ Snow weight (high peaks, gentle slopes)   │
└────────────────┴───────────────────────────────────────────┘

Additional channel (computed separately):
• Forest weight (mid elevation + moisture noise)
```

### Normalized Weights

At any given pixel, the sum of biome weights should equal 1.0 (100%):

```glsl
// TerrainMaterial.tsx - Fragment Shader
float totalWeight = grassWeight + rockWeight + sandWeight + snowWeight + forestWeight;
if (totalWeight > 0.0) {
  grassWeight /= totalWeight;
  rockWeight /= totalWeight;
  sandWeight /= totalWeight;
  snowWeight /= totalWeight;
  forestWeight /= totalWeight;
}
```

### Procedural Weight Calculation

Our system computes biome weights **per-fragment** based on terrain data:

```typescript
// Pseudocode for biome weight calculation
function calculateBiomeWeights(height, slope, worldPos) {
  // HEIGHT-BASED BIOMES
  if (height < WATER_LEVEL + 2) {
    sandWeight = 1.0;  // Beach zone
  }

  if (height > snowMin) {
    snowWeight = smoothstep(snowMin - transition, snowMin, height);
    snowWeight *= (1.0 - slope);  // Snow slides off steep slopes
  }

  // SLOPE-BASED BIOMES
  if (slope > CLIFF_THRESHOLD) {
    rockWeight = smoothstep(0.15, 0.35, slope);
  }

  // MOISTURE/NOISE VARIATION
  float moisture = noise2D(worldPos.xz * 0.01);
  forestWeight = forestAltitude * (1.0 - slope) * moisture;

  // Grass fills remaining space
  grassWeight = 1.0 - (sandWeight + rockWeight + snowWeight + forestWeight);

  return normalize(weights);
}
```

### Implementation in Shader

```glsl
// TerrainMaterial.tsx - Final color blending
vec3 finalColor = grassColorSample.rgb * grassWeight
                + rockColorSample.rgb * rockWeight
                + sandColorValue * sandWeight
                + snowColor * snowWeight
                + forestFloorColor * forestWeight;
```

---

## 2. Hybrid Terrain Approach

Standard heightmaps cannot represent:
- 90-degree vertical cliffs
- Overhangs and caves
- Sharp terrain features without extreme texture stretching

### Solution: Mesh Prefabs on Steep Gradients

```
┌─────────────────────────────────────────────────────────────────────┐
│                     HYBRID TERRAIN SYSTEM                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   BASE TERRAIN (Heightmap Mesh)                                      │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  • Procedural noise-based height                             │   │
│   │  • Works for slopes 0-60 degrees                             │   │
│   │  • Triplanar shader prevents stretching                      │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                              │                                       │
│                              ▼                                       │
│   CLIFF DETECTION (Slope Analysis)                                   │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  if (slope > CLIFF_THRESHOLD) {                              │   │
│   │    // Mark for prefab placement                              │   │
│   │    cliffPositions.push({ x, y, z, normal, slope });          │   │
│   │  }                                                           │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                              │                                       │
│                              ▼                                       │
│   3D CLIFF PREFABS (InstancedMesh)                                   │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  • Pre-modeled rock/cliff meshes                             │   │
│   │  • Rotated to match terrain normal                           │   │
│   │  • Scaled based on slope steepness                           │   │
│   │  • Thousands rendered in single draw call                    │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Cliff Placement Logic

From `ChunkCliffs.tsx`:

```typescript
// For each sample point in the chunk grid
for (let gz = 0; gz < gridDensity; gz++) {
  for (let gx = 0; gx < gridDensity; gx++) {
    const terrain = terrainGen.sampleTerrain(worldX, worldZ);

    // SLOPE DETECTION: normal.y = cos(slope angle)
    // normal.y = 1.0 (flat), 0.0 (vertical), <0 (overhang)
    const slope = 1.0 - terrain.normal.y;

    // Only place cliffs where rock texture would appear
    if (rockWeight > rockWeightThreshold) {
      // Rotate prefab to align with terrain slope
      const quaternion = new THREE.Quaternion();
      quaternion.setFromUnitVectors(UP_VECTOR, terrain.normal);

      cliffPlacements.push({
        position: new THREE.Vector3(worldX, terrain.height, worldZ),
        quaternion,
        scale: calculateScale(slope, slopeScaleInfluence)
      });
    }
  }
}
```

---

## 3. Instanced Rendering for Performance

To maintain 60 FPS with thousands of cliff/rock meshes, we use `THREE.InstancedMesh`:

```typescript
// Single draw call for all cliff instances
const cliffMesh = new THREE.InstancedMesh(
  cliffGeometry,
  cliffMaterial,
  maxInstances
);

// Set transform for each instance
placements.forEach((placement, i) => {
  const matrix = new THREE.Matrix4();
  matrix.compose(placement.position, placement.quaternion, placement.scale);
  cliffMesh.setMatrixAt(i, matrix);
});

cliffMesh.instanceMatrix.needsUpdate = true;
```

### Performance Comparison

| Approach | Draw Calls | FPS (1000 cliffs) |
|----------|-----------|-------------------|
| Individual meshes | 1000 | ~15 FPS |
| InstancedMesh | 1 | ~60 FPS |
| Merged geometry | 1 | ~55 FPS* |

*Merged geometry doesn't allow per-instance culling

---

## 4. Flat-Top Mountains (Plateaus/Mesas)

To create mesa-style terrain that triggers cliff placement on edges:

### Height Clamping

```typescript
// TerrainGenerator.ts - getMountainHeight()
let normalizedRidged = ridged / 2.0;

if (cfg.plateauEnabled && normalizedRidged > cfg.plateauThreshold) {
  if (cfg.terraceSteps > 0) {
    // Quantize to discrete steps (stair-like terraces)
    const step = 1.0 / cfg.terraceSteps;
    normalizedRidged = Math.floor(normalizedRidged / step) * step;
  } else {
    // Smooth sigmoid clamping (natural plateau)
    const excess = normalizedRidged - cfg.plateauThreshold;
    const maxExcess = 1.0 - cfg.plateauThreshold;
    const softClamp = excess * cfg.plateauSmooth / (excess + cfg.plateauSmooth * maxExcess);
    normalizedRidged = cfg.plateauThreshold + softClamp * maxExcess * 0.3;
  }
}
```

### Configuration

```typescript
// TerrainConfig.ts
export const MOUNTAIN_CONFIG = {
  // ...existing config...

  // Plateau/Mesa configuration
  plateauEnabled: true,
  plateauThreshold: 0.7,    // Flatten above 70% of max height
  plateauSmooth: 0.3,       // Smoothness of transition
  terraceSteps: 0,          // 0=smooth, 2-5=visible steps
};
```

### Visual Result

```
Without Plateau:          With Plateau:
      /\                      ___
     /  \                    /   \
    /    \                  /     \
   /      \                |       |
  /        \              /         \
 /          \            /           \
────────────────       ────────────────
```

The flat tops create sharp edges that trigger cliff mesh placement on the vertical sides.

---

## 5. Triplanar Shader for Texture Projection

Prevents texture stretching on steep slopes by projecting textures from 3 axes:

```glsl
// Triplanar sampling (simplified)
vec3 blending = abs(vWorldNormal);
blending = normalize(max(blending, 0.00001));
float b = blending.x + blending.y + blending.z;
blending /= b;

// Sample texture from each axis
vec4 xAxis = texture2D(rockTexture, vWorldPosition.yz * scale);
vec4 yAxis = texture2D(rockTexture, vWorldPosition.xz * scale);
vec4 zAxis = texture2D(rockTexture, vWorldPosition.xy * scale);

// Blend based on surface normal
vec4 finalColor = xAxis * blending.x + yAxis * blending.y + zAxis * blending.z;
```

Current implementation uses simpler XZ projection with normal-based rock blending, which works well for our terrain scale.

---

## 6. Vegetation Placement Rules

### Height/Slope Filtering

```typescript
// ChunkTrees.tsx - Oak tree placement
const minTreeHeight = BEACH_CONFIG.duneMax;  // 6m (above beach)
const maxTreeHeight = 40;                     // Below mountain peaks
const maxSlope = 0.7;                         // ~45 degrees

// Skip if underwater, beach, or steep
if (height < minTreeHeight) continue;
if (height > maxTreeHeight) continue;
if (terrain.normal.y < maxSlope) continue;

// ChunkPalmTrees.tsx - Palm tree placement
const minPalmHeight = WATER_LEVEL + 0.5;     // Just above water
const maxPalmHeight = BEACH_CONFIG.duneMax + 2;  // Beach zone only
const distFromCoast = worldRadius - distFromCenter;
if (distFromCoast > 50) continue;  // Only within 50m of coast
```

### Density Noise

```typescript
// Natural forest distribution using FBM noise
const densityNoise = terrainGen.noise.fbm2(x * 0.02, z * 0.02, 2, 0.5, 2.0, 1.0);
const forestDensity = 0.5 + densityNoise * 0.3;
if (randDensity > forestDensity) continue;  // Skip sparse areas
```

### Y-Position Embedding

```typescript
// Prevent floating trees by embedding slightly into ground
const y = height - bounds.min.y - 0.1;  // 10cm below surface
```

---

## 7. File Reference

| File | Purpose |
|------|---------|
| `TerrainConfig.ts` | World constants, biome config, noise parameters |
| `TerrainGenerator.ts` | Height generation, biome sampling, chunk creation |
| `TerrainMaterial.tsx` | Splat shader, texture blending, fog |
| `ProceduralTerrain.tsx` | Chunk orchestration, LOD management |
| `ChunkCliffs.tsx` | Cliff prefab placement, instanced rendering |
| `ChunkTrees.tsx` | Oak tree placement with biome filtering |
| `ChunkPalmTrees.tsx` | Palm tree placement in beach zones |
| `ChunkGrass.tsx` | Grass blade instancing |
| `ChunkRocks.tsx` | Boulder/rock placement |
| `HydrologySimulator.ts` | River flow simulation |
| `BiomeLookupTable.ts` | Data-driven biome classification |

---

## 8. References

- [Rust Wiki - The Map](https://wiki.facepunch.com/rust/map) - Official Rust map generation
- [Red Blob Games - Terrain from Noise](https://www.redblobgames.com/maps/terrain-from-noise/) - Noise layering techniques
- [libnoise - Complex Terrain Tutorial](https://libnoise.sourceforge.net/tutorials/tutorial5.html) - Ridged multifractal
- [THREE.Terrain Library](https://github.com/IceCreamYou/THREE.Terrain) - Texture splatting reference
- [Triplanar Mapping](https://www.martinpalko.com/triplanar-mapping/) - Texture projection for cliffs

---

## 9. Performance Considerations

### Current System (5-Chunk World)

- **~100 chunks** at radius 5
- **LOD system** reduces vertex count at distance
- **Procedural splatmap** computed per-fragment (flexible but GPU-intensive)
- **InstancedMesh** for all vegetation and cliffs

### Future Optimizations

1. **Pre-computed Splatmap Textures** - Generate RGBA textures per chunk for faster lookups
2. **WebWorker Terrain Generation** - Offload noise calculation to separate thread
3. **WASM/Rust Integration** - Heavy math in WebAssembly for native-like performance
4. **Texture Arrays** - Support 8+ biome types without multi-texture overhead

---

*Last updated: December 2025*
