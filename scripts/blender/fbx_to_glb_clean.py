#!/usr/bin/env python3
"""
Clean FBX to GLB Converter
Converts Mixamo-rigged FBX to GLB with materials but NO morph targets.
This creates a clean rigged base mesh for the character creator.

Usage:
  blender --background --python fbx_to_glb_clean.py -- male
  blender --background --python fbx_to_glb_clean.py -- female
  blender --background --python fbx_to_glb_clean.py -- <input.fbx> <output.glb>
"""

import bpy
import sys
import os

# ============================================================
# CONFIGURATION
# ============================================================

# Default paths (relative to project root)
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

DEFAULT_PATHS = {
    'male': {
        'input': os.path.join(PROJECT_ROOT, 'apps/frontend/public/models/Characters/Character Models/mb_male_for_mixamo.fbx'),
        'output': os.path.join(PROJECT_ROOT, 'apps/frontend/public/assets/avatars/base_male.glb'),
    },
    'female': {
        'input': os.path.join(PROJECT_ROOT, 'apps/frontend/public/models/Characters/Character Models/mb_female_for_mixamo.fbx'),
        'output': os.path.join(PROJECT_ROOT, 'apps/frontend/public/assets/avatars/base_female.glb'),
    },
}

# ============================================================
# HELPER FUNCTIONS
# ============================================================

def get_args():
    """Get command line arguments after '--'"""
    argv = sys.argv
    if "--" in argv:
        return argv[argv.index("--") + 1:]
    return []

def clear_scene():
    """Remove all objects from the scene"""
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete()

    # Clean up orphan data
    for block in bpy.data.meshes:
        if block.users == 0:
            bpy.data.meshes.remove(block)
    for block in bpy.data.materials:
        if block.users == 0:
            bpy.data.materials.remove(block)
    for block in bpy.data.armatures:
        if block.users == 0:
            bpy.data.armatures.remove(block)

def create_body_material():
    """Create a tintable body/skin material"""
    mat = bpy.data.materials.new(name="Body")
    mat.use_nodes = True

    # Get the principled BSDF node
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        # Set default skin-like properties
        bsdf.inputs["Base Color"].default_value = (0.8, 0.6, 0.5, 1.0)  # Light skin tone
        bsdf.inputs["Roughness"].default_value = 0.6
        bsdf.inputs["Metallic"].default_value = 0.0
        # Subsurface for skin
        if "Subsurface Weight" in bsdf.inputs:
            bsdf.inputs["Subsurface Weight"].default_value = 0.1

    return mat

def create_eyes_material():
    """Create a tintable eyes material"""
    mat = bpy.data.materials.new(name="Eyes")
    mat.use_nodes = True

    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = (0.4, 0.25, 0.15, 1.0)  # Brown
        bsdf.inputs["Roughness"].default_value = 0.3
        bsdf.inputs["Metallic"].default_value = 0.0

    return mat

def apply_materials(mesh_obj):
    """Apply Body and Eyes materials to the mesh"""
    # Create materials
    body_mat = create_body_material()
    eyes_mat = create_eyes_material()

    # Clear existing materials
    mesh_obj.data.materials.clear()

    # Add body material (slot 0)
    mesh_obj.data.materials.append(body_mat)

    print(f"  Applied materials: Body")

def import_fbx(filepath):
    """Import FBX file"""
    print(f"  Importing FBX: {filepath}")
    bpy.ops.import_scene.fbx(filepath=filepath)

    # Find imported objects
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH']
    armatures = [obj for obj in bpy.context.scene.objects if obj.type == 'ARMATURE']

    return meshes, armatures

def export_glb(filepath):
    """Export scene to GLB format"""
    print(f"  Exporting GLB: {filepath}")

    # Ensure output directory exists
    os.makedirs(os.path.dirname(filepath), exist_ok=True)

    bpy.ops.export_scene.gltf(
        filepath=filepath,
        export_format='GLB',
        export_animations=False,  # No animations in base mesh
        export_skins=True,  # Include skeleton/skinning
        export_morph=False,  # NO morph targets - that's the point!
        export_apply=True,  # Apply modifiers
        export_texcoords=True,
        export_normals=True,
        export_tangents=True,
        export_materials='EXPORT',
    )

def process_model(input_path, output_path):
    """Process a single model: FBX → clean GLB"""
    print(f"\n{'='*60}")
    print(f"Processing: {os.path.basename(input_path)}")
    print(f"{'='*60}")

    # Clear scene
    clear_scene()

    # Import FBX
    meshes, armatures = import_fbx(input_path)

    if not meshes:
        print("ERROR: No meshes found in FBX!")
        return False

    if not armatures:
        print("WARNING: No armature found - model will not be animated!")
    else:
        print(f"  Found armature: {armatures[0].name} ({len(armatures[0].data.bones)} bones)")

    # Get main mesh
    main_mesh = meshes[0]
    print(f"  Main mesh: {main_mesh.name} ({len(main_mesh.data.vertices)} vertices)")

    # Apply materials
    apply_materials(main_mesh)

    # Center the model at origin if needed
    # (Mixamo exports are usually centered, but just in case)

    # Export to GLB
    export_glb(output_path)

    # Verify file was created
    if os.path.exists(output_path):
        size_kb = os.path.getsize(output_path) / 1024
        print(f"\n  ✓ Success! Output: {output_path}")
        print(f"  ✓ File size: {size_kb:.1f} KB")
        return True
    else:
        print(f"\n  ✗ Failed to create output file!")
        return False

# ============================================================
# MAIN
# ============================================================

def main():
    args = get_args()

    print("\n" + "="*60)
    print("CLEAN FBX TO GLB CONVERTER")
    print("Creates rigged mesh with materials, NO morph targets")
    print("="*60)

    if len(args) == 0:
        print("\nUsage:")
        print("  blender --background --python fbx_to_glb_clean.py -- male")
        print("  blender --background --python fbx_to_glb_clean.py -- female")
        print("  blender --background --python fbx_to_glb_clean.py -- <input.fbx> <output.glb>")
        sys.exit(1)

    if len(args) == 1:
        # Preset mode: male or female
        preset = args[0].lower()
        if preset in DEFAULT_PATHS:
            input_path = DEFAULT_PATHS[preset]['input']
            output_path = DEFAULT_PATHS[preset]['output']
        else:
            print(f"Unknown preset: {preset}")
            print("Valid presets: male, female")
            sys.exit(1)
    else:
        # Custom paths
        input_path = os.path.abspath(args[0])
        output_path = os.path.abspath(args[1])

    # Verify input exists
    if not os.path.exists(input_path):
        print(f"ERROR: Input file not found: {input_path}")
        sys.exit(1)

    # Process the model
    success = process_model(input_path, output_path)

    print("\n" + "="*60)
    if success:
        print("DONE - Clean GLB created successfully!")
        print("Next: Test in browser at /character-creator")
    else:
        print("FAILED - See errors above")
    print("="*60 + "\n")

    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
