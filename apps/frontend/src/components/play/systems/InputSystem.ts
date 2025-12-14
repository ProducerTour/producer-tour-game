// Input System - captures keyboard and mouse input
import { System, SystemPriority } from '../../../lib/ecs/System';
import { World } from '../../../lib/ecs/World';
import { PlayerInputComponent } from '../../../lib/ecs/components';

export class InputSystem extends System {
  priority = SystemPriority.INPUT;
  requiredComponents = ['PlayerInput'];

  private keys: Set<string> = new Set();
  private mouseX = 0;
  private mouseY = 0;
  private mouseDeltaX = 0;
  private mouseDeltaY = 0;
  private lastMouseX = 0;
  private lastMouseY = 0;
  private pointerLocked = false;

  private boundKeyDown: (e: KeyboardEvent) => void;
  private boundKeyUp: (e: KeyboardEvent) => void;
  private boundMouseMove: (e: MouseEvent) => void;
  private boundPointerLockChange: () => void;

  constructor() {
    super();
    this.boundKeyDown = this.handleKeyDown.bind(this);
    this.boundKeyUp = this.handleKeyUp.bind(this);
    this.boundMouseMove = this.handleMouseMove.bind(this);
    this.boundPointerLockChange = this.handlePointerLockChange.bind(this);
  }

  init(_world: World): void {
    window.addEventListener('keydown', this.boundKeyDown);
    window.addEventListener('keyup', this.boundKeyUp);
    window.addEventListener('mousemove', this.boundMouseMove);
    document.addEventListener('pointerlockchange', this.boundPointerLockChange);
    // Don't add click listener here - let the canvas handle pointer lock
  }

  destroy(_world: World): void {
    window.removeEventListener('keydown', this.boundKeyDown);
    window.removeEventListener('keyup', this.boundKeyUp);
    window.removeEventListener('mousemove', this.boundMouseMove);
    document.removeEventListener('pointerlockchange', this.boundPointerLockChange);
  }

  private handleKeyDown(e: KeyboardEvent): void {
    // Ignore if typing in an input field
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement
    ) {
      return;
    }
    this.keys.add(e.code);
  }

  private handleKeyUp(e: KeyboardEvent): void {
    this.keys.delete(e.code);
  }

  private handleMouseMove(e: MouseEvent): void {
    if (this.pointerLocked) {
      this.mouseDeltaX = e.movementX;
      this.mouseDeltaY = e.movementY;
    } else {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
      this.mouseDeltaX = e.clientX - this.lastMouseX;
      this.mouseDeltaY = e.clientY - this.lastMouseY;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    }
  }

  private handlePointerLockChange(): void {
    this.pointerLocked = document.pointerLockElement !== null;
  }

  update(world: World, _dt: number): void {
    this.forEachEntity(world, (entityId) => {
      const input = world.getComponent<PlayerInputComponent>(entityId, 'PlayerInput');
      if (!input) return;

      // Update movement keys
      input.forward = this.keys.has('KeyW') || this.keys.has('ArrowUp');
      input.backward = this.keys.has('KeyS') || this.keys.has('ArrowDown');
      input.left = this.keys.has('KeyA') || this.keys.has('ArrowLeft');
      input.right = this.keys.has('KeyD') || this.keys.has('ArrowRight');
      input.jump = this.keys.has('Space');
      input.sprint = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
      input.interact = this.keys.has('KeyE');
      input.attack = this.keys.has('Mouse0');

      // Update mouse
      input.mouseX = this.mouseX;
      input.mouseY = this.mouseY;
      input.mouseDeltaX = this.mouseDeltaX;
      input.mouseDeltaY = this.mouseDeltaY;

      // Reset mouse delta after reading
      this.mouseDeltaX = 0;
      this.mouseDeltaY = 0;
    });
  }

  // Helper methods for external use
  isKeyDown(code: string): boolean {
    return this.keys.has(code);
  }

  isPointerLocked(): boolean {
    return this.pointerLocked;
  }

  requestPointerLock(): void {
    const canvas = document.querySelector('canvas');
    if (canvas && !this.pointerLocked) {
      canvas.requestPointerLock();
    }
  }

  exitPointerLock(): void {
    if (this.pointerLocked) {
      document.exitPointerLock();
    }
  }
}
