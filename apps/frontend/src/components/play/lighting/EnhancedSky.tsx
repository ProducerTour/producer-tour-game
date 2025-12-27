/**
 * EnhancedSky.tsx
 *
 * Custom procedural sky with:
 * - Improved atmospheric scattering (Preetham-style with enhancements)
 * - Visible sun disk with glow
 * - Procedural stars that fade with sun elevation
 * - Moon rendering for night
 * - Full integration with DayNightCycle store
 *
 * References:
 * - Preetham sky model: "A Practical Analytic Model for Daylight"
 * - https://www.shadertoy.com/view/Ml2cWG (atmospheric scattering)
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useDayNightCycleStore, getInterpolatedTimeConfig, calculateSunPosition } from './DayNightCycle';

// Vertex shader - simple fullscreen dome
const skyVertexShader = /* glsl */ `
  varying vec3 vWorldPosition;
  varying vec3 vSunDirection;
  varying float vSunY;

  uniform vec3 uSunPosition;

  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;

    // Pass sun direction to fragment shader
    vSunDirection = normalize(uSunPosition);
    vSunY = uSunPosition.y / length(uSunPosition);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// DEBUG: Simple test shader to verify mesh is rendering
// Set to true to show pink/orange gradient instead of full sky shader
const DEBUG_SIMPLE_SHADER = false;

// Fragment shader - atmospheric scattering with sun disk and stars
const skyFragmentShader = DEBUG_SIMPLE_SHADER
  ? /* glsl */ `
  precision highp float;
  varying vec3 vWorldPosition;
  void main() {
    // Simple gradient - pink at top, orange at horizon
    float h = normalize(vWorldPosition).y;
    vec3 topColor = vec3(1.0, 0.5, 0.8); // Pink
    vec3 bottomColor = vec3(1.0, 0.6, 0.3); // Orange
    vec3 color = mix(bottomColor, topColor, max(0.0, h));
    gl_FragColor = vec4(color, 1.0);
  }
`
  : /* glsl */ `
  precision highp float;

  varying vec3 vWorldPosition;
  varying vec3 vSunDirection;
  varying float vSunY;

  uniform vec3 uSunPosition;
  uniform vec3 uSunColor;
  uniform float uSunIntensity;
  uniform float uTimeOfDay; // 0-24 hours
  uniform float uTurbidity;
  uniform float uRayleigh;
  uniform float uMieCoefficient;
  uniform float uMieDirectionalG;
  uniform bool uShowSunDisk;
  uniform bool uShowStars;
  uniform float uStarsIntensity;
  uniform vec3 uHorizonColor;
  uniform vec3 uZenithColor;
  uniform vec3 uGroundColor;

  // Constants
  const float PI = 3.14159265359;
  const float SUN_ANGULAR_RADIUS = 0.00465; // ~0.53 degrees (realistic sun)
  const float SUN_GLOW_RADIUS = 0.05; // Glow around sun
  const float MOON_ANGULAR_RADIUS = 0.009; // Moon appears slightly larger than sun
  const float MOON_GLOW_RADIUS = 0.03;

  // Hash function for stars
  float hash(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }

  // 3D hash for volumetric effects
  float hash3(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }

  // 2D noise for star twinkling
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  // Fractal brownian motion for Milky Way
  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    for (int i = 0; i < 5; i++) {
      value += amplitude * noise(p * frequency);
      amplitude *= 0.5;
      frequency *= 2.0;
    }
    return value;
  }

  // Procedural stars with color variety
  vec3 stars(vec3 dir, float time) {
    // Project to spherical coordinates
    float theta = atan(dir.z, dir.x);
    float phi = acos(dir.y);

    // Create star field at multiple scales
    vec2 starCoord = vec2(theta * 50.0, phi * 50.0);
    vec3 starColor = vec3(0.0);

    // Large bright stars with color (1/4 original size)
    float star1 = hash(floor(starCoord * 0.5));
    if (star1 > 0.993) {
      vec2 starCenter = floor(starCoord * 0.5) + 0.5;
      float dist = length(starCoord * 0.5 - starCenter);
      float twinkle = 0.5 + 0.5 * sin(time * 3.0 + star1 * 100.0);
      float brightness = smoothstep(0.09, 0.0, dist) * twinkle * 2.5;
      // Star color based on hash - blue, white, yellow, orange stars
      float colorHash = hash(floor(starCoord * 0.5) + 100.0);
      vec3 tint = colorHash < 0.3 ? vec3(0.7, 0.85, 1.0) :  // Blue star
                  colorHash < 0.6 ? vec3(1.0, 1.0, 0.95) :  // White star
                  colorHash < 0.8 ? vec3(1.0, 0.95, 0.8) :  // Yellow star
                                    vec3(1.0, 0.8, 0.6);    // Orange star
      starColor += tint * brightness;
    }

    // Medium stars (1/4 original size)
    float star2 = hash(floor(starCoord));
    if (star2 > 0.985) {
      vec2 starCenter = floor(starCoord) + 0.5;
      float dist = length(starCoord - starCenter);
      float twinkle = 0.7 + 0.3 * sin(time * 2.0 + star2 * 50.0);
      starColor += vec3(0.9, 0.95, 1.0) * smoothstep(0.06, 0.0, dist) * twinkle * 1.2;
    }

    // Small dim stars (more of them)
    float star3 = hash(floor(starCoord * 2.0));
    if (star3 > 0.975) {
      vec2 starCenter = floor(starCoord * 2.0) + 0.5;
      float dist = length(starCoord * 2.0 - starCenter);
      starColor += vec3(0.8, 0.85, 0.95) * smoothstep(0.18, 0.0, dist) * 0.6;
    }

    // Tiny background stars
    float star4 = hash(floor(starCoord * 4.0));
    if (star4 > 0.96) {
      vec2 starCenter = floor(starCoord * 4.0) + 0.5;
      float dist = length(starCoord * 4.0 - starCenter);
      starColor += vec3(0.7, 0.75, 0.85) * smoothstep(0.12, 0.0, dist) * 0.3;
    }

    return starColor;
  }

  // Milky Way band
  vec3 milkyWay(vec3 dir) {
    // Milky Way runs roughly along a great circle tilted from the horizon
    // We'll tilt it about 60 degrees and rotate it
    float theta = atan(dir.z, dir.x);
    float phi = acos(dir.y);

    // Create tilted coordinate for the galactic plane
    // Rotate the direction vector to align with milky way band
    float tiltAngle = 1.1; // ~63 degrees tilt
    float rotAngle = 0.5;  // Rotation around vertical axis

    // Simple approximation of galactic coordinates
    vec3 rotDir = dir;
    // Tilt around X axis
    float cosT = cos(tiltAngle);
    float sinT = sin(tiltAngle);
    rotDir = vec3(
      dir.x,
      dir.y * cosT - dir.z * sinT,
      dir.y * sinT + dir.z * cosT
    );

    // Distance from galactic plane (equator of tilted sphere)
    float galacticLat = asin(clamp(rotDir.y, -1.0, 1.0));
    float galacticLon = atan(rotDir.z, rotDir.x);

    // Milky Way is brightest near the galactic plane
    float bandWidth = 0.35;
    float bandIntensity = exp(-galacticLat * galacticLat / (2.0 * bandWidth * bandWidth));

    // Add cloudy structure with fbm noise
    vec2 noiseCoord = vec2(galacticLon * 3.0, galacticLat * 8.0);
    float cloudNoise = fbm(noiseCoord * 2.0);
    float detailNoise = fbm(noiseCoord * 8.0 + 100.0);

    // Combine for final milky way density
    float density = bandIntensity * (0.4 + 0.6 * cloudNoise) * (0.7 + 0.3 * detailNoise);

    // Add bright core region (galactic center)
    float coreRegion = exp(-pow(galacticLon - 0.5, 2.0) * 2.0) * exp(-galacticLat * galacticLat * 8.0);
    density += coreRegion * 0.5;

    // Dark dust lanes
    float dustLane = smoothstep(0.4, 0.6, fbm(noiseCoord * 4.0 + 50.0));
    density *= mix(1.0, 0.3, dustLane * bandIntensity);

    // Color gradient - slightly warmer toward galactic center
    vec3 milkyColor = mix(
      vec3(0.6, 0.7, 0.9),   // Outer regions - cooler blue
      vec3(0.9, 0.85, 0.75), // Core - warmer
      coreRegion
    );

    return milkyColor * density * 0.15;
  }

  // Mie scattering
  float miePhase(float cosTheta, float g) {
    float g2 = g * g;
    return (1.0 - g2) / (4.0 * PI * pow(1.0 + g2 - 2.0 * g * cosTheta, 1.5));
  }

  void main() {
    vec3 viewDir = normalize(vWorldPosition - cameraPosition);
    vec3 sunDir = normalize(uSunPosition);

    // Moon is opposite to sun (simplified - real moon has its own orbit)
    vec3 moonDir = -sunDir;
    // Offset moon slightly so it's not exactly opposite
    moonDir = normalize(moonDir + vec3(0.1, 0.15, 0.05));

    // Calculate sun angle from horizon
    float sunAngle = asin(vSunY) * 180.0 / PI;

    // Cosine of angle between view and sun/moon
    float cosThetaSun = dot(viewDir, sunDir);
    float cosThetaMoon = dot(viewDir, moonDir);

    // === SKY COLOR ===
    // Height-based gradient (zenith to horizon)
    float heightFactor = max(0.0, viewDir.y);
    float horizonFactor = 1.0 - heightFactor;

    // Base sky color from uniforms (interpolated by time of day)
    vec3 skyColor = mix(uHorizonColor, uZenithColor, pow(heightFactor, 0.5));

    // === NIGHT SKY ENHANCEMENT ===
    // Detect night time and enhance deep colors
    float nightFactor = smoothstep(5.0, -15.0, sunAngle);
    if (nightFactor > 0.0) {
      // Add deep purple-blue tint at night
      vec3 nightTint = vec3(0.05, 0.02, 0.12); // Deep purple
      vec3 nightZenith = vec3(0.01, 0.01, 0.04); // Nearly black with hint of blue

      // Blend night colors more dramatically toward zenith
      float nightGradient = pow(heightFactor, 0.3);
      vec3 deepNightColor = mix(nightTint, nightZenith, nightGradient);
      skyColor = mix(skyColor, deepNightColor, nightFactor * 0.5);
    }

    // === ATMOSPHERIC SCATTERING (adds realistic depth) ===
    float sunElevation = clamp(vSunY, 0.0, 1.0);

    // Add subtle horizon haze during daytime
    if (sunElevation > 0.2) {
      float hazeStrength = (1.0 - heightFactor) * 0.12 * sunElevation;
      vec3 hazeColor = vec3(0.85, 0.9, 0.95);
      skyColor = mix(skyColor, hazeColor, hazeStrength);
    }

    // Mie scattering (sun glow)
    float miePhaseValue = miePhase(cosThetaSun, uMieDirectionalG);
    vec3 mieColor = vec3(uMieCoefficient) * miePhaseValue * uSunColor * uSunIntensity;
    skyColor += mieColor * 0.8;

    // === SUN DISK ===
    if (uShowSunDisk && vSunY > -0.1) {
      float sunDist = acos(clamp(cosThetaSun, -1.0, 1.0));
      float sunDisk = smoothstep(SUN_ANGULAR_RADIUS * 1.3, SUN_ANGULAR_RADIUS * 0.8, sunDist);
      float sunGlow = smoothstep(SUN_GLOW_RADIUS * 2.0, SUN_GLOW_RADIUS * 0.2, sunDist);
      sunGlow = pow(sunGlow, 2.0) * 0.5;

      vec3 sunDiskColor = mix(uSunColor, vec3(1.0, 1.0, 0.95), 0.8);
      sunDiskColor *= uSunIntensity * 2.0;
      vec3 sunGlowColor = uSunColor * uSunIntensity;

      skyColor = mix(skyColor, sunDiskColor, sunDisk);
      skyColor += sunGlowColor * sunGlow * (1.0 - sunDisk);
    }

    // === MOON ===
    float moonVisibility = smoothstep(-5.0, -15.0, sunAngle); // Moon visible at night
    if (moonVisibility > 0.0 && moonDir.y > -0.1) {
      float moonDist = acos(clamp(cosThetaMoon, -1.0, 1.0));

      // Moon disk
      float moonDisk = smoothstep(MOON_ANGULAR_RADIUS * 1.2, MOON_ANGULAR_RADIUS * 0.7, moonDist);

      // Moon glow (subtle blue-white halo)
      float moonGlow = smoothstep(MOON_GLOW_RADIUS * 3.0, MOON_GLOW_RADIUS * 0.3, moonDist);
      moonGlow = pow(moonGlow, 1.5) * 0.4;

      // Moon surface color - slightly warm gray with subtle variation
      vec2 moonUV = vec2(atan(viewDir.z, viewDir.x), asin(viewDir.y));
      float moonTexture = 0.85 + 0.15 * noise(moonUV * 20.0);
      vec3 moonColor = vec3(0.95, 0.93, 0.88) * moonTexture;

      // Moon glow color - cool blue-white
      vec3 moonGlowColor = vec3(0.7, 0.8, 1.0) * 0.3;

      // Apply moon
      skyColor = mix(skyColor, moonColor, moonDisk * moonVisibility);
      skyColor += moonGlowColor * moonGlow * moonVisibility * (1.0 - moonDisk);
    }

    // === MILKY WAY ===
    if (uShowStars && viewDir.y > 0.0) {
      float milkyWayVisibility = smoothstep(0.0, -20.0, sunAngle);
      if (milkyWayVisibility > 0.01) {
        vec3 milky = milkyWay(viewDir);
        skyColor += milky * milkyWayVisibility * uStarsIntensity;
      }
    }

    // === STARS ===
    if (uShowStars && viewDir.y > 0.0) {
      float starVisibility = smoothstep(5.0, -10.0, sunAngle);
      if (starVisibility > 0.01) {
        vec3 starField = stars(viewDir, uTimeOfDay * 0.1);
        skyColor += starField * starVisibility * uStarsIntensity;
      }
    }

    // === GROUND ===
    if (viewDir.y < 0.0) {
      float groundFactor = smoothstep(0.0, -0.3, viewDir.y);
      skyColor = mix(skyColor, uGroundColor, groundFactor);
    }

    // === HORIZON GLOW ===
    float horizonGlow = 1.0 - abs(viewDir.y);
    horizonGlow = pow(horizonGlow, 3.0);
    float sunsetFactor = smoothstep(20.0, 0.0, abs(sunAngle));
    sunsetFactor *= smoothstep(-5.0, 5.0, sunAngle);
    vec3 horizonGlowColor = uSunColor * horizonGlow * sunsetFactor * 0.3;
    skyColor += horizonGlowColor;

    // === NIGHT HORIZON GLOW ===
    // Subtle atmospheric glow at horizon during night
    if (nightFactor > 0.0) {
      float nightHorizonGlow = pow(horizonFactor, 4.0) * 0.08;
      vec3 nightGlowColor = vec3(0.15, 0.1, 0.25); // Subtle purple glow
      skyColor += nightGlowColor * nightHorizonGlow * nightFactor;
    }

    // === FINAL OUTPUT ===
    skyColor = max(skyColor, vec3(0.0));
    skyColor = skyColor / (skyColor + vec3(1.0));
    skyColor = pow(skyColor, vec3(1.0 / 2.2));

    gl_FragColor = vec4(skyColor, 1.0);
  }
`;

export interface EnhancedSkyProps {
  /** Show visible sun disk */
  showSunDisk?: boolean;
  /** Show procedural stars at night */
  showStars?: boolean;
  /** Stars brightness multiplier */
  starsIntensity?: number;
  /** Atmospheric turbidity (haziness) */
  turbidity?: number;
  /** Rayleigh scattering coefficient */
  rayleigh?: number;
  /** Mie scattering coefficient */
  mieCoefficient?: number;
  /** Mie scattering directionality */
  mieDirectionalG?: number;
  /** Override sun position (if not using day/night cycle) */
  sunPosition?: THREE.Vector3;
  /** Override sun color */
  sunColor?: THREE.Color;
  /** Override sun intensity */
  sunIntensity?: number;
  /** Dome radius (must be less than camera far plane, default 500) */
  radius?: number;
}

export function EnhancedSky({
  showSunDisk = true,
  showStars = true,
  starsIntensity = 1.0,
  turbidity = 10,
  rayleigh = 2,
  mieCoefficient = 0.005,
  mieDirectionalG = 0.8,
  sunPosition,
  sunColor,
  sunIntensity,
  radius = 500, // Must be < camera far plane (800 in PlayPage)
}: EnhancedSkyProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  // Memoize initial uniforms to prevent recreation on every render
  // This is critical - if uniforms object changes, R3F will reset the material
  const uniforms = useMemo(() => ({
    uSunPosition: { value: new THREE.Vector3(0, 100, 0) },
    uSunColor: { value: new THREE.Color('#ffffff') },
    uSunIntensity: { value: 1.0 },
    uTimeOfDay: { value: 10 },
    uTurbidity: { value: turbidity },
    uRayleigh: { value: rayleigh },
    uMieCoefficient: { value: mieCoefficient },
    uMieDirectionalG: { value: mieDirectionalG },
    uShowSunDisk: { value: showSunDisk },
    uShowStars: { value: showStars },
    uStarsIntensity: { value: starsIntensity },
    uHorizonColor: { value: new THREE.Color('#87CEEB') },
    uZenithColor: { value: new THREE.Color('#1e90ff') },
    uGroundColor: { value: new THREE.Color('#3d7a37') },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []); // Empty deps - uniforms are updated in useFrame

  // Update uniforms each frame
  useFrame(() => {
    if (!materialRef.current) return;
    const uniforms = materialRef.current.uniforms;

    // Get fresh currentHour from store (not stale closure)
    const currentHour = useDayNightCycleStore.getState().currentHour;

    // Get interpolated config from day/night cycle
    const timeConfig = getInterpolatedTimeConfig(currentHour);

    // Calculate sun position from time config
    const calculatedSunPos = calculateSunPosition(
      timeConfig.sunAngle,
      timeConfig.sunAzimuth,
      100
    );

    // Use provided values or calculated ones
    const finalSunPos = sunPosition || calculatedSunPos;
    const finalSunColor = sunColor || new THREE.Color(timeConfig.sunColor);
    const finalSunIntensity = sunIntensity ?? timeConfig.sunIntensity;

    // Update uniforms
    uniforms.uSunPosition.value.copy(finalSunPos);
    uniforms.uSunColor.value.copy(finalSunColor);
    uniforms.uSunIntensity.value = finalSunIntensity;
    uniforms.uTimeOfDay.value = currentHour;

    // Update sky colors from time config (SimonDev-style separate horizon/zenith colors)
    uniforms.uHorizonColor.value.set(timeConfig.skyColor);
    uniforms.uZenithColor.value.set(timeConfig.zenithColor);
    uniforms.uGroundColor.value.set(timeConfig.groundColor);

    // Update scattering parameters
    uniforms.uTurbidity.value = turbidity;
    uniforms.uRayleigh.value = rayleigh;
    uniforms.uMieCoefficient.value = mieCoefficient;
    uniforms.uMieDirectionalG.value = mieDirectionalG;
    uniforms.uShowSunDisk.value = showSunDisk;
    uniforms.uShowStars.value = showStars;
    uniforms.uStarsIntensity.value = starsIntensity;
  });

  return (
    <mesh
      ref={meshRef}
      frustumCulled={false}
      renderOrder={-1000}
    >
      <sphereGeometry args={[radius, 64, 32]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={skyVertexShader}
        fragmentShader={skyFragmentShader}
        side={THREE.BackSide}
        depthWrite={false}
        depthTest={false}
        uniforms={uniforms}
      />
    </mesh>
  );
}

export default EnhancedSky;
