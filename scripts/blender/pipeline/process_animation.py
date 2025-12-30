"""
process_animation.py

Processes a single Mixamo animation with the AAA pipeline:
1. Import FBX/GLB
2. Apply Mixamo Converter (if available) for rig fixes
3. Apply Y-correction to Hips bone if specified
4. Strip root motion (Hips position) unless preserving for crouch
5. Strip scale tracks (Mixamo glitch prevention)
6. Export clean GLB

Usage:
    blender --background --python scripts/blender/pipeline/process_animation.py -- \
        --input path/to/animation.fbx \
        --output path/to/output.glb \
        --y-correction -57 \
        --preserve-hips-position

Arguments:
    --input              Input FBX or GLB file
    --output             Output GLB file
    --y-correction       Y-axis rotation correction in degrees (default: 0)
    --preserve-hips-position  Keep Hips position tracks (for crouch animations)
    --preserve-hips-rotation  Keep Hips rotation tracks (usually needed)
"""

import bpy
import math
import sys
import argparse
from pathlib import Path
from mathutils import Quaternion, Euler

# Parse arguments after --
def parse_args():
    argv = sys.argv
    argv = argv[argv.index("--") + 1:] if "--" in argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, help="Input animation file")
    parser.add_argument("--output", required=True, help="Output GLB file")
    parser.add_argument("--y-correction", type=float, default=0, help="Y-axis rotation in degrees")
    parser.add_argument("--preserve-hips-position", action="store_true", help="Keep Hips position tracks")
    parser.add_argument("--preserve-hips-rotation", action="store_true", default=True, help="Keep Hips rotation tracks")
    return parser.parse_args(argv)


def clear_scene():
    """Clear all objects from the scene."""
    bpy.ops.wm.read_factory_settings(use_empty=True)


def import_animation(filepath):
    """Import animation file (FBX or GLB)."""
    filepath = Path(filepath)
    ext = filepath.suffix.lower()

    print(f"Importing: {filepath}")

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
    """Find the armature object."""
    for obj in bpy.context.scene.objects:
        if obj.type == 'ARMATURE':
            return obj
    return None


def try_mixamo_converter(armature):
    """
    Attempt to use Mixamo Converter addon if available.
    This handles rig orientation and bone naming automatically.
    """
    try:
        # Check if addon is available
        if hasattr(bpy.ops, 'mixamo') and hasattr(bpy.ops.mixamo, 'convert'):
            print("Mixamo Converter addon detected, applying...")

            bpy.ops.object.select_all(action='DESELECT')
            armature.select_set(True)
            bpy.context.view_layer.objects.active = armature

            # Run converter
            bpy.ops.mixamo.convert()
            print("Mixamo Converter applied successfully")
            return True
    except Exception as e:
        print(f"Mixamo Converter not available or failed: {e}")

    return False


def find_hips_fcurves(action):
    """Find all fcurves related to Hips bone."""
    hips_patterns = [
        'Hips', 'mixamorig:Hips', 'mixamorig1:Hips', 'mixamorig2:Hips',
        'mixamorigHips', 'mixamorigHips_1'
    ]

    hips_fcurves = {
        'position': {},  # index -> fcurve
        'rotation': {},  # index -> fcurve
        'scale': {},     # index -> fcurve
    }

    for fcurve in action.fcurves:
        data_path = fcurve.data_path

        # Check if this is a Hips bone track
        is_hips = any(pattern in data_path for pattern in hips_patterns)
        if not is_hips:
            continue

        if '.location' in data_path:
            hips_fcurves['position'][fcurve.array_index] = fcurve
        elif '.rotation_quaternion' in data_path:
            hips_fcurves['rotation'][fcurve.array_index] = fcurve
        elif '.scale' in data_path:
            hips_fcurves['scale'][fcurve.array_index] = fcurve

    return hips_fcurves


def apply_y_correction(action, correction_deg):
    """
    Apply Y-axis rotation correction to Hips quaternion keyframes.
    This bakes the correction into the animation data.
    """
    if abs(correction_deg) < 0.1:
        print("No Y-correction needed")
        return

    print(f"Applying Y-correction: {correction_deg}°")

    # Create correction quaternion
    correction_quat = Euler((0, math.radians(correction_deg), 0), 'XYZ').to_quaternion()

    hips_fcurves = find_hips_fcurves(action)
    quat_curves = hips_fcurves['rotation']

    if len(quat_curves) != 4:
        print(f"WARNING: Expected 4 quaternion channels, found {len(quat_curves)}")
        return

    # Get number of keyframes
    num_keyframes = len(quat_curves[0].keyframe_points)
    print(f"Processing {num_keyframes} keyframes...")

    for i in range(num_keyframes):
        # Read current quaternion (W, X, Y, Z order in Blender)
        w = quat_curves[0].keyframe_points[i].co[1]
        x = quat_curves[1].keyframe_points[i].co[1]
        y = quat_curves[2].keyframe_points[i].co[1]
        z = quat_curves[3].keyframe_points[i].co[1]

        original = Quaternion((w, x, y, z))

        # Pre-multiply correction: corrected = correction @ original
        corrected = correction_quat @ original

        # Write back
        quat_curves[0].keyframe_points[i].co[1] = corrected.w
        quat_curves[1].keyframe_points[i].co[1] = corrected.x
        quat_curves[2].keyframe_points[i].co[1] = corrected.y
        quat_curves[3].keyframe_points[i].co[1] = corrected.z

    # Update fcurves
    for fcurve in quat_curves.values():
        fcurve.update()

    print(f"Y-correction applied to {num_keyframes} keyframes")


def strip_tracks(action, preserve_hips_position=False, preserve_hips_rotation=True):
    """
    Strip unwanted tracks from the animation:
    - Hips position (unless preserve_hips_position)
    - All scale tracks (Mixamo glitch prevention)
    """
    hips_fcurves = find_hips_fcurves(action)
    fcurves_to_remove = []

    # Strip Hips position tracks
    if not preserve_hips_position:
        for fcurve in hips_fcurves['position'].values():
            fcurves_to_remove.append(fcurve)
            print(f"Stripping: {fcurve.data_path}[{fcurve.array_index}]")

    # Strip scale tracks (all bones)
    for fcurve in action.fcurves:
        if '.scale' in fcurve.data_path:
            fcurves_to_remove.append(fcurve)

    # Remove the fcurves
    for fcurve in fcurves_to_remove:
        try:
            action.fcurves.remove(fcurve)
        except:
            pass  # May already be removed

    print(f"Stripped {len(fcurves_to_remove)} tracks")


def export_animation(filepath, armature):
    """Export processed animation as GLB."""
    filepath = Path(filepath)
    filepath.parent.mkdir(parents=True, exist_ok=True)

    print(f"Exporting: {filepath}")

    # Select only armature for export
    bpy.ops.object.select_all(action='DESELECT')
    armature.select_set(True)
    bpy.context.view_layer.objects.active = armature

    bpy.ops.export_scene.gltf(
        filepath=str(filepath),
        export_format='GLB',
        use_selection=True,  # Only export selected (armature)
        export_animations=True,
        export_apply=True,
        export_skins=False,  # Animation only, no mesh
        export_def_bones=True,
        export_nla_strips=False,
        export_force_sampling=True,
    )

    print(f"Exported: {filepath}")


def main():
    args = parse_args()

    print("=" * 60)
    print("PROCESS ANIMATION")
    print("=" * 60)
    print(f"Input: {args.input}")
    print(f"Output: {args.output}")
    print(f"Y-correction: {args.y_correction}°")
    print(f"Preserve Hips position: {args.preserve_hips_position}")
    print(f"Preserve Hips rotation: {args.preserve_hips_rotation}")
    print("=" * 60)

    # Clear and import
    clear_scene()
    import_animation(args.input)

    # Find armature
    armature = find_armature()
    if not armature:
        print("ERROR: No armature found")
        return

    print(f"Found armature: {armature.name}")

    # Try Mixamo Converter addon
    try_mixamo_converter(armature)

    # Get animation action
    if not armature.animation_data or not armature.animation_data.action:
        print("ERROR: No animation data found")
        return

    action = armature.animation_data.action
    print(f"Action: {action.name}")
    print(f"Frame range: {action.frame_range}")

    # Apply Y-correction
    apply_y_correction(action, args.y_correction)

    # Strip unwanted tracks
    strip_tracks(
        action,
        preserve_hips_position=args.preserve_hips_position,
        preserve_hips_rotation=args.preserve_hips_rotation
    )

    # Export
    export_animation(args.output, armature)

    print("=" * 60)
    print("DONE")
    print("=" * 60)


if __name__ == "__main__":
    main()
