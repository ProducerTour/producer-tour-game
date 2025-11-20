#!/bin/bash

# Fix Prisma Client Generation Issues
# Run this script outside of VS Code to avoid file lock issues

set -e

echo "🧹 Cleaning up processes..."
killall -9 node npm tsx prisma 2>/dev/null || true
sleep 3

echo "🗑️  Removing Prisma cache and temp files..."
cd /Users/nolangriffis/Documents/Producer\ Tour\ Official\ Website/Producer-Tour-Website/producer-tour-react
rm -rf node_modules/.prisma* 2>/dev/null || true
rm -rf node_modules/@prisma 2>/dev/null || true
rm -rf apps/backend/node_modules/@prisma 2>/dev/null || true

echo "📦 Reinstalling backend dependencies..."
cd apps/backend
npm install --force

echo "⚙️  Generating Prisma client..."
npx prisma generate

echo "✅ Prisma client generated successfully!"
echo ""
echo "🚀 Starting servers..."
echo "Run these commands in separate terminals:"
echo "  Terminal 1: npm run dev --prefix apps/backend"
echo "  Terminal 2: npm run dev --prefix apps/frontend"
