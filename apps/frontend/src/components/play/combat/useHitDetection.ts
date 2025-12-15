/**
 * Hit Detection Hook
 * Raycasting-based hit detection for weapons
 */

import { useCallback, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useCombatStore, WEAPON_CONFIG } from './useCombatStore';

export interface HitResult {
  hit: boolean;
  target?: {
    id: string;
    object: THREE.Object3D;
    point: THREE.Vector3;
    distance: number;
  };
  isCritical: boolean;
  damage: number;
}

interface UseHitDetectionOptions {
  // Objects to ignore (player, etc.)
  ignoreObjects?: THREE.Object3D[];
  // Layer mask for raycasting
  layers?: number;
  // Debug mode - shows raycasts
  debug?: boolean;
}

export function useHitDetection(options: UseHitDetectionOptions = {}) {
  const { scene, camera } = useThree();
  const { currentWeapon, fire, damageTarget, targets } = useCombatStore();

  const raycaster = useRef(new THREE.Raycaster());
  const debugLines = useRef<THREE.Line[]>([]);

  // Get weapon config
  const getWeaponConfig = useCallback(() => {
    if (currentWeapon === 'none') return null;
    return WEAPON_CONFIG[currentWeapon];
  }, [currentWeapon]);

  // Calculate spread
  const applySpread = useCallback((direction: THREE.Vector3, spread: number): THREE.Vector3 => {
    const spreadX = (Math.random() - 0.5) * spread * 2;
    const spreadY = (Math.random() - 0.5) * spread * 2;

    // Create quaternion for spread rotation
    const euler = new THREE.Euler(spreadY, spreadX, 0);
    const quaternion = new THREE.Quaternion().setFromEuler(euler);

    return direction.clone().applyQuaternion(quaternion).normalize();
  }, []);

  // Check if hit is critical
  const checkCritical = useCallback((hitPoint: THREE.Vector3, targetObject: THREE.Object3D, critChance: number): boolean => {
    // Base crit chance
    if (Math.random() > critChance) return false;

    // Bonus crit chance for headshots (hitting upper 20% of target)
    const box = new THREE.Box3().setFromObject(targetObject);
    const height = box.max.y - box.min.y;
    const headThreshold = box.max.y - height * 0.2;

    return hitPoint.y >= headThreshold;
  }, []);

  // Perform raycast from camera center
  const fireWeapon = useCallback((): HitResult => {
    const config = getWeaponConfig();
    if (!config) {
      return { hit: false, isCritical: false, damage: 0 };
    }

    // Try to fire (checks ammo, fire rate)
    if (!fire()) {
      return { hit: false, isCritical: false, damage: 0 };
    }

    // Get camera direction
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);

    // Apply weapon spread
    const spreadDirection = applySpread(direction, config.spread);

    // Setup raycaster
    raycaster.current.set(camera.position, spreadDirection);
    raycaster.current.far = config.range;

    // Filter objects to test
    const testObjects = scene.children.filter((child) => {
      // Skip ignored objects
      if (options.ignoreObjects?.includes(child)) return false;

      // Skip non-mesh objects
      if (!child.visible) return false;

      // Check if object has userData.targetId (is a valid target)
      let isTarget = false;
      child.traverse((obj) => {
        if (obj.userData?.targetId) isTarget = true;
      });

      return isTarget;
    });

    // Perform raycast
    const intersects = raycaster.current.intersectObjects(testObjects, true);

    // Debug visualization
    if (options.debug) {
      // Remove old debug lines
      debugLines.current.forEach((line) => scene.remove(line));
      debugLines.current = [];

      // Create debug line
      const points = [
        camera.position.clone(),
        camera.position.clone().add(spreadDirection.multiplyScalar(config.range)),
      ];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({
        color: intersects.length > 0 ? 0xff0000 : 0x00ff00,
      });
      const line = new THREE.Line(geometry, material);
      scene.add(line);
      debugLines.current.push(line);

      // Remove after 100ms
      setTimeout(() => {
        scene.remove(line);
      }, 100);
    }

    if (intersects.length === 0) {
      return { hit: false, isCritical: false, damage: 0 };
    }

    // Find first hit with a targetId
    const hit = intersects.find((i) => {
      let found = false;
      i.object.traverseAncestors((parent) => {
        if (parent.userData?.targetId) found = true;
      });
      return i.object.userData?.targetId || found;
    });

    if (!hit) {
      return { hit: false, isCritical: false, damage: 0 };
    }

    // Find the target ID
    let targetId = hit.object.userData?.targetId;
    if (!targetId) {
      hit.object.traverseAncestors((parent) => {
        if (parent.userData?.targetId) targetId = parent.userData.targetId;
      });
    }

    // Check critical
    const isCritical = checkCritical(hit.point, hit.object, config.critChance);

    // Calculate damage
    let damage = config.damage;
    if (isCritical) {
      damage *= config.critMultiplier;
    }

    // Apply damage to target in store
    if (targetId && targets.has(targetId)) {
      damageTarget(targetId, Math.round(damage), isCritical);
    }

    return {
      hit: true,
      target: {
        id: targetId || 'unknown',
        object: hit.object,
        point: hit.point,
        distance: hit.distance,
      },
      isCritical,
      damage: Math.round(damage),
    };
  }, [
    getWeaponConfig,
    fire,
    camera,
    scene,
    applySpread,
    checkCritical,
    options.ignoreObjects,
    options.debug,
    targets,
    damageTarget,
  ]);

  // Cleanup debug lines
  const cleanup = useCallback(() => {
    debugLines.current.forEach((line) => scene.remove(line));
    debugLines.current = [];
  }, [scene]);

  return {
    fireWeapon,
    cleanup,
    raycaster: raycaster.current,
  };
}

export default useHitDetection;
