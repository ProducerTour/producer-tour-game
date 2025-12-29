/**
 * Test Setup File
 *
 * This file runs before all tests to set up the test environment.
 */

import { beforeAll, afterAll } from 'vitest';
import { prisma } from '../lib/prisma';
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

beforeAll(async () => {
  console.log('🧪 Setting up test environment...');

  // Ensure we're using a test database
  if (!process.env.DATABASE_URL?.includes('test')) {
    throw new Error('❌ DATABASE_URL must contain "test" to prevent accidental production database usage!');
  }

  // Connect to database
  await prisma.$connect();
  console.log('✅ Connected to test database');
});

afterAll(async () => {
  console.log('🧹 Cleaning up test environment...');

  // Disconnect from database
  await prisma.$disconnect();
  console.log('✅ Disconnected from test database');
});
