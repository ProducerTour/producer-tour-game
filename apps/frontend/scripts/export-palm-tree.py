"""
Blender script to export Palm Tree as GLB with proper alpha/opacity
Run with: blender --background "<blend_file>" --python <this_script>
"""

import bpy
import os

# Paths
script_dir = os.path.dirname(os.path.abspath(__file__))
project_dir = os.path.dirname(script_dir)
texture_dir = os.path.join(project_dir, "public/models/Foliage/Trees/Palm Tree Model_and_textures/Textures JPG")
output_path = os.path.join(project_dir, "public/models/Foliage/Trees/palm_tree.glb")

print(f"Texture dir: {texture_dir}")
print(f"Output path: {output_path}")

# Texture file paths
textures = {
    'BaseColor': os.path.join(texture_dir, 'CocosNucifera_BaseColor.jpg'),
    'Normal': os.path.join(texture_dir, 'CocosNucifera_Normal_OpenGL.jpg'),
    'Roughness': os.path.join(texture_dir, 'CocosNucifera_Roughness.jpg'),
    'Opacity': os.path.join(texture_dir, 'CocosNucifera_Opacity.jpg'),
}

# Verify textures exist
print("\n=== CHECKING TEXTURES ===")
for name, path in textures.items():
    if os.path.exists(path):
        print(f"✓ Found {name}")
    else:
        print(f"✗ Missing {name}: {path}")

# Delete objects we don't want FIRST (before modifying materials)
print("\n=== CLEANING UP SCENE ===")
objects_to_delete = []
for obj in bpy.data.objects:
    if obj.type == 'MESH':
        if 'LOD0' in obj.name:
            print(f"  Keeping: {obj.name}")
        elif 'Ground' in obj.name or 'UCX_' in obj.name or 'LOD' in obj.name:
            objects_to_delete.append(obj)
            print(f"  Removing: {obj.name}")
    elif obj.type == 'ARMATURE':
        objects_to_delete.append(obj)
        print(f"  Removing armature: {obj.name}")
    elif obj.type in ['CAMERA', 'CURVE']:
        objects_to_delete.append(obj)
        print(f"  Removing {obj.type}: {obj.name}")

bpy.ops.object.select_all(action='DESELECT')
for obj in objects_to_delete:
    obj.select_set(True)
bpy.ops.object.delete()

# Now rebuild the material for proper glTF export with alpha
print("\n=== REBUILDING MATERIAL FOR GLTF ===")

for mat in bpy.data.materials:
    if mat.name == 'CocosNucifera_Material':
        print(f"  Rebuilding: {mat.name}")

        # Clear all nodes
        mat.node_tree.nodes.clear()
        nodes = mat.node_tree.nodes
        links = mat.node_tree.links

        # Create output node
        output = nodes.new('ShaderNodeOutputMaterial')
        output.location = (400, 0)

        # Create Principled BSDF
        principled = nodes.new('ShaderNodeBsdfPrincipled')
        principled.location = (0, 0)
        links.new(principled.outputs['BSDF'], output.inputs['Surface'])

        # Load and connect BaseColor texture
        if os.path.exists(textures['BaseColor']):
            base_tex = nodes.new('ShaderNodeTexImage')
            base_tex.location = (-400, 200)
            base_tex.image = bpy.data.images.load(textures['BaseColor'])
            base_tex.image.colorspace_settings.name = 'sRGB'
            links.new(base_tex.outputs['Color'], principled.inputs['Base Color'])
            print(f"    ✓ Connected BaseColor")

        # Load and connect Opacity texture to Alpha input
        if os.path.exists(textures['Opacity']):
            opacity_tex = nodes.new('ShaderNodeTexImage')
            opacity_tex.location = (-400, -100)
            opacity_tex.image = bpy.data.images.load(textures['Opacity'])
            opacity_tex.image.colorspace_settings.name = 'Non-Color'
            # Connect to Alpha input of Principled BSDF
            links.new(opacity_tex.outputs['Color'], principled.inputs['Alpha'])
            print(f"    ✓ Connected Opacity to Alpha")

        # Load and connect Normal map
        if os.path.exists(textures['Normal']):
            normal_tex = nodes.new('ShaderNodeTexImage')
            normal_tex.location = (-400, -400)
            normal_tex.image = bpy.data.images.load(textures['Normal'])
            normal_tex.image.colorspace_settings.name = 'Non-Color'

            normal_map = nodes.new('ShaderNodeNormalMap')
            normal_map.location = (-100, -400)
            links.new(normal_tex.outputs['Color'], normal_map.inputs['Color'])
            links.new(normal_map.outputs['Normal'], principled.inputs['Normal'])
            print(f"    ✓ Connected Normal")

        # Load and connect Roughness
        if os.path.exists(textures['Roughness']):
            rough_tex = nodes.new('ShaderNodeTexImage')
            rough_tex.location = (-400, -700)
            rough_tex.image = bpy.data.images.load(textures['Roughness'])
            rough_tex.image.colorspace_settings.name = 'Non-Color'
            links.new(rough_tex.outputs['Color'], principled.inputs['Roughness'])
            print(f"    ✓ Connected Roughness")

        # Configure material for alpha clip (cutout) - this is key for glTF export
        mat.blend_method = 'CLIP'
        mat.alpha_threshold = 0.5
        print(f"    ✓ Set blend_method to CLIP with threshold 0.5")

# Apply modifiers on remaining meshes
print("\n=== APPLYING MODIFIERS ===")
for obj in bpy.data.objects:
    if obj.type == 'MESH':
        bpy.context.view_layer.objects.active = obj
        for modifier in obj.modifiers[:]:
            try:
                bpy.ops.object.modifier_apply(modifier=modifier.name)
                print(f"  Applied {modifier.name} on {obj.name}")
            except Exception as e:
                print(f"  Could not apply {modifier.name}: {e}")

# Select mesh objects for export
bpy.ops.object.select_all(action='DESELECT')
mesh_count = 0
for obj in bpy.data.objects:
    if obj.type == 'MESH':
        obj.select_set(True)
        mesh_count += 1
        print(f"  Selected for export: {obj.name}")

print(f"\n=== EXPORTING {mesh_count} MESHES TO GLB ===")
bpy.ops.export_scene.gltf(
    filepath=output_path,
    export_format='GLB',
    use_selection=True,
    export_texcoords=True,
    export_normals=True,
    export_materials='EXPORT',
    export_cameras=False,
    export_lights=False,
    export_yup=True,
    export_apply=True,
    export_animations=False,
    export_skins=False,
    export_image_format='AUTO',
)

print(f"\n✓ Export complete: {output_path}")
if os.path.exists(output_path):
    size_mb = os.path.getsize(output_path) / 1024 / 1024
    print(f"  File size: {size_mb:.2f} MB")
