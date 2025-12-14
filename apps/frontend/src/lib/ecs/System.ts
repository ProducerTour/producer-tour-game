// Base System class for ECS
import { World, ComponentType, SystemInterface } from './World';

export abstract class System implements SystemInterface {
  abstract priority: number;
  abstract requiredComponents: ComponentType[];

  abstract update(world: World, dt: number): void;

  init?(world: World): void;
  destroy?(world: World): void;

  // Helper to iterate over entities matching this system's requirements
  protected forEachEntity(world: World, callback: (entityId: number) => void): void {
    const entities = world.query(...this.requiredComponents);
    for (const entityId of entities) {
      callback(entityId);
    }
  }
}

// System priorities (lower = runs first)
export const SystemPriority = {
  INPUT: 0,
  NETWORK_RECEIVE: 10,
  AI: 20,
  PHYSICS: 30,
  MOVEMENT: 40,
  COLLISION: 50,
  ANIMATION: 60,
  QUEST: 70,
  NETWORK_SEND: 80,
  RENDER: 90,
  CLEANUP: 100,
} as const;
