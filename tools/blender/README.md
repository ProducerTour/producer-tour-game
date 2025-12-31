# Blender Asset Preparation Tools

Scripts for preparing Mixamo characters and animations for web game export.

## Quick Start

1. Open Blender (3.x or 4.x)
2. Import your Mixamo FBX file (`File > Import > FBX`)
3. Open the Scripting workspace
4. Click `Open` and load `mixamo_export_prep.py`
5. Click `Run Script`
6. Export as GLB (`File > Export > glTF 2.0`)

## Export Settings

When exporting GLB/GLTF:

| Setting | Value |
|---------|-------|
| Format | glTF Binary (.glb) |
| Include > Limit to | Selected Objects (optional) |
| Transform > +Y Up | Enabled |
| **Transform > Apply Transform** | **ENABLED** (critical!) |
| Animation | Include if needed |
| Compression | DRACO (optional, reduces size) |

## What the Script Does

### 1. Strips Bone Prefixes

Removes `mixamorig:` and `mixamorig` prefixes from all bone names.

**Before:** `mixamorig:Hips`, `mixamorig:Spine`, `mixamorig:LeftArm`
**After:** `Hips`, `Spine`, `LeftArm`

This ensures animations work across different Mixamo exports.

### 2. Removes Scale Tracks

Removes all `.scale` animation tracks that cause character stretching.

Mixamo exports often include scale keyframes that produce unwanted deformation at runtime.

### 3. Removes Root Motion

Removes Hips position tracks that cause character drift during animation loops.

**Exception:** For crouch/kneel animations, the Y (vertical) position is preserved so the character properly lowers.

### 4. Fixes Orientation

Applies -90° X rotation so characters face +Z (Three.js forward direction).

Mixamo characters default to -Y forward, which causes them to walk sideways in Three.js.

### 5. Detects Duplicate Skeletons

Warns if bones with `_1` suffix are found (indicates a dual skeleton export issue).

### 6. Validates Hierarchy

Checks that expected Mixamo bones exist and that Hips is the root bone.

## Usage Modes

### Standard Character/Animation

```python
# In Blender's Python console or script editor:
exec(open("/path/to/mixamo_export_prep.py").read())
main()
```

Or just run the script directly - it calls `main()` automatically.

### Crouch/Kneel Animations

For animations that need vertical position preserved:

```python
exec(open("/path/to/mixamo_export_prep.py").read())
prep_crouch()
```

### Already-Oriented Models

If your model is already facing +Z:

```python
exec(open("/path/to/mixamo_export_prep.py").read())
prep_no_rotation()
```

## Operator Menu

After running the script once, you can access it from:

**Object Menu > Mixamo Export Prep**

This opens a dialog with checkboxes for:
- Apply -90° X Rotation
- Strip Root Motion
- Crouch Animation (preserve Y)

## Troubleshooting

### "No Hips bone found"

The armature doesn't have a standard Mixamo skeleton. Either:
- Re-download from Mixamo
- Manually rename the root bone to "Hips"

### "Dual skeleton detected"

The FBX has duplicate bones (e.g., `Hips` and `Hips_1`). This happens when:
- Multiple characters were imported
- The FBX was re-exported incorrectly

**Fix:**
1. In Edit Mode, select all bones ending in `_1`
2. Delete them (`X > Bones`)
3. Re-run the script

### Character Still Facing Wrong Direction

1. Select the armature
2. In Object Mode: `Ctrl+A > Apply All Transforms`
3. Re-run the script
4. Export with "Apply Transform" enabled

### Animations Don't Play

Bone names don't match. Ensure:
1. Both model and animation have the same bone naming (no prefixes)
2. Animation was exported from the same Mixamo session as the model

## Batch Processing

For processing multiple files:

```python
import bpy
import os

# Path to your FBX files
fbx_dir = "/path/to/mixamo/fbx/"
out_dir = "/path/to/output/glb/"

# Load and run the prep script
exec(open("/path/to/mixamo_export_prep.py").read())

for filename in os.listdir(fbx_dir):
    if not filename.endswith('.fbx'):
        continue

    # Clear scene
    bpy.ops.wm.read_factory_settings(use_empty=True)

    # Import FBX
    bpy.ops.import_scene.fbx(filepath=os.path.join(fbx_dir, filename))

    # Run prep
    prep = MixamoExportPrep()
    prep.run_all()

    # Export GLB
    out_name = filename.replace('.fbx', '.glb')
    bpy.ops.export_scene.gltf(
        filepath=os.path.join(out_dir, out_name),
        export_format='GLB',
        use_selection=False,
        export_apply=True  # Apply transforms
    )

    print(f"Processed: {filename} -> {out_name}")
```

## Validation After Export

Validate your exported GLB:

```bash
npm run validate:assets -- public/assets/your_file.glb
```

This checks:
- Scale (should be 1.5-2m for characters)
- Pivot point (feet at origin)
- Bone naming (no mixamorig prefix)
- Scale tracks (should be none)
- Dual skeleton (no _1 bones)

## File Naming Convention

After export, name files according to project standards:

| Type | Pattern | Example |
|------|---------|---------|
| Character | `{name}.glb` | `swat_operator.glb` |
| Locomotion | `{action}.glb` | `walk.glb`, `run.glb` |
| Weapon Anim | `{weapon}_{action}_{dir}.glb` | `rifle_walk_fwd.glb` |

See `docs/ASSET_STANDARDS.md` for complete naming conventions.
