/**
 * Physics-based Player Controller
 * Uses Rapier for physics simulation with smooth acceleration
 */

import { useRef, useMemo, useEffect, useState, type ReactNode } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { RigidBody, CapsuleCollider, useRapier, type RapierRigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import { useKeyboardControls } from './hooks/useKeyboardControls';
import { useCombatStore } from './combat/useCombatStore';

// Movement constants - tuned for smooth motion
const WALK_SPEED = 2.5;
const SPRINT_SPEED = 5;
const CROUCH_SPEED = 1.5;     // Slower when crouching
const JUMP_FORCE = 5;
const ROTATION_SPEED = 8;

// Acceleration/deceleration for smoother movement feel
const ACCELERATION = 12;      // m/s² - how fast we reach target speed
const DECELERATION = 18;      // m/s² - how fast we stop (higher = snappier)
const AIR_CONTROL = 0.3;      // Reduced control while airborne

// Crouch settings
const STANDING_HALF_HEIGHT = 0.4;   // Capsule half-height when standing
const CROUCHING_HALF_HEIGHT = 0.2;  // Capsule half-height when crouching
const STANDING_Y_OFFSET = 0.7;      // Collider Y offset when standing
const CROUCHING_Y_OFFSET = 0.5;     // Collider Y offset when crouching (flush with ground)

// Ground detection
const COYOTE_TIME = 0.1;            // Grace period after leaving ground
const JUMP_COOLDOWN = 0.35;         // Cooldown between jumps (prevents spam)

// Physics stability - prevents explosions and glitches
const MAX_VELOCITY = 15;            // Cap horizontal velocity
const MAX_FALL_SPEED = 20;          // Cap falling speed
const MIN_GROUND_Y = -5;            // Minimum Y position (fall recovery threshold)

// Camera collision
const CAMERA_COLLISION_OFFSET = 0.3;  // Pull camera in front of walls
const MIN_CAMERA_DISTANCE = 1.5;      // Minimum distance from player

// Aim mode camera parameters (GTA-style over-the-shoulder)
const AIM_CAMERA_DISTANCE = 2.5;      // Closer to player when aiming
const AIM_CAMERA_OFFSET_X = 0.6;      // Offset right for over-shoulder view
const AIM_CAMERA_OFFSET_Y = 1.7;      // Height offset when aiming
const AIM_SPEED_MULTIPLIER = 0.5;     // Move 50% slower when aiming
const CAMERA_TRANSITION_SPEED = 8;    // How fast camera transitions to/from aim mode

// Spawn position - on the basketball court
const SPAWN_POSITION: [number, number, number] = [30, 1, -20];

// Animation state passed to children
export interface AnimationState {
  isMoving: boolean;
  isRunning: boolean;
  isGrounded: boolean;
  isJumping: boolean;
  isDancing: boolean;
  isCrouching: boolean;
  isStrafingLeft: boolean;
  isStrafingRight: boolean;
  isAiming: boolean;
  isFiring: boolean;
  velocity: number;
  velocityY: number;  // Vertical velocity for fall detection
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

  // Combat store for aim/fire state
  const { currentWeapon, isAiming, setAiming, isFiring, setFiring, fire } = useCombatStore();

  // Minimum fire animation duration (semi-auto feel, prevents spam)
  const MIN_FIRE_DURATION = 200; // ms
  const lastFireStart = useRef<number>(0);

  // Animation state (React state for children)
  const [animState, setAnimState] = useState<AnimationState>({
    isMoving: false,
    isRunning: false,
    isGrounded: true,
    isJumping: false,
    isDancing: false,
    isCrouching: false,
    isStrafingLeft: false,
    isStrafingRight: false,
    isAiming: false,
    isFiring: false,
    velocity: 0,
    velocityY: 0,
  });

  // Movement state
  // Initialize facing away from camera (camera starts at +Z, so face -Z = PI radians)
  const facingAngle = useRef(Math.PI);
  const jumpCooldown = useRef(0);
  const hasJumped = useRef(false);   // True from jump until fully grounded again
  const lastAnimState = useRef({ isMoving: false, isRunning: false, isGrounded: true });

  // Crouch state for collider adjustment
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const colliderRef = useRef<any>(null);
  const isCrouchingRef = useRef(false);

  // Smooth velocity tracking for acceleration
  const currentSpeed = useRef({ x: 0, z: 0 });

  // Ground detection state
  const groundedTime = useRef(0);        // Time since last grounded
  const wasGrounded = useRef(true);      // Previous frame grounded state

  // Aim mode camera transition (0 = normal, 1 = fully aimed)
  const aimTransition = useRef(0);

  // Reusable vectors to avoid GC pressure
  const vectors = useMemo(() => ({
    cameraDir: new THREE.Vector3(),
    cameraRight: new THREE.Vector3(),
    moveDir: new THREE.Vector3(),
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

  // Mouse camera orbit - modified for aim mode
  useEffect(() => {
    const canvas = gl.domElement;
    const sensitivity = 0.003;
    const aimSensitivity = 0.002; // Slightly slower when aiming

    const onMouseDown = (e: MouseEvent) => {
      // Left-click (button 0) - orbit camera (or fire when aiming, handled in useKeyboardControls)
      // Right-click (button 2) - aim (handled in useKeyboardControls) or orbit if no weapon
      if (e.button === 0) {
        // Only orbit with left-click if NOT aiming
        if (!isAiming) {
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
      // When aiming, mouse ALWAYS controls camera look (even without dragging)
      if (isAiming) {
        const sens = aimSensitivity;
        orbitAngle.current -= (e.clientX - lastMouse.current.x) * sens;
        pitchAngle.current = Math.max(-0.2, Math.min(1.2, pitchAngle.current + (e.clientY - lastMouse.current.y) * sens));
        lastMouse.current = { x: e.clientX, y: e.clientY };
        return;
      }

      // Normal orbit when dragging
      if (!isDragging.current) return;
      orbitAngle.current -= (e.clientX - lastMouse.current.x) * sensitivity;
      pitchAngle.current = Math.max(-0.2, Math.min(1.2, pitchAngle.current + (e.clientY - lastMouse.current.y) * sensitivity));
      lastMouse.current = { x: e.clientX, y: e.clientY };
    };

    const onContextMenu = (e: Event) => e.preventDefault();

    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('contextmenu', onContextMenu);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
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
    const { cameraDir, cameraRight, moveDir, up, position, rotation, desiredCameraPos, desiredLookTarget, playerHead, rayDir, raycaster } = vectors;

    // Get position
    if (rb) {
      const t = rb.translation();
      position.set(t.x, t.y, t.z);
    }

    // Continuous fire while holding button (fire() handles rate limiting)
    if (isFiring && currentWeapon !== 'none') {
      fire();
    }

    // === AIM CAMERA TRANSITION ===
    // Smoothly interpolate between normal and aim camera
    const targetAimT = isAiming ? 1 : 0;
    aimTransition.current += (targetAimT - aimTransition.current) * Math.min(1, CAMERA_TRANSITION_SPEED * delta);
    const aimT = aimTransition.current;

    // Camera - smoother interpolation
    // Normal camera: distance 5, centered behind player
    // Aim camera: distance 2.5, offset right (over-the-shoulder)
    const normalDist = 5;
    const aimDist = AIM_CAMERA_DISTANCE;
    const maxDist = normalDist + (aimDist - normalDist) * aimT;

    const hDist = maxDist * Math.cos(pitchAngle.current);
    const normalVOff = normalDist * Math.sin(pitchAngle.current) + 1.5;
    const aimVOff = AIM_CAMERA_OFFSET_Y;
    const vOff = normalVOff + (aimVOff - normalVOff) * aimT;

    // Horizontal offset for over-the-shoulder (only when aiming)
    const shoulderOffsetX = AIM_CAMERA_OFFSET_X * aimT;

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

    // Check for collisions with scene objects (excluding player)
    const intersects = raycaster.intersectObjects(scene.children, true);

    // Filter out non-mesh objects and find closest valid hit
    let actualDist = rayDistance;
    for (const hit of intersects) {
      // Skip if it's the player or UI elements
      if (hit.object.userData?.isPlayer || hit.object.type === 'Sprite') continue;
      // Only consider meshes
      if (hit.object.type !== 'Mesh') continue;

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
    desiredLookTarget.set(position.x, position.y + 1, position.z);
    smoothLookTarget.current.lerp(desiredLookTarget, lookSmoothFactor);

    camera.position.copy(smoothCameraPos.current);
    camera.lookAt(smoothLookTarget.current);

    if (!rb) return;

    const linvel = rb.linvel();

    // === GROUND DETECTION WITH RAYCAST ===
    // Cast a ray downward from player position to detect ground
    const groundRayOrigin = rb.translation();
    const groundRayDir = { x: 0, y: -1, z: 0 };
    const groundRay = new rapier.Ray(groundRayOrigin, groundRayDir);

    // Cast ray down, max distance 1.5 (capsule height + margin)
    // The castRay returns the time of impact - distance to hit
    const groundHit = world.castRay(groundRay, 1.5, true, undefined, undefined, undefined, rb);

    // Grounded if ray hits something within 1.1 units (capsule bottom + small margin)
    const raycastGrounded = groundHit !== null && groundHit.timeOfImpact < 1.1;

    // Also check velocity as a fallback for edge cases
    const verticalVelocity = linvel.y;
    const isNotFallingFast = Math.abs(verticalVelocity) < 2.0;

    // Combine raycast with velocity check for reliable grounding
    const isCurrentlyGrounded = raycastGrounded && isNotFallingFast;

    // Track grounded time for coyote time
    if (isCurrentlyGrounded) {
      groundedTime.current = 0;
      wasGrounded.current = true;
      // Reset hasJumped only when truly grounded AND stable AND cooldown expired
      // This prevents flickering ground detection from allowing rapid jumps
      if (hasJumped.current && Math.abs(verticalVelocity) < 0.5 && jumpCooldown.current <= 0) {
        hasJumped.current = false;
      }
    } else {
      groundedTime.current += delta;
    }

    // Allow jump during coyote time, but ONLY if we haven't already jumped
    const canJump = !hasJumped.current && (isCurrentlyGrounded || (wasGrounded.current && groundedTime.current < COYOTE_TIME));
    const grounded = isCurrentlyGrounded;

    if (jumpCooldown.current > 0) jumpCooldown.current -= delta;

    // === INPUT PROCESSING ===
    let ix = 0, iz = 0;
    if (keys.forward) iz = -1;
    if (keys.backward) iz = 1;
    if (keys.left) ix = -1;
    if (keys.right) ix = 1;

    // Calculate target velocity
    let targetVx = 0, targetVz = 0;
    const hasInput = ix !== 0 || iz !== 0;

    // Crouch state for this frame
    const wantsToCrouch = keys.crouch && grounded;

    if (hasInput || isAiming) {
      // When aiming, character faces camera direction
      // Otherwise, normalize input for diagonal movement
      if (hasInput) {
        const len = Math.sqrt(ix * ix + iz * iz);
        ix /= len;
        iz /= len;
      }

      camera.getWorldDirection(cameraDir);
      cameraDir.y = 0;
      cameraDir.normalize();
      cameraRight.crossVectors(cameraDir, up).normalize();

      if (hasInput) {
        moveDir.set(0, 0, 0);
        moveDir.addScaledVector(cameraDir, -iz);
        moveDir.addScaledVector(cameraRight, ix);
        moveDir.normalize();

        // Determine target speed based on state
        // Can't sprint while aiming OR firing (shooting forces walk speed)
        let targetSpeed = WALK_SPEED;
        if (wantsToCrouch) {
          targetSpeed = CROUCH_SPEED;  // Slow when crouching
        } else if (keys.sprint && !isAiming && !isFiring) {
          targetSpeed = SPRINT_SPEED;  // No sprinting while aiming or firing
        }

        // Slow down when aiming
        if (isAiming) {
          targetSpeed *= AIM_SPEED_MULTIPLIER;
        }

        targetVx = moveDir.x * targetSpeed;
        targetVz = moveDir.z * targetSpeed;
      }

      // === CHARACTER ROTATION ===
      if (isAiming) {
        // When aiming: character faces camera direction (instant snap)
        // Camera direction points INTO the screen, so we use cameraDir
        const tgt = Math.atan2(-cameraDir.x, -cameraDir.z);
        facingAngle.current = tgt;
      } else if (hasInput) {
        // GTA-style movement: character ALWAYS faces movement direction
        const tgt = Math.atan2(moveDir.x, moveDir.z);
        let diff = tgt - facingAngle.current;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        facingAngle.current += diff * Math.min(1, delta * ROTATION_SPEED);
      }
    }

    // === SMOOTH ACCELERATION / INSTANT STOP ===
    // When grounded with no input, stop INSTANTLY (no sliding)
    // When moving, use smooth acceleration
    if (!hasInput && grounded) {
      // INSTANT STOP when grounded with no input - eliminates all sliding
      currentSpeed.current.x = 0;
      currentSpeed.current.z = 0;
    } else {
      // Use different rates for speeding up vs slowing down
      const accelRate = hasInput ? ACCELERATION : DECELERATION;
      const controlMultiplier = grounded ? 1 : AIR_CONTROL;
      const effectiveAccel = accelRate * controlMultiplier;

      // Smoothly interpolate current speed toward target
      const speedDiffX = targetVx - currentSpeed.current.x;
      const speedDiffZ = targetVz - currentSpeed.current.z;
      const maxChange = effectiveAccel * delta;

      // Apply acceleration with clamping
      if (Math.abs(speedDiffX) < maxChange) {
        currentSpeed.current.x = targetVx;
      } else {
        currentSpeed.current.x += Math.sign(speedDiffX) * maxChange;
      }

      if (Math.abs(speedDiffZ) < maxChange) {
        currentSpeed.current.z = targetVz;
      } else {
        currentSpeed.current.z += Math.sign(speedDiffZ) * maxChange;
      }
    }

    // Apply velocity
    let vx = currentSpeed.current.x;
    let vy = linvel.y;
    let vz = currentSpeed.current.z;

    // === JUMP ===
    // Only allow jump if: can jump, cooldown expired, jump key pressed
    if (keys.jump && canJump && jumpCooldown.current <= 0) {
      vy = JUMP_FORCE;
      jumpCooldown.current = JUMP_COOLDOWN;
      hasJumped.current = true;     // Mark as jumped - prevents air jumping
      wasGrounded.current = false;  // Consume coyote time
      groundedTime.current = COYOTE_TIME + 0.1; // Prevent immediate re-jump
    }

    // === VELOCITY CLAMPING - Prevents physics explosions ===
    // Clamp horizontal velocity to prevent runaway speeds
    const horizontalSpeed = Math.sqrt(vx * vx + vz * vz);
    if (horizontalSpeed > MAX_VELOCITY) {
      const scale = MAX_VELOCITY / horizontalSpeed;
      vx *= scale;
      vz *= scale;
      // Also sync the current speed tracker
      currentSpeed.current.x *= scale;
      currentSpeed.current.z *= scale;
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
      currentSpeed.current.x = 0;
      currentSpeed.current.z = 0;
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
      currentSpeed.current.x = 0;
      currentSpeed.current.z = 0;
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

    if (groupRef.current) {
      groupRef.current.rotation.y = facingAngle.current;
    }

    // Compute animation state
    const isMoving = hasInput;
    const isRunning = isMoving && keys.sprint && !isAiming && !isFiring; // Can't run while firing
    const isJumping = !grounded; // Entire airborne phase = jumping animation
    const isDancing = keys.dance && !isMoving && grounded && !isAiming; // Dance only when idle on ground, not aiming
    const isCrouching = keys.crouch && grounded; // Crouch only when on ground

    // Strafe detection - only when aiming (GTA-style)
    // When aiming, character faces camera so left/right keys = strafing
    const isStrafingLeft = isAiming && keys.left && !keys.right;
    const isStrafingRight = isAiming && keys.right && !keys.left;
    const velocity = Math.sqrt(vx * vx + vz * vz);

    const currentAnimState: AnimationState = {
      isMoving,
      isRunning,
      isGrounded: grounded,
      isJumping,
      isDancing,
      isCrouching,
      isStrafingLeft,
      isStrafingRight,
      isAiming,
      isFiring,
      velocity,
      velocityY: vy,
    };

    if (onPositionChange) {
      rotation.set(0, facingAngle.current, 0);
      onPositionChange(position.clone(), rotation.clone(), currentAnimState);
    }

    // Update animation state (only when changed to avoid re-renders)
    if (
      lastAnimState.current.isMoving !== isMoving ||
      lastAnimState.current.isRunning !== isRunning ||
      lastAnimState.current.isGrounded !== grounded ||
      (lastAnimState.current as { isJumping?: boolean }).isJumping !== isJumping ||
      (lastAnimState.current as { isDancing?: boolean }).isDancing !== isDancing ||
      (lastAnimState.current as { isCrouching?: boolean }).isCrouching !== isCrouching ||
      (lastAnimState.current as { isStrafingLeft?: boolean }).isStrafingLeft !== isStrafingLeft ||
      (lastAnimState.current as { isStrafingRight?: boolean }).isStrafingRight !== isStrafingRight ||
      (lastAnimState.current as { isAiming?: boolean }).isAiming !== isAiming ||
      (lastAnimState.current as { isFiring?: boolean }).isFiring !== isFiring
    ) {
      lastAnimState.current = { isMoving, isRunning, isGrounded: grounded, isJumping, isDancing, isCrouching, isStrafingLeft, isStrafingRight, isAiming, isFiring } as typeof lastAnimState.current;
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
        args={[0.4, 0.3]}           // half-height=0.4, radius=0.3 (total height ~1.4m)
        position={[0, 0.7, 0]}      // Position so bottom of capsule aligns with feet
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
