# convert_8way_packs.py
# Usage: blender --background --python scripts/blender/convert_8way_packs.py
#
# Converts Rifle 8-Way and Pistol Locomotion Pack FBX files to GLB format

import bpy
import os
import sys

# Configuration
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(os.path.dirname(SCRIPT_DIR))
ANIMATIONS_DIR = os.path.join(PROJECT_ROOT, "apps", "frontend", "public", "animations", "new animations")
OUTPUT_DIR = os.path.join(PROJECT_ROOT, "apps", "frontend", "public", "assets", "animations", "xbot")

# Source directories
RIFLE_8WAY_DIR = os.path.join(ANIMATIONS_DIR, "Rifle 8-Way Locomotion Pack 3")
PISTOL_DIR = os.path.join(ANIMATIONS_DIR, "Pistol_Handgun Locomotion Pack 3")

# Ensure output directory exists
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Rifle 8-Way Pack mappings: (source_filename, output_filename)
RIFLE_8WAY_CONVERSIONS = [
    # Idle states
    ("idle.fbx", "rifle8_idle.glb"),
    ("idle aiming.fbx", "rifle8_aim_idle.glb"),
    ("idle crouching.fbx", "rifle8_crouch_idle.glb"),
    ("idle crouching aiming.fbx", "rifle8_crouch_aim_idle.glb"),

    # Walk - 8 directions
    ("walk forward.fbx", "rifle8_walk_forward.glb"),
    ("walk forward left.fbx", "rifle8_walk_forward_left.glb"),
    ("walk forward right.fbx", "rifle8_walk_forward_right.glb"),
    ("walk backward.fbx", "rifle8_walk_backward.glb"),
    ("walk backward left.fbx", "rifle8_walk_backward_left.glb"),
    ("walk backward right.fbx", "rifle8_walk_backward_right.glb"),
    ("walk left.fbx", "rifle8_walk_left.glb"),
    ("walk right.fbx", "rifle8_walk_right.glb"),

    # Run - 8 directions
    ("run forward.fbx", "rifle8_run_forward.glb"),
    ("run forward left.fbx", "rifle8_run_forward_left.glb"),
    ("run forward right.fbx", "rifle8_run_forward_right.glb"),
    ("run backward.fbx", "rifle8_run_backward.glb"),
    ("run backward left.fbx", "rifle8_run_backward_left.glb"),
    ("run backward right.fbx", "rifle8_run_backward_right.glb"),
    ("run left.fbx", "rifle8_run_left.glb"),
    ("run right.fbx", "rifle8_run_right.glb"),

    # Sprint - 8 directions
    ("sprint forward.fbx", "rifle8_sprint_forward.glb"),
    ("sprint forward left.fbx", "rifle8_sprint_forward_left.glb"),
    ("sprint forward right.fbx", "rifle8_sprint_forward_right.glb"),
    ("sprint backward.fbx", "rifle8_sprint_backward.glb"),
    ("sprint backward left.fbx", "rifle8_sprint_backward_left.glb"),
    ("sprint backward right.fbx", "rifle8_sprint_backward_right.glb"),
    ("sprint left.fbx", "rifle8_sprint_left.glb"),
    ("sprint right.fbx", "rifle8_sprint_right.glb"),

    # Crouch walk - 8 directions
    ("walk crouching forward.fbx", "rifle8_crouch_walk_forward.glb"),
    ("walk crouching forward left.fbx", "rifle8_crouch_walk_forward_left.glb"),
    ("walk crouching forward right.fbx", "rifle8_crouch_walk_forward_right.glb"),
    ("walk crouching backward.fbx", "rifle8_crouch_walk_backward.glb"),
    ("walk crouching backward left.fbx", "rifle8_crouch_walk_backward_left.glb"),
    ("walk crouching backward right.fbx", "rifle8_crouch_walk_backward_right.glb"),
    ("walk crouching left.fbx", "rifle8_crouch_walk_left.glb"),
    ("walk crouching right.fbx", "rifle8_crouch_walk_right.glb"),

    # Turns
    ("turn 90 left.fbx", "rifle8_turn_left.glb"),
    ("turn 90 right.fbx", "rifle8_turn_right.glb"),
    ("crouching turn 90 left.fbx", "rifle8_crouch_turn_left.glb"),
    ("crouching turn 90 right.fbx", "rifle8_crouch_turn_right.glb"),

    # Jump
    ("jump up.fbx", "rifle8_jump_up.glb"),
    ("jump loop.fbx", "rifle8_jump_loop.glb"),
    ("jump down.fbx", "rifle8_jump_down.glb"),

    # Death variants
    ("death from the front.fbx", "rifle8_death_front.glb"),
    ("death from the back.fbx", "rifle8_death_back.glb"),
    ("death from right.fbx", "rifle8_death_right.glb"),
    ("death from front headshot.fbx", "rifle8_death_headshot_front.glb"),
    ("death from back headshot.fbx", "rifle8_death_headshot_back.glb"),
    ("death crouching headshot front.fbx", "rifle8_death_crouch_headshot.glb"),
]

# Pistol Pack mappings
PISTOL_CONVERSIONS = [
    # Idle
    ("pistol idle.fbx", "pistol_idle.glb"),
    ("pistol kneeling idle.fbx", "pistol_kneel_idle.glb"),

    # Transitions
    ("pistol stand to kneel.fbx", "pistol_stand_to_kneel.glb"),
    ("pistol kneel to stand.fbx", "pistol_kneel_to_stand.glb"),

    # Walk
    ("pistol walk.fbx", "pistol_walk_forward.glb"),
    ("pistol walk backward.fbx", "pistol_walk_backward.glb"),
    ("pistol walk arc.fbx", "pistol_walk_left.glb"),
    ("pistol walk arc (2).fbx", "pistol_walk_right.glb"),
    ("pistol walk backward arc.fbx", "pistol_walk_backward_left.glb"),
    ("pistol walk backward arc (2).fbx", "pistol_walk_backward_right.glb"),

    # Run
    ("pistol run.fbx", "pistol_run_forward.glb"),
    ("pistol run backward.fbx", "pistol_run_backward.glb"),
    ("pistol run arc.fbx", "pistol_run_left.glb"),
    ("pistol run arc (2).fbx", "pistol_run_right.glb"),
    ("pistol run backward arc.fbx", "pistol_run_backward_left.glb"),
    ("pistol run backward arc (2).fbx", "pistol_run_backward_right.glb"),

    # Strafe
    ("pistol strafe.fbx", "pistol_strafe_left.glb"),
    ("pistol strafe (2).fbx", "pistol_strafe_right.glb"),

    # Jump
    ("pistol jump.fbx", "pistol_jump.glb"),
    ("pistol jump (2).fbx", "pistol_jump_loop.glb"),
]


def convert_fbx_to_glb(input_path, output_path):
    """Convert a single FBX file to GLB"""

    if not os.path.exists(input_path):
        print(f"  ⚠️  Not found: {os.path.basename(input_path)}")
        return False

    try:
        # Clear scene
        bpy.ops.wm.read_factory_settings(use_empty=True)

        # Import FBX
        bpy.ops.import_scene.fbx(filepath=input_path)

        # Find armature and print info
        armature = next((obj for obj in bpy.context.scene.objects if obj.type == 'ARMATURE'), None)
        if armature:
            if armature.animation_data and armature.animation_data.action:
                action = armature.animation_data.action
                frames = action.frame_range[1] - action.frame_range[0]
                print(f"  ✓ {os.path.basename(output_path)} ({int(frames)} frames)")

        # Export as GLB
        bpy.ops.export_scene.gltf(
            filepath=output_path,
            export_format='GLB',
            export_animations=True,
            export_apply=True,
        )

        return True

    except Exception as e:
        print(f"  ❌ Error: {os.path.basename(input_path)} - {str(e)}")
        return False


def main():
    print("\n" + "=" * 60)
    print("🔫 Converting Rifle 8-Way Locomotion Pack")
    print("=" * 60)

    rifle_success = 0
    for src_name, dst_name in RIFLE_8WAY_CONVERSIONS:
        src_path = os.path.join(RIFLE_8WAY_DIR, src_name)
        dst_path = os.path.join(OUTPUT_DIR, dst_name)
        if convert_fbx_to_glb(src_path, dst_path):
            rifle_success += 1

    print(f"\nRifle 8-Way: {rifle_success}/{len(RIFLE_8WAY_CONVERSIONS)} converted")

    print("\n" + "=" * 60)
    print("🔫 Converting Pistol Locomotion Pack")
    print("=" * 60)

    pistol_success = 0
    for src_name, dst_name in PISTOL_CONVERSIONS:
        src_path = os.path.join(PISTOL_DIR, src_name)
        dst_path = os.path.join(OUTPUT_DIR, dst_name)
        if convert_fbx_to_glb(src_path, dst_path):
            pistol_success += 1

    print(f"\nPistol: {pistol_success}/{len(PISTOL_CONVERSIONS)} converted")

    print("\n" + "=" * 60)
    print("✅ Conversion complete!")
    print(f"Total: {rifle_success + pistol_success}/{len(RIFLE_8WAY_CONVERSIONS) + len(PISTOL_CONVERSIONS)} files")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    main()
