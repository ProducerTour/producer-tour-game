// Trading Store - peer-to-peer trading system
import { create } from 'zustand';
import { Item } from './inventoryStore';

export interface TradeOffer {
  items: Map<string, { item: Item; quantity: number }>;
  currency: Map<string, number>;
  locked: boolean;
  confirmed: boolean;
}

export interface TradeSession {
  id: string;
  partnerId: string;
  partnerName: string;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  myOffer: TradeOffer;
  partnerOffer: TradeOffer;
  createdAt: number;
  expiresAt: number;
}

interface TradingState {
  // Current trade
  currentTrade: TradeSession | null;

  // Trade history
  tradeHistory: TradeSession[];

  // Pending trade requests
  pendingRequests: Array<{
    id: string;
    fromId: string;
    fromName: string;
    timestamp: number;
  }>;

  // Actions
  initiateTradeRequest: (partnerId: string, partnerName: string) => void;
  acceptTradeRequest: (requestId: string) => void;
  declineTradeRequest: (requestId: string) => void;

  // Trade operations
  addItemToOffer: (slotId: string, item: Item, quantity: number) => boolean;
  removeItemFromOffer: (slotId: string) => boolean;
  addCurrencyToOffer: (currencyId: string, amount: number) => boolean;
  removeCurrencyFromOffer: (currencyId: string) => boolean;

  // Trade status
  lockOffer: () => void;
  unlockOffer: () => void;
  confirmTrade: () => void;
  cancelTrade: () => void;

  // Partner actions (from network)
  updatePartnerOffer: (offer: TradeOffer) => void;
  onTradeComplete: () => void;
  onTradeCancelled: () => void;

  // Queries
  canTrade: () => boolean;
  isOfferValid: () => boolean;

  // Utility
  clearPendingRequests: () => void;
}

const createEmptyOffer = (): TradeOffer => ({
  items: new Map(),
  currency: new Map(),
  locked: false,
  confirmed: false,
});

export const useTradingStore = create<TradingState>((set, get) => ({
  currentTrade: null,
  tradeHistory: [],
  pendingRequests: [],

  initiateTradeRequest: (partnerId, partnerName) => {
    // Would send request via network
    console.log(`📤 Sending trade request to ${partnerName}`);

    // For demo, create the session directly
    const session: TradeSession = {
      id: `trade-${Date.now()}`,
      partnerId,
      partnerName,
      status: 'active',
      myOffer: createEmptyOffer(),
      partnerOffer: createEmptyOffer(),
      createdAt: Date.now(),
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 min timeout
    };

    set({ currentTrade: session });
  },

  acceptTradeRequest: (requestId) => {
    const request = get().pendingRequests.find((r) => r.id === requestId);
    if (!request) return;

    const session: TradeSession = {
      id: requestId,
      partnerId: request.fromId,
      partnerName: request.fromName,
      status: 'active',
      myOffer: createEmptyOffer(),
      partnerOffer: createEmptyOffer(),
      createdAt: Date.now(),
      expiresAt: Date.now() + 5 * 60 * 1000,
    };

    set((s) => ({
      currentTrade: session,
      pendingRequests: s.pendingRequests.filter((r) => r.id !== requestId),
    }));
  },

  declineTradeRequest: (requestId) => {
    set((s) => ({
      pendingRequests: s.pendingRequests.filter((r) => r.id !== requestId),
    }));
  },

  addItemToOffer: (slotId, item, quantity) => {
    const { currentTrade } = get();
    if (!currentTrade || currentTrade.myOffer.locked) return false;

    set((s) => {
      if (!s.currentTrade) return s;

      const newItems = new Map(s.currentTrade.myOffer.items);
      const existing = newItems.get(slotId);

      if (existing) {
        newItems.set(slotId, { item, quantity: existing.quantity + quantity });
      } else {
        newItems.set(slotId, { item, quantity });
      }

      return {
        currentTrade: {
          ...s.currentTrade,
          myOffer: {
            ...s.currentTrade.myOffer,
            items: newItems,
          },
        },
      };
    });

    return true;
  },

  removeItemFromOffer: (slotId) => {
    const { currentTrade } = get();
    if (!currentTrade || currentTrade.myOffer.locked) return false;

    set((s) => {
      if (!s.currentTrade) return s;

      const newItems = new Map(s.currentTrade.myOffer.items);
      newItems.delete(slotId);

      return {
        currentTrade: {
          ...s.currentTrade,
          myOffer: {
            ...s.currentTrade.myOffer,
            items: newItems,
          },
        },
      };
    });

    return true;
  },

  addCurrencyToOffer: (currencyId, amount) => {
    const { currentTrade } = get();
    if (!currentTrade || currentTrade.myOffer.locked) return false;

    set((s) => {
      if (!s.currentTrade) return s;

      const newCurrency = new Map(s.currentTrade.myOffer.currency);
      const existing = newCurrency.get(currencyId) || 0;
      newCurrency.set(currencyId, existing + amount);

      return {
        currentTrade: {
          ...s.currentTrade,
          myOffer: {
            ...s.currentTrade.myOffer,
            currency: newCurrency,
          },
        },
      };
    });

    return true;
  },

  removeCurrencyFromOffer: (currencyId) => {
    const { currentTrade } = get();
    if (!currentTrade || currentTrade.myOffer.locked) return false;

    set((s) => {
      if (!s.currentTrade) return s;

      const newCurrency = new Map(s.currentTrade.myOffer.currency);
      newCurrency.delete(currencyId);

      return {
        currentTrade: {
          ...s.currentTrade,
          myOffer: {
            ...s.currentTrade.myOffer,
            currency: newCurrency,
          },
        },
      };
    });

    return true;
  },

  lockOffer: () => {
    set((s) => {
      if (!s.currentTrade) return s;

      return {
        currentTrade: {
          ...s.currentTrade,
          myOffer: {
            ...s.currentTrade.myOffer,
            locked: true,
          },
        },
      };
    });
  },

  unlockOffer: () => {
    set((s) => {
      if (!s.currentTrade) return s;

      return {
        currentTrade: {
          ...s.currentTrade,
          myOffer: {
            ...s.currentTrade.myOffer,
            locked: false,
            confirmed: false, // Reset confirmation when unlocking
          },
        },
      };
    });
  },

  confirmTrade: () => {
    const { currentTrade } = get();
    if (!currentTrade || !currentTrade.myOffer.locked) return;

    set((s) => {
      if (!s.currentTrade) return s;

      const updatedTrade = {
        ...s.currentTrade,
        myOffer: {
          ...s.currentTrade.myOffer,
          confirmed: true,
        },
      };

      // Check if both confirmed
      if (updatedTrade.partnerOffer.confirmed) {
        // Trade complete! Would process via server
        console.log('🤝 Trade completed!');
        const completedTrade: TradeSession = { ...updatedTrade, status: 'completed' };
        return {
          currentTrade: completedTrade,
          tradeHistory: [completedTrade, ...s.tradeHistory].slice(0, 50),
        };
      }

      return { currentTrade: updatedTrade };
    });
  },

  cancelTrade: () => {
    set({ currentTrade: null });
  },

  updatePartnerOffer: (offer) => {
    set((s) => {
      if (!s.currentTrade) return s;

      return {
        currentTrade: {
          ...s.currentTrade,
          partnerOffer: offer,
        },
      };
    });
  },

  onTradeComplete: () => {
    set((s) => {
      if (!s.currentTrade) return s;

      const completedTrade = { ...s.currentTrade, status: 'completed' as const };

      return {
        currentTrade: null,
        tradeHistory: [completedTrade, ...s.tradeHistory].slice(0, 50),
      };
    });
  },

  onTradeCancelled: () => {
    set((s) => ({
      currentTrade: s.currentTrade
        ? { ...s.currentTrade, status: 'cancelled' }
        : null,
    }));

    // Clear after animation
    setTimeout(() => {
      set({ currentTrade: null });
    }, 2000);
  },

  canTrade: () => {
    return get().currentTrade === null;
  },

  isOfferValid: () => {
    const { currentTrade } = get();
    if (!currentTrade) return false;

    // At least one item or currency in offer
    return (
      currentTrade.myOffer.items.size > 0 ||
      Array.from(currentTrade.myOffer.currency.values()).some((v) => v > 0)
    );
  },

  clearPendingRequests: () => {
    set({ pendingRequests: [] });
  },
}));
