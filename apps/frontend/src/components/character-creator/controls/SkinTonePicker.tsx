/**
 * SkinTonePicker
 * Grid of skin tone color swatches
 */

import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import type { SkinToneOption } from '../../../lib/character/types';
import { SKIN_TONE_PALETTE } from '../../../lib/character/defaults';

interface SkinTonePickerProps {
  value: string;
  onChange: (hex: string) => void;
  onChangeEnd?: (hex: string) => void;
  palette?: SkinToneOption[];
  label?: string;
}

export function SkinTonePicker({
  value,
  onChange,
  onChangeEnd,
  palette = SKIN_TONE_PALETTE,
  label = 'Skin Tone',
}: SkinTonePickerProps) {
  const handleSelect = (hex: string) => {
    onChange(hex);
    onChangeEnd?.(hex);
  };

  return (
    <div className="space-y-3">
      {label && (
        <label className="text-sm font-medium text-white/70">{label}</label>
      )}
      <div className="grid grid-cols-6 gap-2">
        {palette.map((option) => {
          const isSelected = value.toLowerCase() === option.hex.toLowerCase();

          return (
            <button
              key={option.id}
              onClick={() => handleSelect(option.hex)}
              className={`
                relative w-10 h-10 rounded-full transition-all
                ${isSelected
                  ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0a0a0f] scale-110'
                  : 'hover:scale-105'
                }
              `}
              style={{ backgroundColor: option.hex }}
              title={option.name}
            >
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <Check
                    className="w-4 h-4"
                    style={{
                      color: isLightColor(option.hex) ? '#000' : '#fff',
                    }}
                  />
                </motion.div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Determine if a color is light (for contrast)
 */
function isLightColor(hex: string): boolean {
  const color = hex.replace('#', '');
  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
}
