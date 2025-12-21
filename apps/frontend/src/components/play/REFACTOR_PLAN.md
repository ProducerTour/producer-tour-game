# Animation System Refactor Plan

## Overview

This plan restructures the animation system from a monolithic, flat FSM to an industry-standard hierarchical, layered architecture.

---

## Phase 1: Extract Physics Concerns

**Goal**: Break `PhysicsPlayerController.tsx` (1088 lines) into focused modules.

### Step 1.1: Create `useGroundDetection.ts`

Extract ground detection logic (currently lines 653-726):

```typescript
// src/components/play/hooks/useGroundDetection.ts
interface GroundState {
  isGrounded: boolean;
  groundNormal: Vector3;
  slopeAngle: number;
  groundDistance: number;
  isOnValidSlope: boolean;
}

export function useGroundDetection(
  rigidBody: RapierRigidBody,
  world: RapierWorld
): GroundState {
  // Raycast + slope check logic
  // Returns clean ground state
}
```

### Step 1.2: Create `useAirState.ts`

Extract the `PlayerAirState` machine (currently lines 933-986):

```typescript
// src/components/play/hooks/useAirState.ts
export type AirState = 'grounded' | 'jumping' | 'falling' | 'landing';

interface AirStateResult {
  airState: AirState;
  airTime: number;
  landTime: number;
}

export function useAirState(
  groundState: GroundState,
  velocityY: number,
  jumpRequested: boolean
): AirStateResult {
  // Clean state machine with explicit transitions
  // No timing hacks - just state logic
}
```

### Step 1.3: Create `useCharacterMovement.ts`

Extract movement logic (currently lines 730-846):

```typescript
// src/components/play/hooks/useCharacterMovement.ts
interface MovementInput {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  sprint: boolean;
  crouch: boolean;
}

interface MovementState {
  velocity: Vector3;
  facingAngle: number;
  isMoving: boolean;
  isRunning: boolean;
  isCrouching: boolean;
}

export function useCharacterMovement(
  input: MovementInput,
  groundState: GroundState,
  cameraDirection: Vector3
): MovementState {
  // Movement acceleration/deceleration
  // Returns clean movement state
}
```

### Step 1.4: Slim `PhysicsPlayerController.tsx`

After extraction, the controller becomes a coordinator (~300 lines):

```typescript
export function PhysicsPlayerController({ children, onPositionChange }) {
  const groundState = useGroundDetection(rigidBody, world);
  const airState = useAirState(groundState, velocityY, keys.jump);
  const movement = useCharacterMovement(keys, groundState, cameraDir);

  // Just coordinates hooks and passes state
  return (
    <RigidBody>
      {children(animationInput)}
    </RigidBody>
  );
}
```

---

## Phase 2: Hierarchical State Machine

**Goal**: Replace flat 51-transition FSM with hierarchical sub-machines.

### Step 2.1: Define State Machine Types

```typescript
// src/components/play/animation/types.ts
export type LocomotionState =
  | { type: 'grounded'; subState: GroundedState }
  | { type: 'airborne'; subState: AirborneState }
  | { type: 'landing' };

export type GroundedState = 'idle' | 'walk' | 'run';
export type AirborneState = 'jump' | 'fall';

export type PostureState = 'standing' | 'crouching';
export type WeaponState = 'unarmed' | 'rifle' | 'pistol';
export type AimState = 'hip' | 'aiming';

// Parallel state machines
export interface CharacterState {
  locomotion: LocomotionState;
  posture: PostureState;
  weapon: WeaponState;
  aim: AimState;
  firing: boolean;
}
```

### Step 2.2: Create Sub-Machines

```typescript
// src/components/play/animation/machines/locomotionMachine.ts
export const locomotionMachine = {
  initial: 'grounded',
  states: {
    grounded: {
      initial: 'idle',
      on: {
        JUMP: 'airborne.jump',
        FALL_OFF: 'airborne.fall',
      },
      states: {
        idle: {
          on: { START_MOVING: 'walk' },
        },
        walk: {
          on: {
            STOP_MOVING: 'idle',
            START_RUNNING: 'run',
          },
        },
        run: {
          on: {
            STOP_RUNNING: 'walk',
            STOP_MOVING: 'idle',
          },
        },
      },
    },
    airborne: {
      initial: 'jump',
      on: {
        TOUCH_GROUND: 'landing',
      },
      states: {
        jump: {
          on: { LONG_FALL: 'fall' },
        },
        fall: {},
      },
    },
    landing: {
      after: { 100: 'grounded' },
    },
  },
};
```

### Step 2.3: Create Parallel Machine Coordinator

```typescript
// src/components/play/animation/useHierarchicalFSM.ts
export function useHierarchicalFSM(input: AnimationInput) {
  const locomotion = useLocomotionMachine(input);
  const posture = usePostureMachine(input);
  const weapon = useWeaponMachine(input);
  const aim = useAimMachine(input);

  // Combine parallel states into animation name
  const animationName = deriveAnimationName({
    locomotion: locomotion.value,
    posture: posture.value,
    weapon: weapon.value,
    aim: aim.value,
    firing: input.isFiring,
  });

  return { animationName, states: { locomotion, posture, weapon, aim } };
}
```

### Step 2.4: Animation Name Derivation

```typescript
// src/components/play/animation/deriveAnimationName.ts
export function deriveAnimationName(state: CharacterState): string {
  const { locomotion, posture, weapon, aim, firing } = state;

  // Firing takes highest priority (interrupts other anims)
  if (firing && weapon === 'rifle') {
    if (posture === 'crouching') return 'crouchRapidFireRifle';
    if (locomotion.type === 'grounded' && locomotion.subState !== 'idle') {
      return 'rifleFireWalk';
    }
    return 'rifleFireStill';
  }

  // Airborne states
  if (locomotion.type === 'airborne') {
    if (weapon === 'rifle') return 'rifleJump';
    return locomotion.subState === 'fall' ? 'fall' : 'jump';
  }

  // Landing
  if (locomotion.type === 'landing') {
    return 'idle'; // Or dedicated land animation
  }

  // Grounded locomotion
  const { subState } = locomotion as { type: 'grounded'; subState: GroundedState };

  // Crouching
  if (posture === 'crouching') {
    if (weapon === 'rifle') {
      return subState === 'idle' ? 'crouchRifleIdle' : 'crouchRifleWalk';
    }
    return subState === 'idle' ? 'crouchIdle' : 'crouchWalk';
  }

  // Standing with weapon
  if (weapon === 'rifle') {
    if (aim === 'aiming') {
      return subState === 'idle' ? 'rifleAimIdle' : 'rifleAimWalk';
    }
    return { idle: 'rifleIdle', walk: 'rifleWalk', run: 'rifleRun' }[subState];
  }

  // Unarmed
  return { idle: 'idle', walk: 'walking', run: 'running' }[subState];
}
```

---

## Phase 3: Animation Layers (Future)

**Goal**: Support upper-body aiming overlay on locomotion.

### Step 3.1: Create Layer System

```typescript
// src/components/play/animation/AnimationLayers.tsx
interface LayerConfig {
  name: string;
  mask?: BoneMask;  // Which bones this layer controls
  blendMode: 'override' | 'additive';
  weight: number;
}

export function useAnimationLayers(
  mixer: THREE.AnimationMixer,
  layers: LayerConfig[]
) {
  // Create animation layers with bone masks
  // Upper body layer only affects spine, arms, head
  // Additive layer adds breathing motion
}
```

### Step 3.2: Bone Masks

```typescript
// Upper body mask for aiming
const UPPER_BODY_BONES = [
  'Spine', 'Spine1', 'Spine2',
  'LeftShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand',
  'RightShoulder', 'RightArm', 'RightForeArm', 'RightHand',
  'Neck', 'Head',
];

// This allows:
// - Base layer: Full body walk/run
// - Upper layer: Aim pose (overrides only arms/torso)
// - Result: Running while aiming looks natural
```

---

## Phase 4: Unified Multiplayer State

**Goal**: Same animation state works for local and remote players.

### Step 4.1: Serializable Animation State

```typescript
// src/components/play/animation/types.ts
export interface SerializableAnimationState {
  // Core locomotion (2 bits)
  locomotion: 'idle' | 'walk' | 'run' | 'jump' | 'fall' | 'land';

  // Modifiers (1 bit each)
  crouching: boolean;

  // Weapon (2 bits)
  weapon: 'none' | 'rifle' | 'pistol';

  // Actions (1 bit each)
  aiming: boolean;
  firing: boolean;
}

// Compact serialization for network (1 byte!)
export function serializeAnimState(state: SerializableAnimationState): number {
  let packed = 0;
  packed |= ['idle','walk','run','jump','fall','land'].indexOf(state.locomotion);
  packed |= (state.crouching ? 1 : 0) << 3;
  packed |= ['none','rifle','pistol'].indexOf(state.weapon) << 4;
  packed |= (state.aiming ? 1 : 0) << 6;
  packed |= (state.firing ? 1 : 0) << 7;
  return packed;
}
```

### Step 4.2: Update OtherPlayers Component

```typescript
// OtherPlayers.tsx - receives same state as local player
function RemotePlayer({ state }: { state: SerializableAnimationState }) {
  // Derive animation name same way as local player
  const animationName = deriveAnimationName(state);

  // Same animation logic, consistent behavior
  return <AnimatedAvatar animation={animationName} />;
}
```

---

## Implementation Order

### Week 1: Foundation
1. Create `useGroundDetection.ts`
2. Create `useAirState.ts`
3. Create `useCharacterMovement.ts`
4. Slim down `PhysicsPlayerController.tsx`

### Week 2: State Machine
1. Define hierarchical state machine types
2. Create `locomotionMachine.ts`
3. Create `postureMachine.ts`
4. Create `weaponMachine.ts`
5. Create `useHierarchicalFSM.ts`

### Week 3: Integration
1. Create `deriveAnimationName.ts`
2. Update `MixamoAnimatedAvatar.tsx` to use new system
3. Update `PlayWorld.tsx`
4. Test all animation transitions

### Week 4: Multiplayer
1. Create serializable animation state
2. Update `usePlayMultiplayer.ts`
3. Update `OtherPlayers.tsx`
4. Test multiplayer sync

### Future: Layers
1. Implement bone masks
2. Create animation layers
3. Add upper-body aiming overlay
4. Add additive breathing/reactions

---

## File Structure After Refactor

```
src/components/play/
├── PhysicsPlayerController.tsx     (300 lines, coordinator)
├── PlayWorld.tsx
├── hooks/
│   ├── useGroundDetection.ts       (NEW)
│   ├── useAirState.ts              (NEW)
│   ├── useCharacterMovement.ts     (NEW)
│   ├── useKeyboardControls.ts
│   └── useAnimationLoader.ts
├── animation/
│   ├── types.ts                    (NEW)
│   ├── machines/
│   │   ├── locomotionMachine.ts    (NEW)
│   │   ├── postureMachine.ts       (NEW)
│   │   └── weaponMachine.ts        (NEW)
│   ├── useHierarchicalFSM.ts       (NEW)
│   ├── deriveAnimationName.ts      (NEW)
│   └── AnimationLayers.tsx         (FUTURE)
├── avatars/
│   └── MixamoAnimatedAvatar.tsx    (simplified)
└── multiplayer/
    └── OtherPlayers.tsx            (uses same anim state)
```

---

## Migration Strategy

### Option A: Big Bang (Not Recommended)
- Rewrite everything at once
- Risk: Long development, lots of bugs

### Option B: Parallel System (Recommended)
1. Build new system alongside old
2. Feature flag to switch between them
3. Gradually migrate components
4. Delete old code when stable

```typescript
// Feature flag during migration
const USE_NEW_ANIMATION_SYSTEM = false;

function PhysicsPlayerController() {
  if (USE_NEW_ANIMATION_SYSTEM) {
    return <NewPhysicsController />;
  }
  return <LegacyPhysicsController />;
}
```

---

## Success Metrics

After refactor, you should see:
- [ ] No animation flickering on slopes
- [ ] Consistent jump → run transition
- [ ] Clean separation (each file < 400 lines)
- [ ] Easy to add new animations (modify one sub-machine)
- [ ] Remote players match local animations
- [ ] Upper-body aiming works while moving (future)
