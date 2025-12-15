/**
 * Particle Effects Components
 * Visual effects using instanced particles
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { type VFXInstance } from './useVFXStore';

// Simple particle for basic effects
interface ParticleData {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  size: number;
  color: THREE.Color;
}

interface ParticleEffectProps {
  effect: VFXInstance;
}

// Muzzle Flash Effect
export function MuzzleFlash({ effect }: ParticleEffectProps) {
  const ref = useRef<THREE.Group>(null);
  const age = Date.now() - effect.createdAt;
  const progress = age / effect.duration;

  // Quick flash that fades
  const opacity = Math.max(0, 1 - progress * 2);
  const scale = 0.2 + progress * 0.3;

  if (opacity <= 0) return null;

  return (
    <group
      ref={ref}
      position={[effect.position.x, effect.position.y, effect.position.z]}
      rotation={effect.rotation ? [effect.rotation.x, effect.rotation.y, effect.rotation.z] : undefined}
    >
      {/* Core flash */}
      <mesh scale={scale}>
        <sphereGeometry args={[1, 8, 8]} />
        <meshBasicMaterial
          color="#ffaa00"
          transparent
          opacity={opacity}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Light */}
      <pointLight
        color="#ff8800"
        intensity={opacity * 3}
        distance={5}
        decay={2}
      />
    </group>
  );
}

// Bullet Impact Effect
export function BulletImpact({ effect }: ParticleEffectProps) {
  const ref = useRef<THREE.Group>(null);
  const particlesRef = useRef<THREE.InstancedMesh>(null);

  const age = Date.now() - effect.createdAt;
  const progress = age / effect.duration;

  // Generate particles
  const particles = useMemo(() => {
    const count = 8;
    const data: ParticleData[] = [];

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const speed = 2 + Math.random() * 2;
      data.push({
        position: new THREE.Vector3(0, 0, 0),
        velocity: new THREE.Vector3(
          Math.cos(angle) * speed,
          1 + Math.random() * 2,
          Math.sin(angle) * speed
        ),
        life: 1,
        maxLife: 1,
        size: 0.02 + Math.random() * 0.03,
        color: new THREE.Color(effect.color || '#888888'),
      });
    }

    return data;
  }, [effect.color]);

  // Update particles
  useFrame((_, delta) => {
    if (!particlesRef.current) return;

    const matrix = new THREE.Matrix4();
    const gravity = -9.8;

    particles.forEach((p, i) => {
      // Update position
      p.position.add(p.velocity.clone().multiplyScalar(delta));
      p.velocity.y += gravity * delta;
      p.life -= delta * 2;

      // Update instance matrix
      matrix.setPosition(
        effect.position.x + p.position.x,
        effect.position.y + p.position.y,
        effect.position.z + p.position.z
      );
      matrix.scale(new THREE.Vector3(p.size, p.size, p.size));
      particlesRef.current!.setMatrixAt(i, matrix);
    });

    particlesRef.current.instanceMatrix.needsUpdate = true;
  });

  if (progress >= 1) return null;

  return (
    <group ref={ref}>
      {/* Spark particles */}
      <instancedMesh ref={particlesRef} args={[undefined, undefined, particles.length]}>
        <sphereGeometry args={[1, 4, 4]} />
        <meshBasicMaterial
          color={effect.color || '#ffaa00'}
          transparent
          opacity={1 - progress}
        />
      </instancedMesh>

      {/* Impact decal/mark */}
      <mesh
        position={[effect.position.x, effect.position.y, effect.position.z]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[0, 0.1 + progress * 0.2, 8]} />
        <meshBasicMaterial
          color="#333"
          transparent
          opacity={0.5 * (1 - progress)}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

// Sparkle Effect (for pickups, objectives)
export function Sparkle({ effect }: ParticleEffectProps) {
  const ref = useRef<THREE.Group>(null);
  const age = Date.now() - effect.createdAt;
  const progress = age / effect.duration;

  const sparkles = useMemo(() => {
    return Array(6).fill(0).map((_, i) => ({
      angle: (i / 6) * Math.PI * 2,
      delay: i * 0.1,
      size: 0.1 + Math.random() * 0.1,
    }));
  }, []);

  if (progress >= 1) return null;

  return (
    <group
      ref={ref}
      position={[effect.position.x, effect.position.y, effect.position.z]}
    >
      {sparkles.map((sparkle, i) => {
        const localProgress = Math.max(0, Math.min(1, (progress - sparkle.delay) / 0.5));
        const y = localProgress * 1.5;
        const opacity = localProgress < 0.5 ? localProgress * 2 : (1 - localProgress) * 2;

        return (
          <mesh
            key={i}
            position={[
              Math.cos(sparkle.angle + progress * 3) * 0.3,
              y,
              Math.sin(sparkle.angle + progress * 3) * 0.3,
            ]}
            scale={sparkle.size * (1 - localProgress * 0.5)}
          >
            <octahedronGeometry args={[1, 0]} />
            <meshBasicMaterial
              color={effect.color || '#fbbf24'}
              transparent
              opacity={opacity}
            />
          </mesh>
        );
      })}

      <pointLight
        color={effect.color || '#fbbf24'}
        intensity={(1 - progress) * 2}
        distance={3}
      />
    </group>
  );
}

// Smoke Effect
export function Smoke({ effect }: ParticleEffectProps) {
  const ref = useRef<THREE.Group>(null);
  const age = Date.now() - effect.createdAt;
  const progress = age / effect.duration;

  const scale = (effect.scale || 1) * (0.5 + progress * 2);
  const opacity = Math.max(0, 0.5 * (1 - progress));

  if (opacity <= 0) return null;

  return (
    <group
      ref={ref}
      position={[
        effect.position.x,
        effect.position.y + progress * 2,
        effect.position.z,
      ]}
    >
      <mesh scale={scale}>
        <sphereGeometry args={[1, 8, 8]} />
        <meshBasicMaterial
          color="#666"
          transparent
          opacity={opacity}
        />
      </mesh>
    </group>
  );
}

// Heal Effect (rising green particles)
export function HealEffect({ effect }: ParticleEffectProps) {
  const ref = useRef<THREE.Group>(null);
  const age = Date.now() - effect.createdAt;
  const progress = age / effect.duration;

  const particles = useMemo(() => {
    return Array(12).fill(0).map((_, i) => ({
      angle: (i / 12) * Math.PI * 2,
      speed: 0.5 + Math.random() * 0.5,
      size: 0.08 + Math.random() * 0.04,
      startY: Math.random() * 0.5,
    }));
  }, []);

  if (progress >= 1) return null;

  return (
    <group ref={ref} position={[effect.position.x, effect.position.y, effect.position.z]}>
      {particles.map((p, i) => {
        const y = p.startY + progress * 2 * p.speed;
        const radius = 0.5 + progress * 0.3;
        const angle = p.angle + progress * 2;
        const opacity = progress < 0.3 ? progress / 0.3 : 1 - (progress - 0.3) / 0.7;

        return (
          <mesh
            key={i}
            position={[
              Math.cos(angle) * radius,
              y,
              Math.sin(angle) * radius,
            ]}
            scale={p.size}
          >
            <sphereGeometry args={[1, 6, 6]} />
            <meshBasicMaterial
              color="#22c55e"
              transparent
              opacity={opacity * 0.8}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        );
      })}

      <pointLight color="#22c55e" intensity={(1 - progress) * 2} distance={3} />
    </group>
  );
}

// Footstep Dust Effect
export function FootstepDust({ effect }: ParticleEffectProps) {
  const ref = useRef<THREE.Group>(null);
  const age = Date.now() - effect.createdAt;
  const progress = age / effect.duration;

  const scale = (effect.scale || 0.5) * (1 + progress * 2);
  const opacity = Math.max(0, 0.3 * (1 - progress));

  if (opacity <= 0) return null;

  return (
    <group
      ref={ref}
      position={[
        effect.position.x,
        effect.position.y + progress * 0.3,
        effect.position.z,
      ]}
    >
      <mesh rotation={[-Math.PI / 2, 0, 0]} scale={[scale, scale, 1]}>
        <circleGeometry args={[1, 8]} />
        <meshBasicMaterial
          color="#8b7355"
          transparent
          opacity={opacity}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

// Effect renderer that picks the right component
export function VFXRenderer({ effect }: ParticleEffectProps) {
  switch (effect.type) {
    case 'muzzleFlash':
      return <MuzzleFlash effect={effect} />;
    case 'bulletImpact':
      return <BulletImpact effect={effect} />;
    case 'sparkle':
      return <Sparkle effect={effect} />;
    case 'smoke':
      return <Smoke effect={effect} />;
    case 'heal':
      return <HealEffect effect={effect} />;
    case 'footstepDust':
      return <FootstepDust effect={effect} />;
    // Add more effect renderers as needed
    default:
      return null;
  }
}

export default VFXRenderer;
