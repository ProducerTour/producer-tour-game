import type { ProgressUpdate } from '../../types/video-maker';

interface ProgressDisplayProps {
  progress: ProgressUpdate | null;
  isProcessing: boolean;
}

export function ProgressDisplay({ progress, isProcessing }: ProgressDisplayProps) {
  if (!isProcessing || !progress) {
    return null;
  }

  const overallPercent = Math.round((progress.currentJobIndex / progress.totalJobs) * 100);

  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-6">
      <h3 className="text-white text-lg font-semibold mb-4">Processing</h3>

      {/* Overall Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-white/90 text-sm">
            Overall Progress: {progress.currentJobIndex} of {progress.totalJobs} videos
          </span>
          <span className="text-white/60 text-sm">{overallPercent}%</span>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-yellow-500 via-orange-500 to-red-600 transition-all duration-300"
            style={{ width: `${overallPercent}%` }}
          />
        </div>
      </div>

      {/* Current Video Progress */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-white/90 text-sm">
            {progress.currentJobName || 'Processing video...'}
          </span>
          <span className="text-white/60 text-sm">{progress.currentProgress}%</span>
        </div>
        <div className="h-3 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-yellow-500 via-orange-500 to-red-600 transition-all duration-150"
            style={{ width: `${progress.currentProgress}%` }}
          />
        </div>
        <p className="text-white/40 text-xs mt-2">
          Stage: {progress.stage.charAt(0).toUpperCase() + progress.stage.slice(1)}
        </p>
      </div>
    </div>
  );
}
