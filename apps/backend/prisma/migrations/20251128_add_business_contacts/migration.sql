-- CreateEnum
CREATE TYPE "BusinessContactCategory" AS ENUM ('LABEL', 'PUBLISHER', 'DISTRIBUTOR', 'ATTORNEY', 'MANAGER', 'OTHER');

-- CreateTable
CREATE TABLE "business_contacts" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "country" TEXT DEFAULT 'USA',
    "category" "BusinessContactCategory" NOT NULL DEFAULT 'OTHER',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "business_contacts_category_idx" ON "business_contacts"("category");

-- CreateIndex
CREATE INDEX "business_contacts_companyName_idx" ON "business_contacts"("companyName");

-- CreateIndex
CREATE INDEX "business_contacts_email_idx" ON "business_contacts"("email");
