#!/usr/bin/env python3
"""
Tree Model Optimizer for Three.js
==================================
Converts tree models into single merged meshes optimized for InstancedMesh rendering.

Usage:
  blender --background --python optimize-tree-model.py -- <input> <output> [options]

Options:
  --decimate <ratio>   Decimate to ratio (0.1 = 10% of original, default: no decimation)
  --max-tris <count>   Target max triangles (auto-calculates decimate ratio)
  --center             Center model at origin
  --ground             Place model base at Y=0

Examples:
  # Basic merge (no decimation)
  blender --background --python optimize-tree-model.py -- tree.gltf tree_merged.glb

  # Merge and decimate to 10% of original
  blender --background --python optimize-tree-model.py -- tree.gltf tree_opt.glb --decimate 0.1

  # Merge and target 1500 triangles max
  blender --background --python optimize-tree-model.py -- tree.gltf tree_opt.glb --max-tris 1500

  # Full optimization
  blender --background --python optimize-tree-model.py -- tree.gltf tree_opt.glb --max-tris 1500 --center --ground
"""

import bpy
import sys
import os
import math

def get_args():
    """Parse arguments after '--' """
    argv = sys.argv
    if "--" not in argv:
        return None, None, {}

    args = argv[argv.index("--") + 1:]
    if len(args) < 2:
        print("Usage: blender --background --python optimize-tree-model.py -- <input> <output> [options]")
        return None, None, {}

    input_file = args[0]
    output_file = args[1]

    options = {
        'decimate': None,
        'max_tris': None,
        'center': False,
        'ground': False,
    }

    i = 2
    while i < len(args):
        if args[i] == '--decimate' and i + 1 < len(args):
            options['decimate'] = float(args[i + 1])
            i += 2
        elif args[i] == '--max-tris' and i + 1 < len(args):
            options['max_tris'] = int(args[i + 1])
            i += 2
        elif args[i] == '--center':
            options['center'] = True
            i += 1
        elif args[i] == '--ground':
            options['ground'] = True
            i += 1
        else:
            i += 1

    return input_file, output_file, options


def clear_scene():
    """Remove all objects from scene"""
    bpy.ops.wm.read_factory_settings(use_empty=True)


def import_model(filepath):
    """Import GLB/GLTF model"""
    ext = os.path.splitext(filepath)[1].lower()

    if ext in ['.glb', '.gltf']:
        bpy.ops.import_scene.gltf(filepath=filepath)
    elif ext == '.fbx':
        bpy.ops.import_scene.fbx(filepath=filepath)
    elif ext == '.obj':
        bpy.ops.import_scene.obj(filepath=filepath)
    else:
        raise ValueError(f"Unsupported format: {ext}")

    print(f"✓ Imported: {filepath}")


def count_triangles():
    """Count total triangles in scene"""
    total = 0
    for obj in bpy.data.objects:
        if obj.type == 'MESH':
            # Get evaluated mesh with modifiers applied
            depsgraph = bpy.context.evaluated_depsgraph_get()
            obj_eval = obj.evaluated_get(depsgraph)
            mesh = obj_eval.to_mesh()
            mesh.calc_loop_triangles()
            total += len(mesh.loop_triangles)
            obj_eval.to_mesh_clear()
    return total


def list_meshes():
    """Print all meshes in scene"""
    print("\n=== Meshes in scene ===")
    for obj in bpy.data.objects:
        if obj.type == 'MESH':
            depsgraph = bpy.context.evaluated_depsgraph_get()
            obj_eval = obj.evaluated_get(depsgraph)
            mesh = obj_eval.to_mesh()
            mesh.calc_loop_triangles()
            tris = len(mesh.loop_triangles)
            verts = len(mesh.vertices)
            obj_eval.to_mesh_clear()
            print(f"  {obj.name}: {tris} tris, {verts} verts")
    print("")


def merge_all_meshes():
    """Merge all mesh objects into one"""
    # Deselect all
    bpy.ops.object.select_all(action='DESELECT')

    # Find all mesh objects
    mesh_objects = [obj for obj in bpy.data.objects if obj.type == 'MESH']

    if len(mesh_objects) == 0:
        print("⚠ No mesh objects found!")
        return None

    if len(mesh_objects) == 1:
        print(f"✓ Single mesh found: {mesh_objects[0].name}")
        return mesh_objects[0]

    print(f"Merging {len(mesh_objects)} meshes...")

    # Select all meshes
    for obj in mesh_objects:
        obj.select_set(True)

    # Set active object
    bpy.context.view_layer.objects.active = mesh_objects[0]

    # Join all selected objects
    bpy.ops.object.join()

    merged = bpy.context.active_object
    merged.name = "MergedTree"

    print(f"✓ Merged into: {merged.name}")
    return merged


def apply_decimate(obj, ratio=None, target_tris=None):
    """Apply decimate modifier to reduce poly count"""
    if ratio is None and target_tris is None:
        return

    # Calculate ratio from target tris if specified
    if target_tris is not None:
        current_tris = count_triangles()
        if current_tris <= target_tris:
            print(f"✓ Already under target ({current_tris} <= {target_tris})")
            return
        ratio = target_tris / current_tris
        print(f"Decimating: {current_tris} → {target_tris} tris (ratio: {ratio:.3f})")

    # Add decimate modifier
    modifier = obj.modifiers.new(name="Decimate", type='DECIMATE')
    modifier.decimate_type = 'COLLAPSE'
    modifier.ratio = ratio
    modifier.use_collapse_triangulate = True

    # Apply modifier
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier="Decimate")

    new_tris = count_triangles()
    print(f"✓ Decimated to {new_tris} triangles")


def center_model(obj):
    """Center model at world origin"""
    # Set origin to geometry center
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.origin_set(type='ORIGIN_GEOMETRY', center='BOUNDS')

    # Move to world origin
    obj.location = (0, 0, 0)

    print("✓ Centered at origin")


def ground_model(obj):
    """Place model so its base is at Y=0 (for Blender Z-up, this is Z=0)"""
    # Get bounding box in world space
    bbox = [obj.matrix_world @ v.co for v in obj.data.vertices]
    min_z = min(v.z for v in bbox)

    # Move up so bottom is at Z=0
    obj.location.z -= min_z

    # Apply transforms
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    print("✓ Grounded at Z=0")


def cleanup_materials(obj):
    """Consolidate materials and fix common issues"""
    if not obj.data.materials:
        return

    for mat in obj.data.materials:
        if mat is None:
            continue

        # Enable backface culling for performance (optional)
        mat.use_backface_culling = False  # Keep double-sided for foliage

        # Fix alpha settings for foliage
        if mat.node_tree:
            for node in mat.node_tree.nodes:
                if node.type == 'BSDF_PRINCIPLED':
                    # Ensure proper alpha handling
                    pass

    print(f"✓ Processed {len(obj.data.materials)} materials")


def export_model(filepath, obj):
    """Export as GLB"""
    # Select only our merged object
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj

    # Export
    bpy.ops.export_scene.gltf(
        filepath=filepath,
        export_format='GLB',
        use_selection=True,
        export_apply=True,
        export_texcoords=True,
        export_normals=True,
        export_colors=True,
        export_materials='EXPORT',
        export_image_format='AUTO',
    )

    # Get file size
    size_kb = os.path.getsize(filepath) / 1024
    print(f"✓ Exported: {filepath} ({size_kb:.1f} KB)")


def main():
    input_file, output_file, options = get_args()

    if not input_file:
        print(__doc__)
        return

    print("\n" + "="*50)
    print("Tree Model Optimizer")
    print("="*50)

    # Clear and import
    clear_scene()
    import_model(input_file)

    # Show initial stats
    initial_tris = count_triangles()
    print(f"\nInitial triangles: {initial_tris}")
    list_meshes()

    # Merge meshes
    merged = merge_all_meshes()
    if not merged:
        return

    # Apply decimation if requested
    apply_decimate(
        merged,
        ratio=options.get('decimate'),
        target_tris=options.get('max_tris')
    )

    # Center if requested
    if options.get('center'):
        center_model(merged)

    # Ground if requested
    if options.get('ground'):
        ground_model(merged)

    # Cleanup materials
    cleanup_materials(merged)

    # Export
    export_model(output_file, merged)

    # Final stats
    final_tris = count_triangles()
    reduction = ((initial_tris - final_tris) / initial_tris * 100) if initial_tris > 0 else 0

    print("\n" + "="*50)
    print("Summary")
    print("="*50)
    print(f"Input:  {initial_tris} triangles")
    print(f"Output: {final_tris} triangles")
    print(f"Reduction: {reduction:.1f}%")
    print(f"Output file: {output_file}")
    print("="*50 + "\n")


if __name__ == "__main__":
    main()
