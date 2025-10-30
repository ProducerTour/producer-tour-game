# Getting Started with Producer Tour React Platform

## Quick Start (Local Development)

### Prerequisites

Ensure you have installed:
- **Node.js** 18+ ([Download](https://nodejs.org))
- **PostgreSQL** 14+ ([Download](https://www.postgresql.org/download/))
- **npm** or **pnpm**

### 1. Install Dependencies

```bash
cd producer-tour-react
npm install
```

This installs dependencies for both frontend and backend using workspaces.

### 2. Set Up Database

```bash
# Create PostgreSQL database
createdb producer_tour

# Or using psql:
psql -U postgres
CREATE DATABASE producer_tour;
\q
```

### 3. Configure Environment Variables

```bash
# Backend
cp apps/backend/.env.example apps/backend/.env
# Edit apps/backend/.env and set your DATABASE_URL:
# DATABASE_URL="postgresql://user:password@localhost:5432/producer_tour"

# Frontend
cp apps/frontend/.env.example apps/frontend/.env
# Default is fine for local dev
```

### 4. Run Database Migrations

```bash
cd apps/backend
npx prisma migrate dev
npx prisma db seed
```

This creates all tables and seeds initial data:
- Admin user: `admin@producertour.com` / `admin123`
- Writer user: `writer@example.com` / `writer123`

### 5. Start Development Servers

```bash
# From root directory
npm run dev
```

This starts both:
- **Backend API:** http://localhost:3000
- **Frontend:** http://localhost:5173

### 6. Open Your Browser

Navigate to http://localhost:5173 and login with:
- **Admin:** admin@producertour.com / admin123
- **Writer:** writer@example.com / writer123

---

## Project Structure

```
producer-tour-react/
├── apps/
│   ├── backend/              # Node.js API
│   │   ├── src/
│   │   │   ├── index.ts      # Express server entry
│   │   │   ├── routes/       # API endpoints
│   │   │   │   ├── auth.routes.ts
│   │   │   │   ├── statement.routes.ts
│   │   │   │   ├── dashboard.routes.ts
│   │   │   │   ├── user.routes.ts
│   │   │   │   ├── tools.routes.ts
│   │   │   │   ├── opportunity.routes.ts
│   │   │   │   └── application.routes.ts
│   │   │   ├── parsers/      # Statement parsers
│   │   │   │   ├── bmi.parser.ts
│   │   │   │   ├── ascap.parser.ts
│   │   │   │   └── utils.ts
│   │   │   ├── middleware/   # Auth, error handling
│   │   │   └── utils/
│   │   ├── prisma/
│   │   │   ├── schema.prisma # Database schema
│   │   │   └── seed.ts       # Seed data
│   │   ├── uploads/          # File storage (gitignored)
│   │   └── package.json
│   │
│   └── frontend/             # React app
│       ├── src/
│       │   ├── main.tsx      # App entry point
│       │   ├── App.tsx       # Router setup
│       │   ├── pages/        # Page components
│       │   │   ├── LoginPage.tsx
│       │   │   ├── WriterDashboard.tsx
│       │   │   ├── AdminDashboard.tsx
│       │   │   ├── OpportunitiesPage.tsx
│       │   │   └── ApplicationPage.tsx
│       │   ├── components/   # Reusable components
│       │   ├── lib/
│       │   │   └── api.ts    # API client (axios)
│       │   ├── store/
│       │   │   └── auth.store.ts  # Zustand auth state
│       │   └── index.css     # Tailwind styles
│       └── package.json
│
├── package.json              # Root workspace config
├── README.md
├── DEPLOYMENT.md             # Render + Vercel guide
├── MIGRATION.md              # WordPress migration guide
└── GETTING_STARTED.md        # This file
```

---

## Development Workflow

### Backend Development

```bash
# Start backend only
npm run backend

# Watch mode (auto-restart on changes)
cd apps/backend
npm run dev

# Database operations
npm run db:studio      # Open Prisma Studio (GUI)
npm run db:migrate     # Create new migration
npm run db:generate    # Regenerate Prisma client
npm run db:seed        # Re-run seed data

# Type checking
npm run typecheck
```

### Frontend Development

```bash
# Start frontend only
npm run frontend

# Build for production
cd apps/frontend
npm run build
npm run preview   # Preview production build

# Type checking
npm run typecheck
```

### Full Stack Development

```bash
# Start both servers simultaneously
npm run dev
```

---

## Testing Statement Parsers

### 1. Prepare Test CSV Files

**BMI Format Example** (`test-bmi.csv`):
```csv
Title Name,Royalty Amount,Performances
"Song Title 1",125.50,10
"Song Title 2",89.25,5
```

**ASCAP Format Example** (`test-ascap.csv`):
```csv
Work Title,Amount,Writer Name,Performances
"Song Title 1",125.50,"John Writer",10
"Song Title 2",89.25,"Jane Writer",5
```

### 2. Upload via API

```bash
# Login and get token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@producertour.com","password":"admin123"}'

# Upload statement
curl -X POST http://localhost:3000/api/statements/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "statement=@test-bmi.csv" \
  -F "proType=BMI"
```

### 3. Or Use Admin Dashboard

1. Login as admin
2. Navigate to Statements section
3. Click "Upload Statement"
4. Select PRO type
5. Choose CSV file
6. View parsed results

---

## API Endpoints Reference

### Authentication
```
POST   /api/auth/login          # Login
POST   /api/auth/register       # Register new user
GET    /api/auth/me             # Get current user
```

### Statements
```
GET    /api/statements          # List statements
POST   /api/statements/upload   # Upload & parse CSV
GET    /api/statements/:id      # Get statement details
POST   /api/statements/:id/publish   # Publish to writers
DELETE /api/statements/:id      # Delete statement
```

### Dashboard
```
GET    /api/dashboard/summary   # Earnings summary
GET    /api/dashboard/songs     # User's songs
GET    /api/dashboard/timeline  # Monthly earnings
GET    /api/dashboard/stats     # Admin stats
```

### Users (Admin only)
```
GET    /api/users               # List users
POST   /api/users               # Create writer
PUT    /api/users/:id           # Update user
DELETE /api/users/:id           # Delete user
```

### Opportunities
```
GET    /api/opportunities       # List opportunities
POST   /api/opportunities       # Create (admin)
PUT    /api/opportunities/:id   # Update (admin)
DELETE /api/opportunities/:id   # Delete (admin)
```

### Applications
```
POST   /api/applications        # Submit application
GET    /api/applications        # List (admin)
PUT    /api/applications/:id    # Update (admin)
```

### Tools
```
POST   /api/tools/publishing-simulator   # Calculate deal
```

---

## Database Management

### Prisma Studio (GUI)

```bash
npm run db:studio
```

Opens at http://localhost:5555 - visual database browser.

### Creating Migrations

```bash
# After modifying prisma/schema.prisma:
npm run db:migrate
# Enter migration name when prompted
```

### Resetting Database

```bash
cd apps/backend
npx prisma migrate reset
# This drops all tables and re-runs migrations + seed
```

### Backup Database

```bash
pg_dump -U postgres producer_tour > backup.sql
```

### Restore Database

```bash
psql -U postgres producer_tour < backup.sql
```

---

## Environment Variables

### Backend (`apps/backend/.env`)

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/producer_tour` |
| `JWT_SECRET` | Secret for JWT tokens | `your-secret-key-here` |
| `JWT_EXPIRES_IN` | Token expiration | `7d` |
| `NODE_ENV` | Environment | `development` or `production` |
| `PORT` | API server port | `3000` |
| `CORS_ORIGIN` | Allowed origin | `http://localhost:5173` |

### Frontend (`apps/frontend/.env`)

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `http://localhost:3000` |

---

## Troubleshooting

### Port Already in Use

```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Kill process on port 5173
lsof -ti:5173 | xargs kill -9
```

### Database Connection Error

```bash
# Check PostgreSQL is running
pg_isready

# If not, start it:
# macOS (Homebrew):
brew services start postgresql

# Linux (systemd):
sudo systemctl start postgresql
```

### Prisma Client Not Generated

```bash
cd apps/backend
npx prisma generate
```

### CORS Errors

Ensure `CORS_ORIGIN` in backend `.env` matches your frontend URL exactly.

### Build Errors

```bash
# Clear node_modules and reinstall
rm -rf node_modules apps/*/node_modules
npm install
```

---

## Next Steps

1. **Customize the UI** - Edit Tailwind config and components
2. **Add features** - Statement assignment UI, bulk uploads, analytics charts
3. **Implement email** - Welcome emails, password resets, notifications
4. **Add tests** - Jest for backend, Vitest for frontend
5. **Set up CI/CD** - GitHub Actions for automated testing/deployment
6. **Deploy** - Follow [DEPLOYMENT.md](./DEPLOYMENT.md)

---

## Useful Commands

```bash
# Install new package (backend)
npm install --workspace=apps/backend package-name

# Install new package (frontend)
npm install --workspace=apps/frontend package-name

# Run type checking on all workspaces
npm run typecheck

# Format code (if prettier is configured)
npm run format

# Lint code (if eslint is configured)
npm run lint
```

---

## Resources

- **Prisma Docs:** https://www.prisma.io/docs
- **React Query:** https://tanstack.com/query/latest
- **Zustand:** https://github.com/pmndrs/zustand
- **Tailwind CSS:** https://tailwindcss.com
- **Express:** https://expressjs.com
- **TypeScript:** https://www.typescriptlang.org

---

## Getting Help

- Check existing issues in the repo
- Review the codebase comments
- Consult the migration guide for WordPress-specific questions
- Test with small datasets before production use
