#!/bin/bash

echo "🔧 Starting Render deployment with migration recovery..."

# Try to resolve any failed migrations
echo "Checking for failed migrations..."
npx prisma migrate resolve --rolled-back 20251106140000_rename_ipi_add_publisher_ipi 2>&1 | grep -v "No failed migration" || true

# Run migrations
echo "Running migrations..."
npx prisma migrate deploy

# Start the server
echo "Starting server..."
node dist/index.js
