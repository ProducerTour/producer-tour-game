/**
 * FlashlightSpotlight - Renders a spotlight attached to the camera
 * Reads state from useFlashlightStore and follows the camera's position/direction
 */

import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useFlashlightStore } from '../../../stores/useFlashlightStore';

// Default flashlight settings
const DEFAULT_CONFIG = {
  color: '#fffae6',
  intensity: 2.0,
  distance: 30,
  angle: Math.PI / 6,
  penumbra: 0.3,
};

export function FlashlightSpotlight() {
  const { camera } = useThree();
  const spotlightRef = useRef<THREE.SpotLight>(null);
  const targetRef = useRef<THREE.Object3D>(null);

  // Get flashlight state
  const isOn = useFlashlightStore((s) => s.isOn);
  const lightConfig = useFlashlightStore((s) => s.lightConfig);

  // Use config from store or defaults
  const config = lightConfig ?? DEFAULT_CONFIG;

  // Update spotlight position/rotation every frame
  useFrame(() => {
    if (!spotlightRef.current || !targetRef.current) return;

    // Position spotlight slightly in front and below camera (handheld position)
    const cameraDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraDirection);

    // Offset the light source to simulate holding the flashlight
    // Slightly below camera center and to the right (like holding in right hand)
    const rightVector = new THREE.Vector3();
    rightVector.crossVectors(camera.up, cameraDirection).normalize();

    const handOffset = rightVector.clone().multiplyScalar(0.15); // Slight right offset
    handOffset.y -= 0.1; // Slightly below eye level

    spotlightRef.current.position.copy(camera.position).add(handOffset);

    // Point the spotlight in the camera's look direction
    // Target is 30 meters ahead of camera
    targetRef.current.position
      .copy(camera.position)
      .add(cameraDirection.multiplyScalar(30));

    // Update spotlight target
    spotlightRef.current.target = targetRef.current;
  });

  // Don't render if flashlight is off or no config
  if (!isOn || !lightConfig) {
    return null;
  }

  return (
    <>
      <spotLight
        ref={spotlightRef}
        color={config.color}
        intensity={config.intensity}
        distance={config.distance}
        angle={config.angle}
        penumbra={config.penumbra}
        decay={2}
        castShadow
        shadow-mapSize-width={512}
        shadow-mapSize-height={512}
        shadow-camera-near={0.5}
        shadow-camera-far={config.distance}
        shadow-bias={-0.001}
      />
      <object3D ref={targetRef} />
    </>
  );
}

export default FlashlightSpotlight;
