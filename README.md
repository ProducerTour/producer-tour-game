# Producer Tour Platform

Modern music publishing royalty management platform built with React and Node.js.

## Features

- 📊 **Statement Processing** - Parse and process BMI, ASCAP, SESAC statements
- 👥 **Multi-Role Dashboards** - Admin, Writer, and Legal portals
- 💰 **Income Tracking** - Real-time royalty aggregation and reporting
- 📝 **Publishing Tools** - Deal simulator, contracts, split sheets
- 🎯 **Opportunities Portal** - Live briefs and applications
- 📈 **Analytics** - Comprehensive reporting and insights

## Tech Stack

### Frontend
- React 18 + TypeScript
- Vite (build tool)
- TanStack Query (data fetching)
- Zustand (state management)
- Tailwind CSS (styling)
- Recharts (analytics)

### Backend
- Node.js + Express
- TypeScript
- Prisma ORM
- PostgreSQL
- JWT Authentication
- Multer (file uploads)

### Deployment
- **Frontend:** Vercel
- **Backend + Database:** Render.com

## Project Structure

```
producer-tour-react/
├── apps/
│   ├── backend/          # Node.js API
│   │   ├── src/
│   │   │   ├── routes/   # API endpoints
│   │   │   ├── services/ # Business logic
│   │   │   ├── parsers/  # Statement parsers
│   │   │   ├── middleware/
│   │   │   └── utils/
│   │   ├── prisma/       # Database schema
│   │   └── package.json
│   └── frontend/         # React app
│       ├── src/
│       │   ├── components/
│       │   ├── pages/
│       │   ├── hooks/
│       │   ├── store/
│       │   └── lib/
│       └── package.json
└── package.json          # Root workspace
```

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm or pnpm

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env

# Configure database connection in apps/backend/.env
# DATABASE_URL="postgresql://user:password@localhost:5432/producer_tour"

# Run database migrations
npm run db:migrate

# Start development servers (both frontend and backend)
npm run dev
```

### Development URLs
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- Prisma Studio: http://localhost:5555 (run `npm run db:studio`)

## Deployment

### Backend (Render.com)

1. Create a new Web Service
2. Connect your GitHub repository
3. Build Command: `cd apps/backend && npm install && npm run build`
4. Start Command: `cd apps/backend && npm start`
5. Add environment variables:
   - `DATABASE_URL` (from Render PostgreSQL)
   - `JWT_SECRET`
   - `NODE_ENV=production`

### Frontend (Vercel)

1. Import project from GitHub
2. Framework: Vite
3. Root Directory: `apps/frontend`
4. Build Command: `npm run build`
5. Output Directory: `dist`
6. Environment Variables:
   - `VITE_API_URL` (your Render backend URL)

### Database (Render.com)

1. Create a PostgreSQL database
2. Copy connection string to `DATABASE_URL`
3. Run migrations: `npm run db:migrate`

## Migration from WordPress

See [MIGRATION.md](./MIGRATION.md) for detailed instructions on migrating data from the WordPress version.

## Scripts

```bash
# Development
npm run dev              # Start both frontend and backend
npm run frontend         # Start only frontend
npm run backend          # Start only backend

# Database
npm run db:migrate       # Run Prisma migrations
npm run db:generate      # Generate Prisma client
npm run db:studio        # Open Prisma Studio

# Build
npm run build            # Build both apps
npm run typecheck        # Type check all workspaces
```

## Environment Variables

### Backend (.env)
```
DATABASE_URL=postgresql://user:password@localhost:5432/producer_tour
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=7d
NODE_ENV=development
PORT=3000
CORS_ORIGIN=http://localhost:5173
AWS_S3_BUCKET=producer-tour-statements
AWS_REGION=us-east-1
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:3000
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License - see LICENSE file for details
