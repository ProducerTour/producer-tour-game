// Quest Tracker UI Component
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuestStore } from './questStore';
import { Quest, QuestObjective } from './types';

interface QuestTrackerProps {
  className?: string;
  maxQuests?: number;
}

export function QuestTracker({ className = '', maxQuests = 3 }: QuestTrackerProps) {
  const { getActiveQuests, getTrackedQuest, trackQuest } = useQuestStore();

  const trackedQuest = getTrackedQuest();
  const activeQuests = getActiveQuests().slice(0, maxQuests);

  if (activeQuests.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <AnimatePresence mode="popLayout">
        {/* Tracked quest (if any) */}
        {trackedQuest && (
          <QuestCard
            key={trackedQuest.id}
            quest={trackedQuest}
            isTracked
            onTrack={() => trackQuest(null)}
          />
        )}

        {/* Other active quests (collapsed) */}
        {activeQuests
          .filter((q) => q.id !== trackedQuest?.id)
          .map((quest) => (
            <QuestCard
              key={quest.id}
              quest={quest}
              isTracked={false}
              onTrack={() => trackQuest(quest.id)}
              collapsed
            />
          ))}
      </AnimatePresence>
    </div>
  );
}

interface QuestCardProps {
  quest: Quest;
  isTracked: boolean;
  onTrack: () => void;
  collapsed?: boolean;
}

function QuestCard({ quest, isTracked, onTrack, collapsed = false }: QuestCardProps) {
  const categoryColors = {
    main: 'border-yellow-500/50 bg-yellow-500/10',
    side: 'border-blue-500/50 bg-blue-500/10',
    daily: 'border-green-500/50 bg-green-500/10',
    event: 'border-purple-500/50 bg-purple-500/10',
  };

  const categoryIcons = {
    main: '⭐',
    side: '📋',
    daily: '🔄',
    event: '🎉',
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`
        rounded-lg border backdrop-blur-sm p-3 cursor-pointer
        transition-all hover:scale-[1.02]
        ${categoryColors[quest.category]}
        ${isTracked ? 'ring-2 ring-white/30' : ''}
      `}
      onClick={onTrack}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{categoryIcons[quest.category]}</span>
        <span className="font-semibold text-white text-sm flex-1 truncate">
          {quest.title}
        </span>
        {isTracked && (
          <span className="text-xs text-white/60 bg-white/10 px-2 py-0.5 rounded">
            TRACKED
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-black/30 rounded-full mb-2 overflow-hidden">
        <motion.div
          className="h-full bg-white/70 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${quest.progress * 100}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>

      {/* Objectives (only show if not collapsed) */}
      {!collapsed && (
        <div className="space-y-1">
          {quest.objectives
            .filter((o) => !o.hidden)
            .map((objective) => (
              <ObjectiveRow key={objective.id} objective={objective} />
            ))}
        </div>
      )}
    </motion.div>
  );
}

function ObjectiveRow({ objective }: { objective: QuestObjective }) {
  const isComplete = objective.completed;

  return (
    <div
      className={`flex items-center gap-2 text-xs ${
        isComplete ? 'text-green-400 line-through opacity-60' : 'text-white/80'
      }`}
    >
      <span>{isComplete ? '✓' : '○'}</span>
      <span className="flex-1 truncate">{objective.description}</span>
      {objective.required > 1 && (
        <span className="text-white/50">
          {objective.current}/{objective.required}
        </span>
      )}
    </div>
  );
}

// Quest notification component
interface QuestNotificationProps {
  type: 'accepted' | 'completed' | 'failed' | 'objective';
  quest: Quest;
  objective?: QuestObjective;
  onClose: () => void;
}

export function QuestNotification({
  type,
  quest,
  objective,
  onClose,
}: QuestNotificationProps) {
  const config = {
    accepted: {
      icon: '📜',
      title: 'Quest Accepted',
      color: 'border-blue-500 bg-blue-500/20',
    },
    completed: {
      icon: '🎉',
      title: 'Quest Completed!',
      color: 'border-green-500 bg-green-500/20',
    },
    failed: {
      icon: '❌',
      title: 'Quest Failed',
      color: 'border-red-500 bg-red-500/20',
    },
    objective: {
      icon: '✓',
      title: 'Objective Complete',
      color: 'border-yellow-500 bg-yellow-500/20',
    },
  };

  const { icon, title, color } = config[type];

  React.useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 50, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 50, scale: 0.9 }}
      className={`
        fixed top-20 right-4 z-50
        rounded-lg border backdrop-blur-md p-4 min-w-[280px]
        ${color}
      `}
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <div className="text-xs text-white/60 uppercase tracking-wider">{title}</div>
          <div className="text-white font-semibold">{quest.title}</div>
          {objective && (
            <div className="text-sm text-white/70 mt-1">{objective.description}</div>
          )}
        </div>
      </div>

      {type === 'completed' && quest.rewards.length > 0 && (
        <div className="mt-3 pt-3 border-t border-white/10">
          <div className="text-xs text-white/60 mb-1">Rewards:</div>
          <div className="flex flex-wrap gap-2">
            {quest.rewards.map((reward, i) => (
              <span
                key={i}
                className="text-xs bg-white/10 px-2 py-1 rounded text-white/80"
              >
                {reward.description}
              </span>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
