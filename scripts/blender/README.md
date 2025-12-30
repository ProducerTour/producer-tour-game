# Animation Pipeline Guide

How to add new Mixamo animations to the project.

## Quick Reference

```bash
# Convert a single FBX to GLB (RECOMMENDED)
FBX2GLTF="$(npm root -g)/fbx2gltf/bin/Darwin/FBX2glTF"
"$FBX2GLTF" -i input.fbx -o output.glb --binary

# Inspect a GLB file
npx @gltf-transform/cli inspect path/to/animation.glb
```

## Step 1: Download from Mixamo

1. Go to [mixamo.com](https://www.mixamo.com)
2. Select any character (doesn't matter which - we only use the animation)
3. Find and select your animation
4. Configure settings:
   - **Format**: FBX Binary
   - **Skin**: Without Skin (animation only)
   - **Frames per Second**: 30
   - **Keyframe Reduction**: none
5. Download

## Step 2: Organize Source Files

Place downloaded FBX files in the appropriate source folder:

```
apps/frontend/public/animations/
├── Male Locomotion Pack/              # Unarmed movement
├── Rifle 8-Way Locomotion Pack 3/     # Rifle animations
├── Pistol_Handgun Locomotion Pack 3/  # Pistol animations
└── new animations/                    # Staging area for new animations
```

## Step 3: Convert FBX to GLB

### IMPORTANT: Use FBX2glTF (not Blender)

FBX2glTF produces the correct format (53 channels, rotation-only tracks).
Blender produces 195 channels which causes visual issues.

### Install FBX2glTF

```bash
npm install -g fbx2gltf
```

### Single File Conversion

```bash
FBX2GLTF="$(npm root -g)/fbx2gltf/bin/Darwin/FBX2glTF"

"$FBX2GLTF" -i "path/to/Animation.fbx" -o "path/to/animation.glb" --binary
```

### Batch Conversion Example

```bash
FBX2GLTF="$(npm root -g)/fbx2gltf/bin/Darwin/FBX2glTF"
SOURCE="apps/frontend/public/animations/Male Locomotion Pack"
DEST="apps/frontend/public/assets/animations/locomotion"

"$FBX2GLTF" -i "$SOURCE/idle.fbx" -o "$DEST/idle.glb" --binary
"$FBX2GLTF" -i "$SOURCE/walking.fbx" -o "$DEST/walk.glb" --binary
"$FBX2GLTF" -i "$SOURCE/standard run.fbx" -o "$DEST/run.glb" --binary
# ... etc
```

### Blender (Alternative - Not Recommended)

Blender produces a different output format. Only use if FBX2glTF fails:

```bash
blender --background --python scripts/blender/convert_single_fbx.py -- input.fbx output.glb
```

## Step 4: Add to AnimationRegistry

Edit `apps/frontend/src/components/play/animation/AnimationRegistry.ts`:

### 4a. Add the type

```typescript
// Add to the appropriate type union
export type LocomotionAnimation =
  | 'idle'
  | 'walk'
  // ... existing
  | 'newAnimation';  // Add here
```

### 4b. Add the config

```typescript
export const ANIMATIONS: Record<AnimationName, AnimationConfig> = {
  // ... existing animations

  newAnimation: {
    url: locomotion('new_animation.glb'),  // or rifle(), pistol()
    loop: true,      // true for looping, false for one-shot
    fadeTime: 0.2,   // transition time in seconds
    clamp: false,    // true to hold last frame (for one-shot anims)
  },
};
```

### 4c. Update state machine (if needed)

If the animation should play automatically based on player state, update `getAnimationForState()`:

```typescript
export function getAnimationForState(state: AnimationState): AnimationName {
  // Add your logic here
  if (state.someCondition) return 'newAnimation';
  // ...
}
```

## Step 5: Verify

```bash
# Check the GLB structure
npx @gltf-transform/cli inspect apps/frontend/public/assets/animations/locomotion/new_animation.glb
```

Expected output for a working animation:
```
ANIMATIONS
┌───┬────────────┬──────────┬──────────┐
│ # │ name       │ channels │ duration │
├───┼────────────┼──────────┼──────────┤
│ 0 │ mixamo.com │ 53       │ X.XX     │  <-- 53 channels = correct format
└───┴────────────┴──────────┴──────────┘
```

**If you see 195 channels instead of 53, the animation was converted with Blender and may cause visual issues. Re-convert with FBX2glTF.**

## Animation Categories

| Category | Folder | Helper | Use Case |
|----------|--------|--------|----------|
| Locomotion | `/assets/animations/locomotion/` | `locomotion()` | Unarmed movement |
| Rifle | `/assets/animations/rifle/` | `rifle()` | Rifle weapon states |
| Pistol | `/assets/animations/pistol/` | `pistol()` | Pistol weapon states |

## Naming Conventions

- Use `snake_case` for file names: `rifle_walk_fwd.glb`
- Use `camelCase` for animation names in code: `rifleWalkFwd`
- Prefix with weapon type: `rifle_`, `pistol_`
- Suffix with direction: `_fwd`, `_back`, `_left`, `_right`
- Compound directions: `_fwd_left`, `_back_right`

## Common Animation Configs

```typescript
// Looping movement
{ url: '...', loop: true, fadeTime: 0.2 }

// Fast transition (running, sprinting)
{ url: '...', loop: true, fadeTime: 0.15 }

// One-shot (jump, death)
{ url: '...', loop: false, fadeTime: 0.1, clamp: true }

// Slow transition (crouch)
{ url: '...', loop: true, fadeTime: 0.25 }
```

## Troubleshooting

### Character is stretched/fragmented
- Animation was converted with Blender (195 channels)
- Re-convert using FBX2glTF (should produce 53 channels)

### Character drifts during animation
- Animation has root motion (Hips position tracks)
- The `stripRootMotion()` function in CharacterRenderer.tsx handles this

### Animation doesn't play
- Check browser console for 404 errors
- Verify the file exists at the correct path
- Check the animation name matches in `AnimationRegistry.ts`

### Wrong animation plays
- Check `getAnimationForState()` logic
- Add console.log to debug which animation is being selected

## File Structure Reference

```
apps/frontend/
├── public/
│   ├── animations/                    # Source FBX files (not served)
│   │   ├── Male Locomotion Pack/
│   │   ├── Rifle 8-Way Locomotion Pack 3/
│   │   └── Pistol_Handgun Locomotion Pack 3/
│   └── assets/
│       └── animations/                # Converted GLB files (served)
│           ├── locomotion/
│           ├── rifle/
│           └── pistol/
└── src/components/play/animation/
    ├── AnimationRegistry.ts           # Animation configs & state machine
    └── CharacterRenderer.tsx          # Renders animated character
```

## Platform-Specific FBX2glTF Paths

- **macOS**: `$(npm root -g)/fbx2gltf/bin/Darwin/FBX2glTF`
- **Linux**: `$(npm root -g)/fbx2gltf/bin/Linux/FBX2glTF`
- **Windows**: `$(npm root -g)/fbx2gltf/bin/Windows_NT/FBX2glTF.exe`
