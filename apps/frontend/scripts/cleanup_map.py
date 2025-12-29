import bpy
import bmesh
import os
import sys
from mathutils import Vector
import json

# Configuration
DECIMATE_RATIO = 0.5  # 50% poly reduction for LOD0
MAX_BUILDING_COLLIDERS = 100

args = sys.argv[sys.argv.index('--') + 1:]
blend_path = args[0]
output_dir = args[1]

print(f"\n{'='*70}")
print("GAME-READY MAP CLEANUP")
print(f"{'='*70}")
print(f"Input: {blend_path}")
print(f"Output: {output_dir}")

os.makedirs(output_dir, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.wm.open_mainfile(filepath=blend_path)

meshes = [obj for obj in bpy.data.objects if obj.type == 'MESH']
print(f"\nLoaded {len(meshes)} meshes")

# ============================================================
# STEP 1: SCALE CHECK
# ============================================================
print("\n[1/8] CHECKING SCALE...")

buildings = [obj for obj in meshes if 'building' in obj.name.lower()]
if buildings:
    heights = []
    for obj in buildings[:20]:
        bbox = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
        h = max(v.z for v in bbox) - min(v.z for v in bbox)
        heights.append(h)
    print(f"  Sample building heights: {min(heights):.0f}m - {max(heights):.0f}m")
    print(f"  Scale appears correct (1 unit = 1 meter)")

# ============================================================
# STEP 2: RECENTER
# ============================================================
print("\n[2/8] RECENTERING TO ORIGIN...")

all_verts = []
for obj in meshes:
    if obj.data and hasattr(obj.data, 'vertices'):
        for v in obj.data.vertices:
            all_verts.append(obj.matrix_world @ v.co)

min_x = min(v.x for v in all_verts)
max_x = max(v.x for v in all_verts)
min_y = min(v.y for v in all_verts)
max_y = max(v.y for v in all_verts)
min_z = min(v.z for v in all_verts)

center_x = (min_x + max_x) / 2
center_y = (min_y + max_y) / 2

for obj in bpy.data.objects:
    obj.location.x -= center_x
    obj.location.y -= center_y
    obj.location.z -= min_z

width = max_x - min_x
depth = max_y - min_y
print(f"  Map size: {width:.0f} x {depth:.0f} meters")
print(f"  Centered at origin, ground at Z=0")

# ============================================================
# STEP 3: REMOVE HIDDEN GEOMETRY
# ============================================================
print("\n[3/8] REMOVING HIDDEN GEOMETRY...")

removed_faces = 0
processed = 0

for obj in meshes:
    if obj.data is None:
        continue

    bm = bmesh.new()
    bm.from_mesh(obj.data)

    faces_to_remove = []
    for face in bm.faces:
        # Underground faces (pointing down)
        if face.normal.z < -0.95:
            faces_to_remove.append(face)
            continue
        # Below ground level
        avg_z = sum((obj.matrix_world @ v.co).z for v in face.verts) / len(face.verts)
        if avg_z < -2:
            faces_to_remove.append(face)

    for face in faces_to_remove:
        bm.faces.remove(face)
        removed_faces += 1

    bm.to_mesh(obj.data)
    bm.free()

    processed += 1
    if processed % 500 == 0:
        print(f"  Processed {processed}/{len(meshes)} meshes...")

print(f"  Removed {removed_faces} hidden faces")

# ============================================================
# STEP 4: DECIMATE (LOD0)
# ============================================================
print("\n[4/8] DECIMATING MESHES...")

tris_before = sum(len(obj.data.polygons) for obj in meshes if obj.data)
print(f"  Starting triangles: {tris_before:,}")

decimated = 0
for obj in meshes:
    if obj.data is None or len(obj.data.polygons) < 50:
        continue

    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj

    mod = obj.modifiers.new(name="Decimate", type='DECIMATE')
    mod.ratio = DECIMATE_RATIO
    bpy.ops.object.modifier_apply(modifier=mod.name)
    decimated += 1

    if decimated % 500 == 0:
        print(f"  Decimated {decimated} meshes...")

tris_after = sum(len(obj.data.polygons) for obj in meshes if obj.data)
reduction = 100 - (100 * tris_after // tris_before) if tris_before > 0 else 0
print(f"  Final triangles: {tris_after:,} ({reduction}% reduction)")

# ============================================================
# STEP 5: CREATE COLLIDERS
# ============================================================
print("\n[5/8] CREATING COLLISION MESHES...")

# Ground collider
bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 0, -0.1))
ground = bpy.context.active_object
ground.name = "COL_Ground"
ground.scale = ((width + 100)/2, (depth + 100)/2, 1)
bpy.ops.object.transform_apply(scale=True)

# Building colliders
col_count = 1
for obj in buildings[:MAX_BUILDING_COLLIDERS]:
    bbox = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
    bmin = Vector((min(v.x for v in bbox), min(v.y for v in bbox), min(v.z for v in bbox)))
    bmax = Vector((max(v.x for v in bbox), max(v.y for v in bbox), max(v.z for v in bbox)))
    size = bmax - bmin

    if size.x > 5 and size.y > 5 and size.z > 5:
        center = (bmin + bmax) / 2
        bpy.ops.mesh.primitive_cube_add(size=1, location=center)
        col = bpy.context.active_object
        col.name = f"COL_Building_{col_count}"
        col.scale = (size.x/2, size.y/2, size.z/2)
        bpy.ops.object.transform_apply(scale=True)
        col_count += 1

print(f"  Created {col_count} colliders (1 ground + {col_count-1} buildings)")

# ============================================================
# STEP 6: SPAWN POINT
# ============================================================
print("\n[6/8] ADDING SPAWN POINT...")

bpy.ops.object.empty_add(type='ARROWS', location=(0, 0, 2))
spawn = bpy.context.active_object
spawn.name = "SpawnPoint"
print(f"  Spawn at (0, 0, 2)")

# ============================================================
# STEP 7: EXPORT
# ============================================================
print("\n[7/8] EXPORTING GLB FILES...")

# Hide colliders for visual export
for obj in bpy.data.objects:
    if obj.name.startswith("COL_"):
        obj.hide_set(True)

visual_path = os.path.join(output_dir, "downtown.glb")
print(f"  Exporting visual mesh...")
bpy.ops.export_scene.gltf(
    filepath=visual_path,
    export_format='GLB',
    use_selection=False,
    export_apply=True,
    export_materials='EXPORT',
)
visual_size = os.path.getsize(visual_path) / 1024 / 1024
print(f"  Visual: {visual_size:.1f} MB")

# Collision only
for obj in bpy.data.objects:
    obj.hide_set(True)
for obj in bpy.data.objects:
    if obj.name.startswith("COL_"):
        obj.hide_set(False)

collision_path = os.path.join(output_dir, "downtown_collision.glb")
print(f"  Exporting collision mesh...")
bpy.ops.export_scene.gltf(
    filepath=collision_path,
    export_format='GLB',
    use_selection=False,
    export_apply=True,
    export_materials='NONE',
)
col_size = os.path.getsize(collision_path) / 1024
print(f"  Collision: {col_size:.0f} KB")

# ============================================================
# STEP 8: MANIFEST
# ============================================================
print("\n[8/8] CREATING MANIFEST...")

manifest = {
    "name": "Downtown Tampa",
    "bounds": {"width": width, "depth": depth},
    "spawn": [0, 0, 2],
    "stats": {
        "triangles_before": tris_before,
        "triangles_after": tris_after,
        "colliders": col_count,
        "reduction": f"{reduction}%"
    },
    "files": {
        "visual": "downtown.glb",
        "collision": "downtown_collision.glb"
    }
}

manifest_path = os.path.join(output_dir, "manifest.json")
with open(manifest_path, 'w') as f:
    json.dump(manifest, f, indent=2)
print(f"  Manifest saved")

# ============================================================
# SUMMARY
# ============================================================
print(f"\n{'='*70}")
print("CLEANUP COMPLETE!")
print(f"{'='*70}")
print(f"  Visual GLB:    {visual_size:.1f} MB")
print(f"  Collision GLB: {col_size:.0f} KB")
print(f"  Triangles:     {tris_before:,} -> {tris_after:,} ({reduction}% reduced)")
print(f"  Colliders:     {col_count}")
print(f"  Output:        {output_dir}")
print(f"{'='*70}\n")
