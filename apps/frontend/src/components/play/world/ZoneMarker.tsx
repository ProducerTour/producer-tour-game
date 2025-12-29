import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, Float, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import type { LucideIcon } from 'lucide-react';

export interface ZoneMarkerProps {
  position: [number, number, number];
  label: string;
  icon: LucideIcon;
  color: string;
  description: string;
  onClick?: () => void;
}

// Zone marker for game areas
export function ZoneMarker({
  position,
  label,
  icon: Icon,
  color,
  description,
  onClick,
}: ZoneMarkerProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.005;
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 1.5) * 0.3;
    }
  });

  return (
    <group position={position}>
      {/* Ground ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0]}>
        <ringGeometry args={[2, 2.5, 6]} />
        <meshBasicMaterial color={color} transparent opacity={0.25} side={THREE.DoubleSide} />
      </mesh>

      <Float speed={2} floatIntensity={0.5}>
        <mesh
          ref={meshRef}
          onClick={(e) => { e.stopPropagation(); onClick?.(); }}
          onPointerOver={() => { setHovered(true); document.body.style.cursor = 'pointer'; }}
          onPointerOut={() => { setHovered(false); document.body.style.cursor = 'auto'; }}
        >
          <octahedronGeometry args={[1.2, 0]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={hovered ? 0.8 : 0.4}
            metalness={0.9}
            roughness={0.1}
            transparent
            opacity={0.9}
          />
        </mesh>
      </Float>

      <Sparkles count={hovered ? 50 : 20} scale={4} size={hovered ? 4 : 2} speed={0.5} color={color} />

      <Html position={[0, 4, 0]} center>
        <div className={`text-center transition-all ${hovered ? 'scale-110' : ''}`}>
          <div
            className="px-4 py-2.5 rounded-xl backdrop-blur-xl border"
            style={{
              backgroundColor: 'rgba(10,10,15,0.8)',
              borderColor: hovered ? color : 'rgba(255,255,255,0.1)',
              boxShadow: hovered ? `0 0 30px ${color}44` : 'none',
            }}
          >
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <Icon className="w-4 h-4" style={{ color }} />
              {label}
            </div>
            <p className="text-[11px] text-white/50 mt-0.5">{description}</p>
          </div>
        </div>
      </Html>
    </group>
  );
}
