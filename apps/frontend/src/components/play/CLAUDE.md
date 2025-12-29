# Game Development Context (React Three Fiber)

This directory contains a 3D multiplayer game built with React Three Fiber (R3F).

---

## 🚨 CRITICAL: Architecture-First Development Rules

### Rule 1: Always Trace the Prop Flow FIRST

Before changing ANY default value, trace the full architecture chain:

```
WorldConfig.ts (DEFAULT_WORLD_CONFIG)   ← TRUE SOURCE OF DEFAULTS
        ↓
    Leva hooks (useWorldControls)
        ↓
    PlayWorld.tsx (cityMapControls)
        ↓
    StaticTerrain / ProceduralTerrain
        ↓
    Child Components (ChunkCliffs, ChunkTrees, etc.)
```

**Defaults set lower in the chain are IGNORED if the parent passes explicit props.**

### Rule 2: Where to Make Changes

| Change Type | Where to Edit | Why |
|-------------|---------------|-----|
| **Default values** | `WorldConfig.ts` → `DEFAULT_WORLD_CONFIG` | This is the true source |
| **Leva slider ranges** | `WorldConfig.ts` → `useWorldControls()` | Controls UI bounds |
| **Component logic** | The component file itself | Internal behavior |
| **New props** | ALL layers (interface → defaults → prop pass-through) | Full chain required |

### Rule 3: Verification Checklist

When making default changes:

1. ✅ Check `WorldConfig.ts` `DEFAULT_WORLD_CONFIG` - **change here FIRST**
2. ✅ Check `WorldConfig.ts` Leva control min/max bounds
3. ✅ Verify `PlayWorld.tsx` passes the prop (not hardcoded)
4. ✅ Verify `ProceduralTerrain.tsx` destrucutres and passes prop
5. ✅ Verify child component receives and uses the prop

### Rule 4: Adding New Configurable Properties

When adding a new prop that should be configurable:

```typescript
// 1. WorldConfig.ts - Add to WorldConfig interface
interface WorldConfig {
  myNewProp: number;
  // ...
}

// 2. WorldConfig.ts - Add to DEFAULT_WORLD_CONFIG
export const DEFAULT_WORLD_CONFIG: WorldConfig = {
  myNewProp: 42,
  // ...
};

// 3. WorldConfig.ts - Add to useWorldControls (Leva)
myNewProp: { value: DEFAULT_WORLD_CONFIG.myNewProp, min: 0, max: 100 },

// 4. WorldConfig.ts - Add to useMemo return
myNewProp: controls.myNewProp,

// 5. WorldConfig.ts - Add to useMemo dependencies
controls.myNewProp,

// 6. PlayWorld.tsx - Pass to StaticTerrain
<StaticTerrain myNewProp={cityMapControls.myNewProp} ... />

// 7. ProceduralTerrain.tsx - Add to StaticTerrainProps interface
interface StaticTerrainProps {
  myNewProp?: number;
}

// 8. ProceduralTerrain.tsx - Destructure with fallback
export function StaticTerrain({
  myNewProp = 42,  // Fallback only if parent doesn't pass it
  ...
})

// 9. Pass to child component
<ChildComponent myNewProp={myNewProp} />

// 10. Child component - Define in interface and use
```

### Rule 5: Testing Changes

After making default changes:

1. **Hard refresh** (Cmd+Shift+R) to clear cache
2. **Check in incognito** to bypass localStorage Leva state
3. **Check console** for the actual values being used
4. **Check Leva panel** to see if defaults appear correctly

### Rule 6: Common Mistakes

| Mistake | Why It Fails | Correct Approach |
|---------|--------------|------------------|
| Changing only ChunkCliffs defaults | Parent overrides with explicit props | Change WorldConfig.ts |
| Changing only ProceduralTerrain defaults | PlayWorld passes cityMapControls | Change WorldConfig.ts |
| Forgetting to add to useMemo deps | Stale values, no reactivity | Add to dependency array |
| Hardcoding in PlayWorld | Can't be changed via Leva | Use cityMapControls.propName |

---

## 🚀 New Feature Discussion Template

Before implementing ANY new game element, answer these questions:

### Quick Decision Matrix

```
Is it configurable at runtime?
├─ YES → Full chain: WorldConfig → Leva → PlayWorld → Component
└─ NO  → Hardcode in component (simpler)

Does it spawn on terrain?
├─ YES → Needs terrainGen prop, chunk-owned, height/biome checks
└─ NO  → Can be placed manually or globally

Does it need physics?
├─ YES → RigidBody + Collider, pick collision group
└─ NO  → Visual only (particles, decals, skybox)

Does multiplayer see it?
├─ YES → Sync via Liveblocks presence/storage
└─ NO  → Client-only (local effects)

How many instances?
├─ 1-10     → Individual meshes fine
├─ 10-100   → Consider instancing
└─ 100+     → MUST use InstancedMesh + chunk-owned
```

### Feature Request Format

When requesting a new feature, provide:

```markdown
**Feature**: [Name]
**Configurable?** Yes/No (if yes, what props?)
**Terrain?** Spawn rules (biome, elevation, slope)
**Physics?** Collision type (none/static/dynamic)
**Multiplayer?** Sync needed? (none/presence/storage)
**Instances?** Expected count per chunk/world
**Assets?** Model path, textures needed
**State?** Zustand store needed?
**Reference?** Similar existing component to copy from
```

### Example Filled Out

```markdown
**Feature**: Campfire
**Configurable?** Yes - density, enabled toggle
**Terrain?** Grass biome only, flat terrain (slope < 0.1), min 20m from water
**Physics?** Static cylinder collider (player can't walk through)
**Multiplayer?** No sync (decorative)
**Instances?** 1-2 per chunk, chunk-owned
**Assets?** /models/Props/campfire.glb (need to add)
**State?** None
**Reference?** Copy ChunkRocks.tsx pattern
```

---

## ⚡ Speed-Run Patterns

### Copy-From Reference Components

| New Feature Type | Copy From | Key Modifications |
|------------------|-----------|-------------------|
| Terrain prop (trees, rocks) | `ChunkTrees.tsx` | Change model, placement rules |
| Physics object | `ChunkRocks.tsx` | Has RigidBody pattern |
| Beach-only spawn | `ChunkPalmTrees.tsx` | Distance-from-coast logic |
| Mountain-only spawn | `ChunkCliffs.tsx` | Mountain mask check |
| Animated vegetation | `ChunkGrass.tsx` | Wind shader pattern |
| Water feature | `Water.tsx` | Shader-based water |
| UI overlay | `debug/DebugOverlay.tsx` | HTML overlay pattern |

### Performance Budgets

| Category | Budget | Consequence if Exceeded |
|----------|--------|-------------------------|
| Draw calls | < 200 | FPS drops below 60 |
| Triangles | < 500K visible | GPU bound |
| Instances per chunk | < 500 | Memory issues |
| Physics bodies | < 1000 | Physics stutter |
| Texture memory | < 256MB | OOM on mobile |

### Asset Conventions

```
/models/
  /Foliage/Trees/     → tree_oak.glb, palm_tree.glb
  /Rocks/             → rock_1.glb, cliff_alaska.glb
  /Props/             → campfire.glb, crate.glb
  /Characters/        → player.glb, npc_*.glb

/textures/
  /terrain/           → grass.png, rock.png, sand.png
  /ground/            → grass_patches.glb (instanced)
  /Water/             → water_normal.png

Naming: lowercase_with_underscores.glb
Format: GLTF/GLB preferred, PNG textures (power of 2)
```

### Quick Validation Checklist

After implementing, verify:

- [ ] Works in incognito (no cached state)
- [ ] Leva controls update in real-time
- [ ] No console errors/warnings
- [ ] Doesn't spawn in water (if terrain-based)
- [ ] Physics collision works (if applicable)
- [ ] Performance: no FPS drop when enabled

---

## Tech Stack
- **React Three Fiber (R3F)** - React renderer for Three.js
- **@react-three/drei** - Useful R3F helpers (useTexture, useGLTF, etc.)
- **@react-three/rapier** - Physics via Rapier
- **Custom GLSL shaders** - For terrain splatting, effects
- **Liveblocks** - Real-time multiplayer

## Critical Shader Concepts

### World-Space vs View-Space Normals
**ALWAYS use world-space for terrain/environment calculations:**

```glsl
// CORRECT - World-space (camera-independent)
vWorldNormal = normalize(mat3(modelMatrix) * normal);
float slope = 1.0 - vWorldNormal.y;

// WRONG - View-space (changes with camera rotation!)
vNormal = normalize(normalMatrix * normal);
float slope = 1.0 - vNormal.y; // BUG: slope changes as camera rotates
```

**When to use each:**
- World-space (`modelMatrix`): Terrain, biomes, environmental effects
- View-space (`normalMatrix`): Rim lighting, fresnel, screen-space effects

### Slope Calculation
```glsl
float slope = 1.0 - worldNormal.y;
// 0.0 = perfectly flat (normal pointing up)
// 0.15 = ~25 degrees
// 0.35 = ~45 degrees
// 0.5 = ~60 degrees
// 1.0 = vertical cliff (normal pointing sideways)
```

### Texture Tiling
Pick ONE method, not both:
```glsl
// Option A: Shader-based (preferred for terrain)
vec2 uv = fract(vWorldPosition.xz * scale);

// Option B: Three.js repeat (simple cases)
texture.repeat.set(8, 8);

// WRONG: Using both causes double-scaling
```

## Terrain System

### Key Files
- `terrain/TerrainMaterial.tsx` - Shader material with biome splatting
- `terrain/TerrainChunkMesh.tsx` - Chunk geometry rendering
- `lib/terrain/HeightmapGenerator.ts` - Procedural heightmap generation
- `lib/terrain/TerrainConfig.ts` - Centralized world constants

### Biome Weights (Keep CPU and Shader in Sync!)
When changing biome thresholds, update BOTH:
1. Shader in `TerrainMaterial.tsx`
2. CPU in `HeightmapGenerator.calculateBiomeWeights()`

### World Boundaries
```typescript
WORLD_PLAY_RADIUS = 1200    // Safe play area
WORLD_TRANSITION_WIDTH = 500 // Fade to water
WORLD_BOUNDARY = 1700        // Hard edge
WATER_LEVEL = 2.0            // Sea level
```

### Mountain System
Mountains are concentrated in a **small corner region opposite of sand/beach**.

**How it works:**
1. On init, `computeMountainDirection()` samples terrain to find where sand concentrates
2. Mountain direction is set to the **opposite corner**
3. Mountains only appear within a ~60° cone facing that direction (tight sector, not broad)
4. Ridged noise creates dramatic peaks within the cone
5. Secondary peak noise adds variation for more pronounced shapes

**Key parameters in HeightmapGenerator:**
```typescript
coneThreshold = 0.5         // ~60° cone for mountain placement
coneFull = 0.8              // Full mountain strength at ~35°
mountainInnerRadius = 400   // No mountains within 400m of spawn
mountainOuterRadius = 1000  // Mountains fade before coast
mountainLift = 120          // Max height boost (dramatic peaks)
```

**getMountainMask(x, z)** - Returns 0-1 mask value for grass/vegetation culling

**Rock vs Mountain:**
- Rock texture appears on **steep slopes anywhere** (slope > 0.15)
- Mountains are **elevation features** concentrated in one corner
- Mountain areas get rock texture due to steepness, but rock can appear on small cliffs in grass biomes too

## Cliff System (Production-Locked)

**Status: LOCKED** - Algorithm is tuned and validated. Do not extend without strong justification.

### Key File
- `terrain/ChunkCliffs.tsx` - GPU-instanced cliff mesh placement

### Architecture
The cliff system uses a **field-based orientation** approach rather than per-point classification:

1. **Build candidate cells** - Sample terrain, filter by rock weight and elevation
2. **Compute directional curvature** - Hessian matrix along downhill direction
3. **Build facing field** - k > 0 (ridge) → face downhill, k < 0 (valley) → face uphill
4. **Smooth field** - Neighbor averaging eliminates isolated orientation flips
5. **Place instances** - Use coherent facing vectors from smoothed field

### Why This Works
Per-point classification causes random flips because adjacent points can classify differently.
Field-based orientation treats facing as a **continuous spatial problem**, ensuring coherence.

References:
- [Procedural Generation Best Practices](https://www.gamedeveloper.com/design/devs-weigh-in-on-the-best-ways-to-use-but-not-abuse-procedural-generation)
- [World Creator Terrain Pipeline](https://digitalproduction.com/2024/11/27/world-creator-2024-3-enhanced-terrain-generation-for-game-dev-and-vfx/)

### Locked Internal Constants (DO NOT EXPOSE)
These are tuned and validated. Exposing them creates complexity without benefit:

```typescript
CURVATURE_SCALES = [2, 6, 16]     // Multi-scale sampling distances (meters)
CURVATURE_WEIGHTS = [0.2, 0.5, 0.3]  // Favor medium scale
FIELD_SMOOTHING_ITERATIONS = 2    // Optimal for coherence
MIN_SLOPE_FOR_CURVATURE = 0.01   // Skip flat terrain
MIN_FIELD_CONFIDENCE = 0.1       // Minimum valid confidence
NEIGHBOR_WEIGHT_CARDINAL = 1.0   // Cardinal neighbor influence
NEIGHBOR_WEIGHT_DIAGONAL = 0.7   // Diagonal neighbor influence
MAX_INSTANCES_PER_CHUNK = 500    // Performance guardrail
```

### Designer-Facing Parameters (Leva)
These are the only parameters exposed for tuning:

| Parameter | Purpose | Range |
|-----------|---------|-------|
| `gridDensity` | Sample points per chunk (NxN) | 4-20 |
| `minSpacing` | Minimum cliff separation (m) | 2-15 |
| `baseScale` | Cliff mesh size | 0.1-3.0 |
| `scaleVariation` | Random size variation | 0-0.8 |
| `slopeAlignment` | Tilt to follow terrain | 0-1 |
| `curvatureThreshold` | Ridge/valley sensitivity | 0.1-2.0 |
| `embedDepth` | How deep cliffs sink into terrain | 0-0.6 |

### When to Reopen This System
Only modify if:
1. Artists consistently report cliffs "feel wrong"
2. Performance tanks at scale
3. Adding new terrain representation (voxels, caves)
4. Destructible terrain required
5. Targeting low-end hardware

### Copy Settings Button
Use the "Copy Settings" button in Leva to export current cliff configuration as JSON.
Paste into defaults when satisfied with tuning.

## Physics (Rapier)

### Player Controller
- Uses `PhysicsPlayerController.tsx`
- Capsule collider for character
- Ground detection via raycasting
- Supports walking, running, jumping, crouching

### Collision Groups
Check existing collision group constants before adding new ones.

## Multiplayer (Liveblocks)

### State Sync
- Player positions/rotations via `usePlayMultiplayer`
- Interpolation for smooth remote player movement
- `OtherPlayers.tsx` renders remote avatars

## Common Pitfalls

1. **Shader not updating?** Check if texture `needsUpdate = true` after changing properties
2. **Biome looks wrong?** Sync CPU and shader thresholds
3. **Physics jittering?** Check fixed timestep and interpolation
4. **Textures tiling weirdly?** Don't mix shader UV scaling with `texture.repeat`
5. **Effect depends on camera angle?** You're probably using view-space instead of world-space

## Architecture

### Service Layer (`lib/services/`)
Services own configuration and provide clean APIs for subsystems:

```typescript
// TerrainService - terrain height, biome queries
import { useTerrainService } from '../../lib/services';
const { getHeight, getBiome, isWalkable } = useTerrainService();

// EnvironmentService - sky, fog, water, lighting
import { useEnvironmentService } from '../../lib/services';
const { sky, fog, setSky, applyPreset } = useEnvironmentService();
```

### World Lifecycle (`lib/world/`)
State machine for safe world transitions:

```typescript
import { useWorldState, WorldState } from '../../lib/world';

function LoadingScreen() {
  const { state, isLoading, transitionTo } = useWorldState();

  // States: Initializing → LoadingTerrain → SpawningEntities → Running ⇄ Paused
  // Resetting can be entered from any state

  if (isLoading) return <LoadingIndicator state={state} />;
  return null;
}
```

### Configuration (`lib/config/`)
Centralized world configuration with Leva integration:

```typescript
import { useWorldControls, WORLD_PRESETS } from '../../lib/config';

// In component:
const controls = useWorldControls(); // Provides Leva UI + values
```

**Presets available:**
- `default` - Standard gameplay settings
- `performance` - Reduced terrain radius, disabled grass/trees
- `cinematic` - Higher quality fog, denser foliage

### Event Bus (`lib/events/`)
Typed events for decoupled communication:

```typescript
import { useGameEvent, emitGameEvent } from '../../lib/events';

// Subscribe (auto-cleanup on unmount)
useGameEvent('PLAYER_DAMAGED', (event) => {
  showDamageIndicator(event.amount);
});

// Emit
emitGameEvent({ type: 'WEAPON_FIRED', weapon: 'rifle', position, direction });
```

### Dependency Injection (`lib/world/WorldContext.tsx`)
World-scoped services via React Context:

```typescript
import { WorldProvider, useWorld } from '../../lib/world';

// Wrap world
<WorldProvider seed={12345} chunkRadius={4}>
  <PlayWorld />
</WorldProvider>

// Access anywhere in tree
const { terrain, environment, lifecycle } = useWorld();
```

### Asset Pipeline (`lib/assets/`)
Preloading with priority levels:

```typescript
import { usePreloadEssentials, isAssetLoaded } from '../../lib/assets';

const { isReady, progress } = usePreloadEssentials();
// progress.percent, progress.currentAsset
```

### Key Files

| File | Purpose |
|------|---------|
| `lib/config/WorldConfig.ts` | Leva controls, presets, types |
| `lib/world/WorldLifecycle.ts` | State machine class |
| `lib/world/WorldContext.tsx` | Dependency injection provider |
| `lib/world/useWorldState.ts` | React hooks for lifecycle |
| `lib/services/TerrainService.ts` | Height sampling, biome queries |
| `lib/services/EnvironmentService.ts` | Sky, fog, water config |
| `lib/events/GameEvents.ts` | Typed event bus |
| `lib/events/useGameEvent.ts` | React hooks for events |
| `lib/assets/AssetManifest.ts` | Asset priority manifest |
| `lib/assets/AssetPreloader.ts` | Preloading with progress |
| `debug/DebugOverlay.tsx` | F1 debug overlay |

## Debugging

### Debug Overlay (F1)
```typescript
import { DebugOverlay, FPSCounter } from './debug';

// Full overlay with player/world info
<DebugOverlay playerPosition={pos} biome={biome} worldState={state} />

// Minimal FPS counter
<FPSCounter />
```

### Terrain Shader Debug Modes
```typescript
// In TerrainMaterial uniforms:
debugWeights: true  // RGB = rock/grass/sand weights
debugSlope: true    // Grayscale = slope intensity
forceMinRock: 0.5   // Force rock visibility for testing
```

### Quick Tests
- Red terrain test: `gl_FragColor = vec4(1,0,0,1); return;` at shader start
- Check if shader runs at all vs texture/uniform issues

### Debug Keys
- **F1** - Toggle debug overlay (FPS, stats, position)
- **F3** - Toggle physics debug visualization
- **Q** - Cycle weapons (none → pistol → rifle)
- **K** - Kill nearest NPC (debug)
