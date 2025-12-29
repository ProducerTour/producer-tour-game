/**
 * NPC Manager Component
 * Renders and manages all NPCs in the scene
 * Supports both local AI and server-controlled NPCs for multiplayer sync
 */

import { useEffect } from 'react';
import { useNPCStore, type NPCData } from './useNPCStore';
import { NPC } from './NPC';
import { useNPCSync } from './useNPCSync';
import type { BiomeType } from '../../../lib/terrain/BiomeLookupTable';

interface NPCManagerProps {
  playerPosition?: { x: number; y: number; z: number };
  onNPCInteract?: (npc: NPCData) => void;
  /** Initial NPCs to spawn (only used when not multiplayer) */
  initialNPCs?: NPCData[];
  /** Render distance - NPCs beyond this won't be rendered */
  renderDistance?: number;
  /** Enable multiplayer NPC sync - NPCs will be controlled by server */
  multiplayerEnabled?: boolean;
  /** Function to get terrain height at x,z position */
  getTerrainHeight?: (x: number, z: number) => number;
  /** Function to get biome at x,z position - for NPC pathfinding */
  getBiome?: (x: number, z: number) => BiomeType;
}

export function NPCManager({
  playerPosition,
  onNPCInteract,
  initialNPCs,
  renderDistance = 50,
  multiplayerEnabled = false,
  getTerrainHeight,
  getBiome,
}: NPCManagerProps) {
  // Use individual selectors to prevent re-renders on unrelated store changes
  const npcs = useNPCStore((s) => s.npcs);
  const addNPCs = useNPCStore((s) => s.addNPCs);

  // Sync NPCs with server when multiplayer is enabled
  const { isServerControlled } = useNPCSync({ enabled: multiplayerEnabled });

  // Spawn initial NPCs only if not using multiplayer sync
  useEffect(() => {
    // Don't spawn local NPCs if multiplayer is enabled - server will send them
    if (multiplayerEnabled) return;

    if (initialNPCs && initialNPCs.length > 0) {
      addNPCs(initialNPCs);
    }

    return () => {
      // Optionally clear NPCs on unmount
      // clearAllNPCs();
    };
  }, [multiplayerEnabled, initialNPCs, addNPCs]); // Re-run when NPCs change

  // Filter NPCs by render distance (squared distance check for performance)
  const visibleNPCs: NPCData[] = [];
  npcs.forEach((npc) => {
    if (!playerPosition) {
      visibleNPCs.push(npc);
      return;
    }

    const dx = npc.position.x - playerPosition.x;
    const dz = npc.position.z - playerPosition.z;
    const distSq = dx * dx + dz * dz;

    if (distSq <= renderDistance * renderDistance) {
      visibleNPCs.push(npc);
    }
  });


  return (
    <group name="NPCManager">
      {visibleNPCs.map((npc) => (
        <NPC
          key={npc.id}
          data={npc}
          playerPosition={playerPosition}
          onInteract={onNPCInteract}
          serverControlled={multiplayerEnabled || isServerControlled}
          getTerrainHeight={getTerrainHeight}
          getBiome={getBiome}
        />
      ))}
    </group>
  );
}

export default NPCManager;
