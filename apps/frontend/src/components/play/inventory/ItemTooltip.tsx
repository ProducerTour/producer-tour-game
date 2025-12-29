/**
 * ItemTooltip - Rich tooltip displaying item information
 */

import { motion, AnimatePresence } from 'framer-motion';
import { RARITY_COLORS } from './constants';
import type { Item } from './types';

interface ItemTooltipProps {
  item: Item | null;
  quantity: number;
  equipped: boolean;
  position: { x: number; y: number } | null;
  isVisible: boolean;
}

const tooltipVariants = {
  hidden: { opacity: 0, y: 5, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { delay: 0.15, duration: 0.15 },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: 0.1 },
  },
};

export function ItemTooltip({ item, quantity, equipped, position, isVisible }: ItemTooltipProps) {
  if (!item || !position) return null;

  const rarityStyle = RARITY_COLORS[item.rarity];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed z-[100] pointer-events-none"
          style={{
            left: position.x + 10,
            top: position.y + 10,
          }}
          variants={tooltipVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <div className="bg-[#1a1a24]/95 backdrop-blur-xl rounded-lg border border-white/10 shadow-2xl min-w-[200px] max-w-[280px] overflow-hidden">
            {/* Header with rarity gradient */}
            <div className={`px-3 py-2 bg-gradient-to-r ${rarityStyle.gradient} border-b border-white/10`}>
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-white text-sm">{item.name}</h4>
                {equipped && (
                  <span className="text-[10px] uppercase tracking-wider text-green-400 font-medium">
                    Equipped
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-xs capitalize ${rarityStyle.text}`}>
                  {item.rarity}
                </span>
                <span className="text-xs text-gray-400">•</span>
                <span className="text-xs text-gray-400 capitalize">{item.type}</span>
              </div>
            </div>

            {/* Description */}
            {item.description && (
              <div className="px-3 py-2 border-b border-white/5">
                <p className="text-xs text-gray-300 leading-relaxed">
                  {item.description}
                </p>
              </div>
            )}

            {/* Stats/metadata */}
            {item.metadata && Object.keys(item.metadata).length > 0 && (
              <div className="px-3 py-2 border-b border-white/5 space-y-1">
                {Object.entries(item.metadata).map(([key, value]) => (
                  <div key={key} className="flex justify-between text-xs">
                    <span className="text-gray-400 capitalize">{formatStatName(key)}</span>
                    <span className="text-white">{formatStatValue(value)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Footer with value and quantity */}
            <div className="px-3 py-2 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1 text-amber-400">
                <span>💰</span>
                <span>{item.value.toLocaleString()}</span>
              </div>
              {item.stackable && quantity > 1 && (
                <span className="text-gray-400">
                  Quantity: <span className="text-white">{quantity}</span>
                </span>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Format stat name for display
 */
function formatStatName(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .trim();
}

/**
 * Format stat value for display
 */
function formatStatValue(value: unknown): string {
  if (typeof value === 'number') {
    return value.toLocaleString();
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  return String(value);
}
