import { useRef, useState, Suspense, useEffect, useCallback, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import {
  Stars,
  Sky,
  Environment,
} from '@react-three/drei';
import { Physics } from '@react-three/rapier';
import * as THREE from 'three';

// Import asset path helpers
import { getSkyboxPath, getModelPath } from '../../config/assetPaths';

/**
 * ShaderPrewarmer - Pre-compiles all shaders in the scene to eliminate frame spikes
 *
 * Three.js compiles shaders on first use, causing frame drops.
 * This component forces compilation during load instead of during gameplay.
 *
 * Reference: https://threejs.org/docs/#api/en/renderers/WebGLRenderer.compile
 */
function ShaderPrewarmer() {
  const { gl, scene, camera } = useThree();
  const hasCompiled = useRef(false);

  useEffect(() => {
    if (hasCompiled.current) return;
    hasCompiled.current = true;

    // Small delay to ensure all materials are loaded (including weapon warmup meshes)
    const timer = setTimeout(() => {
      try {
        gl.compile(scene, camera);
        if (DEBUG_WORLD) console.log('🔧 Scene shaders pre-compiled successfully');
      } catch (error) {
        console.warn('Shader pre-compilation failed:', error);
      }
    }, 200); // Increased delay to ensure weapon warmup meshes are in scene

    return () => clearTimeout(timer);
  }, [gl, scene, camera]);

  return null;
}
import { usePlayMultiplayer } from './hooks/usePlayMultiplayer';
import { OtherPlayers } from './multiplayer/OtherPlayers';
import { PhysicsPlayerController, type AnimationState } from './PhysicsPlayerController';
import { type WeaponType } from './WeaponAttachment';
import { useCombatStore } from './combat/useCombatStore';
import { useFlashlightStore } from '../../stores/useFlashlightStore';
import { useCombatSounds } from './audio';
import { AmbientAudioManager } from './audio/AmbientAudioManager';
import { useWorldControls } from '../../lib/config';
import { useGameSettings } from '../../store/gameSettings.store';

// Import extracted avatar components
import { PlaceholderAvatar, DefaultAvatar } from './avatars';

import { RigidBody, CuboidCollider } from '@react-three/rapier';
import { StaticTerrain, TerrainPhysics } from './terrain';
import { GameLighting, type ShadowQuality, type TimeOfDay, type LightingState } from './lighting/GameLighting';
import { EnhancedSky } from './lighting/EnhancedSky';
import { WATER_LEVEL, heightmapGenerator, terrainGenerator } from '../../lib/terrain';
import { Water } from './world/Water';
import { VisibilityUpdater } from './visibility';
import { WorldBoundary } from './world/WorldBoundary';
import { Campfire } from './world/Campfire';
import { Yacht } from './world/Yacht';
import { PlacementController } from './world/PlacementController';
import { PlacedObjectsManager } from './world/PlacedObjectsManager';
import { NPCManager, createNPC } from './npc';
import { useNPCStore } from './npc/useNPCStore';
import { GamePauseProvider } from './context';

// Debug logging - set to false to reduce console spam
const DEBUG_WORLD = false;


// HDRI Skybox component - loads equirectangular images (.hdr, .exr, .jpg, .png)
// Download free HDRIs from: polyhaven.com/hdris/skies or ambientcg.com
// Use JPG for best performance (~1-3MB vs 70-100MB for EXR/HDR)
function HDRISkybox({
  file,
  intensity = 1.0,
  blur = 0,
  backgroundIntensity = 1.0,
}: {
  file: string;
  intensity?: number;
  blur?: number;
  backgroundIntensity?: number;
}) {
  const { gl } = useThree();

  // Apply proper tone mapping for HDR content
  useEffect(() => {
    // Store previous settings for cleanup
    const prevToneMapping = gl.toneMapping;
    const prevExposure = gl.toneMappingExposure;

    // Use ACES Filmic tone mapping for better HDR handling
    // This provides better contrast and color saturation than default
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = intensity;

    if (DEBUG_WORLD) {
      console.log(`🌤️ HDRI Skybox: ${file}, intensity=${intensity}, bgIntensity=${backgroundIntensity}, blur=${blur}`);
    }

    // Cleanup: restore previous tone mapping settings
    return () => {
      gl.toneMapping = prevToneMapping;
      gl.toneMappingExposure = prevExposure;
    };
  }, [intensity, gl, file, blur, backgroundIntensity]);

  // Use drei's Environment component - handles HDR/EXR/JPG automatically
  // Sets both scene.background and scene.environment for reflections
  // backgroundIntensity controls skybox brightness separately from environment reflections
  return (
    <Environment
      files={getSkyboxPath(file)}
      background
      backgroundBlurriness={blur}
      backgroundIntensity={backgroundIntensity}
      environmentIntensity={intensity}
    />
  );
}


// Player info for console display
export interface PlayerInfo {
  id: string;
  username: string;
  color: string;
}

// Import preloaded terrain type
import type { PreloadedTerrain } from './hooks/useTerrainPreloader';

// Main world component
export function PlayWorld({
  isPaused = false,
  onPlayerPositionChange,
  onPlayerRotationChange,
  onTerrainSettingsChange,
  onMultiplayerReady,
  onPlayersChange,
  preloadedTerrain,
  onGrassGenerationProgress,
}: {
  isPaused?: boolean;
  onPlayerPositionChange?: (pos: THREE.Vector3) => void;
  onPlayerRotationChange?: (rotationY: number) => void;
  onTerrainSettingsChange?: (settings: { seed: number; terrainRadius: number }) => void;
  onMultiplayerReady?: (data: { playerCount: number; isConnected: boolean }) => void;
  onPlayersChange?: (players: PlayerInfo[]) => void;
  preloadedTerrain?: PreloadedTerrain | null;
  /** Called with grass generation progress (0-100) during loading */
  onGrassGenerationProgress?: (percent: number) => void;
}) {
  const [playerPos, setPlayerPos] = useState(new THREE.Vector3(0, 0, 5));
  const playerRotation = useRef(new THREE.Euler());
  const [physicsDebug, setPhysicsDebug] = useState(false);

  // Weapon state from combat store (controlled by hotbar selection)
  const currentWeapon = useCombatStore((s) => s.currentWeapon);
  const weaponType: WeaponType = currentWeapon === 'none' ? null : currentWeapon;

  // Flashlight state for terrain shader spotlight illumination
  const isFlashlightOn = useFlashlightStore((s) => s.isOn);
  const flashlightPosition = useFlashlightStore((s) => s.worldPosition);
  const flashlightDirection = useFlashlightStore((s) => s.worldDirection);

  // Lighting state for terrain/grass shader sync
  const lightingStateRef = useRef<LightingState | null>(null);
  const [, setLightingUpdate] = useState(0); // Force re-render when lighting changes

  // Callback to receive lighting updates from GameLighting
  const handleLightingUpdate = useCallback((state: LightingState) => {
    lightingStateRef.current = state;
    // Trigger re-render to update terrain material uniforms
    setLightingUpdate(n => n + 1);
  }, []);

  // Initialize combat sounds (plays weapon SFX on fire/reload)
  useCombatSounds({ enabled: true, volume: 1.0 });

  // Test NPC - bandit model spawns in a valid grass biome near player
  // Uses terrainGenerator for consistent terrain/biome lookups
  const testNPCs = useMemo(() => {
    // Find a valid grass biome position for NPC spawn (spiral search from player spawn)
    const findGrassBiomePosition = () => {
      const centerX = 0;
      const centerZ = 8; // Start searching near player spawn
      const maxRadius = 50;
      const step = 5;

      // Grass-like biomes that are safe for NPC spawning
      const validBiomes = new Set([
        'grassland', 'meadow', 'temperate_forest', 'savanna', 'scrubland', 'alpine_meadow'
      ]);

      // Spiral search for valid spawn point
      for (let radius = 0; radius <= maxRadius; radius += step) {
        const numPoints = Math.max(1, Math.floor(radius * 2 * Math.PI / step));
        for (let i = 0; i < numPoints; i++) {
          const angle = (i / numPoints) * Math.PI * 2;
          const x = centerX + Math.cos(angle) * radius;
          const z = centerZ + Math.sin(angle) * radius;
          const height = terrainGenerator.getHeight(x, z);
          const biome = terrainGenerator.getBiome(x, z);

          // Valid spawn: above water, in grass biome
          if (height > 1 && validBiomes.has(biome)) {
            return { x, y: height, z };
          }
        }
      }

      // Fallback: use center position
      const fallbackHeight = terrainGenerator.getHeight(centerX, centerZ);
      return { x: centerX, y: fallbackHeight, z: centerZ };
    };

    const spawnPos = findGrassBiomePosition();
    const biomeAtSpawn = terrainGenerator.getBiome(spawnPos.x, spawnPos.z);
    console.log(`🎭 NPC spawn: (${spawnPos.x.toFixed(1)}, ${spawnPos.z.toFixed(1)}) height=${spawnPos.y.toFixed(2)}m biome=${biomeAtSpawn}`);

    return [
      createNPC({
        name: 'Bandit',
        position: spawnPos,
        spawnPosition: spawnPos, // Remember spawn point for respawn
        rotation: Math.PI, // Face toward player spawn
        behavior: 'wander',
        type: 'hostile',
        health: 100,
        maxHealth: 100,
        respawnTime: 10000, // Respawn after 10 seconds
        modelUrl: getModelPath('Bandit/bandit.glb'),
        animated: true, // Has Mixamo rig, use Mixamo animations
        scale: 1,
        isInteractable: true,
        interactionRange: 3,
      }),
    ];
  }, []);

  // World configuration controls (extracted to lib/config/WorldConfig.ts)
  const cityMapControls = useWorldControls();

  // Game settings (from pause menu - controls fog/render distance)
  const { renderDistance, fogEnabled: userFogEnabled } = useGameSettings();

  // Effective fog settings - user settings override Leva controls
  // fogNear is 40% of renderDistance, fogFar equals renderDistance
  const effectiveFogEnabled = userFogEnabled && cityMapControls.fogEnabled;
  const effectiveFogNear = renderDistance * 0.4;
  const effectiveFogFar = renderDistance;

  // Campfire position - automatically finds a sand biome location
  const campfirePosition = useMemo(() => {
    // Search for a sand biome position (spiral search from center)
    const sandPos = heightmapGenerator.findSandBiomePosition(
      0.4, // minSandWeight - slightly lower to ensure we find something
      250, // searchRadius - search up to 250m from center
      8    // stepSize - 8m between sample points
    );

    if (sandPos) {
      console.log(`🔥 Campfire auto-placed in sand biome at (${sandPos.x.toFixed(1)}, ${sandPos.z.toFixed(1)})`);
      return [sandPos.x, sandPos.y, sandPos.z] as [number, number, number];
    }

    // Fallback if no sand biome found (shouldn't happen with proper terrain)
    console.warn('⚠️ No sand biome found for campfire, using fallback position');
    const fallbackX = -60;
    const fallbackZ = 30;
    const fallbackHeight = heightmapGenerator.sampleHeight(fallbackX, fallbackZ);
    return [fallbackX, fallbackHeight, fallbackZ] as [number, number, number];
  }, [cityMapControls.terrainSeed]); // Re-calculate when terrain seed changes

  // Notify parent of terrain settings changes (for WorldMap)
  useEffect(() => {
    onTerrainSettingsChange?.({
      seed: cityMapControls.terrainSeed,
      terrainRadius: cityMapControls.terrainRadius,
    });
  }, [cityMapControls.terrainSeed, cityMapControls.terrainRadius, onTerrainSettingsChange]);

  // Note: Weapon switching is now handled by hotbar number keys (1-9)
  // via useHotbarSelection hook in HotbarHUD. Q key can still be used
  // for quick weapon toggle via the keybinds system.

  // Physics debug toggle (F3 key)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'F3') {
        e.preventDefault();
        setPhysicsDebug(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // DEBUG: Kill nearest NPC (K key) - for testing death animation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyK') {
        e.preventDefault();
        const { npcs, damageNPC } = useNPCStore.getState();
        // Find first non-dead NPC
        const aliveNPC = Array.from(npcs.values()).find(n => n.state !== 'dead');
        if (aliveNPC) {
          console.log('[DEBUG] Killing NPC:', aliveNPC.name, aliveNPC.id);
          damageNPC(aliveNPC.id, 9999); // Instant kill
        } else {
          console.log('[DEBUG] No alive NPCs to kill');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Multiplayer - connect to play room
  const { otherPlayers, playerCount, isConnected, updatePosition } = usePlayMultiplayer({
    enabled: true,
  });

  // Notify parent of multiplayer status
  useEffect(() => {
    onMultiplayerReady?.({ playerCount, isConnected });
  }, [playerCount, isConnected, onMultiplayerReady]);

  // Notify parent of player list changes
  useEffect(() => {
    onPlayersChange?.(otherPlayers.map(p => ({
      id: p.id,
      username: p.username,
      color: p.color,
    })));
  }, [otherPlayers, onPlayersChange]);

  // Memoized player position object for components that need { x, y, z } format
  // Prevents re-renders from object recreation
  const playerPositionObject = useMemo(() => ({
    x: playerPos.x,
    y: playerPos.y,
    z: playerPos.z,
  }), [playerPos.x, playerPos.y, playerPos.z]);

  // Derive animation name from state (simplified for network sync)
  const getAnimationName = useCallback((state: AnimationState, weapon: WeaponType): string => {
    if (state.isDancing) return 'dance1';
    if (state.isJumping) return state.isRunning ? 'jumpRun' : state.isMoving ? 'jumpJog' : 'jump';
    if (state.isCrouching) {
      if (weapon === 'rifle') return state.isMoving ? 'crouchRifleWalk' : 'crouchRifleIdle';
      if (weapon === 'pistol') return state.isMoving ? 'crouchPistolWalk' : 'crouchPistolIdle';
      if (state.isStrafingLeft) return 'crouchStrafeLeft';
      if (state.isStrafingRight) return 'crouchStrafeRight';
      return 'crouchWalk';
    }
    if (weapon === 'rifle') {
      return state.isRunning ? 'rifleRun' : state.isMoving ? 'rifleWalk' : 'rifleIdle';
    }
    if (weapon === 'pistol') {
      return state.isRunning ? 'pistolRun' : state.isMoving ? 'pistolWalk' : 'pistolIdle';
    }
    return state.isRunning ? 'running' : state.isMoving ? 'walking' : 'idle';
  }, []);

  const handlePositionChange = useCallback((pos: THREE.Vector3, rotation?: THREE.Euler, animState?: AnimationState) => {
    setPlayerPos(pos);
    if (rotation) {
      playerRotation.current.copy(rotation);
      // Pass Y rotation to parent for map compass
      onPlayerRotationChange?.(rotation.y);
    }
    onPlayerPositionChange?.(pos);

    // Derive animation name for network sync
    const animationName = animState ? getAnimationName(animState, weaponType) : 'idle';

    // Update multiplayer position with animation state and weapon
    updatePosition(pos, playerRotation.current, animationName, weaponType ?? 'none');
  }, [onPlayerPositionChange, onPlayerRotationChange, updatePosition, getAnimationName, weaponType]);

  return (
    <GamePauseProvider isPaused={isPaused}>
      {/* PERF: Pre-compile shaders during load to eliminate frame spikes */}
      {/* Note: Weapon shaders are now pre-compiled in PlayPage's loading screen */}
      <ShaderPrewarmer />

      {/* Visibility System - runs at priority -1 before other systems */}
      {/* Phase 1: CPU frustum culling for chunks */}
      {/* Future phases will add HZB, occlusion queries, per-instance culling */}
      <VisibilityUpdater
        enabled={cityMapControls.visibilityEnabled}
        config={{
          enabled: cityMapControls.visibilityEnabled,
          hzbEnabled: cityMapControls.visibilityHzbEnabled,
          temporalCoherenceEnabled: cityMapControls.visibilityTemporalCoherence,
          perInstanceCullingEnabled: cityMapControls.visibilityPerInstanceCulling,
          conservativeMargin: cityMapControls.visibilityConservativeMargin,
          debugMode: cityMapControls.visibilityDebug,
        }}
      />

      {/* Game Lighting System - shadows, time of day, day/night cycle */}
      <GameLighting
        shadowsEnabled={cityMapControls.shadowsEnabled}
        shadowQuality={cityMapControls.shadowQuality as ShadowQuality}
        shadowBias={cityMapControls.shadowBias}
        shadowNormalBias={cityMapControls.shadowNormalBias}
        sunIntensity={cityMapControls.sunIntensity}
        sunColor={cityMapControls.sunColor}
        sunPosition={cityMapControls.sunPosition}
        ambientIntensity={cityMapControls.ambientIntensity}
        skyColor={cityMapControls.lightingSkyColor}
        groundColor={cityMapControls.lightingGroundColor}
        contactShadowsEnabled={cityMapControls.contactShadowsEnabled}
        contactShadowOpacity={cityMapControls.contactShadowOpacity}
        timeOfDay={cityMapControls.timeOfDay as TimeOfDay | 'cycle'}
        playerPosition={playerPos}
        shadowCameraSize={cityMapControls.shadowCameraSize}
        // Day/Night Cycle
        dayNightCycleEnabled={cityMapControls.dayNightCycleEnabled}
        cycleDuration={cityMapControls.cycleDuration}
        timeSpeed={cityMapControls.timeSpeed}
        // Lighting state callback for terrain/grass shader sync
        onLightingUpdate={handleLightingUpdate}
      />

      {/* Flashlight spotlight is now integrated into EquipmentAttachment for accurate model-based lighting */}

      {/* Note: Fog is now handled by terrain shader (manual fog) for better performance */}
      {/* The fogEnabled/fogNear/fogFar controls are passed to StaticTerrain */}

      {/* Skybox rendering based on type */}
      {cityMapControls.skyboxType === 'none' && (
        <color attach="background" args={[cityMapControls.fogColor]} />
      )}

      {cityMapControls.skyboxType === 'stars' && (
        <>
          <color attach="background" args={[cityMapControls.fogColor]} />
          <Stars
            radius={cityMapControls.starsRadius}
            depth={cityMapControls.starsRadius / 2}
            count={cityMapControls.starsCount}
            factor={cityMapControls.starsFactor}
            saturation={0}
            fade
            speed={1}
          />
        </>
      )}

      {(cityMapControls.skyboxType === 'sunset' ||
        cityMapControls.skyboxType === 'dawn' ||
        cityMapControls.skyboxType === 'night') && (
        // Use EnhancedSky when day/night cycle is enabled for better time-of-day visuals
        cityMapControls.dayNightCycleEnabled ? (
          <EnhancedSky
            showSunDisk={cityMapControls.enhancedSkyShowSunDisk}
            showStars={cityMapControls.enhancedSkyShowStars}
            starsIntensity={cityMapControls.enhancedSkyStarsIntensity}
            turbidity={cityMapControls.turbidity}
            rayleigh={cityMapControls.rayleigh}
            mieCoefficient={cityMapControls.mieCoefficient}
            mieDirectionalG={cityMapControls.mieDirectionalG}
          />
        ) : (
          // Fallback to drei Sky for static presets
          <Sky
            distance={450000}
            sunPosition={[
              cityMapControls.sunPosition.x,
              cityMapControls.skyboxType === 'night' ? -10 :
              cityMapControls.skyboxType === 'dawn' ? 5 :
              cityMapControls.sunPosition.y,
              cityMapControls.sunPosition.z
            ]}
            turbidity={cityMapControls.skyboxType === 'night' ? 20 : cityMapControls.turbidity}
            rayleigh={cityMapControls.skyboxType === 'night' ? 0 : cityMapControls.rayleigh}
            mieCoefficient={cityMapControls.mieCoefficient}
            mieDirectionalG={cityMapControls.mieDirectionalG}
            inclination={0.5}
            azimuth={0.25}
          />
        )
      )}

      {/* Custom HDRI skybox - equirectangular images */}
      {cityMapControls.skyboxType === 'hdri' && (
        <Suspense fallback={<color attach="background" args={['#87CEEB']} />}>
          <HDRISkybox
            file={cityMapControls.hdriFile}
            intensity={cityMapControls.hdriIntensity}
            blur={cityMapControls.hdriBlur}
            backgroundIntensity={cityMapControls.hdriBackgroundIntensity}
          />
        </Suspense>
      )}

      {/* HDR Environment presets */}
      {(cityMapControls.skyboxType === 'warehouse' ||
        cityMapControls.skyboxType === 'forest' ||
        cityMapControls.skyboxType === 'city') && (
        <Environment
          preset={cityMapControls.skyboxType as 'warehouse' | 'forest' | 'city'}
          background
        />
      )}

      {/* Physics World - Suspense needed for Rapier WASM loading */}
      {/* Press F3 to toggle debug visualization */}
      <Suspense fallback={null}>
        <Physics gravity={[0, -20, 0]} timeStep={1/60} debug={physicsDebug}>

          {/* Safety floor - catches player if they somehow fall through terrain */}
          <RigidBody type="fixed" colliders={false}>
            <CuboidCollider args={[2000, 0.5, 2000]} position={[0, -20, 0]} />
          </RigidBody>

          {/* Procedural terrain mesh (visual) with chunk-owned grass/trees */}
          <StaticTerrain
            seed={cityMapControls.terrainSeed}
            radius={cityMapControls.terrainRadius}
            playerPosition={playerPositionObject}
            wireframe={cityMapControls.terrainWireframe}
            textured={cityMapControls.terrainTextured}
            color={cityMapControls.terrainColor}
            grassEnabled={cityMapControls.grassEnabled}
            grassDensity={cityMapControls.grassDensity}
            windEnabled={cityMapControls.windEnabled}
            treesEnabled={cityMapControls.treesEnabled}
            oakTreeDensity={cityMapControls.oakTreeDensity}
            palmTreeDensity={cityMapControls.palmTreeDensity}
            // Procedural grass (SimonDev Quick_Grass style)
            proceduralGrassEnabled={cityMapControls.proceduralGrassEnabled}
            proceduralGrassBladesPerChunk={cityMapControls.proceduralGrassBladesPerChunk}
            proceduralGrassMaxRenderDistance={cityMapControls.proceduralGrassMaxRenderDistance}
            proceduralGrassDensity={cityMapControls.proceduralGrassDensity}
            proceduralGrassBladeScale={cityMapControls.proceduralGrassBladeScale}
            proceduralGrassWindSpeed={cityMapControls.proceduralGrassWindSpeed}
            rockDensity={cityMapControls.rockDensity}
            rockSizeMultiplier={cityMapControls.rockSizeMultiplier}
            rockSizeVariation={cityMapControls.rockSizeVariation}
            cliffsEnabled={cityMapControls.cliffsEnabled}
            cliffGridDensity={cityMapControls.cliffGridDensity}
            cliffMinSpacing={cityMapControls.cliffMinSpacing}
            cliffRockWeightThreshold={cityMapControls.cliffRockWeightThreshold}
            cliffMinElevation={cityMapControls.cliffMinElevation}
            cliffMountainMaskThreshold={cityMapControls.cliffMountainMaskThreshold}
            cliffScaleMin={cityMapControls.cliffScaleMin}
            cliffScaleMax={cityMapControls.cliffScaleMax}
            cliffSlopeScaleInfluence={cityMapControls.cliffSlopeScaleInfluence}
            cliffXZScaleMin={cityMapControls.cliffXZScaleMin}
            cliffXZScaleMax={cityMapControls.cliffXZScaleMax}
            cliffYScaleMin={cityMapControls.cliffYScaleMin}
            cliffYScaleMax={cityMapControls.cliffYScaleMax}
            cliffSlopeAlignment={cityMapControls.cliffSlopeAlignment}
            cliffRandomTilt={cityMapControls.cliffRandomTilt}
            cliffRandomYaw={cityMapControls.cliffRandomYaw}
            cliffVerticalStacking={cityMapControls.cliffVerticalStacking}
            cliffVerticalSpacing={cityMapControls.cliffVerticalSpacing}
            cliffMaxStackHeight={cityMapControls.cliffMaxStackHeight}
            cliffEmbedDepth={cityMapControls.cliffEmbedDepth}
            fogEnabled={effectiveFogEnabled}
            fogNear={effectiveFogNear}
            fogFar={effectiveFogFar}
            fogColor={cityMapControls.fogColor}
            // Dynamic lighting from GameLighting (synced with time of day)
            sunDirection={lightingStateRef.current?.sunDirection}
            sunColor={lightingStateRef.current?.sunColor}
            sunIntensity={lightingStateRef.current?.sunIntensity}
            ambientSkyColor={lightingStateRef.current?.skyColor}
            ambientGroundColor={lightingStateRef.current?.groundColor}
            timeOfDayFogColor={lightingStateRef.current?.fogColor}
            // Spotlight (flashlight) for terrain illumination
            spotlightEnabled={isFlashlightOn}
            spotlightPosition={flashlightPosition}
            spotlightDirection={flashlightDirection}
            // Grass generation progress callback
            onGrassGenerationProgress={onGrassGenerationProgress}
          />

          {/* Global water plane at sea level - animated shader water */}
          {cityMapControls.waterEnabled && (
            <>
              <Water
                seaLevel={WATER_LEVEL}
                size={1500}
                deepColor="#0a3d62"
                shallowColor="#48c9b0"
                waveSpeed={0.5}
                waveScale={0.5}
                fresnelPower={2.0}
                fogEnabled={effectiveFogEnabled}
              />
              {/* Yacht floating in ocean at K9 grid cell */}
              <Suspense fallback={null}>
                <Yacht
                  position={[288, WATER_LEVEL, 160]}
                  rotation={-Math.PI / 6}
                  scale={1.0}
                />
              </Suspense>
            </>
          )}

          {/* Terrain physics collision - TrimeshCollider using exact visual mesh geometry */}
          {/*
            Uses preloaded terrain geometry that matches the visual mesh exactly.
            This eliminates physics/visual mismatches on steep terrain.
          */}
          <TerrainPhysics
            seed={cityMapControls.terrainSeed}
            chunkRadius={cityMapControls.terrainRadius}
            preloadedTerrain={preloadedTerrain}
          />

          {/* World boundary walls + alphanumeric grid overlay */}
          <WorldBoundary
            terrainRadius={cityMapControls.terrainRadius}
            showWalls={cityMapControls.showBoundaryWalls}
            showGrid={cityMapControls.showGrid}
            gridLabelSize={cityMapControls.gridLabelSize}
          />

          {/* Physics Player Controller with animation state */}
          <PhysicsPlayerController onPositionChange={handlePositionChange} isPaused={isPaused}>
            {({ isMoving, isRunning, isGrounded, isJumping, isFalling, isDancing, dancePressed, isCrouching, isStrafingLeft, isStrafingRight, isAiming, isFiring, velocityY }) => (
              <Suspense fallback={<PlaceholderAvatar isMoving={false} />}>
                <DefaultAvatar
                  isMoving={isMoving}
                  isRunning={isRunning}
                  isGrounded={isGrounded}
                  isJumping={isJumping}
                  isFalling={isFalling}
                  isDancing={isDancing}
                  dancePressed={dancePressed}
                  isCrouching={isCrouching}
                  isStrafingLeft={isStrafingLeft}
                  isStrafingRight={isStrafingRight}
                  isAiming={isAiming}
                  isFiring={isFiring}
                  velocityY={velocityY}
                  isPlayer
                />
              </Suspense>
            )}
          </PhysicsPlayerController>

          {/* NPCs with physics collision */}
          <NPCManager
            playerPosition={playerPositionObject}
            initialNPCs={testNPCs}
            renderDistance={100}
            getTerrainHeight={(x, z) => terrainGenerator.getHeight(x, z)}
            getBiome={(x, z) => terrainGenerator.getBiome(x, z)}
          />

          {/* Interactive Campfire - Press E to toggle */}
          {/* Key forces remount when seed changes (auto-placed in sand biome) */}
          {cityMapControls.campfireEnabled && (
            <Campfire
              key={`campfire-${cityMapControls.terrainSeed}`}
              position={campfirePosition}
              scale={cityMapControls.campfireScale}
              fireScale={cityMapControls.campfireFireScale}
              lightIntensity={cityMapControls.campfireLightIntensity}
              lightDistance={cityMapControls.campfireLightDistance}
              initiallyLit={cityMapControls.campfireLit}
              interactionRange={cityMapControls.campfireRange}
              playerPosition={playerPos}
            />
          )}

          {/* Player-placed objects */}
          <PlacedObjectsManager playerPosition={playerPos} />

          {/* Placement preview (when placing items from inventory) */}
          <PlacementController />
        </Physics>
      </Suspense>

      {/* Other Players (multiplayer) - outside physics for performance */}
      <OtherPlayers players={otherPlayers} />

      {/* Biome-based ambient audio - crossfades between zones */}
      <AmbientAudioManager
        playerPosition={playerPos}
        terrainSeed={cityMapControls.terrainSeed}
        terrainRadius={cityMapControls.terrainRadius}
        enabled={cityMapControls.ambientAudioEnabled}
      />
    </GamePauseProvider>
  );
}
