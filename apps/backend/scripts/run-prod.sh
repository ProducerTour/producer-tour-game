#!/bin/bash
# Run a command with the production database
# Usage: ./scripts/run-prod.sh npx tsx scripts/diagnose-payout.ts

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"

# Load production env
if [ -f "$BACKEND_DIR/.env.production" ]; then
  export $(cat "$BACKEND_DIR/.env.production" | grep -v '^#' | xargs)
  echo "✅ Loaded production DATABASE_URL"
else
  echo "❌ .env.production not found!"
  echo "Create apps/backend/.env.production with your Render external DB URL"
  exit 1
fi

# Check if URL was updated from placeholder
if [[ "$DATABASE_URL" == *"paste-your"* ]]; then
  echo "❌ Please update .env.production with your actual Render database URL"
  exit 1
fi

echo "🔗 Connecting to production database..."
echo ""

# Run the command
cd "$BACKEND_DIR"
"$@"
