-- AlterTable
ALTER TABLE "statement_items" ADD COLUMN     "commissionAmount" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
ADD COLUMN     "commissionRate" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
ADD COLUMN     "commissionRecipient" TEXT,
ADD COLUMN     "netRevenue" DECIMAL(12,2) NOT NULL DEFAULT 0.00;

-- AlterTable
ALTER TABLE "statements" ADD COLUMN     "totalCommission" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "totalNet" DECIMAL(12,2) NOT NULL DEFAULT 0;
