import { CheckCircle2, Circle, Loader2, XCircle } from 'lucide-react';
import type { ProcessingJob, ProgressUpdate } from '../../types/video-maker';

interface ProcessingQueueProps {
  jobs: ProcessingJob[];
  currentProgress: ProgressUpdate | null;
  isProcessing: boolean;
}

export function ProcessingQueue({ jobs, currentProgress, isProcessing }: ProcessingQueueProps) {
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
      return <Loader2 size={16} className="text-brand-blue animate-spin" />;
    }
    return <Circle size={16} className="text-zinc-600" />;
  };

  const getStageText = (stage: string) => {
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

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
      {/* Header */}
      <div className="mb-4">
        <h3 className="font-semibold text-lg">Processing Queue</h3>
        <p className="text-zinc-500 text-xs mt-1">Real-time video generation progress</p>
      </div>

      <div className="space-y-2">
        {jobs.map((job) => {
          const isCurrentJob = currentProgress?.currentJobName === job.outputName;

          return (
            <div
              key={job.id}
              className="bg-zinc-800 rounded-lg p-3 space-y-2"
            >
              <div className="flex items-center gap-3">
                {getStatusIcon(job)}
                <span className="text-sm flex-1 truncate" title={job.outputName}>
                  {job.outputName}
                </span>
                <span className="text-xs text-zinc-500">{job.format}</span>
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
                      className="bg-gradient-to-r from-brand-blue to-blue-500 h-full transition-all duration-300"
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
              className="bg-gradient-to-r from-brand-blue to-blue-500 h-full transition-all duration-300"
              style={{
                width: `${(currentProgress.currentJobIndex / currentProgress.totalJobs) * 100}%`,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
