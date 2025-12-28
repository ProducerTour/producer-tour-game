#!/usr/bin/env python3
"""
Auto-rig MB-Lab mesh using Blender's built-in tools and export.
Creates a simple humanoid rig compatible with Mixamo animations.
"""

import bpy
import sys
import os
import math

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
    for block in bpy.data.armatures:
        if block.users == 0:
            bpy.data.armatures.remove(block)

def create_skin_material(name="Skin"):
    """Create a basic PBR skin material"""
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    nodes.clear()

    output = nodes.new('ShaderNodeOutputMaterial')
    principled = nodes.new('ShaderNodeBsdfPrincipled')

    principled.inputs['Base Color'].default_value = (0.76, 0.57, 0.42, 1.0)
    principled.inputs['Roughness'].default_value = 0.5
    principled.inputs['Metallic'].default_value = 0.0

    mat.node_tree.links.new(principled.outputs['BSDF'], output.inputs['Surface'])

    return mat

def create_mixamo_armature():
    """Create a humanoid armature with Mixamo-compatible bone names"""

    # Create armature
    armature = bpy.data.armatures.new("Armature")
    armature_obj = bpy.data.objects.new("Armature", armature)
    bpy.context.collection.objects.link(armature_obj)
    bpy.context.view_layer.objects.active = armature_obj

    # Enter edit mode
    bpy.ops.object.mode_set(mode='EDIT')
    edit_bones = armature.edit_bones

    # Bone definitions: (name, head_xyz, tail_xyz, parent_name, roll)
    # Using mixamorig: prefix for Mixamo compatibility
    bones = [
        # Spine chain
        ("mixamorig:Hips", (0, 0.02, 1.0), (0, 0.02, 1.1), None, 0),
        ("mixamorig:Spine", (0, 0.02, 1.1), (0, 0, 1.25), "mixamorig:Hips", 0),
        ("mixamorig:Spine1", (0, 0, 1.25), (0, -0.02, 1.4), "mixamorig:Spine", 0),
        ("mixamorig:Spine2", (0, -0.02, 1.4), (0, -0.02, 1.5), "mixamorig:Spine1", 0),
        ("mixamorig:Neck", (0, -0.02, 1.5), (0, -0.01, 1.6), "mixamorig:Spine2", 0),
        ("mixamorig:Head", (0, -0.01, 1.6), (0, 0, 1.8), "mixamorig:Neck", 0),

        # Left arm
        ("mixamorig:LeftShoulder", (0.02, -0.02, 1.48), (0.12, -0.02, 1.48), "mixamorig:Spine2", math.pi),
        ("mixamorig:LeftArm", (0.12, -0.02, 1.48), (0.35, -0.02, 1.48), "mixamorig:LeftShoulder", math.pi),
        ("mixamorig:LeftForeArm", (0.35, -0.02, 1.48), (0.55, 0, 1.48), "mixamorig:LeftArm", math.pi),
        ("mixamorig:LeftHand", (0.55, 0, 1.48), (0.65, 0, 1.48), "mixamorig:LeftForeArm", math.pi),

        # Right arm
        ("mixamorig:RightShoulder", (-0.02, -0.02, 1.48), (-0.12, -0.02, 1.48), "mixamorig:Spine2", math.pi),
        ("mixamorig:RightArm", (-0.12, -0.02, 1.48), (-0.35, -0.02, 1.48), "mixamorig:RightShoulder", math.pi),
        ("mixamorig:RightForeArm", (-0.35, -0.02, 1.48), (-0.55, 0, 1.48), "mixamorig:RightArm", math.pi),
        ("mixamorig:RightHand", (-0.55, 0, 1.48), (-0.65, 0, 1.48), "mixamorig:RightForeArm", math.pi),

        # Left leg
        ("mixamorig:LeftUpLeg", (0.1, 0, 1.0), (0.1, 0.02, 0.55), "mixamorig:Hips", 0),
        ("mixamorig:LeftLeg", (0.1, 0.02, 0.55), (0.1, 0, 0.08), "mixamorig:LeftUpLeg", 0),
        ("mixamorig:LeftFoot", (0.1, 0, 0.08), (0.1, -0.1, 0.02), "mixamorig:LeftLeg", 0),
        ("mixamorig:LeftToeBase", (0.1, -0.1, 0.02), (0.1, -0.18, 0.02), "mixamorig:LeftFoot", 0),

        # Right leg
        ("mixamorig:RightUpLeg", (-0.1, 0, 1.0), (-0.1, 0.02, 0.55), "mixamorig:Hips", 0),
        ("mixamorig:RightLeg", (-0.1, 0.02, 0.55), (-0.1, 0, 0.08), "mixamorig:RightUpLeg", 0),
        ("mixamorig:RightFoot", (-0.1, 0, 0.08), (-0.1, -0.1, 0.02), "mixamorig:RightLeg", 0),
        ("mixamorig:RightToeBase", (-0.1, -0.1, 0.02), (-0.1, -0.18, 0.02), "mixamorig:RightFoot", 0),
    ]

    # Create bones
    for name, head, tail, parent_name, roll in bones:
        bone = edit_bones.new(name)
        bone.head = head
        bone.tail = tail
        bone.roll = roll
        if parent_name:
            bone.parent = edit_bones[parent_name]

    bpy.ops.object.mode_set(mode='OBJECT')

    print(f"  Created armature with {len(armature.bones)} bones")
    return armature_obj

def export_rigged_character(char_blend_path, obj_name, output_path):
    """Load mesh, create rig, bind, and export"""

    clear_scene()
    print(f"Loading: {char_blend_path}")

    # Load mesh from blend file
    with bpy.data.libraries.load(char_blend_path, link=False) as (data_from, data_to):
        data_to.objects = data_from.objects
        data_to.meshes = data_from.meshes

    # Find and link mesh
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

    # Select and make active
    bpy.ops.object.select_all(action='DESELECT')
    mesh_obj.select_set(True)
    bpy.context.view_layer.objects.active = mesh_obj

    # Apply transforms
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    # Ensure proper normals
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.normals_make_consistent(inside=False)
    bpy.ops.object.mode_set(mode='OBJECT')

    # Replace materials
    mesh_obj.data.materials.clear()
    skin_mat = create_skin_material("Skin")
    mesh_obj.data.materials.append(skin_mat)
    for poly in mesh_obj.data.polygons:
        poly.material_index = 0
    print(f"  Applied skin material")

    # Create armature
    armature_obj = create_mixamo_armature()

    # Parent mesh to armature with automatic weights
    mesh_obj.select_set(True)
    armature_obj.select_set(True)
    bpy.context.view_layer.objects.active = armature_obj

    try:
        bpy.ops.object.parent_set(type='ARMATURE_AUTO')
        print("  Parented with automatic weights")
    except Exception as e:
        print(f"  Auto-weight failed: {e}")
        # Fallback: parent with empty weights
        mesh_obj.parent = armature_obj
        mod = mesh_obj.modifiers.new("Armature", 'ARMATURE')
        mod.object = armature_obj
        print("  Parented with empty weights (needs manual weight painting)")

    # Select all for export
    bpy.ops.object.select_all(action='SELECT')

    # Export
    print(f"Exporting to: {output_path}")
    bpy.ops.export_scene.gltf(
        filepath=output_path,
        export_format='GLB',
        use_selection=True,
        export_apply=False,
        export_animations=False,
        export_skins=True,  # Include skeleton/weights
        export_morph=False,  # No morphs for now
        export_yup=True,
        export_materials='EXPORT',
    )

    print(f"  Exported successfully!")
    return True

def main():
    args = get_args()

    if len(args) < 1:
        print("Usage: blender --background --python auto_rig_export.py -- <output_dir>")
        sys.exit(1)

    output_dir = os.path.abspath(args[0])
    db_path = "/Users/nolangriffis/Documents/Producer Tour Official Website/Producer-Tour-Website/producer-tour-react/scripts/blender/addons/CharMorph-db-master"

    os.makedirs(output_dir, exist_ok=True)

    print("=" * 60)
    print("AUTO-RIGGED CHARACTER EXPORT")
    print("=" * 60)

    characters = [
        ('mb_male', 'base_male.glb'),
        ('mb_female', 'base_female.glb'),
    ]

    for char_dir, output_name in characters:
        char_path = os.path.join(db_path, 'characters', char_dir, 'char.blend')
        output_path = os.path.join(output_dir, output_name)

        print(f"\n--- {char_dir} ---")
        export_rigged_character(char_path, char_dir, output_path)

    print("\n" + "=" * 60)
    print("DONE")
    print("=" * 60)

if __name__ == "__main__":
    main()
