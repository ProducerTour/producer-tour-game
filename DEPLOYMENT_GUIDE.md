# Deployment Guide: Option A (Vercel + Render)

This guide covers deploying the Producer Tour platform with:
- **Frontend** → Vercel
- **Backend API** → Render
- **Database** → PostgreSQL on Render

---

## Prerequisites

1. **Vercel Account**: https://vercel.com
2. **Render Account**: https://render.com
3. **GitHub Repository**: Both platforms need access to your Git repository
4. **Domain**: (Optional) A custom domain for production

---

## Step 1: Backend Deployment (Render)

### 1.1 Connect Repository to Render

1. Go to [render.com/dashboard](https://render.com/dashboard)
2. Click **"New +"** → **"Blueprint"**
3. Connect your GitHub repository
4. Select the repository and branch (typically `main` or `master`)

### 1.2 Deploy Using Blueprint

1. Render will detect `render.yaml` in your root directory
2. Review the services:
   - `producer-tour-api` (Node.js web service)
   - `producer-tour-db` (PostgreSQL database)
3. Click **"Create New Blueprint Instance"**
4. Render will automatically:
   - Create the database
   - Install dependencies
   - Run build commands
   - Deploy the API

### 1.3 Configure Environment Variables (on Render)

After deployment, go to the web service settings and verify these are set:

- ✅ `NODE_ENV` = `production`
- ✅ `PORT` = `3000`
- ✅ `JWT_SECRET` = (auto-generated)
- ✅ `JWT_EXPIRES_IN` = `7d`
- ✅ `DATABASE_URL` = (auto-populated from database)
- ✅ `CORS_ORIGIN` = Your Vercel frontend URL (e.g., `https://your-domain.vercel.app`)

### 1.4 Note Your API URL

Once deployed, you'll get a URL like:
```
https://producer-tour-api.onrender.com
```

**Save this URL** - you'll need it for the frontend.

### 1.5 Configure Email (Optional)

If using email notifications, add to environment variables:
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `EMAIL_FROM`

---

## Step 2: Frontend Deployment (Vercel)

### 2.1 Connect Repository to Vercel

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click **"Add New"** → **"Project"**
3. Import your GitHub repository
4. Choose the root directory (producer-tour-react)

### 2.2 Configure Build Settings

Vercel should auto-detect from `vercel.json`:
- **Framework Preset**: Vite
- **Build Command**: `npm run build:frontend`
- **Output Directory**: `apps/frontend/dist`
- **Install Command**: `npm install`

### 2.3 Set Environment Variables

In Vercel project settings → **Environment Variables**, add:

```
VITE_API_URL = https://producer-tour-api.onrender.com
```

(Replace with your actual Render API URL from Step 1.4)

### 2.4 Deploy

1. Click **"Deploy"**
2. Wait for build to complete
3. You'll get a production URL like:
   ```
   https://your-domain.vercel.app
   ```

### 2.5 Update Backend CORS

Go back to Render, update your API service's environment variable:
- `CORS_ORIGIN` = Your new Vercel production URL

---

## Step 3: Database Setup

### 3.1 Run Database Migrations

On Render, the database is automatically created, but you may need to run migrations:

```bash
npm run db:migrate --workspace=apps/backend
```

This can be done:
1. Locally with proper `DATABASE_URL`
2. Via Render's shell/console if available
3. Or automatically during deployment if migrations are pending

### 3.2 Seed Data (Optional)

If you have seed data:

```bash
npm run db:seed --workspace=apps/backend
```

---

## Step 4: Verification & Testing

### ✅ Test Backend API

```bash
curl https://producer-tour-api.onrender.com/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-...",
  "uptime": ...
}
```

### ✅ Test Frontend

1. Visit your Vercel URL
2. Check browser console for any API errors
3. Test login/authentication flow

### ✅ Check CORS

Try making an API call from frontend:
```javascript
const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'test@example.com', password: 'password' })
});
```

---

## Troubleshooting

### Issue: CORS Errors

**Error**: `Access to XMLHttpRequest at 'https://...' from origin 'https://...' has been blocked by CORS policy`

**Solution**:
1. Check `CORS_ORIGIN` is set correctly on Render backend
2. Verify it matches your Vercel frontend URL exactly (including `https://`)
3. Give it a few minutes to propagate

### Issue: API Returns 404 or 503

**Causes**:
- Backend service is still starting up
- Database connection failed
- Migrations didn't run

**Solution**:
1. Check Render logs: Dashboard → Web Service → Logs
2. Check database connection: `DATABASE_URL` is valid
3. Re-deploy if needed

### Issue: Frontend Blank Page

**Causes**:
- `VITE_API_URL` not set in Vercel
- Build failed

**Solution**:
1. Check Vercel build logs
2. Verify `VITE_API_URL` environment variable exists
3. Check that `vite.config.ts` properly uses it

### Issue: Database Connection Timeout

**Solution**:
1. Render PostgreSQL may take time to start
2. Check Render database logs
3. Verify network access (should be automatic within Render)

---

## Development Workflow

### Local Development

```bash
# Terminal 1: Backend
npm run backend

# Terminal 2: Frontend  
npm run frontend
```

Both will use `.env` files with `VITE_API_URL=http://localhost:3000`

### Staging Before Production

1. Push to a development branch
2. Connect Render/Vercel to that branch
3. Test changes in staging environment
4. Merge to main when ready

---

## Environment Variables Reference

### Frontend (.env)
```
VITE_API_URL=https://producer-tour-api.onrender.com
```

### Backend (.env)
```
NODE_ENV=production
PORT=3000
CORS_ORIGIN=https://your-domain.vercel.app
JWT_SECRET=(auto-generated on Render)
JWT_EXPIRES_IN=7d
DATABASE_URL=(auto-populated on Render)
```

---

## Custom Domains

### On Vercel

1. Go to project settings → **Domains**
2. Add your domain
3. Update DNS records as instructed

### On Render

1. Go to web service → **Custom Domain**
2. Add domain
3. Update DNS records

---

## Monitoring & Maintenance

- **Render Dashboard**: Monitor API health, logs, resource usage
- **Vercel Dashboard**: Monitor frontend builds, deployments, analytics
- **Error Tracking**: Set up Sentry or similar for production errors
- **Database**: Regularly backup PostgreSQL data

---

## Security Checklist

- ✅ JWT_SECRET is generated (not hardcoded)
- ✅ CORS_ORIGIN is set to specific domains (not `*`)
- ✅ Database has strong passwords
- ✅ `.env` files not committed to Git
- ✅ API validates all inputs (Zod schemas)
- ✅ HTTPS enabled on both services
- ✅ API keys rotated regularly

---

## Next Steps

1. ✅ Deploy backend to Render
2. ✅ Deploy frontend to Vercel  
3. ✅ Test API connectivity
4. ✅ Set up monitoring
5. ✅ Configure custom domains
6. ✅ Set up CI/CD for automated deployments

For more help, check:
- Render Docs: https://render.com/docs
- Vercel Docs: https://vercel.com/docs