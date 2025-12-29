/**
 * PlacementPreview - Simple geometric preview for placing items
 * Shows green when valid placement, red when invalid
 * Uses basic shapes for performance instead of loading full models
 */

import * as THREE from 'three';
import type { PlaceableType } from '../../../lib/economy/itemEffects';

interface PlacementPreviewProps {
  position: THREE.Vector3;
  rotation: number;
  isValid: boolean;
  type: PlaceableType;
}

export function PlacementPreview({
  position,
  rotation,
  isValid,
  type,
}: PlacementPreviewProps) {
  const color = isValid ? '#00ff00' : '#ff0000';

  // Get size based on placeable type
  const getPreviewSize = (): { radius: number; height: number } => {
    switch (type) {
      case 'campfire':
        return { radius: 0.5, height: 0.4 };
      case 'torch':
        return { radius: 0.15, height: 1.2 };
      case 'tent':
        return { radius: 1.5, height: 2 };
      case 'storageBox':
        return { radius: 0.5, height: 0.8 };
      case 'light':
        return { radius: 0.2, height: 0.3 };
      default:
        return { radius: 0.5, height: 0.5 };
    }
  };

  const { radius, height } = getPreviewSize();

  return (
    <group
      position={[position.x, position.y + height / 2, position.z]}
      rotation={[0, rotation, 0]}
    >
      {/* Main cylinder indicator */}
      <mesh renderOrder={999}>
        <cylinderGeometry args={[radius, radius, height, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.4}
          depthTest={false}
          depthWrite={false}
        />
      </mesh>

      {/* Wireframe outline */}
      <mesh renderOrder={1000}>
        <cylinderGeometry args={[radius, radius, height, 16]} />
        <meshBasicMaterial
          color={color}
          wireframe
          transparent
          opacity={0.8}
          depthTest={false}
          depthWrite={false}
        />
      </mesh>

      {/* Ground ring indicator */}
      <mesh
        position={[0, -height / 2 + 0.01, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        renderOrder={1001}
      >
        <ringGeometry args={[radius * 0.8, radius * 1.2, 32]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.6}
          depthTest={false}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}
