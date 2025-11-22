/**
 * Slider Component
 * Accessible slider/range input built with Radix UI
 */

import * as React from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { cn } from '../../lib/utils';

interface SliderProps
  extends React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> {
  /** Show value label above thumb */
  showValue?: boolean;
  /** Format the displayed value */
  formatValue?: (value: number) => string;
}

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  SliderProps
>(({ className, showValue, formatValue, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      'relative flex w-full touch-none select-none items-center',
      className
    )}
    {...props}
  >
    <SliderPrimitive.Track
      className={cn(
        'relative h-2 w-full grow overflow-hidden rounded-full',
        'bg-white/10 border border-white/[0.08]'
      )}
    >
      <SliderPrimitive.Range className="absolute h-full bg-gradient-to-r from-blue-500 to-blue-400" />
    </SliderPrimitive.Track>
    {(props.value || props.defaultValue || [0]).map((_, index) => (
      <SliderPrimitive.Thumb
        key={index}
        className={cn(
          'block h-5 w-5 rounded-full',
          'bg-white border-2 border-blue-500',
          'shadow-lg shadow-black/20',
          'ring-offset-background transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
          'disabled:pointer-events-none disabled:opacity-50',
          'hover:bg-gray-100 cursor-grab active:cursor-grabbing'
        )}
      />
    ))}
  </SliderPrimitive.Root>
));
Slider.displayName = SliderPrimitive.Root.displayName;

// Range slider variant with two thumbs
const RangeSlider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  Omit<SliderProps, 'value' | 'defaultValue'> & {
    value?: [number, number];
    defaultValue?: [number, number];
  }
>((props, ref) => <Slider ref={ref} {...props} />);
RangeSlider.displayName = 'RangeSlider';

export { Slider, RangeSlider };
