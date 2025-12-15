/**
 * District Types and Definitions
 * LA-inspired districts for the music industry city
 */

import { DistrictType, DISTRICTS, PLOT_TIERS } from './CityConfig';

// Zone types within districts
export type ZoneType =
  | 'commercial'
  | 'residential'
  | 'entertainment'
  | 'industrial'
  | 'park'
  | 'landmark'
  | 'waterfront';

// Plot tier keys
export type PlotTier = keyof typeof PLOT_TIERS;

// Music industry specific venue types
export type VenueType =
  | 'recording_studio'
  | 'record_label'
  | 'live_venue'
  | 'radio_station'
  | 'music_school'
  | 'instrument_shop'
  | 'talent_agency'
  | 'publishing_house'
  | 'streaming_office'
  | 'rehearsal_space'
  | 'club'
  | 'concert_hall'
  | 'festival_grounds'
  | 'artist_residence'
  | 'merch_store';

// District-specific venue distributions
export const DISTRICT_VENUES: Record<DistrictType, VenueType[]> = {
  downtown: [
    'record_label',
    'publishing_house',
    'streaming_office',
    'talent_agency',
    'live_venue',
    'concert_hall',
  ],
  hollywood_hills: [
    'artist_residence',
    'recording_studio',
    'rehearsal_space',
  ],
  arts_district: [
    'recording_studio',
    'music_school',
    'instrument_shop',
    'rehearsal_space',
    'club',
    'merch_store',
  ],
  beach: [
    'live_venue',
    'club',
    'festival_grounds',
    'radio_station',
  ],
  industrial: [
    'rehearsal_space',
    'recording_studio',
    'club',
    'merch_store',
  ],
};

// Detailed zone configuration
export interface ZoneConfig {
  type: ZoneType;
  allowedPlotTiers: PlotTier[];
  allowedVenues: VenueType[];
  buildingDensityMultiplier: number;
  maxHeight: number;
  minHeight: number;
  parkProbability: number; // Chance of a plot being a park
}

// Zone configurations per district
export const DISTRICT_ZONES: Record<DistrictType, ZoneConfig[]> = {
  downtown: [
    {
      type: 'commercial',
      allowedPlotTiers: ['MEDIUM', 'LARGE', 'LANDMARK'],
      allowedVenues: ['record_label', 'publishing_house', 'streaming_office', 'talent_agency'],
      buildingDensityMultiplier: 1.0,
      maxHeight: 200,
      minHeight: 50,
      parkProbability: 0.05,
    },
    {
      type: 'entertainment',
      allowedPlotTiers: ['MEDIUM', 'LARGE'],
      allowedVenues: ['live_venue', 'concert_hall', 'club'],
      buildingDensityMultiplier: 0.8,
      maxHeight: 100,
      minHeight: 20,
      parkProbability: 0.1,
    },
  ],
  hollywood_hills: [
    {
      type: 'residential',
      allowedPlotTiers: ['MEDIUM', 'LARGE', 'LANDMARK'],
      allowedVenues: ['artist_residence'],
      buildingDensityMultiplier: 0.3,
      maxHeight: 25,
      minHeight: 8,
      parkProbability: 0.2,
    },
    {
      type: 'entertainment',
      allowedPlotTiers: ['SMALL', 'MEDIUM'],
      allowedVenues: ['recording_studio', 'rehearsal_space'],
      buildingDensityMultiplier: 0.4,
      maxHeight: 15,
      minHeight: 5,
      parkProbability: 0.15,
    },
  ],
  arts_district: [
    {
      type: 'commercial',
      allowedPlotTiers: ['MICRO', 'SMALL', 'MEDIUM'],
      allowedVenues: ['instrument_shop', 'music_school', 'merch_store'],
      buildingDensityMultiplier: 0.7,
      maxHeight: 40,
      minHeight: 10,
      parkProbability: 0.1,
    },
    {
      type: 'entertainment',
      allowedPlotTiers: ['SMALL', 'MEDIUM', 'LARGE'],
      allowedVenues: ['recording_studio', 'rehearsal_space', 'club'],
      buildingDensityMultiplier: 0.6,
      maxHeight: 30,
      minHeight: 8,
      parkProbability: 0.12,
    },
    {
      type: 'park',
      allowedPlotTiers: ['MICRO', 'SMALL'],
      allowedVenues: [],
      buildingDensityMultiplier: 0,
      maxHeight: 0,
      minHeight: 0,
      parkProbability: 1.0,
    },
  ],
  beach: [
    {
      type: 'waterfront',
      allowedPlotTiers: ['SMALL', 'MEDIUM', 'LARGE'],
      allowedVenues: ['live_venue', 'club', 'festival_grounds'],
      buildingDensityMultiplier: 0.5,
      maxHeight: 30,
      minHeight: 5,
      parkProbability: 0.25,
    },
    {
      type: 'entertainment',
      allowedPlotTiers: ['MICRO', 'SMALL', 'MEDIUM'],
      allowedVenues: ['radio_station', 'club'],
      buildingDensityMultiplier: 0.4,
      maxHeight: 25,
      minHeight: 5,
      parkProbability: 0.2,
    },
  ],
  industrial: [
    {
      type: 'industrial',
      allowedPlotTiers: ['MEDIUM', 'LARGE'],
      allowedVenues: ['rehearsal_space', 'recording_studio', 'merch_store'],
      buildingDensityMultiplier: 0.6,
      maxHeight: 20,
      minHeight: 8,
      parkProbability: 0.05,
    },
    {
      type: 'entertainment',
      allowedPlotTiers: ['MEDIUM', 'LARGE'],
      allowedVenues: ['club'],
      buildingDensityMultiplier: 0.5,
      maxHeight: 15,
      minHeight: 8,
      parkProbability: 0.08,
    },
  ],
};

// Landmark definitions (special locations in each district)
export interface LandmarkDefinition {
  name: string;
  district: DistrictType;
  position: { x: number; z: number }; // Relative to world center
  size: { width: number; depth: number };
  height: number;
  description: string;
  venueType: VenueType;
  modelUrl?: string; // Optional custom GLB model
}

export const LANDMARKS: LandmarkDefinition[] = [
  {
    name: 'Producer Tower',
    district: 'downtown',
    position: { x: 0, z: 0 },
    size: { width: 80, depth: 80 },
    height: 200,
    description: 'The iconic central tower of the city, home to major labels',
    venueType: 'record_label',
  },
  {
    name: 'Sunset Studios',
    district: 'hollywood_hills',
    position: { x: 300, z: 400 },
    size: { width: 100, depth: 60 },
    height: 20,
    description: 'Legendary recording studio in the hills',
    venueType: 'recording_studio',
  },
  {
    name: 'The Warehouse',
    district: 'industrial',
    position: { x: -400, z: -300 },
    size: { width: 80, depth: 100 },
    height: 15,
    description: 'Underground club and rehearsal complex',
    venueType: 'club',
  },
  {
    name: 'Beachfront Arena',
    district: 'beach',
    position: { x: 500, z: -200 },
    size: { width: 150, depth: 120 },
    height: 40,
    description: 'Open-air concert venue on the waterfront',
    venueType: 'concert_hall',
  },
  {
    name: 'Arts Plaza',
    district: 'arts_district',
    position: { x: -200, z: 200 },
    size: { width: 60, depth: 60 },
    height: 25,
    description: 'Community hub for independent artists',
    venueType: 'music_school',
  },
];

// District boundary calculator
export interface DistrictBoundary {
  type: DistrictType;
  center: { x: number; z: number };
  radius: number; // Approximate radius
  vertices: { x: number; z: number }[]; // Polygon vertices
}

// Generate district boundaries based on city layout
export function generateDistrictBoundaries(
  worldSize: number,
  _seed: number // Reserved for future procedural boundary generation
): DistrictBoundary[] {
  const halfSize = worldSize / 2;

  // LA-inspired layout:
  // - Downtown in center
  // - Hollywood Hills to the north
  // - Beach district to the south/west
  // - Arts District to the east
  // - Industrial to the south/east

  return [
    {
      type: 'downtown',
      center: { x: 0, z: 0 },
      radius: 300,
      vertices: [
        { x: -200, z: -200 },
        { x: 200, z: -200 },
        { x: 250, z: 0 },
        { x: 200, z: 200 },
        { x: -200, z: 200 },
        { x: -250, z: 0 },
      ],
    },
    {
      type: 'hollywood_hills',
      center: { x: 0, z: 500 },
      radius: 400,
      vertices: [
        { x: -500, z: 300 },
        { x: 500, z: 300 },
        { x: 600, z: halfSize },
        { x: -600, z: halfSize },
      ],
    },
    {
      type: 'beach',
      center: { x: -500, z: -300 },
      radius: 350,
      vertices: [
        { x: -halfSize, z: -halfSize },
        { x: -200, z: -halfSize },
        { x: -200, z: -200 },
        { x: -halfSize, z: 200 },
      ],
    },
    {
      type: 'arts_district',
      center: { x: 400, z: 100 },
      radius: 300,
      vertices: [
        { x: 250, z: -200 },
        { x: halfSize, z: -300 },
        { x: halfSize, z: 400 },
        { x: 300, z: 300 },
      ],
    },
    {
      type: 'industrial',
      center: { x: 200, z: -500 },
      radius: 350,
      vertices: [
        { x: -100, z: -200 },
        { x: halfSize, z: -300 },
        { x: halfSize, z: -halfSize },
        { x: -200, z: -halfSize },
      ],
    },
  ];
}

// Helper to determine which district a point belongs to
export function getDistrictAtPosition(
  x: number,
  z: number,
  boundaries: DistrictBoundary[]
): DistrictType {
  // Point-in-polygon check for each district
  for (const boundary of boundaries) {
    if (isPointInPolygon(x, z, boundary.vertices)) {
      return boundary.type;
    }
  }

  // Default to arts_district if outside all boundaries
  return 'arts_district';
}

// Ray casting algorithm for point-in-polygon
function isPointInPolygon(
  x: number,
  z: number,
  vertices: { x: number; z: number }[]
): boolean {
  let inside = false;
  const n = vertices.length;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = vertices[i].x;
    const zi = vertices[i].z;
    const xj = vertices[j].x;
    const zj = vertices[j].z;

    if (
      zi > z !== zj > z &&
      x < ((xj - xi) * (z - zi)) / (zj - zi) + xi
    ) {
      inside = !inside;
    }
  }

  return inside;
}

// Get district info with all metadata
export function getDistrictInfo(district: DistrictType) {
  return {
    ...DISTRICTS[district],
    venues: DISTRICT_VENUES[district],
    zones: DISTRICT_ZONES[district],
    landmarks: LANDMARKS.filter((l) => l.district === district),
  };
}

// Export venue metadata
export const VENUE_METADATA: Record<
  VenueType,
  {
    name: string;
    description: string;
    icon: string;
    minPlotTier: PlotTier;
    basePrice: number; // In ETH equivalent
  }
> = {
  recording_studio: {
    name: 'Recording Studio',
    description: 'Professional audio recording facility',
    icon: 'microphone',
    minPlotTier: 'SMALL',
    basePrice: 0.5,
  },
  record_label: {
    name: 'Record Label',
    description: 'Music label headquarters',
    icon: 'disc',
    minPlotTier: 'MEDIUM',
    basePrice: 2.0,
  },
  live_venue: {
    name: 'Live Venue',
    description: 'Concert and performance space',
    icon: 'stage',
    minPlotTier: 'MEDIUM',
    basePrice: 1.5,
  },
  radio_station: {
    name: 'Radio Station',
    description: 'Broadcasting facility',
    icon: 'radio',
    minPlotTier: 'SMALL',
    basePrice: 0.8,
  },
  music_school: {
    name: 'Music School',
    description: 'Education and training center',
    icon: 'school',
    minPlotTier: 'MEDIUM',
    basePrice: 1.0,
  },
  instrument_shop: {
    name: 'Instrument Shop',
    description: 'Musical equipment retail',
    icon: 'guitar',
    minPlotTier: 'MICRO',
    basePrice: 0.3,
  },
  talent_agency: {
    name: 'Talent Agency',
    description: 'Artist management office',
    icon: 'briefcase',
    minPlotTier: 'SMALL',
    basePrice: 0.7,
  },
  publishing_house: {
    name: 'Publishing House',
    description: 'Music publishing company',
    icon: 'document',
    minPlotTier: 'MEDIUM',
    basePrice: 1.2,
  },
  streaming_office: {
    name: 'Streaming Platform Office',
    description: 'Digital distribution headquarters',
    icon: 'cloud',
    minPlotTier: 'LARGE',
    basePrice: 3.0,
  },
  rehearsal_space: {
    name: 'Rehearsal Space',
    description: 'Practice and jam rooms',
    icon: 'drum',
    minPlotTier: 'MICRO',
    basePrice: 0.2,
  },
  club: {
    name: 'Club',
    description: 'Nightclub and DJ venue',
    icon: 'sparkles',
    minPlotTier: 'SMALL',
    basePrice: 0.6,
  },
  concert_hall: {
    name: 'Concert Hall',
    description: 'Large performance venue',
    icon: 'building',
    minPlotTier: 'LARGE',
    basePrice: 5.0,
  },
  festival_grounds: {
    name: 'Festival Grounds',
    description: 'Outdoor event space',
    icon: 'tent',
    minPlotTier: 'LANDMARK',
    basePrice: 10.0,
  },
  artist_residence: {
    name: 'Artist Residence',
    description: 'Luxury home for artists',
    icon: 'home',
    minPlotTier: 'MEDIUM',
    basePrice: 2.5,
  },
  merch_store: {
    name: 'Merch Store',
    description: 'Artist merchandise retail',
    icon: 'shopping-bag',
    minPlotTier: 'MICRO',
    basePrice: 0.25,
  },
};
