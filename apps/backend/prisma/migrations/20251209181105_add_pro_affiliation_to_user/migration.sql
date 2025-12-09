-- AlterTable: Add writerProAffiliation column to users table
ALTER TABLE "users" ADD COLUMN "writerProAffiliation" "ProType";

-- Migrate data: Copy proAffiliation from producers to users.writerProAffiliation
UPDATE "users" u
SET "writerProAffiliation" = p."proAffiliation"
FROM "producers" p
WHERE p."userId" = u.id
AND u."writerProAffiliation" IS NULL
AND p."proAffiliation" IS NOT NULL;
