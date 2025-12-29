/**
 * FogConfig.ts
 * Fog rendering configuration based on ShaderX2 techniques
 *
 * Implements three fog types:
 * - Linear Fog: Interpolates between min/max distance
 * - Exponential Fog: Uses e^(-distance * density)
 * - Exponential Squared Fog: Uses e^(-(distance * density)^2)
 *
 * Reference: ShaderX2 - Fog Rendering by Markus Nuebel
 */

import * as THREE from 'three';

/**
 * Fog calculation type
 */
export enum FogType {
  /** No fog effect */
  None = 0,
  /** Linear fog: interpolates between near/far distances */
  Linear = 1,
  /** Exponential fog: e^(-distance * density) */
  Exponential = 2,
  /** Exponential squared: e^(-(distance * density)^2) - smoother near, levels off far */
  ExponentialSquared = 3,
}

/**
 * Fog configuration interface
 */
export interface FogConfig {
  /** Enable/disable fog */
  enabled: boolean;
  /** Type of fog calculation */
  type: FogType;
  /** Fog color (RGBA or hex) */
  color: THREE.Color;
  /** Start distance for linear fog (fog begins here) */
  nearDistance: number;
  /** End distance for linear fog (full fog here) */
  farDistance: number;
  /**
   * Density factor for exponential fog types (0.001 - 0.1 typical)
   * Higher = thicker fog, faster falloff
   */
  density: number;
  /**
   * Height-based fog parameters
   * When enabled, fog density varies with altitude
   */
  heightFog: {
    enabled: boolean;
    /** Base height where fog is thickest */
    baseHeight: number;
    /** Height falloff rate (fog thins as altitude increases) */
    falloff: number;
    /** Minimum density multiplier at high altitude (0-1) */
    minDensity: number;
  };
}

/**
 * Default fog configuration
 * Tuned for a 768m world with moderate visibility
 */
export const DEFAULT_FOG_CONFIG: FogConfig = {
  enabled: true,
  type: FogType.ExponentialSquared,
  color: new THREE.Color(0.7, 0.77, 0.85), // Light blue-gray (sky horizon)
  nearDistance: 100,
  farDistance: 400,
  density: 0.008, // Moderate density for exponential types
  heightFog: {
    enabled: false,
    baseHeight: 0,
    falloff: 0.02,
    minDensity: 0.3,
  },
};

/**
 * Fog presets for different environments
 */
export const FOG_PRESETS = {
  /** Clear day - minimal fog, far visibility */
  clear: {
    enabled: true,
    type: FogType.ExponentialSquared,
    color: new THREE.Color(0.75, 0.82, 0.92),
    nearDistance: 200,
    farDistance: 600,
    density: 0.003,
  },
  /** Light fog - subtle atmospheric haze */
  light: {
    enabled: true,
    type: FogType.ExponentialSquared,
    color: new THREE.Color(0.7, 0.77, 0.85),
    nearDistance: 100,
    farDistance: 400,
    density: 0.006,
  },
  /** Medium fog - visible fog effect */
  medium: {
    enabled: true,
    type: FogType.ExponentialSquared,
    color: new THREE.Color(0.65, 0.7, 0.78),
    nearDistance: 60,
    farDistance: 300,
    density: 0.012,
  },
  /** Dense fog - heavy fog, limited visibility */
  dense: {
    enabled: true,
    type: FogType.Exponential,
    color: new THREE.Color(0.6, 0.65, 0.7),
    nearDistance: 30,
    farDistance: 150,
    density: 0.025,
  },
  /** Misty morning - low-lying fog with height falloff */
  misty: {
    enabled: true,
    type: FogType.ExponentialSquared,
    color: new THREE.Color(0.8, 0.82, 0.85),
    nearDistance: 50,
    farDistance: 250,
    density: 0.015,
    heightFog: {
      enabled: true,
      baseHeight: 5,
      falloff: 0.08,
      minDensity: 0.2,
    },
  },
  /** Night fog - dark atmospheric effect */
  night: {
    enabled: true,
    type: FogType.Exponential,
    color: new THREE.Color(0.1, 0.12, 0.18),
    nearDistance: 40,
    farDistance: 200,
    density: 0.018,
  },
  /** Sunset/golden hour */
  sunset: {
    enabled: true,
    type: FogType.ExponentialSquared,
    color: new THREE.Color(0.9, 0.7, 0.5),
    nearDistance: 80,
    farDistance: 350,
    density: 0.008,
  },
  /** No fog */
  none: {
    enabled: false,
    type: FogType.None,
    color: new THREE.Color(1, 1, 1),
    nearDistance: 1000,
    farDistance: 2000,
    density: 0,
  },
} as const;

/**
 * Fog uniform interface for shader integration
 */
export interface FogUniforms {
  fogEnabled: { value: boolean };
  fogType: { value: number };
  fogColor: { value: THREE.Color };
  fogNear: { value: number };
  fogFar: { value: number };
  fogDensity: { value: number };
  fogHeightEnabled: { value: boolean };
  fogBaseHeight: { value: number };
  fogHeightFalloff: { value: number };
  fogMinDensity: { value: number };
}

/**
 * Create fog uniforms from configuration
 */
export function createFogUniforms(config: Partial<FogConfig> = {}): FogUniforms {
  const merged = { ...DEFAULT_FOG_CONFIG, ...config };

  return {
    fogEnabled: { value: merged.enabled },
    fogType: { value: merged.type },
    fogColor: { value: merged.color.clone() },
    fogNear: { value: merged.nearDistance },
    fogFar: { value: merged.farDistance },
    fogDensity: { value: merged.density },
    fogHeightEnabled: { value: merged.heightFog?.enabled ?? false },
    fogBaseHeight: { value: merged.heightFog?.baseHeight ?? 0 },
    fogHeightFalloff: { value: merged.heightFog?.falloff ?? 0.02 },
    fogMinDensity: { value: merged.heightFog?.minDensity ?? 0.3 },
  };
}

/**
 * Update fog uniforms from configuration
 */
export function updateFogUniforms(
  uniforms: FogUniforms,
  config: Partial<FogConfig>
): void {
  if (config.enabled !== undefined) uniforms.fogEnabled.value = config.enabled;
  if (config.type !== undefined) uniforms.fogType.value = config.type;
  if (config.color !== undefined) uniforms.fogColor.value.copy(config.color);
  if (config.nearDistance !== undefined) uniforms.fogNear.value = config.nearDistance;
  if (config.farDistance !== undefined) uniforms.fogFar.value = config.farDistance;
  if (config.density !== undefined) uniforms.fogDensity.value = config.density;

  if (config.heightFog) {
    if (config.heightFog.enabled !== undefined) {
      uniforms.fogHeightEnabled.value = config.heightFog.enabled;
    }
    if (config.heightFog.baseHeight !== undefined) {
      uniforms.fogBaseHeight.value = config.heightFog.baseHeight;
    }
    if (config.heightFog.falloff !== undefined) {
      uniforms.fogHeightFalloff.value = config.heightFog.falloff;
    }
    if (config.heightFog.minDensity !== undefined) {
      uniforms.fogMinDensity.value = config.heightFog.minDensity;
    }
  }
}

/**
 * Get fog type name for UI display
 */
export function getFogTypeName(type: FogType): string {
  switch (type) {
    case FogType.None:
      return 'None';
    case FogType.Linear:
      return 'Linear';
    case FogType.Exponential:
      return 'Exponential';
    case FogType.ExponentialSquared:
      return 'Exp Squared';
    default:
      return 'Unknown';
  }
}
