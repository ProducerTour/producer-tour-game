"""
Blender script to export bandit model to GLB format with:
- Reduced polygon count (decimation)
- Proper texture packing and embedding for glTF

Run with: blender --background Char.blend --python export_bandit_final.py
"""

import bpy
import os

# Configuration
DECIMATE_RATIO = 0.15  # Reduce to 15% of original vertices

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

# ============================================
# STEP 1: Pack all images (load pixel data)
# ============================================
print("\n--- Step 1: Packing Images ---")

for img in bpy.data.images:
    if img.type == 'IMAGE' and img.source == 'FILE':
        print(f"  Image: {img.name}")
        if img.filepath:
            # Make path absolute
            abs_path = bpy.path.abspath(img.filepath)
            print(f"    Path: {abs_path}")
            if os.path.exists(abs_path):
                try:
                    img.pack()
                    print(f"    -> Packed successfully")
                except Exception as e:
                    print(f"    -> Pack failed: {e}")
            else:
                print(f"    -> File not found!")
        else:
            print(f"    -> No filepath")

# ============================================
# STEP 2: Apply decimation to reduce poly count
# ============================================
print("\n--- Step 2: Decimating Meshes ---")

mesh_objects = [obj for obj in bpy.data.objects if obj.type == 'MESH']
print(f"Found {len(mesh_objects)} mesh objects")

total_verts_before = 0
total_verts_after = 0

for obj in mesh_objects:
    # Unhide
    obj.hide_viewport = False
    obj.hide_render = False
    obj.hide_set(False)

    verts_before = len(obj.data.vertices)
    total_verts_before += verts_before

    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)

    # Remove existing decimate modifiers
    for mod in list(obj.modifiers):
        if mod.type == 'DECIMATE':
            obj.modifiers.remove(mod)

    # Add and apply decimate
    decimate = obj.modifiers.new(name="Decimate_Export", type='DECIMATE')
    decimate.decimate_type = 'COLLAPSE'
    decimate.ratio = DECIMATE_RATIO
    decimate.use_collapse_triangulate = True

    try:
        bpy.ops.object.modifier_apply(modifier="Decimate_Export")
    except:
        # If apply fails (e.g., multi-user), make single user first
        bpy.ops.object.make_single_user(object=True, obdata=True)
        bpy.ops.object.modifier_apply(modifier="Decimate_Export")

    verts_after = len(obj.data.vertices)
    total_verts_after += verts_after
    print(f"  {obj.name}: {verts_before:,} -> {verts_after:,}")

    obj.select_set(False)

print(f"\nTotal: {total_verts_before:,} -> {total_verts_after:,} vertices")

# ============================================
# STEP 3: Verify materials have proper setup
# ============================================
print("\n--- Step 3: Verifying Materials ---")

for mat in bpy.data.materials:
    if not mat.node_tree:
        continue

    principled = None
    for node in mat.node_tree.nodes:
        if node.type == 'BSDF_PRINCIPLED':
            principled = node
            break

    if not principled:
        continue

    base_color = principled.inputs.get('Base Color')
    if base_color and base_color.is_linked:
        from_node = base_color.links[0].from_node
        if from_node.type == 'TEX_IMAGE' and from_node.image:
            img = from_node.image
            # Check if image has pixels
            if img.has_data:
                print(f"  {mat.name}: {img.name} (has data)")
            else:
                print(f"  {mat.name}: {img.name} (NO DATA - trying to reload)")
                img.reload()

# ============================================
# STEP 4: Export to GLB
# ============================================
print("\n--- Step 4: Exporting GLB ---")

bpy.ops.object.select_all(action='SELECT')

bpy.ops.export_scene.gltf(
    filepath=output_path,
    export_format='GLB',
    use_selection=False,
    export_apply=True,
    export_texcoords=True,
    export_normals=True,
    export_tangents=False,
    export_materials='EXPORT',
    export_image_format='AUTO',
    export_animations=True,
    export_skins=True,
    export_all_influences=True,
)

file_size = os.path.getsize(output_path) / (1024 * 1024)
print(f"\n{'=' * 60}")
print(f"DONE! {output_path}")
print(f"Size: {file_size:.2f} MB")
print(f"Vertices: {total_verts_before:,} -> {total_verts_after:,}")
print(f"{'=' * 60}")
