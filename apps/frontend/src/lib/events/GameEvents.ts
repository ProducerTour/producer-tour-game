/**
 * GameEvents.ts
 *
 * Typed event system for cross-cutting game concerns.
 * Decouples systems that need to communicate without direct dependencies.
 *
 * Example use cases:
 * - Combat system fires PLAYER_DAMAGED → UI shows damage indicator
 * - NPC dies → Audio plays death sound, VFX spawns particles
 * - Terrain changes → NPCs/props need to respawn
 *
 * Usage:
 * ```typescript
 * // Emit events
 * emitGameEvent({ type: 'PLAYER_DAMAGED', amount: 25, source: 'enemy' });
 *
 * // Subscribe to events (in React)
 * useGameEvent('PLAYER_DAMAGED', (event) => {
 *   showDamageIndicator(event.amount);
 * });
 * ```
 */

import * as THREE from 'three';

// =============================================================================
// EVENT TYPES
// =============================================================================

/**
 * All game events with their payloads.
 * Add new events here as the game grows.
 */
export type GameEvent =
  // Combat events
  | { type: 'PLAYER_DAMAGED'; amount: number; source: string; position?: THREE.Vector3 }
  | { type: 'PLAYER_HEALED'; amount: number; source: string }
  | { type: 'PLAYER_DIED'; position: THREE.Vector3 }
  | { type: 'PLAYER_RESPAWNED'; position: THREE.Vector3 }
  | { type: 'NPC_DAMAGED'; npcId: string; amount: number; source: string }
  | { type: 'NPC_KILLED'; npcId: string; position: THREE.Vector3; killedBy: string }
  | { type: 'NPC_SPAWNED'; npcId: string; position: THREE.Vector3; npcType: string }

  // Weapon events
  | { type: 'WEAPON_FIRED'; weapon: string; position: THREE.Vector3; direction: THREE.Vector3 }
  | { type: 'WEAPON_RELOADED'; weapon: string }
  | { type: 'WEAPON_EQUIPPED'; weapon: string | null; previousWeapon: string | null }
  | { type: 'PROJECTILE_HIT'; position: THREE.Vector3; targetType: 'npc' | 'terrain' | 'player' }

  // World events
  | { type: 'TERRAIN_SEED_CHANGED'; oldSeed: number; newSeed: number }
  | { type: 'WORLD_STATE_CHANGED'; state: string; previousState: string }
  | { type: 'CHUNK_LOADED'; chunkX: number; chunkZ: number }
  | { type: 'CHUNK_UNLOADED'; chunkX: number; chunkZ: number }

  // Interaction events
  | { type: 'INTERACTABLE_FOCUSED'; id: string; interactableType: string }
  | { type: 'INTERACTABLE_UNFOCUSED'; id: string }
  | { type: 'INTERACTABLE_USED'; id: string; interactableType: string }
  | { type: 'CAMPFIRE_LIT'; position: THREE.Vector3 }
  | { type: 'CAMPFIRE_EXTINGUISHED'; position: THREE.Vector3 }

  // Player state events
  | { type: 'PLAYER_ENTERED_WATER' }
  | { type: 'PLAYER_EXITED_WATER' }
  | { type: 'PLAYER_ENTERED_BIOME'; biome: string; position: THREE.Vector3 }
  | { type: 'PLAYER_STARTED_DANCING' }
  | { type: 'PLAYER_STOPPED_DANCING' };

// Extract event type string union
export type GameEventType = GameEvent['type'];

// Extract specific event by type
export type GameEventByType<T extends GameEventType> = Extract<GameEvent, { type: T }>;

// Event handler type
export type GameEventHandler<T extends GameEventType> = (
  event: GameEventByType<T>
) => void;

// =============================================================================
// EVENT BUS CLASS
// =============================================================================

type AnyHandler = (event: GameEvent) => void;

export class GameEventBus {
  private handlers: Map<GameEventType, Set<AnyHandler>> = new Map();
  private allHandlers: Set<AnyHandler> = new Set();

  /**
   * Subscribe to a specific event type.
   * @returns Unsubscribe function
   */
  on<T extends GameEventType>(
    type: T,
    handler: GameEventHandler<T>
  ): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler as AnyHandler);

    return () => {
      this.handlers.get(type)?.delete(handler as AnyHandler);
    };
  }

  /**
   * Subscribe to ALL events (useful for logging, debugging).
   * @returns Unsubscribe function
   */
  onAll(handler: AnyHandler): () => void {
    this.allHandlers.add(handler);
    return () => this.allHandlers.delete(handler);
  }

  /**
   * Subscribe to an event, automatically unsubscribe after first trigger.
   */
  once<T extends GameEventType>(
    type: T,
    handler: GameEventHandler<T>
  ): () => void {
    const wrapper: GameEventHandler<T> = (event) => {
      unsubscribe();
      handler(event);
    };
    const unsubscribe = this.on(type, wrapper);
    return unsubscribe;
  }

  /**
   * Emit an event to all subscribers.
   */
  emit<T extends GameEventType>(event: GameEventByType<T>): void {
    // Notify type-specific handlers
    const handlers = this.handlers.get(event.type);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(event);
        } catch (err) {
          console.error(`[GameEventBus] Handler error for ${event.type}:`, err);
        }
      });
    }

    // Notify all-event handlers
    this.allHandlers.forEach((handler) => {
      try {
        handler(event);
      } catch (err) {
        console.error('[GameEventBus] All-handler error:', err);
      }
    });
  }

  /**
   * Remove all handlers for a specific event type.
   */
  clear(type: GameEventType): void {
    this.handlers.delete(type);
  }

  /**
   * Remove ALL handlers.
   */
  clearAll(): void {
    this.handlers.clear();
    this.allHandlers.clear();
  }

  /**
   * Get count of handlers for a type (useful for debugging).
   */
  handlerCount(type: GameEventType): number {
    return this.handlers.get(type)?.size ?? 0;
  }
}

// =============================================================================
// SINGLETON ACCESS
// =============================================================================

let globalEventBus: GameEventBus | null = null;

/**
 * Get the global GameEventBus instance.
 */
export function getGameEventBus(): GameEventBus {
  if (!globalEventBus) {
    globalEventBus = new GameEventBus();
  }
  return globalEventBus;
}

/**
 * Reset the global event bus (for testing or world reset).
 */
export function resetGameEventBus(): GameEventBus {
  globalEventBus?.clearAll();
  globalEventBus = new GameEventBus();
  return globalEventBus;
}

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Emit a game event (convenience function).
 */
export function emitGameEvent<T extends GameEventType>(
  event: GameEventByType<T>
): void {
  getGameEventBus().emit(event);
}

/**
 * Subscribe to a game event (convenience function).
 * @returns Unsubscribe function
 */
export function onGameEvent<T extends GameEventType>(
  type: T,
  handler: GameEventHandler<T>
): () => void {
  return getGameEventBus().on(type, handler);
}
