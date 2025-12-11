import { useEffect, useRef, useState } from 'react';
import Globe, { GlobeMethods } from 'react-globe.gl';

// Major music markets / PRO territories with coordinates
const TERRITORY_POINTS = [
  // North America
  { lat: 40.7128, lng: -74.006, name: 'New York', size: 0.8 },
  { lat: 34.0522, lng: -118.2437, name: 'Los Angeles', size: 0.9 },
  { lat: 41.8781, lng: -87.6298, name: 'Chicago', size: 0.5 },
  { lat: 29.7604, lng: -95.3698, name: 'Houston', size: 0.4 },
  { lat: 33.749, lng: -84.388, name: 'Atlanta', size: 0.7 },
  { lat: 36.1627, lng: -86.7816, name: 'Nashville', size: 0.8 },
  { lat: 43.6532, lng: -79.3832, name: 'Toronto', size: 0.5 },

  // Europe
  { lat: 51.5074, lng: -0.1278, name: 'London', size: 0.9 },
  { lat: 48.8566, lng: 2.3522, name: 'Paris', size: 0.6 },
  { lat: 52.52, lng: 13.405, name: 'Berlin', size: 0.6 },
  { lat: 52.3676, lng: 4.9041, name: 'Amsterdam', size: 0.4 },
  { lat: 59.3293, lng: 18.0686, name: 'Stockholm', size: 0.5 },
  { lat: 40.4168, lng: -3.7038, name: 'Madrid', size: 0.4 },

  // Asia Pacific
  { lat: 35.6762, lng: 139.6503, name: 'Tokyo', size: 0.8 },
  { lat: 37.5665, lng: 126.978, name: 'Seoul', size: 0.5 },
  { lat: 22.3193, lng: 114.1694, name: 'Hong Kong', size: 0.4 },
  { lat: 1.3521, lng: 103.8198, name: 'Singapore', size: 0.4 },
  { lat: -33.8688, lng: 151.2093, name: 'Sydney', size: 0.5 },
  { lat: -36.8485, lng: 174.7633, name: 'Auckland', size: 0.3 },

  // Latin America
  { lat: -23.5505, lng: -46.6333, name: 'Sao Paulo', size: 0.6 },
  { lat: 19.4326, lng: -99.1332, name: 'Mexico City', size: 0.5 },
  { lat: -34.6037, lng: -58.3816, name: 'Buenos Aires', size: 0.4 },

  // Africa & Middle East
  { lat: 25.2048, lng: 55.2708, name: 'Dubai', size: 0.4 },
  { lat: -33.9249, lng: 18.4241, name: 'Cape Town', size: 0.3 },
  { lat: 6.5244, lng: 3.3792, name: 'Lagos', size: 0.4 },
];

// Generate arcs between territories (representing royalty flows)
const generateArcs = () => {
  const arcs: any[] = [];
  const hubCities = ['New York', 'Los Angeles', 'London', 'Nashville'];

  TERRITORY_POINTS.forEach((point) => {
    if (!hubCities.includes(point.name)) {
      const hub = TERRITORY_POINTS.find(p => p.name === hubCities[Math.floor(Math.random() * hubCities.length)]);
      if (hub) {
        arcs.push({
          startLat: point.lat,
          startLng: point.lng,
          endLat: hub.lat,
          endLng: hub.lng,
          color: ['rgba(240, 226, 38, 0.6)', 'rgba(240, 226, 38, 0.1)'],
        });
      }
    }
  });

  return arcs;
};

interface RoyaltyGlobeProps {
  className?: string;
}

export function RoyaltyGlobe({ className = '' }: RoyaltyGlobeProps) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 400, height: 400 });
  const [arcs] = useState(generateArcs);

  // Handle resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setDimensions({ width, height: Math.min(height, width) });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Auto-rotate and initial position
  useEffect(() => {
    if (globeRef.current) {
      globeRef.current.pointOfView({ lat: 20, lng: -30, altitude: 2.5 }, 0);

      const controls = globeRef.current.controls();
      if (controls) {
        controls.autoRotate = true;
        controls.autoRotateSpeed = 0.5;
        controls.enableZoom = false;
      }
    }
  }, []);

  return (
    <div ref={containerRef} className={`relative w-full h-full min-h-[300px] ${className}`}>
      <Globe
        ref={globeRef}
        width={dimensions.width}
        height={dimensions.height}
        backgroundColor="rgba(0,0,0,0)"
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-dark.jpg"
        pointsData={TERRITORY_POINTS}
        pointLat="lat"
        pointLng="lng"
        pointAltitude={0.01}
        pointRadius={(d: any) => d.size * 0.3}
        pointColor={() => '#f0e226'}
        pointsMerge={true}
        arcsData={arcs}
        arcStartLat="startLat"
        arcStartLng="startLng"
        arcEndLat="endLat"
        arcEndLng="endLng"
        arcColor="color"
        arcDashLength={0.4}
        arcDashGap={0.2}
        arcDashAnimateTime={2000}
        arcStroke={0.5}
        atmosphereColor="#f0e226"
        atmosphereAltitude={0.15}
        animateIn={true}
      />
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#19181a] to-transparent pointer-events-none" />
    </div>
  );
}

export default RoyaltyGlobe;
