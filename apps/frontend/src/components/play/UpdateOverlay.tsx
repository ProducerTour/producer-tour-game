/**
 * Update Overlay Component
 * Shows when server has been redeployed, with countdown to auto-refresh
 */

import { RefreshCw } from 'lucide-react';

interface UpdateOverlayProps {
  isVisible: boolean;
  secondsUntilRefresh: number;
  onRefreshNow: () => void;
}

export function UpdateOverlay({ isVisible, secondsUntilRefresh, onRefreshNow }: UpdateOverlayProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-violet-900/90 to-fuchsia-900/90 rounded-2xl p-8 max-w-md mx-4 border border-violet-500/30 shadow-2xl shadow-violet-500/20">
        {/* Spinning icon */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <RefreshCw className="w-16 h-16 text-violet-400 animate-spin" style={{ animationDuration: '2s' }} />
            <div className="absolute inset-0 bg-violet-500/20 rounded-full blur-xl" />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-white text-center mb-2">
          Game Update Available
        </h2>

        {/* Description */}
        <p className="text-violet-200/80 text-center mb-6">
          A new version has been deployed. Refreshing to get the latest features and fixes.
        </p>

        {/* Countdown */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 bg-black/30 px-4 py-2 rounded-full">
            <span className="text-violet-300">Auto-refresh in</span>
            <span className="text-2xl font-bold text-white tabular-nums">
              {secondsUntilRefresh}
            </span>
            <span className="text-violet-300">seconds</span>
          </div>
        </div>

        {/* Refresh now button */}
        <button
          onClick={onRefreshNow}
          className="w-full py-3 px-6 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          <RefreshCw className="w-5 h-5" />
          Refresh Now
        </button>
      </div>
    </div>
  );
}

export default UpdateOverlay;
