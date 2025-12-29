-- CreateEnum
CREATE TYPE "ToolSubscriptionType" AS ENUM ('FREE_TRIAL', 'TOUR_MILES', 'PAID');

-- CreateEnum
CREATE TYPE "ToolSubscriptionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED');

-- CreateTable
CREATE TABLE "tool_subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "toolName" TEXT NOT NULL,
    "type" "ToolSubscriptionType" NOT NULL,
    "status" "ToolSubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "usesRemaining" INTEGER NOT NULL DEFAULT 0,
    "usesTotal" INTEGER NOT NULL DEFAULT 0,
    "usesUsed" INTEGER NOT NULL DEFAULT 0,
    "tourMilesCost" INTEGER,
    "redemptionId" TEXT,
    "stripeSubscriptionId" TEXT,
    "stripePriceId" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tool_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tool_subscriptions_userId_idx" ON "tool_subscriptions"("userId");

-- CreateIndex
CREATE INDEX "tool_subscriptions_toolId_idx" ON "tool_subscriptions"("toolId");

-- CreateIndex
CREATE INDEX "tool_subscriptions_status_idx" ON "tool_subscriptions"("status");

-- CreateIndex
CREATE INDEX "tool_subscriptions_expiresAt_idx" ON "tool_subscriptions"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "tool_subscriptions_userId_toolId_type_key" ON "tool_subscriptions"("userId", "toolId", "type");

-- AddForeignKey
ALTER TABLE "tool_subscriptions" ADD CONSTRAINT "tool_subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
