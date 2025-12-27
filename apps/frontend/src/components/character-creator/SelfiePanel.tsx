/**
 * SelfiePanel
 * Selfie-to-avatar AI generation with:
 * - Camera capture
 * - Photo upload
 * - Generation trigger
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

type CaptureMode = 'camera' | 'upload' | null;

export function SelfiePanel() {
  const [captureMode, setCaptureMode] = useState<CaptureMode>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

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

  // Trigger generation
  const handleGenerate = useCallback(async () => {
    if (!selfieImage) return;

    startGeneration();

    // Simulate AI generation process
    // In production, this would call your AI backend
    const steps: Array<{ status: Parameters<typeof updateGenerationProgress>[0]; progress: number; delay: number }> = [
      { status: 'analyzing', progress: 15, delay: 800 },
      { status: 'analyzing', progress: 30, delay: 600 },
      { status: 'generating_mesh', progress: 45, delay: 1000 },
      { status: 'generating_mesh', progress: 60, delay: 800 },
      { status: 'applying_textures', progress: 75, delay: 700 },
      { status: 'applying_textures', progress: 85, delay: 500 },
      { status: 'finalizing', progress: 95, delay: 400 },
      { status: 'complete', progress: 100, delay: 300 },
    ];

    for (const step of steps) {
      await new Promise((resolve) => setTimeout(resolve, step.delay));
      updateGenerationProgress(step.status, step.progress);
    }

    // Apply a "generated" config based on the selfie
    // In production, this would come from AI analysis
    const generatedConfig = createDefaultCharacterConfig();
    // Simulate some random customization as if AI detected features
    generatedConfig.skinTone = ['#FFE0BD', '#DFAD69', '#C68642', '#8D5524'][
      Math.floor(Math.random() * 4)
    ];
    generatedConfig.hairColor = ['#1A1A1A', '#3B2417', '#6B4423', '#D4A853'][
      Math.floor(Math.random() * 4)
    ];
    generatedConfig.eyeColor = ['#6B4423', '#4A7023', '#4B88A2'][
      Math.floor(Math.random() * 3)
    ];
    generatedConfig.facePreset = Math.floor(Math.random() * 6) + 1;

    applyGeneratedConfig(generatedConfig);
  }, [selfieImage, startGeneration, updateGenerationProgress, applyGeneratedConfig]);

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
          <p className="text-sm text-emerald-400 text-center">
            Avatar generated! Switch to Customize mode to fine-tune your look.
          </p>
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
