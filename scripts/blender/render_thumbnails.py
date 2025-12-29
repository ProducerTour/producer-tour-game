#!/usr/bin/env python3
"""
Render thumbnail images for hair styles and face presets.
Creates 256x256 webp images for the character creator UI.
"""

import bpy
import sys
import os
from mathutils import Vector, Euler
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

def setup_render_settings():
    """Configure render settings for thumbnail output"""
    scene = bpy.context.scene

    # Use Cycles for better quality (or Eevee for speed)
    scene.render.engine = 'BLENDER_EEVEE_NEXT'  # or 'CYCLES'

    # Resolution
    scene.render.resolution_x = 256
    scene.render.resolution_y = 256
    scene.render.resolution_percentage = 100

    # Transparent background
    scene.render.film_transparent = True

    # Output format
    scene.render.image_settings.file_format = 'WEBP'
    scene.render.image_settings.quality = 90

    # Anti-aliasing
    scene.eevee.taa_render_samples = 16

def setup_camera_head_view():
    """Create camera positioned for head/face view"""
    # Create camera if not exists
    if 'ThumbnailCamera' in bpy.data.objects:
        cam_obj = bpy.data.objects['ThumbnailCamera']
    else:
        cam_data = bpy.data.cameras.new('ThumbnailCamera')
        cam_obj = bpy.data.objects.new('ThumbnailCamera', cam_data)
        bpy.context.collection.objects.link(cam_obj)

    # Position camera for head shot (assuming head is at ~1.7m height)
    cam_obj.location = (0, -0.6, 1.7)
    cam_obj.rotation_euler = Euler((math.radians(90), 0, 0))

    # Set as active camera
    bpy.context.scene.camera = cam_obj

    # Adjust lens for portrait
    cam_obj.data.lens = 85  # Portrait lens

    return cam_obj

def setup_lighting():
    """Create simple 3-point lighting"""
    # Key light (main)
    if 'KeyLight' not in bpy.data.objects:
        key_light_data = bpy.data.lights.new('KeyLight', type='AREA')
        key_light_data.energy = 100
        key_light = bpy.data.objects.new('KeyLight', key_light_data)
        bpy.context.collection.objects.link(key_light)
        key_light.location = (1, -1.5, 2)
        key_light.rotation_euler = Euler((math.radians(60), math.radians(20), math.radians(30)))

    # Fill light (softer)
    if 'FillLight' not in bpy.data.objects:
        fill_light_data = bpy.data.lights.new('FillLight', type='AREA')
        fill_light_data.energy = 50
        fill_light = bpy.data.objects.new('FillLight', fill_light_data)
        bpy.context.collection.objects.link(fill_light)
        fill_light.location = (-1.5, -1, 1.5)
        fill_light.rotation_euler = Euler((math.radians(50), math.radians(-30), math.radians(-20)))

    # Rim light (back)
    if 'RimLight' not in bpy.data.objects:
        rim_light_data = bpy.data.lights.new('RimLight', type='AREA')
        rim_light_data.energy = 30
        rim_light = bpy.data.objects.new('RimLight', rim_light_data)
        bpy.context.collection.objects.link(rim_light)
        rim_light.location = (0, 1, 2)
        rim_light.rotation_euler = Euler((math.radians(120), 0, 0))

def render_hair_thumbnails(avatar_path, hair_dir, output_dir):
    """Render thumbnails for all hair styles"""

    os.makedirs(output_dir, exist_ok=True)

    # Load base avatar
    print(f"\nLoading avatar: {avatar_path}")
    bpy.ops.import_scene.gltf(filepath=avatar_path)

    # Find the head bone for hair attachment
    armature = None
    head_bone = None
    for obj in bpy.context.scene.objects:
        if obj.type == 'ARMATURE':
            armature = obj
            # Look for head bone
            for bone_name in ['Head', 'mixamorigHead', 'head', 'DEF-head']:
                if bone_name in obj.data.bones:
                    head_bone = bone_name
                    break
            break

    if not head_bone:
        print("WARNING: Could not find head bone!")

    # Setup scene
    setup_render_settings()
    setup_camera_head_view()
    setup_lighting()

    # Get list of hair GLB files
    hair_files = [f for f in os.listdir(hair_dir) if f.endswith('.glb')]

    print(f"\nFound {len(hair_files)} hair styles to render")

    for hair_file in hair_files:
        hair_name = os.path.splitext(hair_file)[0]
        hair_path = os.path.join(hair_dir, hair_file)
        output_path = os.path.join(output_dir, f"{hair_name}.webp")

        print(f"  Rendering: {hair_name}")

        # Import hair model
        bpy.ops.import_scene.gltf(filepath=hair_path)

        # Find imported hair object (newest mesh)
        hair_obj = None
        for obj in bpy.context.scene.objects:
            if obj.type == 'MESH' and obj.name.lower().startswith(hair_name.lower()):
                hair_obj = obj
                break

        if not hair_obj:
            # Try to find any new mesh
            for obj in bpy.context.selected_objects:
                if obj.type == 'MESH':
                    hair_obj = obj
                    break

        if hair_obj:
            # Position hair on head
            hair_obj.location = (0, 0, 1.7)  # Head height

            # Set hair color
            for mat in hair_obj.data.materials:
                if mat and mat.use_nodes:
                    bsdf = mat.node_tree.nodes.get("Principled BSDF")
                    if bsdf:
                        bsdf.inputs["Base Color"].default_value = (0.1, 0.08, 0.06, 1.0)  # Dark brown

        # Render
        bpy.context.scene.render.filepath = output_path
        bpy.ops.render.render(write_still=True)

        # Remove hair for next iteration
        if hair_obj:
            bpy.data.objects.remove(hair_obj, do_unlink=True)

    # Also render "bald" thumbnail (just head, no hair)
    bald_output = os.path.join(output_dir, "bald.webp")
    print(f"  Rendering: bald")
    bpy.context.scene.render.filepath = bald_output
    bpy.ops.render.render(write_still=True)

    print(f"\nHair thumbnails saved to: {output_dir}")

def render_face_presets(avatar_path, output_dir):
    """Render thumbnails for face presets"""

    os.makedirs(output_dir, exist_ok=True)

    # Face preset configurations (morph values)
    presets = {
        'preset_01': {  # Default/Neutral
            'eyeSize': 0, 'eyeSpacing': 0, 'noseWidth': 0, 'noseLength': 0,
            'jawWidth': 0, 'chinLength': 0, 'lipFullness': 0, 'cheekboneHeight': 0
        },
        'preset_02': {  # Oval face
            'eyeSize': 0.2, 'eyeSpacing': 0, 'noseWidth': -0.2, 'noseLength': 0.1,
            'jawWidth': -0.3, 'chinLength': 0.2, 'lipFullness': 0.1, 'cheekboneHeight': 0.2
        },
        'preset_03': {  # Round face
            'eyeSize': 0.3, 'eyeSpacing': 0.1, 'noseWidth': 0.2, 'noseLength': -0.1,
            'jawWidth': 0.3, 'chinLength': -0.2, 'lipFullness': 0.2, 'cheekboneHeight': -0.1
        },
        'preset_04': {  # Square face
            'eyeSize': 0, 'eyeSpacing': 0.1, 'noseWidth': 0.1, 'noseLength': 0,
            'jawWidth': 0.5, 'chinLength': 0, 'lipFullness': 0, 'cheekboneHeight': 0.3
        },
        'preset_05': {  # Heart face
            'eyeSize': 0.2, 'eyeSpacing': 0.2, 'noseWidth': -0.1, 'noseLength': 0,
            'jawWidth': -0.3, 'chinLength': 0.3, 'lipFullness': 0.2, 'cheekboneHeight': 0.4
        },
        'preset_06': {  # Diamond face
            'eyeSize': 0.1, 'eyeSpacing': 0, 'noseWidth': -0.2, 'noseLength': 0.2,
            'jawWidth': -0.2, 'chinLength': 0.1, 'lipFullness': 0.1, 'cheekboneHeight': 0.5
        },
    }

    # Load avatar
    clear_scene()
    print(f"\nLoading avatar: {avatar_path}")
    bpy.ops.import_scene.gltf(filepath=avatar_path)

    # Find mesh with shape keys
    mesh_obj = None
    for obj in bpy.context.scene.objects:
        if obj.type == 'MESH' and obj.data.shape_keys:
            mesh_obj = obj
            break

    if not mesh_obj:
        print("ERROR: No mesh with shape keys found!")
        return

    setup_render_settings()
    setup_camera_head_view()
    setup_lighting()

    shape_keys = mesh_obj.data.shape_keys.key_blocks

    for preset_name, morph_values in presets.items():
        print(f"  Rendering: {preset_name}")

        # Reset all morphs to 0
        for sk in shape_keys:
            if sk.name != 'Basis':
                sk.value = 0

        # Apply preset morph values
        morph_name_map = {
            'eyeSize': 'EyeSize',
            'eyeSpacing': 'EyeSpacing',
            'noseWidth': 'NoseWidth',
            'noseLength': 'NoseLength',
            'jawWidth': 'JawWidth',
            'chinLength': 'ChinLength',
            'lipFullness': 'LipFullness',
            'cheekboneHeight': 'CheekboneHeight',
        }

        for morph_key, value in morph_values.items():
            target_name = morph_name_map.get(morph_key)
            if target_name and target_name in shape_keys:
                # Convert -1 to 1 range to 0 to 1 for shape key
                shape_keys[target_name].value = (value + 1) / 2

        # Render
        output_path = os.path.join(output_dir, f"{preset_name}.webp")
        bpy.context.scene.render.filepath = output_path
        bpy.ops.render.render(write_still=True)

    print(f"\nFace preset thumbnails saved to: {output_dir}")

def main():
    args = get_args()

    if len(args) < 1:
        print("Usage:")
        print("  Hair:    blender --background --python render_thumbnails.py -- hair <avatar.glb> <hair_dir> <output_dir>")
        print("  Presets: blender --background --python render_thumbnails.py -- presets <avatar.glb> <output_dir>")
        print("  All:     blender --background --python render_thumbnails.py -- all <avatar.glb> <hair_dir> <output_base_dir>")
        sys.exit(1)

    mode = args[0]

    if mode == 'hair' and len(args) >= 4:
        avatar_path = os.path.abspath(args[1])
        hair_dir = os.path.abspath(args[2])
        output_dir = os.path.abspath(args[3])
        render_hair_thumbnails(avatar_path, hair_dir, output_dir)

    elif mode == 'presets' and len(args) >= 3:
        avatar_path = os.path.abspath(args[1])
        output_dir = os.path.abspath(args[2])
        render_face_presets(avatar_path, output_dir)

    elif mode == 'all' and len(args) >= 4:
        avatar_path = os.path.abspath(args[1])
        hair_dir = os.path.abspath(args[2])
        output_base = os.path.abspath(args[3])

        hair_output = os.path.join(output_base, 'hair')
        faces_output = os.path.join(output_base, 'faces')

        render_hair_thumbnails(avatar_path, hair_dir, hair_output)
        clear_scene()
        render_face_presets(avatar_path, faces_output)

    else:
        print(f"Invalid arguments for mode: {mode}")
        sys.exit(1)

    print("\n" + "=" * 60)
    print("THUMBNAIL RENDERING COMPLETE")
    print("=" * 60)

if __name__ == "__main__":
    main()
