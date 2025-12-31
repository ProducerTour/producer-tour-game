/**
 * NPC Manager Component
 * Renders and manages all NPCs in the scene
 * Supports both local AI and server-controlled NPCs for multiplayer sync
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { useNPCStore, type NPCData } from './useNPCStore';
import { NPC } from './NPC';
import { useNPCSync } from './useNPCSync';
import type { BiomeType } from '../../../lib/terrain/BiomeLookupTable';

// Visibility check interval (ms) - throttle to avoid per-frame recalculation
const VISIBILITY_CHECK_INTERVAL = 100;

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

  // Throttled visibility check - only recalculate every 100ms instead of every frame
  const [visibleNPCs, setVisibleNPCs] = useState<NPCData[]>([]);
  const lastCheckRef = useRef(0);
  const visibleIdsRef = useRef<Set<string>>(new Set());
  const playerPosRef = useRef(playerPosition);

  // Keep player position ref updated (no re-render)
  playerPosRef.current = playerPosition;

  // Compute visible NPCs - extracted for reuse
  const computeVisibleNPCs = useCallback(() => {
    const pos = playerPosRef.current;
    const renderDistSq = renderDistance * renderDistance;
    const newVisibleIds = new Set<string>();
    const result: NPCData[] = [];

    npcs.forEach((npc) => {
      if (!pos) {
        newVisibleIds.add(npc.id);
        result.push(npc);
        return;
      }

      const dx = npc.position.x - pos.x;
      const dz = npc.position.z - pos.z;
      const distSq = dx * dx + dz * dz;

      if (distSq <= renderDistSq) {
        newVisibleIds.add(npc.id);
        result.push(npc);
      }
    });

    // Only update state if visibility actually changed
    const oldIds = visibleIdsRef.current;
    const changed =
      newVisibleIds.size !== oldIds.size ||
      [...newVisibleIds].some((id) => !oldIds.has(id));

    if (changed) {
      visibleIdsRef.current = newVisibleIds;
      setVisibleNPCs(result);
    }
  }, [npcs, renderDistance]);

  // Initial computation and when NPCs change
  useEffect(() => {
    computeVisibleNPCs();
  }, [computeVisibleNPCs]);

  // Throttled visibility check in frame loop
  useFrame(() => {
    const now = performance.now();
    if (now - lastCheckRef.current < VISIBILITY_CHECK_INTERVAL) return;
    lastCheckRef.current = now;

    computeVisibleNPCs();
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
