import { useState, useRef, useEffect } from 'react';

interface EditableFieldProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  onCancel?: () => void;
  placeholder?: string;
  multiline?: boolean;
  className?: string;
  prefix?: React.ReactNode;
  maxLength?: number;
}

export const EditableField: React.FC<EditableFieldProps> = ({
  value,
  onChange,
  onBlur,
  onCancel,
  placeholder = 'Click to edit...',
  multiline = false,
  className = '',
  prefix,
  maxLength,
}) => {
  const [localValue, setLocalValue] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    // Auto-focus when component mounts
    inputRef.current?.focus();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    onChange(newValue);
  };

  const handleBlur = () => {
    if (onBlur) {
      onBlur();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (onCancel) {
        onCancel();
      }
    } else if (e.key === 'Enter' && !multiline) {
      e.preventDefault();
      inputRef.current?.blur();
    }
  };

  const inputClasses = `
    block w-full px-3 py-2 rounded-lg
    bg-theme-input border border-theme-border-strong
    text-theme-foreground placeholder-theme-foreground-muted
    focus:outline-none focus:border-theme-primary
    transition-colors
    ${className}
  `;

  return (
    <div className="relative flex items-center gap-2">
      {prefix && <div className="flex-shrink-0">{prefix}</div>}
      {multiline ? (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={localValue}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          maxLength={maxLength}
          rows={3}
          className={inputClasses}
        />
      ) : (
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type="text"
          value={localValue}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          maxLength={maxLength}
          className={inputClasses}
        />
      )}
    </div>
  );
};
