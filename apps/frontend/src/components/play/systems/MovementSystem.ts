// Movement System - handles character controller movement
import { System, SystemPriority } from '../../../lib/ecs/System';
import { World, EntityId } from '../../../lib/ecs/World';
import {
  TransformComponent,
  CharacterControllerComponent,
  PlayerInputComponent,
} from '../../../lib/ecs/components';
import type { PhysicsContextType } from '../../../lib/physics/RapierContext';
import type RAPIER from '@dimforge/rapier3d-compat';

// Gravity constant
const GRAVITY = -30; // m/s²

export class MovementSystem extends System {
  priority = SystemPriority.MOVEMENT;
  requiredComponents = ['Transform', 'CharacterController'];

  private physics: PhysicsContextType | null = null;
  private controllers = new Map<EntityId, RAPIER.KinematicCharacterController>();
  private bodies = new Map<EntityId, RAPIER.RigidBody>();
  private colliders = new Map<EntityId, RAPIER.Collider>();

  // Camera rotation (controlled by mouse)
  private cameraYaw = 0;
  private cameraPitch = 0;

  setPhysicsContext(physics: PhysicsContextType): void {
    this.physics = physics;
  }

  init(world: World): void {
    // Create controllers for existing entities
    this.forEachEntity(world, (entityId) => {
      this.createController(world, entityId);
    });
  }

  destroy(_world: World): void {
    for (const controller of this.controllers.values()) {
      this.physics?.removeCharacterController(controller);
    }
    for (const body of this.bodies.values()) {
      this.physics?.removeRigidBody(body);
    }
    this.controllers.clear();
    this.bodies.clear();
    this.colliders.clear();
  }

  private createController(world: World, entityId: EntityId): void {
    if (!this.physics || !this.physics.ready || !this.physics.rapier) return;

    const transform = world.getComponent<TransformComponent>(entityId, 'Transform');
    const charController = world.getComponent<CharacterControllerComponent>(
      entityId,
      'CharacterController'
    );

    if (!transform || !charController) return;

    // Create kinematic body
    const body = this.physics.createRigidBody(
      'kinematic',
      transform.position,
      transform.rotation
    );
    if (!body) return;

    // Create capsule collider for the character
    const collider = this.physics.createCapsuleCollider(
      body,
      0.4, // half height
      0.3, // radius
      [0, 0.7, 0] // offset (center of capsule)
    );
    if (!collider) return;

    // Create character controller
    const controller = this.physics.createCharacterController(0.01);
    if (!controller) return;

    this.bodies.set(entityId, body);
    this.colliders.set(entityId, collider);
    this.controllers.set(entityId, controller);
  }

  update(world: World, dt: number): void {
    if (!this.physics || !this.physics.ready || !this.physics.rapier) return;

    this.forEachEntity(world, (entityId) => {
      const controller = this.controllers.get(entityId);
      const body = this.bodies.get(entityId);
      const collider = this.colliders.get(entityId);

      if (!controller || !body || !collider) {
        this.createController(world, entityId);
        return;
      }

      const transform = world.getComponent<TransformComponent>(entityId, 'Transform')!;
      const charController = world.getComponent<CharacterControllerComponent>(
        entityId,
        'CharacterController'
      )!;

      // Get input if entity has PlayerInput component
      const input = world.getComponent<PlayerInputComponent>(entityId, 'PlayerInput');

      // Update camera rotation from mouse input
      if (input) {
        const sensitivity = 0.002;
        this.cameraYaw -= input.mouseDeltaX * sensitivity;
        this.cameraPitch -= input.mouseDeltaY * sensitivity;
        this.cameraPitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, this.cameraPitch));

        // Update input direction from keys
        let inputX = 0;
        let inputZ = 0;
        if (input.forward) inputZ -= 1;
        if (input.backward) inputZ += 1;
        if (input.left) inputX -= 1;
        if (input.right) inputX += 1;

        // Normalize
        const len = Math.sqrt(inputX * inputX + inputZ * inputZ);
        if (len > 0) {
          inputX /= len;
          inputZ /= len;
        }

        charController.inputDirection = [inputX, inputZ];
        charController.wantsJump = input.jump;
        charController.wantsSprint = input.sprint;
      }

      // Store previous position for interpolation
      transform.previousPosition = [...transform.position];
      transform.previousRotation = [...transform.rotation];

      // Calculate movement direction in world space (rotated by camera yaw)
      const [inputX, inputZ] = charController.inputDirection;
      const cosYaw = Math.cos(this.cameraYaw);
      const sinYaw = Math.sin(this.cameraYaw);
      const worldX = inputX * cosYaw - inputZ * sinYaw;
      const worldZ = inputX * sinYaw + inputZ * cosYaw;

      // Calculate movement speed
      const speed =
        charController.moveSpeed * (charController.wantsSprint ? charController.sprintMultiplier : 1);

      // Apply horizontal movement
      const moveX = worldX * speed;
      const moveZ = worldZ * speed;

      // Apply gravity and jumping
      let velY = charController.velocity[1];
      if (!charController.grounded) {
        velY += GRAVITY * dt;
      } else {
        velY = -0.5; // Small downward to maintain ground contact
        if (charController.wantsJump) {
          velY = charController.jumpVelocity;
        }
      }

      // Clamp vertical velocity
      velY = Math.max(-50, Math.min(50, velY));

      // Calculate displacement for this frame
      const displacement = {
        x: moveX * dt,
        y: velY * dt,
        z: moveZ * dt,
      };

      // Use character controller to compute movement with collision
      controller.computeColliderMovement(collider, displacement);
      const movement = controller.computedMovement();

      // Apply movement to body
      const currentPos = body.translation();
      const newPos = {
        x: currentPos.x + movement.x,
        y: currentPos.y + movement.y,
        z: currentPos.z + movement.z,
      };
      body.setNextKinematicTranslation(newPos);

      // Update grounded state
      charController.grounded = controller.computedGrounded();

      // Update velocity in component
      charController.velocity = [
        moveX,
        charController.grounded ? 0 : velY,
        moveZ,
      ];

      // Update transform from body
      transform.position = [newPos.x, newPos.y, newPos.z];

      // Update rotation (face movement direction if moving)
      if (Math.abs(moveX) > 0.01 || Math.abs(moveZ) > 0.01) {
        const targetYaw = Math.atan2(moveX, moveZ);
        // Smooth rotation
        let currentYaw = this.quatToYaw(transform.rotation);
        let diff = targetYaw - currentYaw;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        currentYaw += diff * Math.min(1, dt * 10);
        transform.rotation = this.yawToQuat(currentYaw);
      }
    });
  }

  // Helper to convert quaternion to yaw
  private quatToYaw(q: [number, number, number, number]): number {
    const [x, y, z, w] = q;
    return Math.atan2(2 * (w * y + x * z), 1 - 2 * (y * y + z * z));
  }

  // Helper to convert yaw to quaternion
  private yawToQuat(yaw: number): [number, number, number, number] {
    const halfYaw = yaw / 2;
    return [0, Math.sin(halfYaw), 0, Math.cos(halfYaw)];
  }

  // Public getters
  getCameraYaw(): number {
    return this.cameraYaw;
  }

  getCameraPitch(): number {
    return this.cameraPitch;
  }

  setCameraRotation(yaw: number, pitch: number): void {
    this.cameraYaw = yaw;
    this.cameraPitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, pitch));
  }

  // Add entity to system
  addEntity(world: World, entityId: EntityId): void {
    if (!this.controllers.has(entityId)) {
      this.createController(world, entityId);
    }
  }

  // Remove entity from system
  removeEntity(entityId: EntityId): void {
    const controller = this.controllers.get(entityId);
    if (controller) {
      this.physics?.removeCharacterController(controller);
      this.controllers.delete(entityId);
    }
    const body = this.bodies.get(entityId);
    if (body) {
      this.physics?.removeRigidBody(body);
      this.bodies.delete(entityId);
    }
    this.colliders.delete(entityId);
  }

  // Get position of entity
  getPosition(entityId: EntityId): [number, number, number] | null {
    const body = this.bodies.get(entityId);
    if (!body) return null;
    const pos = body.translation();
    return [pos.x, pos.y, pos.z];
  }
}
