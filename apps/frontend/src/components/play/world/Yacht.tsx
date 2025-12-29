/**
 * Yacht.tsx
 * Motoryacht floating in the ocean with gentle bobbing animation
 * Includes trimesh collider for player to stand on
 * Features dedicated shadow light for high-quality local shadows
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { RigidBody, MeshCollider } from '@react-three/rapier';
import type { RapierRigidBody } from '@react-three/rapier';
import * as THREE from 'three';
import { getModelPath } from '../../../config/assetPaths';

// Shadow light configuration for high-quality yacht shadows
const YACHT_SHADOW_CONFIG = {
  mapSize: 2048,        // High-res shadow map just for yacht
  frustumSize: 25,      // Small frustum = high texel density
  bias: -0.0005,
  normalBias: 0.02,
  near: 1,
  far: 100,
};

const YACHT_MODEL_PATH = getModelPath('Vehicles/Boats/motoryacht/motoryacht_optimized.glb');

export interface YachtProps {
  /** World position [x, y, z] - y is water level (default 0) */
  position?: [number, number, number];
  /** Rotation in radians around Y axis */
  rotation?: number;
  /** Scale multiplier */
  scale?: number;
  /** Enable floating animation */
  animate?: boolean;
  /** Bob amplitude in meters */
  bobAmplitude?: number;
  /** Bob speed (cycles per second) */
  bobSpeed?: number;
  /** Roll amplitude in radians */
  rollAmplitude?: number;
}

export function Yacht({
  position = [288, 0, 160], // K9 grid cell by default
  rotation = Math.PI / 4,   // Angled view
  scale = 1,
  animate = true,
  bobAmplitude = 0.15,
  bobSpeed = 0.3,
  rollAmplitude = 0.02,
}: YachtProps) {
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  const shadowLightRef = useRef<THREE.DirectionalLight>(null);
  const timeRef = useRef(0);

  // Quaternion for kinematic rotation updates
  const quaternion = useMemo(() => new THREE.Quaternion(), []);
  const euler = useMemo(() => new THREE.Euler(), []);

  // Shadow light offset from yacht center (sun direction)
  const shadowLightOffset = useMemo(() => new THREE.Vector3(30, 40, 20), []);

  // Light target object (memoized to prevent recreation)
  const lightTarget = useMemo(() => {
    const target = new THREE.Object3D();
    target.position.set(position[0], position[1], position[2]);
    return target;
  }, [position]);

  // Load the optimized yacht model
  const { scene } = useGLTF(YACHT_MODEL_PATH);

  // Clone the scene to allow multiple instances
  const clonedScene = useMemo(() => {
    const clone = scene.clone();
    // Enable shadows on all meshes
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return clone;
  }, [scene]);

  // Floating animation - updates kinematic rigid body and shadow light
  useFrame((_, delta) => {
    if (!rigidBodyRef.current || !animate) return;

    timeRef.current += delta;
    const t = timeRef.current;

    // Gentle vertical bob
    const bob = Math.sin(t * bobSpeed * Math.PI * 2) * bobAmplitude;

    // Subtle roll (side to side tilt)
    const roll = Math.sin(t * bobSpeed * Math.PI * 2 * 0.7) * rollAmplitude;

    // Very subtle pitch (front to back)
    const pitch = Math.sin(t * bobSpeed * Math.PI * 2 * 0.5 + 1) * rollAmplitude * 0.5;

    // Update kinematic body position
    rigidBodyRef.current.setNextKinematicTranslation({
      x: position[0],
      y: position[1] + bob,
      z: position[2],
    });

    // Update kinematic body rotation (combine base rotation with animation)
    euler.set(pitch, rotation, roll);
    quaternion.setFromEuler(euler);
    rigidBodyRef.current.setNextKinematicRotation({
      x: quaternion.x,
      y: quaternion.y,
      z: quaternion.z,
      w: quaternion.w,
    });

    // Update shadow light to follow yacht bob
    if (shadowLightRef.current) {
      shadowLightRef.current.position.set(
        position[0] + shadowLightOffset.x,
        position[1] + bob + shadowLightOffset.y,
        position[2] + shadowLightOffset.z
      );
      // Update light target position
      lightTarget.position.set(
        position[0],
        position[1] + bob,
        position[2]
      );
      lightTarget.updateMatrixWorld();
    }
  });

  return (
    <>
      {/* Dedicated shadow light for high-quality yacht shadows */}
      <directionalLight
        ref={shadowLightRef}
        target={lightTarget}
        position={[
          position[0] + shadowLightOffset.x,
          position[1] + shadowLightOffset.y,
          position[2] + shadowLightOffset.z,
        ]}
        intensity={0.8}
        color="#ffffff"
        castShadow
        shadow-mapSize={[YACHT_SHADOW_CONFIG.mapSize, YACHT_SHADOW_CONFIG.mapSize]}
        shadow-camera-left={-YACHT_SHADOW_CONFIG.frustumSize}
        shadow-camera-right={YACHT_SHADOW_CONFIG.frustumSize}
        shadow-camera-top={YACHT_SHADOW_CONFIG.frustumSize}
        shadow-camera-bottom={-YACHT_SHADOW_CONFIG.frustumSize}
        shadow-camera-near={YACHT_SHADOW_CONFIG.near}
        shadow-camera-far={YACHT_SHADOW_CONFIG.far}
        shadow-bias={YACHT_SHADOW_CONFIG.bias}
        shadow-normalBias={YACHT_SHADOW_CONFIG.normalBias}
      />
      {/* Light target must be in scene graph */}
      <primitive object={lightTarget} />

      <RigidBody
        ref={rigidBodyRef}
        type="kinematicPosition"
        position={[position[0], position[1], position[2]]}
        rotation={[0, rotation, 0]}
        colliders={false}
      >
        <group scale={scale}>
          <MeshCollider type="hull">
            <primitive object={clonedScene} />
          </MeshCollider>
        </group>
      </RigidBody>
    </>
  );
}

// Preload the model
useGLTF.preload(YACHT_MODEL_PATH);

export default Yacht;
