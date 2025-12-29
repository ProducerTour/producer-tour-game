// Save Manager - game state persistence and save/load functionality
import { compress, decompress } from './compression';

export interface SaveMetadata {
  id: string;
  name: string;
  timestamp: number;
  playtime: number; // seconds
  version: string;
  thumbnail?: string;
  location?: string;
  level?: number;
}

export interface GameSaveData {
  metadata: SaveMetadata;
  player: {
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number; w: number };
    health: number;
    maxHealth: number;
    stamina: number;
    maxStamina: number;
    level: number;
    experience: number;
  };
  inventory: {
    slots: Array<{ slotId: string; itemId: string; quantity: number }>;
    currencies: Array<{ id: string; amount: number }>;
    equipped: Array<{ slot: string; itemSlotId: string }>;
  };
  quests: {
    active: string[];
    completed: string[];
    progress: Array<{
      questId: string;
      objectives: Array<{ id: string; current: number; completed: boolean }>;
    }>;
  };
  world: {
    visitedLocations: string[];
    unlockedAreas: string[];
    discoveredSecrets: string[];
    worldState: Record<string, unknown>;
  };
  settings: {
    audio: { master: number; music: number; sfx: number; ambient: number };
    graphics: { quality: string; shadows: boolean; postProcessing: boolean };
    controls: { sensitivity: number; invertY: boolean };
  };
  statistics: {
    totalPlaytime: number;
    enemiesDefeated: number;
    itemsCollected: number;
    questsCompleted: number;
    deathCount: number;
    distanceTraveled: number;
  };
  customData: Record<string, unknown>;
}

export interface SaveSlot {
  index: number;
  metadata: SaveMetadata | null;
  isEmpty: boolean;
}

const SAVE_VERSION = '1.0.0';
const MAX_SAVE_SLOTS = 5;
const AUTOSAVE_SLOT = 0;
const STORAGE_KEY_PREFIX = 'game_save_';
// Reserved for future cloud sync feature
const _CLOUD_SYNC_KEY = 'cloud_saves';
void _CLOUD_SYNC_KEY;

export class SaveManager {
  private currentSaveSlot: number = -1;
  private autosaveInterval: number | null = null;
  private onSaveCallbacks: Set<(slot: number) => void> = new Set();
  private onLoadCallbacks: Set<(data: GameSaveData) => void> = new Set();
  private pendingCloudSync = false;

  // Get save data from game state
  private gatherSaveData: (() => GameSaveData) | null = null;
  // Apply save data to game state
  private applySaveData: ((data: GameSaveData) => void) | null = null;

  constructor() {
    // Initialize
  }

  // Set callbacks for gathering and applying save data
  setDataHandlers(
    gather: () => GameSaveData,
    apply: (data: GameSaveData) => void
  ): void {
    this.gatherSaveData = gather;
    this.applySaveData = apply;
  }

  // Get all save slots
  getSaveSlots(): SaveSlot[] {
    const slots: SaveSlot[] = [];

    for (let i = 0; i < MAX_SAVE_SLOTS; i++) {
      const data = this.loadFromStorage(i);
      slots.push({
        index: i,
        metadata: data?.metadata ?? null,
        isEmpty: !data,
      });
    }

    return slots;
  }

  // Save game to slot
  async save(slot: number, name?: string): Promise<boolean> {
    if (!this.gatherSaveData) {
      console.error('Save data handler not set');
      return false;
    }

    try {
      const saveData = this.gatherSaveData();

      // Update metadata
      saveData.metadata = {
        ...saveData.metadata,
        id: `save_${slot}_${Date.now()}`,
        name: name ?? saveData.metadata.name ?? `Save ${slot}`,
        timestamp: Date.now(),
        version: SAVE_VERSION,
      };

      // Compress and save
      const compressed = compress(JSON.stringify(saveData));
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${slot}`, compressed);

      this.currentSaveSlot = slot;

      // Notify listeners
      this.onSaveCallbacks.forEach((cb) => cb(slot));

      console.log(`💾 Game saved to slot ${slot}`);

      // Queue cloud sync
      this.queueCloudSync();

      return true;
    } catch (error) {
      console.error('Failed to save game:', error);
      return false;
    }
  }

  // Load game from slot
  async load(slot: number): Promise<boolean> {
    if (!this.applySaveData) {
      console.error('Load data handler not set');
      return false;
    }

    try {
      const saveData = this.loadFromStorage(slot);

      if (!saveData) {
        console.warn(`No save data in slot ${slot}`);
        return false;
      }

      // Version migration if needed
      const migratedData = this.migrateData(saveData);

      // Apply to game
      this.applySaveData(migratedData);
      this.currentSaveSlot = slot;

      // Notify listeners
      this.onLoadCallbacks.forEach((cb) => cb(migratedData));

      console.log(`📂 Game loaded from slot ${slot}`);
      return true;
    } catch (error) {
      console.error('Failed to load game:', error);
      return false;
    }
  }

  // Delete save from slot
  deleteSave(slot: number): boolean {
    try {
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}${slot}`);
      console.log(`🗑️ Deleted save from slot ${slot}`);
      return true;
    } catch (error) {
      console.error('Failed to delete save:', error);
      return false;
    }
  }

  // Autosave
  autosave(): Promise<boolean> {
    return this.save(AUTOSAVE_SLOT, 'Autosave');
  }

  // Start autosave interval
  startAutosave(intervalMs: number = 60000): void {
    this.stopAutosave();
    this.autosaveInterval = window.setInterval(() => {
      this.autosave();
    }, intervalMs);
    console.log(`⏰ Autosave enabled (every ${intervalMs / 1000}s)`);
  }

  // Stop autosave
  stopAutosave(): void {
    if (this.autosaveInterval !== null) {
      clearInterval(this.autosaveInterval);
      this.autosaveInterval = null;
    }
  }

  // Quick save to current slot
  quickSave(): Promise<boolean> {
    const slot = this.currentSaveSlot >= 0 ? this.currentSaveSlot : 1;
    return this.save(slot);
  }

  // Quick load from current slot
  quickLoad(): Promise<boolean> {
    if (this.currentSaveSlot < 0) {
      // Try to load most recent save
      const slots = this.getSaveSlots().filter((s) => !s.isEmpty);
      if (slots.length === 0) return Promise.resolve(false);

      slots.sort((a, b) => (b.metadata?.timestamp ?? 0) - (a.metadata?.timestamp ?? 0));
      return this.load(slots[0].index);
    }

    return this.load(this.currentSaveSlot);
  }

  // Export save to file
  exportSave(slot: number): string | null {
    const data = this.loadFromStorage(slot);
    if (!data) return null;

    return JSON.stringify(data, null, 2);
  }

  // Import save from file
  importSave(jsonString: string, slot: number): boolean {
    try {
      const data = JSON.parse(jsonString) as GameSaveData;

      // Validate
      if (!data.metadata || !data.player) {
        throw new Error('Invalid save data format');
      }

      const compressed = compress(JSON.stringify(data));
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${slot}`, compressed);

      console.log(`📥 Imported save to slot ${slot}`);
      return true;
    } catch (error) {
      console.error('Failed to import save:', error);
      return false;
    }
  }

  // Cloud sync (placeholder - would integrate with backend)
  private async queueCloudSync(): Promise<void> {
    if (this.pendingCloudSync) return;

    this.pendingCloudSync = true;

    // Debounce cloud sync
    setTimeout(async () => {
      await this.syncToCloud();
      this.pendingCloudSync = false;
    }, 5000);
  }

  private async syncToCloud(): Promise<void> {
    // Would sync to backend API
    console.log('☁️ Cloud sync queued');
  }

  async loadFromCloud(): Promise<boolean> {
    // Would load from backend API
    console.log('☁️ Loading from cloud...');
    return false;
  }

  // Private helpers
  private loadFromStorage(slot: number): GameSaveData | null {
    try {
      const compressed = localStorage.getItem(`${STORAGE_KEY_PREFIX}${slot}`);
      if (!compressed) return null;

      const json = decompress(compressed);
      return JSON.parse(json) as GameSaveData;
    } catch (error) {
      console.error(`Failed to load save from slot ${slot}:`, error);
      return null;
    }
  }

  private migrateData(data: GameSaveData): GameSaveData {
    // Handle version migrations
    const version = data.metadata.version;

    if (version === SAVE_VERSION) {
      return data;
    }

    // Migration logic would go here
    console.log(`Migrating save from v${version} to v${SAVE_VERSION}`);

    return {
      ...data,
      metadata: {
        ...data.metadata,
        version: SAVE_VERSION,
      },
    };
  }

  // Event subscriptions
  onSave(callback: (slot: number) => void): () => void {
    this.onSaveCallbacks.add(callback);
    return () => this.onSaveCallbacks.delete(callback);
  }

  onLoad(callback: (data: GameSaveData) => void): () => void {
    this.onLoadCallbacks.add(callback);
    return () => this.onLoadCallbacks.delete(callback);
  }

  // Getters
  getCurrentSlot(): number {
    return this.currentSaveSlot;
  }

  hasAutosave(): boolean {
    return this.loadFromStorage(AUTOSAVE_SLOT) !== null;
  }

  // Cleanup
  dispose(): void {
    this.stopAutosave();
    this.onSaveCallbacks.clear();
    this.onLoadCallbacks.clear();
  }
}

// Create default empty save data
export function createEmptySaveData(_playerName: string = 'Player'): GameSaveData {
  return {
    metadata: {
      id: `save_${Date.now()}`,
      name: 'New Game',
      timestamp: Date.now(),
      playtime: 0,
      version: SAVE_VERSION,
    },
    player: {
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      health: 100,
      maxHealth: 100,
      stamina: 100,
      maxStamina: 100,
      level: 1,
      experience: 0,
    },
    inventory: {
      slots: [],
      currencies: [
        { id: 'gold', amount: 0 },
        { id: 'gems', amount: 0 },
      ],
      equipped: [],
    },
    quests: {
      active: [],
      completed: [],
      progress: [],
    },
    world: {
      visitedLocations: [],
      unlockedAreas: ['starting_area'],
      discoveredSecrets: [],
      worldState: {},
    },
    settings: {
      audio: { master: 100, music: 70, sfx: 100, ambient: 50 },
      graphics: { quality: 'high', shadows: true, postProcessing: true },
      controls: { sensitivity: 100, invertY: false },
    },
    statistics: {
      totalPlaytime: 0,
      enemiesDefeated: 0,
      itemsCollected: 0,
      questsCompleted: 0,
      deathCount: 0,
      distanceTraveled: 0,
    },
    customData: {},
  };
}

// Singleton
let saveManagerInstance: SaveManager | null = null;

export function getSaveManager(): SaveManager {
  if (!saveManagerInstance) {
    saveManagerInstance = new SaveManager();
  }
  return saveManagerInstance;
}

export function resetSaveManager(): void {
  if (saveManagerInstance) {
    saveManagerInstance.dispose();
    saveManagerInstance = null;
  }
}
