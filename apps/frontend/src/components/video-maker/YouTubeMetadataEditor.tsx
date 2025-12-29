import { useState, useEffect, useCallback } from 'react';
import { Calendar, Save, Trash2, Upload, Youtube, LogOut, Loader2, Copy, CheckCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import toast from 'react-hot-toast';
import type { YouTubeMetadata, VideoWithMetadata } from '../../types/youtube';
import type { YouTubeAuthStatus } from '../../lib/youtube-api';
import {
  titleTemplates,
  descriptionTemplates,
  addTitleTemplate,
  removeTitleTemplate
} from '../../config/youtube-templates';

interface YouTubeMetadataEditorProps {
  videos: VideoWithMetadata[];
  selectedVideo: VideoWithMetadata | null;
  onMetadataUpdate: (videoId: string, metadata: YouTubeMetadata) => void;
  onUpload: (videos: VideoWithMetadata[]) => void;
  youtubeAuth: YouTubeAuthStatus;
  onAuthClick: () => void;
  uploadProgress: { [videoId: string]: number };
  onBulkDelete?: (videoIds: string[]) => void;
}

export function YouTubeMetadataEditor({
  videos,
  selectedVideo,
  onMetadataUpdate,
  onUpload,
  youtubeAuth,
  onAuthClick,
  uploadProgress,
  onBulkDelete,
}: YouTubeMetadataEditorProps) {
  const [selectedTitleTemplate, setSelectedTitleTemplate] = useState('Keep File Name');
  const [selectedDescTemplate, setSelectedDescTemplate] = useState('Default');
  const [customTitleCount, setCustomTitleCount] = useState(1);

  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [privacy, setPrivacy] = useState<'public' | 'unlisted' | 'private'>('public');
  const [enableSchedule, setEnableSchedule] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');

  // Ready for upload list
  const [readyVideos, setReadyVideos] = useState<VideoWithMetadata[]>([]);
  const [selectedReady, setSelectedReady] = useState<VideoWithMetadata | null>(null);

  // Apply templates helper
  const applyTemplates = useCallback((baseName: string, titleTpl?: string, descTpl?: string) => {
    // Apply title template
    const titleTemplate = titleTemplates[titleTpl || selectedTitleTemplate];
    if (titleTemplate) {
      setTitle(titleTemplate(baseName));
    }

    // Apply description template
    const descTemplate = descriptionTemplates[descTpl || selectedDescTemplate];
    if (typeof descTemplate === 'string') {
      setDescription(descTemplate);
    } else if (typeof descTemplate === 'function') {
      setDescription(descTemplate(baseName));
    }
  }, [selectedTitleTemplate, selectedDescTemplate]);

  // Load metadata when video is selected
  useEffect(() => {
    if (selectedVideo) {
      const baseName = selectedVideo.videoName.replace(/\.(mp4|mov|avi)$/i, '');

      if (selectedVideo.metadata) {
        setTitle(selectedVideo.metadata.title);
        setDescription(selectedVideo.metadata.description);
        setTags(selectedVideo.metadata.tags.join(', '));
        setPrivacy(selectedVideo.metadata.privacy);

        if (selectedVideo.metadata.scheduledTime) {
          setEnableSchedule(true);
          const date = new Date(selectedVideo.metadata.scheduledTime);
          setScheduleDate(date.toISOString().split('T')[0]);
          setScheduleTime(date.toTimeString().slice(0, 5));
        } else {
          setEnableSchedule(false);
          setScheduleDate('');
          setScheduleTime('');
        }
      } else {
        // Auto-apply templates for new videos
        applyTemplates(baseName);
        setTags('');
        setPrivacy('public');
        setEnableSchedule(false);
      }
    }
  }, [selectedVideo, applyTemplates]);

  // Auto-apply templates when template selection changes
  useEffect(() => {
    if (selectedVideo && !selectedVideo.metadata) {
      const baseName = selectedVideo.videoName.replace(/\.(mp4|mov|avi)$/i, '');
      applyTemplates(baseName);
    }
  }, [selectedTitleTemplate, selectedDescTemplate, selectedVideo, applyTemplates]);

  const handleApplyTemplates = () => {
    if (selectedVideo) {
      const baseName = selectedVideo.videoName.replace(/\.(mp4|mov|avi)$/i, '');
      applyTemplates(baseName);
      toast.success('Templates applied');
    } else {
      toast.error('No video selected');
    }
  };

  // Apply current metadata to all videos
  const handleApplyToAll = (field: 'description' | 'tags' | 'privacy') => {
    if (videos.length === 0) {
      toast.error('No videos to update');
      return;
    }

    let count = 0;
    videos.forEach((video) => {
      const baseName = video.videoName.replace(/\.(mp4|mov|avi)$/i, '');
      const existingMetadata = video.metadata || {
        title: baseName,
        description: '',
        tags: [],
        privacy: 'public' as const,
      };

      let updatedMetadata: YouTubeMetadata;

      switch (field) {
        case 'description':
          updatedMetadata = { ...existingMetadata, description };
          break;
        case 'tags':
          updatedMetadata = {
            ...existingMetadata,
            tags: tags.split(',').map((t) => t.trim()).filter((t) => t),
          };
          break;
        case 'privacy':
          updatedMetadata = { ...existingMetadata, privacy };
          break;
        default:
          return;
      }

      onMetadataUpdate(video.videoId, updatedMetadata);
      count++;
    });

    toast.success(`Applied ${field} to ${count} videos`);
  };

  const handleSaveCustomTitle = () => {
    if (!title.trim()) {
      toast.error('Title is empty');
      return;
    }

    const customKey = `Custom ${customTitleCount}`;
    addTitleTemplate(customKey, () => title);
    setSelectedTitleTemplate(customKey);
    setCustomTitleCount(prev => prev + 1);
    toast.success(`Template "${customKey}" saved`);
  };

  const handleDeleteCustomTitle = () => {
    if (!selectedTitleTemplate.startsWith('Custom')) {
      toast.error('Only custom templates can be deleted');
      return;
    }

    removeTitleTemplate(selectedTitleTemplate);
    setSelectedTitleTemplate('Keep File Name');
    toast.success('Template deleted');
  };

  const handleSaveVideoDetails = () => {
    if (!selectedVideo) {
      toast.error('No video selected');
      return;
    }

    if (!title.trim()) {
      toast.error('Please provide a title');
      return;
    }

    let scheduledTime: Date | undefined;
    if (enableSchedule) {
      if (!scheduleDate || !scheduleTime) {
        toast.error('Please set both date and time');
        return;
      }
      scheduledTime = new Date(`${scheduleDate}T${scheduleTime}`);
    }

    const metadata: YouTubeMetadata = {
      title: title.trim(),
      description: description.trim(),
      tags: tags.split(',').map(t => t.trim()).filter(t => t),
      privacy,
      scheduledTime,
    };

    onMetadataUpdate(selectedVideo.videoId, metadata);

    // Add to ready list if not already there
    const alreadyReady = readyVideos.find(v => v.videoId === selectedVideo.videoId);
    if (!alreadyReady) {
      setReadyVideos(prev => [...prev, { ...selectedVideo, metadata }]);
    } else {
      setReadyVideos(prev =>
        prev.map(v => v.videoId === selectedVideo.videoId ? { ...v, metadata } : v)
      );
    }

    toast.success('Ready for upload!', { icon: '✅' });
  };

  const handleSelectReady = (video: VideoWithMetadata) => {
    setSelectedReady(video);
    if (video.metadata) {
      setTitle(video.metadata.title);
      setDescription(video.metadata.description);
      setTags(video.metadata.tags.join(', '));
      setPrivacy(video.metadata.privacy);

      if (video.metadata.scheduledTime) {
        setEnableSchedule(true);
        const date = new Date(video.metadata.scheduledTime);
        setScheduleDate(date.toISOString().split('T')[0]);
        setScheduleTime(date.toTimeString().slice(0, 5));
      } else {
        setEnableSchedule(false);
        setScheduleDate('');
        setScheduleTime('');
      }
    }
  };

  const handleRemoveFromReady = (videoId: string) => {
    setReadyVideos(prev => prev.filter(v => v.videoId !== videoId));
    if (selectedReady?.videoId === videoId) {
      setSelectedReady(null);
    }
    toast.success('Removed from ready list');
  };

  const handleDeleteVideo = (videoId: string) => {
    if (onBulkDelete) {
      onBulkDelete([videoId]);
      handleRemoveFromReady(videoId);
      toast.success('Video deleted');
    }
  };

  const handleUploadSelected = () => {
    if (readyVideos.length === 0) {
      toast.error('No videos ready for upload');
      return;
    }
    onUpload(readyVideos);
  };

  return (
    <Card className="p-6 bg-zinc-900 border-zinc-800 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Youtube className="w-5 h-5 text-red-500" />
          <h3 className="font-semibold text-lg">YouTube Metadata</h3>
        </div>

        {/* Auth Status */}
        {youtubeAuth.authenticated ? (
          <div className="flex items-center gap-2">
            {youtubeAuth.channel?.thumbnail && (
              <img
                src={youtubeAuth.channel.thumbnail}
                alt={youtubeAuth.channel.title}
                className="w-6 h-6 rounded-full"
              />
            )}
            <span className="text-xs text-zinc-400">
              {youtubeAuth.channel?.title || 'Connected'}
            </span>
            <Button
              onClick={onAuthClick}
              size="sm"
              variant="ghost"
              className="text-xs hover:bg-red-500/20 hover:text-red-400"
            >
              <LogOut size={14} className="mr-1" />
              Sign Out
            </Button>
          </div>
        ) : (
          <Button
            onClick={onAuthClick}
            size="sm"
            className="bg-red-500 hover:bg-red-600 text-white"
          >
            <Youtube size={14} className="mr-1" />
            Connect YouTube
          </Button>
        )}
      </div>

      {/* Warning if not authenticated */}
      {!youtubeAuth.authenticated && (
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3 text-xs text-orange-200">
          <p>Connect your YouTube account to upload videos directly from here.</p>
        </div>
      )}

      {/* Templates Section */}
      <div className="grid grid-cols-2 gap-3">
        {/* Title Template */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-zinc-400 block">Title Template</label>
          <select
            value={selectedTitleTemplate}
            onChange={(e) => setSelectedTitleTemplate(e.target.value)}
            className="w-full bg-zinc-800 border-zinc-700 text-xs p-2 rounded-lg"
          >
            {Object.keys(titleTemplates).map((key) => (
              <option key={key} value={key}>{key}</option>
            ))}
          </select>
        </div>

        {/* Description Template */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-zinc-400 block">Description Template</label>
          <select
            value={selectedDescTemplate}
            onChange={(e) => setSelectedDescTemplate(e.target.value)}
            className="w-full bg-zinc-800 border-zinc-700 text-xs p-2 rounded-lg"
          >
            {Object.keys(descriptionTemplates).map((key) => (
              <option key={key} value={key}>{key}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Template Actions */}
      <div className="flex gap-2">
        <Button
          onClick={handleApplyTemplates}
          className="flex-1 bg-gradient-to-r from-brand-blue to-blue-500 hover:from-brand-blue hover:to-blue-600"
          size="sm"
        >
          Apply Templates
        </Button>
        <Button
          onClick={handleSaveCustomTitle}
          size="sm"
          variant="outline"
          className="text-xs border-zinc-700"
          title="Save current title as template"
        >
          <Save size={12} />
        </Button>
        {selectedTitleTemplate.startsWith('Custom') && (
          <Button
            onClick={handleDeleteCustomTitle}
            size="sm"
            variant="outline"
            className="text-xs border-red-500/50 text-red-400 hover:bg-red-500/20"
            title="Delete custom template"
          >
            <Trash2 size={12} />
          </Button>
        )}
      </div>

      {/* Metadata Fields */}
      <div className="space-y-3 pt-2 border-t border-white/10">
        <div>
          <label className="text-white text-xs block mb-1 font-medium">Title:</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-zinc-800 text-white text-xs p-2 rounded-lg border border-zinc-700 focus:border-brand-blue focus:ring-1 focus:ring-brand-blue/50 transition-all"
            placeholder="Video title..."
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-white text-xs font-medium">Description:</label>
            <Button
              onClick={() => handleApplyToAll('description')}
              size="sm"
              variant="ghost"
              className="text-[10px] h-5 px-2 text-zinc-400 hover:text-white"
              title="Apply to all videos"
            >
              <Copy size={10} className="mr-1" />
              Apply to All
            </Button>
          </div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-zinc-800 text-white text-xs p-2 rounded-lg border border-zinc-700 focus:border-brand-blue focus:ring-1 focus:ring-brand-blue/50 transition-all min-h-[80px]"
            placeholder="Video description..."
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-white text-xs font-medium">Tags (comma separated):</label>
            <Button
              onClick={() => handleApplyToAll('tags')}
              size="sm"
              variant="ghost"
              className="text-[10px] h-5 px-2 text-zinc-400 hover:text-white"
              title="Apply to all videos"
            >
              <Copy size={10} className="mr-1" />
              Apply to All
            </Button>
          </div>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="w-full bg-zinc-800 text-white text-xs p-2 rounded-lg border border-zinc-700 focus:border-brand-blue focus:ring-1 focus:ring-brand-blue/50 transition-all"
            placeholder="beat, trap, type beat..."
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-white text-xs font-medium">Privacy:</label>
            <Button
              onClick={() => handleApplyToAll('privacy')}
              size="sm"
              variant="ghost"
              className="text-[10px] h-5 px-2 text-zinc-400 hover:text-white"
              title="Apply to all videos"
            >
              <Copy size={10} className="mr-1" />
              Apply to All
            </Button>
          </div>
          <select
            value={privacy}
            onChange={(e) => setPrivacy(e.target.value as 'public' | 'unlisted' | 'private')}
            className="w-full bg-zinc-800 text-white text-xs p-2 rounded-lg border border-zinc-700 focus:border-brand-blue focus:ring-1 focus:ring-brand-blue/50 transition-all"
          >
            <option value="public">Public</option>
            <option value="unlisted">Unlisted</option>
            <option value="private">Private</option>
          </select>
        </div>

        {/* Schedule Upload */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-white text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={enableSchedule}
              onChange={(e) => setEnableSchedule(e.target.checked)}
              className="w-4 h-4 accent-orange-500"
            />
            <Calendar size={14} />
            Schedule Upload
          </label>

          {enableSchedule && (
            <div className="flex gap-2">
              <input
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                className="flex-1 bg-zinc-800 text-white text-xs p-2 rounded-lg border border-zinc-700"
              />
              <input
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                className="flex-1 bg-zinc-800 text-white text-xs p-2 rounded-lg border border-zinc-700"
              />
            </div>
          )}
        </div>
      </div>

      {/* Save Details Button */}
      <Button
        onClick={handleSaveVideoDetails}
        disabled={!selectedVideo}
        className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white text-xs py-2 font-medium disabled:opacity-50"
      >
        <CheckCircle size={12} className="mr-1" />
        Mark Ready for Upload
      </Button>

      {/* Ready for Upload List */}
      {readyVideos.length > 0 && (
        <div className="pt-4 border-t border-white/10">
          <h4 className="text-green-400 text-xs font-bold mb-2 flex items-center gap-2">
            <CheckCircle size={12} />
            Ready for Upload ({readyVideos.length})
          </h4>
          <div className="space-y-1 max-h-40 overflow-y-auto mb-3">
            {readyVideos.map((video) => (
              <div
                key={video.videoId}
                className={`group bg-zinc-800 rounded-lg px-2 py-1.5 text-xs transition-all border flex items-center gap-2 ${
                  selectedReady?.videoId === video.videoId
                    ? 'border-red-500 bg-red-500/10'
                    : 'border-zinc-700 hover:border-zinc-600'
                }`}
              >
                <div
                  className="flex-1 cursor-pointer min-w-0"
                  onClick={() => handleSelectReady(video)}
                >
                  <p className="text-white truncate font-medium">{video.metadata?.title || video.videoName}</p>
                  <p className="text-zinc-500 text-[10px] uppercase">{video.metadata?.privacy}</p>
                </div>
                <Button
                  onClick={() => handleRemoveFromReady(video.videoId)}
                  size="sm"
                  variant="ghost"
                  className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0 text-zinc-400 hover:text-red-400"
                  title="Remove from ready list"
                >
                  <Trash2 size={12} />
                </Button>
                {onBulkDelete && (
                  <Button
                    onClick={() => handleDeleteVideo(video.videoId)}
                    size="sm"
                    variant="ghost"
                    className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/20"
                    title="Delete video permanently"
                  >
                    <Trash2 size={12} />
                  </Button>
                )}
              </div>
            ))}
          </div>

          <Button
            onClick={handleUploadSelected}
            disabled={!youtubeAuth.authenticated || Object.keys(uploadProgress).length > 0}
            className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-xs py-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {Object.keys(uploadProgress).length > 0 ? (
              <>
                <Loader2 size={12} className="mr-1 animate-spin" />
                Uploading... ({Math.round(Object.values(uploadProgress)[0])}%)
              </>
            ) : (
              <>
                <Upload size={12} className="mr-1" />
                Upload to YouTube ({readyVideos.length})
              </>
            )}
          </Button>
        </div>
      )}
    </Card>
  );
}
