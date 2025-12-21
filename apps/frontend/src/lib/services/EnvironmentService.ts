/**
 * EnvironmentService.ts
 *
 * Service layer for environment settings.
 * Manages sky, fog, water, and ambient lighting configuration.
 *
 * This centralizes environment configuration that was scattered
 * across PlayWorld and various components.
 */

import { WATER_LEVEL } from '../terrain/TerrainConfig';

// =============================================================================
// TYPES
// =============================================================================

export const SKYBOX_TYPES = [
  'none',
  'stars',
  'sunset',
  'night',
  'dawn',
  'hdri',
  'warehouse',
  'forest',
  'city',
] as const;
export type SkyboxType = typeof SKYBOX_TYPES[number];

export const HDRI_FILES = [
  'hilly_terrain_4k.jpg',
  'kloppenheim_02_puresky_4k.jpg',
  'kloppenheim_03_puresky_4k.jpg',
  'qwantani_noon_puresky_4k.jpg',
  'goegap_road_4k.jpg',
] as const;
export type HDRIFile = typeof HDRI_FILES[number];

export interface SkyConfig {
  type: SkyboxType;
  hdriFile: HDRIFile;
  hdriIntensity: number;
  hdriBlur: number;
  sunPosition: { x: number; y: number; z: number };
  turbidity: number;
  rayleigh: number;
  mieCoefficient: number;
  mieDirectionalG: number;
  starsCount: number;
  starsFactor: number;
  starsRadius: number;
}

export interface FogConfig {
  enabled: boolean;
  near: number;
  far: number;
  color: string;
}

export interface WaterConfig {
  enabled: boolean;
  level: number;
  deepColor: string;
  shallowColor: string;
  waveSpeed: number;
  waveScale: number;
  fresnelPower: number;
}

export interface LightingConfig {
  ambientIntensity: number;
  directionalIntensity: number;
  directionalPosition: { x: number; y: number; z: number };
  hemisphereIntensity: number;
  hemisphereSkyColor: string;
  hemisphereGroundColor: string;
}

export interface EnvironmentConfig {
  sky: SkyConfig;
  fog: FogConfig;
  water: WaterConfig;
  lighting: LightingConfig;
}

// =============================================================================
// DEFAULTS
// =============================================================================

export const DEFAULT_SKY_CONFIG: SkyConfig = {
  type: 'hdri',
  hdriFile: 'hilly_terrain_4k.jpg',
  hdriIntensity: 1.0,
  hdriBlur: 0,
  sunPosition: { x: 100, y: 20, z: 100 },
  turbidity: 10,
  rayleigh: 2,
  mieCoefficient: 0.005,
  mieDirectionalG: 0.8,
  starsCount: 1000,
  starsFactor: 4,
  starsRadius: 10000,
};

export const DEFAULT_FOG_CONFIG: FogConfig = {
  enabled: true,
  near: 150,
  far: 400,
  color: '#b3c4d9',
};

export const DEFAULT_WATER_CONFIG: WaterConfig = {
  enabled: true,
  level: WATER_LEVEL,
  deepColor: '#0a3d62',
  shallowColor: '#48c9b0',
  waveSpeed: 0.5,
  waveScale: 0.5,
  fresnelPower: 2.0,
};

export const DEFAULT_LIGHTING_CONFIG: LightingConfig = {
  ambientIntensity: 0.5,
  directionalIntensity: 1.2,
  directionalPosition: { x: 50, y: 80, z: 30 },
  hemisphereIntensity: 0.6,
  hemisphereSkyColor: '#87CEEB',
  hemisphereGroundColor: '#3d7a37',
};

export const DEFAULT_ENVIRONMENT_CONFIG: EnvironmentConfig = {
  sky: DEFAULT_SKY_CONFIG,
  fog: DEFAULT_FOG_CONFIG,
  water: DEFAULT_WATER_CONFIG,
  lighting: DEFAULT_LIGHTING_CONFIG,
};

// =============================================================================
// PRESETS
// =============================================================================

export const ENVIRONMENT_PRESETS = {
  default: DEFAULT_ENVIRONMENT_CONFIG,

  night: {
    ...DEFAULT_ENVIRONMENT_CONFIG,
    sky: {
      ...DEFAULT_SKY_CONFIG,
      type: 'night' as SkyboxType,
      turbidity: 20,
      rayleigh: 0,
      starsCount: 3000,
    },
    fog: {
      ...DEFAULT_FOG_CONFIG,
      color: '#1a1a2e',
      near: 100,
      far: 300,
    },
    lighting: {
      ...DEFAULT_LIGHTING_CONFIG,
      ambientIntensity: 0.2,
      directionalIntensity: 0.3,
    },
  },

  sunset: {
    ...DEFAULT_ENVIRONMENT_CONFIG,
    sky: {
      ...DEFAULT_SKY_CONFIG,
      type: 'sunset' as SkyboxType,
      sunPosition: { x: 100, y: 5, z: 100 },
      turbidity: 8,
      rayleigh: 3,
    },
    fog: {
      ...DEFAULT_FOG_CONFIG,
      color: '#e8a87c',
    },
  },

  stormy: {
    ...DEFAULT_ENVIRONMENT_CONFIG,
    sky: {
      ...DEFAULT_SKY_CONFIG,
      type: 'hdri' as SkyboxType,
      hdriIntensity: 0.5,
    },
    fog: {
      ...DEFAULT_FOG_CONFIG,
      enabled: true,
      near: 50,
      far: 200,
      color: '#6b7b8c',
    },
    lighting: {
      ...DEFAULT_LIGHTING_CONFIG,
      ambientIntensity: 0.3,
      directionalIntensity: 0.5,
    },
  },
} as const;

// =============================================================================
// ENVIRONMENT SERVICE
// =============================================================================

type EnvironmentChangeListener = (config: EnvironmentConfig) => void;

export class EnvironmentService {
  private config: EnvironmentConfig;
  private listeners: Set<EnvironmentChangeListener> = new Set();

  constructor(config?: Partial<EnvironmentConfig>) {
    this.config = {
      sky: { ...DEFAULT_SKY_CONFIG, ...config?.sky },
      fog: { ...DEFAULT_FOG_CONFIG, ...config?.fog },
      water: { ...DEFAULT_WATER_CONFIG, ...config?.water },
      lighting: { ...DEFAULT_LIGHTING_CONFIG, ...config?.lighting },
    };
  }

  // ===========================================================================
  // GETTERS
  // ===========================================================================

  getConfig(): Readonly<EnvironmentConfig> {
    return this.config;
  }

  getSkyConfig(): Readonly<SkyConfig> {
    return this.config.sky;
  }

  getFogConfig(): Readonly<FogConfig> {
    return this.config.fog;
  }

  getWaterConfig(): Readonly<WaterConfig> {
    return this.config.water;
  }

  getLightingConfig(): Readonly<LightingConfig> {
    return this.config.lighting;
  }

  // ===========================================================================
  // SETTERS
  // ===========================================================================

  setSkyConfig(sky: Partial<SkyConfig>): void {
    this.config.sky = { ...this.config.sky, ...sky };
    this.notifyListeners();
  }

  setFogConfig(fog: Partial<FogConfig>): void {
    this.config.fog = { ...this.config.fog, ...fog };
    this.notifyListeners();
  }

  setWaterConfig(water: Partial<WaterConfig>): void {
    this.config.water = { ...this.config.water, ...water };
    this.notifyListeners();
  }

  setLightingConfig(lighting: Partial<LightingConfig>): void {
    this.config.lighting = { ...this.config.lighting, ...lighting };
    this.notifyListeners();
  }

  // ===========================================================================
  // PRESETS
  // ===========================================================================

  applyPreset(preset: keyof typeof ENVIRONMENT_PRESETS): void {
    const presetConfig = ENVIRONMENT_PRESETS[preset];
    this.config = {
      sky: { ...presetConfig.sky },
      fog: { ...presetConfig.fog },
      water: { ...presetConfig.water },
      lighting: { ...presetConfig.lighting },
    };
    this.notifyListeners();
  }

  // ===========================================================================
  // HELPERS
  // ===========================================================================

  /**
   * Check if current sky type uses HDRI.
   */
  isHDRISky(): boolean {
    return this.config.sky.type === 'hdri';
  }

  /**
   * Check if current sky type is procedural (sunset, dawn, night).
   */
  isProceduralSky(): boolean {
    return ['sunset', 'dawn', 'night'].includes(this.config.sky.type);
  }

  /**
   * Check if fog is enabled and visible.
   */
  isFogVisible(): boolean {
    return this.config.fog.enabled && this.config.fog.far > this.config.fog.near;
  }

  /**
   * Get water level.
   */
  getWaterLevel(): number {
    return this.config.water.level;
  }

  // ===========================================================================
  // SUBSCRIPTION
  // ===========================================================================

  subscribe(listener: EnvironmentChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => {
      try {
        listener(this.config);
      } catch (err) {
        console.error('[EnvironmentService] Listener error:', err);
      }
    });
  }
}

// =============================================================================
// SINGLETON ACCESS
// =============================================================================

let globalEnvironmentService: EnvironmentService | null = null;

export function getEnvironmentService(): EnvironmentService {
  if (!globalEnvironmentService) {
    globalEnvironmentService = new EnvironmentService();
  }
  return globalEnvironmentService;
}

export function resetEnvironmentService(
  config?: Partial<EnvironmentConfig>
): EnvironmentService {
  globalEnvironmentService = new EnvironmentService(config);
  return globalEnvironmentService;
}
