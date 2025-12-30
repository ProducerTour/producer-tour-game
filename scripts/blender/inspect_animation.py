import bpy
import os

# Hardcode path for now
filepath = "/Users/nolangriffis/Documents/producer-tour-play/apps/frontend/public/assets/animations/locomotion/idle.glb"
print(f"\nInspecting: {filepath}")
print(f"Exists: {os.path.exists(filepath)}")

bpy.ops.import_scene.gltf(filepath=filepath)

print(f"\nObjects in scene: {len(bpy.context.scene.objects)}")
for obj in bpy.context.scene.objects:
    print(f"  {obj.name}: {obj.type}")
    if obj.type == 'ARMATURE':
        print(f"    animation_data: {obj.animation_data}")
        if obj.animation_data:
            print(f"    action: {obj.animation_data.action}")
            if obj.animation_data.action:
                action = obj.animation_data.action
                print(f"    layers: {len(action.layers)}")
                if action.layers:
                    layer = action.layers[0]
                    print(f"    strips: {len(layer.strips)}")
                    if layer.strips:
                        strip = layer.strips[0]
                        print(f"    channelbags: {len(strip.channelbags)}")
                        if strip.channelbags:
                            channelbag = strip.channelbags[0]
                            fcurves = list(channelbag.fcurves)
                            print(f'\n    Total fcurves: {len(fcurves)}')

                            # Count by type
                            rotation_count = sum(1 for fc in fcurves if 'rotation' in fc.data_path)
                            location_count = sum(1 for fc in fcurves if 'location' in fc.data_path)
                            scale_count = sum(1 for fc in fcurves if 'scale' in fc.data_path)

                            print(f'    Rotation: {rotation_count}')
                            print(f'    Location: {location_count}')
                            print(f'    Scale: {scale_count}')
