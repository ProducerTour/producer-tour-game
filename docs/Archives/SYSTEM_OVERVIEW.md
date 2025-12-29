# Producer Tour Platform — System Overview

This document explains how the codebase currently works, including the monorepo layout, key frontend/backend pieces, and the end‑to‑end workflow for uploading, processing, publishing, and paying out royalty statements. It also captures deployment details for Vercel (frontend) and Render (backend).

## Monorepo Layout

- Root `package.json`: npm workspaces for `apps/backend` and `apps/frontend` with shared scripts.
- `apps/frontend`: React 18 + Vite + Tailwind + React Router + TanStack Query + Axios + Zustand.
- `apps/backend`: Express + Prisma (Postgres) + JWT auth + express-fileupload; route modules by domain.

## Frontend

- Entry: `apps/frontend/src/main.tsx` sets up React Query and renders `App`.
- Routing: `apps/frontend/src/App.tsx` with public routes and `PrivateRoute` wrapper for authenticated views. Role-based gating chooses Admin vs Writer dashboard.
- Auth state: `apps/frontend/src/store/auth.store.ts` (Zustand + persist). Stores `{ user, token }` in localStorage. `logout()` clears token and user.
- API client: `apps/frontend/src/lib/api.ts`
  - Base URL: `${VITE_API_URL}/api` (from env).
  - Request interceptor injects `Authorization: Bearer <token>` for non-auth endpoints and sets JSON content-type when not using `FormData`.
  - Response interceptor redirects to `/login` on HTTP 401.
  - Exposes domain clients: `authApi`, `dashboardApi`, `statementApi`, `userApi`, `toolsApi` (Spotify), `placementApi`, `creditApi`, `proSubmissionApi`, `advanceScenarioApi`, `documentApi`, `commissionApi`.
- Dashboards:
  - Writer: `src/pages/WriterDashboard.tsx` shows earnings timeline, PRO revenue breakdown (Recharts), statements, documents, profile (IPI editing), and a payment status indicator.
  - Admin: `src/pages/AdminDashboard.tsx` aggregates stats, recent statements, users, analytics, documents, tools, and commission settings.
- Tools & Components:
  - Spotify track lookup: `src/components/SpotifyTrackLookup.tsx` uses backend `/api/tools/spotify/*` routes for search/ISRC and displays selectable results.
  - Public marketing pages: `src/pages/LandingPage.tsx` and `src/components/PublicNavigation.tsx` (light/dark theme toggle, carousel, CTAs).

## Backend

- Entry: `apps/backend/src/index.ts`
  - CORS allowlist for dev and prod domains (Vercel prod, custom domains, and Vercel preview hosts ending with `-producer-tour.vercel.app`).
  - File uploads via `express-fileupload` with size limit.
  - Static serving of `uploads`.
  - Routes mounted under `/api/*`:
    - Auth (`/auth`), Users (`/users`)
    - Statements (`/statements`), Dashboard (`/dashboard`)
    - Tools (`/tools`) incl. Spotify integration
    - Applications, Opportunities, Placements, Credits, PRO submissions, Advance scenarios, Documents, Commission
  - Error handling middleware + `/health` endpoint.
- Prisma schema (`apps/backend/prisma/schema.prisma`) models:
  - `User` with roles: `ADMIN`, `WRITER`, `LEGAL`, `MANAGER`, `PUBLISHER`, `STAFF`, `VIEWER`.
  - `Producer` (optional link to user with IPI and PRO affiliation).
  - `Statement` + `StatementItem` with `status`, `paymentStatus`, totals, and item visibility controls.
  - `Application`, `Opportunity`, `Consultation`, `Placement`, `Credit`, `ProSubmission`, `AdvanceScenario`, `Document`, `CommissionSettings`.
- Spotify integration: `src/services/spotify.service.ts` + `src/routes/tools.routes.ts` (enabled when `SPOTIFY_CLIENT_ID/SECRET` set).

## Statement Lifecycle (Upload → Assign → Publish → Pay)

This is the core workflow for royalty processing.

### 1) Upload & Parse

- UI: Admin Dashboard → Statements → Upload (CSV/TSV) + select `proType` (`BMI`, `ASCAP`, `SESAC`, `MLC`).
- Endpoint: `POST /api/statements/upload` (admin-only).
- Behavior:
  - Validates file type, writes to `uploads/statements`.
  - Parses file via `StatementParserFactory` (BMI/ASCAP/SESAC/MLC specific parsers).
  - Creates a `Statement` with:
    - `status = UPLOADED`
    - `totalRevenue`, `totalPerformances`
    - `metadata` containing `parsedItems`, `songs`, and `warnings`.

### 2) Assign Writers

- UI: “Review & Assign Writers” modal per statement:
  - Per-song you can add multiple assignments: `{ userId, writerIpiNumber?, publisherIpiNumber?, splitPercentage }`.
  - Supports bulk “Assign All” to one writer.
  - Split total doesn’t need to sum to 100% (warning shown but allowed).
- Endpoint: `POST /api/statements/:id/assign-writers` (admin-only).
- Behavior:
  - Validates input object.
  - Persists `writerAssignments` into `statement.metadata` keyed by song title.
  - Sets `status = PROCESSED`.
- Smart assist: `POST /api/statements/:id/smart-assign` (admin-only) suggests matches with confidence tiers to speed assignment.

### 3) Publish (Create Items + Apply Commission)

- UI: Admin clicks Publish after verifying all songs have at least one writer assignment.
- Endpoint: `POST /api/statements/:id/publish` (admin-only).
- Behavior:
  - Confirms every parsed song has ≥1 assignment; rejects if any are unassigned.
  - Loads active `CommissionSettings` for a global `commissionRate` and `recipientName`.
  - Loads per-user `commissionOverrideRate` for assigned writers, if any.
  - For each parsed item and each writer assignment:
    - `writerRevenue = item.revenue * (splitPercentage / 100)`
    - `commissionRate = userOverride ?? globalRate`
    - `commissionAmount = writerRevenue * (commissionRate / 100)`
    - `netRevenue = writerRevenue - commissionAmount`
    - Creates `StatementItem` with these fields, stores `writerIpiNumber`, `publisherIpiNumber` (metadata), and sets `isVisibleToWriter=false`.
  - Updates `Statement`:
    - `status = PUBLISHED`, `paymentStatus = UNPAID`, `publishedAt`, `publishedById`
    - Aggregates `totalCommission` and `totalNet`.

### 4) Payment Processing

- Admin views unpaid statements:
  - `GET /api/statements/unpaid` returns PUBLISHED statements with `paymentStatus` in `UNPAID|PENDING` and groups items by writer (gross, commission, net, counts).
  - `GET /api/statements/:id/payment-summary` returns a detailed per-writer breakdown for a specific statement.
- Mark a statement as paid:
  - Endpoint: `POST /api/statements/:id/process-payment` (admin-only).
  - Behavior:
    - Sets `paymentStatus = PAID`, `paymentProcessedAt`, `paymentProcessedById`.
    - Sets all related `StatementItem.isVisibleToWriter = true` and `paidAt` to unlock writer visibility.
    - Responds with confirmation including `totalPaidToWriters = totalNet` and `commissionToProducerTour = totalCommission`.

### Writer Visibility & Payment Status

- Writers only see PUBLISHED statements and only their own items:
  - `GET /api/statements` (writer role) filters to `status='PUBLISHED'` and items for `req.user.id`.
- Writer dashboard payment indicator: `GET /api/dashboard/payment-status` summarizes recent `PAID` date and counts of `UNPAID`/`PENDING` to show green/yellow/red status + message.

## Key Endpoints (by flow)

- Upload: `POST /api/statements/upload`
- Assign writers: `POST /api/statements/:id/assign-writers`
- Smart assign: `POST /api/statements/:id/smart-assign`
- Publish: `POST /api/statements/:id/publish`
- Unpaid list: `GET /api/statements/unpaid`
- Payment summary: `GET /api/statements/:id/payment-summary`
- Process payment: `POST /api/statements/:id/process-payment`
- Writer payment banner: `GET /api/dashboard/payment-status`

## Deployment

- Frontend (Vercel):
  - Root directory: `apps/frontend`
  - Build: `npm run build` (or workspace-targeted build)
  - Output: `apps/frontend/dist`
  - Env: `VITE_API_URL = https://<render-backend-host>`
  - SPA routing: `vercel.json` rewrites to `/index.html` (keep the one in the frontend app).
- Backend (Render):
  - Root directory: `apps/backend`
  - Build: `npm install && npm run build`
  - Start: `npm run start:render` (runs `prisma migrate deploy` then starts server)
  - Health check: `/health`
  - Important env vars:
    - `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`
    - `CORS_ORIGIN` is present but CORS uses an internal allowlist in code (see below)
    - Optional: `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET` (enable tools), `MAX_FILE_SIZE`, `UPLOAD_DIR`, SMTP, S3

### CORS

- Allowed origins include:
  - `http://localhost:5173`, `http://localhost:3000`
  - `https://website-frontend-producer-tour.vercel.app`
  - `https://producertour.com`, `https://www.producertour.com`
  - Any Vercel preview domain ending with `-producer-tour.vercel.app`
- If your Vercel custom domain differs, add it to `allowedOrigins` in `apps/backend/src/index.ts`.

### Storage

- Uploads are saved to disk in `uploads/` and served statically.
- For Render, attach persistent disk and set `UPLOAD_DIR` accordingly, or move to S3 (env keys already scaffolded).

## Environment Variables (common)

- Frontend: `apps/frontend/.env(.example)`
  - `VITE_API_URL` — backend base URL (no trailing slash).
- Backend: `apps/backend/.env(.example)`
  - `DATABASE_URL`, `NODE_ENV`, `PORT`, `CORS_ORIGIN`
  - `JWT_SECRET`, `JWT_EXPIRES_IN`
  - `MAX_FILE_SIZE`, `UPLOAD_DIR`
  - Optional SMTP and AWS S3 settings
  - `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET` (for tools)

## Local Development

- Start both apps from repo root: `npm run dev`
- Frontend only: `npm run dev --workspace=apps/frontend`
- Backend only: `npm run dev --workspace=apps/backend`
- Prisma: `npm run db:migrate --workspace=apps/backend`, `npm run db:studio --workspace=apps/backend`

## Notes & Gotchas

- Statement Items are hidden from writers (`isVisibleToWriter=false`) until payment is processed; publishing alone does not expose items.
- Commission precedence: per-user `commissionOverrideRate` overrides global `CommissionSettings` rate when present.
- Spotify endpoints return 503 with a helpful error unless `SPOTIFY_CLIENT_ID/SECRET` are set.
- `vercel.json` exists at repo root and in `apps/frontend`; keeping only the frontend copy avoids duplication.

