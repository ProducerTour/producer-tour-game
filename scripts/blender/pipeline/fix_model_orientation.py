"""
fix_model_orientation.py

Bakes the 88° X-rotation into swat_operator.glb so it faces +Z forward at rest.
This eliminates the need for runtime rotation compensation.

Usage:
    blender --background --python scripts/blender/pipeline/fix_model_orientation.py

Output:
    Creates swat_operator_canonical.glb with correct orientation
"""

import bpy
import math
import os
from pathlib import Path

# Configuration
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent.parent
AVATARS_DIR = PROJECT_ROOT / "apps" / "frontend" / "public" / "assets" / "avatars"

INPUT_FILE = AVATARS_DIR / "swat_operator.glb"
OUTPUT_FILE = AVATARS_DIR / "swat_operator_canonical.glb"

# The rotation that's currently applied at runtime (88°)
ROTATION_X_DEG = 88.0


def clear_scene():
    """Clear all objects from the scene."""
    bpy.ops.wm.read_factory_settings(use_empty=True)


def import_model(filepath):
    """Import GLB model."""
    print(f"Importing: {filepath}")
    bpy.ops.import_scene.gltf(filepath=str(filepath))


def find_armature():
    """Find the armature object in the scene."""
    for obj in bpy.context.scene.objects:
        if obj.type == 'ARMATURE':
            return obj
    return None


def find_meshes(armature):
    """Find all meshes parented to the armature."""
    meshes = []
    for obj in bpy.context.scene.objects:
        if obj.type == 'MESH':
            # Check if parented to armature or has armature modifier
            if obj.parent == armature:
                meshes.append(obj)
            else:
                for mod in obj.modifiers:
                    if mod.type == 'ARMATURE' and mod.object == armature:
                        meshes.append(obj)
                        break
    return meshes


def apply_rotation_to_armature(armature, rotation_x_deg):
    """
    Apply X-axis rotation to armature and bake it into the rest pose.
    This makes the model face +Z forward without runtime rotation.
    """
    print(f"Applying {rotation_x_deg}° X-rotation to armature...")

    # Select and make active
    bpy.ops.object.select_all(action='DESELECT')
    armature.select_set(True)
    bpy.context.view_layer.objects.active = armature

    # Apply the rotation
    armature.rotation_euler[0] = math.radians(rotation_x_deg)

    # Apply the transform (bake into mesh/bones)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)

    print("Rotation applied to armature")


def apply_rotation_to_meshes(meshes, rotation_x_deg):
    """
    Apply rotation to all skinned meshes.
    """
    for mesh in meshes:
        print(f"Processing mesh: {mesh.name}")

        bpy.ops.object.select_all(action='DESELECT')
        mesh.select_set(True)
        bpy.context.view_layer.objects.active = mesh

        # If mesh has its own rotation, apply it
        if any(abs(r) > 0.001 for r in mesh.rotation_euler):
            bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)


def export_model(filepath):
    """Export as GLB with proper settings."""
    print(f"Exporting to: {filepath}")

    # Ensure output directory exists
    filepath.parent.mkdir(parents=True, exist_ok=True)

    bpy.ops.export_scene.gltf(
        filepath=str(filepath),
        export_format='GLB',
        export_animations=True,
        export_apply=True,
        export_skins=True,
        export_all_influences=False,  # Limit to 4 weights
        export_def_bones=True,
        use_visible=False,
        use_active_collection=False,
    )

    print(f"Exported: {filepath}")


def verify_orientation(armature):
    """Verify the armature now faces +Z forward."""
    # After applying rotation, the armature should have 0 rotation
    rot = armature.rotation_euler
    if all(abs(r) < 0.01 for r in rot):
        print("SUCCESS: Armature has zero rotation (correct)")
    else:
        print(f"WARNING: Armature still has rotation: {[math.degrees(r) for r in rot]}")


def main():
    print("=" * 60)
    print("FIX MODEL ORIENTATION")
    print("=" * 60)

    if not INPUT_FILE.exists():
        print(f"ERROR: Input file not found: {INPUT_FILE}")
        return

    # Clear and import
    clear_scene()
    import_model(INPUT_FILE)

    # Find armature and meshes
    armature = find_armature()
    if not armature:
        print("ERROR: No armature found in model")
        return

    print(f"Found armature: {armature.name}")
    print(f"Bones: {len(armature.data.bones)}")

    meshes = find_meshes(armature)
    print(f"Found {len(meshes)} meshes: {[m.name for m in meshes]}")

    # Apply rotation
    apply_rotation_to_armature(armature, ROTATION_X_DEG)
    apply_rotation_to_meshes(meshes, ROTATION_X_DEG)

    # Verify
    verify_orientation(armature)

    # Export
    export_model(OUTPUT_FILE)

    print("=" * 60)
    print("DONE")
    print("=" * 60)
    print(f"\nNext step: Update DefaultAvatar.tsx to use:")
    print(f"  const DEFAULT_AVATAR_PATH = '/assets/avatars/swat_operator_canonical.glb';")
    print(f"\nAnd set rotX: 0 in Leva controls")


if __name__ == "__main__":
    main()
