-- AlterTable
ALTER TABLE "users" ADD COLUMN     "stripeAccountId" TEXT,
ADD COLUMN     "stripeAccountStatus" TEXT,
ADD COLUMN     "stripeDetailsSubmitted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "stripeOnboardingComplete" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "statements" ADD COLUMN     "stripeTransferGroup" TEXT,
ADD COLUMN     "stripeTransferIds" JSONB;

-- CreateIndex
CREATE UNIQUE INDEX "users_stripeAccountId_key" ON "users"("stripeAccountId");
