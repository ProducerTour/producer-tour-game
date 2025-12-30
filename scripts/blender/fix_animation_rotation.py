# fix_animation_rotation.py
# Usage: blender --background --python scripts/blender/fix_animation_rotation.py
#
# Properly fixes animation rotation by modifying the root bone keyframes

import bpy
import math
import os
from mathutils import Quaternion, Euler

# Configuration
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(os.path.dirname(SCRIPT_DIR))
ANIMATIONS_DIR = os.path.join(PROJECT_ROOT, "apps", "frontend", "public", "animations")

INPUT_FILE = os.path.join(ANIMATIONS_DIR, "rifle_aim_idle.glb")
OUTPUT_FILE = os.path.join(ANIMATIONS_DIR, "rifle_aim_idle_fixed.glb")
ROTATION_Y_DEG = -57.0

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

# Create the correction quaternion (+57° around Y axis)
correction_euler = Euler((0, math.radians(ROTATION_Y_DEG), 0), 'XYZ')
correction_quat = correction_euler.to_quaternion()

print(f"Correction quaternion: {correction_quat}")

# Find root bones (bones with no parent - typically Hips)
root_bone_names = [bone.name for bone in armature.data.bones if bone.parent is None]
print(f"Root bones: {root_bone_names}")

# Process animation data
if armature.animation_data and armature.animation_data.action:
    action = armature.animation_data.action
    print(f"Processing action: {action.name}")

    for root_bone_name in root_bone_names:
        # Find quaternion rotation fcurves for this bone
        quat_path = f'pose.bones["{root_bone_name}"].rotation_quaternion'

        quat_fcurves = {}
        for fcurve in action.fcurves:
            if fcurve.data_path == quat_path:
                quat_fcurves[fcurve.array_index] = fcurve

        if len(quat_fcurves) == 4:
            print(f"Found quaternion keyframes for {root_bone_name}")

            # Get number of keyframes (assuming all channels have same count)
            num_keyframes = len(quat_fcurves[0].keyframe_points)
            print(f"Processing {num_keyframes} keyframes...")

            for i in range(num_keyframes):
                # Read current quaternion (W, X, Y, Z order)
                w = quat_fcurves[0].keyframe_points[i].co[1]
                x = quat_fcurves[1].keyframe_points[i].co[1]
                y = quat_fcurves[2].keyframe_points[i].co[1]
                z = quat_fcurves[3].keyframe_points[i].co[1]

                original_quat = Quaternion((w, x, y, z))

                # Apply correction: corrected = correction * original
                corrected_quat = correction_quat @ original_quat

                # Write back the corrected values
                quat_fcurves[0].keyframe_points[i].co[1] = corrected_quat.w
                quat_fcurves[1].keyframe_points[i].co[1] = corrected_quat.x
                quat_fcurves[2].keyframe_points[i].co[1] = corrected_quat.y
                quat_fcurves[3].keyframe_points[i].co[1] = corrected_quat.z

            # Update the fcurves
            for fcurve in quat_fcurves.values():
                fcurve.update()

            print(f"Rotated {num_keyframes} keyframes for {root_bone_name}")
        else:
            print(f"No quaternion fcurves found for {root_bone_name} (found {len(quat_fcurves)} channels)")
else:
    print("No animation data found on armature")

# Export corrected GLB with animations
bpy.ops.export_scene.gltf(
    filepath=OUTPUT_FILE,
    export_format='GLB',
    export_animations=True
)

print(f"Exported: {OUTPUT_FILE}")
