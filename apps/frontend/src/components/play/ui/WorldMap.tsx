/**
 * WorldMap.tsx
 * Full-screen map overlay showing grid, player position, and compass
 * Press M to toggle
 */

import { useMemo } from 'react';
import { CHUNK_SIZE } from '../../../lib/terrain';

export interface WorldMapProps {
  /** Whether the map is visible */
  isOpen: boolean;

  /** Close the map */
  onClose: () => void;

  /** Player X position in world coordinates */
  playerX: number;

  /** Player Z position in world coordinates */
  playerZ: number;

  /** Player rotation (Y axis, radians) */
  playerRotation: number;

  /** Terrain radius in chunks */
  terrainRadius: number;

  /** Terrain seed for display */
  seed: number;
}

/**
 * WorldMap - Fullscreen map overlay with grid and compass
 */
export function WorldMap({
  isOpen,
  onClose,
  playerX,
  playerZ,
  playerRotation,
  terrainRadius,
  seed,
}: WorldMapProps) {
  // Calculate grid dimensions
  const gridCells = terrainRadius * 2 + 1;
  const worldSize = gridCells * CHUNK_SIZE;
  const halfSize = worldSize / 2;

  // Convert player world position to map percentage (0-100)
  const playerMapX = ((playerX + halfSize) / worldSize) * 100;
  const playerMapZ = ((playerZ + halfSize) / worldSize) * 100;

  // Clamp to map bounds
  const clampedX = Math.max(0, Math.min(100, playerMapX));
  const clampedZ = Math.max(0, Math.min(100, playerMapZ));

  // Convert rotation to compass direction
  // Three.js coordinate system:
  //   rotation.y = 0 → facing +Z (South on map)
  //   rotation.y = π/2 → facing -X (West on map)
  //   rotation.y = π → facing -Z (North on map)
  //   rotation.y = -π/2 → facing +X (East on map)
  // We add 180° to convert from Three.js coords to map coords (where up = North)
  const rawDegrees = (playerRotation * 180 / Math.PI);
  const compassDegrees = (rawDegrees + 180) % 360;
  const normalizedDegrees = compassDegrees < 0 ? compassDegrees + 360 : compassDegrees;

  // Cardinal direction based on map-aligned degrees
  // 0° = North (up), 90° = East (right), 180° = South (down), 270° = West (left)
  const getCardinalDirection = (deg: number): string => {
    if (deg >= 337.5 || deg < 22.5) return 'N';
    if (deg >= 22.5 && deg < 67.5) return 'NE';
    if (deg >= 67.5 && deg < 112.5) return 'E';
    if (deg >= 112.5 && deg < 157.5) return 'SE';
    if (deg >= 157.5 && deg < 202.5) return 'S';
    if (deg >= 202.5 && deg < 247.5) return 'SW';
    if (deg >= 247.5 && deg < 292.5) return 'W';
    if (deg >= 292.5 && deg < 337.5) return 'NW';
    return 'N';
  };

  // Generate grid labels
  const gridLabels = useMemo(() => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const labels: Array<{ text: string; col: number; row: number }> = [];

    for (let row = 0; row < gridCells; row++) {
      for (let col = 0; col < gridCells; col++) {
        const letter = letters[col % 26];
        const number = row + 1;
        labels.push({ text: `${letter}${number}`, col, row });
      }
    }

    return labels;
  }, [gridCells]);

  // Get player's current grid cell
  const playerGridCol = Math.floor((playerX + halfSize) / CHUNK_SIZE);
  const playerGridRow = Math.floor((playerZ + halfSize) / CHUNK_SIZE);
  const playerGridLetter = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.max(0, Math.min(25, playerGridCol))];
  const playerGridNumber = Math.max(1, Math.min(gridCells, playerGridRow + 1));
  const playerGridCell = `${playerGridLetter}${playerGridNumber}`;

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: 'relative',
          width: '80vmin',
          height: '80vmin',
          maxWidth: '800px',
          maxHeight: '800px',
          backgroundColor: '#1a1a2e',
          border: '3px solid #4a4a6a',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 0 40px rgba(0, 0, 0, 0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Map title */}
        <div
          style={{
            position: 'absolute',
            top: '10px',
            left: '50%',
            transform: 'translateX(-50%)',
            color: '#fff',
            fontSize: '18px',
            fontWeight: 'bold',
            textShadow: '0 2px 4px rgba(0,0,0,0.5)',
            zIndex: 10,
          }}
        >
          WORLD MAP
        </div>

        {/* Seed display */}
        <div
          style={{
            position: 'absolute',
            top: '10px',
            left: '10px',
            color: '#888',
            fontSize: '12px',
            zIndex: 10,
          }}
        >
          Seed: {seed}
        </div>

        {/* Close hint */}
        <div
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            color: '#888',
            fontSize: '12px',
            zIndex: 10,
          }}
        >
          Press M to close
        </div>

        {/* Grid container */}
        <div
          style={{
            position: 'absolute',
            top: '40px',
            left: '30px',
            right: '30px',
            bottom: '60px',
            display: 'grid',
            gridTemplateColumns: `repeat(${gridCells}, 1fr)`,
            gridTemplateRows: `repeat(${gridCells}, 1fr)`,
            gap: '1px',
            backgroundColor: '#2a2a4a',
          }}
        >
          {/* Grid cells with labels */}
          {gridLabels.map((label, i) => {
            const isPlayerCell = label.col === playerGridCol && label.row === playerGridRow;
            return (
              <div
                key={i}
                style={{
                  backgroundColor: isPlayerCell ? 'rgba(74, 222, 128, 0.3)' : '#1e1e3a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: gridCells > 6 ? '10px' : '14px',
                  color: isPlayerCell ? '#4ade80' : '#555',
                  fontWeight: isPlayerCell ? 'bold' : 'normal',
                  position: 'relative',
                }}
              >
                {label.text}
              </div>
            );
          })}

          {/* Player marker */}
          <div
            style={{
              position: 'absolute',
              left: `${clampedX}%`,
              top: `${clampedZ}%`,
              transform: 'translate(-50%, -50%)',
              zIndex: 20,
            }}
          >
            {/* Player direction arrow */}
            <div
              style={{
                width: '24px',
                height: '24px',
                transform: `rotate(${normalizedDegrees}deg)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 2L20 20L12 16L4 20L12 2Z"
                  fill="#4ade80"
                  stroke="#fff"
                  strokeWidth="1"
                />
              </svg>
            </div>
            {/* Pulse effect */}
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                border: '2px solid #4ade80',
                opacity: 0.5,
                animation: 'pulse 2s ease-out infinite',
              }}
            />
          </div>
        </div>

        {/* Column labels (A, B, C...) - top */}
        <div
          style={{
            position: 'absolute',
            top: '40px',
            left: '30px',
            right: '30px',
            height: '0',
            display: 'flex',
            justifyContent: 'space-around',
            transform: 'translateY(-18px)',
          }}
        >
          {Array.from({ length: gridCells }, (_, i) => (
            <div key={i} style={{ color: '#ffd700', fontSize: '12px', fontWeight: 'bold' }}>
              {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[i]}
            </div>
          ))}
        </div>

        {/* Row labels (1, 2, 3...) - left */}
        <div
          style={{
            position: 'absolute',
            top: '40px',
            left: '10px',
            bottom: '60px',
            width: '20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-around',
            alignItems: 'center',
          }}
        >
          {Array.from({ length: gridCells }, (_, i) => (
            <div key={i} style={{ color: '#ffd700', fontSize: '12px', fontWeight: 'bold' }}>
              {i + 1}
            </div>
          ))}
        </div>

        {/* Compass */}
        <div
          style={{
            position: 'absolute',
            bottom: '10px',
            right: '20px',
            width: '80px',
            height: '80px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Compass ring */}
          <div
            style={{
              position: 'absolute',
              width: '70px',
              height: '70px',
              borderRadius: '50%',
              border: '2px solid #4a4a6a',
              backgroundColor: 'rgba(26, 26, 46, 0.9)',
            }}
          />
          {/* Cardinal directions */}
          {['N', 'E', 'S', 'W'].map((dir, i) => {
            const angle = i * 90;
            const rad = (angle - 90) * Math.PI / 180;
            const x = Math.cos(rad) * 28;
            const y = Math.sin(rad) * 28;
            return (
              <div
                key={dir}
                style={{
                  position: 'absolute',
                  transform: `translate(${x}px, ${y}px)`,
                  color: dir === 'N' ? '#ff4444' : '#888',
                  fontSize: '12px',
                  fontWeight: 'bold',
                }}
              >
                {dir}
              </div>
            );
          })}
          {/* Compass needle (points to player's facing direction) */}
          <div
            style={{
              width: '40px',
              height: '40px',
              transform: `rotate(${normalizedDegrees}deg)`,
              transition: 'transform 0.1s ease-out',
            }}
          >
            <svg width="40" height="40" viewBox="0 0 40 40">
              <path d="M20 5L25 20L20 18L15 20L20 5Z" fill="#ff4444" />
              <path d="M20 35L15 20L20 22L25 20L20 35Z" fill="#888" />
            </svg>
          </div>
        </div>

        {/* Player info */}
        <div
          style={{
            position: 'absolute',
            bottom: '15px',
            left: '20px',
            color: '#fff',
            fontSize: '14px',
          }}
        >
          <div style={{ marginBottom: '4px' }}>
            <span style={{ color: '#888' }}>Position: </span>
            <span style={{ color: '#4ade80', fontWeight: 'bold' }}>{playerGridCell}</span>
          </div>
          <div>
            <span style={{ color: '#888' }}>Facing: </span>
            <span style={{ color: '#ffd700', fontWeight: 'bold' }}>
              {getCardinalDirection(normalizedDegrees)}
            </span>
          </div>
        </div>

        {/* Legend */}
        <div
          style={{
            position: 'absolute',
            bottom: '15px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: '20px',
            fontSize: '11px',
            color: '#888',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '12px', height: '12px', backgroundColor: '#4ade80', borderRadius: '2px' }} />
            <span>You</span>
          </div>
          <div>64m per cell</div>
        </div>
      </div>

      {/* CSS animation for pulse */}
      <style>{`
        @keyframes pulse {
          0% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0.5;
          }
          100% {
            transform: translate(-50%, -50%) scale(2);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

export default WorldMap;
