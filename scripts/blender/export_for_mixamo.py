"""
Export CharMorph base mesh to FBX for Mixamo rigging.
Run with: blender char.blend --background --python export_for_mixamo.py
"""

import bpy
import os
import sys

# Get the output path from command line args or use default
output_path = None
for i, arg in enumerate(sys.argv):
    if arg == "--output" and i + 1 < len(sys.argv):
        output_path = sys.argv[i + 1]

if not output_path:
    output_path = os.path.join(os.path.dirname(bpy.data.filepath), "../../../../temp_assets/mb_male_for_mixamo.fbx")

# Make path absolute
output_path = os.path.abspath(output_path)

print(f"Exporting to: {output_path}")

# Ensure output directory exists
os.makedirs(os.path.dirname(output_path), exist_ok=True)

# Deselect all objects first
bpy.ops.object.select_all(action='DESELECT')

# Find and select mesh objects only
mesh_objects = [obj for obj in bpy.data.objects if obj.type == 'MESH']

if not mesh_objects:
    print("ERROR: No mesh objects found in the scene!")
    sys.exit(1)

print(f"Found {len(mesh_objects)} mesh object(s):")
for obj in mesh_objects:
    print(f"  - {obj.name}")
    obj.select_set(True)

# Set the first mesh as active
bpy.context.view_layer.objects.active = mesh_objects[0]

# Export as FBX (mesh only, no armature)
bpy.ops.export_scene.fbx(
    filepath=output_path,
    use_selection=True,
    object_types={'MESH'},
    use_mesh_modifiers=True,
    mesh_smooth_type='FACE',
    use_tspace=True,
    add_leaf_bones=False,
    bake_anim=False,
    axis_forward='-Z',
    axis_up='Y',
)

print(f"Successfully exported mesh to: {output_path}")
