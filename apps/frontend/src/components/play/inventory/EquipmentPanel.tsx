/**
 * EquipmentPanel - Left panel with 3D avatar and equipment slots
 */

import { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';
import { useInventoryStore } from '../../../lib/economy/inventoryStore';
import { EquipmentSlot } from './EquipmentSlot';
import { EQUIPMENT_SLOT_POSITIONS } from './constants';
import type { EquipmentSlotType, InventorySlot } from './types';

interface EquipmentPanelProps {
  avatarUrl?: string;
  dropTargetSlotType: EquipmentSlotType | null;
  onDragStart: (slotId: string, slot: InventorySlot) => void;
  onDragEnd: () => void;
  onEquipDrop: (slotType: EquipmentSlotType) => void;
  onUnequip: (slotType: EquipmentSlotType) => void;
}

const EQUIPMENT_SLOTS: EquipmentSlotType[] = [
  'head',
  'chest',
  'hands',
  'legs',
  'feet',
  'primaryWeapon',
  'secondaryWeapon',
];

export function EquipmentPanel({
  avatarUrl,
  dropTargetSlotType,
  onDragStart,
  onDragEnd,
  onEquipDrop,
  onUnequip,
}: EquipmentPanelProps) {
  const equippedItems = useInventoryStore((s) => s.equippedItems);
  const getItem = useInventoryStore((s) => s.getItem);

  // Get equipped item for each slot
  const equippedSlots = useMemo(() => {
    const result: Record<EquipmentSlotType, InventorySlot | null> = {
      head: null,
      chest: null,
      hands: null,
      legs: null,
      feet: null,
      primaryWeapon: null,
      secondaryWeapon: null,
    };

    for (const [slotType, slotId] of equippedItems) {
      const item = getItem(slotId);
      if (item) {
        result[slotType as EquipmentSlotType] = item;
      }
    }

    return result;
  }, [equippedItems, getItem]);

  return (
    <div className="w-72 flex-shrink-0">
      <h3 className="text-sm font-medium text-gray-400 mb-3">Equipment</h3>

      {/* Avatar preview with equipment slots */}
      <div className="relative bg-black/30 rounded-xl border border-white/10 overflow-hidden">
        {/* 3D Avatar Canvas */}
        <div className="h-80">
          <Canvas
            camera={{ position: [0, 1, 2.5], fov: 40 }}
            gl={{ antialias: true, alpha: true }}
            dpr={[1, 2]}
          >
            <ambientLight intensity={0.5} />
            <directionalLight position={[3, 5, 2]} intensity={0.8} />

            <Suspense fallback={null}>
              {avatarUrl ? (
                <AvatarModel url={avatarUrl} />
              ) : (
                <PlaceholderAvatar />
              )}
            </Suspense>

            <OrbitControls
              enableZoom={true}
              enablePan={false}
              minDistance={1.5}
              maxDistance={4}
              minPolarAngle={Math.PI / 4}
              maxPolarAngle={Math.PI / 1.8}
              autoRotate
              autoRotateSpeed={0.5}
            />
          </Canvas>
        </div>

        {/* Equipment slots positioned around the avatar */}
        {EQUIPMENT_SLOTS.map((slotType) => (
          <div
            key={slotType}
            className="absolute"
            style={EQUIPMENT_SLOT_POSITIONS[slotType]}
          >
            <EquipmentSlot
              slotType={slotType}
              slot={equippedSlots[slotType]}
              isDropTarget={dropTargetSlotType === slotType}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onDrop={onEquipDrop}
              onUnequip={onUnequip}
            />
          </div>
        ))}
      </div>

      {/* Character stats summary (optional) */}
      <div className="mt-4 p-3 bg-black/20 rounded-lg border border-white/5">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <StatRow label="Defense" value="0" />
          <StatRow label="Attack" value="0" />
          <StatRow label="Speed" value="100%" />
          <StatRow label="Luck" value="0" />
        </div>
      </div>
    </div>
  );
}

/**
 * Stat display row
 */
function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-gray-400">
      <span>{label}</span>
      <span className="text-white">{value}</span>
    </div>
  );
}

/**
 * 3D Avatar model component
 */
function AvatarModel({ url }: { url: string }) {
  const { scene } = useGLTF(url);

  const clonedScene = useMemo(() => {
    const clone = SkeletonUtils.clone(scene);
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return clone;
  }, [scene]);

  return (
    <primitive
      object={clonedScene}
      position={[0, -0.9, 0]}
      scale={1}
    />
  );
}

/**
 * Placeholder when no avatar URL is provided
 */
function PlaceholderAvatar() {
  return (
    <mesh position={[0, 0.5, 0]}>
      <capsuleGeometry args={[0.3, 1, 4, 16]} />
      <meshStandardMaterial color="#6366f1" roughness={0.7} />
    </mesh>
  );
}
