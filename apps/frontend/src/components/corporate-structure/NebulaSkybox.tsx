import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Sparkles } from '@react-three/drei';

// Nebula cloud layer component
function NebulaCloud({
  color,
  position,
  scale,
  opacity = 0.15,
  rotationSpeed = 0.001
}: {
  color: string;
  position: [number, number, number];
  scale: number;
  opacity?: number;
  rotationSpeed?: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += rotationSpeed;
      meshRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.1) * 0.02;
    }
  });

  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[scale, 32, 32]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={opacity}
        side={THREE.BackSide}
        depthWrite={false}
      />
    </mesh>
  );
}

// Distant galaxy sprite
function GalaxySprite({
  position,
  color,
  size
}: {
  position: [number, number, number];
  color: string;
  size: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      // Subtle twinkle
      const twinkle = Math.sin(state.clock.elapsedTime * 2 + position[0]) * 0.2 + 0.8;
      const material = meshRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = 0.6 * twinkle;
    }
  });

  return (
    <mesh ref={meshRef} position={position}>
      <circleGeometry args={[size, 16]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.6}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}

// Main Nebula Skybox component
export function NebulaSkybox() {
  // Generate distant galaxy positions
  const galaxies = useMemo(() => {
    const positions: { position: [number, number, number]; color: string; size: number }[] = [];
    for (let i = 0; i < 20; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const r = 400 + Math.random() * 100;
      positions.push({
        position: [
          r * Math.sin(phi) * Math.cos(theta),
          r * Math.cos(phi),
          r * Math.sin(phi) * Math.sin(theta)
        ],
        color: ['#a78bfa', '#ec4899', '#60a5fa', '#f472b6'][Math.floor(Math.random() * 4)],
        size: 2 + Math.random() * 4
      });
    }
    return positions;
  }, []);

  return (
    <group>
      {/* Deep space background sphere */}
      <mesh>
        <sphereGeometry args={[600, 64, 64]} />
        <meshBasicMaterial
          color="#050510"
          side={THREE.BackSide}
        />
      </mesh>

      {/* Large nebula clouds - layered for depth */}
      <NebulaCloud
        color="#4c1d95"
        position={[-200, 100, -300]}
        scale={250}
        opacity={0.08}
        rotationSpeed={0.0005}
      />
      <NebulaCloud
        color="#1e3a8a"
        position={[250, -50, -250]}
        scale={200}
        opacity={0.06}
        rotationSpeed={-0.0003}
      />
      <NebulaCloud
        color="#831843"
        position={[0, 200, -400]}
        scale={300}
        opacity={0.05}
        rotationSpeed={0.0002}
      />
      <NebulaCloud
        color="#164e63"
        position={[-300, -100, -200]}
        scale={180}
        opacity={0.07}
        rotationSpeed={-0.0004}
      />

      {/* Medium nebula wisps */}
      <NebulaCloud
        color="#7c3aed"
        position={[150, 80, -350]}
        scale={120}
        opacity={0.1}
        rotationSpeed={0.0008}
      />
      <NebulaCloud
        color="#db2777"
        position={[-180, 150, -280]}
        scale={100}
        opacity={0.12}
        rotationSpeed={-0.0006}
      />

      {/* Distant galaxies */}
      {galaxies.map((galaxy, i) => (
        <GalaxySprite
          key={i}
          position={galaxy.position}
          color={galaxy.color}
          size={galaxy.size}
        />
      ))}

      {/* Additional star layers for depth */}
      <Sparkles
        count={200}
        scale={500}
        size={1.5}
        speed={0.05}
        color="#e0e7ff"
        opacity={0.4}
      />
      <Sparkles
        count={100}
        scale={400}
        size={3}
        speed={0.02}
        color="#c4b5fd"
        opacity={0.3}
      />

      {/* Faint cosmic dust band */}
      <mesh rotation={[0.3, 0, 0.1]}>
        <torusGeometry args={[450, 80, 8, 64]} />
        <meshBasicMaterial
          color="#1e1b4b"
          transparent
          opacity={0.03}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

export default NebulaSkybox;
