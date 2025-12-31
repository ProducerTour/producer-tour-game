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
  interpolate?: boolean;
}

/**
 * Physics world wrapper with game-appropriate defaults
 * - Gravity: Earth-like (9.81 m/s²)
 * - PERF: 30Hz physics with interpolation (halves CPU time)
 * - Debug mode shows collider wireframes
 */
export function PhysicsWorld({
  children,
  debug = false,
  gravity = [0, -9.81, 0],
  timeStep = 1 / 30,  // PERF: 30Hz instead of 60Hz
  paused = false,
  interpolate = true, // PERF: Smooth visual interpolation between physics steps
}: PhysicsWorldProps) {
  return (
    <Physics
      gravity={gravity}
      timeStep={timeStep}
      paused={paused}
      debug={debug}
      interpolate={interpolate}
    >
      {children}
    </Physics>
  );
}

export default PhysicsWorld;
