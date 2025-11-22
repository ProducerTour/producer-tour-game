/**
 * Audio Waveform Component
 * Using WaveSurfer.js for audio visualization
 */

import { useRef, useEffect, useState, useCallback } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { Play, Pause, Volume2, VolumeX, SkipBack, SkipForward } from 'lucide-react';
import { cn } from '../../lib/utils';

interface AudioWaveformProps {
  src: string;
  height?: number;
  waveColor?: string;
  progressColor?: string;
  cursorColor?: string;
  barWidth?: number;
  barGap?: number;
  barRadius?: number;
  autoplay?: boolean;
  className?: string;
  onReady?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
  onFinish?: () => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
}

export function AudioWaveform({
  src,
  height = 64,
  waveColor = 'rgba(255, 255, 255, 0.3)',
  progressColor = '#3b82f6',
  cursorColor = '#3b82f6',
  barWidth = 2,
  barGap = 1,
  barRadius = 2,
  autoplay = false,
  className,
  onReady,
  onPlay,
  onPause,
  onFinish,
  onTimeUpdate,
}: AudioWaveformProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Initialize WaveSurfer
  useEffect(() => {
    if (!containerRef.current) return;

    const wavesurfer = WaveSurfer.create({
      container: containerRef.current,
      height,
      waveColor,
      progressColor,
      cursorColor,
      cursorWidth: 1,
      barWidth,
      barGap,
      barRadius,
      normalize: true,
      backend: 'WebAudio',
    });

    wavesurfer.load(src);

    // Event handlers
    wavesurfer.on('ready', () => {
      setIsReady(true);
      setDuration(wavesurfer.getDuration());
      onReady?.();
      if (autoplay) {
        wavesurfer.play();
      }
    });

    wavesurfer.on('play', () => {
      setIsPlaying(true);
      onPlay?.();
    });

    wavesurfer.on('pause', () => {
      setIsPlaying(false);
      onPause?.();
    });

    wavesurfer.on('finish', () => {
      setIsPlaying(false);
      onFinish?.();
    });

    wavesurfer.on('timeupdate', (time) => {
      setCurrentTime(time);
      onTimeUpdate?.(time, wavesurfer.getDuration());
    });

    wavesurferRef.current = wavesurfer;

    return () => {
      wavesurfer.destroy();
    };
  }, [src, height, waveColor, progressColor, cursorColor, barWidth, barGap, barRadius, autoplay]);

  // Play/Pause
  const togglePlayPause = useCallback(() => {
    wavesurferRef.current?.playPause();
  }, []);

  // Skip back 10 seconds
  const skipBack = useCallback(() => {
    if (wavesurferRef.current) {
      const newTime = Math.max(0, wavesurferRef.current.getCurrentTime() - 10);
      wavesurferRef.current.seekTo(newTime / wavesurferRef.current.getDuration());
    }
  }, []);

  // Skip forward 10 seconds
  const skipForward = useCallback(() => {
    if (wavesurferRef.current) {
      const duration = wavesurferRef.current.getDuration();
      const newTime = Math.min(duration, wavesurferRef.current.getCurrentTime() + 10);
      wavesurferRef.current.seekTo(newTime / duration);
    }
  }, []);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (wavesurferRef.current) {
      const newMuted = !isMuted;
      wavesurferRef.current.setMuted(newMuted);
      setIsMuted(newMuted);
    }
  }, [isMuted]);

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={cn('rounded-xl bg-white/[0.04] border border-white/[0.08] p-4', className)}>
      {/* Waveform */}
      <div ref={containerRef} className="mb-4" />

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Skip Back */}
          <button
            onClick={skipBack}
            disabled={!isReady}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Skip back 10s"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          {/* Play/Pause */}
          <button
            onClick={togglePlayPause}
            disabled={!isReady}
            className="p-3 rounded-full bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isPlaying ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5 ml-0.5" />
            )}
          </button>

          {/* Skip Forward */}
          <button
            onClick={skipForward}
            disabled={!isReady}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Skip forward 10s"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        {/* Time */}
        <div className="text-sm text-gray-400 font-mono">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>

        {/* Volume */}
        <button
          onClick={toggleMute}
          disabled={!isReady}
          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isMuted ? (
            <VolumeX className="w-5 h-5" />
          ) : (
            <Volume2 className="w-5 h-5" />
          )}
        </button>
      </div>
    </div>
  );
}

// Compact waveform for lists/previews
interface CompactWaveformProps {
  src: string;
  className?: string;
}

export function CompactWaveform({ src, className }: CompactWaveformProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const wavesurfer = WaveSurfer.create({
      container: containerRef.current,
      height: 32,
      waveColor: 'rgba(255, 255, 255, 0.2)',
      progressColor: '#3b82f6',
      cursorWidth: 0,
      barWidth: 2,
      barGap: 1,
      barRadius: 1,
      normalize: true,
    });

    wavesurfer.load(src);
    wavesurfer.on('ready', () => setIsReady(true));
    wavesurfer.on('play', () => setIsPlaying(true));
    wavesurfer.on('pause', () => setIsPlaying(false));
    wavesurfer.on('finish', () => setIsPlaying(false));

    wavesurferRef.current = wavesurfer;

    return () => wavesurfer.destroy();
  }, [src]);

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <button
        onClick={() => wavesurferRef.current?.playPause()}
        disabled={!isReady}
        className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 disabled:opacity-50 transition-colors flex-shrink-0"
      >
        {isPlaying ? (
          <Pause className="w-4 h-4" />
        ) : (
          <Play className="w-4 h-4 ml-0.5" />
        )}
      </button>
      <div ref={containerRef} className="flex-1 min-w-0" />
    </div>
  );
}

export default AudioWaveform;
