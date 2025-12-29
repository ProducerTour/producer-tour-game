/**
 * ConfidenceBadge
 * Displays AI confidence score with color-coded visual feedback
 */

import { motion } from 'framer-motion';
import { CheckCircle, Sparkles, AlertTriangle } from 'lucide-react';

interface ConfidenceBadgeProps {
  confidence: number; // 0-1
}

/**
 * ConfidenceBadge - Color-coded badge showing AI generation confidence
 * - Green (≥70%): High confidence
 * - Yellow (40-70%): Medium confidence
 * - Red (<40%): Low confidence
 */
export function ConfidenceBadge({ confidence }: ConfidenceBadgeProps) {
  const percent = Math.round(confidence * 100);

  // Color coding based on confidence level
  const getColors = () => {
    if (percent >= 70) {
      return {
        bg: 'bg-emerald-500/20',
        border: 'border-emerald-500/40',
        text: 'text-emerald-400',
      };
    }
    if (percent >= 40) {
      return {
        bg: 'bg-amber-500/20',
        border: 'border-amber-500/40',
        text: 'text-amber-400',
      };
    }
    return {
      bg: 'bg-red-500/20',
      border: 'border-red-500/40',
      text: 'text-red-400',
    };
  };

  const getIcon = () => {
    if (percent >= 70) return CheckCircle;
    if (percent >= 40) return Sparkles;
    return AlertTriangle;
  };

  const colors = getColors();
  const Icon = getIcon();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${colors.bg} border ${colors.border}`}
    >
      <Icon className={`w-4 h-4 ${colors.text}`} />
      <span className={`text-sm font-medium ${colors.text}`}>
        AI Match: {percent}%
      </span>
    </motion.div>
  );
}

export default ConfidenceBadge;
