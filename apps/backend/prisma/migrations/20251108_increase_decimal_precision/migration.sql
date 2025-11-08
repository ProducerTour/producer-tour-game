-- AlterTable: Increase precision from DECIMAL(12,2) to DECIMAL(12,6) for all revenue fields
-- This prevents accumulation of rounding errors and preserves micro-amounts

-- StatementItem table (individual line items)
ALTER TABLE "StatementItem" ALTER COLUMN "revenue" TYPE DECIMAL(12,6);
ALTER TABLE "StatementItem" ALTER COLUMN "commissionAmount" TYPE DECIMAL(12,6);
ALTER TABLE "StatementItem" ALTER COLUMN "netRevenue" TYPE DECIMAL(12,6);

-- Statement table (aggregated totals)
ALTER TABLE "Statement" ALTER COLUMN "totalRevenue" TYPE DECIMAL(12,6);
ALTER TABLE "Statement" ALTER COLUMN "totalCommission" TYPE DECIMAL(12,6);
ALTER TABLE "Statement" ALTER COLUMN "totalNet" TYPE DECIMAL(12,6);
