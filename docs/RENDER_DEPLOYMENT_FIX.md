# Render Deployment Fix Guide

## Current Errors

### 1. ✅ Express Trust Proxy Error - FIXED
**Error:** `ValidationError: The Express 'trust proxy' setting is true, which allows anyone to trivially bypass IP-based rate limiting`

**Fix Applied:**
- Changed `app.set('trust proxy', true)` to `app.set('trust proxy', 1)` in `apps/backend/src/index.ts`
- Added `validate: { trustProxy: false }` to rate limiters in `apps/backend/src/middleware/rate-limit.middleware.ts`
- This securely trusts only Render's load balancer (1 hop) instead of any proxy

### 2. ❌ Database Migration Error - ACTION REQUIRED
**Error:** `The column 'users.publisherName' does not exist in the current database`

**Cause:** Production database hasn't run migrations that add the `publisherName` column

**This is blocking login!** You must run migrations NOW.

## How to Fix the Database Error

### Option 1: Run Migrations Manually via Render Shell (Quick Fix)
1. Go to https://dashboard.render.com
2. Navigate to your backend service
3. Click the **"Shell"** tab
4. Run this command:
   ```bash
   npx prisma migrate deploy
   ```
5. Wait for migrations to complete
6. Redeploy your service or wait for automatic restart

### Option 2: Auto-run Migrations on Deploy (Permanent Fix)
1. Go to https://dashboard.render.com
2. Navigate to your backend service
3. Go to **Settings**
4. Find **"Build Command"** section
5. Update it to:
   ```bash
   npm install && cd apps/backend && npx prisma generate && npx prisma migrate deploy && cd ../.. && npm run build
   ```
6. Click **"Save Changes"**
7. Trigger a manual deploy

### Option 3: Using Render Blueprint (Best Practice)
Create a `render.yaml` file in your project root:

```yaml
services:
  - type: web
    name: producer-tour-backend
    env: node
    buildCommand: npm install && cd apps/backend && npx prisma generate && npx prisma migrate deploy && cd ../.. && npm run build
    startCommand: npm run backend
    envVars:
      - key: DATABASE_URL
        sync: false
      - key: JWT_SECRET
        sync: false
      - key: NODE_ENV
        value: production
```

## Verification Steps

After applying the fixes:

1. **Check logs** for any errors:
   - Go to Render Dashboard → Your Service → Logs
   - Look for successful migration messages
   - Ensure no more "publisherName" errors

2. **Test authentication**:
   - Try logging in via your frontend
   - Check that rate limiting works (should see rate limit headers)

3. **Verify database**:
   - Migrations should show as applied
   - `publisherName` column should exist in `users` table

## Additional Notes

- The trust proxy fix is already committed in your code
- Migrations are version-controlled in `apps/backend/prisma/migrations/`
- Migration `20251106140000_rename_ipi_add_publisher_ipi` added the `publisherName` field
- Production database must match your Prisma schema for the app to work

## If Migrations Fail

If you get errors running migrations:

1. **Check DATABASE_URL** environment variable is set correctly in Render
2. **Verify database connection** from Render Shell:
   ```bash
   npx prisma db pull
   ```
3. **Reset and sync** (⚠️ DANGER - Only if you can lose data):
   ```bash
   npx prisma migrate reset --force
   npx prisma migrate deploy
   ```

## Next Steps After Fixing

Once both errors are resolved:
1. Commit the trust proxy fix
2. Push to GitHub
3. Render will auto-deploy (if configured)
4. Monitor logs to ensure clean deployment
5. Test your application thoroughly
