"""
Inspect CharMorph file to see what shape keys / morphs exist.
Run with: blender char.blend --background --python inspect_charmorph.py
"""

import bpy

print("\n" + "="*60)
print("CHARMORPH MESH INSPECTION")
print("="*60)

for obj in bpy.data.objects:
    print(f"\nObject: {obj.name} (Type: {obj.type})")

    if obj.type == 'MESH':
        mesh = obj.data
        print(f"  Vertices: {len(mesh.vertices)}")
        print(f"  Faces: {len(mesh.polygons)}")

        # Check for shape keys
        if obj.data.shape_keys:
            print(f"\n  SHAPE KEYS ({len(obj.data.shape_keys.key_blocks)}):")
            for i, key in enumerate(obj.data.shape_keys.key_blocks):
                print(f"    {i}: {key.name} (value: {key.value})")
        else:
            print("  No shape keys found")

        # Check for vertex groups
        if obj.vertex_groups:
            print(f"\n  VERTEX GROUPS ({len(obj.vertex_groups)}):")
            for vg in obj.vertex_groups[:20]:  # First 20
                print(f"    - {vg.name}")
            if len(obj.vertex_groups) > 20:
                print(f"    ... and {len(obj.vertex_groups) - 20} more")

    if obj.type == 'ARMATURE':
        print(f"  Bones: {len(obj.data.bones)}")
        print("  Bone names:")
        for bone in list(obj.data.bones)[:15]:
            print(f"    - {bone.name}")
        if len(obj.data.bones) > 15:
            print(f"    ... and {len(obj.data.bones) - 15} more")

print("\n" + "="*60)
