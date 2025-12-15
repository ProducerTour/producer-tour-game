import type { LucideIcon } from 'lucide-react';

// Assets URL (Cloudflare R2 CDN)
export const ASSETS_URL = import.meta.env.VITE_ASSETS_URL || '';

// Animation file paths for Mixamo animations
export const ANIMATIONS = {
  idle: '/animations/idle.glb',
  walking: '/animations/walking.glb',
  running: '/animations/running.glb',
} as const;

// Flag to use Mixamo animations vs procedural
export const USE_MIXAMO_ANIMATIONS = false;

// Movement constants
export const WALK_SPEED = 2.5;
export const SPRINT_SPEED = 5;
export const ROTATION_SPEED = 10;

// Ground level constant
export const GROUND_Y = 0.01;

// Collision detection constants
export const PLAYER_RADIUS = 0.5;
export const COLLISION_CHECK_HEIGHT = 1.0;

// Ready Player Me bone names (Mixamo convention)
export const BONE_NAMES = {
  hips: 'Hips',
  spine: 'Spine',
  spine1: 'Spine1',
  spine2: 'Spine2',
  neck: 'Neck',
  head: 'Head',
  leftShoulder: 'LeftShoulder',
  leftArm: 'LeftArm',
  leftForeArm: 'LeftForeArm',
  leftHand: 'LeftHand',
  rightShoulder: 'RightShoulder',
  rightArm: 'RightArm',
  rightForeArm: 'RightForeArm',
  rightHand: 'RightHand',
  leftUpLeg: 'LeftUpLeg',
  leftLeg: 'LeftLeg',
  leftFoot: 'LeftFoot',
  leftToeBase: 'LeftToeBase',
  rightUpLeg: 'RightUpLeg',
  rightLeg: 'RightLeg',
  rightFoot: 'RightFoot',
  rightToeBase: 'RightToeBase',
} as const;

// Arm rotation settings - X axis at 1.31 rad (75°) for natural arm position
export const ARM_ROTATION = {
  axis: 'x' as const,
  angle: 1.31,
};

// Foot rotation settings - X axis at 0.86 rad (49°) for flat feet
export const FOOT_ROTATION = {
  axis: 'x' as const,
  angle: 0.86,
};

// Zone marker configuration type
export interface ZoneConfig {
  position: [number, number, number];
  label: string;
  icon: LucideIcon;
  color: string;
  description: string;
  onClick?: () => void;
}

// Map configuration type
export interface MapConfig {
  spawn: [number, number, number];
  zones: ZoneConfig[];
  groundSize?: number;
}

// Avatar URL validation
export function isValidAvatarUrl(url?: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return false;
    if (!url.includes('.glb')) return false;
    if (parsed.hostname.endsWith('readyplayer.me')) {
      return parsed.hostname === 'models.readyplayer.me';
    }
    return false;
  } catch {
    return false;
  }
}

// Avatar URL caching for instant load
const AVATAR_CACHE_KEY = 'producer-tour-avatar-url';

/** Get cached avatar URL from localStorage */
export function getCachedAvatarUrl(): string | null {
  try {
    const cached = localStorage.getItem(AVATAR_CACHE_KEY);
    if (cached && isValidAvatarUrl(cached)) {
      return cached;
    }
  } catch {
    // localStorage not available
  }
  return null;
}

/** Cache avatar URL to localStorage for faster reload */
export function setCachedAvatarUrl(url: string): boolean {
  if (!isValidAvatarUrl(url)) {
    console.warn('Attempted to cache invalid avatar URL:', url);
    return false;
  }
  try {
    localStorage.setItem(AVATAR_CACHE_KEY, url);
    console.log('🎭 Avatar URL cached for instant load');
    return true;
  } catch {
    console.warn('Failed to cache avatar URL');
    return false;
  }
}

/** Clear cached avatar URL */
export function clearCachedAvatarUrl(): void {
  try {
    localStorage.removeItem(AVATAR_CACHE_KEY);
  } catch {
    // Ignore errors
  }
}

// Keyboard map for ecctrl character controller
export const keyboardMap = [
  { name: 'forward', keys: ['ArrowUp', 'KeyW'] },
  { name: 'backward', keys: ['ArrowDown', 'KeyS'] },
  { name: 'leftward', keys: ['ArrowLeft', 'KeyA'] },
  { name: 'rightward', keys: ['ArrowRight', 'KeyD'] },
  { name: 'jump', keys: ['Space'] },
  { name: 'run', keys: ['Shift'] },
];
