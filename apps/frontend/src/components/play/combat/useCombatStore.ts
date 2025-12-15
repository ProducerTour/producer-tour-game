/**
 * Combat Store
 * Zustand store for combat state management
 */

import { create } from 'zustand';

export interface DamageNumber {
  id: string;
  value: number;
  position: { x: number; y: number; z: number };
  isCritical: boolean;
  createdAt: number;
}

export interface CombatTarget {
  id: string;
  type: 'npc' | 'player' | 'destructible';
  health: number;
  maxHealth: number;
  position: { x: number; y: number; z: number };
}

interface CombatState {
  // Player combat state
  playerHealth: number;
  playerMaxHealth: number;
  isInCombat: boolean;
  lastDamageTime: number;

  // Weapon state
  currentWeapon: 'none' | 'rifle' | 'pistol';
  ammo: Record<string, number>;
  isReloading: boolean;
  lastFireTime: number;

  // Targets
  targets: Map<string, CombatTarget>;
  lockedTarget: string | null;

  // Floating damage numbers
  damageNumbers: DamageNumber[];

  // Actions
  setPlayerHealth: (health: number) => void;
  takeDamage: (amount: number) => void;
  heal: (amount: number) => void;

  setWeapon: (weapon: 'none' | 'rifle' | 'pistol') => void;
  fire: () => boolean; // Returns true if weapon fired
  reload: () => void;

  addTarget: (target: CombatTarget) => void;
  removeTarget: (id: string) => void;
  damageTarget: (id: string, damage: number, isCritical?: boolean) => void;
  setLockedTarget: (id: string | null) => void;

  addDamageNumber: (damage: DamageNumber) => void;
  clearOldDamageNumbers: () => void;

  enterCombat: () => void;
  exitCombat: () => void;
  reset: () => void;
}

// Weapon configurations
export const WEAPON_CONFIG = {
  rifle: {
    damage: 15,
    critChance: 0.1,
    critMultiplier: 2,
    fireRate: 150, // ms between shots
    range: 100,
    magazineSize: 30,
    reloadTime: 2000,
    spread: 0.02, // radians
  },
  pistol: {
    damage: 25,
    critChance: 0.15,
    critMultiplier: 2.5,
    fireRate: 400,
    range: 50,
    magazineSize: 12,
    reloadTime: 1500,
    spread: 0.01,
  },
} as const;

// Generate unique ID for damage numbers
let damageNumberId = 0;
const generateDamageId = () => `dmg_${++damageNumberId}`;

export const useCombatStore = create<CombatState>((set, get) => ({
  // Initial state
  playerHealth: 100,
  playerMaxHealth: 100,
  isInCombat: false,
  lastDamageTime: 0,

  currentWeapon: 'none',
  ammo: {
    rifle: 30,
    pistol: 12,
  },
  isReloading: false,
  lastFireTime: 0,

  targets: new Map(),
  lockedTarget: null,

  damageNumbers: [],

  // Player health actions
  setPlayerHealth: (health) => set({
    playerHealth: Math.max(0, Math.min(health, get().playerMaxHealth))
  }),

  takeDamage: (amount) => {
    const state = get();
    const newHealth = Math.max(0, state.playerHealth - amount);
    set({
      playerHealth: newHealth,
      lastDamageTime: Date.now(),
      isInCombat: true,
    });

    // Auto exit combat after 5 seconds of no damage
    setTimeout(() => {
      const current = get();
      if (Date.now() - current.lastDamageTime >= 5000) {
        set({ isInCombat: false });
      }
    }, 5000);
  },

  heal: (amount) => {
    const state = get();
    set({
      playerHealth: Math.min(state.playerMaxHealth, state.playerHealth + amount)
    });
  },

  // Weapon actions
  setWeapon: (weapon) => set({ currentWeapon: weapon }),

  fire: () => {
    const state = get();
    const { currentWeapon, ammo, isReloading, lastFireTime } = state;

    if (currentWeapon === 'none' || isReloading) return false;

    const config = WEAPON_CONFIG[currentWeapon];
    const now = Date.now();

    // Check fire rate
    if (now - lastFireTime < config.fireRate) return false;

    // Check ammo
    const currentAmmo = ammo[currentWeapon] || 0;
    if (currentAmmo <= 0) {
      // Auto reload
      get().reload();
      return false;
    }

    // Fire!
    set({
      ammo: { ...ammo, [currentWeapon]: currentAmmo - 1 },
      lastFireTime: now,
      isInCombat: true,
    });

    return true;
  },

  reload: () => {
    const state = get();
    const { currentWeapon, isReloading } = state;

    if (currentWeapon === 'none' || isReloading) return;

    const config = WEAPON_CONFIG[currentWeapon];

    set({ isReloading: true });

    setTimeout(() => {
      set((s) => ({
        isReloading: false,
        ammo: { ...s.ammo, [currentWeapon]: config.magazineSize },
      }));
    }, config.reloadTime);
  },

  // Target management
  addTarget: (target) => {
    const targets = new Map(get().targets);
    targets.set(target.id, target);
    set({ targets });
  },

  removeTarget: (id) => {
    const targets = new Map(get().targets);
    targets.delete(id);
    set({ targets, lockedTarget: get().lockedTarget === id ? null : get().lockedTarget });
  },

  damageTarget: (id, damage, isCritical = false) => {
    const targets = new Map(get().targets);
    const target = targets.get(id);

    if (!target) return;

    const newHealth = Math.max(0, target.health - damage);
    targets.set(id, { ...target, health: newHealth });

    // Add floating damage number
    get().addDamageNumber({
      id: generateDamageId(),
      value: damage,
      position: { ...target.position, y: target.position.y + 1.5 },
      isCritical,
      createdAt: Date.now(),
    });

    // Remove dead target
    if (newHealth <= 0) {
      setTimeout(() => get().removeTarget(id), 100);
    }

    set({ targets });
  },

  setLockedTarget: (id) => set({ lockedTarget: id }),

  // Damage numbers
  addDamageNumber: (damage) => {
    set((state) => ({
      damageNumbers: [...state.damageNumbers, damage],
    }));

    // Auto cleanup after 1.5s
    setTimeout(() => {
      set((state) => ({
        damageNumbers: state.damageNumbers.filter((d) => d.id !== damage.id),
      }));
    }, 1500);
  },

  clearOldDamageNumbers: () => {
    const now = Date.now();
    set((state) => ({
      damageNumbers: state.damageNumbers.filter((d) => now - d.createdAt < 1500),
    }));
  },

  // Combat state
  enterCombat: () => set({ isInCombat: true }),
  exitCombat: () => set({ isInCombat: false }),

  reset: () => set({
    playerHealth: 100,
    isInCombat: false,
    lastDamageTime: 0,
    ammo: { rifle: 30, pistol: 12 },
    isReloading: false,
    lastFireTime: 0,
    targets: new Map(),
    lockedTarget: null,
    damageNumbers: [],
  }),
}));

export default useCombatStore;
