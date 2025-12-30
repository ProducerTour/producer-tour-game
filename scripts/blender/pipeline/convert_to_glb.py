"""
convert_to_glb.py

Simple FBX to GLB conversion for animations downloaded from Mixamo.
Assumes all animations were downloaded with the SAME character skeleton.

Usage:
    blender --background --python scripts/blender/pipeline/convert_to_glb.py

Place your FBX files in: animations/raw/
Output GLB files go to: animations/

Example:
    animations/raw/Walking.fbx → animations/walking.glb
    animations/raw/Rifle Aiming Idle.fbx → animations/rifle_aiming_idle.glb
"""

import bpy
import os
from pathlib import Path

# Configuration
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent.parent
ANIMATIONS_DIR = PROJECT_ROOT / "apps" / "frontend" / "public" / "animations"
RAW_DIR = ANIMATIONS_DIR / "raw"


def clear_scene():
    """Clear all objects from scene."""
    bpy.ops.wm.read_factory_settings(use_empty=True)


def import_fbx(filepath):
    """Import FBX file."""
    print(f"  Importing: {filepath.name}")
    bpy.ops.import_scene.fbx(
        filepath=str(filepath),
        use_anim=True,
        ignore_leaf_bones=True,
        automatic_bone_orientation=False,
    )


def find_armature():
    """Find armature in scene."""
    for obj in bpy.context.scene.objects:
        if obj.type == 'ARMATURE':
            return obj
    return None


def strip_root_motion(action, keep_hips_y=False):
    """
    Strip root motion from animation.
    Removes Hips position tracks (optionally keeps Y for crouch).
    Removes all scale tracks.
    """
    to_remove = []

    for fcurve in action.fcurves:
        path = fcurve.data_path.lower()

        # Remove scale tracks (Mixamo exports have glitchy scale)
        if '.scale' in path:
            to_remove.append(fcurve)
            continue

        # Remove Hips position (prevents character drift)
        if 'hips' in path and '.location' in path:
            # Optionally keep Y position for crouch animations
            if keep_hips_y and fcurve.array_index == 1:  # Y is index 1
                continue
            to_remove.append(fcurve)

    for fcurve in to_remove:
        try:
            action.fcurves.remove(fcurve)
        except:
            pass

    return len(to_remove)


def export_glb(filepath, armature):
    """Export as GLB (animation only, no mesh)."""
    filepath.parent.mkdir(parents=True, exist_ok=True)

    # Select armature
    bpy.ops.object.select_all(action='DESELECT')
    armature.select_set(True)
    bpy.context.view_layer.objects.active = armature

    bpy.ops.export_scene.gltf(
        filepath=str(filepath),
        export_format='GLB',
        use_selection=True,
        export_animations=True,
        export_apply=True,
        export_skins=False,  # Animation only
        export_def_bones=True,
        export_nla_strips=False,
        export_force_sampling=True,
    )


def sanitize_name(name):
    """Convert filename to snake_case."""
    # Remove extension
    name = Path(name).stem
    # Replace spaces and dashes with underscores
    name = name.replace(' ', '_').replace('-', '_')
    # Lowercase
    name = name.lower()
    # Remove double underscores
    while '__' in name:
        name = name.replace('__', '_')
    return name


def is_crouch_animation(name):
    """Check if animation is a crouch type (needs Hips Y preserved)."""
    name = name.lower()
    return 'crouch' in name or 'kneel' in name


def process_file(input_path):
    """Process a single FBX file."""
    output_name = sanitize_name(input_path.name) + '.glb'
    output_path = ANIMATIONS_DIR / output_name

    # Skip if already exists
    if output_path.exists():
        print(f"  SKIP (exists): {output_name}")
        return True

    clear_scene()
    import_fbx(input_path)

    armature = find_armature()
    if not armature:
        print(f"  ERROR: No armature found")
        return False

    if not armature.animation_data or not armature.animation_data.action:
        print(f"  ERROR: No animation data")
        return False

    action = armature.animation_data.action

    # Strip root motion (keep Hips Y for crouch animations)
    keep_y = is_crouch_animation(input_path.name)
    stripped = strip_root_motion(action, keep_hips_y=keep_y)

    # Export
    export_glb(output_path, armature)
    print(f"  OK: {output_name} (stripped {stripped} tracks)")

    return True


def main():
    print("=" * 60)
    print("CONVERT FBX TO GLB")
    print("=" * 60)
    print(f"\nInput dir: {RAW_DIR}")
    print(f"Output dir: {ANIMATIONS_DIR}")

    # Create raw directory if needed
    if not RAW_DIR.exists():
        RAW_DIR.mkdir(parents=True)
        print(f"\nCreated: {RAW_DIR}")
        print("Place your Mixamo FBX files there and run again.")
        return

    # Find FBX files
    fbx_files = sorted(RAW_DIR.glob("*.fbx"))

    if not fbx_files:
        print(f"\nNo FBX files found in {RAW_DIR}")
        print("Place your Mixamo FBX files there and run again.")
        return

    print(f"\nFound {len(fbx_files)} FBX files\n")

    success = 0
    failed = 0

    for fbx_path in fbx_files:
        print(f"\nProcessing: {fbx_path.name}")
        if process_file(fbx_path):
            success += 1
        else:
            failed += 1

    print("\n" + "=" * 60)
    print(f"DONE: {success} converted, {failed} failed")
    print("=" * 60)


if __name__ == "__main__":
    main()
