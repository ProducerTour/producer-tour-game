import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { emailService } from '../services/email.service';
import { pushService } from '../services/push.service';
import { notificationService } from '../services/notification.service';
import { registerUserConnection, unregisterUserConnection } from '../services/productivity.service';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
}

interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

let io: Server | null = null;

// Server version - generated at startup, changes on each deployment
// Clients compare this to detect when server has been updated
const SERVER_VERSION = Date.now().toString();
console.log(`🚀 Server version: ${SERVER_VERSION}`);

// Track online users: Map<userId, Set<socketId>>
const onlineUsers = new Map<string, Set<string>>();

// 3D Multiplayer state - track players in various 3D rooms
interface Player3D {
  id: string;
  username: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  color: string;
  shipModel: 'rocket' | 'fighter' | 'unaf' | 'monkey';
  avatarUrl?: string; // For play room - Ready Player Me avatar
  animationState?: string; // Current animation (idle, walking, running, etc.)
  weaponType?: 'none' | 'rifle' | 'pistol'; // Current equipped weapon
  lastUpdate: number;
  room: 'space' | 'holdings' | 'play'; // Which room they're in
}

const players3D = new Map<string, Player3D>();
const PLAYER_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'];
const SHIP_MODELS: ('rocket' | 'fighter' | 'unaf' | 'monkey')[] = ['rocket', 'fighter', 'unaf', 'monkey'];

// === SERVER-AUTHORITATIVE NPC SYSTEM ===
interface ServerNPC {
  id: string;
  name: string;
  type: 'friendly' | 'neutral' | 'hostile';
  position: { x: number; y: number; z: number };
  rotation: number;
  behavior: 'idle' | 'patrol' | 'wander';
  state: 'idle' | 'walking' | 'running';
  color: string;
  scale: number;
  // Movement state
  targetPosition?: { x: number; y: number; z: number };
  patrolPoints?: { x: number; y: number; z: number }[];
  currentPatrolIndex: number;
  waitUntil: number;
  // Wander bounds (around spawn point)
  spawnPosition: { x: number; y: number; z: number };
  wanderRadius: number;
}

// NPCs per room - using Map for easy lookup
const roomNPCs = new Map<string, Map<string, ServerNPC>>();

// Define initial NPCs for the play room
const PLAY_ROOM_NPCS: Omit<ServerNPC, 'waitUntil' | 'currentPatrolIndex' | 'spawnPosition'>[] = [
  // Wandering monkey near the spawn area
  {
    id: 'npc_monkey_1',
    name: 'Curious Monkey',
    type: 'friendly',
    position: { x: 5, y: 0, z: 10 },
    rotation: 0,
    behavior: 'wander',
    state: 'idle',
    color: '#8B4513',
    scale: 0.8,
    wanderRadius: 15,
  },
  // Patrolling guard
  {
    id: 'npc_guard_1',
    name: 'Guard Bot',
    type: 'neutral',
    position: { x: -10, y: 0, z: 0 },
    rotation: 0,
    behavior: 'patrol',
    state: 'walking',
    color: '#3b82f6',
    scale: 1,
    patrolPoints: [
      { x: -10, y: 0, z: 0 },
      { x: -10, y: 0, z: 20 },
      { x: 10, y: 0, z: 20 },
      { x: 10, y: 0, z: 0 },
    ],
    wanderRadius: 5,
  },
  // Another wandering NPC
  {
    id: 'npc_wanderer_1',
    name: 'Wandering Spirit',
    type: 'friendly',
    position: { x: -15, y: 0, z: -10 },
    rotation: 0,
    behavior: 'wander',
    state: 'idle',
    color: '#8b5cf6',
    scale: 1,
    wanderRadius: 20,
  },
  // Idle NPC
  {
    id: 'npc_merchant_1',
    name: 'Merchant',
    type: 'friendly',
    position: { x: 0, y: 0, z: -5 },
    rotation: Math.PI / 4,
    behavior: 'idle',
    state: 'idle',
    color: '#22c55e',
    scale: 1,
    wanderRadius: 0,
  },
];

// NPC AI constants
const NPC_WALK_SPEED = 1.5;
const NPC_UPDATE_INTERVAL = 50; // ms - server tick rate for NPCs
const NPC_BROADCAST_INTERVAL = 100; // ms - how often to broadcast updates

// Initialize NPCs for a room
function initializeRoomNPCs(room: string): Map<string, ServerNPC> {
  const npcs = new Map<string, ServerNPC>();

  if (room === 'play') {
    PLAY_ROOM_NPCS.forEach(npcDef => {
      const npc: ServerNPC = {
        ...npcDef,
        spawnPosition: { ...npcDef.position },
        currentPatrolIndex: 0,
        waitUntil: 0,
      };
      npcs.set(npc.id, npc);
    });
  }

  return npcs;
}

// Update NPC AI (called by server tick)
function updateNPCAI(npc: ServerNPC, deltaTime: number): boolean {
  const now = Date.now();
  let changed = false;

  // Skip if waiting
  if (now < npc.waitUntil) {
    if (npc.state !== 'idle') {
      npc.state = 'idle';
      changed = true;
    }
    return changed;
  }

  switch (npc.behavior) {
    case 'idle':
      // Just stand there
      if (npc.state !== 'idle') {
        npc.state = 'idle';
        changed = true;
      }
      break;

    case 'patrol':
      changed = updatePatrolBehavior(npc, deltaTime, now) || changed;
      break;

    case 'wander':
      changed = updateWanderBehavior(npc, deltaTime, now) || changed;
      break;
  }

  return changed;
}

function updatePatrolBehavior(npc: ServerNPC, deltaTime: number, now: number): boolean {
  if (!npc.patrolPoints || npc.patrolPoints.length === 0) return false;

  const targetPoint = npc.patrolPoints[npc.currentPatrolIndex];
  const dx = targetPoint.x - npc.position.x;
  const dz = targetPoint.z - npc.position.z;
  const distance = Math.sqrt(dx * dx + dz * dz);

  if (distance < 0.5) {
    // Reached point, wait then move to next
    npc.waitUntil = now + 2000 + Math.random() * 1000;
    npc.currentPatrolIndex = (npc.currentPatrolIndex + 1) % npc.patrolPoints.length;
    npc.state = 'idle';
    npc.targetPosition = undefined;
    return true;
  }

  // Move toward target
  npc.targetPosition = targetPoint;
  return moveNPCTowardTarget(npc, deltaTime);
}

function updateWanderBehavior(npc: ServerNPC, deltaTime: number, now: number): boolean {
  // Pick new target if we don't have one
  if (!npc.targetPosition) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 3 + Math.random() * (npc.wanderRadius - 3);
    npc.targetPosition = {
      x: npc.spawnPosition.x + Math.cos(angle) * dist,
      y: npc.spawnPosition.y,
      z: npc.spawnPosition.z + Math.sin(angle) * dist,
    };
    npc.state = 'walking';
    return true;
  }

  // Check if reached target
  const dx = npc.targetPosition.x - npc.position.x;
  const dz = npc.targetPosition.z - npc.position.z;
  const distance = Math.sqrt(dx * dx + dz * dz);

  if (distance < 0.5) {
    npc.targetPosition = undefined;
    npc.waitUntil = now + 1500 + Math.random() * 3000;
    npc.state = 'idle';
    return true;
  }

  return moveNPCTowardTarget(npc, deltaTime);
}

function moveNPCTowardTarget(npc: ServerNPC, deltaTime: number): boolean {
  if (!npc.targetPosition) return false;

  const dx = npc.targetPosition.x - npc.position.x;
  const dz = npc.targetPosition.z - npc.position.z;
  const distance = Math.sqrt(dx * dx + dz * dz);

  if (distance < 0.1) return false;

  // Move
  const dirX = dx / distance;
  const dirZ = dz / distance;
  const moveAmount = Math.min(NPC_WALK_SPEED * deltaTime, distance);

  npc.position.x += dirX * moveAmount;
  npc.position.z += dirZ * moveAmount;

  // Rotate to face direction
  npc.rotation = Math.atan2(dirX, dirZ);
  npc.state = 'walking';

  return true;
}

// Server NPC simulation loop
let npcSimulationInterval: ReturnType<typeof setInterval> | null = null;
let lastNPCUpdate = Date.now();
let lastNPCBroadcast = Date.now();

function startNPCSimulation(ioInstance: Server) {
  if (npcSimulationInterval) return;

  console.log('🤖 Starting NPC simulation...');

  npcSimulationInterval = setInterval(() => {
    const now = Date.now();
    const deltaTime = (now - lastNPCUpdate) / 1000;
    lastNPCUpdate = now;

    // Update all NPCs in all rooms
    roomNPCs.forEach((npcs, room) => {
      const socketRoom = getSocketRoomName(room);
      let hasChanges = false;

      npcs.forEach(npc => {
        const changed = updateNPCAI(npc, deltaTime);
        if (changed) hasChanges = true;
      });

      // Broadcast updates periodically
      if (now - lastNPCBroadcast >= NPC_BROADCAST_INTERVAL && hasChanges) {
        const npcArray = Array.from(npcs.values()).map(npc => ({
          id: npc.id,
          name: npc.name,
          type: npc.type,
          position: npc.position,
          rotation: npc.rotation,
          state: npc.state,
          color: npc.color,
          scale: npc.scale,
        }));

        ioInstance.to(socketRoom).emit('npc:update', npcArray);
      }
    });

    if (now - lastNPCBroadcast >= NPC_BROADCAST_INTERVAL) {
      lastNPCBroadcast = now;
    }
  }, NPC_UPDATE_INTERVAL);
}

function stopNPCSimulation() {
  if (npcSimulationInterval) {
    clearInterval(npcSimulationInterval);
    npcSimulationInterval = null;
    console.log('🤖 NPC simulation stopped');
  }
}

function getSocketRoomName(room: string): string {
  if (room === 'holdings') return '3d-holdings-room';
  if (room === 'play') return '3d-play-room';
  return '3d-room';
}

export function initializeSocket(httpServer: HttpServer): Server {
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
    'https://website-frontend-producer-tour.vercel.app',
    'https://producertour.com',
    'https://www.producertour.com',
    'https://website-0qgn.onrender.com', // Render backend (for same-origin)
  ];

  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or Postman)
        if (!origin) {
          return callback(null, true);
        }
        // Allow static origins
        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        // Allow Vercel preview deployments
        if (origin.endsWith('-producer-tour.vercel.app')) {
          return callback(null, true);
        }
        callback(new Error('Not allowed by CORS'));
      },
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Authentication middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;

      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(
        token as string,
        process.env.JWT_SECRET || 'your-secret-key'
      ) as JwtPayload;

      // Verify user exists
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, role: true, firstName: true, lastName: true },
      });

      if (!user) {
        return next(new Error('User not found'));
      }

      socket.userId = user.id;
      socket.userRole = user.role;
      next();
    } catch (error) {
      console.error('Socket authentication error:', error);
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    const userId = socket.userId!;
    console.log(`User connected: ${userId} (socket: ${socket.id})`);

    // Track online status
    const isNewConnection = !onlineUsers.has(userId);
    if (isNewConnection) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId)!.add(socket.id);

    // Register connection time for productivity widget
    if (isNewConnection) {
      registerUserConnection(userId);
    }

    // Broadcast online status
    io?.emit('user:online', { userId });

    // Broadcast updated online count for productivity widgets
    io?.emit('users:online-update', { count: onlineUsers.size });

    // Join user's conversation rooms
    joinUserConversations(socket, userId);

    // Handle joining a specific conversation
    socket.on('conversation:join', async (conversationId: string) => {
      try {
        // Verify user is participant
        const participant = await prisma.conversationParticipant.findUnique({
          where: {
            conversationId_userId: { conversationId, userId },
          },
        });

        if (participant && !participant.leftAt) {
          socket.join(`conversation:${conversationId}`);
          console.log(`User ${userId} joined conversation ${conversationId}`);
        }
      } catch (error) {
        console.error('Error joining conversation:', error);
      }
    });

    // Handle leaving a conversation room
    socket.on('conversation:leave', (conversationId: string) => {
      socket.leave(`conversation:${conversationId}`);
      console.log(`User ${userId} left conversation room ${conversationId}`);
    });

    // Handle new message
    socket.on('message:send', async (data: {
      conversationId: string;
      content: string;
      type?: 'TEXT' | 'FILE' | 'SYSTEM';
      replyToId?: string;
      fileName?: string;
      fileUrl?: string;
      fileSize?: number;
      fileMimeType?: string;
    }) => {
      try {
        const { conversationId, content, type = 'TEXT', replyToId, ...fileData } = data;

        // Verify user is participant
        const participant = await prisma.conversationParticipant.findUnique({
          where: {
            conversationId_userId: { conversationId, userId },
          },
        });

        if (!participant || participant.leftAt) {
          socket.emit('error', { message: 'Not a member of this conversation' });
          return;
        }

        // Create message
        const message = await prisma.message.create({
          data: {
            conversationId,
            senderId: userId,
            content,
            type,
            replyToId,
            ...fileData,
          },
          include: {
            sender: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
              },
            },
            replyTo: {
              select: {
                id: true,
                content: true,
                sender: {
                  select: { firstName: true, lastName: true },
                },
              },
            },
          },
        });

        // Update conversation timestamp
        await prisma.conversation.update({
          where: { id: conversationId },
          data: { updatedAt: new Date() },
        });

        // Broadcast to conversation room
        io?.to(`conversation:${conversationId}`).emit('message:new', message);

        // Send notification to offline participants
        const participants = await prisma.conversationParticipant.findMany({
          where: {
            conversationId,
            userId: { not: userId },
            leftAt: null,
            isMuted: false,
          },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        });

        // Get sender info for notification
        const sender = message.sender;
        const senderName = `${sender.firstName || ''} ${sender.lastName || ''}`.trim() || sender.email;

        // Send notifications to offline users (in-app + push + email)
        for (const p of participants) {
          if (!onlineUsers.has(p.userId) && p.user) {
            const recipientName = `${p.user.firstName || ''} ${p.user.lastName || ''}`.trim() || p.user.email;

            // Create in-app notification
            notificationService.notifyNewMessage(
              p.user.id,
              userId,
              content || '[File attachment]',
              conversationId
            ).then((notification) => {
              // Emit to user's sockets (even though they're "offline" from chat, they might still be browsing)
              emitToUser(p.user!.id, 'notification:new', notification);
            }).catch((err) => {
              console.error(`Failed to create notification for ${p.user?.id}:`, err);
            });

            // Send push notification (instant, for mobile devices)
            pushService.sendMessageNotification(
              p.user.id,
              senderName,
              content || '[File attachment]',
              conversationId
            ).catch((err) => {
              console.error(`Failed to send push notification to ${p.user?.id}:`, err);
            });

            // Send email notification asynchronously (don't await to avoid blocking)
            emailService.sendNewMessageNotification({
              recipientUserId: p.user.id,
              recipientName,
              recipientEmail: p.user.email,
              senderName,
              messagePreview: content || '[File attachment]',
              conversationId,
              timestamp: new Date(),
            }).catch((err) => {
              console.error(`Failed to send email notification to ${p.user?.email}:`, err);
            });
          }
        }
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle typing indicator
    socket.on('typing:start', (conversationId: string) => {
      socket.to(`conversation:${conversationId}`).emit('typing:update', {
        conversationId,
        userId,
        isTyping: true,
      });
    });

    socket.on('typing:stop', (conversationId: string) => {
      socket.to(`conversation:${conversationId}`).emit('typing:update', {
        conversationId,
        userId,
        isTyping: false,
      });
    });

    // Handle message read
    socket.on('message:read', async (data: { conversationId: string; messageId: string }) => {
      try {
        const { conversationId, messageId } = data;

        await prisma.conversationParticipant.update({
          where: {
            conversationId_userId: { conversationId, userId },
          },
          data: {
            lastReadAt: new Date(),
            lastReadMsgId: messageId,
          },
        });

        // Broadcast read receipt
        socket.to(`conversation:${conversationId}`).emit('message:read', {
          conversationId,
          userId,
          messageId,
        });
      } catch (error) {
        console.error('Error marking message as read:', error);
      }
    });

    // Handle message reaction
    socket.on('message:react', async (data: { messageId: string; emoji: string }) => {
      try {
        const { messageId, emoji } = data;

        const message = await prisma.message.findUnique({
          where: { id: messageId },
          select: { reactions: true, conversationId: true },
        });

        if (!message) return;

        // Update reactions
        const reactions = (message.reactions as Record<string, string[]>) || {};
        if (!reactions[emoji]) {
          reactions[emoji] = [];
        }

        const userIndex = reactions[emoji].indexOf(userId);
        if (userIndex > -1) {
          // Remove reaction
          reactions[emoji].splice(userIndex, 1);
          if (reactions[emoji].length === 0) {
            delete reactions[emoji];
          }
        } else {
          // Add reaction
          reactions[emoji].push(userId);
        }

        await prisma.message.update({
          where: { id: messageId },
          data: { reactions },
        });

        io?.to(`conversation:${message.conversationId}`).emit('message:reaction', {
          messageId,
          reactions,
        });
      } catch (error) {
        console.error('Error updating reaction:', error);
      }
    });

    // === 3D MULTIPLAYER EVENTS ===

    // Join 3D room (space, holdings, or play)
    socket.on('3d:join', async (data: { username: string; shipModel?: string; room?: 'space' | 'holdings' | 'play'; avatarUrl?: string; color?: string }) => {
      try {
        const username = data.username || `User_${socket.id.slice(0, 4)}`;
        const room = data.room || 'space';
        const shipModel = (SHIP_MODELS.includes(data.shipModel as typeof SHIP_MODELS[number])
          ? data.shipModel
          : 'rocket') as Player3D['shipModel'];

        // Assign a random color to this player (or use provided color for play room)
        const colorIndex = players3D.size % PLAYER_COLORS.length;
        const color = data.color || PLAYER_COLORS[colorIndex];

        // Starting positions based on room
        let startPosition = { x: 20, y: 10, z: 20 };
        let startRotation = { x: 0, y: -Math.PI / 4, z: 0 };

        if (room === 'holdings') {
          startPosition = { x: 0, y: 2, z: 5 };
          startRotation = { x: 0, y: 0, z: 0 };
        } else if (room === 'play') {
          // Random spawn around the basketball court
          startPosition = { x: (Math.random() - 0.5) * 20, y: 0, z: (Math.random() - 0.5) * 20 + 5 };
          startRotation = { x: 0, y: Math.random() * Math.PI * 2, z: 0 };
        }

        // Create player entry
        const player: Player3D = {
          id: socket.id,
          username,
          position: startPosition,
          rotation: startRotation,
          color,
          shipModel,
          avatarUrl: data.avatarUrl, // Store avatar URL for play room
          lastUpdate: Date.now(),
          room,
        };

        players3D.set(socket.id, player);
        const socketRoom = room === 'holdings' ? '3d-holdings-room' : room === 'play' ? '3d-play-room' : '3d-room';
        socket.join(socketRoom);

        // Log appropriate message based on room type
        if (room === 'play') {
          console.log(`🎮 Player ${username} (${socket.id}) joined play-room${data.avatarUrl ? ' with avatar' : ''}`);
        } else {
          console.log(`🚀 Player ${username} (${socket.id}) joined ${socketRoom} with ship: ${shipModel}`);
        }

        // Send current players in the same room to new joiner
        const currentPlayers = Array.from(players3D.values()).filter(p => p.id !== socket.id && p.room === room);
        console.log(`📋 Sending ${currentPlayers.length} existing players to ${username}:`, currentPlayers.map(p => p.username));
        socket.emit('3d:players', currentPlayers);

        // Send server version for auto-refresh on deployment
        socket.emit('server:version', SERVER_VERSION);

        // Broadcast new player to others in same room
        console.log(`📢 Broadcasting new player ${username} to room ${socketRoom}`);
        socket.to(socketRoom).emit('3d:player-joined', player);

        // Initialize NPCs for this room if not already done
        if (!roomNPCs.has(room)) {
          const npcs = initializeRoomNPCs(room);
          if (npcs.size > 0) {
            roomNPCs.set(room, npcs);
            console.log(`🤖 Initialized ${npcs.size} NPCs for ${room} room`);
          }
        }

        // Send current NPCs to new player
        const npcs = roomNPCs.get(room);
        if (npcs && npcs.size > 0) {
          const npcArray = Array.from(npcs.values()).map(npc => ({
            id: npc.id,
            name: npc.name,
            type: npc.type,
            position: npc.position,
            rotation: npc.rotation,
            state: npc.state,
            color: npc.color,
            scale: npc.scale,
          }));
          socket.emit('npc:init', npcArray);

          // Start NPC simulation if not running
          if (io) startNPCSimulation(io);
        }

        // Send player count update for this room
        const roomPlayerCount = Array.from(players3D.values()).filter(p => p.room === room).length;
        io?.to(socketRoom).emit('3d:player-count', roomPlayerCount);
      } catch (error) {
        console.error('Error joining 3D room:', error);
      }
    });

    // Leave 3D room
    socket.on('3d:leave', () => {
      const player = players3D.get(socket.id);
      if (player) {
        const socketRoom = player.room === 'holdings' ? '3d-holdings-room' : player.room === 'play' ? '3d-play-room' : '3d-room';
        const emoji = player.room === 'play' ? '🎮' : '🚀';
        console.log(`${emoji} Player ${player.username} (${socket.id}) left ${socketRoom}`);
        const playerRoom = player.room;
        players3D.delete(socket.id);
        socket.leave(socketRoom);
        socket.to(socketRoom).emit('3d:player-left', { id: socket.id });
        const roomPlayerCount = Array.from(players3D.values()).filter(p => p.room === playerRoom).length;
        io?.to(socketRoom).emit('3d:player-count', roomPlayerCount);
      }
    });

    // Helper to get socket room name
    const getSocketRoom = (room: string) => {
      if (room === 'holdings') return '3d-holdings-room';
      if (room === 'play') return '3d-play-room';
      return '3d-room';
    };

    // Update player position/rotation/animation/weapon
    socket.on('3d:update', (data: {
      position: { x: number; y: number; z: number };
      rotation: { x: number; y: number; z: number };
      animationState?: string;
      weaponType?: 'none' | 'rifle' | 'pistol';
    }) => {
      const player = players3D.get(socket.id);
      if (player) {
        player.position = data.position;
        player.rotation = data.rotation;
        if (data.animationState) {
          player.animationState = data.animationState;
        }
        if (data.weaponType !== undefined) {
          player.weaponType = data.weaponType;
        }
        player.lastUpdate = Date.now();

        // Broadcast position to others in same room (throttled by client)
        const socketRoom = getSocketRoom(player.room);
        socket.to(socketRoom).emit('3d:player-moved', {
          id: socket.id,
          position: data.position,
          rotation: data.rotation,
          ...(data.animationState && { animationState: data.animationState }),
          ...(data.weaponType !== undefined && { weaponType: data.weaponType }),
        });
      }
    });

    // Update ship model
    socket.on('3d:set-ship', (data: { shipModel: string }) => {
      const player = players3D.get(socket.id);
      if (player && SHIP_MODELS.includes(data.shipModel as typeof SHIP_MODELS[number])) {
        player.shipModel = data.shipModel as Player3D['shipModel'];
        const socketRoom = getSocketRoom(player.room);
        console.log(`🚀 Player ${player.username} changed ship to: ${player.shipModel}`);
        socket.to(socketRoom).emit('3d:player-updated', {
          id: socket.id,
          shipModel: player.shipModel,
        });
      }
    });

    // Update username
    socket.on('3d:set-username', (data: { username: string }) => {
      const player = players3D.get(socket.id);
      if (player && data.username) {
        player.username = data.username.slice(0, 20); // Max 20 chars
        const socketRoom = getSocketRoom(player.room);
        socket.to(socketRoom).emit('3d:player-updated', {
          id: socket.id,
          username: player.username,
        });
      }
    });

    // === QUEST CO-OP EVENTS ===

    // Handle quest updates from admins - broadcast to other admins in holdings
    socket.on('quest:update', (data: { entityId: string; questId: string; type: 'started' | 'step-completed' | 'completed' }) => {
      // Only allow admins to broadcast quest updates
      if (socket.userRole === 'ADMIN') {
        console.log(`📋 Quest update from ${socket.userId}: ${data.type} for quest ${data.questId}`);
        // Broadcast to all other admins in the holdings room
        socket.to('3d-holdings-room').emit('quest:updated', {
          entityId: data.entityId,
          questId: data.questId,
          type: data.type,
          updatedBy: socket.userId,
        });
      }
    });

    // Switch rooms (space <-> holdings <-> play)
    socket.on('3d:switch-room', (data: { room: 'space' | 'holdings' | 'play' }) => {
      const player = players3D.get(socket.id);
      if (player && (data.room === 'space' || data.room === 'holdings' || data.room === 'play')) {
        const oldSocketRoom = getSocketRoom(player.room);
        const newSocketRoom = getSocketRoom(data.room);

        // Leave old room
        socket.leave(oldSocketRoom);
        socket.to(oldSocketRoom).emit('3d:player-left', { id: socket.id });
        const oldRoomCount = Array.from(players3D.values()).filter(p => p.room === player.room && p.id !== socket.id).length;
        io?.to(oldSocketRoom).emit('3d:player-count', oldRoomCount);

        // Update player room with appropriate starting positions
        player.room = data.room;
        if (data.room === 'holdings') {
          player.position = { x: 0, y: 2, z: 5 };
          player.rotation = { x: 0, y: 0, z: 0 };
        } else if (data.room === 'play') {
          player.position = { x: (Math.random() - 0.5) * 20, y: 0, z: (Math.random() - 0.5) * 20 + 5 };
          player.rotation = { x: 0, y: Math.random() * Math.PI * 2, z: 0 };
        } else {
          player.position = { x: 20, y: 10, z: 20 };
          player.rotation = { x: 0, y: -Math.PI / 4, z: 0 };
        }

        // Join new room
        socket.join(newSocketRoom);

        // Send current players in new room
        const currentPlayers = Array.from(players3D.values()).filter(p => p.id !== socket.id && p.room === data.room);
        socket.emit('3d:players', currentPlayers);

        // Broadcast to new room
        socket.to(newSocketRoom).emit('3d:player-joined', player);
        const newRoomCount = Array.from(players3D.values()).filter(p => p.room === data.room).length;
        io?.to(newSocketRoom).emit('3d:player-count', newRoomCount);

        console.log(`🚀 Player ${player.username} switched to ${data.room} room`);
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${userId} (socket: ${socket.id})`);

      // Clean up 3D player if they were in the room
      const player = players3D.get(socket.id);
      if (player) {
        const socketRoom = getSocketRoom(player.room);
        const playerRoom = player.room;
        const emoji = player.room === 'play' ? '🎮' : '🚀';
        console.log(`${emoji} Player ${player.username} disconnected from ${socketRoom}`);
        players3D.delete(socket.id);
        io?.to(socketRoom).emit('3d:player-left', { id: socket.id });
        const roomPlayerCount = Array.from(players3D.values()).filter(p => p.room === playerRoom).length;
        io?.to(socketRoom).emit('3d:player-count', roomPlayerCount);
      }

      // Remove socket from online users
      const userSockets = onlineUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);
          // Unregister from productivity tracking
          unregisterUserConnection(userId);
          // Broadcast offline status
          io?.emit('user:offline', { userId });
        }
      }

      // Broadcast updated online count for productivity widgets
      io?.emit('users:online-update', { count: onlineUsers.size });
    });
  });

  console.log('🔌 Socket.io initialized');
  return io;
}

async function joinUserConversations(socket: AuthenticatedSocket, userId: string) {
  try {
    const conversations = await prisma.conversationParticipant.findMany({
      where: {
        userId,
        leftAt: null,
      },
      select: { conversationId: true },
    });

    conversations.forEach((c) => {
      socket.join(`conversation:${c.conversationId}`);
    });

    console.log(`User ${userId} joined ${conversations.length} conversation rooms`);
  } catch (error) {
    console.error('Error joining user conversations:', error);
  }
}

export function getIO(): Server | null {
  return io;
}

export function isUserOnline(userId: string): boolean {
  return onlineUsers.has(userId);
}

export function getOnlineUsers(): string[] {
  return Array.from(onlineUsers.keys());
}

export function emitToUser(userId: string, event: string, data: unknown): void {
  const userSockets = onlineUsers.get(userId);
  if (userSockets && io) {
    userSockets.forEach((socketId) => {
      io?.to(socketId).emit(event, data);
    });
  }
}

export function emitToConversation(conversationId: string, event: string, data: unknown): void {
  if (io) {
    io.to(`conversation:${conversationId}`).emit(event, data);
  }
}
