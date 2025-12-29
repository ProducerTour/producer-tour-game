-- Add social profile columns to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "bio" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "location" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "website" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "spotifyArtistUrl" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "instagramHandle" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "twitterHandle" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "linkedinUrl" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "tiktokHandle" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "soundcloudUrl" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "youtubeChannelUrl" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "appleMusicUrl" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "isPublicProfile" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "profileSlug" TEXT;

-- Create unique index for profile slug if not exists
CREATE UNIQUE INDEX IF NOT EXISTS "users_profileSlug_key" ON "users"("profileSlug");
