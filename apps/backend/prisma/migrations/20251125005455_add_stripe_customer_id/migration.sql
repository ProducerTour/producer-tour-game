-- AlterTable
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "users_stripeCustomerId_key" ON "users"("stripeCustomerId");
