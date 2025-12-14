// Save system exports
export {
  SaveManager,
  getSaveManager,
  resetSaveManager,
  createEmptySaveData,
} from './SaveManager';
export type { SaveMetadata, GameSaveData, SaveSlot } from './SaveManager';
export { compress, decompress } from './compression';
