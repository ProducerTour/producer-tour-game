-- Add referral tracking columns to orders table
ALTER TABLE "orders" ADD COLUMN "referralCode" TEXT;
ALTER TABLE "orders" ADD COLUMN "referredByUserId" TEXT;

-- Add index for referral code lookups
CREATE INDEX "orders_referralCode_idx" ON "orders"("referralCode");
