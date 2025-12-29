-- AlterTable
ALTER TABLE "statement_items" ALTER COLUMN "producerId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "ipiNumber" TEXT;
