"""
Blender script to normalize grass_patches.glb for Three.js
Scales the model so grass height is ~0.4 meters
Run: blender --background --python normalize_grass.py
"""

import bpy
import os
import sys

# Configuration
TARGET_HEIGHT = 0.4  # 40cm grass height
INPUT_FILE = "../public/textures/ground/grass_patches.glb"
OUTPUT_FILE = "../public/textures/ground/grass_patches_normalized.glb"

# Get script directory for relative paths
script_dir = os.path.dirname(os.path.abspath(__file__))
input_path = os.path.join(script_dir, INPUT_FILE)
output_path = os.path.join(script_dir, OUTPUT_FILE)

print(f"Input: {input_path}")
print(f"Output: {output_path}")

# Clear existing scene
bpy.ops.wm.read_factory_settings(use_empty=True)

# Import GLB
bpy.ops.import_scene.gltf(filepath=input_path)

# Get all mesh objects
meshes = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH']

if not meshes:
    print("ERROR: No meshes found in GLB")
    sys.exit(1)

print(f"Found {len(meshes)} mesh(es)")

# Calculate current bounding box of all meshes combined
from mathutils import Vector

min_z = float('inf')
max_z = float('-inf')

for obj in meshes:
    # Get world-space bounding box
    for corner in obj.bound_box:
        world_corner = obj.matrix_world @ Vector(corner)
        min_z = min(min_z, world_corner.z)
        max_z = max(max_z, world_corner.z)

current_height = max_z - min_z
print(f"Current height: {current_height:.4f} units")

if current_height <= 0:
    print("ERROR: Invalid height calculation")
    sys.exit(1)

# Calculate scale factor
scale_factor = TARGET_HEIGHT / current_height
print(f"Scale factor: {scale_factor:.6f}")
print(f"Target height: {TARGET_HEIGHT}m")

# Select all meshes
bpy.ops.object.select_all(action='DESELECT')
for obj in meshes:
    obj.select_set(True)
bpy.context.view_layer.objects.active = meshes[0]

# Scale all objects
bpy.ops.transform.resize(value=(scale_factor, scale_factor, scale_factor))

# Apply transforms
bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)

# Set origin to bottom center for each mesh
for obj in meshes:
    bpy.context.view_layer.objects.active = obj
    # Move origin to geometry center first
    bpy.ops.object.origin_set(type='ORIGIN_GEOMETRY', center='BOUNDS')

# Verify new height
min_z = float('inf')
max_z = float('-inf')
for obj in meshes:
    for corner in obj.bound_box:
        world_corner = obj.matrix_world @ Vector(corner)
        min_z = min(min_z, world_corner.z)
        max_z = max(max_z, world_corner.z)

new_height = max_z - min_z
print(f"New height: {new_height:.4f}m")

# Export normalized GLB
bpy.ops.export_scene.gltf(
    filepath=output_path,
    export_format='GLB',
    use_selection=False,
    export_apply=True
)

print(f"SUCCESS: Exported normalized GLB to {output_path}")
print("Replace grass_patches.glb with grass_patches_normalized.glb")
