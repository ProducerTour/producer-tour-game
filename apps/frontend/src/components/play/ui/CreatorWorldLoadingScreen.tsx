import { useState, useEffect, useRef, Suspense } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';
import { WEAPONS } from '../WeaponAttachment';
import { getModelPath } from '../../../config/assetPaths';
import { useLoadingLogsStore, type LogEntry } from '../../../stores/loadingLogs.store';

// Video sources for cycling background - UPDATE THESE WITH YOUR CDN URLS
const VIDEO_SOURCES = [
  '/videos/loading/detroit-aerial.mp4',
  '/videos/loading/nature-aerial.mp4',
  '/videos/loading/ocean-waves.mp4',
  '/videos/loading/city-night.mp4',
];

// Loading tips - Creator World themed
const LOADING_TIPS = [
  "Build your empire. Collaborate or compete. The choice is yours.",
  "Trust no one. Or trust everyone. See what happens.",
  "Your creations are only as safe as your defenses.",
  "The grind never stops. Neither should you.",
  "Stack your resources. Winter is always coming.",
  "Every creator started with nothing.",
  "Alliances are powerful. Betrayals are permanent.",
  "The map is vast. Your ambition should be vaster.",
];

// Weapon shader preloader scene
function WeaponPreloaderScene({ onReady }: { onReady: () => void }) {
  const { gl, scene, camera } = useThree();
  const rifleGltf = useGLTF(WEAPONS.rifle);
  const pistolGltf = useGLTF(WEAPONS.pistol);
  const muzzleFlashGltf = useGLTF(getModelPath('effects/machine_gun_muzzle_flash_test_effect.glb'));
  const hasCompiled = useRef(false);

  useEffect(() => {
    if (hasCompiled.current) return;
    hasCompiled.current = true;

    const timer = setTimeout(() => {
      try {
        gl.compile(scene, camera);
        console.log('🔧 Weapon shaders pre-compiled during loading');
      } catch (error) {
        console.warn('Weapon shader pre-compilation failed:', error);
      }
      onReady();
    }, 100);

    return () => clearTimeout(timer);
  }, [gl, scene, camera, onReady]);

  return (
    <group position={[0, -1000, 0]}>
      <primitive object={rifleGltf.scene.clone()} />
      <primitive object={pistolGltf.scene.clone()} />
      <primitive object={muzzleFlashGltf.scene.clone()} />
    </group>
  );
}

// Grass shader preloader scene
function GrassPreloaderScene({ onReady }: { onReady: () => void }) {
  const { gl, scene, camera } = useThree();
  const hasCompiled = useRef(false);
  const meshRef = useRef<THREE.Mesh | null>(null);

  useEffect(() => {
    if (hasCompiled.current) return;
    hasCompiled.current = true;

    const precompile = async () => {
      try {
        const { grassVertexShader, grassFragmentShader, createGrassUniforms } = await import('../terrain/grassShader');
        const { createGrassBladeGeometry } = await import('../terrain/GrassBladeGeometry');

        const geometry = createGrassBladeGeometry({ segments: 7 });
        const instancedGeometry = new THREE.InstancedBufferGeometry();
        instancedGeometry.setAttribute('position', geometry.getAttribute('position'));
        instancedGeometry.setAttribute('normal', geometry.getAttribute('normal'));
        instancedGeometry.setAttribute('uv', geometry.getAttribute('uv'));
        instancedGeometry.setIndex(geometry.getIndex());

        instancedGeometry.setAttribute('instancePosition', new THREE.InstancedBufferAttribute(new Float32Array([0, -1000, 0]), 3));
        instancedGeometry.setAttribute('instanceRotation', new THREE.InstancedBufferAttribute(new Float32Array([0]), 1));
        instancedGeometry.setAttribute('instanceScale', new THREE.InstancedBufferAttribute(new Float32Array([1]), 1));
        instancedGeometry.setAttribute('instanceColorSeed', new THREE.InstancedBufferAttribute(new Float32Array([0.5]), 1));
        instancedGeometry.setAttribute('instanceNormal', new THREE.InstancedBufferAttribute(new Float32Array([0, 1, 0]), 3));
        instancedGeometry.instanceCount = 1;

        const material = new THREE.ShaderMaterial({
          vertexShader: grassVertexShader,
          fragmentShader: grassFragmentShader,
          uniforms: createGrassUniforms(),
          side: THREE.DoubleSide,
          transparent: true,
        });

        const mesh = new THREE.Mesh(instancedGeometry, material);
        mesh.position.set(0, -1000, 0);
        meshRef.current = mesh;
        scene.add(mesh);

        await new Promise(resolve => setTimeout(resolve, 50));
        gl.compile(scene, camera);
        console.log('🌾 Grass shaders pre-compiled during loading');

        scene.remove(mesh);
        instancedGeometry.dispose();
        material.dispose();
        geometry.dispose();
      } catch (error) {
        console.warn('Grass shader pre-compilation failed:', error);
      }

      onReady();
    };

    precompile();
  }, [gl, scene, camera, onReady]);

  return null;
}

// Terminal console component
function LoadingConsole({ logs }: { logs: LogEntry[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const getLogColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'error': return 'text-red-400';
      case 'warn': return 'text-amber-400';
      case 'success': return 'text-yellow-400';
      default: return 'text-white/50';
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div
        ref={scrollRef}
        className="h-[120px] overflow-y-auto bg-black/60 border border-white/[0.08] rounded-sm p-2 font-mono text-[11px]"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(255, 215, 0, 0.3) transparent'
        }}
      >
        {logs.length === 0 ? (
          <div className="flex items-center gap-2 text-white/30">
            <span className="inline-block w-1.5 h-3 bg-yellow-400 animate-pulse" />
            <span>Initializing...</span>
          </div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="flex gap-2 py-px hover:bg-white/5">
              <span className="text-white/25 shrink-0">
                {log.timestamp.toLocaleTimeString('en-US', {
                  hour12: false,
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                })}
              </span>
              <span className={`${getLogColor(log.type)} break-all`}>
                {log.message}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// Props interface - matches old LoadingScreen
interface CreatorWorldLoadingScreenProps {
  progress?: number;
  message?: string;
  onWeaponsReady?: () => void;
  onGrassReady?: () => void;
  shouldPreloadWeapons?: boolean;
  shouldPreloadGrass?: boolean;
  showConsole?: boolean;
}

export function CreatorWorldLoadingScreen({
  progress: externalProgress,
  message,
  onWeaponsReady,
  onGrassReady,
  shouldPreloadWeapons = false,
  shouldPreloadGrass = false,
  showConsole = true
}: CreatorWorldLoadingScreenProps) {
  // Internal progress for Suspense fallback mode
  const [internalProgress, setInternalProgress] = useState(0);
  const progress = externalProgress ?? internalProgress;

  // Video cycling
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [isVideoTransitioning, setIsVideoTransitioning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Loading tips
  const [currentTipIndex, setCurrentTipIndex] = useState(0);

  // Logs from store
  const logs = useLoadingLogsStore(state => state.logs);
  const startCapturing = useLoadingLogsStore(state => state.startCapturing);
  const stopCapturing = useLoadingLogsStore(state => state.stopCapturing);

  // Start capturing logs when mounted
  useEffect(() => {
    startCapturing();
    return () => stopCapturing();
  }, [startCapturing, stopCapturing]);

  // Fake progress for Suspense fallback
  useEffect(() => {
    if (externalProgress !== undefined) return;

    const interval = setInterval(() => {
      setInternalProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + Math.random() * 15;
      });
    }, 200);
    return () => clearInterval(interval);
  }, [externalProgress]);

  // Cycle videos every 8 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setIsVideoTransitioning(true);
      setTimeout(() => {
        setCurrentVideoIndex(prev => (prev + 1) % VIDEO_SOURCES.length);
        setTimeout(() => {
          setIsVideoTransitioning(false);
        }, 300);
      }, 500);
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  // Load new video when index changes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.src = VIDEO_SOURCES[currentVideoIndex];
      videoRef.current.load();
      videoRef.current.play().catch(() => {});
    }
  }, [currentVideoIndex]);

  // Rotate tips every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTipIndex(prev => (prev + 1) % LOADING_TIPS.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const statusMessage = message ?? (progress < 100 ? 'Loading world...' : 'Ready!');

  return (
    <div className="fixed inset-0 flex flex-col bg-black z-50">
      {/* Video background */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Fallback gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a2e] to-[#0a0a0a]" />

        {/* Video */}
        <video
          ref={videoRef}
          className="absolute top-1/2 left-1/2 min-w-full min-h-full w-auto h-auto -translate-x-1/2 -translate-y-1/2 object-cover transition-opacity duration-500"
          style={{
            opacity: isVideoTransitioning ? 0 : 0.4,
            filter: 'saturate(0.3) brightness(0.6)'
          }}
          autoPlay
          muted
          playsInline
          loop
        >
          <source src={VIDEO_SOURCES[0]} type="video/mp4" />
        </video>
      </div>

      {/* Gradient overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(180deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.3) 30%, rgba(0,0,0,0.3) 70%, rgba(0,0,0,0.9) 100%)'
        }}
      />

      {/* Vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.7) 100%)'
        }}
      />

      {/* Scanlines */}
      <div
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.1) 0px, rgba(0,0,0,0.1) 1px, transparent 1px, transparent 2px)'
        }}
      />

      {/* Version info */}
      <div className="absolute top-4 right-6 font-mono text-[0.7rem] text-white/20 z-10">
        v0.1.0-alpha
      </div>
      <div className="absolute top-4 left-6 font-mono text-[0.7rem] text-white/20 z-10">
        Creator World Official
      </div>

      {/* Top section - Logo */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 relative z-10">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-[5rem] font-bold text-white uppercase tracking-[0.15em] mb-2"
          style={{
            textShadow: '0 0 40px rgba(255, 215, 0, 0.3), 0 4px 8px rgba(0, 0, 0, 0.8)',
            animation: 'titleGlow 3s ease-in-out infinite'
          }}
        >
          Creator World
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.8 }}
          transition={{ delay: 0.2 }}
          className="text-[1.1rem] text-yellow-400 lowercase tracking-[0.3em] italic"
        >
          "run it up or run it back"
        </motion.p>
      </div>

      {/* Bottom section - Progress and Console */}
      <div className="p-6 bg-black/85 border-t border-yellow-400/10 relative z-10 backdrop-blur-md">
        {/* Loading tip */}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 px-6 py-3 bg-black/80 border border-yellow-400/20 rounded-sm max-w-md text-center">
          <div className="text-[0.65rem] text-yellow-400 uppercase tracking-[0.15em] mb-1">
            Loading Tip
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentTipIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="text-[0.8rem] text-white/60 leading-relaxed"
            >
              {LOADING_TIPS[currentTipIndex]}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Progress section */}
        <div className="max-w-3xl mx-auto mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="font-mono text-[0.75rem] text-white/50 uppercase tracking-wider">
              Loading
            </span>
            <span className="font-mono text-[0.875rem] text-yellow-400 font-medium">
              {Math.round(Math.min(progress, 100))}%
            </span>
          </div>
          <div className="h-[3px] bg-white/10 rounded-sm overflow-hidden">
            <motion.div
              className="h-full rounded-sm"
              style={{
                background: 'linear-gradient(90deg, #ffd700, #ffec8b)',
                boxShadow: '0 0 10px rgba(255, 215, 0, 0.5)'
              }}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(progress, 100)}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <div className="font-mono text-[0.7rem] text-white/30 mt-2 h-4">
            {statusMessage}
          </div>
        </div>

        {/* Console */}
        {showConsole && <LoadingConsole logs={logs} />}
      </div>

      {/* Hidden Canvas for shader precompilation */}
      {((shouldPreloadWeapons && onWeaponsReady) || (shouldPreloadGrass && onGrassReady)) && (
        <div className="absolute w-px h-px overflow-hidden opacity-0 pointer-events-none">
          <Canvas
            gl={{
              antialias: false,
              alpha: false,
              powerPreference: 'high-performance',
            }}
            camera={{ position: [0, 0, 5] }}
          >
            <Suspense fallback={null}>
              <ambientLight intensity={0.5} />
              {shouldPreloadWeapons && onWeaponsReady && (
                <WeaponPreloaderScene onReady={onWeaponsReady} />
              )}
              {shouldPreloadGrass && onGrassReady && (
                <GrassPreloaderScene onReady={onGrassReady} />
              )}
            </Suspense>
          </Canvas>
        </div>
      )}

      {/* Title glow animation keyframes */}
      <style>{`
        @keyframes titleGlow {
          0%, 100% {
            text-shadow: 0 0 40px rgba(255, 215, 0, 0.3), 0 4px 8px rgba(0, 0, 0, 0.8);
          }
          50% {
            text-shadow: 0 0 60px rgba(255, 215, 0, 0.5), 0 0 100px rgba(255, 215, 0, 0.2), 0 4px 8px rgba(0, 0, 0, 0.8);
          }
        }
      `}</style>
    </div>
  );
}

export default CreatorWorldLoadingScreen;
