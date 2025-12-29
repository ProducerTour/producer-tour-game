/**
 * TreeBillboardMesh.tsx
 * Billboard instanced mesh for distant tree rendering
 *
 * Renders trees as camera-facing quads beyond a certain distance.
 * Supports crossfade transitions with full 3D meshes.
 */

import { useRef, useMemo, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  treeBillboardVertexShader,
  treeBillboardFragmentShader,
} from './treeBillboardShader';
import {
  BillboardLODSystem,
  TreeLODLevel,
  type BillboardLODConfig,
} from '../../../lib/visibility/BillboardLODSystem';

export interface TreeBillboardMeshProps {
  /** Tree positions in world space */
  positions: THREE.Vector3[];
  /** Billboard texture */
  texture: THREE.Texture;
  /** Billboard width */
  width?: number;
  /** Billboard height */
  height?: number;
  /** LOD configuration */
  lodConfig?: Partial<BillboardLODConfig>;
  /** Enable the billboard system */
  enabled?: boolean;
  /** Wind strength */
  windStrength?: number;
  /** Wind speed */
  windSpeed?: number;
  /** Tint color */
  tintColor?: THREE.Color;
  /** Fog settings */
  fog?: {
    near: number;
    far: number;
    color: THREE.Color;
  };
  /** Called when LOD stats change */
  onLODChange?: (stats: {
    full3D: number;
    crossfade: number;
    billboard: number;
    culled: number;
  }) => void;
}

/**
 * TreeBillboardMesh renders distant trees as camera-facing billboards
 */
export function TreeBillboardMesh({
  positions,
  texture,
  width = 4,
  height = 8,
  lodConfig,
  enabled = true,
  windStrength = 0.5,
  windSpeed = 1.5,
  tintColor,
  fog,
  onLODChange,
}: TreeBillboardMeshProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const { camera } = useThree();

  // Create LOD system
  const lodSystem = useMemo(
    () => new BillboardLODSystem(lodConfig),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // Create geometry (simple plane)
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(width, height);
    // Move pivot to bottom center
    geo.translate(0, height / 2, 0);
    return geo;
  }, [width, height]);

  // Create shader material
  const material = useMemo(() => {
    const mat = new THREE.ShaderMaterial({
      vertexShader: treeBillboardVertexShader,
      fragmentShader: treeBillboardFragmentShader,
      uniforms: {
        uBillboardTexture: { value: texture },
        uTime: { value: 0 },
        uWindStrength: { value: windStrength },
        uWindSpeed: { value: windSpeed },
        uCameraPosition: { value: new THREE.Vector3() },
        uAlphaTest: { value: 0.5 },
        uTintColor: { value: tintColor?.toArray() ?? [1, 1, 1] },
        uFogNear: { value: fog?.near ?? 200 },
        uFogFar: { value: fog?.far ?? 500 },
        uFogColor: { value: fog?.color?.toArray() ?? [0.7, 0.8, 0.9] },
      },
      transparent: true,
      depthWrite: true,
      side: THREE.DoubleSide,
    });
    return mat;
  }, [texture, windStrength, windSpeed, tintColor, fog]);

  // Create instance attributes
  const instanceAttributes = useMemo(() => {
    const count = positions.length;

    return {
      instancePosition: new THREE.InstancedBufferAttribute(
        new Float32Array(count * 3),
        3
      ),
      instanceScale: new THREE.InstancedBufferAttribute(
        new Float32Array(count),
        1
      ),
      instanceRotation: new THREE.InstancedBufferAttribute(
        new Float32Array(count),
        1
      ),
      instanceCrossfade: new THREE.InstancedBufferAttribute(
        new Float32Array(count),
        1
      ),
    };
  }, [positions.length]);

  // Register positions with LOD system and set initial attributes
  useEffect(() => {
    lodSystem.registerTrees(positions);

    // Initialize instance attributes
    for (let i = 0; i < positions.length; i++) {
      const pos = positions[i];
      instanceAttributes.instancePosition.setXYZ(i, pos.x, pos.y, pos.z);
      instanceAttributes.instanceScale.setX(i, 1.0);
      instanceAttributes.instanceRotation.setX(i, Math.random() * Math.PI * 2);
      instanceAttributes.instanceCrossfade.setX(i, 0.0); // Start invisible
    }

    instanceAttributes.instancePosition.needsUpdate = true;
    instanceAttributes.instanceScale.needsUpdate = true;
    instanceAttributes.instanceRotation.needsUpdate = true;
    instanceAttributes.instanceCrossfade.needsUpdate = true;
  }, [positions, lodSystem, instanceAttributes]);

  // Attach attributes to geometry
  useEffect(() => {
    if (!geometry) return;

    geometry.setAttribute('instancePosition', instanceAttributes.instancePosition);
    geometry.setAttribute('instanceScale', instanceAttributes.instanceScale);
    geometry.setAttribute('instanceRotation', instanceAttributes.instanceRotation);
    geometry.setAttribute('instanceCrossfade', instanceAttributes.instanceCrossfade);
  }, [geometry, instanceAttributes]);

  // Update LOD config
  useEffect(() => {
    if (lodConfig) {
      lodSystem.setConfig(lodConfig);
    }
  }, [lodConfig, lodSystem]);

  // Update uniforms
  useEffect(() => {
    material.uniforms.uWindStrength.value = windStrength;
    material.uniforms.uWindSpeed.value = windSpeed;
    if (tintColor) {
      material.uniforms.uTintColor.value = tintColor.toArray();
    }
    if (fog) {
      material.uniforms.uFogNear.value = fog.near;
      material.uniforms.uFogFar.value = fog.far;
      material.uniforms.uFogColor.value = fog.color.toArray();
    }
  }, [material, windStrength, windSpeed, tintColor, fog]);

  // Update each frame
  useFrame((state) => {
    if (!enabled || !meshRef.current) return;

    // Update time
    material.uniforms.uTime.value = state.clock.elapsedTime;

    // Update camera position
    camera.getWorldPosition(material.uniforms.uCameraPosition.value);

    // Calculate LOD levels
    const lodResult = lodSystem.calculateLOD(camera);

    // Update crossfade attributes for all instances
    // Billboard instances: crossfade = 1 (fully visible)
    // Crossfade instances: crossfade = alpha value
    // Full3D and Culled: crossfade = 0 (invisible as billboard)

    for (let i = 0; i < positions.length; i++) {
      const lodLevel = lodSystem.getLODLevel(i);
      let crossfade = 0;

      if (lodLevel === TreeLODLevel.Billboard) {
        crossfade = 1;
      } else if (lodLevel === TreeLODLevel.Crossfade) {
        crossfade = lodSystem.getCrossfadeAlpha(i);
      }

      instanceAttributes.instanceCrossfade.setX(i, crossfade);
    }
    instanceAttributes.instanceCrossfade.needsUpdate = true;

    // Set instance count to visible billboards + crossfade
    // (Full3D instances are handled by the 3D mesh, not billboard)
    meshRef.current.count =
      lodResult.billboardIndices.length + lodResult.crossfadeIndices.length;

    // Notify LOD change callback
    if (onLODChange) {
      const counts = lodSystem.getLODCounts();
      onLODChange({
        full3D: counts[TreeLODLevel.Full3D],
        crossfade: counts[TreeLODLevel.Crossfade],
        billboard: counts[TreeLODLevel.Billboard],
        culled: counts[TreeLODLevel.Culled],
      });
    }
  });

  // Cleanup
  useEffect(() => {
    return () => {
      lodSystem.dispose();
      geometry.dispose();
      material.dispose();
    };
  }, [lodSystem, geometry, material]);

  if (!enabled || positions.length === 0) {
    return null;
  }

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, positions.length]}
      frustumCulled={false}
    />
  );
}

export default TreeBillboardMesh;
