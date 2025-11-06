#!/bin/bash

# Test Backend Health Script
# Usage: ./test-backend.sh https://your-backend.onrender.com

BACKEND_URL=$1

if [ -z "$BACKEND_URL" ]; then
  echo "Usage: ./test-backend.sh https://your-backend.onrender.com"
  exit 1
fi

echo "Testing backend at: $BACKEND_URL"
echo "================================"
echo ""

# Test 1: Health check
echo "1. Testing health endpoint..."
curl -s "$BACKEND_URL/health" || echo "❌ Health check failed"
echo ""
echo ""

# Test 2: Test login
echo "2. Testing login endpoint..."
echo "Attempting login with admin@producertour.com..."
LOGIN_RESPONSE=$(curl -s -X POST "$BACKEND_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@producertour.com","password":"your-password"}')

echo "$LOGIN_RESPONSE" | jq '.' 2>/dev/null || echo "$LOGIN_RESPONSE"
echo ""

# Extract token from response
TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token' 2>/dev/null)

if [ "$TOKEN" != "null" ] && [ ! -z "$TOKEN" ]; then
  echo "✅ Login successful! Token received."
  echo ""

  # Test 3: Get commission settings
  echo "3. Testing commission settings endpoint..."
  curl -s "$BACKEND_URL/api/commission/settings" \
    -H "Authorization: Bearer $TOKEN" | jq '.' 2>/dev/null
  echo ""

  # Test 4: Get dashboard stats
  echo "4. Testing dashboard stats..."
  curl -s "$BACKEND_URL/api/dashboard/stats" \
    -H "Authorization: Bearer $TOKEN" | jq '.' 2>/dev/null
  echo ""

  # Test 5: List statements
  echo "5. Testing statements list..."
  curl -s "$BACKEND_URL/api/statements?limit=5" \
    -H "Authorization: Bearer $TOKEN" | jq '.statements | length' 2>/dev/null
  echo " statements found"
  echo ""

  echo "✅ All tests completed!"
else
  echo "❌ Login failed. Please check your credentials."
fi
