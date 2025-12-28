/**
 * SelfiePanel
 * Selfie-to-avatar AI generation (simplified for MVP - colors only)
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera,
  Upload,
  X,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { useCharacterCreatorStore } from '../../stores/characterCreator.store';
import { createDefaultCharacterConfig } from '../../lib/character/defaults';
import { aiApi } from '../../lib/api';
import { ConfidenceBadge } from './ConfidenceBadge';

type CaptureMode = 'camera' | 'upload' | null;

/**
 * Smart hair style matching from AI suggestion
 * Handles compound descriptions like "short curly" or "medium wavy"
 */
function matchHairStyle(suggestion: string): string {
  const lower = suggestion.toLowerCase().trim();

  // Direct matches for exact terms
  const directMap: Record<string, string> = {
    bald: 'bald',
    buzzcut: 'buzzcut',
    'buzz cut': 'buzzcut',
    afro: 'afro_medium',
    ponytail: 'ponytail',
    braids: 'braids',
    mohawk: 'mohawk',
  };

  if (directMap[lower]) {
    return directMap[lower];
  }

  // Check for texture keywords
  const isCurly = lower.includes('curl');
  const isWavy = lower.includes('wav');
  const isStraight = lower.includes('straight');
  const isAfro = lower.includes('afro');

  // Check for length keywords
  const isShort = lower.includes('short') || lower.includes('buzz');
  const isLong = lower.includes('long');
  const isMedium = lower.includes('medium') || lower.includes('mid');

  // Special styles
  if (isAfro) return 'afro_medium';
  if (lower.includes('ponytail')) return 'ponytail';
  if (lower.includes('braid')) return 'braids';

  // Length + texture combinations
  if (isShort) {
    if (isCurly) return 'curly_short';
    return 'short_fade';
  }

  if (isLong) {
    if (isWavy) return 'long_wavy';
    return 'long_straight';
  }

  if (isMedium) {
    if (isWavy) return 'medium_wavy';
    if (isStraight) return 'medium_straight';
    return 'medium_wavy';
  }

  // Texture-only fallbacks
  if (isCurly) return 'curly_short';
  if (isWavy) return 'medium_wavy';
  if (isStraight) return 'medium_straight';

  // Default fallback
  return 'short_fade';
}

export function SelfiePanel() {
  const [captureMode, setCaptureMode] = useState<CaptureMode>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [lastConfidence, setLastConfidence] = useState<number | null>(null);

  const {
    selfieImage,
    selfieSource,
    generationStatus,
    setSelfieImage,
    startGeneration,
    updateGenerationProgress,
    applyGeneratedConfig,
    setGenerationError,
    resetSelfieFlow,
  } = useCharacterCreatorStore();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Start camera
  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err) {
      console.error('Camera error:', err);
      setCameraError(
        'Could not access camera. Please ensure camera permissions are granted.'
      );
    }
  }, []);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  // Capture photo from camera
  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    setIsCapturing(true);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Mirror the image (selfie mode)
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);

    const imageData = canvas.toDataURL('image/jpeg', 0.9);
    setSelfieImage(imageData, 'camera');
    stopCamera();
    setCaptureMode(null);
    setIsCapturing(false);
  }, [setSelfieImage, stopCamera]);

  // Handle file upload
  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        setGenerationError('Please select an image file');
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        setSelfieImage(reader.result as string, 'upload');
        setCaptureMode(null);
      };
      reader.readAsDataURL(file);
    },
    [setSelfieImage, setGenerationError]
  );

  // Trigger generation (simplified for MVP - colors only)
  const handleGenerate = useCallback(async () => {
    if (!selfieImage) return;

    startGeneration();

    try {
      // Show initial analyzing progress
      updateGenerationProgress('analyzing', 15);

      // Call the real AI endpoint
      const response = await aiApi.analyzeSelfie(selfieImage);

      // Update progress as we process the response
      updateGenerationProgress('analyzing', 50);

      if (!response.data.success || !response.data.analysis) {
        throw new Error(response.data.error || 'Failed to analyze selfie');
      }

      const analysis = response.data.analysis;

      // Show generating progress
      updateGenerationProgress('generating', 70);

      // Create config from AI analysis (colors only for MVP)
      const generatedConfig = createDefaultCharacterConfig();

      // Apply detected colors from AI
      generatedConfig.bodyType = analysis.bodyType || 'male';
      generatedConfig.skinTone = analysis.skinTone || generatedConfig.skinTone;
      generatedConfig.eyeColor = analysis.eyeColor || generatedConfig.eyeColor;
      generatedConfig.hairColor = analysis.hairColor || generatedConfig.hairColor;

      // Smart hair style matching from AI suggestion
      if (analysis.hairStyleSuggestion) {
        generatedConfig.hairStyleId = matchHairStyle(analysis.hairStyleSuggestion);
      }

      // Small delay for visual feedback
      updateGenerationProgress('generating', 90);
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Apply the generated config
      updateGenerationProgress('complete', 100);
      applyGeneratedConfig(generatedConfig);

      // Store confidence for display
      setLastConfidence(analysis.confidence ?? null);
    } catch (error) {
      console.error('Selfie analysis error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to analyze selfie';
      setGenerationError(errorMessage);
    }
  }, [selfieImage, startGeneration, updateGenerationProgress, applyGeneratedConfig, setGenerationError]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Handle mode change
  useEffect(() => {
    if (captureMode === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
  }, [captureMode, startCamera, stopCamera]);

  const isGenerating = generationStatus !== 'idle' && generationStatus !== 'complete' && generationStatus !== 'error';

  return (
    <div className="p-4 space-y-6">
      {/* Hidden elements */}
      <canvas ref={canvasRef} className="hidden" />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Title */}
      <div className="text-center">
        <h2 className="text-lg font-bold text-white mb-1">
          Create from Photo
        </h2>
        <p className="text-sm text-white/50">
          Take a selfie or upload a photo to generate your avatar
        </p>
      </div>

      {/* Image Preview / Capture Options */}
      <AnimatePresence mode="wait">
        {captureMode === 'camera' ? (
          // Camera View
          <motion.div
            key="camera"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-black"
          >
            {cameraError ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                <AlertCircle className="w-12 h-12 text-red-400 mb-3" />
                <p className="text-white/70 text-center text-sm">{cameraError}</p>
                <button
                  onClick={() => setCaptureMode(null)}
                  className="mt-4 px-4 py-2 rounded-lg bg-white/10 text-white text-sm"
                >
                  Go Back
                </button>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover mirror"
                  style={{ transform: 'scaleX(-1)' }}
                />
                <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-3">
                  <button
                    onClick={() => setCaptureMode(null)}
                    className="p-3 rounded-full bg-black/50 backdrop-blur text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <button
                    onClick={capturePhoto}
                    disabled={isCapturing}
                    className="p-4 rounded-full bg-white text-black"
                  >
                    <Camera className="w-6 h-6" />
                  </button>
                </div>
              </>
            )}
          </motion.div>
        ) : selfieImage ? (
          // Preview captured/uploaded image
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-black"
          >
            <img
              src={selfieImage}
              alt="Selfie preview"
              className="w-full h-full object-cover"
            />
            <div className="absolute top-3 right-3 flex gap-2">
              <button
                onClick={resetSelfieFlow}
                className="p-2 rounded-lg bg-black/50 backdrop-blur text-white hover:bg-black/70"
                title="Remove"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="absolute bottom-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur text-white/80 text-xs">
              {selfieSource === 'camera' ? (
                <>
                  <Camera className="w-3 h-3" />
                  Camera
                </>
              ) : (
                <>
                  <Upload className="w-3 h-3" />
                  Uploaded
                </>
              )}
            </div>
          </motion.div>
        ) : (
          // Capture options
          <motion.div
            key="options"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-2 gap-3"
          >
            {/* Camera option */}
            <button
              onClick={() => setCaptureMode('camera')}
              className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
            >
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center">
                <Camera className="w-7 h-7 text-white" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-white">Take Selfie</p>
                <p className="text-xs text-white/50">Use your camera</p>
              </div>
            </button>

            {/* Upload option */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
            >
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-cyan-600 to-blue-600 flex items-center justify-center">
                <Upload className="w-7 h-7 text-white" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-white">Upload Photo</p>
                <p className="text-xs text-white/50">From your device</p>
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Generate Button */}
      {selfieImage && !isGenerating && generationStatus !== 'complete' && (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleGenerate}
          className="w-full py-4 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-violet-500/25"
        >
          <Sparkles className="w-5 h-5" />
          Generate Avatar
        </motion.button>
      )}

      {/* Generation complete message */}
      {generationStatus === 'complete' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-emerald-500/20 border border-emerald-500/30"
        >
          <div className="flex flex-col items-center gap-3">
            {lastConfidence !== null && (
              <ConfidenceBadge confidence={lastConfidence} />
            )}
            <p className="text-sm text-emerald-400 text-center">
              Avatar generated! Switch to Customize mode to fine-tune your look.
            </p>
          </div>
        </motion.div>
      )}

      {/* Tips */}
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-white/40 uppercase tracking-wider">
          Tips for best results
        </h4>
        <ul className="space-y-1.5 text-xs text-white/50">
          <li className="flex items-start gap-2">
            <span className="text-violet-400">•</span>
            Face the camera directly with good lighting
          </li>
          <li className="flex items-start gap-2">
            <span className="text-violet-400">•</span>
            Remove glasses or accessories
          </li>
          <li className="flex items-start gap-2">
            <span className="text-violet-400">•</span>
            Use a neutral expression
          </li>
        </ul>
      </div>
    </div>
  );
}
