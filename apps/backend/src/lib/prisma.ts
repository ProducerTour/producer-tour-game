import { PrismaClient } from '../generated/client';

// Singleton pattern for Prisma Client to prevent connection exhaustion
// This ensures only ONE instance of PrismaClient is created across the entire app
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// Configure Prisma with optimized settings for production
// Connection pool settings are controlled via DATABASE_URL query params:
// ?connection_limit=10&pool_timeout=30
export const prisma = global.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  // Transaction settings for large operations
  transactionOptions: {
    maxWait: 10000,    // 10s max wait to acquire connection
    timeout: 120000,   // 2 min timeout for large transactions (statement publishing)
    isolationLevel: 'ReadCommitted', // Prevent dirty reads while allowing concurrent access
  },
});

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

// Graceful shutdown - properly close all connections
const shutdown = async () => {
  console.log('🔌 Closing database connections...');
  await prisma.$disconnect();
  console.log('✅ Database connections closed');
};

process.on('beforeExit', shutdown);
process.on('SIGINT', async () => {
  await shutdown();
  process.exit(0);
});
process.on('SIGTERM', async () => {
  await shutdown();
  process.exit(0);
});
