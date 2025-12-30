#!/bin/bash
# Convert Rifle 8-Way and Pistol packs using FBX2glTF
# (These have older FBX format 6100 that Blender 5.0 doesn't support)

set -e

FBX2GLTF="/Users/nolangriffis/.nvm/versions/node/v22.21.1/lib/node_modules/fbx2gltf/bin/Darwin/FBX2glTF"
ANIMATIONS_DIR="/Users/nolangriffis/Documents/producer-tour-play/apps/frontend/public/animations/new animations"
OUTPUT_DIR="/Users/nolangriffis/Documents/producer-tour-play/apps/frontend/public/assets/animations/xbot"

RIFLE_DIR="$ANIMATIONS_DIR/Rifle 8-Way Locomotion Pack 3"
PISTOL_DIR="$ANIMATIONS_DIR/Pistol_Handgun Locomotion Pack 3"

convert() {
    local input="$1"
    local output="$2"

    if [ ! -f "$input" ]; then
        echo "  SKIP: $(basename "$input") (not found)"
        return 1
    fi

    "$FBX2GLTF" --input "$input" --output "$output" --binary 2>/dev/null
    if [ -f "${output}.glb" ]; then
        echo "  OK: $(basename "${output}.glb")"
        return 0
    else
        echo "  ERR: $(basename "$input")"
        return 1
    fi
}

echo ""
echo "============================================================"
echo "Converting Rifle 8-Way Pack (using FBX2glTF)"
echo "============================================================"

RIFLE_SUCCESS=0

# Idle states
convert "$RIFLE_DIR/idle.fbx" "$OUTPUT_DIR/rifle_idle" && ((RIFLE_SUCCESS++)) || true
convert "$RIFLE_DIR/idle aiming.fbx" "$OUTPUT_DIR/rifle_aim_idle" && ((RIFLE_SUCCESS++)) || true
convert "$RIFLE_DIR/idle crouching.fbx" "$OUTPUT_DIR/rifle_crouch_idle" && ((RIFLE_SUCCESS++)) || true
convert "$RIFLE_DIR/idle crouching aiming.fbx" "$OUTPUT_DIR/rifle_crouch_aim_idle" && ((RIFLE_SUCCESS++)) || true

# Walk - 8 directions
convert "$RIFLE_DIR/walk forward.fbx" "$OUTPUT_DIR/rifle_walk_fwd" && ((RIFLE_SUCCESS++)) || true
convert "$RIFLE_DIR/walk forward left.fbx" "$OUTPUT_DIR/rifle_walk_fwd_left" && ((RIFLE_SUCCESS++)) || true
convert "$RIFLE_DIR/walk forward right.fbx" "$OUTPUT_DIR/rifle_walk_fwd_right" && ((RIFLE_SUCCESS++)) || true
convert "$RIFLE_DIR/walk backward.fbx" "$OUTPUT_DIR/rifle_walk_back" && ((RIFLE_SUCCESS++)) || true
convert "$RIFLE_DIR/walk backward left.fbx" "$OUTPUT_DIR/rifle_walk_back_left" && ((RIFLE_SUCCESS++)) || true
convert "$RIFLE_DIR/walk backward right.fbx" "$OUTPUT_DIR/rifle_walk_back_right" && ((RIFLE_SUCCESS++)) || true
convert "$RIFLE_DIR/walk left.fbx" "$OUTPUT_DIR/rifle_walk_left" && ((RIFLE_SUCCESS++)) || true
convert "$RIFLE_DIR/walk right.fbx" "$OUTPUT_DIR/rifle_walk_right" && ((RIFLE_SUCCESS++)) || true

# Run - 8 directions
convert "$RIFLE_DIR/run forward.fbx" "$OUTPUT_DIR/rifle_run_fwd" && ((RIFLE_SUCCESS++)) || true
convert "$RIFLE_DIR/run forward left.fbx" "$OUTPUT_DIR/rifle_run_fwd_left" && ((RIFLE_SUCCESS++)) || true
convert "$RIFLE_DIR/run forward right.fbx" "$OUTPUT_DIR/rifle_run_fwd_right" && ((RIFLE_SUCCESS++)) || true
convert "$RIFLE_DIR/run backward.fbx" "$OUTPUT_DIR/rifle_run_back" && ((RIFLE_SUCCESS++)) || true
convert "$RIFLE_DIR/run backward left.fbx" "$OUTPUT_DIR/rifle_run_back_left" && ((RIFLE_SUCCESS++)) || true
convert "$RIFLE_DIR/run backward right.fbx" "$OUTPUT_DIR/rifle_run_back_right" && ((RIFLE_SUCCESS++)) || true
convert "$RIFLE_DIR/run left.fbx" "$OUTPUT_DIR/rifle_run_left" && ((RIFLE_SUCCESS++)) || true
convert "$RIFLE_DIR/run right.fbx" "$OUTPUT_DIR/rifle_run_right" && ((RIFLE_SUCCESS++)) || true

# Sprint - 8 directions
convert "$RIFLE_DIR/sprint forward.fbx" "$OUTPUT_DIR/rifle_sprint_fwd" && ((RIFLE_SUCCESS++)) || true
convert "$RIFLE_DIR/sprint forward left.fbx" "$OUTPUT_DIR/rifle_sprint_fwd_left" && ((RIFLE_SUCCESS++)) || true
convert "$RIFLE_DIR/sprint forward right.fbx" "$OUTPUT_DIR/rifle_sprint_fwd_right" && ((RIFLE_SUCCESS++)) || true
convert "$RIFLE_DIR/sprint backward.fbx" "$OUTPUT_DIR/rifle_sprint_back" && ((RIFLE_SUCCESS++)) || true
convert "$RIFLE_DIR/sprint backward left.fbx" "$OUTPUT_DIR/rifle_sprint_back_left" && ((RIFLE_SUCCESS++)) || true
convert "$RIFLE_DIR/sprint backward right.fbx" "$OUTPUT_DIR/rifle_sprint_back_right" && ((RIFLE_SUCCESS++)) || true
convert "$RIFLE_DIR/sprint left.fbx" "$OUTPUT_DIR/rifle_sprint_left" && ((RIFLE_SUCCESS++)) || true
convert "$RIFLE_DIR/sprint right.fbx" "$OUTPUT_DIR/rifle_sprint_right" && ((RIFLE_SUCCESS++)) || true

# Crouch walk - 8 directions
convert "$RIFLE_DIR/walk crouching forward.fbx" "$OUTPUT_DIR/rifle_crouch_fwd" && ((RIFLE_SUCCESS++)) || true
convert "$RIFLE_DIR/walk crouching forward left.fbx" "$OUTPUT_DIR/rifle_crouch_fwd_left" && ((RIFLE_SUCCESS++)) || true
convert "$RIFLE_DIR/walk crouching forward right.fbx" "$OUTPUT_DIR/rifle_crouch_fwd_right" && ((RIFLE_SUCCESS++)) || true
convert "$RIFLE_DIR/walk crouching backward.fbx" "$OUTPUT_DIR/rifle_crouch_back" && ((RIFLE_SUCCESS++)) || true
convert "$RIFLE_DIR/walk crouching backward left.fbx" "$OUTPUT_DIR/rifle_crouch_back_left" && ((RIFLE_SUCCESS++)) || true
convert "$RIFLE_DIR/walk crouching backward right.fbx" "$OUTPUT_DIR/rifle_crouch_back_right" && ((RIFLE_SUCCESS++)) || true
convert "$RIFLE_DIR/walk crouching left.fbx" "$OUTPUT_DIR/rifle_crouch_left" && ((RIFLE_SUCCESS++)) || true
convert "$RIFLE_DIR/walk crouching right.fbx" "$OUTPUT_DIR/rifle_crouch_right" && ((RIFLE_SUCCESS++)) || true

# Turns
convert "$RIFLE_DIR/turn 90 left.fbx" "$OUTPUT_DIR/rifle_turn_left" && ((RIFLE_SUCCESS++)) || true
convert "$RIFLE_DIR/turn 90 right.fbx" "$OUTPUT_DIR/rifle_turn_right" && ((RIFLE_SUCCESS++)) || true
convert "$RIFLE_DIR/crouching turn 90 left.fbx" "$OUTPUT_DIR/rifle_crouch_turn_left" && ((RIFLE_SUCCESS++)) || true
convert "$RIFLE_DIR/crouching turn 90 right.fbx" "$OUTPUT_DIR/rifle_crouch_turn_right" && ((RIFLE_SUCCESS++)) || true

# Jump
convert "$RIFLE_DIR/jump up.fbx" "$OUTPUT_DIR/rifle_jump_up" && ((RIFLE_SUCCESS++)) || true
convert "$RIFLE_DIR/jump loop.fbx" "$OUTPUT_DIR/rifle_jump_loop" && ((RIFLE_SUCCESS++)) || true
convert "$RIFLE_DIR/jump down.fbx" "$OUTPUT_DIR/rifle_jump_down" && ((RIFLE_SUCCESS++)) || true

# Death
convert "$RIFLE_DIR/death from the front.fbx" "$OUTPUT_DIR/rifle_death_front" && ((RIFLE_SUCCESS++)) || true
convert "$RIFLE_DIR/death from the back.fbx" "$OUTPUT_DIR/rifle_death_back" && ((RIFLE_SUCCESS++)) || true
convert "$RIFLE_DIR/death from right.fbx" "$OUTPUT_DIR/rifle_death_right" && ((RIFLE_SUCCESS++)) || true
convert "$RIFLE_DIR/death from front headshot.fbx" "$OUTPUT_DIR/rifle_death_headshot_front" && ((RIFLE_SUCCESS++)) || true
convert "$RIFLE_DIR/death from back headshot.fbx" "$OUTPUT_DIR/rifle_death_headshot_back" && ((RIFLE_SUCCESS++)) || true
convert "$RIFLE_DIR/death crouching headshot front.fbx" "$OUTPUT_DIR/rifle_death_crouch_headshot" && ((RIFLE_SUCCESS++)) || true

echo ""
echo "Rifle 8-Way: $RIFLE_SUCCESS/49 converted"

echo ""
echo "============================================================"
echo "Converting Pistol Pack (using FBX2glTF)"
echo "============================================================"

PISTOL_SUCCESS=0

# Idle
convert "$PISTOL_DIR/pistol idle.fbx" "$OUTPUT_DIR/pistol_idle" && ((PISTOL_SUCCESS++)) || true
convert "$PISTOL_DIR/pistol kneeling idle.fbx" "$OUTPUT_DIR/pistol_kneel_idle" && ((PISTOL_SUCCESS++)) || true

# Transitions
convert "$PISTOL_DIR/pistol stand to kneel.fbx" "$OUTPUT_DIR/pistol_stand_to_kneel" && ((PISTOL_SUCCESS++)) || true
convert "$PISTOL_DIR/pistol kneel to stand.fbx" "$OUTPUT_DIR/pistol_kneel_to_stand" && ((PISTOL_SUCCESS++)) || true

# Walk
convert "$PISTOL_DIR/pistol walk.fbx" "$OUTPUT_DIR/pistol_walk_fwd" && ((PISTOL_SUCCESS++)) || true
convert "$PISTOL_DIR/pistol walk backward.fbx" "$OUTPUT_DIR/pistol_walk_back" && ((PISTOL_SUCCESS++)) || true
convert "$PISTOL_DIR/pistol walk arc.fbx" "$OUTPUT_DIR/pistol_walk_left" && ((PISTOL_SUCCESS++)) || true
convert "$PISTOL_DIR/pistol walk arc (2).fbx" "$OUTPUT_DIR/pistol_walk_right" && ((PISTOL_SUCCESS++)) || true
convert "$PISTOL_DIR/pistol walk backward arc.fbx" "$OUTPUT_DIR/pistol_walk_back_left" && ((PISTOL_SUCCESS++)) || true
convert "$PISTOL_DIR/pistol walk backward arc (2).fbx" "$OUTPUT_DIR/pistol_walk_back_right" && ((PISTOL_SUCCESS++)) || true

# Run
convert "$PISTOL_DIR/pistol run.fbx" "$OUTPUT_DIR/pistol_run_fwd" && ((PISTOL_SUCCESS++)) || true
convert "$PISTOL_DIR/pistol run backward.fbx" "$OUTPUT_DIR/pistol_run_back" && ((PISTOL_SUCCESS++)) || true
convert "$PISTOL_DIR/pistol run arc.fbx" "$OUTPUT_DIR/pistol_run_left" && ((PISTOL_SUCCESS++)) || true
convert "$PISTOL_DIR/pistol run arc (2).fbx" "$OUTPUT_DIR/pistol_run_right" && ((PISTOL_SUCCESS++)) || true
convert "$PISTOL_DIR/pistol run backward arc.fbx" "$OUTPUT_DIR/pistol_run_back_left" && ((PISTOL_SUCCESS++)) || true
convert "$PISTOL_DIR/pistol run backward arc (2).fbx" "$OUTPUT_DIR/pistol_run_back_right" && ((PISTOL_SUCCESS++)) || true

# Strafe
convert "$PISTOL_DIR/pistol strafe.fbx" "$OUTPUT_DIR/pistol_strafe_left" && ((PISTOL_SUCCESS++)) || true
convert "$PISTOL_DIR/pistol strafe (2).fbx" "$OUTPUT_DIR/pistol_strafe_right" && ((PISTOL_SUCCESS++)) || true

# Jump
convert "$PISTOL_DIR/pistol jump.fbx" "$OUTPUT_DIR/pistol_jump" && ((PISTOL_SUCCESS++)) || true
convert "$PISTOL_DIR/pistol jump (2).fbx" "$OUTPUT_DIR/pistol_jump_loop" && ((PISTOL_SUCCESS++)) || true

echo ""
echo "Pistol: $PISTOL_SUCCESS/20 converted"

echo ""
echo "============================================================"
echo "CONVERSION COMPLETE"
echo "============================================================"
echo ""
ls "$OUTPUT_DIR"/*.glb | wc -l
echo "total GLB files in output folder"
