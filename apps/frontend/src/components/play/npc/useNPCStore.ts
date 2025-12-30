/**
 * NPC Store
 * Zustand store for NPC state management
 */

import { create } from 'zustand';
import { npcTimers } from '../../../lib/utils/TimerManager';

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

export const useNPCStore = create<NPCStore>((set, get) => ({
  npcs: new Map(),
  activeDialogue: null,
  selectedNPC: null,

  // CRUD operations
  addNPC: (npc) => {
    const npcs = new Map(get().npcs);
    npcs.set(npc.id, npc);
    set({ npcs });
  },

  removeNPC: (id) => {
    // Cancel any pending respawn timer for this NPC
    npcTimers.clearTimeout(`respawn-${id}`);

    const npcs = new Map(get().npcs);
    npcs.delete(id);
    set({ npcs });
  },

  updateNPC: (id, updates) => {
    const npcs = new Map(get().npcs);
    const npc = npcs.get(id);
    if (npc) {
      npcs.set(id, { ...npc, ...updates });
      set({ npcs });
    }
  },

  getNPC: (id) => get().npcs.get(id),

  // Batch operations
  addNPCs: (npcList) => {
    const npcs = new Map(get().npcs);
    npcList.forEach((npc) => npcs.set(npc.id, npc));
    set({ npcs });
  },

  clearAllNPCs: () => {
    // Cancel all NPC-related timers
    npcTimers.clearAll();

    set({
      npcs: new Map(),
      selectedNPC: null,
      activeDialogue: null,
    });
  },

  // State changes
  setNPCPosition: (id, position) => {
    const npcs = new Map(get().npcs);
    const npc = npcs.get(id);
    if (npc) {
      npcs.set(id, { ...npc, position });
      set({ npcs });
    }
  },

  setNPCState: (id, newState) => {
    const npcs = new Map(get().npcs);
    const npc = npcs.get(id);
    if (npc) {
      npcs.set(id, { ...npc, state: newState });
      set({ npcs });
    }
  },

  setNPCBehavior: (id, behavior) => {
    const npcs = new Map(get().npcs);
    const npc = npcs.get(id);
    if (npc) {
      npcs.set(id, { ...npc, behavior });
      set({ npcs });
    }
  },

  damageNPC: (id, damage) => {
    const npc = get().npcs.get(id);
    if (!npc || npc.state === 'dead') return;

    const newHealth = Math.max(0, npc.health - damage);
    const isDead = newHealth <= 0;

    const npcs = new Map(get().npcs);
    npcs.set(id, {
      ...npc,
      health: newHealth,
      state: isDead ? 'dead' : npc.state,
      behavior: isDead ? 'idle' : npc.behavior,
      deathTime: isDead ? Date.now() : npc.deathTime,
    });
    set({ npcs });

    // Schedule respawn if configured (keyed to cancel if NPC is removed)
    if (isDead && npc.respawnTime && npc.respawnTime > 0) {
      npcTimers.setTimeout(`respawn-${id}`, () => {
        get().respawnNPC(id);
      }, npc.respawnTime);
    }
  },

  respawnNPC: (id) => {
    const npcs = new Map(get().npcs);
    const npc = npcs.get(id);
    if (!npc) return;

    npcs.set(id, {
      ...npc,
      health: npc.maxHealth,
      state: 'idle',
      behavior: npc.behavior === 'idle' ? 'wander' : npc.behavior,
      position: npc.spawnPosition || npc.position,
      deathTime: undefined,
    });
    set({ npcs });
  },

  // Interaction
  setSelectedNPC: (id) => set({ selectedNPC: id }),

  startDialogue: (npcId) => {
    const npc = get().npcs.get(npcId);
    if (npc?.dialogueId && npc.isInteractable) {
      set({ activeDialogue: npc.dialogueId, selectedNPC: npcId });
    }
  },

  endDialogue: () => set({ activeDialogue: null }),

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
}));

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

// ============================================================
// Selectors - Use these to prevent unnecessary re-renders
// ============================================================

/** Get all NPC IDs (for iteration without subscribing to full map) */
export const useNPCIds = () => useNPCStore((s) => Array.from(s.npcs.keys()));

/** Get the currently selected NPC ID */
export const useSelectedNPCId = () => useNPCStore((s) => s.selectedNPC);

/** Get the active dialogue ID */
export const useActiveDialogue = () => useNPCStore((s) => s.activeDialogue);

/** Get a specific NPC by ID (use in components that only care about one NPC) */
export const useNPCById = (id: string) => useNPCStore((s) => s.npcs.get(id));

/** Get count of NPCs */
export const useNPCCount = () => useNPCStore((s) => s.npcs.size);

/** Get count of hostile NPCs that are alive */
export const useAliveHostileCount = () => useNPCStore((s) => {
  let count = 0;
  s.npcs.forEach((npc) => {
    if (npc.type === 'hostile' && npc.state !== 'dead') count++;
  });
  return count;
});
