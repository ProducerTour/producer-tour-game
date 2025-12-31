/**
 * Lighting State Store
 *
 * Singleton store for lighting state that terrain/grass shaders can read from
 * without causing React re-renders in parent components.
 *
 * GameLighting writes to this store, and consumers read directly.
 * Uses a singleton pattern (not Zustand) to avoid any React re-renders.
 */

import * as THREE from 'three';

export interface LightingState {
  sunDirection: THREE.Vector3;
  sunColor: THREE.Color;
  sunIntensity: number;
  skyColor: THREE.Color;
  groundColor: THREE.Color;
  fogColor: THREE.Color;
  ambientIntensity: number;
  currentHour: number;
}

type LightingListener = (state: LightingState) => void;

/**
 * Singleton lighting state.
 * Use `lightingState` to read current values.
 * Use `updateLightingState` to update values.
 * Use `subscribeLighting` to listen for changes (for non-React code).
 */
class LightingStateManager {
  private state: LightingState = {
    sunDirection: new THREE.Vector3(0.5, 0.8, 0.3).normalize(),
    sunColor: new THREE.Color('#ffffff'),
    sunIntensity: 1.0,
    skyColor: new THREE.Color('#87CEEB'),
    groundColor: new THREE.Color('#3d7a37'),
    fogColor: new THREE.Color('#87CEEB'),
    ambientIntensity: 0.4,
    currentHour: 10,
  };

  private listeners: Set<LightingListener> = new Set();

  /**
   * Get current lighting state (for direct reads in shaders/materials).
   */
  getState(): LightingState {
    return this.state;
  }

  /**
   * Update lighting state (called by GameLighting).
   * This does NOT trigger React re-renders.
   */
  update(partial: Partial<LightingState>): void {
    // Update primitive values directly
    if (partial.sunIntensity !== undefined) {
      this.state.sunIntensity = partial.sunIntensity;
    }
    if (partial.ambientIntensity !== undefined) {
      this.state.ambientIntensity = partial.ambientIntensity;
    }
    if (partial.currentHour !== undefined) {
      this.state.currentHour = partial.currentHour;
    }

    // Update THREE objects by copying (they're mutable)
    if (partial.sunDirection) {
      this.state.sunDirection.copy(partial.sunDirection);
    }
    if (partial.sunColor) {
      this.state.sunColor.copy(partial.sunColor);
    }
    if (partial.skyColor) {
      this.state.skyColor.copy(partial.skyColor);
    }
    if (partial.groundColor) {
      this.state.groundColor.copy(partial.groundColor);
    }
    if (partial.fogColor) {
      this.state.fogColor.copy(partial.fogColor);
    }

    // Notify listeners (for non-React consumers)
    this.listeners.forEach((listener) => listener(this.state));
  }

  /**
   * Subscribe to lighting changes (for non-React code).
   * Returns unsubscribe function.
   */
  subscribe(listener: LightingListener): () => void {
    this.listeners.add(listener);
    // Immediately call with current state
    listener(this.state);
    return () => this.listeners.delete(listener);
  }
}

// Singleton instance
export const lightingStateManager = new LightingStateManager();

// Convenience exports
export const lightingState = lightingStateManager.getState();
export const updateLightingState = (partial: Partial<LightingState>) =>
  lightingStateManager.update(partial);
export const subscribeLighting = (listener: LightingListener) =>
  lightingStateManager.subscribe(listener);
