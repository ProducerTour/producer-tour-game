# Creating Maps for Producer Tour

This guide explains how to create new map instances and add content to existing maps in the Producer Tour 3D world system.

## Architecture Overview

```
CityPage (UI + Canvas)
└── CityWorld
    └── BaseWorld (physics, player, multiplayer, lighting)
        └── NeoTokyoMap (FBX model + procedural materials)
        └── ZoneMarkers

PlayPage (UI + Canvas)
└── PlayWorld
    └── BaseWorld
        └── CyberpunkGround
        └── BasketballCourt
        └── ZoneMarkers
```

**Key files:**
- `components/play/world/BaseWorld.tsx` - Core gameplay wrapper
- `components/play/maps/NeoTokyoMap.tsx` - Example map implementation
- `components/play/world/ZoneMarker.tsx` - Interactive zone markers
- `components/play/types.ts` - Shared types and constants

## Creating a New Map Instance

### Step 1: Create the Map Component

Create a new file in `components/play/maps/`:

```typescript
// components/play/maps/MyNewMap.tsx

import { useMemo } from 'react';
import { useFBX, useGLTF } from '@react-three/drei';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import * as THREE from 'three';
import { ASSETS_URL } from '../types';

export interface MyNewMapProps {
  scale?: number;
  position?: [number, number, number];
}

export function MyNewMap({ scale = 1, position = [0, 0, 0] }: MyNewMapProps) {
  // Load model (FBX or GLTF/GLB)
  const model = useFBX(`${ASSETS_URL}/models/mymap/model.fbx`);
  // OR: const { scene } = useGLTF(`${ASSETS_URL}/models/mymap/model.glb`);

  const processedModel = useMemo(() => {
    const clone = model.clone();

    // Process materials, enable shadows, etc.
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    return clone;
  }, [model]);

  return (
    <RigidBody type="fixed" colliders={false} position={position}>
      <primitive object={processedModel} scale={scale} />

      {/* Ground collider */}
      <CuboidCollider args={[100, 0.1, 100]} position={[0, -0.1, 0]} />
    </RigidBody>
  );
}
```

### Step 2: Create the World Component

Create a world component that uses BaseWorld:

```typescript
// components/myworld/MyWorld.tsx

import { Suspense } from 'react';
import { Zap, Building2 } from 'lucide-react';
import * as THREE from 'three';

import { BaseWorld } from '../play/world/BaseWorld';
import { ZoneMarker } from '../play/world';
import { MyNewMap } from '../play/maps';
import type { ZoneConfig } from '../play/types';

// Define zones for this map
const mapZones: ZoneConfig[] = [
  {
    position: [30, 2, -30],
    label: 'Zone A',
    icon: Zap,
    color: '#a855f7',
    description: 'Description of zone',
  },
  {
    position: [-30, 2, 20],
    label: 'Zone B',
    icon: Building2,
    color: '#3b82f6',
    description: 'Another zone',
  },
];

export interface MyWorldProps {
  avatarUrl?: string;
  onPlayerPositionChange?: (pos: THREE.Vector3) => void;
  onMultiplayerReady?: (data: { playerCount: number; isConnected: boolean }) => void;
}

export function MyWorld({
  avatarUrl,
  onPlayerPositionChange,
  onMultiplayerReady,
}: MyWorldProps) {
  return (
    <BaseWorld
      spawn={[0, 5, 0]}  // x, y, z - start elevated to avoid clipping
      avatarUrl={avatarUrl}
      onPlayerPositionChange={onPlayerPositionChange}
      onMultiplayerReady={onMultiplayerReady}
      groundSize={300}  // Size of the invisible ground collider
      fog={{ color: '#0a0a0f', near: 50, far: 200 }}
      backgroundColor="#0a0a0f"
    >
      {/* Your map model */}
      <Suspense fallback={null}>
        <MyNewMap scale={0.01} />
      </Suspense>

      {/* Zone markers */}
      {mapZones.map((zone) => (
        <ZoneMarker key={zone.label} {...zone} />
      ))}
    </BaseWorld>
  );
}
```

### Step 3: Create the Page Component

Create a page that renders the world with UI:

```typescript
// pages/MyMapPage.tsx

import { Suspense, useState, useEffect, useRef, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { useNavigate } from 'react-router-dom';
// ... import UI components from CityPage.tsx as reference

import { MyWorld } from '../components/myworld/MyWorld';
import { AvatarCreator } from '../components/play/AvatarCreator';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';

// Copy patterns from CityPage.tsx:
// - Auto-save hook
// - Loading screen
// - HUD components
// - Pause menu
// - Mini map

export default function MyMapPage() {
  // ... state management (see CityPage.tsx)

  return (
    <div className="w-full h-screen bg-[#0a0a0f] relative overflow-hidden">
      {/* UI overlays */}

      <ErrorBoundary fallback="fullPage">
        <Suspense fallback={<LoadingScreen />}>
          <Canvas
            camera={{ position: [0, 15, 30], fov: 50 }}
            shadows
            gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
            dpr={[1, 2]}
          >
            <MyWorld
              avatarUrl={avatarUrl || undefined}
              onPlayerPositionChange={(pos) => setPlayerCoords({ x: pos.x, y: pos.y, z: pos.z })}
            />
          </Canvas>
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
```

### Step 4: Add Route

Add the route in your router configuration:

```typescript
// In your router file
import MyMapPage from './pages/MyMapPage';

// Add route
{ path: '/mymap', element: <MyMapPage /> }
```

## BaseWorld Props Reference

```typescript
interface BaseWorldProps {
  spawn: [number, number, number];      // Player spawn position
  avatarUrl?: string;                    // Ready Player Me avatar URL
  onPlayerPositionChange?: (pos) => void; // Position callback
  onMultiplayerReady?: (data) => void;   // Multiplayer status callback
  children?: ReactNode;                   // Map content
  groundSize?: number;                    // Ground collider size (default: 500)
  fog?: { color: string; near: number; far: number }; // Fog settings
  backgroundColor?: string;               // Scene background color
}
```

## Adding Content to Existing Maps

### Adding Props/Objects

Add 3D objects as children of BaseWorld:

```typescript
<BaseWorld spawn={[0, 5, 0]} avatarUrl={avatarUrl}>
  <MyNewMap />

  {/* Add static props */}
  <mesh position={[10, 0.5, 10]} castShadow>
    <boxGeometry args={[1, 1, 1]} />
    <meshStandardMaterial color="#8b5cf6" />
  </mesh>

  {/* Add with physics */}
  <RigidBody type="fixed" position={[20, 1, 20]}>
    <mesh castShadow>
      <cylinderGeometry args={[0.5, 0.5, 2]} />
      <meshStandardMaterial color="#f59e0b" />
    </mesh>
  </RigidBody>
</BaseWorld>
```

### Adding Zone Markers

Zone markers are interactive floating icons:

```typescript
import { ZoneMarker } from '../play/world';
import { Music, Gamepad2, Store } from 'lucide-react';

const zones = [
  {
    position: [30, 2, -20],      // x, y, z position
    label: 'Music Studio',       // Display name
    icon: Music,                 // Lucide icon component
    color: '#8b5cf6',            // Accent color (hex)
    description: 'Create beats', // Optional description
  },
  {
    position: [-20, 2, 30],
    label: 'Arcade',
    icon: Gamepad2,
    color: '#22c55e',
    description: 'Play games',
  },
];

// In your world component:
{zones.map((zone) => (
  <ZoneMarker key={zone.label} {...zone} />
))}
```

### Adding NPCs

```typescript
// Create an NPC component
function NPC({ position, name }: { position: [number, number, number]; name: string }) {
  return (
    <group position={position}>
      {/* NPC visual */}
      <mesh position={[0, 1, 0]}>
        <capsuleGeometry args={[0.25, 0.6]} />
        <meshStandardMaterial color="#ec4899" />
      </mesh>

      {/* Name label */}
      <Billboard position={[0, 2, 0]}>
        <Text fontSize={0.15} color="white">
          {name}
        </Text>
      </Billboard>
    </group>
  );
}

// Use in world:
<NPC position={[10, 0, 10]} name="Guide" />
```

## Procedural Materials (No Textures)

When models don't have textures, apply procedural materials based on material names:

```typescript
const MATERIAL_COLORS = {
  // Metals
  'metal': { color: '#71717a', metalness: 0.8, roughness: 0.3 },
  'chrome': { color: '#c0c0c0', metalness: 0.95, roughness: 0.1 },

  // Neon (emissive)
  'neon': { color: '#a855f7', emissive: '#a855f7', emissiveIntensity: 1.0 },

  // Glass
  'glass': { color: '#60a5fa', transparent: true, opacity: 0.4, roughness: 0.1 },

  // Building surfaces
  'concrete': { color: '#374151', roughness: 0.95 },
  'brick': { color: '#7c2d12', roughness: 0.9 },
};

function getMaterialConfig(materialName: string) {
  const name = materialName.toLowerCase();
  for (const [key, config] of Object.entries(MATERIAL_COLORS)) {
    if (name.includes(key)) return config;
  }
  return { color: '#6b7280', roughness: 0.7 }; // Default
}

// Apply in model processing:
model.traverse((child) => {
  if (child.isMesh) {
    const config = getMaterialConfig(child.material.name);
    child.material = new THREE.MeshStandardMaterial({
      color: config.color,
      metalness: config.metalness ?? 0.1,
      roughness: config.roughness ?? 0.7,
      emissive: config.emissive ?? '#000000',
      emissiveIntensity: config.emissiveIntensity ?? 0,
      transparent: config.transparent ?? false,
      opacity: config.opacity ?? 1,
    });
  }
});
```

## Collision Setup

### Phase 1: Ground Only (MVP)

Start with a simple ground plane:

```typescript
<RigidBody type="fixed" colliders={false}>
  <primitive object={model} />
  <CuboidCollider args={[200, 0.1, 200]} position={[0, -0.1, 0]} />
</RigidBody>
```

### Phase 2: Building Colliders

Add manual box colliders for buildings:

```typescript
<RigidBody type="fixed" colliders={false}>
  <primitive object={model} />

  {/* Ground */}
  <CuboidCollider args={[200, 0.1, 200]} position={[0, -0.1, 0]} />

  {/* Building A - args are half-extents: [width/2, height/2, depth/2] */}
  <CuboidCollider args={[5, 10, 5]} position={[30, 10, -20]} />

  {/* Building B */}
  <CuboidCollider args={[8, 15, 6]} position={[-25, 15, 30]} />
</RigidBody>
```

### Phase 3: Trimesh (Full Collision)

For complex collision (performance-intensive):

```typescript
<RigidBody type="fixed" colliders="trimesh">
  <primitive object={model} />
</RigidBody>
```

## Debugging

Press **F3** to toggle physics debug visualization (shows all colliders).

Check browser console for material names when loading models:
```
🏙️ NeoTokyo - Processing materials...
🏙️ Found materials: KB3D_NEC_Brass, KB3D_NEC_Glass, ...
```

## Asset Hosting (R2 CDN)

Upload assets to R2 and reference via `ASSETS_URL`:

```typescript
import { ASSETS_URL } from '../types';

// ASSETS_URL = 'https://pub-xxxxx.r2.dev'
const modelUrl = `${ASSETS_URL}/models/mymap/model.fbx`;
```

## Scale Guidelines

Different models require different scales:

| Model Type | Typical Scale | Notes |
|------------|---------------|-------|
| KitBash3D FBX | 0.01 | Usually exported at 100x |
| Sketchfab GLTF | 1.0 | Usually correct scale |
| Basketball court | 0.01 | Specific to that model |

Spawn the player 5+ units above ground initially to avoid clipping through the floor before physics loads.

## File Structure

```
components/
├── play/
│   ├── avatars/
│   │   ├── AnimatedAvatar.tsx
│   │   └── PlaceholderAvatar.tsx
│   ├── camera/
│   │   └── ThirdPersonCamera.tsx
│   ├── maps/
│   │   ├── NeoTokyoMap.tsx      # Example map
│   │   └── index.ts
│   ├── multiplayer/
│   │   └── OtherPlayers.tsx
│   ├── world/
│   │   ├── BaseWorld.tsx        # Core gameplay
│   │   ├── ZoneMarker.tsx
│   │   ├── CyberpunkGround.tsx
│   │   └── index.ts
│   └── types.ts                 # Shared types
├── city/
│   └── CityWorld.tsx            # NeoTokyo world
└── myworld/
    └── MyWorld.tsx              # Your new world
```
