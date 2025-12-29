import { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface WarpTunnelProps {
  isActive: boolean;
  progress: number; // 0 to 1 for animation progress
  direction: 'in' | 'out'; // entering or exiting
}

// Individual speed streak for warp effect
function WarpStreak({
  angle,
  baseRadius,
  length,
  progress,
  direction
}: {
  angle: number;
  baseRadius: number;
  length: number;
  progress: number;
  direction: 'in' | 'out';
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);

  useFrame((state) => {
    if (!meshRef.current || !materialRef.current) return;

    const time = state.clock.elapsedTime;

    // Animate streaks moving toward/away from center
    const animatedLength = length * (0.5 + Math.sin(time * 8 + angle * 3) * 0.5);
    const animatedRadius = baseRadius * (direction === 'in' ? (1 - progress * 0.5) : (0.5 + progress * 0.5));

    // Position around the tunnel
    const x = Math.cos(angle) * animatedRadius;
    const y = Math.sin(angle) * animatedRadius;
    const z = direction === 'in'
      ? -20 + progress * 40 + Math.sin(time * 10 + angle) * 5
      : -20 + (1 - progress) * 40 + Math.sin(time * 10 + angle) * 5;

    meshRef.current.position.set(x, y, z);
    meshRef.current.scale.set(0.1, 0.1, animatedLength);
    meshRef.current.rotation.set(0, 0, angle);

    // Color transition: blue -> purple -> white
    const colorProgress = progress;
    const color = new THREE.Color();
    if (colorProgress < 0.5) {
      color.lerpColors(new THREE.Color('#3b82f6'), new THREE.Color('#a855f7'), colorProgress * 2);
    } else {
      color.lerpColors(new THREE.Color('#a855f7'), new THREE.Color('#ffffff'), (colorProgress - 0.5) * 2);
    }
    materialRef.current.color = color;

    // Fade in/out
    const fadeIn = Math.min(1, progress * 3);
    const fadeOut = Math.max(0, (1 - progress) * 3);
    materialRef.current.opacity = Math.min(fadeIn, fadeOut) * 0.8;
  });

  return (
    <mesh ref={meshRef}>
      <cylinderGeometry args={[1, 1, 1, 4]} />
      <meshBasicMaterial
        ref={materialRef}
        color="#3b82f6"
        transparent
        opacity={0}
        depthWrite={false}
      />
    </mesh>
  );
}

// Central vortex effect
function WarpVortex({ progress }: { progress: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);

  useFrame((state) => {
    if (!meshRef.current || !materialRef.current) return;

    const time = state.clock.elapsedTime;

    // Rotate and pulse
    meshRef.current.rotation.z = time * 3;
    const scale = 5 + Math.sin(time * 5) * 2 + progress * 10;
    meshRef.current.scale.setScalar(scale);

    // Opacity pulse
    materialRef.current.opacity = (0.3 + Math.sin(time * 8) * 0.1) * progress;
  });

  return (
    <mesh ref={meshRef} position={[0, 0, -30]}>
      <ringGeometry args={[0.5, 1, 32]} />
      <meshBasicMaterial
        ref={materialRef}
        color="#ffffff"
        transparent
        opacity={0}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}

// Camera FOV controller for warp distortion
function WarpCamera({ progress, isActive }: { progress: number; isActive: boolean }) {
  const { camera } = useThree();
  const baseFov = useRef(55);

  useFrame(() => {
    if (!isActive && (camera as THREE.PerspectiveCamera).fov === baseFov.current) return;

    const perspCamera = camera as THREE.PerspectiveCamera;
    const targetFov = isActive ? 55 + progress * 35 : 55; // Expand from 55 to 90
    perspCamera.fov = THREE.MathUtils.lerp(perspCamera.fov, targetFov, 0.1);
    perspCamera.updateProjectionMatrix();
  });

  return null;
}

export function WarpTunnel({ isActive, progress, direction }: WarpTunnelProps) {
  // Generate streak positions
  const streaks = useMemo(() => {
    const result: { angle: number; radius: number; length: number }[] = [];
    const numRings = 4;
    const streaksPerRing = 24;

    for (let ring = 0; ring < numRings; ring++) {
      const radius = 3 + ring * 2;
      for (let i = 0; i < streaksPerRing; i++) {
        const angle = (i / streaksPerRing) * Math.PI * 2 + ring * 0.2;
        result.push({
          angle,
          radius,
          length: 3 + Math.random() * 4
        });
      }
    }
    return result;
  }, []);

  if (!isActive) return null;

  return (
    <group>
      {/* Speed streaks */}
      {streaks.map((streak, i) => (
        <WarpStreak
          key={i}
          angle={streak.angle}
          baseRadius={streak.radius}
          length={streak.length}
          progress={progress}
          direction={direction}
        />
      ))}

      {/* Central vortex */}
      <WarpVortex progress={progress} />

      {/* Camera FOV distortion */}
      <WarpCamera progress={progress} isActive={isActive} />

      {/* Ambient glow */}
      <pointLight
        position={[0, 0, -20]}
        intensity={progress * 5}
        color="#a855f7"
        distance={50}
      />
    </group>
  );
}

export default WarpTunnel;
