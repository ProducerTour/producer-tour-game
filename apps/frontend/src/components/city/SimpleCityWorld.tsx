/**
 * SimpleCityWorld Component
 * A simplified version of CityWorld for testing with basic meshes
 */

import { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import {
  getCityWorldManager,
  disposeCityWorldManager,
  type CityWorldState,
} from '../../lib/city/CityWorldManager';
import { noiseGenerator } from '../../lib/city/NoiseGenerator';
import {
  DEFAULT_WORLD_SEED,
  DISTRICTS,
  type DistrictType,
} from '../../lib/city/CityConfig';
import type { DistrictBoundary } from '../../lib/city/DistrictTypes';
import type { CityLayoutData } from '../../lib/city/CityLayout';

interface SimpleCityWorldProps {
  seed?: number;
  onStateChange?: (state: CityWorldState) => void;
  debugMode?: boolean;
}

// District colors for terrain
const DISTRICT_GROUND_COLORS: Record<DistrictType, string> = {
  downtown: '#4a5568',
  hollywood_hills: '#22c55e',
  arts_district: '#f59e0b',
  beach: '#fcd34d',
  industrial: '#6b7280',
};

export function SimpleCityWorld({
  seed = DEFAULT_WORLD_SEED,
  onStateChange,
  debugMode = false,
}: SimpleCityWorldProps) {
  const [isReady, setIsReady] = useState(false);
  const [layout, setLayout] = useState<CityLayoutData | null>(null);
  const [districts, setDistricts] = useState<DistrictBoundary[]>([]);
  const [error, setError] = useState<string | null>(null);

  const worldManagerRef = useRef<ReturnType<typeof getCityWorldManager> | null>(null);
  const playerPosRef = useRef(new THREE.Vector3(0, 50, 0));
  const { camera } = useThree();

  // Initialize world manager
  useEffect(() => {
    try {
      console.log('[SimpleCityWorld] Initializing with seed:', seed);
      const manager = getCityWorldManager(seed);
      worldManagerRef.current = manager;

      const cityLayout = manager.getLayout();
      const districtBoundaries = manager.getDistrictBoundaries();

      console.log('[SimpleCityWorld] Layout:', {
        roads: cityLayout.roads?.length ?? 0,
        plots: cityLayout.plots?.length ?? 0,
        landmarks: cityLayout.landmarks?.length ?? 0,
        districts: districtBoundaries?.length ?? 0,
      });

      setLayout(cityLayout);
      setDistricts(districtBoundaries);

      manager.setOnStateChange((state) => {
        onStateChange?.(state);
      });

      // Initial update
      manager.updatePlayerPosition(0, 50, 0);
      setIsReady(true);
    } catch (err) {
      console.error('[SimpleCityWorld] Initialization error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }

    return () => {
      disposeCityWorldManager();
    };
  }, [seed, onStateChange]);

  // Update player position from camera
  useFrame(() => {
    if (!worldManagerRef.current) return;

    const pos = camera.position;
    if (
      Math.abs(pos.x - playerPosRef.current.x) > 10 ||
      Math.abs(pos.z - playerPosRef.current.z) > 10
    ) {
      playerPosRef.current.copy(pos);
      worldManagerRef.current.updatePlayerPosition(pos.x, pos.y, pos.z);
    }
  });

  // Show basic scene while loading or on error
  if (error || !isReady || !layout) {
    return (
      <group>
        {/* Basic ground plane */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
          <planeGeometry args={[2000, 2000]} />
          <meshStandardMaterial color="#3d4a3d" />
        </mesh>
        {/* Center marker */}
        <mesh position={[0, 50, 0]}>
          <boxGeometry args={[20, 100, 20]} />
          <meshStandardMaterial color={error ? "#ef4444" : "#8b5cf6"} />
        </mesh>
      </group>
    );
  }

  const roads = layout.roads ?? [];
  const plots = layout.plots ?? [];
  const landmarks = layout.landmarks ?? [];

  return (
    <group>
      {/* Ground plane with district colors */}
      <DistrictGround districts={districts} />

      {/* Roads - limit to first 50 for performance */}
      {roads.slice(0, 50).map((road) => (
        <SimpleRoad key={road.id} road={road} />
      ))}

      {/* Buildings on plots - limit to first 100 for performance */}
      {plots.filter(p => p.buildable).slice(0, 100).map((plot) => (
        <SimpleBuilding key={plot.id} plot={plot} />
      ))}

      {/* Landmarks */}
      {landmarks.map((landmark) => (
        <Landmark key={landmark.name} landmark={landmark} />
      ))}

      {/* Debug: District boundaries */}
      {debugMode && districts.length > 0 && (
        <DistrictDebugLines boundaries={districts} />
      )}
    </group>
  );
}

// Ground with district-colored sections
function DistrictGround({ districts }: { districts: { type: DistrictType; vertices: { x: number; z: number }[] }[] }) {
  return (
    <group>
      {/* Base ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[2000, 2000, 64, 64]} />
        <meshStandardMaterial color="#3d4a3d" roughness={0.9} />
      </mesh>

      {/* District overlays */}
      {districts.map((district, idx) => {
        const shape = new THREE.Shape();
        const verts = district.vertices;
        if (verts.length < 3) return null;

        shape.moveTo(verts[0].x, verts[0].z);
        for (let i = 1; i < verts.length; i++) {
          shape.lineTo(verts[i].x, verts[i].z);
        }
        shape.closePath();

        return (
          <mesh
            key={idx}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, 0.5, 0]}
            receiveShadow
          >
            <shapeGeometry args={[shape]} />
            <meshStandardMaterial
              color={DISTRICT_GROUND_COLORS[district.type]}
              transparent
              opacity={0.6}
              roughness={0.8}
            />
          </mesh>
        );
      })}
    </group>
  );
}

// Simple road rendering
function SimpleRoad({ road }: { road: { start: { x: number; z: number }; end: { x: number; z: number }; width: number; type: string } }) {
  const geometry = useMemo(() => {
    const dx = road.end.x - road.start.x;
    const dz = road.end.z - road.start.z;
    const length = Math.sqrt(dx * dx + dz * dz);
    const angle = Math.atan2(dz, dx);

    const geo = new THREE.PlaneGeometry(length, road.width);
    geo.rotateX(-Math.PI / 2);
    geo.rotateY(-angle);

    return geo;
  }, [road]);

  const position = useMemo(() => {
    return new THREE.Vector3(
      (road.start.x + road.end.x) / 2,
      0.2,
      (road.start.z + road.end.z) / 2
    );
  }, [road]);

  const color = road.type === 'boulevard' ? '#2d2d2d' : road.type === 'street' ? '#3a3a3a' : '#454545';

  return (
    <mesh geometry={geometry} position={position} receiveShadow>
      <meshStandardMaterial color={color} roughness={0.95} />
    </mesh>
  );
}

// Simple building on a plot
function SimpleBuilding({ plot }: { plot: { position: { x: number; z: number }; size: { width: number; depth: number }; district: DistrictType } }) {
  // Determine building height based on district
  const height = useMemo(() => {
    const districtConfig = DISTRICTS[plot.district];
    const noise = noiseGenerator.getBuildingNoise(plot.position.x, plot.position.z);
    const minH = districtConfig.minBuildingHeight;
    const maxH = districtConfig.maxBuildingHeight;
    return minH + noise * (maxH - minH);
  }, [plot]);

  // Building color based on district
  const color = useMemo(() => {
    switch (plot.district) {
      case 'downtown': return '#4a5568';
      case 'hollywood_hills': return '#d4a574';
      case 'arts_district': return '#9ca3af';
      case 'beach': return '#e5e7eb';
      case 'industrial': return '#6b7280';
      default: return '#9ca3af';
    }
  }, [plot.district]);

  return (
    <mesh
      position={[plot.position.x, height / 2, plot.position.z]}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[plot.size.width * 0.8, height, plot.size.depth * 0.8]} />
      <meshStandardMaterial color={color} roughness={0.7} metalness={0.1} />
    </mesh>
  );
}

// Landmark building
function Landmark({ landmark }: { landmark: { name: string; position: { x: number; z: number }; size: { width: number; depth: number }; height: number; district: DistrictType } }) {
  return (
    <group position={[landmark.position.x, 0, landmark.position.z]}>
      {/* Main building */}
      <mesh position={[0, landmark.height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[landmark.size.width, landmark.height, landmark.size.depth]} />
        <meshStandardMaterial color="#8b5cf6" roughness={0.5} metalness={0.3} />
      </mesh>
      {/* Glow effect */}
      <mesh position={[0, landmark.height / 2, 0]}>
        <boxGeometry args={[landmark.size.width + 2, landmark.height + 2, landmark.size.depth + 2]} />
        <meshBasicMaterial color="#a855f7" transparent opacity={0.1} />
      </mesh>
    </group>
  );
}

// Single district debug line
function DistrictDebugLine({ boundary }: { boundary: { type: DistrictType; vertices: { x: number; z: number }[] } }) {
  const lineObject = useMemo(() => {
    if (!boundary.vertices || boundary.vertices.length < 3) return null;

    const points = boundary.vertices.map(v => new THREE.Vector3(v.x, 10, v.z));
    points.push(points[0].clone()); // Close the loop

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const districtConfig = DISTRICTS[boundary.type];
    const material = new THREE.LineBasicMaterial({ color: districtConfig?.color ?? '#ffffff' });

    return new THREE.Line(geometry, material);
  }, [boundary.vertices, boundary.type]);

  if (!lineObject) return null;

  return <primitive object={lineObject} />;
}

// Debug lines for district boundaries
function DistrictDebugLines({ boundaries }: { boundaries: { type: DistrictType; vertices: { x: number; z: number }[] }[] }) {
  if (!boundaries || boundaries.length === 0) return null;

  return (
    <group>
      {boundaries.map((boundary, idx) => (
        <DistrictDebugLine key={idx} boundary={boundary} />
      ))}
    </group>
  );
}

export default SimpleCityWorld;
