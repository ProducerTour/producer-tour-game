"""
validate_animations.py

Scans all animation files and reports their facing direction.
Identifies which animations need Y-axis correction.

Usage:
    blender --background --python scripts/blender/pipeline/validate_animations.py

Output:
    Prints a report showing:
    - Which animations face the correct direction (+Z)
    - Which animations are misoriented and need correction
    - The exact Y-correction angle needed for each
"""

import bpy
import math
import os
from pathlib import Path
from mathutils import Quaternion, Vector, Euler

# Configuration
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent.parent
ANIMATIONS_DIR = PROJECT_ROOT / "apps" / "frontend" / "public" / "animations"

# Tolerance for "correct" orientation (degrees)
TOLERANCE_DEG = 5.0


def clear_scene():
    """Clear all objects from the scene."""
    bpy.ops.wm.read_factory_settings(use_empty=True)


def import_animation(filepath):
    """Import a GLB or FBX animation file."""
    ext = filepath.suffix.lower()
    if ext == '.glb' or ext == '.gltf':
        bpy.ops.import_scene.gltf(filepath=str(filepath))
    elif ext == '.fbx':
        bpy.ops.import_scene.fbx(filepath=str(filepath))
    else:
        print(f"Unsupported format: {ext}")
        return False
    return True


def find_armature():
    """Find the armature object."""
    for obj in bpy.context.scene.objects:
        if obj.type == 'ARMATURE':
            return obj
    return None


def find_hips_bone(armature):
    """Find the Hips/root bone with various naming conventions."""
    bone_names = [
        'Hips', 'mixamorig:Hips', 'mixamorig1:Hips', 'mixamorig2:Hips',
        'mixamorigHips', 'mixamorigHips_1', 'Root', 'root'
    ]

    for name in bone_names:
        if name in armature.pose.bones:
            return armature.pose.bones[name]

    # Fallback: find first bone with no parent
    for bone in armature.pose.bones:
        if bone.parent is None:
            return bone

    return None


def get_facing_direction(armature, action, frame=0):
    """
    Calculate the character's facing direction at a given frame.
    Returns the angle deviation from +Z in degrees.

    For Mixamo characters:
    - Forward is typically -Y in bone-local space
    - We project onto XZ plane and measure angle from +Z
    """
    # Set the action and frame
    if not armature.animation_data:
        armature.animation_data_create()
    armature.animation_data.action = action
    bpy.context.scene.frame_set(frame)

    # Force update
    bpy.context.view_layer.update()

    # Get Hips bone
    hips = find_hips_bone(armature)
    if not hips:
        return None

    # Get world-space matrix
    world_matrix = armature.matrix_world @ hips.matrix

    # Forward direction in Mixamo is typically -Y local
    # But we need to check the actual orientation
    forward_local = Vector((0, 0, 1))  # Try +Z first
    forward_world = world_matrix.to_quaternion() @ forward_local

    # Project to XZ plane
    forward_world.y = 0
    if forward_world.length < 0.001:
        # Character might be facing straight up/down
        forward_local = Vector((0, -1, 0))
        forward_world = world_matrix.to_quaternion() @ forward_local
        forward_world.y = 0

    if forward_world.length < 0.001:
        return None

    forward_world.normalize()

    # Calculate angle from +Z
    # atan2(x, z) gives angle from +Z axis
    angle_rad = math.atan2(forward_world.x, forward_world.z)
    angle_deg = math.degrees(angle_rad)

    return {
        'angle_deg': angle_deg,
        'forward_vector': forward_world,
        'correction_needed': -angle_deg,  # To rotate back to +Z
    }


def analyze_animation(filepath):
    """
    Analyze a single animation file.
    Returns analysis results or None if failed.
    """
    clear_scene()

    if not import_animation(filepath):
        return None

    armature = find_armature()
    if not armature:
        return {'error': 'No armature found'}

    # Get animation action
    if not armature.animation_data or not armature.animation_data.action:
        return {'error': 'No animation data'}

    action = armature.animation_data.action

    # Analyze at frame 0
    facing = get_facing_direction(armature, action, frame=0)

    if facing is None:
        return {'error': 'Could not determine facing'}

    # Determine if correction is needed
    is_correct = abs(facing['angle_deg']) < TOLERANCE_DEG

    return {
        'name': filepath.stem,
        'angle_deg': facing['angle_deg'],
        'correction_needed': facing['correction_needed'],
        'is_correct': is_correct,
        'frame_count': int(action.frame_range[1] - action.frame_range[0] + 1),
    }


def main():
    print("=" * 80)
    print("ANIMATION ORIENTATION VALIDATION")
    print("=" * 80)
    print(f"\nScanning: {ANIMATIONS_DIR}")
    print(f"Tolerance: {TOLERANCE_DEG}°\n")

    if not ANIMATIONS_DIR.exists():
        print(f"ERROR: Directory not found: {ANIMATIONS_DIR}")
        return

    # Find all animation files
    animation_files = list(ANIMATIONS_DIR.glob("*.glb")) + list(ANIMATIONS_DIR.glob("*.fbx"))
    animation_files = sorted(animation_files, key=lambda f: f.stem)

    print(f"Found {len(animation_files)} animation files\n")

    correct_anims = []
    incorrect_anims = []
    error_anims = []

    for filepath in animation_files:
        result = analyze_animation(filepath)

        if result is None or 'error' in result:
            error_msg = result.get('error', 'Unknown error') if result else 'Failed to load'
            error_anims.append((filepath.stem, error_msg))
            print(f"  ERROR: {filepath.stem} - {error_msg}")
        elif result['is_correct']:
            correct_anims.append(result)
            print(f"  OK: {result['name']} ({result['angle_deg']:.1f}°)")
        else:
            incorrect_anims.append(result)
            print(f"  WRONG: {result['name']} ({result['angle_deg']:.1f}° → needs {result['correction_needed']:.1f}° correction)")

    # Summary
    print("\n" + "=" * 80)
    print("SUMMARY")
    print("=" * 80)

    print(f"\nCorrect orientation ({len(correct_anims)}):")
    for anim in correct_anims:
        print(f"  - {anim['name']}")

    print(f"\nNeed correction ({len(incorrect_anims)}):")
    for anim in incorrect_anims:
        print(f"  - {anim['name']}: {anim['correction_needed']:.1f}°")

    if error_anims:
        print(f"\nErrors ({len(error_anims)}):")
        for name, error in error_anims:
            print(f"  - {name}: {error}")

    # Generate correction config
    if incorrect_anims:
        print("\n" + "=" * 80)
        print("CORRECTION CONFIG (for batch_process.py)")
        print("=" * 80)
        print("\nANIMATION_CORRECTIONS = {")
        for anim in incorrect_anims:
            print(f"    '{anim['name']}': {anim['correction_needed']:.1f},")
        print("}")


if __name__ == "__main__":
    main()
