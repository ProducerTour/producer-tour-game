import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Paperclip, Search, ChevronLeft, Circle, Users, UserPlus, Check, XIcon, Download, FileText, Loader2, UsersRound, Plus, Pencil } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSocket } from '../../hooks/useSocket';
import { useAuthStore } from '../../store/auth.store';
import { api, chatSettingsApi } from '../../lib/api';
import { UserAvatarWithBorder } from '../UserAvatarWithBorder';

// Sound configuration for different notification types
type SoundType = 'chime' | 'pop' | 'ding' | 'bell' | 'subtle';

const SOUND_CONFIGS: Record<SoundType, { frequency: number; duration: number; type: OscillatorType; volume: number; notes?: number[] }> = {
  chime: { frequency: 880, duration: 0.3, type: 'sine', volume: 0.3, notes: [880, 1100] },
  pop: { frequency: 600, duration: 0.15, type: 'sine', volume: 0.25 },
  ding: { frequency: 1200, duration: 0.4, type: 'triangle', volume: 0.25 },
  bell: { frequency: 800, duration: 0.5, type: 'sine', volume: 0.2, notes: [800, 1000, 1200] },
  subtle: { frequency: 440, duration: 0.2, type: 'sine', volume: 0.15 },
};

// Play notification sound using Web Audio API
const playNotificationSound = (soundType: SoundType = 'chime') => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const config = SOUND_CONFIGS[soundType] || SOUND_CONFIGS.chime;
    const notes = config.notes || [config.frequency];

    notes.forEach((freq, index) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = freq;
      oscillator.type = config.type;

      const startTime = audioContext.currentTime + (index * 0.1);
      gainNode.gain.setValueAtTime(config.volume, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + config.duration);

      oscillator.start(startTime);
      oscillator.stop(startTime + config.duration);
    });
  } catch (error) {
    console.warn('Could not play notification sound:', error);
  }
};

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  isOnline?: boolean;
  profilePhotoUrl?: string;
}

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: 'TEXT' | 'FILE' | 'SYSTEM';
  createdAt: string;
  sender: User;
  fileName?: string;
  fileUrl?: string;
  fileSize?: number;
  fileMimeType?: string;
  replyTo?: {
    id: string;
    content: string;
    sender: { firstName: string; lastName: string };
  };
}

interface Conversation {
  id: string;
  type: 'DIRECT' | 'GROUP' | 'SUPPORT';
  name?: string;
  participants: {
    userId: string;
    isAdmin: boolean;
    user: User;
    isOnline?: boolean;
  }[];
  messages: Message[];
  unreadCount: number;
  isPinned: boolean;
  isMuted: boolean;
  updatedAt: string;
}

interface Contact {
  id: string;
  userId: string;
  contactId: string;
  status: 'PENDING' | 'ACCEPTED' | 'BLOCKED';
  nickname?: string;
  contactUser: User;
  isOnline: boolean;
  createdAt: string;
}

interface ContactRequest {
  id: string;
  userId: string;
  requester: User;
  createdAt: string;
}

type TabType = 'chats' | 'contacts';

export function ChatWidget() {
  const { user } = useAuthStore();
  const location = useLocation();

  // Hide chat on landing page and public pages
  const hiddenPaths = ['/', '/login', '/register', '/forgot-password', '/reset-password'];
  const isHiddenPage = hiddenPaths.includes(location.pathname) || location.pathname.startsWith('/writer/');

  // Early return check - before hooks that make API calls
  // CUSTOMER role doesn't have access to chat
  const shouldRender = user && !isHiddenPage && user.role !== 'CUSTOMER';

  const {
    isConnected,
    onlineUsers,
    typingUsers,
    joinConversation,
    sendMessage: socketSendMessage,
    startTyping,
    stopTyping,
    markAsRead,
    onNewMessage,
    onConversationRenamed,
  } = useSocket();

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('chats');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [showNewChat, setShowNewChat] = useState(false);
  const [totalUnread, setTotalUnread] = useState(0);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactRequests, setContactRequests] = useState<ContactRequest[]>([]);

  // Chat settings state
  const [chatSoundEnabled, setChatSoundEnabled] = useState(true);
  const [chatSoundType, setChatSoundType] = useState<SoundType>('chime');
  const [chatDesktopNotifications, setChatDesktopNotifications] = useState(true);
  const [chatMessagePreview, setChatMessagePreview] = useState(true);

  // Group chat state
  const [isGroupMode, setIsGroupMode] = useState(false);
  const [selectedParticipants, setSelectedParticipants] = useState<User[]>([]);
  const [groupName, setGroupName] = useState('');

  // Rename group chat state
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Fetch conversations
  useEffect(() => {
    if (!isOpen || !user || !shouldRender) return;

    const fetchConversations = async () => {
      try {
        const { data } = await api.get('/chat/conversations');
        setConversations(data);
        setTotalUnread(data.reduce((acc: number, c: Conversation) => acc + c.unreadCount, 0));
      } catch (error) {
        console.error('Failed to fetch conversations:', error);
      }
    };

    fetchConversations();
  }, [isOpen, user, shouldRender]);

  // Fetch contacts and requests
  useEffect(() => {
    if (!isOpen || !user || !shouldRender) return;

    const fetchContacts = async () => {
      try {
        const [contactsRes, requestsRes] = await Promise.all([
          api.get('/contacts'),
          api.get('/contacts/requests'),
        ]);
        setContacts(contactsRes.data);
        setContactRequests(requestsRes.data);
      } catch (error) {
        console.error('Failed to fetch contacts:', error);
      }
    };

    fetchContacts();
  }, [isOpen, user, shouldRender]);

  // Fetch chat settings - only for users who can use chat
  useEffect(() => {
    if (!user || !shouldRender) return;

    const fetchChatSettings = async () => {
      try {
        const { data } = await chatSettingsApi.getSettings();
        setChatSoundEnabled(data.chatSoundEnabled ?? true);
        setChatSoundType((data.chatSoundType as SoundType) ?? 'chime');
        setChatDesktopNotifications(data.chatDesktopNotifications ?? true);
        setChatMessagePreview(data.chatMessagePreview ?? true);
      } catch (error) {
        console.error('Failed to fetch chat settings:', error);
      }
    };

    fetchChatSettings();
  }, [user, shouldRender]);

  // Subscribe to new messages
  useEffect(() => {
    const unsubscribe = onNewMessage((message) => {
      // Update messages if in active conversation
      if (activeConversation?.id === message.conversationId) {
        setMessages((prev) => [...prev, message]);
        // Mark as read if chat is open
        markAsRead(message.conversationId, message.id);
      }

      // Update conversation list
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === message.conversationId
            ? {
                ...conv,
                messages: [message],
                unreadCount:
                  activeConversation?.id === message.conversationId
                    ? 0
                    : conv.unreadCount + 1,
                updatedAt: message.createdAt,
              }
            : conv
        )
      );

      // Update total unread and play notification sound
      if (activeConversation?.id !== message.conversationId && message.senderId !== user?.id) {
        setTotalUnread((prev) => prev + 1);

        // Play notification sound if enabled
        if (chatSoundEnabled) {
          playNotificationSound(chatSoundType);
        }

        // Show desktop notification if enabled and browser supports it
        if (chatDesktopNotifications && 'Notification' in window && Notification.permission === 'granted') {
          const sender = message.sender;
          const senderName = sender ? `${sender.firstName} ${sender.lastName}` : 'New message';
          const body = chatMessagePreview ? message.content : 'You have a new message';

          new Notification(senderName, {
            body,
            icon: '/favicon.ico',
            tag: message.conversationId,
          });
        }
      }
    });

    return unsubscribe;
  }, [activeConversation, onNewMessage, markAsRead, chatSoundEnabled, chatSoundType, chatDesktopNotifications, chatMessagePreview, user?.id]);

  // Join active conversation room
  useEffect(() => {
    if (activeConversation) {
      joinConversation(activeConversation.id);
      fetchMessages(activeConversation.id);
    }
  }, [activeConversation, joinConversation]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Listen for conversation rename events
  useEffect(() => {
    const unsubscribe = onConversationRenamed((data) => {
      // Update conversations list
      setConversations((prev) =>
        prev.map((c) => (c.id === data.conversationId ? { ...c, name: data.name } : c))
      );

      // Update active conversation if it's the one being renamed
      if (activeConversation?.id === data.conversationId) {
        setActiveConversation((prev) => (prev ? { ...prev, name: data.name } : prev));
      }
    });

    return unsubscribe;
  }, [activeConversation, onConversationRenamed]);

  const fetchMessages = async (conversationId: string) => {
    setIsLoading(true);
    try {
      const { data } = await api.get(`/chat/conversations/${conversationId}`);
      setMessages(data.messages);
      // Mark as read
      if (data.messages.length > 0) {
        markAsRead(conversationId, data.messages[data.messages.length - 1].id);
      }
      // Update unread count
      setConversations((prev) =>
        prev.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c))
      );
      setTotalUnread((prev) => Math.max(0, prev - (activeConversation?.unreadCount || 0)));
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !activeConversation) return;

    socketSendMessage({
      conversationId: activeConversation.id,
      content: newMessage.trim(),
      type: 'TEXT',
    });

    setNewMessage('');
    stopTyping(activeConversation.id);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);

    if (!activeConversation) return;

    // Handle typing indicator
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    startTyping(activeConversation.id);

    typingTimeoutRef.current = setTimeout(() => {
      stopTyping(activeConversation.id);
    }, 2000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeConversation) return;

    setIsUploading(true);
    try {
      // Upload file
      const formData = new FormData();
      formData.append('file', file);

      const { data } = await api.post('/chat/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (data.success) {
        // Send message with file
        socketSendMessage({
          conversationId: activeConversation.id,
          content: file.name,
          type: 'FILE',
          fileName: data.file.fileName,
          fileUrl: data.file.fileUrl,
          fileSize: data.file.fileSize,
          fileMimeType: data.file.fileMimeType,
        });
        toast.success('File sent');
      }
    } catch (error: any) {
      console.error('Failed to upload file:', error);
      toast.error(error.response?.data?.error || 'Failed to upload file');
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isImageFile = (mimeType?: string) => {
    return mimeType?.startsWith('image/');
  };

  const searchUsers = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const { data } = await api.get(`/chat/users/search?q=${encodeURIComponent(query)}`);
      setSearchResults(data);
    } catch (error) {
      console.error('Failed to search users:', error);
    }
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchUsers(searchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, searchUsers]);

  const startNewConversation = async (targetUser: User) => {
    try {
      const { data } = await api.post('/chat/conversations', {
        type: 'DIRECT',
        participantIds: [targetUser.id],
      });

      setConversations((prev) => {
        const exists = prev.find((c) => c.id === data.id);
        if (exists) return prev;
        return [data, ...prev];
      });

      setActiveConversation(data);
      setShowNewChat(false);
      setSearchQuery('');
    } catch (error: any) {
      console.error('Failed to start conversation:', error);
      toast.error(error.response?.data?.error || 'Failed to start conversation');
    }
  };

  const toggleParticipant = (targetUser: User) => {
    setSelectedParticipants((prev) => {
      const exists = prev.find((p) => p.id === targetUser.id);
      if (exists) {
        return prev.filter((p) => p.id !== targetUser.id);
      }
      return [...prev, targetUser];
    });
  };

  const createGroupChat = async () => {
    if (selectedParticipants.length < 2) {
      toast.error('Select at least 2 participants for a group chat');
      return;
    }

    try {
      const { data } = await api.post('/chat/conversations', {
        type: 'GROUP',
        name: groupName.trim() || `Group (${selectedParticipants.length + 1})`,
        participantIds: selectedParticipants.map((p) => p.id),
      });

      setConversations((prev) => [data, ...prev]);
      setActiveConversation(data);
      resetNewChatState();
      toast.success('Group chat created!');
    } catch (error: any) {
      console.error('Failed to create group chat:', error);
      toast.error(error.response?.data?.error || 'Failed to create group chat');
    }
  };

  const resetNewChatState = () => {
    setShowNewChat(false);
    setIsGroupMode(false);
    setSelectedParticipants([]);
    setGroupName('');
    setSearchQuery('');
  };

  const getOtherParticipant = (conv: Conversation) => {
    const other = conv.participants.find((p) => p.userId !== user?.id);
    return other?.user;
  };

  const getConversationName = (conv: Conversation) => {
    if (conv.name) return conv.name;
    if (conv.type === 'DIRECT') {
      const other = getOtherParticipant(conv);
      return other ? `${other.firstName} ${other.lastName}` : 'Unknown';
    }
    return 'Group Chat';
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getTypingIndicator = (conversationId: string) => {
    const typing = typingUsers.get(conversationId);
    if (!typing || typing.size === 0) return null;

    const typingUserIds = Array.from(typing).filter((id) => id !== user?.id);
    if (typingUserIds.length === 0) return null;

    return 'typing...';
  };

  const handleBack = useCallback(async () => {
    setActiveConversation(null);
    setMessages([]);
    // Refresh conversation list
    try {
      const { data } = await api.get('/chat/conversations');
      setConversations(data);
      setTotalUnread(data.reduce((acc: number, c: Conversation) => acc + c.unreadCount, 0));
    } catch (error) {
      console.error('Failed to refresh conversations:', error);
    }
  }, []);

  const sendContactRequest = async (contactId: string) => {
    try {
      await api.post('/contacts/request', { contactId });
      toast.success('Friend request sent!');
      // Refresh contacts
      const [contactsRes, requestsRes] = await Promise.all([
        api.get('/contacts'),
        api.get('/contacts/requests'),
      ]);
      setContacts(contactsRes.data);
      setContactRequests(requestsRes.data);
    } catch (error: any) {
      console.error('Failed to send contact request:', error);
      toast.error(error.response?.data?.error || 'Failed to send friend request');
    }
  };

  const acceptContactRequest = async (contactId: string) => {
    try {
      await api.post(`/contacts/accept/${contactId}`);
      toast.success('Friend request accepted!');
      // Refresh contacts
      const [contactsRes, requestsRes] = await Promise.all([
        api.get('/contacts'),
        api.get('/contacts/requests'),
      ]);
      setContacts(contactsRes.data);
      setContactRequests(requestsRes.data);
    } catch (error: any) {
      console.error('Failed to accept contact request:', error);
      toast.error(error.response?.data?.error || 'Failed to accept request');
    }
  };

  const declineContactRequest = async (contactId: string) => {
    try {
      await api.delete(`/contacts/${contactId}`);
      toast.success('Request declined');
      // Refresh contacts
      const [contactsRes, requestsRes] = await Promise.all([
        api.get('/contacts'),
        api.get('/contacts/requests'),
      ]);
      setContacts(contactsRes.data);
      setContactRequests(requestsRes.data);
    } catch (error: any) {
      console.error('Failed to decline contact request:', error);
      toast.error(error.response?.data?.error || 'Failed to decline request');
    }
  };

  const startRenaming = () => {
    if (activeConversation) {
      setRenameValue(activeConversation.name || '');
      setIsRenaming(true);
      setTimeout(() => renameInputRef.current?.focus(), 100);
    }
  };

  const cancelRenaming = () => {
    setIsRenaming(false);
    setRenameValue('');
  };

  const handleRenameSubmit = async () => {
    if (!activeConversation || !renameValue.trim()) {
      cancelRenaming();
      return;
    }

    try {
      const { data } = await api.patch(`/chat/conversations/${activeConversation.id}/rename`, {
        name: renameValue.trim(),
      });

      // Update active conversation
      setActiveConversation(data);

      // Update conversations list
      setConversations((prev) =>
        prev.map((c) => (c.id === data.id ? { ...c, name: data.name } : c))
      );

      toast.success('Group renamed!');
      cancelRenaming();
    } catch (error: any) {
      console.error('Failed to rename conversation:', error);
      toast.error(error.response?.data?.error || 'Failed to rename group');
    }
  };

  const handleRenameKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleRenameSubmit();
    } else if (e.key === 'Escape') {
      cancelRenaming();
    }
  };

  // Check if current user is admin of the conversation
  const isConversationAdmin = (conv: Conversation) => {
    return conv.participants.some((p) => p.userId === user?.id && p.isAdmin);
  };

  const isContact = (userId: string) => {
    return contacts.some((c) => c.contactId === userId && c.status === 'ACCEPTED');
  };

  const hasPendingRequest = (userId: string) => {
    return contacts.some((c) => c.contactId === userId && c.status === 'PENDING');
  };

  // Don't render on landing/public pages, if not logged in, or for CUSTOMER role
  if (!shouldRender) return null;

  return (
    <>
      {/* Chat Button */}
      <motion.button
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full shadow-lg flex items-center justify-center text-white hover:shadow-xl transition-shadow"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
      >
        <MessageCircle className="w-6 h-6" />
        {totalUnread > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center font-bold">
            {totalUnread > 9 ? '9+' : totalUnread}
          </span>
        )}
      </motion.button>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-6 z-50 w-96 h-[32rem] bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b border-slate-700 flex items-center justify-between bg-slate-800/50">
              {activeConversation ? (
                <>
                  <button
                    onClick={() => {
                      cancelRenaming();
                      handleBack();
                    }}
                    className="p-1 hover:bg-slate-700 rounded-lg transition"
                  >
                    <ChevronLeft className="w-5 h-5 text-slate-400" />
                  </button>
                  <div className="flex-1 ml-2">
                    {isRenaming && activeConversation.type === 'GROUP' ? (
                      <div className="flex items-center gap-2">
                        <input
                          ref={renameInputRef}
                          type="text"
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={handleRenameKeyPress}
                          onBlur={() => setTimeout(cancelRenaming, 200)}
                          className="flex-1 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                          placeholder="Group name..."
                          maxLength={100}
                        />
                        <button
                          onClick={handleRenameSubmit}
                          className="p-1 hover:bg-green-500/20 rounded transition"
                        >
                          <Check className="w-4 h-4 text-green-400" />
                        </button>
                        <button
                          onClick={cancelRenaming}
                          className="p-1 hover:bg-red-500/20 rounded transition"
                        >
                          <XIcon className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div>
                          <h3 className="font-semibold text-white text-sm">
                            {getConversationName(activeConversation)}
                          </h3>
                          <p className="text-xs text-slate-400">
                            {getTypingIndicator(activeConversation.id) ||
                              (activeConversation.type === 'GROUP'
                                ? `${activeConversation.participants.length} members`
                                : onlineUsers.has(getOtherParticipant(activeConversation)?.id || '')
                                  ? 'Online'
                                  : 'Offline')}
                          </p>
                        </div>
                        {/* Rename button for group chats (admin only) */}
                        {activeConversation.type === 'GROUP' && isConversationAdmin(activeConversation) && (
                          <button
                            onClick={startRenaming}
                            className="p-1 hover:bg-slate-700 rounded-lg transition"
                            title="Rename group"
                          >
                            <Pencil className="w-3.5 h-3.5 text-slate-400 hover:text-white" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  {/* Add as friend button */}
                  {activeConversation.type === 'DIRECT' && (() => {
                    const otherUser = getOtherParticipant(activeConversation);
                    if (!otherUser) return null;
                    const isAlreadyContact = isContact(otherUser.id);
                    const isPending = hasPendingRequest(otherUser.id);

                    if (isAlreadyContact) {
                      return (
                        <div className="p-1.5 text-green-400" title="Already a contact">
                          <Check className="w-4 h-4" />
                        </div>
                      );
                    }

                    if (isPending) {
                      return (
                        <span className="text-xs text-yellow-400 px-2">Pending</span>
                      );
                    }

                    return (
                      <button
                        onClick={() => sendContactRequest(otherUser.id)}
                        className="p-1.5 bg-green-500/20 hover:bg-green-500/30 rounded-lg transition"
                        title="Add as friend"
                      >
                        <UserPlus className="w-4 h-4 text-green-400" />
                      </button>
                    );
                  })()}
                </>
              ) : (
                <>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setActiveTab('chats')}
                      className={`px-3 py-1 text-sm font-medium rounded-lg transition ${
                        activeTab === 'chats'
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <MessageCircle className="w-4 h-4 inline mr-1" />
                      Chats
                    </button>
                    <button
                      onClick={() => setActiveTab('contacts')}
                      className={`px-3 py-1 text-sm font-medium rounded-lg transition relative ${
                        activeTab === 'contacts'
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Users className="w-4 h-4 inline mr-1" />
                      Contacts
                      {contactRequests.length > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-xs flex items-center justify-center text-white">
                          {contactRequests.length}
                        </span>
                      )}
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Circle
                      className={`w-2 h-2 ${isConnected ? 'fill-green-500 text-green-500' : 'fill-red-500 text-red-500'}`}
                    />
                  </div>
                </>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-slate-700 rounded-lg transition"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden flex flex-col">
              {!activeConversation ? (
                activeTab === 'chats' ? (
                  // Conversation List
                  <div className="flex-1 overflow-y-auto">
                    {/* New Chat Button */}
                    <div className="p-3">
                      {showNewChat ? (
                        <div className="space-y-3">
                          {/* Toggle between direct and group chat */}
                          <div className="flex gap-2">
                            <button
                              onClick={() => setIsGroupMode(false)}
                              className={`flex-1 py-2 text-xs font-medium rounded-lg transition ${
                                !isGroupMode
                                  ? 'bg-blue-500 text-white'
                                  : 'bg-slate-700 text-slate-400 hover:text-white'
                              }`}
                            >
                              <MessageCircle className="w-3 h-3 inline mr-1" />
                              Direct
                            </button>
                            <button
                              onClick={() => setIsGroupMode(true)}
                              className={`flex-1 py-2 text-xs font-medium rounded-lg transition ${
                                isGroupMode
                                  ? 'bg-purple-500 text-white'
                                  : 'bg-slate-700 text-slate-400 hover:text-white'
                              }`}
                            >
                              <UsersRound className="w-3 h-3 inline mr-1" />
                              Group
                            </button>
                          </div>

                          {/* Group name input (only in group mode) */}
                          {isGroupMode && (
                            <input
                              type="text"
                              placeholder="Group name..."
                              value={groupName}
                              onChange={(e) => setGroupName(e.target.value)}
                              className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                            />
                          )}

                          {/* Selected participants (group mode) */}
                          {isGroupMode && selectedParticipants.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {selectedParticipants.map((p) => (
                                <span
                                  key={p.id}
                                  className="inline-flex items-center gap-1 px-2 py-1 bg-purple-500/20 text-purple-300 rounded-full text-xs"
                                >
                                  {p.firstName}
                                  <button
                                    onClick={() => toggleParticipant(p)}
                                    className="hover:text-red-400"
                                  >
                                    <XIcon className="w-3 h-3" />
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Search input */}
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input
                              type="text"
                              placeholder="Search users..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                              autoFocus
                            />
                          </div>

                          {/* Search results */}
                          {searchResults.length > 0 && (
                            <div className="bg-slate-800 rounded-lg border border-slate-700 max-h-48 overflow-y-auto">
                              {searchResults.map((u) => {
                                const isSelected = selectedParticipants.some((p) => p.id === u.id);
                                return (
                                  <div
                                    key={u.id}
                                    className={`w-full p-3 flex items-center gap-3 hover:bg-slate-700 transition ${
                                      isSelected ? 'bg-purple-500/10' : ''
                                    }`}
                                  >
                                    <button
                                      onClick={() => isGroupMode ? toggleParticipant(u) : startNewConversation(u)}
                                      className="flex items-center gap-3 flex-1 text-left"
                                    >
                                      {u.profilePhotoUrl ? (
                                        <img
                                          src={u.profilePhotoUrl}
                                          alt={`${u.firstName} ${u.lastName}`}
                                          className={`w-8 h-8 rounded-full object-cover ${isSelected ? 'ring-2 ring-purple-500' : ''}`}
                                        />
                                      ) : (
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                                          isSelected ? 'bg-purple-500/30 text-purple-300' : 'bg-blue-500/20 text-blue-400'
                                        }`}>
                                          {u.firstName?.[0]}
                                          {u.lastName?.[0]}
                                        </div>
                                      )}
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-white truncate">
                                          {u.firstName} {u.lastName}
                                        </p>
                                        <p className="text-xs text-slate-500 truncate">{u.role}</p>
                                      </div>
                                      {u.isOnline && <Circle className="w-2 h-2 fill-green-500 text-green-500" />}
                                    </button>
                                    {isGroupMode ? (
                                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                                        isSelected ? 'bg-purple-500 border-purple-500' : 'border-slate-500'
                                      }`}>
                                        {isSelected && <Check className="w-3 h-3 text-white" />}
                                      </div>
                                    ) : (
                                      <>
                                        {!isContact(u.id) && !hasPendingRequest(u.id) && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              sendContactRequest(u.id);
                                            }}
                                            className="p-1.5 bg-green-500/20 hover:bg-green-500/30 rounded-lg transition"
                                            title="Add as contact"
                                          >
                                            <UserPlus className="w-4 h-4 text-green-400" />
                                          </button>
                                        )}
                                        {hasPendingRequest(u.id) && (
                                          <span className="text-xs text-yellow-400">Pending</span>
                                        )}
                                        {isContact(u.id) && (
                                          <Check className="w-4 h-4 text-green-400" />
                                        )}
                                      </>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Create group button */}
                          {isGroupMode && selectedParticipants.length >= 2 && (
                            <button
                              onClick={createGroupChat}
                              className="w-full py-2 bg-purple-500 text-white rounded-lg text-sm font-medium hover:bg-purple-600 transition"
                            >
                              Create Group ({selectedParticipants.length + 1} members)
                            </button>
                          )}

                          {isGroupMode && selectedParticipants.length < 2 && selectedParticipants.length > 0 && (
                            <p className="text-xs text-slate-500 text-center">
                              Select at least 2 participants for a group chat
                            </p>
                          )}

                          <button
                            onClick={resetNewChatState}
                            className="w-full py-2 text-sm text-slate-400 hover:text-white transition"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowNewChat(true)}
                          className="w-full py-2 bg-blue-500/10 border border-blue-500/30 rounded-lg text-blue-400 text-sm font-medium hover:bg-blue-500/20 transition flex items-center justify-center gap-2"
                        >
                          <Plus className="w-4 h-4" />
                          New Conversation
                        </button>
                      )}
                    </div>

                    {/* Conversations */}
                    {conversations.map((conv) => {
                      const otherUser = conv.type === 'DIRECT' ? getOtherParticipant(conv) : null;
                      return (
                      <button
                        key={conv.id}
                        onClick={() => setActiveConversation(conv)}
                        className="w-full p-3 flex items-center gap-3 hover:bg-slate-800 transition border-b border-slate-800"
                      >
                        {conv.type === 'DIRECT' && otherUser ? (
                          <UserAvatarWithBorder
                            userId={otherUser.id}
                            firstName={otherUser.firstName}
                            lastName={otherUser.lastName}
                            profilePhotoUrl={otherUser.profilePhotoUrl}
                            size="sm"
                            showOnlineIndicator
                            isOnline={onlineUsers.has(otherUser.id)}
                          />
                        ) : (
                          <div className="relative">
                            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 text-sm font-medium">
                              {getConversationName(conv).slice(0, 2).toUpperCase()}
                            </div>
                          </div>
                        )}
                        <div className="flex-1 min-w-0 text-left">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-white truncate">
                              {getConversationName(conv)}
                            </p>
                            <span className="text-xs text-slate-500">
                              {formatTime(conv.updatedAt)}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 truncate">
                            {conv.messages[0]?.content || 'No messages yet'}
                          </p>
                        </div>
                        {conv.unreadCount > 0 && (
                          <span className="w-5 h-5 bg-blue-500 rounded-full text-xs flex items-center justify-center text-white font-bold">
                            {conv.unreadCount}
                          </span>
                        )}
                      </button>
                      );
                    })}

                    {conversations.length === 0 && !showNewChat && (
                      <div className="p-8 text-center">
                        <MessageCircle className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                        <p className="text-slate-500 text-sm">No conversations yet</p>
                        <p className="text-slate-600 text-xs mt-1">
                          Start a new chat to connect with others
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  // Contacts Tab
                  <div className="flex-1 overflow-y-auto">
                    {/* Pending Contact Requests */}
                    {contactRequests.length > 0 && (
                      <div className="p-3 border-b border-slate-700">
                        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                          Pending Requests ({contactRequests.length})
                        </h4>
                        {contactRequests.map((request) => (
                          <div
                            key={request.id}
                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800 transition"
                          >
                            <UserAvatarWithBorder
                              userId={request.requester.id}
                              firstName={request.requester.firstName}
                              lastName={request.requester.lastName}
                              profilePhotoUrl={request.requester.profilePhotoUrl}
                              size="sm"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-white truncate">
                                {request.requester.firstName} {request.requester.lastName}
                              </p>
                              <p className="text-xs text-slate-500 truncate">
                                {request.requester.role}
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => acceptContactRequest(request.requester.id)}
                                className="p-1.5 bg-green-500/20 hover:bg-green-500/30 rounded-lg transition"
                                title="Accept"
                              >
                                <Check className="w-4 h-4 text-green-400" />
                              </button>
                              <button
                                onClick={() => declineContactRequest(request.requester.id)}
                                className="p-1.5 bg-red-500/20 hover:bg-red-500/30 rounded-lg transition"
                                title="Decline"
                              >
                                <XIcon className="w-4 h-4 text-red-400" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Contacts List */}
                    <div className="p-3">
                      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                        My Contacts ({contacts.filter((c) => c.status === 'ACCEPTED').length})
                      </h4>
                      {contacts
                        .filter((c) => c.status === 'ACCEPTED')
                        .map((contact) => (
                          <button
                            key={contact.id}
                            onClick={() => startNewConversation(contact.contactUser)}
                            className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800 transition"
                          >
                            <UserAvatarWithBorder
                              userId={contact.contactUser.id}
                              firstName={contact.contactUser.firstName}
                              lastName={contact.contactUser.lastName}
                              profilePhotoUrl={contact.contactUser.profilePhotoUrl}
                              size="sm"
                              showOnlineIndicator
                              isOnline={contact.isOnline}
                            />
                            <div className="flex-1 min-w-0 text-left">
                              <p className="text-sm font-medium text-white truncate">
                                {contact.nickname ||
                                  `${contact.contactUser.firstName} ${contact.contactUser.lastName}`}
                              </p>
                              <p className="text-xs text-slate-500 truncate">
                                {contact.contactUser.role}
                              </p>
                            </div>
                            <MessageCircle className="w-4 h-4 text-slate-500" />
                          </button>
                        ))}

                      {contacts.filter((c) => c.status === 'ACCEPTED').length === 0 && (
                        <div className="p-8 text-center">
                          <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                          <p className="text-slate-500 text-sm">No contacts yet</p>
                          <p className="text-slate-600 text-xs mt-1">
                            Search for users and add them as contacts
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )
              ) : (
                // Messages View
                <>
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {isLoading ? (
                      <div className="flex items-center justify-center h-full">
                        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : (
                      <>
                        {messages.map((msg) => (
                          <div
                            key={msg.id}
                            className={`flex ${msg.senderId === user?.id ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                                msg.type === 'SYSTEM'
                                  ? 'bg-slate-800 text-slate-400 text-xs text-center w-full'
                                  : msg.senderId === user?.id
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-slate-700 text-white'
                              }`}
                            >
                              {msg.type !== 'SYSTEM' && msg.senderId !== user?.id && (
                                <p className="text-xs text-blue-300 mb-1">
                                  {msg.sender.firstName}
                                </p>
                              )}
                              {msg.type === 'FILE' && msg.fileUrl ? (
                                <div className="space-y-2">
                                  {isImageFile(msg.fileMimeType) ? (
                                    <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer">
                                      <img
                                        src={msg.fileUrl}
                                        alt={msg.fileName || 'Image'}
                                        className="max-w-full rounded-lg max-h-48 object-contain"
                                      />
                                    </a>
                                  ) : (
                                    <a
                                      href={msg.fileUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-2 p-2 bg-black/20 rounded-lg hover:bg-black/30 transition"
                                    >
                                      <FileText className="w-8 h-8 flex-shrink-0" />
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{msg.fileName}</p>
                                        {msg.fileSize && (
                                          <p className="text-xs opacity-75">{formatFileSize(msg.fileSize)}</p>
                                        )}
                                      </div>
                                      <Download className="w-4 h-4 flex-shrink-0" />
                                    </a>
                                  )}
                                </div>
                              ) : (
                                <p className="text-sm break-words">{msg.content}</p>
                              )}
                              <p
                                className={`text-xs mt-1 ${
                                  msg.senderId === user?.id ? 'text-blue-200' : 'text-slate-400'
                                }`}
                              >
                                {formatTime(msg.createdAt)}
                              </p>
                            </div>
                          </div>
                        ))}
                        <div ref={messagesEndRef} />
                      </>
                    )}
                  </div>

                  {/* Input */}
                  <div className="p-3 border-t border-slate-700 bg-slate-800/50">
                    <div className="flex items-center gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        onChange={handleFileSelect}
                        className="hidden"
                        accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,audio/*,video/*"
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="p-2 hover:bg-slate-700 rounded-lg transition text-slate-400 hover:text-white disabled:opacity-50"
                        title="Attach file"
                      >
                        {isUploading ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Paperclip className="w-5 h-5" />
                        )}
                      </button>
                      <input
                        ref={inputRef}
                        type="text"
                        value={newMessage}
                        onChange={handleInputChange}
                        onKeyPress={handleKeyPress}
                        placeholder="Type a message..."
                        className="flex-1 bg-slate-700 border-none rounded-lg px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim()}
                        className="p-2 bg-blue-500 hover:bg-blue-600 rounded-lg transition text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Send className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
