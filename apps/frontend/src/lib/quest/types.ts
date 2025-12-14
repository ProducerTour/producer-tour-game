// Quest system types

export type QuestStatus = 'locked' | 'available' | 'active' | 'completed' | 'failed';
export type QuestCategory = 'main' | 'side' | 'daily' | 'event';
export type ObjectiveType = 'collect' | 'kill' | 'visit' | 'interact' | 'deliver' | 'escort' | 'craft' | 'talk';
export type RewardType = 'xp' | 'currency' | 'item' | 'nft' | 'unlock' | 'reputation';

export interface QuestObjective {
  id: string;
  type: ObjectiveType;
  description: string;
  target: string; // Item ID, NPC ID, Location ID, etc.
  targetName?: string; // Display name
  current: number;
  required: number;
  optional: boolean;
  hidden: boolean; // Don't show until triggered
  completed: boolean;
}

export interface QuestReward {
  type: RewardType;
  id?: string; // Item/NFT ID
  amount: number;
  description: string;
  icon?: string;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  shortDescription?: string;
  category: QuestCategory;
  level: number;
  icon?: string;

  // Prerequisites
  requiredQuests: string[]; // Must complete these first
  requiredLevel: number;
  requiredItems?: { itemId: string; quantity: number }[];

  // Objectives
  objectives: QuestObjective[];

  // Rewards
  rewards: QuestReward[];

  // State
  status: QuestStatus;
  progress: number; // 0-1
  startedAt?: number;
  completedAt?: number;

  // NPC references
  questGiverId?: string;
  questGiverName?: string;
  turnInNpcId?: string;

  // Dialogue
  startDialogue?: string[];
  inProgressDialogue?: string[];
  completionDialogue?: string[];

  // Optional time limit
  timeLimit?: number; // seconds
  expiresAt?: number;
}

export interface QuestDefinition extends Omit<Quest, 'status' | 'progress' | 'startedAt' | 'completedAt'> {
  // Base quest definition without runtime state
}

export interface DialogueNode {
  id: string;
  speakerName: string;
  text: string;
  options?: DialogueOption[];
  onEnter?: string; // Event to trigger
}

export interface DialogueOption {
  text: string;
  nextNodeId?: string;
  requiresItem?: string;
  requiresQuest?: string;
  startsQuest?: string;
  completesQuest?: string;
}

export interface QuestLogEntry {
  questId: string;
  title: string;
  category: QuestCategory;
  status: QuestStatus;
  progress: number;
  updatedAt: number;
}
