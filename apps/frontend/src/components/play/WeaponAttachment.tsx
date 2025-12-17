/**
 * Weapon Attachment System
 * Attaches weapon models directly to character hand bones
 * Uses Leva controls for live adjustment
 * Includes muzzle flash effect (sprite + point light)
 */

import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { useControls, folder, button } from 'leva';
import * as THREE from 'three';
import { getModelPath } from '../../config/assetPaths';
import { useCombatStore } from './combat/useCombatStore';

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

// Calculate barrel tip from weapon bounding box
// Returns the position in local weapon space where the muzzle should be
function getBarrelTipFromBoundingBox(weaponScene: THREE.Object3D): THREE.Vector3 {
  const box = new THREE.Box3().setFromObject(weaponScene);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  // For an AK-47 style rifle, the barrel extends along the longest axis
  // Based on typical weapon orientation, the barrel tip is at max Y
  // We'll use the bounding box to find the furthest point
  return new THREE.Vector3(
    center.x,           // Center X
    box.max.y,          // Barrel tip at max Y (along barrel)
    center.z            // Center Z
  );
}

export function WeaponAttachment({
  weaponType,
  avatarRef,
  currentAnimState = '',
}: WeaponAttachmentProps) {
  // Track what we've attached
  const attachedWeapon = useRef<THREE.Group | null>(null);
  const attachedToBone = useRef<THREE.Bone | null>(null);
  const weaponMeshRef = useRef<THREE.Object3D | null>(null);

  // Muzzle flash refs
  const muzzleFlashRef = useRef<THREE.Group | null>(null);
  const muzzleFlashLight = useRef<THREE.PointLight | null>(null);
  const muzzleFlashModel = useRef<THREE.Object3D | null>(null);
  const lastFireTime = useRef(0);

  // Get firing state from combat store
  const isFiring = useCombatStore((state) => state.isFiring);

  // Load weapon models
  const rifleGltf = useGLTF(WEAPONS.rifle);
  const pistolGltf = useGLTF(WEAPONS.pistol);

  // Load muzzle flash model
  const muzzleFlashGltf = useGLTF(getModelPath('effects/machine_gun_muzzle_flash_test_effect.glb'));

  // Store calculated barrel tip for reference
  const calculatedBarrelTip = useRef<THREE.Vector3 | null>(null);

  // === ALL WEAPON CONTROLS IN ONE PANEL ===
  // Consolidated for cleaner Leva workspace
  const weaponControls = useControls('🔫 Weapons', {
    // Rifle base position/rotation
    'Rifle': folder({
      riflePosX: { value: 0.01, min: -0.5, max: 0.5, step: 0.01, label: 'Pos X' },
      riflePosY: { value: 0.23, min: -0.5, max: 0.5, step: 0.01, label: 'Pos Y' },
      riflePosZ: { value: 0.03, min: -0.5, max: 0.5, step: 0.01, label: 'Pos Z' },
      rifleRotX: { value: 89, min: -180, max: 180, step: 1, label: 'Rot X' },
      rifleRotY: { value: -144, min: -180, max: 180, step: 1, label: 'Rot Y' },
      rifleRotZ: { value: 85, min: -180, max: 180, step: 1, label: 'Rot Z' },
      rifleScale: { value: 1.1, min: 0.1, max: 3, step: 0.1, label: 'Scale' },
    }, { collapsed: true }),

    // Pistol base position/rotation
    'Pistol': folder({
      pistolPosX: { value: 0.03, min: -0.5, max: 0.5, step: 0.01, label: 'Pos X' },
      pistolPosY: { value: 0.08, min: -0.5, max: 0.5, step: 0.01, label: 'Pos Y' },
      pistolPosZ: { value: 0.03, min: -0.5, max: 0.5, step: 0.01, label: 'Pos Z' },
      pistolRotX: { value: 20, min: -180, max: 180, step: 1, label: 'Rot X' },
      pistolRotY: { value: 0, min: -180, max: 180, step: 1, label: 'Rot Y' },
      pistolRotZ: { value: -90, min: -180, max: 180, step: 1, label: 'Rot Z' },
      pistolScale: { value: 1.8, min: 0.1, max: 3, step: 0.1, label: 'Scale' },
    }, { collapsed: true }),

    // Muzzle Flash
    'Muzzle Flash': folder({
      rifleMuzzleX: { value: 0.0, min: -0.5, max: 0.5, step: 0.005, label: 'Rifle X' },
      rifleMuzzleY: { value: 0.0, min: -0.5, max: 0.5, step: 0.005, label: 'Rifle Y' },
      rifleMuzzleZ: { value: 0.435, min: -0.5, max: 0.5, step: 0.005, label: 'Rifle Z' },
      pistolMuzzleX: { value: 0.0, min: -0.3, max: 0.3, step: 0.005, label: 'Pistol X' },
      pistolMuzzleY: { value: 0.0, min: -0.3, max: 0.3, step: 0.005, label: 'Pistol Y' },
      pistolMuzzleZ: { value: 0.0, min: -0.3, max: 0.3, step: 0.005, label: 'Pistol Z' },
      flashScale: { value: 0.003, min: 0.001, max: 0.05, step: 0.001 },
      flashRotX: { value: -90, min: -180, max: 180, step: 5 },
      flashRotY: { value: 0, min: -180, max: 180, step: 5 },
      flashRotZ: { value: 0, min: -180, max: 180, step: 5 },
      lightIntensity: { value: 2, min: 0, max: 10, step: 0.5 },
      lightDistance: { value: 2, min: 0.5, max: 5, step: 0.5 },
      flashDuration: { value: 50, min: 20, max: 150, step: 10 },
    }, { collapsed: true }),

    // Fire offsets (for animation tuning)
    'Fire Offsets': folder({
      fireStillPosX: { value: 0, min: -0.3, max: 0.3, step: 0.01 },
      fireStillPosY: { value: 0, min: -0.3, max: 0.3, step: 0.01 },
      fireStillPosZ: { value: 0, min: -0.3, max: 0.3, step: 0.01 },
      fireStillRotY: { value: -28, min: -45, max: 45, step: 1 },
      fireWalkPosZ: { value: 0.02, min: -0.3, max: 0.3, step: 0.01 },
      fireWalkRotY: { value: -30, min: -45, max: 45, step: 1 },
      fireCrouchPosX: { value: 0.03, min: -0.3, max: 0.3, step: 0.01 },
      fireCrouchRotY: { value: -29, min: -45, max: 45, step: 1 },
    }, { collapsed: true }),

    // Crouch offsets
    'Crouch Offsets': folder({
      crouchIdlePosX: { value: 0, min: -0.3, max: 0.3, step: 0.01 },
      crouchIdlePosY: { value: 0, min: -0.3, max: 0.3, step: 0.01 },
      crouchIdlePosZ: { value: 0, min: -0.3, max: 0.3, step: 0.01 },
      crouchWalkPosX: { value: 0, min: -0.3, max: 0.3, step: 0.01 },
      crouchWalkPosY: { value: 0, min: -0.3, max: 0.3, step: 0.01 },
      crouchWalkPosZ: { value: 0, min: -0.3, max: 0.3, step: 0.01 },
    }, { collapsed: true }),

    // Debug & Utils
    'Utils': folder({
      'Log Barrel': button(() => {
        if (calculatedBarrelTip.current) {
          const tip = calculatedBarrelTip.current;
          console.log('🎯 Barrel tip:', { x: tip.x.toFixed(4), y: tip.y.toFixed(4), z: tip.z.toFixed(4) });
        } else {
          console.log('🎯 No barrel tip - equip a weapon first');
        }
      }),
      'Copy Config': button(() => {
        const config = JSON.stringify({
          rifle: { pos: [weaponControls.riflePosX, weaponControls.riflePosY, weaponControls.riflePosZ], rot: [weaponControls.rifleRotX, weaponControls.rifleRotY, weaponControls.rifleRotZ], scale: weaponControls.rifleScale },
          pistol: { pos: [weaponControls.pistolPosX, weaponControls.pistolPosY, weaponControls.pistolPosZ], rot: [weaponControls.pistolRotX, weaponControls.pistolRotY, weaponControls.pistolRotZ], scale: weaponControls.pistolScale },
        }, null, 2);
        navigator.clipboard.writeText(config);
        console.log('📋 Config copied!', config);
      }),
    }, { collapsed: true }),
  }, { collapsed: true });

  // Map controls to old variable names for compatibility
  const rifleControls = {
    posX: weaponControls.riflePosX, posY: weaponControls.riflePosY, posZ: weaponControls.riflePosZ,
    rotX: weaponControls.rifleRotX, rotY: weaponControls.rifleRotY, rotZ: weaponControls.rifleRotZ,
    scale: weaponControls.rifleScale,
  };
  const pistolControls = {
    posX: weaponControls.pistolPosX, posY: weaponControls.pistolPosY, posZ: weaponControls.pistolPosZ,
    rotX: weaponControls.pistolRotX, rotY: weaponControls.pistolRotY, rotZ: weaponControls.pistolRotZ,
    scale: weaponControls.pistolScale,
  };
  const muzzleFlashControls = {
    rifleMuzzleX: weaponControls.rifleMuzzleX, rifleMuzzleY: weaponControls.rifleMuzzleY, rifleMuzzleZ: weaponControls.rifleMuzzleZ,
    pistolMuzzleX: weaponControls.pistolMuzzleX, pistolMuzzleY: weaponControls.pistolMuzzleY, pistolMuzzleZ: weaponControls.pistolMuzzleZ,
    flashScale: weaponControls.flashScale, flashRotX: weaponControls.flashRotX, flashRotY: weaponControls.flashRotY, flashRotZ: weaponControls.flashRotZ,
    lightIntensity: weaponControls.lightIntensity, lightDistance: weaponControls.lightDistance, flashDuration: weaponControls.flashDuration,
  };
  const rifleFireControls = {
    fireStillPosX: weaponControls.fireStillPosX, fireStillPosY: weaponControls.fireStillPosY, fireStillPosZ: weaponControls.fireStillPosZ,
    fireStillRotX: 0, fireStillRotY: weaponControls.fireStillRotY, fireStillRotZ: 0,
    fireWalkPosX: 0, fireWalkPosY: 0, fireWalkPosZ: weaponControls.fireWalkPosZ,
    fireWalkRotX: 0, fireWalkRotY: weaponControls.fireWalkRotY, fireWalkRotZ: 0,
    fireCrouchPosX: weaponControls.fireCrouchPosX, fireCrouchPosY: 0, fireCrouchPosZ: 0,
    fireCrouchRotX: 0, fireCrouchRotY: weaponControls.fireCrouchRotY, fireCrouchRotZ: 0,
    fireCrouchIdlePosX: weaponControls.fireCrouchPosX, fireCrouchIdlePosY: 0, fireCrouchIdlePosZ: 0,
    fireCrouchIdleRotX: 0, fireCrouchIdleRotY: -28, fireCrouchIdleRotZ: 0,
    fireCrouchTapPosX: 0, fireCrouchTapPosY: 0, fireCrouchTapPosZ: 0,
    fireCrouchTapRotX: 0, fireCrouchTapRotY: 0, fireCrouchTapRotZ: 0,
  };
  const rifleCrouchControls = {
    crouchIdlePosX: weaponControls.crouchIdlePosX, crouchIdlePosY: weaponControls.crouchIdlePosY, crouchIdlePosZ: weaponControls.crouchIdlePosZ,
    crouchIdleRotX: 0, crouchIdleRotY: 0, crouchIdleRotZ: 0,
    crouchWalkPosX: weaponControls.crouchWalkPosX, crouchWalkPosY: weaponControls.crouchWalkPosY, crouchWalkPosZ: weaponControls.crouchWalkPosZ,
    crouchWalkRotX: 0, crouchWalkRotY: 0, crouchWalkRotZ: 0,
    crouchStrafeLeftPosX: 0, crouchStrafeLeftPosY: 0, crouchStrafeLeftPosZ: 0,
    crouchStrafeLeftRotX: 0, crouchStrafeLeftRotY: 0, crouchStrafeLeftRotZ: 0,
    crouchStrafeRightPosX: 0, crouchStrafeRightPosY: 0, crouchStrafeRightPosZ: 0,
    crouchStrafeRightRotX: 0, crouchStrafeRightRotY: 0, crouchStrafeRightRotZ: 0,
  };

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
        // Clean up muzzle flash refs
        muzzleFlashRef.current = null;
        muzzleFlashLight.current = null;
        muzzleFlashModel.current = null;
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

      // Update muzzle flash visibility and position
      if (muzzleFlashRef.current) {
        const now = Date.now();

        // Show flash when firing (with random flicker for realism)
        if (isFiring) {
          // Flash visible with random scale variation
          muzzleFlashRef.current.visible = true;
          lastFireTime.current = now;

          // Randomize model scale for flicker effect
          const flickerScale = muzzleFlashControls.flashScale * (0.8 + Math.random() * 0.4);
          if (muzzleFlashModel.current) {
            muzzleFlashModel.current.scale.setScalar(flickerScale);
          }

          // Randomize light intensity
          if (muzzleFlashLight.current) {
            muzzleFlashLight.current.intensity = muzzleFlashControls.lightIntensity * (0.7 + Math.random() * 0.6);
          }

          // Random Z rotation for variety (around barrel axis)
          muzzleFlashRef.current.rotation.z = muzzleFlashControls.flashRotZ * DEG_TO_RAD + Math.random() * Math.PI * 2;
        } else {
          // Hide after flash duration
          if (now - lastFireTime.current > muzzleFlashControls.flashDuration) {
            muzzleFlashRef.current.visible = false;
          }
        }

        // Update muzzle flash position from Leva controls + calculated barrel tip
        const basePosition = calculatedBarrelTip.current?.clone() || new THREE.Vector3();
        const muzzleOffset = weaponType === 'rifle'
          ? new THREE.Vector3(
              muzzleFlashControls.rifleMuzzleX,
              muzzleFlashControls.rifleMuzzleY,
              muzzleFlashControls.rifleMuzzleZ
            )
          : new THREE.Vector3(
              muzzleFlashControls.pistolMuzzleX,
              muzzleFlashControls.pistolMuzzleY,
              muzzleFlashControls.pistolMuzzleZ
            );
        muzzleFlashRef.current.position.copy(basePosition.add(muzzleOffset));

        // Update model rotation from Leva (X and Y only, Z is randomized)
        if (muzzleFlashModel.current) {
          muzzleFlashModel.current.rotation.x = muzzleFlashControls.flashRotX * DEG_TO_RAD;
          muzzleFlashModel.current.rotation.y = muzzleFlashControls.flashRotY * DEG_TO_RAD;
        }

        // Update effect settings from Leva
        if (muzzleFlashLight.current) {
          muzzleFlashLight.current.distance = muzzleFlashControls.lightDistance;
        }
      }

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

    // Calculate barrel tip position from bounding box BEFORE applying transforms
    // This gives us the barrel position in the weapon's local untransformed space
    const barrelTip = getBarrelTipFromBoundingBox(gltf.scene);
    calculatedBarrelTip.current = barrelTip;

    // Log barrel info for debugging - helps tune muzzle flash position
    const box = new THREE.Box3().setFromObject(gltf.scene);
    const size = new THREE.Vector3();
    box.getSize(size);
    console.log(`🔫 ${weaponType} bounding box:`, {
      min: { x: box.min.x.toFixed(3), y: box.min.y.toFixed(3), z: box.min.z.toFixed(3) },
      max: { x: box.max.x.toFixed(3), y: box.max.y.toFixed(3), z: box.max.z.toFixed(3) },
      size: { x: size.x.toFixed(3), y: size.y.toFixed(3), z: size.z.toFixed(3) },
      barrelTip: { x: barrelTip.x.toFixed(3), y: barrelTip.y.toFixed(3), z: barrelTip.z.toFixed(3) },
    });

    // Add weapon to container
    weaponContainer.add(weaponClone);

    // Create muzzle flash group
    const muzzleFlashGroup = new THREE.Group();
    muzzleFlashGroup.name = 'MuzzleFlash';

    // Clone the muzzle flash GLB model
    const flashModelClone = muzzleFlashGltf.scene.clone(true);
    flashModelClone.scale.setScalar(muzzleFlashControls.flashScale);
    flashModelClone.rotation.set(
      muzzleFlashControls.flashRotX * DEG_TO_RAD,
      muzzleFlashControls.flashRotY * DEG_TO_RAD,
      muzzleFlashControls.flashRotZ * DEG_TO_RAD
    );

    // Make materials emissive/additive for glow effect
    flashModelClone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (mesh.material) {
          const mat = mesh.material as THREE.MeshStandardMaterial;
          // Increase emissive intensity for better glow
          if (mat.emissive) {
            mat.emissiveIntensity = 2;
          }
          // Enable transparency
          mat.transparent = true;
          mat.depthWrite = false;
        }
      }
    });

    muzzleFlashGroup.add(flashModelClone);
    muzzleFlashModel.current = flashModelClone;

    // Create point light for scene illumination
    const light = new THREE.PointLight(
      0xffaa00,
      muzzleFlashControls.lightIntensity,
      muzzleFlashControls.lightDistance
    );
    light.castShadow = false; // Shadows would be expensive
    muzzleFlashGroup.add(light);
    muzzleFlashLight.current = light;

    // Position muzzle flash at barrel tip
    // Use calculated barrel tip as base, plus manual Leva offsets for fine-tuning
    const basePosition = barrelTip.clone();
    const muzzleOffset = weaponType === 'rifle'
      ? new THREE.Vector3(
          muzzleFlashControls.rifleMuzzleX,
          muzzleFlashControls.rifleMuzzleY,
          muzzleFlashControls.rifleMuzzleZ
        )
      : new THREE.Vector3(
          muzzleFlashControls.pistolMuzzleX,
          muzzleFlashControls.pistolMuzzleY,
          muzzleFlashControls.pistolMuzzleZ
        );
    muzzleFlashGroup.position.copy(basePosition.add(muzzleOffset));

    // Start hidden
    muzzleFlashGroup.visible = false;

    // Add to weapon clone (so it inherits weapon transforms)
    weaponClone.add(muzzleFlashGroup);
    muzzleFlashRef.current = muzzleFlashGroup;

    // Attach container to hand bone
    handBone.add(weaponContainer);

    // Store references for cleanup
    attachedWeapon.current = weaponContainer;
    attachedToBone.current = handBone;

    console.log('🔫 Weapon attached with muzzle flash!', weaponType);
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

// Preload weapons and effects
useGLTF.preload(WEAPONS.rifle);
useGLTF.preload(WEAPONS.pistol);
useGLTF.preload(getModelPath('effects/machine_gun_muzzle_flash_test_effect.glb'));

export default WeaponAttachment;
