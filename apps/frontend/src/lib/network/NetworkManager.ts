// Network Manager - Client-side Colyseus connection manager
import { Client, Room } from 'colyseus.js';
import { create } from 'zustand';

// Server player state (from Colyseus schema)
export interface ServerPlayer {
  sessionId: string;
  name: string;
  avatarUrl: string;
  walletAddress: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number; w: number };
  velocity: { x: number; y: number; z: number };
  animation: string;
  health: number;
  level: number;
}

// Interpolated position snapshot
interface PositionSnapshot {
  position: [number, number, number];
  rotation: [number, number, number, number];
  velocity: [number, number, number];
  animation: string;
  timestamp: number;
}

// Chat message
export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  message: string;
  channel: string;
  timestamp?: number;
}

// Network store for reactive state
interface NetworkState {
  connected: boolean;
  connecting: boolean;
  sessionId: string | null;
  roomId: string | null;
  players: Map<string, ServerPlayer>;
  chatMessages: ChatMessage[];
  error: string | null;

  // Actions
  setConnected: (connected: boolean) => void;
  setConnecting: (connecting: boolean) => void;
  setSessionId: (sessionId: string | null) => void;
  setRoomId: (roomId: string | null) => void;
  addPlayer: (player: ServerPlayer) => void;
  updatePlayer: (sessionId: string, updates: Partial<ServerPlayer>) => void;
  removePlayer: (sessionId: string) => void;
  addChatMessage: (message: ChatMessage) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useNetworkStore = create<NetworkState>((set) => ({
  connected: false,
  connecting: false,
  sessionId: null,
  roomId: null,
  players: new Map(),
  chatMessages: [],
  error: null,

  setConnected: (connected) => set({ connected }),
  setConnecting: (connecting) => set({ connecting }),
  setSessionId: (sessionId) => set({ sessionId }),
  setRoomId: (roomId) => set({ roomId }),

  addPlayer: (player) =>
    set((state) => {
      const newPlayers = new Map(state.players);
      newPlayers.set(player.sessionId, player);
      return { players: newPlayers };
    }),

  updatePlayer: (sessionId, updates) =>
    set((state) => {
      const player = state.players.get(sessionId);
      if (!player) return state;
      const newPlayers = new Map(state.players);
      newPlayers.set(sessionId, { ...player, ...updates });
      return { players: newPlayers };
    }),

  removePlayer: (sessionId) =>
    set((state) => {
      const newPlayers = new Map(state.players);
      newPlayers.delete(sessionId);
      return { players: newPlayers };
    }),

  addChatMessage: (message) =>
    set((state) => ({
      chatMessages: [...state.chatMessages.slice(-99), message],
    })),

  setError: (error) => set({ error }),

  reset: () =>
    set({
      connected: false,
      connecting: false,
      sessionId: null,
      roomId: null,
      players: new Map(),
      chatMessages: [],
      error: null,
    }),
}));

// Network Manager class
export class NetworkManager {
  private client: Client | null = null;
  private room: Room | null = null;
  private interpolationBuffer = new Map<string, PositionSnapshot[]>();
  private lastSendTime = 0;
  private sendInterval = 50; // 20 Hz

  constructor(private serverUrl: string = 'ws://localhost:2567') {}

  // Connect to game server
  async connect(
    roomName: string = 'game',
    options: { name: string; avatarUrl?: string; walletAddress?: string }
  ): Promise<void> {
    const store = useNetworkStore.getState();

    if (store.connected || store.connecting) {
      console.warn('Already connected or connecting');
      return;
    }

    store.setConnecting(true);
    store.setError(null);

    try {
      this.client = new Client(this.serverUrl);
      this.room = await this.client.joinOrCreate(roomName, options);

      store.setSessionId(this.room.sessionId);
      store.setRoomId(this.room.roomId);
      store.setConnected(true);
      store.setConnecting(false);

      this.setupListeners();

      console.log('🌐 Connected to game server:', this.room.roomId);
    } catch (error) {
      console.error('Failed to connect:', error);
      store.setError((error as Error).message);
      store.setConnecting(false);
      throw error;
    }
  }

  // Disconnect from server
  async disconnect(): Promise<void> {
    if (this.room) {
      await this.room.leave();
      this.room = null;
    }
    this.client = null;
    this.interpolationBuffer.clear();
    useNetworkStore.getState().reset();
  }

  // Set up room listeners
  private setupListeners(): void {
    if (!this.room) return;

    const store = useNetworkStore.getState();

    // Player added
    this.room.state.players.onAdd((player: any, sessionId: string) => {
      if (sessionId === this.room?.sessionId) return; // Skip local player

      store.addPlayer({
        sessionId,
        name: player.name,
        avatarUrl: player.avatarUrl,
        walletAddress: player.walletAddress,
        position: { x: player.position.x, y: player.position.y, z: player.position.z },
        rotation: {
          x: player.rotation.x,
          y: player.rotation.y,
          z: player.rotation.z,
          w: player.rotation.w,
        },
        velocity: { x: player.velocity.x, y: player.velocity.y, z: player.velocity.z },
        animation: player.animation,
        health: player.health,
        level: player.level,
      });

      console.log('👤 Player joined:', player.name);
    });

    // Player changed
    this.room.state.players.onChange((player: any, sessionId: string) => {
      if (sessionId === this.room?.sessionId) return;

      // Add to interpolation buffer
      this.addSnapshot(sessionId, {
        position: [player.position.x, player.position.y, player.position.z],
        rotation: [player.rotation.x, player.rotation.y, player.rotation.z, player.rotation.w],
        velocity: [player.velocity.x, player.velocity.y, player.velocity.z],
        animation: player.animation,
        timestamp: Date.now(),
      });

      store.updatePlayer(sessionId, {
        position: { x: player.position.x, y: player.position.y, z: player.position.z },
        rotation: {
          x: player.rotation.x,
          y: player.rotation.y,
          z: player.rotation.z,
          w: player.rotation.w,
        },
        velocity: { x: player.velocity.x, y: player.velocity.y, z: player.velocity.z },
        animation: player.animation,
        health: player.health,
      });
    });

    // Player removed
    this.room.state.players.onRemove((_: any, sessionId: string) => {
      store.removePlayer(sessionId);
      this.interpolationBuffer.delete(sessionId);
      console.log('👋 Player left:', sessionId);
    });

    // Chat messages
    this.room.onMessage('chat', (data: ChatMessage) => {
      store.addChatMessage(data);
    });

    // Welcome message
    this.room.onMessage('welcome', (data: any) => {
      console.log('🎮 Welcome to the game!', data);
    });

    // Room errors
    this.room.onError((code, message) => {
      console.error('Room error:', code, message);
      store.setError(message || `Error code: ${code}`);
    });

    // Room leave
    this.room.onLeave((code) => {
      console.log('Left room:', code);
      store.reset();
    });
  }

  // Add snapshot to interpolation buffer
  private addSnapshot(sessionId: string, snapshot: PositionSnapshot): void {
    if (!this.interpolationBuffer.has(sessionId)) {
      this.interpolationBuffer.set(sessionId, []);
    }
    const buffer = this.interpolationBuffer.get(sessionId)!;
    buffer.push(snapshot);

    // Keep only last 1 second of snapshots
    const cutoff = Date.now() - 1000;
    while (buffer.length > 0 && buffer[0].timestamp < cutoff) {
      buffer.shift();
    }
  }

  // Get interpolated state for a remote player
  getInterpolatedState(sessionId: string, renderTime: number): PositionSnapshot | null {
    const buffer = this.interpolationBuffer.get(sessionId);
    if (!buffer || buffer.length < 2) {
      // Return latest if not enough data for interpolation
      return buffer?.[buffer.length - 1] ?? null;
    }

    // Interpolation delay (100ms in the past for smooth playback)
    const interpTime = renderTime - 100;

    // Find two snapshots to interpolate between
    let older: PositionSnapshot | null = null;
    let newer: PositionSnapshot | null = null;

    for (let i = 0; i < buffer.length - 1; i++) {
      if (buffer[i].timestamp <= interpTime && buffer[i + 1].timestamp >= interpTime) {
        older = buffer[i];
        newer = buffer[i + 1];
        break;
      }
    }

    if (!older || !newer) {
      return buffer[buffer.length - 1];
    }

    // Calculate interpolation factor
    const t = (interpTime - older.timestamp) / (newer.timestamp - older.timestamp);

    return {
      position: [
        this.lerp(older.position[0], newer.position[0], t),
        this.lerp(older.position[1], newer.position[1], t),
        this.lerp(older.position[2], newer.position[2], t),
      ],
      rotation: this.slerpQuat(older.rotation, newer.rotation, t),
      velocity: newer.velocity,
      animation: newer.animation,
      timestamp: interpTime,
    };
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  private slerpQuat(
    a: [number, number, number, number],
    b: [number, number, number, number],
    t: number
  ): [number, number, number, number] {
    let dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
    const bAdj: [number, number, number, number] = dot < 0 ? [-b[0], -b[1], -b[2], -b[3]] : b;
    if (dot < 0) dot = -dot;

    const result: [number, number, number, number] = [
      this.lerp(a[0], bAdj[0], t),
      this.lerp(a[1], bAdj[1], t),
      this.lerp(a[2], bAdj[2], t),
      this.lerp(a[3], bAdj[3], t),
    ];

    const len = Math.sqrt(
      result[0] ** 2 + result[1] ** 2 + result[2] ** 2 + result[3] ** 2
    );
    return [result[0] / len, result[1] / len, result[2] / len, result[3] / len];
  }

  // Send position update (throttled)
  sendPosition(
    position: [number, number, number],
    rotation: [number, number, number, number],
    velocity: [number, number, number],
    animation: string
  ): void {
    if (!this.room) return;

    const now = Date.now();
    if (now - this.lastSendTime < this.sendInterval) return;
    this.lastSendTime = now;

    this.room.send('move', {
      x: position[0],
      y: position[1],
      z: position[2],
      rotX: rotation[0],
      rotY: rotation[1],
      rotZ: rotation[2],
      rotW: rotation[3],
      velX: velocity[0],
      velY: velocity[1],
      velZ: velocity[2],
      animation,
    });
  }

  // Send chat message
  sendChat(message: string, channel: string = 'global'): void {
    if (!this.room) return;
    this.room.send('chat', { message, channel });
  }

  // Send interaction
  sendInteract(targetId: string, action: string): void {
    if (!this.room) return;
    this.room.send('interact', { targetId, action });
  }

  // Send ready state
  sendReady(): void {
    if (!this.room) return;
    this.room.send('ready');
  }

  // Getters
  isConnected(): boolean {
    return useNetworkStore.getState().connected;
  }

  getSessionId(): string | null {
    return useNetworkStore.getState().sessionId;
  }

  getRoom(): Room | null {
    return this.room;
  }
}

// Singleton instance
let networkManagerInstance: NetworkManager | null = null;

export function getNetworkManager(serverUrl?: string): NetworkManager {
  if (!networkManagerInstance) {
    networkManagerInstance = new NetworkManager(serverUrl);
  }
  return networkManagerInstance;
}

export function resetNetworkManager(): void {
  if (networkManagerInstance) {
    networkManagerInstance.disconnect();
    networkManagerInstance = null;
  }
}
