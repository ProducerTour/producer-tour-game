import { create } from 'zustand';

interface ChatState {
  // User ID to open chat with (when set from external components like profile page)
  openChatWithUserId: string | null;
  // Action to trigger opening chat with a specific user
  setOpenChatWithUser: (userId: string | null) => void;
  // Clear the trigger after it's been processed
  clearOpenChatTrigger: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  openChatWithUserId: null,

  setOpenChatWithUser: (userId) => {
    set({ openChatWithUserId: userId });
  },

  clearOpenChatTrigger: () => {
    set({ openChatWithUserId: null });
  },
}));
