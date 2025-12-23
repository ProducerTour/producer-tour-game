/**
 * InventoryPanel - Main glass-morphism container for inventory UI
 */

import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';

interface InventoryPanelProps {
  children: ReactNode;
  onClose: () => void;
}

const panelVariants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
    y: 20,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.2,
      ease: 'easeOut' as const,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 20,
    transition: { duration: 0.15 },
  },
};

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

export function InventoryPanel({ children, onClose }: InventoryPanelProps) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center"
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        variants={backdropVariants}
        onClick={onClose}
      />

      {/* Panel */}
      <motion.div
        className="relative z-10 w-[95vw] max-w-5xl max-h-[90vh] overflow-hidden"
        variants={panelVariants}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Gradient border effect */}
        <div className="absolute -inset-[1px] bg-gradient-to-br from-violet-500/30 via-fuchsia-500/20 to-cyan-500/30 rounded-2xl opacity-60" />

        {/* Main container with glass effect */}
        <div className="relative bg-[#12121a]/95 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors group"
            aria-label="Close inventory"
          >
            <X className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
          </button>

          {/* Content */}
          <div className="p-6">
            {children}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
