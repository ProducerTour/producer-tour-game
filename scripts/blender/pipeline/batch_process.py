"""
batch_process.py

Batch processes all animations through the AAA pipeline.
Uses the correction values identified by validate_animations.py.

Usage:
    blender --background --python scripts/blender/pipeline/batch_process.py

This script will:
1. Process all raw FBX files in animations/raw/
2. Apply known Y-corrections
3. Strip root motion and scale tracks
4. Export to animations/ directory
"""

import bpy
import math
import os
import subprocess
import sys
from pathlib import Path
from mathutils import Quaternion, Euler

# Configuration
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent.parent
ANIMATIONS_DIR = PROJECT_ROOT / "apps" / "frontend" / "public" / "animations"
RAW_DIR = ANIMATIONS_DIR / "raw"  # Put raw FBX files here

# Known Y-axis corrections (degrees)
# Run validate_animations.py first to identify these
ANIMATION_CORRECTIONS = {
    # Locomotion - usually correct
    'idle': 0,
    'walking': 0,
    'running': 0,
    'jump': 0,

    # Rifle aim animations - commonly misoriented
    'rifle_aim_idle': -57,
    'rifle_aim_walk': -57,

    # Add more as identified by validation script
    # 'animation_name': correction_degrees,
}

# Animations that need Hips position preserved (for crouching effect)
PRESERVE_HIPS_POSITION = {
    'crouch_idle',
    'crouch_walk',
    'crouch_strafe_left',
    'crouch_strafe_right',
    'crouch_rifle_idle',
    'crouch_rifle_walk',
    'crouch_pistol_idle',
    'crouch_pistol_walk',
    'stand_to_crouch',
    'crouch_to_stand',
    'crouch_to_sprint',
}


def clear_scene():
    """Clear all objects from the scene."""
    bpy.ops.wm.read_factory_settings(use_empty=True)


def import_animation(filepath):
    """Import animation file."""
    filepath = Path(filepath)
    ext = filepath.suffix.lower()

    if ext == '.fbx':
        bpy.ops.import_scene.fbx(
            filepath=str(filepath),
            use_anim=True,
            ignore_leaf_bones=True,
            automatic_bone_orientation=False,
        )
    elif ext in ['.glb', '.gltf']:
        bpy.ops.import_scene.gltf(filepath=str(filepath))
    else:
        raise ValueError(f"Unsupported format: {ext}")


def find_armature():
    """Find armature object."""
    for obj in bpy.context.scene.objects:
        if obj.type == 'ARMATURE':
            return obj
    return None


def try_mixamo_converter(armature):
    """Try to use Mixamo Converter addon."""
    try:
        if hasattr(bpy.ops, 'mixamo') and hasattr(bpy.ops.mixamo, 'convert'):
            bpy.ops.object.select_all(action='DESELECT')
            armature.select_set(True)
            bpy.context.view_layer.objects.active = armature
            bpy.ops.mixamo.convert()
            return True
    except:
        pass
    return False


def find_hips_fcurves(action):
    """Find Hips-related fcurves."""
    hips_patterns = ['Hips', 'mixamorig:Hips', 'mixamorig1:Hips', 'mixamorigHips']

    result = {'position': {}, 'rotation': {}, 'scale': {}}

    for fcurve in action.fcurves:
        path = fcurve.data_path
        is_hips = any(p in path for p in hips_patterns)
        if not is_hips:
            continue

        if '.location' in path:
            result['position'][fcurve.array_index] = fcurve
        elif '.rotation_quaternion' in path:
            result['rotation'][fcurve.array_index] = fcurve
        elif '.scale' in path:
            result['scale'][fcurve.array_index] = fcurve

    return result


def apply_y_correction(action, correction_deg):
    """Apply Y-axis rotation correction."""
    if abs(correction_deg) < 0.1:
        return

    correction_quat = Euler((0, math.radians(correction_deg), 0), 'XYZ').to_quaternion()
    hips = find_hips_fcurves(action)
    quat = hips['rotation']

    if len(quat) != 4:
        print(f"  WARNING: Cannot apply Y-correction (found {len(quat)} quat channels)")
        return

    num_kf = len(quat[0].keyframe_points)

    for i in range(num_kf):
        w = quat[0].keyframe_points[i].co[1]
        x = quat[1].keyframe_points[i].co[1]
        y = quat[2].keyframe_points[i].co[1]
        z = quat[3].keyframe_points[i].co[1]

        original = Quaternion((w, x, y, z))
        corrected = correction_quat @ original

        quat[0].keyframe_points[i].co[1] = corrected.w
        quat[1].keyframe_points[i].co[1] = corrected.x
        quat[2].keyframe_points[i].co[1] = corrected.y
        quat[3].keyframe_points[i].co[1] = corrected.z

    for fc in quat.values():
        fc.update()

    print(f"  Applied Y-correction: {correction_deg}° to {num_kf} keyframes")


def strip_tracks(action, preserve_hips_pos=False):
    """Strip root motion and scale tracks."""
    hips = find_hips_fcurves(action)
    to_remove = []

    # Strip Hips position (unless preserving)
    if not preserve_hips_pos:
        to_remove.extend(hips['position'].values())

    # Strip all scale tracks
    for fc in action.fcurves:
        if '.scale' in fc.data_path:
            to_remove.append(fc)

    for fc in to_remove:
        try:
            action.fcurves.remove(fc)
        except:
            pass

    print(f"  Stripped {len(to_remove)} tracks")


def export_animation(filepath, armature):
    """Export as GLB."""
    filepath = Path(filepath)
    filepath.parent.mkdir(parents=True, exist_ok=True)

    bpy.ops.object.select_all(action='DESELECT')
    armature.select_set(True)
    bpy.context.view_layer.objects.active = armature

    bpy.ops.export_scene.gltf(
        filepath=str(filepath),
        export_format='GLB',
        use_selection=True,
        export_animations=True,
        export_apply=True,
        export_skins=False,
        export_def_bones=True,
        export_nla_strips=False,
        export_force_sampling=True,
    )


def process_animation(input_path, output_path, correction=0, preserve_hips_pos=False):
    """Process a single animation."""
    print(f"\nProcessing: {input_path.name}")

    clear_scene()
    import_animation(input_path)

    armature = find_armature()
    if not armature:
        print("  ERROR: No armature")
        return False

    try_mixamo_converter(armature)

    if not armature.animation_data or not armature.animation_data.action:
        print("  ERROR: No animation data")
        return False

    action = armature.animation_data.action

    # Apply corrections
    if correction != 0:
        apply_y_correction(action, correction)

    strip_tracks(action, preserve_hips_pos)

    # Export
    export_animation(output_path, armature)
    print(f"  Exported: {output_path.name}")

    return True


def get_anim_key(filename):
    """Convert filename to animation key (for looking up corrections)."""
    # Remove extension and convert to snake_case key
    stem = Path(filename).stem.lower()
    # Handle common naming variations
    stem = stem.replace('-', '_').replace(' ', '_')
    return stem


def main():
    print("=" * 70)
    print("BATCH ANIMATION PROCESSING")
    print("=" * 70)
    print(f"\nRaw input dir: {RAW_DIR}")
    print(f"Output dir: {ANIMATIONS_DIR}")

    # Create raw directory if needed
    if not RAW_DIR.exists():
        RAW_DIR.mkdir(parents=True)
        print(f"\nCreated raw directory: {RAW_DIR}")
        print("Place your raw Mixamo FBX files there and run again.")
        return

    # Find input files
    input_files = list(RAW_DIR.glob("*.fbx")) + list(RAW_DIR.glob("*.glb"))
    input_files = sorted(input_files)

    if not input_files:
        print(f"\nNo FBX/GLB files found in {RAW_DIR}")
        print("Place your raw Mixamo FBX files there and run again.")
        return

    print(f"\nFound {len(input_files)} files to process")

    success = 0
    failed = 0

    for input_path in input_files:
        # Determine output path
        output_name = input_path.stem.lower().replace('-', '_').replace(' ', '_') + '.glb'
        output_path = ANIMATIONS_DIR / output_name

        # Look up correction
        anim_key = get_anim_key(input_path.name)
        correction = ANIMATION_CORRECTIONS.get(anim_key, 0)
        preserve_hips = anim_key in PRESERVE_HIPS_POSITION

        if process_animation(input_path, output_path, correction, preserve_hips):
            success += 1
        else:
            failed += 1

    print("\n" + "=" * 70)
    print("SUMMARY")
    print("=" * 70)
    print(f"Success: {success}")
    print(f"Failed: {failed}")

    if success > 0:
        print("\nNext steps:")
        print("1. Verify animations in-game")
        print("2. Run validate_animations.py to check orientations")
        print("3. Add any new corrections to ANIMATION_CORRECTIONS dict")


if __name__ == "__main__":
    main()
