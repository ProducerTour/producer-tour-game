/**
 * Inventory UI Constants - Rust/Military Style
 */

import type { EquipmentSlotType, Item } from './types';

/**
 * Rust-style muted color palette
 */
export const RARITY_COLORS = {
  common: {
    bg: 'bg-[#3d4249]/60',
    border: 'border-[#5a6068]/60',
    gradient: 'from-[#3d4249]/60 to-[#2d3238]/60',
    glow: 'shadow-[#5a6068]/20',
    text: 'text-[#9ca3af]',
    hex: '#5a6068',
  },
  uncommon: {
    bg: 'bg-[#3d5a3d]/60',
    border: 'border-[#5a8a5a]/60',
    gradient: 'from-[#3d5a3d]/60 to-[#2d4a2d]/60',
    glow: 'shadow-[#5a8a5a]/30',
    text: 'text-[#7cb87c]',
    hex: '#5a8a5a',
  },
  rare: {
    bg: 'bg-[#3d4a5a]/60',
    border: 'border-[#5a7a9a]/60',
    gradient: 'from-[#3d4a5a]/60 to-[#2d3a4a]/60',
    glow: 'shadow-[#5a7a9a]/30',
    text: 'text-[#7ab0d4]',
    hex: '#5a7a9a',
  },
  epic: {
    bg: 'bg-[#4a3d5a]/60',
    border: 'border-[#7a5a9a]/60',
    gradient: 'from-[#4a3d5a]/60 to-[#3a2d4a]/60',
    glow: 'shadow-[#7a5a9a]/30',
    text: 'text-[#b07ad4]',
    hex: '#7a5a9a',
  },
  legendary: {
    bg: 'bg-[#5a4a3d]/60',
    border: 'border-[#c9a227]/60',
    gradient: 'from-[#5a4a3d]/60 to-[#4a3a2d]/60',
    glow: 'shadow-[#c9a227]/40',
    text: 'text-[#c9a227]',
    hex: '#c9a227',
  },
} as const;

/**
 * Rust-style slot visual styles
 */
export const SLOT_STYLES = {
  empty: 'bg-[#1a1d21]/80 border border-[#3d4249]/50',
  hover: 'bg-[#2a2d31]/80 border-[#5a6068]/70',
  selected: 'ring-2 ring-[#7ab0d4]/50',
  dropTarget: 'ring-2 ring-[#7cb87c]/50 bg-[#3d5a3d]/20',
  invalid: 'ring-2 ring-[#d47a7a]/50 bg-[#5a3d3d]/20',
} as const;

/**
 * Equipment slot positions - Rust style circular arrangement
 * Positioned around a center character model
 */
export const EQUIPMENT_SLOT_POSITIONS: Record<EquipmentSlotType, {
  top?: string;
  bottom?: string;
  left?: string;
  right?: string;
  labelPosition: 'top' | 'bottom' | 'left' | 'right';
}> = {
  head: { top: '5%', left: '15%', labelPosition: 'left' },
  primaryWeapon: { top: '5%', right: '15%', labelPosition: 'right' },
  chest: { top: '35%', left: '5%', labelPosition: 'left' },
  hands: { top: '35%', right: '5%', labelPosition: 'right' },
  legs: { bottom: '25%', left: '15%', labelPosition: 'left' },
  feet: { bottom: '25%', right: '15%', labelPosition: 'right' },
  secondaryWeapon: { bottom: '5%', left: '50%', labelPosition: 'bottom' },
};

/**
 * Equipment slot labels - Rust style uppercase
 */
export const EQUIPMENT_SLOT_LABELS: Record<EquipmentSlotType, string> = {
  head: 'HEAD',
  chest: 'TORSO',
  hands: 'ARM',
  legs: 'LEG',
  feet: 'FEET',
  primaryWeapon: 'WEAPON',
  secondaryWeapon: 'MELEE',
};

/**
 * Equipment slot accepts mapping - which item types each slot accepts
 */
export const EQUIPMENT_SLOT_ACCEPTS: Record<EquipmentSlotType, Item['type'][]> = {
  head: ['armor'],
  chest: ['armor'],
  hands: ['armor'],
  legs: ['armor'],
  feet: ['armor'],
  primaryWeapon: ['weapon'],
  secondaryWeapon: ['weapon'],
};

/**
 * Grid configuration - Rust style narrower inventory
 */
export const GRID_CONFIG = {
  columns: 6,
  rows: 6,
  totalSlots: 36,
  slotSize: 56, // px
  gap: 2, // px
} as const;

/**
 * Hotbar configuration - Full width Rust style
 */
export const HOTBAR_CONFIG = {
  slots: 12,
  slotSize: 64, // px
  gap: 4, // px
} as const;

/**
 * Keyboard shortcuts
 */
export const KEYBINDS: Record<string, string[]> = {
  toggle: ['Tab', 'KeyI'],
  close: ['Escape'],
  sort: ['KeyR'],
  drop: ['KeyX'],
  split: ['ShiftLeft', 'ShiftRight'],
  hotbar: ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0'],
};

/**
 * Animation durations (ms)
 */
export const ANIMATION_DURATION = {
  panelOpen: 200,
  panelClose: 150,
  dragStart: 100,
  drop: 200,
  equip: 300,
  tooltip: 150,
} as const;

/**
 * Item type icons (fallback if no icon provided)
 */
export const ITEM_TYPE_ICONS: Record<Item['type'], string> = {
  weapon: '/icons/weapon.svg',
  armor: '/icons/armor.svg',
  consumable: '/icons/potion.svg',
  material: '/icons/material.svg',
  currency: '/icons/coin.svg',
  collectible: '/icons/star.svg',
  nft: '/icons/nft.svg',
};

/**
 * Panel colors - Rust dark military theme
 */
export const PANEL_COLORS = {
  background: 'bg-[#12151a]/95',
  backgroundAlt: 'bg-[#1a1d21]/90',
  border: 'border-[#2a2d31]',
  text: 'text-[#d4d4d4]',
  textMuted: 'text-[#8a8a8a]',
  accent: 'text-[#c9a227]', // Gold accent like Rust
  header: 'bg-[#1a1d21]',
} as const;
