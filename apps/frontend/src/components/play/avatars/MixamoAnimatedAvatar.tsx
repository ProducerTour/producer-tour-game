/**
 * MixamoAnimatedAvatar
 * Animated Ready Player Me avatar using pre-made Mixamo GLB animations.
 * Extracted from PlayWorld.tsx for better maintainability.
 */
import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';
import { WeaponAttachment, type WeaponType } from '../WeaponAttachment';
import {
  ANIMATION_CONFIG,
  getFadeTime,
  isMixamoAnimation,
  type AnimationName,
} from '../animations.config';
import { configureAllActions } from '../hooks/useAnimationLoader';

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
  isJumping?: boolean;
  isDancing?: boolean;
  isCrouching?: boolean;
  isStrafingLeft?: boolean;
  isStrafingRight?: boolean;
  weaponType?: WeaponType;
}

/**
 * MixamoAnimatedAvatar - Uses pre-made animations from Mixamo for natural movement
 */
export function MixamoAnimatedAvatar({
  url,
  isMoving = false,
  isRunning = false,
  isJumping = false,
  isDancing = false,
  isCrouching = false,
  isStrafingLeft = false,
  isStrafingRight = false,
  weaponType = null,
}: MixamoAnimatedAvatarProps) {
  const group = useRef<THREE.Group>(null);
  const avatarRef = useRef<THREE.Group>(null);
  const crouchOffset = useRef(0);
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
  const crouchIdleGltf = crouchWalkGltf; // Use walk as idle until proper idle is downloaded
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

  // Crouch + weapon animations
  const crouchRifleIdleGltf = useGLTF(WEAPON_ANIMATIONS_AVAILABLE ? ANIMATIONS.rifleIdle : ANIMATIONS.idle);
  const crouchRifleWalkGltf = useGLTF(WEAPON_ANIMATIONS_AVAILABLE ? ANIMATIONS.rifleWalk : ANIMATIONS.walking);
  const crouchPistolIdleGltf = useGLTF(WEAPON_ANIMATIONS_AVAILABLE ? ANIMATIONS.pistolIdle : ANIMATIONS.idle);
  const crouchPistolWalkGltf = useGLTF(WEAPON_ANIMATIONS_AVAILABLE ? ANIMATIONS.pistolWalk : ANIMATIONS.walking);

  // Clone scene for this instance
  const clonedScene = useMemo(() => {
    const clone = SkeletonUtils.clone(scene);
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
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
    }

    return clone;
  }, [scene]);

  // Strip root motion, scale tracks, and remap bone names from Mixamo format to RPM format
  const stripRootMotion = (clip: THREE.AnimationClip, clipName?: string): THREE.AnimationClip => {
    const newClip = clip.clone();
    const isMixamoAnim = clipName ? isMixamoAnimation(clipName) : false;

    if (isMixamoAnim) {
      console.log(`🔧 Processing ${clipName}: ${newClip.tracks.length} original tracks`);
    }

    // Process tracks: remap bone names and filter problematic tracks
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
      .filter(track => {
        if (isMixamoAnim) {
          // For Mixamo: keep only quaternion (rotation) tracks
          // Remove position and scale tracks to prevent drift/glitching
          if (!track.name.endsWith('.quaternion')) {
            return false;
          }
          // Keep Hips rotation - needed for proper poses (especially weapon holding)
          // Only Hips.position causes drift, and that's already filtered above
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

  // Track current dance for cycling
  const currentDanceIndex = useRef(0);

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
      addAnim(crouchPistolIdleGltf, 'crouchPistolIdle');
      addAnim(crouchPistolWalkGltf, 'crouchPistolWalk');
    }

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
    crouchPistolIdleGltf.animations, crouchPistolWalkGltf.animations,
  ]);

  // Setup animations with the cloned scene
  const { actions } = useAnimations(animations, group);

  // Current animation state
  const currentAction = useRef<string>('idle');
  const lastDanceState = useRef(false);
  const lastCrouchState = useRef(false);
  const crouchTransitionPlaying = useRef<string | null>(null);
  const lastMovementState = useRef({ isMoving: false, isRunning: false });
  const transitionLock = useRef(0);

  // Configure animation properties once on setup
  useEffect(() => {
    if (!actions) return;

    console.log('🎬 Available animations:', Object.keys(actions));
    configureAllActions(actions);
  }, [actions]);

  // Handle crouch transition animation completion
  useEffect(() => {
    if (!actions) return;

    const handleFinished = (e: { action: THREE.AnimationAction }) => {
      const finishedClip = e.action.getClip().name;
      if (finishedClip === 'standToCrouch' || finishedClip === 'crouchToStand' || finishedClip === 'crouchToSprint') {
        crouchTransitionPlaying.current = null;
      }
    };

    const mixer = actions.idle?.getMixer();
    if (mixer) {
      mixer.addEventListener('finished', handleFinished);
      return () => {
        mixer.removeEventListener('finished', handleFinished);
      };
    }
  }, [actions]);

  // Handle animation transitions
  useEffect(() => {
    if (!actions) return;

    const now = Date.now();
    if (now - transitionLock.current < 50) return;

    const justStartedCrouching = isCrouching && !lastCrouchState.current;
    const justStoppedCrouching = !isCrouching && lastCrouchState.current;
    lastCrouchState.current = isCrouching;

    let targetAction = 'idle';

    if (isDancing && !isMoving && !weaponType) {
      if (!lastDanceState.current) {
        currentDanceIndex.current = (currentDanceIndex.current + 1) % 3;
      }
      targetAction = `dance${currentDanceIndex.current + 1}`;
    } else if (isJumping) {
      const wasRunning = lastMovementState.current.isRunning;
      const wasMoving = lastMovementState.current.isMoving;
      if (wasRunning) {
        targetAction = 'jumpRun';
      } else if (wasMoving) {
        targetAction = 'jumpJog';
      } else {
        targetAction = 'jump';
      }
    } else if (justStartedCrouching && CROUCH_ANIMATIONS_AVAILABLE) {
      targetAction = 'standToCrouch';
      crouchTransitionPlaying.current = 'standToCrouch';
    } else if (justStoppedCrouching && CROUCH_ANIMATIONS_AVAILABLE) {
      targetAction = 'crouchToStand';
      crouchTransitionPlaying.current = 'crouchToStand';
    } else if (crouchTransitionPlaying.current) {
      return;
    } else if (isCrouching && isRunning && CROUCH_ANIMATIONS_AVAILABLE) {
      targetAction = 'crouchToSprint';
      crouchTransitionPlaying.current = 'crouchToSprint';
    } else if (isCrouching && CROUCH_ANIMATIONS_AVAILABLE && WEAPON_ANIMATIONS_AVAILABLE && weaponType) {
      if (weaponType === 'rifle') {
        targetAction = isMoving ? 'crouchRifleWalk' : 'crouchRifleIdle';
      } else if (weaponType === 'pistol') {
        targetAction = isMoving ? 'crouchPistolWalk' : 'crouchPistolIdle';
      }
      if (!actions[targetAction]) {
        targetAction = 'crouchWalk';
      }
    } else if (isCrouching && CROUCH_ANIMATIONS_AVAILABLE) {
      if (isStrafingLeft) {
        targetAction = 'crouchStrafeLeft';
      } else if (isStrafingRight) {
        targetAction = 'crouchStrafeRight';
      } else {
        targetAction = 'crouchWalk';
      }
    } else if (isCrouching) {
      targetAction = isMoving ? 'walking' : 'idle';
    } else if (WEAPON_ANIMATIONS_AVAILABLE && weaponType) {
      if (weaponType === 'rifle') {
        if (isRunning) targetAction = 'rifleRun';
        else if (isMoving) targetAction = 'rifleWalk';
        else targetAction = 'rifleIdle';
      } else if (weaponType === 'pistol') {
        if (isRunning) targetAction = 'pistolRun';
        else if (isMoving) targetAction = 'pistolWalk';
        else targetAction = 'pistolIdle';
      }
      if (!actions[targetAction]) {
        targetAction = isRunning ? 'running' : isMoving ? 'walking' : 'idle';
      }
    } else if (weaponType) {
      targetAction = isRunning ? 'running' : isMoving ? 'walking' : 'idle';
    } else if (isMoving) {
      targetAction = isRunning ? 'running' : 'walking';
    }

    lastDanceState.current = isDancing;
    if (!isJumping) {
      lastMovementState.current = { isMoving, isRunning };
    }

    if (targetAction !== currentAction.current) {
      const prevAction = actions[currentAction.current];
      const nextAction = actions[targetAction];

      if (prevAction && nextAction) {
        const fadeDuration = getFadeTime(targetAction);
        prevAction.fadeOut(fadeDuration);
        nextAction.reset();
        nextAction.fadeIn(fadeDuration);
        nextAction.play();
        transitionLock.current = now;
      } else if (nextAction) {
        nextAction.reset().play();
      }

      currentAction.current = targetAction;
    }
  }, [isMoving, isRunning, isJumping, isDancing, isCrouching, isStrafingLeft, isStrafingRight, weaponType, actions]);

  // Start idle animation on mount
  useEffect(() => {
    if (actions?.idle) {
      actions.idle.play();
    }
  }, [actions]);

  // Crouch offset - smoothly lower the character visually when crouching
  const CROUCH_Y_OFFSET = -0.35;
  const CROUCH_LERP_SPEED = 8;

  useFrame((_, delta) => {
    if (!avatarRef.current) return;

    const targetOffset = isCrouching ? CROUCH_Y_OFFSET : 0;
    crouchOffset.current += (targetOffset - crouchOffset.current) * Math.min(1, CROUCH_LERP_SPEED * delta);
    avatarRef.current.position.y = crouchOffset.current;
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
