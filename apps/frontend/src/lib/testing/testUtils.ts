// Test Utilities - helpers for testing game systems
import * as THREE from 'three';
import type { Item, InventorySlot } from '../economy/inventoryStore';
import type { Quest, QuestDefinition } from '../quest/types';
import type { Player, PartyMember } from '../social/socialStore';

// Mock Factories

export function createMockPlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: `player-${Math.random().toString(36).slice(2)}`,
    username: `TestPlayer${Math.floor(Math.random() * 1000)}`,
    level: 1,
    status: 'online',
    ...overrides,
  };
}

export function createMockPartyMember(overrides: Partial<PartyMember> = {}): PartyMember {
  return {
    ...createMockPlayer(),
    role: 'member',
    isReady: false,
    ...overrides,
  };
}

export function createMockItem(overrides: Partial<Item> = {}): Item {
  return {
    id: `item-${Math.random().toString(36).slice(2)}`,
    name: 'Test Item',
    description: 'A test item for testing purposes',
    type: 'material',
    rarity: 'common',
    stackable: true,
    maxStack: 99,
    value: 10,
    ...overrides,
  };
}

export function createMockInventorySlot(overrides: Partial<InventorySlot> = {}): InventorySlot {
  return {
    item: createMockItem(),
    quantity: 1,
    ...overrides,
  };
}

export function createMockQuestDefinition(overrides: Partial<QuestDefinition> = {}): QuestDefinition {
  return {
    id: `quest-${Math.random().toString(36).slice(2)}`,
    title: 'Test Quest',
    description: 'A quest for testing purposes',
    category: 'main',
    level: 1,
    objectives: [
      {
        id: 'obj-1',
        type: 'collect',
        target: 'test-item',
        description: 'Collect 5 test items',
        required: 5,
        current: 0,
        optional: false,
        hidden: false,
        completed: false,
      },
    ],
    rewards: [
      {
        type: 'xp',
        amount: 100,
        description: '100 XP',
      },
    ],
    requiredLevel: 1,
    requiredQuests: [],
    timeLimit: undefined,
    ...overrides,
  };
}

export function createMockQuest(overrides: Partial<Quest> = {}): Quest {
  const definition = createMockQuestDefinition();
  return {
    ...definition,
    status: 'available',
    progress: 0,
    ...overrides,
  };
}

// Mock THREE.js objects

export function createMockVector3(x = 0, y = 0, z = 0): THREE.Vector3 {
  return new THREE.Vector3(x, y, z);
}

export function createMockQuaternion(): THREE.Quaternion {
  return new THREE.Quaternion();
}

export function createMockCamera(): THREE.PerspectiveCamera {
  return new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
}

export function createMockScene(): THREE.Scene {
  return new THREE.Scene();
}

// Timing utilities

export async function waitForCondition(
  condition: () => boolean,
  timeout: number = 5000,
  interval: number = 100
): Promise<void> {
  const start = Date.now();
  while (!condition()) {
    if (Date.now() - start > timeout) {
      throw new Error('Condition timeout');
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
}

declare const jest: { advanceTimersByTime: (ms: number) => void } | undefined;

export function advanceTimers(ms: number): void {
  // Only works in Jest environment
  if (typeof jest !== 'undefined' && jest) {
    jest.advanceTimersByTime(ms);
  }
}

// Event simulation

export function simulateKeyDown(key: string, modifiers: { shift?: boolean; ctrl?: boolean; alt?: boolean } = {}): void {
  const event = new KeyboardEvent('keydown', {
    key,
    code: key,
    shiftKey: modifiers.shift,
    ctrlKey: modifiers.ctrl,
    altKey: modifiers.alt,
    bubbles: true,
  });
  document.dispatchEvent(event);
}

export function simulateKeyUp(key: string): void {
  const event = new KeyboardEvent('keyup', {
    key,
    code: key,
    bubbles: true,
  });
  document.dispatchEvent(event);
}

export function simulateMouseMove(x: number, y: number): void {
  const event = new MouseEvent('mousemove', {
    clientX: x,
    clientY: y,
    bubbles: true,
  });
  document.dispatchEvent(event);
}

export function simulateClick(x: number, y: number, button: number = 0): void {
  const event = new MouseEvent('click', {
    clientX: x,
    clientY: y,
    button,
    bubbles: true,
  });
  document.dispatchEvent(event);
}

// Store testing helpers

export function resetAllStores(): void {
  // Import stores dynamically to avoid circular deps
  const { useInventoryStore } = require('../economy/inventoryStore');
  const { useTradingStore } = require('../economy/tradingStore');
  const { useSocialStore } = require('../social/socialStore');
  const { useQuestStore } = require('../quest/questStore');

  useInventoryStore.getState().reset();
  useTradingStore.getState().cancelTrade();
  useSocialStore.getState().reset();
  useQuestStore.getState().reset();
}

// Performance testing

export interface PerformanceResult {
  name: string;
  duration: number;
  iterations: number;
  average: number;
  min: number;
  max: number;
}

export function measurePerformance(
  name: string,
  fn: () => void,
  iterations: number = 1000
): PerformanceResult {
  const times: number[] = [];

  // Warmup
  for (let i = 0; i < 10; i++) {
    fn();
  }

  // Measure
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    fn();
    times.push(performance.now() - start);
  }

  const total = times.reduce((a, b) => a + b, 0);
  const sorted = times.sort((a, b) => a - b);

  return {
    name,
    duration: total,
    iterations,
    average: total / iterations,
    min: sorted[0],
    max: sorted[sorted.length - 1],
  };
}

export async function measureAsyncPerformance(
  name: string,
  fn: () => Promise<void>,
  iterations: number = 100
): Promise<PerformanceResult> {
  const times: number[] = [];

  // Warmup
  for (let i = 0; i < 5; i++) {
    await fn();
  }

  // Measure
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await fn();
    times.push(performance.now() - start);
  }

  const total = times.reduce((a, b) => a + b, 0);
  const sorted = times.sort((a, b) => a - b);

  return {
    name,
    duration: total,
    iterations,
    average: total / iterations,
    min: sorted[0],
    max: sorted[sorted.length - 1],
  };
}

// Debug utilities

export function logPerformanceResult(result: PerformanceResult): void {
  console.log(`
📊 Performance: ${result.name}
   Iterations: ${result.iterations}
   Total: ${result.duration.toFixed(2)}ms
   Average: ${result.average.toFixed(4)}ms
   Min: ${result.min.toFixed(4)}ms
   Max: ${result.max.toFixed(4)}ms
  `);
}

// Network mocking

export interface MockNetworkMessage {
  type: string;
  data: unknown;
  timestamp: number;
}

export class MockNetworkConnection {
  private messageQueue: MockNetworkMessage[] = [];
  private listeners: Map<string, Array<(data: unknown) => void>> = new Map();

  send(type: string, data: unknown): void {
    this.messageQueue.push({
      type,
      data,
      timestamp: Date.now(),
    });
  }

  on(type: string, callback: (data: unknown) => void): void {
    const listeners = this.listeners.get(type) || [];
    listeners.push(callback);
    this.listeners.set(type, listeners);
  }

  simulateReceive(type: string, data: unknown): void {
    const listeners = this.listeners.get(type) || [];
    listeners.forEach((cb) => cb(data));
  }

  getMessages(): MockNetworkMessage[] {
    return [...this.messageQueue];
  }

  getMessagesByType(type: string): MockNetworkMessage[] {
    return this.messageQueue.filter((m) => m.type === type);
  }

  clearMessages(): void {
    this.messageQueue = [];
  }
}

// Snapshot testing

export function snapshotGameState(): {
  position: { x: number; y: number; z: number };
  inventory: unknown[];
  quests: unknown[];
} {
  const { useInventoryStore } = require('../economy/inventoryStore');
  const { useQuestStore } = require('../quest/questStore');

  return {
    position: { x: 0, y: 0, z: 0 }, // Would get from player state
    inventory: Array.from(useInventoryStore.getState().slots.values()),
    quests: Array.from(useQuestStore.getState().quests.values()),
  };
}
