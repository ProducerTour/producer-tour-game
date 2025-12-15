/**
 * NPC System Exports
 */

export { useNPCStore, createNPC, createPatrolNPC, generateNPCId } from './useNPCStore';
export type { NPCData, NPCBehavior, NPCState, PatrolPoint } from './useNPCStore';

export { NPC } from './NPC';
export { NPCManager } from './NPCManager';
export { useNPCSync } from './useNPCSync';
