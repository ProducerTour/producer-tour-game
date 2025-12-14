// Physics System - syncs ECS with Rapier physics world
import { System, SystemPriority } from '../../../lib/ecs/System';
import { World, EntityId } from '../../../lib/ecs/World';
import {
  TransformComponent,
  RigidBodyComponent,
  ColliderComponent,
} from '../../../lib/ecs/components';
import type { PhysicsContextType } from '../../../lib/physics/RapierContext';
import type RAPIER from '@dimforge/rapier3d-compat';

export class PhysicsSystem extends System {
  priority = SystemPriority.PHYSICS;
  requiredComponents = ['Transform', 'RigidBody'];

  private physics: PhysicsContextType | null = null;
  private bodyMap = new Map<EntityId, RAPIER.RigidBody>();
  private colliderMap = new Map<EntityId, RAPIER.Collider>();
  private entityByBody = new Map<number, EntityId>(); // body handle -> entity id

  setPhysicsContext(physics: PhysicsContextType): void {
    this.physics = physics;
  }

  init(world: World): void {
    // Create physics bodies for existing entities
    this.forEachEntity(world, (entityId) => {
      this.createPhysicsBody(world, entityId);
    });
  }

  destroy(_world: World): void {
    // Clean up all physics bodies
    for (const [, body] of this.bodyMap) {
      this.physics?.removeRigidBody(body);
    }
    this.bodyMap.clear();
    this.colliderMap.clear();
    this.entityByBody.clear();
  }

  update(world: World, dt: number): void {
    if (!this.physics || !this.physics.ready) return;

    // Step physics world
    this.physics.step(dt);

    // Sync ECS from physics
    this.forEachEntity(world, (entityId) => {
      const body = this.bodyMap.get(entityId);
      if (!body) {
        // Create body if not exists
        this.createPhysicsBody(world, entityId);
        return;
      }

      const transform = world.getComponent<TransformComponent>(entityId, 'Transform')!;
      const rigidBody = world.getComponent<RigidBodyComponent>(entityId, 'RigidBody')!;

      // Store previous position for interpolation
      transform.previousPosition = [...transform.position];
      transform.previousRotation = [...transform.rotation];

      // Sync transform from physics
      const pos = body.translation();
      const rot = body.rotation();

      transform.position = [pos.x, pos.y, pos.z];
      transform.rotation = [rot.x, rot.y, rot.z, rot.w];

      // Sync velocity
      const vel = body.linvel();
      const angVel = body.angvel();
      rigidBody.velocity = [vel.x, vel.y, vel.z];
      rigidBody.angularVelocity = [angVel.x, angVel.y, angVel.z];
    });
  }

  private createPhysicsBody(world: World, entityId: EntityId): void {
    if (!this.physics || !this.physics.ready) return;

    const transform = world.getComponent<TransformComponent>(entityId, 'Transform');
    const rigidBody = world.getComponent<RigidBodyComponent>(entityId, 'RigidBody');

    if (!transform || !rigidBody) return;

    // Create rigid body
    const body = this.physics.createRigidBody(
      rigidBody.bodyType,
      transform.position,
      transform.rotation
    );

    if (!body) return;

    this.bodyMap.set(entityId, body);
    const bodyHandle = body.handle;
    this.entityByBody.set(bodyHandle, entityId);
    rigidBody.bodyHandle = bodyHandle;

    // Create collider if component exists
    const collider = world.getComponent<ColliderComponent>(entityId, 'Collider');
    if (collider) {
      this.createCollider(world, entityId, body, collider);
    }
  }

  private createCollider(
    _world: World,
    entityId: EntityId,
    body: RAPIER.RigidBody,
    collider: ColliderComponent
  ): void {
    if (!this.physics) return;

    let rapierCollider: RAPIER.Collider | null = null;

    const options = {
      friction: collider.friction,
      restitution: collider.restitution,
      isTrigger: collider.isTrigger,
      collisionGroups: collider.collisionGroups,
    };

    switch (collider.shape) {
      case 'box':
        rapierCollider = this.physics.createBoxCollider(
          body,
          collider.dimensions as [number, number, number],
          collider.offset,
          options
        );
        break;

      case 'sphere':
        rapierCollider = this.physics.createSphereCollider(
          body,
          collider.dimensions[0],
          collider.offset,
          options
        );
        break;

      case 'capsule':
        rapierCollider = this.physics.createCapsuleCollider(
          body,
          collider.dimensions[0], // halfHeight
          collider.dimensions[1], // radius
          collider.offset,
          options
        );
        break;
    }

    if (rapierCollider) {
      this.colliderMap.set(entityId, rapierCollider);
    }
  }

  // Public methods for external use

  addEntity(world: World, entityId: EntityId): void {
    if (!this.bodyMap.has(entityId)) {
      this.createPhysicsBody(world, entityId);
    }
  }

  removeEntity(entityId: EntityId): void {
    const body = this.bodyMap.get(entityId);
    if (body) {
      this.entityByBody.delete(body.handle);
      this.physics?.removeRigidBody(body);
      this.bodyMap.delete(entityId);
    }
    const collider = this.colliderMap.get(entityId);
    if (collider) {
      this.physics?.removeCollider(collider);
      this.colliderMap.delete(entityId);
    }
  }

  getBody(entityId: EntityId): RAPIER.RigidBody | undefined {
    return this.bodyMap.get(entityId);
  }

  getCollider(entityId: EntityId): RAPIER.Collider | undefined {
    return this.colliderMap.get(entityId);
  }

  getEntityByBodyHandle(handle: number): EntityId | undefined {
    return this.entityByBody.get(handle);
  }

  // Apply force/impulse to entity
  applyForce(entityId: EntityId, force: [number, number, number]): void {
    const body = this.bodyMap.get(entityId);
    if (body) {
      body.addForce({ x: force[0], y: force[1], z: force[2] }, true);
    }
  }

  applyImpulse(entityId: EntityId, impulse: [number, number, number]): void {
    const body = this.bodyMap.get(entityId);
    if (body) {
      body.applyImpulse({ x: impulse[0], y: impulse[1], z: impulse[2] }, true);
    }
  }

  // Set velocity directly
  setLinearVelocity(entityId: EntityId, velocity: [number, number, number]): void {
    const body = this.bodyMap.get(entityId);
    if (body) {
      body.setLinvel({ x: velocity[0], y: velocity[1], z: velocity[2] }, true);
    }
  }

  // Teleport entity
  setPosition(entityId: EntityId, position: [number, number, number]): void {
    const body = this.bodyMap.get(entityId);
    if (body) {
      body.setTranslation({ x: position[0], y: position[1], z: position[2] }, true);
    }
  }
}
