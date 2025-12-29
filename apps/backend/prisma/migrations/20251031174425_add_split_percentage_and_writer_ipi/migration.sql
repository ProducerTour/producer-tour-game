-- AlterTable
ALTER TABLE "statement_items" ADD COLUMN     "splitPercentage" DECIMAL(5,2) DEFAULT 100.00,
ADD COLUMN     "writerIpiNumber" TEXT;
