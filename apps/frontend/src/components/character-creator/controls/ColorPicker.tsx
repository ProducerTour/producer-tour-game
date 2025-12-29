/**
 * ColorPicker
 * Color palette picker with optional custom color input
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Pipette } from 'lucide-react';
import type { SkinToneOption } from '../../../lib/character/types';

interface ColorPickerProps {
  value: string;
  onChange: (hex: string) => void;
  onChangeEnd?: (hex: string) => void;
  palette: SkinToneOption[];
  label?: string;
  allowCustom?: boolean;
}

export function ColorPicker({
  value,
  onChange,
  onChangeEnd,
  palette,
  label,
  allowCustom = false,
}: ColorPickerProps) {
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customColor, setCustomColor] = useState(value);

  const handleSelect = useCallback(
    (hex: string) => {
      onChange(hex);
      onChangeEnd?.(hex);
    },
    [onChange, onChangeEnd]
  );

  const handleCustomChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const hex = e.target.value;
      setCustomColor(hex);
      onChange(hex);
    },
    [onChange]
  );

  const handleCustomBlur = useCallback(() => {
    onChangeEnd?.(customColor);
  }, [customColor, onChangeEnd]);

  const isPaletteColor = palette.some(
    (opt) => opt.hex.toLowerCase() === value.toLowerCase()
  );

  return (
    <div className="space-y-3">
      {label && (
        <label className="text-sm font-medium text-white/70">{label}</label>
      )}

      <div className="grid grid-cols-8 gap-2">
        {palette.map((option) => {
          const isSelected = value.toLowerCase() === option.hex.toLowerCase();

          return (
            <button
              key={option.id}
              onClick={() => handleSelect(option.hex)}
              className={`
                relative w-8 h-8 rounded-lg transition-all
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
                    className="w-3 h-3"
                    style={{
                      color: isLightColor(option.hex) ? '#000' : '#fff',
                    }}
                  />
                </motion.div>
              )}
            </button>
          );
        })}

        {allowCustom && (
          <button
            onClick={() => setShowCustomInput(!showCustomInput)}
            className={`
              relative w-8 h-8 rounded-lg border-2 border-dashed transition-all
              flex items-center justify-center
              ${showCustomInput || !isPaletteColor
                ? 'border-violet-500 bg-violet-500/20'
                : 'border-white/20 hover:border-white/40'
              }
            `}
            title="Custom color"
          >
            <Pipette className="w-4 h-4 text-white/70" />
          </button>
        )}
      </div>

      {/* Custom color input */}
      <AnimatePresence>
        {allowCustom && (showCustomInput || !isPaletteColor) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-3 pt-2">
              <div
                className="w-10 h-10 rounded-lg border border-white/20"
                style={{ backgroundColor: customColor }}
              />
              <input
                type="color"
                value={customColor}
                onChange={handleCustomChange}
                onBlur={handleCustomBlur}
                className="w-10 h-10 rounded-lg cursor-pointer bg-transparent"
              />
              <input
                type="text"
                value={customColor.toUpperCase()}
                onChange={(e) => {
                  const hex = e.target.value;
                  if (/^#[0-9A-Fa-f]{0,6}$/.test(hex)) {
                    setCustomColor(hex);
                    if (hex.length === 7) {
                      onChange(hex);
                    }
                  }
                }}
                onBlur={handleCustomBlur}
                className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm font-mono focus:outline-none focus:border-violet-500"
                placeholder="#FFFFFF"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function isLightColor(hex: string): boolean {
  const color = hex.replace('#', '');
  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
}
