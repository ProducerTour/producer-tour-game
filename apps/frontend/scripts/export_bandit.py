"""
Blender script to export bandit model to GLB format
Run with: blender --background Char.blend --python export_bandit.py
"""

import bpy
import os

# Get the directory of the current blend file
blend_dir = os.path.dirname(bpy.data.filepath)
output_path = os.path.join(blend_dir, "bandit.glb")

print("=" * 50)
print("BANDIT MODEL EXPORT")
print("=" * 50)

# List all objects in the scene
print("\nObjects in scene:")
mesh_count = 0
for obj in bpy.data.objects:
    print(f"  - {obj.name} (type: {obj.type}, hidden: {obj.hide_viewport})")
    if obj.type == 'MESH':
        mesh_count += 1
        # Unhide all meshes
        obj.hide_viewport = False
        obj.hide_render = False
        obj.hide_set(False)

print(f"\nFound {mesh_count} mesh objects")

# Make sure we're in object mode
if bpy.context.active_object and bpy.context.active_object.mode != 'OBJECT':
    bpy.ops.object.mode_set(mode='OBJECT')

# Select all objects for export
bpy.ops.object.select_all(action='SELECT')

# Export settings optimized for web (Blender 4.x/5.0 compatible)
print("\nExporting to GLB...")
bpy.ops.export_scene.gltf(
    filepath=output_path,
    export_format='GLB',
    use_selection=False,  # Export ALL objects, not just selected
    export_apply=True,  # Apply modifiers
    export_texcoords=True,
    export_normals=True,
    export_tangents=True,
    export_materials='EXPORT',
    export_image_format='AUTO',  # Embed textures in GLB
    export_animations=True,
    export_skins=True,  # Include armature/skeleton
    export_all_influences=True,  # Export all bone influences
)

# Get file size
file_size = os.path.getsize(output_path) / (1024 * 1024)  # MB
print(f"\n✅ Exported to: {output_path}")
print(f"   File size: {file_size:.2f} MB")
