#!/usr/bin/env python3
"""Inspect MB-Lab blend file structure"""

import bpy

db_path = "/Users/nolangriffis/Documents/Producer Tour Official Website/Producer-Tour-Website/producer-tour-react/scripts/blender/addons/CharMorph-db-master"
char_path = f"{db_path}/characters/mb_male/char.blend"

# Load and inspect
with bpy.data.libraries.load(char_path, link=False) as (data_from, data_to):
    data_to.objects = data_from.objects

print("\n" + "=" * 60)
print("MB-LAB CHAR.BLEND CONTENTS")
print("=" * 60)

for obj in data_to.objects:
    if obj:
        print(f"\nObject: {obj.name}")
        print(f"  Type: {obj.type}")

        if obj.type == 'MESH':
            mesh = obj.data
            print(f"  Vertices: {len(mesh.vertices)}")
            print(f"  Faces: {len(mesh.polygons)}")

            if mesh.shape_keys:
                keys = mesh.shape_keys.key_blocks
                print(f"  Shape keys: {len(keys)}")
                for kb in list(keys)[:15]:
                    print(f"    - {kb.name}")
                if len(keys) > 15:
                    print(f"    ... and {len(keys) - 15} more")
            else:
                print(f"  Shape keys: None")

        elif obj.type == 'ARMATURE':
            armature = obj.data
            print(f"  Bones: {len(armature.bones)}")
            for bone in list(armature.bones)[:10]:
                print(f"    - {bone.name}")
            if len(armature.bones) > 10:
                print(f"    ... and {len(armature.bones) - 10} more")

print("\n" + "=" * 60)
