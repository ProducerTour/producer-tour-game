// ECS Component definitions
import type { Component } from './World';

// Transform - position, rotation, scale in world space
export interface TransformComponent extends Component {
  type: 'Transform';
  position: [number, number, number];
  rotation: [number, number, number, number]; // quaternion (x, y, z, w)
  scale: [number, number, number];
  // For interpolation between physics steps
  previousPosition?: [number, number, number];
  previousRotation?: [number, number, number, number];
}

export function createTransform(
  position: [number, number, number] = [0, 0, 0],
  rotation: [number, number, number, number] = [0, 0, 0, 1],
  scale: [number, number, number] = [1, 1, 1]
): TransformComponent {
  return {
    type: 'Transform',
    position,
    rotation,
    scale,
  };
}

// RigidBody - physics body data
export interface RigidBodyComponent extends Component {
  type: 'RigidBody';
  bodyType: 'dynamic' | 'kinematic' | 'static';
  mass: number;
  velocity: [number, number, number];
  angularVelocity: [number, number, number];
  // Rapier handles (set by physics system)
  bodyHandle?: number;
  colliderHandle?: number;
}

export function createRigidBody(
  bodyType: 'dynamic' | 'kinematic' | 'static' = 'dynamic',
  mass: number = 1
): RigidBodyComponent {
  return {
    type: 'RigidBody',
    bodyType,
    mass,
    velocity: [0, 0, 0],
    angularVelocity: [0, 0, 0],
  };
}

// Collider - collision shape data
export interface ColliderComponent extends Component {
  type: 'Collider';
  shape: 'box' | 'sphere' | 'capsule' | 'cylinder' | 'mesh';
  // Box: halfExtents [x, y, z]
  // Sphere: [radius]
  // Capsule: [halfHeight, radius]
  // Cylinder: [halfHeight, radius]
  dimensions: number[];
  offset: [number, number, number];
  isTrigger: boolean;
  friction: number;
  restitution: number;
  collisionGroups?: number;
}

export function createCollider(
  shape: ColliderComponent['shape'],
  dimensions: number[],
  options: Partial<Omit<ColliderComponent, 'type' | 'shape' | 'dimensions'>> = {}
): ColliderComponent {
  return {
    type: 'Collider',
    shape,
    dimensions,
    offset: options.offset ?? [0, 0, 0],
    isTrigger: options.isTrigger ?? false,
    friction: options.friction ?? 0.5,
    restitution: options.restitution ?? 0.0,
    collisionGroups: options.collisionGroups,
  };
}

// CharacterController - for player/NPC movement
export interface CharacterControllerComponent extends Component {
  type: 'CharacterController';
  // Movement settings
  moveSpeed: number;
  sprintMultiplier: number;
  jumpVelocity: number;
  // State
  grounded: boolean;
  velocity: [number, number, number];
  // Input (set by input system)
  inputDirection: [number, number]; // normalized x, z
  wantsJump: boolean;
  wantsSprint: boolean;
  // Rapier character controller handle
  controllerHandle?: number;
}

export function createCharacterController(
  moveSpeed: number = 5,
  jumpVelocity: number = 8,
  sprintMultiplier: number = 1.8
): CharacterControllerComponent {
  return {
    type: 'CharacterController',
    moveSpeed,
    sprintMultiplier,
    jumpVelocity,
    grounded: false,
    velocity: [0, 0, 0],
    inputDirection: [0, 0],
    wantsJump: false,
    wantsSprint: false,
  };
}

// Renderable - 3D model data
export interface RenderableComponent extends Component {
  type: 'Renderable';
  modelUrl: string;
  visible: boolean;
  castShadow: boolean;
  receiveShadow: boolean;
  // LOD
  lodLevels?: string[]; // URLs for LOD0, LOD1, LOD2
  currentLOD: number;
  // Reference to Three.js object (set by render system)
  object3D?: THREE.Object3D;
}

export function createRenderable(
  modelUrl: string,
  options: Partial<Omit<RenderableComponent, 'type' | 'modelUrl'>> = {}
): RenderableComponent {
  return {
    type: 'Renderable',
    modelUrl,
    visible: options.visible ?? true,
    castShadow: options.castShadow ?? true,
    receiveShadow: options.receiveShadow ?? true,
    lodLevels: options.lodLevels,
    currentLOD: 0,
  };
}

// NetworkIdentity - for multiplayer sync
export interface NetworkIdentityComponent extends Component {
  type: 'NetworkIdentity';
  networkId: string;
  ownerId: string;
  isLocal: boolean;
  // Server state for interpolation
  lastServerUpdate: number;
  serverPosition?: [number, number, number];
  serverRotation?: [number, number, number, number];
  serverVelocity?: [number, number, number];
}

export function createNetworkIdentity(
  networkId: string,
  ownerId: string,
  isLocal: boolean
): NetworkIdentityComponent {
  return {
    type: 'NetworkIdentity',
    networkId,
    ownerId,
    isLocal,
    lastServerUpdate: 0,
  };
}

// PlayerInput - input state for local player
export interface PlayerInputComponent extends Component {
  type: 'PlayerInput';
  // Movement
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  jump: boolean;
  sprint: boolean;
  // Actions
  interact: boolean;
  attack: boolean;
  // Mouse
  mouseX: number;
  mouseY: number;
  mouseDeltaX: number;
  mouseDeltaY: number;
}

export function createPlayerInput(): PlayerInputComponent {
  return {
    type: 'PlayerInput',
    forward: false,
    backward: false,
    left: false,
    right: false,
    jump: false,
    sprint: false,
    interact: false,
    attack: false,
    mouseX: 0,
    mouseY: 0,
    mouseDeltaX: 0,
    mouseDeltaY: 0,
  };
}

// Animation - animation state
export interface AnimationComponent extends Component {
  type: 'Animation';
  currentAnimation: string;
  animations: Record<string, string>; // name -> clip name mapping
  blendTime: number;
  timeScale: number;
  // Reference to mixer (set by animation system)
  mixer?: THREE.AnimationMixer;
  actions?: Record<string, THREE.AnimationAction>;
}

export function createAnimation(
  animations: Record<string, string>,
  defaultAnimation: string
): AnimationComponent {
  return {
    type: 'Animation',
    currentAnimation: defaultAnimation,
    animations,
    blendTime: 0.2,
    timeScale: 1,
  };
}

// Health - for entities with health
export interface HealthComponent extends Component {
  type: 'Health';
  current: number;
  max: number;
  regenRate: number;
  lastDamageTime: number;
  invulnerable: boolean;
  dead: boolean;
}

export function createHealth(max: number, regenRate: number = 0): HealthComponent {
  return {
    type: 'Health',
    current: max,
    max,
    regenRate,
    lastDamageTime: 0,
    invulnerable: false,
    dead: false,
  };
}

// AI - NPC behavior
export interface AIComponent extends Component {
  type: 'AI';
  behaviorType: string;
  currentState: string;
  blackboard: Record<string, unknown>;
  targetEntityId?: number;
  homePosition: [number, number, number];
  wanderRadius: number;
  detectionRadius: number;
}

export function createAI(
  behaviorType: string,
  homePosition: [number, number, number],
  options: Partial<Omit<AIComponent, 'type' | 'behaviorType' | 'homePosition'>> = {}
): AIComponent {
  return {
    type: 'AI',
    behaviorType,
    currentState: 'idle',
    blackboard: {},
    homePosition,
    wanderRadius: options.wanderRadius ?? 10,
    detectionRadius: options.detectionRadius ?? 5,
  };
}

// Interactable - can be interacted with
export interface InteractableComponent extends Component {
  type: 'Interactable';
  interactionType: 'pickup' | 'talk' | 'use' | 'enter' | 'open';
  interactionRadius: number;
  prompt: string;
  requiresItem?: string;
  onInteract: string; // event name
  enabled: boolean;
}

export function createInteractable(
  interactionType: InteractableComponent['interactionType'],
  prompt: string,
  onInteract: string,
  radius: number = 2
): InteractableComponent {
  return {
    type: 'Interactable',
    interactionType,
    interactionRadius: radius,
    prompt,
    onInteract,
    enabled: true,
  };
}

// QuestGiver - NPC that gives quests
export interface QuestGiverComponent extends Component {
  type: 'QuestGiver';
  availableQuests: string[];
  activeQuests: string[];
  completedQuests: string[];
  npcName: string;
}

export function createQuestGiver(
  npcName: string,
  availableQuests: string[] = []
): QuestGiverComponent {
  return {
    type: 'QuestGiver',
    availableQuests,
    activeQuests: [],
    completedQuests: [],
    npcName,
  };
}

// ChunkMember - entity belongs to a world chunk
export interface ChunkMemberComponent extends Component {
  type: 'ChunkMember';
  chunkX: number;
  chunkZ: number;
  persistent: boolean; // survives chunk unload
}

export function createChunkMember(
  chunkX: number,
  chunkZ: number,
  persistent: boolean = false
): ChunkMemberComponent {
  return {
    type: 'ChunkMember',
    chunkX,
    chunkZ,
    persistent,
  };
}

// Declare THREE types (will be imported where needed)
declare namespace THREE {
  interface Object3D {}
  interface AnimationMixer {}
  interface AnimationAction {}
}
