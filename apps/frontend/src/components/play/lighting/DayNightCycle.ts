/**
 * DayNightCycle.ts
 *
 * Realistic day/night cycle system with:
 * - Smooth interpolation between time periods
 * - Configurable cycle duration (default 30 minutes)
 * - Dynamic sun position based on time
 * - Color gradients for sunrise/sunset
 *
 * Time is represented as 0-24 hours (float), where:
 * - 0.00 = Midnight
 * - 6.00 = Dawn
 * - 12.00 = Noon
 * - 18.00 = Sunset
 * - 24.00 = Midnight (wraps to 0)
 */

import { create } from 'zustand';
import * as THREE from 'three';

// Time periods with smooth color/intensity curves
export interface TimeOfDayConfig {
  hour: number;           // Hour of day (0-24)
  sunAngle: number;       // Sun elevation angle (-90 to 90)
  sunAzimuth: number;     // Sun rotation around Y axis (degrees)
  sunColor: string;       // Sun light color
  sunIntensity: number;   // Sun brightness
  ambientIntensity: number;
  skyColor: string;       // Sky/hemisphere horizon color
  zenithColor: string;    // Sky color at top of dome (for SimonDev-style gradients)
  groundColor: string;    // Hemisphere bottom color
  fogColor: string;       // Fog/atmosphere color
  fogDensity: number;     // Fog density multiplier
}

// Key time points for interpolation (will smoothly blend between these)
export const TIME_KEYFRAMES: TimeOfDayConfig[] = [
  // Midnight (0:00) - Deep dark sky with rich purple-blue
  {
    hour: 0,
    sunAngle: -30,
    sunAzimuth: 0,
    sunColor: '#1a2a4a',
    sunIntensity: 0.03,
    ambientIntensity: 0.06,
    skyColor: '#0d0815',        // Deep purple-black horizon
    zenithColor: '#020206',     // Nearly black with subtle blue at zenith
    groundColor: '#030305',
    fogColor: '#08050d',        // Dark purple fog
    fogDensity: 1.3,
  },
  // Pre-dawn (4:30) - First hint of light on horizon
  {
    hour: 4.5,
    sunAngle: -15,
    sunAzimuth: 80,
    sunColor: '#2a3a5a',
    sunIntensity: 0.1,
    ambientIntensity: 0.12,
    skyColor: '#1a2040',
    zenithColor: '#0a0a1a',     // Dark blue-purple at top
    groundColor: '#0a0a10',
    fogColor: '#1a2040',
    fogDensity: 1.1,
  },
  // Dawn (6:00) - Warm orange horizon with purple-blue zenith
  {
    hour: 6,
    sunAngle: 5,
    sunAzimuth: 90,
    sunColor: '#ff7744',
    sunIntensity: 0.5,
    ambientIntensity: 0.25,
    skyColor: '#ff9966',        // Warm orange at horizon
    zenithColor: '#4a5580',     // Purple-blue at top (SimonDev style)
    groundColor: '#3d4a37',
    fogColor: '#ffaa77',
    fogDensity: 0.9,
  },
  // Early Morning (7:30) - Transitioning to blue sky
  {
    hour: 7.5,
    sunAngle: 25,
    sunAzimuth: 100,
    sunColor: '#ffcc99',
    sunIntensity: 0.85,
    ambientIntensity: 0.35,
    skyColor: '#a8d4e6',        // Pale hazy blue at horizon (atmospheric haze)
    zenithColor: '#2d6eb5',     // Rich cobalt blue at zenith
    groundColor: '#3d6a37',
    fogColor: '#c4d8e8',
    fogDensity: 0.7,
  },
  // Morning (9:00) - Clear day sky
  {
    hour: 9,
    sunAngle: 45,
    sunAzimuth: 120,
    sunColor: '#ffffee',
    sunIntensity: 1.0,
    ambientIntensity: 0.4,
    skyColor: '#9dcbe8',        // Light azure at horizon
    zenithColor: '#1e5799',     // Deep azure blue at zenith
    groundColor: '#3d7a37',
    fogColor: '#b3c4d9',
    fogDensity: 0.5,
  },
  // Noon (12:00) - Brightest, clearest sky
  {
    hour: 12,
    sunAngle: 75,
    sunAzimuth: 180,
    sunColor: '#ffffff',
    sunIntensity: 1.2,
    ambientIntensity: 0.5,
    skyColor: '#8ec4e8',        // Pale sky blue at horizon (haze from sun)
    zenithColor: '#1a4d80',     // Deep cerulean at zenith
    groundColor: '#4a8a44',
    fogColor: '#b3c4d9',
    fogDensity: 0.4,
  },
  // Afternoon (15:00) - Slightly warmer
  {
    hour: 15,
    sunAngle: 55,
    sunAzimuth: 240,
    sunColor: '#fff8ee',
    sunIntensity: 1.1,
    ambientIntensity: 0.45,
    skyColor: '#9ec8e0',        // Soft hazy blue
    zenithColor: '#1e5088',     // Rich afternoon blue
    groundColor: '#3d7a37',
    fogColor: '#c4d0dd',
    fogDensity: 0.5,
  },
  // Late Afternoon (17:00) - Golden hour beginning
  {
    hour: 17,
    sunAngle: 30,
    sunAzimuth: 260,
    sunColor: '#ffddaa',
    sunIntensity: 0.95,
    ambientIntensity: 0.4,
    skyColor: '#e8c090',        // Golden horizon
    zenithColor: '#6080a0',     // Blue-gray at top
    groundColor: '#3d6a30',
    fogColor: '#d4b090',
    fogDensity: 0.6,
  },
  // Sunset (18:30) - Rich orange horizon with deep purple zenith
  {
    hour: 18.5,
    sunAngle: 8,
    sunAzimuth: 270,
    sunColor: '#ff6633',
    sunIntensity: 0.7,
    ambientIntensity: 0.3,
    skyColor: '#ff7744',        // Vibrant orange at horizon
    zenithColor: '#443366',     // Deep purple at top (SimonDev style)
    groundColor: '#2d4a27',
    fogColor: '#ff8855',
    fogDensity: 0.8,
  },
  // Dusk (19:30) - Fading to night with deep purple
  {
    hour: 19.5,
    sunAngle: -5,
    sunAzimuth: 280,
    sunColor: '#4a2860',
    sunIntensity: 0.15,
    ambientIntensity: 0.14,
    skyColor: '#351845',        // Deep magenta-purple at horizon
    zenithColor: '#0f0a1a',     // Very dark purple-blue at top
    groundColor: '#0a1510',
    fogColor: '#251535',        // Rich purple fog
    fogDensity: 1.1,
  },
  // Night (21:00) - Dark starry sky with deep purple-blue
  {
    hour: 21,
    sunAngle: -20,
    sunAzimuth: 300,
    sunColor: '#1a3388',
    sunIntensity: 0.05,
    ambientIntensity: 0.08,
    skyColor: '#0f1530',        // Deep blue-purple at horizon
    zenithColor: '#030308',     // Nearly black at zenith
    groundColor: '#050508',
    fogColor: '#0a0d1a',        // Dark blue-purple fog
    fogDensity: 1.2,
  },
  // Late Night wraps to Midnight
  {
    hour: 24,
    sunAngle: -30,
    sunAzimuth: 360,
    sunColor: '#1a2a4a',
    sunIntensity: 0.03,
    ambientIntensity: 0.06,
    skyColor: '#0d0815',        // Deep purple-black horizon
    zenithColor: '#020206',     // Nearly black with subtle blue at zenith
    groundColor: '#030305',
    fogColor: '#08050d',        // Dark purple fog
    fogDensity: 1.3,
  },
];

// Helper: Linear interpolation
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// Helper: Interpolate hex colors
function lerpColor(colorA: string, colorB: string, t: number): string {
  const a = new THREE.Color(colorA);
  const b = new THREE.Color(colorB);
  const result = new THREE.Color();
  result.r = lerp(a.r, b.r, t);
  result.g = lerp(a.g, b.g, t);
  result.b = lerp(a.b, b.b, t);
  return '#' + result.getHexString();
}

// Get interpolated time-of-day config for any hour
export function getInterpolatedTimeConfig(hour: number): TimeOfDayConfig {
  // Normalize hour to 0-24 range
  const normalizedHour = ((hour % 24) + 24) % 24;

  // Find the two keyframes to interpolate between
  let prevKeyframe = TIME_KEYFRAMES[TIME_KEYFRAMES.length - 2]; // 21:00
  let nextKeyframe = TIME_KEYFRAMES[0]; // 0:00

  for (let i = 0; i < TIME_KEYFRAMES.length - 1; i++) {
    if (normalizedHour >= TIME_KEYFRAMES[i].hour && normalizedHour < TIME_KEYFRAMES[i + 1].hour) {
      prevKeyframe = TIME_KEYFRAMES[i];
      nextKeyframe = TIME_KEYFRAMES[i + 1];
      break;
    }
  }

  // Calculate interpolation factor
  const range = nextKeyframe.hour - prevKeyframe.hour;
  const t = range > 0 ? (normalizedHour - prevKeyframe.hour) / range : 0;

  // Smooth step for more natural transitions
  const smoothT = t * t * (3 - 2 * t);

  return {
    hour: normalizedHour,
    sunAngle: lerp(prevKeyframe.sunAngle, nextKeyframe.sunAngle, smoothT),
    sunAzimuth: lerp(prevKeyframe.sunAzimuth, nextKeyframe.sunAzimuth, smoothT),
    sunColor: lerpColor(prevKeyframe.sunColor, nextKeyframe.sunColor, smoothT),
    sunIntensity: lerp(prevKeyframe.sunIntensity, nextKeyframe.sunIntensity, smoothT),
    ambientIntensity: lerp(prevKeyframe.ambientIntensity, nextKeyframe.ambientIntensity, smoothT),
    skyColor: lerpColor(prevKeyframe.skyColor, nextKeyframe.skyColor, smoothT),
    zenithColor: lerpColor(prevKeyframe.zenithColor, nextKeyframe.zenithColor, smoothT),
    groundColor: lerpColor(prevKeyframe.groundColor, nextKeyframe.groundColor, smoothT),
    fogColor: lerpColor(prevKeyframe.fogColor, nextKeyframe.fogColor, smoothT),
    fogDensity: lerp(prevKeyframe.fogDensity, nextKeyframe.fogDensity, smoothT),
  };
}

// Calculate sun position from angles
export function calculateSunPosition(
  sunAngle: number,
  sunAzimuth: number,
  distance: number = 100
): THREE.Vector3 {
  const elevationRad = (sunAngle * Math.PI) / 180;
  const azimuthRad = (sunAzimuth * Math.PI) / 180;

  return new THREE.Vector3(
    Math.cos(elevationRad) * Math.sin(azimuthRad) * distance,
    Math.sin(elevationRad) * distance,
    Math.cos(elevationRad) * Math.cos(azimuthRad) * distance
  );
}

// Time period names for UI
export function getTimePeriodName(hour: number): string {
  if (hour >= 5 && hour < 7) return 'Dawn';
  if (hour >= 7 && hour < 10) return 'Morning';
  if (hour >= 10 && hour < 14) return 'Noon';
  if (hour >= 14 && hour < 17) return 'Afternoon';
  if (hour >= 17 && hour < 19) return 'Evening';
  if (hour >= 19 && hour < 21) return 'Dusk';
  return 'Night';
}

// Format time as HH:MM
export function formatTime(hour: number): string {
  const h = Math.floor(hour);
  const m = Math.floor((hour - h) * 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

// ============================================================================
// ZUSTAND STORE
// ============================================================================

interface DayNightCycleState {
  // Current time of day (0-24 hours)
  currentHour: number;
  // Whether the cycle is running
  cycleEnabled: boolean;
  // Full cycle duration in real seconds (default 1800 = 30 minutes)
  cycleDuration: number;
  // Time speed multiplier (1.0 = normal, 2.0 = 2x faster)
  timeSpeed: number;
  // Paused state
  isPaused: boolean;

  // Actions
  setCurrentHour: (hour: number) => void;
  setCycleEnabled: (enabled: boolean) => void;
  setCycleDuration: (seconds: number) => void;
  setTimeSpeed: (speed: number) => void;
  togglePause: () => void;
  tick: (deltaSeconds: number) => void;
}

export const useDayNightCycleStore = create<DayNightCycleState>((set, get) => ({
  currentHour: 10, // Start at 10:00 AM
  cycleEnabled: true,
  cycleDuration: 1800, // 30 minutes = 1800 seconds
  timeSpeed: 1.0,
  isPaused: false,

  setCurrentHour: (hour: number) => set({ currentHour: ((hour % 24) + 24) % 24 }),

  setCycleEnabled: (enabled: boolean) => set({ cycleEnabled: enabled }),

  setCycleDuration: (seconds: number) => set({ cycleDuration: Math.max(60, seconds) }),

  setTimeSpeed: (speed: number) => set({ timeSpeed: Math.max(0.1, Math.min(10, speed)) }),

  togglePause: () => set(state => ({ isPaused: !state.isPaused })),

  tick: (deltaSeconds: number) => {
    const { cycleEnabled, isPaused, cycleDuration, timeSpeed, currentHour } = get();
    if (!cycleEnabled || isPaused) return;

    // Calculate how many in-game hours pass per real second
    // cycleDuration seconds = 24 in-game hours
    const hoursPerSecond = 24 / cycleDuration;

    // Advance time
    const newHour = (currentHour + deltaSeconds * hoursPerSecond * timeSpeed) % 24;
    set({ currentHour: newHour });
  },
}));
