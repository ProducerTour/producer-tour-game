#!/usr/bin/env python3
"""
Generate rigged characters with morphs using MPFB addon.
MPFB (MakeHuman Plugin for Blender) creates parametric humans with:
- Mixamo-compatible skeleton
- Face and body shape keys
"""

import bpy
import sys
import os

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

def check_mpfb():
    """Check if MPFB addon is available"""
    try:
        from mpfb.services.humanservice import HumanService
        from mpfb.services.rigservice import RigService
        print("MPFB addon found!")
        return True
    except ImportError as e:
        print(f"MPFB not available: {e}")
        return False

def create_human_with_mpfb(gender='male', output_path=None):
    """Create a human using MPFB"""
    try:
        from mpfb.services.humanservice import HumanService
        from mpfb.services.rigservice import RigService
        from mpfb.services.objectservice import ObjectService
        from mpfb.services.targetservice import TargetService

        clear_scene()

        print(f"Creating {gender} human with MPFB...")

        # Create base human
        basemesh = HumanService.create_human()
        if not basemesh:
            print("Failed to create base mesh")
            return None

        print(f"Created base mesh: {basemesh.name}")
        print(f"  Vertices: {len(basemesh.data.vertices)}")

        # Check for shape keys
        if basemesh.data.shape_keys:
            keys = basemesh.data.shape_keys.key_blocks
            print(f"  Shape keys: {len(keys)}")
        else:
            print("  No shape keys yet")

        # Add rig
        print("Adding rig...")
        armature = RigService.create_rig(basemesh, rig_type="default")
        if armature:
            print(f"  Rig created: {armature.name}")
            print(f"  Bones: {len(armature.data.bones)}")
        else:
            print("  Failed to create rig")

        return basemesh

    except Exception as e:
        print(f"MPFB error: {e}")
        import traceback
        traceback.print_exc()
        return None

def create_simple_mixamo_rig(mesh_obj, output_path):
    """
    Alternative: Create a simple rig compatible with Mixamo.
    This creates a basic humanoid armature that can be auto-rigged by Mixamo.
    """
    print("Creating simple Mixamo-compatible rig...")

    # Create armature
    armature = bpy.data.armatures.new("Armature")
    armature_obj = bpy.data.objects.new("Armature", armature)
    bpy.context.collection.objects.link(armature_obj)

    # Set as active and enter edit mode
    bpy.context.view_layer.objects.active = armature_obj
    bpy.ops.object.mode_set(mode='EDIT')

    # Create basic humanoid bones
    # These positions are approximate for a 1.8m human
    bones_data = [
        # (name, head, tail, parent)
        ("Hips", (0, 0, 1.0), (0, 0, 1.1), None),
        ("Spine", (0, 0, 1.1), (0, 0, 1.3), "Hips"),
        ("Spine1", (0, 0, 1.3), (0, 0, 1.45), "Spine"),
        ("Spine2", (0, 0, 1.45), (0, 0, 1.55), "Spine1"),
        ("Neck", (0, 0, 1.55), (0, 0, 1.65), "Spine2"),
        ("Head", (0, 0, 1.65), (0, 0, 1.85), "Neck"),

        # Left arm
        ("LeftShoulder", (0.05, 0, 1.5), (0.15, 0, 1.5), "Spine2"),
        ("LeftArm", (0.15, 0, 1.5), (0.4, 0, 1.5), "LeftShoulder"),
        ("LeftForeArm", (0.4, 0, 1.5), (0.65, 0, 1.5), "LeftArm"),
        ("LeftHand", (0.65, 0, 1.5), (0.75, 0, 1.5), "LeftForeArm"),

        # Right arm
        ("RightShoulder", (-0.05, 0, 1.5), (-0.15, 0, 1.5), "Spine2"),
        ("RightArm", (-0.15, 0, 1.5), (-0.4, 0, 1.5), "RightShoulder"),
        ("RightForeArm", (-0.4, 0, 1.5), (-0.65, 0, 1.5), "RightArm"),
        ("RightHand", (-0.65, 0, 1.5), (-0.75, 0, 1.5), "RightForeArm"),

        # Left leg
        ("LeftUpLeg", (0.1, 0, 1.0), (0.1, 0, 0.55), "Hips"),
        ("LeftLeg", (0.1, 0, 0.55), (0.1, 0, 0.1), "LeftUpLeg"),
        ("LeftFoot", (0.1, 0, 0.1), (0.1, 0.1, 0), "LeftLeg"),
        ("LeftToeBase", (0.1, 0.1, 0), (0.1, 0.2, 0), "LeftFoot"),

        # Right leg
        ("RightUpLeg", (-0.1, 0, 1.0), (-0.1, 0, 0.55), "Hips"),
        ("RightLeg", (-0.1, 0, 0.55), (-0.1, 0, 0.1), "RightUpLeg"),
        ("RightFoot", (-0.1, 0, 0.1), (-0.1, 0.1, 0), "RightLeg"),
        ("RightToeBase", (-0.1, 0.1, 0), (-0.1, 0.2, 0), "RightFoot"),
    ]

    edit_bones = armature.edit_bones

    for name, head, tail, parent_name in bones_data:
        bone = edit_bones.new(name)
        bone.head = head
        bone.tail = tail
        if parent_name:
            bone.parent = edit_bones[parent_name]

    bpy.ops.object.mode_set(mode='OBJECT')

    print(f"  Created armature with {len(armature.bones)} bones")

    # Parent mesh to armature with automatic weights
    mesh_obj.select_set(True)
    armature_obj.select_set(True)
    bpy.context.view_layer.objects.active = armature_obj

    try:
        bpy.ops.object.parent_set(type='ARMATURE_AUTO')
        print("  Parented mesh to armature with automatic weights")
    except Exception as e:
        print(f"  Auto-weight failed: {e}")
        # Try with empty weights
        bpy.ops.object.parent_set(type='ARMATURE')
        print("  Parented mesh to armature (no weights)")

    return armature_obj

def main():
    args = get_args()

    if len(args) < 1:
        print("Usage: blender --background --python generate_rigged_character.py -- <output_dir>")
        sys.exit(1)

    output_dir = os.path.abspath(args[0])
    os.makedirs(output_dir, exist_ok=True)

    print("=" * 60)
    print("RIGGED CHARACTER GENERATION")
    print("=" * 60)

    # Check MPFB
    has_mpfb = check_mpfb()

    if has_mpfb:
        # Try MPFB first
        print("\nUsing MPFB to create character...")
        mesh = create_human_with_mpfb('male')

        if mesh:
            output_path = os.path.join(output_dir, "base_male_rigged.glb")

            # Export
            bpy.ops.object.select_all(action='SELECT')
            bpy.ops.export_scene.gltf(
                filepath=output_path,
                export_format='GLB',
                use_selection=True,
                export_animations=False,
                export_skins=True,  # Include skeleton
                export_morph=True,
                export_morph_normal=True,
                export_yup=True,
                export_materials='EXPORT',
            )
            print(f"\nExported to: {output_path}")
    else:
        print("\nMPFB not available for character generation")
        print("Alternative: Upload mesh to Mixamo for auto-rigging")

    print("\n" + "=" * 60)
    print("DONE")
    print("=" * 60)

if __name__ == "__main__":
    main()
