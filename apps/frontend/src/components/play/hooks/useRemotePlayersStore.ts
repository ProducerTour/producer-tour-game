/**
 * Remote Players Store
 *
 * Singleton store for remote player data that avatar components read from
 * directly in useFrame without causing React re-renders.
 *
 * usePlayMultiplayer writes position/animation updates here.
 * OtherPlayer components read directly in useFrame.
 *
 * React re-renders only happen on player join/leave (structural changes).
 */

import type { CharacterConfig } from '../../../lib/character/types';

export interface RemotePlayerData {
  id: string;
  username: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  color: string;
  avatarUrl?: string;
  avatarConfig?: CharacterConfig;
  animationState?: string;
  weaponType?: 'none' | 'rifle' | 'pistol';
  lastUpdate: number;
}

type StructuralChangeListener = (playerIds: string[]) => void;

/**
 * Singleton store for remote player data.
 * Position/animation updates are written here and read in useFrame.
 * Only join/leave events trigger React re-renders.
 */
class RemotePlayersStore {
  private players: Map<string, RemotePlayerData> = new Map();
  private structuralListeners: Set<StructuralChangeListener> = new Set();
  private version = 0;

  /**
   * Get player data by ID (for useFrame reads).
   */
  getPlayer(id: string): RemotePlayerData | undefined {
    return this.players.get(id);
  }

  /**
   * Get all player IDs (for component rendering).
   */
  getPlayerIds(): string[] {
    return Array.from(this.players.keys());
  }

  /**
   * Get all players (for initial render).
   */
  getAllPlayers(): RemotePlayerData[] {
    return Array.from(this.players.values());
  }

  /**
   * Get version number for change detection.
   */
  getVersion(): number {
    return this.version;
  }

  /**
   * Set all players (used when receiving initial player list).
   */
  setPlayers(players: RemotePlayerData[]): void {
    this.players.clear();
    players.forEach((p) => this.players.set(p.id, p));
    this.version++;
    this.notifyStructuralChange();
  }

  /**
   * Add a new player (triggers React re-render).
   */
  addPlayer(player: RemotePlayerData): void {
    if (!this.players.has(player.id)) {
      this.players.set(player.id, player);
      this.version++;
      this.notifyStructuralChange();
    }
  }

  /**
   * Remove a player (triggers React re-render).
   */
  removePlayer(id: string): void {
    if (this.players.delete(id)) {
      this.version++;
      this.notifyStructuralChange();
    }
  }

  /**
   * Update player position (NO React re-render).
   * Components read this directly in useFrame.
   */
  updatePosition(
    id: string,
    position: { x: number; y: number; z: number },
    rotation: { x: number; y: number; z: number }
  ): void {
    const player = this.players.get(id);
    if (player) {
      player.position = position;
      player.rotation = rotation;
      player.lastUpdate = Date.now();
      // No version increment - no React notification for position
    }
  }

  /**
   * Update player animation/weapon state (NO React re-render).
   */
  updateState(
    id: string,
    animationState?: string,
    weaponType?: 'none' | 'rifle' | 'pistol'
  ): void {
    const player = this.players.get(id);
    if (player) {
      if (animationState !== undefined) player.animationState = animationState;
      if (weaponType !== undefined) player.weaponType = weaponType;
      player.lastUpdate = Date.now();
      // No version increment - no React notification for state
    }
  }

  /**
   * Update player metadata (username, color, etc).
   * Could trigger re-render if needed for display.
   */
  updateMetadata(
    id: string,
    data: {
      username?: string;
      color?: string;
      avatarUrl?: string;
      avatarConfig?: CharacterConfig;
    }
  ): void {
    const player = this.players.get(id);
    if (player) {
      if (data.username) player.username = data.username;
      if (data.color) player.color = data.color;
      if (data.avatarUrl) player.avatarUrl = data.avatarUrl;
      if (data.avatarConfig) player.avatarConfig = data.avatarConfig;
      // Could notify if metadata display needs update
    }
  }

  /**
   * Clear all players (on disconnect).
   */
  clear(): void {
    if (this.players.size > 0) {
      this.players.clear();
      this.version++;
      this.notifyStructuralChange();
    }
  }

  /**
   * Subscribe to structural changes (join/leave).
   * Used by usePlayMultiplayer to trigger React state updates.
   */
  subscribeStructural(listener: StructuralChangeListener): () => void {
    this.structuralListeners.add(listener);
    return () => this.structuralListeners.delete(listener);
  }

  private notifyStructuralChange(): void {
    const ids = this.getPlayerIds();
    this.structuralListeners.forEach((listener) => listener(ids));
  }
}

// Singleton instance
export const remotePlayersStore = new RemotePlayersStore();

// Convenience exports
export const getRemotePlayer = (id: string) => remotePlayersStore.getPlayer(id);
export const getRemotePlayerIds = () => remotePlayersStore.getPlayerIds();
export const getAllRemotePlayers = () => remotePlayersStore.getAllPlayers();
