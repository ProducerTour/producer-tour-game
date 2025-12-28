"""
Convert Mixamo-rigged FBX files to GLB format.
Run with: blender --background --python convert_rigged_to_glb.py
"""

import bpy
import os
import sys

# Get script directory and project root
script_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(os.path.dirname(script_dir))

# File mappings: input FBX -> output GLB
FILE_MAPPINGS = [
    {
        'input': os.path.join(project_root, 'apps/frontend/public/models/Characters/Character Models/mb_male_for_mixamo.fbx'),
        'output': os.path.join(project_root, 'apps/frontend/public/assets/avatars/base_male.glb'),
    },
    {
        'input': os.path.join(project_root, 'apps/frontend/public/models/Characters/Character Models/mb_female_for_mixamo.fbx'),
        'output': os.path.join(project_root, 'apps/frontend/public/assets/avatars/base_female.glb'),
    },
]

def clear_scene():
    """Remove all objects from the scene"""
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete()

    # Clear orphan data
    for block in bpy.data.meshes:
        if block.users == 0:
            bpy.data.meshes.remove(block)
    for block in bpy.data.materials:
        if block.users == 0:
            bpy.data.materials.remove(block)
    for block in bpy.data.armatures:
        if block.users == 0:
            bpy.data.armatures.remove(block)

def convert_fbx_to_glb(input_path, output_path):
    """Convert a single FBX file to GLB"""
    print(f"\n{'='*60}")
    print(f"Converting: {os.path.basename(input_path)}")
    print(f"Output: {os.path.basename(output_path)}")
    print(f"{'='*60}")

    # Clear the scene
    clear_scene()

    # Import FBX
    print(f"Importing FBX...")
    bpy.ops.import_scene.fbx(filepath=input_path)

    # Find armature and meshes
    armatures = [obj for obj in bpy.data.objects if obj.type == 'ARMATURE']
    meshes = [obj for obj in bpy.data.objects if obj.type == 'MESH']

    print(f"Found {len(armatures)} armature(s) and {len(meshes)} mesh(es)")

    if armatures:
        arm = armatures[0]
        print(f"Armature: {arm.name} with {len(arm.data.bones)} bones")
        # Print first few bone names to verify Mixamo skeleton
        for i, bone in enumerate(arm.data.bones[:5]):
            print(f"  - {bone.name}")
        if len(arm.data.bones) > 5:
            print(f"  ... and {len(arm.data.bones) - 5} more")

    # Ensure output directory exists
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    # Select all objects for export
    bpy.ops.object.select_all(action='SELECT')

    # Export as GLB
    print(f"Exporting GLB...")
    bpy.ops.export_scene.gltf(
        filepath=output_path,
        export_format='GLB',
        use_selection=True,
        export_animations=False,  # We have separate animation files
        export_skins=True,        # Keep skinning/rigging
        export_morph=True,        # Keep any morph targets if present
        export_apply=False,       # Don't apply modifiers
    )

    # Get file size
    size = os.path.getsize(output_path)
    size_mb = size / (1024 * 1024)
    print(f"Exported: {output_path} ({size_mb:.2f} MB)")

    return True

def main():
    success_count = 0

    for mapping in FILE_MAPPINGS:
        input_path = mapping['input']
        output_path = mapping['output']

        if not os.path.exists(input_path):
            print(f"ERROR: Input file not found: {input_path}")
            continue

        try:
            if convert_fbx_to_glb(input_path, output_path):
                success_count += 1
        except Exception as e:
            print(f"ERROR converting {input_path}: {e}")

    print(f"\n{'='*60}")
    print(f"Conversion complete: {success_count}/{len(FILE_MAPPINGS)} files")
    print(f"{'='*60}")

if __name__ == '__main__':
    main()
