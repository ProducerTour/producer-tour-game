#!/bin/bash
set -e

echo "=== ISOLATED BUILD (NO WORKSPACE) ==="

# Temporarily hide parent package.json to prevent workspace detection
if [ -f "../../package.json" ]; then
  echo "Hiding workspace package.json..."
  mv ../../package.json ../../package.json.hidden
fi

# Clean install without workspace
echo "Installing dependencies (workspace-free)..."
rm -rf node_modules package-lock.json
npm install --no-save --legacy-peer-deps

echo "Building with esbuild..."
npm run build

# Restore parent package.json
if [ -f "../../package.json.hidden" ]; then
  echo "Restoring workspace package.json..."
  mv ../../package.json.hidden ../../package.json
fi

echo "=== BUILD COMPLETE ==="
