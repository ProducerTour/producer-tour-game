#!/usr/bin/env python3
"""
Generate Game-Ready Avatar Base Meshes from CharMorph/MB-Lab

This script:
1. Loads MB-Lab base characters from CharMorph database
2. Creates properly named morph targets (shape keys) for the character creator
3. Optionally simplifies the armature for game use
4. Exports as GLB with morph targets enabled

Usage:
    blender --background --python generate_avatar_meshes.py -- [options]

Options:
    --db-path PATH      Path to CharMorph-db directory (default: ./addons/CharMorph-db-master)
    --output PATH       Output directory (default: ../../apps/frontend/public/assets/avatars)
    --simplify-rig      Reduce bone count for game use (optional)
    --male-only         Only generate male mesh
    --female-only       Only generate female mesh
"""

import bpy
import sys
import os
import numpy as np
from pathlib import Path
from mathutils import Vector

# ============================================================================
# Configuration
# ============================================================================

# Morph target mappings: our_name -> [(charmorph_morph, weight), ...]
# These combine CharMorph morphs to create our desired shape keys
MORPH_MAPPINGS = {
    # Face morphs
    'EyeSize': [('Eyes_Size', 0.5)],
    'EyeSpacing': [('Eyes_PosX', 0.5)],
    'NoseWidth': [('Nose_BaseSizeX', 0.3), ('Nose_NostrilSizeX', 0.2)],
    'NoseLength': [('Nose_SizeY', 0.4)],
    'JawWidth': [('Jaw_ScaleX', 0.5)],
    'ChinLength': [('Chin_SizeZ', 0.3), ('Chin_Prominence', 0.2)],
    'LipFullness': [('Mouth_LowerlipVolume', 0.3), ('Mouth_UpperlipVolume', 0.3)],
    'CheekboneHeight': [('Cheeks_Zygom', 0.4)],

    # Body morphs
    'Build_Slim': [('Torso_Mass', -0.3), ('Waist_Size', -0.2), ('Abdomen_Mass', -0.2)],
    'Build_Athletic': [('Torso_Tone', 0.4), ('Torso_Vshape', 0.3), ('Shoulders_Tone', 0.2)],
    'Build_Heavy': [('Torso_Mass', 0.4), ('Abdomen_Mass', 0.3), ('Waist_Size', 0.2)],
}

# Game-ready bone names (Mixamo-compatible subset)
GAME_BONES = {
    'Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head',
    'LeftShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand',
    'RightShoulder', 'RightArm', 'RightForeArm', 'RightHand',
    'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'LeftToeBase',
    'RightUpLeg', 'RightLeg', 'RightFoot', 'RightToeBase',
}

# ============================================================================
# Utility Functions
# ============================================================================

def get_args():
    """Parse command line arguments after '--'"""
    argv = sys.argv
    if "--" in argv:
        return argv[argv.index("--") + 1:]
    return []


def parse_args(args):
    """Parse our custom arguments"""
    options = {
        'db_path': None,
        'output': None,
        'simplify_rig': False,
        'male_only': False,
        'female_only': False,
    }

    i = 0
    while i < len(args):
        if args[i] == '--db-path' and i + 1 < len(args):
            options['db_path'] = args[i + 1]
            i += 2
        elif args[i] == '--output' and i + 1 < len(args):
            options['output'] = args[i + 1]
            i += 2
        elif args[i] == '--simplify-rig':
            options['simplify_rig'] = True
            i += 1
        elif args[i] == '--male-only':
            options['male_only'] = True
            i += 1
        elif args[i] == '--female-only':
            options['female_only'] = True
            i += 1
        else:
            i += 1

    return options


def clear_scene():
    """Clear all objects from scene"""
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


def get_mesh_bounds(mesh_data):
    """Get bounding box of mesh"""
    verts = mesh_data.vertices
    if not verts:
        return Vector((0, 0, 0)), Vector((0, 0, 0))

    min_co = Vector((float('inf'), float('inf'), float('inf')))
    max_co = Vector((float('-inf'), float('-inf'), float('-inf')))

    for v in verts:
        for i in range(3):
            min_co[i] = min(min_co[i], v.co[i])
            max_co[i] = max(max_co[i], v.co[i])

    return min_co, max_co


# ============================================================================
# CharMorph Morph Loading
# ============================================================================

def load_charmorph_morphs(char_path):
    """Load morph data from CharMorph's numpy files"""
    morphs_dir = Path(char_path) / 'morphs'

    morph_data = {}

    # Try loading L1 first (most common morphs)
    l1_dir = morphs_dir / 'L1'
    if l1_dir.exists():
        for npy_file in l1_dir.glob('*.npy'):
            morph_name = npy_file.stem
            try:
                morph_data[morph_name] = np.load(npy_file)
            except Exception as e:
                print(f"  Warning: Could not load {morph_name}: {e}")

    # Also check packed formats
    for packed_dir in ['L2_packed', 'L3_packed']:
        packed_path = morphs_dir / packed_dir
        if packed_path.exists() and packed_path.is_dir():
            for npy_file in packed_path.glob('*.npy'):
                morph_name = npy_file.stem
                if morph_name not in morph_data:
                    try:
                        morph_data[morph_name] = np.load(npy_file)
                    except Exception:
                        pass

    print(f"  Loaded {len(morph_data)} CharMorph morphs")
    return morph_data


def apply_morph_delta(mesh_obj, morph_name, delta_data, weight=1.0):
    """Apply morph delta data to create a shape key"""
    mesh = mesh_obj.data

    # Ensure basis exists
    if not mesh.shape_keys:
        mesh_obj.shape_key_add(name='Basis')

    # Check if shape key already exists
    existing_keys = [kb.name for kb in mesh.shape_keys.key_blocks]
    if morph_name in existing_keys:
        return mesh.shape_keys.key_blocks[morph_name]

    # Create the shape key
    sk = mesh_obj.shape_key_add(name=morph_name)

    # Apply the delta
    num_verts = len(mesh.vertices)
    if len(delta_data) >= num_verts * 3:
        delta_data = delta_data[:num_verts * 3].reshape(-1, 3)
    elif len(delta_data.shape) == 2 and delta_data.shape[0] == num_verts:
        pass  # Already in correct shape
    else:
        print(f"    Warning: Delta shape mismatch for {morph_name}")
        return sk

    for i, v in enumerate(mesh.vertices):
        if i < len(delta_data):
            delta = delta_data[i] * weight
            sk.data[i].co = v.co + Vector(delta)

    return sk


# ============================================================================
# Procedural Morph Generation (Fallback)
# ============================================================================

def create_procedural_morph(mesh_obj, morph_name, params):
    """Create morph target procedurally based on vertex positions"""
    mesh = mesh_obj.data

    # Ensure basis exists
    if not mesh.shape_keys:
        mesh_obj.shape_key_add(name='Basis')

    # Check if already exists
    existing_keys = [kb.name for kb in mesh.shape_keys.key_blocks]
    if morph_name in existing_keys:
        return mesh.shape_keys.key_blocks[morph_name]

    sk = mesh_obj.shape_key_add(name=morph_name)

    min_co, max_co = get_mesh_bounds(mesh)
    center_x = (min_co.x + max_co.x) / 2
    head_height = max_co.z

    # Region definitions
    regions = {
        'eyes': {'z_center': head_height - 0.08, 'z_range': 0.04, 'x_max': 0.12},
        'nose': {'z_center': head_height - 0.12, 'z_range': 0.03, 'x_max': 0.04},
        'jaw': {'z_center': head_height - 0.22, 'z_range': 0.06, 'x_min': 0.03, 'x_max': 0.15},
        'chin': {'z_center': head_height - 0.25, 'z_range': 0.03, 'x_max': 0.04},
        'lips': {'z_center': head_height - 0.18, 'z_range': 0.02, 'x_max': 0.04},
        'cheeks': {'z_center': head_height - 0.12, 'z_range': 0.03, 'x_min': 0.04, 'x_max': 0.12},
        'torso': {'z_min': min_co.z + 0.3, 'z_max': head_height - 0.25, 'x_min': 0.05},
    }

    region = params.get('region', 'face')
    direction = params.get('direction', 'x')
    amount = params.get('amount', 0.01)

    for i, v in enumerate(mesh.vertices):
        offset = [0, 0, 0]

        if region in regions:
            reg = regions[region]

            # Check if vertex is in region
            in_region = True
            if 'z_center' in reg:
                dz = abs(v.co.z - reg['z_center'])
                if dz > reg.get('z_range', 0.05):
                    in_region = False
                falloff = 1.0 - (dz / reg.get('z_range', 0.05))
            elif 'z_min' in reg and 'z_max' in reg:
                if v.co.z < reg['z_min'] or v.co.z > reg['z_max']:
                    in_region = False
                falloff = 1.0
            else:
                falloff = 1.0

            dx = abs(v.co.x - center_x)
            if 'x_max' in reg and dx > reg['x_max']:
                in_region = False
            if 'x_min' in reg and dx < reg['x_min']:
                in_region = False

            if in_region and falloff > 0:
                sign = 1 if v.co.x > center_x else -1

                if direction == 'x':
                    offset[0] = sign * amount * falloff
                elif direction == 'x_scale':
                    offset[0] = dx * amount * falloff * sign
                elif direction == 'y':
                    offset[1] = amount * falloff
                elif direction == 'z':
                    offset[2] = amount * falloff
                elif direction == 'scale':
                    offset[0] = dx * amount * falloff * sign
                    offset[1] = v.co.y * amount * falloff * 0.5

        sk.data[i].co = v.co + Vector(offset)

    return sk


def create_all_procedural_morphs(mesh_obj):
    """Create all morph targets procedurally"""
    print("  Creating procedural morph targets...")

    morphs = [
        ('EyeSize', {'region': 'eyes', 'direction': 'scale', 'amount': 0.1}),
        ('EyeSpacing', {'region': 'eyes', 'direction': 'x', 'amount': 0.005}),
        ('NoseWidth', {'region': 'nose', 'direction': 'x_scale', 'amount': 0.15}),
        ('NoseLength', {'region': 'nose', 'direction': 'y', 'amount': -0.01}),
        ('JawWidth', {'region': 'jaw', 'direction': 'x_scale', 'amount': 0.08}),
        ('ChinLength', {'region': 'chin', 'direction': 'z', 'amount': -0.008}),
        ('LipFullness', {'region': 'lips', 'direction': 'y', 'amount': -0.005}),
        ('CheekboneHeight', {'region': 'cheeks', 'direction': 'z', 'amount': 0.005}),
        ('Build_Slim', {'region': 'torso', 'direction': 'scale', 'amount': -0.05}),
        ('Build_Athletic', {'region': 'torso', 'direction': 'x_scale', 'amount': 0.04}),
        ('Build_Heavy', {'region': 'torso', 'direction': 'scale', 'amount': 0.06}),
    ]

    for morph_name, params in morphs:
        create_procedural_morph(mesh_obj, morph_name, params)
        print(f"    Created: {morph_name}")


# ============================================================================
# Character Loading and Processing
# ============================================================================

def load_character_blend(blend_path):
    """Load character from .blend file"""
    print(f"  Loading: {blend_path}")

    # Import all objects from the blend file
    with bpy.data.libraries.load(str(blend_path), link=False) as (data_from, data_to):
        data_to.objects = data_from.objects

    # Link to scene
    for obj in data_to.objects:
        if obj is not None:
            bpy.context.collection.objects.link(obj)

    # Find main mesh (largest vertex count)
    meshes = [o for o in bpy.data.objects if o.type == 'MESH']
    if not meshes:
        print("    ERROR: No mesh found!")
        return None, None

    main_mesh = max(meshes, key=lambda m: len(m.data.vertices))

    # Find armature
    armature = None
    if main_mesh.parent and main_mesh.parent.type == 'ARMATURE':
        armature = main_mesh.parent
    else:
        armatures = [o for o in bpy.data.objects if o.type == 'ARMATURE']
        if armatures:
            armature = armatures[0]

    print(f"    Main mesh: {main_mesh.name} ({len(main_mesh.data.vertices)} verts)")
    if armature:
        print(f"    Armature: {armature.name} ({len(armature.data.bones)} bones)")

    return main_mesh, armature


def center_character(mesh_obj, armature_obj):
    """Center the character at origin"""
    # Move armature (and mesh follows)
    if armature_obj:
        armature_obj.location = (0, 0, 0)
        armature_obj.rotation_euler = (0, 0, 0)
    elif mesh_obj:
        mesh_obj.location = (0, 0, 0)


def create_skin_material(mesh_obj, name="Skin"):
    """Create a basic skin material"""
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True

    # Get principled BSDF
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    if bsdf:
        bsdf.inputs['Base Color'].default_value = (0.78, 0.57, 0.44, 1.0)  # Skin tone
        bsdf.inputs['Roughness'].default_value = 0.6
        bsdf.inputs['Subsurface Weight'].default_value = 0.1
        bsdf.inputs['Subsurface Radius'].default_value = (1.0, 0.2, 0.1)

    # Assign to mesh
    if mesh_obj.data.materials:
        mesh_obj.data.materials[0] = mat
    else:
        mesh_obj.data.materials.append(mat)

    return mat


# ============================================================================
# Export
# ============================================================================

def export_glb(filepath, mesh_obj, armature_obj=None):
    """Export character as GLB with morph targets"""
    print(f"  Exporting to: {filepath}")

    # Deselect all
    bpy.ops.object.select_all(action='DESELECT')

    # Select mesh and armature
    mesh_obj.select_set(True)
    if armature_obj:
        armature_obj.select_set(True)

    bpy.context.view_layer.objects.active = mesh_obj

    # Export
    export_settings = {
        'filepath': str(filepath),
        'export_format': 'GLB',
        'use_selection': True,
        'export_apply': False,  # Don't apply modifiers - preserves shape keys
        'export_animations': True,
        'export_skins': True,
        'export_morph': True,  # CRITICAL: Export shape keys as morph targets
        'export_morph_normal': True,
        'export_yup': True,
        'export_materials': 'EXPORT',
    }

    try:
        bpy.ops.export_scene.gltf(**export_settings)
        print(f"    Export successful!")
        return True
    except Exception as e:
        print(f"    Export error: {e}")
        # Try minimal export
        bpy.ops.export_scene.gltf(
            filepath=str(filepath),
            export_format='GLB',
            export_morph=True,
        )
        return True


# ============================================================================
# Main Processing
# ============================================================================

def process_character(char_name, char_path, output_path, charmorph_morphs=None):
    """Process a single character"""
    print(f"\n{'='*60}")
    print(f"Processing: {char_name}")
    print('='*60)

    clear_scene()

    # Load character
    blend_path = Path(char_path) / 'char.blend'
    if not blend_path.exists():
        print(f"  ERROR: {blend_path} not found!")
        return False

    mesh_obj, armature_obj = load_character_blend(blend_path)
    if not mesh_obj:
        return False

    # Center character
    center_character(mesh_obj, armature_obj)

    # Create morphs
    if charmorph_morphs:
        print("  Creating morphs from CharMorph data...")
        for our_name, source_morphs in MORPH_MAPPINGS.items():
            for source_name, weight in source_morphs:
                if source_name in charmorph_morphs:
                    apply_morph_delta(mesh_obj, our_name, charmorph_morphs[source_name], weight)
                    break
            else:
                # Fallback to procedural
                create_procedural_morph(mesh_obj, our_name, {'region': 'face', 'amount': 0.01})
    else:
        # Pure procedural morphs
        create_all_procedural_morphs(mesh_obj)

    # Ensure material exists
    if not mesh_obj.data.materials:
        create_skin_material(mesh_obj)

    # Report shape keys
    if mesh_obj.data.shape_keys:
        print(f"\n  Final shape keys ({len(mesh_obj.data.shape_keys.key_blocks)}):")
        for kb in mesh_obj.data.shape_keys.key_blocks:
            print(f"    - {kb.name}")

    # Export
    output_file = Path(output_path) / f"base_{char_name}.glb"
    export_glb(output_file, mesh_obj, armature_obj)

    return True


def main():
    args = parse_args(get_args())

    # Determine paths
    script_dir = Path(__file__).parent.resolve()

    if args['db_path']:
        db_path = Path(args['db_path']).resolve()
    else:
        db_path = script_dir / 'addons' / 'CharMorph-db-master'

    if args['output']:
        output_path = Path(args['output']).resolve()
    else:
        output_path = script_dir.parent.parent / 'apps' / 'frontend' / 'public' / 'assets' / 'avatars'

    print('='*60)
    print('AVATAR MESH GENERATOR')
    print('='*60)
    print(f"CharMorph DB: {db_path}")
    print(f"Output: {output_path}")

    # Create output directory
    output_path.mkdir(parents=True, exist_ok=True)

    # Backup existing files
    backup_dir = output_path / 'backup'
    backup_dir.mkdir(exist_ok=True)

    for existing in output_path.glob('base_*.glb'):
        backup_file = backup_dir / f"{existing.stem}_backup.glb"
        if not backup_file.exists():
            import shutil
            shutil.copy(existing, backup_file)
            print(f"Backed up: {existing.name}")

    # Characters to process
    characters = []
    if not args['female_only']:
        characters.append(('male', db_path / 'characters' / 'mb_male'))
    if not args['male_only']:
        characters.append(('female', db_path / 'characters' / 'mb_female'))

    # Process each character
    results = []
    for char_name, char_path in characters:
        # Try to load CharMorph morphs
        charmorph_morphs = None
        if char_path.exists():
            charmorph_morphs = load_charmorph_morphs(char_path)

        success = process_character(char_name, char_path, output_path, charmorph_morphs)
        results.append((char_name, success))

    # Summary
    print(f"\n{'='*60}")
    print("SUMMARY")
    print('='*60)
    for name, success in results:
        status = "SUCCESS" if success else "FAILED"
        print(f"  {name}: {status}")

    print(f"\n{'='*60}")
    print("COMPLETE!")
    print('='*60)
    print(f"\nTest the results:")
    print(f"  node scripts/inspect-glb.js apps/frontend/public/assets/avatars/base_male.glb")


if __name__ == "__main__":
    main()
