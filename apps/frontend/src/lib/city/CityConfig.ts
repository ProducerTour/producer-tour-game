/**
 * City World Configuration
 * All constants and configuration for the procedural city generation
 */

// World dimensions
export const WORLD_SIZE = 2000; // 2km x 2km world
export const CHUNK_SIZE = 64; // 64m chunks (matches existing ChunkManager)
export const CHUNKS_PER_SIDE = Math.ceil(WORLD_SIZE / CHUNK_SIZE); // ~32 chunks per side
export const TOTAL_CHUNKS = CHUNKS_PER_SIDE * CHUNKS_PER_SIDE;

// Terrain configuration
export const TERRAIN_RESOLUTION = 32; // Vertices per chunk side
export const TERRAIN_HEIGHT_SCALE = 50; // Max height variation in meters
export const TERRAIN_NOISE_SCALE = 0.002; // Noise frequency
export const TERRAIN_OCTAVES = 4; // Noise detail levels
export const TERRAIN_PERSISTENCE = 0.5; // Amplitude reduction per octave
export const TERRAIN_LACUNARITY = 2.0; // Frequency increase per octave

// View and LOD configuration
export const MAX_VIEW_DISTANCE = 800;
export const LOD_DISTANCES = {
  LOD0: 100, // Full detail
  LOD1: 300, // Simplified
  LOD2: 800, // Box geometry
  LOD3: Infinity, // Billboard
};

// Plot configuration
export const PLOT_GRID_RESOLUTION = 10; // Minimum plot unit in meters
export const PLOT_TIERS = {
  MICRO: { size: 10, name: 'Micro', description: 'Busker spots, pop-ups' },
  SMALL: { size: 25, name: 'Small', description: 'Studios, small venues' },
  MEDIUM: { size: 50, name: 'Medium', description: 'Labels, clubs' },
  LARGE: { size: 100, name: 'Large', description: 'Major venues, headquarters' },
  LANDMARK: { size: 0, name: 'Landmark', description: 'Unique locations (custom size)' },
} as const;

// District types
export type DistrictType =
  | 'downtown'
  | 'hollywood_hills'
  | 'arts_district'
  | 'beach'
  | 'industrial';

// District configuration with LA-inspired layout
export const DISTRICTS: Record<
  DistrictType,
  {
    name: string;
    description: string;
    color: string;
    buildingDensity: number;
    maxBuildingHeight: number;
    minBuildingHeight: number;
    terrainBias: number; // Height modifier
  }
> = {
  downtown: {
    name: 'Downtown Core',
    description: 'High-rise area, record labels, major studios',
    color: '#4a5568',
    buildingDensity: 0.9,
    maxBuildingHeight: 200,
    minBuildingHeight: 30,
    terrainBias: 0, // Flat for skyscrapers
  },
  hollywood_hills: {
    name: 'Hollywood Hills',
    description: 'Premium plots, artist mansions, exclusive venues',
    color: '#48bb78',
    buildingDensity: 0.3,
    maxBuildingHeight: 25,
    minBuildingHeight: 8,
    terrainBias: 30, // Elevated terrain
  },
  arts_district: {
    name: 'Arts District',
    description: 'Creative spaces, indie labels, galleries',
    color: '#ed8936',
    buildingDensity: 0.6,
    maxBuildingHeight: 40,
    minBuildingHeight: 10,
    terrainBias: 5,
  },
  beach: {
    name: 'Beach District',
    description: 'Venues, entertainment, waterfront properties',
    color: '#4299e1',
    buildingDensity: 0.4,
    maxBuildingHeight: 30,
    minBuildingHeight: 5,
    terrainBias: -5, // Near sea level
  },
  industrial: {
    name: 'Industrial',
    description: 'Warehouses, underground venues, rehearsal spaces',
    color: '#718096',
    buildingDensity: 0.5,
    maxBuildingHeight: 20,
    minBuildingHeight: 8,
    terrainBias: 0,
  },
};

// Road configuration
export const ROAD_CONFIG = {
  BOULEVARD_WIDTH: 20, // Main streets
  STREET_WIDTH: 12, // Secondary streets
  ALLEY_WIDTH: 6, // Small roads
  SIDEWALK_WIDTH: 3,
  GRID_SPACING: 100, // Distance between main roads
};

// Building types
export type BuildingType =
  | 'skyscraper'
  | 'midrise'
  | 'residential'
  | 'warehouse'
  | 'landmark';

export const BUILDING_TYPES: Record<
  BuildingType,
  {
    minHeight: number;
    maxHeight: number;
    baseSize: { min: number; max: number };
    districts: DistrictType[];
  }
> = {
  skyscraper: {
    minHeight: 50,
    maxHeight: 200,
    baseSize: { min: 30, max: 60 },
    districts: ['downtown'],
  },
  midrise: {
    minHeight: 15,
    maxHeight: 50,
    baseSize: { min: 20, max: 40 },
    districts: ['downtown', 'arts_district'],
  },
  residential: {
    minHeight: 5,
    maxHeight: 15,
    baseSize: { min: 10, max: 25 },
    districts: ['hollywood_hills', 'beach', 'arts_district'],
  },
  warehouse: {
    minHeight: 8,
    maxHeight: 20,
    baseSize: { min: 25, max: 50 },
    districts: ['industrial', 'arts_district'],
  },
  landmark: {
    minHeight: 20,
    maxHeight: 100,
    baseSize: { min: 40, max: 100 },
    districts: ['downtown', 'beach', 'hollywood_hills'],
  },
};

// Pathfinding configuration
export const PATHFINDING_CONFIG = {
  GRID_RESOLUTION: 2, // 2m pathfinding grid
  MAX_SLOPE: 0.5, // Maximum walkable slope
  DIAGONAL_COST: 1.414, // sqrt(2)
  STRAIGHT_COST: 1.0,
};

// Performance configuration
export const PERFORMANCE_CONFIG = {
  MAX_VISIBLE_CHUNKS: 100,
  CHUNK_LOAD_PRIORITY_DISTANCE: 200, // High priority within this distance
  CHUNK_UNLOAD_DISTANCE: 1000, // Unload beyond this
  BUILDING_INSTANCE_BATCH_SIZE: 100,
  PATHFINDING_WORKER_ENABLED: true,
};

// World seed (can be overridden for different city variants)
export const DEFAULT_WORLD_SEED = 42;

// Color palette for terrain
export const TERRAIN_COLORS = {
  grass: '#4ade80',
  dirt: '#a3a095',
  concrete: '#6b7280',
  sand: '#fcd34d',
  water: '#3b82f6',
};

// Shader uniforms defaults
export const SHADER_DEFAULTS = {
  fogNear: 400,
  fogFar: 800,
  fogColor: '#1a1a2e',
  ambientIntensity: 0.3,
  sunIntensity: 1.0,
  sunDirection: { x: 0.5, y: 0.8, z: 0.3 },
};
