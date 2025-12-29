/**
 * Item Database - Sample items for testing consumables and placeables
 */

import type { Item } from './inventoryStore';
import type { ConsumableEffect, PlaceableConfig } from './itemEffects';

// Type helper for items with consumable effects
interface ConsumableItem extends Item {
  type: 'consumable';
  metadata: {
    consumableEffect: ConsumableEffect;
    useSfx?: string;
  };
}

// Type helper for items with placeable configs
interface PlaceableItem extends Item {
  metadata: {
    placeableConfig: PlaceableConfig;
  };
}

/**
 * Consumable Items
 */
export const CONSUMABLE_ITEMS: ConsumableItem[] = [
  {
    id: 'health_potion_small',
    name: 'Small Health Potion',
    description: 'A small vial of red liquid. Restores 25 health points.',
    type: 'consumable',
    rarity: 'common',
    stackable: true,
    maxStack: 10,
    value: 25,
    icon: '/icons/health_potion_small.png',
    metadata: {
      consumableEffect: { type: 'heal', value: 25 },
      useSfx: 'potionDrink',
    },
  },
  {
    id: 'health_potion_large',
    name: 'Large Health Potion',
    description: 'A large flask of concentrated healing elixir. Restores 50 health points.',
    type: 'consumable',
    rarity: 'uncommon',
    stackable: true,
    maxStack: 5,
    value: 75,
    icon: '/icons/health_potion_large.png',
    metadata: {
      consumableEffect: { type: 'heal', value: 50 },
      useSfx: 'potionDrink',
    },
  },
  {
    id: 'medkit',
    name: 'Medkit',
    description: 'Professional medical supplies. Restores 100 health points.',
    type: 'consumable',
    rarity: 'rare',
    stackable: true,
    maxStack: 3,
    value: 150,
    icon: '/icons/medkit.png',
    metadata: {
      consumableEffect: { type: 'heal', value: 100 },
      useSfx: 'medkitUse',
    },
  },
  {
    id: 'energy_drink',
    name: 'Energy Drink',
    description: 'A caffeinated beverage. Restores 30 stamina.',
    type: 'consumable',
    rarity: 'common',
    stackable: true,
    maxStack: 10,
    value: 15,
    icon: '/icons/energy_drink.png',
    metadata: {
      consumableEffect: { type: 'stamina', value: 30 },
      useSfx: 'drinkSfx',
    },
  },
  {
    id: 'bandage',
    name: 'Bandage',
    description: 'Simple first aid. Heals 15 health over 5 seconds.',
    type: 'consumable',
    rarity: 'common',
    stackable: true,
    maxStack: 15,
    value: 10,
    icon: '/icons/bandage.png',
    metadata: {
      consumableEffect: { type: 'healOverTime', value: 15, duration: 5000, tickRate: 1000 },
      useSfx: 'bandageApply',
    },
  },
];

/**
 * Equipment Items (tools, lights, etc.)
 */
export const EQUIPMENT_ITEMS: Item[] = [
  {
    id: 'flashlight',
    name: 'Flashlight',
    description: 'A handheld flashlight for illuminating dark areas. Toggle on/off when equipped.',
    type: 'material',
    rarity: 'common',
    stackable: false,
    maxStack: 1,
    value: 50,
    icon: '/icons/items/flashlight.png',
    thumbnail: '/icons/items/flashlight.png',
    modelPath: 'Items/Flashlight/flashlight.glb',
    metadata: {
      equipSlot: 'hand',
      lightConfig: {
        type: 'spotlight',
        color: '#fffae6',
        intensity: 2.0,
        distance: 30,
        angle: Math.PI / 6, // 30 degree cone
        penumbra: 0.3,
      },
    },
  },
];

/**
 * Placeable Items
 */
export const PLACEABLE_ITEMS: PlaceableItem[] = [
  {
    id: 'campfire_kit',
    name: 'Campfire Kit',
    description: 'Everything you need to start a cozy campfire. Place it to warm yourself and cook food.',
    type: 'material',
    rarity: 'common',
    stackable: true,
    maxStack: 3,
    value: 50,
    icon: '/icons/campfire_kit.png',
    metadata: {
      placeableConfig: {
        type: 'campfire',
        modelPath: 'Campfire/campfire.glb',
        colliderType: 'cylinder',
        colliderSize: [0.6, 0.4, 0.6],
        previewScale: 0.3,
        placementRules: {
          requiresFlat: true,
          minDistanceFromWater: 5,
        },
      },
    },
  },
  {
    id: 'torch',
    name: 'Torch',
    description: 'A simple torch for illumination. Lasts until extinguished.',
    type: 'material',
    rarity: 'common',
    stackable: true,
    maxStack: 10,
    value: 15,
    icon: '/icons/torch.png',
    metadata: {
      placeableConfig: {
        type: 'torch',
        modelPath: 'Props/torch.glb',
        colliderType: 'cylinder',
        colliderSize: [0.15, 1.2, 0.15],
        previewScale: 0.5,
      },
    },
  },
];

/**
 * All sample items combined
 */
export const SAMPLE_ITEMS = {
  // Consumables
  healthPotionSmall: CONSUMABLE_ITEMS[0],
  healthPotionLarge: CONSUMABLE_ITEMS[1],
  medkit: CONSUMABLE_ITEMS[2],
  energyDrink: CONSUMABLE_ITEMS[3],
  bandage: CONSUMABLE_ITEMS[4],

  // Equipment
  flashlight: EQUIPMENT_ITEMS[0],

  // Placeables
  campfireKit: PLACEABLE_ITEMS[0],
  campfire: PLACEABLE_ITEMS[0], // Alias for campfireKit
  torch: PLACEABLE_ITEMS[1],
};

/**
 * Get item by ID
 */
export function getItemById(id: string): Item | undefined {
  return [...CONSUMABLE_ITEMS, ...EQUIPMENT_ITEMS, ...PLACEABLE_ITEMS].find((item) => item.id === id);
}

/**
 * Add sample items to inventory for testing
 */
export function addSampleItemsToInventory(
  addItem: (item: Item, quantity?: number) => boolean
): void {
  // Add some consumables
  addItem(SAMPLE_ITEMS.healthPotionSmall, 5);
  addItem(SAMPLE_ITEMS.healthPotionLarge, 2);
  addItem(SAMPLE_ITEMS.medkit, 1);
  addItem(SAMPLE_ITEMS.energyDrink, 3);
  addItem(SAMPLE_ITEMS.bandage, 10);

  // Add equipment
  addItem(SAMPLE_ITEMS.flashlight, 1);

  // Add some placeables
  addItem(SAMPLE_ITEMS.campfireKit, 2);
  addItem(SAMPLE_ITEMS.torch, 5);
}
