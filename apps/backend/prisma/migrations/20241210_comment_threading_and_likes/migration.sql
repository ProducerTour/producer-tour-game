-- Comment Threading and Likes Migration
-- This migration adds threading support to comments and a comment likes system

-- Add threading support to feed_comments
ALTER TABLE "feed_comments" ADD COLUMN IF NOT EXISTS "parentId" TEXT;
ALTER TABLE "feed_comments" ADD COLUMN IF NOT EXISTS "likeCount" INTEGER NOT NULL DEFAULT 0;

-- Add foreign key for self-referential parent relationship
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'feed_comments_parentId_fkey'
  ) THEN
    ALTER TABLE "feed_comments"
    ADD CONSTRAINT "feed_comments_parentId_fkey"
    FOREIGN KEY ("parentId") REFERENCES "feed_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Create comment_likes table
CREATE TABLE IF NOT EXISTS "comment_likes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comment_likes_pkey" PRIMARY KEY ("id")
);

-- Add unique constraint to prevent duplicate likes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'comment_likes_userId_commentId_key'
  ) THEN
    ALTER TABLE "comment_likes"
    ADD CONSTRAINT "comment_likes_userId_commentId_key" UNIQUE ("userId", "commentId");
  END IF;
END $$;

-- Add foreign keys for comment_likes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'comment_likes_userId_fkey'
  ) THEN
    ALTER TABLE "comment_likes"
    ADD CONSTRAINT "comment_likes_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'comment_likes_commentId_fkey'
  ) THEN
    ALTER TABLE "comment_likes"
    ADD CONSTRAINT "comment_likes_commentId_fkey"
    FOREIGN KEY ("commentId") REFERENCES "feed_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "feed_comments_feedItemId_parentId_createdAt_idx" ON "feed_comments"("feedItemId", "parentId", "createdAt");
CREATE INDEX IF NOT EXISTS "feed_comments_parentId_idx" ON "feed_comments"("parentId");
CREATE INDEX IF NOT EXISTS "comment_likes_commentId_idx" ON "comment_likes"("commentId");
CREATE INDEX IF NOT EXISTS "comment_likes_userId_idx" ON "comment_likes"("userId");

-- Drop old index if exists (will be replaced by new composite index)
DROP INDEX IF EXISTS "feed_comments_feedItemId_idx";
