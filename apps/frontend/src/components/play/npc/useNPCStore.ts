/**
 * NPC Store
 * Zustand store for NPC state management
 */

import { create } from 'zustand';

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

  // Patrol config
  patrolPoints?: PatrolPoint[];
  currentPatrolIndex?: number;

  // Interaction
  dialogueId?: string;
  isInteractable: boolean;
  interactionRange: number;

  // Visual
  avatarUrl?: string;
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

  clearAllNPCs: () => set({ npcs: new Map(), selectedNPC: null, activeDialogue: null }),

  // State changes
  setNPCPosition: (id, position) => {
    const npcs = new Map(get().npcs);
    const npc = npcs.get(id);
    if (npc) {
      npcs.set(id, { ...npc, position });
      set({ npcs });
    }
  },

  setNPCState: (id, state) => {
    const npcs = new Map(get().npcs);
    const npc = npcs.get(id);
    if (npc) {
      npcs.set(id, { ...npc, state });
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
    const npcs = new Map(get().npcs);
    const npc = npcs.get(id);
    if (npc) {
      const newHealth = Math.max(0, npc.health - damage);
      npcs.set(id, {
        ...npc,
        health: newHealth,
        state: newHealth <= 0 ? 'dead' : npc.state,
        behavior: newHealth <= 0 ? 'idle' : npc.behavior,
      });
      set({ npcs });
    }
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

  // Queries
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
    patrolPoints: options.patrolPoints,
    currentPatrolIndex: 0,
    dialogueId: options.dialogueId,
    isInteractable: options.isInteractable ?? true,
    interactionRange: options.interactionRange ?? 3,
    avatarUrl: options.avatarUrl,
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
