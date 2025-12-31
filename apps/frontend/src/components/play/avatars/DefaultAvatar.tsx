/**
 * DefaultAvatar
 * Simple animated avatar that loads the default SWAT operator model.
 * Uses Mixamo animation system without character customization.
 * Includes comprehensive Leva debug controls for development.
 */

import { useRef, useMemo, useEffect, useState, memo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import { useControls, folder, button } from 'leva';
import * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';
import {
  ANIMATION_CONFIG,
  type AnimationName,
} from '../animations.config';
import { configureAllActions } from '../hooks/useAnimationLoader';
import { AnimationClipPool, PRESERVE_HIPS_ROTATION_ANIMS, PRESERVE_HIPS_POSITION_ANIMS } from './AnimationClipPool';
import {
  useAnimationStateMachine,
  type AnimationInput,
  type WeaponType as FSMWeaponType,
} from '../hooks/useAnimationStateMachine';
import { WeaponAttachment, type WeaponType } from '../WeaponAttachment';
import { EquipmentAttachment } from '../EquipmentAttachment';
import { combatFrameData } from '../combat/useCombatStore';
// Animation state singleton - read directly in useFrame to avoid stale props
import { animationState, getAnimationVersion } from '../hooks/useAnimationStore';

// Default avatar model path
const DEFAULT_AVATAR_PATH = '/assets/avatars/swat_operator.glb';

// PERF: Module-level cache for cloned scenes (survives component remounts and context recovery)
// Key: URL, Value: { scene, boneData, timestamp }
// This prevents the "Avatar loaded" spam (8+ times) during WebGL context loss/recovery
const avatarCloneCache = new Map<string, {
  scene: THREE.Object3D;
  boneData: { prefix: string; suffix: string; boneCount: number; meshCount: number };
  timestamp: number;
}>();

// Cache entries older than 5 minutes are considered stale
const CLONE_CACHE_TTL_MS = 5 * 60 * 1000;

// Animation URLs derived from config
const ANIMATIONS = Object.fromEntries(
  Object.entries(ANIMATION_CONFIG).map(([name, config]) => [name, config.url])
) as Record<AnimationName, string>;

// Critical animations to preload
const CRITICAL_ANIMATIONS: AnimationName[] = [
  'idle', 'walking', 'running', 'jump', 'jumpJog', 'jumpRun',
  'rifleIdle', 'rifleWalk', 'rifleRun',
  'pistolIdle', 'pistolWalk', 'pistolRun',
];

// Preload critical animations and avatar
CRITICAL_ANIMATIONS.forEach(name => {
  if (ANIMATIONS[name]) {
    useGLTF.preload(ANIMATIONS[name]);
  }
});
useGLTF.preload(DEFAULT_AVATAR_PATH);

export interface DefaultAvatarProps {
  isMoving?: boolean;
  isRunning?: boolean;
  isGrounded?: boolean;
  isJumping?: boolean;
  isFalling?: boolean;
  isDancing?: boolean;
  dancePressed?: boolean;
  isCrouching?: boolean;
  isStrafingLeft?: boolean;
  isStrafingRight?: boolean;
  isAiming?: boolean;
  isFiring?: boolean;
  isDying?: boolean;
  velocityY?: number;
  isPlayer?: boolean;
  /** Current weapon type for animation and weapon model rendering */
  weapon?: WeaponType;
}

/**
 * Custom comparison for React.memo - only re-render if animation-affecting props change.
 * Skips velocityY since it changes every frame but doesn't affect animation state directly.
 */
function arePropsEqual(prev: DefaultAvatarProps, next: DefaultAvatarProps): boolean {
  return (
    prev.isMoving === next.isMoving &&
    prev.isRunning === next.isRunning &&
    prev.isGrounded === next.isGrounded &&
    prev.isJumping === next.isJumping &&
    prev.isFalling === next.isFalling &&
    prev.isDancing === next.isDancing &&
    prev.dancePressed === next.dancePressed &&
    prev.isCrouching === next.isCrouching &&
    prev.isStrafingLeft === next.isStrafingLeft &&
    prev.isStrafingRight === next.isStrafingRight &&
    prev.isAiming === next.isAiming &&
    prev.isFiring === next.isFiring &&
    prev.isDying === next.isDying &&
    prev.weapon === next.weapon &&
    prev.isPlayer === next.isPlayer
    // Note: velocityY intentionally skipped - changes every frame but only used for fall damage
  );
}

/**
 * DefaultAvatar - Animated avatar with comprehensive debug controls
 * Memoized to prevent re-renders when parent updates but props haven't changed.
 */
const DefaultAvatarInner = memo(function DefaultAvatar({
  isMoving = false,
  isRunning = false,
  isGrounded = true,
  isJumping = false,
  isFalling = false,
  isDancing = false,
  dancePressed = false,
  isCrouching = false,
  isStrafingLeft = false,
  isStrafingRight = false,
  isAiming = false,
  isFiring = false,
  isDying = false,
  velocityY = 0,
  weapon = null,
  isPlayer = false,
}: DefaultAvatarProps) {
  const group = useRef<THREE.Group>(null);
  const avatarRef = useRef<THREE.Group>(null);
  const skeletonHelperRef = useRef<THREE.SkeletonHelper | null>(null);
  const boxHelperRef = useRef<THREE.BoxHelper | null>(null);
  const spineRef = useRef<THREE.Bone | null>(null);  // For upper body aiming

  // Detected bone structure
  const [boneInfo, setBoneInfo] = useState({
    prefix: 'detecting...',
    suffix: '',
    boneCount: 0,
    meshCount: 0,
  });
  const [currentAnimState, setCurrentAnimState] = useState('idle');

  const detectedBonePrefixRef = useRef<'none' | 'mixamorig' | 'mixamorig:'>('none');
  const detectedBoneSuffixRef = useRef<string>('');

  // Note: Module-level avatarCloneCache is used instead of per-component cache
  // This survives component remounts and WebGL context recovery

  // FSM state ref for immediate access in useFrame (avoids React state async lag)
  const currentStateRef = useRef<string>('idle');

  // Track singleton version to trigger FSM updates for player avatar
  // This allows animation state changes to propagate without full component re-renders
  const lastAnimVersionRef = useRef(0);
  const [animVersionTrigger, setAnimVersionTrigger] = useState(0);

  // Comprehensive Leva controls
  const controls = useControls('🎮 Avatar', {
    // Transform
    'Transform': folder({
      scale: { value: 0.01, min: 0.001, max: 0.1, step: 0.001, label: 'Scale' },
      posX: { value: 0, min: -5, max: 5, step: 0.1, label: 'Pos X' },
      posY: { value: 100, min: -100, max: 100, step: 1, label: 'Pos Y' },
      posZ: { value: 0, min: -5, max: 5, step: 0.1, label: 'Pos Z' },
      rotX: { value: 88, min: -180, max: 180, step: 1, label: 'Rot X°' },
      rotY: { value: 0, min: -180, max: 180, step: 1, label: 'Rot Y°' },
      rotZ: { value: 0, min: -180, max: 180, step: 1, label: 'Rot Z°' },
    }, { collapsed: false }),

    // Debug visualization
    'Debug': folder({
      showSkeleton: { value: false, label: 'Show Skeleton' },
      showBoundingBox: { value: false, label: 'Show Bounds' },
      showAxes: { value: false, label: 'Show Axes' },
      axesSize: { value: 1, min: 0.1, max: 5, step: 0.1, label: 'Axes Size' },
    }, { collapsed: true }),

    // Bone info (read-only monitors)
    'Bone Info': folder({
      bonePrefix: { value: boneInfo.prefix, editable: false, label: 'Prefix' },
      boneSuffix: { value: boneInfo.suffix || 'none', editable: false, label: 'Suffix' },
      boneCount: { value: boneInfo.boneCount, editable: false, label: 'Bones' },
      meshCount: { value: boneInfo.meshCount, editable: false, label: 'Meshes' },
    }, { collapsed: true }),

    // Animation state - shows current FSM state for debugging
    'Animation': folder({
      currentAnim: { value: currentAnimState, editable: false, label: 'Current State' },
      logBones: button(() => {
        console.log('🦴 Bone structure:', {
          prefix: detectedBonePrefixRef.current,
          suffix: detectedBoneSuffixRef.current,
        });
        if (group.current) {
          const bones: string[] = [];
          group.current.traverse((child) => {
            if ((child as THREE.Bone).isBone) {
              bones.push(child.name);
            }
          });
          console.log('🦴 All bones:', bones);
        }
      }, { disabled: false }),
      logAnimations: button(() => {
        console.log('🎬 Available animations:', Object.keys(ANIMATION_CONFIG));
      }, { disabled: false }),
    }, { collapsed: false }),

    // Character lean/tilt per movement state (uses actual props, not animation state)
    'Character Lean': folder({
      leanLerpSpeed: { value: 15, min: 1, max: 25, step: 1, label: 'Lerp Speed' },
      idleLeanX: { value: 0, min: -30, max: 30, step: 1, label: 'Idle Lean X°' },
      walkLeanX: { value: 0, min: -30, max: 30, step: 1, label: 'Walk Lean X°' },
      runLeanX: { value: 18, min: -30, max: 30, step: 1, label: 'Run Lean X°' },
      aimLeanX: { value: 0, min: -30, max: 30, step: 1, label: 'Aim Lean X°' },
      fireLeanX: { value: 0, min: -30, max: 30, step: 1, label: 'Fire Lean X°' },
    }, { collapsed: false }),

    // Spine aiming - upper body follows camera pitch when weapon equipped
    'Spine Aim': folder({
      spineAimEnabled: { value: true, label: 'Enable Spine Aim' },
      spineAimAlways: { value: true, label: 'Track Mouse Always' },
      spineAimMultiplier: { value: 1.0, min: 0, max: 1.5, step: 0.05, label: 'Pitch Multiplier' },
      spineAimMaxAngle: { value: 45, min: 15, max: 75, step: 5, label: 'Max Angle°' },
      spineAimSmoothing: { value: 10, min: 2, max: 20, step: 1, label: 'Smoothing' },
    }, { collapsed: true }),

    // Animation Y corrections - applied at render time to avatar group
    // These correct for animations that face the wrong direction
    '🔧 Anim Y Offset': folder({
      debugYEnabled: { value: true, label: 'Enable Y Offset' },
      rifleIdleY: { value: 0, min: -180, max: 180, step: 1, label: 'rifleIdle Y°' },
      rifleWalkY: { value: 0, min: -180, max: 180, step: 1, label: 'rifleWalk Y°' },
      rifleRunY: { value: 0, min: -180, max: 180, step: 1, label: 'rifleRun Y°' },
      rifleAimIdleY: { value: 0, min: -180, max: 180, step: 1, label: 'rifleAimIdle Y°' },
      rifleAimWalkY: { value: 0, min: -180, max: 180, step: 1, label: 'rifleAimWalk Y°' },
      rifleFireStillY: { value: 0, min: -180, max: 180, step: 1, label: 'rifleFireStill Y°' },
      rifleFireWalkY: { value: 0, min: -180, max: 180, step: 1, label: 'rifleFireWalk Y°' },
      crouchRifleIdleY: { value: 0, min: -180, max: 180, step: 1, label: 'crouchRifleIdle Y°' },
      crouchRifleWalkY: { value: 0, min: -180, max: 180, step: 1, label: 'crouchRifleWalk Y°' },
      pistolIdleY: { value: 0, min: -180, max: 180, step: 1, label: 'pistolIdle Y°' },
      pistolWalkY: { value: 0, min: -180, max: 180, step: 1, label: 'pistolWalk Y°' },
      pistolRunY: { value: 0, min: -180, max: 180, step: 1, label: 'pistolRun Y°' },
    }, { collapsed: false }),
  }, [boneInfo, currentAnimState]);

  // Load the avatar model
  const { scene: originalScene } = useGLTF(DEFAULT_AVATAR_PATH);

  // Load animation files - Core locomotion
  const idleGltf = useGLTF(ANIMATIONS.idle);
  const walkingGltf = useGLTF(ANIMATIONS.walking);
  const runningGltf = useGLTF(ANIMATIONS.running);
  const jumpGltf = useGLTF(ANIMATIONS.jump);
  const jumpJogGltf = useGLTF(ANIMATIONS.jumpJog);
  const jumpRunGltf = useGLTF(ANIMATIONS.jumpRun);
  const dance1Gltf = useGLTF(ANIMATIONS.dance1);
  const dance2Gltf = useGLTF(ANIMATIONS.dance2);
  const dance3Gltf = useGLTF(ANIMATIONS.dance3);

  // Rifle animations
  const rifleIdleGltf = useGLTF(ANIMATIONS.rifleIdle);
  const rifleWalkGltf = useGLTF(ANIMATIONS.rifleWalk);
  const rifleRunGltf = useGLTF(ANIMATIONS.rifleRun);
  const rifleAimIdleGltf = useGLTF(ANIMATIONS.rifleAimIdle);
  const rifleJumpGltf = useGLTF(ANIMATIONS.rifleJump);
  const rifleFireStillGltf = useGLTF(ANIMATIONS.rifleFireStill);
  const rifleFireWalkGltf = useGLTF(ANIMATIONS.rifleFireWalk);

  // Pistol animations
  const pistolIdleGltf = useGLTF(ANIMATIONS.pistolIdle);
  const pistolWalkGltf = useGLTF(ANIMATIONS.pistolWalk);
  const pistolRunGltf = useGLTF(ANIMATIONS.pistolRun);

  // Crouch + weapon animations
  const crouchRifleIdleGltf = useGLTF(ANIMATIONS.crouchRifleIdle);
  const crouchRifleWalkGltf = useGLTF(ANIMATIONS.crouchRifleWalk);
  const crouchPistolIdleGltf = useGLTF(ANIMATIONS.crouchPistolIdle);
  const crouchPistolWalkGltf = useGLTF(ANIMATIONS.crouchPistolWalk);

  // Clone scene and detect bone structure
  // PERF: Uses module-level URL-based cache to survive context recovery
  const sceneData = useMemo(() => {
    const now = Date.now();

    // Check module-level cache first (survives context loss/recovery)
    const cached = avatarCloneCache.get(DEFAULT_AVATAR_PATH);
    if (cached && (now - cached.timestamp) < CLONE_CACHE_TTL_MS) {
      // Verify the cached scene is still valid (not disposed)
      let isValid = true;
      cached.scene.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          if (mesh.geometry && (mesh.geometry as THREE.BufferGeometry).index === null &&
              Object.keys((mesh.geometry as THREE.BufferGeometry).attributes).length === 0) {
            isValid = false; // Geometry was disposed
          }
        }
      });

      if (isValid) {
        // Update refs for animation processing
        const prefix = cached.boneData.prefix === 'Standard' ? 'none' : cached.boneData.prefix;
        detectedBonePrefixRef.current = prefix as 'none' | 'mixamorig' | 'mixamorig:';
        detectedBoneSuffixRef.current = cached.boneData.suffix;

        // Return cached data (prevents "Avatar loaded" spam during context recovery)
        return {
          scene: cached.scene,
          skeleton: null, // Skeleton already bound
          detectedPrefix: cached.boneData.prefix,
          detectedSuffix: cached.boneData.suffix,
          detectedBoneCount: cached.boneData.boneCount,
          detectedMeshCount: cached.boneData.meshCount,
        };
      }
    }

    const clone = SkeletonUtils.clone(originalScene);

    const bones: string[] = [];
    const skinnedMeshes: THREE.SkinnedMesh[] = [];
    let foundSkeleton: THREE.Skeleton | null = null;

    clone.traverse((child: THREE.Object3D) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
      if ((child as THREE.Bone).isBone) {
        bones.push(child.name);
        // Find spine bone for upper body aiming (prefer Spine2 for more visible effect)
        const boneName = child.name.toLowerCase();
        if (boneName.includes('spine2') || boneName.includes('spine1')) {
          if (boneName.includes('spine2') || !spineRef.current) {
            spineRef.current = child as THREE.Bone;
          }
        }
      }
      if ((child as THREE.SkinnedMesh).isSkinnedMesh) {
        const mesh = child as THREE.SkinnedMesh;
        skinnedMeshes.push(mesh);
        if (!foundSkeleton && mesh.skeleton) {
          foundSkeleton = mesh.skeleton;
        }
      }
    });

    // Detect bone prefix
    const hipsBone = bones.find(b => b.toLowerCase().includes('hips'));
    let prefix: 'none' | 'mixamorig' | 'mixamorig:' = 'none';
    let suffix = '';

    if (hipsBone) {
      if (hipsBone.startsWith('mixamorig:')) {
        prefix = 'mixamorig:';
      } else if (hipsBone.startsWith('mixamorig')) {
        prefix = 'mixamorig';
      }

      // Check for suffix
      const match = hipsBone.match(/Hips(_\d+)?$/i);
      if (match && match[1]) {
        suffix = match[1];
      }
    }

    detectedBonePrefixRef.current = prefix;
    detectedBoneSuffixRef.current = suffix;

    // Cache the clone in module-level cache (survives context recovery)
    const boneData = {
      prefix: prefix === 'none' ? 'Standard' : prefix,
      suffix,
      boneCount: bones.length,
      meshCount: skinnedMeshes.length,
    };
    avatarCloneCache.set(DEFAULT_AVATAR_PATH, {
      scene: clone,
      boneData,
      timestamp: Date.now(),
    });

    console.log(`🦴 Avatar loaded: ${bones.length} bones, ${skinnedMeshes.length} meshes, prefix: "${prefix}"`);

    // Return detected info along with scene (avoids setTimeout race condition)
    return {
      scene: clone,
      skeleton: foundSkeleton,
      detectedPrefix: boneData.prefix,
      detectedSuffix: suffix,
      detectedBoneCount: bones.length,
      detectedMeshCount: skinnedMeshes.length,
    };
  }, [originalScene]);

  // Extract values from useMemo result
  const clonedScene = sceneData.scene;

  // Update bone info state from useMemo result (avoids setTimeout race condition)
  useEffect(() => {
    setBoneInfo({
      prefix: sceneData.detectedPrefix,
      suffix: sceneData.detectedSuffix,
      boneCount: sceneData.detectedBoneCount,
      meshCount: sceneData.detectedMeshCount,
    });
  }, [sceneData]);

  // Create skeleton helper
  useEffect(() => {
    if (clonedScene && controls.showSkeleton) {
      // Find first skinned mesh for skeleton helper
      let rootBone: THREE.Object3D | null = null;
      clonedScene.traverse((child) => {
        if ((child as THREE.SkinnedMesh).isSkinnedMesh && !rootBone) {
          rootBone = child;
        }
      });

      if (rootBone) {
        const helper = new THREE.SkeletonHelper(rootBone);
        helper.visible = true;
        skeletonHelperRef.current = helper;
        clonedScene.add(helper);
      }
    }

    return () => {
      if (skeletonHelperRef.current) {
        skeletonHelperRef.current.removeFromParent();
        skeletonHelperRef.current = null;
      }
    };
  }, [clonedScene, controls.showSkeleton]);

  // Create bounding box helper
  useEffect(() => {
    if (clonedScene && controls.showBoundingBox) {
      const helper = new THREE.BoxHelper(clonedScene, 0x00ff00);
      boxHelperRef.current = helper;
      clonedScene.add(helper);
    }

    return () => {
      if (boxHelperRef.current) {
        boxHelperRef.current.removeFromParent();
        boxHelperRef.current = null;
      }
    };
  }, [clonedScene, controls.showBoundingBox]);

  // Update helpers each frame
  useFrame(() => {
    if (boxHelperRef.current && clonedScene) {
      boxHelperRef.current.update();
    }
  });

  // Ref for smooth lean interpolation (X-axis only - purely visual, doesn't affect world-space facing)
  const currentLeanX = useRef(0);

  // Apply character lean based on movement state
  // NOTE: Y rotation is handled EXCLUSIVELY by PhysicsPlayerController (single source of truth)
  // Read from animationState singleton directly to avoid stale props
  useFrame((_, delta) => {
    if (!avatarRef.current) return;

    // Read directly from singleton (avoids stale prop closures)
    const { isMoving: moving, isRunning: running, isAiming: aiming, isFiring: firing } = animationState;

    // Determine target lean based on movement state
    let targetLeanX = 0;
    if (firing) {
      targetLeanX = controls.fireLeanX;
    } else if (aiming) {
      targetLeanX = controls.aimLeanX;
    } else if (running) {
      targetLeanX = controls.runLeanX;
    } else if (moving) {
      targetLeanX = controls.walkLeanX;
    } else {
      targetLeanX = controls.idleLeanX;
    }

    // Smooth lerp towards target lean
    const leanT = 1 - Math.exp(-controls.leanLerpSpeed * delta);
    currentLeanX.current += (targetLeanX - currentLeanX.current) * leanT;

    // Apply lean rotation (X-axis only)
    const leanXRad = (currentLeanX.current * Math.PI) / 180;
    avatarRef.current.rotation.x = leanXRad;

    // Apply debug Y correction based on current animation state
    // Uses ref instead of React state to avoid 1-frame lag during transitions
    if (controls.debugYEnabled) {
      const debugYMap: Record<string, number> = {
        rifleIdle: controls.rifleIdleY,
        rifleWalk: controls.rifleWalkY,
        rifleRun: controls.rifleRunY,
        rifleAimIdle: controls.rifleAimIdleY,
        rifleAimWalk: controls.rifleAimWalkY,
        rifleFireStill: controls.rifleFireStillY,
        rifleFireWalk: controls.rifleFireWalkY,
        crouchRifleIdle: controls.crouchRifleIdleY,
        crouchRifleWalk: controls.crouchRifleWalkY,
        pistolIdle: controls.pistolIdleY,
        pistolWalk: controls.pistolWalkY,
        pistolRun: controls.pistolRunY,
      };
      const animState = currentStateRef.current;
      const debugY = debugYMap[animState] || 0;
      avatarRef.current.rotation.y = (debugY * Math.PI) / 180;
    } else {
      avatarRef.current.rotation.y = 0;
    }
  });

  // Refs for smooth spine aiming interpolation
  const currentSpinePitch = useRef(0);
  const baseSpineRotationX = useRef(0);

  // Upper body aiming - rotate spine bone to follow camera pitch
  useFrame((_, delta) => {
    // Read cameraPitch from singleton (avoids per-frame store overhead)
    const cameraPitch = combatFrameData.cameraPitch;

    // Read isAiming from singleton to avoid stale props
    const { isAiming: aiming } = animationState;

    // Only track spine when weapon equipped and (always tracking OR aiming)
    const shouldTrackSpine = controls.spineAimEnabled && weapon && (controls.spineAimAlways || aiming);

    if (spineRef.current && shouldTrackSpine) {
      // Capture the animation's base rotation BEFORE we modify it
      baseSpineRotationX.current = spineRef.current.rotation.x;

      // Calculate target spine pitch based on camera pitch
      // cameraPitch is negative when looking up, positive when looking down
      const maxAngleRad = (controls.spineAimMaxAngle * Math.PI) / 180;
      const targetSpinePitch = Math.max(-maxAngleRad, Math.min(maxAngleRad,
        cameraPitch * controls.spineAimMultiplier
      ));

      // Smooth interpolation for natural movement
      const spineT = 1 - Math.exp(-controls.spineAimSmoothing * delta);
      currentSpinePitch.current += (targetSpinePitch - currentSpinePitch.current) * spineT;

      // Apply offset FROM BASE rotation (prevents 360 accumulation)
      spineRef.current.rotation.x = baseSpineRotationX.current + currentSpinePitch.current;
    } else if (spineRef.current) {
      // Capture base rotation for return-to-neutral
      baseSpineRotationX.current = spineRef.current.rotation.x;

      // Smoothly return to neutral when no weapon equipped
      const returnT = 1 - Math.exp(-controls.spineAimSmoothing * delta);
      currentSpinePitch.current *= (1 - returnT);

      // Only apply if there's significant rotation to avoid jitter
      if (Math.abs(currentSpinePitch.current) > 0.001) {
        spineRef.current.rotation.x = baseSpineRotationX.current + currentSpinePitch.current;
      }
    }
  });

  // For player avatar: Check if animation state singleton has changed
  // This triggers FSM re-evaluation without full parent re-renders
  useFrame(() => {
    if (!isPlayer) return; // Only needed for player avatar

    const currentVersion = getAnimationVersion();
    if (currentVersion !== lastAnimVersionRef.current) {
      lastAnimVersionRef.current = currentVersion;
      // Trigger minimal re-render to update FSM input
      setAnimVersionTrigger(currentVersion);
    }
  });

  // Hips correction quaternion
  const hipsCorrection = useMemo(() => {
    const q = new THREE.Quaternion();
    q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
    return q;
  }, []);

  // Get processed clip from shared pool
  const getPooledClip = (rawClip: THREE.AnimationClip, clipName: string): THREE.AnimationClip => {
    const detectedPrefix = detectedBonePrefixRef.current;
    const boneSuffix = detectedBoneSuffixRef.current;
    const preserveHipsRotation = PRESERVE_HIPS_ROTATION_ANIMS.has(clipName);
    const preserveHipsPosition = PRESERVE_HIPS_POSITION_ANIMS.has(clipName);

    return AnimationClipPool.getClip(
      rawClip,
      clipName,
      detectedPrefix,
      boneSuffix,
      hipsCorrection,
      preserveHipsRotation,
      preserveHipsPosition
    );
  };

  // Collect animations
  const animations = useMemo(() => {
    const anims: THREE.AnimationClip[] = [];

    const addAnim = (gltf: { animations: THREE.AnimationClip[] }, name: string) => {
      if (gltf.animations[0]) {
        const clip = getPooledClip(gltf.animations[0], name);
        anims.push(clip);
      }
    };

    // Core locomotion
    addAnim(idleGltf, 'idle');
    addAnim(walkingGltf, 'walking');
    addAnim(runningGltf, 'running');
    addAnim(jumpGltf, 'jump');
    addAnim(jumpJogGltf, 'jumpJog');
    addAnim(jumpRunGltf, 'jumpRun');
    addAnim(dance1Gltf, 'dance1');
    addAnim(dance2Gltf, 'dance2');
    addAnim(dance3Gltf, 'dance3');

    // Rifle animations
    addAnim(rifleIdleGltf, 'rifleIdle');
    addAnim(rifleWalkGltf, 'rifleWalk');
    addAnim(rifleRunGltf, 'rifleRun');
    addAnim(rifleAimIdleGltf, 'rifleAimIdle');
    addAnim(rifleJumpGltf, 'rifleJump');
    addAnim(rifleFireStillGltf, 'rifleFireStill');
    addAnim(rifleFireWalkGltf, 'rifleFireWalk');

    // Pistol animations
    addAnim(pistolIdleGltf, 'pistolIdle');
    addAnim(pistolWalkGltf, 'pistolWalk');
    addAnim(pistolRunGltf, 'pistolRun');

    // Crouch + weapon animations
    addAnim(crouchRifleIdleGltf, 'crouchRifleIdle');
    addAnim(crouchRifleWalkGltf, 'crouchRifleWalk');
    addAnim(crouchPistolIdleGltf, 'crouchPistolIdle');
    addAnim(crouchPistolWalkGltf, 'crouchPistolWalk');

    console.log('🎬 Building animations with bone prefix:', detectedBonePrefixRef.current);
    return anims;
  }, [
    // Core locomotion
    idleGltf.animations, walkingGltf.animations, runningGltf.animations,
    jumpGltf.animations, jumpJogGltf.animations, jumpRunGltf.animations,
    dance1Gltf.animations, dance2Gltf.animations, dance3Gltf.animations,
    // Rifle
    rifleIdleGltf.animations, rifleWalkGltf.animations, rifleRunGltf.animations,
    rifleAimIdleGltf.animations, rifleJumpGltf.animations,
    rifleFireStillGltf.animations, rifleFireWalkGltf.animations,
    // Pistol
    pistolIdleGltf.animations, pistolWalkGltf.animations, pistolRunGltf.animations,
    // Crouch + weapon
    crouchRifleIdleGltf.animations, crouchRifleWalkGltf.animations,
    crouchPistolIdleGltf.animations, crouchPistolWalkGltf.animations,
    hipsCorrection,
    // NOTE: Bone prefix is read from ref (set synchronously in sceneData useMemo),
    // so no need to depend on boneInfo.prefix state which would cause double-render
    sceneData,
  ]);

  // Setup animations
  const { actions } = useAnimations(animations, group);

  useEffect(() => {
    if (!actions) return;
    configureAllActions(actions);
    console.log('🎬 Actions configured:', Object.keys(actions));
  }, [actions]);

  // Animation state machine input
  // For player avatars, read from singleton to avoid React re-renders
  // For non-player avatars (NPCs, remote players), use props
  const fsmInput: AnimationInput = useMemo(() => {
    if (isPlayer) {
      // Read from singleton - no React dependency, no re-renders
      const state = animationState;
      return {
        isMoving: state.isMoving,
        isRunning: state.isRunning,
        isGrounded: state.isGrounded,
        isJumping: state.isJumping,
        isFalling: state.isFalling,
        isCrouching: state.isCrouching,
        isDancing: state.isDancing,
        dancePressed: state.dancePressed,
        isStrafeLeft: state.isStrafingLeft,
        isStrafeRight: state.isStrafingRight,
        isAiming: state.isAiming,
        isFiring: state.isFiring,
        isDying,
        weapon: (weapon ?? 'none') as FSMWeaponType,
        velocityY: state.velocityY,
      };
    }
    // Non-player: use props (for NPCs, remote players)
    return {
      isMoving,
      isRunning,
      isGrounded,
      isJumping,
      isFalling,
      isCrouching,
      isDancing,
      dancePressed,
      isStrafeLeft: isStrafingLeft,
      isStrafeRight: isStrafingRight,
      isAiming,
      isFiring,
      isDying,
      weapon: (weapon ?? 'none') as FSMWeaponType,
      velocityY,
    };
  }, [
    // For player: animVersionTrigger causes re-memo when singleton changes
    // The singleton values are then read fresh
    isPlayer, weapon, isDying, animVersionTrigger,
    // Non-player props (only used when !isPlayer)
    isMoving, isRunning, isGrounded, isJumping, isFalling,
    isCrouching, isDancing, dancePressed, isStrafingLeft,
    isStrafingRight, isAiming, isFiring, velocityY,
  ]);

  // Use animation state machine
  const { currentState } = useAnimationStateMachine(
    actions as Record<string, THREE.AnimationAction | null>,
    fsmInput
  );

  // Update FSM state ref for immediate access in useFrame (avoids React state lag)
  currentStateRef.current = currentState;

  // Update current animation state for Leva display (async - only for UI)
  useEffect(() => {
    setCurrentAnimState(currentState);
  }, [currentState]);

  // Debug: Log animation state when weapon changes
  useEffect(() => {
    console.log('🔫 Weapon changed:', {
      weapon,
      fsmWeapon: weapon ?? 'none',
      currentState,
      hasActions: !!actions,
      actionKeys: actions ? Object.keys(actions) : [],
      rifleIdleAction: actions?.['rifleIdle'] ? 'exists' : 'missing',
    });
  }, [weapon, currentState, actions]);

  if (!clonedScene) {
    return null;
  }

  // Convert degrees to radians
  const rotXRad = (controls.rotX * Math.PI) / 180;
  const rotYRad = (controls.rotY * Math.PI) / 180;
  const rotZRad = (controls.rotZ * Math.PI) / 180;

  return (
    <group ref={group} scale={controls.scale}>
      <group ref={avatarRef}>
        <primitive
          object={clonedScene}
          position={[controls.posX, controls.posY, controls.posZ]}
          rotation={[rotXRad, rotYRad, rotZRad]}
        />
        {/* Axes helper for orientation debugging */}
        {controls.showAxes && (
          <axesHelper args={[controls.axesSize]} />
        )}
      </group>
      {/* Weapon model attachment */}
      {weapon && (
        <WeaponAttachment
          weaponType={weapon}
          avatarRef={avatarRef}
          currentAnimState={currentState}
        />
      )}
      {/* Equipment attachment (flashlight, tools) - only for player */}
      {isPlayer && <EquipmentAttachment avatarRef={avatarRef} />}
    </group>
  );
}, arePropsEqual);

// Re-export the memoized component with the original name
export const DefaultAvatar = DefaultAvatarInner;
export default DefaultAvatar;
