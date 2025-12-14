# Producer Tour - Open World Web3 Game Architecture

## Table of Contents
1. [System Overview](#1-system-overview)
2. [Client Architecture](#2-client-architecture)
3. [Game Loop & Physics](#3-game-loop--physics)
4. [World Streaming](#4-world-streaming)
5. [Entity Component System](#5-entity-component-system)
6. [Avatar Pipeline](#6-avatar-pipeline)
7. [Asset Pipeline](#7-asset-pipeline)
8. [NPC System](#8-npc-system)
9. [Multiplayer Networking](#9-multiplayer-networking)
10. [Web3 Integration](#10-web3-integration)
11. [Quest System](#11-quest-system)
12. [User-Generated Content](#12-user-generated-content)
13. [Backend Services](#13-backend-services)
14. [Performance Budget](#14-performance-budget)
15. [Migration Plan](#15-migration-plan)

---

## 1. System Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT (Browser)                                │
├─────────────────────────────────────────────────────────────────────────────┤
│  React 18 + React Three Fiber + Rapier Physics                              │
│  ├── Rendering Layer (R3F, Three.js r158+)                                  │
│  ├── Physics Layer (Rapier WASM)                                            │
│  ├── Game Loop (Fixed 60Hz + Variable Render)                               │
│  ├── ECS-Lite (Entity/Component/System)                                     │
│  ├── World Streaming (64m chunks, LOD)                                      │
│  ├── Avatar System (Ready Player Me)                                        │
│  ├── Asset Manager (NFT-owned + World assets)                               │
│  ├── Quest Tracker (UI + State)                                             │
│  ├── Wallet Connection (wagmi/viem)                                         │
│  └── Multiplayer Client (Colyseus)                                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           GAME SERVER (Colyseus)                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  • Room/Instance Management (spawn, join, matchmaking)                      │
│  • Authoritative State (entity positions, ownership)                        │
│  • Physics Validation (anti-cheat for movement)                             │
│  • Quest State Validation (server-side objective tracking)                  │
│  • Real-time Sync (entity interpolation, client prediction)                 │
│  • Chat & Social (proximity chat, global channels)                          │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            BACKEND API (Node.js)                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  • Auth Service (wallet signature, JWT sessions)                            │
│  • Player Service (profile, inventory, progression)                         │
│  • Quest Service (definitions, progress, rewards)                           │
│  • Asset Service (ownership verification, metadata)                         │
│  • UGC Service (upload, moderation, marketplace)                            │
│  • Analytics Service (telemetry, metrics)                                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DATA LAYER                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│  PostgreSQL (persistent data) │ Redis (sessions, cache) │ S3/R2 (assets)   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           BLOCKCHAIN LAYER                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│  • Smart Contracts (NFT collections, marketplace, governance)               │
│  • IPFS/Arweave (3D model storage, metadata)                                │
│  • The Graph (NFT indexing, ownership queries)                              │
│  • Chain: Base/Polygon/Arbitrum (low gas, fast finality)                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| UI Framework | React 18 | Component architecture |
| 3D Rendering | React Three Fiber + Three.js r158+ | WebGL rendering |
| Physics | @dimforge/rapier3d-compat | WASM physics engine |
| State | Zustand | Global state management |
| Multiplayer | Colyseus | Real-time game server |
| Web3 | wagmi + viem | Wallet connection, contract interaction |
| Database | PostgreSQL + Prisma | Persistent storage |
| Cache | Redis | Sessions, real-time state |
| CDN | Cloudflare R2 | Asset delivery |
| Blockchain | Base/Polygon | NFT contracts |

---

## 2. Client Architecture

### Directory Structure

```
apps/frontend/src/
├── components/
│   └── play/
│       ├── PlayWorld.tsx          # Main world component
│       ├── systems/               # ECS systems
│       │   ├── PhysicsSystem.ts
│       │   ├── MovementSystem.ts
│       │   ├── AnimationSystem.ts
│       │   ├── NetworkSyncSystem.ts
│       │   └── QuestSystem.ts
│       ├── entities/              # Entity definitions
│       │   ├── PlayerEntity.ts
│       │   ├── NPCEntity.ts
│       │   ├── ItemEntity.ts
│       │   └── VehicleEntity.ts
│       ├── components/            # ECS components (data)
│       │   ├── Transform.ts
│       │   ├── RigidBody.ts
│       │   ├── Renderable.ts
│       │   ├── NetworkIdentity.ts
│       │   └── Inventory.ts
│       ├── world/                 # World streaming
│       │   ├── ChunkManager.ts
│       │   ├── ChunkLoader.ts
│       │   └── LODController.ts
│       ├── networking/            # Multiplayer
│       │   ├── NetworkManager.ts
│       │   ├── StateSync.ts
│       │   └── Interpolation.ts
│       └── ui/                    # In-game UI
│           ├── QuestTracker.tsx
│           ├── Inventory.tsx
│           └── Minimap.tsx
├── hooks/
│   ├── useGameLoop.ts
│   ├── usePhysicsWorld.ts
│   ├── useNetworkSync.ts
│   └── useWalletAssets.ts
├── store/
│   ├── game.store.ts              # Game state
│   ├── player.store.ts            # Player state
│   ├── quest.store.ts             # Quest state
│   └── network.store.ts           # Network state
└── lib/
    ├── ecs/                       # ECS core
    │   ├── World.ts
    │   ├── Entity.ts
    │   └── System.ts
    ├── physics/
    │   └── RapierContext.ts
    └── web3/
        ├── contracts.ts
        └── nftLoader.ts
```

### Core Hooks

```typescript
// useGameLoop.ts - Fixed timestep game loop
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';

const FIXED_TIMESTEP = 1 / 60; // 60Hz physics
const MAX_SUBSTEPS = 5;

export function useGameLoop(
  fixedUpdate: (dt: number) => void,
  renderUpdate: (dt: number, alpha: number) => void
) {
  const accumulator = useRef(0);
  const previousTime = useRef(0);

  useFrame((state) => {
    const currentTime = state.clock.elapsedTime;
    let frameTime = currentTime - previousTime.current;
    previousTime.current = currentTime;

    // Clamp frame time to prevent spiral of death
    if (frameTime > 0.25) frameTime = 0.25;

    accumulator.current += frameTime;

    // Fixed timestep updates (physics, game logic)
    let substeps = 0;
    while (accumulator.current >= FIXED_TIMESTEP && substeps < MAX_SUBSTEPS) {
      fixedUpdate(FIXED_TIMESTEP);
      accumulator.current -= FIXED_TIMESTEP;
      substeps++;
    }

    // Interpolation alpha for smooth rendering
    const alpha = accumulator.current / FIXED_TIMESTEP;
    renderUpdate(frameTime, alpha);
  });
}
```

---

## 3. Game Loop & Physics

### Fixed Timestep Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRAME TICK                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │   Input      │───▶│  Accumulate  │───▶│  Fixed Step  │       │
│  │   Gather     │    │   Delta      │    │  (60Hz loop) │       │
│  └──────────────┘    └──────────────┘    └──────────────┘       │
│                                                 │                │
│                                                 ▼                │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                   FIXED UPDATE (16.67ms)                  │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │  1. Process Input Commands                                │   │
│  │  2. Network: Apply server state corrections               │   │
│  │  3. AI/NPC: Update behavior trees                         │   │
│  │  4. Physics: Rapier.step()                                │   │
│  │  5. Quest: Check objective triggers                       │   │
│  │  6. Network: Send client state to server                  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                 │                │
│                                                 ▼                │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                   RENDER UPDATE (Variable)                │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │  1. Interpolate positions (alpha blending)                │   │
│  │  2. Update animations (skeleton, procedural)              │   │
│  │  3. Update camera (follow, orbit)                         │   │
│  │  4. Update LOD levels                                     │   │
│  │  5. Frustum culling                                       │   │
│  │  6. Render frame                                          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Rapier Physics Integration

```typescript
// RapierContext.ts
import RAPIER from '@dimforge/rapier3d-compat';
import { createContext, useContext, useRef, useEffect } from 'react';

interface PhysicsContextType {
  world: RAPIER.World;
  step: (dt: number) => void;
  addRigidBody: (desc: RAPIER.RigidBodyDesc) => RAPIER.RigidBody;
  addCollider: (body: RAPIER.RigidBody, desc: RAPIER.ColliderDesc) => RAPIER.Collider;
  raycast: (origin: RAPIER.Vector3, direction: RAPIER.Vector3, maxToi: number) => RAPIER.RayColliderHit | null;
}

export const PhysicsContext = createContext<PhysicsContextType | null>(null);

export function PhysicsProvider({ children }: { children: React.ReactNode }) {
  const worldRef = useRef<RAPIER.World | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    RAPIER.init().then(() => {
      const gravity = new RAPIER.Vector3(0, -9.81, 0);
      worldRef.current = new RAPIER.World(gravity);
      setReady(true);
    });

    return () => {
      worldRef.current?.free();
    };
  }, []);

  const step = useCallback((dt: number) => {
    worldRef.current?.step();
  }, []);

  const addRigidBody = useCallback((desc: RAPIER.RigidBodyDesc) => {
    return worldRef.current!.createRigidBody(desc);
  }, []);

  const addCollider = useCallback((body: RAPIER.RigidBody, desc: RAPIER.ColliderDesc) => {
    return worldRef.current!.createCollider(desc, body);
  }, []);

  const raycast = useCallback((origin: RAPIER.Vector3, dir: RAPIER.Vector3, maxToi: number) => {
    const ray = new RAPIER.Ray(origin, dir);
    return worldRef.current!.castRay(ray, maxToi, true);
  }, []);

  if (!ready) return null;

  return (
    <PhysicsContext.Provider value={{
      world: worldRef.current!,
      step,
      addRigidBody,
      addCollider,
      raycast
    }}>
      {children}
    </PhysicsContext.Provider>
  );
}

export const usePhysics = () => {
  const ctx = useContext(PhysicsContext);
  if (!ctx) throw new Error('usePhysics must be used within PhysicsProvider');
  return ctx;
};
```

### Character Controller

```typescript
// CharacterController.ts
import RAPIER from '@dimforge/rapier3d-compat';

export class CharacterController {
  private controller: RAPIER.KinematicCharacterController;
  private body: RAPIER.RigidBody;
  private collider: RAPIER.Collider;

  // Movement parameters
  private readonly MOVE_SPEED = 5.0;        // m/s
  private readonly SPRINT_MULTIPLIER = 1.8;
  private readonly JUMP_VELOCITY = 8.0;     // m/s
  private readonly GRAVITY = -30.0;         // m/s²

  // State
  private velocity = new RAPIER.Vector3(0, 0, 0);
  private grounded = false;

  constructor(world: RAPIER.World, position: [number, number, number]) {
    // Create character controller
    this.controller = world.createCharacterController(0.01); // offset
    this.controller.enableAutostep(0.5, 0.2, true);  // step up small obstacles
    this.controller.enableSnapToGround(0.5);          // snap to ground
    this.controller.setApplyImpulsesToDynamicBodies(true);

    // Create kinematic body
    const bodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased()
      .setTranslation(...position);
    this.body = world.createRigidBody(bodyDesc);

    // Create capsule collider (player shape)
    const colliderDesc = RAPIER.ColliderDesc.capsule(0.4, 0.3); // height, radius
    this.collider = world.createCollider(colliderDesc, this.body);
  }

  update(input: InputState, dt: number): void {
    // Compute movement direction
    const moveDir = new RAPIER.Vector3(0, 0, 0);
    if (input.forward) moveDir.z -= 1;
    if (input.backward) moveDir.z += 1;
    if (input.left) moveDir.x -= 1;
    if (input.right) moveDir.x += 1;

    // Normalize and apply speed
    const len = Math.sqrt(moveDir.x ** 2 + moveDir.z ** 2);
    if (len > 0) {
      const speed = this.MOVE_SPEED * (input.sprint ? this.SPRINT_MULTIPLIER : 1);
      moveDir.x = (moveDir.x / len) * speed;
      moveDir.z = (moveDir.z / len) * speed;
    }

    // Apply gravity
    if (!this.grounded) {
      this.velocity.y += this.GRAVITY * dt;
    } else {
      this.velocity.y = 0;
      if (input.jump) {
        this.velocity.y = this.JUMP_VELOCITY;
      }
    }

    // Combine horizontal movement with vertical velocity
    const displacement = new RAPIER.Vector3(
      moveDir.x * dt,
      this.velocity.y * dt,
      moveDir.z * dt
    );

    // Move character
    this.controller.computeColliderMovement(this.collider, displacement);
    const movement = this.controller.computedMovement();

    // Apply movement to body
    const pos = this.body.translation();
    this.body.setNextKinematicTranslation({
      x: pos.x + movement.x,
      y: pos.y + movement.y,
      z: pos.z + movement.z,
    });

    // Update grounded state
    this.grounded = this.controller.computedGrounded();
  }

  getPosition(): [number, number, number] {
    const pos = this.body.translation();
    return [pos.x, pos.y, pos.z];
  }

  isGrounded(): boolean {
    return this.grounded;
  }
}
```

---

## 4. World Streaming

### Chunk System

```
┌─────────────────────────────────────────────────────────────────┐
│                      WORLD GRID (Top-Down)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│    ┌─────┬─────┬─────┬─────┬─────┬─────┬─────┐                  │
│    │     │     │ LOD2│ LOD2│ LOD2│     │     │                  │
│    ├─────┼─────┼─────┼─────┼─────┼─────┼─────┤                  │
│    │     │ LOD1│ LOD1│ LOD1│ LOD1│ LOD1│     │                  │
│    ├─────┼─────┼─────┼─────┼─────┼─────┼─────┤                  │
│    │ LOD2│ LOD1│ LOD0│ LOD0│ LOD0│ LOD1│ LOD2│                  │
│    ├─────┼─────┼─────┼─────┼─────┼─────┼─────┤                  │
│    │ LOD2│ LOD1│ LOD0│  P  │ LOD0│ LOD1│ LOD2│  P = Player      │
│    ├─────┼─────┼─────┼─────┼─────┼─────┼─────┤                  │
│    │ LOD2│ LOD1│ LOD0│ LOD0│ LOD0│ LOD1│ LOD2│  64m chunks      │
│    ├─────┼─────┼─────┼─────┼─────┼─────┼─────┤                  │
│    │     │ LOD1│ LOD1│ LOD1│ LOD1│ LOD1│     │                  │
│    ├─────┼─────┼─────┼─────┼─────┼─────┼─────┤                  │
│    │     │     │ LOD2│ LOD2│ LOD2│     │     │                  │
│    └─────┴─────┴─────┴─────┴─────┴─────┴─────┘                  │
│                                                                  │
│  LOD0: Full detail (0-64m)     - All props, full textures       │
│  LOD1: Medium detail (64-192m) - Reduced props, lower textures  │
│  LOD2: Low detail (192-384m)   - Landmarks only, baked lighting │
│  Unloaded: Beyond 384m         - Not in memory                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### ChunkManager Implementation

```typescript
// ChunkManager.ts
import { Vector3 } from 'three';

interface ChunkData {
  id: string;
  x: number;
  z: number;
  lod: 0 | 1 | 2;
  loaded: boolean;
  entities: EntityId[];
  mesh?: THREE.Object3D;
}

export class ChunkManager {
  private chunks = new Map<string, ChunkData>();
  private readonly CHUNK_SIZE = 64;           // meters
  private readonly LOD_DISTANCES = [64, 192, 384];

  private playerChunkX = 0;
  private playerChunkZ = 0;

  constructor(private loader: ChunkLoader) {}

  update(playerPos: Vector3): void {
    const newChunkX = Math.floor(playerPos.x / this.CHUNK_SIZE);
    const newChunkZ = Math.floor(playerPos.z / this.CHUNK_SIZE);

    // Only update if player moved to new chunk
    if (newChunkX === this.playerChunkX && newChunkZ === this.playerChunkZ) {
      return;
    }

    this.playerChunkX = newChunkX;
    this.playerChunkZ = newChunkZ;

    // Determine which chunks should be loaded at which LOD
    const requiredChunks = new Map<string, number>();

    for (let dx = -6; dx <= 6; dx++) {
      for (let dz = -6; dz <= 6; dz++) {
        const cx = newChunkX + dx;
        const cz = newChunkZ + dz;
        const dist = Math.max(Math.abs(dx), Math.abs(dz)) * this.CHUNK_SIZE;

        let lod: 0 | 1 | 2 | -1 = -1;
        if (dist < this.LOD_DISTANCES[0]) lod = 0;
        else if (dist < this.LOD_DISTANCES[1]) lod = 1;
        else if (dist < this.LOD_DISTANCES[2]) lod = 2;

        if (lod >= 0) {
          requiredChunks.set(`${cx},${cz}`, lod);
        }
      }
    }

    // Unload chunks that are no longer needed
    for (const [id, chunk] of this.chunks) {
      if (!requiredChunks.has(id)) {
        this.unloadChunk(chunk);
        this.chunks.delete(id);
      }
    }

    // Load/update required chunks
    for (const [id, lod] of requiredChunks) {
      const existing = this.chunks.get(id);
      if (!existing) {
        // Load new chunk
        const [x, z] = id.split(',').map(Number);
        this.loadChunk(x, z, lod as 0 | 1 | 2);
      } else if (existing.lod !== lod) {
        // LOD changed, reload
        this.updateChunkLOD(existing, lod as 0 | 1 | 2);
      }
    }
  }

  private async loadChunk(x: number, z: number, lod: 0 | 1 | 2): Promise<void> {
    const id = `${x},${z}`;
    const chunk: ChunkData = {
      id,
      x,
      z,
      lod,
      loaded: false,
      entities: [],
    };
    this.chunks.set(id, chunk);

    // Async load chunk data
    const data = await this.loader.loadChunk(x, z, lod);
    chunk.mesh = data.mesh;
    chunk.entities = data.entities;
    chunk.loaded = true;
  }

  private unloadChunk(chunk: ChunkData): void {
    if (chunk.mesh) {
      chunk.mesh.traverse((obj) => {
        if ((obj as THREE.Mesh).geometry) {
          (obj as THREE.Mesh).geometry.dispose();
        }
        if ((obj as THREE.Mesh).material) {
          const mat = (obj as THREE.Mesh).material;
          if (Array.isArray(mat)) {
            mat.forEach(m => m.dispose());
          } else {
            mat.dispose();
          }
        }
      });
    }
    // Despawn entities
    chunk.entities.forEach(id => this.loader.despawnEntity(id));
  }

  private async updateChunkLOD(chunk: ChunkData, newLOD: 0 | 1 | 2): Promise<void> {
    // Reload chunk with new LOD
    this.unloadChunk(chunk);
    await this.loadChunk(chunk.x, chunk.z, newLOD);
  }
}
```

---

## 5. Entity Component System

### ECS-Lite Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         ECS WORLD                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ENTITIES (ID → Component Map)                                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Entity 1: { Transform, RigidBody, Renderable, PlayerInput } ││
│  │ Entity 2: { Transform, RigidBody, Renderable, AI, Health }  ││
│  │ Entity 3: { Transform, Renderable, Interactable, QuestItem }││
│  │ Entity 4: { Transform, NetworkIdentity, RemotePlayer }      ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  SYSTEMS (Process entities with specific components)             │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ PhysicsSystem:   [Transform, RigidBody]                     ││
│  │ MovementSystem:  [Transform, RigidBody, PlayerInput]        ││
│  │ AISystem:        [Transform, AI, Health]                    ││
│  │ RenderSystem:    [Transform, Renderable]                    ││
│  │ NetworkSystem:   [Transform, NetworkIdentity]               ││
│  │ QuestSystem:     [Transform, QuestItem | QuestGiver]        ││
│  │ InteractSystem:  [Transform, Interactable]                  ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Core ECS Implementation

```typescript
// lib/ecs/World.ts
type EntityId = number;
type ComponentType = string;

interface Component {
  type: ComponentType;
}

export class World {
  private nextEntityId = 1;
  private entities = new Map<EntityId, Map<ComponentType, Component>>();
  private systems: System[] = [];
  private componentIndex = new Map<ComponentType, Set<EntityId>>();

  createEntity(): EntityId {
    const id = this.nextEntityId++;
    this.entities.set(id, new Map());
    return id;
  }

  destroyEntity(id: EntityId): void {
    const components = this.entities.get(id);
    if (components) {
      for (const type of components.keys()) {
        this.componentIndex.get(type)?.delete(id);
      }
      this.entities.delete(id);
    }
  }

  addComponent<T extends Component>(entityId: EntityId, component: T): void {
    const components = this.entities.get(entityId);
    if (!components) throw new Error(`Entity ${entityId} not found`);

    components.set(component.type, component);

    // Update index
    if (!this.componentIndex.has(component.type)) {
      this.componentIndex.set(component.type, new Set());
    }
    this.componentIndex.get(component.type)!.add(entityId);
  }

  getComponent<T extends Component>(entityId: EntityId, type: ComponentType): T | undefined {
    return this.entities.get(entityId)?.get(type) as T | undefined;
  }

  hasComponent(entityId: EntityId, type: ComponentType): boolean {
    return this.entities.get(entityId)?.has(type) ?? false;
  }

  query(...types: ComponentType[]): EntityId[] {
    if (types.length === 0) return [];

    // Start with smallest set for efficiency
    const sets = types
      .map(t => this.componentIndex.get(t) ?? new Set<EntityId>())
      .sort((a, b) => a.size - b.size);

    const result: EntityId[] = [];
    for (const id of sets[0]) {
      if (sets.every(s => s.has(id))) {
        result.push(id);
      }
    }
    return result;
  }

  addSystem(system: System): void {
    this.systems.push(system);
    this.systems.sort((a, b) => a.priority - b.priority);
  }

  update(dt: number): void {
    for (const system of this.systems) {
      system.update(this, dt);
    }
  }
}

// lib/ecs/System.ts
export abstract class System {
  abstract priority: number;
  abstract requiredComponents: ComponentType[];
  abstract update(world: World, dt: number): void;
}
```

### Component Definitions

```typescript
// components/Transform.ts
export interface TransformComponent extends Component {
  type: 'Transform';
  position: [number, number, number];
  rotation: [number, number, number, number]; // quaternion
  scale: [number, number, number];
  // For interpolation
  previousPosition?: [number, number, number];
  previousRotation?: [number, number, number, number];
}

// components/RigidBody.ts
export interface RigidBodyComponent extends Component {
  type: 'RigidBody';
  bodyType: 'dynamic' | 'kinematic' | 'static';
  mass: number;
  velocity: [number, number, number];
  angularVelocity: [number, number, number];
  rapierHandle?: number; // Reference to Rapier body
}

// components/Renderable.ts
export interface RenderableComponent extends Component {
  type: 'Renderable';
  modelUrl: string;
  visible: boolean;
  castShadow: boolean;
  receiveShadow: boolean;
  lodLevels?: string[]; // URLs for LOD0, LOD1, LOD2
  currentLOD: number;
}

// components/NetworkIdentity.ts
export interface NetworkIdentityComponent extends Component {
  type: 'NetworkIdentity';
  networkId: string;        // Unique across all clients
  ownerId: string;          // Player who owns this entity
  isLocal: boolean;         // True if controlled by this client
  lastServerUpdate: number; // Timestamp of last server state
  serverPosition?: [number, number, number];
  serverRotation?: [number, number, number, number];
}

// components/AI.ts
export interface AIComponent extends Component {
  type: 'AI';
  behaviorTree: BehaviorNode;
  currentState: string;
  blackboard: Record<string, unknown>;
  targetEntityId?: EntityId;
  wanderRadius: number;
  homePosition: [number, number, number];
}

// components/Health.ts
export interface HealthComponent extends Component {
  type: 'Health';
  current: number;
  max: number;
  regenRate: number;
  lastDamageTime: number;
  invulnerable: boolean;
}

// components/Inventory.ts
export interface InventoryComponent extends Component {
  type: 'Inventory';
  slots: InventorySlot[];
  maxSlots: number;
  currency: number;
}

interface InventorySlot {
  itemId: string;
  quantity: number;
  equipped: boolean;
}

// components/QuestGiver.ts
export interface QuestGiverComponent extends Component {
  type: 'QuestGiver';
  availableQuests: string[];    // Quest IDs
  completedQuestDialogue: string;
  npcName: string;
  dialogueTree: DialogueNode;
}

// components/Interactable.ts
export interface InteractableComponent extends Component {
  type: 'Interactable';
  interactionType: 'pickup' | 'talk' | 'use' | 'enter' | 'open';
  interactionRadius: number;
  prompt: string;              // "Press E to talk"
  requiresItem?: string;       // Item needed to interact
  onInteract: string;          // Event name to trigger
}
```

---

## 6. Avatar Pipeline

### Ready Player Me Integration

```
┌─────────────────────────────────────────────────────────────────┐
│                   AVATAR CREATION FLOW                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. User clicks "Create Avatar"                                  │
│     │                                                            │
│     ▼                                                            │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  RPM iFrame (readyplayer.me subdomain)                   │   │
│  │  • Photo upload / webcam capture                         │   │
│  │  • Body type, clothing, accessories                      │   │
│  │  • Export GLB with skeleton                              │   │
│  └──────────────────────────────────────────────────────────┘   │
│     │                                                            │
│     ▼                                                            │
│  2. RPM returns avatar URL                                       │
│     https://models.readyplayer.me/{id}.glb                       │
│     │                                                            │
│     ▼                                                            │
│  3. Client processing                                            │
│     │                                                            │
│     ├─▶ useGLTF(url) → Load GLB                                 │
│     ├─▶ SkeletonUtils.clone() → Instance for rendering          │
│     ├─▶ Extract animations from Mixamo pack                     │
│     ├─▶ Create AnimationMixer                                   │
│     └─▶ Store URL in backend (player profile)                   │
│     │                                                            │
│     ▼                                                            │
│  4. Avatar ready for gameplay                                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Avatar Component

```typescript
// components/play/Avatar.tsx
import { useGLTF, useAnimations } from '@react-three/drei';
import { SkeletonUtils } from 'three-stdlib';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

// Preloaded Mixamo animation pack (applied to any humanoid)
const ANIMATION_PACK_URL = '/animations/mixamo-pack.glb';

interface AvatarProps {
  url: string;
  position: [number, number, number];
  rotation: number;
  currentAnimation: 'idle' | 'walk' | 'run' | 'jump';
  isLocal: boolean;
}

export function Avatar({ url, position, rotation, currentAnimation, isLocal }: AvatarProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { scene, skeleton } = useGLTF(url);
  const { animations } = useGLTF(ANIMATION_PACK_URL);

  // Clone model for instancing
  const model = useMemo(() => {
    const clone = SkeletonUtils.clone(scene);
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        // Disable frustum culling for skinned meshes
        child.frustumCulled = false;
      }
    });
    return clone;
  }, [scene]);

  // Setup animations
  const { actions, mixer } = useAnimations(animations, model);

  // Animation state machine
  useEffect(() => {
    const animMap: Record<string, string> = {
      idle: 'Idle',
      walk: 'Walking',
      run: 'Running',
      jump: 'Jump',
    };

    const targetAnim = animMap[currentAnimation];
    const action = actions[targetAnim];

    if (action) {
      // Crossfade to new animation
      Object.values(actions).forEach((a) => a?.fadeOut(0.2));
      action.reset().fadeIn(0.2).play();
    }
  }, [currentAnimation, actions]);

  // For remote players, interpolate position
  const interpolatedPos = useRef(new THREE.Vector3(...position));
  const interpolatedRot = useRef(rotation);

  useFrame((_, delta) => {
    if (!isLocal && groupRef.current) {
      // Smooth interpolation for networked avatars
      interpolatedPos.current.lerp(new THREE.Vector3(...position), delta * 10);
      interpolatedRot.current += (rotation - interpolatedRot.current) * delta * 10;

      groupRef.current.position.copy(interpolatedPos.current);
      groupRef.current.rotation.y = interpolatedRot.current;
    }
  });

  return (
    <group
      ref={groupRef}
      position={isLocal ? position : interpolatedPos.current.toArray()}
      rotation={[0, isLocal ? rotation : interpolatedRot.current, 0]}
    >
      <primitive object={model} />
    </group>
  );
}

// Preload animation pack
useGLTF.preload(ANIMATION_PACK_URL);
```

### NFT Avatar Support

```typescript
// lib/web3/nftAvatarLoader.ts
import { useQuery } from '@tanstack/react-query';

interface NFTAvatar {
  tokenId: string;
  contractAddress: string;
  modelUrl: string;  // IPFS or Arweave URL
  metadata: {
    name: string;
    description: string;
    traits: Record<string, string>;
  };
}

export function useNFTAvatars(walletAddress: string) {
  return useQuery({
    queryKey: ['nft-avatars', walletAddress],
    queryFn: async (): Promise<NFTAvatar[]> => {
      // Query The Graph or Alchemy NFT API
      const response = await fetch(`/api/nfts/avatars?wallet=${walletAddress}`);
      const nfts = await response.json();

      return nfts.map((nft: any) => ({
        tokenId: nft.tokenId,
        contractAddress: nft.contract,
        modelUrl: resolveIPFS(nft.metadata.model), // Convert ipfs:// to gateway URL
        metadata: nft.metadata,
      }));
    },
    staleTime: 5 * 60 * 1000, // 5 min cache
  });
}

function resolveIPFS(url: string): string {
  if (url.startsWith('ipfs://')) {
    return url.replace('ipfs://', 'https://ipfs.io/ipfs/');
  }
  if (url.startsWith('ar://')) {
    return url.replace('ar://', 'https://arweave.net/');
  }
  return url;
}
```

---

## 7. Asset Pipeline

### CGTrader → Game Asset Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    ASSET INGESTION PIPELINE                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. ACQUIRE (CGTrader/Sketchfab)                                 │
│     • Download FBX/OBJ + texture pack                            │
│     • Verify license (Royalty Free, Editorial, etc.)             │
│     • Store license proof                                        │
│                                                                  │
│  2. CONVERT (Blender Python script)                              │
│     ┌────────────────────────────────────────────────────────┐  │
│     │  Input: FBX (10MB, 50k tris)                            │  │
│     │  ├── Decimate to LOD0 (10k tris)                        │  │
│     │  ├── Decimate to LOD1 (2k tris)                         │  │
│     │  ├── Decimate to LOD2 (500 tris)                        │  │
│     │  ├── Bake AO + Diffuse to atlas                         │  │
│     │  ├── Compress textures (JPEG + KTX2)                    │  │
│     │  ├── Export GLB (embedded textures)                     │  │
│     │  └── Generate collision mesh (convex hull)              │  │
│     │  Output: LOD0.glb (800KB), LOD1.glb (200KB), LOD2.glb   │  │
│     └────────────────────────────────────────────────────────┘  │
│                                                                  │
│  3. UPLOAD                                                       │
│     • Upload to R2 CDN (producer-tour.r2.dev)                    │
│     • Generate manifest.json with LOD URLs                       │
│     • Update asset database                                      │
│                                                                  │
│  4. RUNTIME LOADING                                              │
│     • ChunkManager requests assets for chunk                     │
│     • AssetLoader fetches appropriate LOD                        │
│     • GLTFLoader with DRACOLoader for compression                │
│     • Cache in IndexedDB for offline                             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Asset Manifest Format

```json
{
  "id": "basketball-court-001",
  "name": "Street Basketball Court",
  "category": "environment",
  "license": {
    "type": "royalty-free",
    "source": "cgtrader",
    "purchaseId": "ORD-123456",
    "date": "2024-01-15"
  },
  "lods": [
    {
      "level": 0,
      "url": "https://r2.producer.tour/models/court/lod0.glb",
      "triangles": 12500,
      "textureSize": 2048,
      "fileSize": 1250000
    },
    {
      "level": 1,
      "url": "https://r2.producer.tour/models/court/lod1.glb",
      "triangles": 3000,
      "textureSize": 1024,
      "fileSize": 350000
    },
    {
      "level": 2,
      "url": "https://r2.producer.tour/models/court/lod2.glb",
      "triangles": 800,
      "textureSize": 512,
      "fileSize": 120000
    }
  ],
  "collision": {
    "type": "mesh",
    "url": "https://r2.producer.tour/models/court/collision.glb"
  },
  "bounds": {
    "min": [-15, 0, -10],
    "max": [15, 8, 10]
  },
  "spawnPoints": [
    { "position": [0, 0.1, 5], "rotation": 0 }
  ]
}
```

### AssetLoader Implementation

```typescript
// lib/AssetLoader.ts
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader';

class AssetLoader {
  private gltfLoader: GLTFLoader;
  private cache = new Map<string, THREE.Object3D>();
  private loading = new Map<string, Promise<THREE.Object3D>>();

  constructor(renderer: THREE.WebGLRenderer) {
    this.gltfLoader = new GLTFLoader();

    // DRACO compression support
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('/draco/');
    this.gltfLoader.setDRACOLoader(dracoLoader);

    // KTX2 texture compression
    const ktx2Loader = new KTX2Loader();
    ktx2Loader.setTranscoderPath('/basis/');
    ktx2Loader.detectSupport(renderer);
    this.gltfLoader.setKTX2Loader(ktx2Loader);
  }

  async load(url: string): Promise<THREE.Object3D> {
    // Return cached
    if (this.cache.has(url)) {
      return this.cache.get(url)!.clone();
    }

    // Return in-flight promise
    if (this.loading.has(url)) {
      const obj = await this.loading.get(url)!;
      return obj.clone();
    }

    // Start loading
    const promise = new Promise<THREE.Object3D>((resolve, reject) => {
      this.gltfLoader.load(
        url,
        (gltf) => {
          this.cache.set(url, gltf.scene);
          this.loading.delete(url);
          resolve(gltf.scene.clone());
        },
        undefined,
        (error) => {
          this.loading.delete(url);
          reject(error);
        }
      );
    });

    this.loading.set(url, promise);
    return promise;
  }

  async loadWithLOD(manifest: AssetManifest, currentLOD: number): Promise<THREE.Object3D> {
    const lod = manifest.lods.find(l => l.level === currentLOD) ?? manifest.lods[0];
    return this.load(lod.url);
  }

  preload(urls: string[]): void {
    urls.forEach(url => this.load(url).catch(() => {}));
  }

  clearCache(): void {
    this.cache.forEach(obj => {
      obj.traverse(child => {
        if ((child as THREE.Mesh).geometry) {
          (child as THREE.Mesh).geometry.dispose();
        }
        if ((child as THREE.Mesh).material) {
          const mat = (child as THREE.Mesh).material;
          if (Array.isArray(mat)) mat.forEach(m => m.dispose());
          else mat.dispose();
        }
      });
    });
    this.cache.clear();
  }
}
```

---

## 8. NPC System

### Behavior Tree Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    NPC BEHAVIOR TREE                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    Selector (Root)                       │    │
│  └─────────────────────────────────────────────────────────┘    │
│                            │                                     │
│        ┌───────────────────┼───────────────────┐                │
│        ▼                   ▼                   ▼                │
│  ┌──────────┐       ┌──────────┐       ┌──────────┐             │
│  │ Combat   │       │ Interact │       │ Wander   │             │
│  │ Sequence │       │ Sequence │       │ Sequence │             │
│  └──────────┘       └──────────┘       └──────────┘             │
│        │                   │                   │                 │
│        ▼                   ▼                   ▼                 │
│  ┌──────────┐       ┌──────────┐       ┌──────────┐             │
│  │ HasTarget│       │ PlayerNear│      │ WaitTimer│             │
│  │ InRange  │       │ HasQuest  │       │ PickPoint│             │
│  │ Attack   │       │ StartTalk │       │ MoveTo   │             │
│  └──────────┘       └──────────┘       └──────────┘             │
│                                                                  │
│  Node Types:                                                     │
│  • Selector: Try children until one succeeds                    │
│  • Sequence: Run children until one fails                       │
│  • Condition: Check a predicate                                 │
│  • Action: Execute behavior                                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Behavior Tree Implementation

```typescript
// lib/ai/BehaviorTree.ts
export type NodeStatus = 'success' | 'failure' | 'running';

export interface BehaviorNode {
  tick(blackboard: Blackboard, dt: number): NodeStatus;
  reset(): void;
}

export interface Blackboard {
  entity: EntityId;
  world: World;
  // Dynamic data
  targetEntity?: EntityId;
  targetPosition?: [number, number, number];
  waitTimer?: number;
  [key: string]: unknown;
}

// Selector: Tries children in order until one succeeds
export class Selector implements BehaviorNode {
  private currentChild = 0;

  constructor(private children: BehaviorNode[]) {}

  tick(blackboard: Blackboard, dt: number): NodeStatus {
    while (this.currentChild < this.children.length) {
      const status = this.children[this.currentChild].tick(blackboard, dt);

      if (status === 'success') {
        this.reset();
        return 'success';
      }
      if (status === 'running') {
        return 'running';
      }
      // failure: try next child
      this.currentChild++;
    }

    this.reset();
    return 'failure';
  }

  reset(): void {
    this.currentChild = 0;
    this.children.forEach(c => c.reset());
  }
}

// Sequence: Runs children in order until one fails
export class Sequence implements BehaviorNode {
  private currentChild = 0;

  constructor(private children: BehaviorNode[]) {}

  tick(blackboard: Blackboard, dt: number): NodeStatus {
    while (this.currentChild < this.children.length) {
      const status = this.children[this.currentChild].tick(blackboard, dt);

      if (status === 'failure') {
        this.reset();
        return 'failure';
      }
      if (status === 'running') {
        return 'running';
      }
      // success: continue to next child
      this.currentChild++;
    }

    this.reset();
    return 'success';
  }

  reset(): void {
    this.currentChild = 0;
    this.children.forEach(c => c.reset());
  }
}

// Condition: Check a predicate
export class Condition implements BehaviorNode {
  constructor(private predicate: (bb: Blackboard) => boolean) {}

  tick(blackboard: Blackboard): NodeStatus {
    return this.predicate(blackboard) ? 'success' : 'failure';
  }

  reset(): void {}
}

// Action: Execute an action
export class Action implements BehaviorNode {
  constructor(private action: (bb: Blackboard, dt: number) => NodeStatus) {}

  tick(blackboard: Blackboard, dt: number): NodeStatus {
    return this.action(blackboard, dt);
  }

  reset(): void {}
}

// Wait: Timer action
export class Wait implements BehaviorNode {
  private elapsed = 0;

  constructor(private duration: number) {}

  tick(blackboard: Blackboard, dt: number): NodeStatus {
    this.elapsed += dt;
    if (this.elapsed >= this.duration) {
      this.reset();
      return 'success';
    }
    return 'running';
  }

  reset(): void {
    this.elapsed = 0;
  }
}
```

### Wander NPC Example

```typescript
// entities/WanderNPC.ts
import { Selector, Sequence, Condition, Action, Wait } from '../lib/ai/BehaviorTree';

export function createWanderBehavior(homePos: [number, number, number], radius: number): BehaviorNode {
  return new Selector([
    // Priority 1: Interact with nearby player
    new Sequence([
      new Condition((bb) => {
        const playerPos = bb.world.getPlayerPosition();
        const npcPos = bb.world.getComponent<TransformComponent>(bb.entity, 'Transform')!.position;
        const dist = distance(playerPos, npcPos);
        return dist < 3; // 3 meter interaction range
      }),
      new Action((bb) => {
        // Face player and play wave animation
        const transform = bb.world.getComponent<TransformComponent>(bb.entity, 'Transform')!;
        const playerPos = bb.world.getPlayerPosition();
        transform.rotation = lookAt(transform.position, playerPos);
        bb.currentAnimation = 'wave';
        return 'success';
      }),
      new Wait(2), // Wait 2 seconds
    ]),

    // Priority 2: Wander around
    new Sequence([
      // Wait at current position
      new Action((bb, dt) => {
        bb.waitTimer = (bb.waitTimer ?? 0) - dt;
        if (bb.waitTimer <= 0) {
          bb.currentAnimation = 'idle';
          return 'success';
        }
        return 'running';
      }),

      // Pick new target
      new Action((bb) => {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * radius;
        bb.targetPosition = [
          homePos[0] + Math.cos(angle) * dist,
          homePos[1],
          homePos[2] + Math.sin(angle) * dist,
        ];
        bb.waitTimer = 3 + Math.random() * 5; // Wait 3-8 seconds at destination
        return 'success';
      }),

      // Move to target
      new Action((bb, dt) => {
        const transform = bb.world.getComponent<TransformComponent>(bb.entity, 'Transform')!;
        const target = bb.targetPosition!;
        const dir = normalize(subtract(target, transform.position));
        const speed = 1.5; // m/s

        // Move
        transform.position[0] += dir[0] * speed * dt;
        transform.position[2] += dir[2] * speed * dt;

        // Rotate to face direction
        transform.rotation = lookAt([0, 0, 0], dir);

        bb.currentAnimation = 'walk';

        // Check if arrived
        const dist = distance(transform.position, target);
        if (dist < 0.5) {
          return 'success';
        }
        return 'running';
      }),
    ]),
  ]);
}
```

---

## 9. Multiplayer Networking

### Colyseus Integration

```
┌─────────────────────────────────────────────────────────────────┐
│                   MULTIPLAYER ARCHITECTURE                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  CLIENT A                    SERVER                   CLIENT B  │
│  ┌───────┐                 ┌───────┐                 ┌───────┐  │
│  │Player │◀───WebSocket───▶│ Room  │◀───WebSocket───▶│Player │  │
│  │State  │                 │ State │                 │State  │  │
│  └───────┘                 └───────┘                 └───────┘  │
│                                │                                 │
│                                ▼                                 │
│                    ┌───────────────────────┐                    │
│                    │   State Sync Schema   │                    │
│                    ├───────────────────────┤                    │
│                    │ players: Map<Player>  │                    │
│                    │ npcs: Map<NPC>        │                    │
│                    │ items: Map<Item>      │                    │
│                    │ worldState: World     │                    │
│                    └───────────────────────┘                    │
│                                                                  │
│  Sync Strategy:                                                  │
│  • Positions: 20 Hz (50ms) with interpolation                   │
│  • State changes: Immediate                                      │
│  • Physics: Client-side with server validation                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Server Room Schema

```typescript
// server/rooms/GameRoom.ts
import { Room, Client } from 'colyseus';
import { Schema, MapSchema, type } from '@colyseus/schema';

class Vector3 extends Schema {
  @type('number') x: number = 0;
  @type('number') y: number = 0;
  @type('number') z: number = 0;
}

class Player extends Schema {
  @type('string') sessionId: string = '';
  @type('string') name: string = '';
  @type('string') avatarUrl: string = '';
  @type(Vector3) position = new Vector3();
  @type('number') rotationY: number = 0;
  @type('string') animation: string = 'idle';
  @type('number') health: number = 100;
}

class GameState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
}

export class GameRoom extends Room<GameState> {
  maxClients = 50;

  onCreate(options: any) {
    this.setState(new GameState());

    // Handle player movement
    this.onMessage('move', (client, data: { x: number; y: number; z: number; rotY: number; anim: string }) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        // Server-side validation (anti-cheat)
        const speed = this.calculateSpeed(player.position, data);
        if (speed > 15) { // Max 15 m/s (sprint + buffer)
          console.warn(`Speed hack detected: ${client.sessionId}`);
          return;
        }

        player.position.x = data.x;
        player.position.y = data.y;
        player.position.z = data.z;
        player.rotationY = data.rotY;
        player.animation = data.anim;
      }
    });

    // Handle chat
    this.onMessage('chat', (client, message: string) => {
      this.broadcast('chat', {
        sessionId: client.sessionId,
        name: this.state.players.get(client.sessionId)?.name,
        message: message.slice(0, 200), // Limit length
      });
    });

    // Handle interactions
    this.onMessage('interact', (client, data: { targetId: string; action: string }) => {
      // Validate and process interaction
      this.handleInteraction(client, data);
    });

    // Fixed update for NPC AI (run on server)
    this.setSimulationInterval((dt) => {
      this.updateNPCs(dt / 1000);
    }, 1000 / 20); // 20 Hz
  }

  onJoin(client: Client, options: { name: string; avatarUrl: string }) {
    const player = new Player();
    player.sessionId = client.sessionId;
    player.name = options.name || 'Player';
    player.avatarUrl = options.avatarUrl || '';
    player.position.x = 0;
    player.position.y = 0;
    player.position.z = 5;

    this.state.players.set(client.sessionId, player);

    console.log(`${player.name} joined the room`);
  }

  onLeave(client: Client) {
    this.state.players.delete(client.sessionId);
  }

  private calculateSpeed(prev: Vector3, next: { x: number; y: number; z: number }): number {
    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    const dz = next.z - prev.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz) * 20; // Assuming 20 Hz updates
  }
}
```

### Client Network Manager

```typescript
// networking/NetworkManager.ts
import { Client, Room } from 'colyseus.js';

class NetworkManager {
  private client: Client;
  private room: Room | null = null;
  private interpolationBuffer: Map<string, PositionSnapshot[]> = new Map();

  constructor(serverUrl: string) {
    this.client = new Client(serverUrl);
  }

  async connect(roomName: string, options: JoinOptions): Promise<void> {
    this.room = await this.client.joinOrCreate(roomName, options);

    // Listen for player updates
    this.room.state.players.onAdd((player, sessionId) => {
      if (sessionId !== this.room!.sessionId) {
        gameStore.addRemotePlayer(sessionId, player);
      }
    });

    this.room.state.players.onChange((player, sessionId) => {
      if (sessionId !== this.room!.sessionId) {
        // Add to interpolation buffer
        this.addSnapshot(sessionId, {
          position: [player.position.x, player.position.y, player.position.z],
          rotationY: player.rotationY,
          animation: player.animation,
          timestamp: Date.now(),
        });
      }
    });

    this.room.state.players.onRemove((_, sessionId) => {
      gameStore.removeRemotePlayer(sessionId);
      this.interpolationBuffer.delete(sessionId);
    });

    // Listen for chat
    this.room.onMessage('chat', (data) => {
      chatStore.addMessage(data);
    });
  }

  sendPosition(x: number, y: number, z: number, rotY: number, anim: string): void {
    this.room?.send('move', { x, y, z, rotY, anim });
  }

  sendChat(message: string): void {
    this.room?.send('chat', message);
  }

  // Interpolation for smooth remote player movement
  getInterpolatedState(sessionId: string, renderTime: number): PositionSnapshot | null {
    const buffer = this.interpolationBuffer.get(sessionId);
    if (!buffer || buffer.length < 2) return null;

    // Find two snapshots to interpolate between
    const interpTime = renderTime - 100; // 100ms delay for interpolation
    let older: PositionSnapshot | null = null;
    let newer: PositionSnapshot | null = null;

    for (let i = 0; i < buffer.length - 1; i++) {
      if (buffer[i].timestamp <= interpTime && buffer[i + 1].timestamp >= interpTime) {
        older = buffer[i];
        newer = buffer[i + 1];
        break;
      }
    }

    if (!older || !newer) {
      return buffer[buffer.length - 1]; // Use latest if no interpolation possible
    }

    const t = (interpTime - older.timestamp) / (newer.timestamp - older.timestamp);
    return {
      position: [
        lerp(older.position[0], newer.position[0], t),
        lerp(older.position[1], newer.position[1], t),
        lerp(older.position[2], newer.position[2], t),
      ],
      rotationY: lerpAngle(older.rotationY, newer.rotationY, t),
      animation: newer.animation,
      timestamp: interpTime,
    };
  }

  private addSnapshot(sessionId: string, snapshot: PositionSnapshot): void {
    if (!this.interpolationBuffer.has(sessionId)) {
      this.interpolationBuffer.set(sessionId, []);
    }
    const buffer = this.interpolationBuffer.get(sessionId)!;
    buffer.push(snapshot);

    // Keep only last 1 second of snapshots
    const cutoff = Date.now() - 1000;
    while (buffer.length > 0 && buffer[0].timestamp < cutoff) {
      buffer.shift();
    }
  }

  disconnect(): void {
    this.room?.leave();
    this.room = null;
  }
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpAngle(a: number, b: number, t: number): number {
  let diff = b - a;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return a + diff * t;
}
```

---

## 10. Web3 Integration

### Wallet Connection

```typescript
// lib/web3/walletConfig.ts
import { createConfig, http } from 'wagmi';
import { base, polygon } from 'wagmi/chains';
import { coinbaseWallet, metaMask, walletConnect } from 'wagmi/connectors';

export const wagmiConfig = createConfig({
  chains: [base, polygon],
  connectors: [
    metaMask(),
    coinbaseWallet({ appName: 'Producer Tour' }),
    walletConnect({ projectId: process.env.VITE_WC_PROJECT_ID! }),
  ],
  transports: {
    [base.id]: http(),
    [polygon.id]: http(),
  },
});
```

### NFT Ownership Verification

```typescript
// lib/web3/nftOwnership.ts
import { useReadContracts } from 'wagmi';
import { erc721Abi } from 'viem';

interface OwnedNFT {
  contractAddress: string;
  tokenId: bigint;
  metadata: NFTMetadata;
}

// Batch check ownership of multiple NFTs
export function useNFTOwnership(
  walletAddress: string | undefined,
  contracts: { address: string; tokenIds: bigint[] }[]
) {
  const calls = contracts.flatMap(({ address, tokenIds }) =>
    tokenIds.map((tokenId) => ({
      address: address as `0x${string}`,
      abi: erc721Abi,
      functionName: 'ownerOf',
      args: [tokenId],
    }))
  );

  const { data, isLoading } = useReadContracts({ contracts: calls });

  const ownedNFTs: OwnedNFT[] = [];

  if (data && walletAddress) {
    let idx = 0;
    for (const { address, tokenIds } of contracts) {
      for (const tokenId of tokenIds) {
        const owner = data[idx]?.result as string | undefined;
        if (owner?.toLowerCase() === walletAddress.toLowerCase()) {
          ownedNFTs.push({ contractAddress: address, tokenId, metadata: {} as NFTMetadata });
        }
        idx++;
      }
    }
  }

  return { ownedNFTs, isLoading };
}

// Load game assets based on NFT ownership
export function useOwnedGameAssets(walletAddress: string | undefined) {
  return useQuery({
    queryKey: ['owned-assets', walletAddress],
    queryFn: async () => {
      if (!walletAddress) return [];

      // Fetch from indexer (The Graph or custom)
      const response = await fetch(`/api/assets/owned?wallet=${walletAddress}`);
      const assets = await response.json();

      return assets.map((asset: any) => ({
        id: asset.tokenId,
        type: asset.category, // 'avatar', 'vehicle', 'furniture', etc.
        modelUrl: resolveIPFS(asset.metadata.model),
        thumbnailUrl: asset.metadata.image,
        name: asset.metadata.name,
        equipped: asset.equipped,
      }));
    },
    enabled: !!walletAddress,
    staleTime: 60 * 1000, // 1 min
  });
}
```

### Token-Gated Areas

```typescript
// components/play/TokenGate.tsx
import { useAccount } from 'wagmi';
import { useNFTOwnership } from '../../lib/web3/nftOwnership';

interface TokenGateProps {
  requiredContract: string;
  requiredTokenId?: bigint; // Specific token or any from collection
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function TokenGate({ requiredContract, requiredTokenId, children, fallback }: TokenGateProps) {
  const { address } = useAccount();
  const { ownedNFTs, isLoading } = useNFTOwnership(
    address,
    [{ address: requiredContract, tokenIds: requiredTokenId ? [requiredTokenId] : [] }]
  );

  if (isLoading) {
    return <LoadingSpinner />;
  }

  const hasAccess = requiredTokenId
    ? ownedNFTs.some(nft => nft.tokenId === requiredTokenId)
    : ownedNFTs.length > 0; // Any token from collection

  if (!hasAccess) {
    return fallback ?? <AccessDeniedMessage contract={requiredContract} />;
  }

  return <>{children}</>;
}

// In-world usage
function VIPLounge() {
  return (
    <TokenGate
      requiredContract="0x..."
      fallback={<LockedDoor message="VIP Pass Required" />}
    >
      <LoungeInterior />
    </TokenGate>
  );
}
```

---

## 11. Quest System

### Quest Data Model

```typescript
// types/quest.ts
interface Quest {
  id: string;
  title: string;
  description: string;
  category: 'main' | 'side' | 'daily' | 'event';
  level: number;

  // Prerequisites
  requiredQuests: string[];      // Must complete these first
  requiredLevel: number;
  requiredItems?: { itemId: string; quantity: number }[];

  // Objectives
  objectives: QuestObjective[];

  // Rewards
  rewards: QuestReward[];

  // State
  status: 'locked' | 'available' | 'active' | 'completed' | 'failed';
  startedAt?: number;
  completedAt?: number;

  // NPC references
  questGiverId?: string;         // Entity ID of quest giver
  turnInNpcId?: string;          // Entity ID for turn-in (if different)

  // Dialogue
  startDialogue: string[];
  inProgressDialogue: string[];
  completionDialogue: string[];
}

interface QuestObjective {
  id: string;
  type: 'collect' | 'kill' | 'visit' | 'interact' | 'deliver' | 'escort' | 'craft';
  description: string;
  target: string;                // Item ID, NPC ID, Location ID, etc.
  current: number;
  required: number;
  optional: boolean;
  hidden: boolean;               // Don't show until triggered
}

interface QuestReward {
  type: 'xp' | 'currency' | 'item' | 'nft' | 'unlock';
  id?: string;                   // Item/NFT ID
  amount: number;
  description: string;
}
```

### Quest Store

```typescript
// store/quest.store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface QuestState {
  activeQuests: Map<string, Quest>;
  completedQuests: Set<string>;
  questProgress: Map<string, Map<string, number>>; // questId -> objectiveId -> progress

  // Actions
  acceptQuest: (quest: Quest) => void;
  updateObjective: (questId: string, objectiveId: string, progress: number) => void;
  completeQuest: (questId: string) => void;
  abandonQuest: (questId: string) => void;

  // Queries
  getActiveQuests: () => Quest[];
  getQuestProgress: (questId: string) => number; // 0-1
  isQuestComplete: (questId: string) => boolean;
  canAcceptQuest: (quest: Quest) => boolean;
}

export const useQuestStore = create<QuestState>()(
  persist(
    (set, get) => ({
      activeQuests: new Map(),
      completedQuests: new Set(),
      questProgress: new Map(),

      acceptQuest: (quest) => {
        set((state) => {
          const newActive = new Map(state.activeQuests);
          newActive.set(quest.id, { ...quest, status: 'active', startedAt: Date.now() });

          const newProgress = new Map(state.questProgress);
          const objectives = new Map<string, number>();
          quest.objectives.forEach((obj) => objectives.set(obj.id, 0));
          newProgress.set(quest.id, objectives);

          return { activeQuests: newActive, questProgress: newProgress };
        });
      },

      updateObjective: (questId, objectiveId, progress) => {
        set((state) => {
          const newProgress = new Map(state.questProgress);
          const questObjectives = new Map(newProgress.get(questId) ?? new Map());
          questObjectives.set(objectiveId, progress);
          newProgress.set(questId, questObjectives);

          // Check if quest is complete
          const quest = state.activeQuests.get(questId);
          if (quest) {
            const allComplete = quest.objectives
              .filter((o) => !o.optional)
              .every((o) => (questObjectives.get(o.id) ?? 0) >= o.required);

            if (allComplete) {
              // Trigger quest completion (can show UI, etc.)
              console.log(`Quest ${questId} objectives complete!`);
            }
          }

          return { questProgress: newProgress };
        });
      },

      completeQuest: (questId) => {
        set((state) => {
          const quest = state.activeQuests.get(questId);
          if (!quest) return state;

          const newActive = new Map(state.activeQuests);
          newActive.delete(questId);

          const newCompleted = new Set(state.completedQuests);
          newCompleted.add(questId);

          // Grant rewards
          quest.rewards.forEach((reward) => {
            switch (reward.type) {
              case 'xp':
                playerStore.getState().addXP(reward.amount);
                break;
              case 'currency':
                playerStore.getState().addCurrency(reward.amount);
                break;
              case 'item':
                inventoryStore.getState().addItem(reward.id!, reward.amount);
                break;
              // NFT rewards require server verification
            }
          });

          return { activeQuests: newActive, completedQuests: newCompleted };
        });
      },

      abandonQuest: (questId) => {
        set((state) => {
          const newActive = new Map(state.activeQuests);
          newActive.delete(questId);
          const newProgress = new Map(state.questProgress);
          newProgress.delete(questId);
          return { activeQuests: newActive, questProgress: newProgress };
        });
      },

      getActiveQuests: () => Array.from(get().activeQuests.values()),

      getQuestProgress: (questId) => {
        const quest = get().activeQuests.get(questId);
        if (!quest) return 0;

        const progress = get().questProgress.get(questId);
        if (!progress) return 0;

        const requiredObjectives = quest.objectives.filter((o) => !o.optional);
        const total = requiredObjectives.reduce((sum, o) => sum + o.required, 0);
        const current = requiredObjectives.reduce(
          (sum, o) => sum + Math.min(progress.get(o.id) ?? 0, o.required),
          0
        );

        return total > 0 ? current / total : 0;
      },

      isQuestComplete: (questId) => get().completedQuests.has(questId),

      canAcceptQuest: (quest) => {
        const state = get();

        // Check prerequisites
        if (!quest.requiredQuests.every((id) => state.completedQuests.has(id))) {
          return false;
        }

        // Check level
        if (playerStore.getState().level < quest.requiredLevel) {
          return false;
        }

        // Check not already active or completed
        if (state.activeQuests.has(quest.id) || state.completedQuests.has(quest.id)) {
          return false;
        }

        return true;
      },
    }),
    {
      name: 'quest-storage',
      partialize: (state) => ({
        completedQuests: Array.from(state.completedQuests),
        // Don't persist active quests - reload from server
      }),
    }
  )
);
```

### Quest System (ECS)

```typescript
// systems/QuestSystem.ts
import { System, World } from '../lib/ecs';

export class QuestSystem extends System {
  priority = 50;
  requiredComponents = ['Transform'];

  private checkRadius = 2; // meters

  update(world: World, dt: number): void {
    const playerPos = world.getPlayerPosition();
    const activeQuests = questStore.getState().getActiveQuests();

    // Check proximity-based objectives
    for (const quest of activeQuests) {
      for (const objective of quest.objectives) {
        if (objective.type === 'visit') {
          this.checkVisitObjective(world, playerPos, quest.id, objective);
        }
      }
    }

    // Check interact objectives (triggered by Interactable system)
    // Check collect objectives (triggered by Inventory system)
    // etc.
  }

  private checkVisitObjective(
    world: World,
    playerPos: [number, number, number],
    questId: string,
    objective: QuestObjective
  ): void {
    // Find the location entity
    const locationEntities = world.query('Transform', 'QuestLocation');
    for (const entityId of locationEntities) {
      const location = world.getComponent<QuestLocationComponent>(entityId, 'QuestLocation')!;
      if (location.locationId !== objective.target) continue;

      const transform = world.getComponent<TransformComponent>(entityId, 'Transform')!;
      const dist = distance(playerPos, transform.position);

      if (dist < location.radius) {
        // Player is at the location
        const current = questStore.getState().questProgress.get(questId)?.get(objective.id) ?? 0;
        if (current < objective.required) {
          questStore.getState().updateObjective(questId, objective.id, current + 1);
        }
      }
    }
  }

  // Called by other systems
  onItemCollected(itemId: string, quantity: number): void {
    const activeQuests = questStore.getState().getActiveQuests();
    for (const quest of activeQuests) {
      for (const objective of quest.objectives) {
        if (objective.type === 'collect' && objective.target === itemId) {
          const current = questStore.getState().questProgress.get(quest.id)?.get(objective.id) ?? 0;
          questStore.getState().updateObjective(quest.id, objective.id, current + quantity);
        }
      }
    }
  }

  onEntityInteracted(entityId: EntityId, interactionType: string): void {
    const activeQuests = questStore.getState().getActiveQuests();
    for (const quest of activeQuests) {
      for (const objective of quest.objectives) {
        if (objective.type === 'interact' && objective.target === String(entityId)) {
          const current = questStore.getState().questProgress.get(quest.id)?.get(objective.id) ?? 0;
          questStore.getState().updateObjective(quest.id, objective.id, current + 1);
        }
      }
    }
  }
}
```

---

## 12. User-Generated Content

### UGC Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                       UGC UPLOAD FLOW                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. USER UPLOADS                                                 │
│     ┌─────────────────────────────────────────────────────┐     │
│     │  Upload Portal                                       │     │
│     │  • Drag & drop GLB/GLTF file                        │     │
│     │  • Fill metadata (name, category, tags)             │     │
│     │  • Set permissions (public, friends, private)       │     │
│     │  • Preview in 3D viewer                             │     │
│     └─────────────────────────────────────────────────────┘     │
│                            │                                     │
│                            ▼                                     │
│  2. VALIDATION (Server)                                          │
│     ┌─────────────────────────────────────────────────────┐     │
│     │  Automated Checks                                    │     │
│     │  • File size < 10MB                                  │     │
│     │  • Triangle count < 50,000                           │     │
│     │  • Texture resolution ≤ 2048                         │     │
│     │  • No scripts/executable content                     │     │
│     │  • Valid skeleton (if animated)                      │     │
│     │  • Bounds check (reasonable dimensions)              │     │
│     └─────────────────────────────────────────────────────┘     │
│                            │                                     │
│                            ▼                                     │
│  3. PROCESSING                                                   │
│     ┌─────────────────────────────────────────────────────┐     │
│     │  Asset Pipeline                                      │     │
│     │  • Generate LODs (10k, 2k, 500 tris)                │     │
│     │  • Compress textures (KTX2)                         │     │
│     │  • Generate collision mesh                           │     │
│     │  • Create thumbnail                                  │     │
│     │  • Calculate physics properties                      │     │
│     └─────────────────────────────────────────────────────┘     │
│                            │                                     │
│                            ▼                                     │
│  4. MODERATION                                                   │
│     ┌─────────────────────────────────────────────────────┐     │
│     │  Review Queue                                        │     │
│     │  • AI content filter (inappropriate content)         │     │
│     │  • Manual review for flagged items                   │     │
│     │  • Community reports                                 │     │
│     │  • Approval → Published                              │     │
│     │  • Rejection → Feedback to user                      │     │
│     └─────────────────────────────────────────────────────┘     │
│                            │                                     │
│                            ▼                                     │
│  5. DISTRIBUTION                                                 │
│     ┌─────────────────────────────────────────────────────┐     │
│     │  Storage & Delivery                                  │     │
│     │  • Upload to IPFS (permanent storage)               │     │
│     │  • Pin to Cloudflare R2 (fast CDN)                  │     │
│     │  • Index in asset database                          │     │
│     │  • Available in marketplace                          │     │
│     └─────────────────────────────────────────────────────┘     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### In-World Placement

```typescript
// components/play/PlacementTool.tsx
import { useThree } from '@react-three/fiber';
import { useState, useRef } from 'react';

interface PlacementToolProps {
  assetUrl: string;
  onPlace: (position: [number, number, number], rotation: number) => void;
  onCancel: () => void;
}

export function PlacementTool({ assetUrl, onPlace, onCancel }: PlacementToolProps) {
  const { camera, raycaster, mouse } = useThree();
  const [position, setPosition] = useState<[number, number, number]>([0, 0, 0]);
  const [rotation, setRotation] = useState(0);
  const previewRef = useRef<THREE.Group>(null);

  // Load preview model
  const { scene } = useGLTF(assetUrl);
  const previewModel = useMemo(() => {
    const clone = scene.clone();
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.material = new THREE.MeshStandardMaterial({
          color: 0x00ff00,
          transparent: true,
          opacity: 0.5,
        });
      }
    });
    return clone;
  }, [scene]);

  // Update placement position on mouse move
  useFrame(() => {
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(groundMeshes, true);

    if (intersects.length > 0) {
      const point = intersects[0].point;
      // Snap to grid (optional)
      const snapped: [number, number, number] = [
        Math.round(point.x * 2) / 2,
        point.y,
        Math.round(point.z * 2) / 2,
      ];
      setPosition(snapped);
    }
  });

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'q':
          setRotation((r) => r - Math.PI / 8);
          break;
        case 'e':
          setRotation((r) => r + Math.PI / 8);
          break;
        case 'Enter':
          onPlace(position, rotation);
          break;
        case 'Escape':
          onCancel();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [position, rotation, onPlace, onCancel]);

  return (
    <group ref={previewRef} position={position} rotation={[0, rotation, 0]}>
      <primitive object={previewModel} />
    </group>
  );
}
```

---

## 13. Backend Services

### Service Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      BACKEND SERVICES                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │    Auth     │  │   Player    │  │    Quest    │              │
│  │   Service   │  │   Service   │  │   Service   │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│         │                │                │                      │
│         └────────────────┼────────────────┘                      │
│                          ▼                                       │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    API Gateway (Express)                     ││
│  │  • Rate limiting                                             ││
│  │  • Auth middleware (JWT + wallet signature)                  ││
│  │  • Request validation                                        ││
│  │  • Response caching                                          ││
│  └─────────────────────────────────────────────────────────────┘│
│                          │                                       │
│         ┌────────────────┼────────────────┐                      │
│         ▼                ▼                ▼                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  PostgreSQL │  │    Redis    │  │ Cloudflare  │              │
│  │  (Prisma)   │  │  (Cache)    │  │     R2      │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### API Routes

```typescript
// apps/backend/src/routes/index.ts
import { Router } from 'express';
import { authMiddleware, walletAuthMiddleware } from '../middleware/auth';

const router = Router();

// Auth
router.post('/auth/nonce', generateNonce);           // Get signing nonce
router.post('/auth/verify', verifySignature);        // Verify wallet signature
router.post('/auth/refresh', refreshToken);          // Refresh JWT

// Player
router.get('/player/profile', authMiddleware, getProfile);
router.put('/player/profile', authMiddleware, updateProfile);
router.get('/player/inventory', authMiddleware, getInventory);
router.post('/player/avatar', authMiddleware, setAvatar);

// Quests
router.get('/quests/available', authMiddleware, getAvailableQuests);
router.get('/quests/active', authMiddleware, getActiveQuests);
router.post('/quests/:id/accept', authMiddleware, acceptQuest);
router.post('/quests/:id/complete', authMiddleware, completeQuest);
router.post('/quests/:id/abandon', authMiddleware, abandonQuest);

// Assets
router.get('/assets/owned', walletAuthMiddleware, getOwnedAssets);
router.post('/assets/upload', authMiddleware, uploadAsset);
router.get('/assets/:id', getAssetMetadata);
router.get('/assets/:id/download', authMiddleware, downloadAsset);

// Social
router.get('/players/nearby', authMiddleware, getNearbyPlayers);
router.post('/players/:id/friend', authMiddleware, sendFriendRequest);
router.get('/players/friends', authMiddleware, getFriends);

// Marketplace
router.get('/marketplace/listings', getListings);
router.post('/marketplace/list', walletAuthMiddleware, createListing);
router.post('/marketplace/buy', walletAuthMiddleware, buyListing);

export default router;
```

### Database Schema (Prisma)

```prisma
// prisma/schema.prisma

model User {
  id            String    @id @default(cuid())
  walletAddress String    @unique
  username      String?   @unique
  avatarUrl     String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  // Game data
  level         Int       @default(1)
  xp            Int       @default(0)
  currency      Int       @default(0)

  // Relations
  inventory     InventoryItem[]
  questProgress QuestProgress[]
  placedAssets  PlacedAsset[]
  friends       Friendship[]    @relation("UserFriends")
  friendOf      Friendship[]    @relation("FriendOf")
}

model InventoryItem {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  itemId    String
  quantity  Int      @default(1)
  equipped  Boolean  @default(false)
  createdAt DateTime @default(now())

  @@unique([userId, itemId])
}

model Quest {
  id          String   @id
  title       String
  description String
  category    String   // main, side, daily, event
  level       Int      @default(1)
  objectives  Json     // QuestObjective[]
  rewards     Json     // QuestReward[]
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())

  progress    QuestProgress[]
}

model QuestProgress {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  questId     String
  quest       Quest    @relation(fields: [questId], references: [id])
  status      String   // active, completed, failed, abandoned
  objectives  Json     // Map<objectiveId, progress>
  startedAt   DateTime @default(now())
  completedAt DateTime?

  @@unique([userId, questId])
}

model Asset {
  id           String   @id @default(cuid())
  creatorId    String
  name         String
  description  String?
  category     String   // furniture, vehicle, decoration, etc.
  modelUrl     String   // IPFS URL
  thumbnailUrl String
  triangles    Int
  fileSize     Int
  status       String   // pending, approved, rejected
  isPublic     Boolean  @default(false)
  createdAt    DateTime @default(now())

  placements   PlacedAsset[]
}

model PlacedAsset {
  id        String   @id @default(cuid())
  ownerId   String
  owner     User     @relation(fields: [ownerId], references: [id])
  assetId   String
  asset     Asset    @relation(fields: [assetId], references: [id])
  chunkX    Int
  chunkZ    Int
  positionX Float
  positionY Float
  positionZ Float
  rotationY Float
  scale     Float    @default(1)
  createdAt DateTime @default(now())

  @@index([chunkX, chunkZ])
}

model Friendship {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation("UserFriends", fields: [userId], references: [id])
  friendId  String
  friend    User     @relation("FriendOf", fields: [friendId], references: [id])
  status    String   // pending, accepted, blocked
  createdAt DateTime @default(now())

  @@unique([userId, friendId])
}
```

---

## 14. Performance Budget

### Target Metrics

| Metric | Target | Critical |
|--------|--------|----------|
| Frame Rate | 60 FPS | ≥ 30 FPS |
| Frame Time | 16.67ms | < 33ms |
| Draw Calls | < 200 | < 500 |
| Triangles | < 500K | < 1M |
| Texture Memory | < 512MB | < 1GB |
| JS Heap | < 256MB | < 512MB |
| Initial Load | < 5s | < 10s |
| Chunk Load | < 500ms | < 1s |

### Performance Monitoring

```typescript
// lib/performance/Monitor.ts
class PerformanceMonitor {
  private frameTimeHistory: number[] = [];
  private readonly HISTORY_SIZE = 60;

  update(frameTime: number): void {
    this.frameTimeHistory.push(frameTime);
    if (this.frameTimeHistory.length > this.HISTORY_SIZE) {
      this.frameTimeHistory.shift();
    }
  }

  getAverageFPS(): number {
    if (this.frameTimeHistory.length === 0) return 0;
    const avgFrameTime = this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length;
    return 1 / avgFrameTime;
  }

  getMemoryUsage(): { jsHeap: number; textureMemory: number } {
    const memory = (performance as any).memory;
    return {
      jsHeap: memory?.usedJSHeapSize ?? 0,
      textureMemory: this.estimateTextureMemory(),
    };
  }

  private estimateTextureMemory(): number {
    // Estimate from loaded textures
    let total = 0;
    // Would iterate through texture cache and sum up memory
    return total;
  }

  getDrawCalls(renderer: THREE.WebGLRenderer): number {
    return renderer.info.render.calls;
  }

  getTriangleCount(renderer: THREE.WebGLRenderer): number {
    return renderer.info.render.triangles;
  }

  shouldReduceQuality(): boolean {
    return this.getAverageFPS() < 30;
  }
}

// Auto-quality adjustment
function useAdaptiveQuality() {
  const monitor = useRef(new PerformanceMonitor());
  const [quality, setQuality] = useState<'high' | 'medium' | 'low'>('high');

  useFrame((state, delta) => {
    monitor.current.update(delta);

    const fps = monitor.current.getAverageFPS();
    if (fps < 30 && quality !== 'low') {
      setQuality('low');
      // Reduce shadow resolution, disable post-processing, etc.
    } else if (fps < 50 && quality === 'high') {
      setQuality('medium');
    } else if (fps > 55 && quality !== 'high') {
      setQuality('high');
    }
  });

  return quality;
}
```

---

## 15. Migration Plan

### Phase 1: Foundation (Weeks 1-3)
- [ ] Set up Rapier physics provider
- [ ] Implement fixed timestep game loop
- [ ] Create ECS-lite core (World, Entity, System)
- [ ] Migrate player movement to character controller
- [ ] Add basic collision detection

### Phase 2: World System (Weeks 4-5)
- [ ] Implement ChunkManager
- [ ] Add LOD system for assets
- [ ] Create asset manifest format
- [ ] Set up IndexedDB caching
- [ ] Migrate basketball court to chunk system

### Phase 3: Multiplayer (Weeks 6-8)
- [ ] Set up Colyseus server
- [ ] Implement player sync (position, animation)
- [ ] Add interpolation for remote players
- [ ] Create lobby/room system
- [ ] Add proximity chat

### Phase 4: Web3 (Weeks 9-10)
- [ ] Integrate wagmi wallet connection
- [ ] Implement NFT ownership verification
- [ ] Add token-gated areas
- [ ] Create NFT avatar loader
- [ ] Set up marketplace contracts

### Phase 5: Quests & UGC (Weeks 11-13)
- [ ] Implement quest system
- [ ] Create quest UI (tracker, journal)
- [ ] Add NPC dialogue system
- [ ] Build UGC upload portal
- [ ] Implement moderation queue
- [ ] Add placement tool

### Phase 6: Polish (Weeks 14-15)
- [ ] Performance optimization pass
- [ ] Mobile touch controls
- [ ] Audio system (spatial, ambient)
- [ ] Particle effects
- [ ] UI polish
- [ ] Beta testing

---

## Appendix: File References

### Current Implementation
- [PlayWorld.tsx](apps/frontend/src/components/play/PlayWorld.tsx) - Main 3D world component
- [PlayPage.tsx](apps/frontend/src/pages/PlayPage.tsx) - Play page with canvas setup
- [auth.store.ts](apps/frontend/src/store/auth.store.ts) - Auth state management

### Assets
- CDN: `https://pub-5e192bc6cd8640f1b75ee043036d06d2.r2.dev`
- Models: `/models/{category}/{name}/`
- Textures: `/models/{category}/{name}/Textures/`
