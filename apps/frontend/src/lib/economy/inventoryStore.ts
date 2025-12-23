// Inventory Store - manages player inventory, currency, and items
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Item {
  id: string;
  name: string;
  description: string;
  type: 'weapon' | 'armor' | 'consumable' | 'material' | 'currency' | 'collectible' | 'nft';
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  stackable: boolean;
  maxStack: number;
  value: number; // Base sell value
  icon?: string;
  metadata?: Record<string, unknown>;
}

export interface InventorySlot {
  item: Item;
  quantity: number;
  equipped?: boolean;
}

export interface Currency {
  id: string;
  name: string;
  icon: string;
  amount: number;
}

interface InventoryState {
  // Inventory
  slots: Map<string, InventorySlot>; // slot id -> slot
  maxSlots: number;

  // Currencies
  currencies: Map<string, Currency>;

  // Equipment
  equippedItems: Map<string, string>; // slot type -> item slot id

  // Actions
  addItem: (item: Item, quantity?: number) => boolean;
  removeItem: (slotId: string, quantity?: number) => boolean;
  useItem: (slotId: string, quantity?: number) => InventorySlot | null;
  moveItem: (fromSlotId: string, toSlotId: string) => boolean;
  equipItem: (slotId: string, equipSlot: string) => boolean;
  unequipItem: (equipSlot: string) => boolean;

  // Currency
  addCurrency: (currencyId: string, amount: number) => void;
  removeCurrency: (currencyId: string, amount: number) => boolean;
  getCurrency: (currencyId: string) => number;

  // Queries
  getItem: (slotId: string) => InventorySlot | undefined;
  findItemByType: (type: Item['type']) => InventorySlot[];
  getEquippedItem: (equipSlot: string) => InventorySlot | undefined;
  hasItem: (itemId: string, quantity?: number) => boolean;
  getItemCount: (itemId: string) => number;
  getFreeSlots: () => number;

  // Utility
  sortInventory: (by: 'name' | 'type' | 'rarity' | 'value') => void;
  expandInventory: (additionalSlots: number) => void;
  clearInventory: () => void;
  reset: () => void;
}

// Rarity sort order
const RARITY_ORDER = {
  common: 0,
  uncommon: 1,
  rare: 2,
  epic: 3,
  legendary: 4,
};

export const useInventoryStore = create<InventoryState>()(
  persist(
    (set, get) => ({
      slots: new Map(),
      maxSlots: 30,
      currencies: new Map([
        ['gold', { id: 'gold', name: 'Gold', icon: '💰', amount: 0 }],
        ['gems', { id: 'gems', name: 'Gems', icon: '💎', amount: 0 }],
      ]),
      equippedItems: new Map(),

      addItem: (item, quantity = 1) => {
        const state = get();

        // Try to stack with existing items
        if (item.stackable) {
          for (const [slotId, slot] of state.slots) {
            if (slot.item.id === item.id && slot.quantity < item.maxStack) {
              const spaceAvailable = item.maxStack - slot.quantity;
              const toAdd = Math.min(quantity, spaceAvailable);

              set((s) => {
                const newSlots = new Map(s.slots);
                newSlots.set(slotId, {
                  ...slot,
                  quantity: slot.quantity + toAdd,
                });
                return { slots: newSlots };
              });

              quantity -= toAdd;
              if (quantity <= 0) return true;
            }
          }
        }

        // Add to new slots
        while (quantity > 0) {
          if (state.slots.size >= state.maxSlots) {
            console.warn('Inventory full!');
            return false;
          }

          const slotId = `slot-${Date.now()}-${Math.random().toString(36).slice(2)}`;
          const toAdd = item.stackable ? Math.min(quantity, item.maxStack) : 1;

          set((s) => {
            const newSlots = new Map(s.slots);
            newSlots.set(slotId, {
              item,
              quantity: toAdd,
            });
            return { slots: newSlots };
          });

          quantity -= toAdd;
        }

        return true;
      },

      removeItem: (slotId, quantity = 1) => {
        const state = get();
        const slot = state.slots.get(slotId);

        if (!slot) return false;
        if (slot.quantity < quantity) return false;

        set((s) => {
          const newSlots = new Map(s.slots);

          if (slot.quantity === quantity) {
            newSlots.delete(slotId);

            // Unequip if equipped
            const newEquipped = new Map(s.equippedItems);
            for (const [equipSlot, equippedSlotId] of newEquipped) {
              if (equippedSlotId === slotId) {
                newEquipped.delete(equipSlot);
              }
            }

            return { slots: newSlots, equippedItems: newEquipped };
          } else {
            newSlots.set(slotId, {
              ...slot,
              quantity: slot.quantity - quantity,
            });
            return { slots: newSlots };
          }
        });

        return true;
      },

      useItem: (slotId, quantity = 1) => {
        const state = get();
        const slot = state.slots.get(slotId);

        if (!slot) return null;
        if (slot.quantity < quantity) return null;

        // Clone the slot info before removing
        const usedItem: InventorySlot = {
          item: { ...slot.item },
          quantity,
        };

        // Remove the item
        const success = state.removeItem(slotId, quantity);
        if (!success) return null;

        return usedItem;
      },

      moveItem: (fromSlotId, toSlotId) => {
        const state = get();
        const fromSlot = state.slots.get(fromSlotId);
        const toSlot = state.slots.get(toSlotId);

        if (!fromSlot) return false;

        set((s) => {
          const newSlots = new Map(s.slots);

          if (!toSlot) {
            // Move to empty slot
            newSlots.set(toSlotId, fromSlot);
            newSlots.delete(fromSlotId);
          } else if (toSlot.item.id === fromSlot.item.id && fromSlot.item.stackable) {
            // Stack items
            const total = fromSlot.quantity + toSlot.quantity;
            const maxStack = fromSlot.item.maxStack;

            if (total <= maxStack) {
              newSlots.set(toSlotId, { ...toSlot, quantity: total });
              newSlots.delete(fromSlotId);
            } else {
              newSlots.set(toSlotId, { ...toSlot, quantity: maxStack });
              newSlots.set(fromSlotId, { ...fromSlot, quantity: total - maxStack });
            }
          } else {
            // Swap items
            newSlots.set(fromSlotId, toSlot);
            newSlots.set(toSlotId, fromSlot);
          }

          return { slots: newSlots };
        });

        return true;
      },

      equipItem: (slotId, equipSlot) => {
        const state = get();
        const slot = state.slots.get(slotId);

        if (!slot) return false;
        if (!['weapon', 'armor'].includes(slot.item.type)) return false;

        set((s) => {
          const newEquipped = new Map(s.equippedItems);
          newEquipped.set(equipSlot, slotId);
          return { equippedItems: newEquipped };
        });

        return true;
      },

      unequipItem: (equipSlot) => {
        set((s) => {
          const newEquipped = new Map(s.equippedItems);
          newEquipped.delete(equipSlot);
          return { equippedItems: newEquipped };
        });

        return true;
      },

      addCurrency: (currencyId, amount) => {
        set((s) => {
          const newCurrencies = new Map(s.currencies);
          const currency = newCurrencies.get(currencyId);

          if (currency) {
            newCurrencies.set(currencyId, {
              ...currency,
              amount: currency.amount + amount,
            });
          }

          return { currencies: newCurrencies };
        });
      },

      removeCurrency: (currencyId, amount) => {
        const state = get();
        const currency = state.currencies.get(currencyId);

        if (!currency || currency.amount < amount) return false;

        set((s) => {
          const newCurrencies = new Map(s.currencies);
          newCurrencies.set(currencyId, {
            ...currency,
            amount: currency.amount - amount,
          });
          return { currencies: newCurrencies };
        });

        return true;
      },

      getCurrency: (currencyId) => {
        return get().currencies.get(currencyId)?.amount ?? 0;
      },

      getItem: (slotId) => get().slots.get(slotId),

      findItemByType: (type) => {
        return Array.from(get().slots.values()).filter((slot) => slot.item.type === type);
      },

      getEquippedItem: (equipSlot) => {
        const state = get();
        const slotId = state.equippedItems.get(equipSlot);
        return slotId ? state.slots.get(slotId) : undefined;
      },

      hasItem: (itemId, quantity = 1) => {
        return get().getItemCount(itemId) >= quantity;
      },

      getItemCount: (itemId) => {
        let total = 0;
        for (const slot of get().slots.values()) {
          if (slot.item.id === itemId) {
            total += slot.quantity;
          }
        }
        return total;
      },

      getFreeSlots: () => {
        const state = get();
        return state.maxSlots - state.slots.size;
      },

      sortInventory: (by) => {
        set((s) => {
          const entries = Array.from(s.slots.entries());

          entries.sort((a, b) => {
            const itemA = a[1].item;
            const itemB = b[1].item;

            switch (by) {
              case 'name':
                return itemA.name.localeCompare(itemB.name);
              case 'type':
                return itemA.type.localeCompare(itemB.type);
              case 'rarity':
                return RARITY_ORDER[itemB.rarity] - RARITY_ORDER[itemA.rarity];
              case 'value':
                return itemB.value - itemA.value;
              default:
                return 0;
            }
          });

          // Reassign slot IDs
          const newSlots = new Map<string, InventorySlot>();
          entries.forEach(([_, slot], index) => {
            newSlots.set(`slot-${index}`, slot);
          });

          return { slots: newSlots };
        });
      },

      expandInventory: (additionalSlots) => {
        set((s) => ({ maxSlots: s.maxSlots + additionalSlots }));
      },

      clearInventory: () => {
        set({
          slots: new Map(),
          equippedItems: new Map(),
        });
      },

      reset: () => {
        set({
          slots: new Map(),
          currencies: new Map([
            ['gold', { id: 'gold', name: 'Gold', icon: '💰', amount: 0 }],
            ['gems', { id: 'gems', name: 'Gems', icon: '💎', amount: 0 }],
          ]),
          equippedItems: new Map(),
        });
      },
    }),
    {
      name: 'inventory-storage',
      partialize: (state) => ({
        slots: Array.from(state.slots.entries()),
        currencies: Array.from(state.currencies.entries()),
        equippedItems: Array.from(state.equippedItems.entries()),
        maxSlots: state.maxSlots,
      }),
      merge: (persisted, current) => {
        const data = persisted as {
          slots?: [string, InventorySlot][];
          currencies?: [string, Currency][];
          equippedItems?: [string, string][];
          maxSlots?: number;
        };
        return {
          ...current,
          slots: new Map(data?.slots ?? []),
          currencies: new Map(data?.currencies ?? current.currencies),
          equippedItems: new Map(data?.equippedItems ?? []),
          maxSlots: data?.maxSlots ?? current.maxSlots,
        };
      },
    }
  )
);
