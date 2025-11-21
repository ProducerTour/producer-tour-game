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

  // Seed Gamification Rewards
  const rewards = [
    // Commission Reduction Rewards (WRITER only)
    {
      name: '5% Commission Reduction',
      description: 'Reduce your commission rate by 5% on your next payout. Stack up to 3 for maximum savings!',
      cost: 500,
      category: 'COMMISSION',
      type: 'COMMISSION_REDUCTION',
      roleRestriction: 'WRITER',
      tierRestriction: null,
      details: { percentage: 5, applies_to: 'single_payout', stackable: true, maxStack: 3 },
    },
    {
      name: '10% Commission Reduction',
      description: 'Premium commission reduction - save 10% on your next payout. Elite tier exclusive!',
      cost: 1500,
      category: 'COMMISSION',
      type: 'COMMISSION_REDUCTION',
      roleRestriction: 'WRITER',
      tierRestriction: 'ELITE',
      details: { percentage: 10, applies_to: 'single_payout', stackable: false },
    },
    {
      name: 'Zero-Fee Payout',
      description: 'Get one payout with 0% commission taken. The ultimate reward for top performers!',
      cost: 5000,
      category: 'COMMISSION',
      type: 'ZERO_FEE_PAYOUT',
      roleRestriction: 'WRITER',
      tierRestriction: 'DIAMOND',
      details: { percentage: 100, applies_to: 'single_payout' },
    },

    // Payout Rewards
    {
      name: 'Priority Payout',
      description: 'Jump to the front of the payout queue. Get your money faster!',
      cost: 300,
      category: 'PAYOUT',
      type: 'PRIORITY_PAYOUT',
      roleRestriction: 'WRITER',
      tierRestriction: null,
      details: { priority_level: 'high' },
    },
    {
      name: 'Early Statement Access',
      description: 'Get access to your statements 48 hours before general release.',
      cost: 200,
      category: 'PAYOUT',
      type: 'EARLY_STATEMENT_ACCESS',
      roleRestriction: 'WRITER',
      tierRestriction: 'SILVER',
      details: { hours_early: 48 },
    },

    // Platform Rewards
    {
      name: 'Featured Placement Opportunity',
      description: 'Get featured in our next placement opportunity email blast to A&Rs and labels.',
      cost: 2000,
      category: 'PLATFORM',
      type: 'FEATURED_PLACEMENT',
      roleRestriction: 'WRITER',
      tierRestriction: 'GOLD',
      details: { duration_days: 30, visibility: 'featured' },
      inventory: 5, // Limited to 5 per month
    },
    {
      name: 'Priority Pitch Access',
      description: 'Get early access to submit for high-profile placement opportunities before others.',
      cost: 750,
      category: 'PLATFORM',
      type: 'PRIORITY_PITCH',
      roleRestriction: 'WRITER',
      tierRestriction: 'SILVER',
      details: { duration_days: 30 },
    },
    {
      name: 'Custom Profile Badge',
      description: 'Unlock a unique badge to display on your profile. Show off your achievements!',
      cost: 250,
      category: 'PLATFORM',
      type: 'CUSTOM_BADGE',
      roleRestriction: null, // Available to all
      tierRestriction: null,
      details: { badge_type: 'custom', customizable: true },
    },
    {
      name: 'Verified Producer Badge',
      description: 'Get the verified checkmark on your profile. Builds trust with collaborators.',
      cost: 1000,
      category: 'PLATFORM',
      type: 'VERIFIED_BADGE',
      roleRestriction: 'WRITER',
      tierRestriction: 'GOLD',
      details: { badge_type: 'verified', permanent: true },
    },

    // Subscription Credits
    {
      name: '$10 Platform Credit',
      description: 'Get $10 credit towards any platform services or future subscriptions.',
      cost: 1000,
      category: 'SUBSCRIPTION',
      type: 'PLATFORM_CREDIT',
      roleRestriction: null,
      tierRestriction: null,
      details: { credit_amount: 10, currency: 'USD' },
    },
    {
      name: '$25 Platform Credit',
      description: 'Get $25 credit towards any platform services. Better value!',
      cost: 2250,
      category: 'SUBSCRIPTION',
      type: 'PLATFORM_CREDIT',
      roleRestriction: null,
      tierRestriction: 'SILVER',
      details: { credit_amount: 25, currency: 'USD' },
    },

    // Physical/Experience Rewards
    {
      name: 'Producer Tour Merch Pack',
      description: 'Exclusive Producer Tour branded merchandise including t-shirt and stickers.',
      cost: 1500,
      category: 'PHYSICAL',
      type: 'MERCH_PACK',
      roleRestriction: null,
      tierRestriction: null,
      details: { items: ['t-shirt', 'stickers', 'lanyard'] },
      inventory: 50,
    },
    {
      name: 'Virtual Networking Event Access',
      description: 'Exclusive invite to our quarterly virtual networking event with industry professionals.',
      cost: 500,
      category: 'PHYSICAL',
      type: 'NETWORKING_EVENT',
      roleRestriction: null,
      tierRestriction: 'BRONZE',
      details: { event_type: 'virtual', frequency: 'quarterly' },
    },
    {
      name: 'In-Person Industry Mixer',
      description: 'VIP access to exclusive in-person industry mixer events in major cities.',
      cost: 3000,
      category: 'PHYSICAL',
      type: 'NETWORKING_EVENT',
      roleRestriction: null,
      tierRestriction: 'DIAMOND',
      details: { event_type: 'in_person', includes: ['drinks', 'networking', 'panel'] },
      inventory: 20,
    },
  ];

  for (const reward of rewards) {
    await prisma.reward.upsert({
      where: { id: reward.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') },
      update: {},
      create: {
        id: reward.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        name: reward.name,
        description: reward.description,
        cost: reward.cost,
        category: reward.category as any,
        type: reward.type,
        roleRestriction: reward.roleRestriction,
        tierRestriction: reward.tierRestriction as any,
        details: reward.details,
        inventory: reward.inventory ?? null,
        isActive: true,
      },
    });
  }
  console.log('✅ Created gamification rewards:', rewards.length);

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
