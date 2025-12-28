import { useEffect, useRef, useState, useCallback } from 'react';
import { useSocket } from '../../../hooks/useSocket';
import { useAuthStore } from '../../../store/auth.store';
import { usePlayerStore } from '../../../store/player.store';
import * as THREE from 'three';
import type { CharacterConfig } from '../../../lib/character/types';

// Debug logging - set to false to reduce console spam
const DEBUG_MULTIPLAYER = false;

export interface Player3D {
  id: string;
  username: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  color: string;
  avatarUrl?: string;
  avatarConfig?: CharacterConfig; // Custom avatar configuration
  animationState?: string; // Current animation name (idle, walking, running, etc.)
  weaponType?: 'none' | 'rifle' | 'pistol'; // Current equipped weapon
  lastUpdate: number;
}

interface UsePlayMultiplayerProps {
  enabled?: boolean;
  avatarUrl?: string;
  avatarConfig?: CharacterConfig; // Custom avatar config for local player
}

interface UsePlayMultiplayerReturn {
  otherPlayers: Player3D[];
  playerCount: number;
  isConnected: boolean;
  username: string;
  setUsername: (name: string) => void;
  updatePosition: (position: THREE.Vector3, rotation: THREE.Euler, animationState?: string, weaponType?: 'none' | 'rifle' | 'pistol') => void;
}

export function usePlayMultiplayer({
  enabled = true,
  avatarUrl,
  avatarConfig,
}: UsePlayMultiplayerProps = {}): UsePlayMultiplayerReturn {
  const { socket, isConnected } = useSocket();
  const { user } = useAuthStore();
  const { color, displayName } = usePlayerStore();

  const [otherPlayers, setOtherPlayers] = useState<Player3D[]>([]);
  const [playerCount, setPlayerCount] = useState(0);
  const [isInRoom, setIsInRoom] = useState(false);
  const [username, setLocalUsername] = useState(() => displayName || user?.firstName || '');

  // Debug: Log auth state (only when values change, not every render)
  // Uncomment for debugging: useEffect(() => { console.log('[Play Multiplayer] Auth state:', { hasUser: !!user, hasToken: !!token, socketExists: !!socket, isConnected }); }, [user, token, socket, isConnected]);

  const lastPositionUpdate = useRef(0);
  const positionUpdateInterval = 50; // 20 updates per second

  // Join/leave room based on enabled state
  useEffect(() => {
    if (!socket || !isConnected) return;

    if (enabled && !isInRoom) {
      // Join play room
      const pilotName = username || `Player_${Math.random().toString(36).slice(2, 6)}`;
      if (DEBUG_MULTIPLAYER) console.log('[Play Multiplayer] Joining play room as:', pilotName);
      socket.emit('3d:join', {
        username: pilotName,
        color,
        room: 'play',
        avatarUrl,
        // Send avatarConfig for custom avatar rendering
        ...(avatarConfig && { avatarConfig }),
      });
      setIsInRoom(true);
    } else if (!enabled && isInRoom) {
      // Leave play room
      if (DEBUG_MULTIPLAYER) console.log('[Play Multiplayer] Leaving play room');
      socket.emit('3d:leave');
      setIsInRoom(false);
      setOtherPlayers([]);
    }
  }, [enabled, socket, isConnected, isInRoom, username, color, avatarUrl, avatarConfig]);

  // Set up socket event listeners
  useEffect(() => {
    if (!socket || !isConnected) return;

    // Receive initial player list when joining
    const handlePlayers = (players: Player3D[]) => {
      if (DEBUG_MULTIPLAYER) console.log('[Play Multiplayer] Received players list:', players.length);
      setOtherPlayers(players);
    };

    // New player joined
    const handlePlayerJoined = (player: Player3D) => {
      if (DEBUG_MULTIPLAYER) console.log('[Play Multiplayer] Player joined:', player.username);
      setOtherPlayers((prev) => {
        // Avoid duplicates
        if (prev.find((p) => p.id === player.id)) {
          return prev;
        }
        return [...prev, player];
      });
    };

    // Player left
    const handlePlayerLeft = ({ id }: { id: string }) => {
      if (DEBUG_MULTIPLAYER) console.log('[Play Multiplayer] Player left:', id);
      setOtherPlayers((prev) => prev.filter((p) => p.id !== id));
    };

    // Player moved (high frequency - no logging)
    const handlePlayerMoved = (data: {
      id: string;
      position: { x: number; y: number; z: number };
      rotation: { x: number; y: number; z: number };
      animationState?: string;
      weaponType?: 'none' | 'rifle' | 'pistol';
    }) => {
      setOtherPlayers((prev) =>
        prev.map((p) =>
          p.id === data.id
            ? {
                ...p,
                position: data.position,
                rotation: data.rotation,
                ...(data.animationState && { animationState: data.animationState }),
                ...(data.weaponType !== undefined && { weaponType: data.weaponType }),
                lastUpdate: Date.now(),
              }
            : p
        )
      );
    };

    // Player updated (username, avatar, etc)
    const handlePlayerUpdated = (data: {
      id: string;
      username?: string;
      color?: string;
      avatarUrl?: string;
      avatarConfig?: CharacterConfig;
    }) => {
      setOtherPlayers((prev) =>
        prev.map((p) =>
          p.id === data.id
            ? {
                ...p,
                ...(data.username && { username: data.username }),
                ...(data.color && { color: data.color }),
                ...(data.avatarUrl && { avatarUrl: data.avatarUrl }),
                ...(data.avatarConfig && { avatarConfig: data.avatarConfig }),
              }
            : p
        )
      );
    };

    // Player count update
    const handlePlayerCount = (count: number) => {
      if (DEBUG_MULTIPLAYER) console.log('[Play Multiplayer] Player count:', count);
      setPlayerCount(count);
    };

    socket.on('3d:players', handlePlayers);
    socket.on('3d:player-joined', handlePlayerJoined);
    socket.on('3d:player-left', handlePlayerLeft);
    socket.on('3d:player-moved', handlePlayerMoved);
    socket.on('3d:player-updated', handlePlayerUpdated);
    socket.on('3d:player-count', handlePlayerCount);

    return () => {
      socket.off('3d:players', handlePlayers);
      socket.off('3d:player-joined', handlePlayerJoined);
      socket.off('3d:player-left', handlePlayerLeft);
      socket.off('3d:player-moved', handlePlayerMoved);
      socket.off('3d:player-updated', handlePlayerUpdated);
      socket.off('3d:player-count', handlePlayerCount);
    };
  }, [socket, isConnected]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (socket && isInRoom) {
        if (DEBUG_MULTIPLAYER) console.log('[Play Multiplayer] Cleanup: leaving room');
        socket.emit('3d:leave');
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update position (throttled)
  const updatePosition = useCallback(
    (position: THREE.Vector3, rotation: THREE.Euler, animationState?: string, weaponType?: 'none' | 'rifle' | 'pistol') => {
      if (!socket || !isInRoom) return;

      const now = Date.now();
      if (now - lastPositionUpdate.current < positionUpdateInterval) return;

      socket.emit('3d:update', {
        position: { x: position.x, y: position.y, z: position.z },
        rotation: { x: rotation.x, y: rotation.y, z: rotation.z },
        ...(animationState && { animationState }),
        ...(weaponType !== undefined && { weaponType }),
      });

      lastPositionUpdate.current = now;
    },
    [socket, isInRoom]
  );

  // Set username
  const setUsername = useCallback(
    (newUsername: string) => {
      setLocalUsername(newUsername);
      if (socket && isInRoom) {
        socket.emit('3d:set-username', { username: newUsername });
      }
    },
    [socket, isInRoom]
  );

  return {
    otherPlayers,
    playerCount,
    isConnected: isConnected && isInRoom,
    username,
    setUsername,
    updatePosition,
  };
}
