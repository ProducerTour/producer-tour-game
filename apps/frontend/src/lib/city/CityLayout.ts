/**
 * City Layout Generator
 * Generates the procedural city structure including districts, roads, blocks, and plots
 */

import {
  WORLD_SIZE,
  CHUNK_SIZE,
  ROAD_CONFIG,
  type DistrictType,
} from './CityConfig';
import { noiseGenerator } from './NoiseGenerator';
import {
  generateDistrictBoundaries,
  getDistrictAtPosition,
  type DistrictBoundary,
  LANDMARKS,
  type LandmarkDefinition,
} from './DistrictTypes';

// Road types
export type RoadType = 'boulevard' | 'street' | 'alley';

// Road segment definition
export interface RoadSegment {
  id: string;
  type: RoadType;
  start: { x: number; z: number };
  end: { x: number; z: number };
  width: number;
}

// Intersection node
export interface IntersectionNode {
  id: string;
  position: { x: number; z: number };
  connectedRoads: string[]; // Road segment IDs
}

// City block (area between roads)
export interface CityBlock {
  id: string;
  district: DistrictType;
  bounds: {
    minX: number;
    minZ: number;
    maxX: number;
    maxZ: number;
  };
  plots: Plot[];
  isLandmark: boolean;
  landmark?: LandmarkDefinition;
}

// Individual plot
export interface Plot {
  id: string;
  blockId: string;
  district: DistrictType;
  position: { x: number; z: number };
  size: { width: number; depth: number };
  rotation: number; // Radians
  buildable: boolean;
  ownerId?: string; // NFT owner address
  tokenId?: string; // NFT token ID
  buildingId?: string; // If a building exists
}

// Complete city layout
export interface CityLayoutData {
  seed: number;
  worldSize: number;
  districts: DistrictBoundary[];
  roads: RoadSegment[];
  intersections: IntersectionNode[];
  blocks: CityBlock[];
  plots: Plot[];
  landmarks: LandmarkDefinition[];
}

/**
 * City Layout Generator class
 */
export class CityLayoutGenerator {
  private seed: number;
  private worldSize: number;
  private halfSize: number;
  private districts: DistrictBoundary[];
  private roads: RoadSegment[] = [];
  private intersections: IntersectionNode[] = [];
  private blocks: CityBlock[] = [];
  private plots: Plot[] = [];

  constructor(seed: number = 42, worldSize: number = WORLD_SIZE) {
    this.seed = seed;
    this.worldSize = worldSize;
    this.halfSize = worldSize / 2;
    this.districts = generateDistrictBoundaries(worldSize, seed);

    // Set noise generator seed
    noiseGenerator.setSeed(seed);
  }

  /**
   * Generate the complete city layout
   */
  generate(): CityLayoutData {
    console.log('[CityLayout] Generating city layout with seed:', this.seed);

    // Step 1: Generate road network
    this.generateRoads();

    // Step 2: Generate city blocks from roads
    this.generateBlocks();

    // Step 3: Subdivide blocks into plots
    this.generatePlots();

    // Step 4: Place landmarks
    this.placeLandmarks();

    console.log('[CityLayout] Generated:', {
      roads: this.roads.length,
      intersections: this.intersections.length,
      blocks: this.blocks.length,
      plots: this.plots.length,
    });

    return {
      seed: this.seed,
      worldSize: this.worldSize,
      districts: this.districts,
      roads: this.roads,
      intersections: this.intersections,
      blocks: this.blocks,
      plots: this.plots,
      landmarks: LANDMARKS,
    };
  }

  /**
   * Generate the road network
   */
  private generateRoads(): void {
    const { GRID_SPACING, BOULEVARD_WIDTH, STREET_WIDTH } = ROAD_CONFIG;

    // Main boulevards (grid pattern)
    const boulevardSpacing = GRID_SPACING * 2;

    // Horizontal boulevards
    for (let z = -this.halfSize; z <= this.halfSize; z += boulevardSpacing) {
      // Add some organic variation based on noise
      const offset = noiseGenerator.getRoadNoise(0, z) * 20;
      const adjustedZ = z + offset;

      this.roads.push({
        id: `boulevard-h-${z}`,
        type: 'boulevard',
        start: { x: -this.halfSize, z: adjustedZ },
        end: { x: this.halfSize, z: adjustedZ },
        width: BOULEVARD_WIDTH,
      });
    }

    // Vertical boulevards
    for (let x = -this.halfSize; x <= this.halfSize; x += boulevardSpacing) {
      const offset = noiseGenerator.getRoadNoise(x, 0) * 20;
      const adjustedX = x + offset;

      this.roads.push({
        id: `boulevard-v-${x}`,
        type: 'boulevard',
        start: { x: adjustedX, z: -this.halfSize },
        end: { x: adjustedX, z: this.halfSize },
        width: BOULEVARD_WIDTH,
      });
    }

    // Secondary streets between boulevards
    for (let z = -this.halfSize + GRID_SPACING; z < this.halfSize; z += boulevardSpacing) {
      // Skip if too close to a boulevard
      const nearestBoulevard = Math.round(z / boulevardSpacing) * boulevardSpacing;
      if (Math.abs(z - nearestBoulevard) < GRID_SPACING * 0.3) continue;

      this.roads.push({
        id: `street-h-${z}`,
        type: 'street',
        start: { x: -this.halfSize, z },
        end: { x: this.halfSize, z },
        width: STREET_WIDTH,
      });
    }

    for (let x = -this.halfSize + GRID_SPACING; x < this.halfSize; x += boulevardSpacing) {
      const nearestBoulevard = Math.round(x / boulevardSpacing) * boulevardSpacing;
      if (Math.abs(x - nearestBoulevard) < GRID_SPACING * 0.3) continue;

      this.roads.push({
        id: `street-v-${x}`,
        type: 'street',
        start: { x, z: -this.halfSize },
        end: { x, z: this.halfSize },
        width: STREET_WIDTH,
      });
    }

    // Generate intersections
    this.generateIntersections();

    // Add alleys in dense districts
    this.generateAlleys();
  }

  /**
   * Generate intersection nodes from road crossings
   */
  private generateIntersections(): void {
    const horizontalRoads = this.roads.filter(
      (r) => Math.abs(r.end.x - r.start.x) > Math.abs(r.end.z - r.start.z)
    );
    const verticalRoads = this.roads.filter(
      (r) => Math.abs(r.end.z - r.start.z) > Math.abs(r.end.x - r.start.x)
    );

    for (const hRoad of horizontalRoads) {
      for (const vRoad of verticalRoads) {
        // Check if roads intersect
        const hZ = (hRoad.start.z + hRoad.end.z) / 2;
        const vX = (vRoad.start.x + vRoad.end.x) / 2;

        // Check if intersection point is within both roads
        if (
          vX >= Math.min(hRoad.start.x, hRoad.end.x) &&
          vX <= Math.max(hRoad.start.x, hRoad.end.x) &&
          hZ >= Math.min(vRoad.start.z, vRoad.end.z) &&
          hZ <= Math.max(vRoad.start.z, vRoad.end.z)
        ) {
          this.intersections.push({
            id: `intersection-${hRoad.id}-${vRoad.id}`,
            position: { x: vX, z: hZ },
            connectedRoads: [hRoad.id, vRoad.id],
          });
        }
      }
    }
  }

  /**
   * Generate alleys in high-density areas
   */
  private generateAlleys(): void {
    const { ALLEY_WIDTH, GRID_SPACING } = ROAD_CONFIG;

    // Add alleys in downtown and arts district
    for (const block of this.blocks) {
      const district = getDistrictAtPosition(
        (block.bounds.minX + block.bounds.maxX) / 2,
        (block.bounds.minZ + block.bounds.maxZ) / 2,
        this.districts
      );

      if (district === 'downtown' || district === 'arts_district') {
        const blockWidth = block.bounds.maxX - block.bounds.minX;
        const blockDepth = block.bounds.maxZ - block.bounds.minZ;

        // Add vertical alley if block is wide enough
        if (blockWidth > GRID_SPACING * 1.5) {
          const alleyX = (block.bounds.minX + block.bounds.maxX) / 2;
          this.roads.push({
            id: `alley-${block.id}-v`,
            type: 'alley',
            start: { x: alleyX, z: block.bounds.minZ },
            end: { x: alleyX, z: block.bounds.maxZ },
            width: ALLEY_WIDTH,
          });
        }

        // Add horizontal alley if block is deep enough
        if (blockDepth > GRID_SPACING * 1.5) {
          const alleyZ = (block.bounds.minZ + block.bounds.maxZ) / 2;
          this.roads.push({
            id: `alley-${block.id}-h`,
            type: 'alley',
            start: { x: block.bounds.minX, z: alleyZ },
            end: { x: block.bounds.maxX, z: alleyZ },
            width: ALLEY_WIDTH,
          });
        }
      }
    }
  }

  /**
   * Generate city blocks from road network
   */
  private generateBlocks(): void {
    // Sort roads into horizontal and vertical
    const horizontalRoads = this.roads
      .filter((r) => r.type !== 'alley')
      .filter((r) => Math.abs(r.end.x - r.start.x) > Math.abs(r.end.z - r.start.z))
      .sort((a, b) => a.start.z - b.start.z);

    const verticalRoads = this.roads
      .filter((r) => r.type !== 'alley')
      .filter((r) => Math.abs(r.end.z - r.start.z) > Math.abs(r.end.x - r.start.x))
      .sort((a, b) => a.start.x - b.start.x);

    // Get unique Z coordinates (horizontal road positions)
    const zPositions = [...new Set(horizontalRoads.map((r) => r.start.z))].sort(
      (a, b) => a - b
    );
    const xPositions = [...new Set(verticalRoads.map((r) => r.start.x))].sort(
      (a, b) => a - b
    );

    // Create blocks between roads
    for (let i = 0; i < xPositions.length - 1; i++) {
      for (let j = 0; j < zPositions.length - 1; j++) {
        const minX = xPositions[i] + ROAD_CONFIG.BOULEVARD_WIDTH / 2;
        const maxX = xPositions[i + 1] - ROAD_CONFIG.BOULEVARD_WIDTH / 2;
        const minZ = zPositions[j] + ROAD_CONFIG.BOULEVARD_WIDTH / 2;
        const maxZ = zPositions[j + 1] - ROAD_CONFIG.BOULEVARD_WIDTH / 2;

        // Skip if block is too small
        if (maxX - minX < 20 || maxZ - minZ < 20) continue;

        const centerX = (minX + maxX) / 2;
        const centerZ = (minZ + maxZ) / 2;
        const district = getDistrictAtPosition(centerX, centerZ, this.districts);

        this.blocks.push({
          id: `block-${i}-${j}`,
          district,
          bounds: { minX, minZ, maxX, maxZ },
          plots: [],
          isLandmark: false,
        });
      }
    }
  }

  /**
   * Subdivide blocks into plots
   */
  private generatePlots(): void {
    for (const block of this.blocks) {
      const blockWidth = block.bounds.maxX - block.bounds.minX;
      const blockDepth = block.bounds.maxZ - block.bounds.minZ;

      // Determine plot size based on district
      let plotWidth: number;
      let plotDepth: number;

      switch (block.district) {
        case 'downtown':
          plotWidth = 50;
          plotDepth = 50;
          break;
        case 'hollywood_hills':
          plotWidth = 80;
          plotDepth = 100;
          break;
        case 'beach':
          plotWidth = 40;
          plotDepth = 60;
          break;
        case 'industrial':
          plotWidth = 60;
          plotDepth = 80;
          break;
        case 'arts_district':
        default:
          plotWidth = 25;
          plotDepth = 30;
          break;
      }

      // Calculate how many plots fit
      const numPlotsX = Math.max(1, Math.floor(blockWidth / plotWidth));
      const numPlotsZ = Math.max(1, Math.floor(blockDepth / plotDepth));

      // Recalculate actual plot sizes to fill block evenly
      const actualPlotWidth = blockWidth / numPlotsX;
      const actualPlotDepth = blockDepth / numPlotsZ;

      for (let px = 0; px < numPlotsX; px++) {
        for (let pz = 0; pz < numPlotsZ; pz++) {
          const plotX = block.bounds.minX + px * actualPlotWidth + actualPlotWidth / 2;
          const plotZ = block.bounds.minZ + pz * actualPlotDepth + actualPlotDepth / 2;

          // Use noise to determine if plot is buildable
          const buildableNoise = noiseGenerator.getBuildingNoise(plotX, plotZ);
          const buildable = buildableNoise > 0.15; // 85% buildable

          const plot: Plot = {
            id: `plot-${block.id}-${px}-${pz}`,
            blockId: block.id,
            district: block.district,
            position: { x: plotX, z: plotZ },
            size: { width: actualPlotWidth - 2, depth: actualPlotDepth - 2 }, // 1m margin
            rotation: 0,
            buildable,
          };

          this.plots.push(plot);
          block.plots.push(plot);
        }
      }
    }
  }

  /**
   * Place landmark buildings
   */
  private placeLandmarks(): void {
    for (const landmark of LANDMARKS) {
      // Find the block that contains this landmark
      const block = this.blocks.find(
        (b) =>
          landmark.position.x >= b.bounds.minX &&
          landmark.position.x <= b.bounds.maxX &&
          landmark.position.z >= b.bounds.minZ &&
          landmark.position.z <= b.bounds.maxZ
      );

      if (block) {
        block.isLandmark = true;
        block.landmark = landmark;

        // Mark all plots in this block as part of landmark
        for (const plot of block.plots) {
          plot.buildable = false; // Landmark takes precedence
        }

        // Create a single large plot for the landmark
        const landmarkPlot: Plot = {
          id: `plot-landmark-${landmark.name.toLowerCase().replace(/\s/g, '-')}`,
          blockId: block.id,
          district: landmark.district,
          position: landmark.position,
          size: { width: landmark.size.width, depth: landmark.size.depth },
          rotation: 0,
          buildable: false, // Landmark is pre-built
        };

        this.plots.push(landmarkPlot);
      }
    }
  }

  /**
   * Get district at a world position
   */
  getDistrictAt(x: number, z: number): DistrictType {
    return getDistrictAtPosition(x, z, this.districts);
  }

  /**
   * Get plot at a world position
   */
  getPlotAt(x: number, z: number): Plot | null {
    for (const plot of this.plots) {
      const halfWidth = plot.size.width / 2;
      const halfDepth = plot.size.depth / 2;

      if (
        x >= plot.position.x - halfWidth &&
        x <= plot.position.x + halfWidth &&
        z >= plot.position.z - halfDepth &&
        z <= plot.position.z + halfDepth
      ) {
        return plot;
      }
    }
    return null;
  }

  /**
   * Get all plots in a chunk
   */
  getPlotsInChunk(chunkX: number, chunkZ: number): Plot[] {
    const minX = chunkX * CHUNK_SIZE;
    const maxX = (chunkX + 1) * CHUNK_SIZE;
    const minZ = chunkZ * CHUNK_SIZE;
    const maxZ = (chunkZ + 1) * CHUNK_SIZE;

    return this.plots.filter((plot) => {
      return (
        plot.position.x >= minX &&
        plot.position.x < maxX &&
        plot.position.z >= minZ &&
        plot.position.z < maxZ
      );
    });
  }

  /**
   * Get all roads in a chunk
   */
  getRoadsInChunk(chunkX: number, chunkZ: number): RoadSegment[] {
    const minX = chunkX * CHUNK_SIZE;
    const maxX = (chunkX + 1) * CHUNK_SIZE;
    const minZ = chunkZ * CHUNK_SIZE;
    const maxZ = (chunkZ + 1) * CHUNK_SIZE;

    return this.roads.filter((road) => {
      // Check if road segment intersects chunk bounds
      const roadMinX = Math.min(road.start.x, road.end.x) - road.width / 2;
      const roadMaxX = Math.max(road.start.x, road.end.x) + road.width / 2;
      const roadMinZ = Math.min(road.start.z, road.end.z) - road.width / 2;
      const roadMaxZ = Math.max(road.start.z, road.end.z) + road.width / 2;

      return !(roadMaxX < minX || roadMinX > maxX || roadMaxZ < minZ || roadMinZ > maxZ);
    });
  }
}

// Singleton instance
let layoutInstance: CityLayoutGenerator | null = null;

export function getCityLayout(seed?: number): CityLayoutGenerator {
  if (!layoutInstance || (seed !== undefined && seed !== layoutInstance['seed'])) {
    layoutInstance = new CityLayoutGenerator(seed);
  }
  return layoutInstance;
}

export function generateCityLayout(seed?: number): CityLayoutData {
  const generator = getCityLayout(seed);
  return generator.generate();
}
