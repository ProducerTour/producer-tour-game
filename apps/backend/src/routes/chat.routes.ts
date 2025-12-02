import { Router, Response } from 'express';
import { UploadedFile } from 'express-fileupload';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { emitToConversation, emitToUser, isUserOnline, getOnlineUsers } from '../socket';

const router = Router();

// Allowed MIME types for chat file uploads
const CHAT_ALLOWED_MIMES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'text/plain',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'video/mp4',
  'video/webm'
];
const MAX_CHAT_FILE_SIZE = 5 * 1024 * 1024; // 5MB for chat files

// Get all conversations for the current user
router.get('/conversations', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const conversations = await prisma.conversation.findMany({
      where: {
        participants: {
          some: {
            userId,
            leftAt: null,
          },
        },
      },
      include: {
        participants: {
          where: { leftAt: null },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
                profilePhotoUrl: true,
              },
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            sender: {
              select: { firstName: true, lastName: true },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Add unread count and online status
    const conversationsWithMeta = await Promise.all(
      conversations.map(async (conv) => {
        const participant = await prisma.conversationParticipant.findUnique({
          where: {
            conversationId_userId: { conversationId: conv.id, userId },
          },
        });

        const unreadCount = await prisma.message.count({
          where: {
            conversationId: conv.id,
            createdAt: { gt: participant?.lastReadAt || new Date(0) },
            senderId: { not: userId },
          },
        });

        // Get online status for other participants
        const participantsWithOnline = conv.participants.map((p) => ({
          ...p,
          isOnline: isUserOnline(p.userId),
        }));

        return {
          ...conv,
          participants: participantsWithOnline,
          unreadCount,
          isPinned: participant?.isPinned || false,
          isMuted: participant?.isMuted || false,
        };
      })
    );

    res.json(conversationsWithMeta);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// Create a new conversation (direct or group)
router.post('/conversations', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { type = 'DIRECT', name, participantIds, subject } = req.body;

    if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
      return res.status(400).json({ error: 'participantIds required' });
    }

    // For direct messages, check if conversation already exists
    if (type === 'DIRECT' && participantIds.length === 1) {
      const existingConv = await prisma.conversation.findFirst({
        where: {
          type: 'DIRECT',
          AND: [
            { participants: { some: { userId } } },
            { participants: { some: { userId: participantIds[0] } } },
          ],
        },
        include: {
          participants: {
            include: {
              user: {
                select: { id: true, firstName: true, lastName: true, email: true, role: true, profilePhotoUrl: true },
              },
            },
          },
        },
      });

      if (existingConv) {
        return res.json(existingConv);
      }
    }

    // Create conversation
    const conversation = await prisma.conversation.create({
      data: {
        type,
        name: type === 'GROUP' ? name : null,
        subject: type === 'SUPPORT' ? subject : null,
        participants: {
          create: [
            { userId, isAdmin: true },
            ...participantIds.map((id: string) => ({ userId: id })),
          ],
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, email: true, role: true, profilePhotoUrl: true },
            },
          },
        },
      },
    });

    // Notify all participants
    [...participantIds, userId].forEach((pId) => {
      emitToUser(pId, 'conversation:new', conversation);
    });

    res.status(201).json(conversation);
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

// Get a single conversation with messages
router.get('/conversations/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { limit = '50', before } = req.query;

    // Verify user is participant
    const participant = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: { conversationId: id, userId },
      },
    });

    if (!participant || participant.leftAt) {
      return res.status(403).json({ error: 'Not a member of this conversation' });
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: {
        participants: {
          where: { leftAt: null },
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, email: true, role: true, profilePhotoUrl: true },
            },
          },
        },
      },
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Get messages with pagination
    const messages = await prisma.message.findMany({
      where: {
        conversationId: id,
        isDeleted: false,
        ...(before ? { createdAt: { lt: new Date(before as string) } } : {}),
      },
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true, email: true, role: true, profilePhotoUrl: true },
        },
        replyTo: {
          select: {
            id: true,
            content: true,
            sender: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
    });

    // Add online status to participants
    const participantsWithOnline = conversation.participants.map((p) => ({
      ...p,
      isOnline: isUserOnline(p.userId),
    }));

    res.json({
      ...conversation,
      participants: participantsWithOnline,
      messages: messages.reverse(), // Return in chronological order
    });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

// Send a message (REST fallback, prefer Socket.io)
router.post('/conversations/:id/messages', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id: conversationId } = req.params;
    const { content, type = 'TEXT', replyToId, fileName, fileUrl, fileSize, fileMimeType } = req.body;

    // Verify user is participant
    const participant = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: { conversationId, userId },
      },
    });

    if (!participant || participant.leftAt) {
      return res.status(403).json({ error: 'Not a member of this conversation' });
    }

    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId: userId,
        content,
        type,
        replyToId,
        fileName,
        fileUrl,
        fileSize,
        fileMimeType,
      },
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true, email: true, role: true, profilePhotoUrl: true },
        },
        replyTo: {
          select: {
            id: true,
            content: true,
            sender: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    // Update conversation timestamp
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    // Emit via Socket.io
    emitToConversation(conversationId, 'message:new', message);

    res.status(201).json(message);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Mark conversation as read
router.post('/conversations/:id/read', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id: conversationId } = req.params;

    // Get the latest message
    const latestMessage = await prisma.message.findFirst({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
    });

    await prisma.conversationParticipant.update({
      where: {
        conversationId_userId: { conversationId, userId },
      },
      data: {
        lastReadAt: new Date(),
        lastReadMsgId: latestMessage?.id,
      },
    });

    // Emit read receipt
    emitToConversation(conversationId, 'message:read', {
      conversationId,
      userId,
      messageId: latestMessage?.id,
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error marking as read:', error);
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

// Update conversation settings (mute, pin)
router.patch('/conversations/:id/settings', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id: conversationId } = req.params;
    const { isMuted, isPinned } = req.body;

    const updated = await prisma.conversationParticipant.update({
      where: {
        conversationId_userId: { conversationId, userId },
      },
      data: {
        ...(isMuted !== undefined ? { isMuted } : {}),
        ...(isPinned !== undefined ? { isPinned } : {}),
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Rename a group conversation
router.patch('/conversations/:id/rename', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id: conversationId } = req.params;
    const { name } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Name is required' });
    }

    if (name.trim().length > 100) {
      return res.status(400).json({ error: 'Name must be 100 characters or less' });
    }

    // Get the conversation
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { type: true, name: true },
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Only group conversations can be renamed
    if (conversation.type !== 'GROUP') {
      return res.status(400).json({ error: 'Only group conversations can be renamed' });
    }

    // Check if user is a participant and is admin
    const participant = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: { conversationId, userId },
      },
    });

    if (!participant || participant.leftAt) {
      return res.status(403).json({ error: 'Not a member of this conversation' });
    }

    if (!participant.isAdmin) {
      return res.status(403).json({ error: 'Only admins can rename the conversation' });
    }

    const trimmedName = name.trim();
    const oldName = conversation.name;

    // Update the conversation name
    const updated = await prisma.conversation.update({
      where: { id: conversationId },
      data: { name: trimmedName },
      include: {
        participants: {
          where: { leftAt: null },
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, email: true, role: true, profilePhotoUrl: true },
            },
          },
        },
      },
    });

    // Get user info for system message
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true },
    });

    // Create system message about the rename
    const systemMessage = await prisma.message.create({
      data: {
        conversationId,
        senderId: userId,
        type: 'SYSTEM',
        content: `${user?.firstName} ${user?.lastName} renamed the group to "${trimmedName}"`,
      },
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true, email: true, role: true },
        },
      },
    });

    // Emit events to all participants
    emitToConversation(conversationId, 'conversation:renamed', {
      conversationId,
      name: trimmedName,
      oldName,
      renamedBy: userId,
    });

    emitToConversation(conversationId, 'message:new', systemMessage);

    res.json(updated);
  } catch (error) {
    console.error('Error renaming conversation:', error);
    res.status(500).json({ error: 'Failed to rename conversation' });
  }
});

// Leave a conversation
router.post('/conversations/:id/leave', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id: conversationId } = req.params;

    await prisma.conversationParticipant.update({
      where: {
        conversationId_userId: { conversationId, userId },
      },
      data: { leftAt: new Date() },
    });

    // Create system message
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true },
    });

    const systemMessage = await prisma.message.create({
      data: {
        conversationId,
        senderId: userId,
        type: 'SYSTEM',
        content: `${user?.firstName} ${user?.lastName} left the conversation`,
      },
    });

    emitToConversation(conversationId, 'message:new', systemMessage);
    emitToConversation(conversationId, 'participant:left', { conversationId, userId });

    res.json({ success: true });
  } catch (error) {
    console.error('Error leaving conversation:', error);
    res.status(500).json({ error: 'Failed to leave conversation' });
  }
});

// Get online users (admin only)
router.get('/online-users', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin only' });
    }

    const onlineUserIds = getOnlineUsers();
    const users = await prisma.user.findMany({
      where: { id: { in: onlineUserIds } },
      select: { id: true, firstName: true, lastName: true, email: true, role: true, profilePhotoUrl: true },
    });

    res.json(users);
  } catch (error) {
    console.error('Error fetching online users:', error);
    res.status(500).json({ error: 'Failed to fetch online users' });
  }
});

// Search users for starting conversations
router.get('/users/search', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { q } = req.query;

    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'Search query required' });
    }

    const users = await prisma.user.findMany({
      where: {
        id: { not: userId },
        OR: [
          { firstName: { contains: q, mode: 'insensitive' } },
          { lastName: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
      },
      take: 20,
    });

    // Add online status
    const usersWithOnline = users.map((u) => ({
      ...u,
      isOnline: isUserOnline(u.id),
    }));

    res.json(usersWithOnline);
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ error: 'Failed to search users' });
  }
});

// Upload a file for chat (uses express-fileupload, stores as base64 data URL)
router.post('/upload', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    // Check if files were uploaded
    if (!req.files || !req.files.file) {
      console.error('Chat file upload: No file in request');
      return res.status(400).json({
        error: 'No file selected',
        message: 'Please select a file to upload.'
      });
    }

    const file = req.files.file as UploadedFile;
    const userId = req.user!.id;

    console.log(`Chat file upload: User ${userId}, file size: ${file.size} bytes, mimetype: ${file.mimetype}`);

    // Validate file type
    if (!CHAT_ALLOWED_MIMES.includes(file.mimetype)) {
      return res.status(400).json({
        error: 'Invalid file type',
        message: 'This file type is not allowed. Please upload a supported file type.'
      });
    }

    // Validate file size
    if (file.size > MAX_CHAT_FILE_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      return res.status(400).json({
        error: 'File too large',
        message: `File is ${sizeMB}MB. Maximum size is 5MB. Please compress your file.`
      });
    }

    // Convert file buffer to base64 data URL
    const base64 = file.data.toString('base64');
    const fileUrl = `data:${file.mimetype};base64,${base64}`;
    console.log(`Chat file upload: Base64 length: ${fileUrl.length} chars`);

    res.json({
      success: true,
      file: {
        fileName: file.name,
        fileUrl,
        fileSize: file.size,
        fileMimeType: file.mimetype,
      },
    });
  } catch (error: any) {
    console.error('Chat file upload error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

export default router;
