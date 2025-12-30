/**
 * PlacedObjectsManager - Renders all player-placed objects in the world
 * Supports picking up placed objects with E key
 */

import { Suspense, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { usePlacementStore } from '../../../lib/economy/usePlacementStore';
import { useInventoryStore } from '../../../lib/economy/inventoryStore';
import { PLACEABLE_ITEMS } from '../../../lib/economy/itemDatabase';
import { Campfire } from './Campfire';
import type { PlacedObject, PlaceableType } from '../../../lib/economy/itemEffects';

const PICKUP_RANGE = 3; // Distance in units to allow pickup
const PICKUP_HOLD_TIME = 500; // Time in ms to hold E to pick up

interface PlacedObjectsManagerProps {
  playerPosition?: THREE.Vector3;
}

export function PlacedObjectsManager({ playerPosition }: PlacedObjectsManagerProps) {
  const placedObjects = usePlacementStore((s) => s.placedObjects);
  const removePlacedObject = usePlacementStore((s) => s.removePlacedObject);
  const addItem = useInventoryStore((s) => s.addItem);

  const [nearestPickupId, setNearestPickupId] = useState<string | null>(null);
  const [pickupProgress, setPickupProgress] = useState(0); // 0-1 progress
  const holdStartTime = useRef<number | null>(null);
  const animationFrame = useRef<number | null>(null);

  // Pre-allocate Vector3 for distance calculations (avoids GC pressure)
  const tempObjPos = useMemo(() => new THREE.Vector3(), []);

  // Find nearest pickupable object
  useEffect(() => {
    if (!playerPosition || placedObjects.length === 0) {
      setNearestPickupId(null);
      return;
    }

    let nearest: { id: string; distance: number } | null = null;

    for (const obj of placedObjects) {
      // Reuse pre-allocated vector instead of creating new one each iteration
      tempObjPos.set(obj.position[0], obj.position[1], obj.position[2]);
      const distance = playerPosition.distanceTo(tempObjPos);

      if (distance <= PICKUP_RANGE) {
        if (!nearest || distance < nearest.distance) {
          nearest = { id: obj.id, distance };
        }
      }
    }

    setNearestPickupId(nearest?.id ?? null);
  }, [playerPosition, placedObjects, tempObjPos]);

  // Handle pickup completion
  const handlePickup = useCallback(() => {
    if (!nearestPickupId) return;

    const obj = placedObjects.find((o) => o.id === nearestPickupId);
    if (!obj) return;

    // Get the item template for this placeable type
    const itemTemplate = getItemForPlaceableType(obj.type);
    if (!itemTemplate) {
      console.warn(`No item template for placeable type: ${obj.type}`);
      return;
    }

    // Add item to inventory
    const added = addItem(itemTemplate, 1);
    if (added) {
      // Remove from world
      removePlacedObject(obj.id);
      console.log(`Picked up ${itemTemplate.name}`);
    } else {
      console.warn('Inventory full - cannot pick up item');
    }
  }, [nearestPickupId, placedObjects, addItem, removePlacedObject]);

  // Update progress while holding E
  const updateProgress = useCallback(() => {
    if (holdStartTime.current === null) return;

    const elapsed = Date.now() - holdStartTime.current;
    const progress = Math.min(elapsed / PICKUP_HOLD_TIME, 1);
    setPickupProgress(progress);

    if (progress >= 1) {
      // Pickup complete
      handlePickup();
      holdStartTime.current = null;
      setPickupProgress(0);
    } else {
      animationFrame.current = requestAnimationFrame(updateProgress);
    }
  }, [handlePickup]);

  // Listen for E key hold
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'e' && nearestPickupId && !e.repeat) {
        holdStartTime.current = Date.now();
        animationFrame.current = requestAnimationFrame(updateProgress);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'e') {
        holdStartTime.current = null;
        setPickupProgress(0);
        if (animationFrame.current) {
          cancelAnimationFrame(animationFrame.current);
          animationFrame.current = null;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
      }
    };
  }, [nearestPickupId, updateProgress]);

  return (
    <>
      {placedObjects.map((obj) => (
        <Suspense key={obj.id} fallback={null}>
          <PlacedObjectRenderer
            object={obj}
            playerPosition={playerPosition}
            isNearestPickup={obj.id === nearestPickupId}
            pickupProgress={obj.id === nearestPickupId ? pickupProgress : 0}
          />
        </Suspense>
      ))}
    </>
  );
}

interface PlacedObjectRendererProps {
  object: PlacedObject;
  playerPosition?: THREE.Vector3;
  isNearestPickup?: boolean;
  pickupProgress?: number; // 0-1 progress for hold-to-pickup
}

function PlacedObjectRenderer({ object, playerPosition, isNearestPickup, pickupProgress = 0 }: PlacedObjectRendererProps) {
  const isHolding = pickupProgress > 0;

  const pickupIndicator = isNearestPickup ? (
    <Html
      position={[object.position[0], object.position[1] + 1.5, object.position[2]]}
      center
      style={{
        background: 'rgba(0, 0, 0, 0.8)',
        color: 'white',
        padding: '6px 12px',
        borderRadius: '6px',
        fontSize: '12px',
        fontFamily: 'monospace',
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
        minWidth: '100px',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: isHolding ? '4px' : 0 }}>
        {isHolding ? 'Picking up...' : 'Hold E to pick up'}
      </div>
      {isHolding && (
        <div
          style={{
            width: '100%',
            height: '4px',
            background: 'rgba(255, 255, 255, 0.2)',
            borderRadius: '2px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${pickupProgress * 100}%`,
              height: '100%',
              background: '#4ade80',
              borderRadius: '2px',
              transition: 'width 0.05s linear',
            }}
          />
        </div>
      )}
    </Html>
  ) : null;

  switch (object.type) {
    case 'campfire':
      return (
        <>
          {pickupIndicator}
          <Campfire
            position={object.position}
            rotation={[0, object.rotation, 0]}
            scale={0.45}
            fireScale={0.05}
            lightIntensity={0.6}
            lightDistance={12}
            initiallyLit={true}
            interactionRange={4}
            playerPosition={playerPosition}
          />
        </>
      );

    case 'torch':
      // TODO: Create Torch component
      return (
        <>
          {pickupIndicator}
          <mesh position={object.position} rotation={[0, object.rotation, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 1.2, 8]} />
            <meshStandardMaterial color="#8B4513" />
            <pointLight
              position={[0, 0.6, 0]}
              color="#ff9900"
              intensity={0.5}
              distance={8}
            />
          </mesh>
        </>
      );

    case 'tent':
      // TODO: Create Tent component
      return (
        <>
          {pickupIndicator}
          <mesh position={object.position} rotation={[0, object.rotation, 0]}>
            <coneGeometry args={[2, 2, 4]} />
            <meshStandardMaterial color="#4a5568" />
          </mesh>
        </>
      );

    case 'storageBox':
      // TODO: Create StorageBox component
      return (
        <>
          {pickupIndicator}
          <mesh position={object.position} rotation={[0, object.rotation, 0]}>
            <boxGeometry args={[1, 0.8, 0.6]} />
            <meshStandardMaterial color="#8B4513" />
          </mesh>
        </>
      );

    case 'light':
      return (
        <>
          {pickupIndicator}
          <pointLight
            position={object.position}
            color="#ffffff"
            intensity={1}
            distance={15}
          />
        </>
      );

    default:
      console.warn(`Unknown placeable type: ${object.type}`);
      return null;
  }
}

// Helper to get component for a placeable type
export function getPlaceableComponent(type: PlaceableType): React.ComponentType<unknown> | null {
  switch (type) {
    case 'campfire':
      return Campfire as React.ComponentType<unknown>;
    default:
      return null;
  }
}

/**
 * Get the inventory item template for a placeable type
 * Used when picking up placed objects to return them to inventory
 */
function getItemForPlaceableType(type: PlaceableType) {
  const item = PLACEABLE_ITEMS.find(
    (item) => item.metadata?.placeableConfig?.type === type
  );
  return item ?? null;
}
