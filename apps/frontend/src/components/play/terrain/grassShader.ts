/**
 * Grass Shader System - EXACT SimonDev Quick_Grass Port
 *
 * Key differences from previous implementation:
 * - Uses 'position' attribute (x, z, 0) for local offsets within patch
 * - Uses THREE.js PHONG lighting system with #includes
 * - Heightmap-based OR procedural terrain height sampling
 * - Proper integration with Three.js materials
 */

import * as THREE from 'three';

// Helper functions for shader (SimonDev's common.glsl)
// NOTE: PI and saturate are already defined by Three.js #include <common>
const SHADER_COMMON = /* glsl */ `
  float linearstep(float minValue, float maxValue, float v) {
    return clamp((v - minValue) / (maxValue - minValue), 0.0, 1.0);
  }

  float remap(float v, float inMin, float inMax, float outMin, float outMax) {
    float t = (v - inMin) / (inMax - inMin);
    return mix(outMin, outMax, t);
  }

  float easeOut(float x, float t) {
    return 1.0 - pow(1.0 - x, t);
  }

  float easeIn(float x, float t) {
    return pow(x, t);
  }

  mat3 rotateX(float theta) {
    float c = cos(theta);
    float s = sin(theta);
    return mat3(
      vec3(1, 0, 0),
      vec3(0, c, -s),
      vec3(0, s, c)
    );
  }

  mat3 rotateY(float theta) {
    float c = cos(theta);
    float s = sin(theta);
    return mat3(
      vec3(c, 0, s),
      vec3(0, 1, 0),
      vec3(-s, 0, c)
    );
  }

  mat3 rotateAxis(vec3 axis, float angle) {
    axis = normalize(axis);
    float s = sin(angle);
    float c = cos(angle);
    float oc = 1.0 - c;
    return mat3(
      oc * axis.x * axis.x + c,           oc * axis.x * axis.y - axis.z * s,  oc * axis.z * axis.x + axis.y * s,
      oc * axis.x * axis.y + axis.z * s,  oc * axis.y * axis.y + c,           oc * axis.y * axis.z - axis.x * s,
      oc * axis.z * axis.x - axis.y * s,  oc * axis.y * axis.z + axis.x * s,  oc * axis.z * axis.z + c
    );
  }

  // Hash functions (SimonDev's noise.glsl)
  vec2 hash22(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.xx + p3.yz) * p3.zy);
  }

  vec4 hash42(vec2 p) {
    vec4 p4 = fract(vec4(p.xyxy) * vec4(0.1031, 0.1030, 0.0973, 0.1099));
    p4 += dot(p4, p4.wzxy + 33.33);
    return fract((p4.xxyz + p4.yzzw) * p4.zywx);
  }

  float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }

  float noise12(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);

    float a = hash12(i + vec2(0.0, 0.0));
    float b = hash12(i + vec2(1.0, 0.0));
    float c = hash12(i + vec2(0.0, 1.0));
    float d = hash12(i + vec2(1.0, 1.0));

    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y) * 2.0 - 1.0;
  }
`;

// Vertex Shader - EXACT SimonDev port with Three.js PHONG integration
export const grassVertexShader = /* glsl */ `
  #define PHONG

  varying vec3 vViewPosition;

  #include <common>
  #include <uv_pars_vertex>
  #include <color_pars_vertex>
  #include <fog_pars_vertex>
  #include <normal_pars_vertex>
  #include <shadowmap_pars_vertex>
  #include <logdepthbuf_pars_vertex>
  #include <clipping_planes_pars_vertex>

  // SimonDev varyings
  varying vec3 vWorldNormal;
  varying vec3 vGrassColour;
  varying vec4 vGrassParams;
  varying vec3 vNormal2;
  varying vec3 vWorldPosition;
  varying float vFogDepth; // Distance to camera for custom fog

  // SimonDev uniforms
  uniform vec2 grassSize;
  uniform vec4 grassParams;
  uniform vec4 grassDraw;
  uniform float time;
  uniform vec3 playerPos;
  uniform mat4 viewMatrixInverse;
  uniform float terrainHeight;  // Pass terrain height at patch center
  uniform float fadeIn;         // 0-1 fade for smooth grass appearance

  // vertIndex attribute (SimonDev style)
  attribute float vertIndex;

  ${SHADER_COMMON}

  void main() {
    #include <uv_vertex>
    #include <color_vertex>
    #include <beginnormal_vertex>
    #include <begin_vertex>

    // Position attribute layout (with biome filtering):
    // position.x = local X offset within patch
    // position.y = local Z offset within patch (stored in y for Float16)
    // position.z = per-blade terrain height (sampled during placement)
    vec3 grassOffset = vec3(position.x, 0.0, position.y);
    float bladeTerrainHeight = position.z;  // Per-blade height from instance data

    // Blade world position
    vec3 grassBladeWorldPos = (modelMatrix * vec4(grassOffset, 1.0)).xyz;

    // Use per-blade terrain height for accurate terrain following
    grassBladeWorldPos.y = bladeTerrainHeight;

    vec4 hashVal1 = hash42(vec2(grassBladeWorldPos.x, grassBladeWorldPos.z));

    float highLODOut = smoothstep(grassDraw.x * 0.5, grassDraw.x, distance(cameraPosition, grassBladeWorldPos));
    float lodFadeIn = smoothstep(grassDraw.x, grassDraw.y, distance(cameraPosition, grassBladeWorldPos));

    // Per-blade random properties (SimonDev exact)
    float randomAngle = hashVal1.x * 2.0 * PI;
    float randomShade = remap(hashVal1.y, 0.0, 1.0, 0.5, 1.0);
    float randomHeight = remap(hashVal1.z, 0.0, 1.0, 0.75, 1.5) * mix(1.0, 0.0, lodFadeIn);
    float randomLean = remap(hashVal1.w, 0.0, 1.0, 0.1, 0.4);

    vec2 hashGrassColour = hash22(vec2(grassBladeWorldPos.x, grassBladeWorldPos.z));
    float leanAnimation = noise12(vec2(time * 0.35) + grassBladeWorldPos.xz * 137.423) * 0.1;

    float GRASS_SEGMENTS = grassParams.x;
    float GRASS_VERTICES = grassParams.y;

    // Figure out vertex id, > GRASS_VERTICES is back side (SimonDev exact)
    float vertID = mod(float(vertIndex), GRASS_VERTICES);

    // 1 = front, -1 = back
    float zSide = -(floor(vertIndex / GRASS_VERTICES) * 2.0 - 1.0);

    // 0 = left, 1 = right
    float xSide = mod(vertID, 2.0);

    float heightPercent = (vertID - xSide) / (GRASS_SEGMENTS * 2.0);

    float grassTotalHeight = grassSize.y * randomHeight * fadeIn;
    float grassTotalWidthHigh = easeOut(1.0 - heightPercent, 2.0);
    float grassTotalWidthLow = 1.0 - heightPercent;
    float grassTotalWidth = grassSize.x * mix(grassTotalWidthHigh, grassTotalWidthLow, highLODOut);

    // Shift verts (SimonDev exact)
    float x = (xSide - 0.5) * grassTotalWidth;
    float y = heightPercent * grassTotalHeight;

    // Wind (SimonDev exact)
    float windDir = noise12(grassBladeWorldPos.xz * 0.05 + 0.05 * time);
    float windNoiseSample = noise12(grassBladeWorldPos.xz * 0.25 + time * 1.0);
    float windLeanAngle = remap(windNoiseSample, -1.0, 1.0, 0.25, 1.0);
    windLeanAngle = easeIn(windLeanAngle, 2.0) * 1.25;
    vec3 windAxis = vec3(cos(windDir), 0.0, sin(windDir));

    windLeanAngle *= heightPercent;

    // Player displacement (enhanced for visibility)
    float distToPlayer = distance(grassBladeWorldPos.xz, playerPos.xz);
    float playerFalloff = smoothstep(3.5, 0.3, distToPlayer);  // Larger radius: 3.5m outer, 0.3m full
    float playerLeanAngle = mix(0.0, 0.8, playerFalloff * linearstep(0.8, 0.0, windLeanAngle));  // Stronger: 0.8 rad (~46°)
    vec3 grassToPlayer = normalize(vec3(playerPos.x, 0.0, playerPos.z) - vec3(grassBladeWorldPos.x, 0.0, grassBladeWorldPos.z));
    vec3 playerLeanAxis = vec3(grassToPlayer.z, 0, -grassToPlayer.x);

    randomLean += leanAnimation;

    float easedHeight = mix(easeIn(heightPercent, 2.0), 1.0, highLODOut);
    float curveAmount = -randomLean * easedHeight;

    // Normal calculation (SimonDev exact)
    float ncurve1 = -randomLean * easedHeight;
    vec3 n1 = vec3(0.0, (heightPercent + 0.01), 0.0);
    n1 = rotateX(ncurve1) * n1;

    float ncurve2 = -randomLean * easedHeight * 0.9;
    vec3 n2 = vec3(0.0, (heightPercent + 0.01) * 0.9, 0.0);
    n2 = rotateX(ncurve2) * n2;

    vec3 ncurve = normalize(n1 - n2);

    mat3 grassMat = rotateAxis(playerLeanAxis, playerLeanAngle) * rotateAxis(windAxis, windLeanAngle) * rotateY(randomAngle);

    vec3 grassFaceNormal = vec3(0.0, 0.0, 1.0);
    grassFaceNormal = grassMat * grassFaceNormal;
    grassFaceNormal *= zSide;

    vec3 grassVertexNormal = vec3(0.0, -ncurve.z, ncurve.y);
    vec3 grassVertexNormal1 = rotateY(PI * 0.3 * zSide) * grassVertexNormal;
    vec3 grassVertexNormal2 = rotateY(PI * -0.3 * zSide) * grassVertexNormal;

    grassVertexNormal1 = grassMat * grassVertexNormal1;
    grassVertexNormal1 *= zSide;

    grassVertexNormal2 = grassMat * grassVertexNormal2;
    grassVertexNormal2 *= zSide;

    vec3 grassVertexPosition = vec3(x, y, 0.0);
    grassVertexPosition = rotateX(curveAmount) * grassVertexPosition;
    grassVertexPosition = grassMat * grassVertexPosition;

    grassVertexPosition += grassOffset;

    // Colors (adjusted to blend with terrain grass texture)
    // Base colors match terrain grass (#1a4d1a = 0.10, 0.30, 0.10)
    vec3 b1 = vec3(0.08, 0.22, 0.06);   // Dark green base - matches terrain
    vec3 b2 = vec3(0.12, 0.28, 0.08);   // Slightly lighter variation
    vec3 t1 = vec3(0.48, 0.70, 0.28);   // Yellow-green tip
    vec3 t2 = vec3(0.60, 0.80, 0.35);   // Light tip variation

    vec3 baseColour = mix(b1, b2, hashGrassColour.x);
    vec3 tipColour = mix(t1, t2, hashGrassColour.y);
    // Steeper gradient (power 3.0) keeps base color longer for better terrain blend
    vec3 highLODColour = mix(baseColour, tipColour, easeIn(heightPercent, 3.0)) * randomShade;
    vec3 lowLODColour = mix(b1, t1, easeIn(heightPercent, 2.0));
    vGrassColour = mix(highLODColour, lowLODColour, highLODOut);
    vGrassParams = vec4(heightPercent, grassBladeWorldPos.y, highLODOut, xSide);

    const float SKY_RATIO = 0.25;
    vec3 UP = vec3(0.0, 1.0, 0.0);
    float skyFadeIn = (1.0 - highLODOut) * SKY_RATIO;
    vec3 normal1 = normalize(mix(UP, grassVertexNormal1, skyFadeIn));
    vec3 normal2 = normalize(mix(UP, grassVertexNormal2, skyFadeIn));

    transformed = grassVertexPosition;
    transformed.y += grassBladeWorldPos.y;

    // View-space thickening (SimonDev exact)
    vec3 viewDir = normalize(cameraPosition - grassBladeWorldPos);
    vec3 viewDirXZ = normalize(vec3(viewDir.x, 0.0, viewDir.z));
    vec3 grassFaceNormalXZ = normalize(vec3(grassFaceNormal.x, 0.0, grassFaceNormal.z));

    float viewDotNormal = saturate(dot(grassFaceNormal, viewDirXZ));
    float viewSpaceThickenFactor = easeOut(1.0 - viewDotNormal, 4.0) * smoothstep(0.0, 0.2, viewDotNormal);

    objectNormal = grassVertexNormal1;

    #include <defaultnormal_vertex>
    #include <normal_vertex>

    vNormal = normalize(normalMatrix * normal1);
    vNormal2 = normalize(normalMatrix * normal2);

    // Project with view-space thickening (SimonDev exact)
    vec4 mvPosition = vec4(transformed, 1.0);
    #ifdef USE_INSTANCING
      mvPosition = instanceMatrix * mvPosition;
    #endif
    mvPosition = modelViewMatrix * mvPosition;

    // HACK (SimonDev's comment)
    mvPosition.x += viewSpaceThickenFactor * (xSide - 0.5) * grassTotalWidth * 0.5 * zSide;

    gl_Position = projectionMatrix * mvPosition;

    #include <logdepthbuf_vertex>
    #include <clipping_planes_vertex>
    vViewPosition = -mvPosition.xyz;

    // Compute world position manually (worldpos_vertex only works with USE_ENVMAP)
    // Define worldPosition as vec4 for shadow mapping (Three.js expects this)
    vec4 worldPosition = modelMatrix * vec4(transformed, 1.0);
    vWorldPosition = worldPosition.xyz;

    #include <shadowmap_vertex>
    #include <fog_vertex>

    // Custom fog depth calculation (distance to camera)
    vFogDepth = length(mvPosition.xyz);
  }
`;

// Fragment Shader - SimonDev exact with custom lighting (Blinn-Phong)
export const grassFragmentShader = /* glsl */ `
  #define PHONG

  uniform vec3 diffuse;
  uniform vec3 emissive;
  uniform vec3 specular;
  uniform float shininess;
  uniform float opacity;

  #include <common>
  #include <packing>
  #include <dithering_pars_fragment>
  #include <color_pars_fragment>
  #include <uv_pars_fragment>
  #include <map_pars_fragment>
  #include <alphamap_pars_fragment>
  #include <alphatest_pars_fragment>
  #include <aomap_pars_fragment>
  #include <lightmap_pars_fragment>
  #include <emissivemap_pars_fragment>
  #include <envmap_common_pars_fragment>
  #include <envmap_pars_fragment>
  #include <fog_pars_fragment>
  #include <bsdfs>
  #include <lights_pars_begin>
  #include <normal_pars_fragment>
  #include <shadowmap_pars_fragment>
  #include <logdepthbuf_pars_fragment>
  #include <clipping_planes_pars_fragment>

  uniform float time;
  uniform float fadeIn;  // 0-1 fade for smooth grass appearance

  // Custom fog uniforms (ShaderX2 fog types)
  uniform bool fogEnabled;
  uniform int fogType;        // 0=None, 1=Linear, 2=Exponential, 3=ExpSquared
  uniform vec3 fogColor;
  uniform float fogNear;
  uniform float fogFar;
  uniform float fogDensity;
  uniform bool fogHeightEnabled;
  uniform float fogBaseHeight;
  uniform float fogHeightFalloff;
  uniform float fogMinDensity;

  varying vec3 vGrassColour;
  varying vec4 vGrassParams;
  varying vec3 vNormal2;
  varying vec3 vWorldPosition;
  varying float vFogDepth;

  ${SHADER_COMMON}

  // Custom Blinn-Phong for grass (SimonDev style)
  struct BlinnPhongMaterial {
    vec3 diffuseColor;
    vec3 specularColor;
    float specularShininess;
    float specularStrength;
  };

  void RE_Direct_BlinnPhong(const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight) {
    // Wrapped diffuse (SimonDev exact)
    float wrap = 0.5;
    float dotNL = saturate((dot(geometryNormal, directLight.direction) + wrap) / (1.0 + wrap));
    vec3 irradiance = dotNL * directLight.color;
    reflectedLight.directDiffuse += irradiance * BRDF_Lambert(material.diffuseColor);
    reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong(directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess) * material.specularStrength;

    // Backscatter fakery (SimonDev exact)
    float backLight = saturate((dot(geometryViewDir, -directLight.direction) + wrap) / (1.0 + wrap));
    float falloff = 0.5;
    vec3 scatter = directLight.color * pow(backLight, 1.0) * falloff * BRDF_Lambert(material.diffuseColor);

    reflectedLight.indirectDiffuse += scatter * (1.0 - vGrassParams.z);
  }

  void RE_IndirectDiffuse_BlinnPhong(const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight) {
    reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert(material.diffuseColor);
  }

  void main() {
    // NOTE: fadeIn discard removed - we now show grass instantly when ready
    // The early exit in useFrame prevents any rendering before mesh is created

    vec3 viewDir = normalize(cameraPosition - vWorldPosition);

    #include <clipping_planes_fragment>

    vec4 diffuseColor = vec4(diffuse, opacity);

    // Grass params
    float heightPercent = vGrassParams.x;
    float height = vGrassParams.y;
    float lodFadeIn = vGrassParams.z;
    float lodFadeOut = 1.0 - lodFadeIn;

    // Grass middle (SimonDev exact)
    float grassMiddle = mix(
      smoothstep(abs(vGrassParams.w - 0.5), 0.0, 0.1), 1.0, lodFadeIn);

    // AO (SimonDev exact)
    float ao = mix(0.25, 1.0, easeIn(heightPercent, 2.0));

    diffuseColor.rgb *= vGrassColour;
    diffuseColor.rgb *= mix(0.85, 1.0, grassMiddle);
    diffuseColor.rgb *= ao;

    ReflectedLight reflectedLight = ReflectedLight(vec3(0.0), vec3(0.0), vec3(0.0), vec3(0.0));
    vec3 totalEmissiveRadiance = emissive;

    #include <logdepthbuf_fragment>
    #include <map_fragment>
    #include <color_fragment>
    #include <alphamap_fragment>
    #include <alphatest_fragment>
    #include <normal_fragment_begin>

    // Interpolate between two normals based on xSide (SimonDev exact)
    vec3 normal2 = normalize(vNormal2);
    normal = normalize(mix(vNormal, normal2, vGrassParams.w));

    #include <emissivemap_fragment>

    BlinnPhongMaterial material;
    material.diffuseColor = diffuseColor.rgb;
    material.specularColor = specular;
    material.specularShininess = shininess;
    material.specularStrength = 0.0;

    // Manual light loop using our custom RE functions
    #if NUM_DIR_LIGHTS > 0
      DirectionalLight directionalLight;
      for (int i = 0; i < NUM_DIR_LIGHTS; i++) {
        directionalLight = directionalLights[i];
        IncidentLight directLight;
        directLight.color = directionalLight.color;
        directLight.direction = directionalLight.direction;
        directLight.visible = true;
        RE_Direct_BlinnPhong(directLight, vWorldPosition, normal, viewDir, material, reflectedLight);
      }
    #endif

    // Indirect/ambient
    vec3 irradiance = ambientLightColor;
    RE_IndirectDiffuse_BlinnPhong(irradiance, vWorldPosition, normal, viewDir, material, reflectedLight);

    vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;

    #include <envmap_fragment>

    vec3 finalColor = outgoingLight;

    // Custom fog calculation (ShaderX2 types: Linear, Exponential, Exp Squared)
    if (fogEnabled && fogType > 0) {
      float dist = vFogDepth;
      float factor = 1.0;

      if (fogType == 1) {
        // Linear fog: (far - distance) / (far - near)
        float fogRange = fogFar - fogNear;
        float fogDelta = fogFar - dist;
        factor = clamp(fogDelta / fogRange, 0.0, 1.0);
      } else if (fogType == 2) {
        // Exponential fog: e^(-distance * density)
        float normalizedDist = dist / fogFar;
        float exponent = normalizedDist * 4.0 * (fogDensity * 100.0);
        factor = exp(-exponent);
      } else {
        // Exponential squared fog (type 3): e^(-(distance * density)^2)
        float normalizedDist = dist / fogFar;
        float exponent = normalizedDist * 3.5 * (fogDensity * 100.0);
        factor = exp(-(exponent * exponent));
      }

      // Height-based fog modification (fog thins with altitude)
      if (fogHeightEnabled) {
        float heightAboveBase = max(0.0, vWorldPosition.y - fogBaseHeight);
        float heightMult = exp(-heightAboveBase * fogHeightFalloff);
        heightMult = max(heightMult, fogMinDensity);
        factor = mix(1.0, factor, heightMult);
      }

      // Apply fog: mix(fogColor, objectColor, factor) where factor=1 means no fog
      finalColor = mix(fogColor, finalColor, factor);
    }

    gl_FragColor = vec4(finalColor, diffuseColor.a * fadeIn);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <premultiplied_alpha_fragment>
    #include <dithering_fragment>
  }
`;

/**
 * Create grass uniforms matching SimonDev's material
 */
export function createGrassUniforms(): Record<string, { value: unknown }> {
  return {
    // PHONG material uniforms
    diffuse: { value: new THREE.Color(0xffffff) },
    emissive: { value: new THREE.Color(0x000000) },
    specular: { value: new THREE.Color(0x111111) },
    shininess: { value: 30 },
    opacity: { value: 1.0 },

    // Grass-specific uniforms (SimonDev exact)
    grassSize: { value: new THREE.Vector2(0.1, 1.5) },  // GRASS_WIDTH, GRASS_HEIGHT
    grassParams: { value: new THREE.Vector4(4, 10, 100, 0) },  // segments (4), vertices (10), terrainHeight, offset
    grassDraw: { value: new THREE.Vector4(15, 100, 0, 0) },  // LOD_DIST, MAX_DIST
    time: { value: 0 },
    playerPos: { value: new THREE.Vector3() },
    viewMatrixInverse: { value: new THREE.Matrix4() },
    terrainHeight: { value: 0 },  // Terrain height at patch center
    fadeIn: { value: 1.0 },       // Fade-in animation (0 = invisible, 1 = fully visible)

    // Custom fog uniforms (ShaderX2 fog types)
    fogEnabled: { value: true },
    fogType: { value: 3 },  // 0=None, 1=Linear, 2=Exponential, 3=ExpSquared
    fogColor: { value: new THREE.Color(0.7, 0.77, 0.85) },
    fogNear: { value: 100 },
    fogFar: { value: 400 },
    fogDensity: { value: 0.008 },
    fogHeightEnabled: { value: false },
    fogBaseHeight: { value: 0 },
    fogHeightFalloff: { value: 0.02 },
    fogMinDensity: { value: 0.3 },
  };
}

// PERF: Cached shader program - pre-compiled to avoid frame stutter on first grass render
// Shader compilation happens the first time a material is used in a render pass.
// By creating and caching a template material, we ensure the shader is compiled once
// and reused for all grass instances (only uniforms differ).
let cachedGrassMaterial: THREE.ShaderMaterial | null = null;

/**
 * Get a cached grass shader material.
 * PERF: Returns a cached material with the shader already compiled.
 * Each GrassManager instance should clone() this and set its own uniforms.
 */
export function getCachedGrassMaterial(): THREE.ShaderMaterial {
  if (!cachedGrassMaterial) {
    cachedGrassMaterial = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([
        THREE.UniformsLib.lights,
        THREE.UniformsLib.fog,
        createGrassUniforms(),
      ]),
      vertexShader: grassVertexShader,
      fragmentShader: grassFragmentShader,
      lights: true,
      fog: false,  // We use custom fog
      side: THREE.DoubleSide,
      transparent: true,
    });
    console.log('🌾 Grass shader material cached');
  }
  return cachedGrassMaterial;
}

/**
 * Pre-compile the grass shader by forcing WebGL to compile it.
 * Call this during loading phase with a valid WebGL renderer.
 * @param renderer - Three.js WebGLRenderer instance
 */
export function precompileGrassShader(renderer: THREE.WebGLRenderer): void {
  const material = getCachedGrassMaterial();
  // Force shader compilation by calling compile() on the material
  // This requires a dummy geometry and camera
  const dummyGeo = new THREE.PlaneGeometry(1, 1);
  const dummyMesh = new THREE.Mesh(dummyGeo, material);
  const dummyScene = new THREE.Scene();
  dummyScene.add(dummyMesh);
  const dummyCamera = new THREE.PerspectiveCamera();

  // compile() forces shader compilation without rendering
  renderer.compile(dummyScene, dummyCamera);

  // Cleanup
  dummyGeo.dispose();
  dummyScene.remove(dummyMesh);
  console.log('🌾 Grass shader pre-compiled');
}

export default {
  vertexShader: grassVertexShader,
  fragmentShader: grassFragmentShader,
  createUniforms: createGrassUniforms,
  getCachedMaterial: getCachedGrassMaterial,
  precompile: precompileGrassShader,
};
