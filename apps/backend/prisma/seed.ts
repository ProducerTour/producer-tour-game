import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@producertour.com' },
    update: {},
    create: {
      email: 'admin@producertour.com',
      password: adminPassword,
      role: 'ADMIN',
      firstName: 'Admin',
      lastName: 'User',
    },
  });
  console.log('✅ Created admin user:', admin.email);

  // Create sample writer user
  const writerPassword = await bcrypt.hash('writer123', 10);
  const writer = await prisma.user.upsert({
    where: { email: 'writer@example.com' },
    update: {},
    create: {
      email: 'writer@example.com',
      password: writerPassword,
      role: 'WRITER',
      firstName: 'John',
      lastName: 'Producer',
      producer: {
        create: {
          producerName: 'John Producer',
          proAffiliation: 'BMI',
          ipiNumber: '123456789',
          status: 'active',
        },
      },
    },
  });
  console.log('✅ Created writer user:', writer.email);

  // Create sample opportunities
  const opportunities = await prisma.opportunity.createMany({
    data: [
      {
        title: 'Hip-Hop Beat for Major Artist',
        brief: 'Looking for dark, atmospheric hip-hop production for upcoming album project. Must have commercial appeal and radio-ready quality.',
        genres: JSON.stringify(['Hip-Hop', 'Trap']),
        budget: '$5,000 - $10,000',
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        status: 'OPEN',
        priority: 'HIGH',
        tags: JSON.stringify(['urgent', 'major-label', 'placement']),
      },
      {
        title: 'Pop Production for Indie Artist',
        brief: 'Indie pop artist seeking upbeat, catchy production for summer release. Looking for fresh, modern sound.',
        genres: JSON.stringify(['Pop', 'Indie']),
        budget: '$2,000 - $3,000',
        deadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 45 days
        status: 'OPEN',
        priority: 'MEDIUM',
        tags: JSON.stringify(['indie', 'summer', 'commercial']),
      },
    ],
  });
  console.log('✅ Created sample opportunities:', opportunities.count);

  console.log('✨ Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
