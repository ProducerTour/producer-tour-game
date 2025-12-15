/**
 * NPC Manager Component
 * Renders and manages all NPCs in the scene
 */

import { useEffect } from 'react';
import { useNPCStore, type NPCData } from './useNPCStore';
import { NPC } from './NPC';

interface NPCManagerProps {
  playerPosition?: { x: number; y: number; z: number };
  onNPCInteract?: (npc: NPCData) => void;
  /** Initial NPCs to spawn */
  initialNPCs?: NPCData[];
  /** Render distance - NPCs beyond this won't be rendered */
  renderDistance?: number;
}

export function NPCManager({
  playerPosition,
  onNPCInteract,
  initialNPCs,
  renderDistance = 50,
}: NPCManagerProps) {
  const { npcs, addNPCs } = useNPCStore();

  // Spawn initial NPCs
  useEffect(() => {
    if (initialNPCs && initialNPCs.length > 0) {
      addNPCs(initialNPCs);
    }

    return () => {
      // Optionally clear NPCs on unmount
      // clearAllNPCs();
    };
  }, []); // Only run once on mount

  // Filter NPCs by render distance
  const visibleNPCs: NPCData[] = [];
  npcs.forEach((npc) => {
    if (!playerPosition) {
      visibleNPCs.push(npc);
      return;
    }

    const dx = npc.position.x - playerPosition.x;
    const dz = npc.position.z - playerPosition.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    if (distance <= renderDistance) {
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
        />
      ))}
    </group>
  );
}

export default NPCManager;
