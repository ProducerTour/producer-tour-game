#!/usr/bin/env python3
"""
Add procedural morph targets to existing base mesh.
Supports both GLB and FBX input (for Mixamo-rigged meshes).
Creates all 26 morph targets for RPM-like character customization.
Also adds body and eye materials if missing.

IMPORTANT: Mixamo exports models in centimeters with a 0.01 scale on the armature.
This script applies transforms first to normalize the mesh to meters, then creates
morphs with appropriate offsets.
"""

import bpy
import sys
import os
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

def get_mesh_bounds(mesh):
    """Get bounding box of mesh in world space"""
    min_co = Vector((float('inf'), float('inf'), float('inf')))
    max_co = Vector((float('-inf'), float('-inf'), float('-inf')))

    for v in mesh.vertices:
        for i in range(3):
            min_co[i] = min(min_co[i], v.co[i])
            max_co[i] = max(max_co[i], v.co[i])

    return min_co, max_co

def apply_all_transforms():
    """Apply all transforms to normalize model to proper scale"""
    print("  Applying all transforms...")
    import math
    from mathutils import Quaternion

    # First, find armature and apply its scale
    for obj in bpy.context.scene.objects:
        if obj.type == 'ARMATURE':
            # Check if armature has small scale (Mixamo export)
            if obj.scale.x < 0.1:
                print(f"    Armature {obj.name} has scale {obj.scale.x:.4f}")
                print(f"    Applying scale to normalize mesh...")

                # Select armature and all children
                bpy.ops.object.select_all(action='DESELECT')
                obj.select_set(True)
                for child in obj.children:
                    child.select_set(True)
                bpy.context.view_layer.objects.active = obj

                # Apply scale to armature and children
                bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
                print(f"    Scale applied!")

    # Apply rotation to fix Y-up to Z-up if needed
    for obj in bpy.context.scene.objects:
        if obj.type == 'ARMATURE':
            # Check rotation - could be Euler or Quaternion
            # glTF files typically have a 90-degree X rotation to convert Y-up to Z-up
            rot = obj.rotation_quaternion if obj.rotation_mode == 'QUATERNION' else obj.rotation_euler.to_quaternion()

            # A 90-degree X rotation quaternion is approximately (0.707, 0.707, 0, 0)
            x_90_quat = Quaternion((0.7071, 0.7071, 0, 0))
            angle_diff = rot.rotation_difference(x_90_quat).angle

            if angle_diff < 0.1:  # Within ~6 degrees of 90-degree X rotation
                print(f"    Armature has Y-up rotation, applying to convert to Z-up...")
                bpy.ops.object.select_all(action='DESELECT')
                obj.select_set(True)
                for child in obj.children:
                    child.select_set(True)
                bpy.context.view_layer.objects.active = obj
                bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)
                print(f"    Rotation applied!")


def clear_existing_shape_keys(mesh_obj):
    """Remove all shape keys except Basis"""
    if not mesh_obj.data.shape_keys:
        return

    # We need to remove shape keys one at a time
    # Starting from the last one (to avoid index issues)
    keys = mesh_obj.data.shape_keys.key_blocks
    key_names = [k.name for k in keys if k.name != 'Basis']

    for name in reversed(key_names):
        idx = keys.find(name)
        if idx >= 0:
            mesh_obj.active_shape_key_index = idx
            bpy.ops.object.shape_key_remove()

    print(f"    Cleared {len(key_names)} existing shape keys")


def add_shape_key(mesh_obj, name, vertex_offsets):
    """Add a shape key with specified vertex offsets"""

    # Ensure basis shape key exists
    if not mesh_obj.data.shape_keys:
        mesh_obj.shape_key_add(name="Basis")

    # Check if shape key with this name already exists
    if mesh_obj.data.shape_keys:
        existing = mesh_obj.data.shape_keys.key_blocks.get(name)
        if existing:
            # Remove existing shape key
            idx = mesh_obj.data.shape_keys.key_blocks.find(name)
            mesh_obj.active_shape_key_index = idx
            bpy.ops.object.shape_key_remove()

    # Add the new shape key
    sk = mesh_obj.shape_key_add(name=name)

    # Apply offsets
    for idx, offset in vertex_offsets.items():
        if idx < len(sk.data):
            sk.data[idx].co = mesh_obj.data.vertices[idx].co + Vector(offset)

    return sk


def create_materials(mesh_obj):
    """Create body and eye materials if not present"""

    print("  Creating materials...")

    # Check if materials already exist
    existing_mats = [mat.name for mat in mesh_obj.data.materials if mat]

    # Body material (tintable skin)
    if 'Body' not in existing_mats and 'Skin' not in existing_mats:
        body_mat = bpy.data.materials.new(name="Body")
        body_mat.use_nodes = True
        bsdf = body_mat.node_tree.nodes.get("Principled BSDF")
        if bsdf:
            # Medium skin tone as default (will be tinted in-game)
            bsdf.inputs["Base Color"].default_value = (0.78, 0.53, 0.33, 1.0)
            bsdf.inputs["Roughness"].default_value = 0.5
            bsdf.inputs["Subsurface Weight"].default_value = 0.1
        mesh_obj.data.materials.append(body_mat)
        print(f"    Created Body material")

    # Eye material (for iris tinting)
    if 'Eyes' not in existing_mats and 'Eye' not in existing_mats:
        eye_mat = bpy.data.materials.new(name="Eyes")
        eye_mat.use_nodes = True
        bsdf = eye_mat.node_tree.nodes.get("Principled BSDF")
        if bsdf:
            # Brown iris as default
            bsdf.inputs["Base Color"].default_value = (0.42, 0.27, 0.14, 1.0)
            bsdf.inputs["Roughness"].default_value = 0.1
            bsdf.inputs["Specular IOR Level"].default_value = 0.5
        mesh_obj.data.materials.append(eye_mat)
        print(f"    Created Eyes material")


def create_face_morphs(mesh_obj):
    """Create all 23 facial morph targets based on vertex positions"""

    mesh = mesh_obj.data
    min_co, max_co = get_mesh_bounds(mesh)

    # Calculate dimensions for each axis
    dim_x = max_co.x - min_co.x
    dim_y = max_co.y - min_co.y
    dim_z = max_co.z - min_co.z

    # Detect which axis is "up" based on largest dimension (humans are tall)
    # For glTF/GLB Y is typically up, for Blender native Z is up
    if dim_y > dim_z and dim_y > dim_x:
        # Y is up (glTF convention)
        mesh_height = dim_y
        mesh_width = dim_x
        mesh_depth = dim_z
        up_axis = 'Y'
        # Lambda functions to get coordinates in normalized space
        get_height = lambda v: v.co.y
        get_width = lambda v: abs(v.co.x)
        get_depth = lambda v: v.co.z
        center_x = (min_co.x + max_co.x) / 2
        center_depth = (min_co.z + max_co.z) / 2
        head_top = max_co.y
    else:
        # Z is up (Blender convention)
        mesh_height = dim_z
        mesh_width = dim_x
        mesh_depth = dim_y
        up_axis = 'Z'
        get_height = lambda v: v.co.z
        get_width = lambda v: abs(v.co.x)
        get_depth = lambda v: v.co.y
        center_x = (min_co.x + max_co.x) / 2
        center_depth = (min_co.y + max_co.y) / 2
        head_top = max_co.z

    # Detect mesh scale (cm vs m) based on height
    # Human ~1.8m or ~180cm
    if mesh_height > 50:  # Centimeters (height > 50 means cm scale)
        scale_factor = 1.0
        unit = "cm"
    else:  # Meters
        scale_factor = 100.0
        unit = "m"

    print(f"  Mesh bounds: {min_co} to {max_co}")
    print(f"  Mesh height: {mesh_height:.2f} ({unit} scale, {up_axis}-up)")
    print(f"  Center X: {center_x:.3f}")

    # Use proportional measurements based on mesh height
    # Head is roughly 1/8 of body height, face is 80% of head
    head_base = head_top - (mesh_height * 0.125)  # Head is 1/8 of body
    face_height = mesh_height * 0.10  # Face region

    # Face feature reference heights (proportional to face)
    forehead_height = head_top - (face_height * 0.15)
    eyebrow_height = head_top - (face_height * 0.25)
    eye_height = head_top - (face_height * 0.35)
    cheek_height = head_top - (face_height * 0.50)
    nose_height = head_top - (face_height * 0.60)
    mouth_height = head_top - (face_height * 0.75)
    chin_height = head_top - (face_height * 0.95)

    # Base offset magnitude (proportional to face size, very subtle)
    # For a 180cm human, face is about 18cm, so base offset ~0.3cm = 0.16% of face
    base_offset = face_height * 0.015  # 1.5% of face height

    print(f"  Face region: {chin_height:.1f} to {head_top:.1f}")
    print(f"  Base offset magnitude: {base_offset:.3f}")
    print(f"  Creating face morphs (23 targets)...")

    # Face width is roughly equal to face height (oval face)
    # mesh_width is full arm span - NOT face width!
    face_width = face_height * 0.80  # Face width ~80% of face height

    # Proportional zone sizes based on face dimensions (not body)
    eye_zone_h = face_height * 0.20  # Vertical zone for eyes
    eye_zone_w = face_width * 0.40  # Eyes span ~40% of face width from center
    nose_zone_w = face_width * 0.20  # Nose is ~20% of face width
    mouth_zone_w = face_width * 0.30  # Mouth is ~30% of face width

    print(f"  Face width: {face_width:.3f}, Eye zone: {eye_zone_w:.3f}")

    # Helper to create offset tuple based on up axis
    def make_offset(dx, dy_depth, dz_height):
        """Create offset tuple based on detected up axis"""
        if up_axis == 'Y':
            return (dx, dz_height, dy_depth)  # Y is up, Z is depth
        else:
            return (dx, dy_depth, dz_height)  # Z is up, Y is depth

    # ============== EYES (6 morphs) ==============

    # EyeSize - scale eyes area
    eye_offsets = {}
    for i, v in enumerate(mesh.vertices):
        vh = get_height(v)
        vw = get_width(v)
        dh = abs(vh - eye_height)
        if dh < eye_zone_h and vw < eye_zone_w:
            factor = base_offset * (1 - dh / eye_zone_h)
            eye_offsets[i] = make_offset(0, 0, factor)  # Move up
    add_shape_key(mesh_obj, "EyeSize", eye_offsets)
    print(f"    EyeSize: {len(eye_offsets)} vertices")

    # EyeSpacing - move eyes apart
    eye_spacing_offsets = {}
    inner_limit = face_width * 0.10  # Inner eye corner ~10% of face width from center
    for i, v in enumerate(mesh.vertices):
        vh = get_height(v)
        vw = get_width(v)
        dh = abs(vh - eye_height)
        if dh < eye_zone_h and vw > inner_limit and vw < eye_zone_w:
            direction = 1 if v.co.x > center_x else -1
            factor = base_offset * 0.7 * (1 - dh / eye_zone_h)
            eye_spacing_offsets[i] = make_offset(direction * factor, 0, 0)
    add_shape_key(mesh_obj, "EyeSpacing", eye_spacing_offsets)
    print(f"    EyeSpacing: {len(eye_spacing_offsets)} vertices")

    # EyeTilt - tilt outer eye corner up/down
    eye_tilt_offsets = {}
    inner_eye = face_width * 0.15  # Inner edge of eye area
    outer_eye = face_width * 0.45  # Outer edge of eye area
    for i, v in enumerate(mesh.vertices):
        vh = get_height(v)
        vw = get_width(v)
        dh = abs(vh - eye_height)
        if dh < eye_zone_h * 0.8 and vw > inner_eye and vw < outer_eye:
            outer_factor = (vw - inner_eye) / (outer_eye - inner_eye)
            factor = base_offset * outer_factor * (1 - dh / (eye_zone_h * 0.8))
            eye_tilt_offsets[i] = make_offset(0, 0, factor)  # Move up
    add_shape_key(mesh_obj, "EyeTilt", eye_tilt_offsets)
    print(f"    EyeTilt: {len(eye_tilt_offsets)} vertices")

    # EyeDepth - sunken/protruding eyes
    eye_depth_offsets = {}
    eye_width = face_width * 0.40  # Full eye socket width
    for i, v in enumerate(mesh.vertices):
        vh = get_height(v)
        vw = get_width(v)
        dh = abs(vh - eye_height)
        if dh < eye_zone_h * 0.9 and vw > inner_limit and vw < eye_width:
            factor = base_offset * 1.3 * (1 - dh / (eye_zone_h * 0.9))
            eye_depth_offsets[i] = make_offset(0, -factor, 0)  # Push forward
    add_shape_key(mesh_obj, "EyeDepth", eye_depth_offsets)
    print(f"    EyeDepth: {len(eye_depth_offsets)} vertices")

    # UpperEyelid - hooded/open upper eyelid
    upper_eyelid_offsets = {}
    upper_lid_height = eye_height + (face_height * 0.04)
    eyelid_zone = face_height * 0.08
    for i, v in enumerate(mesh.vertices):
        vh = get_height(v)
        vw = get_width(v)
        dh = abs(vh - upper_lid_height)
        if dh < eyelid_zone and vw > inner_limit and vw < eye_width:
            factor = base_offset * (1 - dh / eyelid_zone)
            upper_eyelid_offsets[i] = make_offset(0, 0, -factor)  # Move down
    add_shape_key(mesh_obj, "UpperEyelid", upper_eyelid_offsets)
    print(f"    UpperEyelid: {len(upper_eyelid_offsets)} vertices")

    # LowerEyelid - baggy/tight lower eyelid
    lower_eyelid_offsets = {}
    lower_lid_height = eye_height - (face_height * 0.04)
    for i, v in enumerate(mesh.vertices):
        vh = get_height(v)
        vw = get_width(v)
        dh = abs(vh - lower_lid_height)
        if dh < eyelid_zone and vw > inner_limit and vw < eye_width:
            factor = base_offset * 0.7 * (1 - dh / eyelid_zone)
            lower_eyelid_offsets[i] = make_offset(0, -factor * 0.5, -factor)  # Move down and forward
    add_shape_key(mesh_obj, "LowerEyelid", lower_eyelid_offsets)
    print(f"    LowerEyelid: {len(lower_eyelid_offsets)} vertices")

    # ============== EYEBROWS (2 morphs) ==============

    brow_zone = face_height * 0.12
    brow_inner = face_width * 0.10  # Inner brow starts at nose bridge
    brow_outer = face_width * 0.45  # Outer brow extends past eye

    # EyebrowHeight - raise/lower eyebrows
    eyebrow_height_offsets = {}
    for i, v in enumerate(mesh.vertices):
        vh = get_height(v)
        vw = get_width(v)
        dh = abs(vh - eyebrow_height)
        if dh < brow_zone and vw > brow_inner and vw < brow_outer:
            factor = base_offset * 1.3 * (1 - dh / brow_zone)
            eyebrow_height_offsets[i] = make_offset(0, 0, factor)
    add_shape_key(mesh_obj, "EyebrowHeight", eyebrow_height_offsets)
    print(f"    EyebrowHeight: {len(eyebrow_height_offsets)} vertices")

    # EyebrowArch - flat/arched eyebrows
    eyebrow_arch_offsets = {}
    brow_mid = (brow_inner + brow_outer) / 2
    for i, v in enumerate(mesh.vertices):
        vh = get_height(v)
        vw = get_width(v)
        dh = abs(vh - eyebrow_height)
        if dh < brow_zone and vw > brow_inner and vw < brow_outer:
            arch_factor = 1 - abs((vw - brow_mid) / (brow_outer - brow_mid))
            factor = base_offset * arch_factor * (1 - dh / brow_zone)
            eyebrow_arch_offsets[i] = make_offset(0, 0, factor)
    add_shape_key(mesh_obj, "EyebrowArch", eyebrow_arch_offsets)
    print(f"    EyebrowArch: {len(eyebrow_arch_offsets)} vertices")

    # ============== NOSE (6 morphs) ==============

    nose_zone_h = face_height * 0.15
    nose_width_zone = face_width * 0.20  # Nose is ~20% of face width

    # NoseWidth - widen nose
    nose_offsets = {}
    for i, v in enumerate(mesh.vertices):
        vh = get_height(v)
        vw = get_width(v)
        dh = abs(vh - nose_height)
        if dh < nose_zone_h and vw < nose_width_zone:
            direction = 1 if v.co.x > center_x else -1
            factor = (vw / nose_width_zone) * base_offset * 1.5 * (1 - dh / nose_zone_h)
            nose_offsets[i] = make_offset(direction * factor, 0, 0)
    add_shape_key(mesh_obj, "NoseWidth", nose_offsets)
    print(f"    NoseWidth: {len(nose_offsets)} vertices")

    # NoseLength - extend nose forward
    nose_length_offsets = {}
    for i, v in enumerate(mesh.vertices):
        vh = get_height(v)
        vw = get_width(v)
        dh = abs(vh - nose_height)
        if dh < nose_zone_h * 1.2 and vw < nose_width_zone * 0.8:
            factor = (1 - dh / (nose_zone_h * 1.2)) * base_offset * 1.3
            nose_length_offsets[i] = make_offset(0, -factor, 0)
    add_shape_key(mesh_obj, "NoseLength", nose_length_offsets)
    print(f"    NoseLength: {len(nose_length_offsets)} vertices")

    # NoseBridge - wide/narrow bridge
    nose_bridge_offsets = {}
    bridge_height = nose_height + (face_height * 0.12)
    bridge_zone = face_height * 0.12
    bridge_width = face_width * 0.12  # Bridge is narrow center of face
    for i, v in enumerate(mesh.vertices):
        vh = get_height(v)
        vw = get_width(v)
        dh = abs(vh - bridge_height)
        if dh < bridge_zone and vw < bridge_width:
            direction = 1 if v.co.x > center_x else -1
            factor = base_offset * 0.7 * (1 - dh / bridge_zone)
            nose_bridge_offsets[i] = make_offset(direction * factor, 0, 0)
    add_shape_key(mesh_obj, "NoseBridge", nose_bridge_offsets)
    print(f"    NoseBridge: {len(nose_bridge_offsets)} vertices")

    # NoseTip - upturned/downturned tip
    nose_tip_offsets = {}
    tip_height = nose_height - (face_height * 0.08)
    tip_zone = face_height * 0.10
    tip_width = face_width * 0.15  # Nose tip area
    for i, v in enumerate(mesh.vertices):
        vh = get_height(v)
        vw = get_width(v)
        dh = abs(vh - tip_height)
        if dh < tip_zone and vw < tip_width:
            factor = base_offset * (1 - dh / tip_zone)
            nose_tip_offsets[i] = make_offset(0, 0, factor)  # Move up
    add_shape_key(mesh_obj, "NoseTip", nose_tip_offsets)
    print(f"    NoseTip: {len(nose_tip_offsets)} vertices")

    # NostrilFlare - narrow/wide nostrils
    nostril_offsets = {}
    nostril_height = nose_height - (face_height * 0.06)
    nostril_zone = face_height * 0.08
    nostril_inner = face_width * 0.05  # Inside edge of nostrils
    nostril_outer = face_width * 0.18  # Outside edge of nostrils
    for i, v in enumerate(mesh.vertices):
        vh = get_height(v)
        vw = get_width(v)
        dh = abs(vh - nostril_height)
        if dh < nostril_zone and vw > nostril_inner and vw < nostril_outer:
            direction = 1 if v.co.x > center_x else -1
            factor = base_offset * (1 - dh / nostril_zone)
            nostril_offsets[i] = make_offset(direction * factor, 0, 0)
    add_shape_key(mesh_obj, "NostrilFlare", nostril_offsets)
    print(f"    NostrilFlare: {len(nostril_offsets)} vertices")

    # NoseProfile - flat/prominent nose
    nose_profile_offsets = {}
    profile_zone = face_height * 0.25
    for i, v in enumerate(mesh.vertices):
        vh = get_height(v)
        vw = get_width(v)
        dh = vh - nose_height
        if abs(dh) < profile_zone and vw < nose_width_zone * 0.8:
            profile_factor = max(0, (dh + profile_zone * 0.4) / (profile_zone * 1.4))
            factor = base_offset * 1.5 * profile_factor
            nose_profile_offsets[i] = make_offset(0, -factor, 0)
    add_shape_key(mesh_obj, "NoseProfile", nose_profile_offsets)
    print(f"    NoseProfile: {len(nose_profile_offsets)} vertices")

    # ============== MOUTH/LIPS (5 morphs) ==============

    mouth_zone_h = face_height * 0.12
    lip_width = face_width * 0.25  # Lips span ~25% of face width
    lip_zone = face_height * 0.06
    mouth_inner = face_width * 0.10  # Inner mouth edge
    mouth_outer = face_width * 0.30  # Outer mouth corners

    # MouthWidth - narrow/wide mouth
    mouth_width_offsets = {}
    for i, v in enumerate(mesh.vertices):
        vh = get_height(v)
        vw = get_width(v)
        dh = abs(vh - mouth_height)
        if dh < mouth_zone_h and vw > mouth_inner and vw < mouth_outer:
            direction = 1 if v.co.x > center_x else -1
            factor = base_offset * (1 - dh / mouth_zone_h)
            mouth_width_offsets[i] = make_offset(direction * factor, 0, 0)
    add_shape_key(mesh_obj, "MouthWidth", mouth_width_offsets)
    print(f"    MouthWidth: {len(mouth_width_offsets)} vertices")

    # UpperLipSize - thin/full upper lip
    upper_lip_offsets = {}
    upper_lip_height = mouth_height + (face_height * 0.04)
    for i, v in enumerate(mesh.vertices):
        vh = get_height(v)
        vw = get_width(v)
        dh = abs(vh - upper_lip_height)
        if dh < lip_zone and vw < lip_width:
            factor = base_offset * 0.7 * (1 - dh / lip_zone)
            upper_lip_offsets[i] = make_offset(0, -factor, factor * 0.5)
    add_shape_key(mesh_obj, "UpperLipSize", upper_lip_offsets)
    print(f"    UpperLipSize: {len(upper_lip_offsets)} vertices")

    # LowerLipSize - thin/full lower lip
    lower_lip_offsets = {}
    lower_lip_height = mouth_height - (face_height * 0.04)
    for i, v in enumerate(mesh.vertices):
        vh = get_height(v)
        vw = get_width(v)
        dh = abs(vh - lower_lip_height)
        if dh < lip_zone and vw < lip_width:
            factor = base_offset * 0.7 * (1 - dh / lip_zone)
            lower_lip_offsets[i] = make_offset(0, -factor, -factor * 0.5)
    add_shape_key(mesh_obj, "LowerLipSize", lower_lip_offsets)
    print(f"    LowerLipSize: {len(lower_lip_offsets)} vertices")

    # LipFullness - overall lip fullness
    lip_offsets = {}
    for i, v in enumerate(mesh.vertices):
        vh = get_height(v)
        vw = get_width(v)
        dh = abs(vh - mouth_height)
        if dh < mouth_zone_h * 0.8 and vw < lip_width:
            factor = (1 - dh / (mouth_zone_h * 0.8)) * base_offset * 0.7
            lip_offsets[i] = make_offset(0, -factor, 0)
    add_shape_key(mesh_obj, "LipFullness", lip_offsets)
    print(f"    LipFullness: {len(lip_offsets)} vertices")

    # MouthCorners - down/up turned corners
    mouth_corners_offsets = {}
    corner_inner = face_width * 0.15  # Start of mouth corner area
    corner_outer = face_width * 0.30  # End of mouth corner area
    for i, v in enumerate(mesh.vertices):
        vh = get_height(v)
        vw = get_width(v)
        dh = abs(vh - mouth_height)
        if dh < mouth_zone_h * 0.8 and vw > corner_inner and vw < corner_outer:
            factor = base_offset * (1 - dh / (mouth_zone_h * 0.8))
            mouth_corners_offsets[i] = make_offset(0, 0, factor)  # Move up
    add_shape_key(mesh_obj, "MouthCorners", mouth_corners_offsets)
    print(f"    MouthCorners: {len(mouth_corners_offsets)} vertices")

    # ============== JAW/FACE SHAPE (4 morphs) ==============

    jaw_zone = face_height * 0.30
    jaw_inner = face_width * 0.20  # Inner edge of jaw
    jaw_outer = face_width * 0.55  # Outer edge of jaw (wider than face)

    # JawWidth - widen jaw
    jaw_offsets = {}
    for i, v in enumerate(mesh.vertices):
        vh = get_height(v)
        vw = get_width(v)
        dh = vh - chin_height
        if abs(dh) < jaw_zone and vw > jaw_inner and vw < jaw_outer:
            direction = 1 if v.co.x > center_x else -1
            factor = (vw / jaw_outer) * base_offset * (1 - abs(dh) / jaw_zone)
            jaw_offsets[i] = make_offset(direction * factor, 0, 0)
    add_shape_key(mesh_obj, "JawWidth", jaw_offsets)
    print(f"    JawWidth: {len(jaw_offsets)} vertices")

    # ChinLength - extend chin down
    chin_offsets = {}
    chin_zone = face_height * 0.15
    chin_center_h = chin_height - (face_height * 0.08)
    chin_width = face_width * 0.25  # Chin width
    for i, v in enumerate(mesh.vertices):
        vh = get_height(v)
        vw = get_width(v)
        dh = vh - chin_center_h
        if abs(dh) < chin_zone and vw < chin_width:
            factor = (1 - abs(dh) / chin_zone) * base_offset
            chin_offsets[i] = make_offset(0, 0, -factor)
    add_shape_key(mesh_obj, "ChinLength", chin_offsets)
    print(f"    ChinLength: {len(chin_offsets)} vertices")

    # ChinProtrusion - receding/prominent chin
    chin_protrusion_offsets = {}
    chin_protrusion_zone = face_height * 0.18
    for i, v in enumerate(mesh.vertices):
        vh = get_height(v)
        vw = get_width(v)
        dh = vh - chin_height
        if abs(dh) < chin_protrusion_zone and vw < chin_width:
            factor = base_offset * 1.3 * (1 - abs(dh) / chin_protrusion_zone)
            chin_protrusion_offsets[i] = make_offset(0, -factor, 0)  # Push forward
    add_shape_key(mesh_obj, "ChinProtrusion", chin_protrusion_offsets)
    print(f"    ChinProtrusion: {len(chin_protrusion_offsets)} vertices")

    # ChinCleft - chin dimple
    chin_cleft_offsets = {}
    cleft_h = chin_height - (face_height * 0.04)
    cleft_zone = face_height * 0.08
    cleft_width = face_width * 0.10  # Small center cleft area
    for i, v in enumerate(mesh.vertices):
        vh = get_height(v)
        vw = get_width(v)
        dh = abs(vh - cleft_h)
        if dh < cleft_zone and vw < cleft_width:
            factor = base_offset * 0.7 * (1 - dh / cleft_zone) * (1 - vw / cleft_width)
            chin_cleft_offsets[i] = make_offset(0, factor, 0)  # Push inward
    add_shape_key(mesh_obj, "ChinCleft", chin_cleft_offsets)
    print(f"    ChinCleft: {len(chin_cleft_offsets)} vertices")

    # FaceLength - short/long face
    face_length_offsets = {}
    face_center_h = (forehead_height + chin_height) / 2
    face_span = forehead_height - chin_height
    lower_bound = chin_height - (face_height * 0.08)
    upper_bound = forehead_height + (face_height * 0.08)
    for i, v in enumerate(mesh.vertices):
        vh = get_height(v)
        if vh > lower_bound and vh < upper_bound:
            dh = vh - face_center_h
            factor = base_offset * 0.6 * (dh / face_span)
            if abs(factor) > 0.0001:
                face_length_offsets[i] = make_offset(0, 0, factor)
    add_shape_key(mesh_obj, "FaceLength", face_length_offsets)
    print(f"    FaceLength: {len(face_length_offsets)} vertices")

    # ForeheadHeight - low/high forehead
    forehead_offsets = {}
    forehead_zone = face_height * 0.15
    forehead_width = face_width * 0.45  # Forehead spans most of face width
    for i, v in enumerate(mesh.vertices):
        vh = get_height(v)
        vw = get_width(v)
        dh = vh - forehead_height
        if dh > -(forehead_zone * 0.5) and dh < forehead_zone and vw < forehead_width:
            factor = base_offset * 1.3 * max(0, 1 - abs(dh) / forehead_zone)
            forehead_offsets[i] = make_offset(0, 0, factor)
    add_shape_key(mesh_obj, "ForeheadHeight", forehead_offsets)
    print(f"    ForeheadHeight: {len(forehead_offsets)} vertices")

    # CheekboneHeight - raise cheekbones
    cheek_offsets = {}
    cheek_zone = face_height * 0.15
    cheek_inner = face_width * 0.25  # Inner edge of cheekbone
    cheek_outer = face_width * 0.55  # Outer edge of cheekbone
    for i, v in enumerate(mesh.vertices):
        vh = get_height(v)
        vw = get_width(v)
        dh = abs(vh - cheek_height)
        if dh < cheek_zone and vw > cheek_inner and vw < cheek_outer:
            direction = 1 if v.co.x > center_x else -1
            factor = (1 - dh / cheek_zone)
            cheek_offsets[i] = make_offset(direction * base_offset * 0.3 * factor, 0, base_offset * 0.7 * factor)
    add_shape_key(mesh_obj, "CheekboneHeight", cheek_offsets)
    print(f"    CheekboneHeight: {len(cheek_offsets)} vertices")


def create_body_morphs(mesh_obj):
    """Create body build morph targets (SUBTLE changes)"""

    mesh = mesh_obj.data
    min_co, max_co = get_mesh_bounds(mesh)

    # Calculate mesh dimensions
    mesh_height = max_co.z - min_co.z
    mesh_width = max_co.x - min_co.x

    # Body bounds (below head - head is ~12.5% of height)
    head_height = max_co.z
    body_top = head_height - (mesh_height * 0.125)
    body_bottom = min_co.z
    center_x = (min_co.x + max_co.x) / 2

    # Base offset for body morphs (very subtle - ~1.5% of body width)
    body_offset = mesh_width * 0.015

    print(f"  Creating body morphs...")
    print(f"    Body region: {body_bottom:.1f} to {body_top:.1f}")
    print(f"    Body offset magnitude: {body_offset:.3f}")

    # Minimum dx threshold (proportional)
    min_dx = mesh_width * 0.12

    # Build_Slim - thin body (SUBTLE: scale inward)
    slim_offsets = {}
    for i, v in enumerate(mesh.vertices):
        if v.co.z < body_top:
            # Scale inward in X
            dx = v.co.x - center_x
            if abs(dx) > min_dx:
                factor = -0.02  # 2% inward
                offset = (dx * factor, 0, 0)
                slim_offsets[i] = offset
    add_shape_key(mesh_obj, "Build_Slim", slim_offsets)
    print(f"    Build_Slim: {len(slim_offsets)} vertices")

    # Build_Athletic - muscular body (expand shoulders/chest)
    athletic_offsets = {}
    shoulder_region = mesh_height * 0.20  # Shoulder zone from body top
    for i, v in enumerate(mesh.vertices):
        torso_bottom = body_bottom + (mesh_height * 0.25)
        if v.co.z < body_top and v.co.z > torso_bottom:
            dx = v.co.x - center_x
            # Shoulder zone factor (1 at shoulders, 0 below)
            shoulder_zone = max(0, (v.co.z - (body_top - shoulder_region)) / shoulder_region)
            if abs(dx) > min_dx and shoulder_zone > 0:
                factor = 0.015 * shoulder_zone  # 1.5% expansion at shoulders
                offset = (dx * factor, 0, 0)
                athletic_offsets[i] = offset
    add_shape_key(mesh_obj, "Build_Athletic", athletic_offsets)
    print(f"    Build_Athletic: {len(athletic_offsets)} vertices")

    # Build_Heavy - larger body (scale outward overall)
    heavy_offsets = {}
    for i, v in enumerate(mesh.vertices):
        if v.co.z < body_top:
            dx = v.co.x - center_x
            if abs(dx) > min_dx:
                factor = 0.03  # 3% expansion
                # Also push forward slightly for belly area
                torso_mid = body_bottom + (mesh_height * 0.20)
                y_offset = -body_offset * 0.3 if v.co.z > torso_mid else 0
                offset = (dx * factor, y_offset, 0)
                heavy_offsets[i] = offset
    add_shape_key(mesh_obj, "Build_Heavy", heavy_offsets)
    print(f"    Build_Heavy: {len(heavy_offsets)} vertices")


def import_model(input_path):
    """Import GLB or FBX file"""
    ext = os.path.splitext(input_path)[1].lower()

    if ext == '.glb' or ext == '.gltf':
        print(f"  Importing GLB: {input_path}")
        bpy.ops.import_scene.gltf(filepath=input_path)
    elif ext == '.fbx':
        print(f"  Importing FBX: {input_path}")
        bpy.ops.import_scene.fbx(filepath=input_path)
    else:
        raise ValueError(f"Unsupported file format: {ext}")


def process_model(input_path, output_path):
    """Load model (GLB or FBX), add morphs and materials, export as GLB"""

    clear_scene()
    print(f"\nLoading: {input_path}")

    # Import the model file
    import_model(input_path)

    # Apply transforms (important for Mixamo models which have 0.01 scale)
    apply_all_transforms()

    # Center the model - find root objects and zero their location
    print("  Centering model...")
    for obj in bpy.context.scene.objects:
        if obj.parent is None:  # Root level objects
            if abs(obj.location.x) > 0.01 or abs(obj.location.y) > 0.01:
                print(f"    Zeroing location of {obj.name}: {obj.location} -> (0, 0, 0)")
                obj.location = (0, 0, 0)

    # Find mesh objects
    mesh_objs = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH']

    if not mesh_objs:
        print("ERROR: No mesh found!")
        return False

    print(f"  Found {len(mesh_objs)} mesh(es)")

    # Find armature if present
    armatures = [obj for obj in bpy.context.scene.objects if obj.type == 'ARMATURE']
    if armatures:
        print(f"  Found armature: {armatures[0].name} ({len(armatures[0].data.bones)} bones)")
    else:
        print("  WARNING: No armature found - animations will not work!")

    # Add morphs to the main body mesh (usually the largest one)
    mesh_objs.sort(key=lambda obj: len(obj.data.vertices), reverse=True)
    main_mesh = mesh_objs[0]

    print(f"  Main mesh: {main_mesh.name} ({len(main_mesh.data.vertices)} verts)")

    # Select the main mesh (required for shape key operations)
    bpy.ops.object.select_all(action='DESELECT')
    main_mesh.select_set(True)
    bpy.context.view_layer.objects.active = main_mesh

    # Clear existing shape keys if any (to start fresh)
    if main_mesh.data.shape_keys:
        print(f"  Clearing existing shape keys...")
        clear_existing_shape_keys(main_mesh)

    # Add materials if needed
    create_materials(main_mesh)

    # Add morph targets
    print("Adding morph targets...")
    create_face_morphs(main_mesh)
    create_body_morphs(main_mesh)

    # Report shape keys
    if main_mesh.data.shape_keys:
        print(f"\n  Total shape keys: {len(main_mesh.data.shape_keys.key_blocks)}")
        for kb in main_mesh.data.shape_keys.key_blocks:
            print(f"    - {kb.name}")

    # Select all for export
    bpy.ops.object.select_all(action='SELECT')

    # Ensure output directory exists
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    # Export with morphs as GLB
    print(f"\nExporting to: {output_path}")
    bpy.ops.export_scene.gltf(
        filepath=output_path,
        export_format='GLB',
        use_selection=True,
        export_apply=False,
        export_animations=True,  # Keep animations if any
        export_skins=True,  # Keep skeleton
        export_morph=True,  # Enable morph targets!
        export_morph_normal=False,  # Skip morph normals to save size
        export_yup=True,
        export_materials='EXPORT',
    )

    print(f"  Exported successfully!")
    return True


def main():
    args = get_args()

    print("=" * 60)
    print("ADD MORPH TARGETS TO CHARACTER MESH")
    print("Supports GLB or FBX input, outputs GLB")
    print("Creates 26 morph targets + body/eye materials")
    print("=" * 60)

    # Support both single file and directory modes
    if len(args) == 2:
        input_path = os.path.abspath(args[0])
        output_path = os.path.abspath(args[1])

        # Check if input is a file or directory
        if os.path.isfile(input_path):
            # Single file mode
            print(f"\nSingle file mode:")
            process_model(input_path, output_path)
        elif os.path.isdir(input_path):
            # Directory mode (legacy)
            input_dir = input_path
            output_dir = output_path
            os.makedirs(output_dir, exist_ok=True)

            # Look for various input file patterns
            file_patterns = [
                # Mixamo rigged files
                ('mb_male_rigged.fbx', 'base_male.glb'),
                ('mb_female_rigged.fbx', 'base_female.glb'),
                # Original GLB files
                ('base_male_original.glb', 'base_male.glb'),
                ('base_female_original.glb', 'base_female.glb'),
                # Direct FBX files
                ('base_male.fbx', 'base_male.glb'),
                ('base_female.fbx', 'base_female.glb'),
            ]

            found_any = False
            for input_name, output_name in file_patterns:
                input_file = os.path.join(input_dir, input_name)
                output_file = os.path.join(output_dir, output_name)

                if os.path.exists(input_file):
                    print(f"\n--- {input_name} -> {output_name} ---")
                    process_model(input_file, output_file)
                    found_any = True

            if not found_any:
                print("\nNo supported input files found in directory!")
                print("Expected one of:")
                for pattern, _ in file_patterns:
                    print(f"  - {pattern}")
        else:
            print(f"ERROR: Input path does not exist: {input_path}")
            sys.exit(1)
    else:
        print("\nUsage:")
        print("  Single file:  blender --background --python add_morphs_to_existing.py -- <input.fbx> <output.glb>")
        print("  Directory:    blender --background --python add_morphs_to_existing.py -- <input_dir> <output_dir>")
        print("\nSupported input formats: .glb, .gltf, .fbx")
        print("Output format: .glb")
        sys.exit(1)

    print("\n" + "=" * 60)
    print("DONE")
    print("=" * 60)


if __name__ == "__main__":
    main()
