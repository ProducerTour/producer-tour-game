"""
Mixamo Export Preparation Script for Blender
=============================================

Prepares Mixamo characters and animations for web game export.

Usage:
    1. Import your Mixamo FBX in Blender
    2. Run this script from Text Editor or Scripting workspace
    3. Export as GLB with "Apply Transform" enabled

Features:
    - Strips 'mixamorig:' bone prefixes
    - Removes scale tracks from animations
    - Removes root motion (preserves Y for crouch)
    - Applies -90 deg X rotation for +Z forward
    - Detects duplicate skeleton issues
    - Validates bone hierarchy

Compatible with Blender 3.x and 4.x
"""

import bpy
import math
import re
from typing import Set, List, Optional


# Animations that should preserve Hips Y-position for lowering effect
CROUCH_KEYWORDS = {'crouch', 'kneel', 'prone', 'cover', 'duck'}

# Expected Mixamo bone hierarchy (core bones)
EXPECTED_BONES = {
    'Hips', 'Spine', 'Spine1', 'Spine2',
    'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'LeftToeBase',
    'RightUpLeg', 'RightLeg', 'RightFoot', 'RightToeBase',
    'Neck', 'Head',
    'LeftShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand',
    'RightShoulder', 'RightArm', 'RightForeArm', 'RightHand'
}


class MixamoExportPrep:
    """Main class for preparing Mixamo assets for web game export."""

    def __init__(self):
        self.errors: List[str] = []
        self.warnings: List[str] = []
        self.fixed: List[str] = []

    def run_all(
        self,
        apply_rotation: bool = True,
        strip_root_motion: bool = True,
        is_crouch_animation: bool = False
    ):
        """
        Run all preparation steps.

        Args:
            apply_rotation: Apply -90 deg X rotation for +Z forward
            strip_root_motion: Remove Hips position tracks
            is_crouch_animation: If True, preserves Hips Y position
        """
        print("=" * 60)
        print("  MIXAMO EXPORT PREPARATION")
        print("=" * 60)

        # Step 1: Strip bone prefixes
        self.strip_bone_prefixes()

        # Step 2: Remove scale tracks (always)
        self.remove_scale_tracks()

        # Step 3: Remove root motion (optional)
        if strip_root_motion:
            self.remove_root_motion(force_preserve_y=is_crouch_animation)

        # Step 4: Apply orientation fix (optional)
        if apply_rotation:
            self.apply_orientation_fix()

        # Step 5: Check for duplicate skeleton
        self.detect_duplicate_skeleton()

        # Step 6: Validate bone hierarchy
        self.validate_hierarchy()

        # Print final report
        self.print_report()

    def strip_bone_prefixes(self):
        """Remove 'mixamorig:' and 'mixamorig' prefixes from all bones."""
        total_renamed = 0

        for obj in bpy.data.objects:
            if obj.type != 'ARMATURE':
                continue

            armature = obj.data
            renamed_count = 0

            # Rename bones in armature
            for bone in armature.bones:
                original_name = bone.name
                new_name = self._strip_prefix(original_name)

                if new_name != original_name:
                    bone.name = new_name
                    renamed_count += 1

            # Also rename in edit bones if in edit mode
            if obj.mode == 'EDIT':
                for bone in armature.edit_bones:
                    original_name = bone.name
                    new_name = self._strip_prefix(original_name)
                    if new_name != original_name:
                        bone.name = new_name

            if renamed_count > 0:
                self.fixed.append(f"Renamed {renamed_count} bones in '{obj.name}'")
                total_renamed += renamed_count

        # Rename animation track targets to match
        self._rename_animation_tracks()

        # Rename vertex groups to match new bone names
        self._rename_vertex_groups()

        if total_renamed > 0:
            print(f"  [OK] Stripped prefixes from {total_renamed} bones")

    def _strip_prefix(self, name: str) -> str:
        """Strip mixamorig prefix from a bone name."""
        # Check colon version first (mixamorig:Hips)
        if name.startswith('mixamorig:'):
            return name[10:]
        # Check no-colon version (mixamorigHips)
        if name.startswith('mixamorig'):
            return name[9:]
        return name

    def _rename_animation_tracks(self):
        """Rename animation track bone references to match stripped bone names."""
        renamed_tracks = 0

        for action in bpy.data.actions:
            for fcurve in action.fcurves:
                path = fcurve.data_path

                # Replace bone references in data_path
                if 'mixamorig:' in path:
                    fcurve.data_path = path.replace('mixamorig:', '')
                    renamed_tracks += 1
                elif 'mixamorig' in path:
                    # Handle case without colon (mixamorigHips -> Hips)
                    fcurve.data_path = re.sub(r'mixamorig(\d*)', '', path)
                    renamed_tracks += 1

        if renamed_tracks > 0:
            print(f"  [OK] Updated {renamed_tracks} animation track paths")

    def _rename_vertex_groups(self):
        """Rename vertex groups to match new bone names."""
        renamed_groups = 0

        for obj in bpy.data.objects:
            if obj.type != 'MESH':
                continue

            for vg in obj.vertex_groups:
                original_name = vg.name
                new_name = self._strip_prefix(original_name)

                if new_name != original_name:
                    vg.name = new_name
                    renamed_groups += 1

        if renamed_groups > 0:
            print(f"  [OK] Renamed {renamed_groups} vertex groups")

    def remove_scale_tracks(self):
        """Remove all .scale tracks from animations."""
        removed_count = 0

        for action in bpy.data.actions:
            fcurves_to_remove = []

            for fcurve in action.fcurves:
                if fcurve.data_path.endswith('.scale'):
                    fcurves_to_remove.append(fcurve)

            for fcurve in fcurves_to_remove:
                action.fcurves.remove(fcurve)
                removed_count += 1

        if removed_count > 0:
            self.fixed.append(f"Removed {removed_count} scale tracks")
            print(f"  [OK] Removed {removed_count} scale tracks")
        else:
            print("  [--] No scale tracks found")

    def remove_root_motion(
        self,
        preserve_y_for: Optional[Set[str]] = None,
        force_preserve_y: bool = False
    ):
        """
        Remove Hips position tracks (root motion).

        Args:
            preserve_y_for: Set of keywords - if action name contains any,
                           Y position is preserved (for crouch animations)
            force_preserve_y: If True, always preserve Y position
        """
        if preserve_y_for is None:
            preserve_y_for = CROUCH_KEYWORDS

        removed_count = 0

        for action in bpy.data.actions:
            # Check if this animation should preserve Y position
            action_lower = action.name.lower()
            is_crouch = force_preserve_y or any(
                keyword in action_lower for keyword in preserve_y_for
            )

            fcurves_to_remove = []

            for fcurve in action.fcurves:
                path = fcurve.data_path

                # Check if this is a Hips location track
                if 'Hips' not in path:
                    continue
                if not path.endswith('.location'):
                    continue

                # Get axis index (0=X, 1=Y, 2=Z in Blender)
                # Note: Blender Z = Three.js Y (up axis)
                axis_index = fcurve.array_index

                if is_crouch and axis_index == 2:
                    # Keep Z (vertical) position for crouch animations
                    continue

                fcurves_to_remove.append(fcurve)

            for fcurve in fcurves_to_remove:
                action.fcurves.remove(fcurve)
                removed_count += 1

        if removed_count > 0:
            self.fixed.append(f"Removed {removed_count} root motion tracks")
            print(f"  [OK] Removed {removed_count} root motion tracks")
        else:
            print("  [--] No root motion tracks found")

    def apply_orientation_fix(self):
        """Apply -90 deg X rotation to armature for +Z forward orientation."""
        rotated_count = 0

        for obj in bpy.data.objects:
            if obj.type != 'ARMATURE':
                continue

            # Check if rotation is already applied
            current_rot = obj.rotation_euler[0]
            target_rot = -math.pi / 2  # -90 degrees

            # Skip if already rotated (within 1 degree tolerance)
            if abs(current_rot - target_rot) < 0.02:
                print(f"  [--] '{obj.name}' already rotated")
                continue

            # Set rotation
            obj.rotation_euler[0] = target_rot

            # Apply rotation to make it permanent
            # Need to set as active and selected
            bpy.context.view_layer.objects.active = obj
            obj.select_set(True)

            # Store current mode and switch to object mode
            current_mode = obj.mode
            if current_mode != 'OBJECT':
                bpy.ops.object.mode_set(mode='OBJECT')

            bpy.ops.object.transform_apply(
                location=False,
                rotation=True,
                scale=False
            )

            obj.select_set(False)
            rotated_count += 1

            self.fixed.append(f"Applied -90 deg X rotation to '{obj.name}'")

        if rotated_count > 0:
            print(f"  [OK] Applied rotation to {rotated_count} armature(s)")
        else:
            print("  [--] No rotation needed")

    def detect_duplicate_skeleton(self):
        """Detect duplicate skeleton bones (with _1 suffix)."""
        for obj in bpy.data.objects:
            if obj.type != 'ARMATURE':
                continue

            armature = obj.data
            duplicates = []

            for bone in armature.bones:
                if bone.name.endswith('_1') or '_1.' in bone.name:
                    duplicates.append(bone.name)

            if duplicates:
                self.warnings.append(
                    f"Dual skeleton in '{obj.name}': {len(duplicates)} bones "
                    f"with _1 suffix ({', '.join(duplicates[:3])}...)"
                )
                print(f"  [!!] Found {len(duplicates)} duplicate bones in '{obj.name}'")

    def validate_hierarchy(self):
        """Validate bone hierarchy matches expected Mixamo structure."""
        for obj in bpy.data.objects:
            if obj.type != 'ARMATURE':
                continue

            armature = obj.data
            bone_names = {bone.name for bone in armature.bones}

            # Check for missing bones
            missing = EXPECTED_BONES - bone_names
            if missing:
                self.warnings.append(
                    f"Missing bones in '{obj.name}': {', '.join(sorted(missing))}"
                )

            # Check Hips is root (has no parent)
            hips = armature.bones.get('Hips')
            if hips:
                if hips.parent:
                    self.warnings.append(
                        f"Hips has parent '{hips.parent.name}' - should be root"
                    )
            else:
                self.errors.append(f"No 'Hips' bone found in '{obj.name}'")

    def print_report(self):
        """Print preparation report."""
        print("\n" + "=" * 60)
        print("  PREPARATION REPORT")
        print("=" * 60)

        if self.fixed:
            print("\n  FIXED:")
            for msg in self.fixed:
                print(f"    + {msg}")

        if self.warnings:
            print("\n  WARNINGS:")
            for msg in self.warnings:
                print(f"    ! {msg}")

        if self.errors:
            print("\n  ERRORS:")
            for msg in self.errors:
                print(f"    X {msg}")

        if not self.errors and not self.warnings:
            print("\n  Asset is ready for export!")

        print("\n" + "-" * 60)
        print("  EXPORT SETTINGS:")
        print("    Format: GLB")
        print("    Apply Transform: ENABLED")
        print("    Animation: Include if needed")
        print("=" * 60 + "\n")


def main():
    """Run the preparation script with default settings."""
    prep = MixamoExportPrep()
    prep.run_all(
        apply_rotation=True,
        strip_root_motion=True,
        is_crouch_animation=False  # Set True for crouch animations
    )


def prep_crouch():
    """Run preparation for crouch/kneel animations (preserves Y position)."""
    prep = MixamoExportPrep()
    prep.run_all(
        apply_rotation=True,
        strip_root_motion=True,
        is_crouch_animation=True
    )


def prep_no_rotation():
    """Run preparation without applying rotation (model already oriented)."""
    prep = MixamoExportPrep()
    prep.run_all(
        apply_rotation=False,
        strip_root_motion=True,
        is_crouch_animation=False
    )


# Register as Blender operator for menu access
class MIXAMO_OT_export_prep(bpy.types.Operator):
    """Prepare Mixamo asset for web game export"""
    bl_idname = "mixamo.export_prep"
    bl_label = "Mixamo Export Prep"
    bl_options = {'REGISTER', 'UNDO'}

    apply_rotation: bpy.props.BoolProperty(
        name="Apply -90 X Rotation",
        description="Apply rotation for +Z forward orientation",
        default=True
    )

    strip_root_motion: bpy.props.BoolProperty(
        name="Strip Root Motion",
        description="Remove Hips position tracks",
        default=True
    )

    is_crouch: bpy.props.BoolProperty(
        name="Crouch Animation",
        description="Preserve Y position for crouch/kneel animations",
        default=False
    )

    def execute(self, context):
        prep = MixamoExportPrep()
        prep.run_all(
            apply_rotation=self.apply_rotation,
            strip_root_motion=self.strip_root_motion,
            is_crouch_animation=self.is_crouch
        )

        # Report to Blender UI
        if prep.errors:
            self.report({'ERROR'}, f"Prep failed: {len(prep.errors)} errors")
        elif prep.warnings:
            self.report({'WARNING'}, f"Prep done with {len(prep.warnings)} warnings")
        else:
            self.report({'INFO'}, "Asset ready for export!")

        return {'FINISHED'}

    def invoke(self, context, event):
        return context.window_manager.invoke_props_dialog(self)


def menu_func(self, context):
    self.layout.operator(MIXAMO_OT_export_prep.bl_idname, text="Mixamo Export Prep")


def register():
    bpy.utils.register_class(MIXAMO_OT_export_prep)
    bpy.types.VIEW3D_MT_object.append(menu_func)


def unregister():
    bpy.types.VIEW3D_MT_object.remove(menu_func)
    bpy.utils.unregister_class(MIXAMO_OT_export_prep)


# Run when script is executed directly
if __name__ == "__main__":
    main()
