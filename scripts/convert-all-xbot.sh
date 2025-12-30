#!/bin/bash
#
# convert-all-xbot.sh
# Converts all X Bot FBX animations to GLB using FBX2glTF
#

set -e

# Find FBX2glTF binary
FBX2GLTF="$(npm root -g)/fbx2gltf/bin/Darwin/FBX2glTF"

if [ ! -f "$FBX2GLTF" ]; then
    echo "Error: FBX2glTF not found. Install with: npm install -g fbx2gltf"
    exit 1
fi

# Paths
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOCOMOTION_DIR="$PROJECT_ROOT/apps/frontend/public/animations/new animations/Male Locomotion Pack"
RIFLE_DIR="$PROJECT_ROOT/apps/frontend/public/animations/new animations/Lite Rifle Pack"
OUTPUT_DIR="$PROJECT_ROOT/apps/frontend/public/assets/animations/xbot"

# Create output directory
mkdir -p "$OUTPUT_DIR"

echo "════════════════════════════════════════════════════════════"
echo "CONVERTING X BOT ANIMATIONS"
echo "════════════════════════════════════════════════════════════"
echo "Output: $OUTPUT_DIR"
echo "════════════════════════════════════════════════════════════"

convert_file() {
    local input="$1"
    local output="$2"

    if [ ! -f "$input" ]; then
        echo "⚠️  Skip: $(basename "$input") (not found)"
        return
    fi

    echo "Converting: $(basename "$input") -> $(basename "$output")"
    "$FBX2GLTF" --input "$input" --output "$output" --binary 2>&1 | grep -v "Warning:" || true
}

# === CHARACTER MODEL ===
echo ""
echo "=== CHARACTER MODEL ==="
convert_file "$LOCOMOTION_DIR/character.fbx" "$OUTPUT_DIR/xbot.glb"

# === BASIC LOCOMOTION ===
echo ""
echo "=== BASIC LOCOMOTION ==="
convert_file "$LOCOMOTION_DIR/idle.fbx" "$OUTPUT_DIR/idle.glb"
convert_file "$LOCOMOTION_DIR/walking.fbx" "$OUTPUT_DIR/walk.glb"
convert_file "$LOCOMOTION_DIR/standard run.fbx" "$OUTPUT_DIR/run.glb"
convert_file "$LOCOMOTION_DIR/jump.fbx" "$OUTPUT_DIR/jump.glb"
convert_file "$LOCOMOTION_DIR/left strafe.fbx" "$OUTPUT_DIR/strafe_left_run.glb"
convert_file "$LOCOMOTION_DIR/right strafe.fbx" "$OUTPUT_DIR/strafe_right_run.glb"
convert_file "$LOCOMOTION_DIR/left strafe walking.fbx" "$OUTPUT_DIR/strafe_left_walk.glb"
convert_file "$LOCOMOTION_DIR/right strafe walking.fbx" "$OUTPUT_DIR/strafe_right_walk.glb"
convert_file "$LOCOMOTION_DIR/left turn 90.fbx" "$OUTPUT_DIR/turn_left.glb"
convert_file "$LOCOMOTION_DIR/right turn 90.fbx" "$OUTPUT_DIR/turn_right.glb"

# === RIFLE ANIMATIONS ===
echo ""
echo "=== RIFLE ANIMATIONS ==="
convert_file "$RIFLE_DIR/idle.fbx" "$OUTPUT_DIR/rifle_idle.glb"
convert_file "$RIFLE_DIR/idle aiming.fbx" "$OUTPUT_DIR/rifle_aim_idle.glb"
convert_file "$RIFLE_DIR/idle crouching.fbx" "$OUTPUT_DIR/rifle_crouch_idle.glb"
convert_file "$RIFLE_DIR/run forward.fbx" "$OUTPUT_DIR/rifle_run_forward.glb"
convert_file "$RIFLE_DIR/run forward left.fbx" "$OUTPUT_DIR/rifle_run_forward_left.glb"
convert_file "$RIFLE_DIR/run forward right.fbx" "$OUTPUT_DIR/rifle_run_forward_right.glb"
convert_file "$RIFLE_DIR/run backward.fbx" "$OUTPUT_DIR/rifle_run_backward.glb"
convert_file "$RIFLE_DIR/run backward left.fbx" "$OUTPUT_DIR/rifle_run_backward_left.glb"
convert_file "$RIFLE_DIR/run backward right.fbx" "$OUTPUT_DIR/rifle_run_backward_right.glb"
convert_file "$RIFLE_DIR/run left.fbx" "$OUTPUT_DIR/rifle_strafe_left.glb"
convert_file "$RIFLE_DIR/run right.fbx" "$OUTPUT_DIR/rifle_strafe_right.glb"
convert_file "$RIFLE_DIR/turn 90 left.fbx" "$OUTPUT_DIR/rifle_turn_left.glb"
convert_file "$RIFLE_DIR/turn 90 right.fbx" "$OUTPUT_DIR/rifle_turn_right.glb"
convert_file "$RIFLE_DIR/death from front headshot.fbx" "$OUTPUT_DIR/death.glb"

echo ""
echo "════════════════════════════════════════════════════════════"
echo "COMPLETE"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "Output files:"
ls -la "$OUTPUT_DIR"/*.glb 2>/dev/null | awk '{printf "  %-35s %s KB\n", $NF, int($5/1024)}'
