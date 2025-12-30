# Animation Pipeline

Adding Mixamo animations to the game.

## TL;DR

```bash
# 1. Install converter (once)
npm install -g fbx2gltf

# 2. Convert FBX to GLB
FBX2GLTF="$(npm root -g)/fbx2gltf/bin/Darwin/FBX2glTF"
"$FBX2GLTF" -i "input.fbx" -o "output.glb" --binary

# 3. Verify output has 53 channels
npx @gltf-transform/cli inspect output.glb
```

---

## The Golden Rule

**Always use FBX2glTF to convert animations.**

| Tool | Channels | Result |
|------|----------|--------|
| FBX2glTF | 53 | Works correctly |
| Blender | 195 | Broken/distorted character |

---

## Step-by-Step Guide

### 1. Download from Mixamo

1. Go to [mixamo.com](https://www.mixamo.com)
2. Pick any character (we only use the animation data)
3. Select your animation
4. Download settings:
   - **Format**: FBX Binary
   - **Skin**: Without Skin
   - **FPS**: 30
   - **Keyframe Reduction**: none

### 2. Convert to GLB

```bash
# Set up the converter path
FBX2GLTF="$(npm root -g)/fbx2gltf/bin/Darwin/FBX2glTF"

# Convert
"$FBX2GLTF" -i "path/to/Animation.fbx" -o "apps/frontend/public/assets/animations/locomotion/animation_name.glb" --binary
```

### 3. Verify the Output

```bash
npx @gltf-transform/cli inspect apps/frontend/public/assets/animations/locomotion/animation_name.glb
```

You should see **53 channels**:
```
ANIMATIONS
┌───┬────────────┬──────────┐
│ # │ name       │ channels │
├───┼────────────┼──────────┤
│ 0 │ mixamo.com │ 53       │  ← Correct!
└───┴────────────┴──────────┘
```

If you see 195 channels, you used Blender. Re-convert with FBX2glTF.

### 4. Register the Animation

Edit `apps/frontend/src/components/play/animation/AnimationRegistry.ts`:

```typescript
// 1. Add to type
export type LocomotionAnimation =
  | 'idle'
  | 'walk'
  | 'myNewAnimation';  // ← Add here

// 2. Add config
export const ANIMATIONS = {
  // ...existing
  myNewAnimation: {
    url: locomotion('my_new_animation.glb'),
    loop: true,
    fadeTime: 0.2
  },
};

// 3. Update state machine (if needed)
export function getAnimationForState(state: AnimationState): AnimationName {
  if (state.someCondition) return 'myNewAnimation';
  // ...
}
```

---

## File Organization

```
apps/frontend/public/
├── animations/                    # Source FBX files (git-ignored, not served)
│   ├── Male Locomotion Pack/
│   ├── Rifle 8-Way Locomotion Pack 3/
│   └── Pistol_Handgun Locomotion Pack 3/
│
└── assets/animations/             # Converted GLB files (served to browser)
    ├── locomotion/               # Unarmed: idle, walk, run, jump, strafe, turn
    ├── rifle/                    # Rifle: idle, walk, run, crouch, aim, death
    └── pistol/                   # Pistol: idle, walk, run, kneel, jump
```

---

## Naming Conventions

| Type | File Name | Code Name |
|------|-----------|-----------|
| Files | `snake_case.glb` | `camelCase` |
| Weapon prefix | `rifle_`, `pistol_` | `rifle`, `pistol` |
| Direction suffix | `_fwd`, `_back`, `_left`, `_right` | `Fwd`, `Back`, `Left`, `Right` |

Examples:
- `rifle_walk_fwd.glb` → `rifleWalkFwd`
- `pistol_run_back_left.glb` → `pistolRunBackLeft`

---

## Animation Config Options

```typescript
// Standard looping animation
{ url: locomotion('walk.glb'), loop: true, fadeTime: 0.2 }

// Fast transition (running/sprinting)
{ url: rifle('rifle_run_fwd.glb'), loop: true, fadeTime: 0.15 }

// One-shot animation (jump, death)
{ url: locomotion('jump.glb'), loop: false, fadeTime: 0.1, clamp: true }
```

---

## Batch Conversion

For multiple files:

```bash
FBX2GLTF="$(npm root -g)/fbx2gltf/bin/Darwin/FBX2glTF"
SRC="apps/frontend/public/animations/Male Locomotion Pack"
DST="apps/frontend/public/assets/animations/locomotion"

"$FBX2GLTF" -i "$SRC/idle.fbx" -o "$DST/idle.glb" --binary
"$FBX2GLTF" -i "$SRC/walking.fbx" -o "$DST/walk.glb" --binary
"$FBX2GLTF" -i "$SRC/standard run.fbx" -o "$DST/run.glb" --binary
"$FBX2GLTF" -i "$SRC/jump.fbx" -o "$DST/jump.glb" --binary
```

---

## Platform Paths

| OS | FBX2glTF Path |
|----|---------------|
| macOS | `$(npm root -g)/fbx2gltf/bin/Darwin/FBX2glTF` |
| Linux | `$(npm root -g)/fbx2gltf/bin/Linux/FBX2glTF` |
| Windows | `$(npm root -g)/fbx2gltf/bin/Windows_NT/FBX2glTF.exe` |

---

## Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| Character stretched/fragmented | Converted with Blender (195 channels) | Re-convert with FBX2glTF |
| Character drifts during animation | Root motion in animation | `stripRootMotion()` handles this |
| Animation doesn't play | 404 or missing registry entry | Check console, verify path and registry |
| Wrong animation plays | State machine logic | Debug `getAnimationForState()` |
