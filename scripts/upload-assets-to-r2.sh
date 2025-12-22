#!/bin/bash
# Upload game assets to Cloudflare R2
# Account ID: 1765bdce214efaa7ef0d20bf03406b73
# Public bucket URL: https://pub-5e192bc6cd8640f1b75ee043036d06d2.r2.dev
#
# Prerequisites:
#   1. AWS CLI installed: brew install awscli
#   2. Configure R2 credentials: aws configure --profile r2
#      - Access Key ID: <your R2 access key from Cloudflare dashboard>
#      - Secret Access Key: <your R2 secret key>
#      - Default region: auto
#      - Default output format: json
#
# Usage:
#   AWS_PROFILE=r2 ./scripts/upload-assets-to-r2.sh

set -e

# R2 Configuration
R2_ENDPOINT="https://1765bdce214efaa7ef0d20bf03406b73.r2.cloudflarestorage.com"
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
echo "Endpoint: $R2_ENDPOINT"
echo "Bucket: $BUCKET_NAME"
echo "Source: $PUBLIC_DIR"
echo ""

# Upload models
if [ -d "./models" ]; then
    echo "Uploading models..."
    aws s3 sync ./models s3://$BUCKET_NAME/models \
        --endpoint-url $R2_ENDPOINT \
        --delete
    echo "  Done."
else
    echo "Skipping models (directory not found)"
fi

# Upload animations
if [ -d "./animations" ]; then
    echo "Uploading animations..."
    aws s3 sync ./animations s3://$BUCKET_NAME/animations \
        --endpoint-url $R2_ENDPOINT \
        --delete
    echo "  Done."
else
    echo "Skipping animations (directory not found)"
fi

# Upload textures
if [ -d "./textures" ]; then
    echo "Uploading textures..."
    aws s3 sync ./textures s3://$BUCKET_NAME/textures \
        --endpoint-url $R2_ENDPOINT \
        --delete
    echo "  Done."
else
    echo "Skipping textures (directory not found)"
fi

# Upload skybox
if [ -d "./skybox" ]; then
    echo "Uploading skybox..."
    aws s3 sync ./skybox s3://$BUCKET_NAME/skybox \
        --endpoint-url $R2_ENDPOINT \
        --delete
    echo "  Done."
else
    echo "Skipping skybox (directory not found)"
fi

# Upload audio
if [ -d "./audio" ]; then
    echo "Uploading audio..."
    aws s3 sync ./audio s3://$BUCKET_NAME/audio \
        --endpoint-url $R2_ENDPOINT \
        --delete
    echo "  Done."
else
    echo "Skipping audio (directory not found)"
fi

echo ""
echo "=== Upload Complete ==="
echo ""
echo "Verify assets are accessible:"
echo "  $PUBLIC_URL/models/Campfire/campfire.glb"
echo "  $PUBLIC_URL/animations/idle.glb"
echo ""
