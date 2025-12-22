/**
 * Campfire.tsx
 * Interactive campfire with lit/unlit state, fire effects, and point light
 * Press E to toggle when near the campfire
 */

import { useRef, useState, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGLTF, Html } from '@react-three/drei';
import { RigidBody, CylinderCollider } from '@react-three/rapier';
import type { GLTF } from 'three-stdlib';
import { getModelPath } from '../../../config/assetPaths';

const CAMPFIRE_MODEL_PATH = getModelPath('Campfire/campfire.glb');

const DEBUG_CAMPFIRE = false;

export interface CampfireProps {
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  /** Scale multiplier for fire effect */
  fireScale?: number;
  /** Light intensity multiplier */
  lightIntensity?: number;
  /** Light distance */
  lightDistance?: number;
  /** Initial lit state */
  initiallyLit?: boolean;
  /** Interaction range for E key */
  interactionRange?: number;
  /** Current player position for interaction check */
  playerPosition?: THREE.Vector3;
  /** Callback when campfire state changes */
  onToggle?: (isLit: boolean) => void;
}

type GLTFResult = GLTF & {
  nodes: Record<string, THREE.Mesh | THREE.Object3D>;
  materials: Record<string, THREE.Material>;
  scene: THREE.Group;
};

// Fire animation settings
const FIRE_FLICKER_SPEED = 8;
const FIRE_INTENSITY_BASE = 2.5;
const FIRE_INTENSITY_VARIANCE = 0.8;
const LIGHT_INTENSITY_BASE = 15;
const LIGHT_INTENSITY_VARIANCE = 5;
const FIRE_COLOR = new THREE.Color(0xff6600);
const EMBER_COLOR = new THREE.Color(0xff2200);

export function Campfire({
  position,
  rotation = [0, 0, 0],
  scale = 1,
  fireScale = 1,
  lightIntensity = 1,
  lightDistance = 12,
  initiallyLit = true,
  interactionRange = 3,
  playerPosition,
  onToggle,
}: CampfireProps) {
  const groupRef = useRef<THREE.Group>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const firePartsRef = useRef<THREE.Mesh[]>([]);

  const [isLit, setIsLit] = useState(initiallyLit);
  const [isPlayerNear, setIsPlayerNear] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  const gltf = useGLTF(CAMPFIRE_MODEL_PATH) as GLTFResult;

  // Clone and configure the model
  const { baseObjects, fireObjects } = useMemo(() => {
    const base: THREE.Mesh[] = [];
    const fire: THREE.Mesh[] = [];

    gltf.scene.traverse((node) => {
      if ((node as THREE.Mesh).isMesh) {
        const mesh = node as THREE.Mesh;
        const clone = mesh.clone();

        // Configure materials
        if (Array.isArray(clone.material)) {
          clone.material = clone.material.map((m) => m.clone());
        } else {
          clone.material = clone.material.clone();
        }

        // Categorize fire parts vs base campfire
        if (node.name.startsWith('fire_part')) {
          // Fire parts - make emissive and transparent
          const materials = Array.isArray(clone.material)
            ? clone.material
            : [clone.material];

          materials.forEach((mat) => {
            const m = mat as THREE.MeshStandardMaterial;
            m.transparent = true;
            m.alphaTest = 0.1;
            m.side = THREE.DoubleSide;
            m.depthWrite = false;
            m.emissive = FIRE_COLOR;
            m.emissiveIntensity = FIRE_INTENSITY_BASE;
          });

          fire.push(clone);
        } else {
          // Base campfire mesh (logs, rocks)
          clone.castShadow = true;
          clone.receiveShadow = true;
          base.push(clone);
        }
      }
    });

    if (DEBUG_CAMPFIRE) {
      console.log(`🔥 Campfire loaded: ${base.length} base objects, ${fire.length} fire parts`);
    }

    return { baseObjects: base, fireObjects: fire };
  }, [gltf.scene]);

  // Store fire parts and their materials in refs for animation
  // Caching materials avoids repeated array access in useFrame
  const fireMaterialsRef = useRef<THREE.MeshStandardMaterial[][]>([]);

  useEffect(() => {
    firePartsRef.current = fireObjects;
    // Cache materials array once to avoid per-frame array creation
    fireMaterialsRef.current = fireObjects.map((firePart) => {
      return Array.isArray(firePart.material)
        ? (firePart.material as THREE.MeshStandardMaterial[])
        : [firePart.material as THREE.MeshStandardMaterial];
    });
  }, [fireObjects]);

  // Pre-allocated color for lerp (avoid GC)
  const flickerColor = useRef(new THREE.Color());

  // Check player distance for interaction
  useEffect(() => {
    if (!playerPosition || !groupRef.current) {
      setIsPlayerNear(false);
      return;
    }

    const campfirePos = new THREE.Vector3(...position);
    const distance = playerPosition.distanceTo(campfirePos);
    const near = distance <= interactionRange;

    setIsPlayerNear(near);
    setShowPrompt(near);
  }, [playerPosition, position, interactionRange]);

  // Handle E key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'KeyE' && isPlayerNear) {
        e.preventDefault();
        setIsLit((prev) => {
          const newState = !prev;
          onToggle?.(newState);
          if (DEBUG_CAMPFIRE) {
            console.log(`🔥 Campfire ${newState ? 'lit' : 'extinguished'}`);
          }
          return newState;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlayerNear, onToggle]);

  // Animate fire flickering and light
  // OPTIMIZED: Uses cached materials, pre-allocated color, reduced sin calls
  useFrame((state) => {
    const time = state.clock.elapsedTime;

    // Pre-compute shared flicker values (reduced from 3 sin calls per part to 3 total)
    const t = time * FIRE_FLICKER_SPEED;
    const baseFlicker1 = Math.sin(t);
    const baseFlicker2 = Math.sin(t * 1.7);
    const baseFlicker3 = Math.sin(t * 0.5);

    // Animate fire parts using cached materials
    const fireParts = firePartsRef.current;
    const fireMaterials = fireMaterialsRef.current;

    for (let i = 0; i < fireParts.length; i++) {
      const firePart = fireParts[i];
      firePart.visible = isLit;

      if (isLit) {
        // Flicker effect - each part has offset phase
        // Use pre-computed base values with phase offset approximation
        const phase = i * 0.3;
        const flicker =
          baseFlicker1 * Math.cos(phase) * 0.3 +
          baseFlicker2 * Math.cos(phase) * 0.2 +
          baseFlicker3 * Math.cos(phase) * 0.5;

        // Use cached materials array
        const materials = fireMaterials[i];
        const emissiveIntensity = FIRE_INTENSITY_BASE + flicker * FIRE_INTENSITY_VARIANCE;
        const colorT = 0.5 + flicker * 0.5;

        // Pre-compute lerped color once per part (not per material)
        flickerColor.current.lerpColors(EMBER_COLOR, FIRE_COLOR, colorT);

        for (let j = 0; j < materials.length; j++) {
          const mat = materials[j];
          if (mat.emissive) {
            mat.emissiveIntensity = emissiveIntensity;
            mat.emissive.copy(flickerColor.current);
          }
        }

        // Subtle scale animation for flame movement
        firePart.scale.setScalar(1 + flicker * 0.05);

        // Subtle rotation - simplified calculation
        firePart.rotation.y += 0.003;
      }
    }

    // Animate point light
    if (lightRef.current) {
      lightRef.current.visible = isLit;

      if (isLit) {
        // Use pre-computed base flickers
        const lightFlicker = baseFlicker1 * 0.4 + baseFlicker2 * 0.3 + baseFlicker3 * 0.3;

        lightRef.current.intensity =
          (LIGHT_INTENSITY_BASE + lightFlicker * LIGHT_INTENSITY_VARIANCE) * lightIntensity;

        // Subtle position jitter scaled by fireScale
        lightRef.current.position.x = baseFlicker1 * 0.05 * fireScale;
        lightRef.current.position.z = baseFlicker3 * 0.05 * fireScale;
      }
    }
  });

  // Collider size scales with the campfire
  const colliderRadius = 0.6 * scale;
  const colliderHeight = 0.4 * scale;

  return (
    <RigidBody
      type="fixed"
      position={position}
      colliders={false}
    >
      {/* Cylinder collider for the campfire base - player can't walk through */}
      <CylinderCollider args={[colliderHeight / 2, colliderRadius]} position={[0, colliderHeight / 2, 0]} />

      <group
        ref={groupRef}
        rotation={rotation}
        scale={scale}
      >
        {/* Base campfire (logs, rocks) - always visible */}
        {baseObjects.map((obj, i) => (
          <primitive key={`base-${i}`} object={obj} />
        ))}

        {/* Fire parts - visible when lit, scaled by fireScale */}
        <group scale={fireScale}>
          {fireObjects.map((obj, i) => (
            <primitive key={`fire-${i}`} object={obj} />
          ))}
        </group>

        {/* Point light for fire glow */}
        <pointLight
          ref={lightRef}
          position={[0, 0.5 * fireScale, 0]}
          color={0xff6633}
          intensity={isLit ? LIGHT_INTENSITY_BASE * lightIntensity : 0}
          distance={lightDistance}
          decay={2}
          castShadow={false}
        />

        {/* Ambient ember glow (always visible, dimmer when unlit) */}
        <pointLight
          position={[0, 0.2 * fireScale, 0]}
          color={0xff3300}
          intensity={isLit ? 3 * lightIntensity : 0.5}
          distance={lightDistance * 0.4}
          decay={2}
        />

        {/* Interaction prompt */}
        {showPrompt && (
          <Html
            position={[0, 1.5, 0]}
            center
            style={{
              pointerEvents: 'none',
              userSelect: 'none',
            }}
          >
            <div
              style={{
                background: 'rgba(0, 0, 0, 0.75)',
                color: 'white',
                padding: '6px 12px',
                borderRadius: '4px',
                fontSize: '14px',
                fontFamily: 'system-ui, sans-serif',
                whiteSpace: 'nowrap',
                border: '1px solid rgba(255, 255, 255, 0.2)',
              }}
            >
              Press <strong style={{ color: '#ffcc00' }}>E</strong> to{' '}
              {isLit ? 'extinguish' : 'light'} campfire
            </div>
          </Html>
        )}
      </group>
    </RigidBody>
  );
}

// Preload the model
Campfire.preload = () => {
  useGLTF.preload(CAMPFIRE_MODEL_PATH);
};

export default Campfire;
