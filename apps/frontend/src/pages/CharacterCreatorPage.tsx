/**
 * CharacterCreatorPage
 * Full-page character customization experience with:
 * - 3D avatar preview with animations
 * - Manual customization (body, face, hair)
 * - Selfie-to-avatar AI generation
 * - Save/load to cloud
 */

import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Undo2,
  Redo2,
  Shuffle,
  Save,
  Check,
  Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';

// Store
import {
  useCharacterCreatorStore,
  useCharacterConfig,
  useCreatorMode,
  useGenerationStatus,
} from '../stores/characterCreator.store';

// Components
import { CharacterPreview3D } from '../components/character-creator/CharacterPreview3D';
import { CreatorModeTabs } from '../components/character-creator/CreatorModeTabs';
import { CustomizationPanel } from '../components/character-creator/CustomizationPanel';
import { SelfiePanel } from '../components/character-creator/SelfiePanel';
import { GenerationProgress } from '../components/character-creator/GenerationProgress';

export default function CharacterCreatorPage() {
  const navigate = useNavigate();
  const config = useCharacterConfig();
  const mode = useCreatorMode();
  const { status: generationStatus } = useGenerationStatus();

  const {
    isDirty,
    isSaving,
    undo,
    redo,
    canUndo,
    canRedo,
    randomize,
    saveConfig,
    setOriginalConfig,
  } = useCharacterCreatorStore();

  // Initialize original config on mount
  useEffect(() => {
    setOriginalConfig(config);
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        if (e.key === 'z' && !e.shiftKey) {
          e.preventDefault();
          if (canUndo()) undo();
        } else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
          e.preventDefault();
          if (canRedo()) redo();
        } else if (e.key === 's') {
          e.preventDefault();
          handleSave();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, canUndo, canRedo]);

  const handleSave = useCallback(async () => {
    try {
      await saveConfig();
      toast.success('Character saved!');
    } catch {
      toast.error('Failed to save character');
    }
  }, [saveConfig]);

  const handleDone = useCallback(() => {
    if (isDirty) {
      // Could show a confirmation dialog here
      handleSave().then(() => {
        navigate('/play');
      });
    } else {
      navigate('/play');
    }
  }, [isDirty, handleSave, navigate]);

  const handleBack = useCallback(() => {
    if (isDirty) {
      const confirmed = window.confirm(
        'You have unsaved changes. Are you sure you want to leave?'
      );
      if (!confirmed) return;
    }
    navigate(-1);
  }, [isDirty, navigate]);

  const isGenerating = generationStatus !== 'idle' && generationStatus !== 'complete' && generationStatus !== 'error';

  return (
    <div className="fixed inset-0 bg-[#0a0a0f] flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#12151a]/80 backdrop-blur-sm z-20">
        {/* Left: Back button */}
        <button
          onClick={handleBack}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline text-sm font-medium">Back</span>
        </button>

        {/* Center: Title */}
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-white tracking-wide">
            CHARACTER CREATOR
          </h1>
          {isDirty && (
            <span className="px-2 py-0.5 text-xs font-medium bg-amber-500/20 text-amber-400 rounded-full border border-amber-500/30">
              Unsaved
            </span>
          )}
        </div>

        {/* Right: Action buttons */}
        <div className="flex items-center gap-2">
          {/* Undo/Redo */}
          <div className="hidden sm:flex items-center gap-1 mr-2">
            <button
              onClick={undo}
              disabled={!canUndo()}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/50 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              onClick={redo}
              disabled={!canRedo()}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/50 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>

          {/* Randomize */}
          <button
            onClick={randomize}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/50 hover:text-white transition-all"
            title="Randomize"
          >
            <Shuffle className="w-4 h-4" />
          </button>

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={!isDirty || isSaving}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span className="hidden sm:inline text-sm font-medium">Save</span>
          </button>

          {/* Done */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleDone}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold transition-all shadow-lg shadow-violet-500/25"
          >
            <Check className="w-4 h-4" />
            <span className="text-sm">Done</span>
          </motion.button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Layout */}
        <div className="hidden lg:flex flex-1">
          {/* Left: Mode Tabs (Customize | Selfie) */}
          <div className="w-[200px] border-r border-white/10 bg-[#12151a]/50">
            <CreatorModeTabs />
          </div>

          {/* Center: 3D Preview */}
          <div className="flex-1 relative">
            <CharacterPreview3D />

            {/* Generation Progress Overlay */}
            <AnimatePresence>
              {isGenerating && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-10"
                >
                  <GenerationProgress />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right: Customization Panel */}
          <div className="w-[360px] border-l border-white/10 bg-[#12151a]/50 overflow-y-auto">
            <AnimatePresence mode="wait">
              {mode === 'customize' ? (
                <motion.div
                  key="customize"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <CustomizationPanel />
                </motion.div>
              ) : (
                <motion.div
                  key="selfie"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <SelfiePanel />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Mobile Layout */}
        <div className="flex lg:hidden flex-col flex-1">
          {/* 3D Preview (top portion) */}
          <div className="h-[40vh] relative">
            <CharacterPreview3D />

            {/* Generation Progress Overlay */}
            <AnimatePresence>
              {isGenerating && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-10"
                >
                  <GenerationProgress />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Mode Tabs (horizontal) */}
          <div className="border-y border-white/10 bg-[#12151a]">
            <CreatorModeTabs horizontal />
          </div>

          {/* Customization Panel (scrollable) */}
          <div className="flex-1 overflow-y-auto bg-[#0a0a0f]">
            <AnimatePresence mode="wait">
              {mode === 'customize' ? (
                <motion.div
                  key="customize"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <CustomizationPanel />
                </motion.div>
              ) : (
                <motion.div
                  key="selfie"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <SelfiePanel />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Mobile Action Bar */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/10 bg-[#12151a] safe-area-bottom">
            <div className="flex items-center gap-2">
              <button
                onClick={undo}
                disabled={!canUndo()}
                className="p-2 rounded-lg bg-white/5 text-white/50 disabled:opacity-30"
              >
                <Undo2 className="w-5 h-5" />
              </button>
              <button
                onClick={redo}
                disabled={!canRedo()}
                className="p-2 rounded-lg bg-white/5 text-white/50 disabled:opacity-30"
              >
                <Redo2 className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSave}
                disabled={!isDirty || isSaving}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 text-white disabled:opacity-30"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save
              </button>
              <button
                onClick={handleDone}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-bold"
              >
                <Check className="w-4 h-4" />
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
