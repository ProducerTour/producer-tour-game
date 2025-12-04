import { Check, Palette } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { Theme } from '@/config/themes';

export function ThemeSelector() {
  const { themeId, setTheme, availableThemes } = useTheme();

  return (
    <div className="relative overflow-hidden bg-theme-card border border-theme-border p-6 group hover:border-theme-border-hover transition-all duration-300">
      <div className="absolute top-0 left-0 w-0 h-[2px] bg-theme-primary group-hover:w-full transition-all duration-500" />

      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-theme-primary/10 flex items-center justify-center">
          <Palette className="w-5 h-5 text-theme-primary" />
        </div>
        <div>
          <h3 className="text-lg font-light text-theme-foreground">Dashboard Theme</h3>
          <p className="text-sm text-theme-foreground-muted">Choose your preferred dashboard appearance</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {availableThemes.map((t) => (
          <ThemeCard
            key={t.id}
            theme={t}
            isSelected={themeId === t.id}
            onSelect={() => setTheme(t.id)}
          />
        ))}
      </div>

      <p className="text-xs text-theme-foreground-muted mt-4">
        Theme preference is saved locally and will persist across sessions.
      </p>
    </div>
  );
}

interface ThemeCardProps {
  theme: Theme;
  isSelected: boolean;
  onSelect: () => void;
}

function ThemeCard({ theme, isSelected, onSelect }: ThemeCardProps) {
  return (
    <button
      onClick={onSelect}
      className={`relative p-4 text-left transition-all duration-200 ${
        isSelected
          ? 'ring-2 ring-theme-primary bg-theme-primary/5'
          : 'border border-theme-border hover:border-theme-border-hover hover:bg-theme-card-hover'
      }`}
    >
      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute top-2 right-2 w-5 h-5 bg-theme-primary flex items-center justify-center">
          <Check className="w-3 h-3 text-theme-primary-foreground" />
        </div>
      )}

      {/* Theme preview */}
      <div className="flex gap-1 mb-3">
        <div
          className="w-8 h-8 border border-black/10"
          style={{ backgroundColor: theme.preview.background }}
        />
        <div
          className="w-8 h-8 border border-black/10"
          style={{ backgroundColor: theme.preview.card }}
        />
        <div
          className="w-8 h-8 border border-black/10"
          style={{ backgroundColor: theme.preview.primary }}
        />
      </div>

      {/* Theme info */}
      <div className="font-medium text-theme-foreground">{theme.name}</div>
      <div className="text-xs text-theme-foreground-muted mt-1">{theme.description}</div>
    </button>
  );
}
