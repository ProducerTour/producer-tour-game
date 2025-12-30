# AAA Mixamo Animation Pipeline

## The Core Principle: One Skeleton, Many Clips

The **#1 cause of rotation issues** is downloading animations with different skeletons.

### The WRONG Way (causes rotation problems)
```
1. Find random animation on Mixamo
2. Download it with Mixamo's default character
3. Try to use it with your character
4. Animation faces wrong direction = runtime hacks needed
```

### The RIGHT Way (AAA standard)
```
1. Upload YOUR character mesh to Mixamo ONCE
2. Mixamo rigs YOUR character
3. Download ALL animations with YOUR character
4. Every animation has the exact same skeleton = no issues
```

---

## Step-by-Step Workflow

### Step 1: Prepare Your Character Mesh

Export your character from Blender:
- **No armature/skeleton** - just the mesh
- A-pose or T-pose (T-pose preferred)
- FBX format
- Apply all transforms before export

```bash
# In Blender, select mesh only (not armature)
File → Export → FBX
  - Selected Objects: ON
  - Apply Transform: ON
```

### Step 2: Upload to Mixamo

1. Go to [mixamo.com](https://www.mixamo.com)
2. Click "Upload Character"
3. Upload your FBX mesh
4. Follow the auto-rigging wizard (place markers on chin, wrists, elbows, knees, groin)
5. **IMPORTANT**: Once rigged, this becomes your canonical skeleton

### Step 3: Download Your Rigged Character

Before downloading animations, download the rigged character:

1. Select any idle animation (or none)
2. Download settings:
   - **Format**: FBX Binary
   - **Skin**: **With Skin** (this time only!)
   - **Frames**: 1 (just need the rig)
3. This is your `canonical_character.fbx`

### Step 4: Download Animations

For EVERY animation you need:

1. Select the animation on Mixamo
2. Make sure YOUR character is still loaded (not Mixamo's default)
3. Download settings:
   - **Format**: FBX Binary
   - **Skin**: **Without Skin** (animation only)
   - **Frames per Second**: 30
   - **Keyframe Reduction**: None
   - **In Place**: YES (for locomotion)

### Step 5: Convert to GLB

Use the conversion script:

```bash
blender --background --python scripts/blender/pipeline/convert_to_glb.py
```

---

## Mixamo Download Settings Reference

| Animation Type | In Place | With Skin | FPS | Keyframe Reduction |
|---------------|----------|-----------|-----|-------------------|
| Character (once) | N/A | YES | N/A | N/A |
| Idle | YES | NO | 30 | None |
| Walk/Run | YES | NO | 30 | None |
| Jump | YES | NO | 30 | None |
| Crouch | YES | NO | 30 | None |
| Aim (rifle/pistol) | YES | NO | 30 | None |
| Fire | YES | NO | 30 | None |
| Dance | YES | NO | 30 | None |
| Death | NO* | NO | 30 | None |

*Death can have root motion if you want the character to fall

---

## Why This Works

When you download animations with YOUR character:

1. **Same bone names** - `mixamorig:Hips`, `mixamorig:Spine`, etc.
2. **Same bone orientations** - All bones face the same direction
3. **Same rest pose** - The T-pose/A-pose matches exactly
4. **Same forward direction** - All animations face +Z (or whatever your character faces)

When you mix different characters:

1. **Different bone orientations** - Some face +Z, some face +Y
2. **Different rest poses** - Subtle differences accumulate
3. **Rotation drift** - ~57° off becomes common
4. **Runtime hacks needed** - The 88° X-rotation, Y-correction sliders, etc.

---

## Fixing Your Current Setup

If you already have animations from different sources:

### Option A: Re-download Everything (Recommended)
1. Upload your swat_operator mesh to Mixamo
2. Download ALL animations again with that character
3. Convert to GLB
4. Replace existing animations

### Option B: Retarget in Blender
Use the `retarget_to_canonical.py` script to fix existing animations.
This is more work but doesn't require re-downloading.

---

## Scripts in This Directory

| Script | Purpose |
|--------|---------|
| `convert_to_glb.py` | Batch convert FBX animations to GLB |
| `fix_model_orientation.py` | Fix model if it needs 88° rotation |
| `validate_animations.py` | Check which animations face wrong direction |
| `retarget_to_canonical.py` | Retarget animation to match your skeleton |

---

## Common Issues

### "My character needs 88° X rotation"
Your character mesh was authored in a different coordinate system.
Run `fix_model_orientation.py` to bake the rotation into the mesh.

### "Some animations face the wrong direction"
Those animations came from a different skeleton.
Either re-download with your character, or use `retarget_to_canonical.py`.

### "Animations work but crouch doesn't lower"
The Hips position track is being stripped. Check that crouch animations
preserve Hips position in `AnimationClipPool.ts`.

### "Character slides during walk/run"
Root motion is leaking through. Make sure:
1. Downloaded with "In Place" checked
2. Hips position is stripped (except for crouch)

---

## The Golden Rule

> **One character mesh → One skeleton → All animations**
>
> If you follow this rule, you will never need runtime rotation hacks.
