/**
 * TypeScript types for the Video Maker tool
 */

export type VideoFormat = '16x9' | '9x16' | 'both';
export type ProcessingStage = 'loading' | 'encoding' | 'finalizing' | 'complete';
export type ImageType = 'static' | 'animated';

export interface FilePair {
  beat: File;
  image: File;
  beatName: string;
}

export interface ProcessingJob {
  id: string;
  beat: File;
  image: File;
  outputName: string;
  format: '16x9' | '9x16';
  status: 'pending' | 'processing' | 'complete' | 'error';
  progress: number;
  error?: string;
}

export interface CompletedVideo {
  id: string;
  name: string;
  blob: Blob;
  url: string;
  size: number;
  duration: number;
  format: '16x9' | '9x16';
}

export interface ProgressUpdate {
  currentJobIndex: number;
  totalJobs: number;
  currentProgress: number;
  stage: ProcessingStage;
  currentJobName?: string;
}

export interface ErrorLog {
  timestamp: Date;
  message: string;
  filename?: string;
}

export interface VideoMakerState {
  beats: File[];
  images: File[];
  outputFormat: VideoFormat;
  processingQueue: ProcessingJob[];
  completedVideos: CompletedVideo[];
  isProcessing: boolean;
  errors: ErrorLog[];
  currentProgress: ProgressUpdate | null;
}
