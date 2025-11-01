# Deployment Guide

## Prerequisites

- GitHub account
- Render account (https://render.com)
- Vercel account (https://vercel.com)

---

## Step 1: Push to GitHub

```bash
cd producer-tour-react
git init
git add .
git commit -m "Initial commit - Producer Tour React platform"
git branch -M main
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main
```

---

## Step 2: Deploy Database & Backend on Render

### Option A: Blueprint (Recommended - One Click)

1. Go to https://render.com
2. Click **New** → **Blueprint**
3. Connect your GitHub repository
4. Render will detect `render.yaml` at the repository root
5. Review the generated resources (`producer-tour-frontend`, `producer-tour-api`, and `producer-tour-db`)
6. Provide values for manual env vars when prompted (e.g. `VITE_API_URL`, `CORS_ORIGIN`)
7. Click **Apply Blueprint** and wait for Render to finish provisioning (~5 minutes)

### Option B: Manual Setup

#### Create PostgreSQL Database

1. Click **New** → **PostgreSQL**
2. Name: `producer-tour-db`
3. Database: `producer_tour`
4. Region: `Oregon (US West)`
5. Plan: `Starter ($7/mo)` or `Free` for testing
6. Click **Create Database**
7. Copy the **Internal Database URL** (starts with `postgresql://`)

#### Create Web Service

1. Click **New** → **Web Service**
2. Connect your GitHub repo
3. Configure:
   - **Name:** `producer-tour-api`
   - **Region:** `Oregon (US West)`
   - **Branch:** `main`
   - **Root Directory:** Leave blank
   - **Build Command:**
     ```bash
     npm install --no-optional && npm run build:backend && npm run db:generate --workspace=apps/backend
     ```
   - **Start Command:**
     ```bash
     npm run start --workspace=apps/backend
     ```
   - **Plan:** `Starter ($7/mo)` or `Free` for testing

4. Add Environment Variables:
   ```
   NODE_ENV=production
   PORT=3000
   DATABASE_URL=[paste Internal Database URL from step 7 above]
   JWT_SECRET=[generate random string - use: openssl rand -base64 32]
   JWT_EXPIRES_IN=7d
   CORS_ORIGIN=https://your-frontend-domain
   ```

5. Click **Create Web Service**

#### Create Static Site (Frontend)

1. Click **New** → **Static Site**
2. Connect the same GitHub repo
3. Configure:
   - **Name:** `producer-tour-frontend`
   - **Branch:** `main`
   - **Build Command:**
     ```bash
     npm install --no-optional && npm run build:frontend
     ```
   - **Publish Directory:** `apps/frontend/dist`
4. Add Environment Variables:
   ```
   VITE_API_URL=https://your-render-api.onrender.com
   ```
5. Add custom route for SPA fallback:
   - Type: `Rewrite`
   - Source: `/*`
   - Destination: `/index.html`
6. Click **Create Static Site**

#### Run Database Migrations

1. Once deployed, go to your web service
2. Click **Shell** tab
3. Run migrations:
   ```bash
   cd apps/backend
   npx prisma migrate deploy
   npx prisma db seed
   ```

4. This creates tables and seed data (admin/writer users)

---

## Step 3: Deploy Frontend on Vercel

### Via Vercel Dashboard

1. Go to https://vercel.com
2. Click **New Project**
3. Import your GitHub repository
4. Vercel will read the root `vercel.json` and auto-fill the project settings. Confirm the detected values match:
   - **Build Command:** `npm run build:frontend`
   - **Output Directory:** `apps/frontend/dist`
   - **Framework Preset:** Vite

5. Add Environment Variable (Project Settings → Environment Variables):
   ```
   VITE_API_URL=https://your-render-api.onrender.com
   ```
   (Replace with your Render backend URL from Step 2)

6. Click **Deploy**

### Via CLI (Alternative)

```bash
npm i -g vercel
cd apps/frontend
vercel
# Follow prompts, set root directory to current folder
```

---

## Step 4: Configure CORS

After your frontend is live, copy its public URL:

- Vercel example: `https://producer-tour.vercel.app`
- Render static example: `https://producer-tour-frontend.onrender.com`

1. Go to the Render dashboard
2. Open your `producer-tour-api` service
3. Go to the **Environment** tab
4. Update `CORS_ORIGIN` to the frontend URL you copied (no trailing slash)
5. Save changes (will trigger redeploy)

---

## Step 5: Test the Application

1. Visit your Vercel URL
2. Login with seed credentials:
   - **Admin:** admin@producertour.com / admin123
   - **Writer:** writer@example.com / writer123

3. Test statement upload (admin dashboard)
4. Verify writer can see earnings

---

## Cost Breakdown

### Free Tier (Development)
- **Render Web Service:** Free (spins down after inactivity)
- **Render PostgreSQL:** Free (90 days, then $7/mo or upgrade)
- **Vercel:** Free (hobby projects)
- **Total:** $0 initially

### Production Tier
- **Render Web Service:** $7/mo (Starter) or $25/mo (Standard)
- **Render PostgreSQL:** $7/mo (1GB) to $20/mo (10GB)
- **Vercel:** $0 (Pro at $20/mo if needed)
- **Total:** ~$14-32/mo

---

## Environment Variables Reference

### Backend (.env)
```bash
DATABASE_URL=postgresql://user:pass@host:5432/producer_tour
JWT_SECRET=your-super-secret-key-here
JWT_EXPIRES_IN=7d
NODE_ENV=production
PORT=3000
CORS_ORIGIN=https://your-frontend-domain
```

### Frontend (.env)
```bash
VITE_API_URL=https://your-backend.onrender.com
```

---

## Troubleshooting

### Database Connection Issues
```bash
# In Render shell
cd apps/backend
npx prisma db push
npx prisma db seed
```

### CORS Errors
- Ensure `CORS_ORIGIN` in backend matches your Vercel URL exactly
- Check for trailing slashes (remove them)

### Build Failures
- Check Render logs: Service → Logs tab
- Verify `package.json` scripts are correct
- Ensure Node version compatibility (18+)

### Migration Issues
```bash
# Reset database (CAUTION: deletes all data)
npx prisma migrate reset
npx prisma migrate deploy
```

---

## Custom Domain Setup

### Vercel
1. Go to Project Settings → Domains
2. Add your domain (e.g., `app.producertour.com`)
3. Configure DNS as instructed

### Render
1. Go to Service Settings → Custom Domain
2. Add your API domain (e.g., `api.producertour.com`)
3. Configure DNS A/CNAME records

---

## Monitoring

- **Render:** Built-in metrics and logs
- **Vercel:** Analytics tab for frontend performance
- **Prisma Studio:** `npx prisma studio` to view database

---

## Scaling

### Horizontal Scaling (More Users)
- Render: Upgrade to Standard plan ($25/mo)
- Database: Upgrade storage as needed
- Enable connection pooling in DATABASE_URL

### Vertical Scaling (More Resources)
- Render: Professional plan ($85/mo) for dedicated resources
- Database: Scale to 10GB+ plans

---

## Backups

### Database Backups
- Render Starter plan: 7-day backups included
- Download: Render Dashboard → Database → Backups tab

### Code Backups
- GitHub serves as version control backup
- Tag releases: `git tag v1.0.0 && git push --tags`
