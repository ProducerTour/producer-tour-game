/**
 * Services barrel export
 *
 * Service layer provides clean APIs for game subsystems.
 * Use services instead of accessing low-level systems directly.
 */

// Terrain
export {
  TerrainService,
  getTerrainService,
  resetTerrainService,
  type TerrainServiceConfig,
  type TerrainPoint,
  type BiomeInfo,
} from './TerrainService';

export {
  useTerrainService,
  type UseTerrainServiceResult,
} from './useTerrainService';

// Environment
export {
  EnvironmentService,
  getEnvironmentService,
  resetEnvironmentService,
  SKYBOX_TYPES,
  HDRI_FILES,
  ENVIRONMENT_PRESETS,
  DEFAULT_ENVIRONMENT_CONFIG,
  DEFAULT_SKY_CONFIG,
  DEFAULT_FOG_CONFIG,
  DEFAULT_WATER_CONFIG,
  DEFAULT_LIGHTING_CONFIG,
  type SkyboxType,
  type HDRIFile,
  type SkyConfig,
  type FogConfig,
  type WaterConfig,
  type LightingConfig,
  type EnvironmentConfig,
} from './EnvironmentService';

export {
  useEnvironmentService,
  type UseEnvironmentServiceResult,
} from './useEnvironmentService';
