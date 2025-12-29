/**
 * useEnvironmentService.ts
 *
 * React hook for accessing EnvironmentService.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  EnvironmentService,
  getEnvironmentService,
  ENVIRONMENT_PRESETS,
  type EnvironmentConfig,
  type SkyConfig,
  type FogConfig,
  type WaterConfig,
  type LightingConfig,
} from './EnvironmentService';

export interface UseEnvironmentServiceResult {
  /** Full environment config */
  config: EnvironmentConfig;
  /** Sky configuration */
  sky: SkyConfig;
  /** Fog configuration */
  fog: FogConfig;
  /** Water configuration */
  water: WaterConfig;
  /** Lighting configuration */
  lighting: LightingConfig;
  /** Update sky settings */
  setSky: (sky: Partial<SkyConfig>) => void;
  /** Update fog settings */
  setFog: (fog: Partial<FogConfig>) => void;
  /** Update water settings */
  setWater: (water: Partial<WaterConfig>) => void;
  /** Update lighting settings */
  setLighting: (lighting: Partial<LightingConfig>) => void;
  /** Apply a preset */
  applyPreset: (preset: keyof typeof ENVIRONMENT_PRESETS) => void;
  /** Check if using HDRI sky */
  isHDRISky: boolean;
  /** Check if using procedural sky */
  isProceduralSky: boolean;
  /** Check if fog is visible */
  isFogVisible: boolean;
  /** Water level */
  waterLevel: number;
  /** The underlying service */
  service: EnvironmentService;
}

/**
 * React hook for environment configuration.
 *
 * @example
 * ```tsx
 * function SkyRenderer() {
 *   const { sky, isHDRISky, fog } = useEnvironmentService();
 *
 *   if (isHDRISky) {
 *     return <HDRISkybox file={sky.hdriFile} intensity={sky.hdriIntensity} />;
 *   }
 *   return <ProceduralSky {...sky} />;
 * }
 * ```
 */
export function useEnvironmentService(): UseEnvironmentServiceResult {
  const service = useMemo(() => getEnvironmentService(), []);

  const [config, setConfig] = useState<EnvironmentConfig>(() =>
    service.getConfig()
  );

  useEffect(() => {
    const unsubscribe = service.subscribe((newConfig) => {
      setConfig(newConfig);
    });

    // Sync initial state
    setConfig(service.getConfig());

    return unsubscribe;
  }, [service]);

  const setSky = useCallback(
    (sky: Partial<SkyConfig>) => service.setSkyConfig(sky),
    [service]
  );

  const setFog = useCallback(
    (fog: Partial<FogConfig>) => service.setFogConfig(fog),
    [service]
  );

  const setWater = useCallback(
    (water: Partial<WaterConfig>) => service.setWaterConfig(water),
    [service]
  );

  const setLighting = useCallback(
    (lighting: Partial<LightingConfig>) => service.setLightingConfig(lighting),
    [service]
  );

  const applyPreset = useCallback(
    (preset: keyof typeof ENVIRONMENT_PRESETS) => service.applyPreset(preset),
    [service]
  );

  return {
    config,
    sky: config.sky,
    fog: config.fog,
    water: config.water,
    lighting: config.lighting,
    setSky,
    setFog,
    setWater,
    setLighting,
    applyPreset,
    isHDRISky: service.isHDRISky(),
    isProceduralSky: service.isProceduralSky(),
    isFogVisible: service.isFogVisible(),
    waterLevel: service.getWaterLevel(),
    service,
  };
}
