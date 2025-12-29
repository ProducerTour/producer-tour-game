-- AlterTable: Rename ipiNumber to writerIpiNumber and add publisherIpiNumber on users table
ALTER TABLE "users" RENAME COLUMN "ipiNumber" TO "writerIpiNumber";
ALTER TABLE "users" ADD COLUMN "publisherIpiNumber" TEXT;

-- AlterTable: Rename ipiNumber to writerIpiNumber and add publisherIpiNumber on producers table
ALTER TABLE "producers" RENAME COLUMN "ipiNumber" TO "writerIpiNumber";
ALTER TABLE "producers" ADD COLUMN "publisherIpiNumber" TEXT;

-- Drop old index on producers.ipiNumber
DROP INDEX IF EXISTS "producers_ipiNumber_idx";

-- Create new indexes
CREATE INDEX "producers_writerIpiNumber_idx" ON "producers"("writerIpiNumber");
CREATE INDEX "producers_publisherIpiNumber_idx" ON "producers"("publisherIpiNumber");
