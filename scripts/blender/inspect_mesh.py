#!/usr/bin/env python3
"""
Blender script to inspect a GLB file and report its contents.
Usage: blender --background --python inspect_mesh.py -- /path/to/mesh.glb
"""

import bpy
import sys
import json

def get_args():
    """Get arguments after '--'"""
    argv = sys.argv
    if "--" in argv:
        return argv[argv.index("--") + 1:]
    return []

def clear_scene():
    """Remove all objects from scene"""
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete()

def inspect_glb(filepath):
    """Import GLB and inspect its contents"""
    clear_scene()

    # Import GLB
    bpy.ops.import_scene.gltf(filepath=filepath)

    report = {
        "file": filepath,
        "meshes": [],
        "armatures": [],
        "shape_keys": {},
        "materials": [],
        "total_vertices": 0,
        "total_faces": 0,
    }

    for obj in bpy.data.objects:
        if obj.type == 'MESH':
            mesh_info = {
                "name": obj.name,
                "vertices": len(obj.data.vertices),
                "faces": len(obj.data.polygons),
                "materials": [mat.name for mat in obj.data.materials if mat],
            }
            report["meshes"].append(mesh_info)
            report["total_vertices"] += mesh_info["vertices"]
            report["total_faces"] += mesh_info["faces"]

            # Check for shape keys
            if obj.data.shape_keys:
                shape_key_names = [kb.name for kb in obj.data.shape_keys.key_blocks]
                report["shape_keys"][obj.name] = shape_key_names

        elif obj.type == 'ARMATURE':
            armature_info = {
                "name": obj.name,
                "bones": [bone.name for bone in obj.data.bones],
                "bone_count": len(obj.data.bones),
            }
            report["armatures"].append(armature_info)

    # Materials
    for mat in bpy.data.materials:
        report["materials"].append(mat.name)

    return report

def main():
    args = get_args()
    if not args:
        print("Usage: blender --background --python inspect_mesh.py -- /path/to/mesh.glb")
        sys.exit(1)

    filepath = args[0]
    report = inspect_glb(filepath)

    print("\n" + "="*60)
    print("MESH INSPECTION REPORT")
    print("="*60)
    print(f"\nFile: {report['file']}")
    print(f"Total Vertices: {report['total_vertices']}")
    print(f"Total Faces: {report['total_faces']}")

    print(f"\nMeshes ({len(report['meshes'])}):")
    for mesh in report["meshes"]:
        print(f"  - {mesh['name']}: {mesh['vertices']} verts, {mesh['faces']} faces")

    print(f"\nArmatures ({len(report['armatures'])}):")
    for arm in report["armatures"]:
        print(f"  - {arm['name']}: {arm['bone_count']} bones")
        # Print first 10 bones
        for bone in arm["bones"][:10]:
            print(f"      {bone}")
        if len(arm["bones"]) > 10:
            print(f"      ... and {len(arm['bones']) - 10} more")

    print(f"\nShape Keys:")
    if report["shape_keys"]:
        for mesh_name, keys in report["shape_keys"].items():
            print(f"  {mesh_name}:")
            for key in keys:
                print(f"    - {key}")
    else:
        print("  NO SHAPE KEYS FOUND - This mesh cannot be customized!")

    print(f"\nMaterials ({len(report['materials'])}):")
    for mat in report["materials"]:
        print(f"  - {mat}")

    print("\n" + "="*60)

    # Also output as JSON for programmatic use
    print("\nJSON Report:")
    print(json.dumps(report, indent=2))

if __name__ == "__main__":
    main()
