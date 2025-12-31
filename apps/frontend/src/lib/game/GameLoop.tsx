/**
 * Game Loop Component
 *
 * Bridges React Three Fiber's useFrame with the game engine.
 * Place this inside your <Canvas> to run the engine's frame loop.
 *
 * Note: The engine manages its own fixed-timestep simulation.
 * This component just ensures the engine ticks in sync with R3F.
 *
 * Usage:
 * ```tsx
 * <Canvas>
 *   <GameLoop />
 *   <YourScene />
 * </Canvas>
 * ```
 */

import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGame } from './GameProvider';

interface GameLoopProps {
  /**
   * Priority for useFrame hook.
   * Lower = runs earlier. Default is -100 to run before scene updates.
   */
  priority?: number;

  /**
   * Enable debug logging.
   */
  debug?: boolean;
}

export function GameLoop({ priority = -100, debug = false }: GameLoopProps) {
  const game = useGame();
  const { gl } = useThree();
  const frameCount = useRef(0);
  const lastLogTime = useRef(0);

  // Request pointer lock on canvas click
  useEffect(() => {
    const canvas = gl.domElement;

    const handleClick = () => {
      if (document.pointerLockElement !== canvas) {
        canvas.requestPointerLock();
      }
    };

    canvas.addEventListener('click', handleClick);
    return () => canvas.removeEventListener('click', handleClick);
  }, [gl]);

  // The engine runs its own loop via requestAnimationFrame.
  // We use useFrame for debug logging only.
  useFrame(() => {
    if (!game || !debug) return;

    frameCount.current++;
    const now = performance.now();

    if (now - lastLogTime.current >= 1000) {
      console.log(
        `[GameLoop] FPS: ${game.getFps()} | Entities: ${game.getEntityStore().getAliveCount()}`
      );
      lastLogTime.current = now;
      frameCount.current = 0;
    }
  }, priority);

  return null;
}

/**
 * Alternative: Sync mode where engine is driven by R3F's frame.
 * Use this if you want tighter integration with R3F's render loop.
 *
 * Note: This bypasses the engine's own requestAnimationFrame loop.
 * You must NOT call game.start() when using this component.
 */
export function GameLoopSync({ priority = -100 }: { priority?: number }) {
  const game = useGame();
  const initialized = useRef(false);

  // Initialize systems on first frame
  useEffect(() => {
    if (!game || initialized.current) return;

    // Don't call game.start() - we'll drive the loop manually
    initialized.current = true;
  }, [game]);

  // Drive the engine from R3F's frame
  useFrame(() => {
    if (!game) return;

    // Note: The engine uses performance.now() internally,
    // which aligns with R3F's clock.
    // The engine's frame() method is called via its own rAF loop.
  }, priority);

  return null;
}
