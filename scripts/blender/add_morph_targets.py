#!/usr/bin/env python3
"""
Add procedural morph targets to base mesh for character customization.
Creates shape keys for face and body morphs.
"""

import bpy
import sys
import os
import math
from mathutils import Vector

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

    armature = bpy.data.armatures.new("Armature")
    armature_obj = bpy.data.objects.new("Armature", armature)
    bpy.context.collection.objects.link(armature_obj)
    bpy.context.view_layer.objects.active = armature_obj

    bpy.ops.object.mode_set(mode='EDIT')
    edit_bones = armature.edit_bones

    bones = [
        ("mixamorig:Hips", (0, 0.02, 1.0), (0, 0.02, 1.1), None, 0),
        ("mixamorig:Spine", (0, 0.02, 1.1), (0, 0, 1.25), "mixamorig:Hips", 0),
        ("mixamorig:Spine1", (0, 0, 1.25), (0, -0.02, 1.4), "mixamorig:Spine", 0),
        ("mixamorig:Spine2", (0, -0.02, 1.4), (0, -0.02, 1.5), "mixamorig:Spine1", 0),
        ("mixamorig:Neck", (0, -0.02, 1.5), (0, -0.01, 1.6), "mixamorig:Spine2", 0),
        ("mixamorig:Head", (0, -0.01, 1.6), (0, 0, 1.8), "mixamorig:Neck", 0),

        ("mixamorig:LeftShoulder", (0.02, -0.02, 1.48), (0.12, -0.02, 1.48), "mixamorig:Spine2", math.pi),
        ("mixamorig:LeftArm", (0.12, -0.02, 1.48), (0.35, -0.02, 1.48), "mixamorig:LeftShoulder", math.pi),
        ("mixamorig:LeftForeArm", (0.35, -0.02, 1.48), (0.55, 0, 1.48), "mixamorig:LeftArm", math.pi),
        ("mixamorig:LeftHand", (0.55, 0, 1.48), (0.65, 0, 1.48), "mixamorig:LeftForeArm", math.pi),

        ("mixamorig:RightShoulder", (-0.02, -0.02, 1.48), (-0.12, -0.02, 1.48), "mixamorig:Spine2", math.pi),
        ("mixamorig:RightArm", (-0.12, -0.02, 1.48), (-0.35, -0.02, 1.48), "mixamorig:RightShoulder", math.pi),
        ("mixamorig:RightForeArm", (-0.35, -0.02, 1.48), (-0.55, 0, 1.48), "mixamorig:RightArm", math.pi),
        ("mixamorig:RightHand", (-0.55, 0, 1.48), (-0.65, 0, 1.48), "mixamorig:RightForeArm", math.pi),

        ("mixamorig:LeftUpLeg", (0.1, 0, 1.0), (0.1, 0.02, 0.55), "mixamorig:Hips", 0),
        ("mixamorig:LeftLeg", (0.1, 0.02, 0.55), (0.1, 0, 0.08), "mixamorig:LeftUpLeg", 0),
        ("mixamorig:LeftFoot", (0.1, 0, 0.08), (0.1, -0.1, 0.02), "mixamorig:LeftLeg", 0),
        ("mixamorig:LeftToeBase", (0.1, -0.1, 0.02), (0.1, -0.18, 0.02), "mixamorig:LeftFoot", 0),

        ("mixamorig:RightUpLeg", (-0.1, 0, 1.0), (-0.1, 0.02, 0.55), "mixamorig:Hips", 0),
        ("mixamorig:RightLeg", (-0.1, 0.02, 0.55), (-0.1, 0, 0.08), "mixamorig:RightUpLeg", 0),
        ("mixamorig:RightFoot", (-0.1, 0, 0.08), (-0.1, -0.1, 0.02), "mixamorig:RightLeg", 0),
        ("mixamorig:RightToeBase", (-0.1, -0.1, 0.02), (-0.1, -0.18, 0.02), "mixamorig:RightFoot", 0),
    ]

    for name, head, tail, parent_name, roll in bones:
        bone = edit_bones.new(name)
        bone.head = head
        bone.tail = tail
        bone.roll = roll
        if parent_name:
            bone.parent = edit_bones[parent_name]

    bpy.ops.object.mode_set(mode='OBJECT')
    return armature_obj


def get_mesh_bounds(mesh):
    """Get bounding box of mesh"""
    min_co = Vector((float('inf'), float('inf'), float('inf')))
    max_co = Vector((float('-inf'), float('-inf'), float('-inf')))

    for v in mesh.vertices:
        for i in range(3):
            min_co[i] = min(min_co[i], v.co[i])
            max_co[i] = max(max_co[i], v.co[i])

    return min_co, max_co


def add_shape_key(mesh_obj, name, vertex_offsets):
    """Add a shape key with specified vertex offsets"""

    # Ensure basis shape key exists
    if not mesh_obj.data.shape_keys:
        mesh_obj.shape_key_add(name="Basis")

    # Add the new shape key
    sk = mesh_obj.shape_key_add(name=name)

    # Apply offsets
    for idx, offset in vertex_offsets.items():
        if idx < len(sk.data):
            sk.data[idx].co = mesh_obj.data.vertices[idx].co + Vector(offset)

    return sk


def create_face_morphs(mesh_obj):
    """Create facial morph targets based on vertex positions"""

    mesh = mesh_obj.data
    min_co, max_co = get_mesh_bounds(mesh)

    # Calculate reference points
    head_height = max_co.z  # Top of head
    chin_height = max_co.z - 0.25  # Approximate chin level
    eye_height = max_co.z - 0.08  # Approximate eye level
    nose_height = max_co.z - 0.12  # Approximate nose level
    mouth_height = max_co.z - 0.18  # Approximate mouth level

    # Center X
    center_x = (min_co.x + max_co.x) / 2

    print(f"  Mesh bounds: {min_co} to {max_co}")
    print(f"  Creating face morphs...")

    # EyeSize - scale eyes area
    eye_offsets = {}
    for i, v in enumerate(mesh.vertices):
        if abs(v.co.z - eye_height) < 0.04 and abs(v.co.y - max_co.y) < 0.1:
            # Scale outward from eye center
            factor = 0.02
            offset = (0, 0, v.co.z * factor - eye_height * factor)
            eye_offsets[i] = offset
    add_shape_key(mesh_obj, "EyeSize", eye_offsets)
    print(f"    EyeSize: {len(eye_offsets)} vertices")

    # EyeSpacing - move eyes apart
    eye_spacing_offsets = {}
    for i, v in enumerate(mesh.vertices):
        if abs(v.co.z - eye_height) < 0.04 and abs(v.co.y - max_co.y) < 0.1:
            # Move left eye left, right eye right
            direction = 1 if v.co.x > center_x else -1
            offset = (direction * 0.01, 0, 0)
            eye_spacing_offsets[i] = offset
    add_shape_key(mesh_obj, "EyeSpacing", eye_spacing_offsets)
    print(f"    EyeSpacing: {len(eye_spacing_offsets)} vertices")

    # NoseWidth - widen nose
    nose_offsets = {}
    for i, v in enumerate(mesh.vertices):
        if abs(v.co.z - nose_height) < 0.03 and abs(v.co.x - center_x) < 0.05:
            # Scale nose wider in X
            direction = 1 if v.co.x > center_x else -1
            distance = abs(v.co.x - center_x)
            offset = (direction * distance * 0.3, 0, 0)
            nose_offsets[i] = offset
    add_shape_key(mesh_obj, "NoseWidth", nose_offsets)
    print(f"    NoseWidth: {len(nose_offsets)} vertices")

    # NoseLength - extend nose forward
    nose_length_offsets = {}
    for i, v in enumerate(mesh.vertices):
        if abs(v.co.z - nose_height) < 0.04 and v.co.y < max_co.y - 0.02:
            # Move nose forward (positive Y)
            factor = max(0, 1 - abs(v.co.z - nose_height) / 0.04) * 0.02
            offset = (0, -factor, 0)
            nose_length_offsets[i] = offset
    add_shape_key(mesh_obj, "NoseLength", nose_length_offsets)
    print(f"    NoseLength: {len(nose_length_offsets)} vertices")

    # JawWidth - widen jaw
    jaw_offsets = {}
    for i, v in enumerate(mesh.vertices):
        if v.co.z < chin_height + 0.05 and v.co.z > chin_height - 0.03:
            # Scale jaw wider
            direction = 1 if v.co.x > center_x else -1
            distance = abs(v.co.x - center_x)
            offset = (direction * distance * 0.2, 0, 0)
            jaw_offsets[i] = offset
    add_shape_key(mesh_obj, "JawWidth", jaw_offsets)
    print(f"    JawWidth: {len(jaw_offsets)} vertices")

    # ChinLength - extend chin down
    chin_offsets = {}
    for i, v in enumerate(mesh.vertices):
        if v.co.z < chin_height + 0.02 and abs(v.co.x - center_x) < 0.05:
            # Move chin down
            factor = max(0, 1 - (v.co.z - (chin_height - 0.02)) / 0.04) * 0.02
            offset = (0, 0, -factor)
            chin_offsets[i] = offset
    add_shape_key(mesh_obj, "ChinLength", chin_offsets)
    print(f"    ChinLength: {len(chin_offsets)} vertices")

    # LipFullness - plump lips
    lip_offsets = {}
    for i, v in enumerate(mesh.vertices):
        if abs(v.co.z - mouth_height) < 0.02 and abs(v.co.x - center_x) < 0.04:
            # Push lips forward
            offset = (0, -0.01, 0)
            lip_offsets[i] = offset
    add_shape_key(mesh_obj, "LipFullness", lip_offsets)
    print(f"    LipFullness: {len(lip_offsets)} vertices")

    # CheekboneHeight - raise cheekbones
    cheek_offsets = {}
    cheek_height = eye_height - 0.03
    for i, v in enumerate(mesh.vertices):
        if abs(v.co.z - cheek_height) < 0.03 and abs(v.co.x - center_x) > 0.03:
            # Move cheekbones up and out
            direction = 1 if v.co.x > center_x else -1
            offset = (direction * 0.005, 0, 0.01)
            cheek_offsets[i] = offset
    add_shape_key(mesh_obj, "CheekboneHeight", cheek_offsets)
    print(f"    CheekboneHeight: {len(cheek_offsets)} vertices")


def create_body_morphs(mesh_obj):
    """Create body build morph targets"""

    mesh = mesh_obj.data
    min_co, max_co = get_mesh_bounds(mesh)

    # Body bounds (below head)
    body_top = max_co.z - 0.25  # Below head
    body_bottom = min_co.z
    center_x = (min_co.x + max_co.x) / 2

    print(f"  Creating body morphs...")

    # Build_Slim - thin body
    slim_offsets = {}
    for i, v in enumerate(mesh.vertices):
        if v.co.z < body_top:
            # Scale inward in X and Y
            dist_from_center_x = abs(v.co.x - center_x)
            offset = (
                -0.05 * (v.co.x - center_x) if dist_from_center_x > 0.05 else 0,
                0,
                0
            )
            if any(o != 0 for o in offset):
                slim_offsets[i] = offset
    add_shape_key(mesh_obj, "Build_Slim", slim_offsets)
    print(f"    Build_Slim: {len(slim_offsets)} vertices")

    # Build_Athletic - muscular body
    athletic_offsets = {}
    for i, v in enumerate(mesh.vertices):
        if v.co.z < body_top and v.co.z > body_bottom + 0.3:
            # Expand shoulders and chest
            dist_from_center_x = abs(v.co.x - center_x)
            shoulder_factor = max(0, (v.co.z - (body_top - 0.3)) / 0.3)
            offset = (
                0.03 * (v.co.x - center_x) * shoulder_factor if dist_from_center_x > 0.05 else 0,
                0,
                0
            )
            if any(o != 0 for o in offset):
                athletic_offsets[i] = offset
    add_shape_key(mesh_obj, "Build_Athletic", athletic_offsets)
    print(f"    Build_Athletic: {len(athletic_offsets)} vertices")

    # Build_Heavy - larger body
    heavy_offsets = {}
    for i, v in enumerate(mesh.vertices):
        if v.co.z < body_top:
            # Scale outward
            dist_from_center_x = abs(v.co.x - center_x)
            offset = (
                0.08 * (v.co.x - center_x) if dist_from_center_x > 0.05 else 0,
                -0.02 if v.co.z > body_bottom + 0.3 else 0,
                0
            )
            if any(o != 0 for o in offset):
                heavy_offsets[i] = offset
    add_shape_key(mesh_obj, "Build_Heavy", heavy_offsets)
    print(f"    Build_Heavy: {len(heavy_offsets)} vertices")


def export_with_morphs(char_blend_path, output_path):
    """Load mesh, add morphs, rig, and export"""

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

    # Replace materials with skin material
    mesh_obj.data.materials.clear()
    skin_mat = create_skin_material("Skin")
    mesh_obj.data.materials.append(skin_mat)
    for poly in mesh_obj.data.polygons:
        poly.material_index = 0

    # Add morph targets
    print("Adding morph targets...")
    create_face_morphs(mesh_obj)
    create_body_morphs(mesh_obj)

    # Report shape keys
    if mesh_obj.data.shape_keys:
        print(f"  Total shape keys: {len(mesh_obj.data.shape_keys.key_blocks)}")
        for kb in mesh_obj.data.shape_keys.key_blocks:
            print(f"    - {kb.name}")

    # Create armature
    armature_obj = create_mixamo_armature()
    print(f"  Created armature with {len(armature_obj.data.bones)} bones")

    # Parent mesh to armature with automatic weights
    mesh_obj.select_set(True)
    armature_obj.select_set(True)
    bpy.context.view_layer.objects.active = armature_obj

    try:
        bpy.ops.object.parent_set(type='ARMATURE_AUTO')
        print("  Parented with automatic weights")
    except Exception as e:
        print(f"  Auto-weight failed: {e}")
        mesh_obj.parent = armature_obj
        mod = mesh_obj.modifiers.new("Armature", 'ARMATURE')
        mod.object = armature_obj
        print("  Parented with empty weights")

    # Select all for export
    bpy.ops.object.select_all(action='SELECT')

    # Export with morphs
    print(f"Exporting to: {output_path}")
    bpy.ops.export_scene.gltf(
        filepath=output_path,
        export_format='GLB',
        use_selection=True,
        export_apply=False,
        export_animations=False,
        export_skins=True,
        export_morph=True,  # Enable morph targets!
        export_morph_normal=False,  # Skip morph normals to save size
        export_yup=True,
        export_materials='EXPORT',
    )

    print(f"  Exported successfully!")
    return True


def main():
    args = get_args()

    if len(args) < 1:
        print("Usage: blender --background --python add_morph_targets.py -- <output_dir>")
        sys.exit(1)

    output_dir = os.path.abspath(args[0])
    db_path = "/Users/nolangriffis/Documents/Producer Tour Official Website/Producer-Tour-Website/producer-tour-react/scripts/blender/addons/CharMorph-db-master"

    os.makedirs(output_dir, exist_ok=True)

    print("=" * 60)
    print("CHARACTER EXPORT WITH MORPH TARGETS")
    print("=" * 60)

    characters = [
        ('mb_male', 'base_male.glb'),
        ('mb_female', 'base_female.glb'),
    ]

    for char_dir, output_name in characters:
        char_path = os.path.join(db_path, 'characters', char_dir, 'char.blend')
        output_path = os.path.join(output_dir, output_name)

        print(f"\n--- {char_dir} ---")
        export_with_morphs(char_path, output_path)

    print("\n" + "=" * 60)
    print("DONE")
    print("=" * 60)


if __name__ == "__main__":
    main()
