import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, Html } from '@react-three/drei';
import * as THREE from 'three';

interface WaypointData {
  id: string;
  name: string;
  position: [number, number, number];
  color: string;
}

interface WaypointProps {
  waypoint: WaypointData;
  shipPosition: THREE.Vector3;
}

// Individual waypoint marker
function Waypoint({ waypoint, shipPosition }: WaypointProps) {
  const markerRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (ringRef.current) {
      // Rotate ring
      ringRef.current.rotation.z = state.clock.elapsedTime * 1.5;
    }
  });

  // Calculate distance
  const waypointPos = new THREE.Vector3(...waypoint.position);
  const distance = shipPosition.distanceTo(waypointPos);
  const distanceText = distance < 10 ? distance.toFixed(1) : Math.round(distance).toString();

  // Opacity based on distance - fade when very close or very far
  const minDist = 20;
  const maxDist = 250;
  const opacity = distance < minDist
    ? distance / minDist
    : distance > maxDist
      ? Math.max(0.2, 1 - (distance - maxDist) / 100)
      : 1;

  // Marker height above entity (scaled for larger entities)
  const markerHeight = waypoint.position[1] + 12;

  return (
    <group ref={markerRef} position={[waypoint.position[0], markerHeight, waypoint.position[2]]}>
      {/* Pulsing ring */}
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.5, 1.8, 6]} />
        <meshBasicMaterial
          color={waypoint.color}
          transparent
          opacity={opacity * 0.6}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Inner diamond */}
      <mesh rotation={[0, Math.PI / 4, 0]}>
        <octahedronGeometry args={[0.8, 0]} />
        <meshBasicMaterial
          color={waypoint.color}
          transparent
          opacity={opacity * 0.8}
        />
      </mesh>

      {/* Vertical beam down to entity */}
      <mesh position={[0, -6, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 12, 8]} />
        <meshBasicMaterial
          color={waypoint.color}
          transparent
          opacity={opacity * 0.3}
        />
      </mesh>

      {/* Label */}
      <Billboard follow lockX={false} lockY={false} lockZ={false}>
        <Html
          center
          distanceFactor={20}
          style={{
            pointerEvents: 'none',
            opacity: opacity,
            transition: 'opacity 0.2s',
          }}
        >
          <div
            className="text-center whitespace-nowrap"
            style={{ textShadow: '0 0 10px rgba(0,0,0,0.8)' }}
          >
            <div
              className="text-xs font-bold px-2 py-0.5 rounded-t"
              style={{
                backgroundColor: `${waypoint.color}40`,
                color: waypoint.color,
                borderBottom: `1px solid ${waypoint.color}60`,
              }}
            >
              {waypoint.name}
            </div>
            <div
              className="text-xs font-mono px-2 py-0.5 rounded-b"
              style={{
                backgroundColor: 'rgba(0,0,0,0.6)',
                color: '#fff',
              }}
            >
              {distanceText}m
            </div>
          </div>
        </Html>
      </Billboard>
    </group>
  );
}

interface WaypointsProps {
  entities: WaypointData[];
  shipPosition: THREE.Vector3;
  isActive: boolean;
}

export function Waypoints({ entities, shipPosition, isActive }: WaypointsProps) {
  if (!isActive) return null;

  return (
    <group>
      {entities.map((entity) => (
        <Waypoint
          key={entity.id}
          waypoint={entity}
          shipPosition={shipPosition}
        />
      ))}
    </group>
  );
}

export default Waypoints;
