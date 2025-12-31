import express, { Express, Request, Response } from 'express';
import { createServer } from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import fileUpload from 'express-fileupload';
import path from 'path';
import { initializeSocket } from './socket';

// Load environment variables
dotenv.config();

// Import game-related routes only
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import avatarRoutes from './routes/avatar.routes';
import gamificationRoutes from './routes/gamification.routes';
import chatRoutes from './routes/chat.routes';
import socialContactsRoutes from './routes/contacts.routes';
import profileRoutes from './routes/profile.routes';
import feedRoutes from './routes/feed.routes';
import notificationRoutes from './routes/notification.routes';
import pushRoutes from './routes/push.routes';
import settingsRoutes from './routes/settings.routes';
import serversRoutes from './routes/servers.routes';

// Import middleware
import { errorHandler } from './middleware/error.middleware';
import { notFoundHandler } from './middleware/notFound.middleware';
import { authLimiter, apiLimiter } from './middleware/rate-limit.middleware';

const app: Express = express();
const PORT = process.env.PORT || 3000;

// Trust proxy for rate limiting behind reverse proxy
app.set('trust proxy', 1);

// Security middleware - Helmet.js
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// CORS Configuration
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:3000',
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// File upload middleware
app.use(fileUpload({
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760') },
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

// Apply rate limiting
app.use('/api/', apiLimiter);

// Game API Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/avatar', avatarRoutes);
app.use('/api/gamification', gamificationRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/contacts', socialContactsRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/servers', serversRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Create HTTP server and initialize Socket.io
const httpServer = createServer(app);
const io = initializeSocket(httpServer);

// Start server
httpServer.listen(PORT, () => {
  console.log(`🎮 Game server running on http://localhost:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔌 Socket.io ready for multiplayer`);
});

export { io };
export default app;
