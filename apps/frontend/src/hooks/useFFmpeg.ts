import { FFmpeg } from '@ffmpeg/ffmpeg';
import { useState, useRef, useCallback, useEffect } from 'react';

interface UseFFmpegReturn {
  loaded: boolean;
  loading: boolean;
  error: string | null;
  load: () => Promise<void>;
  ffmpeg: FFmpeg | null;
  progress: number;
}

// Timeout for FFmpeg load (60 seconds)
const LOAD_TIMEOUT = 60000;

export function useFFmpeg(): UseFFmpegReturn {
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const loadingRef = useRef(false);
  const mountedRef = useRef(true);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  // Create FFmpeg instance on demand
  const getFFmpeg = useCallback(() => {
    if (!ffmpegRef.current) {
      console.log('[FFmpeg] Creating new instance...');
      ffmpegRef.current = new FFmpeg();

      ffmpegRef.current.on('log', ({ message }) => {
        console.log('[FFmpeg Log]', message);
      });

      ffmpegRef.current.on('progress', ({ progress: p }) => {
        console.log('[FFmpeg Progress]', Math.round(p * 100) + '%');
        if (mountedRef.current) {
          setProgress(Math.round(p * 100));
        }
      });
    }
    return ffmpegRef.current;
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    // Prevent duplicate loading
    if (loaded || loadingRef.current) {
      console.log('[FFmpeg] Already loaded or loading, skipping');
      return;
    }

    loadingRef.current = true;
    setLoading(true);
    setError(null);
    console.log('[FFmpeg] Starting load - downloading WASM files (~30MB)...');
    console.log('[FFmpeg] This may take a minute on first load...');

    try {
      const ffmpeg = getFFmpeg();

      // Use jsDelivr CDN (often faster and more reliable than unpkg)
      const baseURL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm';
      console.log('[FFmpeg] Loading from:', baseURL);

      // Create a promise that rejects after timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`FFmpeg load timed out after ${LOAD_TIMEOUT / 1000} seconds. Please check your internet connection and try again.`));
        }, LOAD_TIMEOUT);
      });

      // Race between actual load and timeout
      console.log('[FFmpeg] Initiating load...');
      await Promise.race([
        ffmpeg.load({
          coreURL: `${baseURL}/ffmpeg-core.js`,
          wasmURL: `${baseURL}/ffmpeg-core.wasm`,
        }),
        timeoutPromise
      ]);

      if (mountedRef.current) {
        setLoaded(true);
        setLoading(false);
        loadingRef.current = false;
        console.log('[FFmpeg] ✓ Loaded successfully!');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load FFmpeg';
      console.error('[FFmpeg] Load error:', errorMessage);

      // Handle terminate errors from Strict Mode
      if (errorMessage.includes('terminate')) {
        console.log('[FFmpeg] Retrying after terminate error...');
        ffmpegRef.current = null;
        loadingRef.current = false;

        if (mountedRef.current) {
          setLoading(false);
          // Retry after a short delay
          setTimeout(() => {
            if (mountedRef.current && !loaded) {
              load();
            }
          }, 200);
        }
        return;
      }

      if (mountedRef.current) {
        setError(errorMessage);
        setLoading(false);
        loadingRef.current = false;
      }
    }
  }, [loaded, getFFmpeg]);

  return {
    loaded,
    loading,
    error,
    load,
    ffmpeg: ffmpegRef.current,
    progress
  };
}
