-- AlterTable: Increase precision from DECIMAL(12,2) to DECIMAL(12,6) for Statement totals
-- This allows Statement-level aggregations to preserve micro-amount precision

ALTER TABLE "Statement" ALTER COLUMN "totalRevenue" TYPE DECIMAL(12,6);
ALTER TABLE "Statement" ALTER COLUMN "totalCommission" TYPE DECIMAL(12,6);
ALTER TABLE "Statement" ALTER COLUMN "totalNet" TYPE DECIMAL(12,6);
