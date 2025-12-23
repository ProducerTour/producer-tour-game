/**
 * In-Game Dev Console
 * Toggle with backtick (`) key
 * Shows console logs, allows commands
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useGameSettings } from '../../../store/gameSettings.store';
import { useDevStore } from './useDevStore';
import { useCombatStore, WEAPON_CONFIG } from '../combat/useCombatStore';
import { useInventoryStore } from '../../../lib/economy/inventoryStore';
import { SAMPLE_ITEMS } from '../../../lib/economy/itemDatabase';

interface LogEntry {
  type: 'log' | 'warn' | 'error' | 'info' | 'cmd' | 'success';
  message: string;
  timestamp: Date;
}

interface DevConsoleProps {
  onCommand?: (command: string, args: string[]) => void;
  onlinePlayers?: Array<{ id: string; username: string; color: string }>;
}

// Store references for use in BUILT_IN_COMMANDS (will be set in component)
let devStoreRef: ReturnType<typeof useDevStore.getState> | null = null;
let combatStoreRef: ReturnType<typeof useCombatStore.getState> | null = null;
let inventoryStoreRef: ReturnType<typeof useInventoryStore.getState> | null = null;

// Built-in commands
const BUILT_IN_COMMANDS: Record<string, { description: string; usage?: string; handler: (args: string[], addLog: (entry: LogEntry) => void) => void }> = {
  // === HELP & UTILITY ===
  help: {
    description: 'Show available commands',
    handler: (args, addLog) => {
      const category = args[0]?.toLowerCase();
      const categories: Record<string, string[]> = {
        cheats: ['god', 'noclip', 'speed', 'gravity', 'ammo', 'health', 'fullheal', 'kill'],
        debug: ['fps', 'stats', 'hitboxes', 'wireframe', 'colliders', 'pos', 'debug'],
        combat: ['weapon', 'reload', 'damage', 'spawnnpc', 'killall'],
        items: ['spawn', 'give', 'inventory'],
        time: ['timescale', 'pause'],
        util: ['help', 'clear', 'tp', 'players', 'weaponedit', 'reset'],
      };

      if (category && categories[category]) {
        addLog({ type: 'info', message: `=== ${category.toUpperCase()} Commands ===`, timestamp: new Date() });
        categories[category].forEach(cmd => {
          const command = BUILT_IN_COMMANDS[cmd];
          if (command) {
            addLog({ type: 'info', message: `  /${cmd} - ${command.description}`, timestamp: new Date() });
            if (command.usage) {
              addLog({ type: 'log', message: `      Usage: ${command.usage}`, timestamp: new Date() });
            }
          }
        });
      } else {
        addLog({ type: 'info', message: '=== Dev Console Commands ===', timestamp: new Date() });
        addLog({ type: 'info', message: 'Categories: /help cheats | debug | combat | items | time | util', timestamp: new Date() });
        addLog({ type: 'info', message: '', timestamp: new Date() });
        Object.entries(BUILT_IN_COMMANDS).forEach(([name, { description }]) => {
          addLog({ type: 'info', message: `  /${name} - ${description}`, timestamp: new Date() });
        });
      }
    },
  },
  clear: {
    description: 'Clear the console',
    handler: () => {}, // Handled specially
  },

  // === CHEAT COMMANDS ===
  god: {
    description: 'Toggle god mode (invincibility)',
    handler: (_, addLog) => {
      if (devStoreRef) {
        devStoreRef.toggleGodMode();
        const enabled = useDevStore.getState().godMode;
        addLog({
          type: enabled ? 'success' : 'info',
          message: `God mode ${enabled ? 'ENABLED' : 'DISABLED'}`,
          timestamp: new Date()
        });
      }
    },
  },
  noclip: {
    description: 'Toggle noclip (fly through walls)',
    handler: (_, addLog) => {
      if (devStoreRef) {
        devStoreRef.toggleNoclip();
        const enabled = useDevStore.getState().noclip;
        addLog({
          type: enabled ? 'success' : 'info',
          message: `Noclip ${enabled ? 'ENABLED - Use WASD + Space/Shift to fly' : 'DISABLED'}`,
          timestamp: new Date()
        });
        // Dispatch event for player controller
        window.dispatchEvent(new CustomEvent('devConsole:noclip', { detail: { enabled } }));
      }
    },
  },
  speed: {
    description: 'Set movement speed multiplier',
    usage: '/speed [0.1-10] (default: 1)',
    handler: (args, addLog) => {
      if (!devStoreRef) return;

      if (args.length === 0) {
        addLog({ type: 'info', message: `Current speed: ${useDevStore.getState().speedMultiplier}x`, timestamp: new Date() });
        return;
      }

      const speed = parseFloat(args[0]);
      if (isNaN(speed) || speed < 0.1 || speed > 10) {
        addLog({ type: 'error', message: 'Speed must be between 0.1 and 10', timestamp: new Date() });
        return;
      }

      devStoreRef.setSpeedMultiplier(speed);
      addLog({ type: 'success', message: `Speed set to ${speed}x`, timestamp: new Date() });
      window.dispatchEvent(new CustomEvent('devConsole:speed', { detail: { speed } }));
    },
  },
  gravity: {
    description: 'Set gravity multiplier',
    usage: '/gravity [0-5] (default: 1)',
    handler: (args, addLog) => {
      if (!devStoreRef) return;

      if (args.length === 0) {
        addLog({ type: 'info', message: `Current gravity: ${useDevStore.getState().gravityMultiplier}x`, timestamp: new Date() });
        return;
      }

      const gravity = parseFloat(args[0]);
      if (isNaN(gravity) || gravity < 0 || gravity > 5) {
        addLog({ type: 'error', message: 'Gravity must be between 0 and 5', timestamp: new Date() });
        return;
      }

      devStoreRef.setGravityMultiplier(gravity);
      addLog({ type: 'success', message: `Gravity set to ${gravity}x`, timestamp: new Date() });
      window.dispatchEvent(new CustomEvent('devConsole:gravity', { detail: { gravity } }));
    },
  },
  ammo: {
    description: 'Set ammo (amount or "unlimited")',
    usage: '/ammo [amount|unlimited]',
    handler: (args, addLog) => {
      if (!devStoreRef || !combatStoreRef) return;

      if (args[0]?.toLowerCase() === 'unlimited') {
        devStoreRef.toggleUnlimitedAmmo();
        const enabled = useDevStore.getState().unlimitedAmmo;
        addLog({
          type: enabled ? 'success' : 'info',
          message: `Unlimited ammo ${enabled ? 'ENABLED' : 'DISABLED'}`,
          timestamp: new Date()
        });
        return;
      }

      const amount = parseInt(args[0]) || 999;
      const currentWeapon = useCombatStore.getState().currentWeapon;

      if (currentWeapon === 'none') {
        addLog({ type: 'warn', message: 'No weapon equipped', timestamp: new Date() });
        return;
      }

      useCombatStore.setState((state) => ({
        ammo: { ...state.ammo, [currentWeapon]: amount }
      }));
      addLog({ type: 'success', message: `Set ${currentWeapon} ammo to ${amount}`, timestamp: new Date() });
    },
  },
  health: {
    description: 'Set player health',
    usage: '/health [amount] (max: 100)',
    handler: (args, addLog) => {
      if (!combatStoreRef) return;

      if (args.length === 0) {
        const state = useCombatStore.getState();
        addLog({ type: 'info', message: `Health: ${state.playerHealth}/${state.playerMaxHealth}`, timestamp: new Date() });
        return;
      }

      const health = parseInt(args[0]);
      if (isNaN(health) || health < 0) {
        addLog({ type: 'error', message: 'Health must be a positive number', timestamp: new Date() });
        return;
      }

      combatStoreRef.setPlayerHealth(health);
      addLog({ type: 'success', message: `Health set to ${health}`, timestamp: new Date() });
    },
  },
  fullheal: {
    description: 'Restore full health',
    handler: (_, addLog) => {
      if (!combatStoreRef) return;
      const maxHealth = useCombatStore.getState().playerMaxHealth;
      combatStoreRef.setPlayerHealth(maxHealth);
      addLog({ type: 'success', message: `Health restored to ${maxHealth}`, timestamp: new Date() });
    },
  },
  kill: {
    description: 'Instantly kill player (for testing respawn)',
    handler: (_, addLog) => {
      if (!combatStoreRef) return;
      combatStoreRef.setPlayerHealth(0);
      addLog({ type: 'warn', message: 'Player killed', timestamp: new Date() });
    },
  },

  // === DEBUG COMMANDS ===
  fps: {
    description: 'Toggle FPS display',
    handler: (_, addLog) => {
      const event = new CustomEvent('devConsole:toggleFps');
      window.dispatchEvent(event);
      addLog({ type: 'info', message: 'FPS display toggled', timestamp: new Date() });
    },
  },
  stats: {
    description: 'Toggle performance stats (FPS, draw calls, triangles)',
    handler: (_, addLog) => {
      if (devStoreRef) {
        devStoreRef.toggleStats();
        const enabled = useDevStore.getState().showStats;
        addLog({ type: 'info', message: `Performance stats ${enabled ? 'ENABLED' : 'DISABLED'}`, timestamp: new Date() });
      }
    },
  },
  hitboxes: {
    description: 'Toggle hitbox visualization',
    handler: (_, addLog) => {
      if (devStoreRef) {
        devStoreRef.toggleHitboxes();
        const enabled = useDevStore.getState().showHitboxes;
        addLog({ type: 'info', message: `Hitbox visualization ${enabled ? 'ENABLED' : 'DISABLED'}`, timestamp: new Date() });
      }
    },
  },
  wireframe: {
    description: 'Toggle wireframe rendering',
    handler: (_, addLog) => {
      if (devStoreRef) {
        devStoreRef.toggleWireframe();
        const enabled = useDevStore.getState().showWireframe;
        addLog({ type: 'info', message: `Wireframe ${enabled ? 'ENABLED' : 'DISABLED'}`, timestamp: new Date() });
        window.dispatchEvent(new CustomEvent('devConsole:wireframe', { detail: { enabled } }));
      }
    },
  },
  colliders: {
    description: 'Toggle physics collider visualization',
    handler: (_, addLog) => {
      if (devStoreRef) {
        devStoreRef.toggleColliders();
        const enabled = useDevStore.getState().showColliders;
        addLog({ type: 'info', message: `Collider visualization ${enabled ? 'ENABLED' : 'DISABLED'}`, timestamp: new Date() });
        window.dispatchEvent(new CustomEvent('devConsole:colliders', { detail: { enabled } }));
      }
    },
  },
  pos: {
    description: 'Show current player position',
    handler: () => {
      const event = new CustomEvent('devConsole:getPos');
      window.dispatchEvent(event);
    },
  },
  debug: {
    description: 'Toggle debug info overlay',
    handler: (_, addLog) => {
      const event = new CustomEvent('devConsole:toggleDebug');
      window.dispatchEvent(event);
      addLog({ type: 'info', message: 'Debug overlay toggled', timestamp: new Date() });
    },
  },

  // === COMBAT COMMANDS ===
  weapon: {
    description: 'Equip weapon (rifle/pistol/none)',
    usage: '/weapon rifle|pistol|none',
    handler: (args, addLog) => {
      const weapon = args[0]?.toLowerCase();
      if (!weapon) {
        const current = useCombatStore.getState().currentWeapon;
        addLog({ type: 'info', message: `Current weapon: ${current}`, timestamp: new Date() });
        return;
      }
      if (!['rifle', 'pistol', 'none'].includes(weapon)) {
        addLog({ type: 'error', message: 'Usage: /weapon rifle|pistol|none', timestamp: new Date() });
        return;
      }
      const event = new CustomEvent('devConsole:weapon', { detail: { weapon: weapon === 'none' ? null : weapon } });
      window.dispatchEvent(event);
      addLog({ type: 'success', message: `Weapon set to: ${weapon}`, timestamp: new Date() });
    },
  },
  reload: {
    description: 'Force reload current weapon',
    handler: (_, addLog) => {
      if (!combatStoreRef) return;
      const weapon = useCombatStore.getState().currentWeapon;
      if (weapon === 'none') {
        addLog({ type: 'warn', message: 'No weapon equipped', timestamp: new Date() });
        return;
      }
      combatStoreRef.reload();
      addLog({ type: 'info', message: 'Reloading...', timestamp: new Date() });
    },
  },
  damage: {
    description: 'Deal damage to self (for testing)',
    usage: '/damage [amount]',
    handler: (args, addLog) => {
      if (!combatStoreRef) return;
      const amount = parseInt(args[0]) || 10;
      combatStoreRef.takeDamage(amount);
      addLog({ type: 'warn', message: `Took ${amount} damage`, timestamp: new Date() });
    },
  },
  spawnnpc: {
    description: 'Spawn a target dummy NPC',
    usage: '/spawnnpc [type] (dummy, target)',
    handler: (args, addLog) => {
      const type = args[0]?.toLowerCase() || 'dummy';
      const event = new CustomEvent('devConsole:spawn', { detail: { type } });
      window.dispatchEvent(event);
      addLog({ type: 'success', message: `Spawning ${type}...`, timestamp: new Date() });
    },
  },
  spawn: {
    description: 'Spawn items to inventory (Rust-style)',
    usage: '/spawn <item_id> [quantity] | /spawn list',
    handler: (args, addLog) => {
      if (!inventoryStoreRef) {
        addLog({ type: 'error', message: 'Inventory store not available', timestamp: new Date() });
        return;
      }

      // Show list of available items
      if (args.length === 0 || args[0]?.toLowerCase() === 'list') {
        addLog({ type: 'info', message: '=== Available Items ===', timestamp: new Date() });
        Object.entries(SAMPLE_ITEMS).forEach(([key, item]) => {
          const rarity = item.rarity || 'common';
          const rarityColors: Record<string, string> = {
            common: '⬜', uncommon: '🟩', rare: '🟦', epic: '🟪', legendary: '🟧'
          };
          addLog({
            type: 'info',
            message: `  ${rarityColors[rarity] || '⬜'} ${key} - ${item.name} (${item.type})`,
            timestamp: new Date()
          });
        });
        addLog({ type: 'info', message: '', timestamp: new Date() });
        addLog({ type: 'info', message: 'Usage: /spawn <item_id> [quantity]', timestamp: new Date() });
        addLog({ type: 'info', message: 'Example: /spawn healthPotion 5', timestamp: new Date() });
        return;
      }

      const itemId = args[0];
      const quantity = parseInt(args[1]) || 1;

      // Check if item exists in database
      const itemTemplate = SAMPLE_ITEMS[itemId as keyof typeof SAMPLE_ITEMS];
      if (!itemTemplate) {
        addLog({ type: 'error', message: `Unknown item: ${itemId}`, timestamp: new Date() });
        addLog({ type: 'info', message: 'Use /spawn list to see available items', timestamp: new Date() });
        return;
      }

      // Validate quantity
      if (quantity < 1 || quantity > 999) {
        addLog({ type: 'error', message: 'Quantity must be between 1 and 999', timestamp: new Date() });
        return;
      }

      // Add item to inventory
      const success = inventoryStoreRef.addItem(itemTemplate, quantity);
      if (success) {
        addLog({
          type: 'success',
          message: `Spawned ${quantity}x ${itemTemplate.name}`,
          timestamp: new Date()
        });
      } else {
        addLog({ type: 'error', message: 'Failed to add item (inventory full?)', timestamp: new Date() });
      }
    },
  },
  inventory: {
    description: 'Show inventory contents',
    usage: '/inventory [clear]',
    handler: (args, addLog) => {
      if (!inventoryStoreRef) {
        addLog({ type: 'error', message: 'Inventory store not available', timestamp: new Date() });
        return;
      }

      if (args[0]?.toLowerCase() === 'clear') {
        inventoryStoreRef.clearInventory();
        addLog({ type: 'success', message: 'Inventory cleared', timestamp: new Date() });
        return;
      }

      const slots = useInventoryStore.getState().slots;
      if (slots.size === 0) {
        addLog({ type: 'info', message: 'Inventory is empty', timestamp: new Date() });
        return;
      }

      addLog({ type: 'info', message: '=== Inventory Contents ===', timestamp: new Date() });
      let totalItems = 0;
      slots.forEach((slot) => {
        totalItems += slot.quantity;
        addLog({
          type: 'info',
          message: `  ${slot.quantity}x ${slot.item.name} (${slot.item.type})`,
          timestamp: new Date()
        });
      });
      addLog({ type: 'info', message: `Total: ${slots.size} slots, ${totalItems} items`, timestamp: new Date() });
    },
  },
  killall: {
    description: 'Kill all spawned targets',
    handler: (_, addLog) => {
      if (!combatStoreRef) return;
      const targets = useCombatStore.getState().targets;
      targets.forEach((_, id) => {
        combatStoreRef?.removeTarget(id);
      });
      addLog({ type: 'success', message: `Killed ${targets.size} targets`, timestamp: new Date() });
    },
  },

  // === TIME COMMANDS ===
  timescale: {
    description: 'Set game time scale (slow-mo)',
    usage: '/timescale [0.1-5] (default: 1)',
    handler: (args, addLog) => {
      if (!devStoreRef) return;

      if (args.length === 0) {
        addLog({ type: 'info', message: `Current timescale: ${useDevStore.getState().timeScale}x`, timestamp: new Date() });
        return;
      }

      const scale = parseFloat(args[0]);
      if (isNaN(scale) || scale < 0.1 || scale > 5) {
        addLog({ type: 'error', message: 'Timescale must be between 0.1 and 5', timestamp: new Date() });
        return;
      }

      devStoreRef.setTimeScale(scale);
      addLog({ type: 'success', message: `Timescale set to ${scale}x`, timestamp: new Date() });
      window.dispatchEvent(new CustomEvent('devConsole:timescale', { detail: { scale } }));
    },
  },
  pause: {
    description: 'Toggle game pause',
    handler: (_, addLog) => {
      if (devStoreRef) {
        devStoreRef.togglePause();
        const paused = useDevStore.getState().isPaused;
        addLog({ type: 'info', message: `Game ${paused ? 'PAUSED' : 'RESUMED'}`, timestamp: new Date() });
        window.dispatchEvent(new CustomEvent('devConsole:pause', { detail: { paused } }));
      }
    },
  },

  // === UTILITY COMMANDS ===
  tp: {
    description: 'Teleport to coordinates',
    usage: '/tp x y z',
    handler: (args, addLog) => {
      if (args.length < 3) {
        addLog({ type: 'error', message: 'Usage: /tp x y z', timestamp: new Date() });
        return;
      }
      const [x, y, z] = args.map(Number);
      if (isNaN(x) || isNaN(y) || isNaN(z)) {
        addLog({ type: 'error', message: 'Invalid coordinates', timestamp: new Date() });
        return;
      }
      const event = new CustomEvent('devConsole:teleport', { detail: { x, y, z } });
      window.dispatchEvent(event);
      addLog({ type: 'success', message: `Teleporting to (${x}, ${y}, ${z})`, timestamp: new Date() });
    },
  },
  players: {
    description: 'List online players',
    handler: () => {
      // Handled specially in component to access onlinePlayers prop
    },
  },
  weaponedit: {
    description: 'Toggle weapon position editor (admin)',
    handler: () => {
      // Handled specially in component to access zustand store
    },
  },
  reset: {
    description: 'Reset all dev settings to defaults',
    handler: (_, addLog) => {
      if (devStoreRef) {
        devStoreRef.reset();
        addLog({ type: 'success', message: 'Dev settings reset to defaults', timestamp: new Date() });
      }
      if (combatStoreRef) {
        combatStoreRef.reset();
        addLog({ type: 'success', message: 'Combat state reset', timestamp: new Date() });
      }
    },
  },
  give: {
    description: 'Give items (weapon, health, ammo)',
    usage: '/give weapon|health|ammo [amount]',
    handler: (args, addLog) => {
      const item = args[0]?.toLowerCase();
      const amount = parseInt(args[1]) || 1;

      switch (item) {
        case 'rifle':
        case 'pistol':
          window.dispatchEvent(new CustomEvent('devConsole:weapon', { detail: { weapon: item } }));
          addLog({ type: 'success', message: `Given ${item}`, timestamp: new Date() });
          break;
        case 'health':
          if (combatStoreRef) {
            combatStoreRef.heal(amount);
            addLog({ type: 'success', message: `Healed ${amount} HP`, timestamp: new Date() });
          }
          break;
        case 'ammo':
          if (combatStoreRef) {
            const weapon = useCombatStore.getState().currentWeapon;
            if (weapon === 'none') {
              addLog({ type: 'warn', message: 'No weapon equipped', timestamp: new Date() });
            } else {
              useCombatStore.setState((state) => ({
                ammo: { ...state.ammo, [weapon]: state.ammo[weapon] + amount }
              }));
              addLog({ type: 'success', message: `Given ${amount} ammo`, timestamp: new Date() });
            }
          }
          break;
        default:
          addLog({ type: 'error', message: 'Usage: /give weapon|health|ammo [amount]', timestamp: new Date() });
      }
    },
  },
  bind: {
    description: 'Show keybindings',
    handler: (_, addLog) => {
      addLog({ type: 'info', message: '=== Key Bindings ===', timestamp: new Date() });
      addLog({ type: 'info', message: '  WASD - Move', timestamp: new Date() });
      addLog({ type: 'info', message: '  Space - Jump', timestamp: new Date() });
      addLog({ type: 'info', message: '  Shift - Sprint', timestamp: new Date() });
      addLog({ type: 'info', message: '  Ctrl - Crouch', timestamp: new Date() });
      addLog({ type: 'info', message: '  E - Interact', timestamp: new Date() });
      addLog({ type: 'info', message: '  1/2 - Select weapon', timestamp: new Date() });
      addLog({ type: 'info', message: '  R - Reload', timestamp: new Date() });
      addLog({ type: 'info', message: '  RMB - Aim', timestamp: new Date() });
      addLog({ type: 'info', message: '  LMB - Fire (while aiming)', timestamp: new Date() });
      addLog({ type: 'info', message: '', timestamp: new Date() });
      addLog({ type: 'info', message: '=== Dev Keys ===', timestamp: new Date() });
      addLog({ type: 'info', message: '  ` - Dev console', timestamp: new Date() });
      addLog({ type: 'info', message: '  F1 - Leva controls (weapon/model editor)', timestamp: new Date() });
      addLog({ type: 'info', message: '  F2 - Dev panel (quick toggles)', timestamp: new Date() });
    },
  },
  config: {
    description: 'Show current weapon config',
    handler: (_, addLog) => {
      addLog({ type: 'info', message: '=== Weapon Config ===', timestamp: new Date() });
      Object.entries(WEAPON_CONFIG).forEach(([weapon, config]) => {
        addLog({ type: 'info', message: `\n  ${weapon.toUpperCase()}:`, timestamp: new Date() });
        addLog({ type: 'log', message: `    Damage: ${config.damage}`, timestamp: new Date() });
        addLog({ type: 'log', message: `    Fire Rate: ${config.fireRate}ms`, timestamp: new Date() });
        addLog({ type: 'log', message: `    Magazine: ${config.magazineSize}`, timestamp: new Date() });
        addLog({ type: 'log', message: `    Reload: ${config.reloadTime}ms`, timestamp: new Date() });
        addLog({ type: 'log', message: `    Crit: ${config.critChance * 100}% (${config.critMultiplier}x)`, timestamp: new Date() });
      });
    },
  },
};

export function DevConsole({ onCommand, onlinePlayers = [] }: DevConsoleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [input, setInput] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Access stores
  const { showWeaponEditor, toggleWeaponEditor } = useGameSettings();
  const devStore = useDevStore();
  const combatStore = useCombatStore();
  const inventoryStore = useInventoryStore();

  // Update store refs for use in commands
  useEffect(() => {
    devStoreRef = devStore;
    combatStoreRef = combatStore;
    inventoryStoreRef = inventoryStore;
  }, [devStore, combatStore, inventoryStore]);

  const addLog = useCallback((entry: LogEntry) => {
    setLogs(prev => [...prev.slice(-200), entry]); // Keep last 200 logs
  }, []);

  // Intercept console methods
  useEffect(() => {
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;
    const originalInfo = console.info;

    console.log = (...args) => {
      originalLog(...args);
      addLog({ type: 'log', message: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '), timestamp: new Date() });
    };

    console.warn = (...args) => {
      originalWarn(...args);
      addLog({ type: 'warn', message: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '), timestamp: new Date() });
    };

    console.error = (...args) => {
      originalError(...args);
      addLog({ type: 'error', message: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '), timestamp: new Date() });
    };

    console.info = (...args) => {
      originalInfo(...args);
      addLog({ type: 'info', message: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '), timestamp: new Date() });
    };

    return () => {
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;
      console.info = originalInfo;
    };
  }, [addLog]);

  // Toggle console with backtick key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '`' || e.key === '~') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      // Escape to close
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  // Auto-scroll to bottom
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Auto-complete suggestions
  useEffect(() => {
    if (input.startsWith('/')) {
      const partial = input.slice(1).toLowerCase();
      if (partial) {
        const matches = Object.keys(BUILT_IN_COMMANDS).filter(cmd =>
          cmd.startsWith(partial) && cmd !== partial
        );
        setSuggestions(matches.slice(0, 5));
      } else {
        setSuggestions([]);
      }
    } else {
      setSuggestions([]);
    }
  }, [input]);

  // Handle command submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const trimmed = input.trim();
    setCommandHistory(prev => [...prev, trimmed]);
    setHistoryIndex(-1);
    setSuggestions([]);

    // Add command to logs
    addLog({ type: 'cmd', message: `> ${trimmed}`, timestamp: new Date() });

    // Parse command
    if (trimmed.startsWith('/')) {
      const parts = trimmed.slice(1).split(' ');
      const cmd = parts[0].toLowerCase();
      const args = parts.slice(1);

      if (cmd === 'clear') {
        setLogs([]);
      } else if (cmd === 'weaponedit') {
        // Handle weapon editor toggle specially (needs zustand store)
        toggleWeaponEditor();
        const newState = !showWeaponEditor;
        addLog({
          type: 'info',
          message: `Weapon position editor ${newState ? 'ENABLED' : 'DISABLED'}`,
          timestamp: new Date()
        });
        if (newState) {
          addLog({
            type: 'info',
            message: 'Adjust weapon position/rotation/scale in the Leva panel (top right)',
            timestamp: new Date()
          });
        }
      } else if (cmd === 'players') {
        // Handle players list with actual data
        addLog({ type: 'info', message: '=== Online Players ===', timestamp: new Date() });
        if (onlinePlayers.length === 0) {
          addLog({ type: 'info', message: '  No other players online', timestamp: new Date() });
        } else {
          onlinePlayers.forEach((player, i) => {
            addLog({
              type: 'info',
              message: `  ${i + 1}. ${player.username} (${player.id.slice(0, 8)}...)`,
              timestamp: new Date()
            });
          });
        }
        addLog({ type: 'info', message: `  Total: ${onlinePlayers.length + 1} player(s) (including you)`, timestamp: new Date() });
      } else if (BUILT_IN_COMMANDS[cmd]) {
        BUILT_IN_COMMANDS[cmd].handler(args, addLog);
      } else {
        addLog({ type: 'error', message: `Unknown command: ${cmd}. Type /help for available commands.`, timestamp: new Date() });
      }
    } else {
      // Custom command handler
      onCommand?.(trimmed, trimmed.split(' '));
    }

    setInput('');
  };

  // Handle history navigation and tab completion
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyIndex < commandHistory.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setInput(commandHistory[commandHistory.length - 1 - newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(commandHistory[commandHistory.length - 1 - newIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInput('');
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      if (suggestions.length > 0) {
        setInput('/' + suggestions[0]);
        setSuggestions([]);
      }
    }
  };

  const getLogColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'error': return 'text-red-400';
      case 'warn': return 'text-yellow-400';
      case 'info': return 'text-cyan-400';
      case 'cmd': return 'text-green-400';
      case 'success': return 'text-emerald-400';
      default: return 'text-gray-300';
    }
  };

  if (!isOpen) {
    return (
      <div className="fixed top-2 left-2 z-50 text-white/50 text-xs font-mono pointer-events-none">
        Press ` for console
      </div>
    );
  }

  return (
    <div className="fixed inset-x-0 top-0 h-1/2 bg-black/90 z-50 flex flex-col font-mono text-sm border-b-2 border-green-500">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-700">
        <span className="text-green-400 font-bold">Dev Console</span>
        <div className="flex gap-4 text-xs text-gray-400">
          {devStore.godMode && <span className="text-yellow-400">[GOD]</span>}
          {devStore.noclip && <span className="text-purple-400">[NOCLIP]</span>}
          {devStore.unlimitedAmmo && <span className="text-cyan-400">[AMMO]</span>}
          {devStore.timeScale !== 1 && <span className="text-orange-400">[{devStore.timeScale}x]</span>}
          <span>Type /help for commands</span>
          <button onClick={() => setIsOpen(false)} className="text-red-400 hover:text-red-300">
            [ESC to close]
          </button>
        </div>
      </div>

      {/* Logs */}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {logs.map((log, i) => (
          <div key={i} className={`${getLogColor(log.type)} break-all`}>
            <span className="text-gray-500 text-xs mr-2">
              {log.timestamp.toLocaleTimeString()}
            </span>
            {log.message}
          </div>
        ))}
        <div ref={logsEndRef} />
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="px-4 py-1 bg-gray-800 border-t border-gray-700 flex gap-4 text-xs">
          <span className="text-gray-500">Tab to complete:</span>
          {suggestions.map(s => (
            <span key={s} className="text-cyan-400">/{s}</span>
          ))}
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex border-t border-gray-700">
        <span className="px-2 py-2 text-green-400">&gt;</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent text-white outline-none py-2 pr-4"
          placeholder="Enter command (start with / for built-in commands)"
          autoComplete="off"
        />
      </form>
    </div>
  );
}

export default DevConsole;
