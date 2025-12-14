// Social Store - friends, parties, and social features
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Player {
  id: string;
  username: string;
  avatar?: string;
  level: number;
  status: 'online' | 'offline' | 'away' | 'busy' | 'in-game';
  currentActivity?: string;
  lastSeen?: number;
}

export interface FriendRequest {
  id: string;
  from: Player;
  timestamp: number;
  message?: string;
}

export interface PartyMember extends Player {
  role: 'leader' | 'member';
  isReady: boolean;
}

export interface Party {
  id: string;
  name: string;
  members: PartyMember[];
  maxMembers: number;
  isPublic: boolean;
  activity?: string;
  createdAt: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: number;
  type: 'text' | 'system' | 'emote';
  channel: 'global' | 'party' | 'whisper' | 'local';
}

interface SocialState {
  // Current player
  myProfile: Player | null;

  // Friends
  friends: Map<string, Player>;
  friendRequests: FriendRequest[];
  blockedPlayers: Set<string>;

  // Party
  currentParty: Party | null;
  partyInvites: Array<{ partyId: string; from: Player; timestamp: number }>;

  // Chat
  chatMessages: Map<string, ChatMessage[]>; // channel -> messages
  activeChannel: string;
  unreadCounts: Map<string, number>;

  // Online players nearby
  nearbyPlayers: Player[];

  // Profile actions
  setProfile: (profile: Player) => void;
  updateStatus: (status: Player['status']) => void;

  // Friend actions
  sendFriendRequest: (playerId: string) => void;
  acceptFriendRequest: (requestId: string) => void;
  declineFriendRequest: (requestId: string) => void;
  removeFriend: (playerId: string) => void;
  blockPlayer: (playerId: string) => void;
  unblockPlayer: (playerId: string) => void;

  // Party actions
  createParty: (name: string, maxMembers?: number) => void;
  inviteToParty: (playerId: string) => void;
  acceptPartyInvite: (partyId: string) => void;
  declinePartyInvite: (partyId: string) => void;
  leaveParty: () => void;
  kickFromParty: (playerId: string) => void;
  promoteToLeader: (playerId: string) => void;
  setPartyReady: (ready: boolean) => void;

  // Chat actions
  sendMessage: (content: string, channel?: string, targetId?: string) => void;
  setActiveChannel: (channel: string) => void;
  markChannelRead: (channel: string) => void;

  // Updates from server
  updateFriendStatus: (playerId: string, status: Player['status']) => void;
  receiveFriendRequest: (request: FriendRequest) => void;
  receivePartyInvite: (partyId: string, from: Player) => void;
  receiveMessage: (message: ChatMessage) => void;
  updateParty: (party: Party) => void;
  updateNearbyPlayers: (players: Player[]) => void;

  // Queries
  isFriend: (playerId: string) => boolean;
  isBlocked: (playerId: string) => boolean;
  isInParty: () => boolean;
  isPartyLeader: () => boolean;
  getOnlineFriends: () => Player[];

  // Utility
  reset: () => void;
}

export const useSocialStore = create<SocialState>()(
  persist(
    (set, get) => ({
      myProfile: null,
      friends: new Map(),
      friendRequests: [],
      blockedPlayers: new Set(),
      currentParty: null,
      partyInvites: [],
      chatMessages: new Map([
        ['global', []],
        ['party', []],
        ['local', []],
      ]),
      activeChannel: 'global',
      unreadCounts: new Map(),
      nearbyPlayers: [],

      setProfile: (profile) => set({ myProfile: profile }),

      updateStatus: (status) => {
        set((s) => ({
          myProfile: s.myProfile ? { ...s.myProfile, status } : null,
        }));
      },

      sendFriendRequest: (playerId) => {
        // Would send via network
        console.log(`📤 Sending friend request to ${playerId}`);
      },

      acceptFriendRequest: (requestId) => {
        const request = get().friendRequests.find((r) => r.id === requestId);
        if (!request) return;

        set((s) => {
          const newFriends = new Map(s.friends);
          newFriends.set(request.from.id, request.from);

          return {
            friends: newFriends,
            friendRequests: s.friendRequests.filter((r) => r.id !== requestId),
          };
        });

        console.log(`✅ Accepted friend request from ${request.from.username}`);
      },

      declineFriendRequest: (requestId) => {
        set((s) => ({
          friendRequests: s.friendRequests.filter((r) => r.id !== requestId),
        }));
      },

      removeFriend: (playerId) => {
        set((s) => {
          const newFriends = new Map(s.friends);
          newFriends.delete(playerId);
          return { friends: newFriends };
        });
      },

      blockPlayer: (playerId) => {
        set((s) => {
          const newBlocked = new Set(s.blockedPlayers);
          newBlocked.add(playerId);

          // Also remove from friends
          const newFriends = new Map(s.friends);
          newFriends.delete(playerId);

          return {
            blockedPlayers: newBlocked,
            friends: newFriends,
          };
        });
      },

      unblockPlayer: (playerId) => {
        set((s) => {
          const newBlocked = new Set(s.blockedPlayers);
          newBlocked.delete(playerId);
          return { blockedPlayers: newBlocked };
        });
      },

      createParty: (name, maxMembers = 4) => {
        const { myProfile } = get();
        if (!myProfile || get().currentParty) return;

        const party: Party = {
          id: `party-${Date.now()}`,
          name,
          members: [
            {
              ...myProfile,
              role: 'leader',
              isReady: true,
            },
          ],
          maxMembers,
          isPublic: false,
          createdAt: Date.now(),
        };

        set({ currentParty: party });
        console.log(`🎉 Created party: ${name}`);
      },

      inviteToParty: (playerId) => {
        const { currentParty } = get();
        if (!currentParty) return;

        // Would send via network
        console.log(`📤 Inviting ${playerId} to party`);
      },

      acceptPartyInvite: (partyId) => {
        const invite = get().partyInvites.find((i) => i.partyId === partyId);
        if (!invite) return;

        set((s) => ({
          partyInvites: s.partyInvites.filter((i) => i.partyId !== partyId),
        }));

        // Would join via network
        console.log(`✅ Accepted party invite`);
      },

      declinePartyInvite: (partyId) => {
        set((s) => ({
          partyInvites: s.partyInvites.filter((i) => i.partyId !== partyId),
        }));
      },

      leaveParty: () => {
        set({ currentParty: null });
        console.log(`👋 Left party`);
      },

      kickFromParty: (playerId) => {
        const { currentParty, myProfile } = get();
        if (!currentParty || !myProfile) return;

        // Check if leader
        const me = currentParty.members.find((m) => m.id === myProfile.id);
        if (me?.role !== 'leader') return;

        set((s) => {
          if (!s.currentParty) return s;

          return {
            currentParty: {
              ...s.currentParty,
              members: s.currentParty.members.filter((m) => m.id !== playerId),
            },
          };
        });
      },

      promoteToLeader: (playerId) => {
        const { currentParty, myProfile } = get();
        if (!currentParty || !myProfile) return;

        set((s) => {
          if (!s.currentParty) return s;

          return {
            currentParty: {
              ...s.currentParty,
              members: s.currentParty.members.map((m) => ({
                ...m,
                role: m.id === playerId ? 'leader' : 'member',
              })),
            },
          };
        });
      },

      setPartyReady: (ready) => {
        const { currentParty, myProfile } = get();
        if (!currentParty || !myProfile) return;

        set((s) => {
          if (!s.currentParty) return s;

          return {
            currentParty: {
              ...s.currentParty,
              members: s.currentParty.members.map((m) =>
                m.id === myProfile.id ? { ...m, isReady: ready } : m
              ),
            },
          };
        });
      },

      sendMessage: (content, channel = get().activeChannel, _targetId) => {
        const { myProfile } = get();
        if (!myProfile) return;

        const message: ChatMessage = {
          id: `msg-${Date.now()}`,
          senderId: myProfile.id,
          senderName: myProfile.username,
          content,
          timestamp: Date.now(),
          type: content.startsWith('/me ') ? 'emote' : 'text',
          channel: channel as ChatMessage['channel'],
        };

        set((s) => {
          const messages = s.chatMessages.get(channel) || [];
          const newMessages = new Map(s.chatMessages);
          newMessages.set(channel, [...messages, message].slice(-100)); // Keep last 100

          return { chatMessages: newMessages };
        });

        // Would send via network
        console.log(`💬 [${channel}] ${myProfile.username}: ${content}`);
      },

      setActiveChannel: (channel) => {
        set({ activeChannel: channel });
        get().markChannelRead(channel);
      },

      markChannelRead: (channel) => {
        set((s) => {
          const newUnread = new Map(s.unreadCounts);
          newUnread.delete(channel);
          return { unreadCounts: newUnread };
        });
      },

      updateFriendStatus: (playerId, status) => {
        set((s) => {
          const friend = s.friends.get(playerId);
          if (!friend) return s;

          const newFriends = new Map(s.friends);
          newFriends.set(playerId, { ...friend, status });
          return { friends: newFriends };
        });
      },

      receiveFriendRequest: (request) => {
        // Check if blocked
        if (get().blockedPlayers.has(request.from.id)) return;

        set((s) => ({
          friendRequests: [...s.friendRequests, request],
        }));
      },

      receivePartyInvite: (partyId, from) => {
        if (get().blockedPlayers.has(from.id)) return;

        set((s) => ({
          partyInvites: [...s.partyInvites, { partyId, from, timestamp: Date.now() }],
        }));
      },

      receiveMessage: (message) => {
        // Check if sender is blocked
        if (get().blockedPlayers.has(message.senderId)) return;

        set((s) => {
          const channel = message.channel;
          const messages = s.chatMessages.get(channel) || [];
          const newMessages = new Map(s.chatMessages);
          newMessages.set(channel, [...messages, message].slice(-100));

          // Update unread if not active channel
          const newUnread = new Map(s.unreadCounts);
          if (channel !== s.activeChannel) {
            newUnread.set(channel, (newUnread.get(channel) || 0) + 1);
          }

          return { chatMessages: newMessages, unreadCounts: newUnread };
        });
      },

      updateParty: (party) => {
        set({ currentParty: party });
      },

      updateNearbyPlayers: (players) => {
        // Filter out blocked players
        const blocked = get().blockedPlayers;
        const filtered = players.filter((p) => !blocked.has(p.id));
        set({ nearbyPlayers: filtered });
      },

      isFriend: (playerId) => get().friends.has(playerId),

      isBlocked: (playerId) => get().blockedPlayers.has(playerId),

      isInParty: () => get().currentParty !== null,

      isPartyLeader: () => {
        const { currentParty, myProfile } = get();
        if (!currentParty || !myProfile) return false;
        return currentParty.members.find((m) => m.id === myProfile.id)?.role === 'leader';
      },

      getOnlineFriends: () => {
        return Array.from(get().friends.values()).filter(
          (f) => f.status !== 'offline'
        );
      },

      reset: () => {
        set({
          myProfile: null,
          friends: new Map(),
          friendRequests: [],
          blockedPlayers: new Set(),
          currentParty: null,
          partyInvites: [],
          chatMessages: new Map([
            ['global', []],
            ['party', []],
            ['local', []],
          ]),
          activeChannel: 'global',
          unreadCounts: new Map(),
          nearbyPlayers: [],
        });
      },
    }),
    {
      name: 'social-storage',
      partialize: (state) => ({
        friends: Array.from(state.friends.entries()),
        blockedPlayers: Array.from(state.blockedPlayers),
      }),
      merge: (persisted, current) => {
        const data = persisted as {
          friends?: [string, Player][];
          blockedPlayers?: string[];
        };
        return {
          ...current,
          friends: new Map(data?.friends ?? []),
          blockedPlayers: new Set(data?.blockedPlayers ?? []),
        };
      },
    }
  )
);
