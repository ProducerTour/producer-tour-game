/**
 * Physics-based Player Controller
 * Uses Rapier for physics simulation with smooth acceleration
 *
 * REFACTORED: Now uses separated hooks for ground detection, air state, and movement.
 * See ARCHITECTURE_ANALYSIS.md and REFACTOR_PLAN.md for design rationale.
 */

import { useRef, useMemo, useEffect, useState, type ReactNode } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { RigidBody, CapsuleCollider, useRapier, type RapierRigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import { useControls, folder } from 'leva';
import { useKeyboardControls } from './hooks/useKeyboardControls';
import { useCombatStore } from './combat/useCombatStore';
import { useRecoil } from './combat/useRecoil';
import { useHitDetection } from './combat/useHitDetection';
import { useDevStore } from './debug/useDevStore';
// New modular hooks (Phase 1 refactor)
import { useGroundDetection } from './hooks/useGroundDetection';
import { useAirState } from './hooks/useAirState';
import { useCharacterMovement } from './hooks/useCharacterMovement';
import { useSlopeAlignment } from './hooks/useSlopeAlignment';
// Terrain-aware footstep audio
import { useTerrainFootsteps } from './audio/useTerrainFootsteps';
import { terrainGenerator } from '../../lib/terrain';

// Movement constants now in useCharacterMovement hook
// Only JUMP_FORCE remains here (physics, not movement)
const JUMP_FORCE = 5;

// Crouch settings - REALISTIC HUMAN SCALE (1 unit = 1 meter)
// Standing: total height ~1.7m (half-height 0.55 + radius 0.3 * 2)
// Crouching: total height ~1.0m
const STANDING_HALF_HEIGHT = 0.55;  // Capsule half-height when standing
const CROUCHING_HALF_HEIGHT = 0.2;  // Capsule half-height when crouching
const STANDING_Y_OFFSET = 0.85;     // Collider Y offset when standing (0.55 + 0.3)
const CROUCHING_Y_OFFSET = 0.5;     // Collider Y offset when crouching (flush with ground)

// Physics stability - prevents explosions and glitches
const MAX_VELOCITY = 15;            // Cap horizontal velocity
const MAX_FALL_SPEED = 20;          // Cap falling speed
const MIN_GROUND_Y = -10;           // Minimum Y position (fall recovery threshold)

// Camera collision
const CAMERA_COLLISION_OFFSET = 0.3;  // Pull camera in front of walls
const MIN_CAMERA_DISTANCE = 1.5;      // Minimum distance from player
const CAMERA_COLLISION_RADIUS = 25;   // Only raycast against objects within this radius
const COLLISION_CACHE_INTERVAL = 200; // Rebuild nearby objects cache every 200ms

// Noclip mode (flying through walls)
const NOCLIP_SPEED = 10;              // Base fly speed
const NOCLIP_FAST_MULTIPLIER = 3;     // Speed when holding sprint

// Spawn position - high enough to be above any terrain (will fall to ground)
// Terrain generates 0-40m base + ridges, so 80m should be safe
const SPAWN_POSITION: [number, number, number] = [0, 80, 0];

// === PLAYER AIR STATE - Single authoritative state for animation ===
// Replaces multiple timing variables to prevent race conditions
export enum PlayerAirState {
  GROUNDED = 'grounded',   // On solid ground
  JUMPING = 'jumping',     // User-initiated jump (ascending or early descent)
  FALLING = 'falling',     // Uncontrolled fall (walked off edge OR late descent)
  LANDING = 'landing',     // Just touched down (brief window for landing animation)
}

// Animation state passed to children
export interface AnimationState {
  isMoving: boolean;
  isRunning: boolean;
  isGrounded: boolean;
  isJumping: boolean;
  isFalling: boolean;      // NEW: Uncontrolled fall state
  isLanding: boolean;      // NEW: Brief landing state
  isDancing: boolean;
  isCrouching: boolean;
  isStrafingLeft: boolean;
  isStrafingRight: boolean;
  isAiming: boolean;
  isFiring: boolean;
  velocity: number;
  velocityY: number;       // Vertical velocity for fall detection
  aimPitch: number;        // Camera pitch for upper body aiming (radians)
  airState: PlayerAirState; // NEW: Single authoritative state
}

// Props that will be passed to avatar children (legacy)
export interface AvatarAnimationProps {
  isMoving: boolean;
  isRunning: boolean;
  isGrounded: boolean;
}

interface PhysicsPlayerControllerProps {
  onPositionChange?: (pos: THREE.Vector3, rotation?: THREE.Euler, animState?: AnimationState) => void;
  children?: ReactNode | ((state: AnimationState) => ReactNode);
}

export function PhysicsPlayerController({
  onPositionChange,
  children,
}: PhysicsPlayerControllerProps) {
  const keys = useKeyboardControls();
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  const groupRef = useRef<THREE.Group>(null);
  const { camera, gl, scene } = useThree();
  const { rapier, world } = useRapier();

  // Combat store for aim/fire state - use selectors to prevent re-renders
  const currentWeapon = useCombatStore((s) => s.currentWeapon);
  const isAiming = useCombatStore((s) => s.isAiming);
  const setAiming = useCombatStore((s) => s.setAiming);
  const isFiring = useCombatStore((s) => s.isFiring);
  const setFiring = useCombatStore((s) => s.setFiring);

  // Recoil system (bloom + camera kick)
  const { getCurrentSpread, onFire: applyRecoil, getRecoilOffset, reset: resetRecoil } = useRecoil();

  // Hit detection with recoil integration
  const { fireWeapon } = useHitDetection({
    getCurrentSpread,
    onFire: applyRecoil,
  });

  // Reset recoil when weapon changes
  useEffect(() => {
    resetRecoil();
  }, [currentWeapon, resetRecoil]);

  // Dev store for noclip and speed multiplier
  const { noclip, speedMultiplier } = useDevStore();

  // === NEW MODULAR HOOKS (Phase 1 Refactor) ===
  // These will gradually replace inline calculations
  const groundDetection = useGroundDetection({
    rigidBody: rigidBodyRef.current,
    world,
    rapier,
  });
  const airStateMachine = useAirState();
  const movementCalculator = useCharacterMovement();
  const slopeAlignment = useSlopeAlignment();

  // Terrain-aware footstep sounds (auto-detects biome/surface)
  const terrainFootsteps = useTerrainFootsteps({
    terrainGen: terrainGenerator,
    enabled: true,
    volume: 0.5,
  });

  // All modular hooks are now used in useFrame

  // Leva controls for player spawn
  const playerControls = useControls('🎮 Player', {
    spawnHeight: { value: 80, min: 0, max: 150, step: 5, label: 'Spawn Height' },
    respawn: {
      value: false,
      label: '🔄 Respawn',
      onChange: (v: boolean) => {
        if (v && rigidBodyRef.current) {
          const spawnY = playerControls.spawnHeight;
          rigidBodyRef.current.setTranslation({ x: 0, y: spawnY, z: 0 }, true);
          rigidBodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
        }
      },
    },
  }, { collapsed: true });

  // Leva controls for camera
  const cameraControls = useControls('🎥 Camera', {
    'Normal': folder({
      distance: { value: 3, min: 2, max: 12, step: 0.5 },
      heightOffset: { value: 1.2, min: 0, max: 4, step: 0.1 },
      shoulderOffset: { value: 0.8, min: -2, max: 2, step: 0.1 },
      fov: { value: 75, min: 40, max: 120, step: 1 },
    }, { collapsed: true }),
    'Aiming': folder({
      previewAim: { value: false, label: '👁 Preview Aim' },
      aimDistance: { value: 2.5, min: 1.5, max: 6, step: 0.25 },
      aimShoulderOffset: { value: 1, min: -2, max: 2, step: 0.1 },
      aimHeightOffset: { value: 1.7, min: 0.5, max: 3, step: 0.1 },
      aimFov: { value: 55, min: 25, max: 90, step: 1 },
      aimTransitionSpeed: { value: 8, min: 2, max: 20, step: 1 },
    }, { collapsed: true }),
  }, { collapsed: true });

  // Track current FOV for smooth interpolation
  const currentFov = useRef(75);

  // Minimum fire animation duration (semi-auto feel, prevents spam)
  const MIN_FIRE_DURATION = 200; // ms
  const lastFireStart = useRef<number>(0);

  // Animation state (React state for children)
  const [animState, setAnimState] = useState<AnimationState>({
    isMoving: false,
    isRunning: false,
    isGrounded: true,
    isJumping: false,
    isFalling: false,
    isLanding: false,
    isDancing: false,
    isCrouching: false,
    isStrafingLeft: false,
    isStrafingRight: false,
    isAiming: false,
    isFiring: false,
    velocity: 0,
    velocityY: 0,
    aimPitch: 0,
    airState: PlayerAirState.GROUNDED,
  });

  // Movement state
  // Initialize facing away from camera (camera starts at +Z, so face -Z = PI radians)
  const facingAngle = useRef(Math.PI);
  const lastAnimState = useRef({ isMoving: false, isRunning: false, isGrounded: true });

  // Air state is now managed by useAirState hook (single source of truth for jump/fall/land)

  // Crouch state for collider adjustment
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const colliderRef = useRef<any>(null);
  const isCrouchingRef = useRef(false);

  // Aim mode camera transition (0 = normal, 1 = fully aimed)
  const aimTransition = useRef(0);

  // Reusable vectors to avoid GC pressure
  const vectors = useMemo(() => ({
    cameraDir: new THREE.Vector3(),
    cameraRight: new THREE.Vector3(),
    up: new THREE.Vector3(0, 1, 0),
    position: new THREE.Vector3(SPAWN_POSITION[0], SPAWN_POSITION[1], SPAWN_POSITION[2]),
    rotation: new THREE.Euler(),
    desiredCameraPos: new THREE.Vector3(),
    desiredLookTarget: new THREE.Vector3(),
    // Camera collision
    playerHead: new THREE.Vector3(),
    rayDir: new THREE.Vector3(),
    raycaster: new THREE.Raycaster(),
  }), []);

  // Camera follow state
  const smoothCameraPos = useRef(new THREE.Vector3(
    SPAWN_POSITION[0],
    SPAWN_POSITION[1] + 3,
    SPAWN_POSITION[2] + 8
  ));
  const smoothLookTarget = useRef(new THREE.Vector3(
    SPAWN_POSITION[0],
    SPAWN_POSITION[1] + 1,
    SPAWN_POSITION[2]
  ));
  const orbitAngle = useRef(0);
  const pitchAngle = useRef(0.3);
  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const isPointerLocked = useRef(false);

  // Camera collision optimization - cache nearby objects to avoid full scene raycast
  const nearbyCollisionObjects = useRef<THREE.Object3D[]>([]);
  const lastCollisionCacheUpdate = useRef(0);
  const collisionCacheCenter = useRef(new THREE.Vector3());

  // Get collider reference from rigid body for crouch adjustment
  useEffect(() => {
    // Small delay to ensure physics world is initialized
    const timeout = setTimeout(() => {
      if (rigidBodyRef.current) {
        const rb = rigidBodyRef.current;
        // Get the first collider attached to this rigid body
        if (rb.numColliders() > 0) {
          colliderRef.current = rb.collider(0);
        }
      }
    }, 100);

    return () => clearTimeout(timeout);
  }, []);

  // Listen for teleport command from dev console
  useEffect(() => {
    const handleTeleport = (e: CustomEvent<{ x: number; y: number; z: number }>) => {
      if (rigidBodyRef.current) {
        const { x, y, z } = e.detail;
        rigidBodyRef.current.setTranslation({ x, y, z }, true);
        rigidBodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
        movementCalculator.reset(); // Reset movement state on teleport
        slopeAlignment.reset();     // Reset slope tilt on teleport
        console.log(`Teleported to (${x}, ${y}, ${z})`);
      }
    };

    window.addEventListener('devConsole:teleport', handleTeleport as EventListener);
    return () => window.removeEventListener('devConsole:teleport', handleTeleport as EventListener);
  }, [movementCalculator, slopeAlignment]);

  // Mouse camera orbit with pointer lock when weapon equipped
  useEffect(() => {
    const canvas = gl.domElement;
    const sensitivity = 0.003;
    const aimSensitivity = 0.002; // Slightly slower when aiming
    const pointerLockSensitivity = 0.002; // Sensitivity for pointer lock mode

    // Handle pointer lock changes
    const onPointerLockChange = () => {
      isPointerLocked.current = document.pointerLockElement === canvas;
      if (isPointerLocked.current) {
        canvas.style.cursor = 'none';
      } else {
        canvas.style.cursor = currentWeapon !== 'none' ? 'crosshair' : 'grab';
      }
    };

    const onMouseDown = (e: MouseEvent) => {
      // Left-click (button 0) - orbit camera (or fire when aiming, handled in useKeyboardControls)
      // Right-click (button 2) - aim (handled in useKeyboardControls) or orbit if no weapon
      if (e.button === 0) {
        // Only orbit with left-click if NOT aiming and no weapon
        if (!isAiming && currentWeapon === 'none') {
          isDragging.current = true;
          lastMouse.current = { x: e.clientX, y: e.clientY };
        }
      } else if (e.button === 2) {
        // Right-click: orbit only if no weapon equipped
        if (currentWeapon === 'none') {
          isDragging.current = true;
          lastMouse.current = { x: e.clientX, y: e.clientY };
        }
      }
    };

    const onMouseUp = () => {
      isDragging.current = false;
    };

    const onMouseMove = (e: MouseEvent) => {
      // Pointer lock mode - use movementX/Y for smooth FPS-style camera
      if (isPointerLocked.current) {
        const sens = isAiming ? aimSensitivity : pointerLockSensitivity;
        orbitAngle.current -= e.movementX * sens;
        // Pitch range: -0.6 (look up ~34°) to 1.2 (look down ~69°)
        pitchAngle.current = Math.max(-0.6, Math.min(1.2, pitchAngle.current + e.movementY * sens));
        return;
      }

      // When aiming without pointer lock, mouse ALWAYS controls camera look
      if (isAiming) {
        const sens = aimSensitivity;
        orbitAngle.current -= (e.clientX - lastMouse.current.x) * sens;
        // Pitch range: -0.6 (look up ~34°) to 1.2 (look down ~69°)
        pitchAngle.current = Math.max(-0.6, Math.min(1.2, pitchAngle.current + (e.clientY - lastMouse.current.y) * sens));
        lastMouse.current = { x: e.clientX, y: e.clientY };
        return;
      }

      // Normal orbit when dragging (no weapon)
      if (!isDragging.current) return;
      orbitAngle.current -= (e.clientX - lastMouse.current.x) * sensitivity;
      // Pitch range: -0.6 (look up ~34°) to 1.2 (look down ~69°)
      pitchAngle.current = Math.max(-0.6, Math.min(1.2, pitchAngle.current + (e.clientY - lastMouse.current.y) * sensitivity));
      lastMouse.current = { x: e.clientX, y: e.clientY };
    };

    const onContextMenu = (e: Event) => e.preventDefault();

    // Update cursor based on weapon state
    canvas.style.cursor = currentWeapon !== 'none' ? 'crosshair' : 'grab';

    // Automatically request pointer lock when weapon is equipped
    if (currentWeapon !== 'none' && !isPointerLocked.current) {
      canvas.requestPointerLock?.();
    }

    // Exit pointer lock when weapon is unequipped
    if (currentWeapon === 'none' && isPointerLocked.current) {
      document.exitPointerLock?.();
    }

    document.addEventListener('pointerlockchange', onPointerLockChange);
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('contextmenu', onContextMenu);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      document.removeEventListener('pointerlockchange', onPointerLockChange);
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('contextmenu', onContextMenu);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [gl, isAiming, currentWeapon]);

  // Sync aim/fire keys with combat store
  useEffect(() => {
    // Only aim if we have a weapon equipped
    const shouldAim = keys.aim && currentWeapon !== 'none';
    if (shouldAim !== isAiming) {
      setAiming(shouldAim);
    }
  }, [keys.aim, currentWeapon, isAiming, setAiming]);

  // Track firing state for animation with minimum duration (prevents spam clicking)
  useEffect(() => {
    const shouldFire = keys.fire && currentWeapon !== 'none';

    if (shouldFire && !isFiring) {
      // Starting to fire - record start time
      lastFireStart.current = Date.now();
      setFiring(true);
    } else if (!shouldFire && isFiring) {
      // Trying to stop firing - check if minimum duration has passed
      const elapsed = Date.now() - lastFireStart.current;
      if (elapsed >= MIN_FIRE_DURATION) {
        setFiring(false);
      } else {
        // Wait for minimum duration before stopping
        const remaining = MIN_FIRE_DURATION - elapsed;
        setTimeout(() => {
          // Only stop if still not pressing fire
          if (!keys.fire) {
            setFiring(false);
          }
        }, remaining);
      }
    }
  }, [keys.fire, currentWeapon, isFiring, setFiring]);

  useFrame((_, delta) => {
    const rb = rigidBodyRef.current;
    const { cameraDir, cameraRight, up, position, rotation, desiredCameraPos, desiredLookTarget, playerHead, rayDir, raycaster } = vectors;

    // Get position
    if (rb) {
      const t = rb.translation();
      position.set(t.x, t.y, t.z);
    }

    // Continuous fire while holding button (fireWeapon handles rate limiting + hit detection)
    if (isFiring && currentWeapon !== 'none') {
      fireWeapon();
    }

    // Apply camera recoil (pitch goes up, yaw sways randomly)
    const recoil = getRecoilOffset();
    if (recoil.pitch !== 0 || recoil.yaw !== 0) {
      // Pitch: negative = look up (recoil kicks camera up)
      pitchAngle.current = Math.max(-0.6, Math.min(1.2, pitchAngle.current - recoil.pitch * 0.5));
      // Yaw: orbit the camera
      orbitAngle.current -= recoil.yaw * 0.5;
    }

    // === AIM CAMERA TRANSITION ===
    // Smoothly interpolate between normal and aim camera
    // Use preview toggle OR actual aiming state
    const effectiveAiming = cameraControls.previewAim || isAiming;
    const targetAimT = effectiveAiming ? 1 : 0;
    const transitionSpeed = cameraControls.aimTransitionSpeed;
    aimTransition.current += (targetAimT - aimTransition.current) * Math.min(1, transitionSpeed * delta);
    const aimT = aimTransition.current;

    // Camera - smoother interpolation using Leva controls
    // Normal camera: configurable distance, centered behind player
    // Aim camera: configurable distance, offset right (over-the-shoulder)
    const normalDist = cameraControls.distance;
    const aimDist = cameraControls.aimDistance;
    const maxDist = normalDist + (aimDist - normalDist) * aimT;

    const hDist = maxDist * Math.cos(pitchAngle.current);
    const normalVOff = normalDist * Math.sin(pitchAngle.current) + cameraControls.heightOffset;
    // Aim camera also responds to pitch so you can look up/down while aiming
    const aimVOff = aimDist * Math.sin(pitchAngle.current) + cameraControls.aimHeightOffset;
    const vOff = normalVOff + (aimVOff - normalVOff) * aimT;

    // Horizontal offset for over-the-shoulder - interpolate from normal to aim
    const normalShoulder = cameraControls.shoulderOffset;
    const aimShoulder = cameraControls.aimShoulderOffset;
    const shoulderOffsetX = normalShoulder + (aimShoulder - normalShoulder) * aimT;

    // Calculate camera right direction for shoulder offset
    const camRight = new THREE.Vector3(
      Math.cos(orbitAngle.current),
      0,
      -Math.sin(orbitAngle.current)
    );

    // Calculate desired camera position
    desiredCameraPos.set(
      position.x + Math.sin(orbitAngle.current) * hDist + camRight.x * shoulderOffsetX,
      position.y + vOff,
      position.z + Math.cos(orbitAngle.current) * hDist + camRight.z * shoulderOffsetX
    );

    // Camera collision - raycast from player head toward desired camera position
    playerHead.set(position.x, position.y + 1.5, position.z);
    rayDir.subVectors(desiredCameraPos, playerHead).normalize();
    const rayDistance = playerHead.distanceTo(desiredCameraPos);

    raycaster.set(playerHead, rayDir);
    raycaster.far = rayDistance;

    // Update nearby collision objects cache periodically (not every frame)
    const now = Date.now();
    const playerMoved = collisionCacheCenter.current.distanceTo(playerHead) > 5;
    if (now - lastCollisionCacheUpdate.current > COLLISION_CACHE_INTERVAL || playerMoved) {
      lastCollisionCacheUpdate.current = now;
      collisionCacheCenter.current.copy(playerHead);

      // Collect meshes within collision radius
      const nearby: THREE.Object3D[] = [];
      const collectMeshes = (obj: THREE.Object3D) => {
        // Skip player and sprites
        if (obj.userData?.isPlayer || obj.type === 'Sprite') return;

        if (obj.type === 'Mesh') {
          const mesh = obj as THREE.Mesh;
          // Quick distance check using world position
          const worldPos = new THREE.Vector3();
          mesh.getWorldPosition(worldPos);
          if (worldPos.distanceTo(playerHead) < CAMERA_COLLISION_RADIUS) {
            nearby.push(mesh);
          }
        }
        // Recurse into groups/objects but not too deep
        for (const child of obj.children) {
          collectMeshes(child);
        }
      };

      // Only traverse top-level scene children (terrain chunks, etc.)
      for (const child of scene.children) {
        collectMeshes(child);
      }
      nearbyCollisionObjects.current = nearby;
    }

    // Raycast against cached nearby objects only (much faster than full scene)
    const intersects = raycaster.intersectObjects(nearbyCollisionObjects.current, false);

    // Filter out non-mesh objects and find closest valid hit
    let actualDist = rayDistance;
    for (const hit of intersects) {
      // Skip if it's the player or UI elements (double-check)
      if (hit.object.userData?.isPlayer || hit.object.type === 'Sprite') continue;

      if (hit.distance < actualDist) {
        actualDist = Math.max(MIN_CAMERA_DISTANCE, hit.distance - CAMERA_COLLISION_OFFSET);
        break; // Use first valid hit
      }
    }

    // Adjust camera position if collision detected
    if (actualDist < rayDistance) {
      desiredCameraPos.copy(playerHead).addScaledVector(rayDir, actualDist);
    }

    // Use consistent lerp factor regardless of frame rate
    const cameraSmoothFactor = Math.min(1, 8 * delta);
    const lookSmoothFactor = Math.min(1, 12 * delta);

    smoothCameraPos.current.lerp(desiredCameraPos, cameraSmoothFactor);

    // Calculate look target in front of player based on pitch
    // Negative pitch = looking up = look target higher
    // Positive pitch = looking down = look target lower
    // Use sin instead of tan for bounded, smoother offset values
    const lookDistance = 15; // How far ahead to project the look target
    const camForwardX = -Math.sin(orbitAngle.current);
    const camForwardZ = -Math.cos(orbitAngle.current);
    const lookHeightOffset = -Math.sin(pitchAngle.current) * lookDistance;

    desiredLookTarget.set(
      position.x + camForwardX * lookDistance + camRight.x * shoulderOffsetX,
      position.y + 1.5 + lookHeightOffset,
      position.z + camForwardZ * lookDistance + camRight.z * shoulderOffsetX
    );
    smoothLookTarget.current.lerp(desiredLookTarget, lookSmoothFactor);

    camera.position.copy(smoothCameraPos.current);
    camera.lookAt(smoothLookTarget.current);

    // === FOV INTERPOLATION ===
    // Smoothly transition FOV between normal and aim values
    const targetFov = effectiveAiming ? cameraControls.aimFov : cameraControls.fov;
    currentFov.current += (targetFov - currentFov.current) * Math.min(1, transitionSpeed * delta);

    // Apply FOV to camera (only PerspectiveCamera has fov)
    if ((camera as THREE.PerspectiveCamera).isPerspectiveCamera) {
      const perspCamera = camera as THREE.PerspectiveCamera;
      if (Math.abs(perspCamera.fov - currentFov.current) > 0.01) {
        perspCamera.fov = currentFov.current;
        perspCamera.updateProjectionMatrix();
      }
    }

    if (!rb) return;

    // === NOCLIP MODE (Flying through walls) ===
    if (noclip) {
      // In noclip mode, disable physics and fly freely
      rb.setGravityScale(0, true);

      // Calculate movement direction based on camera
      camera.getWorldDirection(cameraDir);
      cameraRight.crossVectors(cameraDir, up).normalize();

      // Get input
      let moveX = 0, moveY = 0, moveZ = 0;
      if (keys.forward) {
        moveX += cameraDir.x;
        moveY += cameraDir.y;
        moveZ += cameraDir.z;
      }
      if (keys.backward) {
        moveX -= cameraDir.x;
        moveY -= cameraDir.y;
        moveZ -= cameraDir.z;
      }
      if (keys.left) {
        moveX -= cameraRight.x;
        moveZ -= cameraRight.z;
      }
      if (keys.right) {
        moveX += cameraRight.x;
        moveZ += cameraRight.z;
      }
      if (keys.jump) {
        moveY += 1; // Go up with Space
      }
      if (keys.crouch) {
        moveY -= 1; // Go down with Ctrl/C
      }

      // Normalize if moving diagonally
      const moveLen = Math.sqrt(moveX * moveX + moveY * moveY + moveZ * moveZ);
      if (moveLen > 0) {
        moveX /= moveLen;
        moveY /= moveLen;
        moveZ /= moveLen;
      }

      // Calculate speed
      let flySpeed = NOCLIP_SPEED * speedMultiplier;
      if (keys.sprint) {
        flySpeed *= NOCLIP_FAST_MULTIPLIER;
      }

      // Apply movement directly to position (bypassing physics)
      const currentPos = rb.translation();
      rb.setTranslation({
        x: currentPos.x + moveX * flySpeed * delta,
        y: currentPos.y + moveY * flySpeed * delta,
        z: currentPos.z + moveZ * flySpeed * delta,
      }, true);

      // Zero out velocity to prevent drift
      rb.setLinvel({ x: 0, y: 0, z: 0 }, true);

      // Update position for camera/callbacks
      const t = rb.translation();
      position.set(t.x, t.y, t.z);

      // Rotate character to face camera direction (horizontal only)
      if (moveLen > 0) {
        facingAngle.current = Math.atan2(cameraDir.x, cameraDir.z);
      }

      if (groupRef.current) {
        groupRef.current.rotation.y = facingAngle.current;
      }

      // Update animation state for noclip (flying idle)
      const noclipAnimState: AnimationState = {
        isMoving: moveLen > 0,
        isRunning: false,
        isGrounded: false,
        isJumping: true, // Shows floating animation
        isFalling: false,
        isLanding: false,
        isDancing: false,
        isCrouching: false,
        isStrafingLeft: false,
        isStrafingRight: false,
        isAiming: false,
        isFiring: false,
        velocity: moveLen > 0 ? flySpeed : 0,
        velocityY: moveY * flySpeed,
        aimPitch: pitchAngle.current,
        airState: PlayerAirState.JUMPING, // Flying = jumping state
      };

      if (onPositionChange) {
        rotation.set(0, facingAngle.current, 0);
        onPositionChange(position.clone(), rotation.clone(), noclipAnimState);
      }

      setAnimState(noclipAnimState);
      return; // Skip normal physics
    } else {
      // Restore gravity when exiting noclip
      rb.setGravityScale(1.2, true);
    }

    const linvel = rb.linvel();

    // === GROUND DETECTION (using modular hook) ===
    const groundState = groundDetection.detectGround();
    const grounded = groundState.isGrounded;

    // === MOVEMENT CALCULATION (using modular hook) ===
    // Get camera direction for relative movement
    camera.getWorldDirection(cameraDir);

    const movementState = movementCalculator.calculate({
      input: {
        forward: keys.forward,
        backward: keys.backward,
        left: keys.left,
        right: keys.right,
        sprint: keys.sprint,
        crouch: keys.crouch,
      },
      cameraDirection: cameraDir,
      isGrounded: grounded,
      isAiming,
      isFiring,
      speedMultiplier,
      delta,
    });

    // Update facing angle from hook
    facingAngle.current = movementState.facingAngle;

    // Extract movement state
    const hasInput = movementState.isMoving;
    const wantsToCrouch = movementState.isCrouching;

    // Apply velocity from hook
    let vx = movementState.currentVelocityX;
    let vy = linvel.y;
    let vz = movementState.currentVelocityZ;

    // === AIR STATE MACHINE (single source of truth for jump state) ===
    // The air state machine now handles all jump timing - use its canJump instead of local refs
    const jumpKeyPressed = keys.jump;
    const airStateResult = airStateMachine.update({
      groundState,
      positionY: position.y,  // For distance-based fall detection
      jumpRequested: jumpKeyPressed,  // Let air state machine decide if we CAN jump
      delta,
    });

    // === JUMP ===
    // Use air state machine's canJump as single source of truth
    // This eliminates the duplicate state tracking that was causing inconsistency
    const shouldJump = (jumpKeyPressed && airStateResult.canJump) || airStateResult.shouldExecuteBufferedJump;
    if (shouldJump) {
      vy = JUMP_FORCE;
      // Notify air state machine that a jump was executed (it tracks hasJumped internally)
      airStateMachine.notifyJump();
    }

    // === VELOCITY CLAMPING - Prevents physics explosions ===
    // Clamp horizontal velocity to prevent runaway speeds
    const horizontalSpeed = Math.sqrt(vx * vx + vz * vz);
    if (horizontalSpeed > MAX_VELOCITY) {
      const scale = MAX_VELOCITY / horizontalSpeed;
      vx *= scale;
      vz *= scale;
      // Note: Hook manages its own internal speed, clamping applied to output
    }

    // Clamp vertical velocity (falling speed, but allow jump force)
    if (vy < -MAX_FALL_SPEED) {
      vy = -MAX_FALL_SPEED;
    }

    // === FALL RECOVERY - Respawn if fallen through world ===
    if (position.y < MIN_GROUND_Y) {
      console.warn('Player fell through world, respawning');
      rb.setTranslation({ x: SPAWN_POSITION[0], y: SPAWN_POSITION[1], z: SPAWN_POSITION[2] }, true);
      vx = 0;
      vy = 0;
      vz = 0;
      movementCalculator.reset(); // Reset hook's internal speed state
      slopeAlignment.reset();     // Reset slope tilt on recovery
    }

    // === PENETRATION RESOLUTION - Reset if physics explodes ===
    // If velocity is absurdly high (physics explosion), reset to safe state
    const totalVelocity = Math.sqrt(vx * vx + vy * vy + vz * vz);
    if (totalVelocity > MAX_VELOCITY * 3 || isNaN(totalVelocity)) {
      console.warn('Physics explosion detected, resetting player');
      rb.setTranslation({ x: SPAWN_POSITION[0], y: SPAWN_POSITION[1], z: SPAWN_POSITION[2] }, true);
      vx = 0;
      vy = 0;
      vz = 0;
      movementCalculator.reset(); // Reset hook's internal speed state
      slopeAlignment.reset();     // Reset slope tilt on recovery
    }

    rb.setLinvel({ x: vx, y: vy, z: vz }, true);

    // === CROUCH COLLIDER ADJUSTMENT ===
    // Adjust collider position to stay flush with ground when crouching
    if (colliderRef.current && wantsToCrouch !== isCrouchingRef.current) {
      const collider = colliderRef.current;
      const newY = wantsToCrouch ? CROUCHING_Y_OFFSET : STANDING_Y_OFFSET;

      // Adjust collider's local position within the rigid body
      collider.setTranslationWrtParent({ x: 0, y: newY, z: 0 });

      // Also adjust the collider shape if possible (half-height)
      // Note: This requires creating a new shape in Rapier
      const newHalfHeight = wantsToCrouch ? CROUCHING_HALF_HEIGHT : STANDING_HALF_HEIGHT;
      const radius = 0.3; // Keep same radius
      const newShape = new rapier.Capsule(newHalfHeight, radius);
      collider.setShape(newShape);

      isCrouchingRef.current = wantsToCrouch;
    }

    // === SLOPE ALIGNMENT - tilt avatar to match terrain ===
    const slopeResult = slopeAlignment.calculate({
      groundNormal: groundState.groundNormal,
      isGrounded: grounded,
      facingAngle: facingAngle.current,
      delta,
    });

    // Apply rotation: facing angle (Y) + slope tilt (X, Z)
    if (groupRef.current) {
      groupRef.current.rotation.set(
        slopeResult.tiltX,           // Forward/backward lean
        facingAngle.current,          // Facing direction
        slopeResult.tiltZ,           // Left/right lean
        'YXZ'                         // Rotation order
      );
    }

    // Basic movement state
    const isMoving = hasInput;
    const isRunning = isMoving && keys.sprint && !isAiming && !isFiring; // Can't run while firing

    // Derive boolean flags from air state hook (single source of truth)
    // Note: airStateResult was computed earlier for buffered jump detection
    const isJumping = airStateResult.isJumping;
    const isFalling = airStateResult.isFalling;
    const isLanding = airStateResult.isLanding;
    const animIsGrounded = airStateResult.isGrounded;

    // Map hook's AirState to our PlayerAirState enum for AnimationState type
    const currentAirState: PlayerAirState = {
      grounded: PlayerAirState.GROUNDED,
      jumping: PlayerAirState.JUMPING,
      falling: PlayerAirState.FALLING,
      landing: PlayerAirState.LANDING,
    }[airStateResult.state] ?? PlayerAirState.GROUNDED;

    // Use physics grounded for gameplay (crouch), state machine for visual (dance)
    const isDancing = keys.dance && !isMoving && animIsGrounded && !isAiming; // Dance only when idle on ground, not aiming
    const isCrouching = keys.crouch && grounded; // Crouch uses physics grounded for responsiveness

    // === TERRAIN-AWARE FOOTSTEPS ===
    // Update footstep sounds based on current position and movement state
    terrainFootsteps.update(position, {
      isMoving,
      isRunning,
      isCrouching,
    });

    // Strafe detection - only when aiming (GTA-style)
    // When aiming, character faces camera so left/right keys = strafing
    const isStrafingLeft = isAiming && keys.left && !keys.right;
    const isStrafingRight = isAiming && keys.right && !keys.left;
    const velocity = Math.sqrt(vx * vx + vz * vz);

    const currentAnimState: AnimationState = {
      isMoving,
      isRunning,
      isGrounded: animIsGrounded,
      isJumping,
      isFalling,
      isLanding,
      isDancing,
      isCrouching,
      isStrafingLeft,
      isStrafingRight,
      isAiming,
      isFiring,
      velocity,
      velocityY: vy,
      aimPitch: pitchAngle.current,
      airState: currentAirState,
    };

    if (onPositionChange) {
      rotation.set(0, facingAngle.current, 0);
      onPositionChange(position.clone(), rotation.clone(), currentAnimState);
    }

    // Update animation state (only when changed to avoid re-renders)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lastState = lastAnimState.current as any;
    if (
      lastState.isMoving !== isMoving ||
      lastState.isRunning !== isRunning ||
      lastState.isGrounded !== animIsGrounded ||
      lastState.isJumping !== isJumping ||
      lastState.isFalling !== isFalling ||
      lastState.isLanding !== isLanding ||
      lastState.isDancing !== isDancing ||
      lastState.isCrouching !== isCrouching ||
      lastState.isStrafingLeft !== isStrafingLeft ||
      lastState.isStrafingRight !== isStrafingRight ||
      lastState.isAiming !== isAiming ||
      lastState.isFiring !== isFiring ||
      lastState.airState !== currentAirState
    ) {
      lastAnimState.current = {
        isMoving, isRunning, isGrounded: animIsGrounded, isJumping, isFalling, isLanding,
        isDancing, isCrouching, isStrafingLeft, isStrafingRight, isAiming, isFiring,
        airState: currentAirState
      } as typeof lastAnimState.current;
      setAnimState(currentAnimState);
    }
  });

  // Support both render prop and regular children
  const renderedChildren = typeof children === 'function' ? children(animState) : children;

  return (
    <RigidBody
      ref={rigidBodyRef}
      position={SPAWN_POSITION}
      enabledRotations={[false, false, false]}
      linearDamping={0.5}
      angularDamping={1.0}
      mass={1}
      type="dynamic"
      colliders={false}
      lockRotations
      // Physics stability settings
      ccd={true}                    // Continuous Collision Detection - prevents tunneling
      gravityScale={1.2}            // Slightly stronger gravity for snappier landing
      canSleep={false}              // Keep physics active to prevent desync
    >
      <CapsuleCollider
        args={[STANDING_HALF_HEIGHT, 0.3]}  // half-height + radius*2 = ~1.7m (realistic human)
        position={[0, STANDING_Y_OFFSET, 0]} // Position so bottom of capsule aligns with feet
        friction={0.7}              // Ground friction
        restitution={0}             // No bounce - prevents physics explosions
      />
      <group ref={groupRef}>
        {renderedChildren}
      </group>
    </RigidBody>
  );
}

export default PhysicsPlayerController;
