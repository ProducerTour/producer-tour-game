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
import {
  ANIMATION_CONFIG,
  isMixamoAnimation,
  type AnimationName,
} from '../animations.config';
import { configureAllActions } from '../hooks/useAnimationLoader';
import {
  useAnimationStateMachine,
  type AnimationInput,
  type WeaponType as FSMWeaponType,
} from '../hooks/useAnimationStateMachine';

// Animation URLs derived from config
const ANIMATIONS = Object.fromEntries(
  Object.entries(ANIMATION_CONFIG).map(([name, config]) => [name, config.url])
) as Record<AnimationName, string>;

// Track which animations are available
const WEAPON_ANIMATIONS_AVAILABLE = true;
const CROUCH_ANIMATIONS_AVAILABLE = true;

// Preload all animations at module level
Object.values(ANIMATIONS).forEach(url => useGLTF.preload(url));

export interface MixamoAnimatedAvatarProps {
  url: string;
  isMoving?: boolean;
  isRunning?: boolean;
  isGrounded?: boolean;
  isJumping?: boolean;
  isDancing?: boolean;
  isCrouching?: boolean;
  isStrafingLeft?: boolean;
  isStrafingRight?: boolean;
  velocityY?: number;
  weaponType?: WeaponType;
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
  isDancing = false,
  isCrouching = false,
  isStrafingLeft = false,
  isStrafingRight = false,
  velocityY = 0,
  weaponType = null,
}: MixamoAnimatedAvatarProps) {
  const group = useRef<THREE.Group>(null);
  const avatarRef = useRef<THREE.Group>(null);
  const leftFootRef = useRef<THREE.Bone | null>(null);
  const rightFootRef = useRef<THREE.Bone | null>(null);
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

  // Rifle jump animations
  const rifleJumpUpGltf = useGLTF(ANIMATIONS.rifleJumpUp);
  const rifleJumpLoopGltf = useGLTF(ANIMATIONS.rifleJumpLoop);
  const rifleJumpDownGltf = useGLTF(ANIMATIONS.rifleJumpDown);

  // Clone scene for this instance and find foot bones
  const clonedScene = useMemo(() => {
    const clone = SkeletonUtils.clone(scene);
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
      // Find foot bones for ground tracking
      if ((child as THREE.Bone).isBone) {
        const boneName = child.name.toLowerCase();
        if (boneName.includes('leftfoot') || boneName === 'left_foot') {
          leftFootRef.current = child as THREE.Bone;
        } else if (boneName.includes('rightfoot') || boneName === 'right_foot') {
          rightFootRef.current = child as THREE.Bone;
        }
      }
    });

    // Debug: log avatar's actual bone names (only once)
    const bones: string[] = [];
    clone.traverse((child) => {
      if ((child as THREE.Bone).isBone) {
        bones.push(child.name);
      }
    });
    if (bones.length > 0) {
      console.log(`🦴 Avatar bones (${bones.length} total):`, bones.slice(0, 10));
      console.log(`🦶 Foot bones found: L=${leftFootRef.current?.name}, R=${rightFootRef.current?.name}`);
    }

    return clone;
  }, [scene]);

  // Animations that need Hips rotation preserved for proper posture
  const PRESERVE_HIPS_ROTATION = [
    'crouchIdle', 'crouchWalk', 'crouchStrafeLeft', 'crouchStrafeRight',
    'standToCrouch', 'crouchToStand', 'crouchToSprint',
    'crouchRifleIdle', 'crouchRifleWalk', 'crouchRifleStrafeLeft', 'crouchRifleStrafeRight',
    'crouchPistolIdle', 'crouchPistolWalk',
    'rifleJumpUp', 'rifleJumpLoop', 'rifleJumpDown',
  ];

  // Correction quaternion for Mixamo→RPM Hips rotation (90° around X-axis)
  // Mixamo and RPM have different reference poses, this corrects the flip
  const hipsCorrection = useMemo(() => {
    const q = new THREE.Quaternion();
    q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2); // 90° around X
    return q;
  }, []);

  // Strip root motion, scale tracks, and remap bone names from Mixamo format to RPM format
  const stripRootMotion = (clip: THREE.AnimationClip, clipName?: string): THREE.AnimationClip => {
    const newClip = clip.clone();
    const isMixamoAnim = clipName ? isMixamoAnimation(clipName) : false;
    const needsHipsRotation = clipName ? PRESERVE_HIPS_ROTATION.includes(clipName) : false;

    if (isMixamoAnim) {
      console.log(`🔧 Processing ${clipName}: ${newClip.tracks.length} original tracks, preserveHips: ${needsHipsRotation}`);
    }

    // Process tracks: remap bone names, filter, and apply corrections
    newClip.tracks = newClip.tracks
      .map(track => {
        let newName = track.name;

        // Remove armature prefix if present
        if (newName.includes('|')) {
          newName = newName.split('|').pop() || newName;
        }

        // Remove mixamorig variants (with colon, without, numbered)
        newName = newName.replace(/mixamorig\d*:/g, '');
        newName = newName.replace(/^mixamorig(\d*)([A-Z])/g, '$2');

        if (newName !== track.name) {
          const newTrack = track.clone();
          newTrack.name = newName;
          return newTrack;
        }
        return track;
      })
      .map(track => {
        // Apply Hips rotation correction for crouch animations
        if (needsHipsRotation && track.name === 'Hips.quaternion') {
          const newTrack = track.clone();
          const values = newTrack.values;
          const tempQ = new THREE.Quaternion();

          // Apply correction to each keyframe (4 values per quaternion: x,y,z,w)
          for (let i = 0; i < values.length; i += 4) {
            tempQ.set(values[i], values[i + 1], values[i + 2], values[i + 3]);
            tempQ.premultiply(hipsCorrection); // Apply correction
            values[i] = tempQ.x;
            values[i + 1] = tempQ.y;
            values[i + 2] = tempQ.z;
            values[i + 3] = tempQ.w;
          }

          console.log(`   🔄 Applied Hips correction for ${clipName}`);
          return newTrack;
        }
        return track;
      })
      .filter(track => {
        if (isMixamoAnim) {
          // For Mixamo: keep only quaternion (rotation) tracks
          // Remove position and scale tracks to prevent drift/glitching/teleporting
          if (!track.name.endsWith('.quaternion')) {
            return false;
          }
          // For crouch animations, KEEP Hips rotation (now corrected)
          // For other animations, filter it out to prevent flipping
          if (track.name.startsWith('Hips.')) {
            return needsHipsRotation;
          }
          return true;
        }

        // For regular animations: keep rotations and non-Hips positions
        if (!track.name.endsWith('.quaternion')) {
          if (track.name.endsWith('.position') && !track.name.includes('Hips')) {
            return true;
          }
          return false;
        }
        return true;
      });

    if (isMixamoAnim) {
      console.log(`   ✅ Kept ${newClip.tracks.length} tracks after filtering`);
    }

    return newClip;
  };

  // Collect all animations (with root motion stripped)
  const animations = useMemo(() => {
    const anims: THREE.AnimationClip[] = [];

    const addAnim = (gltf: { animations: THREE.AnimationClip[] }, name: string) => {
      if (gltf.animations[0]) {
        const clip = stripRootMotion(gltf.animations[0], name);
        clip.name = name;
        anims.push(clip);
      } else {
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

    // Rifle jump animations
    addAnim(rifleJumpUpGltf, 'rifleJumpUp');
    addAnim(rifleJumpLoopGltf, 'rifleJumpLoop');
    addAnim(rifleJumpDownGltf, 'rifleJumpDown');

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
    rifleJumpUpGltf.animations, rifleJumpLoopGltf.animations, rifleJumpDownGltf.animations,
  ]);

  // Setup animations with the cloned scene
  const { actions } = useAnimations(animations, group);

  // Configure animation properties once on setup
  useEffect(() => {
    if (!actions) return;
    console.log('🎬 Available animations:', Object.keys(actions));
    configureAllActions(actions);
  }, [actions]);

  // Build FSM input from props
  // Strafe flags are now calculated relative to character facing in PhysicsPlayerController
  const fsmInput: AnimationInput = useMemo(() => ({
    isMoving,
    isRunning,
    isGrounded,
    isJumping,
    isCrouching,
    isDancing,
    isStrafeLeft: isStrafingLeft,
    isStrafeRight: isStrafingRight,
    weapon: (weaponType ?? 'none') as FSMWeaponType,
    velocityY,
  }), [isMoving, isRunning, isGrounded, isJumping, isCrouching, isDancing, isStrafingLeft, isStrafingRight, weaponType, velocityY]);

  // Use the FSM for all animation state management
  // The FSM handles transitions, crossfading, one-shot completions, and fallbacks
  const { currentState } = useAnimationStateMachine(
    actions as Record<string, THREE.AnimationAction | null>,
    fsmInput
    // Uncomment for debugging: (from, to) => console.log(`🎭 Animation: ${from ?? 'none'} → ${to}`)
  );

  // Crouch offset - moves avatar down when crouching to match visual posture
  const { crouchIdleOffset, crouchWalkOffset, transitionOffset, lerpSpeed } = useControls('Crouch Settings', {
    crouchIdleOffset: { value: -0.52, min: -0.6, max: 0, step: 0.01, label: 'Crouch Idle Offset' },
    crouchWalkOffset: { value: -0.14, min: -0.6, max: 0, step: 0.01, label: 'Crouch Walk Offset' },
    transitionOffset: { value: -0.24, min: -0.5, max: 0, step: 0.01, label: 'Transition Offset' },
    lerpSpeed: { value: 8, min: 1, max: 20, step: 0.5, label: 'Lerp Speed' },
  });

  // Weapon animation offsets (Y = vertical, X = horizontal, Rot = rotation in degrees)
  const rifleControls = useControls('Rifle Anim', {
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
  });
  const { rifleIdleOffset, rifleIdleOffsetX, rifleIdleRotY, rifleWalkOffset, rifleWalkOffsetX, rifleWalkRotY, rifleRunOffset, rifleRunOffsetX, rifleRunRotX, rifleRunRotY, rifleRunRotZ } = rifleControls;

  const pistolControls = useControls('Pistol Anim', {
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
  });
  const {
    pistolIdleOffset, pistolIdleOffsetX, pistolIdleRotY,
    pistolWalkOffset, pistolWalkOffsetX, pistolWalkRotY,
    pistolRunOffset, pistolRunOffsetX, pistolRunRotX, pistolRunRotY, pistolRunRotZ
  } = pistolControls;

  // Crouch idle states
  const CROUCH_IDLE_STATES = [
    'crouchIdle', 'crouchRifleIdle', 'crouchPistolIdle',
  ];

  // Crouch movement states
  const CROUCH_WALK_STATES = [
    'crouchWalk', 'crouchStrafeLeft', 'crouchStrafeRight',
    'crouchRifleWalk', 'crouchRifleStrafeLeft', 'crouchRifleStrafeRight',
    'crouchPistolWalk',
  ];

  // Track current offsets for smooth interpolation
  const currentOffsetY = useRef(0);
  const currentOffsetX = useRef(0);
  const currentRotX = useRef(0);
  const currentRotY = useRef(0);
  const currentRotZ = useRef(0);

  useFrame((_, delta) => {
    if (!avatarRef.current) return;

    // Determine target offsets based on animation state
    let targetOffsetY = 0;
    let targetOffsetX = 0;
    let targetRotX = 0; // in degrees
    let targetRotY = 0;
    let targetRotZ = 0;

    // Crouch states
    if (CROUCH_IDLE_STATES.includes(currentState)) {
      targetOffsetY = crouchIdleOffset;
    } else if (CROUCH_WALK_STATES.includes(currentState)) {
      targetOffsetY = crouchWalkOffset;
    } else if (currentState === 'standToCrouch') {
      targetOffsetY = transitionOffset;
    }
    // Rifle states
    else if (currentState === 'rifleIdle') {
      targetOffsetY = rifleIdleOffset;
      targetOffsetX = rifleIdleOffsetX;
      targetRotY = rifleIdleRotY;
    } else if (currentState === 'rifleWalk') {
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
    // Convert degrees to radians for all rotations
    avatarRef.current.rotation.x = (currentRotX.current * Math.PI) / 180;
    avatarRef.current.rotation.y = (currentRotY.current * Math.PI) / 180;
    avatarRef.current.rotation.z = (currentRotZ.current * Math.PI) / 180;
  });

  return (
    <group ref={group}>
      <group ref={avatarRef}>
        <primitive object={clonedScene} position={[0, 0, 0]} />
      </group>
      {weaponType && (
        <WeaponAttachment
          weaponType={weaponType}
          avatarRef={avatarRef}
        />
      )}
    </group>
  );
}

export default MixamoAnimatedAvatar;
