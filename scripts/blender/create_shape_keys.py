#!/usr/bin/env python3
"""
Blender script to create facial shape keys for character customization.
This creates morph targets by programmatically displacing vertices based on their position.

Usage: blender --background --python create_shape_keys.py -- /path/to/input.glb /path/to/output.glb

The script creates these shape keys:
- EyeSize: Scales eye region
- EyeSpacing: Moves eyes apart/together
- NoseWidth: Widens/narrows nose
- NoseLength: Extends/shortens nose
- JawWidth: Widens/narrows jaw
- ChinLength: Extends/shortens chin
- LipFullness: Scales lip region
- CheekboneHeight: Raises/lowers cheekbones
- Build_Slim: Slimmer body proportions
- Build_Athletic: Athletic build
- Build_Heavy: Heavier build
"""

import bpy
import bmesh
import sys
import math
from mathutils import Vector

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

def find_body_mesh(objects):
    """Find the main body mesh (largest vertex count)"""
    meshes = [obj for obj in objects if obj.type == 'MESH']
    if not meshes:
        return None
    return max(meshes, key=lambda m: len(m.data.vertices))

def get_mesh_bounds(mesh):
    """Get bounding box of mesh in local space"""
    verts = mesh.data.vertices
    if not verts:
        return None

    xs = [v.co.x for v in verts]
    ys = [v.co.y for v in verts]
    zs = [v.co.z for v in verts]

    return {
        'min': Vector((min(xs), min(ys), min(zs))),
        'max': Vector((max(xs), max(ys), max(zs))),
        'center': Vector(((min(xs)+max(xs))/2, (min(ys)+max(ys))/2, (min(zs)+max(zs))/2)),
        'size': Vector((max(xs)-min(xs), max(ys)-min(ys), max(zs)-min(zs))),
    }

def smooth_falloff(distance, radius, falloff_type='smooth'):
    """Calculate smooth falloff based on distance from center"""
    if distance >= radius:
        return 0.0

    t = distance / radius

    if falloff_type == 'linear':
        return 1.0 - t
    elif falloff_type == 'smooth':
        # Smooth hermite interpolation
        return 1.0 - (3 * t * t - 2 * t * t * t)
    elif falloff_type == 'sharp':
        return (1.0 - t) ** 2
    else:
        return 1.0 - t

def create_shape_key_from_function(mesh, name, transform_func, strength=1.0):
    """
    Create a shape key by applying a transformation function to each vertex.
    transform_func(vertex_co, bounds) -> displacement vector
    """
    # Ensure we have a basis shape key
    if not mesh.data.shape_keys:
        mesh.shape_key_add(name='Basis')

    # Create new shape key
    shape_key = mesh.shape_key_add(name=name)

    bounds = get_mesh_bounds(mesh)

    # Apply transformation
    for i, vert in enumerate(mesh.data.vertices):
        displacement = transform_func(vert.co.copy(), bounds)
        shape_key.data[i].co = vert.co + (displacement * strength)

    return shape_key

# ============================================================================
# FACIAL SHAPE KEY DEFINITIONS
# ============================================================================

def eye_size_transform(co, bounds):
    """Scale eyes - affects area around eye sockets"""
    # Estimate eye position (upper third of head, offset from center)
    head_top = bounds['max'].z
    head_center_y = bounds['center'].y

    # Eyes are roughly at 85% height, forward of center
    eye_height = head_top * 0.85
    eye_forward = bounds['max'].y * 0.7

    # Check if vertex is in eye region
    eye_region_radius = bounds['size'].x * 0.15

    # Left eye center
    left_eye = Vector((-bounds['size'].x * 0.12, eye_forward, eye_height))
    # Right eye center
    right_eye = Vector((bounds['size'].x * 0.12, eye_forward, eye_height))

    dist_left = (co - left_eye).length
    dist_right = (co - right_eye).length

    min_dist = min(dist_left, dist_right)

    if min_dist < eye_region_radius:
        falloff = smooth_falloff(min_dist, eye_region_radius)
        # Scale outward from eye center
        eye_center = left_eye if dist_left < dist_right else right_eye
        direction = (co - eye_center).normalized()
        return direction * falloff * 0.02

    return Vector((0, 0, 0))

def eye_spacing_transform(co, bounds):
    """Move eyes horizontally apart/together"""
    head_top = bounds['max'].z
    eye_height = head_top * 0.85
    eye_forward = bounds['max'].y * 0.7
    eye_region_radius = bounds['size'].x * 0.18

    # Check if in eye region height and forward position
    if abs(co.z - eye_height) < eye_region_radius and co.y > eye_forward * 0.8:
        # Calculate horizontal offset based on which side
        falloff = smooth_falloff(abs(co.z - eye_height), eye_region_radius)
        forward_falloff = smooth_falloff(abs(co.y - eye_forward), eye_region_radius)

        combined = falloff * forward_falloff

        if co.x > 0:
            return Vector((0.015 * combined, 0, 0))  # Move right eye right
        else:
            return Vector((-0.015 * combined, 0, 0))  # Move left eye left

    return Vector((0, 0, 0))

def nose_width_transform(co, bounds):
    """Widen/narrow the nose"""
    head_top = bounds['max'].z
    nose_height = head_top * 0.72  # Nose is at ~72% of head height
    nose_forward = bounds['max'].y * 0.85  # Nose protrudes forward
    nose_region_radius = bounds['size'].x * 0.12

    # Check if in nose region
    dist_from_nose = math.sqrt(
        (co.z - nose_height)**2 +
        (co.y - nose_forward)**2
    )

    if dist_from_nose < nose_region_radius and abs(co.x) < nose_region_radius:
        falloff = smooth_falloff(dist_from_nose, nose_region_radius)
        # Horizontal displacement based on x position
        if co.x > 0:
            return Vector((0.012 * falloff, 0, 0))
        else:
            return Vector((-0.012 * falloff, 0, 0))

    return Vector((0, 0, 0))

def nose_length_transform(co, bounds):
    """Extend/shorten the nose"""
    head_top = bounds['max'].z
    nose_tip_height = head_top * 0.68
    nose_forward = bounds['max'].y * 0.9
    nose_region_radius = bounds['size'].x * 0.1

    # Check if near nose tip
    dist = math.sqrt(
        (co.z - nose_tip_height)**2 +
        (co.y - nose_forward)**2 +
        co.x**2
    )

    if dist < nose_region_radius:
        falloff = smooth_falloff(dist, nose_region_radius)
        # Move forward and slightly down
        return Vector((0, 0.015 * falloff, -0.005 * falloff))

    return Vector((0, 0, 0))

def jaw_width_transform(co, bounds):
    """Widen/narrow the jaw"""
    head_top = bounds['max'].z
    jaw_height = head_top * 0.45  # Lower face
    jaw_region_height = bounds['size'].z * 0.2

    # Check if in jaw region (lower face)
    if co.z < jaw_height and co.z > jaw_height - jaw_region_height:
        height_factor = 1.0 - ((co.z - (jaw_height - jaw_region_height)) / jaw_region_height)

        if co.x > 0:
            return Vector((0.02 * height_factor, 0, 0))
        else:
            return Vector((-0.02 * height_factor, 0, 0))

    return Vector((0, 0, 0))

def chin_length_transform(co, bounds):
    """Extend/shorten the chin"""
    chin_height = bounds['min'].z + bounds['size'].z * 0.1
    chin_radius = bounds['size'].x * 0.15

    # Check if near chin
    dist = math.sqrt(co.x**2 + (co.z - chin_height)**2)

    if dist < chin_radius and co.y > bounds['center'].y:
        falloff = smooth_falloff(dist, chin_radius)
        # Move down and forward
        return Vector((0, 0.01 * falloff, -0.015 * falloff))

    return Vector((0, 0, 0))

def lip_fullness_transform(co, bounds):
    """Scale lips fuller/thinner"""
    head_top = bounds['max'].z
    lip_height = head_top * 0.58
    lip_forward = bounds['max'].y * 0.8
    lip_radius = bounds['size'].x * 0.1

    # Check if in lip region
    dist = math.sqrt(
        (co.z - lip_height)**2 +
        (co.y - lip_forward)**2 +
        (co.x * 0.5)**2  # Lips are wider than tall
    )

    if dist < lip_radius:
        falloff = smooth_falloff(dist, lip_radius)
        # Push forward and scale outward
        return Vector((0, 0.01 * falloff, 0))

    return Vector((0, 0, 0))

def cheekbone_transform(co, bounds):
    """Raise/lower cheekbones"""
    head_top = bounds['max'].z
    cheek_height = head_top * 0.75
    cheek_offset_x = bounds['size'].x * 0.2
    cheek_radius = bounds['size'].x * 0.12

    # Left cheekbone
    left_cheek = Vector((-cheek_offset_x, bounds['max'].y * 0.6, cheek_height))
    right_cheek = Vector((cheek_offset_x, bounds['max'].y * 0.6, cheek_height))

    dist_left = (co - left_cheek).length
    dist_right = (co - right_cheek).length
    min_dist = min(dist_left, dist_right)

    if min_dist < cheek_radius:
        falloff = smooth_falloff(min_dist, cheek_radius)
        # Push outward and up
        if dist_left < dist_right:
            return Vector((-0.008 * falloff, 0.005 * falloff, 0.01 * falloff))
        else:
            return Vector((0.008 * falloff, 0.005 * falloff, 0.01 * falloff))

    return Vector((0, 0, 0))

# ============================================================================
# BODY SHAPE KEY DEFINITIONS
# ============================================================================

def build_slim_transform(co, bounds):
    """Slim body build - reduce width of TORSO ONLY"""
    head_start = bounds['max'].z * 0.8
    torso_bottom = bounds['max'].z * 0.35  # Above hips/legs

    # Only affect torso region (chest to waist)
    if co.z < head_start and co.z > torso_bottom:
        # Check if it's in the center (torso, not arms)
        torso_width = bounds['size'].x * 0.25
        if abs(co.x) < torso_width:
            factor = 0.03  # Very subtle
            return Vector((-co.x * factor, -co.y * factor * 0.5, 0))

    return Vector((0, 0, 0))

def build_athletic_transform(co, bounds):
    """Athletic build - broader shoulders ONLY"""
    shoulder_height = bounds['max'].z * 0.72
    shoulder_range = bounds['size'].z * 0.08

    # Only affect shoulder region
    if abs(co.z - shoulder_height) < shoulder_range:
        # Only if outward from center (actual shoulders)
        if abs(co.x) > bounds['size'].x * 0.15:
            factor = 0.03  # Subtle shoulder broadening
            if co.x > 0:
                return Vector((factor, 0, 0))
            else:
                return Vector((-factor, 0, 0))

    return Vector((0, 0, 0))

def build_heavy_transform(co, bounds):
    """Heavy build - expand torso ONLY"""
    head_start = bounds['max'].z * 0.8
    torso_bottom = bounds['max'].z * 0.35

    # Only affect torso (not head, arms, or legs)
    if co.z < head_start and co.z > torso_bottom:
        torso_width = bounds['size'].x * 0.2
        if abs(co.x) < torso_width:
            factor = 0.02  # Subtle expansion
            return Vector((co.x * factor, co.y * factor * 0.8, 0))

    return Vector((0, 0, 0))

# ============================================================================
# MAIN
# ============================================================================

def create_all_shape_keys(mesh):
    """Create all required shape keys for character customization"""
    print(f"Creating shape keys for mesh: {mesh.name}")

    shape_keys = [
        ("EyeSize", eye_size_transform, 1.0),
        ("EyeSpacing", eye_spacing_transform, 1.0),
        ("NoseWidth", nose_width_transform, 1.0),
        ("NoseLength", nose_length_transform, 1.0),
        ("JawWidth", jaw_width_transform, 1.0),
        ("ChinLength", chin_length_transform, 1.0),
        ("LipFullness", lip_fullness_transform, 1.0),
        ("CheekboneHeight", cheekbone_transform, 1.0),
        ("Build_Slim", build_slim_transform, 1.0),
        ("Build_Athletic", build_athletic_transform, 1.0),
        ("Build_Heavy", build_heavy_transform, 1.0),
    ]

    for name, transform_func, strength in shape_keys:
        print(f"  Creating: {name}")
        create_shape_key_from_function(mesh, name, transform_func, strength)

    print(f"Created {len(shape_keys)} shape keys")

def export_glb(filepath):
    """Export scene as GLB with shape keys - compatible with Blender 4.x and 5.x"""
    # Blender 5.0 changed some export parameters
    export_params = {
        'filepath': filepath,
        'export_format': 'GLB',
        'export_texcoords': True,
        'export_normals': True,
        'export_tangents': False,
        'export_materials': 'EXPORT',
        'export_cameras': False,
        'export_selected': False,
        'export_extras': False,
        'export_yup': True,
        'export_apply': False,
        'export_animations': True,
        'export_skins': True,
        'export_morph': True,  # CRITICAL: Export shape keys!
        'export_morph_normal': True,
        'export_morph_tangent': False,
    }

    # Try with Blender 5.0 compatible params first
    try:
        bpy.ops.export_scene.gltf(**export_params)
    except TypeError as e:
        # Fallback: try minimal params that work across versions
        print(f"Fallback export mode due to: {e}")
        bpy.ops.export_scene.gltf(
            filepath=filepath,
            export_format='GLB',
            export_morph=True,
        )

    print(f"Exported to: {filepath}")

def main():
    args = get_args()
    if len(args) < 2:
        print("Usage: blender --background --python create_shape_keys.py -- input.glb output.glb")
        sys.exit(1)

    input_path = args[0]
    output_path = args[1]

    print(f"\n{'='*60}")
    print("SHAPE KEY CREATION")
    print(f"{'='*60}")
    print(f"Input: {input_path}")
    print(f"Output: {output_path}")

    # Clear and import
    clear_scene()
    bpy.ops.import_scene.gltf(filepath=input_path)

    # Find body mesh
    body_mesh = find_body_mesh(bpy.data.objects)
    if not body_mesh:
        print("ERROR: No mesh found in file!")
        sys.exit(1)

    print(f"\nFound body mesh: {body_mesh.name}")
    print(f"Vertices: {len(body_mesh.data.vertices)}")

    # Create shape keys
    create_all_shape_keys(body_mesh)

    # Export
    export_glb(output_path)

    print(f"\n{'='*60}")
    print("COMPLETE!")
    print(f"{'='*60}\n")

if __name__ == "__main__":
    main()
