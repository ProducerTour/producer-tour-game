/**
 * CharacterPreview3D
 * 3D canvas showing the avatar with:
 * - Orbit camera controls (drag to rotate)
 * - Animation preview buttons
 * - Zoom controls
 */

import { Suspense, useRef, useCallback, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';

import {
  useCharacterCreatorStore,
  useCharacterConfig,
  usePreviewState,
  type PreviewAnimation,
} from '../../stores/characterCreator.store';
import { HEIGHT_CONFIG } from '../../lib/character/defaults';

// Animation button options
const ANIMATIONS: { id: PreviewAnimation; label: string }[] = [
  { id: 'idle', label: 'Idle' },
  { id: 'walk', label: 'Walk' },
  { id: 'dance', label: 'Dance' },
  { id: 'wave', label: 'Wave' },
];

export function CharacterPreview3D() {
  const { animation, zoom } = usePreviewState();
  const setPreviewAnimation = useCharacterCreatorStore((s) => s.setPreviewAnimation);
  const setCameraZoom = useCharacterCreatorStore((s) => s.setCameraZoom);
  const resetCamera = useCharacterCreatorStore((s) => s.resetCamera);

  const handleZoomIn = useCallback(() => {
    setCameraZoom(Math.min(zoom + 0.2, 2.0));
  }, [zoom, setCameraZoom]);

  const handleZoomOut = useCallback(() => {
    setCameraZoom(Math.max(zoom - 0.2, 0.5));
  }, [zoom, setCameraZoom]);

  return (
    <div className="relative w-full h-full bg-gradient-to-b from-[#1a1d21] to-[#0a0a0f]">
      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [0, 1.2, 3], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 1.5]}
        shadows
      >
        <Suspense fallback={null}>
          <SceneContent zoom={zoom} />
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
 * Scene content with avatar and environment
 */
function SceneContent({ zoom }: { zoom: number }) {
  const config = useCharacterConfig();
  const { animation } = usePreviewState();
  const controlsRef = useRef<any>(null);

  // Calculate avatar scale based on height
  const avatarScale = useMemo(() => {
    const heightMeters = HEIGHT_CONFIG.toMeters(config.height);
    return heightMeters / 1.75; // 1.75m is baseline
  }, [config.height]);

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[5, 5, 5]}
        intensity={1}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight position={[-5, 3, -5]} intensity={0.3} />

      {/* Environment for reflections */}
      <Environment preset="city" />

      {/* Ground shadow */}
      <ContactShadows
        position={[0, -0.01, 0]}
        opacity={0.4}
        scale={10}
        blur={2}
        far={4}
      />

      {/* Avatar Placeholder */}
      <PlaceholderAvatar
        config={config}
        scale={avatarScale}
        animation={animation}
      />

      {/* Orbit Controls */}
      <OrbitControls
        ref={controlsRef}
        target={[0, 1, 0]}
        minPolarAngle={Math.PI * 0.2}
        maxPolarAngle={Math.PI * 0.8}
        minDistance={1.5 * zoom}
        maxDistance={5 * zoom}
        enablePan={false}
        enableDamping
        dampingFactor={0.05}
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

  // Calculate body proportions based on build
  const bodyWidth = useMemo(() => {
    switch (config.build) {
      case 'slim': return 0.35;
      case 'average': return 0.4;
      case 'athletic': return 0.45;
      case 'heavy': return 0.5;
      default: return 0.4;
    }
  }, [config.build]);

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

      case 'wave':
        // Wave animation - just head tilt
        if (headRef.current) {
          headRef.current.rotation.z = Math.sin(time * 3) * 0.1;
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
