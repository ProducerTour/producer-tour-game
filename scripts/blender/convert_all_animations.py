# convert_all_animations.py
# Usage: blender --background --python scripts/blender/convert_all_animations.py
#
# Converts ALL animation packs from FBX to GLB:
# - Male Locomotion Pack (unarmed base animations)
# - Rifle 8-Way Locomotion Pack 3 (rifle animations)
# - Pistol_Handgun Locomotion Pack 3 (pistol animations)

import bpy
import os

# Configuration
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(os.path.dirname(SCRIPT_DIR))
ANIMATIONS_DIR = os.path.join(PROJECT_ROOT, "apps", "frontend", "public", "animations", "new animations")
OUTPUT_DIR = os.path.join(PROJECT_ROOT, "apps", "frontend", "public", "assets", "animations", "xbot")

# Source directories
MALE_LOCOMOTION_DIR = os.path.join(ANIMATIONS_DIR, "Male Locomotion Pack")
RIFLE_8WAY_DIR = os.path.join(ANIMATIONS_DIR, "Rifle 8-Way Locomotion Pack 3")
PISTOL_DIR = os.path.join(ANIMATIONS_DIR, "Pistol_Handgun Locomotion Pack 3")

# Ensure output directory exists
os.makedirs(OUTPUT_DIR, exist_ok=True)

# ============================================================
# MALE LOCOMOTION PACK (Unarmed/Base animations)
# ============================================================
MALE_LOCOMOTION_CONVERSIONS = [
    ("idle.fbx", "idle.glb"),
    ("walking.fbx", "walk.glb"),
    ("standard run.fbx", "run.glb"),
    ("jump.fbx", "jump.glb"),
    ("left strafe.fbx", "strafe_left_run.glb"),
    ("right strafe.fbx", "strafe_right_run.glb"),
    ("left strafe walking.fbx", "strafe_left_walk.glb"),
    ("right strafe walking.fbx", "strafe_right_walk.glb"),
    ("left turn 90.fbx", "turn_left.glb"),
    ("right turn 90.fbx", "turn_right.glb"),
]

# ============================================================
# RIFLE 8-WAY LOCOMOTION PACK
# ============================================================
RIFLE_8WAY_CONVERSIONS = [
    # Idle states
    ("idle.fbx", "rifle_idle.glb"),
    ("idle aiming.fbx", "rifle_aim_idle.glb"),
    ("idle crouching.fbx", "rifle_crouch_idle.glb"),
    ("idle crouching aiming.fbx", "rifle_crouch_aim_idle.glb"),

    # Walk - 8 directions
    ("walk forward.fbx", "rifle_walk_fwd.glb"),
    ("walk forward left.fbx", "rifle_walk_fwd_left.glb"),
    ("walk forward right.fbx", "rifle_walk_fwd_right.glb"),
    ("walk backward.fbx", "rifle_walk_back.glb"),
    ("walk backward left.fbx", "rifle_walk_back_left.glb"),
    ("walk backward right.fbx", "rifle_walk_back_right.glb"),
    ("walk left.fbx", "rifle_walk_left.glb"),
    ("walk right.fbx", "rifle_walk_right.glb"),

    # Run - 8 directions
    ("run forward.fbx", "rifle_run_fwd.glb"),
    ("run forward left.fbx", "rifle_run_fwd_left.glb"),
    ("run forward right.fbx", "rifle_run_fwd_right.glb"),
    ("run backward.fbx", "rifle_run_back.glb"),
    ("run backward left.fbx", "rifle_run_back_left.glb"),
    ("run backward right.fbx", "rifle_run_back_right.glb"),
    ("run left.fbx", "rifle_run_left.glb"),
    ("run right.fbx", "rifle_run_right.glb"),

    # Sprint - 8 directions
    ("sprint forward.fbx", "rifle_sprint_fwd.glb"),
    ("sprint forward left.fbx", "rifle_sprint_fwd_left.glb"),
    ("sprint forward right.fbx", "rifle_sprint_fwd_right.glb"),
    ("sprint backward.fbx", "rifle_sprint_back.glb"),
    ("sprint backward left.fbx", "rifle_sprint_back_left.glb"),
    ("sprint backward right.fbx", "rifle_sprint_back_right.glb"),
    ("sprint left.fbx", "rifle_sprint_left.glb"),
    ("sprint right.fbx", "rifle_sprint_right.glb"),

    # Crouch walk - 8 directions
    ("walk crouching forward.fbx", "rifle_crouch_fwd.glb"),
    ("walk crouching forward left.fbx", "rifle_crouch_fwd_left.glb"),
    ("walk crouching forward right.fbx", "rifle_crouch_fwd_right.glb"),
    ("walk crouching backward.fbx", "rifle_crouch_back.glb"),
    ("walk crouching backward left.fbx", "rifle_crouch_back_left.glb"),
    ("walk crouching backward right.fbx", "rifle_crouch_back_right.glb"),
    ("walk crouching left.fbx", "rifle_crouch_left.glb"),
    ("walk crouching right.fbx", "rifle_crouch_right.glb"),

    # Turns
    ("turn 90 left.fbx", "rifle_turn_left.glb"),
    ("turn 90 right.fbx", "rifle_turn_right.glb"),
    ("crouching turn 90 left.fbx", "rifle_crouch_turn_left.glb"),
    ("crouching turn 90 right.fbx", "rifle_crouch_turn_right.glb"),

    # Jump
    ("jump up.fbx", "rifle_jump_up.glb"),
    ("jump loop.fbx", "rifle_jump_loop.glb"),
    ("jump down.fbx", "rifle_jump_down.glb"),

    # Death variants
    ("death from the front.fbx", "rifle_death_front.glb"),
    ("death from the back.fbx", "rifle_death_back.glb"),
    ("death from right.fbx", "rifle_death_right.glb"),
    ("death from front headshot.fbx", "rifle_death_headshot_front.glb"),
    ("death from back headshot.fbx", "rifle_death_headshot_back.glb"),
    ("death crouching headshot front.fbx", "rifle_death_crouch_headshot.glb"),
]

# ============================================================
# PISTOL LOCOMOTION PACK
# ============================================================
PISTOL_CONVERSIONS = [
    # Idle
    ("pistol idle.fbx", "pistol_idle.glb"),
    ("pistol kneeling idle.fbx", "pistol_kneel_idle.glb"),

    # Transitions
    ("pistol stand to kneel.fbx", "pistol_stand_to_kneel.glb"),
    ("pistol kneel to stand.fbx", "pistol_kneel_to_stand.glb"),

    # Walk
    ("pistol walk.fbx", "pistol_walk_fwd.glb"),
    ("pistol walk backward.fbx", "pistol_walk_back.glb"),
    ("pistol walk arc.fbx", "pistol_walk_left.glb"),
    ("pistol walk arc (2).fbx", "pistol_walk_right.glb"),
    ("pistol walk backward arc.fbx", "pistol_walk_back_left.glb"),
    ("pistol walk backward arc (2).fbx", "pistol_walk_back_right.glb"),

    # Run
    ("pistol run.fbx", "pistol_run_fwd.glb"),
    ("pistol run backward.fbx", "pistol_run_back.glb"),
    ("pistol run arc.fbx", "pistol_run_left.glb"),
    ("pistol run arc (2).fbx", "pistol_run_right.glb"),
    ("pistol run backward arc.fbx", "pistol_run_back_left.glb"),
    ("pistol run backward arc (2).fbx", "pistol_run_back_right.glb"),

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
        print(f"  SKIP: {os.path.basename(input_path)} (not found)")
        return False

    try:
        # Clear scene
        bpy.ops.wm.read_factory_settings(use_empty=True)

        # Import FBX
        bpy.ops.import_scene.fbx(filepath=input_path)

        # Find armature and get frame count
        armature = next((obj for obj in bpy.context.scene.objects if obj.type == 'ARMATURE'), None)
        frame_info = ""
        if armature and armature.animation_data and armature.animation_data.action:
            action = armature.animation_data.action
            frames = int(action.frame_range[1] - action.frame_range[0])
            frame_info = f" ({frames}f)"

        # Export as GLB
        bpy.ops.export_scene.gltf(
            filepath=output_path,
            export_format='GLB',
            export_animations=True,
            export_apply=True,
        )

        print(f"  OK: {os.path.basename(output_path)}{frame_info}")
        return True

    except Exception as e:
        print(f"  ERR: {os.path.basename(input_path)} - {str(e)}")
        return False


def convert_pack(name, source_dir, conversions):
    """Convert a pack of animations"""
    print(f"\n{'=' * 60}")
    print(f"Converting: {name}")
    print(f"{'=' * 60}")

    success = 0
    for src_name, dst_name in conversions:
        src_path = os.path.join(source_dir, src_name)
        dst_path = os.path.join(OUTPUT_DIR, dst_name)
        if convert_fbx_to_glb(src_path, dst_path):
            success += 1

    print(f"\n{name}: {success}/{len(conversions)} converted")
    return success


def main():
    print("\n" + "=" * 60)
    print("XBot Animation Converter")
    print("=" * 60)

    total = 0
    expected = 0

    # Convert Male Locomotion Pack (unarmed)
    total += convert_pack("Male Locomotion Pack (Unarmed)", MALE_LOCOMOTION_DIR, MALE_LOCOMOTION_CONVERSIONS)
    expected += len(MALE_LOCOMOTION_CONVERSIONS)

    # Convert Rifle 8-Way Pack
    total += convert_pack("Rifle 8-Way Locomotion Pack", RIFLE_8WAY_DIR, RIFLE_8WAY_CONVERSIONS)
    expected += len(RIFLE_8WAY_CONVERSIONS)

    # Convert Pistol Pack
    total += convert_pack("Pistol Locomotion Pack", PISTOL_DIR, PISTOL_CONVERSIONS)
    expected += len(PISTOL_CONVERSIONS)

    print("\n" + "=" * 60)
    print(f"COMPLETE: {total}/{expected} animations converted")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    main()
