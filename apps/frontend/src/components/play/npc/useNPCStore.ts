/**
 * NPC Store
 * Zustand store for NPC state management
 *
 * PERFORMANCE: Uses Immer middleware for structural sharing.
 * This prevents O(n) Map copies on every NPC position update.
 * With 50 NPCs, this reduces per-update cost from ~50 copies to O(1).
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

export type NPCBehavior = 'idle' | 'patrol' | 'follow' | 'flee' | 'attack' | 'wander';
export type NPCState = 'idle' | 'walking' | 'running' | 'talking' | 'dead';

export interface PatrolPoint {
  x: number;
  y: number;
  z: number;
  waitTime?: number; // Time to wait at this point (ms)
}

export interface NPCData {
  id: string;
  name: string;
  type: 'friendly' | 'neutral' | 'hostile';

  // Position & movement
  position: { x: number; y: number; z: number };
  rotation: number; // Y-axis rotation in radians
  targetPosition?: { x: number; y: number; z: number };

  // State
  behavior: NPCBehavior;
  state: NPCState;
  health: number;
  maxHealth: number;

  // Combat stats (for hostile NPCs)
  attackDamage?: number;      // Damage per attack (default: 10)
  attackCooldown?: number;    // Time between attacks in ms (default: 1500)
  aggroRange?: number;        // Distance to detect player (default: 15)
  attackRange?: number;       // Melee attack range (default: 2)
  lastAttackTime?: number;    // Timestamp of last attack
  isAggro?: boolean;          // Currently aggro'd on player

  // Respawn configuration
  respawnTime?: number; // Time in ms to respawn (0 or undefined = no respawn)
  spawnPosition?: { x: number; y: number; z: number }; // Original spawn point
  deathTime?: number; // Timestamp when NPC died

  // Patrol config
  patrolPoints?: PatrolPoint[];
  currentPatrolIndex?: number;

  // Interaction
  dialogueId?: string;
  isInteractable: boolean;
  interactionRange: number;

  // Visual
  avatarUrl?: string;      // Mixamo-animated RPM avatar
  modelUrl?: string;       // GLB model (static or animated)
  animated?: boolean;      // If true with modelUrl, use Mixamo animations
  color?: string;
  scale?: number;
}

interface NPCStore {
  npcs: Map<string, NPCData>;
  activeDialogue: string | null;
  selectedNPC: string | null;

  // CRUD
  addNPC: (npc: NPCData) => void;
  removeNPC: (id: string) => void;
  updateNPC: (id: string, updates: Partial<NPCData>) => void;
  getNPC: (id: string) => NPCData | undefined;

  // Batch operations
  addNPCs: (npcs: NPCData[]) => void;
  clearAllNPCs: () => void;

  // State changes
  setNPCPosition: (id: string, position: { x: number; y: number; z: number }) => void;
  setNPCState: (id: string, state: NPCState) => void;
  setNPCBehavior: (id: string, behavior: NPCBehavior) => void;
  damageNPC: (id: string, damage: number) => void;
  respawnNPC: (id: string) => void;

  // Interaction
  setSelectedNPC: (id: string | null) => void;
  startDialogue: (npcId: string) => void;
  endDialogue: () => void;

  // Queries
  getNPCsInRange: (position: { x: number; y: number; z: number }, range: number) => NPCData[];
  getInteractableNPCs: (playerPos: { x: number; y: number; z: number }) => NPCData[];
  getHostileNPCs: () => NPCData[];
}

// Generate unique NPC ID
let npcIdCounter = 0;
export const generateNPCId = () => `npc_${++npcIdCounter}`;

export const useNPCStore = create<NPCStore>()(
  immer((set, get) => ({
    npcs: new Map(),
    activeDialogue: null,
    selectedNPC: null,

    // CRUD operations - Immer handles structural sharing
    addNPC: (npc) => {
      set((state) => {
        state.npcs.set(npc.id, npc);
      });
    },

    removeNPC: (id) => {
      set((state) => {
        state.npcs.delete(id);
      });
    },

    updateNPC: (id, updates) => {
      set((state) => {
        const npc = state.npcs.get(id);
        if (npc) {
          state.npcs.set(id, { ...npc, ...updates });
        }
      });
    },

    getNPC: (id) => get().npcs.get(id),

    // Batch operations
    addNPCs: (npcList) => {
      set((state) => {
        npcList.forEach((npc) => state.npcs.set(npc.id, npc));
      });
    },

    clearAllNPCs: () =>
      set((state) => {
        state.npcs = new Map();
        state.selectedNPC = null;
        state.activeDialogue = null;
      }),

    // State changes - O(1) updates with Immer
    setNPCPosition: (id, position) => {
      set((state) => {
        const npc = state.npcs.get(id);
        if (npc) {
          npc.position = position;
        }
      });
    },

    setNPCState: (id, state) => {
      set((draft) => {
        const npc = draft.npcs.get(id);
        if (npc) {
          npc.state = state;
        }
      });
    },

    setNPCBehavior: (id, behavior) => {
      set((state) => {
        const npc = state.npcs.get(id);
        if (npc) {
          npc.behavior = behavior;
        }
      });
    },

    damageNPC: (id, damage) => {
      const npc = get().npcs.get(id);
      if (!npc || npc.state === 'dead') return;

      const newHealth = Math.max(0, npc.health - damage);
      const isDead = newHealth <= 0;

      set((state) => {
        const npcDraft = state.npcs.get(id);
        if (npcDraft) {
          npcDraft.health = newHealth;
          if (isDead) {
            npcDraft.state = 'dead';
            npcDraft.behavior = 'idle';
            npcDraft.deathTime = Date.now();
          }
        }
      });

      // Schedule respawn if configured
      if (isDead && npc.respawnTime && npc.respawnTime > 0) {
        setTimeout(() => {
          get().respawnNPC(id);
        }, npc.respawnTime);
      }
    },

    respawnNPC: (id) => {
      set((state) => {
        const npc = state.npcs.get(id);
        if (!npc) return;

        npc.health = npc.maxHealth;
        npc.state = 'idle';
        npc.behavior = npc.behavior === 'idle' ? 'wander' : npc.behavior;
        npc.position = npc.spawnPosition || npc.position;
        npc.deathTime = undefined;
      });
    },

    // Interaction
    setSelectedNPC: (id) =>
      set((state) => {
        state.selectedNPC = id;
      }),

    startDialogue: (npcId) => {
      const npc = get().npcs.get(npcId);
      if (npc?.dialogueId && npc.isInteractable) {
        set((state) => {
          state.activeDialogue = npc.dialogueId!;
          state.selectedNPC = npcId;
        });
      }
    },

    endDialogue: () =>
      set((state) => {
        state.activeDialogue = null;
      }),

    // Queries - read-only, no mutations needed
    getNPCsInRange: (position, range) => {
      const result: NPCData[] = [];
      get().npcs.forEach((npc) => {
        const dx = npc.position.x - position.x;
        const dy = npc.position.y - position.y;
        const dz = npc.position.z - position.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (distance <= range) {
          result.push(npc);
        }
      });
      return result;
    },

    getInteractableNPCs: (playerPos) => {
      const result: NPCData[] = [];
      get().npcs.forEach((npc) => {
        if (!npc.isInteractable || npc.state === 'dead') return;

        const dx = npc.position.x - playerPos.x;
        const dz = npc.position.z - playerPos.z;
        const distance = Math.sqrt(dx * dx + dz * dz);

        if (distance <= npc.interactionRange) {
          result.push(npc);
        }
      });
      return result;
    },

    getHostileNPCs: () => {
      const result: NPCData[] = [];
      get().npcs.forEach((npc) => {
        if (npc.type === 'hostile' && npc.state !== 'dead') {
          result.push(npc);
        }
      });
      return result;
    },
  }))
);

// Factory functions for creating NPCs
export function createNPC(options: Partial<NPCData> & { name: string; position: { x: number; y: number; z: number } }): NPCData {
  return {
    id: options.id || generateNPCId(),
    name: options.name,
    type: options.type || 'neutral',
    position: options.position,
    rotation: options.rotation || 0,
    behavior: options.behavior || 'idle',
    state: options.state || 'idle',
    health: options.health ?? 100,
    maxHealth: options.maxHealth ?? 100,
    respawnTime: options.respawnTime,
    spawnPosition: options.spawnPosition || options.position, // Default to initial position
    patrolPoints: options.patrolPoints,
    currentPatrolIndex: 0,
    dialogueId: options.dialogueId,
    isInteractable: options.isInteractable ?? true,
    interactionRange: options.interactionRange ?? 3,
    avatarUrl: options.avatarUrl,
    modelUrl: options.modelUrl,
    animated: options.animated ?? false,
    color: options.color || '#8b5cf6',
    scale: options.scale ?? 1,
  };
}

export function createPatrolNPC(
  name: string,
  patrolPoints: PatrolPoint[],
  options?: Partial<NPCData>
): NPCData {
  return createNPC({
    ...options,
    name,
    position: patrolPoints[0],
    behavior: 'patrol',
    patrolPoints,
  });
}

export default useNPCStore;
