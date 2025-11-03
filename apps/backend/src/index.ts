import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fileUpload from 'express-fileupload';
import path from 'path';

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import statementRoutes from './routes/statement.routes';
import dashboardRoutes from './routes/dashboard.routes';
import toolsRoutes from './routes/tools.routes';
import opportunityRoutes from './routes/opportunity.routes';
import applicationRoutes from './routes/application.routes';
import placementsRoutes from './routes/placements.routes';
import creditsRoutes from './routes/credits.routes';
import proSubmissionsRoutes from './routes/pro-submissions.routes';
import advanceScenariosRoutes from './routes/advance-scenarios.routes';
import documentsRoutes from './routes/documents.routes';
import commissionRoutes from './routes/commission.routes';

// Import middleware
import { errorHandler } from './middleware/error.middleware';
import { notFoundHandler } from './middleware/notFound.middleware';

const app: Express = express();
const PORT = process.env.PORT || 3000;

// Middleware - CORS Configuration
const allowedOrigins = [
  'http://localhost:5173', // Local development
  'http://localhost:3000',  // Local backend
  'https://website-frontend-producer-tour.vercel.app', // Main production domain
];

app.use(cors({
  origin: (origin, callback) => {
    console.log('CORS Check:');
    console.log('Request Origin:', origin);
    console.log('Allowed Static Origins:', allowedOrigins);

    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) {
      return callback(null, true);
    }

    // Allow static origins
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Allow Vercel preview deployments
    if (origin.endsWith('-producer-tour.vercel.app')) {
      return callback(null, true);
    }

    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// File upload middleware
app.use(fileUpload({
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760') }, // 10MB default
  abortOnLimit: true,
  createParentPath: true,
}));

// Static file serving for uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/statements', statementRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/tools', toolsRoutes);
app.use('/api/opportunities', opportunityRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/placements', placementsRoutes);
app.use('/api/credits', creditsRoutes);
app.use('/api/pro-submissions', proSubmissionsRoutes);
app.use('/api/advance-scenarios', advanceScenariosRoutes);
app.use('/api/documents', documentsRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 CORS enabled for: ${process.env.CORS_ORIGIN}`);
});

export default app;
