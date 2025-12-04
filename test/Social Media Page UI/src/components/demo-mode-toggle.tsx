import { Play, Pause } from 'lucide-react';

interface DemoModeToggleProps {
  isDemoMode: boolean;
  onToggle: (enabled: boolean) => void;
}

export function DemoModeToggle({ isDemoMode, onToggle }: DemoModeToggleProps) {
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <button
        onClick={() => onToggle(!isDemoMode)}
        className={`flex items-center gap-2 px-5 py-3 rounded-full shadow-lg transition-all ${
          isDemoMode
            ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white animate-pulse'
            : 'bg-white text-gray-700 hover:shadow-xl'
        }`}
      >
        {isDemoMode ? (
          <>
            <Pause className="w-5 h-5" />
            <span>Demo Mode ON</span>
          </>
        ) : (
          <>
            <Play className="w-5 h-5" />
            <span>Demo Mode</span>
          </>
        )}
      </button>
    </div>
  );
}
