"""
Blender script to process the Alaskan cliff rock model for game use.

Run from command line:
blender --background --python process_cliff_model.py

Or run interactively in Blender's scripting tab.
"""

import bpy
import os

# Configuration
MODEL_DIR = "/Users/nolangriffis/Documents/Producer Tour Official Website/Producer-Tour-Website/producer-tour-react/apps/frontend/public/models/Cliffside/alaskan-cliff-rock-9-free"
SOURCE_OBJ = os.path.join(MODEL_DIR, "source/OBJ_500k_2k/CliffRock_0009_High.obj")
TEXTURE_DIR = os.path.join(MODEL_DIR, "source/OBJ_500k_2k")
OUTPUT_GLB = os.path.join(MODEL_DIR, "alaskan_cliff_rock.glb")

# Target polygon count (aim for 10-20k for good balance)
TARGET_POLYS = 15000

# Texture paths
ALBEDO_TEX = os.path.join(TEXTURE_DIR, "CliffRock_0009_2k_Albedo.png")
NORMAL_TEX = os.path.join(TEXTURE_DIR, "CliffRock_0009_2k_Normal.png")
ROUGHNESS_TEX = os.path.join(TEXTURE_DIR, "CliffRock_0009_2k_Roughness.png")


def clear_scene():
    """Clear all objects from scene"""
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)

    # Clear orphan data
    for block in bpy.data.meshes:
        if block.users == 0:
            bpy.data.meshes.remove(block)
    for block in bpy.data.materials:
        if block.users == 0:
            bpy.data.materials.remove(block)
    for block in bpy.data.images:
        if block.users == 0:
            bpy.data.images.remove(block)


def import_obj():
    """Import the OBJ file"""
    print(f"Importing OBJ from: {SOURCE_OBJ}")
    bpy.ops.wm.obj_import(filepath=SOURCE_OBJ)

    # Get the imported object
    obj = bpy.context.selected_objects[0] if bpy.context.selected_objects else None
    if obj:
        obj.name = "AlaskanCliffRock"
        print(f"Imported: {obj.name} with {len(obj.data.polygons)} polygons")
    return obj


def decimate_mesh(obj, target_polys):
    """Decimate mesh to target polygon count"""
    current_polys = len(obj.data.polygons)
    ratio = target_polys / current_polys

    print(f"Decimating from {current_polys} to ~{target_polys} polys (ratio: {ratio:.4f})")

    # Add decimate modifier
    bpy.context.view_layer.objects.active = obj
    decimate = obj.modifiers.new(name="Decimate", type='DECIMATE')
    decimate.decimate_type = 'COLLAPSE'
    decimate.ratio = ratio
    decimate.use_collapse_triangulate = True

    # Apply modifier
    bpy.ops.object.modifier_apply(modifier="Decimate")

    final_polys = len(obj.data.polygons)
    print(f"Final polygon count: {final_polys}")
    return obj


def create_pbr_material(obj):
    """Create PBR material with textures"""
    # Create new material
    mat = bpy.data.materials.new(name="CliffRock_PBR")
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links

    # Clear default nodes
    nodes.clear()

    # Create nodes
    output = nodes.new('ShaderNodeOutputMaterial')
    output.location = (400, 0)

    bsdf = nodes.new('ShaderNodeBsdfPrincipled')
    bsdf.location = (0, 0)

    # Albedo/Base Color
    albedo_tex = nodes.new('ShaderNodeTexImage')
    albedo_tex.location = (-400, 200)
    albedo_tex.image = bpy.data.images.load(ALBEDO_TEX)
    albedo_tex.image.colorspace_settings.name = 'sRGB'

    # Normal Map
    normal_tex = nodes.new('ShaderNodeTexImage')
    normal_tex.location = (-400, -100)
    normal_tex.image = bpy.data.images.load(NORMAL_TEX)
    normal_tex.image.colorspace_settings.name = 'Non-Color'

    normal_map = nodes.new('ShaderNodeNormalMap')
    normal_map.location = (-100, -100)

    # Roughness
    roughness_tex = nodes.new('ShaderNodeTexImage')
    roughness_tex.location = (-400, -400)
    roughness_tex.image = bpy.data.images.load(ROUGHNESS_TEX)
    roughness_tex.image.colorspace_settings.name = 'Non-Color'

    # Connect nodes
    links.new(albedo_tex.outputs['Color'], bsdf.inputs['Base Color'])
    links.new(normal_tex.outputs['Color'], normal_map.inputs['Color'])
    links.new(normal_map.outputs['Normal'], bsdf.inputs['Normal'])
    links.new(roughness_tex.outputs['Color'], bsdf.inputs['Roughness'])
    links.new(bsdf.outputs['BSDF'], output.inputs['Surface'])

    # Assign material to object
    if obj.data.materials:
        obj.data.materials[0] = mat
    else:
        obj.data.materials.append(mat)

    print("PBR material created and applied")
    return mat


def center_and_scale(obj):
    """Center object at origin and scale appropriately"""
    # Set origin to geometry center
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.origin_set(type='ORIGIN_GEOMETRY', center='BOUNDS')

    # Move to origin
    obj.location = (0, 0, 0)

    # Get bounding box dimensions
    dims = obj.dimensions
    print(f"Original dimensions: {dims.x:.2f} x {dims.y:.2f} x {dims.z:.2f}")

    # Scale to reasonable game size (target ~5-10m height for a cliff)
    target_height = 8.0  # meters
    current_height = max(dims.z, dims.y)  # Height could be Z or Y depending on import
    scale_factor = target_height / current_height if current_height > 0 else 1.0

    obj.scale = (scale_factor, scale_factor, scale_factor)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)

    new_dims = obj.dimensions
    print(f"Scaled dimensions: {new_dims.x:.2f} x {new_dims.y:.2f} x {new_dims.z:.2f}")


def export_glb(output_path):
    """Export as GLB with Draco compression"""
    print(f"Exporting to: {output_path}")

    bpy.ops.export_scene.gltf(
        filepath=output_path,
        export_format='GLB',
        use_selection=False,
        export_apply=True,
        export_texcoords=True,
        export_normals=True,
        export_draco_mesh_compression_enable=True,
        export_draco_mesh_compression_level=6,
        export_draco_position_quantization=14,
        export_draco_normal_quantization=10,
        export_draco_texcoord_quantization=12,
        export_materials='EXPORT',
        export_image_format='AUTO',
    )

    # Check file size
    if os.path.exists(output_path):
        size_mb = os.path.getsize(output_path) / (1024 * 1024)
        print(f"Export complete! File size: {size_mb:.2f} MB")


def main():
    print("\n" + "="*60)
    print("Processing Alaskan Cliff Rock Model")
    print("="*60 + "\n")

    # Step 1: Clear scene
    print("Step 1: Clearing scene...")
    clear_scene()

    # Step 2: Import OBJ
    print("\nStep 2: Importing OBJ...")
    obj = import_obj()
    if not obj:
        print("ERROR: Failed to import model!")
        return

    # Step 3: Decimate
    print("\nStep 3: Decimating mesh...")
    obj = decimate_mesh(obj, TARGET_POLYS)

    # Step 4: Create PBR material
    print("\nStep 4: Creating PBR material...")
    create_pbr_material(obj)

    # Step 5: Center and scale
    print("\nStep 5: Centering and scaling...")
    center_and_scale(obj)

    # Step 6: Export
    print("\nStep 6: Exporting GLB...")
    export_glb(OUTPUT_GLB)

    print("\n" + "="*60)
    print("Processing complete!")
    print(f"Output: {OUTPUT_GLB}")
    print("="*60 + "\n")


if __name__ == "__main__":
    main()
