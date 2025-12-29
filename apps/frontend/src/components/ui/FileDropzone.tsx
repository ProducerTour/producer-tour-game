/**
 * File Dropzone Component
 * Using react-dropzone with dark theme styling
 */

import * as React from 'react';
import { useDropzone, type Accept, type FileRejection } from 'react-dropzone';
import { Upload, File, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '../../lib/utils';

interface FileDropzoneProps {
  onFilesAccepted: (files: File[]) => void;
  onFilesRejected?: (rejections: FileRejection[]) => void;
  accept?: Accept;
  maxFiles?: number;
  maxSize?: number;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
}

function FileDropzone({
  onFilesAccepted,
  onFilesRejected,
  accept,
  maxFiles = 1,
  maxSize = 10 * 1024 * 1024, // 10MB default
  disabled = false,
  className,
  children,
}: FileDropzoneProps) {
  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isDragAccept,
    isDragReject,
  } = useDropzone({
    onDropAccepted: onFilesAccepted,
    onDropRejected: onFilesRejected,
    accept,
    maxFiles,
    maxSize,
    disabled,
  });

  const getBorderColor = () => {
    if (isDragReject) return 'border-red-500/50';
    if (isDragAccept) return 'border-green-500/50';
    if (isDragActive) return 'border-blue-500/50';
    return 'border-white/[0.08]';
  };

  const getBackgroundColor = () => {
    if (isDragReject) return 'bg-red-500/5';
    if (isDragAccept) return 'bg-green-500/5';
    if (isDragActive) return 'bg-blue-500/5';
    return 'bg-white/[0.02]';
  };

  return (
    <div
      {...getRootProps()}
      className={cn(
        'relative rounded-xl border-2 border-dashed p-8 transition-all duration-200 cursor-pointer',
        'hover:border-white/20 hover:bg-white/[0.04]',
        getBorderColor(),
        getBackgroundColor(),
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      <input {...getInputProps()} />

      {children || (
        <div className="flex flex-col items-center justify-center text-center">
          <div
            className={cn(
              'w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-colors',
              isDragReject && 'bg-red-500/20',
              isDragAccept && 'bg-green-500/20',
              isDragActive && !isDragReject && !isDragAccept && 'bg-blue-500/20',
              !isDragActive && 'bg-white/10'
            )}
          >
            {isDragReject ? (
              <AlertCircle className="w-7 h-7 text-red-400" />
            ) : isDragAccept ? (
              <CheckCircle2 className="w-7 h-7 text-green-400" />
            ) : (
              <Upload className="w-7 h-7 text-gray-400" />
            )}
          </div>

          <p className="text-sm text-white font-medium mb-1">
            {isDragReject
              ? 'File type not accepted'
              : isDragAccept
              ? 'Drop to upload'
              : isDragActive
              ? 'Drop files here'
              : 'Drag & drop files here'}
          </p>

          <p className="text-xs text-gray-500">
            {isDragActive
              ? `Up to ${maxFiles} file${maxFiles > 1 ? 's' : ''}`
              : 'or click to browse'}
          </p>

          {maxSize && !isDragActive && (
            <p className="text-xs text-gray-600 mt-2">
              Max file size: {formatFileSize(maxSize)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// File Preview Component
interface FilePreviewProps {
  file: File;
  onRemove?: () => void;
  progress?: number;
  error?: string;
  className?: string;
}

function FilePreview({ file, onRemove, progress, error, className }: FilePreviewProps) {
  const isImage = file.type.startsWith('image/');

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-xl',
        'bg-white/[0.04] border border-white/[0.08]',
        error && 'border-red-500/30 bg-red-500/5',
        className
      )}
    >
      {/* Preview/Icon */}
      <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
        {isImage ? (
          <img
            src={URL.createObjectURL(file)}
            alt={file.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <File className="w-6 h-6 text-gray-400" />
        )}
      </div>

      {/* File Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white font-medium truncate">{file.name}</p>
        <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>

        {/* Progress Bar */}
        {progress !== undefined && progress < 100 && (
          <div className="mt-2 h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {/* Error Message */}
        {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
      </div>

      {/* Remove Button */}
      {onRemove && (
        <button
          onClick={onRemove}
          className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

// File List Component
interface FileListProps {
  files: File[];
  onRemove?: (index: number) => void;
  className?: string;
}

function FileList({ files, onRemove, className }: FileListProps) {
  if (files.length === 0) return null;

  return (
    <div className={cn('space-y-2', className)}>
      {files.map((file, index) => (
        <FilePreview
          key={`${file.name}-${index}`}
          file={file}
          onRemove={onRemove ? () => onRemove(index) : undefined}
        />
      ))}
    </div>
  );
}

// Utility function
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

// Common accept configurations
const ACCEPT_CONFIGS = {
  images: {
    'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
  },
  documents: {
    'application/pdf': ['.pdf'],
    'application/msword': ['.doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  },
  spreadsheets: {
    'application/vnd.ms-excel': ['.xls'],
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    'text/csv': ['.csv'],
  },
  audio: {
    'audio/*': ['.mp3', '.wav', '.m4a', '.flac'],
  },
  statements: {
    'application/pdf': ['.pdf'],
    'application/vnd.ms-excel': ['.xls'],
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    'text/csv': ['.csv'],
  },
};

export { FileDropzone, FilePreview, FileList, formatFileSize, ACCEPT_CONFIGS };
export type { FileDropzoneProps };
