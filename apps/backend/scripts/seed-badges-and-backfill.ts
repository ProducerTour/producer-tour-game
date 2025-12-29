/**
 * Seed Badges & Profile Borders and Backfill to Users
 *
 * This script:
 * 1. Creates badges linked to achievements
 * 2. Creates profile borders for tier milestones
 * 3. Backfills badges/borders to users who already earned achievements
 */

import { PrismaClient } from '../src/generated/client';

const prisma = new PrismaClient();

// Badge definitions linked to achievements
const BADGES = [
  // Getting Started
  {
    name: 'Profile Pioneer',
    description: 'Completed your profile setup',
    imageUrl: '/badges/profile-pioneer.svg',
    rarity: 'COMMON' as const,
    category: 'getting_started',
    achievementName: 'Profile Pioneer',
  },
  {
    name: 'Payment Ready',
    description: 'Connected your Stripe account',
    imageUrl: '/badges/payment-ready.svg',
    rarity: 'COMMON' as const,
    category: 'getting_started',
    achievementName: 'Payment Ready',
  },
  {
    name: 'First Steps',
    description: 'Submitted your first work',
    imageUrl: '/badges/first-steps.svg',
    rarity: 'COMMON' as const,
    category: 'getting_started',
    achievementName: 'First Steps',
  },

  // Engagement
  {
    name: 'Week Warrior',
    description: 'Checked in 7 days in a row',
    imageUrl: '/badges/week-warrior.svg',
    rarity: 'RARE' as const,
    category: 'engagement',
    achievementName: 'Week Warrior',
  },
  {
    name: 'Monthly Master',
    description: 'Checked in 30 days in a row',
    imageUrl: '/badges/monthly-master.svg',
    rarity: 'EPIC' as const,
    category: 'engagement',
    achievementName: 'Monthly Master',
  },
  {
    name: 'Social Butterfly',
    description: 'Shared on social media',
    imageUrl: '/badges/social-butterfly.svg',
    rarity: 'COMMON' as const,
    category: 'engagement',
    achievementName: 'Social Butterfly',
  },

  // Growth
  {
    name: 'Recruiter',
    description: 'Referred your first user',
    imageUrl: '/badges/recruiter.svg',
    rarity: 'RARE' as const,
    category: 'growth',
    achievementName: 'Recruiter',
  },
  {
    name: 'Network Builder',
    description: 'Referred 5 users',
    imageUrl: '/badges/network-builder.svg',
    rarity: 'EPIC' as const,
    category: 'growth',
    achievementName: 'Network Builder',
  },

  // Tier badges
  {
    name: 'Silver Status',
    description: 'Reached Silver tier',
    imageUrl: '/badges/silver-tier.svg',
    rarity: 'RARE' as const,
    category: 'tier',
    achievementName: 'Silver Status',
  },
  {
    name: 'Gold Standard',
    description: 'Reached Gold tier',
    imageUrl: '/badges/gold-tier.svg',
    rarity: 'EPIC' as const,
    category: 'tier',
    achievementName: 'Gold Standard',
  },
  {
    name: 'Diamond Dynasty',
    description: 'Reached Diamond tier',
    imageUrl: '/badges/diamond-tier.svg',
    rarity: 'LEGENDARY' as const,
    category: 'tier',
    achievementName: 'Diamond Dynasty',
  },
  {
    name: 'Elite Excellence',
    description: 'Reached Elite tier',
    imageUrl: '/badges/elite-tier.svg',
    rarity: 'LEGENDARY' as const,
    category: 'tier',
    achievementName: 'Elite Excellence',
  },

  // Revenue milestones
  {
    name: 'First Earnings',
    description: 'Earned your first $100',
    imageUrl: '/badges/first-earnings.svg',
    rarity: 'COMMON' as const,
    category: 'revenue',
    achievementName: 'First Earnings',
  },
  {
    name: 'Rising Star',
    description: 'Earned $1,000 in royalties',
    imageUrl: '/badges/rising-star.svg',
    rarity: 'RARE' as const,
    category: 'revenue',
    achievementName: 'Rising Star',
  },
  {
    name: 'High Roller',
    description: 'Earned $10,000 in royalties',
    imageUrl: '/badges/high-roller.svg',
    rarity: 'EPIC' as const,
    category: 'revenue',
    achievementName: 'High Roller',
  },
  {
    name: 'Six Figure Club',
    description: 'Earned $100,000 in royalties',
    imageUrl: '/badges/six-figure.svg',
    rarity: 'LEGENDARY' as const,
    category: 'revenue',
    achievementName: 'Six Figure Club',
  },

  // Community
  {
    name: 'Helping Hand',
    description: 'Submitted feedback or reported a bug',
    imageUrl: '/badges/helping-hand.svg',
    rarity: 'COMMON' as const,
    category: 'community',
    achievementName: 'Helping Hand',
  },
  {
    name: 'Bug Hunter',
    description: 'Reported 5 bugs or issues',
    imageUrl: '/badges/bug-hunter.svg',
    rarity: 'RARE' as const,
    category: 'community',
    achievementName: 'Bug Hunter',
  },
];

// Profile borders for tier milestones
const BORDERS = [
  {
    name: 'Bronze Glow',
    tier: 'BRONZE',
    colors: ['#CD7F32', '#A0522D'],
    spinSpeed: 4,
    glowIntensity: 0.5,
    specialEffect: null,
    achievementName: null, // Default for everyone
  },
  {
    name: 'Silver Shimmer',
    tier: 'SILVER',
    colors: ['#C0C0C0', '#A8A8A8', '#D3D3D3'],
    spinSpeed: 5,
    glowIntensity: 0.7,
    specialEffect: 'shimmer',
    achievementName: 'Silver Status',
  },
  {
    name: 'Gold Radiance',
    tier: 'GOLD',
    colors: ['#FFD700', '#FFA500', '#FFE55C'],
    spinSpeed: 6,
    glowIntensity: 0.9,
    specialEffect: 'pulse',
    achievementName: 'Gold Standard',
  },
  {
    name: 'Diamond Brilliance',
    tier: 'DIAMOND',
    colors: ['#B9F2FF', '#00BFFF', '#87CEEB', '#E0FFFF'],
    spinSpeed: 7,
    glowIntensity: 1.2,
    specialEffect: 'sparkle',
    achievementName: 'Diamond Dynasty',
  },
  {
    name: 'Elite Inferno',
    tier: 'ELITE',
    colors: ['#FF4500', '#FF6347', '#DC143C', '#FF8C00', '#FFD700'],
    spinSpeed: 8,
    glowIntensity: 1.5,
    specialEffect: 'fire',
    achievementName: 'Elite Excellence',
  },
];

async function main() {
  console.log('='.repeat(60));
  console.log('🏅 Seeding Badges and Profile Borders');
  console.log('='.repeat(60));

  // Get all achievements
  const achievements = await prisma.achievement.findMany();
  console.log(`Found ${achievements.length} achievements`);

  const achievementMap = new Map(achievements.map(a => [a.name, a.id]));

  // Create badges
  console.log('\n📛 Creating badges...');
  let badgesCreated = 0;
  let badgesSkipped = 0;

  for (const badge of BADGES) {
    const achievementId = badge.achievementName ? achievementMap.get(badge.achievementName) : null;

    // Check if badge already exists by name
    const existingByName = await prisma.badge.findFirst({
      where: { name: badge.name }
    });

    if (existingByName) {
      console.log(`  ⏭️  Badge "${badge.name}" already exists`);
      badgesSkipped++;
      continue;
    }

    // Check if achievement is already linked to another badge
    if (achievementId) {
      const existingByAchievement = await prisma.badge.findFirst({
        where: { achievementId }
      });
      if (existingByAchievement) {
        console.log(`  ⏭️  Badge for achievement "${badge.achievementName}" already exists as "${existingByAchievement.name}"`);
        badgesSkipped++;
        continue;
      }
    }

    await prisma.badge.create({
      data: {
        name: badge.name,
        description: badge.description,
        imageUrl: badge.imageUrl,
        rarity: badge.rarity,
        category: badge.category,
        achievementId: achievementId || null,
        isActive: true,
      }
    });
    console.log(`  ✅ Created badge: ${badge.name}${achievementId ? ` (linked to achievement)` : ''}`);
    badgesCreated++;
  }

  console.log(`\n   Badges: ${badgesCreated} created, ${badgesSkipped} skipped`);

  // Create borders
  console.log('\n🔲 Creating profile borders...');
  let bordersCreated = 0;
  let bordersSkipped = 0;

  for (const border of BORDERS) {
    const achievementId = border.achievementName ? achievementMap.get(border.achievementName) : null;

    // Check if border already exists by name
    const existingByName = await prisma.profileBorder.findFirst({
      where: { name: border.name }
    });

    if (existingByName) {
      console.log(`  ⏭️  Border "${border.name}" already exists`);
      bordersSkipped++;
      continue;
    }

    // Check if achievement is already linked to another border
    if (achievementId) {
      const existingByAchievement = await prisma.profileBorder.findFirst({
        where: { achievementId }
      });
      if (existingByAchievement) {
        console.log(`  ⏭️  Border for achievement "${border.achievementName}" already exists`);
        bordersSkipped++;
        continue;
      }
    }

    await prisma.profileBorder.create({
      data: {
        name: border.name,
        tier: border.tier,
        colors: border.colors,
        spinSpeed: border.spinSpeed,
        glowIntensity: border.glowIntensity,
        specialEffect: border.specialEffect,
        achievementId: achievementId || null,
        isActive: true,
      }
    });
    console.log(`  ✅ Created border: ${border.name} (${border.tier})${achievementId ? ` (linked to achievement)` : ''}`);
    bordersCreated++;
  }

  console.log(`\n   Borders: ${bordersCreated} created, ${bordersSkipped} skipped`);

  // Backfill badges to users who already have achievements
  console.log('\n' + '='.repeat(60));
  console.log('🔄 Backfilling badges to existing achievement holders');
  console.log('='.repeat(60));

  const userAchievements = await prisma.userAchievement.findMany({
    include: {
      achievement: true,
      user: true
    }
  });

  console.log(`Found ${userAchievements.length} user achievements to process`);

  let badgesAwarded = 0;
  let bordersAwarded = 0;

  for (const ua of userAchievements) {
    // Find badge linked to this achievement
    const badge = await prisma.badge.findFirst({
      where: { achievementId: ua.achievementId, isActive: true }
    });

    if (badge) {
      // Check if user already has this badge
      const existingBadge = await prisma.userBadge.findUnique({
        where: { userId_badgeId: { userId: ua.userId, badgeId: badge.id } }
      });

      if (!existingBadge) {
        await prisma.userBadge.create({
          data: {
            userId: ua.userId,
            badgeId: badge.id,
            unlockedAt: ua.unlockedAt // Use same unlock time as achievement
          }
        });
        console.log(`  🏅 Awarded badge "${badge.name}" to ${ua.user.email}`);
        badgesAwarded++;
      }
    }

    // Find border linked to this achievement
    const border = await prisma.profileBorder.findFirst({
      where: { achievementId: ua.achievementId, isActive: true }
    });

    if (border) {
      // Check if user already has this border
      const existingBorder = await prisma.userBorder.findUnique({
        where: { userId_borderId: { userId: ua.userId, borderId: border.id } }
      });

      if (!existingBorder) {
        await prisma.userBorder.create({
          data: {
            userId: ua.userId,
            borderId: border.id,
            unlockedAt: ua.unlockedAt
          }
        });
        console.log(`  🔲 Awarded border "${border.name}" to ${ua.user.email}`);
        bordersAwarded++;
      }
    }
  }

  // Give everyone the default Bronze border
  console.log('\n🔲 Ensuring all users have the default Bronze border...');
  const bronzeBorder = await prisma.profileBorder.findFirst({
    where: { tier: 'BRONZE', isActive: true }
  });

  if (bronzeBorder) {
    const allUsers = await prisma.user.findMany({
      select: { id: true, email: true }
    });

    let defaultBordersAwarded = 0;
    for (const user of allUsers) {
      const existingBorder = await prisma.userBorder.findUnique({
        where: { userId_borderId: { userId: user.id, borderId: bronzeBorder.id } }
      });

      if (!existingBorder) {
        await prisma.userBorder.create({
          data: {
            userId: user.id,
            borderId: bronzeBorder.id
          }
        });
        defaultBordersAwarded++;
      }
    }
    console.log(`  ✅ Awarded default Bronze border to ${defaultBordersAwarded} users`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('✨ Summary');
  console.log('='.repeat(60));
  console.log(`Badges created: ${badgesCreated}`);
  console.log(`Borders created: ${bordersCreated}`);
  console.log(`Badges awarded to existing users: ${badgesAwarded}`);
  console.log(`Borders awarded to existing users: ${bordersAwarded}`);
  console.log('='.repeat(60));
}

main()
  .catch((e) => {
    console.error('Script error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
