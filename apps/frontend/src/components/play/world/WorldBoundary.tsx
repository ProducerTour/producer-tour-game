/**
 * WorldBoundary.tsx
 * Invisible collision walls at world edges to prevent falling off
 * Also provides an alphanumeric grid overlay for planning
 */

import { useMemo } from 'react';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import * as THREE from 'three';
import { Text } from '@react-three/drei';
import { CHUNK_SIZE } from '../../../lib/terrain';

export interface WorldBoundaryProps {
  /** Terrain radius in chunks (same as StaticTerrain) */
  terrainRadius: number;

  /** Height of the boundary walls */
  wallHeight?: number;

  /** Show debug visualization of walls */
  showWalls?: boolean;

  /** Show alphanumeric grid overlay */
  showGrid?: boolean;

  /** Grid label size */
  gridLabelSize?: number;
}

/**
 * WorldBoundary - Invisible walls at terrain edges + grid overlay
 */
export function WorldBoundary({
  terrainRadius,
  wallHeight = 100,
  showWalls = false,
  showGrid = false,
  gridLabelSize = 8,
}: WorldBoundaryProps) {
  // Calculate world bounds based on terrain radius
  // Terrain chunks span from centerChunk - radius to centerChunk + radius
  // Each chunk is 64m, so total size = (radius * 2 + 1) * 64
  const worldSize = (terrainRadius * 2 + 1) * CHUNK_SIZE;
  const halfSize = worldSize / 2;
  const wallThickness = 2;

  // Grid configuration - uses letters A-Z for columns, numbers 1-N for rows
  const gridCells = terrainRadius * 2 + 1; // Number of grid cells per axis
  const cellSize = CHUNK_SIZE; // Each chunk = one grid cell

  // Generate grid labels (A1, B2, etc.)
  const gridLabels = useMemo(() => {
    if (!showGrid) return [];

    const labels: Array<{
      text: string;
      position: [number, number, number];
    }> = [];

    // Letters A-Z (columns on X axis)
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    for (let row = 0; row < gridCells; row++) {
      for (let col = 0; col < gridCells; col++) {
        // Only place labels at chunk centers
        const x = -halfSize + col * cellSize + cellSize / 2;
        const z = -halfSize + row * cellSize + cellSize / 2;

        // Grid coordinate: letter for column, number for row (1-indexed)
        const letter = letters[col % 26];
        const number = row + 1;
        const text = `${letter}${number}`;

        labels.push({
          text,
          position: [x, 5, z], // Slightly above ground
        });
      }
    }

    return labels;
  }, [showGrid, gridCells, halfSize, cellSize]);

  // Grid lines geometry
  const gridLines = useMemo(() => {
    if (!showGrid) return null;

    const points: THREE.Vector3[] = [];

    // Vertical lines (along Z axis)
    for (let i = 0; i <= gridCells; i++) {
      const x = -halfSize + i * cellSize;
      points.push(new THREE.Vector3(x, 0.5, -halfSize));
      points.push(new THREE.Vector3(x, 0.5, halfSize));
    }

    // Horizontal lines (along X axis)
    for (let i = 0; i <= gridCells; i++) {
      const z = -halfSize + i * cellSize;
      points.push(new THREE.Vector3(-halfSize, 0.5, z));
      points.push(new THREE.Vector3(halfSize, 0.5, z));
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    return geometry;
  }, [showGrid, gridCells, halfSize, cellSize]);

  return (
    <group name="world-boundary">
      {/* Invisible boundary walls - 4 sides */}

      {/* North wall (+Z) */}
      <RigidBody type="fixed" colliders={false} position={[0, wallHeight / 2, halfSize + wallThickness / 2]}>
        <CuboidCollider args={[halfSize + wallThickness, wallHeight / 2, wallThickness / 2]} />
        {showWalls && (
          <mesh>
            <boxGeometry args={[worldSize + wallThickness * 2, wallHeight, wallThickness]} />
            <meshBasicMaterial color="#ff0000" transparent opacity={0.3} wireframe />
          </mesh>
        )}
      </RigidBody>

      {/* South wall (-Z) */}
      <RigidBody type="fixed" colliders={false} position={[0, wallHeight / 2, -halfSize - wallThickness / 2]}>
        <CuboidCollider args={[halfSize + wallThickness, wallHeight / 2, wallThickness / 2]} />
        {showWalls && (
          <mesh>
            <boxGeometry args={[worldSize + wallThickness * 2, wallHeight, wallThickness]} />
            <meshBasicMaterial color="#ff0000" transparent opacity={0.3} wireframe />
          </mesh>
        )}
      </RigidBody>

      {/* East wall (+X) */}
      <RigidBody type="fixed" colliders={false} position={[halfSize + wallThickness / 2, wallHeight / 2, 0]}>
        <CuboidCollider args={[wallThickness / 2, wallHeight / 2, halfSize + wallThickness]} />
        {showWalls && (
          <mesh>
            <boxGeometry args={[wallThickness, wallHeight, worldSize + wallThickness * 2]} />
            <meshBasicMaterial color="#ff0000" transparent opacity={0.3} wireframe />
          </mesh>
        )}
      </RigidBody>

      {/* West wall (-X) */}
      <RigidBody type="fixed" colliders={false} position={[-halfSize - wallThickness / 2, wallHeight / 2, 0]}>
        <CuboidCollider args={[wallThickness / 2, wallHeight / 2, halfSize + wallThickness]} />
        {showWalls && (
          <mesh>
            <boxGeometry args={[wallThickness, wallHeight, worldSize + wallThickness * 2]} />
            <meshBasicMaterial color="#ff0000" transparent opacity={0.3} wireframe />
          </mesh>
        )}
      </RigidBody>

      {/* Alphanumeric grid overlay */}
      {showGrid && gridLines && (
        <group name="grid-overlay">
          {/* Grid lines */}
          <lineSegments geometry={gridLines}>
            <lineBasicMaterial color="#ffffff" transparent opacity={0.4} />
          </lineSegments>

          {/* Grid labels */}
          {gridLabels.map((label, i) => (
            <Text
              key={i}
              position={label.position}
              rotation={[-Math.PI / 2, 0, 0]}
              fontSize={gridLabelSize}
              color="#ffffff"
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.3}
              outlineColor="#000000"
            >
              {label.text}
            </Text>
          ))}

          {/* Axis labels on edges */}
          {/* Column letters along north edge */}
          {Array.from({ length: gridCells }, (_, col) => {
            const x = -halfSize + col * cellSize + cellSize / 2;
            const letter = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[col % 26];
            return (
              <Text
                key={`col-${col}`}
                position={[x, 10, halfSize + 20]}
                rotation={[-Math.PI / 4, 0, 0]}
                fontSize={gridLabelSize * 1.5}
                color="#ffff00"
                anchorX="center"
                anchorY="middle"
                outlineWidth={0.4}
                outlineColor="#000000"
                fontWeight="bold"
              >
                {letter}
              </Text>
            );
          })}

          {/* Row numbers along west edge */}
          {Array.from({ length: gridCells }, (_, row) => {
            const z = -halfSize + row * cellSize + cellSize / 2;
            return (
              <Text
                key={`row-${row}`}
                position={[-halfSize - 20, 10, z]}
                rotation={[-Math.PI / 4, Math.PI / 2, 0]}
                fontSize={gridLabelSize * 1.5}
                color="#ffff00"
                anchorX="center"
                anchorY="middle"
                outlineWidth={0.4}
                outlineColor="#000000"
                fontWeight="bold"
              >
                {row + 1}
              </Text>
            );
          })}
        </group>
      )}
    </group>
  );
}

export default WorldBoundary;
