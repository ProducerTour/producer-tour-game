/**
 * TypeScript types for the Video Maker tool
 */

export type VideoFormat = '16x9' | '9x16' | 'both';
export type VideoResolution = '720p' | '1080p';
export type VideoQuality = 'fast' | 'balanced' | 'high';
export type ProcessingStage = 'loading' | 'encoding' | 'finalizing' | 'complete';
export type ImageType = 'static' | 'animated';

// Resolution mappings
export const RESOLUTION_CONFIG = {
  '720p': {
    landscape: { width: 1280, height: 720 },
    portrait: { width: 720, height: 1280 },
  },
  '1080p': {
    landscape: { width: 1920, height: 1080 },
    portrait: { width: 1080, height: 1920 },
  },
} as const;

// Quality presets (CRF values - lower is better quality but larger files)
export const QUALITY_PRESETS = {
  fast: { crf: 32 },
  balanced: { crf: 28 },
  high: { crf: 23 },
} as const;

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
  status: 'pending' | 'processing' | 'complete' | 'error' | 'skipped';
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
