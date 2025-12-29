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
  thumbnail?: string; // Pre-rendered 2D image of 3D model
  modelPath?: string; // Path to 3D model for world rendering
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

// Default weapons for hotbar initialization
const DEFAULT_WEAPONS: Item[] = [
  {
    id: 'weapon-ak47',
    name: 'AK-47',
    description: 'Assault rifle with high damage',
    type: 'weapon',
    rarity: 'rare',
    stackable: false,
    maxStack: 1,
    value: 2500,
    thumbnail: '/icons/weapons/ak47.png',
    modelPath: 'weapons/ak47fbx_gltf/scene.gltf',
    metadata: { weaponType: 'rifle' },
  },
  {
    id: 'weapon-pistol',
    name: 'Pistol',
    description: 'Standard sidearm',
    type: 'weapon',
    rarity: 'common',
    stackable: false,
    maxStack: 1,
    value: 500,
    thumbnail: '/icons/weapons/pistol.png',
    modelPath: 'weapons/pistolorange_gltf/scene.gltf',
    metadata: { weaponType: 'pistol' },
  },
];

interface InventoryState {
  // Inventory
  slots: Map<string, InventorySlot>; // slot id -> slot
  maxSlots: number;

  // Currencies
  currencies: Map<string, Currency>;

  // Equipment
  equippedItems: Map<string, string>; // slot type -> item slot id

  // Hotbar (12 slots for quick access - shared between HUD and inventory menu)
  // Stores actual InventorySlot objects (items are MOVED to hotbar, not referenced)
  hotbarSlots: (InventorySlot | null)[];

  // Active hotbar slot (-1 = nothing selected/equipped)
  activeHotbarSlot: number;

  // UI State (for disabling game input when inventory is open)
  isInventoryOpen: boolean;

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

  // Hotbar
  setHotbarSlot: (index: number, slot: InventorySlot | null) => void;
  getHotbarSlots: () => (InventorySlot | null)[];
  getHotbarItem: (index: number) => InventorySlot | null;
  moveToHotbar: (slotId: string, hotbarIndex: number) => boolean;
  moveFromHotbar: (hotbarIndex: number) => boolean;
  initializeDefaultWeapons: () => void;

  // Active hotbar slot selection
  setActiveHotbarSlot: (index: number) => void;
  toggleHotbarSlot: (index: number) => void; // Toggle on/off if same slot pressed
  getActiveHotbarSlot: () => number;
  getActiveItem: () => InventorySlot | null;

  // UI State actions
  setInventoryOpen: (isOpen: boolean) => void;

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
      hotbarSlots: Array(12).fill(null) as (InventorySlot | null)[],
      activeHotbarSlot: -1, // -1 = nothing selected
      isInventoryOpen: false, // Track if inventory UI is open (for disabling game input)

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

      // Hotbar actions
      setHotbarSlot: (index, slot) => {
        if (index < 0 || index >= 12) return;
        set((s) => {
          const newHotbar = [...s.hotbarSlots];
          newHotbar[index] = slot;
          return { hotbarSlots: newHotbar };
        });
      },

      getHotbarSlots: () => get().hotbarSlots,

      getHotbarItem: (index) => {
        const state = get();
        if (index < 0 || index >= 12) return null;
        return state.hotbarSlots[index];
      },

      moveToHotbar: (slotId, hotbarIndex) => {
        if (hotbarIndex < 0 || hotbarIndex >= 12) return false;
        const state = get();
        const slot = state.slots.get(slotId);
        if (!slot) return false;

        set((s) => {
          // Remove from inventory
          const newSlots = new Map(s.slots);
          newSlots.delete(slotId);

          // If there's already something in the hotbar slot, move it back to inventory
          const existingHotbarItem = s.hotbarSlots[hotbarIndex];
          if (existingHotbarItem) {
            const returnSlotId = `slot-${Date.now()}-${Math.random().toString(36).slice(2)}`;
            newSlots.set(returnSlotId, existingHotbarItem);
          }

          // Place in hotbar
          const newHotbar = [...s.hotbarSlots];
          newHotbar[hotbarIndex] = slot;

          return { slots: newSlots, hotbarSlots: newHotbar };
        });

        return true;
      },

      moveFromHotbar: (hotbarIndex) => {
        if (hotbarIndex < 0 || hotbarIndex >= 12) return false;
        const state = get();
        const slot = state.hotbarSlots[hotbarIndex];
        if (!slot) return false;

        set((s) => {
          // Remove from hotbar
          const newHotbar = [...s.hotbarSlots];
          newHotbar[hotbarIndex] = null;

          // Add back to inventory
          const newSlots = new Map(s.slots);
          const newSlotId = `slot-${Date.now()}-${Math.random().toString(36).slice(2)}`;
          newSlots.set(newSlotId, slot);

          return { slots: newSlots, hotbarSlots: newHotbar };
        });

        return true;
      },

      initializeDefaultWeapons: () => {
        const state = get();
        const newHotbar = [...state.hotbarSlots];
        let needsUpdate = false;

        // Check each default weapon slot
        DEFAULT_WEAPONS.forEach((defaultWeapon, index) => {
          const existingSlot = state.hotbarSlots[index];

          // If slot is empty, add the weapon
          if (!existingSlot || !existingSlot.item) {
            newHotbar[index] = { item: defaultWeapon, quantity: 1 };
            needsUpdate = true;
            return;
          }

          // If existing weapon is missing thumbnail, update it with the default weapon data
          if (existingSlot.item.type === 'weapon' && !existingSlot.item.thumbnail) {
            console.log(`[InventoryStore] Updating ${existingSlot.item.name} with thumbnail`);
            newHotbar[index] = {
              ...existingSlot,
              item: { ...existingSlot.item, thumbnail: defaultWeapon.thumbnail }
            };
            needsUpdate = true;
          }
        });

        // Also check inventory slots for weapons missing thumbnails
        const newSlots = new Map(state.slots);
        for (const [slotId, slot] of state.slots) {
          if (slot.item?.type === 'weapon' && !slot.item.thumbnail) {
            // Find matching default weapon by id or name
            const defaultWeapon = DEFAULT_WEAPONS.find(
              w => w.id === slot.item.id || w.name.toLowerCase() === slot.item.name.toLowerCase()
            );
            if (defaultWeapon?.thumbnail) {
              console.log(`[InventoryStore] Updating inventory ${slot.item.name} with thumbnail`);
              newSlots.set(slotId, {
                ...slot,
                item: { ...slot.item, thumbnail: defaultWeapon.thumbnail }
              });
              needsUpdate = true;
            }
          }
        }

        if (needsUpdate) {
          set({ hotbarSlots: newHotbar, slots: newSlots });
          console.log('[InventoryStore] Weapons updated with thumbnails');
        }
      },

      // Active hotbar slot management
      setActiveHotbarSlot: (index) => {
        if (index < -1 || index >= 12) return;
        set({ activeHotbarSlot: index });
      },

      toggleHotbarSlot: (index) => {
        if (index < 0 || index >= 12) return;
        const state = get();
        // If same slot is pressed, deselect (put away)
        if (state.activeHotbarSlot === index) {
          set({ activeHotbarSlot: -1 });
        } else {
          set({ activeHotbarSlot: index });
        }
      },

      getActiveHotbarSlot: () => get().activeHotbarSlot,

      getActiveItem: () => {
        const state = get();
        if (state.activeHotbarSlot < 0 || state.activeHotbarSlot >= 12) return null;
        return state.hotbarSlots[state.activeHotbarSlot];
      },

      // UI State
      setInventoryOpen: (isOpen) => set({ isInventoryOpen: isOpen }),

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
          hotbarSlots: Array(12).fill(null),
        });
      },
    }),
    {
      name: 'inventory-storage',
      partialize: (state) => ({
        slots: Array.from(state.slots.entries()),
        currencies: Array.from(state.currencies.entries()),
        equippedItems: Array.from(state.equippedItems.entries()),
        hotbarSlots: state.hotbarSlots,
        maxSlots: state.maxSlots,
      }),
      merge: (persisted, current) => {
        const data = persisted as {
          slots?: [string, InventorySlot][];
          currencies?: [string, Currency][];
          equippedItems?: [string, string][];
          hotbarSlots?: (InventorySlot | null)[];
          maxSlots?: number;
        };

        // Sanitize hotbar slots - filter out corrupted entries (slots without valid item)
        const sanitizedHotbarSlots = (data?.hotbarSlots ?? current.hotbarSlots).map(slot => {
          if (slot && !slot.item) {
            console.warn('[InventoryStore] Removed corrupted hotbar slot (missing item)');
            return null;
          }
          return slot;
        });

        // Sanitize inventory slots - filter out corrupted entries
        const sanitizedSlots = (data?.slots ?? []).filter(([_, slot]) => {
          if (slot && !slot.item) {
            console.warn('[InventoryStore] Removed corrupted inventory slot (missing item)');
            return false;
          }
          return true;
        });

        return {
          ...current,
          slots: new Map(sanitizedSlots),
          currencies: new Map(data?.currencies ?? current.currencies),
          equippedItems: new Map(data?.equippedItems ?? []),
          hotbarSlots: sanitizedHotbarSlots,
          maxSlots: data?.maxSlots ?? current.maxSlots,
        };
      },
    }
  )
);
