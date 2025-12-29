"""
Blender script to export bandit model to GLB format with:
- Reduced polygon count (decimation)
- Proper texture embedding for glTF

Run with: blender --background Char.blend --python export_bandit_lowpoly.py
"""

import bpy
import os

# Configuration
DECIMATE_RATIO = 0.15  # Reduce to 15% of original vertices (235k -> ~35k)

# Get the directory of the current blend file
blend_dir = os.path.dirname(bpy.data.filepath)
output_path = os.path.join(blend_dir, "bandit.glb")

print("=" * 60)
print("BANDIT MODEL EXPORT - LOW POLY WITH TEXTURES")
print("=" * 60)

# Switch to object mode
if bpy.context.active_object and bpy.context.active_object.mode != 'OBJECT':
    bpy.ops.object.mode_set(mode='OBJECT')

# Deselect all
bpy.ops.object.select_all(action='DESELECT')

# Process each mesh object
mesh_objects = [obj for obj in bpy.data.objects if obj.type == 'MESH']
print(f"\nFound {len(mesh_objects)} mesh objects to process")

total_verts_before = 0
total_verts_after = 0

for obj in mesh_objects:
    # Unhide the object
    obj.hide_viewport = False
    obj.hide_render = False
    obj.hide_set(False)

    # Count vertices before
    verts_before = len(obj.data.vertices)
    total_verts_before += verts_before

    # Select and make active
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)

    # Remove existing decimate modifiers
    for mod in obj.modifiers:
        if mod.type == 'DECIMATE':
            obj.modifiers.remove(mod)

    # Add decimate modifier
    decimate = obj.modifiers.new(name="Decimate_Export", type='DECIMATE')
    decimate.decimate_type = 'COLLAPSE'
    decimate.ratio = DECIMATE_RATIO
    decimate.use_collapse_triangulate = True

    # Apply the modifier (creates a copy of the mesh data)
    bpy.ops.object.modifier_apply(modifier="Decimate_Export")

    # Count vertices after
    verts_after = len(obj.data.vertices)
    total_verts_after += verts_after

    print(f"  {obj.name}: {verts_before:,} -> {verts_after:,} vertices")

    obj.select_set(False)

print(f"\nTotal vertex reduction: {total_verts_before:,} -> {total_verts_after:,} ({total_verts_after/total_verts_before*100:.1f}%)")

# Fix materials for glTF export
# The issue is that Blender node-based materials need the Principled BSDF
# with textures connected to the right inputs
print("\n--- Checking Materials ---")

for mat in bpy.data.materials:
    if not mat.use_nodes:
        continue

    print(f"\nMaterial: {mat.name}")

    # Find the Principled BSDF node
    principled = None
    for node in mat.node_tree.nodes:
        if node.type == 'BSDF_PRINCIPLED':
            principled = node
            break

    if not principled:
        print(f"  No Principled BSDF found, skipping")
        continue

    # Check what's connected to Base Color
    base_color_input = principled.inputs.get('Base Color')
    if base_color_input and base_color_input.is_linked:
        linked_node = base_color_input.links[0].from_node
        print(f"  Base Color connected to: {linked_node.type}")
        if linked_node.type == 'TEX_IMAGE' and linked_node.image:
            print(f"    Image: {linked_node.image.name}")
    else:
        # Check if there's an image texture node not connected
        for node in mat.node_tree.nodes:
            if node.type == 'TEX_IMAGE' and node.image:
                print(f"  Found unconnected texture: {node.image.name}")
                # Try to connect it to Base Color
                if base_color_input and not base_color_input.is_linked:
                    mat.node_tree.links.new(node.outputs['Color'], base_color_input)
                    print(f"    -> Connected to Base Color!")
                break

# Select all objects for export
bpy.ops.object.select_all(action='SELECT')

# Export with proper settings
print("\n--- Exporting to GLB ---")
bpy.ops.export_scene.gltf(
    filepath=output_path,
    export_format='GLB',
    use_selection=False,
    export_apply=True,
    export_texcoords=True,
    export_normals=True,
    export_tangents=False,  # Not needed, saves space
    export_materials='EXPORT',
    export_image_format='AUTO',
    export_animations=True,
    export_skins=True,
    export_all_influences=True,
)

# Get file size
file_size = os.path.getsize(output_path) / (1024 * 1024)  # MB
print(f"\n{'=' * 60}")
print(f"SUCCESS! Exported to: {output_path}")
print(f"File size: {file_size:.2f} MB")
print(f"Vertex reduction: {total_verts_before:,} -> {total_verts_after:,}")
print(f"{'=' * 60}")
