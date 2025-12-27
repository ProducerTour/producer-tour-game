/**
 * CustomizationPanel
 * Main container for customization options
 * Switches between Body, Face, and Hair panels
 */

import { AnimatePresence, motion } from 'framer-motion';
import { useCharacterCreatorStore } from '../../stores/characterCreator.store';
import { CategoryTabs } from './CategoryTabs';
import { BodyPanel } from './panels/BodyPanel';
import { FacePanel } from './panels/FacePanel';
import { HairPanel } from './panels/HairPanel';

export function CustomizationPanel() {
  const category = useCharacterCreatorStore((s) => s.customizeCategory);

  return (
    <div className="h-full flex flex-col">
      {/* Category Tabs (visible on desktop, hidden on mobile where they're shown externally) */}
      <div className="hidden lg:block p-4 border-b border-white/10">
        <CategoryTabs />
      </div>

      {/* Mobile: Horizontal tabs */}
      <div className="lg:hidden border-b border-white/10">
        <CategoryTabs horizontal />
      </div>

      {/* Panel Content */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {category === 'body' && (
            <motion.div
              key="body"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.15 }}
            >
              <BodyPanel />
            </motion.div>
          )}
          {category === 'face' && (
            <motion.div
              key="face"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.15 }}
            >
              <FacePanel />
            </motion.div>
          )}
          {category === 'hair' && (
            <motion.div
              key="hair"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.15 }}
            >
              <HairPanel />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
