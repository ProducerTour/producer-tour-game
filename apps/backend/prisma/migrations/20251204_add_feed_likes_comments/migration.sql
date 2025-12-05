-- Create ActivityFeedType enum if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ActivityFeedType') THEN
        CREATE TYPE "ActivityFeedType" AS ENUM (
            'POST',
            'PLACEMENT',
            'ACHIEVEMENT',
            'MARKETPLACE_LISTING',
            'TOUR_MILES_EARNED',
            'TIER_UP',
            'REFERRAL_JOINED',
            'ANNOUNCEMENT',
            'UPDATE',
            'TIP',
            'NEWS'
        );
    END IF;
END$$;

-- Add POST to ActivityFeedType enum if it exists but doesn't have POST
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ActivityFeedType') THEN
        IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'ActivityFeedType' AND e.enumlabel = 'POST') THEN
            ALTER TYPE "ActivityFeedType" ADD VALUE 'POST';
        END IF;
    END IF;
EXCEPTION WHEN duplicate_object THEN
    NULL;
END$$;

-- Create activity_feed_items table if it doesn't exist
CREATE TABLE IF NOT EXISTS "activity_feed_items" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "activityType" "ActivityFeedType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "placementId" TEXT,
    "achievementId" TEXT,
    "listingId" TEXT,
    "metadata" JSONB,
    "imageUrl" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "commentCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_feed_items_pkey" PRIMARY KEY ("id")
);

-- Create indexes for activity_feed_items
CREATE INDEX IF NOT EXISTS "activity_feed_items_userId_idx" ON "activity_feed_items"("userId");
CREATE INDEX IF NOT EXISTS "activity_feed_items_activityType_idx" ON "activity_feed_items"("activityType");
CREATE INDEX IF NOT EXISTS "activity_feed_items_createdAt_idx" ON "activity_feed_items"("createdAt");
CREATE INDEX IF NOT EXISTS "activity_feed_items_isPublic_idx" ON "activity_feed_items"("isPublic");

-- Add foreign key for activity_feed_items -> users
ALTER TABLE "activity_feed_items" DROP CONSTRAINT IF EXISTS "activity_feed_items_userId_fkey";
ALTER TABLE "activity_feed_items" ADD CONSTRAINT "activity_feed_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add foreign key for activity_feed_items -> marketplace_listings (optional)
ALTER TABLE "activity_feed_items" DROP CONSTRAINT IF EXISTS "activity_feed_items_listingId_fkey";
ALTER TABLE "activity_feed_items" ADD CONSTRAINT "activity_feed_items_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "marketplace_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable feed_likes
CREATE TABLE IF NOT EXISTS "feed_likes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "feedItemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feed_likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable feed_comments
CREATE TABLE IF NOT EXISTS "feed_comments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "feedItemId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feed_comments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex for feed_likes
CREATE INDEX IF NOT EXISTS "feed_likes_feedItemId_idx" ON "feed_likes"("feedItemId");
CREATE INDEX IF NOT EXISTS "feed_likes_userId_idx" ON "feed_likes"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "feed_likes_userId_feedItemId_key" ON "feed_likes"("userId", "feedItemId");

-- CreateIndex for feed_comments
CREATE INDEX IF NOT EXISTS "feed_comments_feedItemId_idx" ON "feed_comments"("feedItemId");
CREATE INDEX IF NOT EXISTS "feed_comments_userId_idx" ON "feed_comments"("userId");

-- AddForeignKey for feed_likes
ALTER TABLE "feed_likes" DROP CONSTRAINT IF EXISTS "feed_likes_userId_fkey";
ALTER TABLE "feed_likes" ADD CONSTRAINT "feed_likes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "feed_likes" DROP CONSTRAINT IF EXISTS "feed_likes_feedItemId_fkey";
ALTER TABLE "feed_likes" ADD CONSTRAINT "feed_likes_feedItemId_fkey" FOREIGN KEY ("feedItemId") REFERENCES "activity_feed_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey for feed_comments
ALTER TABLE "feed_comments" DROP CONSTRAINT IF EXISTS "feed_comments_userId_fkey";
ALTER TABLE "feed_comments" ADD CONSTRAINT "feed_comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "feed_comments" DROP CONSTRAINT IF EXISTS "feed_comments_feedItemId_fkey";
ALTER TABLE "feed_comments" ADD CONSTRAINT "feed_comments_feedItemId_fkey" FOREIGN KEY ("feedItemId") REFERENCES "activity_feed_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
