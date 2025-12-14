// Game Manager - Integrates ECS, Physics, and Systems
import React, { createContext, useContext, useEffect, useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { World, getWorld, resetWorld, EntityId } from '../../lib/ecs';
import {
  createTransform,
  createCharacterController,
  createPlayerInput,
  TransformComponent,
} from '../../lib/ecs/components';
import { usePhysics, PhysicsProvider } from '../../lib/physics';
import { InputSystem } from './systems/InputSystem';
import { PhysicsSystem } from './systems/PhysicsSystem';
import { MovementSystem } from './systems/MovementSystem';
import * as THREE from 'three';

// Fixed timestep constants
const FIXED_TIMESTEP = 1 / 60;
const MAX_SUBSTEPS = 5;
const MAX_FRAME_TIME = 0.25;

// Game context
interface GameContextType {
  world: World;
  playerEntityId: EntityId | null;
  getPlayerPosition: () => [number, number, number];
  getPlayerRotation: () => [number, number, number, number];
  getCameraYaw: () => number;
  getCameraPitch: () => number;
  // Systems
  inputSystem: InputSystem;
  movementSystem: MovementSystem;
}

const GameContext = createContext<GameContextType | null>(null);

export function useGame(): GameContextType {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within GameManager');
  }
  return context;
}

// Internal component that runs after physics is ready
function GameManagerInner({
  children,
  onPlayerPositionChange,
  spawnPosition = [0, 1, 0],
}: {
  children: React.ReactNode;
  onPlayerPositionChange?: (position: THREE.Vector3) => void;
  spawnPosition?: [number, number, number];
}) {
  const physics = usePhysics();
  const worldRef = useRef<World | null>(null);
  const playerEntityRef = useRef<EntityId | null>(null);
  const accumulatorRef = useRef(0);
  const previousTimeRef = useRef(0);
  const initializedRef = useRef(false);

  // Systems
  const inputSystemRef = useRef<InputSystem | null>(null);
  const physicsSystemRef = useRef<PhysicsSystem | null>(null);
  const movementSystemRef = useRef<MovementSystem | null>(null);

  // Initialize ECS world and systems
  useEffect(() => {
    // Reset any existing world
    resetWorld();
    const world = getWorld();
    worldRef.current = world;

    // Create systems
    const inputSystem = new InputSystem();
    const physicsSystem = new PhysicsSystem();
    const movementSystem = new MovementSystem();

    inputSystemRef.current = inputSystem;
    physicsSystemRef.current = physicsSystem;
    movementSystemRef.current = movementSystem;

    // Set physics context
    physicsSystem.setPhysicsContext(physics);
    movementSystem.setPhysicsContext(physics);

    // Add systems to world (order matters for priority)
    world.addSystem(inputSystem);
    world.addSystem(physicsSystem);
    world.addSystem(movementSystem);

    // Create player entity
    const playerId = world.createEntity();
    world.addComponent(playerId, createTransform(spawnPosition));
    world.addComponent(playerId, createCharacterController(5, 8, 1.8));
    world.addComponent(playerId, createPlayerInput());
    world.addTag(playerId, 'player');
    world.addTag(playerId, 'local');

    playerEntityRef.current = playerId;

    // Initialize world
    world.init();

    console.log('🎮 Game Manager initialized', world.getStats());

    return () => {
      world.destroy();
      resetWorld();
      worldRef.current = null;
      playerEntityRef.current = null;
    };
  }, [physics, spawnPosition[0], spawnPosition[1], spawnPosition[2]]);

  // Game loop
  useFrame((state) => {
    if (!worldRef.current || !initializedRef.current) {
      if (worldRef.current) {
        initializedRef.current = true;
        previousTimeRef.current = state.clock.elapsedTime;
      }
      return;
    }

    const currentTime = state.clock.elapsedTime;
    let frameTime = currentTime - previousTimeRef.current;
    previousTimeRef.current = currentTime;

    // Clamp frame time
    if (frameTime > MAX_FRAME_TIME) {
      frameTime = MAX_FRAME_TIME;
    }

    accumulatorRef.current += frameTime;

    // Fixed timestep updates
    let substeps = 0;
    while (accumulatorRef.current >= FIXED_TIMESTEP && substeps < MAX_SUBSTEPS) {
      worldRef.current.update(FIXED_TIMESTEP);
      accumulatorRef.current -= FIXED_TIMESTEP;
      substeps++;
    }

    // Report player position
    if (onPlayerPositionChange && playerEntityRef.current !== null) {
      const transform = worldRef.current.getComponent<TransformComponent>(
        playerEntityRef.current,
        'Transform'
      );
      if (transform) {
        onPlayerPositionChange(
          new THREE.Vector3(
            transform.position[0],
            transform.position[1],
            transform.position[2]
          )
        );
      }
    }
  });

  // Context value
  const contextValue = useMemo<GameContextType | null>(() => {
    if (!worldRef.current || !inputSystemRef.current || !movementSystemRef.current) {
      return null;
    }

    return {
      world: worldRef.current,
      playerEntityId: playerEntityRef.current,
      getPlayerPosition: () => {
        if (playerEntityRef.current === null || !worldRef.current) {
          return [0, 0, 0];
        }
        const transform = worldRef.current.getComponent<TransformComponent>(
          playerEntityRef.current,
          'Transform'
        );
        return transform?.position ?? [0, 0, 0];
      },
      getPlayerRotation: () => {
        if (playerEntityRef.current === null || !worldRef.current) {
          return [0, 0, 0, 1];
        }
        const transform = worldRef.current.getComponent<TransformComponent>(
          playerEntityRef.current,
          'Transform'
        );
        return transform?.rotation ?? [0, 0, 0, 1];
      },
      getCameraYaw: () => movementSystemRef.current?.getCameraYaw() ?? 0,
      getCameraPitch: () => movementSystemRef.current?.getCameraPitch() ?? 0,
      inputSystem: inputSystemRef.current,
      movementSystem: movementSystemRef.current,
    };
  }, []);

  if (!contextValue) {
    return null;
  }

  return <GameContext.Provider value={contextValue}>{children}</GameContext.Provider>;
}

// Main GameManager with PhysicsProvider wrapper
interface GameManagerProps {
  children: React.ReactNode;
  onPlayerPositionChange?: (position: THREE.Vector3) => void;
  spawnPosition?: [number, number, number];
  gravity?: [number, number, number];
  debug?: boolean;
}

export function GameManager({
  children,
  onPlayerPositionChange,
  spawnPosition = [0, 1, 0],
  gravity = [0, -30, 0],
  debug = false,
}: GameManagerProps) {
  return (
    <PhysicsProvider gravity={gravity} debug={debug}>
      <GameManagerInner
        onPlayerPositionChange={onPlayerPositionChange}
        spawnPosition={spawnPosition}
      >
        {children}
      </GameManagerInner>
    </PhysicsProvider>
  );
}

// Hook to get player position with interpolation
export function usePlayerPosition(): [number, number, number] {
  const game = useGame();
  const posRef = useRef<[number, number, number]>([0, 0, 0]);

  useFrame(() => {
    posRef.current = game.getPlayerPosition();
  });

  return posRef.current;
}

// Hook to track a ref to player position (updates every frame)
export function usePlayerPositionRef(): React.MutableRefObject<[number, number, number]> {
  const game = useGame();
  const posRef = useRef<[number, number, number]>([0, 0, 0]);

  useFrame(() => {
    posRef.current = game.getPlayerPosition();
  });

  return posRef;
}
