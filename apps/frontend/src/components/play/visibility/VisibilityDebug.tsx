/**
 * VisibilityDebug.tsx
 * Debug visualization for the visibility/occlusion culling system
 *
 * Shows:
 * - HZB texture mip levels
 * - Culled chunks wireframes
 * - Visibility statistics overlay
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { getVisibilityManager, type VisibilityStats } from '../../../lib/visibility';
import { CHUNK_SIZE, WORLD_SIZE, MIN_HEIGHT, MAX_HEIGHT } from '../../../lib/terrain/TerrainConfig';

interface VisibilityDebugProps {
  /** Show HZB texture overlay */
  showHZB?: boolean;
  /** Which mip level to display (0 = base) */
  hzbMipLevel?: number;
  /** Show wireframes for culled chunks */
  showCulledChunks?: boolean;
  /** Show stats overlay */
  showStats?: boolean;
  /** Position for stats overlay */
  statsPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

/**
 * Debug visualization component for the visibility system
 *
 * @example
 * ```tsx
 * <VisibilityDebug
 *   showHZB={true}
 *   hzbMipLevel={0}
 *   showCulledChunks={true}
 *   showStats={true}
 * />
 * ```
 */
export function VisibilityDebug({
  showHZB = false,
  hzbMipLevel = 0,
  showCulledChunks = false,
  showStats = true,
  statsPosition = 'top-right',
}: VisibilityDebugProps) {
  return (
    <>
      {showStats && <StatsOverlay position={statsPosition} />}
      {showCulledChunks && <CulledChunkWireframes />}
      {showHZB && <HZBOverlay mipLevel={hzbMipLevel} />}
    </>
  );
}

/**
 * Stats overlay showing visibility statistics
 */
function StatsOverlay({ position }: { position: string }) {
  const [stats, setStats] = useState<VisibilityStats | null>(null);
  const visibility = getVisibilityManager();

  useFrame(() => {
    setStats(visibility.getStats());
  });

  if (!stats) return null;

  const positionStyle: React.CSSProperties = {
    position: 'fixed',
    padding: '8px 12px',
    background: 'rgba(0, 0, 0, 0.75)',
    color: '#fff',
    fontFamily: 'monospace',
    fontSize: '11px',
    borderRadius: '4px',
    zIndex: 1000,
    pointerEvents: 'none',
    ...(position === 'top-left' && { top: '60px', left: '10px' }),
    ...(position === 'top-right' && { top: '60px', right: '10px' }),
    ...(position === 'bottom-left' && { bottom: '10px', left: '10px' }),
    ...(position === 'bottom-right' && { bottom: '10px', right: '10px' }),
  };

  const cullRate =
    stats.chunksTotal > 0
      ? ((stats.chunksCulled / stats.chunksTotal) * 100).toFixed(1)
      : '0';

  return (
    <Html fullscreen style={{ pointerEvents: 'none' }}>
      <div style={positionStyle}>
        <div style={{ marginBottom: '4px', fontWeight: 'bold', color: '#8be9fd' }}>
          Visibility Stats
        </div>
        <div>Chunks: {stats.chunksVisible}/{stats.chunksTotal} ({cullRate}% culled)</div>
        <div>Instances: {stats.instancesVisible}/{stats.instancesTotal}</div>
        <div>Queries: {stats.queriesIssued} issued, {stats.queriesSkipped} skipped</div>
        <div style={{ marginTop: '4px', color: '#50fa7b' }}>
          CPU: {stats.cpuCullTimeMs.toFixed(2)}ms | HZB: {stats.hzbTimeMs.toFixed(2)}ms
        </div>
      </div>
    </Html>
  );
}

/**
 * Wireframe visualization for culled chunks
 */
function CulledChunkWireframes() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const visibility = getVisibilityManager();

  // Create shared geometry and material
  const geometry = useMemo(() => new THREE.BoxGeometry(CHUNK_SIZE, MAX_HEIGHT - MIN_HEIGHT, CHUNK_SIZE), []);
  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: 0xff4444,
        wireframe: true,
        transparent: true,
        opacity: 0.3,
      }),
    []
  );

  // Pre-allocate matrices
  const matrices = useMemo(() => {
    const arr: THREE.Matrix4[] = [];
    for (let i = 0; i < 100; i++) {
      arr.push(new THREE.Matrix4());
    }
    return arr;
  }, []);

  useFrame(() => {
    if (!meshRef.current) return;

    const culled = visibility.getCulledChunks();

    // Update instance matrices
    for (let i = 0; i < Math.min(culled.length, matrices.length); i++) {
      const chunk = culled[i];
      const worldX = chunk.chunkX * CHUNK_SIZE - WORLD_SIZE / 2 + CHUNK_SIZE / 2;
      const worldZ = chunk.chunkZ * CHUNK_SIZE - WORLD_SIZE / 2 + CHUNK_SIZE / 2;
      const worldY = (MIN_HEIGHT + MAX_HEIGHT) / 2;

      matrices[i].makeTranslation(worldX, worldY, worldZ);
      meshRef.current.setMatrixAt(i, matrices[i]);
    }

    meshRef.current.count = Math.min(culled.length, matrices.length);
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, 100]}
      frustumCulled={false}
    />
  );
}

/**
 * HZB texture overlay for debugging
 */
function HZBOverlay({ mipLevel }: { mipLevel: number }) {
  const { size } = useThree();
  const visibility = getVisibilityManager();
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    // Get HZB texture from visibility manager
    const hzbTexture = visibility.getHZBTexture(mipLevel);
    setTexture(hzbTexture);
  }, [visibility, mipLevel]);

  if (!texture) {
    return (
      <Html fullscreen style={{ pointerEvents: 'none' }}>
        <div
          style={{
            position: 'fixed',
            bottom: '70px',
            right: '10px',
            padding: '8px',
            background: 'rgba(0, 0, 0, 0.75)',
            color: '#ff5555',
            fontFamily: 'monospace',
            fontSize: '11px',
            borderRadius: '4px',
          }}
        >
          HZB not initialized
        </div>
      </Html>
    );
  }

  // Calculate overlay size (1/4 screen width)
  const overlayWidth = Math.min(256, size.width / 4);
  const overlayHeight = overlayWidth / 2;

  return (
    <Html fullscreen style={{ pointerEvents: 'none' }}>
      <div
        style={{
          position: 'fixed',
          bottom: '70px',
          right: '10px',
          width: overlayWidth,
          height: overlayHeight,
          background: '#000',
          border: '1px solid #444',
          borderRadius: '4px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '2px',
            left: '4px',
            color: '#8be9fd',
            fontFamily: 'monospace',
            fontSize: '9px',
            zIndex: 1,
          }}
        >
          HZB Mip {mipLevel}
        </div>
        {/* Canvas would render the HZB texture here - simplified for now */}
        <div
          style={{
            width: '100%',
            height: '100%',
            background: 'linear-gradient(to right, #111, #333)',
            opacity: 0.8,
          }}
        />
      </div>
    </Html>
  );
}

export default VisibilityDebug;
