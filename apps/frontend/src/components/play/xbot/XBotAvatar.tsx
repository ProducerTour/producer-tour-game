/**
 * XBotAvatar
 *
 * Player avatar using Mixamo X Bot character with comprehensive animations.
 * Supports rifle, pistol, and unarmed states with 8-way locomotion.
 */

import { useRef, useMemo, useEffect, useState, Suspense } from 'react';
import { useGLTF, useAnimations } from '@react-three/drei';
import { useLoader } from '@react-three/fiber';
import { useControls, folder, button } from 'leva';
import * as THREE from 'three';
import { GLTFLoader } from 'three-stdlib';
import { SkeletonUtils } from 'three-stdlib';
import {
  XBOT_ANIMATIONS,
  XBOT_MODEL_PATH,
  CRITICAL_ANIMATIONS,
  type XBotAnimationName,
  type WeaponType,
  getLoopMode,
  getAnimationForState,
} from './xbot.animations';

// Preload critical animations and model
CRITICAL_ANIMATIONS.forEach((name) => {
  useGLTF.preload(XBOT_ANIMATIONS[name].url);
});
useGLTF.preload(XBOT_MODEL_PATH);

// Weapon model paths
const WEAPON_MODELS = {
  rifle: '/models/weapons/ak47fbx_gltf/scene.gltf',
  pistol: '/models/weapons/pistolorange_gltf/scene.gltf',
} as const;

// Preload weapon models
Object.values(WEAPON_MODELS).forEach((path) => useGLTF.preload(path));

// Get all animation URLs in a fixed order
const ANIMATION_NAMES = Object.keys(XBOT_ANIMATIONS) as XBotAnimationName[];
const ANIMATION_URLS = ANIMATION_NAMES.map((name) => XBOT_ANIMATIONS[name].url);

export interface XBotAvatarProps {
  /** Is the character moving? */
  isMoving?: boolean;
  /** Is the character running (vs walking)? */
  isRunning?: boolean;
  /** Is the character sprinting (faster than running)? */
  isSprinting?: boolean;
  /** Is the character on the ground? */
  isGrounded?: boolean;
  /** Is the character jumping? */
  isJumping?: boolean;
  /** Is the character strafing left? */
  isStrafingLeft?: boolean;
  /** Is the character strafing right? */
  isStrafingRight?: boolean;
  /** Is the character moving backward? */
  isMovingBackward?: boolean;
  /** Current weapon type */
  weaponType?: WeaponType;
  /** Is the character aiming? */
  isAiming?: boolean;
  /** Is the character crouching? */
  isCrouching?: boolean;
  /** Is the character dying? */
  isDying?: boolean;
}

/**
 * Strip root motion from animation clip
 * Removes Hips position tracks to prevent character drifting
 */
function stripRootMotion(clip: THREE.AnimationClip): THREE.AnimationClip {
  const filteredTracks = clip.tracks.filter((track) => {
    const isHipsPosition =
      (track.name.includes('Hips') || track.name.includes('mixamorig:Hips')) &&
      track.name.endsWith('.position');
    return !isHipsPosition;
  });
  return new THREE.AnimationClip(clip.name, clip.duration, filteredTracks);
}

/**
 * Weapon attachment component
 */
function WeaponAttachment({
  weaponType,
  handBone,
}: {
  weaponType: WeaponType;
  handBone: THREE.Bone | null;
}) {
  const weaponRef = useRef<THREE.Group>(null);

  // Load weapon model
  const rifleGltf = useGLTF(WEAPON_MODELS.rifle);
  const pistolGltf = useGLTF(WEAPON_MODELS.pistol);

  // Leva controls for weapon positioning
  const weaponControls = useControls('Weapon Attachment', {
    rifle: folder({
      rifleScale: { value: 0.01, min: 0.001, max: 0.1, step: 0.001 },
      riflePosX: { value: 0, min: -0.5, max: 0.5, step: 0.01 },
      riflePosY: { value: 0, min: -0.5, max: 0.5, step: 0.01 },
      riflePosZ: { value: 0, min: -0.5, max: 0.5, step: 0.01 },
      rifleRotX: { value: 0, min: -180, max: 180, step: 1 },
      rifleRotY: { value: 0, min: -180, max: 180, step: 1 },
      rifleRotZ: { value: 0, min: -180, max: 180, step: 1 },
    }, { collapsed: true }),
    pistol: folder({
      pistolScale: { value: 0.01, min: 0.001, max: 0.1, step: 0.001 },
      pistolPosX: { value: 0, min: -0.5, max: 0.5, step: 0.01 },
      pistolPosY: { value: 0, min: -0.5, max: 0.5, step: 0.01 },
      pistolPosZ: { value: 0, min: -0.5, max: 0.5, step: 0.01 },
      pistolRotX: { value: 0, min: -180, max: 180, step: 1 },
      pistolRotY: { value: 0, min: -180, max: 180, step: 1 },
      pistolRotZ: { value: 0, min: -180, max: 180, step: 1 },
    }, { collapsed: true }),
  });

  // Attach weapon to hand bone
  useEffect(() => {
    if (!handBone || !weaponRef.current) return;

    // Add weapon to hand bone
    handBone.add(weaponRef.current);

    return () => {
      if (weaponRef.current && handBone) {
        handBone.remove(weaponRef.current);
      }
    };
  }, [handBone, weaponType]);

  if (weaponType === 'none' || !handBone) return null;

  const isRifle = weaponType === 'rifle';
  const gltf = isRifle ? rifleGltf : pistolGltf;
  const scene = gltf.scene.clone();

  // Apply transforms
  const scale = isRifle ? weaponControls.rifleScale : weaponControls.pistolScale;
  const pos = isRifle
    ? [weaponControls.riflePosX, weaponControls.riflePosY, weaponControls.riflePosZ]
    : [weaponControls.pistolPosX, weaponControls.pistolPosY, weaponControls.pistolPosZ];
  const rot = isRifle
    ? [weaponControls.rifleRotX, weaponControls.rifleRotY, weaponControls.rifleRotZ]
    : [weaponControls.pistolRotX, weaponControls.pistolRotY, weaponControls.pistolRotZ];

  return (
    <group ref={weaponRef}>
      <primitive
        object={scene}
        scale={scale}
        position={pos as [number, number, number]}
        rotation={[
          (rot[0] * Math.PI) / 180,
          (rot[1] * Math.PI) / 180,
          (rot[2] * Math.PI) / 180,
        ]}
      />
    </group>
  );
}

/**
 * Main XBot Avatar component
 */
function XBotAvatarInner(props: XBotAvatarProps) {
  const {
    isMoving = false,
    isRunning = false,
    isSprinting = false,
    isGrounded = true,
    isJumping = false,
    isStrafingLeft = false,
    isStrafingRight = false,
    isMovingBackward = false,
    weaponType = 'none',
    isAiming = false,
    isCrouching = false,
    isDying = false,
  } = props;

  const group = useRef<THREE.Group>(null);
  const [rightHandBone, setRightHandBone] = useState<THREE.Bone | null>(null);

  // Track current animation
  const [currentAnim, setCurrentAnim] = useState<XBotAnimationName>('idle');
  const currentAnimRef = useRef<XBotAnimationName>('idle');

  // Leva debug controls
  const controls = useControls('X Bot Avatar v4', {
    Transform: folder(
      {
        scale: { value: 1, min: 0.5, max: 2, step: 0.1 },
        posY: { value: 0, min: -2, max: 2, step: 0.01 },
        rotX: { value: 0, min: -180, max: 180, step: 1, label: 'Rot X°' },
        rotY: { value: 0, min: -180, max: 180, step: 1, label: 'Rot Y°' },
      },
      { collapsed: false }
    ),
    Debug: folder(
      {
        showAxes: { value: false },
        currentAnimation: { value: currentAnim, editable: false },
        weaponType: { value: weaponType, editable: false },
        logBones: button(() => {
          if (group.current) {
            const bones: string[] = [];
            group.current.traverse((child) => {
              if ((child as THREE.Bone).isBone) {
                bones.push(child.name);
              }
            });
            console.log('🦴 X Bot bones:', bones);
          }
        }),
      },
      { collapsed: true }
    ),
  }, [currentAnim, weaponType]);

  // Load model
  const { scene: originalScene } = useGLTF(XBOT_MODEL_PATH);

  // Load all animations using useLoader (supports array of URLs)
  const animGltfs = useLoader(GLTFLoader, ANIMATION_URLS);

  // Process animations into clips
  const animations = useMemo(() => {
    const anims: THREE.AnimationClip[] = [];

    ANIMATION_NAMES.forEach((name, index) => {
      const gltf = animGltfs[index];
      if (gltf?.animations?.[0]) {
        const clip = gltf.animations[0].clone();
        clip.name = name;
        const processedClip = stripRootMotion(clip);
        anims.push(processedClip);
      }
    });

    console.log('🤖 X Bot animations loaded:', anims.length, 'clips');
    return anims;
  }, [animGltfs]);

  // Clone scene for unique instance
  const clonedScene = useMemo(() => {
    const clone = SkeletonUtils.clone(originalScene);

    // Enable shadows and ensure materials are visible
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.frustumCulled = false;

        if (mesh.material) {
          const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          materials.forEach((mat) => {
            if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshBasicMaterial) {
              mat.side = THREE.DoubleSide;
              mat.needsUpdate = true;
            }
          });
        }
      }

      // Find right hand bone for weapon attachment
      if ((child as THREE.Bone).isBone) {
        const bone = child as THREE.Bone;
        if (bone.name.includes('RightHand') || bone.name.includes('mixamorig:RightHand')) {
          setRightHandBone(bone);
        }
      }
    });

    return clone;
  }, [originalScene]);

  // Setup animations
  const { actions } = useAnimations(animations, group);

  // Configure all actions on load
  useEffect(() => {
    if (!actions) return;

    Object.entries(actions).forEach(([name, action]) => {
      if (!action) return;

      const config = XBOT_ANIMATIONS[name as XBotAnimationName];
      if (!config) return;

      action.setLoop(getLoopMode(name as XBotAnimationName), Infinity);

      if (config.clamp) {
        action.clampWhenFinished = true;
      }
    });

    console.log('🤖 X Bot actions ready:', Object.keys(actions).length);
  }, [actions]);

  // Handle animation transitions
  useEffect(() => {
    if (!actions) return;

    const targetAnim = getAnimationForState(
      weaponType,
      isMoving,
      isRunning,
      isSprinting,
      isJumping,
      isGrounded,
      isCrouching,
      isAiming,
      isStrafingLeft,
      isStrafingRight,
      isMovingBackward,
      isDying
    );

    // Skip if same animation
    if (targetAnim === currentAnimRef.current) return;

    const currentAction = actions[currentAnimRef.current];
    const nextAction = actions[targetAnim];

    if (!nextAction) {
      console.warn(`🤖 Missing animation: ${targetAnim}`);
      return;
    }

    const config = XBOT_ANIMATIONS[targetAnim];
    const fadeTime = config?.fadeTime ?? 0.2;

    // Crossfade
    if (currentAction) {
      currentAction.fadeOut(fadeTime);
    }

    nextAction.reset().fadeIn(fadeTime).play();

    currentAnimRef.current = targetAnim;
    setCurrentAnim(targetAnim);

    console.log(`🤖 Animation: ${targetAnim}`);
  }, [
    isMoving,
    isRunning,
    isSprinting,
    isGrounded,
    isJumping,
    isStrafingLeft,
    isStrafingRight,
    isMovingBackward,
    weaponType,
    isAiming,
    isCrouching,
    isDying,
    actions,
  ]);

  // Start idle animation on mount
  useEffect(() => {
    if (actions?.idle) {
      actions.idle.play();
      console.log('🤖 X Bot idle animation started');
    }
  }, [actions]);

  // Convert degrees to radians
  const rotXRad = (controls.rotX * Math.PI) / 180;
  const rotYRad = (controls.rotY * Math.PI) / 180;

  return (
    <group ref={group} scale={controls.scale}>
      <primitive
        object={clonedScene}
        position={[0, controls.posY, 0]}
        rotation={[rotXRad, rotYRad, 0]}
      />
      <WeaponAttachment weaponType={weaponType} handBone={rightHandBone} />
      {controls.showAxes && (
        <>
          <axesHelper args={[2]} />
          <mesh position={[0, 1, 0]}>
            <boxGeometry args={[0.5, 2, 0.5]} />
            <meshBasicMaterial color="cyan" wireframe />
          </mesh>
        </>
      )}
    </group>
  );
}

/**
 * Exported XBot Avatar with Suspense wrapper
 */
export function XBotAvatar(props: XBotAvatarProps) {
  return (
    <Suspense fallback={null}>
      <XBotAvatarInner {...props} />
    </Suspense>
  );
}

export default XBotAvatar;
