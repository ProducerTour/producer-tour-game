"""
Clean Locomotion Animations

Strips position and scale tracks from Mixamo locomotion animations,
keeping only rotation (quaternion) tracks.

This matches the format of the rifle/pistol animations which work correctly.

Usage:
    blender --background --python clean_locomotion_animations.py
"""

import bpy
import os
import sys

# Path to locomotion animations
LOCOMOTION_DIR = "/Users/nolangriffis/Documents/producer-tour-play/apps/frontend/public/assets/animations/locomotion"

def clean_animation(filepath):
    """Clean a single animation file"""
    # Clear the scene
    bpy.ops.wm.read_factory_settings(use_empty=True)

    # Import the GLB
    bpy.ops.import_scene.gltf(filepath=filepath)

    # Find the armature and its animation
    armature = None
    for obj in bpy.context.scene.objects:
        if obj.type == 'ARMATURE':
            armature = obj
            break

    if not armature:
        print(f"  No armature found in {filepath}")
        return False

    if not armature.animation_data or not armature.animation_data.action:
        print(f"  No animation found in {filepath}")
        return False

    action = armature.animation_data.action

    # Blender 5.0+ uses layered actions
    # Get the channelbag from the first layer's first strip
    try:
        layer = action.layers[0]
        strip = layer.strips[0]
        slot = action.slots[0]
        channelbag = strip.channelbags[0]  # Get first channelbag directly
        fcurves = channelbag.fcurves
    except (IndexError, AttributeError):
        # Fallback for older Blender
        if hasattr(action, 'fcurves'):
            fcurves = action.fcurves
        else:
            print(f"  Cannot access fcurves for {filepath}")
            return False

    original_count = len(list(fcurves))

    # Find fcurves to remove (position and scale)
    curves_to_remove = []
    for fcurve in fcurves:
        data_path = fcurve.data_path
        # Keep only rotation_quaternion tracks
        if 'rotation_quaternion' not in data_path:
            curves_to_remove.append(fcurve)

    # Remove the problematic curves
    for fcurve in curves_to_remove:
        fcurves.remove(fcurve)

    final_count = len(list(fcurves))
    print(f"  {os.path.basename(filepath)}: {original_count} curves → {final_count}")

    # Export the cleaned GLB (overwrite original)
    bpy.ops.export_scene.gltf(
        filepath=filepath,
        export_format='GLB',
        export_animations=True,
        export_skins=False,  # Animation only, no mesh
        export_lights=False,
        export_cameras=False,
    )

    return True

def main():
    print("\n" + "="*60)
    print("Cleaning Locomotion Animations")
    print("="*60 + "\n")

    if not os.path.exists(LOCOMOTION_DIR):
        print(f"ERROR: Directory not found: {LOCOMOTION_DIR}")
        sys.exit(1)

    # Get all GLB files
    glb_files = [f for f in os.listdir(LOCOMOTION_DIR) if f.endswith('.glb')]

    if not glb_files:
        print("No GLB files found")
        sys.exit(1)

    print(f"Found {len(glb_files)} animation files\n")

    success_count = 0
    for filename in sorted(glb_files):
        filepath = os.path.join(LOCOMOTION_DIR, filename)
        if clean_animation(filepath):
            success_count += 1

    print(f"\nCleaned {success_count}/{len(glb_files)} animations")
    print("="*60 + "\n")

if __name__ == "__main__":
    main()
