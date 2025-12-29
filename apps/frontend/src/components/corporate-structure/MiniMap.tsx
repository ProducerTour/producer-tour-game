import { useMemo } from 'react';
import * as THREE from 'three';
import { motion } from 'framer-motion';

interface EntityData {
  id: string;
  name: string;
  position: [number, number, number];
  color: string;
}

interface MiniMapProps {
  entities: EntityData[];
  shipPosition: THREE.Vector3;
  shipRotation: THREE.Euler;
  isActive: boolean;
}

export function MiniMap({ entities, shipPosition, shipRotation, isActive }: MiniMapProps) {
  // Map settings
  const mapSize = 140; // Pixel size of the map
  const worldRange = 180; // World units shown in the map (half-extent)

  // Convert world position to map coordinates
  const worldToMap = useMemo(() => {
    return (worldX: number, worldZ: number) => {
      const mapX = ((worldX + worldRange) / (worldRange * 2)) * mapSize;
      const mapY = ((worldZ + worldRange) / (worldRange * 2)) * mapSize;
      return { x: mapX, y: mapY };
    };
  }, []);

  // Ship map position
  const shipMapPos = worldToMap(shipPosition.x, shipPosition.z);

  // Ship direction (arrow rotation) - triangle points up by default, which is -Z (forward)
  const shipAngle = -shipRotation.y * (180 / Math.PI);

  if (!isActive) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className="absolute bottom-24 right-4 z-20"
      style={{
        width: mapSize,
        height: mapSize,
      }}
    >
      {/* Map background */}
      <div
        className="relative w-full h-full rounded-xl overflow-hidden border-2 border-white/20"
        style={{
          background: 'radial-gradient(circle at center, rgba(15, 23, 42, 0.9) 0%, rgba(2, 6, 23, 0.95) 100%)',
          boxShadow: '0 0 20px rgba(0, 0, 0, 0.5), inset 0 0 30px rgba(59, 130, 246, 0.1)',
        }}
      >
        {/* Grid lines */}
        <svg className="absolute inset-0 w-full h-full opacity-20">
          {/* Horizontal lines */}
          {[0.25, 0.5, 0.75].map((ratio) => (
            <line
              key={`h-${ratio}`}
              x1={0}
              y1={ratio * mapSize}
              x2={mapSize}
              y2={ratio * mapSize}
              stroke="#3b82f6"
              strokeWidth="0.5"
            />
          ))}
          {/* Vertical lines */}
          {[0.25, 0.5, 0.75].map((ratio) => (
            <line
              key={`v-${ratio}`}
              x1={ratio * mapSize}
              y1={0}
              x2={ratio * mapSize}
              y2={mapSize}
              stroke="#3b82f6"
              strokeWidth="0.5"
            />
          ))}
          {/* Center crosshair */}
          <circle
            cx={mapSize / 2}
            cy={mapSize / 2}
            r={3}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="0.5"
            opacity="0.5"
          />
        </svg>

        {/* Entity dots */}
        {entities.map((entity) => {
          const pos = worldToMap(entity.position[0], entity.position[2]);
          return (
            <div
              key={entity.id}
              className="absolute rounded-full transform -translate-x-1/2 -translate-y-1/2"
              style={{
                left: pos.x,
                top: pos.y,
                width: 8,
                height: 8,
                backgroundColor: entity.color,
                boxShadow: `0 0 6px ${entity.color}`,
              }}
              title={entity.name}
            />
          );
        })}

        {/* Ship indicator (triangle pointing in direction) */}
        <div
          className="absolute transform -translate-x-1/2 -translate-y-1/2"
          style={{
            left: shipMapPos.x,
            top: shipMapPos.y,
            transform: `translate(-50%, -50%) rotate(${shipAngle}deg)`,
          }}
        >
          {/* Ship triangle */}
          <div
            style={{
              width: 0,
              height: 0,
              borderLeft: '5px solid transparent',
              borderRight: '5px solid transparent',
              borderBottom: '12px solid #22d3ee',
              filter: 'drop-shadow(0 0 4px #22d3ee)',
            }}
          />
          {/* Pulse ring */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full animate-ping"
            style={{
              width: 16,
              height: 16,
              backgroundColor: 'transparent',
              border: '1px solid #22d3ee',
              opacity: 0.5,
            }}
          />
        </div>

        {/* Range indicator text */}
        <div className="absolute bottom-1 right-1 text-[8px] text-white/40 font-mono">
          {worldRange * 2}m
        </div>

        {/* "MINIMAP" label */}
        <div className="absolute top-1 left-1 text-[8px] text-white/40 font-bold tracking-wider">
          MAP
        </div>
      </div>
    </motion.div>
  );
}

export default MiniMap;
