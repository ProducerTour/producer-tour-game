// Rapier Physics Context and Provider
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from 'react';
import RAPIER from '@dimforge/rapier3d-compat';

// Collision groups for filtering
export const CollisionGroups = {
  PLAYER: 0x0001,
  NPC: 0x0002,
  STATIC: 0x0004,
  DYNAMIC: 0x0008,
  TRIGGER: 0x0010,
  PROJECTILE: 0x0020,
  ALL: 0xffff,
} as const;

export interface RaycastResult {
  hit: boolean;
  point?: [number, number, number];
  normal?: [number, number, number];
  distance?: number;
  colliderHandle?: number;
}

export interface PhysicsContextType {
  world: RAPIER.World | null;
  rapier: typeof RAPIER | null;
  ready: boolean;

  // World operations
  step: (dt: number) => void;

  // Rigid body operations
  createRigidBody: (
    type: 'dynamic' | 'kinematic' | 'static',
    position: [number, number, number],
    rotation?: [number, number, number, number]
  ) => RAPIER.RigidBody | null;

  removeRigidBody: (body: RAPIER.RigidBody) => void;

  // Collider operations
  createBoxCollider: (
    body: RAPIER.RigidBody,
    halfExtents: [number, number, number],
    offset?: [number, number, number],
    options?: ColliderOptions
  ) => RAPIER.Collider | null;

  createSphereCollider: (
    body: RAPIER.RigidBody,
    radius: number,
    offset?: [number, number, number],
    options?: ColliderOptions
  ) => RAPIER.Collider | null;

  createCapsuleCollider: (
    body: RAPIER.RigidBody,
    halfHeight: number,
    radius: number,
    offset?: [number, number, number],
    options?: ColliderOptions
  ) => RAPIER.Collider | null;

  removeCollider: (collider: RAPIER.Collider) => void;

  // Character controller
  createCharacterController: (offset: number) => RAPIER.KinematicCharacterController | null;
  removeCharacterController: (controller: RAPIER.KinematicCharacterController) => void;

  // Queries
  raycast: (
    origin: [number, number, number],
    direction: [number, number, number],
    maxDistance: number,
    filterGroups?: number
  ) => RaycastResult;

  // Get body/collider by handle
  getRigidBody: (handle: number) => RAPIER.RigidBody | null;
  getCollider: (handle: number) => RAPIER.Collider | null;
}

interface ColliderOptions {
  friction?: number;
  restitution?: number;
  density?: number;
  isTrigger?: boolean;
  collisionGroups?: number;
  solverGroups?: number;
}

const PhysicsContext = createContext<PhysicsContextType | null>(null);

interface PhysicsProviderProps {
  children: React.ReactNode;
  gravity?: [number, number, number];
  debug?: boolean;
}

export function PhysicsProvider({
  children,
  gravity = [0, -9.81, 0],
  debug = false,
}: PhysicsProviderProps) {
  const [ready, setReady] = useState(false);
  const worldRef = useRef<RAPIER.World | null>(null);
  const rapierRef = useRef<typeof RAPIER | null>(null);
  const characterControllersRef = useRef<Set<RAPIER.KinematicCharacterController>>(new Set());

  // Initialize Rapier
  useEffect(() => {
    let mounted = true;

    RAPIER.init().then(() => {
      if (!mounted) return;

      rapierRef.current = RAPIER;
      const gravityVec = new RAPIER.Vector3(gravity[0], gravity[1], gravity[2]);
      worldRef.current = new RAPIER.World(gravityVec);

      if (debug) {
        console.log('🎮 Rapier physics initialized');
      }

      setReady(true);
    });

    return () => {
      mounted = false;
      // Clean up character controllers
      characterControllersRef.current.forEach((controller) => {
        controller.free();
      });
      characterControllersRef.current.clear();

      // Clean up world
      if (worldRef.current) {
        worldRef.current.free();
        worldRef.current = null;
      }
    };
  }, [gravity[0], gravity[1], gravity[2], debug]);

  // Step the physics world
  const step = useCallback((_dt: number) => {
    if (worldRef.current) {
      worldRef.current.step();
    }
  }, []);

  // Create rigid body
  const createRigidBody = useCallback(
    (
      type: 'dynamic' | 'kinematic' | 'static',
      position: [number, number, number],
      rotation?: [number, number, number, number]
    ): RAPIER.RigidBody | null => {
      if (!worldRef.current || !rapierRef.current) return null;

      let bodyDesc: RAPIER.RigidBodyDesc;
      switch (type) {
        case 'dynamic':
          bodyDesc = rapierRef.current.RigidBodyDesc.dynamic();
          break;
        case 'kinematic':
          bodyDesc = rapierRef.current.RigidBodyDesc.kinematicPositionBased();
          break;
        case 'static':
          bodyDesc = rapierRef.current.RigidBodyDesc.fixed();
          break;
      }

      bodyDesc.setTranslation(position[0], position[1], position[2]);
      if (rotation) {
        bodyDesc.setRotation({ x: rotation[0], y: rotation[1], z: rotation[2], w: rotation[3] });
      }

      return worldRef.current.createRigidBody(bodyDesc);
    },
    []
  );

  // Remove rigid body
  const removeRigidBody = useCallback((body: RAPIER.RigidBody) => {
    if (worldRef.current) {
      worldRef.current.removeRigidBody(body);
    }
  }, []);

  // Create box collider
  const createBoxCollider = useCallback(
    (
      body: RAPIER.RigidBody,
      halfExtents: [number, number, number],
      offset: [number, number, number] = [0, 0, 0],
      options: ColliderOptions = {}
    ): RAPIER.Collider | null => {
      if (!worldRef.current || !rapierRef.current) return null;

      const colliderDesc = rapierRef.current.ColliderDesc.cuboid(
        halfExtents[0],
        halfExtents[1],
        halfExtents[2]
      )
        .setTranslation(offset[0], offset[1], offset[2])
        .setFriction(options.friction ?? 0.5)
        .setRestitution(options.restitution ?? 0.0);

      if (options.density !== undefined) {
        colliderDesc.setDensity(options.density);
      }
      if (options.isTrigger) {
        colliderDesc.setSensor(true);
      }
      if (options.collisionGroups !== undefined) {
        colliderDesc.setCollisionGroups(options.collisionGroups);
      }
      if (options.solverGroups !== undefined) {
        colliderDesc.setSolverGroups(options.solverGroups);
      }

      return worldRef.current.createCollider(colliderDesc, body);
    },
    []
  );

  // Create sphere collider
  const createSphereCollider = useCallback(
    (
      body: RAPIER.RigidBody,
      radius: number,
      offset: [number, number, number] = [0, 0, 0],
      options: ColliderOptions = {}
    ): RAPIER.Collider | null => {
      if (!worldRef.current || !rapierRef.current) return null;

      const colliderDesc = rapierRef.current.ColliderDesc.ball(radius)
        .setTranslation(offset[0], offset[1], offset[2])
        .setFriction(options.friction ?? 0.5)
        .setRestitution(options.restitution ?? 0.0);

      if (options.density !== undefined) {
        colliderDesc.setDensity(options.density);
      }
      if (options.isTrigger) {
        colliderDesc.setSensor(true);
      }
      if (options.collisionGroups !== undefined) {
        colliderDesc.setCollisionGroups(options.collisionGroups);
      }

      return worldRef.current.createCollider(colliderDesc, body);
    },
    []
  );

  // Create capsule collider
  const createCapsuleCollider = useCallback(
    (
      body: RAPIER.RigidBody,
      halfHeight: number,
      radius: number,
      offset: [number, number, number] = [0, 0, 0],
      options: ColliderOptions = {}
    ): RAPIER.Collider | null => {
      if (!worldRef.current || !rapierRef.current) return null;

      const colliderDesc = rapierRef.current.ColliderDesc.capsule(halfHeight, radius)
        .setTranslation(offset[0], offset[1], offset[2])
        .setFriction(options.friction ?? 0.5)
        .setRestitution(options.restitution ?? 0.0);

      if (options.density !== undefined) {
        colliderDesc.setDensity(options.density);
      }
      if (options.isTrigger) {
        colliderDesc.setSensor(true);
      }
      if (options.collisionGroups !== undefined) {
        colliderDesc.setCollisionGroups(options.collisionGroups);
      }

      return worldRef.current.createCollider(colliderDesc, body);
    },
    []
  );

  // Remove collider
  const removeCollider = useCallback((collider: RAPIER.Collider) => {
    if (worldRef.current) {
      worldRef.current.removeCollider(collider, true);
    }
  }, []);

  // Create character controller
  const createCharacterController = useCallback(
    (offset: number): RAPIER.KinematicCharacterController | null => {
      if (!worldRef.current) return null;

      const controller = worldRef.current.createCharacterController(offset);
      controller.enableAutostep(0.5, 0.2, true); // maxHeight, minWidth, includeDynamic
      controller.enableSnapToGround(0.5);
      controller.setApplyImpulsesToDynamicBodies(true);
      controller.setCharacterMass(70); // kg

      characterControllersRef.current.add(controller);
      return controller;
    },
    []
  );

  // Remove character controller
  const removeCharacterController = useCallback(
    (controller: RAPIER.KinematicCharacterController) => {
      characterControllersRef.current.delete(controller);
      controller.free();
    },
    []
  );

  // Raycast
  const raycast = useCallback(
    (
      origin: [number, number, number],
      direction: [number, number, number],
      maxDistance: number,
      filterGroups?: number
    ): RaycastResult => {
      if (!worldRef.current || !rapierRef.current) {
        return { hit: false };
      }

      const ray = new rapierRef.current.Ray(
        { x: origin[0], y: origin[1], z: origin[2] },
        { x: direction[0], y: direction[1], z: direction[2] }
      );

      const hit = worldRef.current.castRay(ray, maxDistance, true, undefined, filterGroups);

      if (hit) {
        const hitPoint = ray.pointAt(hit.timeOfImpact);

        return {
          hit: true,
          point: [hitPoint.x, hitPoint.y, hitPoint.z],
          distance: hit.timeOfImpact,
          colliderHandle: hit.collider.handle,
        };
      }

      return { hit: false };
    },
    []
  );

  // Get rigid body by handle
  const getRigidBody = useCallback((handle: number): RAPIER.RigidBody | null => {
    if (!worldRef.current) return null;
    return worldRef.current.getRigidBody(handle);
  }, []);

  // Get collider by handle
  const getCollider = useCallback((handle: number): RAPIER.Collider | null => {
    if (!worldRef.current) return null;
    return worldRef.current.getCollider(handle);
  }, []);

  const value = useMemo<PhysicsContextType>(
    () => ({
      world: worldRef.current,
      rapier: rapierRef.current,
      ready,
      step,
      createRigidBody,
      removeRigidBody,
      createBoxCollider,
      createSphereCollider,
      createCapsuleCollider,
      removeCollider,
      createCharacterController,
      removeCharacterController,
      raycast,
      getRigidBody,
      getCollider,
    }),
    [
      ready,
      step,
      createRigidBody,
      removeRigidBody,
      createBoxCollider,
      createSphereCollider,
      createCapsuleCollider,
      removeCollider,
      createCharacterController,
      removeCharacterController,
      raycast,
      getRigidBody,
      getCollider,
    ]
  );

  if (!ready) {
    return null; // Or a loading indicator
  }

  return <PhysicsContext.Provider value={value}>{children}</PhysicsContext.Provider>;
}

// Hook to access physics context
export function usePhysics(): PhysicsContextType {
  const context = useContext(PhysicsContext);
  if (!context) {
    throw new Error('usePhysics must be used within a PhysicsProvider');
  }
  return context;
}

// Hook to check if physics is ready
export function usePhysicsReady(): boolean {
  const context = useContext(PhysicsContext);
  return context?.ready ?? false;
}
