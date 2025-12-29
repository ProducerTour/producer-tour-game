#!/bin/bash
# Upload game assets to Cloudflare R2 using Wrangler
# Uses existing wrangler authentication

set -e

BUCKET_NAME="producer-tour-assets"
PUBLIC_URL="https://pub-5e192bc6cd8640f1b75ee043036d06d2.r2.dev"

# Get script directory and navigate to frontend public
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PUBLIC_DIR="$SCRIPT_DIR/../apps/frontend/public"

if [ ! -d "$PUBLIC_DIR" ]; then
    echo "Error: public directory not found at $PUBLIC_DIR"
    exit 1
fi

cd "$PUBLIC_DIR"

echo "=== Uploading Game Assets to Cloudflare R2 ==="
echo "Bucket: $BUCKET_NAME"
echo "Source: $PUBLIC_DIR"
echo ""

upload_directory() {
    local dir=$1
    local prefix=$2

    if [ ! -d "./$dir" ]; then
        echo "Skipping $dir (directory not found)"
        return
    fi

    echo "Uploading $dir..."
    local count=0

    find "./$dir" -type f | while read -r file; do
        # Remove leading ./
        local relative_path="${file#./}"
        echo "  Uploading: $relative_path"
        wrangler r2 object put "$BUCKET_NAME/$relative_path" --file="$file" --remote 2>/dev/null
        count=$((count + 1))
    done

    echo "  Done."
}

# Upload each asset directory
upload_directory "models" "models"
upload_directory "animations" "animations"
upload_directory "textures" "textures"
upload_directory "skybox" "skybox"
upload_directory "audio" "audio"
upload_directory "assets" "assets"
upload_directory "icons" "icons"

echo ""
echo "=== Upload Complete ==="
echo ""
echo "Verify assets are accessible:"
echo "  $PUBLIC_URL/models/Campfire/campfire.glb"
echo "  $PUBLIC_URL/animations/idle.glb"
echo ""
