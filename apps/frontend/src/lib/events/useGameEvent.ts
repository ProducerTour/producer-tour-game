/**
 * useGameEvent.ts
 *
 * React hooks for the game event system.
 * Automatically handles subscription cleanup on unmount.
 */

import { useEffect, useCallback, useRef } from 'react';
import {
  GameEventType,
  GameEventByType,
  GameEventHandler,
  getGameEventBus,
  emitGameEvent as emit,
} from './GameEvents';

/**
 * Subscribe to a game event. Handler is automatically cleaned up on unmount.
 *
 * @example
 * ```tsx
 * function DamageIndicator() {
 *   const [damage, setDamage] = useState(0);
 *
 *   useGameEvent('PLAYER_DAMAGED', (event) => {
 *     setDamage(event.amount);
 *     // Show damage indicator...
 *   });
 *
 *   return damage > 0 ? <DamageUI amount={damage} /> : null;
 * }
 * ```
 */
export function useGameEvent<T extends GameEventType>(
  type: T,
  handler: GameEventHandler<T>,
  deps: React.DependencyList = []
): void {
  // Use ref to avoid re-subscribing when handler changes
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const eventBus = getGameEventBus();
    const unsubscribe = eventBus.on(type, (event) => {
      handlerRef.current(event);
    });

    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, ...deps]);
}

/**
 * Subscribe to multiple event types with a single handler.
 *
 * @example
 * ```tsx
 * useGameEvents(['NPC_KILLED', 'NPC_SPAWNED'], (event) => {
 *   console.log('NPC event:', event.type);
 * });
 * ```
 */
export function useGameEvents<T extends GameEventType>(
  types: T[],
  handler: GameEventHandler<T>,
  deps: React.DependencyList = []
): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const eventBus = getGameEventBus();
    const unsubscribes = types.map((type) =>
      eventBus.on(type, (event) => {
        handlerRef.current(event as GameEventByType<T>);
      })
    );

    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [types.join(','), ...deps]);
}

/**
 * Returns a stable function to emit events.
 *
 * @example
 * ```tsx
 * function WeaponSystem() {
 *   const emitEvent = useEmitGameEvent();
 *
 *   const fireWeapon = () => {
 *     emitEvent({ type: 'WEAPON_FIRED', weapon: 'rifle', ... });
 *   };
 * }
 * ```
 */
export function useEmitGameEvent() {
  return useCallback(<T extends GameEventType>(event: GameEventByType<T>) => {
    emit(event);
  }, []);
}

/**
 * Log all events to console (debug hook).
 * Only use in development!
 */
export function useGameEventLogger(prefix: string = '[GameEvent]'): void {
  useEffect(() => {
    const eventBus = getGameEventBus();
    const unsubscribe = eventBus.onAll((event) => {
      console.log(`${prefix} ${event.type}`, event);
    });

    return unsubscribe;
  }, [prefix]);
}

/**
 * Count how many times an event has fired.
 * Useful for debugging and analytics.
 */
export function useGameEventCount<T extends GameEventType>(type: T): number {
  const countRef = useRef(0);

  useGameEvent(type, () => {
    countRef.current += 1;
  });

  return countRef.current;
}
