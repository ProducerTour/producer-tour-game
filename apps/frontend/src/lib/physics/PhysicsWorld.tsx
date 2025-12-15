/**
 * Physics World Provider
 * Wraps @react-three/rapier for game physics
 */

import { type ReactNode } from 'react';
import { Physics } from '@react-three/rapier';

interface PhysicsWorldProps {
  children: ReactNode;
  debug?: boolean;
  gravity?: [number, number, number];
  timeStep?: number | 'vary';
  paused?: boolean;
}

/**
 * Physics world wrapper with game-appropriate defaults
 * - Gravity: Earth-like (9.81 m/s²)
 * - Fixed timestep for deterministic physics
 * - Debug mode shows collider wireframes
 */
export function PhysicsWorld({
  children,
  debug = false,
  gravity = [0, -9.81, 0],
  timeStep = 1 / 60,
  paused = false,
}: PhysicsWorldProps) {
  return (
    <Physics
      gravity={gravity}
      timeStep={timeStep}
      paused={paused}
      debug={debug}
    >
      {children}
    </Physics>
  );
}

export default PhysicsWorld;
