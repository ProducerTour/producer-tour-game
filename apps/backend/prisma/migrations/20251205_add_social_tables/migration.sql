-- Create MarketplaceListingStatus enum
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MarketplaceListingStatus') THEN
        CREATE TYPE "MarketplaceListingStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SOLD_OUT', 'ARCHIVED');
    END IF;
END$$;

-- Create MarketplaceListingCategory enum
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MarketplaceListingCategory') THEN
        CREATE TYPE "MarketplaceListingCategory" AS ENUM ('BEATS', 'SAMPLES', 'PRESETS', 'STEMS', 'SERVICES', 'TEMPLATES', 'COURSES', 'OTHER');
    END IF;
END$$;

-- Create follows table
CREATE TABLE IF NOT EXISTS "follows" (
    "id" TEXT NOT NULL,
    "followerId" TEXT NOT NULL,
    "followingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "follows_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "follows_followerId_followingId_key" ON "follows"("followerId", "followingId");
CREATE INDEX IF NOT EXISTS "follows_followerId_idx" ON "follows"("followerId");
CREATE INDEX IF NOT EXISTS "follows_followingId_idx" ON "follows"("followingId");

ALTER TABLE "follows" DROP CONSTRAINT IF EXISTS "follows_followerId_fkey";
ALTER TABLE "follows" ADD CONSTRAINT "follows_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "follows" DROP CONSTRAINT IF EXISTS "follows_followingId_fkey";
ALTER TABLE "follows" ADD CONSTRAINT "follows_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create marketplace_listings table
CREATE TABLE IF NOT EXISTS "marketplace_listings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "MarketplaceListingCategory" NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "coverImageUrl" TEXT,
    "audioPreviewUrl" TEXT,
    "fileUrl" TEXT,
    "slug" TEXT NOT NULL,
    "tags" JSONB,
    "status" "MarketplaceListingStatus" NOT NULL DEFAULT 'DRAFT',
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "purchaseCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "marketplace_listings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "marketplace_listings_slug_key" ON "marketplace_listings"("slug");
CREATE INDEX IF NOT EXISTS "marketplace_listings_userId_idx" ON "marketplace_listings"("userId");
CREATE INDEX IF NOT EXISTS "marketplace_listings_category_idx" ON "marketplace_listings"("category");
CREATE INDEX IF NOT EXISTS "marketplace_listings_status_idx" ON "marketplace_listings"("status");
CREATE INDEX IF NOT EXISTS "marketplace_listings_createdAt_idx" ON "marketplace_listings"("createdAt");

ALTER TABLE "marketplace_listings" DROP CONSTRAINT IF EXISTS "marketplace_listings_userId_fkey";
ALTER TABLE "marketplace_listings" ADD CONSTRAINT "marketplace_listings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create marketplace_transactions table
CREATE TABLE IF NOT EXISTS "marketplace_transactions" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "grossAmount" DECIMAL(12,2) NOT NULL,
    "commissionRate" DECIMAL(5,2) NOT NULL,
    "commissionAmount" DECIMAL(12,2) NOT NULL,
    "netAmount" DECIMAL(12,2) NOT NULL,
    "stripePaymentIntentId" TEXT,
    "stripeTransferId" TEXT,
    "paidAt" TIMESTAMP(3),
    "transferredAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "marketplace_transactions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "marketplace_transactions_stripePaymentIntentId_key" ON "marketplace_transactions"("stripePaymentIntentId");
CREATE INDEX IF NOT EXISTS "marketplace_transactions_listingId_idx" ON "marketplace_transactions"("listingId");
CREATE INDEX IF NOT EXISTS "marketplace_transactions_buyerId_idx" ON "marketplace_transactions"("buyerId");
CREATE INDEX IF NOT EXISTS "marketplace_transactions_sellerId_idx" ON "marketplace_transactions"("sellerId");
CREATE INDEX IF NOT EXISTS "marketplace_transactions_createdAt_idx" ON "marketplace_transactions"("createdAt");

ALTER TABLE "marketplace_transactions" DROP CONSTRAINT IF EXISTS "marketplace_transactions_listingId_fkey";
ALTER TABLE "marketplace_transactions" ADD CONSTRAINT "marketplace_transactions_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "marketplace_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "marketplace_transactions" DROP CONSTRAINT IF EXISTS "marketplace_transactions_buyerId_fkey";
ALTER TABLE "marketplace_transactions" ADD CONSTRAINT "marketplace_transactions_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "marketplace_transactions" DROP CONSTRAINT IF EXISTS "marketplace_transactions_sellerId_fkey";
ALTER TABLE "marketplace_transactions" ADD CONSTRAINT "marketplace_transactions_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add FK from activity_feed_items to marketplace_listings (was skipped before)
ALTER TABLE "activity_feed_items" DROP CONSTRAINT IF EXISTS "activity_feed_items_listingId_fkey";
ALTER TABLE "activity_feed_items" ADD CONSTRAINT "activity_feed_items_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "marketplace_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
