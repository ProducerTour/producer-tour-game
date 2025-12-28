/**
 * CharacterPreview3D
 * 3D canvas showing the avatar with:
 * - Orbit camera controls (drag to rotate)
 * - Animation preview buttons
 * - Zoom controls
 */

import { Suspense, useRef, useCallback, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Html, useProgress } from '@react-three/drei';
import * as THREE from 'three';
import { RotateCcw, ZoomIn, ZoomOut, AlertCircle, Loader2 } from 'lucide-react';

import {
  useCharacterCreatorStore,
  useCharacterConfig,
  usePreviewState,
  type PreviewAnimation,
} from '../../stores/characterCreator.store';
import { CustomizableAvatar } from './CustomizableAvatar';

// Animation button options
const ANIMATIONS: { id: PreviewAnimation; label: string }[] = [
  { id: 'idle', label: 'Idle' },
  { id: 'walk', label: 'Walk' },
  { id: 'dance', label: 'Dance' },
];

export function CharacterPreview3D() {
  const { animation, zoom } = usePreviewState();
  const setPreviewAnimation = useCharacterCreatorStore((s) => s.setPreviewAnimation);
  const setCameraZoom = useCharacterCreatorStore((s) => s.setCameraZoom);
  const resetCamera = useCharacterCreatorStore((s) => s.resetCamera);

  // State for error handling and fallback
  const [loadError, setLoadError] = useState<string | null>(null);
  const [usePlaceholder, setUsePlaceholder] = useState(false);

  const handleZoomIn = useCallback(() => {
    setCameraZoom(Math.min(zoom + 0.2, 2.0));
  }, [zoom, setCameraZoom]);

  const handleZoomOut = useCallback(() => {
    setCameraZoom(Math.max(zoom - 0.2, 0.5));
  }, [zoom, setCameraZoom]);

  return (
    <div className="relative w-full h-full bg-gradient-to-b from-[#1a1d21] to-[#0a0a0f]">
      {/* Error indicator */}
      {loadError && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-3 py-2 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm">
          <AlertCircle className="w-4 h-4" />
          {loadError}
        </div>
      )}

      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [0, 1.4, 2.5], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 2]}
        shadows
        onError={(error) => {
          console.error('Canvas error:', error);
          setLoadError('Failed to load 3D avatar');
          setUsePlaceholder(true);
        }}
      >
        <Suspense fallback={<LoadingIndicator />}>
          <SceneContent zoom={zoom} usePlaceholder={usePlaceholder} />
        </Suspense>
      </Canvas>

      {/* Animation Controls */}
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex items-center gap-2">
        {ANIMATIONS.map((anim) => (
          <button
            key={anim.id}
            onClick={() => setPreviewAnimation(anim.id)}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${animation === anim.id
                ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/25'
                : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
              }
            `}
          >
            {anim.label}
          </button>
        ))}
      </div>

      {/* Zoom Controls */}
      <div className="absolute bottom-20 right-4 flex flex-col gap-2">
        <button
          onClick={handleZoomIn}
          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all"
          title="Zoom In"
        >
          <ZoomIn className="w-5 h-5" />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all"
          title="Zoom Out"
        >
          <ZoomOut className="w-5 h-5" />
        </button>
        <button
          onClick={resetCamera}
          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all"
          title="Reset Camera"
        >
          <RotateCcw className="w-5 h-5" />
        </button>
      </div>

      {/* Instructions */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/30 text-xs">
        Drag to rotate • Scroll to zoom
      </div>
    </div>
  );
}

/**
 * Loading indicator shown while avatar loads
 */
function LoadingIndicator() {
  const { progress } = useProgress();

  return (
    <Html center>
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
        <div className="text-white/60 text-sm font-medium">
          Loading avatar... {Math.round(progress)}%
        </div>
      </div>
    </Html>
  );
}

/**
 * Scene content with avatar and environment
 */
function SceneContent({ zoom, usePlaceholder }: { zoom: number; usePlaceholder: boolean }) {
  const config = useCharacterConfig();
  const { animation } = usePreviewState();
  const controlsRef = useRef<any>(null);

  // Fixed avatar scale (height customization removed for MVP)
  const avatarScale = 1;

  return (
    <>
      {/* Lighting - Three-point setup for polished look */}
      <ambientLight intensity={0.4} />

      {/* Key light - main illumination from front-right */}
      <directionalLight
        position={[3, 4, 4]}
        intensity={1.2}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0001}
        shadow-normalBias={0.02}
        shadow-camera-near={0.1}
        shadow-camera-far={15}
        shadow-camera-left={-3}
        shadow-camera-right={3}
        shadow-camera-top={4}
        shadow-camera-bottom={-2}
      />

      {/* Fill light - softer from front-left */}
      <directionalLight position={[-3, 2, 3]} intensity={0.4} />

      {/* Rim light - back lighting for definition */}
      <directionalLight position={[0, 3, -4]} intensity={0.6} color="#b4c4ff" />

      {/* Environment for reflections */}
      <Environment preset="studio" />

      {/* Ground shadow - centered under avatar */}
      <ContactShadows
        position={[0, 0, 0]}
        opacity={0.5}
        scale={4}
        blur={2.5}
        far={3}
      />

      {/* Subtle ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]} receiveShadow>
        <circleGeometry args={[1.5, 64]} />
        <meshStandardMaterial
          color="#1a1a22"
          roughness={0.9}
          metalness={0.1}
          transparent
          opacity={0.8}
        />
      </mesh>

      {/* Avatar - use real CustomizableAvatar or fallback to placeholder */}
      {usePlaceholder ? (
        <PlaceholderAvatar
          config={config}
          scale={avatarScale}
          animation={animation}
        />
      ) : (
        <CustomizableAvatar
          config={config}
          animation={animation}
        />
      )}

      {/* Orbit Controls - centered on avatar chest */}
      <OrbitControls
        ref={controlsRef}
        target={[0, 1.2, 0]}
        minPolarAngle={Math.PI * 0.25}
        maxPolarAngle={Math.PI * 0.75}
        minDistance={1.2 / zoom}
        maxDistance={4 / zoom}
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.5}
      />
    </>
  );
}

/**
 * Placeholder Avatar
 * Geometric representation until real GLB models are available
 */
interface PlaceholderAvatarProps {
  config: ReturnType<typeof useCharacterConfig>;
  scale: number;
  animation: PreviewAnimation;
}

function PlaceholderAvatar({ config, scale, animation }: PlaceholderAvatarProps) {
  const groupRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Mesh>(null);
  const bodyRef = useRef<THREE.Mesh>(null);

  // Convert hex color to Three.js color
  const skinColor = useMemo(() => new THREE.Color(config.skinTone), [config.skinTone]);
  const hairColor = useMemo(() => new THREE.Color(config.hairColor), [config.hairColor]);
  const eyeColor = useMemo(() => new THREE.Color(config.eyeColor), [config.eyeColor]);

  // Fixed body proportions (build customization removed for MVP)
  const bodyWidth = 0.4;

  // Simple idle animation
  useFrame((state) => {
    if (!groupRef.current) return;

    const time = state.clock.elapsedTime;

    switch (animation) {
      case 'idle':
        // Subtle breathing motion
        groupRef.current.position.y = Math.sin(time * 2) * 0.01;
        if (headRef.current) {
          headRef.current.rotation.y = Math.sin(time * 0.5) * 0.05;
        }
        break;

      case 'walk':
        // Walking bob
        groupRef.current.position.y = Math.abs(Math.sin(time * 6)) * 0.03;
        groupRef.current.rotation.y = Math.sin(time * 3) * 0.1;
        break;

      case 'dance':
        // Dancing motion
        groupRef.current.position.y = Math.abs(Math.sin(time * 4)) * 0.05;
        groupRef.current.rotation.y = Math.sin(time * 2) * 0.3;
        if (bodyRef.current) {
          bodyRef.current.rotation.z = Math.sin(time * 4) * 0.1;
        }
        break;
    }
  });

  return (
    <group ref={groupRef} scale={scale}>
      {/* Body */}
      <mesh ref={bodyRef} position={[0, 0.9, 0]} castShadow>
        <capsuleGeometry args={[bodyWidth, 0.6, 8, 16]} />
        <meshStandardMaterial color={skinColor} roughness={0.8} />
      </mesh>

      {/* Head */}
      <mesh ref={headRef} position={[0, 1.65, 0]} castShadow>
        <sphereGeometry args={[0.2, 32, 32]} />
        <meshStandardMaterial color={skinColor} roughness={0.7} />
      </mesh>

      {/* Hair (if not bald) */}
      {config.hairStyleId && config.hairStyleId !== 'bald' && (
        <mesh position={[0, 1.75, 0]}>
          <sphereGeometry args={[0.22, 32, 32, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
          <meshStandardMaterial color={hairColor} roughness={0.9} />
        </mesh>
      )}

      {/* Eyes */}
      <group position={[0, 1.68, 0.15]}>
        {/* Left eye */}
        <mesh position={[-0.07, 0, 0]}>
          <sphereGeometry args={[0.025, 16, 16]} />
          <meshStandardMaterial color="#FFFFFF" />
        </mesh>
        <mesh position={[-0.07, 0, 0.02]}>
          <sphereGeometry args={[0.012, 16, 16]} />
          <meshStandardMaterial color={eyeColor} />
        </mesh>

        {/* Right eye */}
        <mesh position={[0.07, 0, 0]}>
          <sphereGeometry args={[0.025, 16, 16]} />
          <meshStandardMaterial color="#FFFFFF" />
        </mesh>
        <mesh position={[0.07, 0, 0.02]}>
          <sphereGeometry args={[0.012, 16, 16]} />
          <meshStandardMaterial color={eyeColor} />
        </mesh>
      </group>

      {/* Arms */}
      <group>
        {/* Left arm */}
        <mesh position={[-bodyWidth - 0.1, 0.9, 0]} rotation={[0, 0, 0.2]} castShadow>
          <capsuleGeometry args={[0.08, 0.5, 8, 16]} />
          <meshStandardMaterial color={skinColor} roughness={0.8} />
        </mesh>

        {/* Right arm */}
        <mesh position={[bodyWidth + 0.1, 0.9, 0]} rotation={[0, 0, -0.2]} castShadow>
          <capsuleGeometry args={[0.08, 0.5, 8, 16]} />
          <meshStandardMaterial color={skinColor} roughness={0.8} />
        </mesh>
      </group>

      {/* Legs */}
      <group>
        {/* Left leg */}
        <mesh position={[-0.12, 0.35, 0]} castShadow>
          <capsuleGeometry args={[0.1, 0.5, 8, 16]} />
          <meshStandardMaterial color="#2a2a3a" roughness={0.9} />
        </mesh>

        {/* Right leg */}
        <mesh position={[0.12, 0.35, 0]} castShadow>
          <capsuleGeometry args={[0.1, 0.5, 8, 16]} />
          <meshStandardMaterial color="#2a2a3a" roughness={0.9} />
        </mesh>
      </group>

      {/* Ground plane for reference */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <circleGeometry args={[1, 32]} />
        <meshStandardMaterial color="#1a1a1a" transparent opacity={0.5} />
      </mesh>
    </group>
  );
}
