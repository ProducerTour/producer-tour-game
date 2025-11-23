import { Download, Video, Play, Trash2, CheckSquare, Square } from 'lucide-react';
import JSZip from 'jszip';
import type { CompletedVideo } from '../../types/video-maker';
import { Button } from '../ui/Button';
import { useState, useEffect } from 'react';

interface VideoPreviewProps {
  videos: CompletedVideo[];
  onDownloadAll?: () => void;
  onSelectVideo?: (video: CompletedVideo) => void;
  selectedVideoId?: string;
  onBulkDelete?: (videoIds: string[]) => void;
}

export function VideoPreview({ videos, onDownloadAll, onSelectVideo, selectedVideoId, onBulkDelete }: VideoPreviewProps) {
  const [expandedVideo, setExpandedVideo] = useState<string | null>(null);
  const [selectedVideos, setSelectedVideos] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (expandedVideo) {
          // Close expanded video first
          setExpandedVideo(null);
        } else if (selectionMode) {
          // Exit selection mode
          setSelectionMode(false);
          setSelectedVideos(new Set());
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [expandedVideo, selectionMode]);

  if (videos.length === 0) {
    return null;
  }

  const handleDownload = (video: CompletedVideo) => {
    const a = document.createElement('a');
    a.href = video.url;
    a.download = video.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDownloadAll = async () => {
    const zip = new JSZip();

    // Add all videos to ZIP
    for (const video of videos) {
      const blob = video.blob;
      zip.file(video.name, blob);
    }

    // Generate ZIP and trigger download
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nully-beats-videos-${Date.now()}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadSelected = async () => {
    if (selectedVideos.size === 0) return;

    if (selectedVideos.size === 1) {
      // Download single video directly
      const videoId = Array.from(selectedVideos)[0];
      const video = videos.find(v => v.id === videoId);
      if (video) {
        handleDownload(video);
      }
    } else {
      // Download multiple as ZIP
      const zip = new JSZip();
      const selectedVideoObjects = videos.filter(v => selectedVideos.has(v.id));

      for (const video of selectedVideoObjects) {
        zip.file(video.name, video.blob);
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `selected-videos-${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const handleToggleSelection = (videoId: string) => {
    setSelectedVideos(prev => {
      const newSet = new Set(prev);
      if (newSet.has(videoId)) {
        newSet.delete(videoId);
      } else {
        newSet.add(videoId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedVideos.size === videos.length) {
      setSelectedVideos(new Set());
    } else {
      setSelectedVideos(new Set(videos.map(v => v.id)));
    }
  };

  const handleBulkDelete = () => {
    if (selectedVideos.size === 0) return;

    if (confirm(`Delete ${selectedVideos.size} video(s)?`)) {
      onBulkDelete?.(Array.from(selectedVideos));
      setSelectedVideos(new Set());
      setSelectionMode(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Video size={20} className="text-brand-blue" />
          <h3 className="font-semibold text-lg">Completed Videos</h3>
          <span className="text-xs text-zinc-500">({videos.length})</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              setSelectionMode(!selectionMode);
              if (selectionMode) {
                setSelectedVideos(new Set());
              }
            }}
            size="sm"
            variant={selectionMode ? "default" : "outline"}
            className={selectionMode ? "bg-brand-blue hover:bg-brand-blue" : ""}
          >
            {selectionMode ? <CheckSquare size={14} className="mr-1" /> : <Square size={14} className="mr-1" />}
            {selectionMode ? 'Done' : 'Select'}
          </Button>
          <Button
            onClick={onDownloadAll || handleDownloadAll}
            size="sm"
            className="bg-gradient-to-r from-brand-blue to-blue-500 hover:from-brand-blue hover:to-blue-600"
          >
            <Download size={14} className="mr-1" />
            Download All
          </Button>
        </div>
      </div>

      {/* Batch Actions Bar */}
      {selectionMode && (
        <div className="mb-4 p-3 bg-zinc-800 border border-zinc-700 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              onClick={handleSelectAll}
              size="sm"
              variant="outline"
            >
              {selectedVideos.size === videos.length ? 'Deselect All' : 'Select All'}
            </Button>
            <span className="text-sm text-zinc-400">
              {selectedVideos.size} selected
            </span>
          </div>
          {selectedVideos.size > 0 && (
            <div className="flex items-center gap-2">
              <Button
                onClick={handleDownloadSelected}
                size="sm"
                className="bg-gradient-to-r from-brand-blue to-blue-500 hover:from-brand-blue hover:to-blue-600"
              >
                <Download size={14} className="mr-1" />
                Download ({selectedVideos.size})
              </Button>
              {onBulkDelete && (
                <Button
                  onClick={handleBulkDelete}
                  size="sm"
                  variant="destructive"
                >
                  <Trash2 size={14} className="mr-1" />
                  Delete ({selectedVideos.size})
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Video Grid */}
      <div className="grid grid-cols-1 gap-3 max-h-[600px] overflow-y-auto">
        {videos.map((video) => {
          const isSelected = selectedVideos.has(video.id);

          return (
            <div
              key={video.id}
              onClick={() => {
                if (selectionMode) {
                  handleToggleSelection(video.id);
                } else {
                  onSelectVideo?.(video);
                  setExpandedVideo(expandedVideo === video.id ? null : video.id);
                }
              }}
              className={`bg-zinc-800 rounded-lg overflow-hidden cursor-pointer transition-all border ${
                selectionMode && isSelected
                  ? 'border-brand-blue ring-2 ring-brand-blue/50'
                  : selectedVideoId === video.id
                  ? 'border-brand-blue'
                  : 'border-zinc-700 hover:border-zinc-600'
              }`}
            >
            {/* Video Preview */}
            {expandedVideo === video.id && !selectionMode ? (
              <div className="relative">
                <video
                  src={video.url}
                  controls
                  autoPlay
                  className="w-full"
                  style={{
                    aspectRatio: video.format === '16x9' ? '16/9' : '9/16',
                    maxHeight: '400px',
                    objectFit: 'contain',
                    backgroundColor: '#000',
                  }}
                >
                  Your browser does not support the video tag.
                </video>
              </div>
            ) : (
              <div
                className="relative group"
                style={{
                  aspectRatio: video.format === '16x9' ? '16/9' : '9/16',
                  maxHeight: '200px',
                  backgroundColor: '#000',
                }}
              >
                <video
                  src={video.url}
                  className="w-full h-full object-contain"
                  muted
                />
                {selectionMode ? (
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center transition-all ${
                      isSelected ? 'bg-brand-blue' : 'bg-zinc-700 border-2 border-zinc-500'
                    }`}>
                      {isSelected ? (
                        <CheckSquare size={28} className="text-white" />
                      ) : (
                        <Square size={28} className="text-zinc-400" />
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center">
                      <Play size={24} className="text-white ml-1" fill="white" />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Video Info */}
            <div className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium truncate flex-1" title={video.name}>
                  {video.name}
                </h4>
              </div>

              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <span className="px-2 py-0.5 bg-brand-blue/20 text-purple-300 rounded font-medium">
                  {video.format}
                </span>
                <span>{formatFileSize(video.size)}</span>
                <span>•</span>
                <span>{formatDuration(video.duration)}</span>
              </div>

              {/* Download Button */}
              {!selectionMode && (
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownload(video);
                  }}
                  className="w-full bg-gradient-to-r from-brand-blue to-blue-500 hover:from-brand-blue hover:to-blue-600"
                  size="sm"
                >
                  <Download size={12} className="mr-1" />
                  Download Video
                </Button>
              )}
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
}
