import express, { Express, Request, Response } from 'express';
import { createServer } from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import fileUpload from 'express-fileupload';
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';
import { initializeSocket } from './socket';

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
import settingsRoutes from './routes/settings.routes';
import paymentRoutes from './routes/payment.routes';
import payoutRoutes from './routes/payout.routes';
import placementDealRoutes from './routes/placement-deal.routes';
import audioDBRoutes from './routes/audiodb.routes';
import workRegistrationRoutes from './routes/work-registration.routes';
import creditSuggestionsRoutes from './routes/creditSuggestions.routes';
import gamificationRoutes from './routes/gamification.routes';
import spotifyRoutes from './routes/spotify.routes';
import chatRoutes from './routes/chat.routes';
import socialContactsRoutes from './routes/contacts.routes';
import businessContactsRoutes from './routes/business-contacts.routes';
import profileRoutes from './routes/profile.routes';
import youtubeRoutes from './routes/youtube.routes';
import shopRoutes from './routes/shop.routes';
import sessionPayoutRoutes from './routes/session-payout.routes';
import toolPermissionsRoutes from './routes/tool-permissions.routes';
import invoiceRoutes from './routes/invoice.routes';
import insightsRoutes from './routes/insights.routes';
import feedRoutes from './routes/feed.routes';
import marketplaceRoutes from './routes/marketplace.routes';
import pushRoutes from './routes/push.routes';
import notificationRoutes from './routes/notification.routes';
import leakScannerRoutes from './routes/leak-scanner.routes';
import productivityRoutes from './routes/productivity.routes';
import audioRoutes from './routes/audio.routes';
import aiRoutes from './routes/ai.routes';

// Import middleware
import { errorHandler } from './middleware/error.middleware';
import { notFoundHandler } from './middleware/notFound.middleware';
import { authLimiter, apiLimiter } from './middleware/rate-limit.middleware';

// Import startup service
import { runStartupTasks } from './services/startup.service';
console.log('[Init] Startup service imported successfully');

const app: Express = express();
const PORT = process.env.PORT || 3000;

// Trust proxy - Required for rate limiting and security when behind Render/Vercel reverse proxy
// Set to 1 to trust only the first proxy hop (Render's load balancer)
// This prevents IP spoofing while allowing proper client IP detection
app.set('trust proxy', 1);

// Security middleware - Helmet.js
// Sets various HTTP headers to help protect against common web vulnerabilities
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for Swagger UI
      scriptSrc: ["'self'", "'unsafe-inline'"], // Allow inline scripts for Swagger UI
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false, // Disable to allow embedding
  hsts: {
    maxAge: 31536000, // 1 year in seconds
    includeSubDomains: true,
    preload: true
  }
}));

// Middleware - CORS Configuration
const allowedOrigins = [
  'http://localhost:5173', // Local development
  'http://localhost:5174', // Local development (alternate port)
  'http://localhost:3000',  // Local backend
  'https://website-frontend-producer-tour.vercel.app', // Vercel production domain
  'https://producertour.com', // Custom domain
  'https://www.producertour.com', // Custom domain with www
];

app.use(cors({
  origin: (origin, callback) => {
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

app.use(express.json({ limit: '10mb' })); // Increased for base64 image uploads
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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

// API Documentation (Swagger)
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Producer Tour API Docs'
}));

// Apply general API rate limiting to all /api/* routes
app.use('/api/', apiLimiter);

// API Routes with specific rate limiting
app.use('/api/auth', authLimiter, authRoutes);
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
app.use('/api/commission', commissionRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/payouts', payoutRoutes);
app.use('/api/placement-deals', placementDealRoutes);
app.use('/api/audiodb', audioDBRoutes);
app.use('/api/work-registration', workRegistrationRoutes);
app.use('/api/credit-suggestions', creditSuggestionsRoutes);
app.use('/api/gamification', gamificationRoutes);
app.use('/api/spotify', spotifyRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/contacts', businessContactsRoutes); // Business contacts directory (labels, publishers, etc.)
app.use('/api/social-contacts', socialContactsRoutes); // Social contacts (user friends)
app.use('/api/profile', profileRoutes);
app.use('/api/youtube', youtubeRoutes);
app.use('/api/shop', shopRoutes);
app.use('/api/session-payouts', sessionPayoutRoutes);
app.use('/api/tool-permissions', toolPermissionsRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/insights', insightsRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/push', pushRoutes); // Web Push notifications
app.use('/api/notifications', notificationRoutes); // In-app notifications
app.use('/api/leak-scanner', leakScannerRoutes); // Leak Scanner - metadata health scoring
app.use('/api/productivity', productivityRoutes); // Productivity dashboard widgets
app.use('/api/audio', audioRoutes); // Audio streaming proxy for ambient sounds/music
app.use('/api/ai', aiRoutes); // AI-powered legal tools and contract analysis

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Create HTTP server and initialize Socket.io
const httpServer = createServer(app);
const io = initializeSocket(httpServer);

// Start server
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 CORS enabled for: ${process.env.CORS_ORIGIN}`);
  console.log(`🔌 Socket.io ready for connections`);

  // Run startup tasks (backfill credits, etc.) - use .then/.catch for better logging
  console.log('[Init] About to run startup tasks...');
  runStartupTasks()
    .then(() => {
      console.log('[Init] Startup tasks promise resolved');
    })
    .catch((err) => {
      console.error('[Init] Startup tasks failed:', err);
    });
});

export { io };
export default app;
