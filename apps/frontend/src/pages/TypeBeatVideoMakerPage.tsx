import { useState, useCallback, useEffect, useRef } from 'react';
import { AlertCircle, Loader2, Video, Upload, Settings, Youtube, HelpCircle, Menu, X } from 'lucide-react';
import { useFFmpeg } from '../hooks/useFFmpeg';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useToolAccess } from '../hooks/useToolAccess';
import './TypeBeatVideoMaker.css';
import { FileUploader } from '../components/video-maker/FileUploader';
import { VideoSettings } from '../components/video-maker/VideoSettings';
import { VideoPreview } from '../components/video-maker/VideoPreview';
import { YouTubeMetadataEditor } from '../components/video-maker/YouTubeMetadataEditor';
import { ProcessingQueue } from '../components/video-maker/ProcessingQueue';
import { ParticleBackground } from '../components/video-maker/ParticleBackground';
import { Button } from '../components/ui/Button';
import { ToolLockedScreen } from '../components/gamification/ToolLockedScreen';
import { pairFiles } from '../lib/file-pairing';
import { VideoProcessor } from '../lib/video-processor';
import {
  checkAuthStatus,
  authorizeYouTube,
  uploadVideo,
  revokeAuth,
  type YouTubeAuthStatus,
} from '../lib/youtube-api';
import type {
  VideoFormat,
  ProcessingJob,
  CompletedVideo,
  ProgressUpdate,
  ErrorLog,
} from '../types/video-maker';
import type { VideoWithMetadata, YouTubeMetadata } from '../types/youtube';

const TOOL_ID = 'type-beat-video-maker';

export default function VideoMaker() {
  // Tool access check - must be called before any early returns
  const { data: accessData, isLoading: accessLoading } = useToolAccess(TOOL_ID);

  const { loaded, loading, error: ffmpegError, load, ffmpeg } = useFFmpeg();

  // File state - all hooks must be called unconditionally
  const [beats, setBeats] = useState<File[]>([]);
  const [images, setImages] = useState<File[]>([]);
  const [outputFormat, setOutputFormat] = useLocalStorage<VideoFormat>('videomaker-output-format', 'both');

  // Processing state
  const [processingQueue, setProcessingQueue] = useState<ProcessingJob[]>([]);
  const [completedVideos, setCompletedVideos] = useLocalStorage<CompletedVideo[]>('videomaker-completed-videos', []);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentProgress, setCurrentProgress] = useState<ProgressUpdate | null>(null);
  const [errors, setErrors] = useState<ErrorLog[]>([]);

  // YouTube metadata state
  const [videosWithMetadata, setVideosWithMetadata] = useLocalStorage<VideoWithMetadata[]>('videomaker-videos-with-metadata', []);
  const [selectedVideoForYT, setSelectedVideoForYT] = useState<VideoWithMetadata | null>(null);

  // YouTube auth state
  const [youtubeAuth, setYoutubeAuth] = useState<YouTubeAuthStatus>({ authenticated: false });
  const [uploadProgress, setUploadProgress] = useState<{ [videoId: string]: number }>({});

  // Drag & drop state
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);

  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useLocalStorage<boolean>('videomaker-sidebar-open', true);
  const [activeSection, setActiveSection] = useLocalStorage<'upload' | 'youtube' | 'help'>('videomaker-active-section', 'upload');

  // Close sidebar on mobile by default
  useEffect(() => {
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  }, []);

  // Auto-load FFmpeg on mount
  useEffect(() => {
    let mounted = true;

    if (!loaded && !loading && mounted) {
      load();
    }

    return () => {
      mounted = false;
    };
  }, []);

  // Check YouTube auth status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const status = await checkAuthStatus();
        setYoutubeAuth(status);
      } catch (error) {
        console.error('Error checking YouTube auth:', error);
      }
    };
    checkAuth();
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape key - close modals/overlays (handled by child components)
      // Cmd/Ctrl + Enter to generate videos
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        if (!isProcessing && beats.length > 0 && images.length > 0) {
          handleGenerate();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isProcessing, beats.length, images.length]);

  // Global drag & drop
  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      dragCounter.current++;
      if (e.dataTransfer?.items && e.dataTransfer.items.length > 0) {
        setIsDragging(true);
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      dragCounter.current--;
      if (dragCounter.current === 0) {
        setIsDragging(false);
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      dragCounter.current = 0;

      const files = Array.from(e.dataTransfer?.files || []);
      if (files.length === 0) return;

      // Separate files by type
      const audioFiles = files.filter(f => f.type.startsWith('audio/'));
      const imageFiles = files.filter(f => f.type.startsWith('image/') || f.type.startsWith('video/'));

      if (audioFiles.length > 0) {
        setBeats(prev => [...prev, ...audioFiles]);
      }
      if (imageFiles.length > 0) {
        setImages(prev => [...prev, ...imageFiles]);
      }
    };

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, []);

  // Add files
  const handleBeatsAdded = useCallback((files: File[]) => {
    setBeats((prev) => [...prev, ...files]);
  }, []);

  const handleImagesAdded = useCallback((files: File[]) => {
    setImages((prev) => [...prev, ...files]);
  }, []);

  // Remove files
  const handleRemoveBeat = useCallback((index: number) => {
    setBeats((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleRemoveImage = useCallback((index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Generate videos
  const handleGenerate = useCallback(async () => {
    if (!ffmpeg || !loaded) {
      setErrors((prev) => [
        ...prev,
        { timestamp: new Date(), message: 'FFmpeg not loaded. Please wait and try again.' },
      ]);
      return;
    }

    if (beats.length === 0 || images.length === 0) {
      setErrors((prev) => [
        ...prev,
        { timestamp: new Date(), message: 'Please upload both beats and images.' },
      ]);
      return;
    }

    try {
      // Scroll to top to show processing queue (before setting state)
      window.scrollTo({ top: 0, behavior: 'smooth' });

      // Small delay to ensure scroll happens before heavy processing starts
      await new Promise(resolve => setTimeout(resolve, 100));

      setIsProcessing(true);
      setErrors([]);
      setCompletedVideos([]);

      // Pair files
      const pairs = pairFiles(beats, images);

      // Create jobs based on format selection
      const jobs: ProcessingJob[] = [];
      pairs.forEach((pair, index) => {
        if (outputFormat === '16x9' || outputFormat === 'both') {
          jobs.push({
            id: `${pair.beatName}-16x9-${index}`,
            beat: pair.beat,
            image: pair.image,
            outputName: `${pair.beatName} - 16x9.mp4`,
            format: '16x9',
            status: 'pending',
            progress: 0,
          });
        }
        if (outputFormat === '9x16' || outputFormat === 'both') {
          jobs.push({
            id: `${pair.beatName}-9x16-${index}`,
            beat: pair.beat,
            image: pair.image,
            outputName: `${pair.beatName} - 9x16.mp4`,
            format: '9x16',
            status: 'pending',
            progress: 0,
          });
        }
      });

      setProcessingQueue(jobs);

      // Process jobs sequentially
      const processor = new VideoProcessor(ffmpeg);
      const completed: CompletedVideo[] = [];

      for (let i = 0; i < jobs.length; i++) {
        const job = jobs[i];

        // Update progress
        setCurrentProgress({
          currentJobIndex: i + 1,
          totalJobs: jobs.length,
          currentProgress: 0,
          stage: 'loading',
          currentJobName: job.outputName,
        });

        try {
          // Update job status
          setProcessingQueue((prev) =>
            prev.map((j) => (j.id === job.id ? { ...j, status: 'processing' as const } : j))
          );

          // Simulate progress updates (FFmpeg.wasm doesn't provide detailed progress)
          const progressInterval = setInterval(() => {
            setCurrentProgress((prev) =>
              prev
                ? {
                    ...prev,
                    currentProgress: Math.min(prev.currentProgress + 10, 90),
                    stage: prev.currentProgress < 30 ? 'loading' : prev.currentProgress < 70 ? 'encoding' : 'finalizing',
                  }
                : null
            );
          }, 500);

          // Process video
          const videoBlob = await processor.processJob(job);

          clearInterval(progressInterval);

          // Complete progress
          setCurrentProgress((prev) =>
            prev ? { ...prev, currentProgress: 100, stage: 'complete' } : null
          );

          // Create completed video entry
          const url = URL.createObjectURL(videoBlob);
          const completedVideo: CompletedVideo = {
            id: job.id,
            name: job.outputName,
            blob: videoBlob,
            url,
            size: videoBlob.size,
            duration: 180, // Will be updated if we can extract from metadata
            format: job.format,
          };

          completed.push(completedVideo);
          setCompletedVideos((prev) => [...prev, completedVideo]);

          // Update job status
          setProcessingQueue((prev) =>
            prev.map((j) => (j.id === job.id ? { ...j, status: 'complete' as const, progress: 100 } : j))
          );
        } catch (err) {
          console.error(`Error processing ${job.outputName}:`, err);

          setErrors((prev) => [
            ...prev,
            {
              timestamp: new Date(),
              message: `Failed to process ${job.outputName}: ${err instanceof Error ? err.message : 'Unknown error'}`,
              filename: job.outputName,
            },
          ]);

          setProcessingQueue((prev) =>
            prev.map((j) =>
              j.id === job.id
                ? { ...j, status: 'error' as const, error: err instanceof Error ? err.message : 'Unknown error' }
                : j
            )
          );
        }
      }

      setCurrentProgress(null);
    } catch (err) {
      console.error('Processing error:', err);
      setErrors((prev) => [
        ...prev,
        {
          timestamp: new Date(),
          message: `Processing failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  }, [ffmpeg, loaded, beats, images, outputFormat]);

  // Convert completed videos to VideoWithMetadata format when they're created
  useEffect(() => {
    const newVideos: VideoWithMetadata[] = completedVideos.map((video) => ({
      videoId: video.id,
      videoName: video.name,
      videoBlob: video.blob,
      videoUrl: video.url,
    }));
    setVideosWithMetadata(newVideos);
    if (newVideos.length > 0 && !selectedVideoForYT) {
      setSelectedVideoForYT(newVideos[0]);
    }
  }, [completedVideos]);

  // YouTube metadata handlers
  const handleMetadataUpdate = useCallback((videoId: string, metadata: YouTubeMetadata) => {
    setVideosWithMetadata((prev) =>
      prev.map((v) => (v.videoId === videoId ? { ...v, metadata } : v))
    );
  }, []);

  // Handle YouTube authentication
  const handleYouTubeAuth = useCallback(async () => {
    if (youtubeAuth.authenticated) {
      // If already authenticated, revoke and sign out
      if (confirm('Sign out of YouTube?')) {
        try {
          await revokeAuth();
          setYoutubeAuth({ authenticated: false });
        } catch (error) {
          console.error('Error signing out:', error);
          alert('Failed to sign out. Please try again.');
        }
      }
    } else {
      // Authenticate - opens popup window, preserves page state
      try {
        await authorizeYouTube();

        // Popup closed successfully, refresh auth status
        const status = await checkAuthStatus();
        setYoutubeAuth(status);

        // Show success message
        if (status.authenticated) {
          alert(`Successfully connected to YouTube${status.channel?.title ? ` as ${status.channel.title}` : ''}!`);
        }
      } catch (error) {
        console.error('Authentication error:', error);
        alert(error instanceof Error ? error.message : 'Failed to authenticate with YouTube');
      }
    }
  }, [youtubeAuth.authenticated]);

  // Handle bulk delete of videos
  const handleBulkDelete = useCallback((videoIds: string[]) => {
    setCompletedVideos(prev => prev.filter(v => !videoIds.includes(v.id)));
    setVideosWithMetadata(prev => prev.filter(v => !videoIds.includes(v.videoId)));

    // If the selected video was deleted, clear selection
    if (selectedVideoForYT && videoIds.includes(selectedVideoForYT.videoId)) {
      setSelectedVideoForYT(null);
    }
  }, [selectedVideoForYT]);

  const handleYouTubeUpload = useCallback(async (videos: VideoWithMetadata[]) => {
    // Check authentication
    if (!youtubeAuth.authenticated) {
      alert('Please authenticate with YouTube first.');
      return;
    }

    // Upload each video
    for (const video of videos) {
      if (!video.metadata) {
        alert(`Please set metadata for "${video.videoName}" before uploading.`);
        continue;
      }

      try {
        setUploadProgress((prev) => ({ ...prev, [video.videoId]: 0 }));

        const result = await uploadVideo(
          video.videoBlob,
          video.videoName,
          {
            title: video.metadata.title,
            description: video.metadata.description,
            tags: video.metadata.tags,
            privacyStatus: video.metadata.privacy,
          },
          (progress) => {
            setUploadProgress((prev) => ({ ...prev, [video.videoId]: progress }));
          }
        );

        setUploadProgress((prev) => {
          const updated = { ...prev };
          delete updated[video.videoId];
          return updated;
        });

        alert(
          `Successfully uploaded "${video.videoName}"!\n\n` +
          `Video ID: ${result.id}\n` +
          `URL: ${result.url}\n` +
          `Privacy: ${result.privacyStatus}`
        );

        // Open the video in a new tab
        window.open(result.url, '_blank');
      } catch (error) {
        setUploadProgress((prev) => {
          const updated = { ...prev };
          delete updated[video.videoId];
          return updated;
        });

        console.error(`Error uploading ${video.videoName}:`, error);
        alert(
          `Failed to upload "${video.videoName}".\n\n` +
          `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }
  }, [youtubeAuth.authenticated]);

  // Tool access check - show loading or locked screen
  if (accessLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={48} className="animate-spin text-brand-blue" />
          <p className="text-zinc-400">Checking tool access...</p>
        </div>
      </div>
    );
  }

  if (!accessData?.hasAccess) {
    return (
      <ToolLockedScreen
        toolId={TOOL_ID}
        toolName="Type Beat Video Maker"
        toolDescription="Transform your beats into professional YouTube-ready videos with custom artwork, batch processing, and direct YouTube upload."
        cost={accessData?.reward?.cost || 750}
        features={[
          'Batch video processing',
          'Direct YouTube upload',
          '16:9 and 9:16 formats',
          'Custom artwork support',
          'Local browser processing'
        ]}
      />
    );
  }

  return (
    <div className="video-maker-wrapper">
      {/* Animated Particle Background */}
      <ParticleBackground />

      {/* Drag & Drop Overlay */}
      {isDragging && (
        <div className="fixed inset-0 z-50 bg-brand-blue/20 backdrop-blur-sm pointer-events-none flex items-center justify-center">
          <div className="bg-zinc-900/90 border-2 border-dashed border-brand-blue rounded-2xl p-12 shadow-2xl">
            <div className="flex flex-col items-center gap-4">
              <Video size={64} className="text-brand-blue animate-bounce" />
              <div className="text-center">
                <p className="text-2xl font-bold text-white mb-2">Drop files here</p>
                <p className="text-zinc-400">Audio files → Beats | Images/Videos → Covers</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Hamburger Menu Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-3 bg-zinc-900/95 backdrop-blur-xl border border-zinc-800/50 rounded-lg hover:bg-zinc-800 transition-colors"
      >
        {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-10 fade-in"
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 h-full bg-zinc-900/95 backdrop-blur-xl border-r border-zinc-800/50 transition-all duration-300 z-20 ${
        sidebarOpen ? 'w-64 sidebar-open' : 'w-16'
      }`}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-zinc-800/50 flex items-center justify-between">
          {sidebarOpen && (
            <>
              <div className="flex items-center gap-2">
                <Video size={24} className="text-brand-blue" />
                <span className="font-bold text-white">Type Beat Video Maker</span>
              </div>
              {/* Mobile close button */}
              <button
                onClick={() => setSidebarOpen(false)}
                className="md:hidden p-2 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </>
          )}
          {/* Desktop toggle button */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden md:block p-2 hover:bg-zinc-800 rounded-lg transition-colors ml-auto"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className={`p-2 space-y-2 ${!sidebarOpen ? 'flex flex-col items-center' : ''}`}>
          <button
            onClick={() => {
              setActiveSection('upload');
              // Close sidebar on mobile after selection
              if (window.innerWidth < 768) {
                setSidebarOpen(false);
              }
            }}
            className={`w-full flex items-center rounded-lg transition-all ${
              sidebarOpen ? 'gap-3 px-3 py-2.5' : 'justify-center p-3'
            } ${
              activeSection === 'upload'
                ? 'bg-brand-blue text-white'
                : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
            }`}
            title={!sidebarOpen ? 'Upload & Create' : undefined}
          >
            <Upload size={sidebarOpen ? 20 : 24} />
            {sidebarOpen && <span className="font-medium">Upload & Create</span>}
          </button>

          <button
            onClick={() => {
              setActiveSection('youtube');
              // Close sidebar on mobile after selection
              if (window.innerWidth < 768) {
                setSidebarOpen(false);
              }
            }}
            className={`w-full flex items-center rounded-lg transition-all ${
              sidebarOpen ? 'gap-3 px-3 py-2.5' : 'justify-center p-3'
            } ${
              activeSection === 'youtube'
                ? 'bg-brand-blue text-white'
                : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
            }`}
            title={!sidebarOpen ? 'YouTube' : undefined}
          >
            <Youtube size={sidebarOpen ? 20 : 24} />
            {sidebarOpen && <span className="font-medium">YouTube</span>}
          </button>

          <button
            onClick={() => {
              setActiveSection('help');
              // Close sidebar on mobile after selection
              if (window.innerWidth < 768) {
                setSidebarOpen(false);
              }
            }}
            className={`w-full flex items-center rounded-lg transition-all ${
              sidebarOpen ? 'gap-3 px-3 py-2.5' : 'justify-center p-3'
            } ${
              activeSection === 'help'
                ? 'bg-brand-blue text-white'
                : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
            }`}
            title={!sidebarOpen ? 'Help' : undefined}
          >
            <HelpCircle size={sidebarOpen ? 20 : 24} />
            {sidebarOpen && <span className="font-medium">Help</span>}
          </button>
        </nav>

        {/* Sidebar Footer */}
        {sidebarOpen && (
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-zinc-800/50">
            <div className="text-xs text-zinc-500 space-y-1">
              <p>Transform your beats into</p>
              <p>professional YouTube videos</p>
            </div>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className={`transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-16'} px-6 py-8`}>
        {/* Error Message */}
        {ffmpegError && (
          <div className="max-w-6xl mx-auto mb-6 bg-zinc-900 border border-red-500/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                <AlertCircle size={18} className="text-red-400" />
              </div>
              <div className="flex-1">
                <p className="text-red-400 text-sm mb-2 font-medium">
                  Failed to load video processor: {ffmpegError}
                </p>
                <Button
                  onClick={() => load()}
                  size="sm"
                  className="bg-gradient-to-r from-brand-blue to-blue-500 hover:from-brand-blue hover:to-blue-600"
                >
                  Retry Loading
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Status Bar */}
        {(loading || isProcessing) && (
          <div className="max-w-6xl mx-auto mb-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin text-brand-blue" />
                  <span className="text-sm text-zinc-300">
                    {loading && 'Loading video processor...'}
                    {isProcessing && currentProgress && `Processing: ${currentProgress.currentJobName}`}
                  </span>
                </div>
                <span className="text-xs text-zinc-500">
                  {isProcessing && currentProgress && `${currentProgress.currentJobIndex} / ${currentProgress.totalJobs}`}
                </span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-brand-blue to-blue-500 h-full transition-all duration-300"
                  style={{
                    width: isProcessing && currentProgress
                      ? `${(currentProgress.currentJobIndex / currentProgress.totalJobs) * 100}%`
                      : loading ? '50%' : '0%'
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Upload & Create Section */}
        {loaded && activeSection === 'upload' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {/* Left Sidebar - Uploads and Settings */}
            <div className="space-y-6">
              <FileUploader
                fileType="Beats"
                acceptedFormats=".mp3"
                onFilesAdded={handleBeatsAdded}
                files={beats}
                onRemove={handleRemoveBeat}
              />

              <FileUploader
                fileType="Images"
                acceptedFormats=".png,.jpg,.jpeg,.gif,.mp4"
                onFilesAdded={handleImagesAdded}
                files={images}
                onRemove={handleRemoveImage}
              />

              <VideoSettings format={outputFormat} onFormatChange={setOutputFormat} />

              {/* Generate Button */}
              <div className="space-y-2">
                <Button
                  onClick={handleGenerate}
                  disabled={isProcessing || beats.length === 0 || images.length === 0}
                  className="w-full gap-2 bg-gradient-to-r from-brand-blue to-blue-500 hover:from-brand-blue hover:to-blue-600 disabled:opacity-50"
                >
                  {isProcessing ? 'Generating Videos...' : 'Generate Videos'}
                </Button>
                <div className="text-xs text-center text-zinc-500 space-y-1">
                  <p>
                    <kbd className="px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-zinc-300">⌘/Ctrl + Enter</kbd> to generate
                  </p>
                  <p>
                    <kbd className="px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-zinc-300">Esc</kbd> to close overlays
                  </p>
                </div>
              </div>
            </div>

            {/* Right Content - Preview and Results */}
            <div className="lg:col-span-2 space-y-6">
              {/* Processing Queue */}
              {isProcessing && processingQueue.length > 0 && (
                <ProcessingQueue
                  jobs={processingQueue}
                  currentProgress={currentProgress}
                  isProcessing={isProcessing}
                />
              )}

              {/* Errors */}
              {errors.length > 0 && (
                <div className="bg-zinc-900 border border-red-500/30 rounded-lg p-4">
                  <div className="space-y-2">
                    {errors.map((error, index) => (
                      <p key={index} className="text-red-400 text-xs font-mono">
                        {error.filename && <strong className="text-red-300">{error.filename}:</strong>} {error.message}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Completed Videos */}
              {completedVideos.length > 0 && (
                <VideoPreview
                  videos={completedVideos}
                  onSelectVideo={(video) => {
                    const ytVideo = videosWithMetadata.find(v => v.videoId === video.id);
                    if (ytVideo) setSelectedVideoForYT(ytVideo);
                  }}
                  selectedVideoId={selectedVideoForYT?.videoId}
                  onBulkDelete={handleBulkDelete}
                />
              )}
            </div>
          </div>
        )}

        {/* YouTube Section */}
        {activeSection === 'youtube' && (
          <div className="max-w-6xl mx-auto">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">YouTube Manager</h2>
              <p className="text-zinc-400">Manage your video metadata and upload to YouTube</p>
            </div>

            {completedVideos.length === 0 ? (
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-12 text-center">
                <Youtube size={48} className="mx-auto mb-4 text-zinc-600" />
                <h3 className="text-lg font-semibold text-white mb-2">No Videos Generated Yet</h3>
                <p className="text-zinc-400 mb-4">Create some videos first, then come back here to upload them to YouTube</p>
                <Button
                  onClick={() => setActiveSection('upload')}
                  className="bg-gradient-to-r from-brand-blue to-blue-500 hover:from-brand-blue hover:to-blue-600"
                >
                  <Upload size={16} className="mr-2" />
                  Go to Upload & Create
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                <VideoPreview
                  videos={completedVideos}
                  onSelectVideo={(video) => {
                    const ytVideo = videosWithMetadata.find(v => v.videoId === video.id);
                    if (ytVideo) setSelectedVideoForYT(ytVideo);
                  }}
                  selectedVideoId={selectedVideoForYT?.videoId}
                  onBulkDelete={handleBulkDelete}
                />

                <YouTubeMetadataEditor
                  videos={videosWithMetadata}
                  selectedVideo={selectedVideoForYT}
                  onMetadataUpdate={handleMetadataUpdate}
                  onUpload={handleYouTubeUpload}
                  youtubeAuth={youtubeAuth}
                  onAuthClick={handleYouTubeAuth}
                  uploadProgress={uploadProgress}
                />
              </div>
            )}
          </div>
        )}

        {/* Help Section */}
        {activeSection === 'help' && (
          <div className="max-w-4xl mx-auto">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">Help & Documentation</h2>
              <p className="text-zinc-400">Learn how to use the AI Type Beat Creation Tool</p>
            </div>

            <div className="space-y-6">
              {/* Quick Start Guide */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Upload size={20} className="text-brand-blue" />
                  Quick Start Guide
                </h3>
                <ol className="space-y-3 text-zinc-300">
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-blue text-white text-sm flex items-center justify-center">1</span>
                    <span><strong>Upload Files:</strong> Add your beat files (.mp3) and cover images (.png, .jpg, .gif, or .mp4)</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-blue text-white text-sm flex items-center justify-center">2</span>
                    <span><strong>Choose Format:</strong> Select 16:9 (landscape), 9:16 (vertical), or both formats</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-blue text-white text-sm flex items-center justify-center">3</span>
                    <span><strong>Generate:</strong> Click "Generate Videos" or press ⌘/Ctrl + Enter</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-blue text-white text-sm flex items-center justify-center">4</span>
                    <span><strong>Download or Upload:</strong> Download your videos or upload directly to YouTube</span>
                  </li>
                </ol>
              </div>

              {/* Keyboard Shortcuts */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Settings size={20} className="text-brand-blue" />
                  Keyboard Shortcuts
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-zinc-300">
                  <div className="flex items-center justify-between">
                    <span>Generate Videos</span>
                    <kbd className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-sm">⌘/Ctrl + Enter</kbd>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Close Overlays</span>
                    <kbd className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-sm">Esc</kbd>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Navigate Elements</span>
                    <kbd className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-sm">Tab</kbd>
                  </div>
                </div>
              </div>

              {/* Features */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Video size={20} className="text-brand-blue" />
                  Features
                </h3>
                <ul className="space-y-3 text-zinc-300">
                  <li className="flex gap-2">
                    <span className="text-brand-blue">•</span>
                    <span><strong>Real-time Previews:</strong> See thumbnails and waveforms as you upload files</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-brand-blue">•</span>
                    <span><strong>Batch Operations:</strong> Select multiple videos for bulk download or delete</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-brand-blue">•</span>
                    <span><strong>Drag & Drop:</strong> Drop files anywhere on the page to upload</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-brand-blue">•</span>
                    <span><strong>YouTube Integration:</strong> Upload directly to your YouTube channel with custom metadata</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-brand-blue">•</span>
                    <span><strong>Multiple Formats:</strong> Generate both landscape (16:9) and vertical (9:16) videos</span>
                  </li>
                </ul>
              </div>

              {/* Tips */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <HelpCircle size={20} className="text-brand-blue" />
                  Pro Tips
                </h3>
                <ul className="space-y-3 text-zinc-300">
                  <li className="flex gap-2">
                    <span className="text-yellow-400">💡</span>
                    <span>Use high-quality images (1920x1080 or higher) for best results</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-yellow-400">💡</span>
                    <span>The tool automatically pairs files by name - name your beats and covers similarly for accurate matching</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-yellow-400">💡</span>
                    <span>You can upload multiple files at once using drag & drop or the file browser</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-yellow-400">💡</span>
                    <span>Videos are generated locally in your browser - no files are uploaded to our servers</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
