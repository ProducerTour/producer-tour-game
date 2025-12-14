// Anti-Cheat System - server-side validation and cheat detection
import { Client } from 'colyseus';

export interface PlayerState {
  x: number;
  y: number;
  z: number;
  timestamp: number;
}

export interface ValidationResult {
  valid: boolean;
  reason?: string;
  severity?: 'warning' | 'kick' | 'ban';
}

export interface AntiCheatConfig {
  maxSpeed: number; // units per second
  maxTeleportDistance: number; // max allowed single-frame movement
  positionHistorySize: number;
  maxActionsPerSecond: number;
  maxInvalidPositions: number;
  speedViolationThreshold: number;
}

const DEFAULT_CONFIG: AntiCheatConfig = {
  maxSpeed: 15, // 15 units/sec (run speed ~10)
  maxTeleportDistance: 5, // Allow some lag compensation
  positionHistorySize: 60,
  maxActionsPerSecond: 30,
  maxInvalidPositions: 3,
  speedViolationThreshold: 5,
};

export class AntiCheat {
  private config: AntiCheatConfig;
  private playerHistory: Map<string, PlayerState[]> = new Map();
  private actionCounts: Map<string, { count: number; timestamp: number }> = new Map();
  private violations: Map<string, { count: number; type: string; timestamp: number }[]> = new Map();

  constructor(config: Partial<AntiCheatConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // Validate player position update
  validatePosition(
    playerId: string,
    newPosition: { x: number; y: number; z: number },
    timestamp: number
  ): ValidationResult {
    const history = this.playerHistory.get(playerId) || [];
    const lastPosition = history[history.length - 1];

    // First position - no validation needed
    if (!lastPosition) {
      this.updateHistory(playerId, newPosition, timestamp);
      return { valid: true };
    }

    const timeDelta = (timestamp - lastPosition.timestamp) / 1000; // seconds
    if (timeDelta <= 0) {
      return {
        valid: false,
        reason: 'Invalid timestamp (time going backwards)',
        severity: 'warning',
      };
    }

    // Calculate distance moved
    const dx = newPosition.x - lastPosition.x;
    const dy = newPosition.y - lastPosition.y;
    const dz = newPosition.z - lastPosition.z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

    // Check for teleportation
    if (distance > this.config.maxTeleportDistance) {
      this.recordViolation(playerId, 'teleport');
      const violationCount = this.getViolationCount(playerId, 'teleport');

      if (violationCount >= this.config.maxInvalidPositions) {
        return {
          valid: false,
          reason: `Teleportation detected (moved ${distance.toFixed(1)} units)`,
          severity: 'kick',
        };
      }

      return {
        valid: false,
        reason: `Suspicious movement (${distance.toFixed(1)} units)`,
        severity: 'warning',
      };
    }

    // Check for speed hacking
    const speed = distance / timeDelta;
    if (speed > this.config.maxSpeed) {
      this.recordViolation(playerId, 'speed');
      const violationCount = this.getViolationCount(playerId, 'speed');

      if (violationCount >= this.config.speedViolationThreshold) {
        return {
          valid: false,
          reason: `Speed hack detected (${speed.toFixed(1)} units/sec)`,
          severity: 'kick',
        };
      }

      return {
        valid: false,
        reason: `Moving too fast (${speed.toFixed(1)} units/sec)`,
        severity: 'warning',
      };
    }

    // Valid movement
    this.updateHistory(playerId, newPosition, timestamp);
    return { valid: true };
  }

  // Rate limit actions (attacks, item uses, etc.)
  validateAction(playerId: string, _actionType: string): ValidationResult {
    const now = Date.now();
    const actionData = this.actionCounts.get(playerId);

    if (!actionData || now - actionData.timestamp > 1000) {
      // Reset counter every second
      this.actionCounts.set(playerId, { count: 1, timestamp: now });
      return { valid: true };
    }

    actionData.count++;

    if (actionData.count > this.config.maxActionsPerSecond) {
      this.recordViolation(playerId, 'action_spam');
      return {
        valid: false,
        reason: `Too many actions (${actionData.count}/sec)`,
        severity: 'warning',
      };
    }

    return { valid: true };
  }

  // Validate damage/combat
  validateDamage(
    attackerId: string,
    targetId: string,
    damage: number,
    attackerPos: { x: number; z: number },
    targetPos: { x: number; z: number },
    maxRange: number = 5
  ): ValidationResult {
    // Check range
    const dx = targetPos.x - attackerPos.x;
    const dz = targetPos.z - attackerPos.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    if (distance > maxRange * 1.5) {
      // Allow some tolerance
      this.recordViolation(attackerId, 'range_hack');
      return {
        valid: false,
        reason: `Attack out of range (${distance.toFixed(1)} > ${maxRange})`,
        severity: 'warning',
      };
    }

    // Check damage value (should be validated against weapon stats)
    if (damage < 0 || damage > 1000) {
      this.recordViolation(attackerId, 'damage_hack');
      return {
        valid: false,
        reason: `Invalid damage value: ${damage}`,
        severity: 'kick',
      };
    }

    // Cannot attack self
    if (attackerId === targetId) {
      return {
        valid: false,
        reason: 'Cannot attack self',
        severity: 'warning',
      };
    }

    return { valid: true };
  }

  // Validate item transactions
  validateItemTransaction(
    playerId: string,
    itemId: string,
    quantity: number,
    playerInventory: Map<string, number>
  ): ValidationResult {
    if (quantity <= 0) {
      return {
        valid: false,
        reason: 'Invalid quantity',
        severity: 'warning',
      };
    }

    const currentQuantity = playerInventory.get(itemId) || 0;
    if (quantity > currentQuantity) {
      this.recordViolation(playerId, 'item_dupe');
      return {
        valid: false,
        reason: `Insufficient items (has ${currentQuantity}, tried to use ${quantity})`,
        severity: 'kick',
      };
    }

    return { valid: true };
  }

  // Track player violations
  private recordViolation(playerId: string, type: string): void {
    const violations = this.violations.get(playerId) || [];
    violations.push({
      count: 1,
      type,
      timestamp: Date.now(),
    });

    // Keep only recent violations (last 5 minutes)
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    const recentViolations = violations.filter((v) => v.timestamp > fiveMinutesAgo);

    this.violations.set(playerId, recentViolations);
  }

  private getViolationCount(playerId: string, type: string): number {
    const violations = this.violations.get(playerId) || [];
    return violations.filter((v) => v.type === type).length;
  }

  private updateHistory(
    playerId: string,
    position: { x: number; y: number; z: number },
    timestamp: number
  ): void {
    const history = this.playerHistory.get(playerId) || [];
    history.push({ ...position, timestamp });

    // Keep only recent history
    while (history.length > this.config.positionHistorySize) {
      history.shift();
    }

    this.playerHistory.set(playerId, history);
  }

  // Clear player data
  removePlayer(playerId: string): void {
    this.playerHistory.delete(playerId);
    this.actionCounts.delete(playerId);
    this.violations.delete(playerId);
  }

  // Get player violation summary
  getViolationSummary(playerId: string): {
    total: number;
    byType: Record<string, number>;
  } {
    const violations = this.violations.get(playerId) || [];
    const byType: Record<string, number> = {};

    for (const v of violations) {
      byType[v.type] = (byType[v.type] || 0) + 1;
    }

    return {
      total: violations.length,
      byType,
    };
  }

  // Check if player should be banned
  shouldBan(playerId: string): boolean {
    const violations = this.violations.get(playerId) || [];
    return violations.length >= 10;
  }
}

// Rate limiter for specific message types
export class RateLimiter {
  private limits: Map<
    string,
    {
      maxRequests: number;
      windowMs: number;
      requests: Map<string, number[]>;
    }
  > = new Map();

  addLimit(type: string, maxRequests: number, windowMs: number): void {
    this.limits.set(type, {
      maxRequests,
      windowMs,
      requests: new Map(),
    });
  }

  check(type: string, clientId: string): boolean {
    const limit = this.limits.get(type);
    if (!limit) return true;

    const now = Date.now();
    const requests = limit.requests.get(clientId) || [];

    // Remove old requests
    const validRequests = requests.filter((time) => now - time < limit.windowMs);

    if (validRequests.length >= limit.maxRequests) {
      return false;
    }

    validRequests.push(now);
    limit.requests.set(clientId, validRequests);
    return true;
  }

  reset(clientId: string): void {
    for (const limit of this.limits.values()) {
      limit.requests.delete(clientId);
    }
  }
}

// Input sanitizer
export class InputSanitizer {
  // Sanitize string input
  static sanitizeString(input: unknown, maxLength: number = 100): string {
    if (typeof input !== 'string') return '';
    return input.slice(0, maxLength).replace(/[<>]/g, '');
  }

  // Sanitize number input
  static sanitizeNumber(input: unknown, min: number, max: number, defaultValue: number): number {
    if (typeof input !== 'number' || isNaN(input)) return defaultValue;
    return Math.max(min, Math.min(max, input));
  }

  // Sanitize vector input
  static sanitizeVector(
    input: unknown,
    bounds: { min: number; max: number }
  ): { x: number; y: number; z: number } {
    const vec = input as { x?: unknown; y?: unknown; z?: unknown };
    return {
      x: this.sanitizeNumber(vec?.x, bounds.min, bounds.max, 0),
      y: this.sanitizeNumber(vec?.y, bounds.min, bounds.max, 0),
      z: this.sanitizeNumber(vec?.z, bounds.min, bounds.max, 0),
    };
  }

  // Check if client is valid
  static isValidClient(client: Client): boolean {
    return client && typeof client.sessionId === 'string';
  }
}
