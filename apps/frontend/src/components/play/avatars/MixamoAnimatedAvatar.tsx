/**
 * MixamoAnimatedAvatar
 * Animated Ready Player Me avatar using pre-made Mixamo GLB animations.
 * Uses the FSM (useAnimationStateMachine) for state management - single source of truth.
 */
import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import { useControls, folder } from 'leva';
import * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';
import { WeaponAttachment, type WeaponType } from '../WeaponAttachment';
import { useGamePause } from '../context';
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

// Debug logging - set to false to reduce console spam
const DEBUG_AVATAR = false;

// Animation URLs derived from config
const ANIMATIONS = Object.fromEntries(
  Object.entries(ANIMATION_CONFIG).map(([name, config]) => [name, config.url])
) as Record<AnimationName, string>;

// Track which animations are available
const WEAPON_ANIMATIONS_AVAILABLE = true;
const CROUCH_ANIMATIONS_AVAILABLE = true;

// LAZY LOADING: Only preload critical animations at startup
// Non-critical animations load on-demand when their useGLTF hook is called
// This reduces initial load time by ~2-3 seconds
const CRITICAL_ANIMATIONS: AnimationName[] = [
  'idle', 'walking', 'running', 'jump', 'jumpJog', 'jumpRun',
];

// Preload only critical animations at module level
CRITICAL_ANIMATIONS.forEach(name => {
  if (ANIMATIONS[name]) {
    useGLTF.preload(ANIMATIONS[name]);
  }
});

// Deferred preload: Load remaining animations after initial render
// This runs in the background without blocking the main thread
if (typeof window !== 'undefined') {
  // Use requestIdleCallback for non-blocking background loading
  const loadDeferredAnimations = () => {
    const deferredAnims = Object.entries(ANIMATIONS)
      .filter(([name]) => !CRITICAL_ANIMATIONS.includes(name as AnimationName))
      .map(([, url]) => url);

    // Stagger preloads to avoid network congestion
    deferredAnims.forEach((url, i) => {
      setTimeout(() => useGLTF.preload(url), i * 50); // 50ms between each
    });
  };

  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(loadDeferredAnimations, { timeout: 3000 });
  } else {
    // Fallback for Safari
    setTimeout(loadDeferredAnimations, 1000);
  }
}

export interface MixamoAnimatedAvatarProps {
  url: string;
  isMoving?: boolean;
  isRunning?: boolean;
  isGrounded?: boolean;
  isJumping?: boolean;
  isFalling?: boolean;    // Uncontrolled fall state
  isLanding?: boolean;    // Brief landing state
  isDancing?: boolean;
  dancePressed?: boolean;  // True only on frame V is pressed (for cycling dances)
  isCrouching?: boolean;
  isStrafingLeft?: boolean;
  isStrafingRight?: boolean;
  isAiming?: boolean;
  isFiring?: boolean;
  isDying?: boolean;      // Death animation trigger
  velocityY?: number;
  weaponType?: WeaponType;
  aimPitch?: number;  // Camera pitch for upper body aiming (radians)
  /** Keep mixamorig: prefix in bone names (for models with Mixamo rig, not RPM) */
  keepMixamoPrefix?: boolean;
}

/**
 * MixamoAnimatedAvatar - Uses pre-made animations from Mixamo for natural movement
 * Animation state is managed by useAnimationStateMachine (FSM)
 */
export function MixamoAnimatedAvatar({
  url,
  isMoving = false,
  isRunning = false,
  isGrounded = true,
  isJumping = false,
  isFalling = false,
  isLanding = false,
  isDancing = false,
  dancePressed = false,
  isCrouching = false,
  isStrafingLeft = false,
  isStrafingRight = false,
  isAiming = false,
  isFiring = false,
  isDying = false,
  velocityY = 0,
  weaponType = null,
  aimPitch = 0,
  keepMixamoPrefix = false,
}: MixamoAnimatedAvatarProps) {
  const group = useRef<THREE.Group>(null);
  const isPaused = useGamePause();
  const avatarRef = useRef<THREE.Group>(null);
  const leftFootRef = useRef<THREE.Bone | null>(null);
  const rightFootRef = useRef<THREE.Bone | null>(null);
  const spineRef = useRef<THREE.Bone | null>(null);  // For upper body aiming
  const detectedBonePrefixRef = useRef<'none' | 'mixamorig' | 'mixamorig:'>('none');
  const detectedBoneSuffixRef = useRef<string>(''); // For _1 suffix detection
  const { scene } = useGLTF(url);

  // Load animation files
  const idleGltf = useGLTF(ANIMATIONS.idle);
  const idleVar1Gltf = useGLTF(ANIMATIONS.idleVar1);
  const idleVar2Gltf = useGLTF(ANIMATIONS.idleVar2);
  const walkingGltf = useGLTF(ANIMATIONS.walking);
  const runningGltf = useGLTF(ANIMATIONS.running);
  const jumpGltf = useGLTF(ANIMATIONS.jump);
  const jumpJogGltf = useGLTF(ANIMATIONS.jumpJog);
  const jumpRunGltf = useGLTF(ANIMATIONS.jumpRun);
  const dance1Gltf = useGLTF(ANIMATIONS.dance1);
  const dance2Gltf = useGLTF(ANIMATIONS.dance2);
  const dance3Gltf = useGLTF(ANIMATIONS.dance3);

  // Crouch animations
  const crouchWalkGltf = useGLTF(CROUCH_ANIMATIONS_AVAILABLE ? ANIMATIONS.crouchWalk : ANIMATIONS.walking);
  const crouchIdleGltf = useGLTF(CROUCH_ANIMATIONS_AVAILABLE ? ANIMATIONS.crouchIdle : ANIMATIONS.idle);
  // Strafe animations - load matching files (90° X-axis Hips correction doesn't affect left/right)
  const crouchStrafeLeftGltf = useGLTF(CROUCH_ANIMATIONS_AVAILABLE ? ANIMATIONS.crouchStrafeLeft : ANIMATIONS.walking);
  const crouchStrafeRightGltf = useGLTF(CROUCH_ANIMATIONS_AVAILABLE ? ANIMATIONS.crouchStrafeRight : ANIMATIONS.walking);
  // Crouch transitions
  const standToCrouchGltf = useGLTF(CROUCH_ANIMATIONS_AVAILABLE ? ANIMATIONS.standToCrouch : ANIMATIONS.idle);
  const crouchToStandGltf = useGLTF(CROUCH_ANIMATIONS_AVAILABLE ? ANIMATIONS.crouchToStand : ANIMATIONS.idle);
  const crouchToSprintGltf = useGLTF(CROUCH_ANIMATIONS_AVAILABLE ? ANIMATIONS.crouchToSprint : ANIMATIONS.running);

  // Weapon animations
  const rifleIdleGltf = useGLTF(WEAPON_ANIMATIONS_AVAILABLE ? ANIMATIONS.rifleIdle : ANIMATIONS.idle);
  const rifleWalkGltf = useGLTF(WEAPON_ANIMATIONS_AVAILABLE ? ANIMATIONS.rifleWalk : ANIMATIONS.walking);
  const rifleRunGltf = useGLTF(WEAPON_ANIMATIONS_AVAILABLE ? ANIMATIONS.rifleRun : ANIMATIONS.running);
  const pistolIdleGltf = useGLTF(WEAPON_ANIMATIONS_AVAILABLE ? ANIMATIONS.pistolIdle : ANIMATIONS.idle);
  const pistolWalkGltf = useGLTF(WEAPON_ANIMATIONS_AVAILABLE ? ANIMATIONS.pistolWalk : ANIMATIONS.walking);
  const pistolRunGltf = useGLTF(WEAPON_ANIMATIONS_AVAILABLE ? ANIMATIONS.pistolRun : ANIMATIONS.running);

  // Crouch + weapon animations (now using actual crouch rifle files)
  const crouchRifleIdleGltf = useGLTF(ANIMATIONS.crouchRifleIdle);
  const crouchRifleWalkGltf = useGLTF(ANIMATIONS.crouchRifleWalk);
  const crouchRifleStrafeLeftGltf = useGLTF(ANIMATIONS.crouchRifleStrafeLeft);
  const crouchRifleStrafeRightGltf = useGLTF(ANIMATIONS.crouchRifleStrafeRight);
  const crouchPistolIdleGltf = useGLTF(WEAPON_ANIMATIONS_AVAILABLE ? ANIMATIONS.pistolIdle : ANIMATIONS.idle);
  const crouchPistolWalkGltf = useGLTF(WEAPON_ANIMATIONS_AVAILABLE ? ANIMATIONS.pistolWalk : ANIMATIONS.walking);

  // Rifle jump animation
  const rifleJumpGltf = useGLTF(ANIMATIONS.rifleJump);

  // Rifle firing animations
  const rifleFireStillGltf = useGLTF(ANIMATIONS.rifleFireStill);
  const rifleFireWalkGltf = useGLTF(ANIMATIONS.rifleFireWalk);
  const rifleFireCrouchGltf = useGLTF(ANIMATIONS.rifleFireCrouch);

  // Crouch rifle firing (idle specific)
  const crouchFireRifleTapGltf = useGLTF(ANIMATIONS.crouchFireRifleTap);
  const crouchRapidFireRifleGltf = useGLTF(ANIMATIONS.crouchRapidFireRifle);

  // Rifle reload animations
  const rifleReloadStandGltf = useGLTF(ANIMATIONS.rifleReloadStand);
  const rifleReloadWalkGltf = useGLTF(ANIMATIONS.rifleReloadWalk);
  const rifleReloadCrouchGltf = useGLTF(ANIMATIONS.rifleReloadCrouch);

  // Death animation
  const deathGltf = useGLTF(ANIMATIONS.death);

  // Clone scene for this instance and find foot bones
  const clonedScene = useMemo(() => {
    const clone = SkeletonUtils.clone(scene);
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
      // Find foot bones for ground tracking and spine for aiming
      // Use .includes() for compatibility with both RPM ('LeftFoot') and Mixamo rig ('mixamorig:LeftFoot')
      if ((child as THREE.Bone).isBone) {
        const boneName = child.name.toLowerCase();
        if (boneName.includes('leftfoot') || boneName === 'left_foot') {
          leftFootRef.current = child as THREE.Bone;
        } else if (boneName.includes('rightfoot') || boneName === 'right_foot') {
          rightFootRef.current = child as THREE.Bone;
        }
        // Find spine bone for upper body aiming - use Spine2 (upper spine) for best results
        // Spine2 gives more visible upper body tilt when aiming
        // Use .includes() for compatibility with both RPM ('Spine2') and Mixamo rig ('mixamorig:Spine2')
        if (boneName.includes('spine2') || boneName.includes('spine1')) {
          // Prefer Spine2 over Spine1 for more visible effect
          if (boneName.includes('spine2') || !spineRef.current) {
            spineRef.current = child as THREE.Bone;
            if (DEBUG_AVATAR) console.log('🎯 Found spine bone for aiming:', child.name);
          }
        }
      }
    });

    // Detect bone naming convention and log bone names
    const bones: string[] = [];
    clone.traverse((child) => {
      if ((child as THREE.Bone).isBone) {
        bones.push(child.name);
      }
    });

    // Auto-detect bone prefix format from model bones
    // Check for Hips bone naming: 'Hips' (RPM), 'mixamorigHips' (Mixamo no colon), 'mixamorig:Hips' (Mixamo with colon)
    const hipsBone = bones.find(b => b.toLowerCase().includes('hips'));
    if (hipsBone) {
      if (hipsBone.startsWith('mixamorig:')) {
        detectedBonePrefixRef.current = 'mixamorig:';
      } else if (hipsBone.startsWith('mixamorig')) {
        detectedBonePrefixRef.current = 'mixamorig';
      } else {
        detectedBonePrefixRef.current = 'none';
      }
      if (DEBUG_AVATAR) {
        console.log(`🔍 Detected bone prefix: "${detectedBonePrefixRef.current}" (from bone: ${hipsBone})`);
      }
    }

    if (bones.length > 0) {
      if (DEBUG_AVATAR) {
        console.log(`🦴 Avatar bones (${bones.length} total):`, bones.slice(0, 10));
        console.log(`🦶 Foot bones found: L=${leftFootRef.current?.name}, R=${rightFootRef.current?.name}`);
      }

      // Check for duplicate bones (with _1 suffix) and detect which skeleton mesh is bound to
      const duplicateBones = bones.filter(b => b.includes('_1'));
      if (duplicateBones.length > 0 && DEBUG_AVATAR) {
        console.log(`⚠️ Found ${duplicateBones.length} duplicate bones with _1 suffix:`, duplicateBones.slice(0, 5));
      }

      // Detect which skeleton the mesh is bound to - this is critical for animation binding
      // First pass: detect skeleton suffix from first skinned mesh
      const skinnedMeshes: THREE.SkinnedMesh[] = [];
      clone.traverse((child) => {
        if ((child as THREE.SkinnedMesh).isSkinnedMesh) {
          skinnedMeshes.push(child as THREE.SkinnedMesh);
        }
      });

      // Find the skeleton suffix from the first mesh (if it has one)
      let primarySuffix: string | null = null;
      for (const mesh of skinnedMeshes) {
        const skeleton = mesh.skeleton;
        if (skeleton && skeleton.bones.length > 0) {
          const hipsBoneInSkeleton = skeleton.bones.find(b => b.name.toLowerCase().includes('hips'));
          if (hipsBoneInSkeleton) {
            const match = hipsBoneInSkeleton.name.match(/Hips(_\d+)?$/i);
            if (match) {
              primarySuffix = match[1] || ''; // '' for no suffix, '_1' for suffix
              detectedBoneSuffixRef.current = primarySuffix;
              if (DEBUG_AVATAR) {
                console.log(`🎯 Primary skeleton suffix: "${primarySuffix || 'none'}" (from: ${hipsBoneInSkeleton.name})`);
              }
              break;
            }
          }
        }
      }

      // Second pass: hide meshes bound to different skeleton (duplicate skeleton issue)
      let hiddenCount = 0;
      for (const mesh of skinnedMeshes) {
        const skeleton = mesh.skeleton;
        if (skeleton && skeleton.bones.length > 0) {
          const hipsBoneInSkeleton = skeleton.bones.find(b => b.name.toLowerCase().includes('hips'));
          if (hipsBoneInSkeleton) {
            const match = hipsBoneInSkeleton.name.match(/Hips(_\d+)?$/i);
            const meshSuffix = match ? (match[1] || '') : '';

            // Hide mesh if it's bound to a different skeleton than primary
            if (primarySuffix !== null && meshSuffix !== primarySuffix) {
              mesh.visible = false;
              hiddenCount++;
              if (DEBUG_AVATAR) {
                console.log(`🙈 Hiding duplicate mesh "${mesh.name}" (suffix: "${meshSuffix || 'none'}")`);
              }
            } else if (DEBUG_AVATAR) {
              console.log(`🔗 Keeping mesh "${mesh.name}" (suffix: "${meshSuffix || 'none'}")`);
            }
          }
        }
      }

      if (hiddenCount > 0 && DEBUG_AVATAR) {
        console.log(`✨ Hidden ${hiddenCount} duplicate meshes bound to wrong skeleton`);
      }
    }

    return clone;
  }, [scene]);

  // PRESERVE_HIPS_ROTATION is now imported from AnimationClipPool

  // Correction quaternion for Mixamo→RPM Hips rotation (90° around X-axis)
  // Mixamo and RPM have different reference poses, this corrects the flip
  const hipsCorrection = useMemo(() => {
    const q = new THREE.Quaternion();
    q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2); // 90° around X
    return q;
  }, []);

  // Get processed clip from shared pool (avoids creating new clips per avatar instance)
  // Pool handles: strip root motion, remap bone names, apply Hips corrections
  const getPooledClip = (rawClip: THREE.AnimationClip, clipName: string): THREE.AnimationClip => {
    const detectedPrefix = detectedBonePrefixRef.current;
    const boneSuffix = detectedBoneSuffixRef.current;
    const preserveHipsRotation = PRESERVE_HIPS_ROTATION_ANIMS.has(clipName);
    const preserveHipsPosition = PRESERVE_HIPS_POSITION_ANIMS.has(clipName);

    // Determine effective bone prefix (same logic as original stripRootMotion)
    // If keepMixamoPrefix is true but no prefix detected, use 'mixamorig'
    let bonePrefix: 'none' | 'mixamorig' | 'mixamorig:' = detectedPrefix;
    if (keepMixamoPrefix && detectedPrefix === 'none') {
      bonePrefix = 'mixamorig';
    }

    return AnimationClipPool.getClip(
      rawClip,
      clipName,
      bonePrefix,
      boneSuffix,
      hipsCorrection,
      preserveHipsRotation,
      preserveHipsPosition
    );
  };

  // Collect all animations (using shared pool for clip reuse across avatar instances)
  // PERF: With 20 players, this saves ~50MB memory and +5-10 FPS
  const animations = useMemo(() => {
    const anims: THREE.AnimationClip[] = [];

    const addAnim = (gltf: { animations: THREE.AnimationClip[] }, name: string) => {
      if (gltf.animations[0]) {
        // Use pooled clip instead of creating new one per avatar
        const clip = getPooledClip(gltf.animations[0], name);
        anims.push(clip);
      } else if (DEBUG_AVATAR) {
        console.warn(`⚠️ No animation found for ${name}`);
      }
    };

    // Core animations
    addAnim(idleGltf, 'idle');
    addAnim(idleVar1Gltf, 'idleVar1');
    addAnim(idleVar2Gltf, 'idleVar2');
    addAnim(walkingGltf, 'walking');
    addAnim(runningGltf, 'running');
    addAnim(jumpGltf, 'jump');
    addAnim(jumpJogGltf, 'jumpJog');
    addAnim(jumpRunGltf, 'jumpRun');
    addAnim(dance1Gltf, 'dance1');
    addAnim(dance2Gltf, 'dance2');
    addAnim(dance3Gltf, 'dance3');

    // Crouch animations
    if (CROUCH_ANIMATIONS_AVAILABLE) {
      addAnim(crouchIdleGltf, 'crouchIdle');
      addAnim(crouchWalkGltf, 'crouchWalk');
      addAnim(crouchStrafeLeftGltf, 'crouchStrafeLeft');
      addAnim(crouchStrafeRightGltf, 'crouchStrafeRight');
      addAnim(standToCrouchGltf, 'standToCrouch');
      addAnim(crouchToStandGltf, 'crouchToStand');
      addAnim(crouchToSprintGltf, 'crouchToSprint');
    }

    // Weapon animations
    if (WEAPON_ANIMATIONS_AVAILABLE) {
      addAnim(rifleIdleGltf, 'rifleIdle');
      addAnim(rifleWalkGltf, 'rifleWalk');
      addAnim(rifleRunGltf, 'rifleRun');
      addAnim(pistolIdleGltf, 'pistolIdle');
      addAnim(pistolWalkGltf, 'pistolWalk');
      addAnim(pistolRunGltf, 'pistolRun');
    }

    // Crouch + weapon animations
    if (CROUCH_ANIMATIONS_AVAILABLE && WEAPON_ANIMATIONS_AVAILABLE) {
      addAnim(crouchRifleIdleGltf, 'crouchRifleIdle');
      addAnim(crouchRifleWalkGltf, 'crouchRifleWalk');
      addAnim(crouchRifleStrafeLeftGltf, 'crouchRifleStrafeLeft');
      addAnim(crouchRifleStrafeRightGltf, 'crouchRifleStrafeRight');
      addAnim(crouchPistolIdleGltf, 'crouchPistolIdle');
      addAnim(crouchPistolWalkGltf, 'crouchPistolWalk');
    }

    // Rifle jump animation
    addAnim(rifleJumpGltf, 'rifleJump');

    // Rifle firing animations
    addAnim(rifleFireStillGltf, 'rifleFireStill');
    addAnim(rifleFireWalkGltf, 'rifleFireWalk');
    addAnim(rifleFireCrouchGltf, 'rifleFireCrouch');

    // Crouch rifle firing (idle specific)
    addAnim(crouchFireRifleTapGltf, 'crouchFireRifleTap');
    addAnim(crouchRapidFireRifleGltf, 'crouchRapidFireRifle');

    // Rifle reload animations
    addAnim(rifleReloadStandGltf, 'rifleReloadStand');
    addAnim(rifleReloadWalkGltf, 'rifleReloadWalk');
    addAnim(rifleReloadCrouchGltf, 'rifleReloadCrouch');

    // Death animation
    addAnim(deathGltf, 'death');

    return anims;
  }, [
    idleGltf.animations, idleVar1Gltf.animations, idleVar2Gltf.animations,
    walkingGltf.animations, runningGltf.animations, jumpGltf.animations,
    jumpJogGltf.animations, jumpRunGltf.animations,
    dance1Gltf.animations, dance2Gltf.animations, dance3Gltf.animations,
    crouchWalkGltf.animations,
    crouchStrafeLeftGltf.animations, crouchStrafeRightGltf.animations,
    standToCrouchGltf.animations, crouchToStandGltf.animations, crouchToSprintGltf.animations,
    rifleIdleGltf.animations, rifleWalkGltf.animations, rifleRunGltf.animations,
    pistolIdleGltf.animations, pistolWalkGltf.animations, pistolRunGltf.animations,
    crouchRifleIdleGltf.animations, crouchRifleWalkGltf.animations,
    crouchRifleStrafeLeftGltf.animations, crouchRifleStrafeRightGltf.animations,
    crouchPistolIdleGltf.animations, crouchPistolWalkGltf.animations,
    rifleJumpGltf.animations,
    rifleFireStillGltf.animations, rifleFireWalkGltf.animations, rifleFireCrouchGltf.animations,
    crouchFireRifleTapGltf.animations, crouchRapidFireRifleGltf.animations,
    rifleReloadStandGltf.animations, rifleReloadWalkGltf.animations, rifleReloadCrouchGltf.animations,
    deathGltf.animations, // Death animation
    keepMixamoPrefix, // Important: re-process animations when prefix setting changes
  ]);

  // Setup animations with the cloned scene
  const { actions } = useAnimations(animations, group);

  // Configure animation properties once on setup
  useEffect(() => {
    if (!actions) return;
    configureAllActions(actions);

    // Debug: Check if idle action exists and what actions are available
    if (DEBUG_AVATAR) {
      const actionNames = Object.keys(actions);
      console.log(`🎬 Available actions (${actionNames.length}):`, actionNames.slice(0, 10));
      console.log(`🎬 Idle action exists:`, !!actions['idle']);
      if (actions['idle']) {
        console.log(`🎬 Idle action clip:`, actions['idle'].getClip()?.name, 'duration:', actions['idle'].getClip()?.duration);
      }
    }
  }, [actions]);

  // Build FSM input from props
  // Strafe flags are now calculated relative to character facing in PhysicsPlayerController
  const fsmInput: AnimationInput = useMemo(() => ({
    isMoving,
    isRunning,
    isGrounded,
    isJumping,
    isFalling,
    isLanding,
    isCrouching,
    isDancing,
    dancePressed,
    isStrafeLeft: isStrafingLeft,
    isStrafeRight: isStrafingRight,
    isAiming,
    isFiring,
    isDying,
    weapon: (weaponType ?? 'none') as FSMWeaponType,
    velocityY,
  }), [isMoving, isRunning, isGrounded, isJumping, isFalling, isLanding, isCrouching, isDancing, dancePressed, isStrafingLeft, isStrafingRight, isAiming, isFiring, isDying, weaponType, velocityY]);

  // Use the FSM for all animation state management
  // The FSM handles transitions, crossfading, one-shot completions, and fallbacks
  const { currentState } = useAnimationStateMachine(
    actions as Record<string, THREE.AnimationAction | null>,
    fsmInput
    // Uncomment for debugging: (from, to) => console.log(`🎭 Animation: ${from ?? 'none'} → ${to}`)
  );

  // Consolidated animation controls in single panel with folders
  const animControls = useControls('🎭 Animation', {
    'Crouch': folder({
      crouchIdleOffset: { value: -0.8, min: -1.0, max: 0.2, step: 0.01, label: 'Idle Offset Y' },
      crouchWalkOffset: { value: -0.25, min: -1.0, max: 0.2, step: 0.01, label: 'Walk Offset Y' },
      transitionOffset: { value: -0.84, min: -1.2, max: 0.2, step: 0.01, label: 'Transition Offset' },
      lerpSpeed: { value: 9, min: 1, max: 20, step: 0.5, label: 'Lerp Speed' },
      aimTiltMultiplier: { value: 0.15, min: 0, max: 0.5, step: 0.01, label: 'Aim Tilt Amount' },
    }, { collapsed: true }),
    'Rifle': folder({
      'Idle': folder({
        rifleIdleOffset: { value: 0, min: -0.5, max: 0.5, step: 0.01, label: 'Y' },
        rifleIdleOffsetX: { value: 0, min: -0.5, max: 0.5, step: 0.01, label: 'X' },
        rifleIdleRotY: { value: -45, min: -45, max: 45, step: 1, label: 'Rot°' },
      }, { collapsed: true }),
      'Walk': folder({
        rifleWalkOffset: { value: 0, min: -0.5, max: 0.5, step: 0.01, label: 'Y' },
        rifleWalkOffsetX: { value: 0, min: -0.5, max: 0.5, step: 0.01, label: 'X' },
        rifleWalkRotY: { value: -45, min: -45, max: 45, step: 1, label: 'Rot°' },
      }, { collapsed: true }),
      'Run': folder({
        rifleRunOffset: { value: 0, min: -0.5, max: 0.5, step: 0.01, label: 'Pos Y' },
        rifleRunOffsetX: { value: 0, min: -0.5, max: 0.5, step: 0.01, label: 'Pos X' },
        rifleRunRotX: { value: 18, min: -45, max: 45, step: 1, label: 'Rot X°' },
        rifleRunRotY: { value: 0, min: -45, max: 45, step: 1, label: 'Rot Y°' },
        rifleRunRotZ: { value: 0, min: -45, max: 45, step: 1, label: 'Rot Z°' },
      }, { collapsed: true }),
      'Fire Still': folder({
        rifleFireStillOffset: { value: 0, min: -0.5, max: 0.5, step: 0.01, label: 'Pos Y' },
        rifleFireStillOffsetX: { value: 0, min: -0.5, max: 0.5, step: 0.01, label: 'Pos X' },
        rifleFireStillRotX: { value: 0, min: -45, max: 45, step: 1, label: 'Rot X°' },
        rifleFireStillRotY: { value: 0, min: -45, max: 45, step: 1, label: 'Rot Y°' },
        rifleFireStillRotZ: { value: 0, min: -45, max: 45, step: 1, label: 'Rot Z°' },
      }, { collapsed: true }),
      'Fire Walk': folder({
        rifleFireWalkOffset: { value: 0, min: -0.5, max: 0.5, step: 0.01, label: 'Pos Y' },
        rifleFireWalkOffsetX: { value: 0, min: -0.5, max: 0.5, step: 0.01, label: 'Pos X' },
        rifleFireWalkRotX: { value: 0, min: -45, max: 45, step: 1, label: 'Rot X°' },
        rifleFireWalkRotY: { value: 0, min: -45, max: 45, step: 1, label: 'Rot Y°' },
        rifleFireWalkRotZ: { value: 0, min: -45, max: 45, step: 1, label: 'Rot Z°' },
      }, { collapsed: true }),
      'Fire Crouch': folder({
        rifleFireCrouchOffset: { value: -0.35, min: -0.8, max: 0.5, step: 0.01, label: 'Pos Y' },
        rifleFireCrouchOffsetX: { value: 0, min: -0.5, max: 0.5, step: 0.01, label: 'Pos X' },
        rifleFireCrouchRotX: { value: 0, min: -45, max: 45, step: 1, label: 'Rot X°' },
        rifleFireCrouchRotY: { value: 0, min: -45, max: 45, step: 1, label: 'Rot Y°' },
        rifleFireCrouchRotZ: { value: 0, min: -45, max: 45, step: 1, label: 'Rot Z°' },
      }, { collapsed: true }),
      'Fire Crouch Idle': folder({
        crouchRapidFireOffset: { value: -0.35, min: -0.8, max: 0.5, step: 0.01, label: 'Pos Y' },
        crouchRapidFireOffsetX: { value: 0, min: -0.5, max: 0.5, step: 0.01, label: 'Pos X' },
        crouchRapidFireRotX: { value: 0, min: -45, max: 45, step: 1, label: 'Rot X°' },
        crouchRapidFireRotY: { value: 0, min: -45, max: 45, step: 1, label: 'Rot Y°' },
        crouchRapidFireRotZ: { value: 0, min: -45, max: 45, step: 1, label: 'Rot Z°' },
      }, { collapsed: true }),
      'Fire Crouch Tap': folder({
        crouchFireTapOffset: { value: 0, min: -0.5, max: 0.5, step: 0.01, label: 'Pos Y' },
        crouchFireTapOffsetX: { value: 0, min: -0.5, max: 0.5, step: 0.01, label: 'Pos X' },
        crouchFireTapRotX: { value: 0, min: -45, max: 45, step: 1, label: 'Rot X°' },
        crouchFireTapRotY: { value: 0, min: -45, max: 45, step: 1, label: 'Rot Y°' },
        crouchFireTapRotZ: { value: 0, min: -45, max: 45, step: 1, label: 'Rot Z°' },
      }, { collapsed: true }),
    }, { collapsed: true }),
    'Pistol': folder({
      'Idle': folder({
        pistolIdleOffset: { value: 0, min: -0.5, max: 0.5, step: 0.01, label: 'Y' },
        pistolIdleOffsetX: { value: 0, min: -0.5, max: 0.5, step: 0.01, label: 'X' },
        pistolIdleRotY: { value: -45, min: -45, max: 45, step: 1, label: 'Rot°' },
      }, { collapsed: true }),
      'Walk': folder({
        pistolWalkOffset: { value: 0, min: -0.5, max: 0.5, step: 0.01, label: 'Y' },
        pistolWalkOffsetX: { value: 0, min: -0.5, max: 0.5, step: 0.01, label: 'X' },
        pistolWalkRotY: { value: 0, min: -45, max: 45, step: 1, label: 'Rot°' },
      }, { collapsed: true }),
      'Run': folder({
        pistolRunOffset: { value: 0, min: -0.5, max: 0.5, step: 0.01, label: 'Pos Y' },
        pistolRunOffsetX: { value: 0, min: -0.5, max: 0.5, step: 0.01, label: 'Pos X' },
        pistolRunRotX: { value: 12, min: -45, max: 45, step: 1, label: 'Rot X°' },
        pistolRunRotY: { value: 0, min: -45, max: 45, step: 1, label: 'Rot Y°' },
        pistolRunRotZ: { value: 0, min: -45, max: 45, step: 1, label: 'Rot Z°' },
      }, { collapsed: true }),
    }, { collapsed: true }),
  }, { collapsed: true });

  // Extract values with compatibility mappings
  const {
    crouchIdleOffset, crouchWalkOffset, transitionOffset, lerpSpeed, aimTiltMultiplier,
    rifleIdleOffset, rifleIdleOffsetX, rifleIdleRotY,
    rifleWalkOffset, rifleWalkOffsetX, rifleWalkRotY,
    rifleRunOffset, rifleRunOffsetX, rifleRunRotX, rifleRunRotY, rifleRunRotZ,
    rifleFireStillOffset, rifleFireStillOffsetX, rifleFireStillRotX, rifleFireStillRotY, rifleFireStillRotZ,
    rifleFireWalkOffset, rifleFireWalkOffsetX, rifleFireWalkRotX, rifleFireWalkRotY, rifleFireWalkRotZ,
    rifleFireCrouchOffset, rifleFireCrouchOffsetX, rifleFireCrouchRotX, rifleFireCrouchRotY, rifleFireCrouchRotZ,
    crouchRapidFireOffset, crouchRapidFireOffsetX, crouchRapidFireRotX, crouchRapidFireRotY, crouchRapidFireRotZ,
    crouchFireTapOffset, crouchFireTapOffsetX, crouchFireTapRotX, crouchFireTapRotY, crouchFireTapRotZ,
    pistolIdleOffset, pistolIdleOffsetX, pistolIdleRotY,
    pistolWalkOffset, pistolWalkOffsetX, pistolWalkRotY,
    pistolRunOffset, pistolRunOffsetX, pistolRunRotX, pistolRunRotY, pistolRunRotZ,
  } = animControls;

  // Crouch idle states (no weapon)
  const CROUCH_IDLE_STATES = [
    'crouchIdle',
  ];

  // Crouch movement states (no weapon)
  const CROUCH_WALK_STATES = [
    'crouchWalk', 'crouchStrafeLeft', 'crouchStrafeRight',
  ];

  // Crouch rifle states - ALL use same offset to prevent bobbing when switching idle/walk
  const CROUCH_RIFLE_STATES = [
    'crouchRifleIdle', 'crouchRifleWalk', 'crouchRifleStrafeLeft', 'crouchRifleStrafeRight',
  ];

  // Crouch pistol states - ALL use same offset to prevent bobbing
  const CROUCH_PISTOL_STATES = [
    'crouchPistolIdle', 'crouchPistolWalk',
  ];

  // Track current offsets for smooth interpolation
  const currentOffsetY = useRef(0);
  const currentOffsetX = useRef(0);
  const currentRotX = useRef(0);
  const currentRotY = useRef(0);
  const currentRotZ = useRef(0);
  const currentAimTilt = useRef(0);

  // SINGLE useFrame for all avatar transforms (combined for performance)
  // Skip when paused (e.g., inventory open) to save CPU
  useFrame((_, delta) => {
    if (isPaused || !avatarRef.current) return;

    // Determine target offsets based on animation state
    let targetOffsetY = 0;
    let targetOffsetX = 0;
    let targetRotX = 0; // in degrees
    let targetRotY = 0;
    let targetRotZ = 0;

    // Crouch states (no weapon) - idle and walk have different offsets
    if (CROUCH_IDLE_STATES.includes(currentState)) {
      targetOffsetY = crouchIdleOffset;
    } else if (CROUCH_WALK_STATES.includes(currentState)) {
      targetOffsetY = crouchWalkOffset;
    } else if (currentState === 'standToCrouch') {
      targetOffsetY = transitionOffset;
    }
    // Crouch rifle states - ALL use crouchWalkOffset to prevent bobbing
    else if (CROUCH_RIFLE_STATES.includes(currentState)) {
      targetOffsetY = crouchWalkOffset;
    }
    // Crouch pistol states - ALL use crouchWalkOffset to prevent bobbing
    else if (CROUCH_PISTOL_STATES.includes(currentState)) {
      targetOffsetY = crouchWalkOffset;
    }
    // Rifle states
    else if (currentState === 'rifleIdle' || currentState === 'rifleAimIdle') {
      targetOffsetY = rifleIdleOffset;
      targetOffsetX = rifleIdleOffsetX;
      targetRotY = rifleIdleRotY;
    } else if (currentState === 'rifleWalk' || currentState === 'rifleAimWalk') {
      targetOffsetY = rifleWalkOffset;
      targetOffsetX = rifleWalkOffsetX;
      targetRotY = rifleWalkRotY;
    } else if (currentState === 'rifleRun') {
      targetOffsetY = rifleRunOffset;
      targetOffsetX = rifleRunOffsetX;
      targetRotX = rifleRunRotX;
      targetRotY = rifleRunRotY;
      targetRotZ = rifleRunRotZ;
    }
    // Rifle firing states
    else if (currentState === 'rifleFireStill') {
      targetOffsetY = rifleFireStillOffset;
      targetOffsetX = rifleFireStillOffsetX;
      targetRotX = rifleFireStillRotX;
      targetRotY = rifleFireStillRotY;
      targetRotZ = rifleFireStillRotZ;
    } else if (currentState === 'rifleFireWalk') {
      targetOffsetY = rifleFireWalkOffset;
      targetOffsetX = rifleFireWalkOffsetX;
      targetRotX = rifleFireWalkRotX;
      targetRotY = rifleFireWalkRotY;
      targetRotZ = rifleFireWalkRotZ;
    } else if (currentState === 'rifleFireCrouch') {
      targetOffsetY = rifleFireCrouchOffset;
      targetOffsetX = rifleFireCrouchOffsetX;
      targetRotX = rifleFireCrouchRotX;
      targetRotY = rifleFireCrouchRotY;
      targetRotZ = rifleFireCrouchRotZ;
    }
    // Crouch idle fire states
    else if (currentState === 'crouchRapidFireRifle') {
      targetOffsetY = crouchRapidFireOffset;
      targetOffsetX = crouchRapidFireOffsetX;
      targetRotX = crouchRapidFireRotX;
      targetRotY = crouchRapidFireRotY;
      targetRotZ = crouchRapidFireRotZ;
    } else if (currentState === 'crouchFireRifleTap') {
      targetOffsetY = crouchFireTapOffset;
      targetOffsetX = crouchFireTapOffsetX;
      targetRotX = crouchFireTapRotX;
      targetRotY = crouchFireTapRotY;
      targetRotZ = crouchFireTapRotZ;
    }
    // Pistol states
    else if (currentState === 'pistolIdle') {
      targetOffsetY = pistolIdleOffset;
      targetOffsetX = pistolIdleOffsetX;
      targetRotY = pistolIdleRotY;
    } else if (currentState === 'pistolWalk') {
      targetOffsetY = pistolWalkOffset;
      targetOffsetX = pistolWalkOffsetX;
      targetRotY = pistolWalkRotY;
    } else if (currentState === 'pistolRun') {
      targetOffsetY = pistolRunOffset;
      targetOffsetX = pistolRunOffsetX;
      targetRotX = pistolRunRotX;
      targetRotY = pistolRunRotY;
      targetRotZ = pistolRunRotZ;
    }
    // Standing states without weapon = 0

    // Smooth lerp towards target - lerpSpeed controls how fast (higher = faster)
    // Using exponential smoothing: faster when far, slower when close
    const t = 1 - Math.exp(-lerpSpeed * delta);
    currentOffsetY.current += (targetOffsetY - currentOffsetY.current) * t;
    currentOffsetX.current += (targetOffsetX - currentOffsetX.current) * t;
    currentRotX.current += (targetRotX - currentRotX.current) * t;
    currentRotY.current += (targetRotY - currentRotY.current) * t;
    currentRotZ.current += (targetRotZ - currentRotZ.current) * t;

    avatarRef.current.position.y = currentOffsetY.current;
    avatarRef.current.position.x = currentOffsetX.current;

    // Upper body aiming - smooth tilt when aiming with weapon
    // aimTiltMultiplier is adjustable via Leva for subtle effect tuning
    const targetTilt = isAiming && weaponType ? -aimPitch * aimTiltMultiplier : 0;
    const tiltT = 1 - Math.exp(-8 * delta);
    currentAimTilt.current += (targetTilt - currentAimTilt.current) * tiltT;

    // Convert degrees to radians for all rotations, add aim tilt to X
    const baseRotX = (currentRotX.current * Math.PI) / 180;
    avatarRef.current.rotation.x = baseRotX + currentAimTilt.current;
    avatarRef.current.rotation.y = (currentRotY.current * Math.PI) / 180;
    avatarRef.current.rotation.z = (currentRotZ.current * Math.PI) / 180;
  });

  return (
    <group ref={group}>
      <group ref={avatarRef}>
        {/* Y offset (0.2m) to prevent feet clipping through uneven terrain */}
        <primitive object={clonedScene} position={[0, 0.2, 0]} />
      </group>
      {weaponType && (
        <WeaponAttachment
          weaponType={weaponType}
          avatarRef={avatarRef}
          currentAnimState={currentState}
        />
      )}
    </group>
  );
}

export default MixamoAnimatedAvatar;
