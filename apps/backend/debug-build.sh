#!/bin/bash

# Debug build script to track memory usage at each step

echo "=== BUILD DEBUG START ==="
echo "Working directory: $(pwd)"
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"
echo ""

# Check if we're in a workspace
echo "=== Checking for workspace ==="
if [ -f "../../package.json" ]; then
  echo "⚠️  WARNING: Found root package.json at ../../package.json"
  echo "This means we're in a workspace subdirectory"
  cat ../../package.json | grep -A 5 "workspaces"
else
  echo "✓ No parent package.json found (good)"
fi
echo ""

# Show what package.json we're using
echo "=== Current package.json ==="
cat package.json | grep -E '"name"|"version"|"scripts"' | head -10
echo ""

# Check node_modules BEFORE install
echo "=== node_modules BEFORE npm install ==="
if [ -d "node_modules" ]; then
  du -sh node_modules/ 2>/dev/null || echo "Cannot measure node_modules"
  echo "Top-level packages:"
  ls node_modules/ | head -20
else
  echo "No node_modules yet"
fi
echo ""

# Show memory before npm install
echo "=== Memory BEFORE npm install ==="
free -h 2>/dev/null || echo "free command not available"
echo ""

# Run npm install with timing
echo "=== Running npm install ==="
time npm install
echo ""

# Check node_modules AFTER install
echo "=== node_modules AFTER npm install ==="
du -sh node_modules/ 2>/dev/null || echo "Cannot measure"
echo "Checking for workspace packages:"
ls node_modules/ | grep -E "frontend|backend|producer-tour" || echo "No workspace packages found (good)"
echo ""

# Show memory after npm install
echo "=== Memory AFTER npm install ==="
free -h 2>/dev/null || echo "free command not available"
echo ""

# Check if Prisma was generated
echo "=== Checking Prisma Client ==="
if [ -d "node_modules/.prisma/client" ]; then
  du -sh node_modules/.prisma/client/ 2>/dev/null || echo "Cannot measure"
  echo "✓ Prisma client exists"
else
  echo "✗ Prisma client NOT generated yet"
fi
echo ""

# Show memory before esbuild
echo "=== Memory BEFORE esbuild ==="
free -h 2>/dev/null || echo "free command not available"
echo ""

# Run esbuild with timing
echo "=== Running esbuild ==="
time node build.js
echo ""

# Check dist output
echo "=== Build output ==="
if [ -d "dist" ]; then
  du -sh dist/
  ls -lh dist/
else
  echo "✗ No dist directory created"
fi
echo ""

# Final memory check
echo "=== Memory AFTER build ==="
free -h 2>/dev/null || echo "free command not available"
echo ""

echo "=== BUILD DEBUG END ==="
