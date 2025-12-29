/**
 * Events module barrel export
 *
 * Typed event system for decoupled game communication.
 */

// Event types and bus
export {
  GameEventBus,
  getGameEventBus,
  resetGameEventBus,
  emitGameEvent,
  onGameEvent,
  type GameEvent,
  type GameEventType,
  type GameEventByType,
  type GameEventHandler,
} from './GameEvents';

// React hooks
export {
  useGameEvent,
  useGameEvents,
  useEmitGameEvent,
  useGameEventLogger,
  useGameEventCount,
} from './useGameEvent';
