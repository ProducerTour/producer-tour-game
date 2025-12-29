/**
 * SliderControl
 * Labeled slider with value display
 */

import { useCallback, useMemo } from 'react';
import * as Slider from '@radix-ui/react-slider';

interface SliderControlProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
  onChangeEnd?: (value: number) => void;
  formatValue?: (value: number) => string;
  showValue?: boolean;
}

export function SliderControl({
  label,
  value,
  min = 0,
  max = 1,
  step = 0.01,
  onChange,
  onChangeEnd,
  formatValue,
  showValue = true,
}: SliderControlProps) {
  const handleChange = useCallback(
    (values: number[]) => {
      onChange(values[0]);
    },
    [onChange]
  );

  const handleChangeEnd = useCallback(
    (values: number[]) => {
      onChangeEnd?.(values[0]);
    },
    [onChangeEnd]
  );

  const displayValue = useMemo(() => {
    if (formatValue) {
      return formatValue(value);
    }
    // Default: show as percentage or value
    if (min >= -1 && max <= 1) {
      const percent = Math.round(value * 100);
      return percent >= 0 ? `+${percent}%` : `${percent}%`;
    }
    return value.toFixed(2);
  }, [value, min, max, formatValue]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-white/70">{label}</label>
        {showValue && (
          <span className="text-sm text-white/50 font-mono">{displayValue}</span>
        )}
      </div>
      <Slider.Root
        className="relative flex items-center select-none touch-none w-full h-5"
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={handleChange}
        onValueCommit={handleChangeEnd}
      >
        <Slider.Track className="relative grow h-1.5 rounded-full bg-white/10">
          <Slider.Range className="absolute h-full rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600" />
        </Slider.Track>
        <Slider.Thumb
          className="block w-4 h-4 rounded-full bg-white shadow-lg shadow-black/25 hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-[#0a0a0f] transition-all cursor-grab active:cursor-grabbing"
          aria-label={label}
        />
      </Slider.Root>
    </div>
  );
}
