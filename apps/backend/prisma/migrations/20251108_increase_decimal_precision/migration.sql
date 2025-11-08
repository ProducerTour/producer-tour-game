-- AlterTable: Increase precision from DECIMAL(12,2) to DECIMAL(12,6) for all revenue fields
-- This prevents accumulation of rounding errors and preserves micro-amounts

-- statement_items table (individual line items)
ALTER TABLE "statement_items" ALTER COLUMN "revenue" TYPE DECIMAL(12,6);
ALTER TABLE "statement_items" ALTER COLUMN "commissionAmount" TYPE DECIMAL(12,6);
ALTER TABLE "statement_items" ALTER COLUMN "netRevenue" TYPE DECIMAL(12,6);

-- statements table (aggregated totals)
ALTER TABLE "statements" ALTER COLUMN "totalRevenue" TYPE DECIMAL(12,6);
ALTER TABLE "statements" ALTER COLUMN "totalCommission" TYPE DECIMAL(12,6);
ALTER TABLE "statements" ALTER COLUMN "totalNet" TYPE DECIMAL(12,6);
