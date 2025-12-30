"""
batch_process_xbot.py

Batch processes all X Bot animations from Mixamo packs:
- Male Locomotion Pack (unarmed movement)
- Lite Rifle Pack (weapon animations)

Converts FBX to clean GLB files ready for the game engine.

Usage:
    blender --background --python scripts/blender/batch_process_xbot.py

Output:
    /apps/frontend/public/assets/animations/xbot/
"""

import bpy
import math
import sys
from pathlib import Path
from mathutils import Quaternion, Euler

# Base paths
PROJECT_ROOT = Path(__file__).parent.parent.parent
PUBLIC_DIR = PROJECT_ROOT / "apps/frontend/public"
NEW_ANIMS_DIR = PUBLIC_DIR / "animations/new animations"
OUTPUT_DIR = PUBLIC_DIR / "assets/animations/xbot"

# Input directories
LOCOMOTION_DIR = NEW_ANIMS_DIR / "Male Locomotion Pack"
RIFLE_DIR = NEW_ANIMS_DIR / "Lite Rifle Pack"

# Animation definitions: (source_dir, input_name, output_name, y_correction_deg, preserve_hips_position)
ANIMATIONS = [
    # ============================================================
    # BASIC LOCOMOTION (unarmed)
    # ============================================================
    (LOCOMOTION_DIR, "idle.fbx", "idle.glb", 0, False),
    (LOCOMOTION_DIR, "walking.fbx", "walk.glb", 0, False),
    (LOCOMOTION_DIR, "standard run.fbx", "run.glb", 0, False),
    (LOCOMOTION_DIR, "jump.fbx", "jump.glb", 0, False),

    # Strafe (running speed)
    (LOCOMOTION_DIR, "left strafe.fbx", "strafe_left_run.glb", 0, False),
    (LOCOMOTION_DIR, "right strafe.fbx", "strafe_right_run.glb", 0, False),

    # Strafe (walking speed)
    (LOCOMOTION_DIR, "left strafe walking.fbx", "strafe_left_walk.glb", 0, False),
    (LOCOMOTION_DIR, "right strafe walking.fbx", "strafe_right_walk.glb", 0, False),

    # Turns (unarmed)
    (LOCOMOTION_DIR, "left turn 90.fbx", "turn_left.glb", 0, False),
    (LOCOMOTION_DIR, "right turn 90.fbx", "turn_right.glb", 0, False),

    # ============================================================
    # RIFLE ANIMATIONS
    # ============================================================
    # Idle states
    (RIFLE_DIR, "idle.fbx", "rifle_idle.glb", 0, False),
    (RIFLE_DIR, "idle aiming.fbx", "rifle_aim_idle.glb", 0, False),
    (RIFLE_DIR, "idle crouching.fbx", "rifle_crouch_idle.glb", 0, True),  # Preserve Y for crouch

    # Forward movement
    (RIFLE_DIR, "run forward.fbx", "rifle_run_forward.glb", 0, False),
    (RIFLE_DIR, "run forward left.fbx", "rifle_run_forward_left.glb", 0, False),
    (RIFLE_DIR, "run forward right.fbx", "rifle_run_forward_right.glb", 0, False),

    # Backward movement
    (RIFLE_DIR, "run backward.fbx", "rifle_run_backward.glb", 0, False),
    (RIFLE_DIR, "run backward left.fbx", "rifle_run_backward_left.glb", 0, False),
    (RIFLE_DIR, "run backward right.fbx", "rifle_run_backward_right.glb", 0, False),

    # Strafe
    (RIFLE_DIR, "run left.fbx", "rifle_strafe_left.glb", 0, False),
    (RIFLE_DIR, "run right.fbx", "rifle_strafe_right.glb", 0, False),

    # Turns (with rifle)
    (RIFLE_DIR, "turn 90 left.fbx", "rifle_turn_left.glb", 0, False),
    (RIFLE_DIR, "turn 90 right.fbx", "rifle_turn_right.glb", 0, False),

    # Death
    (RIFLE_DIR, "death from front headshot.fbx", "death.glb", 0, True),  # Preserve position for fall
]


def clear_scene():
    """Clear all objects from the scene."""
    bpy.ops.wm.read_factory_settings(use_empty=True)


def import_fbx(filepath):
    """Import FBX file."""
    print(f"  Importing: {filepath.name}")
    bpy.ops.import_scene.fbx(
        filepath=str(filepath),
        use_anim=True,
        ignore_leaf_bones=True,
        automatic_bone_orientation=False,
    )


def find_armature():
    """Find the armature object."""
    for obj in bpy.context.scene.objects:
        if obj.type == 'ARMATURE':
            return obj
    return None


def find_hips_fcurves(action):
    """Find all fcurves related to Hips bone."""
    hips_patterns = ['Hips', 'mixamorig:Hips', 'mixamorig1:Hips', 'mixamorigHips']

    hips_fcurves = {
        'position': {},
        'rotation': {},
        'scale': {},
    }

    for fcurve in action.fcurves:
        data_path = fcurve.data_path
        is_hips = any(pattern in data_path for pattern in hips_patterns)
        if not is_hips:
            continue

        if '.location' in data_path:
            hips_fcurves['position'][fcurve.array_index] = fcurve
        elif '.rotation_quaternion' in data_path:
            hips_fcurves['rotation'][fcurve.array_index] = fcurve
        elif '.scale' in data_path:
            hips_fcurves['scale'][fcurve.array_index] = fcurve

    return hips_fcurves


def apply_y_correction(action, correction_deg):
    """Apply Y-axis rotation correction to Hips bone."""
    if abs(correction_deg) < 0.1:
        return

    print(f"  Applying Y-correction: {correction_deg}°")
    correction_quat = Euler((0, math.radians(correction_deg), 0), 'XYZ').to_quaternion()

    hips_fcurves = find_hips_fcurves(action)
    quat_curves = hips_fcurves['rotation']

    if len(quat_curves) != 4:
        print(f"  WARNING: Expected 4 quaternion channels, found {len(quat_curves)}")
        return

    num_keyframes = len(quat_curves[0].keyframe_points)

    for i in range(num_keyframes):
        w = quat_curves[0].keyframe_points[i].co[1]
        x = quat_curves[1].keyframe_points[i].co[1]
        y = quat_curves[2].keyframe_points[i].co[1]
        z = quat_curves[3].keyframe_points[i].co[1]

        original = Quaternion((w, x, y, z))
        corrected = correction_quat @ original

        quat_curves[0].keyframe_points[i].co[1] = corrected.w
        quat_curves[1].keyframe_points[i].co[1] = corrected.x
        quat_curves[2].keyframe_points[i].co[1] = corrected.y
        quat_curves[3].keyframe_points[i].co[1] = corrected.z

    for fcurve in quat_curves.values():
        fcurve.update()


def strip_tracks(action, preserve_hips_position=False):
    """Strip Hips position and all scale tracks."""
    hips_fcurves = find_hips_fcurves(action)
    fcurves_to_remove = []

    # Strip Hips position (root motion) unless preserving
    if not preserve_hips_position:
        for fcurve in hips_fcurves['position'].values():
            fcurves_to_remove.append(fcurve)

    # Strip all scale tracks
    for fcurve in action.fcurves:
        if '.scale' in fcurve.data_path:
            fcurves_to_remove.append(fcurve)

    for fcurve in fcurves_to_remove:
        try:
            action.fcurves.remove(fcurve)
        except:
            pass

    print(f"  Stripped {len(fcurves_to_remove)} tracks")


def export_glb(filepath, armature, include_mesh=False):
    """Export as GLB."""
    filepath.parent.mkdir(parents=True, exist_ok=True)

    bpy.ops.object.select_all(action='DESELECT')
    armature.select_set(True)
    bpy.context.view_layer.objects.active = armature

    # If including mesh, select mesh objects too
    if include_mesh:
        for obj in bpy.context.scene.objects:
            if obj.type == 'MESH':
                obj.select_set(True)

    bpy.ops.export_scene.gltf(
        filepath=str(filepath),
        export_format='GLB',
        use_selection=True,
        export_animations=not include_mesh,  # No anims in character file
        export_apply=True,
        export_skins=include_mesh,  # Only skins for character
        export_def_bones=True,
        export_nla_strips=False,
        export_force_sampling=True,
    )


def export_character():
    """Export the character model (mesh + skeleton, no animations)."""
    # Try Locomotion pack first (usually cleaner idle pose)
    character_path = LOCOMOTION_DIR / "character.fbx"
    if not character_path.exists():
        character_path = RIFLE_DIR / "character.fbx"

    if not character_path.exists():
        print(f"ERROR: No character.fbx found in either pack")
        return False

    print(f"\n{'='*60}")
    print("EXPORTING CHARACTER MODEL")
    print(f"{'='*60}")

    clear_scene()
    import_fbx(character_path)

    armature = find_armature()
    if not armature:
        print("  ERROR: No armature found")
        return False

    output_path = OUTPUT_DIR / "xbot.glb"
    export_glb(output_path, armature, include_mesh=True)

    print(f"  Exported: {output_path}")
    return True


def process_animation(source_dir, input_name, output_name, y_correction, preserve_hips_position):
    """Process a single animation file."""
    input_path = source_dir / input_name
    output_path = OUTPUT_DIR / output_name

    if not input_path.exists():
        print(f"  SKIP: File not found: {input_path}")
        return False

    print(f"\nProcessing: {input_name} -> {output_name}")

    clear_scene()
    import_fbx(input_path)

    armature = find_armature()
    if not armature:
        print("  ERROR: No armature found")
        return False

    if not armature.animation_data or not armature.animation_data.action:
        print("  ERROR: No animation data")
        return False

    action = armature.animation_data.action
    print(f"  Action: {action.name}, Frames: {action.frame_range}")

    # Apply corrections
    apply_y_correction(action, y_correction)
    strip_tracks(action, preserve_hips_position)

    # Export
    export_glb(output_path, armature, include_mesh=False)
    print(f"  Exported: {output_path}")

    return True


def main():
    print("="*60)
    print("BATCH PROCESS X BOT ANIMATIONS")
    print("="*60)
    print(f"Locomotion Pack: {LOCOMOTION_DIR}")
    print(f"Rifle Pack:      {RIFLE_DIR}")
    print(f"Output:          {OUTPUT_DIR}")
    print("="*60)

    # Ensure output directory exists
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Export character model first
    export_character()

    # Process all animations
    success = 0
    failed = 0

    for source_dir, input_name, output_name, y_correction, preserve_hips in ANIMATIONS:
        if process_animation(source_dir, input_name, output_name, y_correction, preserve_hips):
            success += 1
        else:
            failed += 1

    print("\n" + "="*60)
    print(f"COMPLETE: {success} processed, {failed} failed")
    print("="*60)

    # Print next steps
    print("\nOUTPUT FILES:")
    for f in sorted(OUTPUT_DIR.glob("*.glb")):
        size_kb = f.stat().st_size / 1024
        print(f"  {f.name:30} ({size_kb:.1f} KB)")

    print("\nNEXT STEPS:")
    print("1. Run: blender --background --python scripts/blender/batch_process_xbot.py")
    print("2. Test animations in game")
    print("3. If character faces wrong direction, update y_correction values")


if __name__ == "__main__":
    main()
