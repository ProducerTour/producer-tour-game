/**
 * GameLighting.tsx
 *
 * Comprehensive lighting system for the game world with:
 * - Directional sun light with cascaded shadow maps
 * - Hemisphere light for sky/ground ambient
 * - Configurable shadow quality presets
 * - Dynamic day/night cycle with smooth interpolation
 * - Time-of-day support (synced with skybox)
 */

import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ContactShadows } from '@react-three/drei';
import {
  useDayNightCycleStore,
  getInterpolatedTimeConfig,
  calculateSunPosition,
  formatTime,
  getTimePeriodName,
} from './DayNightCycle';

// Shadow map sizes for quality presets
export const SHADOW_MAP_SIZES = {
  off: 0,
  low: 512,
  medium: 1024,
  high: 2048,
  ultra: 4096,
} as const;

export type ShadowQuality = keyof typeof SHADOW_MAP_SIZES;

// Time of day presets with lighting parameters (legacy, for 'custom' mode)
export const TIME_OF_DAY_PRESETS = {
  dawn: {
    sunAngle: 15,
    sunColor: '#ffaa77',
    ambientIntensity: 0.3,
    sunIntensity: 0.8,
    skyColor: '#ff9966',
    groundColor: '#334455',
  },
  morning: {
    sunAngle: 35,
    sunColor: '#ffffcc',
    ambientIntensity: 0.4,
    sunIntensity: 1.0,
    skyColor: '#87CEEB',
    groundColor: '#3d7a37',
  },
  noon: {
    sunAngle: 70,
    sunColor: '#ffffff',
    ambientIntensity: 0.5,
    sunIntensity: 1.2,
    skyColor: '#87CEEB',
    groundColor: '#4a8a44',
  },
  afternoon: {
    sunAngle: 45,
    sunColor: '#fff5e6',
    ambientIntensity: 0.45,
    sunIntensity: 1.1,
    skyColor: '#9ec5e8',
    groundColor: '#3d7a37',
  },
  sunset: {
    sunAngle: 10,
    sunColor: '#ff6633',
    ambientIntensity: 0.35,
    sunIntensity: 0.9,
    skyColor: '#ff7744',
    groundColor: '#2d4a27',
  },
  night: {
    sunAngle: -20,
    sunColor: '#4466aa',
    ambientIntensity: 0.15,
    sunIntensity: 0.2,
    skyColor: '#112244',
    groundColor: '#0a0a0f',
  },
} as const;

export type TimeOfDay = keyof typeof TIME_OF_DAY_PRESETS;

/**
 * Lighting state that can be consumed by other components (terrain shaders, etc.)
 */
export interface LightingState {
  sunDirection: THREE.Vector3;
  sunColor: THREE.Color;
  sunIntensity: number;
  skyColor: THREE.Color;
  groundColor: THREE.Color;
  fogColor: THREE.Color;
  ambientIntensity: number;
  currentHour: number;
}

export interface GameLightingProps {
  // Shadow settings
  shadowsEnabled?: boolean;
  shadowQuality?: ShadowQuality;
  shadowBias?: number;
  shadowNormalBias?: number;

  // Sun settings (used when timeOfDay is 'custom' and dayNightCycleEnabled is false)
  sunIntensity?: number;
  sunColor?: string;
  sunPosition?: { x: number; y: number; z: number };

  // Ambient settings (used when timeOfDay is 'custom' and dayNightCycleEnabled is false)
  ambientIntensity?: number;
  skyColor?: string;
  groundColor?: string;

  // Contact shadows (fake shadows for player)
  contactShadowsEnabled?: boolean;
  contactShadowOpacity?: number;

  // Time of day (overrides manual settings if set)
  // 'cycle' = use automatic day/night cycle
  // 'custom' = use manual settings
  // Other values = jump to that time preset
  timeOfDay?: TimeOfDay | 'custom' | 'cycle';

  // Day/Night Cycle settings
  dayNightCycleEnabled?: boolean;
  cycleDuration?: number; // Full day duration in seconds (default 1800 = 30 min)
  timeSpeed?: number; // Speed multiplier (1.0 = normal)

  // Player position for contact shadows
  playerPosition?: THREE.Vector3;

  // Shadow frustum (for large terrains)
  shadowCameraSize?: number;
  shadowCameraNear?: number;
  shadowCameraFar?: number;

  // Callback for fog color updates (so skybox/fog can sync)
  onFogColorChange?: (color: string) => void;

  // Callback for full lighting state updates (for terrain/grass shaders)
  onLightingUpdate?: (state: LightingState) => void;
}

export function GameLighting({
  shadowsEnabled = true,
  shadowQuality = 'medium',
  shadowBias = -0.0001,
  shadowNormalBias = 0.02,
  sunIntensity = 1.2,
  sunColor = '#ffffff',
  sunPosition = { x: 100, y: 80, z: 50 },
  ambientIntensity = 0.4,
  skyColor = '#87CEEB',
  groundColor = '#3d7a37',
  contactShadowsEnabled = true,
  contactShadowOpacity = 0.5,
  timeOfDay = 'cycle', // Default to cycle mode
  dayNightCycleEnabled = true,
  cycleDuration = 1800, // 30 minutes
  timeSpeed = 1.0,
  playerPosition,
  shadowCameraSize = 150,
  shadowCameraNear = 0.5,
  shadowCameraFar = 500,
  onFogColorChange,
  onLightingUpdate,
}: GameLightingProps) {
  const directionalLightRef = useRef<THREE.DirectionalLight>(null);
  const hemisphereRef = useRef<THREE.HemisphereLight>(null);
  const ambientRef = useRef<THREE.AmbientLight>(null);
  const fillLightRef = useRef<THREE.DirectionalLight>(null);

  // Reusable objects for lighting state (prevents allocation every frame)
  const lightingStateRef = useRef<LightingState>({
    sunDirection: new THREE.Vector3(),
    sunColor: new THREE.Color(),
    sunIntensity: 1.0,
    skyColor: new THREE.Color(),
    groundColor: new THREE.Color(),
    fogColor: new THREE.Color(),
    ambientIntensity: 0.4,
    currentHour: 10,
  });

  // Day/Night cycle state
  const currentHour = useDayNightCycleStore(state => state.currentHour);
  const tick = useDayNightCycleStore(state => state.tick);
  const setCycleEnabled = useDayNightCycleStore(state => state.setCycleEnabled);
  const setCycleDuration = useDayNightCycleStore(state => state.setCycleDuration);
  const setTimeSpeed = useDayNightCycleStore(state => state.setTimeSpeed);
  const setCurrentHour = useDayNightCycleStore(state => state.setCurrentHour);

  // Sync cycle settings with props
  useEffect(() => {
    setCycleEnabled(dayNightCycleEnabled && timeOfDay === 'cycle');
    setCycleDuration(cycleDuration);
    setTimeSpeed(timeSpeed);
  }, [dayNightCycleEnabled, timeOfDay, cycleDuration, timeSpeed, setCycleEnabled, setCycleDuration, setTimeSpeed]);

  // Jump to specific time when preset is selected
  useEffect(() => {
    if (timeOfDay !== 'custom' && timeOfDay !== 'cycle' && TIME_OF_DAY_PRESETS[timeOfDay]) {
      // Map preset name to approximate hour
      const presetHours: Record<TimeOfDay, number> = {
        dawn: 6,
        morning: 9,
        noon: 12,
        afternoon: 15,
        sunset: 18.5,
        night: 22,
      };
      setCurrentHour(presetHours[timeOfDay]);
    }
  }, [timeOfDay, setCurrentHour]);

  // Calculate lighting parameters based on time of day or custom
  const lightingParams = useMemo(() => {
    // Use dynamic cycle if enabled
    if (timeOfDay === 'cycle' || (timeOfDay !== 'custom' && dayNightCycleEnabled)) {
      const config = getInterpolatedTimeConfig(currentHour);
      const sunPos = calculateSunPosition(config.sunAngle, config.sunAzimuth, 100);

      return {
        sunPosition: { x: sunPos.x, y: sunPos.y, z: sunPos.z },
        sunColor: config.sunColor,
        sunIntensity: config.sunIntensity,
        ambientIntensity: config.ambientIntensity,
        skyColor: config.skyColor,
        groundColor: config.groundColor,
        fogColor: config.fogColor,
      };
    }

    // Use preset if selected (but not cycling)
    if (timeOfDay !== 'custom' && TIME_OF_DAY_PRESETS[timeOfDay]) {
      const preset = TIME_OF_DAY_PRESETS[timeOfDay];
      const angleRad = (preset.sunAngle * Math.PI) / 180;
      const distance = 100;
      return {
        sunPosition: {
          x: Math.cos(angleRad) * distance,
          y: Math.sin(angleRad) * distance,
          z: distance * 0.5,
        },
        sunColor: preset.sunColor,
        sunIntensity: preset.sunIntensity,
        ambientIntensity: preset.ambientIntensity,
        skyColor: preset.skyColor,
        groundColor: preset.groundColor,
        fogColor: preset.skyColor, // Use sky color for fog in preset mode
      };
    }

    // Custom mode - use manual settings
    return {
      sunPosition,
      sunColor,
      sunIntensity,
      ambientIntensity,
      skyColor,
      groundColor,
      fogColor: skyColor, // Use sky color for fog in custom mode
    };
  }, [timeOfDay, dayNightCycleEnabled, currentHour, sunPosition, sunColor, sunIntensity, ambientIntensity, skyColor, groundColor]);

  // Notify parent of fog color changes for skybox sync
  useEffect(() => {
    onFogColorChange?.(lightingParams.fogColor);
  }, [lightingParams.fogColor, onFogColorChange]);

  // Get shadow map size
  const shadowMapSize = SHADOW_MAP_SIZES[shadowQuality] || SHADOW_MAP_SIZES.medium;
  const shadowsActive = shadowsEnabled && shadowMapSize > 0;

  // Tick the day/night cycle and update lights each frame
  useFrame((_, delta) => {
    // Tick the cycle
    tick(delta);

    // Update directional light (sun)
    if (directionalLightRef.current) {
      const light = directionalLightRef.current;

      // Update light color and intensity dynamically
      light.color.set(lightingParams.sunColor);
      light.intensity = lightingParams.sunIntensity;

      // Position light - follow player if available
      if (playerPosition && shadowsActive) {
        light.target.position.set(playerPosition.x, 0, playerPosition.z);
        light.target.updateMatrixWorld();
        light.position.set(
          playerPosition.x + lightingParams.sunPosition.x,
          lightingParams.sunPosition.y,
          playerPosition.z + lightingParams.sunPosition.z
        );
      } else {
        light.position.set(
          lightingParams.sunPosition.x,
          lightingParams.sunPosition.y,
          lightingParams.sunPosition.z
        );
      }
    }

    // Update hemisphere light colors
    if (hemisphereRef.current) {
      hemisphereRef.current.color.set(lightingParams.skyColor);
      hemisphereRef.current.groundColor.set(lightingParams.groundColor);
      hemisphereRef.current.intensity = lightingParams.ambientIntensity;
    }

    // Update ambient light
    if (ambientRef.current) {
      ambientRef.current.color.set(lightingParams.skyColor);
      ambientRef.current.intensity = lightingParams.ambientIntensity * 0.5;
    }

    // Update fill light
    if (fillLightRef.current) {
      fillLightRef.current.color.set(lightingParams.skyColor);
      fillLightRef.current.intensity = lightingParams.sunIntensity * 0.15;
      fillLightRef.current.position.set(
        -lightingParams.sunPosition.x * 0.5,
        lightingParams.sunPosition.y * 0.3,
        -lightingParams.sunPosition.z * 0.5
      );
    }

    // Update lighting state for external consumers (terrain/grass shaders)
    if (onLightingUpdate) {
      const state = lightingStateRef.current;

      // Calculate normalized sun direction
      state.sunDirection.set(
        lightingParams.sunPosition.x,
        lightingParams.sunPosition.y,
        lightingParams.sunPosition.z
      ).normalize();

      // Update colors
      state.sunColor.set(lightingParams.sunColor);
      state.sunIntensity = lightingParams.sunIntensity;
      state.skyColor.set(lightingParams.skyColor);
      state.groundColor.set(lightingParams.groundColor);
      state.fogColor.set(lightingParams.fogColor);
      state.ambientIntensity = lightingParams.ambientIntensity;
      state.currentHour = currentHour;

      onLightingUpdate(state);
    }
  });

  // Configure shadow properties when light mounts
  useMemo(() => {
    if (!directionalLightRef.current || !shadowsActive) return;

    const light = directionalLightRef.current;

    // Configure shadow camera for large terrain
    light.shadow.camera.left = -shadowCameraSize;
    light.shadow.camera.right = shadowCameraSize;
    light.shadow.camera.top = shadowCameraSize;
    light.shadow.camera.bottom = -shadowCameraSize;
    light.shadow.camera.near = shadowCameraNear;
    light.shadow.camera.far = shadowCameraFar;
    light.shadow.camera.updateProjectionMatrix();

    // Shadow map settings
    light.shadow.mapSize.width = shadowMapSize;
    light.shadow.mapSize.height = shadowMapSize;
    light.shadow.bias = shadowBias;
    light.shadow.normalBias = shadowNormalBias;

    // Enable soft shadows
    light.shadow.radius = 1.5;

  }, [shadowsActive, shadowMapSize, shadowCameraSize, shadowCameraNear, shadowCameraFar, shadowBias, shadowNormalBias]);

  // Debug: Log current time occasionally
  useEffect(() => {
    if (timeOfDay === 'cycle' && dayNightCycleEnabled) {
      console.log(`🌅 Day/Night Cycle: ${formatTime(currentHour)} (${getTimePeriodName(currentHour)})`);
    }
  }, [Math.floor(currentHour)]); // Log on each hour change

  return (
    <>
      {/* Ambient light - provides baseline illumination */}
      <ambientLight
        ref={ambientRef}
        intensity={lightingParams.ambientIntensity * 0.5}
        color={lightingParams.skyColor}
      />

      {/* Hemisphere light - sky/ground gradient for natural outdoor feel */}
      <hemisphereLight
        ref={hemisphereRef}
        args={[lightingParams.skyColor, lightingParams.groundColor, lightingParams.ambientIntensity]}
      />

      {/* Main directional light (sun) */}
      <directionalLight
        ref={directionalLightRef}
        position={[
          lightingParams.sunPosition.x,
          lightingParams.sunPosition.y,
          lightingParams.sunPosition.z
        ]}
        intensity={lightingParams.sunIntensity}
        color={lightingParams.sunColor}
        castShadow={shadowsActive}
        shadow-mapSize={shadowsActive ? [shadowMapSize, shadowMapSize] : undefined}
        shadow-camera-left={-shadowCameraSize}
        shadow-camera-right={shadowCameraSize}
        shadow-camera-top={shadowCameraSize}
        shadow-camera-bottom={-shadowCameraSize}
        shadow-camera-near={shadowCameraNear}
        shadow-camera-far={shadowCameraFar}
        shadow-bias={shadowBias}
        shadow-normalBias={shadowNormalBias}
      >
        {/* Shadow camera helper for debugging */}
        {/* <cameraHelper args={[directionalLightRef.current?.shadow.camera]} /> */}
      </directionalLight>

      {/* Fill light - subtle opposite direction for softer shadows */}
      <directionalLight
        ref={fillLightRef}
        position={[
          -lightingParams.sunPosition.x * 0.5,
          lightingParams.sunPosition.y * 0.3,
          -lightingParams.sunPosition.z * 0.5
        ]}
        intensity={lightingParams.sunIntensity * 0.15}
        color={lightingParams.skyColor}
        castShadow={false}
      />

      {/* Contact shadows for player (fake shadows, always work) */}
      {contactShadowsEnabled && playerPosition && (
        <ContactShadows
          position={[playerPosition.x, 0.01, playerPosition.z]}
          opacity={contactShadowOpacity}
          scale={12}
          blur={2}
          far={4}
          color="#000000"
          resolution={256}
        />
      )}
    </>
  );
}

// Re-export cycle utilities
export { useDayNightCycleStore, formatTime, getTimePeriodName } from './DayNightCycle';

export default GameLighting;
