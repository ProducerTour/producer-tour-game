import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Star,
  CheckCircle2,
  Clock,
  ChevronRight,
  ChevronDown,
  Trophy,
  AlertCircle,
  ExternalLink,
  Play,
  Loader2,
  X,
  Info,
  Check,
  Sparkles as SparklesIcon,
  Lightbulb,
  DollarSign,
  Scale,
  ArrowLeft,
  List,
} from 'lucide-react';
import { useHoldingsData, useStartQuest, useCompleteStep, useCompleteQuest, useExplainQuestStep, useQuestSocketUpdates, useEmitQuestUpdate } from './hooks';
import type { CorporateQuest, CorporateQuestStep, QuestStepExplanation } from './types';

// Quest Tracker - Shows current active quest in compact form
function QuestTracker({
  quest,
  onExpand,
  onCompleteStep,
  isCompletingStep,
}: {
  quest: CorporateQuest | null;
  onExpand: () => void;
  onCompleteStep: (stepId: string) => void;
  isCompletingStep: boolean;
}) {
  if (!quest) {
    return (
      <div className="bg-slate-900/90 backdrop-blur-xl rounded-lg border border-slate-700/50 p-3">
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <Star className="w-4 h-4" />
          <span>No active quest</span>
        </div>
        <button
          onClick={onExpand}
          className="mt-2 text-xs text-blue-400 hover:text-blue-300 transition-colors"
        >
          View Quest Log →
        </button>
      </div>
    );
  }

  const currentStep = quest.steps.find(s => s.status === 'IN_PROGRESS');
  const completedSteps = quest.steps.filter(s => s.status === 'COMPLETED').length;

  return (
    <div className="bg-slate-900/90 backdrop-blur-xl rounded-lg border border-blue-500/30 overflow-hidden">
      {/* Quest Header */}
      <div className="p-3 bg-blue-500/10 border-b border-blue-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-yellow-400" />
            <span className="text-sm font-medium text-white truncate max-w-[180px]">
              {quest.title}
            </span>
          </div>
          <button
            onClick={onExpand}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
        {/* Progress bar */}
        <div className="mt-2 h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 to-cyan-400"
            initial={{ width: 0 }}
            animate={{ width: `${(completedSteps / quest.steps.length) * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        <div className="mt-1 text-xs text-slate-400">
          {completedSteps}/{quest.steps.length} steps complete
        </div>
      </div>

      {/* Current Step */}
      {currentStep && (
        <div className="p-3">
          <div className="flex items-start gap-2">
            <div className="mt-0.5 text-yellow-400">
              <Clock className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-yellow-300">
                Current Step
              </div>
              <div className="text-sm text-white mt-0.5">
                {currentStep.title}
              </div>
              <div className="text-xs text-slate-400 mt-1 line-clamp-2">
                {currentStep.description}
              </div>

              {/* Quick actions */}
              <div className="flex gap-2 mt-2">
                {!currentStep.requiresUpload && (
                  <button
                    onClick={() => onCompleteStep(currentStep.id)}
                    disabled={isCompletingStep}
                    className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded hover:bg-green-500/30 disabled:opacity-50 flex items-center gap-1"
                  >
                    {isCompletingStep ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Check className="w-3 h-3" />
                    )}
                    Complete
                  </button>
                )}
                {currentStep.actionType === 'EXTERNAL_LINK' && currentStep.actionData && (
                  <a
                    href={(currentStep.actionData as { url?: string }).url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs px-2 py-1 bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30 flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Open
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Player Stats Panel
function PlayerStats({
  level,
  xp,
  xpForNext,
  questsCompleted,
  totalQuests,
}: {
  level: number;
  xp: number;
  xpForNext: number;
  questsCompleted: number;
  totalQuests: number;
}) {
  return (
    <div className="bg-slate-900/90 backdrop-blur-xl rounded-lg border border-slate-700/50 p-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
          <Trophy className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white">Level {level}</span>
            <span className="text-xs text-slate-400">
              {questsCompleted}/{totalQuests} quests
            </span>
          </div>
          <div className="mt-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-yellow-400 to-orange-500"
              style={{ width: `${(xp / xpForNext) * 100}%` }}
            />
          </div>
          <div className="mt-0.5 text-xs text-slate-500">
            {xp} / {xpForNext} XP
          </div>
        </div>
      </div>
    </div>
  );
}

// Full Quest Panel (slide-out)
function QuestPanel({
  isOpen,
  onClose,
  quests,
  onStartQuest,
  onCompleteStep,
  onCompleteQuest,
  onExplainStep,
  isStarting,
  isCompletingStep,
  isCompletingQuest,
  isExplaining,
}: {
  isOpen: boolean;
  onClose: () => void;
  quests: CorporateQuest[];
  onStartQuest: (questId: string) => void;
  onCompleteStep: (stepId: string) => void;
  onCompleteQuest: (questId: string) => void;
  onExplainStep: (step: CorporateQuestStep, quest: CorporateQuest) => void;
  isStarting: boolean;
  isCompletingStep: boolean;
  isCompletingQuest: boolean;
  isExplaining: boolean;
}) {
  const [expandedQuest, setExpandedQuest] = useState<string | null>(null);

  // Auto-expand in-progress quest
  useEffect(() => {
    if (isOpen && !expandedQuest) {
      const inProgress = quests.find(q => q.status === 'IN_PROGRESS');
      if (inProgress) setExpandedQuest(inProgress.id);
    }
  }, [isOpen, quests, expandedQuest]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 z-40"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: -400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -400, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute left-0 top-0 bottom-0 w-96 bg-slate-900/95 backdrop-blur-xl border-r border-blue-500/30 z-50 flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b border-blue-500/20 bg-blue-500/10">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-400" />
                  Quest Log
                </h2>
                <button
                  onClick={onClose}
                  className="p-1 hover:bg-slate-800 rounded transition-colors"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
            </div>

            {/* Quest List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {quests.map((quest) => {
                const isExpanded = expandedQuest === quest.id;
                const canComplete = quest.status === 'IN_PROGRESS' &&
                  quest.steps.every(s => s.status === 'COMPLETED' || s.status === 'SKIPPED');

                return (
                  <div
                    key={quest.id}
                    className={`rounded-lg border transition-all ${
                      quest.status === 'COMPLETED'
                        ? 'bg-green-500/10 border-green-500/30'
                        : quest.status === 'IN_PROGRESS'
                        ? 'bg-yellow-500/10 border-yellow-500/30'
                        : quest.status === 'LOCKED'
                        ? 'bg-slate-800/50 border-slate-700/50 opacity-60'
                        : 'bg-blue-500/10 border-blue-500/30'
                    }`}
                  >
                    {/* Quest Header */}
                    <button
                      onClick={() => setExpandedQuest(isExpanded ? null : quest.id)}
                      className="w-full p-3 text-left"
                    >
                      <div className="flex items-start gap-2">
                        <div className={`mt-0.5 ${
                          quest.status === 'COMPLETED' ? 'text-green-400' :
                          quest.status === 'IN_PROGRESS' ? 'text-yellow-400' :
                          quest.status === 'LOCKED' ? 'text-slate-500' :
                          'text-blue-400'
                        }`}>
                          {quest.status === 'COMPLETED' ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : (
                            <Star className="w-4 h-4" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className={`font-medium text-sm ${
                            quest.status === 'COMPLETED' ? 'text-green-300 line-through' : 'text-white'
                          }`}>
                            {quest.title}
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5">
                            {quest.steps.filter(s => s.status === 'COMPLETED').length}/{quest.steps.length} steps • +{quest.xpReward} XP
                          </div>
                        </div>
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                    </button>

                    {/* Expanded Content */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="px-3 pb-3 space-y-2">
                            {/* Start Quest Button */}
                            {quest.status === 'AVAILABLE' && (
                              <button
                                onClick={() => onStartQuest(quest.id)}
                                disabled={isStarting}
                                className="w-full py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 rounded text-white text-sm font-medium flex items-center justify-center gap-2"
                              >
                                {isStarting ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Play className="w-4 h-4" />
                                )}
                                Start Quest
                              </button>
                            )}

                            {/* Steps */}
                            {quest.steps.map((step, idx) => (
                              <div
                                key={step.id}
                                className={`p-2 rounded border text-xs ${
                                  step.status === 'COMPLETED'
                                    ? 'bg-green-500/10 border-green-500/20'
                                    : step.status === 'IN_PROGRESS'
                                    ? 'bg-yellow-500/10 border-yellow-500/20'
                                    : 'bg-slate-800/30 border-slate-700/30'
                                }`}
                              >
                                <div className="flex items-start gap-2">
                                  <div className={`mt-0.5 ${
                                    step.status === 'COMPLETED' ? 'text-green-400' :
                                    step.status === 'IN_PROGRESS' ? 'text-yellow-400' :
                                    'text-slate-600'
                                  }`}>
                                    {step.status === 'COMPLETED' ? (
                                      <CheckCircle2 className="w-3 h-3" />
                                    ) : (
                                      <span className="w-3 h-3 flex items-center justify-center text-[10px]">
                                        {idx + 1}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex-1">
                                    <div className={`font-medium ${
                                      step.status === 'COMPLETED' ? 'text-green-300 line-through' :
                                      step.status === 'IN_PROGRESS' ? 'text-yellow-300' :
                                      'text-slate-400'
                                    }`}>
                                      {step.title}
                                    </div>

                                    {/* Actions for current step */}
                                    {step.status === 'IN_PROGRESS' && (
                                      <div className="flex flex-wrap gap-1.5 mt-2">
                                        <button
                                          onClick={() => onExplainStep(step, quest)}
                                          disabled={isExplaining}
                                          className="px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded hover:bg-purple-500/30 disabled:opacity-50 flex items-center gap-1"
                                        >
                                          {isExplaining ? (
                                            <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                          ) : (
                                            <SparklesIcon className="w-2.5 h-2.5" />
                                          )}
                                          Explain
                                        </button>
                                        {!step.requiresUpload && (
                                          <button
                                            onClick={() => onCompleteStep(step.id)}
                                            disabled={isCompletingStep}
                                            className="px-2 py-0.5 bg-green-500/20 text-green-300 rounded hover:bg-green-500/30 disabled:opacity-50 flex items-center gap-1"
                                          >
                                            {isCompletingStep ? (
                                              <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                            ) : (
                                              <Check className="w-2.5 h-2.5" />
                                            )}
                                            Complete
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}

                            {/* Complete Quest Button */}
                            {canComplete && (
                              <button
                                onClick={() => onCompleteQuest(quest.id)}
                                disabled={isCompletingQuest}
                                className="w-full py-2 bg-green-500 hover:bg-green-600 disabled:opacity-50 rounded text-white text-sm font-medium flex items-center justify-center gap-2"
                              >
                                {isCompletingQuest ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Trophy className="w-4 h-4" />
                                )}
                                Complete Quest (+{quest.xpReward} XP)
                              </button>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// AI Explanation Modal
function ExplanationModal({
  isOpen,
  onClose,
  step,
  quest,
  explanation,
  isLoading,
  error,
}: {
  isOpen: boolean;
  onClose: () => void;
  step: CorporateQuestStep | null;
  quest: CorporateQuest | null;
  explanation: QuestStepExplanation | null;
  isLoading: boolean;
  error: Error | null;
}) {
  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative bg-gradient-to-b from-slate-900 to-slate-950 border border-blue-500/40 rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden shadow-[0_0_60px_rgba(59,130,246,0.3)]"
      >
        {/* Header */}
        <div className="p-5 border-b border-blue-500/20 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-blue-600/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <SparklesIcon className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">AI Quest Advisor</h3>
                <p className="text-xs text-blue-300/70">Powered by Claude</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-800/80 transition-colors"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>
          {step && (
            <div className="mt-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
              <div className="text-sm font-medium text-blue-300">{quest?.title}</div>
              <div className="text-xs text-slate-400 mt-0.5">{step.title}</div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto max-h-[calc(85vh-140px)]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-12 h-12 animate-spin text-blue-400" />
              <div className="text-slate-300 mt-6">Consulting the AI advisor...</div>
            </div>
          ) : error ? (
            <div className="text-center py-16">
              <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-4" />
              <div className="text-red-400 font-medium">Failed to get explanation</div>
              <div className="text-sm text-slate-500 mt-2">{error.message}</div>
            </div>
          ) : explanation ? (
            <div className="space-y-4">
              {/* Summary */}
              <div className="p-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-semibold text-blue-300">Summary</span>
                </div>
                <div className="text-sm text-slate-200">{explanation.summary}</div>
              </div>

              {/* Why It Matters */}
              <div className="p-4 bg-slate-800/60 rounded-xl border border-yellow-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm font-semibold text-yellow-300">Why It Matters</span>
                </div>
                <div className="text-sm text-slate-300">{explanation.whyItMatters}</div>
              </div>

              {/* Tax & Legal */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 bg-slate-800/60 rounded-xl border border-green-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-4 h-4 text-green-400" />
                    <span className="text-sm font-semibold text-green-300">Tax</span>
                  </div>
                  <div className="text-sm text-slate-300">{explanation.taxImplications}</div>
                </div>
                <div className="p-4 bg-slate-800/60 rounded-xl border border-purple-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Scale className="w-4 h-4 text-purple-400" />
                    <span className="text-sm font-semibold text-purple-300">Legal</span>
                  </div>
                  <div className="text-sm text-slate-300">{explanation.legalConsiderations}</div>
                </div>
              </div>

              {/* Pro Tips */}
              <div className="p-4 bg-green-950/30 rounded-xl border border-green-500/20">
                <div className="flex items-center gap-2 mb-3">
                  <Star className="w-4 h-4 text-green-400" />
                  <span className="text-sm font-semibold text-green-300">Pro Tips</span>
                </div>
                <ul className="space-y-2">
                  {explanation.proTips.map((tip, i) => (
                    <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                      <Check className="w-3 h-3 text-green-400 mt-1 flex-shrink-0" />
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Time & Cost */}
              <div className="flex gap-3">
                <div className="flex-1 p-3 bg-slate-800/60 rounded-xl">
                  <div className="text-xs text-slate-500">Est. Time</div>
                  <div className="text-sm font-medium text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-400" />
                    {explanation.estimatedTime}
                  </div>
                </div>
                {explanation.estimatedCost && (
                  <div className="flex-1 p-3 bg-slate-800/60 rounded-xl">
                    <div className="text-xs text-slate-500">Est. Cost</div>
                    <div className="text-sm font-medium text-white flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-green-400" />
                      {explanation.estimatedCost}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </motion.div>
    </div>
  );
}

// Main HUD Component
interface HoldingsHUDProps {
  isActive: boolean;
  onExit: () => void;
}

export function HoldingsHUD({ isActive, onExit }: HoldingsHUDProps) {
  const [showQuestPanel, setShowQuestPanel] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [selectedStep, setSelectedStep] = useState<CorporateQuestStep | null>(null);
  const [selectedQuest, setSelectedQuest] = useState<CorporateQuest | null>(null);

  // Fetch data
  const { quests, progress, stats } = useHoldingsData(true);
  useQuestSocketUpdates();

  // Mutations
  const startQuestMutation = useStartQuest();
  const completeStepMutation = useCompleteStep();
  const completeQuestMutation = useCompleteQuest();
  const explainStepMutation = useExplainQuestStep();
  const emitQuestUpdate = useEmitQuestUpdate();

  // Get active quest
  const activeQuest = quests.find(q => q.status === 'IN_PROGRESS') || null;

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'q' || e.key === 'Q') {
        setShowQuestPanel(prev => !prev);
      }
      if (e.key === 'Escape') {
        if (showExplanation) {
          setShowExplanation(false);
        } else if (showQuestPanel) {
          setShowQuestPanel(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showQuestPanel, showExplanation]);

  // Handlers
  const handleExplainStep = useCallback((step: CorporateQuestStep, quest: CorporateQuest) => {
    explainStepMutation.reset();
    setSelectedStep(step);
    setSelectedQuest(quest);
    setShowExplanation(true);

    explainStepMutation.mutate({
      stepTitle: step.title,
      stepDescription: step.description,
      actionType: step.actionType,
      questTitle: quest.title,
      questCategory: quest.category,
      entityName: 'Producer Tour Holdings, Inc.',
      entityType: 'C_CORP',
      jurisdiction: 'Delaware',
      actionData: step.actionData || undefined,
    });
  }, [explainStepMutation]);

  const handleCompleteStep = useCallback((stepId: string) => {
    completeStepMutation.mutate({ stepId }, {
      onSuccess: () => {
        if (activeQuest) {
          emitQuestUpdate('holdings', activeQuest.id, 'step-completed');
        }
      }
    });
  }, [completeStepMutation, emitQuestUpdate, activeQuest]);

  if (!isActive) return null;

  return (
    <>
      {/* Top Left - Quest Tracker */}
      <div className="absolute top-4 left-4 z-30 w-72">
        <QuestTracker
          quest={activeQuest}
          onExpand={() => setShowQuestPanel(true)}
          onCompleteStep={handleCompleteStep}
          isCompletingStep={completeStepMutation.isPending}
        />
      </div>

      {/* Top Right - Player Stats */}
      <div className="absolute top-4 right-4 z-30 w-64">
        {progress && stats && (
          <PlayerStats
            level={progress.level}
            xp={progress.xpProgress}
            xpForNext={progress.xpForNextLevel}
            questsCompleted={stats.quests.completed}
            totalQuests={stats.quests.total}
          />
        )}
      </div>

      {/* Bottom Center - Controls Hint */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30">
        <div className="bg-slate-900/80 backdrop-blur-sm rounded-lg px-4 py-2 border border-slate-700/50 flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-slate-300">Q</kbd>
            <span className="text-slate-400">Quest Log</span>
          </div>
          <div className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-slate-300">WASD</kbd>
            <span className="text-slate-400">Move</span>
          </div>
          <div className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-slate-300">Shift</kbd>
            <span className="text-slate-400">Sprint</span>
          </div>
        </div>
      </div>

      {/* Top Left - Back Button */}
      <button
        onClick={onExit}
        className="absolute top-4 left-4 z-40 -translate-y-14 px-3 py-1.5 bg-slate-900/90 backdrop-blur-xl rounded-lg border border-slate-700/50 text-slate-300 text-sm hover:bg-slate-800 hover:border-slate-600 transition-all flex items-center gap-2"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Space
      </button>

      {/* Quest Panel (slide-out) */}
      <QuestPanel
        isOpen={showQuestPanel}
        onClose={() => setShowQuestPanel(false)}
        quests={quests}
        onStartQuest={(questId) => {
          startQuestMutation.mutate(questId, {
            onSuccess: () => emitQuestUpdate('holdings', questId, 'started')
          });
        }}
        onCompleteStep={handleCompleteStep}
        onCompleteQuest={(questId) => {
          completeQuestMutation.mutate(questId, {
            onSuccess: () => emitQuestUpdate('holdings', questId, 'completed')
          });
        }}
        onExplainStep={handleExplainStep}
        isStarting={startQuestMutation.isPending}
        isCompletingStep={completeStepMutation.isPending}
        isCompletingQuest={completeQuestMutation.isPending}
        isExplaining={explainStepMutation.isPending}
      />

      {/* Explanation Modal */}
      <ExplanationModal
        isOpen={showExplanation}
        onClose={() => setShowExplanation(false)}
        step={selectedStep}
        quest={selectedQuest}
        explanation={explainStepMutation.data || null}
        isLoading={explainStepMutation.isPending}
        error={explainStepMutation.error}
      />
    </>
  );
}

export default HoldingsHUD;
