#!/bin/bash
# Blender automation runner for character system
# Usage: ./run.sh <command> [args...]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
AVATAR_DIR="$PROJECT_ROOT/apps/frontend/public/assets/avatars"
HAIR_DIR="$PROJECT_ROOT/apps/frontend/public/models/Characters/Hair"

# Try to find Blender
if command -v blender &> /dev/null; then
    BLENDER="blender"
elif [ -d "/Applications/Blender.app" ]; then
    BLENDER="/Applications/Blender.app/Contents/MacOS/Blender"
else
    echo "ERROR: Blender not found. Please install Blender or add it to PATH."
    exit 1
fi

show_help() {
    echo "Character Creator Blender Automation"
    echo ""
    echo "Usage: ./run.sh <command> [args...]"
    echo ""
    echo "Commands:"
    echo "  inspect <file.glb>           Inspect a GLB file (show shape keys, bones, etc.)"
    echo "  add-morphs <input> <output>  Add facial shape keys to a mesh"
    echo "  process-base                 Process current base meshes (add morphs)"
    echo "  process-hair <input-dir>     Process hair assets from a directory"
    echo ""
    echo "Examples:"
    echo "  ./run.sh inspect base_male.glb"
    echo "  ./run.sh add-morphs input.glb output.glb"
    echo "  ./run.sh process-base"
    echo ""
}

inspect() {
    local file="$1"
    if [ -z "$file" ]; then
        echo "Usage: ./run.sh inspect <file.glb>"
        exit 1
    fi

    # Make path absolute if relative
    if [[ ! "$file" = /* ]]; then
        file="$(pwd)/$file"
    fi

    echo "Inspecting: $file"
    "$BLENDER" --background --python "$SCRIPT_DIR/inspect_mesh.py" -- "$file"
}

add_morphs() {
    local input="$1"
    local output="$2"

    if [ -z "$input" ] || [ -z "$output" ]; then
        echo "Usage: ./run.sh add-morphs <input.glb> <output.glb>"
        exit 1
    fi

    # Make paths absolute if relative
    if [[ ! "$input" = /* ]]; then
        input="$(pwd)/$input"
    fi
    if [[ ! "$output" = /* ]]; then
        output="$(pwd)/$output"
    fi

    echo "Adding shape keys..."
    echo "  Input:  $input"
    echo "  Output: $output"
    "$BLENDER" --background --python "$SCRIPT_DIR/create_shape_keys.py" -- "$input" "$output"
}

process_base() {
    echo "Processing base avatar meshes..."
    echo "Avatar directory: $AVATAR_DIR"

    # Create backup directory
    mkdir -p "$AVATAR_DIR/backup"

    # Process male
    if [ -f "$AVATAR_DIR/base_male.glb" ]; then
        echo ""
        echo "=== Processing base_male.glb ==="
        cp "$AVATAR_DIR/base_male.glb" "$AVATAR_DIR/backup/base_male_original.glb"
        "$BLENDER" --background --python "$SCRIPT_DIR/create_shape_keys.py" -- \
            "$AVATAR_DIR/base_male.glb" \
            "$AVATAR_DIR/base_male_morphs.glb"

        if [ -f "$AVATAR_DIR/base_male_morphs.glb" ]; then
            mv "$AVATAR_DIR/base_male_morphs.glb" "$AVATAR_DIR/base_male.glb"
            echo "SUCCESS: base_male.glb updated with shape keys"
        fi
    else
        echo "WARNING: base_male.glb not found"
    fi

    # Process female
    if [ -f "$AVATAR_DIR/base_female.glb" ]; then
        echo ""
        echo "=== Processing base_female.glb ==="
        cp "$AVATAR_DIR/base_female.glb" "$AVATAR_DIR/backup/base_female_original.glb"
        "$BLENDER" --background --python "$SCRIPT_DIR/create_shape_keys.py" -- \
            "$AVATAR_DIR/base_female.glb" \
            "$AVATAR_DIR/base_female_morphs.glb"

        if [ -f "$AVATAR_DIR/base_female_morphs.glb" ]; then
            mv "$AVATAR_DIR/base_female_morphs.glb" "$AVATAR_DIR/base_female.glb"
            echo "SUCCESS: base_female.glb updated with shape keys"
        fi
    else
        echo "WARNING: base_female.glb not found"
    fi

    echo ""
    echo "=== DONE ==="
    echo "Backups saved to: $AVATAR_DIR/backup/"
    echo ""
    echo "Test the results:"
    echo "  ./run.sh inspect $AVATAR_DIR/base_male.glb"
}

# Main command router
case "$1" in
    inspect)
        inspect "$2"
        ;;
    add-morphs)
        add_morphs "$2" "$3"
        ;;
    process-base)
        process_base
        ;;
    process-hair)
        echo "Hair processing not yet implemented"
        ;;
    generate-charmorph)
        echo "Generating base meshes from CharMorph/MB-Lab..."
        DB_PATH="$SCRIPT_DIR/addons/CharMorph-db-master"
        OUTPUT_PATH="$AVATAR_DIR"

        if [ ! -d "$DB_PATH" ]; then
            echo "ERROR: CharMorph database not found at $DB_PATH"
            echo "Please download and extract CharMorph-db first"
            exit 1
        fi

        "$BLENDER" --background --python "$SCRIPT_DIR/generate_charmorph_base.py" -- "$DB_PATH" "$OUTPUT_PATH"
        ;;
    generate)
        echo "============================================================"
        echo "GENERATING GAME-READY AVATAR MESHES"
        echo "============================================================"
        DB_PATH="$SCRIPT_DIR/addons/CharMorph-db-master"
        OUTPUT_PATH="$AVATAR_DIR"

        if [ ! -d "$DB_PATH" ]; then
            echo "ERROR: CharMorph database not found at $DB_PATH"
            echo "Please download and extract CharMorph-db first"
            exit 1
        fi

        "$BLENDER" --background --python "$SCRIPT_DIR/generate_avatar_meshes.py" -- --db-path "$DB_PATH" --output "$OUTPUT_PATH"

        echo ""
        echo "============================================================"
        echo "VERIFYING MORPH TARGETS"
        echo "============================================================"
        if [ -f "$AVATAR_DIR/base_male.glb" ]; then
            echo "Male mesh morph targets:"
            node "$PROJECT_ROOT/scripts/inspect-glb.js" "$AVATAR_DIR/base_male.glb" 2>/dev/null | grep -A 30 "MORPH TARGET"
        fi
        if [ -f "$AVATAR_DIR/base_female.glb" ]; then
            echo ""
            echo "Female mesh morph targets:"
            node "$PROJECT_ROOT/scripts/inspect-glb.js" "$AVATAR_DIR/base_female.glb" 2>/dev/null | grep -A 30 "MORPH TARGET"
        fi
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        show_help
        exit 1
        ;;
esac
