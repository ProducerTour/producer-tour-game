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

// Shared geometry for muzzle flash (reused across instances)
const muzzleFlashGeometry = new THREE.SphereGeometry(1, 8, 8);

// Muzzle Flash Effect
export function MuzzleFlash({ effect }: ParticleEffectProps) {
  const ref = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);

  // Create material once per instance (not shared to avoid opacity conflicts)
  const material = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#ffaa00',
    transparent: true,
    blending: THREE.AdditiveBlending,
  }), []);

  const age = Date.now() - effect.createdAt;
  const progress = age / effect.duration;

  // Quick flash that fades
  const opacity = Math.max(0, 1 - progress * 2);
  const scale = 0.2 + progress * 0.3;

  // Update material opacity via useFrame instead of recreating material on each render
  useFrame(() => {
    const currentProgress = (Date.now() - effect.createdAt) / effect.duration;
    material.opacity = Math.max(0, 1 - currentProgress * 2);
  });

  if (opacity <= 0) return null;

  return (
    <group
      ref={ref}
      position={[effect.position.x, effect.position.y, effect.position.z]}
      rotation={effect.rotation ? [effect.rotation.x, effect.rotation.y, effect.rotation.z] : undefined}
    >
      {/* Core flash - uses shared geometry, instance-specific material */}
      <mesh ref={meshRef} scale={scale} geometry={muzzleFlashGeometry} material={material} />

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

// Shared geometries for bullet impact (reused across instances)
const bulletImpactParticleGeometry = new THREE.SphereGeometry(1, 4, 4);
const bulletImpactDecalGeometry = new THREE.RingGeometry(0, 0.1, 8);

// Shared geometries for other effects
const smokeGeometry = new THREE.SphereGeometry(1, 8, 8);
const footstepDustGeometry = new THREE.CircleGeometry(1, 8);

// Bullet Impact Effect
export function BulletImpact({ effect }: ParticleEffectProps) {
  const ref = useRef<THREE.Group>(null);
  const particlesRef = useRef<THREE.InstancedMesh>(null);

  // Pre-allocated objects for useFrame (avoid GC pressure)
  const frameObjects = useRef({
    matrix: new THREE.Matrix4(),
    tempVec: new THREE.Vector3(),
    scaleVec: new THREE.Vector3(),
  });

  // Create materials once per instance
  const sparkMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: effect.color || '#ffaa00',
    transparent: true,
  }), [effect.color]);

  const decalMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#333',
    transparent: true,
    side: THREE.DoubleSide,
  }), []);

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

  // Update particles and material opacity
  useFrame((_, delta) => {
    if (!particlesRef.current) return;

    const { matrix, tempVec, scaleVec } = frameObjects.current;
    const gravity = -9.8;
    const currentProgress = (Date.now() - effect.createdAt) / effect.duration;

    // Update material opacity
    sparkMaterial.opacity = 1 - currentProgress;
    decalMaterial.opacity = 0.5 * (1 - currentProgress);

    particles.forEach((p, i) => {
      // Update position - use tempVec instead of cloning
      tempVec.copy(p.velocity).multiplyScalar(delta);
      p.position.add(tempVec);
      p.velocity.y += gravity * delta;
      p.life -= delta * 2;

      // Update instance matrix - reuse scaleVec
      matrix.setPosition(
        effect.position.x + p.position.x,
        effect.position.y + p.position.y,
        effect.position.z + p.position.z
      );
      scaleVec.set(p.size, p.size, p.size);
      matrix.scale(scaleVec);
      particlesRef.current!.setMatrixAt(i, matrix);
    });

    particlesRef.current.instanceMatrix.needsUpdate = true;
  });

  if (progress >= 1) return null;

  return (
    <group ref={ref}>
      {/* Spark particles - uses shared geometry, instance-specific memoized material */}
      <instancedMesh
        ref={particlesRef}
        args={[bulletImpactParticleGeometry, sparkMaterial, particles.length]}
      />

      {/* Impact decal/mark - uses shared geometry, instance-specific memoized material */}
      <mesh
        position={[effect.position.x, effect.position.y, effect.position.z]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={1 + progress * 2}
        geometry={bulletImpactDecalGeometry}
        material={decalMaterial}
      />
    </group>
  );
}

// Shared geometry for sparkle effect
const sparkleGeometry = new THREE.OctahedronGeometry(1, 0);

// Sparkle Effect (for pickups, objectives)
export function Sparkle({ effect }: ParticleEffectProps) {
  const ref = useRef<THREE.Group>(null);
  const materialsRef = useRef<THREE.MeshBasicMaterial[]>([]);
  const age = Date.now() - effect.createdAt;
  const progress = age / effect.duration;

  const sparkles = useMemo(() => {
    return Array(6).fill(0).map((_, i) => ({
      angle: (i / 6) * Math.PI * 2,
      delay: i * 0.1,
      size: 0.1 + Math.random() * 0.1,
    }));
  }, []);

  // Create materials once per instance (one per sparkle particle)
  const materials = useMemo(() => {
    const mats = sparkles.map(() => new THREE.MeshBasicMaterial({
      color: effect.color || '#fbbf24',
      transparent: true,
      opacity: 1,
    }));
    materialsRef.current = mats;
    return mats;
  }, [effect.color, sparkles]);

  // Update material opacities in useFrame (avoids recreating materials)
  useFrame(() => {
    const currentProgress = (Date.now() - effect.createdAt) / effect.duration;
    sparkles.forEach((sparkle, i) => {
      const localProgress = Math.max(0, Math.min(1, (currentProgress - sparkle.delay) / 0.5));
      const opacity = localProgress < 0.5 ? localProgress * 2 : (1 - localProgress) * 2;
      if (materialsRef.current[i]) {
        materialsRef.current[i].opacity = opacity;
      }
    });
  });

  if (progress >= 1) return null;

  return (
    <group
      ref={ref}
      position={[effect.position.x, effect.position.y, effect.position.z]}
    >
      {sparkles.map((sparkle, i) => {
        const localProgress = Math.max(0, Math.min(1, (progress - sparkle.delay) / 0.5));
        const y = localProgress * 1.5;

        return (
          <mesh
            key={i}
            position={[
              Math.cos(sparkle.angle + progress * 3) * 0.3,
              y,
              Math.sin(sparkle.angle + progress * 3) * 0.3,
            ]}
            scale={sparkle.size * (1 - localProgress * 0.5)}
            geometry={sparkleGeometry}
            material={materials[i]}
          />
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

  // Create material once per instance
  const material = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#666',
    transparent: true,
  }), []);

  const scale = (effect.scale || 1) * (0.5 + progress * 2);
  const opacity = Math.max(0, 0.5 * (1 - progress));

  // Update material opacity via useFrame
  useFrame(() => {
    const currentProgress = (Date.now() - effect.createdAt) / effect.duration;
    material.opacity = Math.max(0, 0.5 * (1 - currentProgress));
  });

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
      <mesh scale={scale} geometry={smokeGeometry} material={material} />
    </group>
  );
}

// Shared geometry for heal effect
const healParticleGeometry = new THREE.SphereGeometry(1, 6, 6);

// Heal Effect (rising green particles)
export function HealEffect({ effect }: ParticleEffectProps) {
  const ref = useRef<THREE.Group>(null);
  const materialsRef = useRef<THREE.MeshBasicMaterial[]>([]);
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

  // Create materials once per instance (one per particle)
  const materials = useMemo(() => {
    const mats = particles.map(() => new THREE.MeshBasicMaterial({
      color: '#22c55e',
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
    }));
    materialsRef.current = mats;
    return mats;
  }, [particles]);

  // Update material opacities in useFrame (avoids recreating materials)
  useFrame(() => {
    const currentProgress = (Date.now() - effect.createdAt) / effect.duration;
    const opacity = currentProgress < 0.3 ? currentProgress / 0.3 : 1 - (currentProgress - 0.3) / 0.7;
    materialsRef.current.forEach((mat) => {
      mat.opacity = opacity * 0.8;
    });
  });

  if (progress >= 1) return null;

  return (
    <group ref={ref} position={[effect.position.x, effect.position.y, effect.position.z]}>
      {particles.map((p, i) => {
        const y = p.startY + progress * 2 * p.speed;
        const radius = 0.5 + progress * 0.3;
        const angle = p.angle + progress * 2;

        return (
          <mesh
            key={i}
            position={[
              Math.cos(angle) * radius,
              y,
              Math.sin(angle) * radius,
            ]}
            scale={p.size}
            geometry={healParticleGeometry}
            material={materials[i]}
          />
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

  // Create material once per instance
  const material = useMemo(() => new THREE.MeshBasicMaterial({
    color: '#8b7355',
    transparent: true,
    side: THREE.DoubleSide,
  }), []);

  const scale = (effect.scale || 0.5) * (1 + progress * 2);
  const opacity = Math.max(0, 0.3 * (1 - progress));

  // Update material opacity via useFrame
  useFrame(() => {
    const currentProgress = (Date.now() - effect.createdAt) / effect.duration;
    material.opacity = Math.max(0, 0.3 * (1 - currentProgress));
  });

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
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[scale, scale, 1]}
        geometry={footstepDustGeometry}
        material={material}
      />
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
