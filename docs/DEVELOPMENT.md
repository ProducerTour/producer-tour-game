# Producer Tour - Development Guide

A comprehensive guide for working on the Producer Tour platform, covering the 3D multiplayer game, asset management, local development, and production deployment.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Tech Stack](#tech-stack)
4. [Getting Started](#getting-started)
5. [Asset Management](#asset-management)
   - [Asset Types](#asset-types)
   - [Asset Path Configuration](#asset-path-configuration)
   - [Adding New Assets](#adding-new-assets)
6. [3D Characters & Avatars](#3d-characters--avatars)
   - [Ready Player Me Integration](#ready-player-me-integration)
   - [Character Animations](#character-animations)
7. [3D Models & Meshes](#3d-models--meshes)
   - [Model Formats](#model-formats)
   - [Model Optimization](#model-optimization)
   - [Instanced Rendering](#instanced-rendering)
8. [Textures & Materials](#textures--materials)
   - [Terrain Textures](#terrain-textures)
   - [PBR Materials](#pbr-materials)
9. [Environment & Terrain](#environment--terrain)
   - [Chunk-Based Loading](#chunk-based-loading)
   - [Procedural Generation](#procedural-generation)
10. [Physics & Collisions](#physics--collisions)
11. [Audio System](#audio-system)
12. [Multiplayer Architecture](#multiplayer-architecture)
13. [Local Development](#local-development)
14. [Production Deployment](#production-deployment)
15. [Best Practices](#best-practices)
16. [Troubleshooting](#troubleshooting)

---

## Project Overview

Producer Tour is a music publishing royalty management platform with an integrated 3D multiplayer game world. The platform allows music producers to manage their royalties while exploring an interactive virtual environment.

### Monorepo Structure

```
producer-tour-react/
├── apps/
│   ├── frontend/          # React + Vite frontend (3D game + dashboard)
│   ├── backend/           # Express + Prisma API server
│   └── game-server/       # Colyseus multiplayer server
├── docs/                  # Documentation
└── package.json           # Workspace root
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT (Vercel)                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    React + Vite                          │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │   │
│  │  │  Dashboard  │  │   3D Game   │  │  Auth/Profile   │  │   │
│  │  │   (React)   │  │   (R3F)     │  │    (React)      │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────┘  │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
              ▼               ▼               ▼
┌─────────────────┐  ┌───────────────┐  ┌─────────────────┐
│   Cloudflare    │  │    Render     │  │  Game Server    │
│   R2 CDN        │  │    Backend    │  │   (Colyseus)    │
│                 │  │               │  │                 │
│  - Models       │  │  - REST API   │  │  - Multiplayer  │
│  - Textures     │  │  - Prisma ORM │  │  - WebSockets   │
│  - Animations   │  │  - Auth       │  │  - Game State   │
│  - Audio        │  │  - Postgres   │  │                 │
└─────────────────┘  └───────────────┘  └─────────────────┘
```

---

## Tech Stack

### Frontend
- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **React Router** - Client-side routing

### 3D Game Engine
- **Three.js** - 3D rendering library
- **React Three Fiber (R3F)** - React renderer for Three.js
- **@react-three/drei** - R3F helpers and abstractions
- **@react-three/rapier** - Physics engine (Rapier3D)
- **@react-three/postprocessing** - Visual effects

### Backend
- **Express** - Node.js web framework
- **Prisma** - Database ORM
- **PostgreSQL** - Primary database

### Multiplayer
- **Colyseus** - Real-time multiplayer framework
- **WebSockets** - Client-server communication

### Infrastructure
- **Vercel** - Frontend hosting
- **Render** - Backend hosting
- **Cloudflare R2** - Asset CDN (S3-compatible)

---

## Getting Started

### Prerequisites
- Node.js >= 20.0.0
- npm or yarn
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/ProducerTour/Website.git
cd producer-tour-react

# Install dependencies
npm install

# Set up environment variables
cp apps/frontend/.env.example apps/frontend/.env
cp apps/backend/.env.example apps/backend/.env
```

### Development Commands

```bash
# Run all services (frontend, backend, game-server)
npm run dev

# Run individual services
npm run frontend    # Just frontend at localhost:5173
npm run backend     # Just backend at localhost:3001
npm run game-server # Just game server at localhost:2567

# Type checking
npm run typecheck

# Build for production
npm run build
```

---

## Asset Management

### Asset Types

| Type | Directory | Extensions | Description |
|------|-----------|------------|-------------|
| Models | `/public/models/` | `.glb`, `.gltf` | 3D models (characters, props, environment) |
| Animations | `/public/animations/` | `.glb`, `.fbx` | Character animation clips |
| Textures | `/public/textures/` | `.png`, `.jpg` | Texture maps (diffuse, normal, roughness) |
| Skybox | `/public/skybox/` | `.jpg`, `.hdr` | Environment maps |
| Audio | `/public/audio/` | `.mp3`, `.wav` | Sound effects and ambient audio |

### Asset Path Configuration

All asset paths are centralized in `apps/frontend/src/config/assetPaths.ts`. This file provides helper functions that automatically switch between local development and CDN production.

```typescript
// Import helper functions
import {
  getModelPath,
  getTexturePath,
  getAnimationPath,
  getAudioPath,
  getSkyboxPath
} from '@/config/assetPaths';

// Usage examples
const rifleModel = getModelPath('weapons/rifle.glb');
// Dev:  /models/weapons/rifle.glb
// Prod: https://assets.producertour.com/models/weapons/rifle.glb

const grassTexture = getTexturePath('terrain/grass.png');
const idleAnim = getAnimationPath('idle.glb');
const windSound = getAudioPath('ambient/wind.mp3');
const skybox = getSkyboxPath('hilly_terrain_4k.jpg');
```

### Environment Variables

```bash
# .env (local development)
VITE_ASSETS_URL=                    # Empty = use local /public folder
VITE_MODELS_LOCAL=true
VITE_TEXTURES_LOCAL=true
VITE_ANIMATIONS_LOCAL=true
VITE_AUDIO_LOCAL=true
VITE_SKYBOX_LOCAL=true

# .env.production (production)
VITE_ASSETS_URL=https://assets.producertour.com
VITE_MODELS_LOCAL=false
VITE_TEXTURES_LOCAL=false
VITE_ANIMATIONS_LOCAL=false
VITE_AUDIO_LOCAL=false
VITE_SKYBOX_LOCAL=false
```

### Adding New Assets

1. **Add the asset file** to the appropriate `/public/` subdirectory

2. **Upload to CDN** (for production):
   ```bash
   # Using wrangler (Cloudflare CLI)
   wrangler r2 object put "producer-tour-assets/models/MyModel.glb" \
     --file="public/models/MyModel.glb" --remote

   # Or use the bulk upload script
   ./scripts/upload-assets.sh
   ```

3. **Use the helper function** in your code:
   ```typescript
   const myModel = getModelPath('MyModel.glb');
   const gltf = useGLTF(myModel);
   ```

4. **NEVER hardcode paths** - Always use the helper functions:
   ```typescript
   // BAD - hardcoded path
   const model = useGLTF('/models/weapons/rifle.glb');

   // GOOD - uses helper function
   const model = useGLTF(getModelPath('weapons/rifle.glb'));
   ```

---

## 3D Characters & Avatars

### Ready Player Me Integration

Player avatars are loaded from Ready Player Me (RPM) using dynamic URLs.

```typescript
// Avatar URL structure
const avatarUrl = `https://models.readyplayer.me/${avatarId}.glb`;

// Loading with useGLTF
const { scene } = useGLTF(avatarUrl);
```

### Character Animations

Animations are downloaded from [Mixamo](https://www.mixamo.com/) and converted to GLB format.

**Animation Files:**
```
/public/animations/
├── idle.glb           # Standing idle
├── walking.glb        # Walking forward
├── running.glb        # Running forward
├── jump.glb           # Jump animation
├── crouch_idle.glb    # Crouching idle
├── rifle_idle.glb     # Idle with rifle
├── rifle_run.glb      # Running with rifle
└── ...
```

**Animation State Machine:**
```typescript
// AnimatedAvatarWithMixamo.tsx
const ANIMATIONS = {
  idle: getAnimationPath('idle.glb'),
  walking: getAnimationPath('walking.glb'),
  running: getAnimationPath('running.glb'),
  jump: getAnimationPath('jump.glb'),
};

// Determine animation state
if (isJumping) return 'jump';
if (isRunning && isMoving) return 'run';
if (isMoving) return 'walk';
return 'idle';
```

**Adding New Animations:**
1. Download from Mixamo (FBX format, "Without Skin")
2. Convert to GLB using Blender or gltf-pipeline
3. Place in `/public/animations/`
4. Upload to CDN
5. Add to animation constants using `getAnimationPath()`

---

## 3D Models & Meshes

### Model Formats

- **GLB** (preferred) - Binary glTF, smaller file size
- **GLTF** - JSON-based, human-readable

### Model Organization

```
/public/models/
├── Bandit/              # NPC characters
│   └── bandit.glb
├── Foliage/            # Vegetation
│   └── Trees/
│       ├── oak_trees.glb
│       ├── palm_tree.glb
│       └── lowpoly/
│           ├── tree-01-1.glb
│           ├── bush-01.glb
│           └── ...
├── Cliffside/          # Terrain features
├── Rocks/              # Rock props
├── weapons/            # Player weapons
│   ├── pistol.glb
│   └── rifle.glb
└── Campfire/           # Environment props
```

### Model Optimization

**Polygon Budget:**
- Player avatar: 10,000-20,000 triangles
- NPC characters: 5,000-10,000 triangles
- Instanced foliage: 500-2,000 triangles
- Props: 1,000-5,000 triangles

**Texture Guidelines:**
- Diffuse/Albedo: 1024x1024 max for props, 2048x2048 for characters
- Normal maps: Same resolution as diffuse
- Use texture atlases where possible
- Compress textures (JPG for opaque, PNG for transparency)

### Instanced Rendering

For repeated objects (trees, grass, rocks), use `InstancedMesh` for performance:

```typescript
// ChunkTreesInstanced.tsx
<instancedMesh
  ref={meshRef}
  args={[geometry, material, instanceCount]}
  frustumCulled={true}
>
  {/* Instance matrices set via useLayoutEffect */}
</instancedMesh>
```

**Performance Tips:**
- Set `matrixAutoUpdate = false` for static instances
- Compute bounding spheres for frustum culling
- Use layers to exclude from raycasts: `mesh.layers.enable(LAYERS.VEGETATION)`

---

## Textures & Materials

### Terrain Textures

The terrain uses splatmap-based multi-texturing with triplanar projection.

```typescript
// TerrainMaterial.tsx - Texture channels
const TEXTURE_PATHS = {
  // Channel 1: Grass (green areas)
  grass_diffuse: getTexturePath('ground/Grass_001_SD/Grass_001_COLOR.jpg'),
  grass_normal: getTexturePath('ground/Grass_001_SD/Grass_001_NORM.jpg'),

  // Channel 2: Rocky terrain
  rock_diffuse: getTexturePath('ground/rock/Stylized_Rocks_002_SD/basecolor.jpg'),
  rock_normal: getTexturePath('ground/rock/Stylized_Rocks_002_SD/normal.jpg'),

  // Channel 3: Sand/beaches
  sand_diffuse: getTexturePath('ground/Sand_009_SD/Sand_009_basecolor.jpg'),
  sand_normal: getTexturePath('ground/Sand_009_SD/Sand_009_normal.jpg'),

  // Channel 4: Snow/peaks
  snow_diffuse: getTexturePath('terrain/snow_diffuse.jpg'),
  snow_normal: getTexturePath('terrain/snow_normal.jpg'),
};
```

### PBR Materials

Standard PBR workflow with:
- **Diffuse/Albedo** - Base color
- **Normal** - Surface detail
- **Roughness** - Surface smoothness
- **Metalness** - Metallic vs dielectric
- **AO** - Ambient occlusion

---

## Environment & Terrain

### Chunk-Based Loading

The world is divided into chunks that load/unload based on player position.

```typescript
// Chunk constants
const CHUNK_SIZE = 64;      // 64x64 meters per chunk
const CHUNK_RADIUS = 5;     // Load 5 chunks in each direction

// Chunk coordinate calculation
const chunkX = Math.floor(playerX / CHUNK_SIZE);
const chunkZ = Math.floor(playerZ / CHUNK_SIZE);
```

**Chunk Components:**
- `StaticTerrain` - Base terrain mesh
- `ChunkTrees` - Tree instances
- `ChunkGrass` - Grass instances
- `ChunkRocks` - Rock props
- `ChunkBushes` - Bush instances

### Procedural Generation

Terrain uses noise-based generation:

```typescript
// HeightmapGenerator.ts
const height = fbm2(x * 0.01, z * 0.01, octaves, persistence, lacunarity);

// Biome determination based on height
if (height > 30) return 'mountain';
if (height > 10) return 'forest';
if (height > 0) return 'beach';
return 'ocean';
```

---

## Physics & Collisions

Using Rapier3D physics via `@react-three/rapier`:

```typescript
import { RigidBody, CylinderCollider } from '@react-three/rapier';

// Player physics
<RigidBody type="dynamic" lockRotations>
  <CylinderCollider args={[0.9, 0.4]} />
  <PlayerAvatar />
</RigidBody>

// Static props
<RigidBody type="fixed">
  <mesh geometry={rockGeometry} />
</RigidBody>
```

**Collision Layers:**
```typescript
// constants/layers.ts
export const LAYERS = {
  DEFAULT: 0,
  PLAYER: 1,
  VEGETATION: 2,  // Excluded from camera collision
  TERRAIN: 3,
  PROPS: 4,
};
```

---

## Audio System

### Audio Configuration

```typescript
// ambientConfig.ts
const ZONE_AUDIO = {
  forest: {
    ambient: getAudioPath('ambient/forest_ambience.mp3'),
    birds: getAudioPath('ambient/forest_birds.mp3'),
  },
  beach: {
    waves: getAudioPath('ambient/ocean_waves.mp3'),
    seagulls: getAudioPath('ambient/seagulls.mp3'),
  },
};
```

### Spatial Audio

Using Howler.js for 3D positional audio:

```typescript
import { Howl } from 'howler';

const sound = new Howl({
  src: [getAudioPath('sfx/footsteps.mp3')],
  spatial: true,
  pos: [x, y, z],
});
```

---

## Multiplayer Architecture

### Colyseus Game Server

```typescript
// Room definition
export class GameRoom extends Room {
  onCreate() {
    this.setState(new GameState());
  }

  onJoin(client: Client) {
    // Add player to state
  }

  onMessage(client: Client, message: any) {
    // Handle player input
  }
}
```

### Client Connection

```typescript
import { Client } from 'colyseus.js';

const client = new Client('wss://game.producertour.com');
const room = await client.joinOrCreate('game');

room.state.players.onAdd = (player) => {
  // Spawn remote player
};
```

---

## Local Development

### Starting Development

```bash
# Start all services
npm run dev

# Frontend: http://localhost:5173
# Backend:  http://localhost:3001
# Game:     http://localhost:2567
```

### Testing with Local Assets

Assets in `/public/` are served directly by Vite:

```bash
# Verify .env has local flags set
cat apps/frontend/.env
# VITE_MODELS_LOCAL=true
# VITE_TEXTURES_LOCAL=true
# etc.
```

### Hot Module Replacement

Vite provides HMR for instant updates. Note that 3D scenes may require a page refresh after component changes.

---

## Production Deployment

### Frontend (Vercel)

1. Connect GitHub repo to Vercel
2. Set build settings:
   - Framework: Vite
   - Build Command: `npm run build:frontend`
   - Output Directory: `apps/frontend/dist`
3. Add environment variables (`.env.production`)

### Backend (Render)

1. Create Web Service on Render
2. Set build command: `npm run build:backend`
3. Set start command: `npm start`
4. Add environment variables (DATABASE_URL, etc.)

### Asset CDN (Cloudflare R2)

**Bucket Configuration:**
- Bucket name: `producer-tour-assets`
- Public access: Enabled via custom domain
- CORS: Allow `*.producertour.com` and `localhost:*`

**Uploading Assets:**

```bash
# Single file
wrangler r2 object put "producer-tour-assets/models/rifle.glb" \
  --file="public/models/weapons/rifle.glb" --remote

# Bulk upload
aws s3 sync ./public/models s3://producer-tour-assets/models \
  --endpoint-url https://<account-id>.r2.cloudflarestorage.com

# Or use the upload script
./scripts/upload-assets.sh
```

### Deployment Checklist

- [ ] TypeScript compiles without errors (`npm run typecheck`)
- [ ] All asset paths use helper functions (no hardcoded paths)
- [ ] Assets uploaded to R2 CDN
- [ ] Environment variables set on Vercel
- [ ] CORS configured on R2 bucket
- [ ] Test production build locally (`npm run build && npm run preview`)

---

## Best Practices

### Code Organization

```
src/
├── components/
│   ├── play/              # 3D game components
│   │   ├── terrain/       # Terrain rendering
│   │   ├── world/         # World objects
│   │   ├── audio/         # Audio systems
│   │   └── constants/     # Game constants
│   └── ui/                # UI components
├── config/
│   ├── assetPaths.ts      # Asset URL configuration
│   └── ...
├── lib/
│   ├── terrain/           # Terrain generation
│   └── assets/            # Asset loading utilities
└── types/                 # TypeScript types
```

### Performance Guidelines

1. **Use InstancedMesh** for repeated geometry (trees, grass, rocks)
2. **Enable frustum culling** on all meshes
3. **Set `matrixAutoUpdate = false`** for static objects
4. **Use texture atlases** to reduce draw calls
5. **Implement LOD** (Level of Detail) for distant objects
6. **Optimize physics** - limit active bodies, use simple colliders

### Asset Guidelines

1. **Always use helper functions** for asset paths
2. **Compress models** - use Draco compression for GLB
3. **Optimize textures** - power-of-two sizes, appropriate resolution
4. **Test locally first** before uploading to CDN
5. **Use consistent naming** - lowercase, underscores for spaces

### Git Workflow

1. Create feature branch from `main`
2. Make changes and test locally
3. Run `npm run typecheck` before committing
4. Create PR with clear description
5. Merge to `main` triggers Vercel deployment

---

## Troubleshooting

### Assets Not Loading in Production

**Symptoms:** Console shows 404 errors or "Unexpected token '<'"

**Solutions:**
1. Verify asset exists in R2 bucket
2. Check path matches helper function output
3. Ensure `.env.production` has correct `VITE_ASSETS_URL`
4. Verify CORS is configured on R2 bucket

### Local Development Issues

**Assets not found locally:**
```bash
# Check .env has LOCAL flags set to true
cat apps/frontend/.env | grep LOCAL
# Should show: VITE_MODELS_LOCAL=true, etc.
```

**Physics not working:**
- Ensure `<Physics>` component wraps the scene
- Check collider shapes match mesh bounds
- Verify RigidBody type (dynamic vs fixed)

### Build Errors

**TypeScript errors:**
```bash
npm run typecheck
# Fix any type errors before deploying
```

**Vite build fails:**
```bash
# Check for circular dependencies
npm run build 2>&1 | grep -i circular
```

### Performance Issues

**Low FPS:**
1. Check draw calls in R3F DevTools
2. Enable frustum culling on all meshes
3. Reduce grass/foliage density
4. Use performance mode in Rapier physics

**Memory leaks:**
1. Dispose geometries and materials on unmount
2. Unsubscribe from event listeners
3. Clear animation mixers

---

## Resources

- [React Three Fiber Docs](https://docs.pmnd.rs/react-three-fiber)
- [Three.js Docs](https://threejs.org/docs/)
- [Rapier Physics Docs](https://rapier.rs/docs/)
- [Cloudflare R2 Docs](https://developers.cloudflare.com/r2/)
- [Mixamo](https://www.mixamo.com/) - Character animations
- [Ready Player Me](https://readyplayer.me/) - Avatar creation

---

*Last updated: December 2024*
