/**
 * Server Store - Manages game server selection and browsing
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../lib/api';

export interface GameServer {
  id: string;
  name: string;
  host: string;
  port: number;
  region: string;
  gameMode: string;
  maxPlayers: number;
  playerCount: number;
  status: 'online' | 'offline' | 'maintenance';
  lastHeartbeat: string | null;
  ping?: number; // Calculated client-side
}

interface ServerState {
  /** List of available servers */
  servers: GameServer[];

  /** Currently selected server */
  selectedServer: GameServer | null;

  /** Favorite server IDs (persisted) */
  favorites: string[];

  /** Loading state */
  isLoading: boolean;

  /** Error message */
  error: string | null;

  /** Server browser modal open state */
  isOpen: boolean;

  /** Fetch server list from API */
  fetchServers: () => Promise<void>;

  /** Select a server */
  selectServer: (server: GameServer) => void;

  /** Toggle favorite status for a server */
  toggleFavorite: (serverId: string) => void;

  /** Check if a server is favorited */
  isFavorite: (serverId: string) => boolean;

  /** Open server browser modal */
  open: () => void;

  /** Close server browser modal */
  close: () => void;

  /** Update ping for a server */
  updatePing: (serverId: string, ping: number) => void;

  /** Get the best server by ping */
  getBestServer: () => GameServer | null;

  /** Clear selected server */
  clearSelection: () => void;
}

// Local storage key for persisted state
const STORAGE_KEY = 'producer-tour-server-prefs';

export const useServerStore = create<ServerState>()(
  persist(
    (set, get) => ({
      servers: [],
      selectedServer: null,
      favorites: [],
      isLoading: false,
      error: null,
      isOpen: false,

      fetchServers: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.get<{ servers: GameServer[] }>('/servers');
          set({ servers: response.data.servers, isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch servers',
            isLoading: false,
          });
        }
      },

      selectServer: (server) => {
        set({ selectedServer: server });
        // Store in localStorage for reconnection
        localStorage.setItem('selected-server', JSON.stringify({
          host: server.host,
          port: server.port,
          id: server.id,
        }));
      },

      toggleFavorite: (serverId) => {
        const { favorites } = get();
        if (favorites.includes(serverId)) {
          set({ favorites: favorites.filter((id) => id !== serverId) });
        } else {
          set({ favorites: [...favorites, serverId] });
        }
      },

      isFavorite: (serverId) => {
        return get().favorites.includes(serverId);
      },

      open: () => set({ isOpen: true }),

      close: () => set({ isOpen: false }),

      updatePing: (serverId, ping) => {
        const { servers } = get();
        set({
          servers: servers.map((s) =>
            s.id === serverId ? { ...s, ping } : s
          ),
        });
      },

      getBestServer: () => {
        const { servers } = get();
        const onlineServers = servers.filter((s) => s.status === 'online');
        if (onlineServers.length === 0) return null;

        // Sort by ping (if available) then by player count
        const sorted = [...onlineServers].sort((a, b) => {
          // Prefer servers with ping data
          if (a.ping !== undefined && b.ping !== undefined) {
            return a.ping - b.ping;
          }
          if (a.ping !== undefined) return -1;
          if (b.ping !== undefined) return 1;
          // Fallback to player count (prefer less crowded)
          return a.playerCount - b.playerCount;
        });

        return sorted[0];
      },

      clearSelection: () => {
        set({ selectedServer: null });
        localStorage.removeItem('selected-server');
      },
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({
        favorites: state.favorites,
        // Don't persist servers list or selectedServer
      }),
    }
  )
);

/**
 * Measure ping to a server using WebSocket handshake timing
 */
export async function measurePing(host: string, port: number): Promise<number> {
  return new Promise((resolve) => {
    const startTime = performance.now();
    const ws = new WebSocket(`wss://${host}:${port}/socket.io/?transport=websocket`);

    const timeout = setTimeout(() => {
      ws.close();
      resolve(999); // Timeout = high ping
    }, 5000);

    ws.onopen = () => {
      const ping = Math.round(performance.now() - startTime);
      clearTimeout(timeout);
      ws.close();
      resolve(ping);
    };

    ws.onerror = () => {
      clearTimeout(timeout);
      resolve(999); // Error = high ping
    };
  });
}

/**
 * Get saved server from localStorage
 */
export function getSavedServer(): { host: string; port: number; id: string } | null {
  try {
    const saved = localStorage.getItem('selected-server');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {
    // Invalid JSON, ignore
  }
  return null;
}

export default useServerStore;
