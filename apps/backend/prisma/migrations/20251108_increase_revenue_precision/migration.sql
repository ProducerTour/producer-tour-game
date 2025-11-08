-- AlterTable: Increase precision from DECIMAL(12,2) to DECIMAL(12,6) for accurate revenue calculations
-- This prevents accumulation of rounding errors across thousands of StatementItems

ALTER TABLE "StatementItem" ALTER COLUMN "revenue" TYPE DECIMAL(12,6);
ALTER TABLE "StatementItem" ALTER COLUMN "commissionAmount" TYPE DECIMAL(12,6);
ALTER TABLE "StatementItem" ALTER COLUMN "netRevenue" TYPE DECIMAL(12,6);
