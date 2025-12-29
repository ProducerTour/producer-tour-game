import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type ShipModel = 'rocket' | 'fighter' | 'unaf' | 'monkey';

interface PlayerState {
  // Ship customization
  shipModel: ShipModel;
  color: string;

  // Display name (can be overridden, defaults to auth user name)
  displayName: string | null;

  // Actions
  setShipModel: (model: ShipModel) => void;
  setColor: (color: string) => void;
  setDisplayName: (name: string) => void;

  // Helpers
  getRandomColor: () => string;
}

const PLAYER_COLORS = [
  '#3b82f6', // Blue
  '#22c55e', // Green
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#a855f7', // Purple
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#84cc16', // Lime
  '#f97316', // Orange
  '#8b5cf6', // Violet
];

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      shipModel: 'rocket',
      color: PLAYER_COLORS[Math.floor(Math.random() * PLAYER_COLORS.length)],
      displayName: null,

      setShipModel: (model) => set({ shipModel: model }),
      setColor: (color) => set({ color }),
      setDisplayName: (name) => set({ displayName: name }),

      getRandomColor: () => {
        const colors = PLAYER_COLORS.filter(c => c !== get().color);
        return colors[Math.floor(Math.random() * colors.length)];
      },
    }),
    {
      name: 'producer-tour-player',
      partialize: (state) => ({
        shipModel: state.shipModel,
        color: state.color,
        displayName: state.displayName,
      }),
    }
  )
);
