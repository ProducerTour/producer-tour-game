/**
 * GenerationProgress
 * Progress overlay for AI avatar generation
 */

import { motion } from 'framer-motion';
import { Sparkles, Scan, Box, Palette, CheckCircle2, AlertCircle } from 'lucide-react';
import { useGenerationStatus, type GenerationStatus } from '../../stores/characterCreator.store';

// Status step configuration
const GENERATION_STEPS: {
  status: GenerationStatus;
  label: string;
  icon: typeof Sparkles;
  progressRange: [number, number];
}[] = [
  {
    status: 'analyzing',
    label: 'Analyzing facial features...',
    icon: Scan,
    progressRange: [0, 35],
  },
  {
    status: 'generating_mesh',
    label: 'Generating 3D mesh...',
    icon: Box,
    progressRange: [35, 70],
  },
  {
    status: 'applying_textures',
    label: 'Applying textures...',
    icon: Palette,
    progressRange: [70, 95],
  },
  {
    status: 'finalizing',
    label: 'Finalizing avatar...',
    icon: Sparkles,
    progressRange: [95, 100],
  },
];

export function GenerationProgress() {
  const { status, progress, error } = useGenerationStatus();

  // Find current step
  const currentStepIndex = GENERATION_STEPS.findIndex((step) => step.status === status);
  const currentStep = GENERATION_STEPS[currentStepIndex] || GENERATION_STEPS[0];
  const Icon = currentStep.icon;

  if (status === 'complete') {
    return (
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-[#12151a] rounded-2xl p-8 max-w-sm mx-4 text-center border border-emerald-500/30"
      >
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">Avatar Created!</h3>
        <p className="text-sm text-white/60">
          Your avatar has been generated. Fine-tune it in the Customize tab.
        </p>
      </motion.div>
    );
  }

  if (status === 'error') {
    return (
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-[#12151a] rounded-2xl p-8 max-w-sm mx-4 text-center border border-red-500/30"
      >
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">Generation Failed</h3>
        <p className="text-sm text-white/60 mb-4">
          {error || 'Something went wrong. Please try again.'}
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="bg-[#12151a] rounded-2xl p-8 max-w-sm mx-4 border border-violet-500/30"
    >
      {/* Animated icon */}
      <div className="relative w-20 h-20 mx-auto mb-6">
        <motion.div
          className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600"
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.5, 0.8, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <div className="absolute inset-2 rounded-full bg-[#12151a] flex items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          >
            <Icon className="w-8 h-8 text-violet-400" />
          </motion.div>
        </div>
      </div>

      {/* Current step label */}
      <h3 className="text-lg font-bold text-white text-center mb-2">
        {currentStep.label}
      </h3>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-white/50">Progress</span>
          <span className="text-xs text-white/50">{Math.round(progress)}%</span>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-violet-600 to-fuchsia-600"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Step indicators */}
      <div className="flex items-center justify-between">
        {GENERATION_STEPS.map((step, index) => {
          const isActive = index === currentStepIndex;
          const isComplete = index < currentStepIndex;
          const StepIcon = step.icon;

          return (
            <div
              key={step.status}
              className={`
                flex flex-col items-center gap-1
                ${isComplete ? 'text-emerald-400' : isActive ? 'text-violet-400' : 'text-white/30'}
              `}
            >
              <div
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center
                  ${isComplete
                    ? 'bg-emerald-500/20'
                    : isActive
                    ? 'bg-violet-500/20'
                    : 'bg-white/5'
                  }
                `}
              >
                {isComplete ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <StepIcon className="w-4 h-4" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
