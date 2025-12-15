import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/auth.store';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3000';

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: 'TEXT' | 'FILE' | 'SYSTEM';
  fileName?: string;
  fileUrl?: string;
  fileSize?: number;
  fileMimeType?: string;
  isEdited: boolean;
  isDeleted: boolean;
  replyToId?: string;
  replyTo?: {
    id: string;
    content: string;
    sender: { firstName: string; lastName: string };
  };
  reactions?: Record<string, string[]>;
  createdAt: string;
  sender: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
}

interface TypingUpdate {
  conversationId: string;
  userId: string;
  isTyping: boolean;
}

interface ReadReceipt {
  conversationId: string;
  userId: string;
  messageId: string;
}

interface ConversationRenamed {
  conversationId: string;
  name: string;
  oldName: string | null;
  renamedBy: string;
}

interface UseSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  onlineUsers: Set<string>;
  typingUsers: Map<string, Set<string>>; // conversationId -> Set<userId>
  joinConversation: (conversationId: string) => void;
  leaveConversation: (conversationId: string) => void;
  sendMessage: (data: {
    conversationId: string;
    content: string;
    type?: 'TEXT' | 'FILE' | 'SYSTEM';
    replyToId?: string;
    fileName?: string;
    fileUrl?: string;
    fileSize?: number;
    fileMimeType?: string;
  }) => void;
  startTyping: (conversationId: string) => void;
  stopTyping: (conversationId: string) => void;
  markAsRead: (conversationId: string, messageId: string) => void;
  reactToMessage: (messageId: string, emoji: string) => void;
  onNewMessage: (callback: (message: Message) => void) => () => void;
  onTypingUpdate: (callback: (data: TypingUpdate) => void) => () => void;
  onReadReceipt: (callback: (data: ReadReceipt) => void) => () => void;
  onUserOnline: (callback: (userId: string) => void) => () => void;
  onUserOffline: (callback: (userId: string) => void) => () => void;
  onConversationRenamed: (callback: (data: ConversationRenamed) => void) => () => void;
}

export function useSocket(): UseSocketReturn {
  const { user, token } = useAuthStore();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [typingUsers, setTypingUsers] = useState<Map<string, Set<string>>>(new Map());

  // Callbacks refs to avoid stale closures
  const messageCallbacks = useRef<Set<(message: Message) => void>>(new Set());
  const typingCallbacks = useRef<Set<(data: TypingUpdate) => void>>(new Set());
  const readCallbacks = useRef<Set<(data: ReadReceipt) => void>>(new Set());
  const onlineCallbacks = useRef<Set<(userId: string) => void>>(new Set());
  const offlineCallbacks = useRef<Set<(userId: string) => void>>(new Set());
  const renameCallbacks = useRef<Set<(data: ConversationRenamed) => void>>(new Set());

  useEffect(() => {
    if (!user || !token) {
      console.log('🔌 Socket not connecting:', { hasUser: !!user, hasToken: !!token });
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
      return;
    }
    console.log('🔌 Socket connecting for user:', user.id?.slice(0, 8) + '...');

    // Create socket connection
    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('✅ Socket connected:', socket.id);
      setIsConnected(true);
    });

    socket.on('disconnect', (reason) => {
      console.log('⚠️ Socket disconnected:', reason);
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error.message);
      console.error('   This usually means: not logged in, invalid token, or server unreachable');
      setIsConnected(false);
    });

    // Handle new messages
    socket.on('message:new', (message: Message) => {
      messageCallbacks.current.forEach((cb) => cb(message));
    });

    // Handle typing updates
    socket.on('typing:update', (data: TypingUpdate) => {
      setTypingUsers((prev) => {
        const newMap = new Map(prev);
        const convTyping = newMap.get(data.conversationId) || new Set();

        if (data.isTyping) {
          convTyping.add(data.userId);
        } else {
          convTyping.delete(data.userId);
        }

        if (convTyping.size === 0) {
          newMap.delete(data.conversationId);
        } else {
          newMap.set(data.conversationId, convTyping);
        }

        return newMap;
      });
      typingCallbacks.current.forEach((cb) => cb(data));
    });

    // Handle read receipts
    socket.on('message:read', (data: ReadReceipt) => {
      readCallbacks.current.forEach((cb) => cb(data));
    });

    // Handle message reactions
    socket.on('message:reaction', (data: { messageId: string; reactions: Record<string, string[]> }) => {
      // Handle reaction updates - could emit to callbacks if needed
      console.log('Reaction update:', data);
    });

    // Handle online/offline
    socket.on('user:online', ({ userId }: { userId: string }) => {
      setOnlineUsers((prev) => new Set([...prev, userId]));
      onlineCallbacks.current.forEach((cb) => cb(userId));
    });

    socket.on('user:offline', ({ userId }: { userId: string }) => {
      setOnlineUsers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
      offlineCallbacks.current.forEach((cb) => cb(userId));
    });

    // Handle new conversation
    socket.on('conversation:new', (conversation: unknown) => {
      console.log('New conversation:', conversation);
    });

    // Handle participant left
    socket.on('participant:left', (data: { conversationId: string; userId: string }) => {
      console.log('Participant left:', data);
    });

    // Handle conversation renamed
    socket.on('conversation:renamed', (data: ConversationRenamed) => {
      console.log('Conversation renamed:', data);
      renameCallbacks.current.forEach((cb) => cb(data));
    });

    // Handle errors
    socket.on('error', (error: { message: string }) => {
      console.error('Socket error:', error.message);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user, token]);

  const joinConversation = useCallback((conversationId: string) => {
    socketRef.current?.emit('conversation:join', conversationId);
  }, []);

  const leaveConversation = useCallback((conversationId: string) => {
    socketRef.current?.emit('conversation:leave', conversationId);
  }, []);

  const sendMessage = useCallback((data: {
    conversationId: string;
    content: string;
    type?: 'TEXT' | 'FILE' | 'SYSTEM';
    replyToId?: string;
    fileName?: string;
    fileUrl?: string;
    fileSize?: number;
    fileMimeType?: string;
  }) => {
    socketRef.current?.emit('message:send', data);
  }, []);

  const startTyping = useCallback((conversationId: string) => {
    socketRef.current?.emit('typing:start', conversationId);
  }, []);

  const stopTyping = useCallback((conversationId: string) => {
    socketRef.current?.emit('typing:stop', conversationId);
  }, []);

  const markAsRead = useCallback((conversationId: string, messageId: string) => {
    socketRef.current?.emit('message:read', { conversationId, messageId });
  }, []);

  const reactToMessage = useCallback((messageId: string, emoji: string) => {
    socketRef.current?.emit('message:react', { messageId, emoji });
  }, []);

  // Event subscription helpers
  const onNewMessage = useCallback((callback: (message: Message) => void) => {
    messageCallbacks.current.add(callback);
    return () => {
      messageCallbacks.current.delete(callback);
    };
  }, []);

  const onTypingUpdate = useCallback((callback: (data: TypingUpdate) => void) => {
    typingCallbacks.current.add(callback);
    return () => {
      typingCallbacks.current.delete(callback);
    };
  }, []);

  const onReadReceipt = useCallback((callback: (data: ReadReceipt) => void) => {
    readCallbacks.current.add(callback);
    return () => {
      readCallbacks.current.delete(callback);
    };
  }, []);

  const onUserOnline = useCallback((callback: (userId: string) => void) => {
    onlineCallbacks.current.add(callback);
    return () => {
      onlineCallbacks.current.delete(callback);
    };
  }, []);

  const onUserOffline = useCallback((callback: (userId: string) => void) => {
    offlineCallbacks.current.add(callback);
    return () => {
      offlineCallbacks.current.delete(callback);
    };
  }, []);

  const onConversationRenamed = useCallback((callback: (data: ConversationRenamed) => void) => {
    renameCallbacks.current.add(callback);
    return () => {
      renameCallbacks.current.delete(callback);
    };
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    onlineUsers,
    typingUsers,
    joinConversation,
    leaveConversation,
    sendMessage,
    startTyping,
    stopTyping,
    markAsRead,
    reactToMessage,
    onNewMessage,
    onTypingUpdate,
    onReadReceipt,
    onUserOnline,
    onUserOffline,
    onConversationRenamed,
  };
}
