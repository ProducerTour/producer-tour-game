import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🎮 Seeding gamification data (achievements & rewards)...');

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
      update: {
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
  console.log('✅ Created/Updated gamification rewards:', rewards.length);

  // Seed Achievements
  const achievements = [
    // Engagement Achievements
    {
      id: 'first-check-in',
      name: 'First Steps',
      description: 'Complete your first daily check-in',
      icon: '👋',
      points: 25,
      tier: 'BRONZE',
      category: 'ENGAGEMENT',
      criteria: { type: 'check_in_streak', requiredStreak: 1 },
    },
    {
      id: 'week-warrior',
      name: 'Week Warrior',
      description: 'Maintain a 7-day check-in streak',
      icon: '🔥',
      points: 100,
      tier: 'SILVER',
      category: 'ENGAGEMENT',
      criteria: { type: 'check_in_streak', requiredStreak: 7 },
    },
    {
      id: 'monthly-master',
      name: 'Monthly Master',
      description: 'Maintain a 30-day check-in streak',
      icon: '🏆',
      points: 500,
      tier: 'GOLD',
      category: 'ENGAGEMENT',
      criteria: { type: 'check_in_streak', requiredStreak: 30 },
    },
    {
      id: 'streak-legend',
      name: 'Streak Legend',
      description: 'Maintain a 90-day check-in streak',
      icon: '👑',
      points: 1500,
      tier: 'DIAMOND',
      category: 'ENGAGEMENT',
      criteria: { type: 'check_in_streak', requiredStreak: 90 },
    },

    // Social Achievements
    {
      id: 'social-butterfly',
      name: 'Social Butterfly',
      description: 'Share your profile on social media',
      icon: '🦋',
      points: 50,
      tier: 'BRONZE',
      category: 'SOCIAL',
      criteria: { type: 'social_share_count', requiredShares: 1 },
    },
    {
      id: 'influencer',
      name: 'Influencer',
      description: 'Share on 3 different social platforms',
      icon: '📱',
      points: 150,
      tier: 'SILVER',
      category: 'SOCIAL',
      criteria: { type: 'social_share_count', requiredShares: 3 },
    },
    {
      id: 'ambassador',
      name: 'Ambassador',
      description: 'Refer a friend who signs up',
      icon: '🤝',
      points: 200,
      tier: 'SILVER',
      category: 'SOCIAL',
      criteria: { type: 'referral_count', requiredReferrals: 1 },
    },
    {
      id: 'network-builder',
      name: 'Network Builder',
      description: 'Refer 5 friends who sign up',
      icon: '🌐',
      points: 750,
      tier: 'GOLD',
      category: 'SOCIAL',
      criteria: { type: 'referral_count', requiredReferrals: 5 },
    },
    {
      id: 'community-leader',
      name: 'Community Leader',
      description: 'Refer 10 friends who sign up',
      icon: '🌟',
      points: 2000,
      tier: 'PLATINUM',
      category: 'SOCIAL',
      criteria: { type: 'referral_count', requiredReferrals: 10 },
    },

    // Platform Achievements
    {
      id: 'profile-pro',
      name: 'Profile Pro',
      description: 'Complete your profile with all basic info',
      icon: '✨',
      points: 50,
      tier: 'BRONZE',
      category: 'PLATFORM',
      criteria: { type: 'profile_complete' },
    },
    {
      id: 'payment-ready',
      name: 'Payment Ready',
      description: 'Connect your Stripe account for payouts',
      icon: '💳',
      points: 100,
      tier: 'BRONZE',
      category: 'PLATFORM',
      criteria: { type: 'stripe_connected' },
    },
    {
      id: 'first-submission',
      name: 'First Submission',
      description: 'Submit your first work to the platform',
      icon: '🎵',
      points: 75,
      tier: 'BRONZE',
      category: 'PLATFORM',
      criteria: { type: 'first_work_submission' },
    },

    // Revenue Achievements
    {
      id: 'first-dollar',
      name: 'First Dollar',
      description: 'Earn your first dollar on the platform',
      icon: '💵',
      points: 100,
      tier: 'BRONZE',
      category: 'REVENUE',
      criteria: { type: 'revenue_milestone', requiredRevenue: 1 },
    },
    {
      id: 'hundred-club',
      name: 'Hundred Club',
      description: 'Earn $100 in lifetime revenue',
      icon: '💰',
      points: 250,
      tier: 'SILVER',
      category: 'REVENUE',
      criteria: { type: 'revenue_milestone', requiredRevenue: 100 },
    },
    {
      id: 'thousand-earner',
      name: 'Thousand Earner',
      description: 'Earn $1,000 in lifetime revenue',
      icon: '🤑',
      points: 750,
      tier: 'GOLD',
      category: 'REVENUE',
      criteria: { type: 'revenue_milestone', requiredRevenue: 1000 },
    },
    {
      id: 'five-figure-producer',
      name: 'Five Figure Producer',
      description: 'Earn $10,000 in lifetime revenue',
      icon: '💎',
      points: 2500,
      tier: 'PLATINUM',
      category: 'REVENUE',
      criteria: { type: 'revenue_milestone', requiredRevenue: 10000 },
    },
    {
      id: 'platinum-producer',
      name: 'Platinum Producer',
      description: 'Earn $50,000 in lifetime revenue',
      icon: '🏅',
      points: 10000,
      tier: 'DIAMOND',
      category: 'REVENUE',
      criteria: { type: 'revenue_milestone', requiredRevenue: 50000 },
    },

    // Milestone/Tier Achievements
    {
      id: 'silver-status',
      name: 'Silver Status',
      description: 'Reach Silver tier',
      icon: '🥈',
      points: 100,
      tier: 'SILVER',
      category: 'MILESTONE',
      criteria: { type: 'tier_milestone', requiredTier: 'SILVER' },
    },
    {
      id: 'gold-status',
      name: 'Gold Status',
      description: 'Reach Gold tier',
      icon: '🥇',
      points: 250,
      tier: 'GOLD',
      category: 'MILESTONE',
      criteria: { type: 'tier_milestone', requiredTier: 'GOLD' },
    },
    {
      id: 'diamond-status',
      name: 'Diamond Status',
      description: 'Reach Diamond tier',
      icon: '💎',
      points: 500,
      tier: 'PLATINUM',
      category: 'MILESTONE',
      criteria: { type: 'tier_milestone', requiredTier: 'DIAMOND' },
    },
    {
      id: 'elite-status',
      name: 'Elite Status',
      description: 'Reach Elite tier - you\'re among the best!',
      icon: '👑',
      points: 1000,
      tier: 'DIAMOND',
      category: 'MILESTONE',
      criteria: { type: 'tier_milestone', requiredTier: 'ELITE' },
    },

    // Community Achievements
    {
      id: 'feedback-first',
      name: 'Voice Heard',
      description: 'Submit your first feedback or bug report',
      icon: '💬',
      points: 50,
      tier: 'BRONZE',
      category: 'COMMUNITY',
      criteria: { type: 'feedback_count', requiredSubmissions: 1 },
    },
    {
      id: 'feedback-champion',
      name: 'Feedback Champion',
      description: 'Submit 5 pieces of feedback or bug reports',
      icon: '🗣️',
      points: 200,
      tier: 'SILVER',
      category: 'COMMUNITY',
      criteria: { type: 'feedback_count', requiredSubmissions: 5 },
    },
    {
      id: 'beta-tester',
      name: 'Beta Tester',
      description: 'Submit 10 pieces of feedback or bug reports',
      icon: '🔬',
      points: 500,
      tier: 'GOLD',
      category: 'COMMUNITY',
      criteria: { type: 'feedback_count', requiredSubmissions: 10 },
    },
  ];

  for (const achievement of achievements) {
    await prisma.achievement.upsert({
      where: { id: achievement.id },
      update: {
        name: achievement.name,
        description: achievement.description,
        icon: achievement.icon,
        points: achievement.points,
        tier: achievement.tier as any,
        category: achievement.category as any,
        criteria: achievement.criteria,
        isActive: true,
      },
      create: {
        id: achievement.id,
        name: achievement.name,
        description: achievement.description,
        icon: achievement.icon,
        points: achievement.points,
        tier: achievement.tier as any,
        category: achievement.category as any,
        criteria: achievement.criteria,
        isActive: true,
      },
    });
  }
  console.log('✅ Created/Updated achievements:', achievements.length);

  console.log('✨ Gamification seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
