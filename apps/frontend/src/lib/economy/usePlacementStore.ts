/**
 * Placement Store - State management for placing items in the world
 */

import { create } from 'zustand';
import * as THREE from 'three';
import type { PlaceableConfig, PlacedObject } from './itemEffects';

interface PlacementState {
  // Placement mode
  isPlacementMode: boolean;
  activeSlotId: string | null;
  activeConfig: PlaceableConfig | null;

  // Preview state
  previewPosition: THREE.Vector3;
  previewRotation: number;
  isValidPlacement: boolean;

  // Placed objects in world
  placedObjects: PlacedObject[];

  // Actions
  enterPlacementMode: (slotId: string, config: PlaceableConfig) => void;
  exitPlacementMode: () => void;
  updatePreview: (position: THREE.Vector3, isValid: boolean) => void;
  rotatePlacement: (delta: number) => void;
  confirmPlacement: () => PlacedObject | null;
  addPlacedObject: (object: PlacedObject) => void;
  removePlacedObject: (objectId: string) => void;
}

export const usePlacementStore = create<PlacementState>((set, get) => ({
  // Initial state
  isPlacementMode: false,
  activeSlotId: null,
  activeConfig: null,
  previewPosition: new THREE.Vector3(),
  previewRotation: 0,
  isValidPlacement: false,
  placedObjects: [],

  enterPlacementMode: (slotId, config) => {
    set({
      isPlacementMode: true,
      activeSlotId: slotId,
      activeConfig: config,
      previewPosition: new THREE.Vector3(),
      previewRotation: 0,
      isValidPlacement: false,
    });
  },

  exitPlacementMode: () => {
    set({
      isPlacementMode: false,
      activeSlotId: null,
      activeConfig: null,
      isValidPlacement: false,
    });
  },

  updatePreview: (position, isValid) => {
    set({
      previewPosition: position.clone(),
      isValidPlacement: isValid,
    });
  },

  rotatePlacement: (delta) => {
    set((state) => ({
      previewRotation: state.previewRotation + delta,
    }));
  },

  confirmPlacement: () => {
    const state = get();

    if (!state.isPlacementMode || !state.activeConfig || !state.isValidPlacement) {
      return null;
    }

    const placedObject: PlacedObject = {
      id: `placed-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      type: state.activeConfig.type,
      position: [
        state.previewPosition.x,
        state.previewPosition.y,
        state.previewPosition.z,
      ],
      rotation: state.previewRotation,
      placedAt: Date.now(),
    };

    // Add to placed objects
    set((s) => ({
      placedObjects: [...s.placedObjects, placedObject],
      isPlacementMode: false,
      activeSlotId: null,
      activeConfig: null,
    }));

    return placedObject;
  },

  addPlacedObject: (object) => {
    set((state) => ({
      placedObjects: [...state.placedObjects, object],
    }));
  },

  removePlacedObject: (objectId) => {
    set((state) => ({
      placedObjects: state.placedObjects.filter((obj) => obj.id !== objectId),
    }));
  },
}));
