"""
Blender script to optimize SWAT operator model for web game use.
- Compresses textures from 4096 -> 1024, 2048 -> 512
- Cleans up hierarchy
- Exports optimized GLB

Run with:
  blender --background --python scripts/optimize_swat_model.py
"""

import bpy
import os
import sys

# Configuration
INPUT_PATH = "apps/frontend/public/models/Characters/Character Models/swat_operator_remastered.glb"
OUTPUT_DIR = "apps/frontend/public/assets/avatars"
OUTPUT_NAME = "swat_operator.glb"

# Texture size mapping (original -> target)
TEXTURE_SIZE_MAP = {
    4096: 1024,  # 4K -> 1K
    2048: 512,   # 2K -> 512
    1024: 512,   # 1K -> 512
    512: 256,    # 512 -> 256
}

def get_project_root():
    """Get project root from script location or cwd"""
    # Try to find project root
    cwd = os.getcwd()
    if os.path.exists(os.path.join(cwd, "package.json")):
        return cwd
    # Check if we're in a subdirectory
    parent = os.path.dirname(cwd)
    if os.path.exists(os.path.join(parent, "package.json")):
        return parent
    return cwd

def resize_image(image, target_size):
    """Resize an image to target size"""
    if image.size[0] <= 0 or image.size[1] <= 0:
        return False

    original_size = max(image.size[0], image.size[1])

    # Calculate new dimensions maintaining aspect ratio
    if image.size[0] >= image.size[1]:
        new_width = target_size
        new_height = int(image.size[1] * (target_size / image.size[0]))
    else:
        new_height = target_size
        new_width = int(image.size[0] * (target_size / image.size[1]))

    # Ensure minimum size
    new_width = max(1, new_width)
    new_height = max(1, new_height)

    print(f"  Resizing {image.name}: {image.size[0]}x{image.size[1]} -> {new_width}x{new_height}")
    image.scale(new_width, new_height)
    return True

def optimize_textures():
    """Resize all textures based on size mapping"""
    print("\n=== Optimizing Textures ===")

    for image in bpy.data.images:
        if image.size[0] <= 0:
            continue

        original_size = max(image.size[0], image.size[1])

        # Find target size
        target_size = None
        for orig, target in sorted(TEXTURE_SIZE_MAP.items(), reverse=True):
            if original_size >= orig:
                target_size = target
                break

        if target_size and original_size > target_size:
            resize_image(image, target_size)
        else:
            print(f"  Keeping {image.name}: {image.size[0]}x{image.size[1]} (already small enough)")

def clean_hierarchy():
    """Clean up the object hierarchy"""
    print("\n=== Cleaning Hierarchy ===")

    # Remove empty objects that aren't needed
    empties_to_remove = []
    for obj in bpy.data.objects:
        if obj.type == 'EMPTY':
            # Keep armature parents and necessary empties
            has_mesh_children = any(child.type == 'MESH' for child in obj.children)
            has_armature_children = any(child.type == 'ARMATURE' for child in obj.children)
            is_bone_target = 'mixamorig' in obj.name

            if not has_mesh_children and not has_armature_children and not is_bone_target:
                # Check if it's a weapon part parent
                if not any(keyword in obj.name.lower() for keyword in ['gun', 'weapon', 'ksvr', 'swat', 'root', 'sketchfab']):
                    empties_to_remove.append(obj)

    print(f"  Removing {len(empties_to_remove)} unnecessary empty objects")
    for obj in empties_to_remove:
        bpy.data.objects.remove(obj, do_unlink=True)

def export_glb(output_path):
    """Export as optimized GLB"""
    print(f"\n=== Exporting to {output_path} ===")

    # Ensure output directory exists
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    # Export settings for web
    bpy.ops.export_scene.gltf(
        filepath=output_path,
        export_format='GLB',
        export_texcoords=True,
        export_normals=True,
        export_draco_mesh_compression_enable=True,  # Draco compression
        export_draco_mesh_compression_level=6,
        export_draco_position_quantization=14,
        export_draco_normal_quantization=10,
        export_draco_texcoord_quantization=12,
        export_image_format='AUTO',
        export_jpeg_quality=75,  # Compress embedded textures
        export_animations=False,  # No animations in base model
        export_skins=True,  # Keep skinning for animation
        export_morph=False,
        export_lights=False,
        export_cameras=False,
        use_selection=False,
        export_extras=False,
        export_yup=True,
    )

    # Get file size
    size_mb = os.path.getsize(output_path) / (1024 * 1024)
    print(f"  Exported: {size_mb:.2f} MB")

def main():
    project_root = get_project_root()
    print(f"Project root: {project_root}")

    input_path = os.path.join(project_root, INPUT_PATH)
    output_path = os.path.join(project_root, OUTPUT_DIR, OUTPUT_NAME)

    print(f"Input: {input_path}")
    print(f"Output: {output_path}")

    # Clear scene
    bpy.ops.wm.read_factory_settings(use_empty=True)

    # Import GLB
    print("\n=== Importing Model ===")
    bpy.ops.import_scene.gltf(filepath=input_path)

    # Optimize
    optimize_textures()
    clean_hierarchy()

    # Export
    export_glb(output_path)

    print("\n=== Optimization Complete! ===")

if __name__ == "__main__":
    main()
