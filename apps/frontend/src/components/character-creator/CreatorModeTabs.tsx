/**
 * CreatorModeTabs
 * Toggle between Customize and Selfie-to-Avatar modes
 */

import { motion } from 'framer-motion';
import { Palette, Camera } from 'lucide-react';
import { useCharacterCreatorStore, type CreatorMode } from '../../stores/characterCreator.store';

interface CreatorModeTabsProps {
  horizontal?: boolean;
}

const MODES: { id: CreatorMode; label: string; icon: typeof Palette; description: string }[] = [
  {
    id: 'customize',
    label: 'Customize',
    icon: Palette,
    description: 'Manual customization',
  },
  {
    id: 'selfie',
    label: 'Selfie',
    icon: Camera,
    description: 'AI from photo',
  },
];

export function CreatorModeTabs({ horizontal = false }: CreatorModeTabsProps) {
  const mode = useCharacterCreatorStore((s) => s.mode);
  const setMode = useCharacterCreatorStore((s) => s.setMode);

  if (horizontal) {
    return (
      <div className="flex items-center justify-center gap-2 px-4 py-3">
        {MODES.map((item) => {
          const isActive = mode === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => setMode(item.id)}
              className={`
                relative flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all
                ${isActive
                  ? 'text-white'
                  : 'text-white/50 hover:text-white/70 hover:bg-white/5'
                }
              `}
            >
              {isActive && (
                <motion.div
                  layoutId="mode-indicator"
                  className="absolute inset-0 bg-gradient-to-r from-violet-600/20 to-fuchsia-600/20 border border-violet-500/30 rounded-lg"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                />
              )}
              <Icon className="w-4 h-4 relative z-10" />
              <span className="text-sm relative z-10">{item.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="p-4">
      <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3 px-1">
        Creation Mode
      </h3>
      <div className="space-y-2">
        {MODES.map((item) => {
          const isActive = mode === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => setMode(item.id)}
              className={`
                relative w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left
                ${isActive
                  ? 'text-white'
                  : 'text-white/50 hover:text-white/70 hover:bg-white/5'
                }
              `}
            >
              {isActive && (
                <motion.div
                  layoutId="mode-indicator-vertical"
                  className="absolute inset-0 bg-gradient-to-r from-violet-600/20 to-fuchsia-600/20 border border-violet-500/30 rounded-xl"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                />
              )}
              <div
                className={`
                  relative z-10 w-10 h-10 rounded-lg flex items-center justify-center
                  ${isActive
                    ? 'bg-gradient-to-br from-violet-600 to-fuchsia-600'
                    : 'bg-white/10'
                  }
                `}
              >
                <Icon className="w-5 h-5" />
              </div>
              <div className="relative z-10">
                <p className="font-medium">{item.label}</p>
                <p className="text-xs text-white/40">{item.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
