/**
 * Projectile Pool Hook
 * Manages a pool of visual projectiles (tracers, bullet trails)
 * Can be extended for server-validated hit detection in multiplayer
 */

import { useRef, useCallback, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

export interface Projectile {
  id: number;
  active: boolean;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  startPosition: THREE.Vector3;
  maxDistance: number;
  speed: number;
  createdAt: number;
  mesh: THREE.Mesh | null;
}

interface UseProjectilePoolOptions {
  poolSize?: number;
  projectileSpeed?: number;
  maxDistance?: number;
  tracerColor?: string;
  tracerLength?: number;
}

export interface UseProjectilePoolResult {
  /** Spawn a projectile from origin in direction */
  spawn: (origin: THREE.Vector3, direction: THREE.Vector3) => void;
  /** Get count of active projectiles */
  activeCount: () => number;
  /** Clear all projectiles */
  clear: () => void;
}

export function useProjectilePool(options: UseProjectilePoolOptions = {}): UseProjectilePoolResult {
  const {
    poolSize = 20,
    projectileSpeed = 200, // m/s
    maxDistance = 100,
    tracerColor = '#ffff00',
    tracerLength = 2,
  } = options;

  const { scene } = useThree();

  // Create projectile pool
  const pool = useRef<Projectile[]>([]);
  const nextId = useRef(0);
  const containerRef = useRef<THREE.Group | null>(null);

  // Initialize pool lazily
  const initPool = useCallback(() => {
    if (pool.current.length > 0) return;

    // Create container for all projectiles
    const container = new THREE.Group();
    container.name = 'ProjectilePool';
    scene.add(container);
    containerRef.current = container;

    // Create tracer geometry (thin cylinder/line)
    const geometry = new THREE.CylinderGeometry(0.02, 0.02, tracerLength, 4);
    geometry.rotateX(Math.PI / 2); // Point along Z axis
    const material = new THREE.MeshBasicMaterial({
      color: tracerColor,
      transparent: true,
      opacity: 0.8,
    });

    // Pre-create projectile objects
    for (let i = 0; i < poolSize; i++) {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.visible = false;
      container.add(mesh);

      pool.current.push({
        id: i,
        active: false,
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        startPosition: new THREE.Vector3(),
        maxDistance,
        speed: projectileSpeed,
        createdAt: 0,
        mesh,
      });
    }
  }, [scene, poolSize, projectileSpeed, maxDistance, tracerColor, tracerLength]);

  // Spawn a projectile
  const spawn = useCallback((origin: THREE.Vector3, direction: THREE.Vector3) => {
    initPool();

    // Find inactive projectile
    const projectile = pool.current.find(p => !p.active);
    if (!projectile) return; // Pool exhausted

    projectile.active = true;
    projectile.position.copy(origin);
    projectile.startPosition.copy(origin);
    projectile.velocity.copy(direction).normalize().multiplyScalar(projectile.speed);
    projectile.createdAt = Date.now();
    projectile.id = nextId.current++;

    if (projectile.mesh) {
      projectile.mesh.visible = true;
      projectile.mesh.position.copy(origin);
      // Orient mesh along velocity
      projectile.mesh.lookAt(origin.clone().add(direction));
    }
  }, [initPool]);

  // Update projectiles each frame
  useFrame((_, delta) => {
    for (const projectile of pool.current) {
      if (!projectile.active) continue;

      // Move projectile
      projectile.position.addScaledVector(projectile.velocity, delta);

      // Update mesh
      if (projectile.mesh) {
        projectile.mesh.position.copy(projectile.position);
      }

      // Check if exceeded max distance
      const traveled = projectile.position.distanceTo(projectile.startPosition);
      if (traveled >= projectile.maxDistance) {
        projectile.active = false;
        if (projectile.mesh) {
          projectile.mesh.visible = false;
        }
      }
    }
  });

  // Get active count
  const activeCount = useCallback(() => {
    return pool.current.filter(p => p.active).length;
  }, []);

  // Clear all
  const clear = useCallback(() => {
    for (const projectile of pool.current) {
      projectile.active = false;
      if (projectile.mesh) {
        projectile.mesh.visible = false;
      }
    }
  }, []);

  return useMemo(() => ({
    spawn,
    activeCount,
    clear,
  }), [spawn, activeCount, clear]);
}

export default useProjectilePool;
