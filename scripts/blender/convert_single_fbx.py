"""
Convert a single FBX animation to GLB format.

Usage:
    blender --background --python scripts/blender/convert_single_fbx.py -- input.fbx output.glb

Example:
    blender --background --python scripts/blender/convert_single_fbx.py -- \
        "apps/frontend/public/animations/new animations/My Animation.fbx" \
        "apps/frontend/public/assets/animations/locomotion/my_animation.glb"
"""

import bpy
import sys
import os

def main():
    # Get arguments after "--"
    argv = sys.argv
    if "--" not in argv:
        print("Usage: blender --background --python convert_single_fbx.py -- input.fbx output.glb")
        sys.exit(1)

    argv = argv[argv.index("--") + 1:]

    if len(argv) < 2:
        print("Usage: blender --background --python convert_single_fbx.py -- input.fbx output.glb")
        sys.exit(1)

    input_path = argv[0]
    output_path = argv[1]

    print(f"\n{'='*60}")
    print(f"Converting FBX to GLB")
    print(f"{'='*60}")
    print(f"Input:  {input_path}")
    print(f"Output: {output_path}")

    if not os.path.exists(input_path):
        print(f"ERROR: Input file not found: {input_path}")
        sys.exit(1)

    # Ensure output directory exists
    output_dir = os.path.dirname(output_path)
    if output_dir and not os.path.exists(output_dir):
        os.makedirs(output_dir)
        print(f"Created directory: {output_dir}")

    # Clear scene
    bpy.ops.wm.read_factory_settings(use_empty=True)

    # Import FBX
    print(f"\nImporting FBX...")
    bpy.ops.import_scene.fbx(filepath=input_path)

    # Find armature and print info
    armature = None
    for obj in bpy.context.scene.objects:
        if obj.type == 'ARMATURE':
            armature = obj
            break

    if armature:
        print(f"Found armature: {armature.name}")
        if armature.animation_data and armature.animation_data.action:
            action = armature.animation_data.action
            print(f"Animation: {action.name}")
            print(f"Frame range: {action.frame_range}")
    else:
        print("WARNING: No armature found")

    # Export GLB
    print(f"\nExporting GLB...")
    bpy.ops.export_scene.gltf(
        filepath=output_path,
        export_format='GLB',
        export_animations=True,
        export_skins=True,
        export_lights=False,
        export_cameras=False,
        export_apply=False,
    )

    print(f"\nDone: {output_path}")
    print(f"{'='*60}\n")

if __name__ == "__main__":
    main()
