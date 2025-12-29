-- Add ADMIN_GRANTED to ToolSubscriptionType enum
ALTER TYPE "ToolSubscriptionType" ADD VALUE IF NOT EXISTS 'ADMIN_GRANTED';

-- Add grantedById and grantReason columns to tool_subscriptions
ALTER TABLE "tool_subscriptions" ADD COLUMN IF NOT EXISTS "grantedById" TEXT;
ALTER TABLE "tool_subscriptions" ADD COLUMN IF NOT EXISTS "grantReason" TEXT;
