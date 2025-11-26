import { CheckCircle2, Circle, Loader2, XCircle, Pause, Play, X, SkipForward, RefreshCw, Clock } from 'lucide-react';
import { Button } from '../ui/Button';
import type { ProcessingJob, ProgressUpdate } from '../../types/video-maker';

interface ProcessingQueueProps {
  jobs: ProcessingJob[];
  currentProgress: ProgressUpdate | null;
  isProcessing: boolean;
  isPaused?: boolean;
  onPause?: () => void;
  onResume?: () => void;
  onCancel?: () => void;
  onSkip?: () => void;
  onRetry?: (jobId: string) => void;
  estimatedTimeRemaining?: number | null;
}

export function ProcessingQueue({
  jobs,
  currentProgress,
  isProcessing,
  isPaused = false,
  onPause,
  onResume,
  onCancel,
  onSkip,
  onRetry,
  estimatedTimeRemaining,
}: ProcessingQueueProps) {
  if (jobs.length === 0) {
    return null;
  }

  const getStatusIcon = (job: ProcessingJob) => {
    if (job.status === 'complete') {
      return <CheckCircle2 size={16} className="text-green-400" />;
    }
    if (job.status === 'error') {
      return <XCircle size={16} className="text-red-400" />;
    }
    if (job.status === 'processing') {
      if (isPaused) {
        return <Pause size={16} className="text-yellow-400" />;
      }
      return <Loader2 size={16} className="text-brand-blue animate-spin" />;
    }
    if (job.status === 'skipped') {
      return <SkipForward size={16} className="text-zinc-500" />;
    }
    return <Circle size={16} className="text-zinc-600" />;
  };

  const getStageText = (stage: string) => {
    if (isPaused) return 'Paused';
    switch (stage) {
      case 'loading':
        return 'Loading files...';
      case 'encoding':
        return 'Encoding video...';
      case 'finalizing':
        return 'Finalizing...';
      case 'complete':
        return 'Complete!';
      default:
        return 'Processing...';
    }
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 60) {
      return `~${Math.round(seconds)}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `~${minutes}m ${secs}s`;
  };

  const completedCount = jobs.filter((j) => j.status === 'complete').length;
  const failedCount = jobs.filter((j) => j.status === 'error').length;
  const pendingCount = jobs.filter((j) => j.status === 'pending').length;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
      {/* Header with Controls */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-lg flex items-center gap-2">
            Processing Queue
            {isPaused && (
              <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">
                Paused
              </span>
            )}
          </h3>
          <p className="text-zinc-500 text-xs mt-1">
            {completedCount} completed
            {failedCount > 0 && <span className="text-red-400"> • {failedCount} failed</span>}
            {pendingCount > 0 && ` • ${pendingCount} pending`}
          </p>
        </div>

        {/* Control Buttons */}
        {isProcessing && (
          <div className="flex items-center gap-2">
            {onSkip && (
              <Button
                variant="outline"
                size="sm"
                onClick={onSkip}
                className="gap-1 border-zinc-700 hover:bg-zinc-800 text-xs px-2"
                title="Skip current video"
              >
                <SkipForward size={14} />
              </Button>
            )}
            {onPause && onResume && (
              <Button
                variant="outline"
                size="sm"
                onClick={isPaused ? onResume : onPause}
                className={`gap-1 border-zinc-700 hover:bg-zinc-800 text-xs px-2 ${
                  isPaused ? 'text-green-400 border-green-500/50' : 'text-yellow-400 border-yellow-500/50'
                }`}
                title={isPaused ? 'Resume' : 'Pause after current'}
              >
                {isPaused ? <Play size={14} /> : <Pause size={14} />}
              </Button>
            )}
            {onCancel && (
              <Button
                variant="outline"
                size="sm"
                onClick={onCancel}
                className="gap-1 border-red-500/50 text-red-400 hover:bg-red-500/20 text-xs px-2"
                title="Cancel all"
              >
                <X size={14} />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Estimated Time Remaining */}
      {isProcessing && estimatedTimeRemaining !== null && estimatedTimeRemaining !== undefined && estimatedTimeRemaining > 0 && (
        <div className="flex items-center gap-2 mb-4 p-2 bg-zinc-800/50 rounded-lg">
          <Clock size={14} className="text-zinc-500" />
          <span className="text-xs text-zinc-400">
            Estimated time remaining: <strong className="text-white">{formatTime(estimatedTimeRemaining)}</strong>
          </span>
        </div>
      )}

      <div className="space-y-2">
        {jobs.map((job) => {
          const isCurrentJob = currentProgress?.currentJobName === job.outputName;

          return (
            <div
              key={job.id}
              className={`bg-zinc-800 rounded-lg p-3 space-y-2 ${
                job.status === 'error' ? 'border border-red-500/30' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                {getStatusIcon(job)}
                <span className="text-sm flex-1 truncate" title={job.outputName}>
                  {job.outputName}
                </span>
                <span className="text-xs text-zinc-500">{job.format}</span>

                {/* Retry button for failed jobs */}
                {job.status === 'error' && onRetry && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onRetry(job.id)}
                    className="gap-1 border-zinc-700 hover:bg-zinc-700 text-xs h-7 px-2"
                    title="Retry this video"
                  >
                    <RefreshCw size={12} />
                    Retry
                  </Button>
                )}
              </div>

              {isCurrentJob && currentProgress && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400">
                      {getStageText(currentProgress.stage)}
                    </span>
                    <span className="text-zinc-400">
                      {currentProgress.currentProgress}%
                    </span>
                  </div>
                  <div className="w-full bg-zinc-700 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        isPaused
                          ? 'bg-yellow-500'
                          : 'bg-gradient-to-r from-brand-blue to-blue-500'
                      }`}
                      style={{ width: `${currentProgress.currentProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {job.status === 'error' && job.error && (
                <p className="text-red-400 text-xs font-mono">{job.error}</p>
              )}
            </div>
          );
        })}
      </div>

      {isProcessing && currentProgress && (
        <div className="pt-4 mt-4 border-t border-zinc-800">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-zinc-400">Overall Progress</span>
            <span className="text-zinc-400">
              {currentProgress.currentJobIndex} / {currentProgress.totalJobs} videos
            </span>
          </div>
          <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                isPaused
                  ? 'bg-yellow-500'
                  : 'bg-gradient-to-r from-brand-blue to-blue-500'
              }`}
              style={{
                width: `${(currentProgress.currentJobIndex / currentProgress.totalJobs) * 100}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Retry All Failed button */}
      {!isProcessing && failedCount > 1 && onRetry && (
        <div className="pt-4 mt-4 border-t border-zinc-800">
          <Button
            variant="outline"
            onClick={() => {
              jobs.filter((j) => j.status === 'error').forEach((j) => onRetry(j.id));
            }}
            className="w-full gap-2 border-red-500/50 text-red-400 hover:bg-red-500/20"
          >
            <RefreshCw size={16} />
            Retry All Failed ({failedCount})
          </Button>
        </div>
      )}
    </div>
  );
}
