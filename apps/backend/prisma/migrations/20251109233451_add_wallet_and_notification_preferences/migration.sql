-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'APPROVED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- AlterTable
ALTER TABLE "users" ADD COLUMN "availableBalance" DECIMAL(12,6) NOT NULL DEFAULT 0,
ADD COLUMN "pendingBalance" DECIMAL(12,6) NOT NULL DEFAULT 0,
ADD COLUMN "lifetimeEarnings" DECIMAL(12,6) NOT NULL DEFAULT 0,
ADD COLUMN "emailNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "statementNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "monthlySummaryEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "payout_requests" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DECIMAL(12,6) NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "processedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "stripeTransferId" TEXT,
    "stripePayoutId" TEXT,
    "failureReason" TEXT,
    "adminNotes" TEXT,
    "statementIds" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payout_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payout_requests_userId_idx" ON "payout_requests"("userId");

-- CreateIndex
CREATE INDEX "payout_requests_status_idx" ON "payout_requests"("status");

-- CreateIndex
CREATE INDEX "payout_requests_requestedAt_idx" ON "payout_requests"("requestedAt");

-- AddForeignKey
ALTER TABLE "payout_requests" ADD CONSTRAINT "payout_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
