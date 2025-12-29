/**
 * Quest Store
 * Zustand store for quest and objective management
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type QuestStatus = 'locked' | 'available' | 'active' | 'completed' | 'failed';
export type ObjectiveType = 'location' | 'interact' | 'collect' | 'kill' | 'talk' | 'custom';

export interface QuestObjective {
  id: string;
  type: ObjectiveType;
  description: string;
  isCompleted: boolean;
  isOptional?: boolean;

  // Progress tracking
  current?: number;
  target?: number;

  // Location-based objectives
  position?: { x: number; y: number; z: number };
  radius?: number;

  // Target-based objectives (NPCs, items)
  targetId?: string;
  targetIds?: string[];
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  status: QuestStatus;

  // Objectives
  objectives: QuestObjective[];

  // Rewards
  rewards?: {
    xp?: number;
    currency?: number;
    items?: string[];
  };

  // Quest chain
  prerequisiteQuestIds?: string[];
  nextQuestId?: string;

  // UI
  icon?: string;
  color?: string;

  // Tracking
  startedAt?: number;
  completedAt?: number;
}

interface QuestStore {
  quests: Map<string, Quest>;
  activeQuestId: string | null;
  questLog: string[]; // IDs of quests in log (not locked)

  // Quest management
  addQuest: (quest: Quest) => void;
  removeQuest: (id: string) => void;
  updateQuest: (id: string, updates: Partial<Quest>) => void;
  getQuest: (id: string) => Quest | undefined;

  // Quest status
  startQuest: (id: string) => boolean;
  completeQuest: (id: string) => boolean;
  failQuest: (id: string) => void;
  abandonQuest: (id: string) => void;
  setActiveQuest: (id: string | null) => void;

  // Objective progress
  updateObjective: (questId: string, objectiveId: string, updates: Partial<QuestObjective>) => void;
  completeObjective: (questId: string, objectiveId: string) => void;
  incrementObjective: (questId: string, objectiveId: string, amount?: number) => void;

  // Queries
  getActiveQuest: () => Quest | undefined;
  getAvailableQuests: () => Quest[];
  getCompletedQuests: () => Quest[];
  getQuestsByStatus: (status: QuestStatus) => Quest[];
  getTrackedObjectives: () => { quest: Quest; objective: QuestObjective }[];

  // Progress checking
  checkLocationObjective: (position: { x: number; y: number; z: number }) => void;
  checkInteractObjective: (targetId: string) => void;
  checkKillObjective: (targetId: string) => void;
  checkCollectObjective: (itemId: string) => void;

  // Persistence
  resetProgress: () => void;
}

// Generate quest ID
let questIdCounter = 0;
export const generateQuestId = () => `quest_${++questIdCounter}`;

export const useQuestStore = create<QuestStore>()(
  persist(
    (set, get) => ({
      quests: new Map(),
      activeQuestId: null,
      questLog: [],

      // Quest management
      addQuest: (quest) => {
        const quests = new Map(get().quests);
        quests.set(quest.id, quest);

        // Add to quest log if not locked
        const questLog = [...get().questLog];
        if (quest.status !== 'locked' && !questLog.includes(quest.id)) {
          questLog.push(quest.id);
        }

        set({ quests, questLog });
      },

      removeQuest: (id) => {
        const quests = new Map(get().quests);
        quests.delete(id);
        const questLog = get().questLog.filter((qid) => qid !== id);
        const activeQuestId = get().activeQuestId === id ? null : get().activeQuestId;
        set({ quests, questLog, activeQuestId });
      },

      updateQuest: (id, updates) => {
        const quests = new Map(get().quests);
        const quest = quests.get(id);
        if (quest) {
          quests.set(id, { ...quest, ...updates });
          set({ quests });
        }
      },

      getQuest: (id) => get().quests.get(id),

      // Quest status changes
      startQuest: (id) => {
        const quest = get().quests.get(id);
        if (!quest || quest.status !== 'available') return false;

        // Check prerequisites
        if (quest.prerequisiteQuestIds?.length) {
          const allComplete = quest.prerequisiteQuestIds.every((preId) => {
            const preQuest = get().quests.get(preId);
            return preQuest?.status === 'completed';
          });
          if (!allComplete) return false;
        }

        const quests = new Map(get().quests);
        quests.set(id, {
          ...quest,
          status: 'active',
          startedAt: Date.now(),
        });

        // Add to log if not already
        const questLog = [...get().questLog];
        if (!questLog.includes(id)) {
          questLog.push(id);
        }

        set({ quests, questLog, activeQuestId: id });
        return true;
      },

      completeQuest: (id) => {
        const quest = get().quests.get(id);
        if (!quest || quest.status !== 'active') return false;

        // Check if all required objectives are complete
        const requiredComplete = quest.objectives
          .filter((o) => !o.isOptional)
          .every((o) => o.isCompleted);

        if (!requiredComplete) return false;

        const quests = new Map(get().quests);
        quests.set(id, {
          ...quest,
          status: 'completed',
          completedAt: Date.now(),
        });

        // Unlock next quest if specified
        if (quest.nextQuestId) {
          const nextQuest = quests.get(quest.nextQuestId);
          if (nextQuest && nextQuest.status === 'locked') {
            quests.set(quest.nextQuestId, { ...nextQuest, status: 'available' });
          }
        }

        // Clear active if this was active
        const activeQuestId = get().activeQuestId === id ? null : get().activeQuestId;

        set({ quests, activeQuestId });
        return true;
      },

      failQuest: (id) => {
        const quests = new Map(get().quests);
        const quest = quests.get(id);
        if (quest && quest.status === 'active') {
          quests.set(id, { ...quest, status: 'failed' });
          const activeQuestId = get().activeQuestId === id ? null : get().activeQuestId;
          set({ quests, activeQuestId });
        }
      },

      abandonQuest: (id) => {
        const quests = new Map(get().quests);
        const quest = quests.get(id);
        if (quest && quest.status === 'active') {
          // Reset objectives
          const resetObjectives = quest.objectives.map((o) => ({
            ...o,
            isCompleted: false,
            current: 0,
          }));
          quests.set(id, {
            ...quest,
            status: 'available',
            objectives: resetObjectives,
            startedAt: undefined,
          });
          const activeQuestId = get().activeQuestId === id ? null : get().activeQuestId;
          set({ quests, activeQuestId });
        }
      },

      setActiveQuest: (id) => set({ activeQuestId: id }),

      // Objective management
      updateObjective: (questId, objectiveId, updates) => {
        const quests = new Map(get().quests);
        const quest = quests.get(questId);
        if (!quest) return;

        const objectives = quest.objectives.map((o) =>
          o.id === objectiveId ? { ...o, ...updates } : o
        );
        quests.set(questId, { ...quest, objectives });
        set({ quests });
      },

      completeObjective: (questId, objectiveId) => {
        get().updateObjective(questId, objectiveId, { isCompleted: true });

        // Auto-complete quest if all required objectives done
        const quest = get().quests.get(questId);
        if (quest) {
          const allDone = quest.objectives
            .filter((o) => !o.isOptional)
            .every((o) => o.isCompleted || o.id === objectiveId);
          if (allDone) {
            get().completeQuest(questId);
          }
        }
      },

      incrementObjective: (questId, objectiveId, amount = 1) => {
        const quest = get().quests.get(questId);
        if (!quest) return;

        const objective = quest.objectives.find((o) => o.id === objectiveId);
        if (!objective || objective.target === undefined) return;

        const newCurrent = Math.min((objective.current || 0) + amount, objective.target);
        get().updateObjective(questId, objectiveId, {
          current: newCurrent,
          isCompleted: newCurrent >= objective.target,
        });

        // Check if quest is complete
        if (newCurrent >= objective.target) {
          const updatedQuest = get().quests.get(questId);
          if (updatedQuest) {
            const allDone = updatedQuest.objectives
              .filter((o) => !o.isOptional)
              .every((o) => o.isCompleted);
            if (allDone) {
              get().completeQuest(questId);
            }
          }
        }
      },

      // Queries
      getActiveQuest: () => {
        const { activeQuestId, quests } = get();
        return activeQuestId ? quests.get(activeQuestId) : undefined;
      },

      getAvailableQuests: () => {
        const result: Quest[] = [];
        get().quests.forEach((quest) => {
          if (quest.status === 'available') result.push(quest);
        });
        return result;
      },

      getCompletedQuests: () => {
        const result: Quest[] = [];
        get().quests.forEach((quest) => {
          if (quest.status === 'completed') result.push(quest);
        });
        return result;
      },

      getQuestsByStatus: (status) => {
        const result: Quest[] = [];
        get().quests.forEach((quest) => {
          if (quest.status === status) result.push(quest);
        });
        return result;
      },

      getTrackedObjectives: () => {
        const result: { quest: Quest; objective: QuestObjective }[] = [];
        const { activeQuestId, quests } = get();

        if (activeQuestId) {
          const quest = quests.get(activeQuestId);
          if (quest && quest.status === 'active') {
            quest.objectives
              .filter((o) => !o.isCompleted)
              .forEach((objective) => {
                result.push({ quest, objective });
              });
          }
        }

        return result;
      },

      // Progress checking
      checkLocationObjective: (position) => {
        get().quests.forEach((quest) => {
          if (quest.status !== 'active') return;

          quest.objectives.forEach((obj) => {
            if (obj.type !== 'location' || obj.isCompleted || !obj.position) return;

            const dx = position.x - obj.position.x;
            const dz = position.z - obj.position.z;
            const distance = Math.sqrt(dx * dx + dz * dz);
            const radius = obj.radius || 3;

            if (distance <= radius) {
              get().completeObjective(quest.id, obj.id);
            }
          });
        });
      },

      checkInteractObjective: (targetId) => {
        get().quests.forEach((quest) => {
          if (quest.status !== 'active') return;

          quest.objectives.forEach((obj) => {
            if (obj.type !== 'interact' && obj.type !== 'talk') return;
            if (obj.isCompleted) return;
            if (obj.targetId !== targetId && !obj.targetIds?.includes(targetId)) return;

            get().completeObjective(quest.id, obj.id);
          });
        });
      },

      checkKillObjective: (targetId) => {
        get().quests.forEach((quest) => {
          if (quest.status !== 'active') return;

          quest.objectives.forEach((obj) => {
            if (obj.type !== 'kill' || obj.isCompleted) return;

            if (obj.targetId === targetId || obj.targetIds?.includes(targetId)) {
              if (obj.target !== undefined) {
                get().incrementObjective(quest.id, obj.id);
              } else {
                get().completeObjective(quest.id, obj.id);
              }
            }
          });
        });
      },

      checkCollectObjective: (itemId) => {
        get().quests.forEach((quest) => {
          if (quest.status !== 'active') return;

          quest.objectives.forEach((obj) => {
            if (obj.type !== 'collect' || obj.isCompleted) return;

            if (obj.targetId === itemId || obj.targetIds?.includes(itemId)) {
              if (obj.target !== undefined) {
                get().incrementObjective(quest.id, obj.id);
              } else {
                get().completeObjective(quest.id, obj.id);
              }
            }
          });
        });
      },

      resetProgress: () => {
        set({
          quests: new Map(),
          activeQuestId: null,
          questLog: [],
        });
      },
    }),
    {
      name: 'producer-tour-quests',
      // Custom serialization for Map
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) return null;
          const data = JSON.parse(str);
          return {
            ...data,
            state: {
              ...data.state,
              quests: new Map(data.state.quests),
            },
          };
        },
        setItem: (name, value) => {
          const data = {
            ...value,
            state: {
              ...value.state,
              quests: Array.from(value.state.quests.entries()),
            },
          };
          localStorage.setItem(name, JSON.stringify(data));
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
    }
  )
);

// Factory function for creating quests
export function createQuest(options: {
  id?: string;
  title: string;
  description: string;
  objectives: Omit<QuestObjective, 'isCompleted'>[];
  status?: QuestStatus;
  rewards?: Quest['rewards'];
  prerequisiteQuestIds?: string[];
  nextQuestId?: string;
  color?: string;
}): Quest {
  return {
    id: options.id || generateQuestId(),
    title: options.title,
    description: options.description,
    status: options.status || 'available',
    objectives: options.objectives.map((o) => ({
      ...o,
      isCompleted: false,
      current: o.target !== undefined ? 0 : undefined,
    })),
    rewards: options.rewards,
    prerequisiteQuestIds: options.prerequisiteQuestIds,
    nextQuestId: options.nextQuestId,
    color: options.color || '#8b5cf6',
  };
}

export default useQuestStore;
