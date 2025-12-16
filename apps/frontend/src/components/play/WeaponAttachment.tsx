/**
 * Weapon Attachment System
 * Attaches weapon models directly to character hand bones
 * Uses Leva controls for live adjustment
 */

import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { useControls, folder, button } from 'leva';
import * as THREE from 'three';
import { getModelPath } from '../../config/assetPaths';

// Weapon model paths
export const WEAPONS = {
  rifle: getModelPath('weapons/ak47fbx_gltf/scene.gltf'),
  pistol: getModelPath('weapons/pistolorange_gltf/scene.gltf'),
} as const;

export type WeaponType = keyof typeof WEAPONS | null;

// Hand bone names in Mixamo/RPM skeleton
const RIGHT_HAND_BONE_NAMES = [
  'RightHand',
  'mixamorigRightHand',
  'rightHand',
  'Right_Hand',
  'hand_r',
  'hand.R',
];

interface WeaponAttachmentProps {
  weaponType: WeaponType;
  avatarRef: React.RefObject<THREE.Group>;
  currentAnimState?: string;  // Current animation state for firing adjustments
}

// Find a bone by trying multiple naming conventions
// RPM avatars store bones inside SkinnedMesh.skeleton, not as direct children
function findBone(root: THREE.Object3D, names: string[], debug = false): THREE.Bone | null {
  let foundBone: THREE.Bone | null = null;
  const allBones: string[] = [];

  // First, try to find bones via SkinnedMesh.skeleton (RPM avatars)
  root.traverse((child) => {
    if (foundBone) return;

    // Check if this is a SkinnedMesh with a skeleton
    const skinnedMesh = child as THREE.SkinnedMesh;
    if (skinnedMesh.isSkinnedMesh && skinnedMesh.skeleton) {
      for (const bone of skinnedMesh.skeleton.bones) {
        allBones.push(bone.name);
        if (foundBone) continue;
        for (const name of names) {
          if (bone.name === name || bone.name.includes(name)) {
            foundBone = bone;
          }
        }
      }
    }

    // Also check direct Bone children (Mixamo style)
    if (child instanceof THREE.Bone) {
      if (!allBones.includes(child.name)) {
        allBones.push(child.name);
      }
      if (foundBone) return;
      for (const name of names) {
        if (child.name === name || child.name.includes(name)) {
          foundBone = child;
          return;
        }
      }
    }
  });

  if (debug && !foundBone) {
    console.log('🦴 All bones found:', allBones);
    console.log('🦴 Looking for:', names);
  }

  return foundBone;
}

// Convert degrees to radians
const DEG_TO_RAD = Math.PI / 180;

export function WeaponAttachment({
  weaponType,
  avatarRef,
  currentAnimState = '',
}: WeaponAttachmentProps) {
  // Track what we've attached
  const attachedWeapon = useRef<THREE.Group | null>(null);
  const attachedToBone = useRef<THREE.Bone | null>(null);
  const weaponMeshRef = useRef<THREE.Object3D | null>(null);

  // Load weapon models
  const rifleGltf = useGLTF(WEAPONS.rifle);
  const pistolGltf = useGLTF(WEAPONS.pistol);

  // Leva controls for rifle (saved config)
  const rifleControls = useControls('Rifle', {
    position: folder({
      posX: { value: 0.01, min: -0.5, max: 0.5, step: 0.01 },
      posY: { value: 0.23, min: -0.5, max: 0.5, step: 0.01 },
      posZ: { value: 0.03, min: -0.5, max: 0.5, step: 0.01 },
    }),
    rotation: folder({
      rotX: { value: 89, min: -180, max: 180, step: 1 },
      rotY: { value: -144, min: -180, max: 180, step: 1 },
      rotZ: { value: 85, min: -180, max: 180, step: 1 },
    }),
    scale: { value: 1.1, min: 0.1, max: 3, step: 0.1 },
  });

  // Rifle firing offset controls (applied on top of base position)
  const rifleFireControls = useControls('Rifle Fire Offset', {
    'Fire Still': folder({
      fireStillPosX: { value: 0, min: -0.3, max: 0.3, step: 0.01 },
      fireStillPosY: { value: 0, min: -0.3, max: 0.3, step: 0.01 },
      fireStillPosZ: { value: 0, min: -0.3, max: 0.3, step: 0.01 },
      fireStillRotX: { value: 0, min: -45, max: 45, step: 1 },
      fireStillRotY: { value: -28, min: -45, max: 45, step: 1 },
      fireStillRotZ: { value: 0, min: -45, max: 45, step: 1 },
    }, { collapsed: true }),
    'Fire Walk': folder({
      fireWalkPosX: { value: 0, min: -0.3, max: 0.3, step: 0.01 },
      fireWalkPosY: { value: 0, min: -0.3, max: 0.3, step: 0.01 },
      fireWalkPosZ: { value: 0.02, min: -0.3, max: 0.3, step: 0.01 },
      fireWalkRotX: { value: 0, min: -45, max: 45, step: 1 },
      fireWalkRotY: { value: -30, min: -45, max: 45, step: 1 },
      fireWalkRotZ: { value: 0, min: -45, max: 45, step: 1 },
    }, { collapsed: true }),
    'Fire Crouch': folder({
      fireCrouchPosX: { value: 0.03, min: -0.3, max: 0.3, step: 0.01 },
      fireCrouchPosY: { value: 0, min: -0.3, max: 0.3, step: 0.01 },
      fireCrouchPosZ: { value: 0, min: -0.3, max: 0.3, step: 0.01 },
      fireCrouchRotX: { value: 0, min: -45, max: 45, step: 1 },
      fireCrouchRotY: { value: -29, min: -45, max: 45, step: 1 },
      fireCrouchRotZ: { value: 0, min: -45, max: 45, step: 1 },
    }, { collapsed: true }),
    'Fire Crouch Idle': folder({
      fireCrouchIdlePosX: { value: 0.03, min: -0.3, max: 0.3, step: 0.01 },
      fireCrouchIdlePosY: { value: 0, min: -0.3, max: 0.3, step: 0.01 },
      fireCrouchIdlePosZ: { value: 0, min: -0.3, max: 0.3, step: 0.01 },
      fireCrouchIdleRotX: { value: 0, min: -45, max: 45, step: 1 },
      fireCrouchIdleRotY: { value: -28, min: -45, max: 45, step: 1 },
      fireCrouchIdleRotZ: { value: 0, min: -45, max: 45, step: 1 },
    }, { collapsed: true }),
    'Fire Crouch Tap': folder({
      fireCrouchTapPosX: { value: 0, min: -0.3, max: 0.3, step: 0.01 },
      fireCrouchTapPosY: { value: 0, min: -0.3, max: 0.3, step: 0.01 },
      fireCrouchTapPosZ: { value: 0, min: -0.3, max: 0.3, step: 0.01 },
      fireCrouchTapRotX: { value: 0, min: -45, max: 45, step: 1 },
      fireCrouchTapRotY: { value: 0, min: -45, max: 45, step: 1 },
      fireCrouchTapRotZ: { value: 0, min: -45, max: 45, step: 1 },
    }, { collapsed: true }),
  });

  // Rifle crouch offset controls (applied on top of base position)
  const rifleCrouchControls = useControls('Rifle Crouch Offset', {
    'Crouch Idle': folder({
      crouchIdlePosX: { value: 0, min: -0.3, max: 0.3, step: 0.01 },
      crouchIdlePosY: { value: 0, min: -0.3, max: 0.3, step: 0.01 },
      crouchIdlePosZ: { value: 0, min: -0.3, max: 0.3, step: 0.01 },
      crouchIdleRotX: { value: 0, min: -45, max: 45, step: 1 },
      crouchIdleRotY: { value: 0, min: -45, max: 45, step: 1 },
      crouchIdleRotZ: { value: 0, min: -45, max: 45, step: 1 },
    }, { collapsed: true }),
    'Crouch Walk': folder({
      crouchWalkPosX: { value: 0, min: -0.3, max: 0.3, step: 0.01 },
      crouchWalkPosY: { value: 0, min: -0.3, max: 0.3, step: 0.01 },
      crouchWalkPosZ: { value: 0, min: -0.3, max: 0.3, step: 0.01 },
      crouchWalkRotX: { value: 0, min: -45, max: 45, step: 1 },
      crouchWalkRotY: { value: 0, min: -45, max: 45, step: 1 },
      crouchWalkRotZ: { value: 0, min: -45, max: 45, step: 1 },
    }, { collapsed: true }),
    'Crouch Strafe Left': folder({
      crouchStrafeLeftPosX: { value: 0, min: -0.3, max: 0.3, step: 0.01 },
      crouchStrafeLeftPosY: { value: 0, min: -0.3, max: 0.3, step: 0.01 },
      crouchStrafeLeftPosZ: { value: 0, min: -0.3, max: 0.3, step: 0.01 },
      crouchStrafeLeftRotX: { value: 0, min: -45, max: 45, step: 1 },
      crouchStrafeLeftRotY: { value: 0, min: -45, max: 45, step: 1 },
      crouchStrafeLeftRotZ: { value: 0, min: -45, max: 45, step: 1 },
    }, { collapsed: true }),
    'Crouch Strafe Right': folder({
      crouchStrafeRightPosX: { value: 0, min: -0.3, max: 0.3, step: 0.01 },
      crouchStrafeRightPosY: { value: 0, min: -0.3, max: 0.3, step: 0.01 },
      crouchStrafeRightPosZ: { value: 0, min: -0.3, max: 0.3, step: 0.01 },
      crouchStrafeRightRotX: { value: 0, min: -45, max: 45, step: 1 },
      crouchStrafeRightRotY: { value: 0, min: -45, max: 45, step: 1 },
      crouchStrafeRightRotZ: { value: 0, min: -45, max: 45, step: 1 },
    }, { collapsed: true }),
  });

  // Leva controls for pistol (saved config)
  const pistolControls = useControls('Pistol', {
    position: folder({
      posX: { value: 0.03, min: -0.5, max: 0.5, step: 0.01 },
      posY: { value: 0.08, min: -0.5, max: 0.5, step: 0.01 },
      posZ: { value: 0.03, min: -0.5, max: 0.5, step: 0.01 },
    }),
    rotation: folder({
      rotX: { value: 20, min: -180, max: 180, step: 1 },
      rotY: { value: 0, min: -180, max: 180, step: 1 },
      rotZ: { value: -90, min: -180, max: 180, step: 1 },
    }),
    scale: { value: 1.8, min: 0.1, max: 3, step: 0.1 },
  });

  // Copy config button
  useControls('Weapons', {
    'Copy Config': button(() => {
      const config = `// Weapon Configs - paste into WeaponAttachment.tsx
const WEAPON_CONFIGS = {
  rifle: {
    position: new THREE.Vector3(${rifleControls.posX}, ${rifleControls.posY}, ${rifleControls.posZ}),
    rotation: new THREE.Euler(${(rifleControls.rotX * DEG_TO_RAD).toFixed(4)}, ${(rifleControls.rotY * DEG_TO_RAD).toFixed(4)}, ${(rifleControls.rotZ * DEG_TO_RAD).toFixed(4)}),
    scale: ${rifleControls.scale},
  },
  pistol: {
    position: new THREE.Vector3(${pistolControls.posX}, ${pistolControls.posY}, ${pistolControls.posZ}),
    rotation: new THREE.Euler(${(pistolControls.rotX * DEG_TO_RAD).toFixed(4)}, ${(pistolControls.rotY * DEG_TO_RAD).toFixed(4)}, ${(pistolControls.rotZ * DEG_TO_RAD).toFixed(4)}),
    scale: ${pistolControls.scale},
  },
};`;
      navigator.clipboard.writeText(config);
      console.log('📋 Weapon config copied to clipboard!');
      console.log(config);
    }),
  });

  // Track if we've attached this weapon type
  const attachedWeaponType = useRef<WeaponType>(null);
  const attemptCount = useRef(0);

  // Use useFrame to poll for bone attachment and update transforms
  useFrame(() => {
    // If weapon type changed, detach old weapon
    if (attachedWeaponType.current !== weaponType) {
      if (attachedWeapon.current && attachedToBone.current) {
        attachedToBone.current.remove(attachedWeapon.current);
        attachedWeapon.current = null;
        attachedToBone.current = null;
        weaponMeshRef.current = null;
        console.log('🔫 Weapon detached');
      }
      attachedWeaponType.current = weaponType;
      attemptCount.current = 0;
    }

    // Nothing to attach
    if (!weaponType) return;

    // Update existing weapon transforms from Leva controls
    if (weaponMeshRef.current) {
      const controls = weaponType === 'rifle' ? rifleControls : pistolControls;

      // Base position and rotation
      let posX = controls.posX;
      let posY = controls.posY;
      let posZ = controls.posZ;
      let rotX = controls.rotX;
      let rotY = controls.rotY;
      let rotZ = controls.rotZ;

      // Apply firing offsets based on current animation state
      if (weaponType === 'rifle') {
        if (currentAnimState === 'rifleFireStill') {
          posX += rifleFireControls.fireStillPosX;
          posY += rifleFireControls.fireStillPosY;
          posZ += rifleFireControls.fireStillPosZ;
          rotX += rifleFireControls.fireStillRotX;
          rotY += rifleFireControls.fireStillRotY;
          rotZ += rifleFireControls.fireStillRotZ;
        } else if (currentAnimState === 'rifleFireWalk') {
          posX += rifleFireControls.fireWalkPosX;
          posY += rifleFireControls.fireWalkPosY;
          posZ += rifleFireControls.fireWalkPosZ;
          rotX += rifleFireControls.fireWalkRotX;
          rotY += rifleFireControls.fireWalkRotY;
          rotZ += rifleFireControls.fireWalkRotZ;
        } else if (currentAnimState === 'rifleFireCrouch') {
          posX += rifleFireControls.fireCrouchPosX;
          posY += rifleFireControls.fireCrouchPosY;
          posZ += rifleFireControls.fireCrouchPosZ;
          rotX += rifleFireControls.fireCrouchRotX;
          rotY += rifleFireControls.fireCrouchRotY;
          rotZ += rifleFireControls.fireCrouchRotZ;
        } else if (currentAnimState === 'crouchRapidFireRifle') {
          posX += rifleFireControls.fireCrouchIdlePosX;
          posY += rifleFireControls.fireCrouchIdlePosY;
          posZ += rifleFireControls.fireCrouchIdlePosZ;
          rotX += rifleFireControls.fireCrouchIdleRotX;
          rotY += rifleFireControls.fireCrouchIdleRotY;
          rotZ += rifleFireControls.fireCrouchIdleRotZ;
        } else if (currentAnimState === 'crouchFireRifleTap') {
          posX += rifleFireControls.fireCrouchTapPosX;
          posY += rifleFireControls.fireCrouchTapPosY;
          posZ += rifleFireControls.fireCrouchTapPosZ;
          rotX += rifleFireControls.fireCrouchTapRotX;
          rotY += rifleFireControls.fireCrouchTapRotY;
          rotZ += rifleFireControls.fireCrouchTapRotZ;
        } else if (currentAnimState === 'crouchRifleIdle') {
          posX += rifleCrouchControls.crouchIdlePosX;
          posY += rifleCrouchControls.crouchIdlePosY;
          posZ += rifleCrouchControls.crouchIdlePosZ;
          rotX += rifleCrouchControls.crouchIdleRotX;
          rotY += rifleCrouchControls.crouchIdleRotY;
          rotZ += rifleCrouchControls.crouchIdleRotZ;
        } else if (currentAnimState === 'crouchRifleWalk') {
          posX += rifleCrouchControls.crouchWalkPosX;
          posY += rifleCrouchControls.crouchWalkPosY;
          posZ += rifleCrouchControls.crouchWalkPosZ;
          rotX += rifleCrouchControls.crouchWalkRotX;
          rotY += rifleCrouchControls.crouchWalkRotY;
          rotZ += rifleCrouchControls.crouchWalkRotZ;
        } else if (currentAnimState === 'crouchRifleStrafeLeft') {
          posX += rifleCrouchControls.crouchStrafeLeftPosX;
          posY += rifleCrouchControls.crouchStrafeLeftPosY;
          posZ += rifleCrouchControls.crouchStrafeLeftPosZ;
          rotX += rifleCrouchControls.crouchStrafeLeftRotX;
          rotY += rifleCrouchControls.crouchStrafeLeftRotY;
          rotZ += rifleCrouchControls.crouchStrafeLeftRotZ;
        } else if (currentAnimState === 'crouchRifleStrafeRight') {
          posX += rifleCrouchControls.crouchStrafeRightPosX;
          posY += rifleCrouchControls.crouchStrafeRightPosY;
          posZ += rifleCrouchControls.crouchStrafeRightPosZ;
          rotX += rifleCrouchControls.crouchStrafeRightRotX;
          rotY += rifleCrouchControls.crouchStrafeRightRotY;
          rotZ += rifleCrouchControls.crouchStrafeRightRotZ;
        }
      }

      weaponMeshRef.current.position.set(posX, posY, posZ);
      weaponMeshRef.current.rotation.set(
        rotX * DEG_TO_RAD,
        rotY * DEG_TO_RAD,
        rotZ * DEG_TO_RAD
      );
      weaponMeshRef.current.scale.setScalar(controls.scale);
      return;
    }

    // Already attached
    if (attachedWeapon.current) return;

    // Limit attempts to avoid spam
    if (attemptCount.current > 60) return; // Give up after 1 second (60 frames)
    attemptCount.current++;

    // Wait for avatar
    if (!avatarRef.current) return;

    // Find the hand bone (debug on first attempt to show all bones)
    const handBone = findBone(avatarRef.current, RIGHT_HAND_BONE_NAMES, attemptCount.current === 1);
    if (!handBone) {
      if (attemptCount.current === 1) {
        console.log('🔫 Searching for hand bone...');
      }
      return;
    }

    console.log('🔫 Found hand bone:', handBone.name);

    // Create a container group for the weapon
    const weaponContainer = new THREE.Group();
    weaponContainer.name = 'WeaponContainer';

    // Clone the weapon scene for this attachment
    const gltf = weaponType === 'rifle' ? rifleGltf : pistolGltf;
    const weaponClone = gltf.scene.clone(true);

    // Enable shadows
    weaponClone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    // Apply initial transforms from Leva controls
    const controls = weaponType === 'rifle' ? rifleControls : pistolControls;
    weaponClone.position.set(controls.posX, controls.posY, controls.posZ);
    weaponClone.rotation.set(
      controls.rotX * DEG_TO_RAD,
      controls.rotY * DEG_TO_RAD,
      controls.rotZ * DEG_TO_RAD
    );
    weaponClone.scale.setScalar(controls.scale);

    // Store reference for live updates
    weaponMeshRef.current = weaponClone;

    // Add weapon to container
    weaponContainer.add(weaponClone);

    // Attach container to hand bone
    handBone.add(weaponContainer);

    // Store references for cleanup
    attachedWeapon.current = weaponContainer;
    attachedToBone.current = handBone;

    console.log('🔫 Weapon attached to hand!', weaponType);
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (attachedWeapon.current && attachedToBone.current) {
        attachedToBone.current.remove(attachedWeapon.current);
        console.log('🔫 Weapon cleanup on unmount');
      }
    };
  }, []);

  // This component doesn't render anything itself
  // The weapon is added directly to the Three.js scene graph via the bone
  return null;
}

// Preload weapons
useGLTF.preload(WEAPONS.rifle);
useGLTF.preload(WEAPONS.pistol);

export default WeaponAttachment;
