#!/usr/bin/env python3
"""
Generate base avatar meshes using MPFB2 (MakeHuman Plugin for Blender).
Outputs GLB files with morph targets for character customization.

Prerequisites:
1. Blender 4.2+ with MPFB2 addon installed
2. MPFB2 asset packs downloaded (targets, skins, etc.)

Usage:
  blender --background --python generate_base_mesh.py -- male /output/path/base_male.glb
  blender --background --python generate_base_mesh.py -- female /output/path/base_female.glb
"""

import bpy
import sys
import os

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

def check_mpfb():
    """Check if MPFB2 is available"""
    try:
        from mpfb.services.humanservice import HumanService
        return True
    except ImportError:
        return False

def create_human_with_mpfb(gender='male'):
    """Create a human using MPFB2"""
    try:
        from mpfb.services.humanservice import HumanService
        from mpfb.entities.objectproperties import GeneralObjectProperties

        # Create new human
        human = HumanService.create_human()

        # Set gender
        if gender == 'female':
            # Apply female macro target
            pass  # MPFB uses targets for this

        return human
    except Exception as e:
        print(f"MPFB error: {e}")
        return None

def create_simple_human_fallback():
    """Create a simple human mesh if MPFB isn't available"""
    # Create a basic humanoid shape using primitives
    # This is a fallback - won't have proper blendshapes

    bpy.ops.mesh.primitive_cylinder_add(radius=0.15, depth=0.6, location=(0, 0, 1.0))
    torso = bpy.context.active_object
    torso.name = "Body"

    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.12, location=(0, 0, 1.45))
    head = bpy.context.active_object
    head.name = "Head"

    # Join them
    bpy.ops.object.select_all(action='DESELECT')
    torso.select_set(True)
    head.select_set(True)
    bpy.context.view_layer.objects.active = torso
    bpy.ops.object.join()

    return torso

def add_basic_shapekeys(mesh_obj):
    """Add basic shape keys to a mesh"""
    # Add basis
    if not mesh_obj.data.shape_keys:
        mesh_obj.shape_key_add(name='Basis')

    # Add placeholder shape keys (these won't do much on simple geometry)
    shape_key_names = [
        'EyeSize', 'EyeSpacing', 'NoseWidth', 'NoseLength',
        'JawWidth', 'ChinLength', 'LipFullness', 'CheekboneHeight',
        'Build_Slim', 'Build_Athletic', 'Build_Heavy'
    ]

    for name in shape_key_names:
        sk = mesh_obj.shape_key_add(name=name)
        # Just create the key - actual deformation would need vertex manipulation

    print(f"Added {len(shape_key_names)} shape keys (placeholders)")

def export_glb(filepath):
    """Export as GLB with morph targets"""
    bpy.ops.export_scene.gltf(
        filepath=filepath,
        export_format='GLB',
        export_morph=True,
    )
    print(f"Exported: {filepath}")

def main():
    args = get_args()

    if len(args) < 2:
        print("Usage: blender --background --python generate_base_mesh.py -- <male|female> <output.glb>")
        print()
        print("This script requires MPFB2 addon to be installed in Blender.")
        print("Download from: https://static.makehumancommunity.org/mpfb.html")
        sys.exit(1)

    gender = args[0].lower()
    output_path = args[1]

    print("="*60)
    print("BASE MESH GENERATOR")
    print("="*60)
    print(f"Gender: {gender}")
    print(f"Output: {output_path}")
    print()

    clear_scene()

    if check_mpfb():
        print("MPFB2 detected - creating proper human mesh...")
        human = create_human_with_mpfb(gender)
        if not human:
            print("MPFB creation failed, using fallback...")
            human = create_simple_human_fallback()
            add_basic_shapekeys(human)
    else:
        print("="*60)
        print("MPFB2 NOT FOUND!")
        print("="*60)
        print()
        print("To get proper character meshes with morph targets:")
        print()
        print("1. Download MPFB2 from:")
        print("   https://static.makehumancommunity.org/mpfb.html")
        print()
        print("2. Install in Blender:")
        print("   Edit > Preferences > Add-ons > Install")
        print("   Select the downloaded .zip file")
        print("   Enable 'MPFB'")
        print()
        print("3. Download MPFB asset packs:")
        print("   In Blender, MPFB tab > Apply assets > Download")
        print()
        print("Creating fallback mesh (won't work well for customization)...")
        print()

        human = create_simple_human_fallback()
        add_basic_shapekeys(human)

    # Make sure output directory exists
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    # Export
    export_glb(output_path)

    print()
    print("="*60)
    print("DONE")
    print("="*60)

if __name__ == "__main__":
    main()
