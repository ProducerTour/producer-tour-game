// Achievement Store - tracks achievements, badges, and progression
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AchievementCategory = 'exploration' | 'combat' | 'collection' | 'social' | 'quest' | 'secret' | 'mastery';
export type AchievementRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface AchievementCondition {
  type: 'counter' | 'flag' | 'threshold' | 'collection';
  key: string;
  target: number;
  current?: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  rarity: AchievementRarity;
  points: number;
  hidden: boolean;
  conditions: AchievementCondition[];
  rewards?: {
    type: 'currency' | 'item' | 'title' | 'unlock';
    id: string;
    amount?: number;
  }[];
  unlockedAt?: number;
}

export interface PlayerLevel {
  level: number;
  experience: number;
  experienceToNext: number;
  totalExperience: number;
}

export interface Title {
  id: string;
  name: string;
  description: string;
  rarity: AchievementRarity;
  unlockedAt?: number;
}

export interface ProgressionStats {
  // Counters
  enemiesDefeated: number;
  bossesDefeated: number;
  questsCompleted: number;
  itemsCollected: number;
  secretsFound: number;
  locationsVisited: number;
  distanceTraveled: number;
  jumps: number;
  deaths: number;
  playTime: number; // seconds

  // Combat
  damageDealt: number;
  damageTaken: number;
  criticalHits: number;
  perfectDodges: number;

  // Social
  friendsMade: number;
  tradesCompleted: number;
  messagesSet: number;
  partiesJoined: number;

  // Collection
  uniqueItemsFound: number;
  rarestItemRarity: string;
  currencyEarned: number;
}

interface AchievementState {
  // Achievements
  achievements: Map<string, Achievement>;
  unlockedAchievements: Set<string>;

  // Titles
  titles: Map<string, Title>;
  unlockedTitles: Set<string>;
  equippedTitle: string | null;

  // Level & XP
  level: PlayerLevel;

  // Stats
  stats: ProgressionStats;

  // Actions
  loadAchievements: (achievements: Achievement[]) => void;
  loadTitles: (titles: Title[]) => void;
  checkAchievements: () => Achievement[];
  unlockAchievement: (achievementId: string) => boolean;
  unlockTitle: (titleId: string) => void;
  equipTitle: (titleId: string | null) => void;

  // XP & Leveling
  addExperience: (amount: number) => { leveledUp: boolean; newLevel?: number };
  getExperienceForLevel: (level: number) => number;

  // Stats tracking
  incrementStat: (stat: keyof ProgressionStats, amount?: number) => void;
  setStat: (stat: keyof ProgressionStats, value: number) => void;

  // Queries
  getAchievement: (id: string) => Achievement | undefined;
  getUnlockedAchievements: () => Achievement[];
  getLockedAchievements: () => Achievement[];
  getAchievementsByCategory: (category: AchievementCategory) => Achievement[];
  getAchievementProgress: (id: string) => number;
  getTotalPoints: () => number;
  getCompletionPercentage: () => number;

  // Utility
  reset: () => void;
}

const INITIAL_STATS: ProgressionStats = {
  enemiesDefeated: 0,
  bossesDefeated: 0,
  questsCompleted: 0,
  itemsCollected: 0,
  secretsFound: 0,
  locationsVisited: 0,
  distanceTraveled: 0,
  jumps: 0,
  deaths: 0,
  playTime: 0,
  damageDealt: 0,
  damageTaken: 0,
  criticalHits: 0,
  perfectDodges: 0,
  friendsMade: 0,
  tradesCompleted: 0,
  messagesSet: 0,
  partiesJoined: 0,
  uniqueItemsFound: 0,
  rarestItemRarity: 'common',
  currencyEarned: 0,
};

// XP curve: each level requires more XP
function calculateXPForLevel(level: number): number {
  return Math.floor(100 * Math.pow(1.5, level - 1));
}

export const useAchievementStore = create<AchievementState>()(
  persist(
    (set, get) => ({
      achievements: new Map(),
      unlockedAchievements: new Set(),
      titles: new Map(),
      unlockedTitles: new Set(),
      equippedTitle: null,
      level: {
        level: 1,
        experience: 0,
        experienceToNext: calculateXPForLevel(1),
        totalExperience: 0,
      },
      stats: { ...INITIAL_STATS },

      loadAchievements: (achievements) => {
        set((s) => {
          const newAchievements = new Map(s.achievements);
          for (const achievement of achievements) {
            // Preserve unlock state
            const existing = newAchievements.get(achievement.id);
            newAchievements.set(achievement.id, {
              ...achievement,
              unlockedAt: existing?.unlockedAt,
            });
          }
          return { achievements: newAchievements };
        });
      },

      loadTitles: (titles) => {
        set((s) => {
          const newTitles = new Map(s.titles);
          for (const title of titles) {
            const existing = newTitles.get(title.id);
            newTitles.set(title.id, {
              ...title,
              unlockedAt: existing?.unlockedAt,
            });
          }
          return { titles: newTitles };
        });
      },

      checkAchievements: () => {
        const state = get();
        const newlyUnlocked: Achievement[] = [];

        for (const [id, achievement] of state.achievements) {
          if (state.unlockedAchievements.has(id)) continue;

          // Check all conditions
          const allMet = achievement.conditions.every((condition) => {
            const currentValue = getStatValue(state.stats, condition.key);

            switch (condition.type) {
              case 'counter':
              case 'threshold':
                return currentValue >= condition.target;
              case 'flag':
                return currentValue > 0;
              case 'collection':
                return currentValue >= condition.target;
              default:
                return false;
            }
          });

          if (allMet) {
            state.unlockAchievement(id);
            newlyUnlocked.push(achievement);
          }
        }

        return newlyUnlocked;
      },

      unlockAchievement: (achievementId) => {
        const state = get();
        if (state.unlockedAchievements.has(achievementId)) return false;

        const achievement = state.achievements.get(achievementId);
        if (!achievement) return false;

        set((s) => {
          const newUnlocked = new Set(s.unlockedAchievements);
          newUnlocked.add(achievementId);

          const newAchievements = new Map(s.achievements);
          newAchievements.set(achievementId, {
            ...achievement,
            unlockedAt: Date.now(),
          });

          return {
            achievements: newAchievements,
            unlockedAchievements: newUnlocked,
          };
        });

        console.log(`🏆 Achievement unlocked: ${achievement.name}`);
        return true;
      },

      unlockTitle: (titleId) => {
        const title = get().titles.get(titleId);
        if (!title) return;

        set((s) => {
          const newUnlocked = new Set(s.unlockedTitles);
          newUnlocked.add(titleId);

          const newTitles = new Map(s.titles);
          newTitles.set(titleId, {
            ...title,
            unlockedAt: Date.now(),
          });

          return {
            titles: newTitles,
            unlockedTitles: newUnlocked,
          };
        });

        console.log(`👑 Title unlocked: ${title.name}`);
      },

      equipTitle: (titleId) => {
        if (titleId && !get().unlockedTitles.has(titleId)) return;
        set({ equippedTitle: titleId });
      },

      addExperience: (amount) => {
        let leveledUp = false;
        let newLevel: number | undefined;

        set((s) => {
          let { level, experience, experienceToNext, totalExperience } = s.level;

          experience += amount;
          totalExperience += amount;

          // Check for level up
          while (experience >= experienceToNext) {
            experience -= experienceToNext;
            level++;
            experienceToNext = calculateXPForLevel(level);
            leveledUp = true;
            newLevel = level;
            console.log(`⬆️ Level up! Now level ${level}`);
          }

          return {
            level: { level, experience, experienceToNext, totalExperience },
          };
        });

        return { leveledUp, newLevel };
      },

      getExperienceForLevel: (level) => calculateXPForLevel(level),

      incrementStat: (stat, amount = 1) => {
        set((s) => ({
          stats: {
            ...s.stats,
            [stat]: (s.stats[stat] as number) + amount,
          },
        }));

        // Check achievements after stat change
        get().checkAchievements();
      },

      setStat: (stat, value) => {
        set((s) => ({
          stats: { ...s.stats, [stat]: value },
        }));

        get().checkAchievements();
      },

      getAchievement: (id) => get().achievements.get(id),

      getUnlockedAchievements: () => {
        const state = get();
        return Array.from(state.achievements.values()).filter((a) =>
          state.unlockedAchievements.has(a.id)
        );
      },

      getLockedAchievements: () => {
        const state = get();
        return Array.from(state.achievements.values()).filter(
          (a) => !state.unlockedAchievements.has(a.id) && !a.hidden
        );
      },

      getAchievementsByCategory: (category) => {
        return Array.from(get().achievements.values()).filter(
          (a) => a.category === category
        );
      },

      getAchievementProgress: (id) => {
        const state = get();
        const achievement = state.achievements.get(id);
        if (!achievement) return 0;
        if (state.unlockedAchievements.has(id)) return 1;

        // Calculate progress based on conditions
        let totalProgress = 0;
        for (const condition of achievement.conditions) {
          const current = getStatValue(state.stats, condition.key);
          totalProgress += Math.min(current / condition.target, 1);
        }

        return totalProgress / achievement.conditions.length;
      },

      getTotalPoints: () => {
        const state = get();
        let total = 0;
        for (const id of state.unlockedAchievements) {
          const achievement = state.achievements.get(id);
          if (achievement) {
            total += achievement.points;
          }
        }
        return total;
      },

      getCompletionPercentage: () => {
        const state = get();
        const total = state.achievements.size;
        if (total === 0) return 100;
        return (state.unlockedAchievements.size / total) * 100;
      },

      reset: () => {
        set({
          unlockedAchievements: new Set(),
          unlockedTitles: new Set(),
          equippedTitle: null,
          level: {
            level: 1,
            experience: 0,
            experienceToNext: calculateXPForLevel(1),
            totalExperience: 0,
          },
          stats: { ...INITIAL_STATS },
        });
      },
    }),
    {
      name: 'achievement-storage',
      partialize: (state) => ({
        unlockedAchievements: Array.from(state.unlockedAchievements),
        unlockedTitles: Array.from(state.unlockedTitles),
        equippedTitle: state.equippedTitle,
        level: state.level,
        stats: state.stats,
      }),
      merge: (persisted, current) => {
        const data = persisted as {
          unlockedAchievements?: string[];
          unlockedTitles?: string[];
          equippedTitle?: string | null;
          level?: PlayerLevel;
          stats?: ProgressionStats;
        };
        return {
          ...current,
          unlockedAchievements: new Set(data?.unlockedAchievements ?? []),
          unlockedTitles: new Set(data?.unlockedTitles ?? []),
          equippedTitle: data?.equippedTitle ?? null,
          level: data?.level ?? current.level,
          stats: { ...INITIAL_STATS, ...data?.stats },
        };
      },
    }
  )
);

// Helper to get stat value by key
function getStatValue(stats: ProgressionStats, key: string): number {
  return (stats as unknown as Record<string, number>)[key] ?? 0;
}

// Predefined achievements
export const DEFAULT_ACHIEVEMENTS: Omit<Achievement, 'unlockedAt'>[] = [
  {
    id: 'first_steps',
    name: 'First Steps',
    description: 'Travel 100 meters',
    icon: '👟',
    category: 'exploration',
    rarity: 'common',
    points: 10,
    hidden: false,
    conditions: [{ type: 'threshold', key: 'distanceTraveled', target: 100 }],
  },
  {
    id: 'explorer',
    name: 'Explorer',
    description: 'Visit 10 different locations',
    icon: '🗺️',
    category: 'exploration',
    rarity: 'uncommon',
    points: 25,
    hidden: false,
    conditions: [{ type: 'threshold', key: 'locationsVisited', target: 10 }],
  },
  {
    id: 'warrior',
    name: 'Warrior',
    description: 'Defeat 50 enemies',
    icon: '⚔️',
    category: 'combat',
    rarity: 'uncommon',
    points: 25,
    hidden: false,
    conditions: [{ type: 'threshold', key: 'enemiesDefeated', target: 50 }],
  },
  {
    id: 'boss_slayer',
    name: 'Boss Slayer',
    description: 'Defeat your first boss',
    icon: '💀',
    category: 'combat',
    rarity: 'rare',
    points: 50,
    hidden: false,
    conditions: [{ type: 'threshold', key: 'bossesDefeated', target: 1 }],
  },
  {
    id: 'collector',
    name: 'Collector',
    description: 'Collect 100 items',
    icon: '📦',
    category: 'collection',
    rarity: 'uncommon',
    points: 25,
    hidden: false,
    conditions: [{ type: 'threshold', key: 'itemsCollected', target: 100 }],
  },
  {
    id: 'quest_master',
    name: 'Quest Master',
    description: 'Complete 25 quests',
    icon: '📜',
    category: 'quest',
    rarity: 'rare',
    points: 50,
    hidden: false,
    conditions: [{ type: 'threshold', key: 'questsCompleted', target: 25 }],
  },
  {
    id: 'secret_finder',
    name: 'Secret Finder',
    description: 'Discover a hidden secret',
    icon: '🔍',
    category: 'secret',
    rarity: 'rare',
    points: 50,
    hidden: true,
    conditions: [{ type: 'threshold', key: 'secretsFound', target: 1 }],
  },
  {
    id: 'social_butterfly',
    name: 'Social Butterfly',
    description: 'Make 5 friends',
    icon: '🦋',
    category: 'social',
    rarity: 'uncommon',
    points: 25,
    hidden: false,
    conditions: [{ type: 'threshold', key: 'friendsMade', target: 5 }],
  },
];
