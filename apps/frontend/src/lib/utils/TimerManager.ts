/**
 * TimerManager - Centralized timeout/interval management with cancellation support
 *
 * Solves:
 * - Memory leaks from uncancelled setTimeout/setInterval
 * - Stale closures in timer callbacks
 * - Race conditions when actions are called rapidly
 *
 * Usage:
 *   combatTimers.setTimeout('reload-rifle', () => { ... }, 2000);
 *   combatTimers.clearTimeout('reload-rifle'); // Cancel if weapon switched
 *   combatTimers.clearAll(); // Cleanup on unmount
 */

type TimerCallback = () => void;

export class TimerManager {
  private timers = new Map<string, ReturnType<typeof setTimeout>>();
  private intervals = new Map<string, ReturnType<typeof setInterval>>();

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(_name: string = 'default') {
    // Name reserved for future debugging/logging
  }

  /**
   * Set a timeout with automatic cleanup of previous timeout with same key
   */
  setTimeout(key: string, callback: TimerCallback, delay: number): void {
    // Cancel existing timer with same key
    this.clearTimeout(key);

    const timerId = setTimeout(() => {
      this.timers.delete(key);
      callback();
    }, delay);

    this.timers.set(key, timerId);
  }

  /**
   * Clear a specific timeout by key
   */
  clearTimeout(key: string): boolean {
    const timerId = this.timers.get(key);
    if (timerId) {
      clearTimeout(timerId);
      this.timers.delete(key);
      return true;
    }
    return false;
  }

  /**
   * Check if a timeout exists
   */
  hasTimeout(key: string): boolean {
    return this.timers.has(key);
  }

  /**
   * Set an interval with automatic cleanup of previous interval with same key
   */
  setInterval(key: string, callback: TimerCallback, delay: number): void {
    // Cancel existing interval with same key
    this.clearInterval(key);

    const intervalId = setInterval(callback, delay);
    this.intervals.set(key, intervalId);
  }

  /**
   * Clear a specific interval by key
   */
  clearInterval(key: string): boolean {
    const intervalId = this.intervals.get(key);
    if (intervalId) {
      clearInterval(intervalId);
      this.intervals.delete(key);
      return true;
    }
    return false;
  }

  /**
   * Check if an interval exists
   */
  hasInterval(key: string): boolean {
    return this.intervals.has(key);
  }

  /**
   * Clear all timers and intervals (use on cleanup/unmount)
   */
  clearAll(): void {
    // Clear all timeouts
    this.timers.forEach((timerId) => clearTimeout(timerId));
    this.timers.clear();

    // Clear all intervals
    this.intervals.forEach((intervalId) => clearInterval(intervalId));
    this.intervals.clear();
  }

  /**
   * Get count of active timers (for debugging)
   */
  getActiveCount(): { timeouts: number; intervals: number } {
    return {
      timeouts: this.timers.size,
      intervals: this.intervals.size,
    };
  }

  /**
   * Get all active timer keys (for debugging)
   */
  getActiveKeys(): { timeouts: string[]; intervals: string[] } {
    return {
      timeouts: Array.from(this.timers.keys()),
      intervals: Array.from(this.intervals.keys()),
    };
  }
}

// Pre-created instances for different domains
// This allows targeted cleanup without affecting other systems

/** Combat-related timers (reload, fire rate, combat exit) */
export const combatTimers = new TimerManager('combat');

/** NPC-related timers (respawn, AI updates) */
export const npcTimers = new TimerManager('npc');

/** VFX-related timers (effect duration, particle lifetime) */
export const vfxTimers = new TimerManager('vfx');

/** UI-related timers (toast duration, animation delays) */
export const uiTimers = new TimerManager('ui');

/** Trading-related timers (trade timeout, confirmation delays) */
export const tradingTimers = new TimerManager('trading');

/**
 * Clear all timers across all managers (use on app teardown)
 */
export function clearAllTimers(): void {
  combatTimers.clearAll();
  npcTimers.clearAll();
  vfxTimers.clearAll();
  uiTimers.clearAll();
  tradingTimers.clearAll();
}
