import { PrismaClient } from '../src/generated/client';

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

    // Tool Access Rewards (for CUSTOMER role - WRITERs get free access)
    {
      name: 'Video Maker Tool Access',
      description: 'Unlock the Type Beat Video Maker tool for 30 days. Create professional videos by combining beats with images and upload directly to YouTube.',
      cost: 750,
      category: 'PLATFORM',
      type: 'TOOL_ACCESS',
      roleRestriction: 'CUSTOMER', // Only CUSTOMER role needs to purchase - WRITERs have free access
      tierRestriction: null,
      details: {
        toolId: 'type-beat-video-maker',
        durationDays: 30,
        features: ['Batch processing', 'YouTube upload', '16:9 and 9:16 formats', 'Custom artwork']
      },
    },
    {
      name: 'Video Maker - 3 Uses',
      description: 'Get 3 uses of the Type Beat Video Maker tool. Perfect for trying it out!',
      cost: 150,
      category: 'PLATFORM',
      type: 'TOOL_USES',
      roleRestriction: 'CUSTOMER',
      tierRestriction: null,
      details: {
        toolId: 'type-beat-video-maker',
        uses: 3,
      },
    },
    {
      name: 'Pub Deal Simulator - 3 Uses',
      description: 'Get 3 uses of the Pub Deal Simulator tool to estimate your deal terms.',
      cost: 100,
      category: 'PLATFORM',
      type: 'TOOL_USES',
      roleRestriction: 'CUSTOMER',
      tierRestriction: null,
      details: {
        toolId: 'pub-deal-simulator',
        uses: 3,
      },
    },
    {
      name: 'Advance Estimator - 3 Uses',
      description: 'Get 3 uses of the Advance Estimator tool to calculate potential advance amounts.',
      cost: 100,
      category: 'PLATFORM',
      type: 'TOOL_USES',
      roleRestriction: 'CUSTOMER',
      tierRestriction: null,
      details: {
        toolId: 'advance-estimator',
        uses: 3,
      },
    },

    // Payout Frequency Rewards
    {
      name: 'Monthly Payout Access',
      description: 'Get monthly payouts instead of quarterly for 60 days. Faster access to your royalties!',
      cost: 1000,
      category: 'PAYOUT',
      type: 'MONTHLY_PAYOUT',
      roleRestriction: 'WRITER',
      tierRestriction: 'SILVER',
      details: {
        durationDays: 60,
        payoutFrequency: 'monthly'
      },
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
      criteria: { type: 'stripe_connected', roleRestriction: 'WRITER' },
    },
    {
      id: 'first-submission',
      name: 'First Submission',
      description: 'Submit your first work to the platform',
      icon: '🎵',
      points: 75,
      tier: 'BRONZE',
      category: 'PLATFORM',
      criteria: { type: 'first_work_submission', roleRestriction: 'WRITER' },
    },

    // Revenue Achievements (WRITER only - customers don't earn revenue)
    {
      id: 'first-dollar',
      name: 'First Dollar',
      description: 'Earn your first dollar on the platform',
      icon: '💵',
      points: 100,
      tier: 'BRONZE',
      category: 'REVENUE',
      criteria: { type: 'revenue_milestone', requiredRevenue: 1, roleRestriction: 'WRITER' },
    },
    {
      id: 'hundred-club',
      name: 'Hundred Club',
      description: 'Earn $100 in lifetime revenue',
      icon: '💰',
      points: 250,
      tier: 'SILVER',
      category: 'REVENUE',
      criteria: { type: 'revenue_milestone', requiredRevenue: 100, roleRestriction: 'WRITER' },
    },
    {
      id: 'thousand-earner',
      name: 'Thousand Earner',
      description: 'Earn $1,000 in lifetime revenue',
      icon: '🤑',
      points: 750,
      tier: 'GOLD',
      category: 'REVENUE',
      criteria: { type: 'revenue_milestone', requiredRevenue: 1000, roleRestriction: 'WRITER' },
    },
    {
      id: 'five-figure-producer',
      name: 'Five Figure Producer',
      description: 'Earn $10,000 in lifetime revenue',
      icon: '💎',
      points: 2500,
      tier: 'PLATINUM',
      category: 'REVENUE',
      criteria: { type: 'revenue_milestone', requiredRevenue: 10000, roleRestriction: 'WRITER' },
    },
    {
      id: 'platinum-producer',
      name: 'Platinum Producer',
      description: 'Earn $50,000 in lifetime revenue',
      icon: '🏅',
      points: 10000,
      tier: 'DIAMOND',
      category: 'REVENUE',
      criteria: { type: 'revenue_milestone', requiredRevenue: 50000, roleRestriction: 'WRITER' },
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

    // Customer-Specific Achievements
    {
      id: 'tool-explorer',
      name: 'Tool Explorer',
      description: 'Use a platform tool for the first time',
      icon: '🔧',
      points: 25,
      tier: 'BRONZE',
      category: 'ENGAGEMENT',
      criteria: { type: 'tool_usage', requiredUses: 1, roleRestriction: 'CUSTOMER' },
    },
    {
      id: 'tool-enthusiast',
      name: 'Tool Enthusiast',
      description: 'Use platform tools 10 times',
      icon: '⚙️',
      points: 100,
      tier: 'SILVER',
      category: 'ENGAGEMENT',
      criteria: { type: 'tool_usage', requiredUses: 10, roleRestriction: 'CUSTOMER' },
    },
    {
      id: 'tool-master',
      name: 'Tool Master',
      description: 'Use platform tools 50 times',
      icon: '🛠️',
      points: 500,
      tier: 'GOLD',
      category: 'ENGAGEMENT',
      criteria: { type: 'tool_usage', requiredUses: 50, roleRestriction: 'CUSTOMER' },
    },
    {
      id: 'playlist-lover',
      name: 'Playlist Lover',
      description: 'Save your first playlist to your library',
      icon: '🎧',
      points: 25,
      tier: 'BRONZE',
      category: 'ENGAGEMENT',
      criteria: { type: 'playlist_saved', requiredSaves: 1, roleRestriction: 'CUSTOMER' },
    },
    {
      id: 'music-curator',
      name: 'Music Curator',
      description: 'Save 10 playlists to your library',
      icon: '🎼',
      points: 100,
      tier: 'SILVER',
      category: 'ENGAGEMENT',
      criteria: { type: 'playlist_saved', requiredSaves: 10, roleRestriction: 'CUSTOMER' },
    },
    {
      id: 'event-goer',
      name: 'Event Goer',
      description: 'RSVP to your first community event',
      icon: '📅',
      points: 50,
      tier: 'BRONZE',
      category: 'COMMUNITY',
      criteria: { type: 'event_rsvp', requiredRSVPs: 1, roleRestriction: 'CUSTOMER' },
    },
    {
      id: 'community-regular',
      name: 'Community Regular',
      description: 'Attend 5 community events',
      icon: '🎪',
      points: 200,
      tier: 'SILVER',
      category: 'COMMUNITY',
      criteria: { type: 'event_attendance', requiredAttendances: 5, roleRestriction: 'CUSTOMER' },
    },
    {
      id: 'learner',
      name: 'Eager Learner',
      description: 'Complete your first learning module',
      icon: '📚',
      points: 50,
      tier: 'BRONZE',
      category: 'ENGAGEMENT',
      criteria: { type: 'learning_complete', requiredModules: 1, roleRestriction: 'CUSTOMER' },
    },
    {
      id: 'student',
      name: 'Star Student',
      description: 'Complete 5 learning modules',
      icon: '🎓',
      points: 250,
      tier: 'SILVER',
      category: 'ENGAGEMENT',
      criteria: { type: 'learning_complete', requiredModules: 5, roleRestriction: 'CUSTOMER' },
    },
    {
      id: 'wishlist-starter',
      name: 'Wishlist Starter',
      description: 'Add your first item to your wishlist',
      icon: '⭐',
      points: 15,
      tier: 'BRONZE',
      category: 'ENGAGEMENT',
      criteria: { type: 'wishlist_add', requiredItems: 1, roleRestriction: 'CUSTOMER' },
    },
  ];

  for (const achievement of achievements) {
    await prisma.achievement.upsert({
      where: { name: achievement.name },
      update: {
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

  // ============================================
  // SEED PROFILE BADGES (CoD MW2-style emblems)
  // ============================================

  // Helper to look up achievement ID by name
  const getAchievementId = async (achievementName: string): Promise<string | null> => {
    const achievement = await prisma.achievement.findUnique({
      where: { name: achievementName },
      select: { id: true },
    });
    return achievement?.id || null;
  };

  // Helper to look up reward ID by name (via generated ID)
  const getRewardId = async (rewardName: string): Promise<string | null> => {
    const rewardId = rewardName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const reward = await prisma.reward.findUnique({
      where: { id: rewardId },
      select: { id: true },
    });
    return reward?.id || null;
  };

  const badges = [
    // Achievement-Linked Badges
    {
      id: 'first-steps-badge',
      name: 'First Steps',
      description: 'Awarded for your first daily check-in',
      imageUrl: '/badges/first-steps.svg',
      rarity: 'COMMON',
      category: 'achievement',
      achievementName: 'First Steps',
    },
    {
      id: 'week-warrior-badge',
      name: 'Week Warrior',
      description: 'Maintain a 7-day streak',
      imageUrl: '/badges/week-warrior.svg',
      rarity: 'RARE',
      category: 'achievement',
      achievementName: 'Week Warrior',
    },
    {
      id: 'monthly-master-badge',
      name: 'Monthly Master',
      description: 'Maintain a 30-day streak',
      imageUrl: '/badges/monthly-master.svg',
      rarity: 'EPIC',
      category: 'achievement',
      achievementName: 'Monthly Master',
    },
    {
      id: 'streak-legend-badge',
      name: 'Streak Legend',
      description: '90-day check-in streak',
      imageUrl: '/badges/streak-legend.svg',
      rarity: 'LEGENDARY',
      category: 'achievement',
      achievementName: 'Streak Legend',
    },
    {
      id: 'social-butterfly-badge',
      name: 'Social Butterfly',
      description: 'Share on social media',
      imageUrl: '/badges/social-butterfly.svg',
      rarity: 'COMMON',
      category: 'achievement',
      achievementName: 'Social Butterfly',
    },
    {
      id: 'ambassador-badge',
      name: 'Ambassador',
      description: 'Refer a friend',
      imageUrl: '/badges/ambassador.svg',
      rarity: 'RARE',
      category: 'achievement',
      achievementName: 'Ambassador',
    },
    {
      id: 'community-leader-badge',
      name: 'Community Leader',
      description: 'Refer 10+ friends',
      imageUrl: '/badges/community-leader.svg',
      rarity: 'LEGENDARY',
      category: 'achievement',
      achievementName: 'Community Leader',
    },
    {
      id: 'first-dollar-badge',
      name: 'First Dollar',
      description: 'Earn your first dollar',
      imageUrl: '/badges/first-dollar.svg',
      rarity: 'COMMON',
      category: 'achievement',
      achievementName: 'First Dollar',
    },
    {
      id: 'thousand-earner-badge',
      name: 'Thousand Club',
      description: 'Earn $1,000+',
      imageUrl: '/badges/thousand-club.svg',
      rarity: 'EPIC',
      category: 'achievement',
      achievementName: 'Thousand Earner',
    },
    {
      id: 'platinum-producer-badge',
      name: 'Platinum Producer',
      description: 'Earn $50,000+',
      imageUrl: '/badges/platinum-producer.svg',
      rarity: 'LEGENDARY',
      category: 'achievement',
      achievementName: 'Platinum Producer',
    },

    // Store-purchasable Badges
    {
      id: 'verified-badge',
      name: 'Verified',
      description: 'Verified Producer',
      imageUrl: '/badges/verified.svg',
      rarity: 'EPIC',
      category: 'store',
      rewardName: 'Verified Producer Badge',
    },
    {
      id: 'custom-profile-badge',
      name: 'Customizer',
      description: 'Profile customization unlocked',
      imageUrl: '/badges/customizer.svg',
      rarity: 'RARE',
      category: 'store',
      rewardName: 'Custom Profile Badge',
    },

    // Special Event Badges
    {
      id: 'og-member-badge',
      name: 'OG Member',
      description: 'Early platform adopter',
      imageUrl: '/badges/og-member.svg',
      rarity: 'LEGENDARY',
      category: 'special',
    },
    {
      id: 'beta-tester-badge',
      name: 'Beta Tester',
      description: 'Helped test the platform',
      imageUrl: '/badges/beta-tester.svg',
      rarity: 'EPIC',
      category: 'special',
    },
  ];

  for (const badge of badges) {
    const achievementId = (badge as any).achievementName
      ? await getAchievementId((badge as any).achievementName)
      : null;
    const rewardId = (badge as any).rewardName
      ? await getRewardId((badge as any).rewardName)
      : null;

    await prisma.badge.upsert({
      where: { id: badge.id },
      update: {
        name: badge.name,
        description: badge.description,
        imageUrl: badge.imageUrl,
        rarity: badge.rarity as any,
        category: badge.category,
        achievementId,
        rewardId,
        isActive: true,
      },
      create: {
        id: badge.id,
        name: badge.name,
        description: badge.description,
        imageUrl: badge.imageUrl,
        rarity: badge.rarity as any,
        category: badge.category,
        achievementId,
        rewardId,
        isActive: true,
      },
    });
  }
  console.log('✅ Created/Updated badges:', badges.length);

  // ============================================
  // SEED PROFILE BORDERS (Rocket League-style)
  // ============================================
  const borders = [
    // Check-in Streak Borders
    {
      id: 'first-steps-border',
      name: 'First Steps',
      tier: 'starter',
      colors: ['#4ade80', '#22c55e', '#16a34a'],
      spinSpeed: 4,
      glowIntensity: 1,
      specialEffect: null,
      achievementName: 'First Steps',
    },
    {
      id: 'week-warrior-border',
      name: 'Week Warrior',
      tier: 'week',
      colors: ['#60a5fa', '#3b82f6', '#2563eb'],
      spinSpeed: 3.5,
      glowIntensity: 1.2,
      specialEffect: null,
      achievementName: 'Week Warrior',
    },
    {
      id: 'monthly-master-border',
      name: 'Monthly Master',
      tier: 'month',
      colors: ['#a78bfa', '#8b5cf6', '#7c3aed'],
      spinSpeed: 3,
      glowIntensity: 1.3,
      specialEffect: 'shimmer',
      achievementName: 'Monthly Master',
    },
    {
      id: 'streak-legend-border',
      name: 'Streak Legend',
      tier: 'streak',
      colors: ['#fb923c', '#f97316', '#ea580c'],
      spinSpeed: 2.5,
      glowIntensity: 1.5,
      specialEffect: 'flame',
      achievementName: 'Streak Legend',
    },

    // Tier Status Borders
    {
      id: 'bronze-status-border',
      name: 'Bronze Status',
      tier: 'BRONZE',
      colors: ['#d97706', '#b45309', '#92400e'],
      spinSpeed: 4,
      glowIntensity: 1,
      specialEffect: null,
      achievementName: null, // Bronze is default, no achievement needed
    },
    {
      id: 'silver-status-border',
      name: 'Silver Status',
      tier: 'SILVER',
      colors: ['#9ca3af', '#6b7280', '#4b5563'],
      spinSpeed: 3.5,
      glowIntensity: 1.2,
      specialEffect: 'shimmer',
      achievementName: 'Silver Status',
    },
    {
      id: 'gold-status-border',
      name: 'Gold Status',
      tier: 'GOLD',
      colors: ['#fcd34d', '#fbbf24', '#f59e0b'],
      spinSpeed: 3,
      glowIntensity: 1.4,
      specialEffect: 'sparkles',
      achievementName: 'Gold Status',
    },
    {
      id: 'diamond-status-border',
      name: 'Diamond Status',
      tier: 'DIAMOND',
      colors: ['#67e8f9', '#22d3ee', '#06b6d4', '#0891b2'],
      spinSpeed: 2.5,
      glowIntensity: 1.6,
      specialEffect: 'sparkles',
      achievementName: 'Diamond Status',
    },
    {
      id: 'elite-status-border',
      name: 'Elite Status',
      tier: 'ELITE',
      colors: ['#f472b6', '#ec4899', '#db2777', '#be185d', '#9d174d'],
      spinSpeed: 2,
      glowIntensity: 2,
      specialEffect: 'particles',
      achievementName: 'Elite Status',
    },
  ];

  for (const border of borders) {
    const achievementId = border.achievementName
      ? await getAchievementId(border.achievementName)
      : null;

    await prisma.profileBorder.upsert({
      where: { id: border.id },
      update: {
        name: border.name,
        tier: border.tier,
        colors: border.colors,
        spinSpeed: border.spinSpeed,
        glowIntensity: border.glowIntensity,
        specialEffect: border.specialEffect,
        achievementId,
        isActive: true,
      },
      create: {
        id: border.id,
        name: border.name,
        tier: border.tier,
        colors: border.colors,
        spinSpeed: border.spinSpeed,
        glowIntensity: border.glowIntensity,
        specialEffect: border.specialEffect,
        achievementId,
        isActive: true,
      },
    });
  }
  console.log('✅ Created/Updated borders:', borders.length);

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
