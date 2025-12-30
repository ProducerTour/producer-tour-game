"""
Convert FBX animations to GLB format

Simple conversion without any track stripping - preserves original animation data.

Usage:
    blender --background --python scripts/blender/convert_fbx_to_glb.py
"""

import bpy
import os
import sys

# Source and destination paths
SOURCE_DIR = "/Users/nolangriffis/Documents/producer-tour-play/apps/frontend/public/animations/Male Locomotion Pack"
DEST_DIR = "/Users/nolangriffis/Documents/producer-tour-play/apps/frontend/public/assets/animations/locomotion"

# Mapping from FBX filename to GLB filename
FILE_MAPPING = {
    "idle.fbx": "idle.glb",
    "walking.fbx": "walk.glb",
    "standard run.fbx": "run.glb",
    "jump.fbx": "jump.glb",
    "left strafe.fbx": "strafe_left_run.glb",
    "left strafe walking.fbx": "strafe_left_walk.glb",
    "right strafe.fbx": "strafe_right_run.glb",
    "right strafe walking.fbx": "strafe_right_walk.glb",
    "left turn 90.fbx": "turn_left.glb",
    "right turn 90.fbx": "turn_right.glb",
}

def convert_animation(fbx_path, glb_path):
    """Convert a single FBX file to GLB"""
    # Clear the scene completely
    bpy.ops.wm.read_factory_settings(use_empty=True)

    # Import the FBX
    bpy.ops.import_scene.fbx(filepath=fbx_path)

    # Find the armature
    armature = None
    for obj in bpy.context.scene.objects:
        if obj.type == 'ARMATURE':
            armature = obj
            break

    if not armature:
        print(f"  WARNING: No armature found in {fbx_path}")
        return False

    # Check for animation data
    if armature.animation_data and armature.animation_data.action:
        action = armature.animation_data.action
        print(f"  Found action: {action.name}")
        print(f"  Frame range: {action.frame_range}")

        # Count tracks for info
        try:
            if hasattr(action, 'layers') and action.layers:
                layer = action.layers[0]
                strip = layer.strips[0]
                channelbag = strip.channelbags[0]
                fcurves = list(channelbag.fcurves)
            elif hasattr(action, 'fcurves'):
                fcurves = list(action.fcurves)
            else:
                fcurves = []
            print(f"  Fcurves: {len(fcurves)}")
        except (IndexError, AttributeError):
            print(f"  Could not count fcurves")
    else:
        print(f"  WARNING: No animation data found")

    # Export as GLB
    bpy.ops.export_scene.gltf(
        filepath=glb_path,
        export_format='GLB',
        export_animations=True,
        export_skins=True,
        export_lights=False,
        export_cameras=False,
        export_apply=False,
    )

    return True

def main():
    print("\n" + "="*60)
    print("Converting FBX Animations to GLB")
    print("="*60 + "\n")

    if not os.path.exists(SOURCE_DIR):
        print(f"ERROR: Source directory not found: {SOURCE_DIR}")
        sys.exit(1)

    if not os.path.exists(DEST_DIR):
        os.makedirs(DEST_DIR)
        print(f"Created destination directory: {DEST_DIR}")

    success_count = 0
    total = len(FILE_MAPPING)

    for fbx_name, glb_name in FILE_MAPPING.items():
        fbx_path = os.path.join(SOURCE_DIR, fbx_name)
        glb_path = os.path.join(DEST_DIR, glb_name)

        print(f"\nConverting: {fbx_name} -> {glb_name}")

        if not os.path.exists(fbx_path):
            print(f"  ERROR: FBX file not found: {fbx_path}")
            continue

        if convert_animation(fbx_path, glb_path):
            success_count += 1
            print(f"  Saved to {glb_path}")

    print(f"\n" + "="*60)
    print(f"Converted {success_count}/{total} animations")
    print("="*60 + "\n")

if __name__ == "__main__":
    main()
