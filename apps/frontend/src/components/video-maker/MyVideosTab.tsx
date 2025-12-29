/**
 * My Videos Tab - Display stored videos with 24-hour expiry
 */

import { useState, useEffect, useCallback } from 'react';
import { Download, Trash2, Clock, Youtube, Film, RefreshCw, Search, AlertCircle, HardDrive } from 'lucide-react';
import { Button } from '../ui/Button';
import toast from 'react-hot-toast';
import {
  getAllVideos,
  deleteVideo,
  deleteVideos,
  cleanupExpiredVideos,
  getStorageStats,
  formatBytes,
  formatTimeRemaining,
  type StoredVideoWithUrl,
} from '../../lib/video-storage';

interface MyVideosTabProps {
  onSendToYouTube?: (video: StoredVideoWithUrl) => void;
}

type SortOption = 'newest' | 'oldest' | 'name' | 'expiry';

export function MyVideosTab({ onSendToYouTube }: MyVideosTabProps) {
  const [videos, setVideos] = useState<StoredVideoWithUrl[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [searchQuery, setSearchQuery] = useState('');
  const [storageStats, setStorageStats] = useState<{
    totalVideos: number;
    totalSize: number;
  } | null>(null);

  // Load videos on mount
  const loadVideos = useCallback(async () => {
    try {
      setLoading(true);
      // Clean up expired videos first
      await cleanupExpiredVideos();
      // Then get all valid videos
      const storedVideos = await getAllVideos();
      setVideos(storedVideos);
      // Get storage stats
      const stats = await getStorageStats();
      setStorageStats(stats);
    } catch (error) {
      console.error('Failed to load videos:', error);
      toast.error('Failed to load stored videos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVideos();

    // Set up interval to update expiry times
    const interval = setInterval(() => {
      setVideos((prev) => [...prev]); // Force re-render to update times
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [loadVideos]);

  // Filter and sort videos
  const filteredVideos = videos
    .filter((video) =>
      video.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return b.createdAt - a.createdAt;
        case 'oldest':
          return a.createdAt - b.createdAt;
        case 'name':
          return a.name.localeCompare(b.name);
        case 'expiry':
          return a.expiresAt - b.expiresAt;
        default:
          return 0;
      }
    });

  // Selection handlers
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === filteredVideos.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredVideos.map((v) => v.id)));
    }
  };

  // Delete handlers
  const handleDelete = async (id: string) => {
    try {
      await deleteVideo(id);
      setVideos((prev) => prev.filter((v) => v.id !== id));
      setSelectedIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
      toast.success('Video deleted');
    } catch (error) {
      console.error('Failed to delete video:', error);
      toast.error('Failed to delete video');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    try {
      await deleteVideos(Array.from(selectedIds));
      setVideos((prev) => prev.filter((v) => !selectedIds.has(v.id)));
      setSelectedIds(new Set());
      toast.success(`Deleted ${selectedIds.size} video${selectedIds.size > 1 ? 's' : ''}`);
    } catch (error) {
      console.error('Failed to delete videos:', error);
      toast.error('Failed to delete videos');
    }
  };

  // Download handler
  const handleDownload = (video: StoredVideoWithUrl) => {
    const link = document.createElement('a');
    link.href = video.url;
    link.download = video.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Downloading ${video.name}`);
  };

  const handleBulkDownload = () => {
    const selectedVideos = videos.filter((v) => selectedIds.has(v.id));
    selectedVideos.forEach((video, index) => {
      // Stagger downloads to avoid browser blocking
      setTimeout(() => handleDownload(video), index * 500);
    });
  };

  // Get expiry status class
  const getExpiryClass = (expiresAt: number) => {
    const remaining = expiresAt - Date.now();
    const hours = remaining / (1000 * 60 * 60);

    if (hours <= 2) return 'text-red-400';
    if (hours <= 6) return 'text-orange-400';
    return 'text-green-400';
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <RefreshCw size={32} className="animate-spin text-brand-blue mb-4" />
        <p className="text-zinc-400">Loading your videos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">My Videos</h2>
          <p className="text-zinc-400 text-sm">
            Videos are stored for 24 hours. Download or upload to YouTube before they expire.
          </p>
        </div>
        <Button
          onClick={loadVideos}
          variant="outline"
          size="sm"
          className="gap-2 border-zinc-700 hover:bg-zinc-800"
        >
          <RefreshCw size={16} />
          Refresh
        </Button>
      </div>

      {/* Storage Stats */}
      {storageStats && storageStats.totalVideos > 0 && (
        <div className="flex items-center gap-4 p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg">
          <HardDrive size={18} className="text-zinc-500" />
          <div className="text-sm">
            <span className="text-zinc-300">{storageStats.totalVideos} video{storageStats.totalVideos !== 1 ? 's' : ''}</span>
            <span className="text-zinc-600 mx-2">•</span>
            <span className="text-zinc-400">{formatBytes(storageStats.totalSize)}</span>
          </div>
        </div>
      )}

      {/* Controls */}
      {videos.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Search videos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-brand-blue"
            />
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-brand-blue"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="name">Name (A-Z)</option>
            <option value="expiry">Expiring Soon</option>
          </select>
        </div>
      )}

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-brand-blue/10 border border-brand-blue/30 rounded-lg">
          <span className="text-sm text-brand-blue font-medium">
            {selectedIds.size} selected
          </span>
          <div className="flex-1" />
          <Button
            onClick={handleBulkDownload}
            variant="outline"
            size="sm"
            className="gap-2 border-brand-blue/50 text-brand-blue hover:bg-brand-blue/20"
          >
            <Download size={14} />
            Download
          </Button>
          <Button
            onClick={handleBulkDelete}
            variant="outline"
            size="sm"
            className="gap-2 border-red-500/50 text-red-400 hover:bg-red-500/20"
          >
            <Trash2 size={14} />
            Delete
          </Button>
        </div>
      )}

      {/* Video Grid */}
      {filteredVideos.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-12 text-center">
          {videos.length === 0 ? (
            <>
              <Film size={48} className="mx-auto mb-4 text-zinc-600" />
              <h3 className="text-lg font-semibold text-white mb-2">No Saved Videos</h3>
              <p className="text-zinc-400 mb-4">
                Videos you generate will automatically be saved here for 24 hours.
              </p>
            </>
          ) : (
            <>
              <Search size={48} className="mx-auto mb-4 text-zinc-600" />
              <h3 className="text-lg font-semibold text-white mb-2">No Results</h3>
              <p className="text-zinc-400">
                No videos match your search "{searchQuery}"
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {/* Select All */}
          <div className="flex items-center gap-2">
            <button
              onClick={selectAll}
              className="text-sm text-zinc-400 hover:text-white transition-colors"
            >
              {selectedIds.size === filteredVideos.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          {/* Video List */}
          <div className="grid gap-3">
            {filteredVideos.map((video) => (
              <div
                key={video.id}
                className={`group bg-zinc-900 border rounded-lg p-4 transition-all ${
                  selectedIds.has(video.id)
                    ? 'border-brand-blue bg-brand-blue/5'
                    : 'border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center gap-4">
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleSelect(video.id)}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                      selectedIds.has(video.id)
                        ? 'bg-brand-blue border-brand-blue'
                        : 'border-zinc-600 hover:border-zinc-400'
                    }`}
                  >
                    {selectedIds.has(video.id) && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>

                  {/* Thumbnail */}
                  <div className="w-20 h-12 bg-zinc-800 rounded overflow-hidden flex-shrink-0">
                    <video
                      src={video.url}
                      className="w-full h-full object-cover"
                      muted
                      preload="metadata"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-white font-medium truncate">{video.name}</h4>
                    <div className="flex items-center gap-3 text-xs text-zinc-500 mt-1">
                      <span className="px-2 py-0.5 bg-zinc-800 rounded">
                        {video.format === '16x9' ? '16:9' : '9:16'}
                      </span>
                      <span>{formatBytes(video.size)}</span>
                      <span className={`flex items-center gap-1 ${getExpiryClass(video.expiresAt)}`}>
                        <Clock size={12} />
                        {formatTimeRemaining(video.expiresAt)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleDownload(video)}
                      className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
                      title="Download"
                    >
                      <Download size={16} className="text-zinc-400" />
                    </button>
                    {onSendToYouTube && (
                      <button
                        onClick={() => onSendToYouTube(video)}
                        className="p-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg transition-colors"
                        title="Send to YouTube"
                      >
                        <Youtube size={16} className="text-red-400" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(video.id)}
                      className="p-2 bg-zinc-800 hover:bg-red-500/20 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={16} className="text-zinc-400 hover:text-red-400" />
                    </button>
                  </div>
                </div>

                {/* Expiry Warning */}
                {video.expiresAt - Date.now() <= 2 * 60 * 60 * 1000 && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-red-400 bg-red-500/10 px-3 py-2 rounded">
                    <AlertCircle size={14} />
                    <span>This video will expire soon. Download or upload to YouTube to keep it.</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
