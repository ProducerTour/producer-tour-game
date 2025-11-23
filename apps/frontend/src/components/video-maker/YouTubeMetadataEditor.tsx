import { useState, useEffect } from 'react';
import { Calendar, Save, Trash2, Upload, Youtube, LogOut, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import type { YouTubeMetadata, VideoWithMetadata } from '../../types/youtube';
import type { YouTubeAuthStatus } from '../../lib/youtube-api';
import {
  titleTemplates,
  descriptionTemplates,
  addTitleTemplate,
  addDescriptionTemplate,
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
}

export function YouTubeMetadataEditor({
  videos: _videos,
  selectedVideo,
  onMetadataUpdate,
  onUpload,
  youtubeAuth,
  onAuthClick,
  uploadProgress,
}: YouTubeMetadataEditorProps) {
  const [selectedTitleTemplate, setSelectedTitleTemplate] = useState('Keep File Name');
  const [selectedDescTemplate, setSelectedDescTemplate] = useState('Default');
  const [customTitleCount, setCustomTitleCount] = useState(1);
  const [customDescCount, setCustomDescCount] = useState(1);

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
        }
      } else {
        setTitle(baseName);
        applyTemplates(baseName);
      }
    }
  }, [selectedVideo]);

  const applyTemplates = (baseName: string) => {
    // Apply title template
    const titleTemplate = titleTemplates[selectedTitleTemplate];
    if (titleTemplate) {
      setTitle(titleTemplate(baseName));
    }

    // Apply description template
    const descTemplate = descriptionTemplates[selectedDescTemplate];
    if (typeof descTemplate === 'string') {
      setDescription(descTemplate);
    } else if (typeof descTemplate === 'function') {
      setDescription(descTemplate(baseName));
    }
  };

  const handleApplyTemplates = () => {
    if (selectedVideo) {
      const baseName = selectedVideo.videoName.replace(/\.(mp4|mov|avi)$/i, '');
      applyTemplates(baseName);
    }
  };

  const handleSaveCustomTitle = () => {
    if (!title.trim()) {
      alert('Title is empty. Cannot save empty template.');
      return;
    }

    const customKey = `Custom ${customTitleCount}`;
    addTitleTemplate(customKey, () => title);
    setSelectedTitleTemplate(customKey);
    setCustomTitleCount(prev => prev + 1);
    alert(`Custom title template '${customKey}' saved.`);
  };

  const handleDeleteCustomTitle = () => {
    if (!selectedTitleTemplate.startsWith('Custom')) {
      alert('Selected template is not a custom title and cannot be deleted.');
      return;
    }

    if (confirm(`Delete custom title template '${selectedTitleTemplate}'?`)) {
      removeTitleTemplate(selectedTitleTemplate);
      setSelectedTitleTemplate('Keep File Name');
      alert(`Custom title template deleted.`);
    }
  };

  const handleSaveCustomDescription = () => {
    if (!description.trim()) {
      alert('Description is empty. Cannot save empty template.');
      return;
    }

    const customKey = `Custom Desc ${customDescCount}`;
    addDescriptionTemplate(customKey, description);
    setSelectedDescTemplate(customKey);
    setCustomDescCount(prev => prev + 1);
    alert(`Custom description template '${customKey}' saved.`);
  };

  const handleSaveVideoDetails = () => {
    if (!selectedVideo) {
      alert('No video selected.');
      return;
    }

    if (!title.trim()) {
      alert('Please provide a title.');
      return;
    }

    let scheduledTime: Date | undefined;
    if (enableSchedule) {
      if (!scheduleDate || !scheduleTime) {
        alert('Please provide both date and time for scheduling.');
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

    alert('Video details saved! Moved to "Ready for Upload".');
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

  const handleUploadSelected = () => {
    if (readyVideos.length === 0) {
      alert('No videos ready for upload.');
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

      {/* Title Template */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-300 block">Title Template:</label>
        <select
          value={selectedTitleTemplate}
          onChange={(e) => setSelectedTitleTemplate(e.target.value)}
          className="w-full bg-zinc-800 border-zinc-700 text-sm p-2 rounded-lg"
        >
          {Object.keys(titleTemplates).map((key) => (
            <option key={key} value={key}>
              {key}
            </option>
          ))}
        </select>

        <div className="flex gap-2">
          <Button
            onClick={handleSaveCustomTitle}
            size="sm"
            variant="outline"
            className="flex-1 text-xs"
          >
            <Save size={12} className="mr-1" />
            Save
          </Button>
          <Button
            onClick={handleDeleteCustomTitle}
            size="sm"
            variant="outline"
            className="flex-1 text-xs hover:bg-red-500/20 hover:text-red-400"
          >
            <Trash2 size={12} className="mr-1" />
            Delete
          </Button>
        </div>
      </div>

      {/* Description Template */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-300 block">Description Template:</label>
        <select
          value={selectedDescTemplate}
          onChange={(e) => setSelectedDescTemplate(e.target.value)}
          className="w-full bg-zinc-800 border-zinc-700 text-sm p-2 rounded-lg"
        >
          {Object.keys(descriptionTemplates).map((key) => (
            <option key={key} value={key}>
              {key}
            </option>
          ))}
        </select>

        <Button
          onClick={handleSaveCustomDescription}
          size="sm"
          variant="outline"
          className="w-full text-xs"
        >
          <Save size={12} className="mr-1" />
          Save Custom Description
        </Button>
      </div>

      {/* Apply Templates Button */}
      <Button
        onClick={handleApplyTemplates}
        className="w-full bg-gradient-to-r from-brand-blue to-blue-500 hover:from-brand-blue hover:to-blue-600"
        size="sm"
      >
        Apply Templates
      </Button>

      {/* Metadata Fields */}
      <div className="space-y-3 pt-2 border-t border-white/10">
        <div>
          <label className="text-white text-xs block mb-1 font-medium">Title:</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-gradient-to-br from-[#1e1e1e] to-[#252525] text-white text-xs p-2 rounded-lg border border-white/10 hover:border-blue-500/30 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
            placeholder="Video title..."
          />
        </div>

        <div>
          <label className="text-white text-xs block mb-1 font-medium">Description:</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-gradient-to-br from-[#1e1e1e] to-[#252525] text-white text-xs p-2 rounded-lg border border-white/10 hover:border-brand-blue/30 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 transition-all min-h-[100px]"
            placeholder="Video description..."
          />
        </div>

        <div>
          <label className="text-white text-xs block mb-1 font-medium">Tags (comma separated):</label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="w-full bg-gradient-to-br from-[#1e1e1e] to-[#252525] text-white text-xs p-2 rounded-lg border border-white/10 hover:border-green-500/30 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all"
            placeholder="beat, trap, type beat..."
          />
        </div>

        <div>
          <label className="text-white text-xs block mb-1 font-medium">Privacy:</label>
          <select
            value={privacy}
            onChange={(e) => setPrivacy(e.target.value as any)}
            className="w-full bg-gradient-to-br from-[#1e1e1e] to-[#252525] text-white text-xs p-2 rounded-lg border border-white/10 hover:border-orange-500/30 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all"
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
                className="flex-1 bg-gradient-to-br from-[#1e1e1e] to-[#252525] text-white text-xs p-2 rounded-lg border border-white/10 hover:border-pink-500/30 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 transition-all"
              />
              <input
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                className="flex-1 bg-gradient-to-br from-[#1e1e1e] to-[#252525] text-white text-xs p-2 rounded-lg border border-white/10 hover:border-pink-500/30 focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 transition-all"
              />
            </div>
          )}
        </div>
      </div>

      {/* Save Details Button */}
      <Button
        onClick={handleSaveVideoDetails}
        disabled={!selectedVideo}
        className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white text-xs py-2 font-medium shadow-lg shadow-green-500/30 disabled:opacity-50 disabled:shadow-none"
      >
        <Save size={12} className="mr-1" />
        Save Video Details
      </Button>

      {/* Ready for Upload List */}
      {readyVideos.length > 0 && (
        <div className="pt-4 border-t border-white/10">
          <h4 className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-500 text-xs font-bold mb-2">
            Ready for Upload ({readyVideos.length})
          </h4>
          <div className="space-y-1 max-h-40 overflow-y-auto mb-3">
            {readyVideos.map((video) => (
              <div
                key={video.videoId}
                onClick={() => handleSelectReady(video)}
                className={`bg-gradient-to-br from-[#1e1e1e] to-[#252525] rounded-lg px-2 py-1.5 cursor-pointer text-xs transition-all border ${
                  selectedReady?.videoId === video.videoId
                    ? 'border-red-500 ring-2 ring-red-500/30 shadow-lg shadow-red-500/20'
                    : 'border-white/5 hover:border-red-500/30'
                }`}
              >
                <p className="text-white truncate font-medium">{video.metadata?.title || video.videoName}</p>
                <p className="text-transparent bg-clip-text bg-gradient-to-r from-gray-400 to-gray-500 text-[10px] font-semibold uppercase">
                  {video.metadata?.privacy}
                </p>
              </div>
            ))}
          </div>

          <Button
            onClick={handleUploadSelected}
            disabled={!youtubeAuth.authenticated || Object.keys(uploadProgress).length > 0}
            className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-xs py-2 font-medium shadow-lg shadow-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
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
