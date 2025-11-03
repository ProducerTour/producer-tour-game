-- Add commissionOverrideRate to users for per-writer commission overrides
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "commissionOverrideRate" DECIMAL(5,2);

