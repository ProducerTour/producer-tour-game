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

// Track online users: Map<userId, Set<socketId>>
const onlineUsers = new Map<string, Set<string>>();

// 3D Multiplayer state - track players in the corporate structure view
interface Player3D {
  id: string;
  username: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  color: string;
  lastUpdate: number;
}

const players3D = new Map<string, Player3D>();
const PLAYER_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'];

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

    // Join 3D corporate structure room
    socket.on('3d:join', async (data: { username: string }) => {
      try {
        const username = data.username || `User_${socket.id.slice(0, 4)}`;

        // Assign a random color to this player
        const colorIndex = players3D.size % PLAYER_COLORS.length;
        const color = PLAYER_COLORS[colorIndex];

        // Create player entry
        const player: Player3D = {
          id: socket.id,
          username,
          position: { x: 20, y: 10, z: 20 }, // Starting position
          rotation: { x: 0, y: -Math.PI / 4, z: 0 },
          color,
          lastUpdate: Date.now(),
        };

        players3D.set(socket.id, player);
        socket.join('3d-room');

        console.log(`🚀 Player ${username} (${socket.id}) joined 3D room`);

        // Send current players to new joiner
        const currentPlayers = Array.from(players3D.values()).filter(p => p.id !== socket.id);
        socket.emit('3d:players', currentPlayers);

        // Broadcast new player to others in room
        socket.to('3d-room').emit('3d:player-joined', player);

        // Send player count update
        io?.to('3d-room').emit('3d:player-count', players3D.size);
      } catch (error) {
        console.error('Error joining 3D room:', error);
      }
    });

    // Leave 3D room
    socket.on('3d:leave', () => {
      const player = players3D.get(socket.id);
      if (player) {
        console.log(`🚀 Player ${player.username} (${socket.id}) left 3D room`);
        players3D.delete(socket.id);
        socket.leave('3d-room');
        socket.to('3d-room').emit('3d:player-left', { id: socket.id });
        io?.to('3d-room').emit('3d:player-count', players3D.size);
      }
    });

    // Update player position/rotation
    socket.on('3d:update', (data: {
      position: { x: number; y: number; z: number };
      rotation: { x: number; y: number; z: number };
    }) => {
      const player = players3D.get(socket.id);
      if (player) {
        player.position = data.position;
        player.rotation = data.rotation;
        player.lastUpdate = Date.now();

        // Broadcast position to others (throttled by client)
        socket.to('3d-room').emit('3d:player-moved', {
          id: socket.id,
          position: data.position,
          rotation: data.rotation,
        });
      }
    });

    // Update username
    socket.on('3d:set-username', (data: { username: string }) => {
      const player = players3D.get(socket.id);
      if (player && data.username) {
        player.username = data.username.slice(0, 20); // Max 20 chars
        socket.to('3d-room').emit('3d:player-updated', {
          id: socket.id,
          username: player.username,
        });
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${userId} (socket: ${socket.id})`);

      // Clean up 3D player if they were in the room
      const player = players3D.get(socket.id);
      if (player) {
        console.log(`🚀 Player ${player.username} disconnected from 3D room`);
        players3D.delete(socket.id);
        io?.to('3d-room').emit('3d:player-left', { id: socket.id });
        io?.to('3d-room').emit('3d:player-count', players3D.size);
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
