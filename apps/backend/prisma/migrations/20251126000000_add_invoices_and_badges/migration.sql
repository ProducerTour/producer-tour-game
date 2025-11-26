-- Add equipped badge/border columns to users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "equippedBadgeId" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "equippedBorderId" TEXT;

-- Create BadgeRarity enum if not exists
DO $$ BEGIN
    CREATE TYPE "BadgeRarity" AS ENUM ('COMMON', 'RARE', 'EPIC', 'LEGENDARY');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create badges table
CREATE TABLE IF NOT EXISTS "badges" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT NOT NULL,
    "rarity" "BadgeRarity" NOT NULL DEFAULT 'COMMON',
    "category" TEXT NOT NULL,
    "achievementId" TEXT,
    "rewardId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "badges_pkey" PRIMARY KEY ("id")
);

-- Create unique constraints for badges
DO $$ BEGIN
    ALTER TABLE "badges" ADD CONSTRAINT "badges_name_key" UNIQUE ("name");
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "badges" ADD CONSTRAINT "badges_achievementId_key" UNIQUE ("achievementId");
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "badges" ADD CONSTRAINT "badges_rewardId_key" UNIQUE ("rewardId");
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create indexes for badges
CREATE INDEX IF NOT EXISTS "badges_category_idx" ON "badges"("category");
CREATE INDEX IF NOT EXISTS "badges_rarity_idx" ON "badges"("rarity");
CREATE INDEX IF NOT EXISTS "badges_isActive_idx" ON "badges"("isActive");

-- Create user_badges table
CREATE TABLE IF NOT EXISTS "user_badges" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "badgeId" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isEquipped" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "user_badges_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint for user_badges
DO $$ BEGIN
    ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_userId_badgeId_key" UNIQUE ("userId", "badgeId");
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create indexes for user_badges
CREATE INDEX IF NOT EXISTS "user_badges_userId_idx" ON "user_badges"("userId");
CREATE INDEX IF NOT EXISTS "user_badges_badgeId_idx" ON "user_badges"("badgeId");
CREATE INDEX IF NOT EXISTS "user_badges_isEquipped_idx" ON "user_badges"("isEquipped");

-- Create profile_borders table
CREATE TABLE IF NOT EXISTS "profile_borders" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "colors" JSONB NOT NULL,
    "spinSpeed" DOUBLE PRECISION NOT NULL DEFAULT 4,
    "glowIntensity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "specialEffect" TEXT,
    "achievementId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profile_borders_pkey" PRIMARY KEY ("id")
);

-- Create unique constraints for profile_borders
DO $$ BEGIN
    ALTER TABLE "profile_borders" ADD CONSTRAINT "profile_borders_name_key" UNIQUE ("name");
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "profile_borders" ADD CONSTRAINT "profile_borders_achievementId_key" UNIQUE ("achievementId");
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create indexes for profile_borders
CREATE INDEX IF NOT EXISTS "profile_borders_tier_idx" ON "profile_borders"("tier");
CREATE INDEX IF NOT EXISTS "profile_borders_isActive_idx" ON "profile_borders"("isActive");

-- Create user_borders table
CREATE TABLE IF NOT EXISTS "user_borders" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "borderId" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isEquipped" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "user_borders_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint for user_borders
DO $$ BEGIN
    ALTER TABLE "user_borders" ADD CONSTRAINT "user_borders_userId_borderId_key" UNIQUE ("userId", "borderId");
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create indexes for user_borders
CREATE INDEX IF NOT EXISTS "user_borders_userId_idx" ON "user_borders"("userId");
CREATE INDEX IF NOT EXISTS "user_borders_borderId_idx" ON "user_borders"("borderId");
CREATE INDEX IF NOT EXISTS "user_borders_isEquipped_idx" ON "user_borders"("isEquipped");

-- Create Invoice type enum if not exists
DO $$ BEGIN
    CREATE TYPE "InvoiceType" AS ENUM ('SESSION', 'ADVANCE', 'FEE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create AdvanceType enum if not exists
DO $$ BEGIN
    CREATE TYPE "AdvanceType" AS ENUM ('FUTURE_ROYALTY', 'DEAL_ADVANCE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create InvoiceStatus enum if not exists
DO $$ BEGIN
    CREATE TYPE "InvoiceStatus" AS ENUM ('PENDING', 'APPROVED', 'PROCESSING', 'PAID', 'REJECTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create invoices table
CREATE TABLE IF NOT EXISTS "invoices" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "type" "InvoiceType" NOT NULL,
    "submittedById" TEXT NOT NULL,
    "submittedByName" TEXT NOT NULL,
    "submittedByEmail" TEXT,
    "grossAmount" DECIMAL(12,2) NOT NULL,
    "commissionRate" DECIMAL(5,2) NOT NULL,
    "commissionAmount" DECIMAL(12,2) NOT NULL,
    "netAmount" DECIMAL(12,2) NOT NULL,
    "description" TEXT,
    "details" JSONB,
    "placementDealId" TEXT,
    "advanceType" "AdvanceType",
    "status" "InvoiceStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "adminNotes" TEXT,
    "rejectionReason" TEXT,
    "stripeTransferId" TEXT,
    "stripePayoutId" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint on invoiceNumber
DO $$ BEGIN
    ALTER TABLE "invoices" ADD CONSTRAINT "invoices_invoiceNumber_key" UNIQUE ("invoiceNumber");
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create indexes for invoices
CREATE INDEX IF NOT EXISTS "invoices_submittedById_idx" ON "invoices"("submittedById");
CREATE INDEX IF NOT EXISTS "invoices_type_idx" ON "invoices"("type");
CREATE INDEX IF NOT EXISTS "invoices_status_idx" ON "invoices"("status");
CREATE INDEX IF NOT EXISTS "invoices_placementDealId_idx" ON "invoices"("placementDealId");
CREATE INDEX IF NOT EXISTS "invoices_createdAt_idx" ON "invoices"("createdAt");

-- Add foreign key constraints for badges
DO $$ BEGIN
    ALTER TABLE "badges" ADD CONSTRAINT "badges_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "achievements"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "badges" ADD CONSTRAINT "badges_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "rewards"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add foreign key constraints for user_badges
DO $$ BEGIN
    ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "badges"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add foreign key constraints for profile_borders
DO $$ BEGIN
    ALTER TABLE "profile_borders" ADD CONSTRAINT "profile_borders_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "achievements"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add foreign key constraints for user_borders
DO $$ BEGIN
    ALTER TABLE "user_borders" ADD CONSTRAINT "user_borders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "user_borders" ADD CONSTRAINT "user_borders_borderId_fkey" FOREIGN KEY ("borderId") REFERENCES "profile_borders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add foreign key constraints for invoices
DO $$ BEGIN
    ALTER TABLE "invoices" ADD CONSTRAINT "invoices_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "invoices" ADD CONSTRAINT "invoices_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "invoices" ADD CONSTRAINT "invoices_placementDealId_fkey" FOREIGN KEY ("placementDealId") REFERENCES "placement_deals"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
