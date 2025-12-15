/**
 * NPC Manager Component
 * Renders and manages all NPCs in the scene
 * Supports both local AI and server-controlled NPCs for multiplayer sync
 */

import { useEffect } from 'react';
import { useNPCStore, type NPCData } from './useNPCStore';
import { NPC } from './NPC';
import { useNPCSync } from './useNPCSync';

interface NPCManagerProps {
  playerPosition?: { x: number; y: number; z: number };
  onNPCInteract?: (npc: NPCData) => void;
  /** Initial NPCs to spawn (only used when not multiplayer) */
  initialNPCs?: NPCData[];
  /** Render distance - NPCs beyond this won't be rendered */
  renderDistance?: number;
  /** Enable multiplayer NPC sync - NPCs will be controlled by server */
  multiplayerEnabled?: boolean;
}

export function NPCManager({
  playerPosition,
  onNPCInteract,
  initialNPCs,
  renderDistance = 50,
  multiplayerEnabled = false,
}: NPCManagerProps) {
  const { npcs, addNPCs } = useNPCStore();

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
  }, [multiplayerEnabled]); // Re-run if multiplayer mode changes

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
          serverControlled={multiplayerEnabled || isServerControlled}
        />
      ))}
    </group>
  );
}

export default NPCManager;
