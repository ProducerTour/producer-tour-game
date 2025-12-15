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

// Weapon model paths
export const WEAPONS = {
  rifle: '/models/weapons/ak47fbx_gltf/scene.gltf',
  pistol: '/models/weapons/pistolorange_gltf/scene.gltf',
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
}

// Find a bone by trying multiple naming conventions
function findBone(skeleton: THREE.Object3D, names: string[]): THREE.Bone | null {
  let foundBone: THREE.Bone | null = null;

  skeleton.traverse((child) => {
    if (foundBone) return;
    if (child instanceof THREE.Bone) {
      for (const name of names) {
        if (child.name === name || child.name.includes(name)) {
          foundBone = child;
          return;
        }
      }
    }
  });

  return foundBone;
}

// Convert degrees to radians
const DEG_TO_RAD = Math.PI / 180;

export function WeaponAttachment({
  weaponType,
  avatarRef,
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
      weaponMeshRef.current.position.set(controls.posX, controls.posY, controls.posZ);
      weaponMeshRef.current.rotation.set(
        controls.rotX * DEG_TO_RAD,
        controls.rotY * DEG_TO_RAD,
        controls.rotZ * DEG_TO_RAD
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

    // Find the hand bone
    const handBone = findBone(avatarRef.current, RIGHT_HAND_BONE_NAMES);
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
