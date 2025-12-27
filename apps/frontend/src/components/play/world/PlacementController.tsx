/**
 * PlacementController - Handles raycasting and placement input
 *
 * When in placement mode:
 * - Raycasts from screen center to terrain
 * - Shows preview at valid locations
 * - Left click to place, right click/Escape to cancel
 * - Q/E to rotate
 */

import { useEffect, useCallback, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { usePlacementStore } from '../../../lib/economy/usePlacementStore';
import { useInventoryStore } from '../../../lib/economy/inventoryStore';
import { PlacementPreview } from './PlacementPreview';

interface PlacementControllerProps {
  terrainRef?: React.RefObject<THREE.Mesh>;
}

export function PlacementController({ terrainRef }: PlacementControllerProps) {
  const { camera, scene } = useThree();
  const raycaster = useRef(new THREE.Raycaster());

  // Placement store
  const isPlacementMode = usePlacementStore((s) => s.isPlacementMode);
  const activeConfig = usePlacementStore((s) => s.activeConfig);
  const activeSlotId = usePlacementStore((s) => s.activeSlotId);
  const previewPosition = usePlacementStore((s) => s.previewPosition);
  const previewRotation = usePlacementStore((s) => s.previewRotation);
  const isValidPlacement = usePlacementStore((s) => s.isValidPlacement);
  const updatePreview = usePlacementStore((s) => s.updatePreview);
  const rotatePlacement = usePlacementStore((s) => s.rotatePlacement);
  const confirmPlacement = usePlacementStore((s) => s.confirmPlacement);
  const exitPlacementMode = usePlacementStore((s) => s.exitPlacementMode);

  // Inventory store for removing item on placement
  const useItem = useInventoryStore((s) => s.useItem);
  const hotbarSlots = useInventoryStore((s) => s.hotbarSlots);
  const setHotbarSlot = useInventoryStore((s) => s.setHotbarSlot);

  // Handle placement confirmation
  const handleConfirmPlacement = useCallback(() => {
    if (!isPlacementMode || !isValidPlacement || !activeSlotId) return;

    const placedObject = confirmPlacement();
    if (placedObject) {
      // Check if this is a hotbar slot (synthetic ID like "hotbar-0")
      if (activeSlotId.startsWith('hotbar-')) {
        const hotbarIndex = parseInt(activeSlotId.replace('hotbar-', ''), 10);
        const slot = hotbarSlots[hotbarIndex];
        if (slot) {
          if (slot.quantity > 1) {
            // Decrement quantity
            setHotbarSlot(hotbarIndex, { ...slot, quantity: slot.quantity - 1 });
          } else {
            // Last one - clear the slot
            setHotbarSlot(hotbarIndex, null);
          }
          console.log(`Placed ${placedObject.type} from hotbar slot ${hotbarIndex}`);
        }
      } else {
        // Regular inventory slot
        useItem(activeSlotId, 1);
        console.log('Placed object:', placedObject);
      }
    }
  }, [isPlacementMode, isValidPlacement, activeSlotId, confirmPlacement, useItem, hotbarSlots, setHotbarSlot]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    exitPlacementMode();
  }, [exitPlacementMode]);

  // Keyboard input
  useEffect(() => {
    if (!isPlacementMode) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key.toLowerCase()) {
        case 'escape':
          handleCancel();
          break;
        case 'q':
          rotatePlacement(-Math.PI / 8); // Rotate left
          break;
        case 'e':
          rotatePlacement(Math.PI / 8); // Rotate right
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlacementMode, handleCancel, rotatePlacement]);

  // Mouse input - use mousedown for instant response
  // Right-click is allowed for camera movement, only Escape cancels
  useEffect(() => {
    if (!isPlacementMode) return;

    // Small delay to prevent accidental click when entering placement mode
    let canPlace = false;
    const enableTimer = setTimeout(() => {
      canPlace = true;
    }, 100);

    const handleMouseDown = (e: MouseEvent) => {
      // Only handle left click for placement
      if (e.button === 0 && canPlace) {
        // Left click - place immediately
        e.preventDefault();
        e.stopPropagation();
        handleConfirmPlacement();
      }
      // Right click (button 2) is allowed through for camera control
    };

    // Use capture phase to intercept left clicks before other handlers
    window.addEventListener('mousedown', handleMouseDown, { capture: true });

    return () => {
      clearTimeout(enableTimer);
      window.removeEventListener('mousedown', handleMouseDown, { capture: true });
    };
  }, [isPlacementMode, handleConfirmPlacement]);

  // Raycast every frame to update preview position
  useFrame(() => {
    if (!isPlacementMode) return;

    // Cast ray from screen center
    raycaster.current.setFromCamera(new THREE.Vector2(0, 0), camera);

    // Find terrain/ground objects to hit
    const intersectObjects: THREE.Object3D[] = [];

    // If we have a terrain ref, use it
    if (terrainRef?.current) {
      intersectObjects.push(terrainRef.current);
    }

    // Otherwise, find all meshes that could be ground
    if (intersectObjects.length === 0) {
      scene.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          // Skip if it's small or not at ground level
          // This is a heuristic - larger meshes are likely terrain
          if (mesh.geometry.boundingSphere) {
            const radius = mesh.geometry.boundingSphere.radius;
            if (radius > 10) {
              intersectObjects.push(mesh);
            }
          }
        }
      });
    }

    const intersects = raycaster.current.intersectObjects(intersectObjects, true);

    if (intersects.length > 0) {
      const hit = intersects[0];
      const point = hit.point;

      // Validate placement
      const isValid = validatePlacement(point, hit.face?.normal);

      updatePreview(point, isValid);
    } else {
      // No hit - invalid placement
      updatePreview(previewPosition, false);
    }
  });

  // Don't render anything if not in placement mode
  if (!isPlacementMode || !activeConfig) {
    return null;
  }

  return (
    <>
      {/* Placement Preview */}
      <PlacementPreview
        position={previewPosition}
        rotation={previewRotation}
        isValid={isValidPlacement}
        type={activeConfig.type}
      />

      {/* UI Overlay would go here in HTML layer */}
    </>
  );
}

/**
 * Validate if placement is allowed at this position
 */
function validatePlacement(
  position: THREE.Vector3,
  normal?: THREE.Vector3
): boolean {
  // Basic validation
  if (!position) return false;

  // Check if position is too low (underwater)
  if (position.y < 0) return false;

  // Check if surface is flat enough (if we have normal)
  if (normal) {
    const upVector = new THREE.Vector3(0, 1, 0);
    const angle = normal.angleTo(upVector);
    const maxAngle = Math.PI / 6; // 30 degrees

    if (angle > maxAngle) return false;
  }

  return true;
}
