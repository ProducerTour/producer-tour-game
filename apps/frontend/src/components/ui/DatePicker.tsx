/**
 * Date Picker Component
 * Using react-day-picker with dark theme styling
 */

import * as React from 'react';
import { format } from 'date-fns';
import { DayPicker, type DateRange } from 'react-day-picker';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from './Popover';
import { Button } from './Button';

// Custom styles for dark theme
const dayPickerClassNames = {
  root: 'p-3',
  months: 'flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0',
  month: 'space-y-4',
  caption: 'flex justify-center pt-1 relative items-center',
  caption_label: 'text-sm font-medium text-white',
  nav: 'space-x-1 flex items-center',
  nav_button: cn(
    'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100',
    'inline-flex items-center justify-center rounded-md',
    'text-gray-400 hover:text-white hover:bg-white/10 transition-colors'
  ),
  nav_button_previous: 'absolute left-1',
  nav_button_next: 'absolute right-1',
  table: 'w-full border-collapse space-y-1',
  head_row: 'flex',
  head_cell: 'text-gray-500 rounded-md w-9 font-normal text-[0.8rem]',
  row: 'flex w-full mt-2',
  cell: cn(
    'relative p-0 text-center text-sm focus-within:relative focus-within:z-20',
    '[&:has([aria-selected])]:bg-blue-500/20 [&:has([aria-selected].day-outside)]:bg-blue-500/10',
    '[&:has([aria-selected].day-range-end)]:rounded-r-md',
    'first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md'
  ),
  day: cn(
    'h-9 w-9 p-0 font-normal',
    'inline-flex items-center justify-center rounded-md',
    'text-gray-300 hover:bg-white/10 hover:text-white',
    'focus:outline-none focus:ring-2 focus:ring-blue-500/50',
    'aria-selected:opacity-100 transition-colors'
  ),
  day_selected: cn(
    'bg-blue-500 text-white hover:bg-blue-600 hover:text-white',
    'focus:bg-blue-500 focus:text-white'
  ),
  day_today: 'bg-white/10 text-white font-semibold',
  day_outside: 'text-gray-600 opacity-50 aria-selected:bg-blue-500/30 aria-selected:text-gray-400',
  day_disabled: 'text-gray-600 opacity-50 cursor-not-allowed',
  day_range_middle: 'aria-selected:bg-blue-500/20 aria-selected:text-white',
  day_hidden: 'invisible',
};

// Custom Chevron component for navigation
function Chevron({ orientation = 'left' }: {
  orientation?: 'left' | 'right' | 'up' | 'down';
  className?: string;
  size?: number;
  disabled?: boolean;
}) {
  if (orientation === 'left' || orientation === 'up') {
    return <ChevronLeft className="h-4 w-4" />;
  }
  return <ChevronRight className="h-4 w-4" />;
}

interface CalendarProps {
  mode?: 'single' | 'range';
  selected?: Date | DateRange;
  onSelect?: ((date: Date | undefined) => void) | ((range: DateRange | undefined) => void);
  disabled?: (date: Date) => boolean;
  numberOfMonths?: number;
  className?: string;
}

function Calendar({
  className,
  mode = 'single',
  selected,
  onSelect,
  disabled,
  numberOfMonths = 1,
}: CalendarProps) {
  if (mode === 'range') {
    return (
      <DayPicker
        mode="range"
        selected={selected as DateRange | undefined}
        onSelect={onSelect as (range: DateRange | undefined) => void}
        disabled={disabled}
        numberOfMonths={numberOfMonths}
        classNames={dayPickerClassNames}
        components={{ Chevron }}
        className={cn('bg-surface-elevated rounded-xl border border-white/10', className)}
      />
    );
  }

  return (
    <DayPicker
      mode="single"
      selected={selected as Date | undefined}
      onSelect={onSelect as (date: Date | undefined) => void}
      disabled={disabled}
      numberOfMonths={numberOfMonths}
      classNames={dayPickerClassNames}
      components={{ Chevron }}
      className={cn('bg-surface-elevated rounded-xl border border-white/10', className)}
    />
  );
}

// Single Date Picker
interface DatePickerProps {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
  className?: string;
}

function DatePicker({
  value,
  onChange,
  placeholder = 'Pick a date',
  disabled,
  minDate,
  maxDate,
  className,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  const disabledDays = (date: Date) => {
    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;
    return false;
  };

  const handleSelect = (date: Date | undefined) => {
    onChange?.(date);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            'w-full justify-start text-left font-normal h-11',
            !value && 'text-gray-500',
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? format(value, 'PPP') : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 bg-surface-elevated border-white/10" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={handleSelect}
          disabled={disabledDays}
        />
      </PopoverContent>
    </Popover>
  );
}

// Date Range Picker
interface DateRangePickerProps {
  value?: DateRange;
  onChange?: (range: DateRange | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
  numberOfMonths?: number;
  className?: string;
}

function DateRangePicker({
  value,
  onChange,
  placeholder = 'Pick a date range',
  disabled,
  minDate,
  maxDate,
  numberOfMonths = 2,
  className,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);

  const disabledDays = (date: Date) => {
    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;
    return false;
  };

  const formatRange = () => {
    if (!value?.from) return placeholder;
    if (!value.to) return format(value.from, 'PPP');
    return `${format(value.from, 'LLL dd, y')} - ${format(value.to, 'LLL dd, y')}`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            'w-full justify-start text-left font-normal h-11',
            !value?.from && 'text-gray-500',
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {formatRange()}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0 bg-surface-elevated border-white/10"
        align="start"
      >
        <Calendar
          mode="range"
          selected={value}
          onSelect={onChange}
          disabled={disabledDays}
          numberOfMonths={numberOfMonths}
        />
      </PopoverContent>
    </Popover>
  );
}

export { Calendar, DatePicker, DateRangePicker };
export type { DateRange };
