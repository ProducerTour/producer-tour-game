// Quest Store - Zustand store for quest state management
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  Quest,
  QuestDefinition,
  QuestReward,
} from './types';

interface QuestState {
  // Quest data
  quests: Map<string, Quest>;
  activeQuestIds: Set<string>;
  completedQuestIds: Set<string>;

  // Tracking
  trackedQuestId: string | null;

  // Actions
  loadQuestDefinitions: (definitions: QuestDefinition[]) => void;
  acceptQuest: (questId: string) => boolean;
  abandonQuest: (questId: string) => void;
  updateObjective: (questId: string, objectiveId: string, progress: number) => void;
  completeQuest: (questId: string) => QuestReward[] | null;
  failQuest: (questId: string) => void;
  trackQuest: (questId: string | null) => void;

  // Queries
  getQuest: (questId: string) => Quest | undefined;
  getActiveQuests: () => Quest[];
  getAvailableQuests: () => Quest[];
  getCompletedQuests: () => Quest[];
  getTrackedQuest: () => Quest | undefined;
  canAcceptQuest: (questId: string) => boolean;
  isQuestComplete: (questId: string) => boolean;
  getQuestProgress: (questId: string) => number;

  // Event handlers (called by game systems)
  onItemCollected: (itemId: string, quantity: number) => void;
  onEntityKilled: (entityId: string, entityType: string) => void;
  onLocationVisited: (locationId: string) => void;
  onEntityInteracted: (entityId: string) => void;
  onItemDelivered: (itemId: string, npcId: string) => void;

  // Persistence
  reset: () => void;
}

export const useQuestStore = create<QuestState>()(
  persist(
    (set, get) => ({
      quests: new Map(),
      activeQuestIds: new Set(),
      completedQuestIds: new Set(),
      trackedQuestId: null,

      loadQuestDefinitions: (definitions) => {
        set((state) => {
          const newQuests = new Map(state.quests);

          for (const def of definitions) {
            // Only add if not already exists (preserve state)
            if (!newQuests.has(def.id)) {
              newQuests.set(def.id, {
                ...def,
                status: 'locked',
                progress: 0,
                objectives: def.objectives.map((o) => ({ ...o, current: 0, completed: false })),
              });
            }
          }

          // Update quest availability
          updateQuestAvailability(newQuests, state.completedQuestIds);

          return { quests: newQuests };
        });
      },

      acceptQuest: (questId) => {
        const state = get();
        const quest = state.quests.get(questId);

        if (!quest || quest.status !== 'available') {
          return false;
        }

        if (!state.canAcceptQuest(questId)) {
          return false;
        }

        set((state) => {
          const newQuests = new Map(state.quests);
          const newActiveIds = new Set(state.activeQuestIds);

          const updatedQuest: Quest = {
            ...quest,
            status: 'active',
            startedAt: Date.now(),
          };

          newQuests.set(questId, updatedQuest);
          newActiveIds.add(questId);

          return {
            quests: newQuests,
            activeQuestIds: newActiveIds,
            // Auto-track if first active quest
            trackedQuestId: state.trackedQuestId ?? questId,
          };
        });

        console.log(`📜 Quest accepted: ${quest.title}`);
        return true;
      },

      abandonQuest: (questId) => {
        set((state) => {
          const quest = state.quests.get(questId);
          if (!quest || quest.status !== 'active') return state;

          const newQuests = new Map(state.quests);
          const newActiveIds = new Set(state.activeQuestIds);

          // Reset quest state
          newQuests.set(questId, {
            ...quest,
            status: 'available',
            progress: 0,
            startedAt: undefined,
            objectives: quest.objectives.map((o) => ({ ...o, current: 0, completed: false })),
          });

          newActiveIds.delete(questId);

          return {
            quests: newQuests,
            activeQuestIds: newActiveIds,
            trackedQuestId: state.trackedQuestId === questId ? null : state.trackedQuestId,
          };
        });
      },

      updateObjective: (questId, objectiveId, progress) => {
        set((state) => {
          const quest = state.quests.get(questId);
          if (!quest || quest.status !== 'active') return state;

          const newQuests = new Map(state.quests);
          const updatedObjectives = quest.objectives.map((obj) => {
            if (obj.id === objectiveId) {
              const newCurrent = Math.min(progress, obj.required);
              return {
                ...obj,
                current: newCurrent,
                completed: newCurrent >= obj.required,
              };
            }
            return obj;
          });

          // Calculate overall progress
          const requiredObjectives = updatedObjectives.filter((o) => !o.optional);
          const totalRequired = requiredObjectives.reduce((sum, o) => sum + o.required, 0);
          const totalProgress = requiredObjectives.reduce(
            (sum, o) => sum + Math.min(o.current, o.required),
            0
          );
          const overallProgress = totalRequired > 0 ? totalProgress / totalRequired : 0;

          newQuests.set(questId, {
            ...quest,
            objectives: updatedObjectives,
            progress: overallProgress,
          });

          return { quests: newQuests };
        });
      },

      completeQuest: (questId) => {
        const state = get();
        const quest = state.quests.get(questId);

        if (!quest || quest.status !== 'active') {
          return null;
        }

        // Check all required objectives are complete
        const allComplete = quest.objectives
          .filter((o) => !o.optional)
          .every((o) => o.completed);

        if (!allComplete) {
          return null;
        }

        set((state) => {
          const newQuests = new Map(state.quests);
          const newActiveIds = new Set(state.activeQuestIds);
          const newCompletedIds = new Set(state.completedQuestIds);

          newQuests.set(questId, {
            ...quest,
            status: 'completed',
            progress: 1,
            completedAt: Date.now(),
          });

          newActiveIds.delete(questId);
          newCompletedIds.add(questId);

          // Update quest availability (might unlock new quests)
          updateQuestAvailability(newQuests, newCompletedIds);

          return {
            quests: newQuests,
            activeQuestIds: newActiveIds,
            completedQuestIds: newCompletedIds,
            trackedQuestId: state.trackedQuestId === questId ? null : state.trackedQuestId,
          };
        });

        console.log(`🎉 Quest completed: ${quest.title}`);
        return quest.rewards;
      },

      failQuest: (questId) => {
        set((state) => {
          const quest = state.quests.get(questId);
          if (!quest || quest.status !== 'active') return state;

          const newQuests = new Map(state.quests);
          const newActiveIds = new Set(state.activeQuestIds);

          newQuests.set(questId, {
            ...quest,
            status: 'failed',
          });

          newActiveIds.delete(questId);

          return {
            quests: newQuests,
            activeQuestIds: newActiveIds,
          };
        });
      },

      trackQuest: (questId) => {
        set({ trackedQuestId: questId });
      },

      getQuest: (questId) => get().quests.get(questId),

      getActiveQuests: () => {
        const state = get();
        return Array.from(state.activeQuestIds)
          .map((id) => state.quests.get(id))
          .filter((q): q is Quest => q !== undefined);
      },

      getAvailableQuests: () => {
        const state = get();
        return Array.from(state.quests.values()).filter((q) => q.status === 'available');
      },

      getCompletedQuests: () => {
        const state = get();
        return Array.from(state.completedQuestIds)
          .map((id) => state.quests.get(id))
          .filter((q): q is Quest => q !== undefined);
      },

      getTrackedQuest: () => {
        const state = get();
        return state.trackedQuestId ? state.quests.get(state.trackedQuestId) : undefined;
      },

      canAcceptQuest: (questId) => {
        const state = get();
        const quest = state.quests.get(questId);
        if (!quest) return false;

        // Check prerequisites
        if (!quest.requiredQuests.every((id) => state.completedQuestIds.has(id))) {
          return false;
        }

        // Check level (would need player level from another store)
        // if (playerLevel < quest.requiredLevel) return false;

        // Check not already active or completed
        if (state.activeQuestIds.has(questId) || state.completedQuestIds.has(questId)) {
          return false;
        }

        return quest.status === 'available';
      },

      isQuestComplete: (questId) => get().completedQuestIds.has(questId),

      getQuestProgress: (questId) => get().quests.get(questId)?.progress ?? 0,

      // Event handlers
      onItemCollected: (itemId, quantity) => {
        const state = get();
        for (const questId of state.activeQuestIds) {
          const quest = state.quests.get(questId);
          if (!quest) continue;

          for (const obj of quest.objectives) {
            if (obj.type === 'collect' && obj.target === itemId && !obj.completed) {
              state.updateObjective(questId, obj.id, obj.current + quantity);
            }
          }
        }
      },

      onEntityKilled: (entityId, entityType) => {
        const state = get();
        for (const questId of state.activeQuestIds) {
          const quest = state.quests.get(questId);
          if (!quest) continue;

          for (const obj of quest.objectives) {
            if (obj.type === 'kill' && (obj.target === entityId || obj.target === entityType) && !obj.completed) {
              state.updateObjective(questId, obj.id, obj.current + 1);
            }
          }
        }
      },

      onLocationVisited: (locationId) => {
        const state = get();
        for (const questId of state.activeQuestIds) {
          const quest = state.quests.get(questId);
          if (!quest) continue;

          for (const obj of quest.objectives) {
            if (obj.type === 'visit' && obj.target === locationId && !obj.completed) {
              state.updateObjective(questId, obj.id, 1);
            }
          }
        }
      },

      onEntityInteracted: (entityId) => {
        const state = get();
        for (const questId of state.activeQuestIds) {
          const quest = state.quests.get(questId);
          if (!quest) continue;

          for (const obj of quest.objectives) {
            if (obj.type === 'interact' && obj.target === entityId && !obj.completed) {
              state.updateObjective(questId, obj.id, obj.current + 1);
            }
          }
        }
      },

      onItemDelivered: (itemId, npcId) => {
        const state = get();
        for (const questId of state.activeQuestIds) {
          const quest = state.quests.get(questId);
          if (!quest) continue;

          for (const obj of quest.objectives) {
            if (obj.type === 'deliver' && obj.target === `${itemId}:${npcId}` && !obj.completed) {
              state.updateObjective(questId, obj.id, obj.current + 1);
            }
          }
        }
      },

      reset: () => {
        set({
          quests: new Map(),
          activeQuestIds: new Set(),
          completedQuestIds: new Set(),
          trackedQuestId: null,
        });
      },
    }),
    {
      name: 'quest-storage',
      partialize: (state) => ({
        // Only persist completion state, not full quest data
        completedQuestIds: Array.from(state.completedQuestIds),
        activeQuestIds: Array.from(state.activeQuestIds),
        trackedQuestId: state.trackedQuestId,
      }),
      merge: (persisted, current) => {
        const persistedData = persisted as any;
        return {
          ...current,
          completedQuestIds: new Set(persistedData?.completedQuestIds ?? []),
          activeQuestIds: new Set(persistedData?.activeQuestIds ?? []),
          trackedQuestId: persistedData?.trackedQuestId ?? null,
        };
      },
    }
  )
);

// Helper to update quest availability based on prerequisites
function updateQuestAvailability(quests: Map<string, Quest>, completedIds: Set<string>): void {
  for (const quest of quests.values()) {
    if (quest.status === 'locked') {
      const prereqsMet = quest.requiredQuests.every((id) => completedIds.has(id));
      if (prereqsMet) {
        quest.status = 'available';
      }
    }
  }
}
