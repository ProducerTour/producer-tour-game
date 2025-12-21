/**
 * DebugOverlay.tsx
 *
 * Unified debug overlay system.
 * Press F1 to toggle visibility.
 *
 * Features:
 * - Performance stats (FPS, draw calls, memory)
 * - Player position and biome
 * - World state and chunk info
 * - Network latency (multiplayer)
 */

import { useState, useEffect, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

// =============================================================================
// TYPES
// =============================================================================

export interface DebugStats {
  fps: number;
  frameTime: number;
  drawCalls: number;
  triangles: number;
  geometries: number;
  textures: number;
  memory: {
    used: number;
    total: number;
  };
}

export interface DebugOverlayProps {
  /** Player position */
  playerPosition?: THREE.Vector3;
  /** Current biome name */
  biome?: string;
  /** World state */
  worldState?: string;
  /** Chunk coordinates */
  chunk?: { x: number; z: number };
  /** Multiplayer latency in ms */
  latency?: number;
  /** Player count */
  playerCount?: number;
  /** Initial visibility */
  initialVisible?: boolean;
  /** Toggle key (default: F1) */
  toggleKey?: string;
}

// =============================================================================
// STATS COLLECTOR
// =============================================================================

function usePerformanceStats(): DebugStats {
  const { gl } = useThree();
  const [stats, setStats] = useState<DebugStats>({
    fps: 60,
    frameTime: 16.67,
    drawCalls: 0,
    triangles: 0,
    geometries: 0,
    textures: 0,
    memory: { used: 0, total: 0 },
  });

  // Track frame times for FPS calculation
  const frameTimes: number[] = [];
  let lastTime = performance.now();

  useFrame(() => {
    const now = performance.now();
    const delta = now - lastTime;
    lastTime = now;

    // Keep last 60 frame times for averaging
    frameTimes.push(delta);
    if (frameTimes.length > 60) frameTimes.shift();

    // Update stats every 10 frames
    if (frameTimes.length % 10 === 0) {
      const avgFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
      const info = gl.info;

      // Get memory info if available
      const memory = (performance as unknown as { memory?: { usedJSHeapSize: number; totalJSHeapSize: number } }).memory;

      setStats({
        fps: Math.round(1000 / avgFrameTime),
        frameTime: Math.round(avgFrameTime * 100) / 100,
        drawCalls: info.render.calls,
        triangles: info.render.triangles,
        geometries: info.memory.geometries,
        textures: info.memory.textures,
        memory: memory
          ? {
              used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
              total: Math.round(memory.totalJSHeapSize / 1024 / 1024),
            }
          : { used: 0, total: 0 },
      });
    }
  });

  return stats;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Debug overlay that displays performance and game state info.
 * Toggle with F1 key.
 */
export function DebugOverlay({
  playerPosition,
  biome = 'unknown',
  worldState = 'running',
  chunk,
  latency,
  playerCount,
  initialVisible = false,
  toggleKey = 'F1',
}: DebugOverlayProps) {
  const [visible, setVisible] = useState(initialVisible);
  const stats = usePerformanceStats();

  // Toggle visibility with key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.code === toggleKey || e.key === toggleKey) {
        e.preventDefault();
        setVisible((v) => !v);
      }
    },
    [toggleKey]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!visible) return null;

  const pos = playerPosition;

  return (
    <Html
      fullscreen
      style={{
        pointerEvents: 'none',
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 10,
          left: 10,
          fontFamily: 'monospace',
          fontSize: 12,
          color: '#00ff00',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          padding: 10,
          borderRadius: 4,
          lineHeight: 1.5,
          minWidth: 200,
        }}
      >
        {/* Performance */}
        <div style={{ borderBottom: '1px solid #333', paddingBottom: 5, marginBottom: 5 }}>
          <strong>Performance</strong>
          <div>FPS: {stats.fps} ({stats.frameTime.toFixed(1)}ms)</div>
          <div>Draw Calls: {stats.drawCalls}</div>
          <div>Triangles: {(stats.triangles / 1000).toFixed(1)}K</div>
          <div>Geometries: {stats.geometries}</div>
          <div>Textures: {stats.textures}</div>
          {stats.memory.total > 0 && (
            <div>Memory: {stats.memory.used}MB / {stats.memory.total}MB</div>
          )}
        </div>

        {/* Player */}
        {pos && (
          <div style={{ borderBottom: '1px solid #333', paddingBottom: 5, marginBottom: 5 }}>
            <strong>Player</strong>
            <div>
              Pos: {pos.x.toFixed(1)}, {pos.y.toFixed(1)}, {pos.z.toFixed(1)}
            </div>
            <div>Biome: {biome}</div>
            {chunk && <div>Chunk: {chunk.x}, {chunk.z}</div>}
          </div>
        )}

        {/* World */}
        <div style={{ borderBottom: '1px solid #333', paddingBottom: 5, marginBottom: 5 }}>
          <strong>World</strong>
          <div>State: {worldState}</div>
        </div>

        {/* Network */}
        {(latency !== undefined || playerCount !== undefined) && (
          <div>
            <strong>Network</strong>
            {latency !== undefined && <div>Latency: {latency}ms</div>}
            {playerCount !== undefined && <div>Players: {playerCount}</div>}
          </div>
        )}

        {/* Controls hint */}
        <div style={{ marginTop: 10, color: '#888', fontSize: 10 }}>
          Press {toggleKey} to hide
        </div>
      </div>
    </Html>
  );
}

/**
 * Minimal FPS counter for production use.
 */
export function FPSCounter() {
  const [fps, setFps] = useState(60);

  const frameTimes: number[] = [];
  let lastTime = performance.now();

  useFrame(() => {
    const now = performance.now();
    frameTimes.push(now - lastTime);
    lastTime = now;

    if (frameTimes.length > 60) frameTimes.shift();

    if (frameTimes.length % 30 === 0) {
      const avg = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
      setFps(Math.round(1000 / avg));
    }
  });

  return (
    <Html
      style={{
        position: 'absolute',
        top: 10,
        right: 10,
        fontFamily: 'monospace',
        fontSize: 14,
        color: fps > 50 ? '#00ff00' : fps > 30 ? '#ffff00' : '#ff0000',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        padding: '4px 8px',
        borderRadius: 4,
        pointerEvents: 'none',
      }}
    >
      {fps} FPS
    </Html>
  );
}
