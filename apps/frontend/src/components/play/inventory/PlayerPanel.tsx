/**
 * PlayerPanel - Rust-style left panel with character model and circular equipment slots
 * Optimized: Static 3D render (no OrbitControls, no autoRotate, no useFrame)
 */

import React, { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';
import { useInventoryStore } from '../../../lib/economy/inventoryStore';
import { EQUIPMENT_SLOT_LABELS, RARITY_COLORS } from './constants';
import type { EquipmentSlotType, InventorySlot } from './types';

interface PlayerPanelProps {
  avatarUrl?: string;
  dropTargetSlotType: EquipmentSlotType | null;
  onEquipDrop: (slotType: EquipmentSlotType) => void;
  onUnequip: (slotType: EquipmentSlotType) => void;
}

// Equipment slot positions - Rust style arrangement
const SLOT_POSITIONS: Record<EquipmentSlotType, { x: string; y: string; label: 'left' | 'right' }> = {
  head: { x: '12%', y: '8%', label: 'left' },
  primaryWeapon: { x: '78%', y: '8%', label: 'right' },
  chest: { x: '5%', y: '32%', label: 'left' },
  hands: { x: '85%', y: '32%', label: 'right' },
  legs: { x: '12%', y: '62%', label: 'left' },
  feet: { x: '78%', y: '62%', label: 'right' },
  secondaryWeapon: { x: '50%', y: '88%', label: 'left' },
};

export function PlayerPanel({
  avatarUrl,
  dropTargetSlotType,
  onEquipDrop,
  onUnequip,
}: PlayerPanelProps) {
  const equippedItems = useInventoryStore((s) => s.equippedItems);
  const getItem = useInventoryStore((s) => s.getItem);

  // Player stats (would come from a player store)
  const playerLevel = 38;
  const playerXP = 3230;
  const playerMaxXP = 5000;
  const xpPercent = (playerXP / playerMaxXP) * 100;

  const equipmentSlots: EquipmentSlotType[] = [
    'head', 'primaryWeapon', 'chest', 'hands', 'legs', 'feet', 'secondaryWeapon'
  ];

  return (
    <div className="w-[420px] h-full bg-[#12151a]/95 border border-[#2a2d31] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#1a1d21] border-b border-[#2a2d31]">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[#d4d4d4] tracking-wide">PLAYER</span>
        </div>
        <span className="text-xs text-[#c9a227]">▲ WITS'EL COLUMN</span>
      </div>

      {/* Main content - Character + Equipment */}
      <div className="flex-1 relative">
        {/* 3D Avatar Preview or Silhouette Fallback */}
        <div className="absolute inset-0 z-0 flex items-center justify-center">
          {avatarUrl ? (
            <Canvas
              frameloop="demand"
              gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
              camera={{ position: [0, 0, 2.5], fov: 45 }}
              style={{ background: 'transparent', width: '100%', height: '100%' }}
            >
              <ambientLight intensity={0.6} />
              <directionalLight position={[2, 3, 2]} intensity={0.8} />
              <Suspense fallback={null}>
                <StaticAvatarModel avatarUrl={avatarUrl} />
              </Suspense>
            </Canvas>
          ) : (
            <CharacterSilhouette />
          )}
        </div>

        {/* Equipment Slots - Positioned around character */}
        <div className="absolute inset-0 z-10 pointer-events-none">
          {equipmentSlots.map((slotType) => {
            const pos = SLOT_POSITIONS[slotType];
            const equippedSlotId = equippedItems.get(slotType);
            const equippedItem = equippedSlotId ? (getItem(equippedSlotId) ?? null) : null;
            const isDropTarget = dropTargetSlotType === slotType;

            return (
              <CircularEquipmentSlot
                key={slotType}
                slotType={slotType}
                slot={equippedItem}
                position={pos}
                isDropTarget={isDropTarget}
                onDrop={() => onEquipDrop(slotType)}
                onUnequip={() => onUnequip(slotType)}
              />
            );
          })}
        </div>
      </div>

      {/* Footer - Level & XP */}
      <div className="px-4 py-3 bg-[#1a1d21] border-t border-[#2a2d31]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-lg font-bold text-[#d4d4d4]">Lv : {playerLevel}</span>
          <span className="text-sm text-[#c9a227]">+{playerXP.toLocaleString()}</span>
        </div>
        {/* XP Bar */}
        <div className="h-2 bg-[#2a2d31] overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#c9a227] to-[#a08020]"
            style={{ width: `${xpPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Circular Equipment Slot - Rust style
 * Memoized to prevent unnecessary re-renders
 */
interface CircularSlotProps {
  slotType: EquipmentSlotType;
  slot: InventorySlot | null;
  position: { x: string; y: string; label: 'left' | 'right' };
  isDropTarget: boolean;
  onDrop: () => void;
  onUnequip: () => void;
}

const CircularEquipmentSlot = React.memo(function CircularEquipmentSlot({
  slotType,
  slot,
  position,
  isDropTarget,
  onDrop,
  onUnequip,
}: CircularSlotProps) {
  const rarityStyle = useMemo(() => {
    if (!slot || !slot.item) return null;
    return RARITY_COLORS[slot.item.rarity];
  }, [slot]);

  const label = EQUIPMENT_SLOT_LABELS[slotType];
  const isLeft = position.label === 'left';

  return (
    <div
      className="absolute pointer-events-auto"
      style={{
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, -50%)',
      }}
    >
      {/* Label */}
      <div
        className={`absolute top-1/2 -translate-y-1/2 text-[10px] tracking-wider text-[#8a8a8a] uppercase whitespace-nowrap ${
          isLeft ? 'right-full mr-2' : 'left-full ml-2'
        }`}
      >
        {label}
      </div>

      {/* Circular Slot */}
      <div
        className={`
          w-14 h-14 rounded-full cursor-pointer transition-all duration-150
          ${isDropTarget
            ? 'bg-[#3d5a3d]/40 border-2 border-[#7cb87c] border-dashed'
            : slot && rarityStyle
              ? `bg-gradient-to-br ${rarityStyle.gradient} border-2 border-[${rarityStyle.hex}]/60`
              : 'bg-[#1a1d21]/60 border-2 border-[#3d4249] border-dashed'
          }
          hover:border-[#5a6068] hover:bg-[#2a2d31]/60
        `}
        onClick={() => slot && onUnequip()}
        onPointerUp={isDropTarget ? onDrop : undefined}
      >
        {slot && slot.item ? (
          <div className="w-full h-full flex items-center justify-center p-2">
            {slot.item.icon ? (
              <img
                src={slot.item.icon}
                alt={slot.item.name}
                className="w-full h-full object-contain"
                draggable={false}
              />
            ) : (
              <SlotTypeIcon slotType={slotType} filled />
            )}
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <SlotTypeIcon slotType={slotType} filled={false} />
          </div>
        )}
      </div>
    </div>
  );
});

/**
 * Slot type icons - Rust style minimal icons
 */
function SlotTypeIcon({ slotType, filled }: { slotType: string; filled: boolean }) {
  const opacity = filled ? 'opacity-80' : 'opacity-30';

  const icons: Record<string, React.ReactNode> = {
    head: (
      <svg className={`w-6 h-6 ${opacity}`} viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="8" r="5" className="text-[#8a8a8a]" />
        <path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8" className="text-[#8a8a8a]" fill="none" stroke="currentColor" strokeWidth="2" />
      </svg>
    ),
    chest: (
      <svg className={`w-6 h-6 ${opacity}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 6h16v14H4z" className="text-[#8a8a8a]" />
        <path d="M8 6v4m8-4v4" className="text-[#8a8a8a]" />
      </svg>
    ),
    hands: (
      <svg className={`w-6 h-6 ${opacity}`} viewBox="0 0 24 24" fill="currentColor">
        <path d="M6 4v6l-2 2v8h4v-6h8v6h4v-8l-2-2V4h-4v6h-4V4H6z" className="text-[#8a8a8a]" />
      </svg>
    ),
    legs: (
      <svg className={`w-6 h-6 ${opacity}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M8 4v16M16 4v16M8 12h8" className="text-[#8a8a8a]" />
      </svg>
    ),
    feet: (
      <svg className={`w-6 h-6 ${opacity}`} viewBox="0 0 24 24" fill="currentColor">
        <path d="M4 14h6v6H4zM14 14h6v6h-6z" className="text-[#8a8a8a]" />
      </svg>
    ),
    primaryWeapon: (
      <svg className={`w-6 h-6 ${opacity}`} viewBox="0 0 24 24" fill="currentColor">
        <path d="M4 4l16 8-16 8V4z" className="text-[#8a8a8a]" />
      </svg>
    ),
    secondaryWeapon: (
      <svg className={`w-6 h-6 ${opacity}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 12h16M12 4v16" className="text-[#8a8a8a]" />
      </svg>
    ),
  };

  return icons[slotType] || <div className={`w-4 h-4 bg-[#8a8a8a] rounded ${opacity}`} />;
}

/**
 * StaticAvatarModel - RPM avatar rendered in fixed pose
 * No useFrame, no OrbitControls = minimal GPU overhead
 * frameloop="demand" means only re-renders when invalidated
 */
function StaticAvatarModel({ avatarUrl }: { avatarUrl: string }) {
  const { scene } = useGLTF(avatarUrl);

  // Clone the scene to avoid issues with shared materials
  const clonedScene = useMemo(() => {
    const clone = SkeletonUtils.clone(scene);
    clone.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = false;
        child.receiveShadow = false;
        // Ensure materials are properly cloned
        if (child.material) {
          child.material = child.material.clone();
        }
      }
    });
    return clone;
  }, [scene]);

  return (
    <group position={[0, -0.85, 0]} scale={1}>
      <primitive object={clonedScene} />
    </group>
  );
}

/**
 * CharacterSilhouette - Fallback when no avatar is loaded
 * Static SVG - no GPU load
 */
function CharacterSilhouette() {
  return (
    <svg
      viewBox="0 0 120 280"
      className="h-[85%] w-auto opacity-40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Head */}
      <ellipse cx="60" cy="28" rx="22" ry="26" fill="#3d4249" />
      {/* Neck */}
      <rect x="52" y="52" width="16" height="14" fill="#3d4249" />
      {/* Torso */}
      <path d="M30 66 L90 66 L85 160 L35 160 Z" fill="#3d4249" />
      {/* Left Arm */}
      <path d="M30 66 L12 72 L8 130 L18 132 L26 90 L30 90" fill="#3d4249" />
      {/* Right Arm */}
      <path d="M90 66 L108 72 L112 130 L102 132 L94 90 L90 90" fill="#3d4249" />
      {/* Left Leg */}
      <path d="M35 160 L40 160 L44 260 L28 260 L35 160" fill="#3d4249" />
      {/* Right Leg */}
      <path d="M85 160 L80 160 L76 260 L92 260 L85 160" fill="#3d4249" />
      {/* Belt line accent */}
      <rect x="32" y="154" width="56" height="4" fill="#4a5058" />
    </svg>
  );
}
