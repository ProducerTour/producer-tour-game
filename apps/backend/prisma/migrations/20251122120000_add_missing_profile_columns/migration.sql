-- Add missing profile columns to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "profilePhotoUrl" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "coverBannerUrl" TEXT;
