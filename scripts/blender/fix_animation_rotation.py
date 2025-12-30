# fix_animation_rotation.py
# Usage: blender --background --python scripts/blender/fix_animation_rotation.py
#
# Fixes the ~57° Y-axis rotation offset in rifle_aim_idle.glb

import bpy
import math
import os

# Configuration
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(os.path.dirname(SCRIPT_DIR))
ANIMATIONS_DIR = os.path.join(PROJECT_ROOT, "apps", "frontend", "public", "animations")

INPUT_FILE = os.path.join(ANIMATIONS_DIR, "rifle_aim_idle.glb")
OUTPUT_FILE = os.path.join(ANIMATIONS_DIR, "rifle_aim_idle_fixed.glb")
ROTATION_Y_DEG = 57.0

# Clear default scene
bpy.ops.wm.read_factory_settings(use_empty=True)

# Import the GLB
print(f"Importing: {INPUT_FILE}")
bpy.ops.import_scene.gltf(filepath=INPUT_FILE)

# Find the armature
armature = next((obj for obj in bpy.context.scene.objects if obj.type == 'ARMATURE'), None)
if not armature:
    raise RuntimeError("No armature found in the imported GLB")

print(f"Found armature: {armature.name}")

# Deselect all, select armature
bpy.ops.object.select_all(action='DESELECT')
armature.select_set(True)
bpy.context.view_layer.objects.active = armature

# Rotate armature +57° around Y axis
armature.rotation_mode = 'XYZ'
armature.rotation_euler.y += math.radians(ROTATION_Y_DEG)

# Apply rotation to armature object (bakes into rest pose basis)
bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)

print(f"Applied +{ROTATION_Y_DEG}° Y rotation to armature")

# Export corrected GLB with animations
bpy.ops.export_scene.gltf(
    filepath=OUTPUT_FILE,
    export_format='GLB',
    export_animations=True
)

print(f"Exported: {OUTPUT_FILE}")
