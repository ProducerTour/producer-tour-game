/**
 * PresetGrid
 * Grid of selectable presets (face presets, hair styles, etc.)
 */

import { motion } from 'framer-motion';
import { Check, Lock } from 'lucide-react';

interface PresetOption {
  id: string | number;
  name: string;
  thumbnailPath?: string;
  locked?: boolean;
}

interface PresetGridProps<T extends PresetOption> {
  options: T[];
  value: string | number | null;
  onChange: (id: T['id']) => void;
  label?: string;
  columns?: number;
  renderOption?: (option: T, isSelected: boolean) => React.ReactNode;
}

export function PresetGrid<T extends PresetOption>({
  options,
  value,
  onChange,
  label,
  columns = 4,
  renderOption,
}: PresetGridProps<T>) {
  return (
    <div className="space-y-3">
      {label && (
        <label className="text-sm font-medium text-white/70">{label}</label>
      )}
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
      >
        {options.map((option) => {
          const isSelected = value === option.id;
          const isLocked = option.locked;

          if (renderOption) {
            return (
              <button
                key={option.id}
                onClick={() => !isLocked && onChange(option.id)}
                disabled={isLocked}
                className={`
                  relative rounded-xl transition-all
                  ${isSelected
                    ? 'ring-2 ring-violet-500 ring-offset-2 ring-offset-[#0a0a0f]'
                    : ''
                  }
                  ${isLocked
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:scale-105'
                  }
                `}
              >
                {renderOption(option, isSelected)}
                {isLocked && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl">
                    <Lock className="w-4 h-4 text-white/70" />
                  </div>
                )}
              </button>
            );
          }

          return (
            <button
              key={option.id}
              onClick={() => !isLocked && onChange(option.id)}
              disabled={isLocked}
              className={`
                relative aspect-square rounded-xl overflow-hidden transition-all
                ${isSelected
                  ? 'ring-2 ring-violet-500 ring-offset-2 ring-offset-[#0a0a0f]'
                  : 'hover:scale-105'
                }
                ${isLocked
                  ? 'opacity-50 cursor-not-allowed'
                  : ''
                }
              `}
            >
              {option.thumbnailPath ? (
                <img
                  src={option.thumbnailPath}
                  alt={option.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback to placeholder on error
                    (e.target as HTMLImageElement).src = '';
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-full h-full bg-white/5 flex items-center justify-center">
                  <span className="text-xs text-white/40 text-center px-2">
                    {option.name}
                  </span>
                </div>
              )}

              {/* Selection indicator */}
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-violet-500 flex items-center justify-center"
                >
                  <Check className="w-3 h-3 text-white" />
                </motion.div>
              )}

              {/* Lock indicator */}
              {isLocked && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <Lock className="w-4 h-4 text-white/70" />
                </div>
              )}

              {/* Name label */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                <p className="text-xs text-white/80 truncate">{option.name}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
