-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'PENDING', 'PAID');

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'MANAGER';

-- AlterTable
ALTER TABLE "statement_items" ADD COLUMN     "isVisibleToWriter" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "paidAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "statements" ADD COLUMN     "paymentProcessedAt" TIMESTAMP(3),
ADD COLUMN     "paymentProcessedById" TEXT,
ADD COLUMN     "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID';

-- CreateIndex
CREATE INDEX "statement_items_isVisibleToWriter_idx" ON "statement_items"("isVisibleToWriter");

-- CreateIndex
CREATE INDEX "statements_paymentStatus_idx" ON "statements"("paymentStatus");

-- AddForeignKey
ALTER TABLE "statements" ADD CONSTRAINT "statements_paymentProcessedById_fkey" FOREIGN KEY ("paymentProcessedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
