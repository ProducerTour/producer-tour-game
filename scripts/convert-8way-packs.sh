#!/bin/bash
# Convert Rifle 8-Way and Pistol Locomotion Pack FBX files to GLB
# Using FBX2glTF binary

set -e

# FBX2glTF binary path
FBX2GLTF="/Users/nolangriffis/.nvm/versions/node/v22.21.1/lib/node_modules/fbx2gltf/bin/Darwin/FBX2glTF"

if [ ! -f "$FBX2GLTF" ]; then
    echo "Error: FBX2glTF not found at $FBX2GLTF"
    exit 1
fi

# Paths
RIFLE_8WAY_SRC="/Users/nolangriffis/Documents/producer-tour-play/apps/frontend/public/animations/new animations/Rifle 8-Way Locomotion Pack 3"
PISTOL_SRC="/Users/nolangriffis/Documents/producer-tour-play/apps/frontend/public/animations/new animations/Pistol_Handgun Locomotion Pack 3"
OUTPUT_DIR="/Users/nolangriffis/Documents/producer-tour-play/apps/frontend/public/assets/animations/xbot"

# Create output dir
mkdir -p "$OUTPUT_DIR"

convert_file() {
    local input="$1"
    local output="$2"

    if [ ! -f "$input" ]; then
        echo "  ⚠️  Skip: $(basename "$input") (not found)"
        return 1
    fi

    echo "  ✓ $(basename "$output")"
    "$FBX2GLTF" --input "$input" --output "$output" --binary 2>&1 | grep -v "Warning:" | grep -v "^$" || true
    return 0
}

echo "════════════════════════════════════════════════════════════"
echo "🔫 Converting Rifle 8-Way Locomotion Pack"
echo "════════════════════════════════════════════════════════════"

RIFLE_SUCCESS=0

# Idle states
convert_file "$RIFLE_8WAY_SRC/idle.fbx" "$OUTPUT_DIR/rifle8_idle" && ((RIFLE_SUCCESS++))
convert_file "$RIFLE_8WAY_SRC/idle aiming.fbx" "$OUTPUT_DIR/rifle8_aim_idle" && ((RIFLE_SUCCESS++))
convert_file "$RIFLE_8WAY_SRC/idle crouching.fbx" "$OUTPUT_DIR/rifle8_crouch_idle" && ((RIFLE_SUCCESS++))
convert_file "$RIFLE_8WAY_SRC/idle crouching aiming.fbx" "$OUTPUT_DIR/rifle8_crouch_aim_idle" && ((RIFLE_SUCCESS++))

# Walk - 8 directions
convert_file "$RIFLE_8WAY_SRC/walk forward.fbx" "$OUTPUT_DIR/rifle8_walk_forward" && ((RIFLE_SUCCESS++))
convert_file "$RIFLE_8WAY_SRC/walk forward left.fbx" "$OUTPUT_DIR/rifle8_walk_forward_left" && ((RIFLE_SUCCESS++))
convert_file "$RIFLE_8WAY_SRC/walk forward right.fbx" "$OUTPUT_DIR/rifle8_walk_forward_right" && ((RIFLE_SUCCESS++))
convert_file "$RIFLE_8WAY_SRC/walk backward.fbx" "$OUTPUT_DIR/rifle8_walk_backward" && ((RIFLE_SUCCESS++))
convert_file "$RIFLE_8WAY_SRC/walk backward left.fbx" "$OUTPUT_DIR/rifle8_walk_backward_left" && ((RIFLE_SUCCESS++))
convert_file "$RIFLE_8WAY_SRC/walk backward right.fbx" "$OUTPUT_DIR/rifle8_walk_backward_right" && ((RIFLE_SUCCESS++))
convert_file "$RIFLE_8WAY_SRC/walk left.fbx" "$OUTPUT_DIR/rifle8_walk_left" && ((RIFLE_SUCCESS++))
convert_file "$RIFLE_8WAY_SRC/walk right.fbx" "$OUTPUT_DIR/rifle8_walk_right" && ((RIFLE_SUCCESS++))

# Run - 8 directions
convert_file "$RIFLE_8WAY_SRC/run forward.fbx" "$OUTPUT_DIR/rifle8_run_forward" && ((RIFLE_SUCCESS++))
convert_file "$RIFLE_8WAY_SRC/run forward left.fbx" "$OUTPUT_DIR/rifle8_run_forward_left" && ((RIFLE_SUCCESS++))
convert_file "$RIFLE_8WAY_SRC/run forward right.fbx" "$OUTPUT_DIR/rifle8_run_forward_right" && ((RIFLE_SUCCESS++))
convert_file "$RIFLE_8WAY_SRC/run backward.fbx" "$OUTPUT_DIR/rifle8_run_backward" && ((RIFLE_SUCCESS++))
convert_file "$RIFLE_8WAY_SRC/run backward left.fbx" "$OUTPUT_DIR/rifle8_run_backward_left" && ((RIFLE_SUCCESS++))
convert_file "$RIFLE_8WAY_SRC/run backward right.fbx" "$OUTPUT_DIR/rifle8_run_backward_right" && ((RIFLE_SUCCESS++))
convert_file "$RIFLE_8WAY_SRC/run left.fbx" "$OUTPUT_DIR/rifle8_run_left" && ((RIFLE_SUCCESS++))
convert_file "$RIFLE_8WAY_SRC/run right.fbx" "$OUTPUT_DIR/rifle8_run_right" && ((RIFLE_SUCCESS++))

# Sprint - 8 directions
convert_file "$RIFLE_8WAY_SRC/sprint forward.fbx" "$OUTPUT_DIR/rifle8_sprint_forward" && ((RIFLE_SUCCESS++))
convert_file "$RIFLE_8WAY_SRC/sprint forward left.fbx" "$OUTPUT_DIR/rifle8_sprint_forward_left" && ((RIFLE_SUCCESS++))
convert_file "$RIFLE_8WAY_SRC/sprint forward right.fbx" "$OUTPUT_DIR/rifle8_sprint_forward_right" && ((RIFLE_SUCCESS++))
convert_file "$RIFLE_8WAY_SRC/sprint backward.fbx" "$OUTPUT_DIR/rifle8_sprint_backward" && ((RIFLE_SUCCESS++))
convert_file "$RIFLE_8WAY_SRC/sprint backward left.fbx" "$OUTPUT_DIR/rifle8_sprint_backward_left" && ((RIFLE_SUCCESS++))
convert_file "$RIFLE_8WAY_SRC/sprint backward right.fbx" "$OUTPUT_DIR/rifle8_sprint_backward_right" && ((RIFLE_SUCCESS++))
convert_file "$RIFLE_8WAY_SRC/sprint left.fbx" "$OUTPUT_DIR/rifle8_sprint_left" && ((RIFLE_SUCCESS++))
convert_file "$RIFLE_8WAY_SRC/sprint right.fbx" "$OUTPUT_DIR/rifle8_sprint_right" && ((RIFLE_SUCCESS++))

# Crouch walk - 8 directions
convert_file "$RIFLE_8WAY_SRC/walk crouching forward.fbx" "$OUTPUT_DIR/rifle8_crouch_walk_forward" && ((RIFLE_SUCCESS++))
convert_file "$RIFLE_8WAY_SRC/walk crouching forward left.fbx" "$OUTPUT_DIR/rifle8_crouch_walk_forward_left" && ((RIFLE_SUCCESS++))
convert_file "$RIFLE_8WAY_SRC/walk crouching forward right.fbx" "$OUTPUT_DIR/rifle8_crouch_walk_forward_right" && ((RIFLE_SUCCESS++))
convert_file "$RIFLE_8WAY_SRC/walk crouching backward.fbx" "$OUTPUT_DIR/rifle8_crouch_walk_backward" && ((RIFLE_SUCCESS++))
convert_file "$RIFLE_8WAY_SRC/walk crouching backward left.fbx" "$OUTPUT_DIR/rifle8_crouch_walk_backward_left" && ((RIFLE_SUCCESS++))
convert_file "$RIFLE_8WAY_SRC/walk crouching backward right.fbx" "$OUTPUT_DIR/rifle8_crouch_walk_backward_right" && ((RIFLE_SUCCESS++))
convert_file "$RIFLE_8WAY_SRC/walk crouching left.fbx" "$OUTPUT_DIR/rifle8_crouch_walk_left" && ((RIFLE_SUCCESS++))
convert_file "$RIFLE_8WAY_SRC/walk crouching right.fbx" "$OUTPUT_DIR/rifle8_crouch_walk_right" && ((RIFLE_SUCCESS++))

# Turns
convert_file "$RIFLE_8WAY_SRC/turn 90 left.fbx" "$OUTPUT_DIR/rifle8_turn_left" && ((RIFLE_SUCCESS++))
convert_file "$RIFLE_8WAY_SRC/turn 90 right.fbx" "$OUTPUT_DIR/rifle8_turn_right" && ((RIFLE_SUCCESS++))
convert_file "$RIFLE_8WAY_SRC/crouching turn 90 left.fbx" "$OUTPUT_DIR/rifle8_crouch_turn_left" && ((RIFLE_SUCCESS++))
convert_file "$RIFLE_8WAY_SRC/crouching turn 90 right.fbx" "$OUTPUT_DIR/rifle8_crouch_turn_right" && ((RIFLE_SUCCESS++))

# Jump
convert_file "$RIFLE_8WAY_SRC/jump up.fbx" "$OUTPUT_DIR/rifle8_jump_up" && ((RIFLE_SUCCESS++))
convert_file "$RIFLE_8WAY_SRC/jump loop.fbx" "$OUTPUT_DIR/rifle8_jump_loop" && ((RIFLE_SUCCESS++))
convert_file "$RIFLE_8WAY_SRC/jump down.fbx" "$OUTPUT_DIR/rifle8_jump_down" && ((RIFLE_SUCCESS++))

# Death variants
convert_file "$RIFLE_8WAY_SRC/death from the front.fbx" "$OUTPUT_DIR/rifle8_death_front" && ((RIFLE_SUCCESS++))
convert_file "$RIFLE_8WAY_SRC/death from the back.fbx" "$OUTPUT_DIR/rifle8_death_back" && ((RIFLE_SUCCESS++))
convert_file "$RIFLE_8WAY_SRC/death from right.fbx" "$OUTPUT_DIR/rifle8_death_right" && ((RIFLE_SUCCESS++))
convert_file "$RIFLE_8WAY_SRC/death from front headshot.fbx" "$OUTPUT_DIR/rifle8_death_headshot_front" && ((RIFLE_SUCCESS++))
convert_file "$RIFLE_8WAY_SRC/death from back headshot.fbx" "$OUTPUT_DIR/rifle8_death_headshot_back" && ((RIFLE_SUCCESS++))
convert_file "$RIFLE_8WAY_SRC/death crouching headshot front.fbx" "$OUTPUT_DIR/rifle8_death_crouch_headshot" && ((RIFLE_SUCCESS++))

echo ""
echo "Rifle 8-Way: $RIFLE_SUCCESS/49 converted"

echo ""
echo "════════════════════════════════════════════════════════════"
echo "🔫 Converting Pistol Locomotion Pack"
echo "════════════════════════════════════════════════════════════"

PISTOL_SUCCESS=0

# Idle
convert_file "$PISTOL_SRC/pistol idle.fbx" "$OUTPUT_DIR/pistol_idle" && ((PISTOL_SUCCESS++))
convert_file "$PISTOL_SRC/pistol kneeling idle.fbx" "$OUTPUT_DIR/pistol_kneel_idle" && ((PISTOL_SUCCESS++))

# Transitions
convert_file "$PISTOL_SRC/pistol stand to kneel.fbx" "$OUTPUT_DIR/pistol_stand_to_kneel" && ((PISTOL_SUCCESS++))
convert_file "$PISTOL_SRC/pistol kneel to stand.fbx" "$OUTPUT_DIR/pistol_kneel_to_stand" && ((PISTOL_SUCCESS++))

# Walk
convert_file "$PISTOL_SRC/pistol walk.fbx" "$OUTPUT_DIR/pistol_walk_forward" && ((PISTOL_SUCCESS++))
convert_file "$PISTOL_SRC/pistol walk backward.fbx" "$OUTPUT_DIR/pistol_walk_backward" && ((PISTOL_SUCCESS++))
convert_file "$PISTOL_SRC/pistol walk arc.fbx" "$OUTPUT_DIR/pistol_walk_left" && ((PISTOL_SUCCESS++))
convert_file "$PISTOL_SRC/pistol walk arc (2).fbx" "$OUTPUT_DIR/pistol_walk_right" && ((PISTOL_SUCCESS++))
convert_file "$PISTOL_SRC/pistol walk backward arc.fbx" "$OUTPUT_DIR/pistol_walk_backward_left" && ((PISTOL_SUCCESS++))
convert_file "$PISTOL_SRC/pistol walk backward arc (2).fbx" "$OUTPUT_DIR/pistol_walk_backward_right" && ((PISTOL_SUCCESS++))

# Run
convert_file "$PISTOL_SRC/pistol run.fbx" "$OUTPUT_DIR/pistol_run_forward" && ((PISTOL_SUCCESS++))
convert_file "$PISTOL_SRC/pistol run backward.fbx" "$OUTPUT_DIR/pistol_run_backward" && ((PISTOL_SUCCESS++))
convert_file "$PISTOL_SRC/pistol run arc.fbx" "$OUTPUT_DIR/pistol_run_left" && ((PISTOL_SUCCESS++))
convert_file "$PISTOL_SRC/pistol run arc (2).fbx" "$OUTPUT_DIR/pistol_run_right" && ((PISTOL_SUCCESS++))
convert_file "$PISTOL_SRC/pistol run backward arc.fbx" "$OUTPUT_DIR/pistol_run_backward_left" && ((PISTOL_SUCCESS++))
convert_file "$PISTOL_SRC/pistol run backward arc (2).fbx" "$OUTPUT_DIR/pistol_run_backward_right" && ((PISTOL_SUCCESS++))

# Strafe
convert_file "$PISTOL_SRC/pistol strafe.fbx" "$OUTPUT_DIR/pistol_strafe_left" && ((PISTOL_SUCCESS++))
convert_file "$PISTOL_SRC/pistol strafe (2).fbx" "$OUTPUT_DIR/pistol_strafe_right" && ((PISTOL_SUCCESS++))

# Jump
convert_file "$PISTOL_SRC/pistol jump.fbx" "$OUTPUT_DIR/pistol_jump" && ((PISTOL_SUCCESS++))
convert_file "$PISTOL_SRC/pistol jump (2).fbx" "$OUTPUT_DIR/pistol_jump_loop" && ((PISTOL_SUCCESS++))

echo ""
echo "Pistol: $PISTOL_SUCCESS/20 converted"

echo ""
echo "════════════════════════════════════════════════════════════"
echo "✅ CONVERSION COMPLETE"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "New animation files:"
ls -1 "$OUTPUT_DIR" | grep -E "(rifle8|pistol)" | wc -l
echo ""
