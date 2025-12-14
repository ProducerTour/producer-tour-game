import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, Float, Sparkles, Billboard, Text } from '@react-three/drei';
import * as THREE from 'three';
import {
  FileText,
  CheckCircle2,
  Building2,
  ExternalLink
} from 'lucide-react';

// Interactive station in the interior
function InteractiveStation({
  position,
  label,
  icon: Icon,
  color,
  onClick,
  isActive
}: {
  position: [number, number, number];
  label: string;
  icon: typeof FileText;
  color: string;
  onClick: () => void;
  isActive: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (meshRef.current) {
      const time = state.clock.elapsedTime;
      meshRef.current.position.y = position[1] + Math.sin(time * 2 + position[0]) * 0.4;
      meshRef.current.rotation.y += 0.01;

      const material = meshRef.current.material as THREE.MeshStandardMaterial;
      material.emissiveIntensity = hovered || isActive ? 0.8 : 0.3 + Math.sin(time * 2) * 0.1;
    }
  });

  return (
    <group position={position}>
      <Float speed={1.5} floatIntensity={0.5}>
        <mesh
          ref={meshRef}
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          onPointerOver={() => {
            setHovered(true);
            document.body.style.cursor = 'pointer';
          }}
          onPointerOut={() => {
            setHovered(false);
            document.body.style.cursor = 'auto';
          }}
        >
          <dodecahedronGeometry args={[2.4, 0]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.3}
            metalness={0.6}
            roughness={0.2}
            transparent
            opacity={0.9}
          />
        </mesh>
      </Float>

      {/* Sparkle effect */}
      <Sparkles
        count={isActive ? 60 : 30}
        scale={6}
        size={isActive ? 5 : 3}
        speed={0.5}
        color={color}
      />

      {/* Label */}
      <Billboard follow lockX={false} lockY={false} lockZ={false}>
        <Html
          center
          position={[0, 5, 0]}
          style={{ pointerEvents: 'none', zIndex: 1 }}
          zIndexRange={[1, 10]}
        >
          <div
            className={`px-3 py-1.5 rounded-lg text-white text-sm font-medium whitespace-nowrap transition-all ${
              hovered || isActive ? 'scale-110' : ''
            }`}
            style={{
              backgroundColor: `${color}cc`,
              boxShadow: hovered || isActive ? `0 0 20px ${color}` : 'none',
            }}
          >
            <Icon className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
            {label}
          </div>
        </Html>
      </Billboard>
    </group>
  );
}

// Exit portal component
function ExitPortal({
  position,
  onExit
}: {
  position: [number, number, number];
  onExit: () => void;
}) {
  const portalRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    const time = state.clock.elapsedTime;

    if (portalRef.current) {
      const material = portalRef.current.material as THREE.MeshBasicMaterial;
      material.opacity = 0.3 + Math.sin(time * 3) * 0.1;
    }

    if (ringRef.current) {
      ringRef.current.rotation.z = time * 0.5;
      const scale = hovered ? 1.2 : 1;
      ringRef.current.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.1);
    }
  });

  return (
    <group position={position}>
      {/* Portal surface */}
      <mesh
        ref={portalRef}
        onClick={(e) => {
          e.stopPropagation();
          onExit();
        }}
        onPointerOver={() => {
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = 'auto';
        }}
      >
        <circleGeometry args={[6, 32]} />
        <meshBasicMaterial
          color="#3b82f6"
          transparent
          opacity={0.4}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Rotating ring */}
      <mesh ref={ringRef}>
        <torusGeometry args={[7, 0.3, 16, 64]} />
        <meshBasicMaterial
          color="#60a5fa"
          transparent
          opacity={0.8}
        />
      </mesh>

      {/* Inner glow */}
      <pointLight position={[0, 0, 2]} intensity={3} color="#3b82f6" distance={20} />

      {/* Particles */}
      <Sparkles
        count={80}
        scale={16}
        size={4}
        speed={1}
        color="#60a5fa"
        opacity={0.6}
      />

      {/* Label */}
      <Billboard>
        <Html center position={[0, 10, 0]} style={{ zIndex: 1 }} zIndexRange={[1, 10]}>
          <div className="px-4 py-2 bg-blue-500/80 backdrop-blur rounded-lg text-white font-medium">
            <ExternalLink className="w-4 h-4 inline-block mr-2 -mt-0.5" />
            Exit to Space
          </div>
        </Html>
      </Billboard>
    </group>
  );
}

// Crystal floor environment
function CrystalEnvironment() {
  const floorRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (floorRef.current) {
      const material = floorRef.current.material as THREE.MeshStandardMaterial;
      material.emissiveIntensity = 0.05 + Math.sin(state.clock.elapsedTime * 0.5) * 0.02;
    }
  });

  return (
    <>
      {/* Crystalline floor - 2x scale */}
      <mesh ref={floorRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]} receiveShadow>
        <circleGeometry args={[100, 64]} />
        <meshStandardMaterial
          color="#1e3a5f"
          emissive="#3b82f6"
          emissiveIntensity={0.05}
          metalness={0.8}
          roughness={0.2}
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* Grid lines on floor - 2x scale */}
      {Array.from({ length: 20 }).map((_, i) => (
        <mesh
          key={`h-${i}`}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, -1.99, -100 + i * 10]}
        >
          <planeGeometry args={[200, 0.08]} />
          <meshBasicMaterial color="#3b82f6" transparent opacity={0.2} />
        </mesh>
      ))}
      {Array.from({ length: 20 }).map((_, i) => (
        <mesh
          key={`v-${i}`}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[-100 + i * 10, -1.99, 0]}
        >
          <planeGeometry args={[0.08, 200]} />
          <meshBasicMaterial color="#3b82f6" transparent opacity={0.2} />
        </mesh>
      ))}

      {/* Dome skybox - blue crystalline - 2x scale */}
      <mesh>
        <sphereGeometry args={[200, 32, 32]} />
        <meshBasicMaterial
          color="#0a1929"
          side={THREE.BackSide}
        />
      </mesh>

      {/* Ambient particles - 2x scale */}
      <Sparkles
        count={500}
        scale={160}
        size={3}
        speed={0.2}
        color="#60a5fa"
        opacity={0.4}
      />

      {/* Central light pillar - 2x scale */}
      <mesh position={[0, 50, 0]}>
        <cylinderGeometry args={[1, 4, 100, 16]} />
        <meshBasicMaterial
          color="#3b82f6"
          transparent
          opacity={0.1}
        />
      </mesh>
    </>
  );
}

interface HoldingsInteriorProps {
  onExit: () => void;
  isActive: boolean;
}

// Simplified HoldingsInterior - 3D environment only
// Quest UI is now handled by HoldingsHUD component outside the Canvas
export function HoldingsInterior({ onExit, isActive }: HoldingsInteriorProps) {
  if (!isActive) return null;

  return (
    <>
      {/* 3D Environment */}
      <CrystalEnvironment />

      {/* Lighting - 2x positions */}
      <ambientLight intensity={0.3} />
      <pointLight position={[0, 40, 0]} intensity={3} color="#60a5fa" />
      <pointLight position={[20, 10, 20]} intensity={1.5} color="#3b82f6" />
      <pointLight position={[-20, 10, -20]} intensity={1.5} color="#a855f7" />

      {/* Decorative Stations - 2x positions */}
      <InteractiveStation
        position={[-16, 0, -10]}
        label="Compliance Tasks"
        icon={CheckCircle2}
        color="#22c55e"
        onClick={() => {}}
        isActive={false}
      />

      <InteractiveStation
        position={[16, 0, -10]}
        label="Documents"
        icon={FileText}
        color="#a855f7"
        onClick={() => {}}
        isActive={false}
      />

      <InteractiveStation
        position={[0, 0, -24]}
        label="Holdings Overview"
        icon={Building2}
        color="#3b82f6"
        onClick={() => {}}
        isActive={false}
      />

      {/* Exit Portal - 2x position */}
      <ExitPortal position={[0, 6, 40]} onExit={onExit} />

      {/* Central title - 2x positions and sizes */}
      <Text
        position={[0, 24, 0]}
        fontSize={4}
        color="#60a5fa"
        anchorX="center"
        anchorY="middle"
      >
        Producer Tour Holdings, Inc.
      </Text>
      <Text
        position={[0, 19, 0]}
        fontSize={1.6}
        color="#94a3b8"
        anchorX="center"
        anchorY="middle"
      >
        Delaware C-Corporation • Parent Company
      </Text>
    </>
  );
}

export default HoldingsInterior;
