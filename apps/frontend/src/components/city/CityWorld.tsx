/**
 * CityWorld Component
 * World map with biomes using BaseWorld gameplay system
 */

import { Zap, Building2, Store, Landmark, Gamepad2 } from 'lucide-react';
import * as THREE from 'three';

import { BaseWorld } from '../play/world/BaseWorld';
import { ZoneMarker } from '../play/world';
import type { ZoneConfig } from '../play/types';

// City zones - different areas of the NeoTokyo map
const cityZones: ZoneConfig[] = [
  {
    position: [30, 2, -30],
    label: 'Cyber District',
    icon: Zap,
    color: '#a855f7',
    description: 'High-tech zone',
  },
  {
    position: [-30, 2, -30],
    label: 'Downtown',
    icon: Building2,
    color: '#3b82f6',
    description: 'Business center',
  },
  {
    position: [0, 2, -50],
    label: 'Market Square',
    icon: Store,
    color: '#f59e0b',
    description: 'Trade & commerce',
  },
  {
    position: [-40, 2, 20],
    label: 'Old Town',
    icon: Landmark,
    color: '#ec4899',
    description: 'Historic district',
  },
  {
    position: [40, 2, 20],
    label: 'Arena',
    icon: Gamepad2,
    color: '#06b6d4',
    description: 'Compete & play',
  },
];

export interface CityWorldProps {
  avatarUrl?: string;
  onPlayerPositionChange?: (pos: THREE.Vector3) => void;
  onMultiplayerReady?: (data: { playerCount: number; isConnected: boolean }) => void;
}

/**
 * CityWorld - World map with biomes
 *
 * Uses BaseWorld for core gameplay and adds:
 * - World terrain GLB model with biomes
 * - City-specific zone markers
 * - Custom spawn point
 */
export function CityWorld({
  avatarUrl,
  onPlayerPositionChange,
  onMultiplayerReady,
}: CityWorldProps) {
  return (
    <BaseWorld
      spawn={[0, 5, 0]} // Center of city, elevated to avoid clipping
      avatarUrl={avatarUrl}
      onPlayerPositionChange={onPlayerPositionChange}
      onMultiplayerReady={onMultiplayerReady}
      groundSize={400}
      fog={{ color: '#0a0a0f', near: 50, far: 200 }}
      backgroundColor="#0a0a0f"
    >
      {/* City Zone Markers */}
      {cityZones.map((zone) => (
        <ZoneMarker key={zone.label} {...zone} />
      ))}

      {/* Spawn indicator */}
      <mesh position={[0, 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.8, 1, 32]} />
        <meshBasicMaterial color="#8b5cf6" transparent opacity={0.3} />
      </mesh>
    </BaseWorld>
  );
}

export default CityWorld;
