#!/usr/bin/env python3
"""
Generate procedural hair styles for the character creator.
Creates 12 low-poly hair styles as separate GLB files.

Usage:
  blender --background --python generate_hair_styles.py -- <output_dir>
"""

import bpy
import bmesh
import sys
import os
import math
from mathutils import Vector, Matrix

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
    for block in bpy.data.meshes:
        if block.users == 0:
            bpy.data.meshes.remove(block)
    for block in bpy.data.materials:
        if block.users == 0:
            bpy.data.materials.remove(block)

def create_hair_material():
    """Create a simple tintable hair material"""
    mat = bpy.data.materials.new(name="Hair")
    mat.use_nodes = True

    # Simple setup - the color will be changed in the game
    nodes = mat.node_tree.nodes
    bsdf = nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = (0.15, 0.1, 0.07, 1.0)  # Dark brown default
        bsdf.inputs["Roughness"].default_value = 0.7

    return mat

def create_buzz_cut():
    """Very short buzz cut - simple scaled sphere cap"""
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.11, segments=16, ring_count=8)
    hair = bpy.context.active_object
    hair.name = "Hair_BuzzCut"

    # Flatten bottom
    bpy.ops.object.mode_set(mode='EDIT')
    bm = bmesh.from_edit_mesh(hair.data)
    for v in bm.verts:
        if v.co.z < 0:
            v.co.z = 0
    bmesh.update_edit_mesh(hair.data)
    bpy.ops.object.mode_set(mode='OBJECT')

    return hair

def create_short_fade():
    """Short textured fade haircut"""
    bpy.ops.mesh.primitive_cylinder_add(radius=0.1, depth=0.08, vertices=16)
    hair = bpy.context.active_object
    hair.name = "Hair_ShortFade"

    # Add some detail with random displacement
    bpy.ops.object.mode_set(mode='EDIT')
    bm = bmesh.from_edit_mesh(hair.data)
    import random
    random.seed(42)
    for v in bm.verts:
        if v.co.z > 0.02:
            v.co.x += random.uniform(-0.01, 0.01)
            v.co.y += random.uniform(-0.01, 0.01)
    bmesh.update_edit_mesh(hair.data)
    bpy.ops.object.mode_set(mode='OBJECT')

    return hair

def create_short_textured():
    """Short textured messy hair"""
    # Create base
    bpy.ops.mesh.primitive_cube_add(size=0.2)
    hair = bpy.context.active_object
    hair.name = "Hair_ShortTextured"

    # Subdivide and displace
    bpy.ops.object.modifier_add(type='SUBSURF')
    bpy.context.object.modifiers["Subdivision"].levels = 2
    bpy.ops.object.modifier_apply(modifier="Subdivision")

    # Displace top vertices
    bpy.ops.object.mode_set(mode='EDIT')
    bm = bmesh.from_edit_mesh(hair.data)
    import random
    random.seed(43)
    for v in bm.verts:
        if v.co.z > 0.05:
            v.co.z += random.uniform(0, 0.04)
            v.co.x += random.uniform(-0.02, 0.02)
            v.co.y += random.uniform(-0.02, 0.02)
        elif v.co.z < -0.05:
            v.co.z = max(v.co.z, -0.05)
    bmesh.update_edit_mesh(hair.data)
    bpy.ops.object.mode_set(mode='OBJECT')

    return hair

def create_curly_short():
    """Short curly hair"""
    # Create multiple small spheres for curly texture
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.11, segments=12, ring_count=6)
    hair = bpy.context.active_object
    hair.name = "Hair_CurlyShort"

    # Add bumpy texture
    bpy.ops.object.mode_set(mode='EDIT')
    bm = bmesh.from_edit_mesh(hair.data)
    import random
    random.seed(44)
    for v in bm.verts:
        if v.co.z > 0:
            noise = random.uniform(0.95, 1.05)
            v.co *= noise
            v.co.z += random.uniform(0, 0.02)
    bmesh.update_edit_mesh(hair.data)
    bpy.ops.object.mode_set(mode='OBJECT')

    return hair

def create_medium_wavy():
    """Medium length wavy hair"""
    # Create base shape
    bpy.ops.mesh.primitive_cylinder_add(radius=0.12, depth=0.15, vertices=24)
    hair = bpy.context.active_object
    hair.name = "Hair_MediumWavy"

    # Extend the bottom
    bpy.ops.object.mode_set(mode='EDIT')
    bm = bmesh.from_edit_mesh(hair.data)
    import random
    random.seed(45)
    for v in bm.verts:
        if v.co.z < -0.05:
            v.co.z -= 0.05  # Extend down
            # Add wave
            wave = math.sin(v.co.x * 20) * 0.02
            v.co.y += wave
        if v.co.z < -0.02:
            v.co.x += random.uniform(-0.01, 0.01)
    bmesh.update_edit_mesh(hair.data)
    bpy.ops.object.mode_set(mode='OBJECT')

    return hair

def create_medium_straight():
    """Medium length straight hair"""
    bpy.ops.mesh.primitive_cylinder_add(radius=0.11, depth=0.18, vertices=24)
    hair = bpy.context.active_object
    hair.name = "Hair_MediumStraight"

    # Shape it
    bpy.ops.object.mode_set(mode='EDIT')
    bm = bmesh.from_edit_mesh(hair.data)
    for v in bm.verts:
        if v.co.z < -0.05:
            # Taper bottom slightly
            factor = (v.co.z + 0.1) / 0.05
            v.co.x *= 0.95 + 0.05 * factor
            v.co.y *= 0.95 + 0.05 * factor
    bmesh.update_edit_mesh(hair.data)
    bpy.ops.object.mode_set(mode='OBJECT')

    return hair

def create_afro_medium():
    """Medium afro hairstyle"""
    bpy.ops.mesh.primitive_ico_sphere_add(radius=0.14, subdivisions=2)
    hair = bpy.context.active_object
    hair.name = "Hair_AfroMedium"

    # Remove bottom half
    bpy.ops.object.mode_set(mode='EDIT')
    bm = bmesh.from_edit_mesh(hair.data)
    verts_to_delete = [v for v in bm.verts if v.co.z < 0]
    bmesh.ops.delete(bm, geom=verts_to_delete, context='VERTS')

    # Add fuzzy texture
    import random
    random.seed(46)
    for v in bm.verts:
        noise = random.uniform(0.96, 1.04)
        v.co *= noise
    bmesh.update_edit_mesh(hair.data)
    bpy.ops.object.mode_set(mode='OBJECT')

    return hair

def create_long_straight():
    """Long straight hair"""
    bpy.ops.mesh.primitive_cylinder_add(radius=0.12, depth=0.35, vertices=24)
    hair = bpy.context.active_object
    hair.name = "Hair_LongStraight"

    # Taper and shape
    bpy.ops.object.mode_set(mode='EDIT')
    bm = bmesh.from_edit_mesh(hair.data)
    for v in bm.verts:
        if v.co.z < -0.1:
            factor = 1 - ((v.co.z + 0.175) / -0.175) * 0.2
            v.co.x *= factor
            v.co.y *= factor
    bmesh.update_edit_mesh(hair.data)
    bpy.ops.object.mode_set(mode='OBJECT')

    return hair

def create_long_wavy():
    """Long wavy hair"""
    bpy.ops.mesh.primitive_cylinder_add(radius=0.12, depth=0.35, vertices=24)
    hair = bpy.context.active_object
    hair.name = "Hair_LongWavy"

    # Add waves
    bpy.ops.object.mode_set(mode='EDIT')
    bm = bmesh.from_edit_mesh(hair.data)
    for v in bm.verts:
        if v.co.z < -0.05:
            wave = math.sin(v.co.z * 15) * 0.025
            v.co.y += wave
            v.co.x += math.cos(v.co.z * 15) * 0.01
    bmesh.update_edit_mesh(hair.data)
    bpy.ops.object.mode_set(mode='OBJECT')

    return hair

def create_ponytail():
    """Ponytail hairstyle"""
    # Main hair
    bpy.ops.mesh.primitive_cylinder_add(radius=0.11, depth=0.1, vertices=24)
    main = bpy.context.active_object
    main.name = "Hair_Main"

    # Ponytail
    bpy.ops.mesh.primitive_cylinder_add(radius=0.04, depth=0.2, vertices=12, location=(0, -0.08, -0.05))
    tail = bpy.context.active_object
    tail.name = "Hair_Tail"
    tail.rotation_euler.x = math.radians(30)

    # Join
    bpy.ops.object.select_all(action='DESELECT')
    main.select_set(True)
    tail.select_set(True)
    bpy.context.view_layer.objects.active = main
    bpy.ops.object.join()
    main.name = "Hair_Ponytail"

    return main

def create_braids():
    """Braided hairstyle - simplified"""
    # Main hair cap
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.11, segments=12, ring_count=6)
    main = bpy.context.active_object
    main.name = "Hair_Main"

    # Cut bottom
    bpy.ops.object.mode_set(mode='EDIT')
    bm = bmesh.from_edit_mesh(main.data)
    verts_to_delete = [v for v in bm.verts if v.co.z < -0.02]
    bmesh.ops.delete(bm, geom=verts_to_delete, context='VERTS')
    bmesh.update_edit_mesh(main.data)
    bpy.ops.object.mode_set(mode='OBJECT')

    # Add two braids
    bpy.ops.mesh.primitive_cylinder_add(radius=0.025, depth=0.25, vertices=8, location=(0.08, -0.02, -0.08))
    braid1 = bpy.context.active_object
    braid1.name = "Braid1"

    bpy.ops.mesh.primitive_cylinder_add(radius=0.025, depth=0.25, vertices=8, location=(-0.08, -0.02, -0.08))
    braid2 = bpy.context.active_object
    braid2.name = "Braid2"

    # Join all
    bpy.ops.object.select_all(action='DESELECT')
    main.select_set(True)
    braid1.select_set(True)
    braid2.select_set(True)
    bpy.context.view_layer.objects.active = main
    bpy.ops.object.join()
    main.name = "Hair_Braids"

    return main

def create_mohawk():
    """Mohawk hairstyle"""
    bpy.ops.mesh.primitive_cube_add(size=0.1)
    hair = bpy.context.active_object
    hair.name = "Hair_Mohawk"

    # Scale and shape into mohawk
    hair.scale = (0.02, 0.12, 0.08)
    bpy.ops.object.transform_apply(scale=True)

    # Add spikes
    bpy.ops.object.mode_set(mode='EDIT')
    bm = bmesh.from_edit_mesh(hair.data)
    for v in bm.verts:
        if v.co.z > 0.03:
            v.co.z += 0.03
    bmesh.update_edit_mesh(hair.data)
    bpy.ops.object.mode_set(mode='OBJECT')

    return hair

def finalize_hair(hair, output_path):
    """Apply material and export hair"""
    # Set origin to center
    bpy.context.view_layer.objects.active = hair
    bpy.ops.object.origin_set(type='ORIGIN_CENTER_OF_MASS', center='BOUNDS')

    # Position at head attachment point (top of head ~0.1 units above origin)
    hair.location = (0, 0, 0.1)

    # Apply material
    mat = create_hair_material()
    if hair.data.materials:
        hair.data.materials[0] = mat
    else:
        hair.data.materials.append(mat)

    # Apply transforms
    bpy.ops.object.select_all(action='DESELECT')
    hair.select_set(True)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    # Export
    bpy.ops.export_scene.gltf(
        filepath=output_path,
        export_format='GLB',
        use_selection=True,
        export_materials='EXPORT',
    )

    print(f"  Exported: {output_path}")
    return True

def main():
    args = get_args()

    if len(args) < 1:
        print("Usage: blender --background --python generate_hair_styles.py -- <output_dir>")
        sys.exit(1)

    output_dir = os.path.abspath(args[0])
    os.makedirs(output_dir, exist_ok=True)

    print("=" * 60)
    print("HAIR STYLE GENERATOR")
    print("=" * 60)
    print(f"Output: {output_dir}")

    # Hair style generators
    styles = [
        ("buzzcut", create_buzz_cut),
        ("short_fade", create_short_fade),
        ("short_textured", create_short_textured),
        ("curly_short", create_curly_short),
        ("medium_wavy", create_medium_wavy),
        ("medium_straight", create_medium_straight),
        ("afro_medium", create_afro_medium),
        ("long_straight", create_long_straight),
        ("long_wavy", create_long_wavy),
        ("ponytail", create_ponytail),
        ("braids", create_braids),
        ("mohawk", create_mohawk),
    ]

    results = []

    for style_id, create_func in styles:
        print(f"\nGenerating: {style_id}")
        clear_scene()

        try:
            hair = create_func()
            output_path = os.path.join(output_dir, f"{style_id}.glb")
            finalize_hair(hair, output_path)
            results.append((style_id, output_path, "OK"))
        except Exception as e:
            print(f"  ERROR: {e}")
            results.append((style_id, None, str(e)))

    print(f"\n{'='*60}")
    print("SUMMARY")
    print("=" * 60)
    success = 0
    for style_id, path, status in results:
        if status == "OK":
            print(f"  ✓ {style_id}")
            success += 1
        else:
            print(f"  ✗ {style_id}: {status}")

    print(f"\n{success}/{len(styles)} hair styles generated")
    print("=" * 60)

if __name__ == "__main__":
    main()
