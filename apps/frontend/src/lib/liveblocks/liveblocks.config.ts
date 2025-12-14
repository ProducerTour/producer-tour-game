import { createClient, type Client } from '@liveblocks/client';
import { createRoomContext, createLiveblocksContext } from '@liveblocks/react';

// Get the public key from environment
const publicApiKey = import.meta.env.VITE_LIVEBLOCKS_PUBLIC_KEY;

// Only create client if we have a valid key
let client: Client | null = null;

if (publicApiKey && publicApiKey.startsWith('pk_')) {
  client = createClient({
    publicApiKey,
    throttle: 100,
  });
} else {
  console.warn('[Liveblocks] No valid VITE_LIVEBLOCKS_PUBLIC_KEY found. Real-time collaboration disabled.');
}

// Presence type - what other users can see about you
export type Presence = {
  cursor: { x: number; y: number } | null;
  selection: string | null; // Currently selected text/section
  name: string;
  color: string;
  avatar?: string;
  isEditing: boolean;
  focusedSection?: string;
};

// Storage type - shared document state
export type Storage = {
  document: {
    content: string;
    lastModified: string;
    modifiedBy: string;
    version: number;
  };
  annotations: Array<{
    id: string;
    userId: string;
    userName: string;
    text: string;
    sectionId: string;
    createdAt: string;
    resolved: boolean;
  }>;
};

// User metadata from Liveblocks
export type UserMeta = {
  id: string;
  info: {
    name: string;
    color: string;
    avatar?: string;
  };
};

// Room event types for real-time notifications
export type RoomEvent = {
  type: 'CURSOR_CLICK' | 'SECTION_EDIT' | 'ANNOTATION_ADDED' | 'DOCUMENT_SAVED';
  userId: string;
  sectionId?: string;
  timestamp?: string;
};

// Create room context with typed Presence, Storage, UserMeta, and RoomEvent
// Only if client is available
const roomContext = client
  ? createRoomContext<Presence, Storage, UserMeta, RoomEvent>(client)
  : null;

// Create Liveblocks context for client-level hooks
const liveblocksContext = client ? createLiveblocksContext(client) : null;

// Export hooks - they will throw helpful errors if used without a valid client
export const RoomProvider = roomContext?.suspense.RoomProvider ?? (() => {
  throw new Error('Liveblocks client not configured. Set VITE_LIVEBLOCKS_PUBLIC_KEY.');
});
export const useRoom = roomContext?.suspense.useRoom ?? (() => {
  throw new Error('Liveblocks client not configured.');
});
export const useMyPresence = roomContext?.suspense.useMyPresence ?? (() => {
  throw new Error('Liveblocks client not configured.');
});
export const useUpdateMyPresence = roomContext?.suspense.useUpdateMyPresence ?? (() => {
  throw new Error('Liveblocks client not configured.');
});
export const useOthers = roomContext?.suspense.useOthers ?? (() => {
  throw new Error('Liveblocks client not configured.');
});
export const useOthersMapped = roomContext?.suspense.useOthersMapped ?? (() => {
  throw new Error('Liveblocks client not configured.');
});
export const useSelf = roomContext?.suspense.useSelf ?? (() => {
  throw new Error('Liveblocks client not configured.');
});
export const useStorage = roomContext?.suspense.useStorage ?? (() => {
  throw new Error('Liveblocks client not configured.');
});
export const useMutation = roomContext?.suspense.useMutation ?? (() => {
  throw new Error('Liveblocks client not configured.');
});
export const useHistory = roomContext?.suspense.useHistory ?? (() => {
  throw new Error('Liveblocks client not configured.');
});
export const useUndo = roomContext?.suspense.useUndo ?? (() => {
  throw new Error('Liveblocks client not configured.');
});
export const useRedo = roomContext?.suspense.useRedo ?? (() => {
  throw new Error('Liveblocks client not configured.');
});
export const useCanUndo = roomContext?.suspense.useCanUndo ?? (() => {
  throw new Error('Liveblocks client not configured.');
});
export const useCanRedo = roomContext?.suspense.useCanRedo ?? (() => {
  throw new Error('Liveblocks client not configured.');
});
export const useStatus = roomContext?.suspense.useStatus ?? (() => {
  throw new Error('Liveblocks client not configured.');
});
export const useBroadcastEvent = roomContext?.suspense.useBroadcastEvent ?? (() => {
  throw new Error('Liveblocks client not configured.');
});
export const useEventListener = roomContext?.suspense.useEventListener ?? (() => {
  throw new Error('Liveblocks client not configured.');
});

export const LiveblocksProvider = liveblocksContext?.LiveblocksProvider ?? (() => {
  throw new Error('Liveblocks client not configured.');
});
export const useClient = liveblocksContext?.useClient ?? (() => {
  throw new Error('Liveblocks client not configured.');
});

// Export a flag to check if Liveblocks is available
export const isLiveblocksEnabled = client !== null;

// Helper to generate room ID based on quest step
export function getDocumentRoomId(entityId: string, questId: string, stepId: string): string {
  return `corporate:${entityId}:${questId}:${stepId}`;
}

// Helper to generate consistent user colors
export function getUserColor(userId: string): string {
  const colors = [
    '#3B82F6', // blue
    '#10B981', // emerald
    '#F59E0B', // amber
    '#EF4444', // red
    '#8B5CF6', // violet
    '#EC4899', // pink
    '#06B6D4', // cyan
    '#84CC16', // lime
  ];

  // Hash the userId to get a consistent color
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }

  return colors[Math.abs(hash) % colors.length];
}
