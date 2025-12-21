"""
Blender script to export Oak forest as STATIC meshes (no armatures)
Run with: blender --background <blend_file> --python <this_script>
"""

import bpy
import os

# Output path
output_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
output_path = os.path.join(output_dir, "public/models/Foliage/Trees/oak_trees.glb")

print(f"Exporting to: {output_path}")

# Select all mesh objects and apply armature modifiers
bpy.ops.object.select_all(action='DESELECT')

for obj in bpy.data.objects:
    if obj.type == 'MESH':
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj

        # Apply all modifiers (including armature)
        for modifier in obj.modifiers[:]:
            try:
                bpy.ops.object.modifier_apply(modifier=modifier.name)
                print(f"Applied modifier {modifier.name} on {obj.name}")
            except Exception as e:
                print(f"Could not apply {modifier.name}: {e}")

# Delete all armatures
bpy.ops.object.select_all(action='DESELECT')
for obj in bpy.data.objects:
    if obj.type == 'ARMATURE':
        obj.select_set(True)
bpy.ops.object.delete()

# Ensure leaf materials have proper base color
for mat in bpy.data.materials:
    if mat.use_nodes:
        for node in mat.node_tree.nodes:
            if node.type == 'BSDF_PRINCIPLED':
                # If there's a texture connected, ensure base color is white (1,1,1,1)
                # so texture colors show through
                base_color_input = node.inputs.get('Base Color')
                if base_color_input and base_color_input.is_linked:
                    # Has texture - keep color at white to show texture properly
                    node.inputs['Base Color'].default_value = (1.0, 1.0, 1.0, 1.0)
                    print(f"Set base color to white for textured material: {mat.name}")

# Select only mesh objects for export
bpy.ops.object.select_all(action='DESELECT')
for obj in bpy.data.objects:
    if obj.type == 'MESH':
        obj.select_set(True)

# Export to GLB - static meshes only
bpy.ops.export_scene.gltf(
    filepath=output_path,
    export_format='GLB',
    use_selection=True,
    export_texcoords=True,
    export_normals=True,
    export_materials='EXPORT',
    export_cameras=False,
    export_lights=False,
    export_yup=True,
    export_apply=True,
    export_animations=False,
    export_skins=False,  # No skinning
    export_image_format='AUTO',
)

print(f"Export complete: {output_path}")
print(f"File size: {os.path.getsize(output_path) / 1024 / 1024:.2f} MB")
