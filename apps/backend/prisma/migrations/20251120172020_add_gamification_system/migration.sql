-- CreateEnum
CREATE TYPE "GamificationTier" AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'DIAMOND', 'ELITE');

-- CreateEnum
CREATE TYPE "GamificationEventType" AS ENUM ('DAILY_CHECK_IN', 'WEEKLY_STREAK_BONUS', 'MONTHLY_STREAK_BONUS', 'SOCIAL_SHARE', 'DISCORD_SHARE', 'REFERRAL_SIGNUP', 'REFERRAL_CONVERSION', 'PROFILE_COMPLETE', 'PROFILE_PHOTO_UPLOAD', 'STRIPE_CONNECTED', 'WORK_SUBMITTED', 'WORK_APPROVED', 'REVENUE_MILESTONE', 'PAYOUT_COMPLETED', 'STATEMENT_VIEWED', 'FEEDBACK_SUBMITTED', 'BUG_REPORTED', 'FEATURE_SUGGESTED', 'ACHIEVEMENT_UNLOCKED', 'LEVEL_UP', 'REWARD_REDEEMED', 'ADMIN_AWARDED', 'ADMIN_DEDUCTED');

-- CreateEnum
CREATE TYPE "AchievementCategory" AS ENUM ('SOCIAL', 'PLATFORM', 'REVENUE', 'COMMUNITY', 'ENGAGEMENT', 'MILESTONE');

-- CreateEnum
CREATE TYPE "AchievementTier" AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND');

-- CreateEnum
CREATE TYPE "RewardCategory" AS ENUM ('COMMISSION', 'PAYOUT', 'PLATFORM', 'SUBSCRIPTION', 'PHYSICAL');

-- CreateEnum
CREATE TYPE "RedemptionStatus" AS ENUM ('PENDING', 'APPROVED', 'COMPLETED', 'DENIED', 'EXPIRED');

-- CreateTable
CREATE TABLE "gamification_points" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "totalEarned" INTEGER NOT NULL DEFAULT 0,
    "totalSpent" INTEGER NOT NULL DEFAULT 0,
    "tier" "GamificationTier" NOT NULL DEFAULT 'BRONZE',
    "lastCheckIn" TIMESTAMP(3),
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "referralCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gamification_points_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gamification_events" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventType" "GamificationEventType" NOT NULL,
    "points" INTEGER NOT NULL,
    "description" TEXT,
    "metadata" JSONB,
    "adminId" TEXT,
    "adminReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gamification_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "achievements" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "criteria" JSONB NOT NULL,
    "tier" "AchievementTier" NOT NULL,
    "category" "AchievementCategory" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_achievements" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rewards" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "cost" INTEGER NOT NULL,
    "category" "RewardCategory" NOT NULL,
    "type" TEXT NOT NULL,
    "roleRestriction" TEXT,
    "tierRestriction" "GamificationTier",
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "inventory" INTEGER,
    "details" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rewards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reward_redemptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rewardId" TEXT NOT NULL,
    "pointsCost" INTEGER NOT NULL,
    "status" "RedemptionStatus" NOT NULL DEFAULT 'PENDING',
    "adminId" TEXT,
    "adminNotes" TEXT,
    "appliedToPayoutId" TEXT,
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "redeemedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "reward_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_shares" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "signups" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "social_shares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_check_ins" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "checkInDate" DATE NOT NULL,
    "pointsEarned" INTEGER NOT NULL DEFAULT 10,
    "streakDay" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_check_ins_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "gamification_points_userId_key" ON "gamification_points"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "gamification_points_referralCode_key" ON "gamification_points"("referralCode");

-- CreateIndex
CREATE INDEX "gamification_points_userId_idx" ON "gamification_points"("userId");

-- CreateIndex
CREATE INDEX "gamification_points_tier_idx" ON "gamification_points"("tier");

-- CreateIndex
CREATE INDEX "gamification_points_points_idx" ON "gamification_points"("points");

-- CreateIndex
CREATE INDEX "gamification_events_userId_idx" ON "gamification_events"("userId");

-- CreateIndex
CREATE INDEX "gamification_events_eventType_idx" ON "gamification_events"("eventType");

-- CreateIndex
CREATE INDEX "gamification_events_createdAt_idx" ON "gamification_events"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "achievements_name_key" ON "achievements"("name");

-- CreateIndex
CREATE INDEX "achievements_category_idx" ON "achievements"("category");

-- CreateIndex
CREATE INDEX "achievements_tier_idx" ON "achievements"("tier");

-- CreateIndex
CREATE INDEX "achievements_isActive_idx" ON "achievements"("isActive");

-- CreateIndex
CREATE INDEX "user_achievements_userId_idx" ON "user_achievements"("userId");

-- CreateIndex
CREATE INDEX "user_achievements_achievementId_idx" ON "user_achievements"("achievementId");

-- CreateIndex
CREATE UNIQUE INDEX "user_achievements_userId_achievementId_key" ON "user_achievements"("userId", "achievementId");

-- CreateIndex
CREATE INDEX "rewards_category_idx" ON "rewards"("category");

-- CreateIndex
CREATE INDEX "rewards_roleRestriction_idx" ON "rewards"("roleRestriction");

-- CreateIndex
CREATE INDEX "rewards_tierRestriction_idx" ON "rewards"("tierRestriction");

-- CreateIndex
CREATE INDEX "rewards_isActive_idx" ON "rewards"("isActive");

-- CreateIndex
CREATE INDEX "reward_redemptions_userId_idx" ON "reward_redemptions"("userId");

-- CreateIndex
CREATE INDEX "reward_redemptions_rewardId_idx" ON "reward_redemptions"("rewardId");

-- CreateIndex
CREATE INDEX "reward_redemptions_status_idx" ON "reward_redemptions"("status");

-- CreateIndex
CREATE INDEX "reward_redemptions_appliedToPayoutId_idx" ON "reward_redemptions"("appliedToPayoutId");

-- CreateIndex
CREATE INDEX "social_shares_userId_idx" ON "social_shares"("userId");

-- CreateIndex
CREATE INDEX "social_shares_platform_idx" ON "social_shares"("platform");

-- CreateIndex
CREATE INDEX "daily_check_ins_userId_idx" ON "daily_check_ins"("userId");

-- CreateIndex
CREATE INDEX "daily_check_ins_checkInDate_idx" ON "daily_check_ins"("checkInDate");

-- CreateIndex
CREATE UNIQUE INDEX "daily_check_ins_userId_checkInDate_key" ON "daily_check_ins"("userId", "checkInDate");

-- AddForeignKey
ALTER TABLE "gamification_points" ADD CONSTRAINT "gamification_points_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gamification_events" ADD CONSTRAINT "gamification_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "achievements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reward_redemptions" ADD CONSTRAINT "reward_redemptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reward_redemptions" ADD CONSTRAINT "reward_redemptions_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "rewards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_shares" ADD CONSTRAINT "social_shares_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_check_ins" ADD CONSTRAINT "daily_check_ins_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
