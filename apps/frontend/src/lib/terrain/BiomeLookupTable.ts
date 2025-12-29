/**
 * BiomeLookupTable.ts
 * Data-driven biome assignment based on height, moisture, and temperature
 * Following proper terrain generation architecture: Height x Moisture x Temperature -> Biome
 */

// =============================================================================
// BIOME TYPES
// =============================================================================

export enum BiomeType {
  // Water biomes
  DEEP_OCEAN = 'deep_ocean',
  SHALLOW_OCEAN = 'shallow_ocean',

  // Coastal biomes
  BEACH = 'beach',
  MARSH = 'marsh',

  // Low elevation biomes
  GRASSLAND = 'grassland',
  MEADOW = 'meadow',
  SWAMP = 'swamp',

  // Forest biomes
  TEMPERATE_FOREST = 'temperate_forest',
  BOREAL_FOREST = 'boreal_forest',
  RAINFOREST = 'rainforest',

  // Dry biomes
  DESERT = 'desert',
  SAVANNA = 'savanna',
  SCRUBLAND = 'scrubland',

  // High elevation biomes
  ALPINE_MEADOW = 'alpine_meadow',
  ROCKY_MOUNTAIN = 'rocky_mountain',
  SNOW_PEAK = 'snow_peak',
  GLACIER = 'glacier',
}

// =============================================================================
// BIOME PROPERTIES
// =============================================================================

export interface BiomeProperties {
  /** Display name */
  name: string;
  /** Primary ground color (hex) */
  groundColor: number;
  /** Secondary ground color for variation (hex) */
  groundColor2: number;
  /** Vegetation density (0-1) */
  vegetationDensity: number;
  /** Tree density (0-1) */
  treeDensity: number;
  /** Rock density (0-1) */
  rockDensity: number;
  /** Can spawn water features */
  hasWater: boolean;
  /** Snow coverage (0-1) */
  snowCoverage: number;
}

export const BIOME_PROPERTIES: Record<BiomeType, BiomeProperties> = {
  [BiomeType.DEEP_OCEAN]: {
    name: 'Deep Ocean',
    groundColor: 0x1a4a6e,
    groundColor2: 0x0d3d5c,
    vegetationDensity: 0,
    treeDensity: 0,
    rockDensity: 0.1,
    hasWater: true,
    snowCoverage: 0,
  },
  [BiomeType.SHALLOW_OCEAN]: {
    name: 'Shallow Ocean',
    groundColor: 0x2e6b8a,
    groundColor2: 0x1a5570,
    vegetationDensity: 0.1,
    treeDensity: 0,
    rockDensity: 0.1,
    hasWater: true,
    snowCoverage: 0,
  },
  [BiomeType.BEACH]: {
    name: 'Beach',
    groundColor: 0xe8d5a3,
    groundColor2: 0xd4c090,
    vegetationDensity: 0.1,
    treeDensity: 0.05,
    rockDensity: 0.15,
    hasWater: false,
    snowCoverage: 0,
  },
  [BiomeType.MARSH]: {
    name: 'Marsh',
    groundColor: 0x5a7a4a,
    groundColor2: 0x4a6a3a,
    vegetationDensity: 0.8,
    treeDensity: 0.1,
    rockDensity: 0.05,
    hasWater: true,
    snowCoverage: 0,
  },
  [BiomeType.GRASSLAND]: {
    name: 'Grassland',
    groundColor: 0x7db84a,
    groundColor2: 0x6ba83a,
    vegetationDensity: 0.6,
    treeDensity: 0.05,
    rockDensity: 0.1,
    hasWater: false,
    snowCoverage: 0,
  },
  [BiomeType.MEADOW]: {
    name: 'Meadow',
    groundColor: 0x8dc85a,
    groundColor2: 0x7cb84a,
    vegetationDensity: 0.8,
    treeDensity: 0.1,
    rockDensity: 0.05,
    hasWater: false,
    snowCoverage: 0,
  },
  [BiomeType.SWAMP]: {
    name: 'Swamp',
    groundColor: 0x3a5a2a,
    groundColor2: 0x2a4a1a,
    vegetationDensity: 0.9,
    treeDensity: 0.4,
    rockDensity: 0.05,
    hasWater: true,
    snowCoverage: 0,
  },
  [BiomeType.TEMPERATE_FOREST]: {
    name: 'Temperate Forest',
    groundColor: 0x4a7a3a,
    groundColor2: 0x3a6a2a,
    vegetationDensity: 0.7,
    treeDensity: 0.7,
    rockDensity: 0.1,
    hasWater: false,
    snowCoverage: 0,
  },
  [BiomeType.BOREAL_FOREST]: {
    name: 'Boreal Forest',
    groundColor: 0x3a6a4a,
    groundColor2: 0x2a5a3a,
    vegetationDensity: 0.5,
    treeDensity: 0.6,
    rockDensity: 0.15,
    hasWater: false,
    snowCoverage: 0.1,
  },
  [BiomeType.RAINFOREST]: {
    name: 'Rainforest',
    groundColor: 0x2a5a2a,
    groundColor2: 0x1a4a1a,
    vegetationDensity: 1.0,
    treeDensity: 0.9,
    rockDensity: 0.05,
    hasWater: true,
    snowCoverage: 0,
  },
  [BiomeType.DESERT]: {
    name: 'Desert',
    groundColor: 0xd4b896,
    groundColor2: 0xc4a886,
    vegetationDensity: 0.05,
    treeDensity: 0.02,
    rockDensity: 0.3,
    hasWater: false,
    snowCoverage: 0,
  },
  [BiomeType.SAVANNA]: {
    name: 'Savanna',
    groundColor: 0xb8a860,
    groundColor2: 0xa89850,
    vegetationDensity: 0.3,
    treeDensity: 0.1,
    rockDensity: 0.1,
    hasWater: false,
    snowCoverage: 0,
  },
  [BiomeType.SCRUBLAND]: {
    name: 'Scrubland',
    groundColor: 0x8a7a5a,
    groundColor2: 0x7a6a4a,
    vegetationDensity: 0.25,
    treeDensity: 0.15,
    rockDensity: 0.2,
    hasWater: false,
    snowCoverage: 0,
  },
  [BiomeType.ALPINE_MEADOW]: {
    name: 'Alpine Meadow',
    groundColor: 0x7a9a5a,
    groundColor2: 0x6a8a4a,
    vegetationDensity: 0.4,
    treeDensity: 0.02,
    rockDensity: 0.25,
    hasWater: false,
    snowCoverage: 0.2,
  },
  [BiomeType.ROCKY_MOUNTAIN]: {
    name: 'Rocky Mountain',
    groundColor: 0x7a7a7a,
    groundColor2: 0x6a6a6a,
    vegetationDensity: 0.1,
    treeDensity: 0.02,
    rockDensity: 0.7,
    hasWater: false,
    snowCoverage: 0.3,
  },
  [BiomeType.SNOW_PEAK]: {
    name: 'Snow Peak',
    groundColor: 0xffffff,
    groundColor2: 0xe8e8e8,
    vegetationDensity: 0,
    treeDensity: 0,
    rockDensity: 0.4,
    hasWater: false,
    snowCoverage: 0.9,
  },
  [BiomeType.GLACIER]: {
    name: 'Glacier',
    groundColor: 0xd8f0ff,
    groundColor2: 0xc0e8ff,
    vegetationDensity: 0,
    treeDensity: 0,
    rockDensity: 0.1,
    hasWater: true,
    snowCoverage: 1.0,
  },
};

// =============================================================================
// HEIGHT ZONES
// =============================================================================

export enum HeightZone {
  DEEP_WATER = 0,    // < -10m
  SHALLOW_WATER = 1, // -10m to 0m
  COAST = 2,         // 0m to 5m
  LOWLAND = 3,       // 5m to 30m
  MIDLAND = 4,       // 30m to 80m
  HIGHLAND = 5,      // 80m to 140m
  MOUNTAIN = 6,      // > 140m
}

// =============================================================================
// MOISTURE ZONES
// =============================================================================

export enum MoistureZone {
  ARID = 0,       // 0.0 - 0.2
  DRY = 1,        // 0.2 - 0.4
  MODERATE = 2,   // 0.4 - 0.6
  HUMID = 3,      // 0.6 - 0.8
  WET = 4,        // 0.8 - 1.0
}

// =============================================================================
// TEMPERATURE ZONES
// =============================================================================

export enum TemperatureZone {
  FREEZING = 0,   // 0.0 - 0.2
  COLD = 1,       // 0.2 - 0.4
  TEMPERATE = 2,  // 0.4 - 0.6
  WARM = 3,       // 0.6 - 0.8
  HOT = 4,        // 0.8 - 1.0
}

// =============================================================================
// LOOKUP TABLE
// =============================================================================

/**
 * 3D lookup table: [height][moisture][temperature] -> BiomeType
 * Indexed by HeightZone, MoistureZone, TemperatureZone
 */
const BIOME_LOOKUP: BiomeType[][][] = [
  // DEEP_WATER (< -10m)
  [
    // Arid        Dry           Moderate      Humid         Wet
    [BiomeType.DEEP_OCEAN, BiomeType.DEEP_OCEAN, BiomeType.DEEP_OCEAN, BiomeType.DEEP_OCEAN, BiomeType.DEEP_OCEAN], // Freezing
    [BiomeType.DEEP_OCEAN, BiomeType.DEEP_OCEAN, BiomeType.DEEP_OCEAN, BiomeType.DEEP_OCEAN, BiomeType.DEEP_OCEAN], // Cold
    [BiomeType.DEEP_OCEAN, BiomeType.DEEP_OCEAN, BiomeType.DEEP_OCEAN, BiomeType.DEEP_OCEAN, BiomeType.DEEP_OCEAN], // Temperate
    [BiomeType.DEEP_OCEAN, BiomeType.DEEP_OCEAN, BiomeType.DEEP_OCEAN, BiomeType.DEEP_OCEAN, BiomeType.DEEP_OCEAN], // Warm
    [BiomeType.DEEP_OCEAN, BiomeType.DEEP_OCEAN, BiomeType.DEEP_OCEAN, BiomeType.DEEP_OCEAN, BiomeType.DEEP_OCEAN], // Hot
  ],
  // SHALLOW_WATER (-10m to 0m)
  [
    [BiomeType.SHALLOW_OCEAN, BiomeType.SHALLOW_OCEAN, BiomeType.SHALLOW_OCEAN, BiomeType.SHALLOW_OCEAN, BiomeType.SHALLOW_OCEAN],
    [BiomeType.SHALLOW_OCEAN, BiomeType.SHALLOW_OCEAN, BiomeType.SHALLOW_OCEAN, BiomeType.SHALLOW_OCEAN, BiomeType.SHALLOW_OCEAN],
    [BiomeType.SHALLOW_OCEAN, BiomeType.SHALLOW_OCEAN, BiomeType.SHALLOW_OCEAN, BiomeType.SHALLOW_OCEAN, BiomeType.SHALLOW_OCEAN],
    [BiomeType.SHALLOW_OCEAN, BiomeType.SHALLOW_OCEAN, BiomeType.SHALLOW_OCEAN, BiomeType.SHALLOW_OCEAN, BiomeType.SHALLOW_OCEAN],
    [BiomeType.SHALLOW_OCEAN, BiomeType.SHALLOW_OCEAN, BiomeType.SHALLOW_OCEAN, BiomeType.SHALLOW_OCEAN, BiomeType.SHALLOW_OCEAN],
  ],
  // COAST (0m to 5m)
  [
    [BiomeType.BEACH, BiomeType.BEACH, BiomeType.BEACH, BiomeType.MARSH, BiomeType.MARSH],       // Freezing
    [BiomeType.BEACH, BiomeType.BEACH, BiomeType.BEACH, BiomeType.MARSH, BiomeType.MARSH],       // Cold
    [BiomeType.BEACH, BiomeType.BEACH, BiomeType.BEACH, BiomeType.MARSH, BiomeType.SWAMP],       // Temperate
    [BiomeType.BEACH, BiomeType.BEACH, BiomeType.BEACH, BiomeType.MARSH, BiomeType.SWAMP],       // Warm
    [BiomeType.BEACH, BiomeType.BEACH, BiomeType.BEACH, BiomeType.SWAMP, BiomeType.SWAMP],       // Hot
  ],
  // LOWLAND (5m to 30m)
  [
    [BiomeType.SCRUBLAND, BiomeType.GRASSLAND, BiomeType.MEADOW, BiomeType.BOREAL_FOREST, BiomeType.BOREAL_FOREST], // Freezing
    [BiomeType.SCRUBLAND, BiomeType.GRASSLAND, BiomeType.MEADOW, BiomeType.BOREAL_FOREST, BiomeType.BOREAL_FOREST], // Cold
    [BiomeType.SAVANNA, BiomeType.GRASSLAND, BiomeType.MEADOW, BiomeType.TEMPERATE_FOREST, BiomeType.TEMPERATE_FOREST], // Temperate
    [BiomeType.SAVANNA, BiomeType.GRASSLAND, BiomeType.GRASSLAND, BiomeType.TEMPERATE_FOREST, BiomeType.RAINFOREST], // Warm
    [BiomeType.DESERT, BiomeType.SAVANNA, BiomeType.GRASSLAND, BiomeType.RAINFOREST, BiomeType.RAINFOREST], // Hot
  ],
  // MIDLAND (30m to 80m)
  [
    [BiomeType.SCRUBLAND, BiomeType.BOREAL_FOREST, BiomeType.BOREAL_FOREST, BiomeType.BOREAL_FOREST, BiomeType.BOREAL_FOREST], // Freezing
    [BiomeType.SCRUBLAND, BiomeType.SCRUBLAND, BiomeType.TEMPERATE_FOREST, BiomeType.BOREAL_FOREST, BiomeType.BOREAL_FOREST], // Cold
    [BiomeType.SCRUBLAND, BiomeType.GRASSLAND, BiomeType.TEMPERATE_FOREST, BiomeType.TEMPERATE_FOREST, BiomeType.TEMPERATE_FOREST], // Temperate
    [BiomeType.SAVANNA, BiomeType.SAVANNA, BiomeType.TEMPERATE_FOREST, BiomeType.TEMPERATE_FOREST, BiomeType.RAINFOREST], // Warm
    [BiomeType.DESERT, BiomeType.SAVANNA, BiomeType.SCRUBLAND, BiomeType.TEMPERATE_FOREST, BiomeType.RAINFOREST], // Hot
  ],
  // HIGHLAND (80m to 140m)
  [
    [BiomeType.ROCKY_MOUNTAIN, BiomeType.ALPINE_MEADOW, BiomeType.ALPINE_MEADOW, BiomeType.BOREAL_FOREST, BiomeType.GLACIER], // Freezing
    [BiomeType.ROCKY_MOUNTAIN, BiomeType.ALPINE_MEADOW, BiomeType.ALPINE_MEADOW, BiomeType.BOREAL_FOREST, BiomeType.BOREAL_FOREST], // Cold
    [BiomeType.ROCKY_MOUNTAIN, BiomeType.ALPINE_MEADOW, BiomeType.TEMPERATE_FOREST, BiomeType.TEMPERATE_FOREST, BiomeType.TEMPERATE_FOREST], // Temperate
    [BiomeType.ROCKY_MOUNTAIN, BiomeType.SCRUBLAND, BiomeType.ALPINE_MEADOW, BiomeType.TEMPERATE_FOREST, BiomeType.TEMPERATE_FOREST], // Warm
    [BiomeType.ROCKY_MOUNTAIN, BiomeType.DESERT, BiomeType.SCRUBLAND, BiomeType.SCRUBLAND, BiomeType.ALPINE_MEADOW], // Hot
  ],
  // MOUNTAIN (> 140m)
  [
    [BiomeType.GLACIER, BiomeType.SNOW_PEAK, BiomeType.SNOW_PEAK, BiomeType.GLACIER, BiomeType.GLACIER], // Freezing
    [BiomeType.SNOW_PEAK, BiomeType.SNOW_PEAK, BiomeType.ROCKY_MOUNTAIN, BiomeType.SNOW_PEAK, BiomeType.GLACIER], // Cold
    [BiomeType.ROCKY_MOUNTAIN, BiomeType.ROCKY_MOUNTAIN, BiomeType.ROCKY_MOUNTAIN, BiomeType.ALPINE_MEADOW, BiomeType.SNOW_PEAK], // Temperate
    [BiomeType.ROCKY_MOUNTAIN, BiomeType.ROCKY_MOUNTAIN, BiomeType.ROCKY_MOUNTAIN, BiomeType.ALPINE_MEADOW, BiomeType.ALPINE_MEADOW], // Warm
    [BiomeType.ROCKY_MOUNTAIN, BiomeType.ROCKY_MOUNTAIN, BiomeType.ROCKY_MOUNTAIN, BiomeType.ROCKY_MOUNTAIN, BiomeType.ALPINE_MEADOW], // Hot
  ],
];

// =============================================================================
// BIOME LOOKUP CLASS
// =============================================================================

export class BiomeLookupTable {
  /**
   * Get height zone from absolute height in meters
   */
  static getHeightZone(height: number): HeightZone {
    if (height < -10) return HeightZone.DEEP_WATER;
    if (height < 0) return HeightZone.SHALLOW_WATER;
    if (height < 5) return HeightZone.COAST;
    if (height < 30) return HeightZone.LOWLAND;
    if (height < 80) return HeightZone.MIDLAND;
    if (height < 140) return HeightZone.HIGHLAND;
    return HeightZone.MOUNTAIN;
  }

  /**
   * Get moisture zone from normalized moisture value (0-1)
   */
  static getMoistureZone(moisture: number): MoistureZone {
    const clamped = Math.max(0, Math.min(1, moisture));
    if (clamped < 0.2) return MoistureZone.ARID;
    if (clamped < 0.4) return MoistureZone.DRY;
    if (clamped < 0.6) return MoistureZone.MODERATE;
    if (clamped < 0.8) return MoistureZone.HUMID;
    return MoistureZone.WET;
  }

  /**
   * Get temperature zone from normalized temperature value (0-1)
   */
  static getTemperatureZone(temperature: number): TemperatureZone {
    const clamped = Math.max(0, Math.min(1, temperature));
    if (clamped < 0.2) return TemperatureZone.FREEZING;
    if (clamped < 0.4) return TemperatureZone.COLD;
    if (clamped < 0.6) return TemperatureZone.TEMPERATE;
    if (clamped < 0.8) return TemperatureZone.WARM;
    return TemperatureZone.HOT;
  }

  /**
   * Look up biome from height, moisture, and temperature
   * @param height - Absolute height in meters
   * @param moisture - Normalized moisture (0-1)
   * @param temperature - Normalized temperature (0-1)
   */
  static lookup(height: number, moisture: number, temperature: number): BiomeType {
    const heightZone = this.getHeightZone(height);
    const moistureZone = this.getMoistureZone(moisture);
    const temperatureZone = this.getTemperatureZone(temperature);

    return BIOME_LOOKUP[heightZone][temperatureZone][moistureZone];
  }

  /**
   * Get biome properties
   */
  static getProperties(biome: BiomeType): BiomeProperties {
    return BIOME_PROPERTIES[biome];
  }

  /**
   * Get interpolation weight between two biomes for smooth transitions
   * @param height - Height for primary zone
   * @param moisture - Moisture for primary zone
   * @param temperature - Temperature for primary zone
   * @returns Primary biome, secondary biome, and blend weight (0-1)
   */
  static lookupBlended(
    height: number,
    moisture: number,
    temperature: number
  ): { primary: BiomeType; secondary: BiomeType; blend: number } {
    const primary = this.lookup(height, moisture, temperature);

    // Check for zone boundaries and calculate blend weights
    const heightZone = this.getHeightZone(height);
    const moistureZone = this.getMoistureZone(moisture);
    const temperatureZone = this.getTemperatureZone(temperature);

    // Get zone boundaries for blending
    const heightThresholds = [-10, 0, 5, 30, 80, 140];
    const zoneThresholds = [0.2, 0.4, 0.6, 0.8];

    // Find closest boundary for height
    let heightBlend = 0;
    let adjacentHeightZone = heightZone;
    for (let i = 0; i < heightThresholds.length; i++) {
      const threshold = heightThresholds[i];
      const distance = Math.abs(height - threshold);
      const blendWidth = 5; // 5 meter blend zone
      if (distance < blendWidth) {
        heightBlend = 1 - distance / blendWidth;
        adjacentHeightZone = height < threshold ? Math.max(0, heightZone - 1) : Math.min(6, heightZone + 1);
        break;
      }
    }

    // Find closest boundary for moisture
    let moistureBlend = 0;
    let adjacentMoistureZone = moistureZone;
    for (const threshold of zoneThresholds) {
      const distance = Math.abs(moisture - threshold);
      const blendWidth = 0.05;
      if (distance < blendWidth) {
        moistureBlend = 1 - distance / blendWidth;
        adjacentMoistureZone = moisture < threshold ? Math.max(0, moistureZone - 1) : Math.min(4, moistureZone + 1);
        break;
      }
    }

    // Use the strongest blend factor
    let secondary = primary;
    let blend = 0;

    if (heightBlend > moistureBlend) {
      secondary = BIOME_LOOKUP[adjacentHeightZone][temperatureZone][moistureZone];
      blend = heightBlend * 0.5; // Reduce blend strength
    } else if (moistureBlend > 0) {
      secondary = BIOME_LOOKUP[heightZone][temperatureZone][adjacentMoistureZone];
      blend = moistureBlend * 0.5;
    }

    return { primary, secondary, blend };
  }
}

// Export singleton for convenience
export const biomeLookup = BiomeLookupTable;
