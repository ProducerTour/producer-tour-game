#!/bin/bash
# Download game assets from Cloudflare R2 CDN for local development
# Run this once after cloning the repo to get all assets locally
#
# Usage:
#   ./scripts/download-assets-from-r2.sh

set -e

# R2 Public CDN URL
R2_URL="https://pub-5e192bc6cd8640f1b75ee043036d06d2.r2.dev"

# Get script directory and set target
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PUBLIC_DIR="$SCRIPT_DIR/../apps/frontend/public"

echo "=== Downloading Game Assets from R2 CDN ==="
echo "Source: $R2_URL"
echo "Target: $PUBLIC_DIR"
echo ""

# Create directories
mkdir -p "$PUBLIC_DIR/animations"
mkdir -p "$PUBLIC_DIR/models/Bandit"
mkdir -p "$PUBLIC_DIR/models/Campfire"
mkdir -p "$PUBLIC_DIR/models/Characters/Hair"
mkdir -p "$PUBLIC_DIR/models/Cliffside/alaskan-cliff-rock-9-free/textures"
mkdir -p "$PUBLIC_DIR/models/Cliffside/export"
mkdir -p "$PUBLIC_DIR/models/Cliffside/maps"
mkdir -p "$PUBLIC_DIR/models/Foliage/Trees/lowpoly"
mkdir -p "$PUBLIC_DIR/models/Items/Flashlight"
mkdir -p "$PUBLIC_DIR/models/Monkey/Textures_B3"
mkdir -p "$PUBLIC_DIR/models/Rocks"
mkdir -p "$PUBLIC_DIR/models/Vehicles/Boats/motoryacht"
mkdir -p "$PUBLIC_DIR/models/effects"
mkdir -p "$PUBLIC_DIR/models/weapons/ak47fbx_gltf/textures"
mkdir -p "$PUBLIC_DIR/models/weapons/pistolorange_gltf/textures"

# Animation files
ANIMATIONS=(
  "crouch_fire_rifle_tap.glb"
  "crouch_idle.glb"
  "crouch_pistol_idle.glb"
  "crouch_pistol_walk.glb"
  "crouch_rapid_fire_rifle.glb"
  "crouch_rifle_idle.glb"
  "crouch_rifle_strafe_left.glb"
  "crouch_rifle_strafe_right.glb"
  "crouch_rifle_walk.glb"
  "crouch_strafe_left.glb"
  "crouch_strafe_right.glb"
  "crouch_to_sprint.glb"
  "crouch_to_stand.glb"
  "crouch_walk.glb"
  "dance1.glb"
  "dance2.glb"
  "dance3.glb"
  "death.glb"
  "firing_rifle_crouch.glb"
  "firing_rifle_still.glb"
  "firing_rifle_walk.glb"
  "idle.glb"
  "idle_var1.glb"
  "idle_var2.glb"
  "jump.glb"
  "jump_jog.glb"
  "jump_run.glb"
  "pistol_idle.glb"
  "pistol_run.glb"
  "pistol_walk.glb"
  "rifle_aim_idle.glb"
  "rifle_crouch_backward_walk.glb"
  "rifle_idle.glb"
  "rifle_jump.glb"
  "rifle_jump_down.glb"
  "rifle_jump_loop.glb"
  "rifle_jump_up.glb"
  "rifle_reload_crouch.glb"
  "rifle_reload_run.glb"
  "rifle_reload_stand.glb"
  "rifle_reload_walk.glb"
  "rifle_run.glb"
  "rifle_run_old.glb"
  "rifle_stand_to_kneel.glb"
  "rifle_walk.glb"
  "running.glb"
  "stand_to_crouch.glb"
  "walking.glb"
)

# Model files (path relative to public/)
MODELS=(
  "models/Bandit/balaclava_combined.png"
  "models/Bandit/bandit.glb"
  "models/Bandit/cover_combined.png"
  "models/Bandit/eyes_emit.png"
  "models/Bandit/gloves_combined.png"
  "models/Bandit/jacket_combined.png"
  "models/Bandit/jacket_normal.png"
  "models/Bandit/jacket_roughness.png"
  "models/Bandit/mask_combined.png"
  "models/Bandit/mask_roughness.png"
  "models/Bandit/pant_combined.png"
  "models/Bandit/pant_normal.png"
  "models/Bandit/shirt_combined.png"
  "models/Bandit/shirt_normal.png"
  "models/Bandit/shoes_combined.png"
  "models/Bandit/shoes_roughness.png"
  "models/Bandit/skin_combined.png"
  "models/Bandit/skin_roughness.png"
  "models/Campfire/campfire.glb"
  "models/Characters/Hair/afro_medium.glb"
  "models/Characters/Hair/braids.glb"
  "models/Characters/Hair/buzzcut.glb"
  "models/Characters/Hair/curly_short.glb"
  "models/Characters/Hair/long_straight.glb"
  "models/Characters/Hair/long_wavy.glb"
  "models/Characters/Hair/medium_straight.glb"
  "models/Characters/Hair/medium_wavy.glb"
  "models/Characters/Hair/mohawk.glb"
  "models/Characters/Hair/ponytail.glb"
  "models/Characters/Hair/short_fade.glb"
  "models/Characters/Hair/short_textured.glb"
  "models/Cliffside/alaskan-cliff-rock-9-free/alaskan_cliff_rock.glb"
  "models/Cliffside/alaskan-cliff-rock-9-free/textures/CliffRock_0009_2k_Albedo.png"
  "models/Cliffside/alaskan-cliff-rock-9-free/textures/CliffRock_0009_2k_Normal.png"
  "models/Cliffside/alaskan-cliff-rock-9-free/textures/CliffRock_0009_2k_Roughness.png"
  "models/Cliffside/export/alpine_rock.glb"
  "models/Cliffside/maps/default_Ambient_occlusion.jpg"
  "models/Cliffside/maps/default_Base_Color.jpg"
  "models/Cliffside/maps/default_Metallic.jpg"
  "models/Cliffside/maps/default_Mixed_AO.jpg"
  "models/Cliffside/maps/default_Normal.jpg"
  "models/Cliffside/maps/default_Normal_OpenGL.jpg"
  "models/Cliffside/maps/default_Roughness.jpg"
  "models/Foliage/Trees/lowpoly/bush-01.glb"
  "models/Foliage/Trees/lowpoly/bush-02.glb"
  "models/Foliage/Trees/lowpoly/bush-03.glb"
  "models/Foliage/Trees/lowpoly/bush-04.glb"
  "models/Foliage/Trees/lowpoly/bush-05.glb"
  "models/Foliage/Trees/lowpoly/tree-01-1.glb"
  "models/Foliage/Trees/lowpoly/tree-01-2.glb"
  "models/Foliage/Trees/lowpoly/tree-01-3.glb"
  "models/Foliage/Trees/lowpoly/tree-01-4.glb"
  "models/Foliage/Trees/lowpoly/tree-02-1.glb"
  "models/Foliage/Trees/lowpoly/tree-02-2.glb"
  "models/Foliage/Trees/lowpoly/tree-02-3.glb"
  "models/Foliage/Trees/lowpoly/tree-02-4.glb"
  "models/Foliage/Trees/lowpoly/tree-03-1.glb"
  "models/Foliage/Trees/lowpoly/tree-03-2.glb"
  "models/Foliage/Trees/lowpoly/tree-03-3.glb"
  "models/Foliage/Trees/lowpoly/tree-03-4.glb"
  "models/Foliage/Trees/oak_trees.glb"
  "models/Foliage/Trees/palm_tree.glb"
  "models/Items/Flashlight/flashlight.glb"
  "models/Monkey/Monkey.glb"
  "models/Monkey/Textures_B3/Monkey_B3_diffuse_1k.jpg"
  "models/Rocks/rock_1.glb"
  "models/Vehicles/Boats/motoryacht/motoryacht_optimized.glb"
  "models/effects/machine_gun_muzzle_flash_test_effect.glb"
  "models/weapons/ak47fbx_gltf/scene.bin"
  "models/weapons/ak47fbx_gltf/scene.gltf"
  "models/weapons/ak47fbx_gltf/textures/AK_Normal.png"
  "models/weapons/pistolorange_gltf/scene.bin"
  "models/weapons/pistolorange_gltf/scene.gltf"
  "models/weapons/pistolorange_gltf/textures/material_baseColor.png"
  "models/weapons/pistolorange_gltf/textures/material_emissive.png"
  "models/weapons/pistolorange_gltf/textures/material_normal.png"
)

# Download function with progress
download_file() {
  local url="$1"
  local dest="$2"

  if [ -f "$dest" ]; then
    echo "  [SKIP] $(basename "$dest") (exists)"
    return 0
  fi

  if curl -sf "$url" -o "$dest" 2>/dev/null; then
    echo "  [OK] $(basename "$dest")"
    return 0
  else
    echo "  [FAIL] $(basename "$dest")"
    return 1
  fi
}

# Download animations
echo "Downloading animations (${#ANIMATIONS[@]} files)..."
ANIM_SUCCESS=0
ANIM_FAIL=0
for anim in "${ANIMATIONS[@]}"; do
  if download_file "$R2_URL/animations/$anim" "$PUBLIC_DIR/animations/$anim"; then
    ((ANIM_SUCCESS++))
  else
    ((ANIM_FAIL++))
  fi
done
echo "  Animations: $ANIM_SUCCESS succeeded, $ANIM_FAIL failed"
echo ""

# Download models
echo "Downloading models (${#MODELS[@]} files)..."
MODEL_SUCCESS=0
MODEL_FAIL=0
for model in "${MODELS[@]}"; do
  if download_file "$R2_URL/$model" "$PUBLIC_DIR/$model"; then
    ((MODEL_SUCCESS++))
  else
    ((MODEL_FAIL++))
  fi
done
echo "  Models: $MODEL_SUCCESS succeeded, $MODEL_FAIL failed"
echo ""

echo "=== Download Complete ==="
echo "Total: $((ANIM_SUCCESS + MODEL_SUCCESS)) files downloaded"
if [ $((ANIM_FAIL + MODEL_FAIL)) -gt 0 ]; then
  echo "Warning: $((ANIM_FAIL + MODEL_FAIL)) files failed (may not exist on R2 yet)"
fi
echo ""
echo "You can now run the dev server with local assets:"
echo "  cd apps/frontend && npm run dev"
