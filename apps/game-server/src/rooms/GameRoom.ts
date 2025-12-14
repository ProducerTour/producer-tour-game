// Colyseus Game Room - handles multiplayer game logic
import { Room, Client, Delayed } from 'colyseus';
import { GameState, Player, NPC, ChatMessage, Vector3 } from './schema/GameState.js';

// Message types
interface JoinOptions {
  name: string;
  avatarUrl?: string;
  walletAddress?: string;
}

interface MoveMessage {
  x: number;
  y: number;
  z: number;
  rotX: number;
  rotY: number;
  rotZ: number;
  rotW: number;
  velX: number;
  velY: number;
  velZ: number;
  animation: string;
}

interface ChatMessageInput {
  message: string;
  channel?: string;
}

interface InteractMessage {
  targetId: string;
  action: string;
}

// Constants
const TICK_RATE = 20; // 20 Hz server tick
const MAX_SPEED = 15; // m/s max movement speed (anti-cheat)
const CHAT_HISTORY_SIZE = 100;
const PROXIMITY_CHAT_RANGE = 20; // meters

export class GameRoom extends Room<GameState> {
  maxClients = 50;
  private tickInterval: Delayed | null = null;
  private lastPositions = new Map<string, { x: number; y: number; z: number; time: number }>();

  onCreate(options: any) {
    this.setState(new GameState());
    this.state.worldId = options.worldId || 'main';
    this.state.maxPlayers = options.maxPlayers || 50;

    console.log(`🎮 Game room created: ${this.roomId} (world: ${this.state.worldId})`);

    // Set up message handlers
    this.setupMessageHandlers();

    // Start server tick
    this.tickInterval = this.clock.setInterval(() => {
      this.serverTick();
    }, 1000 / TICK_RATE);
  }

  private setupMessageHandlers() {
    // Player movement
    this.onMessage('move', (client, data: MoveMessage) => {
      this.handleMove(client, data);
    });

    // Chat
    this.onMessage('chat', (client, data: ChatMessageInput) => {
      this.handleChat(client, data);
    });

    // Interaction
    this.onMessage('interact', (client, data: InteractMessage) => {
      this.handleInteract(client, data);
    });

    // Ready state
    this.onMessage('ready', (client) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        player.isReady = true;
      }
    });
  }

  private handleMove(client: Client, data: MoveMessage) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    // Anti-cheat: Check speed
    const lastPos = this.lastPositions.get(client.sessionId);
    if (lastPos) {
      const now = Date.now();
      const dt = (now - lastPos.time) / 1000;
      if (dt > 0) {
        const dx = data.x - lastPos.x;
        const dy = data.y - lastPos.y;
        const dz = data.z - lastPos.z;
        const speed = Math.sqrt(dx * dx + dy * dy + dz * dz) / dt;

        if (speed > MAX_SPEED) {
          console.warn(`⚠️ Speed hack detected: ${client.sessionId} (${speed.toFixed(1)} m/s)`);
          // Reject the update, optionally kick player
          return;
        }
      }
    }

    // Update player state
    player.position.set(data.x, data.y, data.z);
    player.rotation.set(data.rotX, data.rotY, data.rotZ, data.rotW);
    player.velocity.set(data.velX, data.velY, data.velZ);
    player.animation = data.animation;
    player.lastUpdate = Date.now();

    // Store last position for anti-cheat
    this.lastPositions.set(client.sessionId, {
      x: data.x,
      y: data.y,
      z: data.z,
      time: Date.now(),
    });
  }

  private handleChat(client: Client, data: ChatMessageInput) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    // Sanitize message
    const message = data.message.slice(0, 200).trim();
    if (!message) return;

    const channel = data.channel || 'global';

    // Create chat message
    const chatMessage = new ChatMessage();
    chatMessage.id = `${Date.now()}-${client.sessionId}`;
    chatMessage.senderId = client.sessionId;
    chatMessage.senderName = player.name;
    chatMessage.message = message;
    chatMessage.timestamp = Date.now();
    chatMessage.channel = channel;

    // Add to history
    this.state.chatHistory.push(chatMessage);
    if (this.state.chatHistory.length > CHAT_HISTORY_SIZE) {
      this.state.chatHistory.shift();
    }

    // Broadcast based on channel
    if (channel === 'proximity') {
      // Only send to nearby players
      this.state.players.forEach((otherPlayer, sessionId) => {
        const dist = player.position.distanceTo(otherPlayer.position);
        if (dist <= PROXIMITY_CHAT_RANGE) {
          const otherClient = this.clients.find((c) => c.sessionId === sessionId);
          otherClient?.send('chat', {
            id: chatMessage.id,
            senderId: chatMessage.senderId,
            senderName: chatMessage.senderName,
            message: chatMessage.message,
            channel: chatMessage.channel,
          });
        }
      });
    } else {
      // Broadcast to all
      this.broadcast('chat', {
        id: chatMessage.id,
        senderId: chatMessage.senderId,
        senderName: chatMessage.senderName,
        message: chatMessage.message,
        channel: chatMessage.channel,
      });
    }
  }

  private handleInteract(client: Client, data: InteractMessage) {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    // Handle different interaction types
    switch (data.action) {
      case 'pickup':
        this.handlePickup(client, data.targetId);
        break;
      case 'talk':
        this.handleTalk(client, data.targetId);
        break;
      default:
        console.log(`Unknown interaction: ${data.action}`);
    }
  }

  private handlePickup(client: Client, itemId: string) {
    const item = this.state.items.get(itemId);
    if (!item || !item.active) return;

    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    // Check distance
    const dist = player.position.distanceTo(item.position);
    if (dist > 3) return; // Too far

    // Deactivate item
    item.active = false;

    // Notify client
    client.send('pickup', {
      itemId,
      itemType: item.itemType,
    });

    // Schedule respawn
    this.clock.setTimeout(() => {
      if (this.state.items.has(itemId)) {
        const respawnItem = this.state.items.get(itemId);
        if (respawnItem) {
          respawnItem.active = true;
        }
      }
    }, item.respawnTime * 1000);
  }

  private handleTalk(client: Client, npcId: string) {
    const npc = this.state.npcs.get(npcId);
    if (!npc) return;

    // Send dialogue start event
    client.send('dialogue', {
      npcId,
      npcName: npc.name,
      npcType: npc.npcType,
    });
  }

  private serverTick() {
    // Update server time
    this.state.serverTime = Date.now();

    // Update NPCs (AI logic would go here)
    this.updateNPCs();

    // Clean up stale players
    const now = Date.now();
    const staleThreshold = 10000; // 10 seconds without update

    this.state.players.forEach((player, sessionId) => {
      if (player.lastUpdate > 0 && now - player.lastUpdate > staleThreshold) {
        console.log(`⚠️ Stale player detected: ${sessionId}`);
        // Could kick player or just flag as AFK
      }
    });
  }

  private updateNPCs() {
    // Simple NPC AI - would be more complex in production
    this.state.npcs.forEach((npc) => {
      if (npc.state === 'idle') {
        // Random chance to start wandering
        if (Math.random() < 0.01) {
          npc.state = 'wander';
          npc.animation = 'walk';
        }
      } else if (npc.state === 'wander') {
        // Random chance to stop
        if (Math.random() < 0.02) {
          npc.state = 'idle';
          npc.animation = 'idle';
        }
      }
    });
  }

  onJoin(client: Client, options: JoinOptions) {
    console.log(`👤 Player joined: ${client.sessionId} (${options.name})`);

    // Create player
    const player = new Player();
    player.sessionId = client.sessionId;
    player.name = options.name || `Player${this.state.players.size + 1}`;
    player.avatarUrl = options.avatarUrl || '';
    player.walletAddress = options.walletAddress || '';

    // Spawn at random position near center
    const spawnRadius = 5;
    player.position.set(
      (Math.random() - 0.5) * spawnRadius * 2,
      1,
      (Math.random() - 0.5) * spawnRadius * 2
    );

    player.lastUpdate = Date.now();

    this.state.players.set(client.sessionId, player);

    // Initialize last position
    this.lastPositions.set(client.sessionId, {
      x: player.position.x,
      y: player.position.y,
      z: player.position.z,
      time: Date.now(),
    });

    // Send welcome message
    client.send('welcome', {
      sessionId: client.sessionId,
      worldId: this.state.worldId,
      playerCount: this.state.players.size,
    });
  }

  onLeave(client: Client, consented: boolean) {
    console.log(`👋 Player left: ${client.sessionId} (consented: ${consented})`);

    this.state.players.delete(client.sessionId);
    this.lastPositions.delete(client.sessionId);

    // Broadcast leave event
    this.broadcast('playerLeft', {
      sessionId: client.sessionId,
    });
  }

  onDispose() {
    console.log(`🗑️ Game room disposed: ${this.roomId}`);

    if (this.tickInterval) {
      this.tickInterval.clear();
    }
  }
}
