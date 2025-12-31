import { useEffect, useRef, useState, useCallback } from 'react';
import { useSocket } from '../../../hooks/useSocket';
import { useAuthStore } from '../../../store/auth.store';
import { usePlayerStore } from '../../../store/player.store';
import * as THREE from 'three';
import type { CharacterConfig } from '../../../lib/character/types';
// Binary protocol for efficient network packets
import { encodeMovement } from '@producer-tour/engine';
// Singleton store for remote players (avoids React re-renders for position updates)
import { remotePlayersStore, type RemotePlayerData } from './useRemotePlayersStore';

// Debug logging - set to false to reduce console spam
const DEBUG_MULTIPLAYER = false;

// Use binary protocol for movement updates (4-6x bandwidth reduction)
const USE_BINARY_PROTOCOL = true;

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
  connectionError: string | null;
  username: string;
  setUsername: (name: string) => void;
  updatePosition: (position: THREE.Vector3, rotation: THREE.Euler, animationState?: string, weaponType?: 'none' | 'rifle' | 'pistol') => void;
}

// Server acknowledgment response type
interface ServerAck {
  success: boolean;
  error?: string;
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
  const [isJoining, setIsJoining] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [username, setLocalUsername] = useState(() => displayName || user?.firstName || '');

  // Debug: Log auth state (only when values change, not every render)
  // Uncomment for debugging: useEffect(() => { console.log('[Play Multiplayer] Auth state:', { hasUser: !!user, hasToken: !!token, socketExists: !!socket, isConnected }); }, [user, token, socket, isConnected]);

  const lastPositionUpdate = useRef(0);
  const positionUpdateInterval = 50; // 20 updates per second

  // Track last sent animation state to only send on change
  const lastAnimationState = useRef<string | undefined>(undefined);
  const lastWeaponType = useRef<'none' | 'rifle' | 'pistol' | undefined>(undefined);

  // Subscribe to structural changes (join/leave) in the store
  // This triggers React re-renders ONLY when player list structure changes
  useEffect(() => {
    const unsubscribe = remotePlayersStore.subscribeStructural(() => {
      // Get fresh player list from store
      setOtherPlayers(remotePlayersStore.getAllPlayers());
    });
    return unsubscribe;
  }, []);

  // Join/leave room based on enabled state
  useEffect(() => {
    if (!socket || !isConnected) {
      // Reset state when disconnected
      if (isInRoom) {
        setIsInRoom(false);
        setOtherPlayers([]);
        remotePlayersStore.clear();
      }
      return;
    }

    if (enabled && !isInRoom && !isJoining) {
      // Join play room with acknowledgment callback
      const pilotName = username || `Player_${Math.random().toString(36).slice(2, 6)}`;
      if (DEBUG_MULTIPLAYER) console.log('[Play Multiplayer] Joining play room as:', pilotName);

      setIsJoining(true);
      setConnectionError(null);

      // Use timeout to handle servers that don't support acknowledgments
      const joinTimeout = setTimeout(() => {
        // If no ack received within 5s, assume success (legacy server compatibility)
        if (DEBUG_MULTIPLAYER) console.log('[Play Multiplayer] Join timeout - assuming success (legacy server)');
        setIsJoining(false);
        setIsInRoom(true);
      }, 5000);

      socket.emit('3d:join', {
        username: pilotName,
        color,
        room: 'play',
        avatarUrl,
        // Send avatarConfig for custom avatar rendering
        ...(avatarConfig && { avatarConfig }),
      }, (ack: ServerAck | undefined) => {
        clearTimeout(joinTimeout);
        setIsJoining(false);

        // Handle acknowledgment if server supports it
        if (ack === undefined) {
          // Server doesn't support ack, assume success
          setIsInRoom(true);
        } else if (ack.success) {
          if (DEBUG_MULTIPLAYER) console.log('[Play Multiplayer] Successfully joined room');
          setIsInRoom(true);
        } else {
          console.error('[Play Multiplayer] Failed to join room:', ack.error);
          setConnectionError(ack.error || 'Failed to join room');
        }
      });
    } else if (!enabled && isInRoom) {
      // Leave play room
      if (DEBUG_MULTIPLAYER) console.log('[Play Multiplayer] Leaving play room');
      socket.emit('3d:leave');
      setIsInRoom(false);
      setOtherPlayers([]);
      remotePlayersStore.clear();
      setConnectionError(null);
    }
  }, [enabled, socket, isConnected, isInRoom, isJoining, username, color, avatarUrl, avatarConfig]);

  // Set up socket event listeners
  useEffect(() => {
    if (!socket || !isConnected) return;

    // Handle connection errors
    const handleConnectError = (error: Error) => {
      console.error('[Play Multiplayer] Connection error:', error.message);
      setConnectionError(`Connection error: ${error.message}`);
      setIsInRoom(false);
      setIsJoining(false);
    };

    // Handle disconnection
    const handleDisconnect = (reason: string) => {
      if (DEBUG_MULTIPLAYER) console.log('[Play Multiplayer] Disconnected:', reason);
      setIsInRoom(false);
      setIsJoining(false);
      setOtherPlayers([]);
      if (reason === 'io server disconnect' || reason === 'transport close') {
        setConnectionError(`Disconnected: ${reason}`);
      }
    };

    // Handle reconnection
    const handleConnect = () => {
      if (DEBUG_MULTIPLAYER) console.log('[Play Multiplayer] Reconnected');
      setConnectionError(null);
    };

    // Handle server errors
    const handleError = (error: { message?: string }) => {
      console.error('[Play Multiplayer] Server error:', error);
      setConnectionError(error.message || 'Server error');
    };

    // Receive initial player list when joining
    // Uses singleton store - triggers React update via subscription
    const handlePlayers = (players: RemotePlayerData[]) => {
      if (DEBUG_MULTIPLAYER) console.log('[Play Multiplayer] Received players list:', players.length);
      remotePlayersStore.setPlayers(players);
    };

    // New player joined - triggers React update via subscription
    const handlePlayerJoined = (player: RemotePlayerData) => {
      if (DEBUG_MULTIPLAYER) console.log('[Play Multiplayer] Player joined:', player.username);
      remotePlayersStore.addPlayer(player);
    };

    // Player left - triggers React update via subscription
    const handlePlayerLeft = ({ id }: { id: string }) => {
      if (DEBUG_MULTIPLAYER) console.log('[Play Multiplayer] Player left:', id);
      remotePlayersStore.removePlayer(id);
    };

    // Player moved (high frequency - NO React re-render!)
    // Updates store directly, OtherPlayer reads in useFrame
    const handlePlayerMoved = (data: {
      id: string;
      position: { x: number; y: number; z: number };
      rotation: { x: number; y: number; z: number };
      animationState?: string;
      weaponType?: 'none' | 'rifle' | 'pistol';
    }) => {
      remotePlayersStore.updatePosition(data.id, data.position, data.rotation);
      if (data.animationState || data.weaponType !== undefined) {
        remotePlayersStore.updateState(data.id, data.animationState, data.weaponType);
      }
    };

    // Binary player moved (60 bytes: 36 byte ID + 24 byte movement)
    // 4-6x more efficient than JSON, NO React re-render!
    const handlePlayerMovedBin = (data: ArrayBuffer | Buffer) => {
      try {
        const buffer = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
        const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);

        // Decode player ID (36 chars)
        let playerId = '';
        for (let i = 0; i < 36; i++) {
          const char = view.getUint8(i);
          if (char === 0) break;
          playerId += String.fromCharCode(char);
        }

        // Decode movement data
        const posX = view.getFloat32(36, true);
        const posY = view.getFloat32(40, true);
        const posZ = view.getFloat32(44, true);
        const rotY = view.getFloat32(48, true);
        // velX and velZ at 52 and 56 (for future use with interpolation)

        // Update store directly - no React re-render!
        remotePlayersStore.updatePosition(
          playerId,
          { x: posX, y: posY, z: posZ },
          { x: 0, y: rotY, z: 0 }
        );
      } catch (err) {
        console.error('[Play Multiplayer] Binary decode error:', err);
      }
    };

    // Player updated (username, avatar, etc)
    const handlePlayerUpdated = (data: {
      id: string;
      username?: string;
      color?: string;
      avatarUrl?: string;
      avatarConfig?: CharacterConfig;
    }) => {
      remotePlayersStore.updateMetadata(data.id, data);
    };

    // Player animation/weapon state changed (NO React re-render)
    const handlePlayerState = (data: {
      id: string;
      animationState?: string;
      weaponType?: 'none' | 'rifle' | 'pistol';
    }) => {
      remotePlayersStore.updateState(data.id, data.animationState, data.weaponType);
    };

    // Player count update
    const handlePlayerCount = (count: number) => {
      if (DEBUG_MULTIPLAYER) console.log('[Play Multiplayer] Player count:', count);
      setPlayerCount(count);
    };

    // Connection event listeners
    socket.on('connect', handleConnect);
    socket.on('connect_error', handleConnectError);
    socket.on('disconnect', handleDisconnect);
    socket.on('error', handleError);

    // Game event listeners
    socket.on('3d:players', handlePlayers);
    socket.on('3d:player-joined', handlePlayerJoined);
    socket.on('3d:player-left', handlePlayerLeft);
    socket.on('3d:player-moved', handlePlayerMoved);
    socket.on('3d:player-moved-bin', handlePlayerMovedBin); // Binary protocol
    socket.on('3d:player-state', handlePlayerState); // Animation/weapon state (separate from position)
    socket.on('3d:player-updated', handlePlayerUpdated);
    socket.on('3d:player-count', handlePlayerCount);

    return () => {
      // Connection event cleanup
      socket.off('connect', handleConnect);
      socket.off('connect_error', handleConnectError);
      socket.off('disconnect', handleDisconnect);
      socket.off('error', handleError);

      // Game event cleanup
      socket.off('3d:players', handlePlayers);
      socket.off('3d:player-joined', handlePlayerJoined);
      socket.off('3d:player-left', handlePlayerLeft);
      socket.off('3d:player-moved', handlePlayerMoved);
      socket.off('3d:player-moved-bin', handlePlayerMovedBin);
      socket.off('3d:player-state', handlePlayerState);
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
      remotePlayersStore.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update position (throttled)
  // Uses binary protocol when enabled (4-6x bandwidth reduction)
  // Animation state is sent separately only when it changes
  const updatePosition = useCallback(
    (position: THREE.Vector3, rotation: THREE.Euler, animationState?: string, weaponType?: 'none' | 'rifle' | 'pistol') => {
      if (!socket || !isInRoom) return;

      const now = Date.now();
      const shouldThrottle = now - lastPositionUpdate.current < positionUpdateInterval;

      // Always check for animation/weapon state changes (send separately from position)
      const animChanged = animationState !== lastAnimationState.current;
      const weaponChanged = weaponType !== undefined && weaponType !== lastWeaponType.current;

      if (animChanged || weaponChanged) {
        // Send animation/weapon update separately (infrequent, JSON is fine)
        socket.emit('3d:update-state', {
          ...(animChanged && { animationState }),
          ...(weaponChanged && { weaponType }),
        });
        if (animChanged) lastAnimationState.current = animationState;
        if (weaponChanged) lastWeaponType.current = weaponType;
      }

      // Throttle position updates
      if (shouldThrottle) return;

      if (USE_BINARY_PROTOCOL) {
        // Binary: 24 bytes vs ~120-140 bytes JSON
        const buffer = encodeMovement(
          position.x,
          position.y,
          position.z,
          rotation.y, // Only Y rotation for characters
          0, // velX (can be added later for prediction)
          0  // velZ
        );
        socket.emit('3d:update-bin', buffer);
      } else {
        // JSON fallback
        socket.emit('3d:update', {
          position: { x: position.x, y: position.y, z: position.z },
          rotation: { x: rotation.x, y: rotation.y, z: rotation.z },
          ...(animationState && { animationState }),
          ...(weaponType !== undefined && { weaponType }),
        });
      }

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
    connectionError,
    username,
    setUsername,
    updatePosition,
  };
}
