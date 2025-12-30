/**
 * Combat Store
 * Zustand store for combat state management
 *
 * PERFORMANCE NOTE: Per-frame values like cameraPitch use a singleton
 * instead of Zustand set() to avoid triggering subscriber callbacks 60x/sec.
 */

import { create } from 'zustand';
import { useDevStore } from '../debug/useDevStore';
import { combatTimers } from '../../../lib/utils/TimerManager';

/**
 * Singleton for per-frame combat data (camera pitch for spine aiming).
 *
 * This is mutated directly in useFrame without triggering React re-renders.
 * Components that need this data should read from here in their own useFrame hooks.
 */
export const combatFrameData = {
  /** Camera pitch angle in radians (for spine aiming) */
  cameraPitch: 0,
};

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
  isDead: boolean;
  respawnTimer: number; // Countdown in seconds (0 = not respawning)

  // Aiming state
  // Note: cameraPitch moved to combatFrameData singleton for per-frame updates
  isAiming: boolean;
  isFiring: boolean;
  aimStartTime: number;

  // Weapon state
  currentWeapon: 'none' | 'rifle' | 'pistol';
  ammo: Record<string, number>;
  isReloading: boolean;
  reloadSoundTrigger: number; // Timestamp when reload sound should play (near end of reload)
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
  setAiming: (isAiming: boolean) => void;
  setFiring: (isFiring: boolean) => void;
  fire: () => boolean | 'reloading' | 'empty'; // Returns true if weapon fired, 'reloading' if blocked by reload, 'empty' if no ammo
  reload: () => void;

  addTarget: (target: CombatTarget) => void;
  removeTarget: (id: string) => void;
  damageTarget: (id: string, damage: number, isCritical?: boolean) => void;
  setLockedTarget: (id: string | null) => void;

  addDamageNumber: (damage: DamageNumber) => void;
  clearOldDamageNumbers: () => void;

  enterCombat: () => void;
  exitCombat: () => void;
  die: () => void;
  respawn: () => void;
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
    spread: 0.02, // radians - base accuracy
    // Bloom: spread increases during sustained fire
    bloomPerShot: 0.008, // spread added per shot
    maxBloom: 0.08, // max spread when fully bloomed
    bloomDecay: 0.15, // spread recovery per second
    // Recoil: camera kick on fire
    recoilPitch: 0.015, // upward kick (radians)
    recoilYaw: 0.005, // random horizontal kick
    recoilRecovery: 8, // lerp speed back to center
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
    bloomPerShot: 0.015,
    maxBloom: 0.06,
    bloomDecay: 0.25,
    recoilPitch: 0.025,
    recoilYaw: 0.008,
    recoilRecovery: 10,
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
  isDead: false,
  respawnTimer: 0,

  isAiming: false,
  isFiring: false,
  aimStartTime: 0,

  currentWeapon: 'none',
  ammo: {
    rifle: 30,
    pistol: 12,
  },
  isReloading: false,
  reloadSoundTrigger: 0,
  lastFireTime: 0,

  targets: new Map(),
  lockedTarget: null,

  damageNumbers: [],

  // Player health actions
  setPlayerHealth: (health) => set({
    playerHealth: Math.max(0, Math.min(health, get().playerMaxHealth))
  }),

  takeDamage: (amount) => {
    // Check god mode - if enabled, ignore damage
    if (useDevStore.getState().godMode) {
      return;
    }

    const state = get();
    // Can't take damage when already dead
    if (state.isDead) return;

    const newHealth = Math.max(0, state.playerHealth - amount);
    set({
      playerHealth: newHealth,
      lastDamageTime: Date.now(),
      isInCombat: true,
    });

    // Check for death
    if (newHealth <= 0) {
      get().die();
      return;
    }

    // Auto exit combat after 5 seconds of no damage
    // Uses keyed timer to prevent stacking multiple timeouts
    combatTimers.setTimeout('combat-exit', () => {
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
  setWeapon: (weapon) => {
    const prevWeapon = get().currentWeapon;
    // Cancel pending reload timers for previous weapon
    if (prevWeapon !== 'none') {
      combatTimers.clearTimeout(`reload-sound-${prevWeapon}`);
      combatTimers.clearTimeout(`reload-complete-${prevWeapon}`);
    }
    set({ currentWeapon: weapon, isReloading: false });
  },

  setAiming: (isAiming) => set({
    isAiming,
    aimStartTime: isAiming ? Date.now() : 0,
  }),

  setFiring: (isFiring) => set({ isFiring }),

  fire: () => {
    const state = get();
    const { currentWeapon, ammo, isReloading, lastFireTime } = state;

    if (currentWeapon === 'none') return false;

    // If reloading, signal this so caller can play empty SFX
    if (isReloading) return 'reloading';

    const config = WEAPON_CONFIG[currentWeapon];
    const now = Date.now();

    // Check fire rate
    if (now - lastFireTime < config.fireRate) return false;

    // Check unlimited ammo mode
    const hasUnlimitedAmmo = useDevStore.getState().unlimitedAmmo;

    // Check ammo (skip if unlimited)
    const currentAmmo = ammo[currentWeapon] || 0;
    if (currentAmmo <= 0 && !hasUnlimitedAmmo) {
      // Auto reload and signal empty
      get().reload();
      return 'empty';
    }

    // Fire! (don't decrease ammo if unlimited)
    set({
      ammo: hasUnlimitedAmmo ? ammo : { ...ammo, [currentWeapon]: currentAmmo - 1 },
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

    // Play reload sound near the END of reload (400ms before completion)
    // This syncs the "magazine insertion" sound with when the weapon becomes usable
    // Keyed timer auto-cancels if reload is triggered again
    const soundDelay = Math.max(0, config.reloadTime - 400);
    combatTimers.setTimeout(`reload-sound-${currentWeapon}`, () => {
      set({ reloadSoundTrigger: Date.now() });
    }, soundDelay);

    // Complete reload - keyed by weapon so switching cancels pending reload
    combatTimers.setTimeout(`reload-complete-${currentWeapon}`, () => {
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

    // Remove dead target (keyed to prevent duplicate removal attempts)
    if (newHealth <= 0) {
      combatTimers.setTimeout(`remove-target-${id}`, () => get().removeTarget(id), 100);
    }

    set({ targets });
  },

  setLockedTarget: (id) => set({ lockedTarget: id }),

  // Damage numbers
  addDamageNumber: (damage) => {
    set((state) => ({
      damageNumbers: [...state.damageNumbers, damage],
    }));

    // Auto cleanup after 1.5s (keyed by damage ID to prevent stacking)
    combatTimers.setTimeout(`damage-number-${damage.id}`, () => {
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

  // Death and respawn
  die: () => {
    const state = get();
    if (state.isDead) return; // Already dead

    set({
      isDead: true,
      playerHealth: 0,
      respawnTimer: 3, // 3 second respawn countdown
    });

    // Countdown timer (keyed so it can be cancelled on manual respawn)
    combatTimers.setInterval('respawn-countdown', () => {
      const current = get();
      if (current.respawnTimer <= 1) {
        combatTimers.clearInterval('respawn-countdown');
        get().respawn();
      } else {
        set({ respawnTimer: current.respawnTimer - 1 });
      }
    }, 1000);
  },

  respawn: () => {
    // Clear respawn countdown (in case of manual respawn)
    combatTimers.clearInterval('respawn-countdown');

    set({
      isDead: false,
      playerHealth: 100,
      respawnTimer: 0,
      isInCombat: false,
    });

    // Dispatch event for player controller to teleport to spawn
    window.dispatchEvent(new CustomEvent('player:respawn'));
  },

  reset: () => {
    // Clear all combat-related timers
    combatTimers.clearAll();

    set({
      playerHealth: 100,
      isInCombat: false,
      lastDamageTime: 0,
      isDead: false,
      respawnTimer: 0,
      isAiming: false,
      isFiring: false,
      aimStartTime: 0,
      ammo: { rifle: 30, pistol: 12 },
      isReloading: false,
      reloadSoundTrigger: 0,
      lastFireTime: 0,
      targets: new Map(),
      lockedTarget: null,
      damageNumbers: [],
    });
  },
}));

export default useCombatStore;

// ============================================================
// Selectors - Use these to prevent unnecessary re-renders
// ============================================================

/** Player health (0-100) */
export const usePlayerHealth = () => useCombatStore((s) => s.playerHealth);

/** Player max health */
export const usePlayerMaxHealth = () => useCombatStore((s) => s.playerMaxHealth);

/** Whether player is dead */
export const useIsDead = () => useCombatStore((s) => s.isDead);

/** Respawn countdown timer (seconds) */
export const useRespawnTimer = () => useCombatStore((s) => s.respawnTimer);

/** Whether player is in combat mode */
export const useIsInCombat = () => useCombatStore((s) => s.isInCombat);

/** Current weapon type */
export const useCurrentWeapon = () => useCombatStore((s) => s.currentWeapon);

/** Ammo for all weapons */
export const useAmmo = () => useCombatStore((s) => s.ammo);

/** Whether player is aiming */
export const useIsAiming = () => useCombatStore((s) => s.isAiming);

/** Whether player is firing */
export const useIsFiring = () => useCombatStore((s) => s.isFiring);

/** Whether currently reloading */
export const useIsReloading = () => useCombatStore((s) => s.isReloading);

/** Reload sound trigger timestamp */
export const useReloadSoundTrigger = () => useCombatStore((s) => s.reloadSoundTrigger);

/** Currently locked target ID */
export const useLockedTarget = () => useCombatStore((s) => s.lockedTarget);

/** Floating damage numbers array */
export const useDamageNumbers = () => useCombatStore((s) => s.damageNumbers);

/** Get a specific target by ID */
export const useTarget = (id: string) => useCombatStore((s) => s.targets.get(id));

/** Get all target IDs (for iteration without subscribing to full map) */
export const useTargetIds = () => useCombatStore((s) => Array.from(s.targets.keys()));
