/**
 * Quest Tracker HUD
 * Shows active quest objectives on screen
 */

import { useMemo } from 'react';
import { useQuestStore } from './useQuestStore';

interface QuestTrackerProps {
  maxObjectives?: number;
}

export function QuestTracker({ maxObjectives = 5 }: QuestTrackerProps) {
  const { getActiveQuest, getTrackedObjectives } = useQuestStore();
  const activeQuest = getActiveQuest();
  const trackedObjectives = getTrackedObjectives();

  if (!activeQuest) return null;

  const objectives = trackedObjectives.slice(0, maxObjectives);

  return (
    <div className="fixed top-24 right-4 z-40 pointer-events-none">
      <div
        className="bg-black/70 backdrop-blur-sm rounded-lg border p-4 min-w-64 max-w-80"
        style={{ borderColor: activeQuest.color || '#8b5cf6' }}
      >
        {/* Quest title */}
        <div className="flex items-center gap-2 mb-3">
          <div
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: activeQuest.color || '#8b5cf6' }}
          />
          <h3 className="text-white font-bold text-sm">{activeQuest.title}</h3>
        </div>

        {/* Objectives */}
        <div className="space-y-2">
          {objectives.map(({ objective }) => (
            <div
              key={objective.id}
              className={`flex items-start gap-2 text-sm ${
                objective.isCompleted ? 'opacity-50' : 'opacity-100'
              }`}
            >
              {/* Checkbox */}
              <div
                className={`w-4 h-4 rounded border-2 flex-shrink-0 mt-0.5 flex items-center justify-center ${
                  objective.isCompleted ? 'bg-green-500 border-green-500' : 'border-gray-500'
                }`}
              >
                {objective.isCompleted && (
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>

              {/* Description */}
              <div className="flex-1">
                <p className={`text-gray-200 ${objective.isCompleted ? 'line-through' : ''}`}>
                  {objective.description}
                </p>

                {/* Progress bar for counted objectives */}
                {objective.target !== undefined && !objective.isCompleted && (
                  <div className="mt-1">
                    <div className="flex justify-between text-xs text-gray-400 mb-0.5">
                      <span>Progress</span>
                      <span>
                        {objective.current || 0} / {objective.target}
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full transition-all duration-300"
                        style={{
                          width: `${((objective.current || 0) / objective.target) * 100}%`,
                          backgroundColor: activeQuest.color || '#8b5cf6',
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Optional indicator */}
                {objective.isOptional && (
                  <span className="text-xs text-gray-500 mt-0.5 block">(Optional)</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Quest progress */}
        <div className="mt-3 pt-2 border-t border-gray-700">
          <div className="flex justify-between text-xs text-gray-400">
            <span>Quest Progress</span>
            <span>
              {activeQuest.objectives.filter((o) => o.isCompleted).length} /{' '}
              {activeQuest.objectives.filter((o) => !o.isOptional).length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Quest notification popup
interface QuestNotificationProps {
  type: 'started' | 'completed' | 'failed' | 'objective';
  title: string;
  description?: string;
  color?: string;
  onClose: () => void;
}

export function QuestNotification({
  type,
  title,
  description,
  color = '#8b5cf6',
  onClose,
}: QuestNotificationProps) {
  const icon = useMemo(() => {
    switch (type) {
      case 'started':
        return '!';
      case 'completed':
        return '✓';
      case 'failed':
        return '✗';
      case 'objective':
        return '○';
    }
  }, [type]);

  const label = useMemo(() => {
    switch (type) {
      case 'started':
        return 'New Quest';
      case 'completed':
        return 'Quest Complete';
      case 'failed':
        return 'Quest Failed';
      case 'objective':
        return 'Objective Complete';
    }
  }, [type]);

  return (
    <div
      className="fixed top-1/3 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-500"
      style={{ pointerEvents: 'auto' }}
    >
      <div
        className="bg-black/90 backdrop-blur-md rounded-lg border-2 p-6 min-w-80 max-w-md text-center"
        style={{ borderColor: color }}
      >
        {/* Icon */}
        <div
          className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center text-2xl font-bold"
          style={{
            backgroundColor: `${color}33`,
            color: color,
            boxShadow: `0 0 20px ${color}44`,
          }}
        >
          {icon}
        </div>

        {/* Type label */}
        <div className="text-xs uppercase tracking-wider text-gray-400 mb-1">{label}</div>

        {/* Title */}
        <h2 className="text-xl font-bold text-white mb-2">{title}</h2>

        {/* Description */}
        {description && <p className="text-gray-300 text-sm mb-4">{description}</p>}

        {/* Close button */}
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded transition-colors text-sm"
        >
          Continue
        </button>
      </div>
    </div>
  );
}

export default QuestTracker;
