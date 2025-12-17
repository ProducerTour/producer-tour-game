import { useRef, useState, Suspense, useMemo, useEffect, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {
  useGLTF,
  useFBX,
  useTexture,
  ContactShadows,
  Stars,
  Sky,
  Environment,
} from '@react-three/drei';
import { Physics, RigidBody, CuboidCollider } from '@react-three/rapier';
import * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';
import { usePlayMultiplayer } from './hooks/usePlayMultiplayer';
import { OtherPlayers } from './multiplayer/OtherPlayers';
import { PhysicsPlayerController, type AnimationState } from './PhysicsPlayerController';
import { AnimationErrorBoundary } from './AnimationErrorBoundary';
import { type WeaponType } from './WeaponAttachment';
import { VFXManager } from './vfx/VFXManager';
import { NPCManager } from './npc/NPCManager';
import { createPatrolNPC, createNPC } from './npc/useNPCStore';
import { useKeyboardControls } from './hooks/useKeyboardControls';
import { useCombatStore } from './combat/useCombatStore';
import { useCombatSounds } from './audio';
import { useKeybindsStore } from './settings';
import { useControls, folder } from 'leva';

// Import extracted avatar components
import { AnimatedAvatar, MixamoAnimatedAvatar, PlaceholderAvatar } from './avatars';

// Import extracted world components
import { ZoneMarker, CyberpunkGround } from './world';

// Import maps
import { NeoTokyoMap } from './maps';

import { Gamepad2, Music, Briefcase, Users, Mic2 } from 'lucide-react';
import { ASSETS_BASE, getSkyboxPath } from '../../config/assetPaths';

// Flag to use Mixamo animations vs procedural
const USE_MIXAMO_ANIMATIONS = true;

// Movement constants
const WALK_SPEED = 2.5;
const SPRINT_SPEED = 5;
const ROTATION_SPEED = 10;


// HDRI Skybox component - loads equirectangular images (.hdr, .exr, .jpg, .png)
// Download free HDRIs from: polyhaven.com/hdris/skies or ambientcg.com
// Use JPG for best performance (~1-3MB vs 70-100MB for EXR/HDR)
function HDRISkybox({
  file,
  intensity = 1.0,
  blur = 0,
}: {
  file: string;
  intensity?: number;
  blur?: number;
}) {
  const { gl } = useThree();

  // Apply intensity via tone mapping exposure
  useEffect(() => {
    gl.toneMappingExposure = intensity;
    console.log(`🌤️ HDRI Skybox: ${file}, intensity=${intensity}, blur=${blur}`);
  }, [intensity, gl, file, blur]);

  // Use drei's Environment component - handles HDR/EXR/JPG automatically
  // Sets both scene.background and scene.environment for reflections
  return (
    <Environment
      files={getSkyboxPath(file)}
      background
      backgroundBlurriness={blur}
      environmentIntensity={intensity}
    />
  );
}


// Third-person camera with mouse look
function ThirdPersonCamera({
  target
}: {
  target: React.RefObject<THREE.Group>;
}) {
  const { camera, gl } = useThree();
  const smoothPosition = useRef(new THREE.Vector3(0, 4, 10));
  const initialized = useRef(false);

  // Get aiming state and weapon from combat store
  const isAiming = useCombatStore((s) => s.isAiming);
  const currentWeapon = useCombatStore((s) => s.currentWeapon);
  const hasWeapon = currentWeapon !== 'none';

  // Camera orbit angles (controlled by mouse)
  const orbitAngle = useRef(0); // Horizontal rotation (yaw)
  const pitchAngle = useRef(0.3); // Vertical angle (pitch) - start slightly above

  // For weapon-equipped mode: track offset from character's back
  const lookOffset = useRef(0); // How far camera has rotated from "behind character"
  const isFreeLooking = useRef(false); // Currently in free look mode (Alt/Cmd held)
  const freeLookResetSpeed = 5; // Speed to return camera behind character

  // Mouse tracking
  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const isPointerLocked = useRef(false);
  const isModifierHeld = useRef(false); // Alt or Cmd key for camera control

  // Leva controls for camera
  const cameraControls = useControls('Camera', {
    'Normal': folder({
      distance: { value: 6, min: 2, max: 12, step: 0.5 },
      heightOffset: { value: 1.5, min: 0, max: 4, step: 0.1 },
      lookAtHeight: { value: 1.6, min: 0.5, max: 2.5, step: 0.1 },
      fov: { value: 75, min: 40, max: 120, step: 1 },
    }, { collapsed: true }),
    'Aiming': folder({
      aimDistance: { value: 3.5, min: 1.5, max: 8, step: 0.25 },
      aimShoulderOffset: { value: 0.8, min: -1.5, max: 1.5, step: 0.1 },
      aimHeightOffset: { value: 1.2, min: 0, max: 3, step: 0.1 },
      aimLookAtHeight: { value: 1.5, min: 0.5, max: 2.5, step: 0.1 },
      aimTransitionSpeed: { value: 10, min: 2, max: 20, step: 1 },
      aimFov: { value: 50, min: 25, max: 90, step: 1 },
    }, { collapsed: false }),
  });

  // Track current FOV for smooth interpolation
  const currentFov = useRef(75);

  // Camera settings
  const minPitch = -0.2; // Don't go too far below
  const maxPitch = 1.2; // Don't go too far above
  const sensitivity = 0.003;

  // Get keybinds from store
  const { isAction } = useKeybindsStore();

  // Handle pointer lock and fullscreen when weapon is equipped
  useEffect(() => {
    const canvas = gl.domElement;

    const handlePointerLockChange = () => {
      isPointerLocked.current = document.pointerLockElement === canvas;
      if (isPointerLocked.current) {
        canvas.style.cursor = 'none';
      } else {
        canvas.style.cursor = hasWeapon ? 'crosshair' : 'grab';
      }
    };

    // Request pointer lock on click when weapon is equipped (but not when holding free-look key)
    const handleClick = () => {
      if (hasWeapon && !isPointerLocked.current && !isModifierHeld.current) {
        canvas.requestPointerLock?.();
      }
    };

    // Handle keybinds for free-look and fullscreen
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      // Free-look key (configurable via keybinds menu)
      if (isAction('freeLook', e.code)) {
        e.preventDefault();
        isModifierHeld.current = true;
        isFreeLooking.current = true;
        // Exit pointer lock when free-looking
        if (isPointerLocked.current) {
          document.exitPointerLock?.();
        }
        canvas.style.cursor = 'grab';
      }

      // Fullscreen toggle (configurable via keybinds menu)
      if (isAction('fullscreen', e.code)) {
        e.preventDefault();
        if (document.fullscreenElement) {
          document.exitFullscreen?.();
        } else {
          // Request fullscreen on the canvas parent (usually the R3F container)
          const container = canvas.parentElement?.parentElement || canvas;
          container.requestFullscreen?.();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      // Free-look key released - exit free-look
      if (isAction('freeLook', e.code)) {
        e.preventDefault();
        isModifierHeld.current = false;
        isFreeLooking.current = false;
        if (hasWeapon && !isPointerLocked.current) {
          canvas.style.cursor = 'crosshair';
        }
      }
    };

    document.addEventListener('pointerlockchange', handlePointerLockChange);
    canvas.addEventListener('click', handleClick);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Exit pointer lock when weapon is unequipped
    if (!hasWeapon && isPointerLocked.current) {
      document.exitPointerLock?.();
    }

    // Update cursor based on weapon state
    if (!isPointerLocked.current) {
      canvas.style.cursor = hasWeapon ? 'crosshair' : 'grab';
    }

    return () => {
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      canvas.removeEventListener('click', handleClick);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [hasWeapon, gl, isAction]);

  // Set up mouse event listeners for camera control
  useEffect(() => {
    const canvas = gl.domElement;

    const handleMouseDown = (e: MouseEvent) => {
      if (isPointerLocked.current) return;

      // Left or right click drag when:
      // - No weapon equipped, OR
      // - Weapon equipped but holding Alt/Cmd modifier
      const canDrag = !hasWeapon || isModifierHeld.current;
      if ((e.button === 0 || e.button === 2) && canDrag) {
        isDragging.current = true;
        lastMouse.current = { x: e.clientX, y: e.clientY };
        canvas.style.cursor = 'grabbing';
      }
    };

    const handleMouseUp = () => {
      if (isPointerLocked.current) return;
      isDragging.current = false;
      // Restore appropriate cursor
      if (isModifierHeld.current) {
        canvas.style.cursor = 'grab';
      } else {
        canvas.style.cursor = hasWeapon ? 'crosshair' : 'grab';
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      // Pointer lock mode - use movementX/Y for smooth FPS-style control
      if (isPointerLocked.current) {
        orbitAngle.current -= e.movementX * sensitivity;
        pitchAngle.current += e.movementY * sensitivity;
        pitchAngle.current = Math.max(minPitch, Math.min(maxPitch, pitchAngle.current));
        return;
      }

      // Drag mode - use delta from last position
      if (!isDragging.current) return;

      const deltaX = e.clientX - lastMouse.current.x;
      const deltaY = e.clientY - lastMouse.current.y;

      // When free looking with weapon equipped, update lookOffset instead of orbitAngle directly
      if (hasWeapon && isFreeLooking.current) {
        lookOffset.current -= deltaX * sensitivity;
        // Clamp look offset to prevent looking too far around (roughly 120 degrees each way)
        lookOffset.current = Math.max(-2.1, Math.min(2.1, lookOffset.current));
      } else {
        orbitAngle.current -= deltaX * sensitivity;
      }

      pitchAngle.current += deltaY * sensitivity;
      pitchAngle.current = Math.max(minPitch, Math.min(maxPitch, pitchAngle.current));

      lastMouse.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseLeave = () => {
      if (isPointerLocked.current) return;
      isDragging.current = false;
    };

    // Prevent context menu on right-click
    const handleContextMenu = (e: Event) => {
      e.preventDefault();
    };

    canvas.style.cursor = hasWeapon ? 'crosshair' : 'grab';
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);
    canvas.addEventListener('contextmenu', handleContextMenu);

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      canvas.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [gl, hasWeapon]);

  useFrame((_, delta) => {
    if (!target.current) return;

    const playerPos = target.current.position;
    const playerRotY = target.current.rotation.y;

    // When weapon equipped, camera follows behind character
    if (hasWeapon) {
      // Smoothly reset lookOffset when not free looking
      if (!isFreeLooking.current && Math.abs(lookOffset.current) > 0.001) {
        lookOffset.current *= Math.exp(-freeLookResetSpeed * delta);
        if (Math.abs(lookOffset.current) < 0.001) lookOffset.current = 0;
      }

      // Camera should be behind the character (character's back)
      // Player rotation Y of 0 means facing +Z, so camera at angle PI is behind
      // We add PI to put camera behind, then add lookOffset for free look
      const behindAngle = playerRotY + Math.PI + lookOffset.current;

      // Smoothly interpolate orbitAngle to the behind angle
      let angleDiff = behindAngle - orbitAngle.current;
      // Normalize angle difference to [-PI, PI]
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

      // Faster follow when not free looking, slower when free looking to feel natural
      const followSpeed = isFreeLooking.current ? 3 : 10;
      orbitAngle.current += angleDiff * Math.min(1, followSpeed * delta);
    }

    // Select camera settings based on aiming state
    const currentDistance = isAiming ? cameraControls.aimDistance : cameraControls.distance;
    const currentHeightOffset = isAiming ? cameraControls.aimHeightOffset : cameraControls.heightOffset;
    const currentLookAtHeight = isAiming ? cameraControls.aimLookAtHeight : cameraControls.lookAtHeight;
    const shoulderOffset = isAiming ? cameraControls.aimShoulderOffset : 0;
    const lerpSpeed = isAiming ? cameraControls.aimTransitionSpeed : 12;

    // Calculate camera position based on orbit angles
    const horizontalDist = currentDistance * Math.cos(pitchAngle.current);
    const verticalOffset = currentDistance * Math.sin(pitchAngle.current) + currentHeightOffset;

    // Calculate shoulder offset direction (perpendicular to camera direction)
    const shoulderX = Math.cos(orbitAngle.current) * shoulderOffset;
    const shoulderZ = -Math.sin(orbitAngle.current) * shoulderOffset;

    const desiredPos = new THREE.Vector3(
      playerPos.x + Math.sin(orbitAngle.current) * horizontalDist + shoulderX,
      playerPos.y + verticalOffset,
      playerPos.z + Math.cos(orbitAngle.current) * horizontalDist + shoulderZ
    );

    // Initialize on first frame
    if (!initialized.current) {
      smoothPosition.current.copy(desiredPos);
      camera.position.copy(smoothPosition.current);
      initialized.current = true;
    }

    // Smooth camera movement
    smoothPosition.current.lerp(desiredPos, 1 - Math.exp(-lerpSpeed * delta));

    // Apply camera position
    camera.position.copy(smoothPosition.current);

    // Always look at player (with shoulder offset for aiming)
    camera.lookAt(
      playerPos.x + shoulderX * 0.5,
      playerPos.y + currentLookAtHeight,
      playerPos.z + shoulderZ * 0.5
    );

    // Smoothly interpolate FOV between normal and aim FOV
    const targetFov = isAiming ? cameraControls.aimFov : cameraControls.fov;
    currentFov.current += (targetFov - currentFov.current) * Math.min(1, lerpSpeed * delta);

    // Apply FOV to camera (only PerspectiveCamera has fov)
    if ((camera as THREE.PerspectiveCamera).isPerspectiveCamera) {
      const perspCamera = camera as THREE.PerspectiveCamera;
      if (Math.abs(perspCamera.fov - currentFov.current) > 0.01) {
        perspCamera.fov = currentFov.current;
        perspCamera.updateProjectionMatrix();
      }
    }
  });

  return null;
}

// Ground level constant - character stands ON the ground
const GROUND_Y = 0.01;

// Collision detection constants
const PLAYER_RADIUS = 0.5; // Player collision radius
const COLLISION_CHECK_HEIGHT = 1.0; // Height at which to check collisions (chest level)

// Validate avatar URL - must be a valid HTTPS URL ending with .glb
function isValidAvatarUrl(url?: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    // Must be HTTPS and end with .glb
    if (parsed.protocol !== 'https:') return false;
    if (!url.includes('.glb')) return false;
    // Must be from readyplayer.me and be a models URL (not a subdomain like 'producer-tour-play')
    if (parsed.hostname.endsWith('readyplayer.me')) {
      // Valid RPM URLs are like: https://models.readyplayer.me/{id}.glb
      return parsed.hostname === 'models.readyplayer.me';
    }
    return false;
  } catch {
    return false;
  }
}

// Legacy player controller with movement (non-physics, kept as fallback)
export function LegacyPlayerController({
  avatarUrl,
  onPositionChange,
}: {
  avatarUrl?: string;
  onPositionChange?: (pos: THREE.Vector3, rotation?: THREE.Euler) => void;
}) {
  const keys = useKeyboardControls();
  const playerRef = useRef<THREE.Group>(null!);
  const { camera, scene } = useThree();

  // Validate avatar URL - skip invalid URLs to prevent fetch errors
  const validAvatarUrl = isValidAvatarUrl(avatarUrl) ? avatarUrl : undefined;

  const velocity = useRef(new THREE.Vector3());
  const facingAngle = useRef(0);
  const [isMoving, setIsMoving] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  // Raycaster for collision detection
  const raycaster = useMemo(() => new THREE.Raycaster(), []);

  // Reusable vectors to avoid GC pressure (allocated once, reused every frame)
  const tempVectors = useRef({
    cameraDir: new THREE.Vector3(),
    cameraRight: new THREE.Vector3(),
    moveDir: new THREE.Vector3(),
    targetVel: new THREE.Vector3(),
    upVector: new THREE.Vector3(0, 1, 0),
    zeroVel: new THREE.Vector3(0, 0, 0),
    rayOrigin: new THREE.Vector3(),
    rayDir: new THREE.Vector3(),
    dirX: new THREE.Vector3(),
    dirZ: new THREE.Vector3(),
  });

  // Cache collidable objects (rebuild when scene changes significantly)
  const collidablesRef = useRef<THREE.Object3D[]>([]);
  const lastCollidableUpdate = useRef(0);

  // Update collidables cache periodically (not every frame)
  const updateCollidables = useCallback(() => {
    const now = Date.now();
    if (now - lastCollidableUpdate.current < 1000) return; // Only update every second
    lastCollidableUpdate.current = now;

    const collidables: THREE.Object3D[] = [];
    scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        const name = mesh.name.toLowerCase();
        // Only collide with buildings, fences, walls
        if (name.includes('fence') || name.includes('building') ||
            name.includes('wall') || name.includes('reja')) {
          collidables.push(obj);
        }
      }
    });
    collidablesRef.current = collidables;
  }, [scene]);

  // Check for collision in a given direction (horizontal only, uses reusable vectors)
  const checkCollision = useCallback((
    posX: number,
    posZ: number,
    dirX: number,
    dirZ: number,
    distance: number
  ): boolean => {
    updateCollidables();

    if (collidablesRef.current.length === 0) return false;

    const vecs = tempVectors.current;

    // Set raycaster origin at player's chest height
    vecs.rayOrigin.set(posX, COLLISION_CHECK_HEIGHT, posZ);
    vecs.rayDir.set(dirX, 0, dirZ).normalize(); // Horizontal collision only

    raycaster.set(vecs.rayOrigin, vecs.rayDir);
    raycaster.far = distance + PLAYER_RADIUS;

    const intersects = raycaster.intersectObjects(collidablesRef.current, true);
    return intersects.length > 0 && intersects[0].distance < distance + PLAYER_RADIUS;
  }, [raycaster, updateCollidables]);

  useFrame((_, delta) => {
    if (!playerRef.current) return;

    const vecs = tempVectors.current;
    const pos = playerRef.current.position;

    // Get raw input
    let inputX = 0; // left/right
    let inputZ = 0; // forward/back

    if (keys.forward) inputZ = -1;
    if (keys.backward) inputZ = 1;
    if (keys.left) inputX = -1;
    if (keys.right) inputX = 1;

    const hasInput = inputX !== 0 || inputZ !== 0;

    // Update animation states
    if (hasInput !== isMoving) setIsMoving(hasInput);
    if ((hasInput && keys.sprint) !== isRunning) setIsRunning(hasInput && keys.sprint);

    if (hasInput) {
      // Normalize input
      const inputLen = Math.sqrt(inputX * inputX + inputZ * inputZ);
      inputX /= inputLen;
      inputZ /= inputLen;

      // Get camera's horizontal direction (ignore Y component) - reuse vector
      camera.getWorldDirection(vecs.cameraDir);
      vecs.cameraDir.y = 0;
      vecs.cameraDir.normalize();

      // Calculate camera's right vector - reuse vectors
      vecs.upVector.set(0, 1, 0);
      vecs.cameraRight.crossVectors(vecs.cameraDir, vecs.upVector).normalize();

      // Calculate world-space movement direction relative to camera - reuse vector
      vecs.moveDir.set(0, 0, 0);
      vecs.moveDir.addScaledVector(vecs.cameraDir, -inputZ); // Forward/back relative to camera
      vecs.moveDir.addScaledVector(vecs.cameraRight, inputX); // Left/right relative to camera
      vecs.moveDir.normalize();

      // Calculate speed
      const speed = keys.sprint ? SPRINT_SPEED : WALK_SPEED;

      // Set target velocity - reuse vector
      vecs.targetVel.copy(vecs.moveDir).multiplyScalar(speed);
      velocity.current.lerp(vecs.targetVel, 1 - Math.exp(-10 * delta));

      // Calculate target facing angle (direction of movement)
      const targetAngle = Math.atan2(vecs.moveDir.x, vecs.moveDir.z);

      // Smoothly rotate player to face movement direction
      let angleDiff = targetAngle - facingAngle.current;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      facingAngle.current += angleDiff * Math.min(1, delta * ROTATION_SPEED);

      playerRef.current.rotation.y = facingAngle.current;
    } else {
      // Decelerate when no input - reuse zero vector
      vecs.zeroVel.set(0, 0, 0);
      velocity.current.lerp(vecs.zeroVel, 1 - Math.exp(-8 * delta));
    }

    // Calculate proposed movement
    const proposedX = velocity.current.x * delta;
    const proposedZ = velocity.current.z * delta;

    // Check X movement (use primitive values to avoid object allocation)
    if (Math.abs(proposedX) > 0.001) {
      const signX = Math.sign(proposedX);
      if (!checkCollision(pos.x, pos.z, signX, 0, Math.abs(proposedX))) {
        pos.x += proposedX;
      } else {
        velocity.current.x = 0; // Stop X velocity on collision
      }
    }

    // Check Z movement
    if (Math.abs(proposedZ) > 0.001) {
      const signZ = Math.sign(proposedZ);
      if (!checkCollision(pos.x, pos.z, 0, signZ, Math.abs(proposedZ))) {
        pos.z += proposedZ;
      } else {
        velocity.current.z = 0; // Stop Z velocity on collision
      }
    }

    // Keep on ground
    pos.y = GROUND_Y;

    // Report position and rotation (only allocate when callback exists)
    if (onPositionChange) {
      onPositionChange(pos.clone(), playerRef.current.rotation.clone());
    }
  });

  // Use placeholder if no valid avatar URL
  const shouldShowAvatar = !!validAvatarUrl;

  return (
    <>
      <group ref={playerRef} position={[30, GROUND_Y, -20]}>
        <Suspense fallback={<PlaceholderAvatar isMoving={isMoving} />}>
          {shouldShowAvatar ? (
            USE_MIXAMO_ANIMATIONS ? (
              <AnimationErrorBoundary
                fallback={
                  <AnimatedAvatar
                    url={validAvatarUrl}
                    isMoving={isMoving}
                    isRunning={isRunning}
                  />
                }
              >
                <MixamoAnimatedAvatar
                  url={validAvatarUrl}
                  isMoving={isMoving}
                  isRunning={isRunning}
                />
              </AnimationErrorBoundary>
            ) : (
              <AnimatedAvatar
                url={validAvatarUrl}
                isMoving={isMoving}
                isRunning={isRunning}
              />
            )
          ) : (
            <PlaceholderAvatar isMoving={isMoving} />
          )}
        </Suspense>
      </group>

      <ThirdPersonCamera target={playerRef} />
    </>
  );
}


// Inner Basketball Court component that loads assets
function BasketballCourtModel({ posX, posY, posZ, rotY, scale }: {
  posX: number;
  posY: number;
  posZ: number;
  rotY: number;
  scale: number;
}) {
  // Load the court FBX (textures will 404 but we'll reassign them)
  const court = useFBX(`${ASSETS_BASE}/models/basketball-court/Court.fbx`);

  // Load all textures from R2 CDN
  const textures = useTexture({
    court: `${ASSETS_BASE}/models/basketball-court/textures/court.png`,
    floor1: `${ASSETS_BASE}/models/basketball-court/textures/floor1.png`,
    floor2: `${ASSETS_BASE}/models/basketball-court/textures/floor2.png`,
    hoop1: `${ASSETS_BASE}/models/basketball-court/textures/hoop1.png`,
    hoop2: `${ASSETS_BASE}/models/basketball-court/textures/hoop2.png`,
    hoop3: `${ASSETS_BASE}/models/basketball-court/textures/hoop3.png`,
    hoop4: `${ASSETS_BASE}/models/basketball-court/textures/hoop4.png`,
    hoop5: `${ASSETS_BASE}/models/basketball-court/textures/hoop5.png`,
    fence1: `${ASSETS_BASE}/models/basketball-court/textures/fence1.png`,
    fence2: `${ASSETS_BASE}/models/basketball-court/textures/fence2.png`,
    fence1Alpha: `${ASSETS_BASE}/models/basketball-court/textures/fence1_alpha.png`,
    metalfence: `${ASSETS_BASE}/models/basketball-court/textures/metalfence.png`,
    building1: `${ASSETS_BASE}/models/basketball-court/textures/building1.png`,
    building2: `${ASSETS_BASE}/models/basketball-court/textures/building2.png`,
    window1: `${ASSETS_BASE}/models/basketball-court/textures/window1.png`,
    window2: `${ASSETS_BASE}/models/basketball-court/textures/window2.png`,
  });

  // Track if we've already processed the model
  const processedRef = useRef(false);

  // Clone and setup model with manual texture assignment (only once)
  const model = useMemo(() => {
    const clone = court.clone();

    // Log mesh names for debugging (only once)
    if (!processedRef.current) {
      console.log('🏀 Basketball Court - Mesh names in model:');
      const meshNames: string[] = [];
      clone.traverse((child: THREE.Object3D) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          materials.forEach((mat) => {
            const m = mat as THREE.MeshStandardMaterial;
            meshNames.push(`  Mesh: "${mesh.name}" | Material: "${m.name}"`);
          });
        }
      });
      meshNames.forEach(n => console.log(n));
      console.log('🏀 Total meshes:', meshNames.length);
      processedRef.current = true;
    }

    // Texture assignment - material names match texture file names exactly
    const textureMap: Record<string, { tex: THREE.Texture; isFence: boolean }> = {
      'court': { tex: textures.court, isFence: false },
      'floor1': { tex: textures.floor1, isFence: false },
      'floor2': { tex: textures.floor2, isFence: false },
      'hoop1': { tex: textures.hoop1, isFence: false },
      'hoop2': { tex: textures.hoop2, isFence: false },
      'hoop3': { tex: textures.hoop3, isFence: false },
      'hoop4': { tex: textures.hoop4, isFence: false },
      'hoop5': { tex: textures.hoop5, isFence: false },
      'fence1': { tex: textures.fence1, isFence: true },  // Chainlink with alpha
      'fence2': { tex: textures.fence2, isFence: false },
      'metalfence': { tex: textures.metalfence, isFence: false },
      'building1': { tex: textures.building1, isFence: false },
      'building2': { tex: textures.building2, isFence: false },
      'window1': { tex: textures.window1, isFence: false },
      'window2': { tex: textures.window2, isFence: false },
    };

    const getTexture = (_meshName: string, matName: string): { tex: THREE.Texture; isFence: boolean } => {
      const key = matName.toLowerCase();
      return textureMap[key] || { tex: textures.floor1, isFence: false };
    };

    // Apply textures to all meshes
    clone.traverse((child: THREE.Object3D) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

        materials.forEach((mat, idx) => {
          const m = mat as THREE.MeshStandardMaterial;
          const { tex, isFence } = getTexture(mesh.name, m.name);

          if (isFence) {
            // Chainlink fence with alpha transparency
            const newMat = new THREE.MeshStandardMaterial({
              map: tex,
              alphaMap: textures.fence1Alpha,
              transparent: true,
              alphaTest: 0.5,
              side: THREE.DoubleSide,
              metalness: 0.7,
              roughness: 0.4,
            });
            if (Array.isArray(mesh.material)) {
              mesh.material[idx] = newMat;
            } else {
              mesh.material = newMat;
            }
          } else {
            // Regular texture assignment
            m.map = tex;
            m.needsUpdate = true;
          }
        });
      }
    });

    return clone;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [court]);

  return (
    <primitive
      object={model}
      position={[posX, posY, posZ]}
      rotation={[0, rotY, 0]}
      scale={scale}
    />
  );
}

// Basketball Court - positioned and scaled for the play world
// Court dimensions at scale 0.01: approximately 28m x 15m
const COURT_BOUNDS = {
  width: 14,      // Half-width (total 28m)
  depth: 8,       // Half-depth (total 16m)
  fenceHeight: 3, // Fence height in meters
  fenceThickness: 0.3,
};

function BasketballCourt() {
  // Fixed position values (previously configured with Leva debug controls)
  const posX = 30;
  const posY = 0;
  const posZ = -20;
  const rotY = 0;
  const scale = 0.01;

  return (
    <RigidBody type="fixed" colliders={false} position={[posX, posY, posZ]}>
      {/* Court visual model */}
      <BasketballCourtModel
        posX={0}
        posY={0}
        posZ={0}
        rotY={rotY}
        scale={scale}
      />

      {/* Hoop poles - cylindrical colliders approximated as thin boxes */}
      <CuboidCollider args={[0.15, 2, 0.15]} position={[-12, 2, 0]} />
      <CuboidCollider args={[0.15, 2, 0.15]} position={[12, 2, 0]} />

      {/* Floor collider - the actual walkable surface */}
      <CuboidCollider
        args={[COURT_BOUNDS.width, 0.1, COURT_BOUNDS.depth]}
        position={[0, -0.1, 0]}
      />
    </RigidBody>
  );
}

// Animation names from the monkey GLB
const MONKEY_ANIMS = {
  idle: 'Armature|Idle',
  idle2: 'Armature|Idle2',
  run: 'Armature|Run',
  eat: 'Armature|Eat',
  roar: 'Armature|Roar',
  smile: 'Armature|Smile',
  jump: 'Armature|Jump',
  sit: 'Armature|Sit',
  sitIdle: 'Armature|SitIdle',
};

type MonkeyAnimState = 'idle' | 'run' | 'special';

// Animated Monkey NPC that wanders around the basketball court
function MonkeyNPC({ position }: { position: [number, number, number] }) {
  const groupRef = useRef<THREE.Group>(null);
  const modelRef = useRef<THREE.Group>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const actionsRef = useRef<Record<string, THREE.AnimationAction>>({});
  const currentAnimRef = useRef<MonkeyAnimState>('idle');
  const currentActionRef = useRef<string>(MONKEY_ANIMS.idle);

  // Wandering state
  const wanderState = useRef({
    targetX: position[0],
    targetZ: position[2],
    waitTime: 2,
    speed: 0.8,
    isMoving: false,
    specialActionTime: 0, // Time until next special action
    isDoingSpecial: false,
    specialDuration: 0,
  });

  // Procedural animation state
  const proceduralState = useRef({
    breathPhase: 0,
    lookPhase: 0,
    bobPhase: 0,
    currentRotY: 0,
    targetRotY: 0,
  });

  // Load the monkey GLB model from R2 CDN
  const gltf = useGLTF(`${ASSETS_BASE}/models/Monkey/Monkey.glb`);

  // Load the diffuse texture (only used if model doesn't have embedded textures)
  const diffuseTexture = useTexture(`${ASSETS_BASE}/models/Monkey/Textures_B3/Monkey_B3_diffuse_1k.jpg`);

  // Check if model has embedded textures
  const hasEmbeddedTextures = useMemo(() => {
    let hasTextures = false;
    gltf.scene.traverse((child: THREE.Object3D) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        materials.forEach((mat) => {
          if ((mat as THREE.MeshStandardMaterial).map) {
            hasTextures = true;
          }
        });
      }
    });
    return hasTextures;
  }, [gltf.scene]);

  // Clone and set up model
  const { model, scale } = useMemo(() => {
    const clone = SkeletonUtils.clone(gltf.scene);

    // Calculate scale - 150x smaller than human-sized (1.8m / 150 = 0.012m)
    const box = new THREE.Box3().setFromObject(clone);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    const autoScale = maxDim > 0 ? 0.012 / maxDim : 0.01;

    return { model: clone, scale: autoScale };
  }, [gltf]);

  // Apply material and set up animations
  useEffect(() => {
    if (!model) return;

    // Log mesh and material info for debugging
    console.log('🐵 Monkey mesh structure:');
    model.traverse((child: THREE.Object3D) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        console.log(`  Mesh: "${mesh.name}" | Materials: ${materials.length}`);
        materials.forEach((mat, i) => {
          const m = mat as THREE.MeshStandardMaterial;
          console.log(`    [${i}] "${m.name}" | hasMap: ${!!m.map}`);
        });
      }
    });

    // Apply texture and fix transparency
    model.traverse((child: THREE.Object3D) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        materials.forEach((_mat, idx) => {
          // Create new material with proper settings
          const newMat = new THREE.MeshStandardMaterial({
            map: diffuseTexture,
            metalness: 0.2,
            roughness: 0.8,
            transparent: false,
            opacity: 1,
            side: THREE.FrontSide,
            alphaTest: 0,
          });

          // Ensure texture is set to repeat properly
          if (diffuseTexture) {
            diffuseTexture.flipY = false; // GLB models typically need flipY = false
            diffuseTexture.needsUpdate = true;
          }

          if (Array.isArray(mesh.material)) {
            mesh.material[idx] = newMat;
          } else {
            mesh.material = newMat;
          }
        });
      }
    });

    console.log('🐵 Monkey has embedded textures:', hasEmbeddedTextures);

    // Set up animation mixer
    if (gltf.animations.length > 0) {
      const mixer = new THREE.AnimationMixer(model);
      mixerRef.current = mixer;

      // Remove root motion from animation to prevent drifting
      const removeRootMotion = (clip: THREE.AnimationClip): THREE.AnimationClip => {
        const filteredTracks = clip.tracks.filter(track => {
          if (track.name.endsWith('.position')) return false;
          if (track.name.endsWith('.quaternion') || track.name.endsWith('.rotation')) {
            const boneName = track.name.split('.')[0].toLowerCase();
            if (boneName.includes('root') || boneName.includes('armature')) return false;
          }
          return true;
        });
        return new THREE.AnimationClip(clip.name, clip.duration, filteredTracks);
      };

      // Create actions for all animations
      gltf.animations.forEach(clip => {
        const cleanedClip = removeRootMotion(clip);
        const action = mixer.clipAction(cleanedClip);
        action.setLoop(THREE.LoopRepeat, Infinity);
        actionsRef.current[clip.name] = action;
      });

      // Start with idle animation
      const idleAction = actionsRef.current[MONKEY_ANIMS.idle];
      if (idleAction) {
        idleAction.timeScale = 0.8;
        idleAction.play();
      }

      // Schedule first special action
      wanderState.current.specialActionTime = 5 + Math.random() * 10;
    }

    return () => {
      mixerRef.current?.stopAllAction();
    };
  }, [model, diffuseTexture, hasEmbeddedTextures, gltf.animations]);

  // Crossfade to a specific animation
  const crossfadeTo = useCallback((animName: string, duration = 0.3, timeScale = 1.0) => {
    if (currentActionRef.current === animName) return;

    const fromAction = actionsRef.current[currentActionRef.current];
    const toAction = actionsRef.current[animName];

    if (fromAction && toAction) {
      fromAction.fadeOut(duration);
      toAction.reset().setEffectiveTimeScale(timeScale).setEffectiveWeight(1).fadeIn(duration).play();
    } else if (toAction) {
      toAction.reset().setEffectiveTimeScale(timeScale).play();
    }

    currentActionRef.current = animName;
  }, []);

  // Play a special action (one-shot or short loop)
  const playSpecialAction = useCallback(() => {
    const specials = [
      { name: MONKEY_ANIMS.eat, duration: 2.5, timeScale: 1.0 },
      { name: MONKEY_ANIMS.roar, duration: 1.5, timeScale: 1.0 },
      { name: MONKEY_ANIMS.smile, duration: 2.0, timeScale: 0.8 },
      { name: MONKEY_ANIMS.idle2, duration: 3.0, timeScale: 0.7 },
      { name: MONKEY_ANIMS.jump, duration: 1.0, timeScale: 1.2 },
    ];

    const special = specials[Math.floor(Math.random() * specials.length)];
    const action = actionsRef.current[special.name];

    if (action) {
      crossfadeTo(special.name, 0.2, special.timeScale);
      wanderState.current.isDoingSpecial = true;
      wanderState.current.specialDuration = special.duration;
      currentAnimRef.current = 'special';
    }
  }, [crossfadeTo]);

  // Animate: update mixer and wander around
  useFrame((_, delta) => {
    if (!groupRef.current || !modelRef.current) return;

    // Update animation mixer
    mixerRef.current?.update(delta);

    const pos = groupRef.current.position;
    const state = wanderState.current;
    const proc = proceduralState.current;

    // Update procedural animation phases
    proc.breathPhase += delta * 2;
    proc.lookPhase += delta * 0.5;
    proc.bobPhase += delta * 8;

    // Handle special action duration
    if (state.isDoingSpecial) {
      state.specialDuration -= delta;
      if (state.specialDuration <= 0) {
        state.isDoingSpecial = false;
        state.specialActionTime = 8 + Math.random() * 15; // Next special in 8-23 seconds
        crossfadeTo(MONKEY_ANIMS.idle, 0.3, 0.8);
        currentAnimRef.current = 'idle';
      }
      return; // Don't move during special actions
    }

    // Check for special action trigger (only when idle)
    if (!state.isMoving && state.waitTime > 0) {
      state.specialActionTime -= delta;
      if (state.specialActionTime <= 0) {
        playSpecialAction();
        return;
      }
    }

    // Waiting state - idle animation with procedural details
    if (state.waitTime > 0) {
      state.waitTime -= delta;

      if (state.isMoving) {
        state.isMoving = false;
        crossfadeTo(MONKEY_ANIMS.idle, 0.3, 0.8);
        currentAnimRef.current = 'idle';
      }

      // Subtle breathing/idle movement
      const breathOffset = Math.sin(proc.breathPhase) * 0.0001;
      modelRef.current.position.y = breathOffset;

      // Occasional look around (head/body slight rotation)
      const lookOffset = Math.sin(proc.lookPhase) * 0.15;
      modelRef.current.rotation.y = lookOffset;

      // Reset lean
      modelRef.current.rotation.x = 0;

    } else {
      // Moving state
      const dx = state.targetX - pos.x;
      const dz = state.targetZ - pos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < 0.3) {
        // Reached target, pick a new one
        state.waitTime = 2 + Math.random() * 4;
        const courtCenterX = position[0];
        const courtCenterZ = position[2];
        const wanderRadius = 5;
        state.targetX = courtCenterX + (Math.random() - 0.5) * wanderRadius * 2;
        state.targetZ = courtCenterZ + (Math.random() - 0.5) * wanderRadius * 2;
      } else {
        if (!state.isMoving) {
          state.isMoving = true;
          crossfadeTo(MONKEY_ANIMS.run, 0.2, 1.0);
          currentAnimRef.current = 'run';
        }

        // Move towards target
        const moveSpeed = state.speed * delta;
        pos.x += (dx / dist) * moveSpeed;
        pos.z += (dz / dist) * moveSpeed;

        // Smooth rotation to face movement direction
        proc.targetRotY = Math.atan2(dx, dz);
        let rotDiff = proc.targetRotY - proc.currentRotY;
        while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
        while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
        proc.currentRotY += rotDiff * Math.min(1, delta * 5);
        groupRef.current.rotation.y = proc.currentRotY;

        // Walking bob
        const bobOffset = Math.abs(Math.sin(proc.bobPhase)) * 0.0002;
        modelRef.current.position.y = bobOffset;

        // Slight body lean while running
        modelRef.current.rotation.x = 0.08;
        modelRef.current.rotation.y = 0;
      }
    }
  });

  return (
    <group ref={groupRef} position={position}>
      <group ref={modelRef}>
        <primitive object={model} scale={scale} />
      </group>
    </group>
  );
}

// Preload monkey model - disabled due to CDN issues
// useGLTF.preload(`${ASSETS_BASE}/models/Monkey/Monkey.glb`);

// Player info for console display
export interface PlayerInfo {
  id: string;
  username: string;
  color: string;
}

// Main world component
export function PlayWorld({
  avatarUrl,
  onPlayerPositionChange,
  onMultiplayerReady,
  onPlayersChange,
}: {
  avatarUrl?: string;
  onPlayerPositionChange?: (pos: THREE.Vector3) => void;
  onMultiplayerReady?: (data: { playerCount: number; isConnected: boolean }) => void;
  onPlayersChange?: (players: PlayerInfo[]) => void;
}) {
  const [playerPos, setPlayerPos] = useState(new THREE.Vector3(0, 0, 5));
  const playerRotation = useRef(new THREE.Euler());
  const [physicsDebug, setPhysicsDebug] = useState(false);
  const [weaponType, setWeaponType] = useState<WeaponType>(null);
  const setStoreWeapon = useCombatStore((s) => s.setWeapon);

  // Initialize combat sounds (plays weapon SFX on fire/reload)
  useCombatSounds({ enabled: true, volume: 1.0 });

  // Skybox/environment presets
  // 'hdri' uses custom equirectangular images from /skybox/ folder
  const SKYBOX_PRESETS = ['none', 'stars', 'sunset', 'night', 'dawn', 'hdri', 'warehouse', 'forest', 'city'] as const;
  type SkyboxPreset = typeof SKYBOX_PRESETS[number];

  // Leva controls for world/map editing - MAIN WORKSPACE
  const cityMapControls = useControls('🗺️ World', {
    'Skybox': folder({
      skyboxType: {
        value: 'hdri' as SkyboxPreset,
        options: SKYBOX_PRESETS as unknown as SkyboxPreset[],
        label: 'Type',
      },
      // HDRI settings (polyhaven.com/hdris/skies)
      'HDRI': folder({
        hdriFile: {
          value: 'hilly_terrain_4k.jpg',
          options: [
            'hilly_terrain_4k.jpg',           // Hilly terrain (default)
            'kloppenheim_02_puresky_4k.jpg',  // Clear blue sky
            'kloppenheim_03_puresky_4k.jpg',  // Blue sky variant
            'qwantani_noon_puresky_4k.jpg',   // Noon sky
            'goegap_road_4k.jpg',             // Road/landscape
          ],
          label: 'File',
        },
        hdriIntensity: { value: 1.0, min: 0.1, max: 3, step: 0.1, label: 'Intensity' },
        hdriBlur: { value: 0, min: 0, max: 1, step: 0.05, label: 'Blur' },
      }, { collapsed: true }),
      // Procedural sky (sunset/dawn/night)
      'Procedural': folder({
        sunPosition: { value: { x: 100, y: 20, z: 100 }, label: 'Sun Position' },
        turbidity: { value: 10, min: 0, max: 20, step: 0.5, label: 'Turbidity' },
        rayleigh: { value: 2, min: 0, max: 4, step: 0.1, label: 'Rayleigh' },
        mieCoefficient: { value: 0.005, min: 0, max: 0.1, step: 0.001, label: 'Mie Coeff' },
        mieDirectionalG: { value: 0.8, min: 0, max: 1, step: 0.05, label: 'Mie Dir G' },
      }, { collapsed: true }),
      // Stars (for 'stars' type)
      'Stars': folder({
        starsCount: { value: 5000, min: 1000, max: 20000, step: 1000, label: 'Count' },
        starsFactor: { value: 4, min: 1, max: 10, step: 0.5, label: 'Size' },
      }, { collapsed: true }),
    }, { collapsed: true }),
    'View Distance': folder({
      fogEnabled: { value: true, label: 'Enable Fog' },
      fogNear: { value: 50, min: 10, max: 200, step: 10, label: 'Fog Near' },
      fogFar: { value: 300, min: 50, max: 1000, step: 25, label: 'Fog Far' },
      fogColor: { value: '#0a0a0f', label: 'Fog Color' },
      starsRadius: { value: 200, min: 50, max: 500, step: 25, label: 'Stars Radius' },
    }, { collapsed: true }),
    'City': folder({
      enabled: { value: true, label: 'Show City' },
      posX: { value: 0, min: -500, max: 500, step: 5 },
      posY: { value: 0, min: -50, max: 50, step: 1 },
      posZ: { value: 80, min: -500, max: 500, step: 5, label: 'Distance (Z)' },
      scale: { value: 0.01, min: 0.001, max: 0.1, step: 0.001, label: 'Scale (0.01=100m buildings)' },
      enableColliders: { value: true, label: 'Building Colliders' },
      useHull: { value: true, label: 'Hull (fast) vs Trimesh' },
    }, { collapsed: false }),
  }, { collapsed: false });

  // Weapon toggle (Q key) - cycles: none -> pistol -> rifle -> none
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyQ') {
        e.preventDefault();
        setWeaponType(prev => {
          const next = prev === null ? 'pistol' : prev === 'pistol' ? 'rifle' : null;
          console.log('🔫 Weapon:', next || 'none');
          return next;
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Sync weapon state with combat store (for aim/fire/crosshair)
  useEffect(() => {
    const storeWeapon = weaponType === null ? 'none' : weaponType;
    setStoreWeapon(storeWeapon);
  }, [weaponType, setStoreWeapon]);

  // Physics debug toggle (F3 key)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'F3') {
        e.preventDefault();
        setPhysicsDebug(prev => {
          console.log(`🔧 Physics debug: ${!prev ? 'ON' : 'OFF'}`);
          return !prev;
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Multiplayer - connect to play room
  const { otherPlayers, playerCount, isConnected, updatePosition } = usePlayMultiplayer({
    enabled: true,
    avatarUrl,
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
    }
    onPlayerPositionChange?.(pos);

    // Derive animation name for network sync
    const animationName = animState ? getAnimationName(animState, weaponType) : 'idle';

    // Update multiplayer position with animation state and weapon
    updatePosition(pos, playerRotation.current, animationName, weaponType ?? 'none');
  }, [onPlayerPositionChange, updatePosition, getAnimationName, weaponType]);

  const zones = [
    { position: [15, 2, -15] as [number, number, number], label: 'Studio District', icon: Mic2, color: '#8b5cf6', description: 'Create & collaborate' },
    { position: [-15, 2, -15] as [number, number, number], label: 'Business Hub', icon: Briefcase, color: '#22c55e', description: 'Deals & contracts' },
    { position: [0, 2, -25] as [number, number, number], label: 'Social Plaza', icon: Users, color: '#f59e0b', description: 'Network & connect' },
    { position: [-20, 2, 5] as [number, number, number], label: 'Marketplace', icon: Music, color: '#ec4899', description: 'Buy & sell assets' },
    { position: [20, 2, 5] as [number, number, number], label: 'Game Arena', icon: Gamepad2, color: '#06b6d4', description: 'Compete & earn' },
  ];

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[10, 20, 10]}
        intensity={1}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <pointLight position={[-15, 8, -15]} intensity={1} color="#8b5cf6" distance={30} />
      <pointLight position={[15, 8, -15]} intensity={1} color="#22c55e" distance={30} />
      <pointLight position={[0, 5, 5]} intensity={0.5} color="#8b5cf6" distance={20} />
      <hemisphereLight args={['#8b5cf6', '#0a0a0f', 0.3]} />

      {/* Environment - fog/view distance controlled via Leva */}
      {cityMapControls.fogEnabled && (
        <fog attach="fog" args={[cityMapControls.fogColor, cityMapControls.fogNear, cityMapControls.fogFar]} />
      )}

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
      )}

      {/* Custom HDRI skybox - equirectangular images */}
      {cityMapControls.skyboxType === 'hdri' && (
        <Suspense fallback={<color attach="background" args={['#87CEEB']} />}>
          <HDRISkybox
            file={cityMapControls.hdriFile}
            intensity={cityMapControls.hdriIntensity}
            blur={cityMapControls.hdriBlur}
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
          {/* Ground Collider */}
          <RigidBody type="fixed" colliders={false}>
            <CuboidCollider args={[250, 0.1, 250]} position={[0, -0.1, 0]} />
          </RigidBody>

          {/* Ground Visual */}
          <CyberpunkGround />

          {/* Basketball Court */}
          <Suspense fallback={null}>
            <BasketballCourt />
            {/* Animated Monkey NPC on the court */}
            <MonkeyNPC position={[32, 0.01, -18]} />
          </Suspense>

          {/* NeoTokyo City Map */}
          {cityMapControls.enabled && (
            <Suspense fallback={null}>
              <NeoTokyoMap
                position={[cityMapControls.posX, cityMapControls.posY, cityMapControls.posZ]}
                scale={cityMapControls.scale}
                enableBuildingColliders={cityMapControls.enableColliders}
                useHullColliders={cityMapControls.useHull}
              />
            </Suspense>
          )}

          {/* Physics Player Controller with animation state */}
          <PhysicsPlayerController onPositionChange={handlePositionChange}>
            {({ isMoving, isRunning, isGrounded, isJumping, isDancing, isCrouching, isStrafingLeft, isStrafingRight, isAiming, isFiring, velocityY, aimPitch }) => (
              <Suspense fallback={<PlaceholderAvatar isMoving={false} />}>
                {avatarUrl ? (
                  USE_MIXAMO_ANIMATIONS ? (
                    <AnimationErrorBoundary
                      fallback={<AnimatedAvatar url={avatarUrl} isMoving={isMoving} isRunning={isRunning} />}
                    >
                      <MixamoAnimatedAvatar
                        url={avatarUrl}
                        isMoving={isMoving}
                        isRunning={isRunning}
                        isGrounded={isGrounded}
                        isJumping={isJumping}
                        isDancing={isDancing}
                        isCrouching={isCrouching}
                        isStrafingLeft={isStrafingLeft}
                        isStrafingRight={isStrafingRight}
                        isAiming={isAiming}
                        isFiring={isFiring}
                        velocityY={velocityY}
                        weaponType={weaponType}
                        aimPitch={aimPitch}
                      />
                    </AnimationErrorBoundary>
                  ) : (
                    <AnimatedAvatar url={avatarUrl} isMoving={isMoving} isRunning={isRunning} />
                  )
                ) : (
                  <PlaceholderAvatar isMoving={isMoving} />
                )}
              </Suspense>
            )}
          </PhysicsPlayerController>

          {/* Contact shadow - sits just above ground */}
          <ContactShadows
            position={[playerPos.x, 0.005, playerPos.z]}
            opacity={0.6}
            scale={10}
            blur={1.5}
            far={3}
            color="#8b5cf6"
          />
        </Physics>
      </Suspense>

      {/* Other Players (multiplayer) - outside physics for performance */}
      <OtherPlayers players={otherPlayers} />

      {/* Zones */}
      {zones.map((zone) => (
        <ZoneMarker key={zone.label} {...zone} />
      ))}

      {/* Spawn indicator - at basketball court center */}
      <mesh position={[30, 0.006, -20]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.8, 1, 32]} />
        <meshBasicMaterial color="#8b5cf6" transparent opacity={0.3} />
      </mesh>

      {/* VFX Manager - renders all active visual effects */}
      <VFXManager />

      {/* NPC Manager - renders all NPCs in scene (server-controlled when multiplayer connected) */}
      <NPCManager
        playerPosition={{ x: playerPos.x, y: playerPos.y, z: playerPos.z }}
        renderDistance={50}
        multiplayerEnabled={isConnected}
        initialNPCs={[
          // Wandering NPC near spawn
          createNPC({
            position: { x: 5, y: 0, z: 0 },
            behavior: 'wander',
            name: 'Producer Bob',
            type: 'friendly',
          }),
          // Patrolling NPC around the zones
          createPatrolNPC(
            'Guard',
            [
              { x: 10, y: 0, z: -10 },
              { x: -10, y: 0, z: -10 },
              { x: -10, y: 0, z: 10 },
              { x: 10, y: 0, z: 10 },
            ],
            { type: 'neutral' }
          ),
          // Idle NPC at marketplace
          createNPC({
            position: { x: -20, y: 0, z: 5 },
            behavior: 'idle',
            name: 'Merchant',
            type: 'friendly',
          }),
        ]}
      />
    </>
  );
}
