"""
Blender script to:
1. Relink broken texture paths to local files
2. Apply decimation
3. Export with embedded textures

Run with: blender --background Char.blend --python export_bandit_relink.py
"""

import bpy
import os

# Configuration
DECIMATE_RATIO = 0.15

blend_dir = os.path.dirname(bpy.data.filepath)
output_path = os.path.join(blend_dir, "bandit.glb")

print("=" * 60)
print("BANDIT MODEL EXPORT - RELINK TEXTURES")
print("=" * 60)

# Switch to object mode
if bpy.context.active_object and bpy.context.active_object.mode != 'OBJECT':
    bpy.ops.object.mode_set(mode='OBJECT')

bpy.ops.object.select_all(action='DESELECT')

# ============================================
# STEP 1: Relink images to local directory
# ============================================
print("\n--- Step 1: Relinking Images ---")

# Map of image name patterns to local files
local_textures = {}
for f in os.listdir(blend_dir):
    if f.endswith('.png'):
        # Get base name without number suffix (e.g., "jacket_combined" from "jacket_combined.png")
        base = f.replace('.png', '').lower()
        local_textures[base] = os.path.join(blend_dir, f)
        print(f"  Found local: {f}")

print(f"\nFound {len(local_textures)} local texture files")

# Relink each image
for img in bpy.data.images:
    if img.type != 'IMAGE':
        continue

    # Get the base name from the image name (e.g., "jacket_combined" from "jacket_combined.003")
    img_base = img.name.lower()
    # Remove number suffix like ".003"
    if '.' in img_base and img_base.split('.')[-1].isdigit():
        img_base = '.'.join(img_base.split('.')[:-1])

    print(f"\n  Image: {img.name}")
    print(f"    Base name: {img_base}")

    # Find matching local file
    matched = False
    for local_base, local_path in local_textures.items():
        if img_base == local_base or img_base.startswith(local_base):
            print(f"    -> Relinking to: {local_path}")
            img.filepath = local_path
            img.filepath_raw = local_path

            # Force reload
            try:
                img.reload()
                if img.has_data:
                    print(f"    -> SUCCESS! Image loaded ({img.size[0]}x{img.size[1]})")
                    # Pack the image
                    img.pack()
                    print(f"    -> Packed into blend")
                else:
                    print(f"    -> WARNING: Still no data after reload")
            except Exception as e:
                print(f"    -> ERROR: {e}")

            matched = True
            break

    if not matched:
        print(f"    -> No local match found")

# ============================================
# STEP 2: Decimate meshes
# ============================================
print("\n--- Step 2: Decimating Meshes ---")

mesh_objects = [obj for obj in bpy.data.objects if obj.type == 'MESH']
total_before = 0
total_after = 0

for obj in mesh_objects:
    obj.hide_viewport = False
    obj.hide_render = False
    obj.hide_set(False)

    before = len(obj.data.vertices)
    total_before += before

    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)

    # Remove existing decimate
    for mod in list(obj.modifiers):
        if mod.type == 'DECIMATE':
            obj.modifiers.remove(mod)

    # Add new decimate
    dec = obj.modifiers.new("Decimate_Export", 'DECIMATE')
    dec.decimate_type = 'COLLAPSE'
    dec.ratio = DECIMATE_RATIO
    dec.use_collapse_triangulate = True

    try:
        bpy.ops.object.modifier_apply(modifier="Decimate_Export")
    except:
        bpy.ops.object.make_single_user(object=True, obdata=True)
        bpy.ops.object.modifier_apply(modifier="Decimate_Export")

    after = len(obj.data.vertices)
    total_after += after

    obj.select_set(False)

print(f"\nVertices: {total_before:,} -> {total_after:,}")

# ============================================
# STEP 3: Export
# ============================================
print("\n--- Step 3: Exporting ---")

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

size_mb = os.path.getsize(output_path) / (1024 * 1024)
print(f"\n{'=' * 60}")
print(f"EXPORTED: {output_path}")
print(f"Size: {size_mb:.2f} MB")
print(f"Vertices: {total_before:,} -> {total_after:,}")
print(f"{'=' * 60}")
