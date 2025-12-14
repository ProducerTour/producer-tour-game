// Testing utilities module exports
export {
  // Mock Factories
  createMockPlayer,
  createMockPartyMember,
  createMockItem,
  createMockInventorySlot,
  createMockQuestDefinition,
  createMockQuest,
  createMockVector3,
  createMockQuaternion,
  createMockCamera,
  createMockScene,
  // Timing
  waitForCondition,
  advanceTimers,
  // Event simulation
  simulateKeyDown,
  simulateKeyUp,
  simulateMouseMove,
  simulateClick,
  // Store helpers
  resetAllStores,
  // Performance
  measurePerformance,
  measureAsyncPerformance,
  logPerformanceResult,
  // Network
  MockNetworkConnection,
  // Snapshot
  snapshotGameState,
} from './testUtils';
export type { PerformanceResult, MockNetworkMessage } from './testUtils';
