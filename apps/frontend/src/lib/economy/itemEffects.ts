/**
 * Item Effects - Type definitions for consumables and placeable items
 */

// Consumable effect types
export type ConsumableEffectType =
  | 'heal'          // Instant health restore
  | 'healOverTime'  // Health regen over duration
  | 'stamina'       // Restore stamina
  | 'buff'          // Temporary stat boost
  | 'cure';         // Remove debuffs

export interface ConsumableEffect {
  type: ConsumableEffectType;
  value: number;           // Amount (health, stamina, etc.)
  duration?: number;       // Duration in ms (for buffs/HoT)
  tickRate?: number;       // For HoT effects - ms between ticks
}

// Placeable item types
export type PlaceableType =
  | 'campfire'
  | 'tent'
  | 'storageBox'
  | 'torch'
  | 'light';

export interface PlaceableConfig {
  type: PlaceableType;
  modelPath: string;                              // GLTF model path (relative to models folder)
  colliderType: 'cylinder' | 'box';
  colliderSize: [number, number, number];         // [radius/width, height, depth]
  previewScale?: number;                          // Scale for placement preview (default 1)
  placementRules?: {
    requiresFlat?: boolean;                       // Slope < threshold
    minDistanceFromWater?: number;
    maxSlopeAngle?: number;                       // In degrees
  };
}

/**
 * Extended metadata for usable items
 * Add these to item.metadata for consumables and placeables
 */
export interface UsableItemMetadata {
  // For consumables
  consumableEffect?: ConsumableEffect;
  useTime?: number;        // Time to consume in ms (default 0 = instant)
  useSfx?: string;         // Sound effect key

  // For placeables
  placeableConfig?: PlaceableConfig;
}

/**
 * Placed object in the world
 */
export interface PlacedObject {
  id: string;
  type: PlaceableType;
  position: [number, number, number];
  rotation: number;        // Y-axis rotation in radians
  placedAt: number;        // Timestamp
  placedBy?: string;       // Player ID for multiplayer
}
