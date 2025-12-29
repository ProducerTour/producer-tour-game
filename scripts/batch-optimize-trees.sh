#!/bin/bash
#
# Batch Tree Optimizer
# ====================
# Processes all tree models in a directory
#
# Usage:
#   ./batch-optimize-trees.sh <input_dir> <output_dir> [max_tris]
#
# Example:
#   ./batch-optimize-trees.sh ~/Downloads/tree_pack ./public/models/Foliage/Trees 1500
#

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OPTIMIZER="$SCRIPT_DIR/optimize-tree-model.py"

INPUT_DIR="${1:-.}"
OUTPUT_DIR="${2:-./optimized}"
MAX_TRIS="${3:-1500}"

# Create output directory
mkdir -p "$OUTPUT_DIR"

echo ""
echo "=================================================="
echo "Batch Tree Optimizer"
echo "=================================================="
echo "Input:      $INPUT_DIR"
echo "Output:     $OUTPUT_DIR"
echo "Max tris:   $MAX_TRIS"
echo "=================================================="
echo ""

# Find all supported model files
count=0
for file in "$INPUT_DIR"/*.{glb,gltf,fbx,obj} "$INPUT_DIR"/**/scene.gltf 2>/dev/null; do
    [ -e "$file" ] || continue

    filename=$(basename "$file")
    dirname=$(basename "$(dirname "$file")")

    # Generate output name
    if [[ "$filename" == "scene.gltf" ]]; then
        # For scene.gltf, use parent folder name
        output_name="${dirname}.glb"
    else
        # Replace extension with .glb
        output_name="${filename%.*}.glb"
    fi

    output_path="$OUTPUT_DIR/$output_name"

    echo "Processing: $file"
    echo "  → $output_path"

    blender --background --python "$OPTIMIZER" -- \
        "$file" \
        "$output_path" \
        --max-tris "$MAX_TRIS" \
        --center \
        --ground \
        2>&1 | grep -E "^(✓|⚠|Input:|Output:|Reduction:|triangles|Merging)"

    echo ""
    ((count++))
done

echo "=================================================="
echo "Processed $count models"
echo "Output directory: $OUTPUT_DIR"
echo "=================================================="
