/**
 * Animation State Store
 *
 * Singleton store for player animation state that avatar components can read from
 * without causing React re-renders in parent components.
 *
 * PhysicsPlayerController writes to this store in useFrame, and Avatar components
 * read directly. Uses a singleton pattern (not Zustand) to avoid any React re-renders.
 *
 * This is the same pattern as useLightingStore.ts - React is just a launcher,
 * not a runtime for the hot path.
 */

// Define locally to avoid circular dependency with PhysicsPlayerController
export enum PlayerAirState {
  GROUNDED = 'grounded',
  JUMPING = 'jumping',
  FALLING = 'falling',
  LANDING = 'landing',
}

export interface AnimationStoreState {
  isMoving: boolean;
  isRunning: boolean;
  isGrounded: boolean;
  isJumping: boolean;
  isFalling: boolean;
  isLanding: boolean;
  isDancing: boolean;
  dancePressed: boolean;
  isCrouching: boolean;
  isStrafingLeft: boolean;
  isStrafingRight: boolean;
  isAiming: boolean;
  isFiring: boolean;
  velocity: number;
  velocityY: number;
  aimPitch: number;
  airState: PlayerAirState;
}

type AnimationListener = (state: AnimationStoreState) => void;

/**
 * Singleton animation state manager.
 * Use `animationState` to read current values in useFrame.
 * Use `updateAnimationState` to update values (called by PhysicsPlayerController).
 * Use `subscribeAnimation` for non-React listeners (optional).
 */
class AnimationStateManager {
  private state: AnimationStoreState = {
    isMoving: false,
    isRunning: false,
    isGrounded: true,
    isJumping: false,
    isFalling: false,
    isLanding: false,
    isDancing: false,
    dancePressed: false,
    isCrouching: false,
    isStrafingLeft: false,
    isStrafingRight: false,
    isAiming: false,
    isFiring: false,
    velocity: 0,
    velocityY: 0,
    aimPitch: 0,
    airState: PlayerAirState.GROUNDED,
  };

  private listeners: Set<AnimationListener> = new Set();
  private version = 0;

  /**
   * Get current animation state (for direct reads in useFrame).
   */
  getState(): AnimationStoreState {
    return this.state;
  }

  /**
   * Get version number for change detection.
   */
  getVersion(): number {
    return this.version;
  }

  /**
   * Update animation state (called by PhysicsPlayerController in useFrame).
   * This does NOT trigger React re-renders.
   */
  update(newState: AnimationStoreState): void {
    // Update all fields
    this.state.isMoving = newState.isMoving;
    this.state.isRunning = newState.isRunning;
    this.state.isGrounded = newState.isGrounded;
    this.state.isJumping = newState.isJumping;
    this.state.isFalling = newState.isFalling;
    this.state.isLanding = newState.isLanding;
    this.state.isDancing = newState.isDancing;
    this.state.dancePressed = newState.dancePressed;
    this.state.isCrouching = newState.isCrouching;
    this.state.isStrafingLeft = newState.isStrafingLeft;
    this.state.isStrafingRight = newState.isStrafingRight;
    this.state.isAiming = newState.isAiming;
    this.state.isFiring = newState.isFiring;
    this.state.velocity = newState.velocity;
    this.state.velocityY = newState.velocityY;
    this.state.aimPitch = newState.aimPitch;
    this.state.airState = newState.airState;

    this.version++;

    // Notify listeners (for non-React consumers)
    this.listeners.forEach((listener) => listener(this.state));
  }

  /**
   * Subscribe to animation changes (for non-React code).
   * Returns unsubscribe function.
   */
  subscribe(listener: AnimationListener): () => void {
    this.listeners.add(listener);
    // Immediately call with current state
    listener(this.state);
    return () => this.listeners.delete(listener);
  }
}

// Singleton instance
export const animationStateManager = new AnimationStateManager();

// Convenience exports - these are stable references
export const animationState = animationStateManager.getState();
export const updateAnimationState = (state: AnimationStoreState) =>
  animationStateManager.update(state);
export const subscribeAnimation = (listener: AnimationListener) =>
  animationStateManager.subscribe(listener);
export const getAnimationVersion = () => animationStateManager.getVersion();
