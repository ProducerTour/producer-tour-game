-- CreateTable
CREATE TABLE IF NOT EXISTS "feed_likes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "feedItemId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feed_likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "feed_comments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "feedItemId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feed_comments_pkey" PRIMARY KEY ("id")
);

-- Add likeCount and commentCount columns to activity_feed_items if they don't exist
ALTER TABLE "activity_feed_items" ADD COLUMN IF NOT EXISTS "likeCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "activity_feed_items" ADD COLUMN IF NOT EXISTS "commentCount" INTEGER NOT NULL DEFAULT 0;

-- Add POST to ActivityFeedType enum if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type t
                   JOIN pg_enum e ON t.oid = e.enumtypid
                   WHERE t.typname = 'ActivityFeedType' AND e.enumlabel = 'POST') THEN
        ALTER TYPE "ActivityFeedType" ADD VALUE 'POST';
    END IF;
END$$;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "feed_likes_feedItemId_idx" ON "feed_likes"("feedItemId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "feed_likes_userId_idx" ON "feed_likes"("userId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "feed_likes_userId_feedItemId_key" ON "feed_likes"("userId", "feedItemId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "feed_comments_feedItemId_idx" ON "feed_comments"("feedItemId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "feed_comments_userId_idx" ON "feed_comments"("userId");

-- AddForeignKey
ALTER TABLE "feed_likes" ADD CONSTRAINT "feed_likes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feed_likes" ADD CONSTRAINT "feed_likes_feedItemId_fkey" FOREIGN KEY ("feedItemId") REFERENCES "activity_feed_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feed_comments" ADD CONSTRAINT "feed_comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feed_comments" ADD CONSTRAINT "feed_comments_feedItemId_fkey" FOREIGN KEY ("feedItemId") REFERENCES "activity_feed_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
