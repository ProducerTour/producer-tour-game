#!/usr/bin/env python3
"""
Generate base avatar meshes using CharMorph (MB-Lab based).
Creates GLB files with morph targets for character customization.

Usage:
  blender --background --python generate_charmorph_base.py -- <db_path> <output_dir>

Example:
  blender --background --python generate_charmorph_base.py -- ./addons/CharMorph-db-master ./output
"""

import bpy
import sys
import os
import json

def get_args():
    """Get arguments after '--'"""
    argv = sys.argv
    if "--" in argv:
        return argv[argv.index("--") + 1:]
    return []

def clear_scene():
    """Remove all objects from scene"""
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete()

    # Also clear orphan data
    for block in bpy.data.meshes:
        if block.users == 0:
            bpy.data.meshes.remove(block)
    for block in bpy.data.materials:
        if block.users == 0:
            bpy.data.materials.remove(block)
    for block in bpy.data.armatures:
        if block.users == 0:
            bpy.data.armatures.remove(block)

def install_charmorph_addon(addon_zip_path):
    """Install CharMorph addon from zip file"""
    try:
        bpy.ops.preferences.addon_install(filepath=addon_zip_path)
        bpy.ops.preferences.addon_enable(module='charmorph')
        print("CharMorph addon installed and enabled")
        return True
    except Exception as e:
        print(f"Failed to install CharMorph: {e}")
        return False

def check_charmorph():
    """Check if CharMorph is available"""
    try:
        import charmorph
        return True
    except ImportError:
        return False

def load_char_blend(char_blend_path, obj_name):
    """Load character from .blend file"""
    print(f"Loading character from: {char_blend_path}")

    with bpy.data.libraries.load(char_blend_path, link=False) as (data_from, data_to):
        # Load all objects
        data_to.objects = data_from.objects
        data_to.meshes = data_from.meshes
        data_to.armatures = data_from.armatures

    # Link objects to scene
    for obj in data_to.objects:
        if obj is not None:
            bpy.context.collection.objects.link(obj)
            print(f"  Loaded object: {obj.name}")

    # Find the main mesh
    target_mesh = None
    for obj in bpy.data.objects:
        if obj.type == 'MESH' and (obj.name == obj_name or obj_name in obj.name):
            target_mesh = obj
            break

    if not target_mesh:
        # Fallback: find largest mesh
        meshes = [o for o in bpy.data.objects if o.type == 'MESH']
        if meshes:
            target_mesh = max(meshes, key=lambda m: len(m.data.vertices))

    return target_mesh

def create_shape_key_mapping(mesh):
    """
    Create shape keys that map to our character creator system.
    Maps MB-Lab morph names to our expected names.
    """
    if not mesh or mesh.type != 'MESH':
        print("ERROR: No valid mesh provided")
        return False

    # Ensure we have a basis shape key
    if not mesh.data.shape_keys:
        mesh.shape_key_add(name='Basis')

    # Our target shape keys mapped to CharMorph/MB-Lab morphs
    # Format: (our_name, [(mblab_name, weight), ...])
    shape_key_mappings = {
        'EyeSize': [('Eyes_Size', 1.0)],
        'EyeSpacing': [('Eyes_PosX', 1.0)],
        'NoseWidth': [('Nose_BaseSizeX', 0.5), ('Nose_NostrilSizeX', 0.5)],
        'NoseLength': [('Nose_SizeY', 1.0)],
        'JawWidth': [('Jaw_ScaleX', 1.0)],
        'ChinLength': [('Chin_SizeZ', 0.5), ('Chin_Prominence', 0.5)],
        'LipFullness': [('Mouth_LowerlipVolume', 0.5), ('Mouth_UpperlipVolume', 0.5)],
        'CheekboneHeight': [('Cheeks_Zygom', 1.0)],
        'Build_Slim': [('Torso_Mass', -0.5), ('Waist_Size', -0.3)],
        'Build_Athletic': [('Torso_Tone', 0.5), ('Torso_Vshape', 0.3)],
        'Build_Heavy': [('Torso_Mass', 0.5), ('Abdomen_Mass', 0.3), ('Waist_Size', 0.3)],
    }

    print(f"\nMesh {mesh.name} shape keys before mapping:")
    if mesh.data.shape_keys:
        for kb in mesh.data.shape_keys.key_blocks:
            print(f"  - {kb.name}")

    # For now, just create placeholder shape keys
    # The actual morphs will be loaded from CharMorph's numpy data
    for our_name in shape_key_mappings:
        if our_name not in [kb.name for kb in mesh.data.shape_keys.key_blocks]:
            sk = mesh.shape_key_add(name=our_name)
            print(f"Created shape key: {our_name}")

    return True

def apply_simple_morph(mesh, target_name, direction='x', amount=0.01, region='head'):
    """Apply a simple morph by displacing vertices in a region"""
    if not mesh.data.shape_keys:
        mesh.shape_key_add(name='Basis')

    # Create the shape key
    sk = mesh.shape_key_add(name=target_name)

    # Get mesh bounds
    verts = mesh.data.vertices
    if not verts:
        return

    zs = [v.co.z for v in verts]
    min_z, max_z = min(zs), max(zs)
    height = max_z - min_z

    # Define regions
    regions = {
        'head': (max_z - height * 0.25, max_z),  # Top 25%
        'face': (max_z - height * 0.3, max_z - height * 0.1),  # Face area
        'torso': (min_z + height * 0.3, max_z - height * 0.25),  # Middle
        'full': (min_z, max_z),
    }

    z_min, z_max = regions.get(region, regions['full'])

    # Apply displacement
    for i, vert in enumerate(verts):
        if z_min <= vert.co.z <= z_max:
            # Calculate falloff
            t = (vert.co.z - z_min) / (z_max - z_min) if z_max > z_min else 0.5
            falloff = 1.0 - abs(2 * t - 1)  # Peak in middle of region

            displacement = [0, 0, 0]
            if direction == 'x':
                displacement[0] = amount * (1 if vert.co.x > 0 else -1) * falloff
            elif direction == 'y':
                displacement[1] = amount * falloff
            elif direction == 'z':
                displacement[2] = amount * falloff
            elif direction == 'scale':
                displacement[0] = vert.co.x * amount * falloff
                displacement[1] = vert.co.y * amount * falloff

            sk.data[i].co.x = vert.co.x + displacement[0]
            sk.data[i].co.y = vert.co.y + displacement[1]
            sk.data[i].co.z = vert.co.z + displacement[2]

def create_morphs_from_scratch(mesh):
    """Create morph targets from scratch if CharMorph morphs aren't available"""
    print(f"\nCreating morphs from scratch for: {mesh.name}")

    # Ensure basis exists
    if not mesh.data.shape_keys:
        mesh.shape_key_add(name='Basis')

    # Facial morphs
    apply_simple_morph(mesh, 'EyeSize', 'scale', 0.02, 'face')
    apply_simple_morph(mesh, 'EyeSpacing', 'x', 0.01, 'face')
    apply_simple_morph(mesh, 'NoseWidth', 'x', 0.008, 'face')
    apply_simple_morph(mesh, 'NoseLength', 'y', 0.01, 'face')
    apply_simple_morph(mesh, 'JawWidth', 'x', 0.015, 'head')
    apply_simple_morph(mesh, 'ChinLength', 'z', -0.01, 'head')
    apply_simple_morph(mesh, 'LipFullness', 'y', 0.005, 'face')
    apply_simple_morph(mesh, 'CheekboneHeight', 'z', 0.008, 'face')

    # Body morphs
    apply_simple_morph(mesh, 'Build_Slim', 'scale', -0.02, 'torso')
    apply_simple_morph(mesh, 'Build_Athletic', 'x', 0.015, 'torso')
    apply_simple_morph(mesh, 'Build_Heavy', 'scale', 0.025, 'torso')

    print(f"Created {len(mesh.data.shape_keys.key_blocks) - 1} shape keys")
    return True

def export_glb(filepath, mesh=None):
    """Export scene/mesh as GLB with morph targets"""
    # Deselect all, then select only what we want
    bpy.ops.object.select_all(action='DESELECT')

    if mesh:
        mesh.select_set(True)
        bpy.context.view_layer.objects.active = mesh

        # Also select armature if it exists
        if mesh.parent and mesh.parent.type == 'ARMATURE':
            mesh.parent.select_set(True)
    else:
        bpy.ops.object.select_all(action='SELECT')

    # Export parameters
    export_params = {
        'filepath': filepath,
        'export_format': 'GLB',
        'use_selection': mesh is not None,
        'export_animations': True,
        'export_skins': True,
        'export_morph': True,  # Critical: export shape keys
        'export_morph_normal': True,
        'export_apply': False,  # Don't apply modifiers (preserve shape keys)
    }

    try:
        bpy.ops.export_scene.gltf(**export_params)
        print(f"Exported: {filepath}")
        return True
    except TypeError as e:
        # Fallback for different Blender versions
        print(f"Export fallback due to: {e}")
        bpy.ops.export_scene.gltf(
            filepath=filepath,
            export_format='GLB',
            export_morph=True,
        )
        return True

def main():
    args = get_args()

    if len(args) < 2:
        print("Usage: blender --background --python generate_charmorph_base.py -- <db_path> <output_dir>")
        print("\nThis script loads MB-Lab characters and exports them with morph targets.")
        sys.exit(1)

    db_path = os.path.abspath(args[0])
    output_dir = os.path.abspath(args[1])

    print("=" * 60)
    print("CHARMORPH BASE MESH GENERATOR")
    print("=" * 60)
    print(f"Database path: {db_path}")
    print(f"Output directory: {output_dir}")

    # Create output directory
    os.makedirs(output_dir, exist_ok=True)

    # Character definitions
    characters = [
        {
            'name': 'male',
            'char_dir': 'mb_male',
            'blend_file': 'char.blend',
            'obj_name': 'mb_male',
        },
        {
            'name': 'female',
            'char_dir': 'mb_female',
            'blend_file': 'char.blend',
            'obj_name': 'mb_female',
        },
    ]

    results = []

    for char_def in characters:
        print(f"\n{'='*60}")
        print(f"Processing: {char_def['name']}")
        print("=" * 60)

        clear_scene()

        char_blend_path = os.path.join(
            db_path, 'characters', char_def['char_dir'], char_def['blend_file']
        )

        if not os.path.exists(char_blend_path):
            print(f"ERROR: Character file not found: {char_blend_path}")
            continue

        # Load character
        mesh = load_char_blend(char_blend_path, char_def['obj_name'])

        if not mesh:
            print(f"ERROR: Could not find mesh in {char_blend_path}")
            continue

        print(f"Loaded mesh: {mesh.name} ({len(mesh.data.vertices)} vertices)")

        # Create morph targets
        create_morphs_from_scratch(mesh)

        # List shape keys
        if mesh.data.shape_keys:
            print(f"\nFinal shape keys:")
            for kb in mesh.data.shape_keys.key_blocks:
                print(f"  - {kb.name}")

        # Export
        output_path = os.path.join(output_dir, f"base_{char_def['name']}.glb")
        export_glb(output_path, mesh)

        results.append({
            'name': char_def['name'],
            'output': output_path,
            'vertices': len(mesh.data.vertices),
            'shape_keys': len(mesh.data.shape_keys.key_blocks) if mesh.data.shape_keys else 0,
        })

    print(f"\n{'='*60}")
    print("SUMMARY")
    print("=" * 60)
    for r in results:
        print(f"  {r['name']}: {r['vertices']} verts, {r['shape_keys']} shape keys")
        print(f"    Output: {r['output']}")

    print(f"\n{'='*60}")
    print("COMPLETE!")
    print("=" * 60)

if __name__ == "__main__":
    main()
