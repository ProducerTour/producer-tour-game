#!/usr/bin/env python3
"""
Export clean base meshes from CharMorph-db without shape key modifications.
The MB-Lab meshes already have proper topology - we just need to export them correctly.
"""

import bpy
import sys
import os

def get_args():
    argv = sys.argv
    if "--" in argv:
        return argv[argv.index("--") + 1:]
    return []

def clear_scene():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete()
    for block in bpy.data.meshes:
        if block.users == 0:
            bpy.data.meshes.remove(block)

def create_skin_material(name="Skin"):
    """Create a basic PBR skin material"""
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    nodes.clear()

    # Create nodes
    output = nodes.new('ShaderNodeOutputMaterial')
    principled = nodes.new('ShaderNodeBsdfPrincipled')

    # Set default skin color
    principled.inputs['Base Color'].default_value = (0.76, 0.57, 0.42, 1.0)
    principled.inputs['Roughness'].default_value = 0.5
    principled.inputs['Metallic'].default_value = 0.0

    # Link nodes
    mat.node_tree.links.new(principled.outputs['BSDF'], output.inputs['Surface'])

    output.location = (300, 0)
    principled.location = (0, 0)

    return mat

def convert_to_pbr(mat):
    """Ensure material is glTF-compatible with proper PBR nodes"""
    if not mat.use_nodes:
        mat.use_nodes = True

    nodes = mat.node_tree.nodes
    links = mat.node_tree.links

    # Find or create Principled BSDF
    principled = None
    for node in nodes:
        if node.type == 'BSDF_PRINCIPLED':
            principled = node
            break

    if not principled:
        # Create new Principled BSDF
        principled = nodes.new('ShaderNodeBsdfPrincipled')
        principled.location = (0, 0)

    # Find output node
    output = None
    for node in nodes:
        if node.type == 'OUTPUT_MATERIAL':
            output = node
            break

    if not output:
        output = nodes.new('ShaderNodeOutputMaterial')
        output.location = (300, 0)

    # Ensure Principled BSDF is connected to output
    connected = False
    for link in links:
        if link.to_node == output and link.from_node == principled:
            connected = True
            break

    if not connected:
        links.new(principled.outputs['BSDF'], output.inputs['Surface'])

    # Set reasonable defaults if no base color is set (black)
    base_color = principled.inputs.get('Base Color')
    if base_color:
        color = base_color.default_value[:]
        # If color is very dark (unset), set a default skin color
        if color[0] < 0.1 and color[1] < 0.1 and color[2] < 0.1:
            base_color.default_value = (0.76, 0.57, 0.42, 1.0)

    # Ensure metallic is 0 for skin
    metallic = principled.inputs.get('Metallic')
    if metallic:
        metallic.default_value = 0.0

def export_character(char_blend_path, obj_name, output_path):
    """Export a character from .blend file to GLB"""
    clear_scene()

    print(f"Loading: {char_blend_path}")

    # Load character from blend file (including materials)
    with bpy.data.libraries.load(char_blend_path, link=False) as (data_from, data_to):
        data_to.objects = data_from.objects
        data_to.meshes = data_from.meshes
        data_to.materials = data_from.materials
        data_to.textures = getattr(data_from, 'textures', [])
        data_to.images = getattr(data_from, 'images', [])

    # Link to scene
    mesh_obj = None
    for obj in data_to.objects:
        if obj is not None:
            bpy.context.collection.objects.link(obj)
            if obj.type == 'MESH':
                mesh_obj = obj
                print(f"  Found mesh: {obj.name} ({len(obj.data.vertices)} verts)")

    if not mesh_obj:
        print("ERROR: No mesh found!")
        return False

    # Select only the mesh
    bpy.ops.object.select_all(action='DESELECT')
    mesh_obj.select_set(True)
    bpy.context.view_layer.objects.active = mesh_obj

    # Apply transforms
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    # Ensure proper normals
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.normals_make_consistent(inside=False)
    bpy.ops.object.mode_set(mode='OBJECT')

    # Replace all materials with a single simple PBR skin material
    # This ensures glTF export works correctly
    print("  Replacing materials with simple PBR skin material...")

    # Clear existing materials
    mesh_obj.data.materials.clear()

    # Create and assign a single skin material
    skin_mat = create_skin_material("Skin")
    mesh_obj.data.materials.append(skin_mat)

    # Assign material to all faces
    for poly in mesh_obj.data.polygons:
        poly.material_index = 0

    print(f"  Assigned single skin material to {len(mesh_obj.data.polygons)} faces")

    # Add basic shape keys that match our system
    if not mesh_obj.data.shape_keys:
        mesh_obj.shape_key_add(name='Basis')

    # Create empty shape keys (placeholders that can be modified)
    shape_key_names = [
        'EyeSize', 'EyeSpacing', 'NoseWidth', 'NoseLength',
        'JawWidth', 'ChinLength', 'LipFullness', 'CheekboneHeight',
        'Build_Slim', 'Build_Athletic', 'Build_Heavy'
    ]

    for name in shape_key_names:
        if name not in [kb.name for kb in mesh_obj.data.shape_keys.key_blocks]:
            mesh_obj.shape_key_add(name=name)
            print(f"  Added shape key: {name}")

    # Export as GLB
    print(f"Exporting to: {output_path}")

    bpy.ops.export_scene.gltf(
        filepath=output_path,
        export_format='GLB',
        use_selection=True,
        export_apply=False,  # Don't apply modifiers
        export_animations=False,
        export_skins=False,  # No armature
        export_morph=True,  # Export shape keys
        export_morph_normal=True,
        export_yup=True,  # Convert to Y-up for Three.js
        export_materials='EXPORT',  # Export materials
    )

    print(f"  Exported successfully!")
    return True

def main():
    args = get_args()

    if len(args) < 1:
        print("Usage: blender --background --python export_clean_base.py -- <output_dir>")
        sys.exit(1)

    output_dir = os.path.abspath(args[0])
    db_path = "/Users/nolangriffis/Documents/Producer Tour Official Website/Producer-Tour-Website/producer-tour-react/scripts/blender/addons/CharMorph-db-master"

    os.makedirs(output_dir, exist_ok=True)

    print("=" * 60)
    print("CLEAN BASE MESH EXPORT")
    print("=" * 60)

    characters = [
        ('mb_male', 'base_male.glb'),
        ('mb_female', 'base_female.glb'),
    ]

    for char_dir, output_name in characters:
        char_path = os.path.join(db_path, 'characters', char_dir, 'char.blend')
        output_path = os.path.join(output_dir, output_name)

        print(f"\n--- {char_dir} ---")
        export_character(char_path, char_dir, output_path)

    print("\n" + "=" * 60)
    print("DONE")
    print("=" * 60)

if __name__ == "__main__":
    main()
