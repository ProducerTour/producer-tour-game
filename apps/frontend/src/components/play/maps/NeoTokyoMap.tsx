import { useMemo, useRef } from 'react';
import { useFBX } from '@react-three/drei';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import * as THREE from 'three';
import { ASSETS_URL } from '../types';

// Use local path in dev, R2 in production
const NEOTOKYO_FBX_URL = import.meta.env.DEV
  ? '/models/neotokyo/kb3d_neocity-native.fbx'
  : `${ASSETS_URL}/models/neotokyo/kb3d_neocity-native.fbx`;

// Procedural material colors for NeoTokyo (no textures)
// Based on KitBash3D material naming conventions
const MATERIAL_COLORS: Record<string, {
  color: string;
  metalness?: number;
  roughness?: number;
  emissive?: string;
  emissiveIntensity?: number;
  transparent?: boolean;
  opacity?: number;
}> = {
  // Metals
  'brass': { color: '#b8860b', metalness: 0.9, roughness: 0.2 },
  'chrome': { color: '#c0c0c0', metalness: 0.95, roughness: 0.1 },
  'metal': { color: '#71717a', metalness: 0.8, roughness: 0.3 },
  'steel': { color: '#64748b', metalness: 0.85, roughness: 0.25 },
  'copper': { color: '#b87333', metalness: 0.9, roughness: 0.2 },
  'aluminum': { color: '#a8a9ad', metalness: 0.7, roughness: 0.4 },

  // Glass/Transparent
  'glass': { color: '#60a5fa', metalness: 0, roughness: 0.1, transparent: true, opacity: 0.4 },
  'window': { color: '#38bdf8', metalness: 0, roughness: 0.05, transparent: true, opacity: 0.5 },

  // Neon/Emissive - Cyberpunk colors
  'neon': { color: '#a855f7', emissive: '#a855f7', emissiveIntensity: 1.0 },
  'neonsign': { color: '#ec4899', emissive: '#ec4899', emissiveIntensity: 0.8 },
  'neonpink': { color: '#ec4899', emissive: '#ec4899', emissiveIntensity: 1.0 },
  'neonblue': { color: '#3b82f6', emissive: '#3b82f6', emissiveIntensity: 1.0 },
  'neongreen': { color: '#22c55e', emissive: '#22c55e', emissiveIntensity: 1.0 },
  'neonorange': { color: '#f97316', emissive: '#f97316', emissiveIntensity: 1.0 },
  'neonpurple': { color: '#8b5cf6', emissive: '#8b5cf6', emissiveIntensity: 1.0 },
  'neonred': { color: '#ef4444', emissive: '#ef4444', emissiveIntensity: 1.0 },
  'light': { color: '#fef3c7', emissive: '#fbbf24', emissiveIntensity: 0.6 },
  'led': { color: '#60a5fa', emissive: '#60a5fa', emissiveIntensity: 0.8 },
  'hologram': { color: '#06b6d4', emissive: '#06b6d4', emissiveIntensity: 0.5, transparent: true, opacity: 0.7 },

  // Building surfaces
  'concrete': { color: '#374151', metalness: 0, roughness: 0.95 },
  'asphalt': { color: '#1f2937', metalness: 0, roughness: 0.98 },
  'brick': { color: '#7c2d12', metalness: 0, roughness: 0.9 },
  'plaster': { color: '#4b5563', metalness: 0, roughness: 0.85 },
  'stucco': { color: '#6b7280', metalness: 0, roughness: 0.9 },
  'tile': { color: '#334155', metalness: 0.1, roughness: 0.7 },
  'roof': { color: '#1e293b', metalness: 0.2, roughness: 0.8 },

  // Plastics
  'plastic': { color: '#475569', metalness: 0, roughness: 0.5 },
  'rubber': { color: '#1e1e1e', metalness: 0, roughness: 0.9 },
  'vinyl': { color: '#334155', metalness: 0, roughness: 0.6 },

  // Wood
  'wood': { color: '#78350f', metalness: 0, roughness: 0.8 },
  'plywood': { color: '#a16207', metalness: 0, roughness: 0.85 },

  // Fabric/Cloth
  'fabric': { color: '#374151', metalness: 0, roughness: 0.95 },
  'canvas': { color: '#4b5563', metalness: 0, roughness: 0.9 },
  'tarp': { color: '#1e40af', metalness: 0, roughness: 0.8 },

  // Tech/Screens
  'screen': { color: '#1e1b4b', emissive: '#3b82f6', emissiveIntensity: 0.3 },
  'monitor': { color: '#0f172a', emissive: '#22d3ee', emissiveIntensity: 0.2 },
  'panel': { color: '#1e293b', metalness: 0.3, roughness: 0.6 },

  // Environment
  'dirt': { color: '#44403c', metalness: 0, roughness: 1.0 },
  'gravel': { color: '#57534e', metalness: 0, roughness: 1.0 },
  'water': { color: '#0c4a6e', metalness: 0.1, roughness: 0.2, transparent: true, opacity: 0.8 },

  // Special
  'aircon': { color: '#9ca3af', metalness: 0.6, roughness: 0.5 },
  'pipe': { color: '#71717a', metalness: 0.7, roughness: 0.4 },
  'vent': { color: '#52525b', metalness: 0.5, roughness: 0.6 },
  'antenna': { color: '#a1a1aa', metalness: 0.8, roughness: 0.3 },
  'cable': { color: '#27272a', metalness: 0.2, roughness: 0.7 },
  'sign': { color: '#f5f5f4', metalness: 0.1, roughness: 0.6 },
};

// Get material config from material name
function getMaterialConfig(materialName: string) {
  const name = materialName.toLowerCase();

  // Check for exact or partial matches
  for (const [key, config] of Object.entries(MATERIAL_COLORS)) {
    if (name.includes(key)) {
      return config;
    }
  }

  // Default fallback - gray concrete
  return { color: '#6b7280', metalness: 0.1, roughness: 0.7 };
}

export interface NeoTokyoMapProps {
  /** Scale factor for the model (default: 0.01) */
  scale?: number;
  /** Position offset */
  position?: [number, number, number];
  /** Enable building colliders using trimesh (more accurate but heavier) */
  enableBuildingColliders?: boolean;
  /** Use simplified hull colliders instead of trimesh (faster but less accurate) */
  useHullColliders?: boolean;
}

/**
 * NeoTokyoMap - KitBash3D NeoCity FBX model with procedural materials
 *
 * Since no textures are included, we apply cyberpunk-styled materials
 * based on the material names in the model.
 */
export function NeoTokyoMap({
  scale = 0.01,
  position = [0, 0, 0],
  enableBuildingColliders = false,
  useHullColliders = false,
}: NeoTokyoMapProps) {
  const processedRef = useRef(false);

  // Load the FBX model (local in dev, R2 in production)
  const fbx = useFBX(NEOTOKYO_FBX_URL);

  // Process model and apply procedural materials
  const model = useMemo(() => {
    const clone = fbx.clone();

    // Log material names on first load for debugging
    if (!processedRef.current) {
      console.log('🏙️ NeoTokyo - Processing materials...');
      const materialNames = new Set<string>();

      clone.traverse((child: THREE.Object3D) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          materials.forEach((mat) => {
            if (mat && (mat as THREE.Material).name) {
              materialNames.add((mat as THREE.Material).name);
            }
          });
        }
      });

      console.log('🏙️ Found materials:', Array.from(materialNames).join(', '));
      processedRef.current = true;
    }

    // Apply procedural materials to all meshes
    clone.traverse((child: THREE.Object3D) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

        materials.forEach((mat, idx) => {
          const matName = (mat as THREE.Material)?.name || 'unknown';
          const config = getMaterialConfig(matName);

          const newMat = new THREE.MeshStandardMaterial({
            color: config.color,
            metalness: config.metalness ?? 0.1,
            roughness: config.roughness ?? 0.7,
            emissive: config.emissive ?? '#000000',
            emissiveIntensity: config.emissiveIntensity ?? 0,
            transparent: config.transparent ?? false,
            opacity: config.opacity ?? 1,
            side: THREE.FrontSide,
          });

          if (Array.isArray(mesh.material)) {
            mesh.material[idx] = newMat;
          } else {
            mesh.material = newMat;
          }
        });
      }
    });

    return clone;
  }, [fbx]);

  // Determine collider type based on props
  // trimesh = accurate mesh collision (heavy), hull = convex hull (faster), false = ground only
  const colliderType = enableBuildingColliders
    ? (useHullColliders ? 'hull' : 'trimesh')
    : false;

  return (
    <RigidBody type="fixed" colliders={colliderType} position={position}>
      {/* City model */}
      <primitive object={model} scale={scale} />

      {/* Ground plane collider - always present as fallback */}
      <CuboidCollider args={[200, 0.1, 200]} position={[0, -0.1, 0]} />
    </RigidBody>
  );
}
