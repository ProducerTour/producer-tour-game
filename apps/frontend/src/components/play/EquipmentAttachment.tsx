/**
 * Equipment Attachment System
 * Attaches equipment models (flashlight, tools, etc.) to character hand bones
 * Similar to WeaponAttachment but for non-weapon equipment items
 */

import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { useControls, folder } from 'leva';
import * as THREE from 'three';
import { getModelPath } from '../../config/assetPaths';
import { useInventoryStore } from '../../lib/economy/inventoryStore';
import { useFlashlightStore } from '../../stores/useFlashlightStore';

// Debug logging
const DEBUG_EQUIPMENT = false;

// Hand bone names in Mixamo/RPM skeleton
const RIGHT_HAND_BONE_NAMES = [
  'RightHand',
  'mixamorigRightHand',
  'rightHand',
  'Right_Hand',
  'hand_r',
  'hand.R',
];

// Equipment model paths
const EQUIPMENT_MODEL_PATHS = {
  flashlight: 'Items/Flashlight/flashlight.glb',
} as const;

// Default transforms for flashlight - tuned values
const FLASHLIGHT_DEFAULTS = {
  posX: 0,
  posY: 0.13,
  posZ: 0.05,
  rotX: 5,
  rotY: 30,
  rotZ: -90,
  scale: 0.8,
};

// Flashlight spotlight defaults
const FLASHLIGHT_LIGHT_DEFAULTS = {
  color: '#fffae6',
  intensity: 10.0,
  distance: 79,
  angle: 55, // degrees
  penumbra: 0.25,
  // Offset from flashlight model to light emission point
  emitOffsetX: -0.5,
  emitOffsetY: -0.5,
  emitOffsetZ: -0.5,
  // Light direction in local space (which axis the light points along)
  dirX: -0.1,
  dirY: 20,
  dirZ: 1,
  // Base stabilization (Rust-style: velocity adds MORE smoothing on top of this)
  // 12 = stable when standing, velocity boost adds up to +15 when running
  smoothing: 12,
};

type EquipmentType = keyof typeof EQUIPMENT_MODEL_PATHS | null;

interface EquipmentAttachmentProps {
  avatarRef: React.RefObject<THREE.Group>;
}

// Find a bone by trying multiple naming conventions
function findBone(root: THREE.Object3D, names: string[]): THREE.Bone | null {
  let foundBone: THREE.Bone | null = null;

  root.traverse((child) => {
    if (foundBone) return;

    // Check if this is a SkinnedMesh with a skeleton
    const skinnedMesh = child as THREE.SkinnedMesh;
    if (skinnedMesh.isSkinnedMesh && skinnedMesh.skeleton) {
      for (const bone of skinnedMesh.skeleton.bones) {
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
      if (foundBone) return;
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

export function EquipmentAttachment({ avatarRef }: EquipmentAttachmentProps) {
  // Get scene and camera reference for spotlight direction
  const { scene, camera } = useThree();

  // Track what we've attached
  const attachedEquipment = useRef<THREE.Group | null>(null);
  const attachedToBone = useRef<THREE.Bone | null>(null);
  const equipmentMeshRef = useRef<THREE.Object3D | null>(null);
  const attachedEquipmentType = useRef<EquipmentType>(null);
  const attemptCount = useRef(0);

  // Spotlight refs for cone light
  const spotlightRef = useRef<THREE.SpotLight | null>(null);
  const spotlightTargetRef = useRef<THREE.Object3D | null>(null);

  // Smoothed position refs for stabilization (like most games do)
  const smoothedLightPos = useRef(new THREE.Vector3());
  const smoothedTargetPos = useRef(new THREE.Vector3());
  const smoothedDirection = useRef(new THREE.Vector3(0, 0, -1));
  const isFirstFrame = useRef(true);

  // Velocity tracking for Rust-style adaptive smoothing
  const prevLightPos = useRef(new THREE.Vector3());
  const velocitySmoothing = useRef(0); // Current velocity-based smoothing boost

  // Get active hotbar item
  const activeHotbarSlot = useInventoryStore((s) => s.activeHotbarSlot);
  const hotbarSlots = useInventoryStore((s) => s.hotbarSlots);

  // Get flashlight state for visual feedback (used in useFrame for emissive glow)
  const isFlashlightOn = useFlashlightStore((s) => s.isOn);
  const setFlashlightEquipped = useFlashlightStore((s) => s.setEquipped);
  const isFlashlightOnRef = useRef(isFlashlightOn);
  isFlashlightOnRef.current = isFlashlightOn;

  // Determine what equipment to show
  const activeSlot = activeHotbarSlot >= 0 ? hotbarSlots[activeHotbarSlot] : null;
  const hasLightConfig = activeSlot?.item?.metadata?.lightConfig !== undefined;

  // Determine equipment type from active item
  const equipmentType: EquipmentType = hasLightConfig ? 'flashlight' : null;

  // Update flashlight equipped state for player controller (enables mouse look)
  useEffect(() => {
    setFlashlightEquipped(equipmentType === 'flashlight');
  }, [equipmentType, setFlashlightEquipped]);

  // Preload flashlight model
  const flashlightGltf = useGLTF(getModelPath(EQUIPMENT_MODEL_PATHS.flashlight));

  // Store ref for Leva control values (avoid reading every frame)
  const flashlightControlsRef = useRef({ ...FLASHLIGHT_DEFAULTS });
  const flashlightLightRef = useRef({ ...FLASHLIGHT_LIGHT_DEFAULTS });

  // Leva controls for flashlight positioning
  const flashlightControls = useControls('🔦 Flashlight', {
    'Model Transform': folder({
      posX: { value: FLASHLIGHT_DEFAULTS.posX, min: -0.5, max: 0.5, step: 0.01, label: 'Pos X' },
      posY: { value: FLASHLIGHT_DEFAULTS.posY, min: -0.5, max: 1.0, step: 0.01, label: 'Pos Y' },
      posZ: { value: FLASHLIGHT_DEFAULTS.posZ, min: -0.5, max: 0.5, step: 0.01, label: 'Pos Z' },
      rotX: { value: FLASHLIGHT_DEFAULTS.rotX, min: -180, max: 180, step: 1, label: 'Rot X' },
      rotY: { value: FLASHLIGHT_DEFAULTS.rotY, min: -180, max: 180, step: 1, label: 'Rot Y' },
      rotZ: { value: FLASHLIGHT_DEFAULTS.rotZ, min: -180, max: 180, step: 1, label: 'Rot Z' },
      scale: { value: FLASHLIGHT_DEFAULTS.scale, min: 0.1, max: 3, step: 0.1, label: 'Scale' },
    }, { collapsed: true }),
    'Light': folder({
      intensity: { value: FLASHLIGHT_LIGHT_DEFAULTS.intensity, min: 0, max: 10, step: 0.1, label: 'Intensity' },
      distance: { value: FLASHLIGHT_LIGHT_DEFAULTS.distance, min: 5, max: 100, step: 1, label: 'Distance' },
      angle: { value: FLASHLIGHT_LIGHT_DEFAULTS.angle, min: 5, max: 90, step: 1, label: 'Cone Angle' },
      penumbra: { value: FLASHLIGHT_LIGHT_DEFAULTS.penumbra, min: 0, max: 1, step: 0.05, label: 'Penumbra' },
      emitOffsetX: { value: FLASHLIGHT_LIGHT_DEFAULTS.emitOffsetX, min: -0.5, max: 0.5, step: 0.01, label: 'Emit X' },
      emitOffsetY: { value: FLASHLIGHT_LIGHT_DEFAULTS.emitOffsetY, min: -0.5, max: 0.5, step: 0.01, label: 'Emit Y' },
      emitOffsetZ: { value: FLASHLIGHT_LIGHT_DEFAULTS.emitOffsetZ, min: -0.5, max: 0.5, step: 0.01, label: 'Emit Z' },
      dirX: { value: FLASHLIGHT_LIGHT_DEFAULTS.dirX, min: -1, max: 1, step: 0.1, label: 'Dir X' },
      dirY: { value: FLASHLIGHT_LIGHT_DEFAULTS.dirY, min: -5, max: 20, step: 0.1, label: 'Dir Y' },
      dirZ: { value: FLASHLIGHT_LIGHT_DEFAULTS.dirZ, min: -1, max: 1, step: 0.1, label: 'Dir Z' },
      smoothing: { value: FLASHLIGHT_LIGHT_DEFAULTS.smoothing, min: 0, max: 20, step: 0.5, label: 'Stabilization' },
    }, { collapsed: true }),
  }, { collapsed: true });

  // Sync Leva values to ref when they change (not every frame)
  useEffect(() => {
    flashlightControlsRef.current = {
      posX: flashlightControls.posX,
      posY: flashlightControls.posY,
      posZ: flashlightControls.posZ,
      rotX: flashlightControls.rotX,
      rotY: flashlightControls.rotY,
      rotZ: flashlightControls.rotZ,
      scale: flashlightControls.scale,
    };
    flashlightLightRef.current = {
      ...FLASHLIGHT_LIGHT_DEFAULTS,
      intensity: flashlightControls.intensity,
      distance: flashlightControls.distance,
      angle: flashlightControls.angle,
      penumbra: flashlightControls.penumbra,
      emitOffsetX: flashlightControls.emitOffsetX,
      emitOffsetY: flashlightControls.emitOffsetY,
      emitOffsetZ: flashlightControls.emitOffsetZ,
      dirX: flashlightControls.dirX,
      dirY: flashlightControls.dirY,
      dirZ: flashlightControls.dirZ,
      smoothing: flashlightControls.smoothing,
    };
  }, [flashlightControls]);

  useFrame(() => {
    // If equipment type changed, detach old equipment
    if (attachedEquipmentType.current !== equipmentType) {
      if (attachedEquipment.current && attachedToBone.current) {
        attachedToBone.current.remove(attachedEquipment.current);

        // Dispose cloned meshes
        attachedEquipment.current.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.geometry?.dispose();
            if (mesh.material) {
              const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
              materials.forEach((mat) => mat.dispose());
            }
          }
        });

        attachedEquipment.current = null;
        attachedToBone.current = null;
        equipmentMeshRef.current = null;

        // Clean up spotlight from scene
        if (spotlightRef.current) {
          scene.remove(spotlightRef.current);
          spotlightRef.current.dispose();
          spotlightRef.current = null;
        }
        if (spotlightTargetRef.current) {
          scene.remove(spotlightTargetRef.current);
          spotlightTargetRef.current = null;
        }

        if (DEBUG_EQUIPMENT) console.log('Equipment detached');
      }
      attachedEquipmentType.current = equipmentType;
      attemptCount.current = 0;
    }

    // Nothing to attach
    if (!equipmentType) return;

    // Update existing equipment transforms and visuals
    if (equipmentMeshRef.current) {
      // Apply live transforms from Leva controls
      if (equipmentType === 'flashlight') {
        const controls = flashlightControlsRef.current;
        const lightControls = flashlightLightRef.current;

        equipmentMeshRef.current.position.set(controls.posX, controls.posY, controls.posZ);
        equipmentMeshRef.current.rotation.set(
          controls.rotX * DEG_TO_RAD,
          controls.rotY * DEG_TO_RAD,
          controls.rotZ * DEG_TO_RAD
        );
        equipmentMeshRef.current.scale.setScalar(controls.scale);

        // Add emissive glow when flashlight is on
        equipmentMeshRef.current.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            const material = mesh.material as THREE.MeshStandardMaterial;
            if (material.emissive) {
              // Glow when on, dark when off
              material.emissiveIntensity = isFlashlightOnRef.current ? 0.5 : 0;
            }
          }
        });

        // Update spotlight
        if (spotlightRef.current && spotlightTargetRef.current) {
          // Toggle visibility based on flashlight state
          spotlightRef.current.visible = isFlashlightOnRef.current;

          // Update spotlight properties from Leva
          spotlightRef.current.intensity = lightControls.intensity;
          spotlightRef.current.distance = lightControls.distance;
          spotlightRef.current.angle = lightControls.angle * DEG_TO_RAD;
          spotlightRef.current.penumbra = lightControls.penumbra;

          // Get world position of flashlight model (for light origin)
          const flashlightWorldPos = new THREE.Vector3();
          equipmentMeshRef.current.getWorldPosition(flashlightWorldPos);

          // Get world quaternion for emission offset only (not direction)
          const worldQuat = new THREE.Quaternion();
          equipmentMeshRef.current.getWorldQuaternion(worldQuat);

          // ========================================
          // USE CAMERA DIRECTION FOR LIGHT AIM
          // This prevents wrist rotation from affecting where the light points
          // The light always points where the player is looking
          // ========================================
          const cameraDir = new THREE.Vector3();
          camera.getWorldDirection(cameraDir);

          // Store normalized camera direction for terrain shader
          const normalizedDir = cameraDir.clone();

          // Apply emission offset (still uses hand orientation for offset position)
          const emitOffset = new THREE.Vector3(
            lightControls.emitOffsetX,
            lightControls.emitOffsetY,
            lightControls.emitOffsetZ
          );
          emitOffset.applyQuaternion(worldQuat);

          // Calculate raw (unsmoothed) positions
          // Position comes from hand, but target direction comes from camera
          const rawLightPos = flashlightWorldPos.clone().add(emitOffset);
          const rawTargetPos = rawLightPos.clone().add(cameraDir.clone().multiplyScalar(lightControls.distance));

          // ========================================
          // RUST-STYLE VELOCITY-BASED SMOOTHING
          // More movement = more stabilization
          // ========================================

          // Calculate velocity (distance moved since last frame)
          const velocity = rawLightPos.distanceTo(prevLightPos.current);
          prevLightPos.current.copy(rawLightPos);

          // Velocity thresholds (tuned for running vs walking vs standing)
          const WALK_VELOCITY = 0.02;   // Below this = standing/slow walk
          const RUN_VELOCITY = 0.08;    // Above this = full run
          const MAX_VELOCITY_BOOST = 15; // Maximum extra smoothing when running

          // Calculate velocity-based smoothing boost
          // Maps velocity from [WALK, RUN] to [0, MAX_BOOST]
          const velocityRatio = Math.min(1, Math.max(0, (velocity - WALK_VELOCITY) / (RUN_VELOCITY - WALK_VELOCITY)));
          const targetVelocitySmoothing = velocityRatio * MAX_VELOCITY_BOOST;

          // Smooth the smoothing factor itself (prevents jarring transitions)
          velocitySmoothing.current += (targetVelocitySmoothing - velocitySmoothing.current) * 0.1;

          // Total smoothing = base + velocity boost
          const baseSmoothFactor = lightControls.smoothing;
          const totalSmoothing = baseSmoothFactor + velocitySmoothing.current;

          if (isFirstFrame.current || totalSmoothing <= 0) {
            // First frame or no smoothing - snap to position
            smoothedLightPos.current.copy(rawLightPos);
            smoothedTargetPos.current.copy(rawTargetPos);
            smoothedDirection.current.copy(normalizedDir);
            isFirstFrame.current = false;
          } else {
            // Exponential smoothing with velocity-adaptive factor
            const lerpFactor = 1 - Math.exp(-totalSmoothing * 0.016); // ~60fps
            smoothedLightPos.current.lerp(rawLightPos, lerpFactor);
            smoothedTargetPos.current.lerp(rawTargetPos, lerpFactor);

            // Also smooth the direction (critical for stable terrain lighting)
            smoothedDirection.current.lerp(normalizedDir, lerpFactor);
            smoothedDirection.current.normalize();
          }

          // Position spotlight using smoothed values
          spotlightRef.current.position.copy(smoothedLightPos.current);
          spotlightTargetRef.current.position.copy(smoothedTargetPos.current);

          // Update flashlight store with SMOOTHED direction for terrain shader
          if (isFlashlightOnRef.current) {
            useFlashlightStore.getState().updateWorldData(
              smoothedLightPos.current,
              smoothedDirection.current
            );
          }
        }
      }
      return;
    }

    // Already attached
    if (attachedEquipment.current) return;

    // Limit attempts to avoid spam
    if (attemptCount.current > 60) return;
    attemptCount.current++;

    // Wait for avatar
    if (!avatarRef.current) return;

    // Find the hand bone
    const handBone = findBone(avatarRef.current, RIGHT_HAND_BONE_NAMES);
    if (!handBone) {
      if (attemptCount.current === 1 && DEBUG_EQUIPMENT) {
        console.log('Searching for hand bone for equipment...');
      }
      return;
    }

    if (DEBUG_EQUIPMENT) console.log('Found hand bone for equipment:', handBone.name);

    // Create a container group
    const container = new THREE.Group();
    container.name = 'EquipmentContainer';

    // Clone the equipment scene
    const gltf = equipmentType === 'flashlight' ? flashlightGltf : null;
    if (!gltf) return;

    const equipmentClone = gltf.scene.clone(true);

    // Enable shadows
    equipmentClone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    // Apply initial transforms from Leva controls
    const controls = flashlightControlsRef.current;
    equipmentClone.position.set(controls.posX, controls.posY, controls.posZ);
    equipmentClone.rotation.set(
      controls.rotX * DEG_TO_RAD,
      controls.rotY * DEG_TO_RAD,
      controls.rotZ * DEG_TO_RAD
    );
    equipmentClone.scale.setScalar(controls.scale);

    // Store reference
    equipmentMeshRef.current = equipmentClone;

    // Add to container
    container.add(equipmentClone);

    // Attach to hand bone
    handBone.add(container);

    // Store references
    attachedEquipment.current = container;
    attachedToBone.current = handBone;

    // Create spotlight for flashlight
    if (equipmentType === 'flashlight') {
      const lightControls = flashlightLightRef.current;

      // Create spotlight
      const spotlight = new THREE.SpotLight(
        lightControls.color,
        lightControls.intensity,
        lightControls.distance,
        lightControls.angle * DEG_TO_RAD,
        lightControls.penumbra,
        2 // decay
      );
      spotlight.name = 'FlashlightSpotlight';
      spotlight.castShadow = true;
      spotlight.shadow.mapSize.width = 512;
      spotlight.shadow.mapSize.height = 512;
      spotlight.shadow.camera.near = 0.5;
      spotlight.shadow.camera.far = lightControls.distance;
      spotlight.shadow.bias = -0.001;
      spotlight.visible = isFlashlightOnRef.current;

      // Create target for spotlight direction
      const target = new THREE.Object3D();
      target.name = 'FlashlightTarget';
      spotlight.target = target;

      // Add to scene
      scene.add(spotlight);
      scene.add(target);

      // Store refs
      spotlightRef.current = spotlight;
      spotlightTargetRef.current = target;

      if (DEBUG_EQUIPMENT) console.log('Flashlight spotlight created');
    }

    if (DEBUG_EQUIPMENT) console.log('Equipment attached:', equipmentType);
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (attachedEquipment.current && attachedToBone.current) {
        attachedToBone.current.remove(attachedEquipment.current);

        attachedEquipment.current.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.geometry?.dispose();
            if (mesh.material) {
              const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
              materials.forEach((mat) => mat.dispose());
            }
          }
        });

        if (DEBUG_EQUIPMENT) console.log('Equipment cleanup on unmount');
      }

      // Clean up spotlight from scene
      if (spotlightRef.current) {
        scene.remove(spotlightRef.current);
        spotlightRef.current.dispose();
        spotlightRef.current = null;
      }
      if (spotlightTargetRef.current) {
        scene.remove(spotlightTargetRef.current);
        spotlightTargetRef.current = null;
      }

      attachedEquipment.current = null;
      attachedToBone.current = null;
      equipmentMeshRef.current = null;
    };
  }, [scene]);

  return null;
}

// Preload equipment models
useGLTF.preload(getModelPath(EQUIPMENT_MODEL_PATHS.flashlight));

export default EquipmentAttachment;
