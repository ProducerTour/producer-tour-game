import { PrismaClient } from '../../src/generated/client';

const prisma = new PrismaClient();

async function seedGamification() {
  console.log('🎮 Seeding gamification data...');

  // Seed Achievements
  const achievements = [
    // Social Achievements
    {
      name: 'Social Butterfly',
      description: 'Share Producer Tour on 3 different platforms',
      icon: '🦋',
      points: 100,
      tier: 'BRONZE',
      category: 'SOCIAL',
      criteria: { requiredShares: 3, type: 'social_share_count' }
    },
    {
      name: 'Influencer',
      description: 'Get 5 signups through your referral code',
      icon: '⭐',
      points: 500,
      tier: 'SILVER',
      category: 'SOCIAL',
      criteria: { requiredReferrals: 5, type: 'referral_count' }
    },
    {
      name: 'Ambassador',
      description: 'Get 25 signups through your referral code',
      icon: '👑',
      points: 2500,
      tier: 'GOLD',
      category: 'SOCIAL',
      criteria: { requiredReferrals: 25, type: 'referral_count' }
    },

    // Engagement Achievements
    {
      name: 'Dedicated',
      description: 'Complete a 7-day check-in streak',
      icon: '🔥',
      points: 100,
      tier: 'BRONZE',
      category: 'ENGAGEMENT',
      criteria: { requiredStreak: 7, type: 'check_in_streak' }
    },
    {
      name: 'Committed',
      description: 'Complete a 30-day check-in streak',
      icon: '💪',
      points: 500,
      tier: 'SILVER',
      category: 'ENGAGEMENT',
      criteria: { requiredStreak: 30, type: 'check_in_streak' }
    },
    {
      name: 'Unwavering',
      description: 'Complete a 90-day check-in streak',
      icon: '💎',
      points: 2000,
      tier: 'GOLD',
      category: 'ENGAGEMENT',
      criteria: { requiredStreak: 90, type: 'check_in_streak' }
    },

    // Platform Achievements
    {
      name: 'Getting Started',
      description: 'Complete your profile with all required information',
      icon: '✅',
      points: 50,
      tier: 'BRONZE',
      category: 'PLATFORM',
      criteria: { type: 'profile_complete' }
    },
    {
      name: 'Connected',
      description: 'Connect your Stripe account for payouts',
      icon: '💳',
      points: 100,
      tier: 'BRONZE',
      category: 'PLATFORM',
      criteria: { type: 'stripe_connected' }
    },
    {
      name: 'First Steps',
      description: 'Submit your first work',
      icon: '🎵',
      points: 100,
      tier: 'BRONZE',
      category: 'PLATFORM',
      criteria: { type: 'first_work_submission' }
    },

    // Revenue Achievements
    {
      name: 'First Earnings',
      description: 'Earn your first $100',
      icon: '💵',
      points: 200,
      tier: 'BRONZE',
      category: 'REVENUE',
      criteria: { requiredRevenue: 100, type: 'revenue_milestone' }
    },
    {
      name: 'Rising Star',
      description: 'Earn $1,000 in total',
      icon: '🌟',
      points: 500,
      tier: 'SILVER',
      category: 'REVENUE',
      criteria: { requiredRevenue: 1000, type: 'revenue_milestone' }
    },
    {
      name: 'Professional',
      description: 'Earn $10,000 in total',
      icon: '🎯',
      points: 2000,
      tier: 'GOLD',
      category: 'REVENUE',
      criteria: { requiredRevenue: 10000, type: 'revenue_milestone' }
    },
    {
      name: 'Elite Producer',
      description: 'Earn $50,000 in total',
      icon: '🏆',
      points: 5000,
      tier: 'PLATINUM',
      category: 'REVENUE',
      criteria: { requiredRevenue: 50000, type: 'revenue_milestone' }
    },

    // Milestone Achievements
    {
      name: 'Bronze Tier',
      description: 'Reach Bronze tier',
      icon: '🥉',
      points: 0,
      tier: 'BRONZE',
      category: 'MILESTONE',
      criteria: { requiredTier: 'BRONZE', type: 'tier_milestone' }
    },
    {
      name: 'Silver Tier',
      description: 'Reach Silver tier (1,000 TP)',
      icon: '🥈',
      points: 250,
      tier: 'SILVER',
      category: 'MILESTONE',
      criteria: { requiredTier: 'SILVER', type: 'tier_milestone' }
    },
    {
      name: 'Gold Tier',
      description: 'Reach Gold tier (5,000 TP)',
      icon: '🥇',
      points: 500,
      tier: 'GOLD',
      category: 'MILESTONE',
      criteria: { requiredTier: 'GOLD', type: 'tier_milestone' }
    },
    {
      name: 'Diamond Tier',
      description: 'Reach Diamond tier (15,000 TP)',
      icon: '💎',
      points: 1000,
      tier: 'PLATINUM',
      category: 'MILESTONE',
      criteria: { requiredTier: 'DIAMOND', type: 'tier_milestone' }
    },
    {
      name: 'Elite Tier',
      description: 'Reach Elite tier (50,000 TP)',
      icon: '👑',
      points: 2500,
      tier: 'DIAMOND',
      category: 'MILESTONE',
      criteria: { requiredTier: 'ELITE', type: 'tier_milestone' }
    },

    // Community Achievements
    {
      name: 'Helpful',
      description: 'Submit 5 bug reports or feature suggestions',
      icon: '🐛',
      points: 150,
      tier: 'BRONZE',
      category: 'COMMUNITY',
      criteria: { requiredSubmissions: 5, type: 'feedback_count' }
    },
    {
      name: 'Community Champion',
      description: 'Submit 25 bug reports or feature suggestions',
      icon: '🏅',
      points: 750,
      tier: 'SILVER',
      category: 'COMMUNITY',
      criteria: { requiredSubmissions: 25, type: 'feedback_count' }
    }
  ];

  console.log('📝 Creating achievements...');
  for (const achievement of achievements) {
    await prisma.achievement.upsert({
      where: { name: achievement.name },
      update: achievement,
      create: achievement
    });
  }
  console.log(`✅ Created ${achievements.length} achievements`);

  // Seed Rewards
  const rewards = [
    // Commission Reduction Rewards - Elite Tier Only
    {
      name: '2% Commission Reduction',
      description: 'Reduce your commission by 2% for one payout',
      cost: 5000,
      category: 'COMMISSION',
      type: 'commission_reduction',
      roleRestriction: 'WRITER',
      tierRestriction: 'ELITE',
      inventory: null,
      details: {
        commissionReduction: 2,
        duration: '1 payout',
        applyMethod: 'next_payout'
      }
    },
    {
      name: '5% Commission Reduction',
      description: 'Reduce your commission by 5% for one payout',
      cost: 12000,
      category: 'COMMISSION',
      type: 'commission_reduction',
      roleRestriction: 'WRITER',
      tierRestriction: 'ELITE',
      inventory: null,
      details: {
        commissionReduction: 5,
        duration: '1 payout',
        applyMethod: 'next_payout'
      }
    },
    {
      name: '10% Commission Reduction',
      description: 'Reduce your commission by 10% for one payout (Maximum)',
      cost: 25000,
      category: 'COMMISSION',
      type: 'commission_reduction',
      roleRestriction: 'WRITER',
      tierRestriction: 'ELITE',
      inventory: null,
      details: {
        commissionReduction: 10,
        duration: '1 payout',
        applyMethod: 'next_payout'
      }
    },

    // Payout Speed Rewards
    {
      name: 'Priority Processing',
      description: 'Your next payout gets processed first in the queue',
      cost: 1000,
      category: 'PAYOUT',
      type: 'priority_processing',
      roleRestriction: 'WRITER',
      tierRestriction: 'SILVER',
      inventory: null,
      details: {
        processingPriority: 'high',
        duration: '1 payout'
      }
    },
    {
      name: 'Instant Payout',
      description: 'Get your next payout processed within 24 hours',
      cost: 3000,
      category: 'PAYOUT',
      type: 'instant_payout',
      roleRestriction: 'WRITER',
      tierRestriction: 'GOLD',
      inventory: null,
      details: {
        guaranteedProcessing: '24 hours',
        duration: '1 payout'
      }
    },

    // Platform Feature Rewards
    {
      name: 'Profile Badge: Bronze',
      description: 'Display a Bronze tier badge on your profile',
      cost: 0,
      category: 'PLATFORM',
      type: 'profile_badge',
      roleRestriction: null,
      tierRestriction: 'BRONZE',
      inventory: null,
      details: {
        badgeType: 'bronze',
        duration: 'permanent'
      }
    },
    {
      name: 'Profile Badge: Silver',
      description: 'Display a Silver tier badge on your profile',
      cost: 500,
      category: 'PLATFORM',
      type: 'profile_badge',
      roleRestriction: null,
      tierRestriction: 'SILVER',
      inventory: null,
      details: {
        badgeType: 'silver',
        duration: 'permanent'
      }
    },
    {
      name: 'Profile Badge: Gold',
      description: 'Display a Gold tier badge on your profile',
      cost: 2000,
      category: 'PLATFORM',
      type: 'profile_badge',
      roleRestriction: null,
      tierRestriction: 'GOLD',
      inventory: null,
      details: {
        badgeType: 'gold',
        duration: 'permanent'
      }
    },
    {
      name: 'Profile Badge: Diamond',
      description: 'Display a Diamond tier badge on your profile',
      cost: 5000,
      category: 'PLATFORM',
      type: 'profile_badge',
      roleRestriction: null,
      tierRestriction: 'DIAMOND',
      inventory: null,
      details: {
        badgeType: 'diamond',
        duration: 'permanent'
      }
    },
    {
      name: 'Profile Badge: Elite',
      description: 'Display an Elite tier badge on your profile',
      cost: 10000,
      category: 'PLATFORM',
      type: 'profile_badge',
      roleRestriction: null,
      tierRestriction: 'ELITE',
      inventory: null,
      details: {
        badgeType: 'elite',
        duration: 'permanent'
      }
    },
    {
      name: 'Custom Profile Theme',
      description: 'Unlock custom color themes for your profile',
      cost: 2500,
      category: 'PLATFORM',
      type: 'profile_customization',
      roleRestriction: null,
      tierRestriction: 'GOLD',
      inventory: null,
      details: {
        feature: 'custom_theme',
        duration: 'permanent'
      }
    },
    {
      name: 'Early Access Features',
      description: 'Get early access to new platform features',
      cost: 5000,
      category: 'PLATFORM',
      type: 'early_access',
      roleRestriction: null,
      tierRestriction: 'DIAMOND',
      inventory: null,
      details: {
        feature: 'beta_access',
        duration: 'permanent'
      }
    },

    // Physical/Limited Rewards
    {
      name: 'Producer Tour Sticker Pack',
      description: 'Limited edition sticker pack (shipping included)',
      cost: 1500,
      category: 'PHYSICAL',
      type: 'merchandise',
      roleRestriction: null,
      tierRestriction: 'BRONZE',
      inventory: 100,
      details: {
        itemType: 'stickers',
        shippingIncluded: true
      }
    },
    {
      name: 'Producer Tour T-Shirt',
      description: 'Exclusive Producer Tour branded t-shirt',
      cost: 4000,
      category: 'PHYSICAL',
      type: 'merchandise',
      roleRestriction: null,
      tierRestriction: 'SILVER',
      inventory: 50,
      details: {
        itemType: 'apparel',
        shippingIncluded: true,
        requiresShippingInfo: true
      }
    },
    {
      name: 'Producer Tour Hoodie',
      description: 'Premium Producer Tour branded hoodie',
      cost: 8000,
      category: 'PHYSICAL',
      type: 'merchandise',
      roleRestriction: null,
      tierRestriction: 'GOLD',
      inventory: 25,
      details: {
        itemType: 'apparel',
        shippingIncluded: true,
        requiresShippingInfo: true
      }
    },

    // Subscription Rewards
    {
      name: '1 Month Priority Support',
      description: 'Get priority email support for 1 month',
      cost: 2000,
      category: 'SUBSCRIPTION',
      type: 'support_upgrade',
      roleRestriction: null,
      tierRestriction: 'SILVER',
      inventory: null,
      details: {
        supportLevel: 'priority',
        duration: '1 month'
      }
    },
    {
      name: '3 Month Priority Support',
      description: 'Get priority email support for 3 months',
      cost: 5000,
      category: 'SUBSCRIPTION',
      type: 'support_upgrade',
      roleRestriction: null,
      tierRestriction: 'GOLD',
      inventory: null,
      details: {
        supportLevel: 'priority',
        duration: '3 months'
      }
    }
  ];

  console.log('🎁 Creating rewards...');
  let rewardCount = 0;
  for (const reward of rewards) {
    const existing = await prisma.reward.findFirst({
      where: { name: reward.name }
    });

    if (existing) {
      await prisma.reward.update({
        where: { id: existing.id },
        data: reward
      });
    } else {
      await prisma.reward.create({
        data: reward
      });
    }
    rewardCount++;
  }
  console.log(`✅ Created ${rewardCount} rewards`);

  console.log('✨ Gamification seed completed!');
}

seedGamification()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
