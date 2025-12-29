/**
 * Hit Detection Hook
 * Raycasting-based hit detection for weapons
 */

import { useCallback, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useCombatStore, WEAPON_CONFIG } from './useCombatStore';
import { useNPCStore } from '../npc/useNPCStore';

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
  // Get current spread (base + bloom) - from useRecoil
  getCurrentSpread?: () => number;
  // Called after successful fire - for recoil/bloom
  onFire?: () => void;
  // Called when fire is blocked (reloading or empty) - for playing empty SFX
  onFireBlocked?: (reason: 'reloading' | 'empty') => void;
}

export function useHitDetection(options: UseHitDetectionOptions = {}) {
  const { scene, camera } = useThree();
  // Use selectors to prevent re-renders when unrelated state changes
  const currentWeapon = useCombatStore((s) => s.currentWeapon);
  const fire = useCombatStore((s) => s.fire);
  const damageTarget = useCombatStore((s) => s.damageTarget);
  const targets = useCombatStore((s) => s.targets);

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

    // Try to fire (checks ammo, fire rate, reload status)
    const fireResult = fire();
    if (fireResult !== true) {
      // Fire was blocked - notify caller to play empty SFX
      if (fireResult === 'reloading' || fireResult === 'empty') {
        options.onFireBlocked?.(fireResult);
      }
      return { hit: false, isCritical: false, damage: 0 };
    }

    // Trigger recoil/bloom callback
    options.onFire?.();

    // Get camera direction
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);

    // Apply weapon spread (use bloom spread if provided, otherwise base spread)
    const currentSpread = options.getCurrentSpread?.() ?? config.spread;
    const spreadDirection = applySpread(direction, currentSpread);

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

    // Apply damage to target
    if (targetId) {
      const roundedDamage = Math.round(damage);

      // Check if target is an NPC
      const { getNPC, damageNPC } = useNPCStore.getState();
      const npc = getNPC(targetId);

      if (npc) {
        // Damage NPC via NPC store
        damageNPC(targetId, roundedDamage);

        // Add floating damage number for NPC
        useCombatStore.getState().addDamageNumber({
          id: `dmg_${Date.now()}_${Math.random()}`,
          value: roundedDamage,
          position: { x: npc.position.x, y: npc.position.y + 1.5, z: npc.position.z },
          isCritical,
          createdAt: Date.now(),
        });
      } else if (targets.has(targetId)) {
        // Damage other targets via combat store (includes damage number)
        damageTarget(targetId, roundedDamage, isCritical);
      }
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
    options.getCurrentSpread,
    options.onFire,
    options.onFireBlocked,
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
