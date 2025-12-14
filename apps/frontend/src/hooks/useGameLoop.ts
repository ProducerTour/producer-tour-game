// Fixed timestep game loop hook
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';

const FIXED_TIMESTEP = 1 / 60; // 60Hz physics
const MAX_SUBSTEPS = 5; // Prevent spiral of death
const MAX_FRAME_TIME = 0.25; // Cap frame time at 250ms

export interface GameLoopCallbacks {
  // Called at fixed 60Hz rate (physics, game logic)
  fixedUpdate: (dt: number) => void;
  // Called every frame with interpolation alpha
  renderUpdate: (dt: number, alpha: number) => void;
}

export function useGameLoop(callbacks: GameLoopCallbacks) {
  const accumulator = useRef(0);
  const previousTime = useRef(0);
  const initialized = useRef(false);

  useFrame((state) => {
    const currentTime = state.clock.elapsedTime;

    // Initialize on first frame
    if (!initialized.current) {
      previousTime.current = currentTime;
      initialized.current = true;
      return;
    }

    let frameTime = currentTime - previousTime.current;
    previousTime.current = currentTime;

    // Clamp frame time to prevent spiral of death
    if (frameTime > MAX_FRAME_TIME) {
      frameTime = MAX_FRAME_TIME;
    }

    accumulator.current += frameTime;

    // Fixed timestep updates (physics, game logic)
    let substeps = 0;
    while (accumulator.current >= FIXED_TIMESTEP && substeps < MAX_SUBSTEPS) {
      callbacks.fixedUpdate(FIXED_TIMESTEP);
      accumulator.current -= FIXED_TIMESTEP;
      substeps++;
    }

    // Interpolation alpha for smooth rendering between physics steps
    const alpha = accumulator.current / FIXED_TIMESTEP;

    // Render update (animations, camera, interpolation)
    callbacks.renderUpdate(frameTime, alpha);
  });
}

// Simpler hook for just fixed updates
export function useFixedUpdate(callback: (dt: number) => void) {
  const accumulator = useRef(0);
  const previousTime = useRef(0);
  const initialized = useRef(false);

  useFrame((state) => {
    const currentTime = state.clock.elapsedTime;

    if (!initialized.current) {
      previousTime.current = currentTime;
      initialized.current = true;
      return;
    }

    let frameTime = currentTime - previousTime.current;
    previousTime.current = currentTime;

    if (frameTime > MAX_FRAME_TIME) {
      frameTime = MAX_FRAME_TIME;
    }

    accumulator.current += frameTime;

    let substeps = 0;
    while (accumulator.current >= FIXED_TIMESTEP && substeps < MAX_SUBSTEPS) {
      callback(FIXED_TIMESTEP);
      accumulator.current -= FIXED_TIMESTEP;
      substeps++;
    }
  });
}

// Hook to get interpolation alpha (for smooth rendering between physics steps)
export function useInterpolationAlpha(): React.MutableRefObject<number> {
  const alpha = useRef(0);
  const accumulator = useRef(0);
  const previousTime = useRef(0);
  const initialized = useRef(false);

  useFrame((state) => {
    const currentTime = state.clock.elapsedTime;

    if (!initialized.current) {
      previousTime.current = currentTime;
      initialized.current = true;
      return;
    }

    let frameTime = currentTime - previousTime.current;
    previousTime.current = currentTime;

    if (frameTime > MAX_FRAME_TIME) {
      frameTime = MAX_FRAME_TIME;
    }

    accumulator.current += frameTime;

    // Consume fixed steps
    while (accumulator.current >= FIXED_TIMESTEP) {
      accumulator.current -= FIXED_TIMESTEP;
    }

    alpha.current = accumulator.current / FIXED_TIMESTEP;
  });

  return alpha;
}

// Utility to interpolate between previous and current state
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function lerpVec3(
  a: [number, number, number],
  b: [number, number, number],
  t: number
): [number, number, number] {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

export function slerpQuat(
  a: [number, number, number, number],
  b: [number, number, number, number],
  t: number
): [number, number, number, number] {
  // Simple linear interpolation for quaternions (good enough for small differences)
  // For more accuracy, use proper slerp from Three.js
  let dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];

  // Ensure shortest path
  const bAdjusted: [number, number, number, number] =
    dot < 0 ? [-b[0], -b[1], -b[2], -b[3]] : b;
  if (dot < 0) dot = -dot;

  const result: [number, number, number, number] = [
    lerp(a[0], bAdjusted[0], t),
    lerp(a[1], bAdjusted[1], t),
    lerp(a[2], bAdjusted[2], t),
    lerp(a[3], bAdjusted[3], t),
  ];

  // Normalize
  const len = Math.sqrt(
    result[0] * result[0] +
      result[1] * result[1] +
      result[2] * result[2] +
      result[3] * result[3]
  );
  return [result[0] / len, result[1] / len, result[2] / len, result[3] / len];
}
