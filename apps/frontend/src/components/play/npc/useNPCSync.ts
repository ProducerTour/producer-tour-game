/**
 * NPC Sync Hook
 * Syncs NPCs with server for multiplayer - server-authoritative NPC positions
 */

import { useEffect, useRef, useCallback } from 'react';
import { useSocket } from '../../../hooks/useSocket';
import { useNPCStore, type NPCData } from './useNPCStore';

interface ServerNPCData {
  id: string;
  name: string;
  type: 'friendly' | 'neutral' | 'hostile';
  position: { x: number; y: number; z: number };
  rotation: number;
  state: 'idle' | 'walking' | 'running';
  color: string;
  scale: number;
}

interface UseNPCSyncProps {
  enabled?: boolean;
}

interface UseNPCSyncReturn {
  isServerControlled: boolean;
  syncedNPCIds: Set<string>;
}

export function useNPCSync({ enabled = true }: UseNPCSyncProps = {}): UseNPCSyncReturn {
  const { socket, isConnected } = useSocket();
  // Use individual selectors to prevent re-renders on unrelated store changes
  const addNPC = useNPCStore((s) => s.addNPC);
  const updateNPC = useNPCStore((s) => s.updateNPC);
  const getNPC = useNPCStore((s) => s.getNPC);
  const clearAllNPCs = useNPCStore((s) => s.clearAllNPCs);
  const syncedNPCIds = useRef<Set<string>>(new Set());
  const isServerControlled = useRef(false);

  // Convert server NPC data to local NPCData format
  const serverToLocalNPC = useCallback((serverNPC: ServerNPCData): NPCData => {
    return {
      id: serverNPC.id,
      name: serverNPC.name,
      type: serverNPC.type,
      position: serverNPC.position,
      rotation: serverNPC.rotation,
      behavior: 'idle', // Server controls movement, we just display
      state: serverNPC.state,
      health: 100,
      maxHealth: 100,
      isInteractable: serverNPC.type === 'friendly',
      interactionRange: 3,
      color: serverNPC.color,
      scale: serverNPC.scale,
      // Mark as server-controlled so local AI doesn't run
      dialogueId: undefined,
    };
  }, []);

  // Handle initial NPC list from server
  const handleNPCInit = useCallback((npcs: ServerNPCData[]) => {
    console.log('🤖 Received initial NPCs from server:', npcs.length);
    isServerControlled.current = true;
    syncedNPCIds.current.clear();

    // Clear any existing NPCs and add server-controlled ones
    clearAllNPCs();

    npcs.forEach(serverNPC => {
      const localNPC = serverToLocalNPC(serverNPC);
      addNPC(localNPC);
      syncedNPCIds.current.add(serverNPC.id);
    });
  }, [addNPC, clearAllNPCs, serverToLocalNPC]);

  // Handle NPC updates from server
  const handleNPCUpdate = useCallback((npcs: ServerNPCData[]) => {
    if (!isServerControlled.current) return;

    npcs.forEach(serverNPC => {
      const existingNPC = getNPC(serverNPC.id);

      if (existingNPC) {
        // Update existing NPC
        updateNPC(serverNPC.id, {
          position: serverNPC.position,
          rotation: serverNPC.rotation,
          state: serverNPC.state,
        });
      } else {
        // New NPC appeared - add it
        const localNPC = serverToLocalNPC(serverNPC);
        addNPC(localNPC);
        syncedNPCIds.current.add(serverNPC.id);
      }
    });
  }, [addNPC, getNPC, updateNPC, serverToLocalNPC]);

  useEffect(() => {
    if (!enabled || !socket || !isConnected) return;

    // Listen for NPC events
    socket.on('npc:init', handleNPCInit);
    socket.on('npc:update', handleNPCUpdate);

    console.log('🤖 NPC sync enabled - listening for server updates');

    return () => {
      socket.off('npc:init', handleNPCInit);
      socket.off('npc:update', handleNPCUpdate);
      isServerControlled.current = false;
      syncedNPCIds.current.clear();
      console.log('🤖 NPC sync disabled');
    };
  }, [enabled, socket, isConnected, handleNPCInit, handleNPCUpdate]);

  return {
    isServerControlled: isServerControlled.current,
    syncedNPCIds: syncedNPCIds.current,
  };
}

export default useNPCSync;
