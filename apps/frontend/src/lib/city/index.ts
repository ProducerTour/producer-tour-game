/**
 * City Library - Procedural City World Generation
 *
 * This library provides all the tools needed to generate and render
 * a procedural city world with web3 plot ownership.
 */

// Configuration
export * from './CityConfig';

// Noise Generation
export { NoiseGenerator, noiseGenerator } from './NoiseGenerator';

// District Types and Definitions
export * from './DistrictTypes';

// City Layout Generation
export {
  CityLayoutGenerator,
  getCityLayout,
  generateCityLayout,
  type CityLayoutData,
  type RoadSegment,
  type IntersectionNode,
  type CityBlock,
  type Plot,
  type RoadType,
} from './CityLayout';

// Road Generation
export {
  generateRoadSegmentMesh,
  generateIntersectionMesh,
  mergeRoadGeometries,
  getRoadMaterial,
  getSidewalkMaterial,
  getMarkingsMaterial,
  type RoadMeshData,
} from './RoadGenerator';

// World Management
export {
  CityWorldManager,
  getCityWorldManager,
  disposeCityWorldManager,
  type ChunkState,
  type VisibleChunk,
  type CityWorldState,
} from './CityWorldManager';
