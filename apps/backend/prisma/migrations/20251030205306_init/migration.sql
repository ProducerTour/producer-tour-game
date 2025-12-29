-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'WRITER', 'LEGAL');

-- CreateEnum
CREATE TYPE "ProType" AS ENUM ('BMI', 'ASCAP', 'SESAC', 'OTHER');

-- CreateEnum
CREATE TYPE "StatementStatus" AS ENUM ('UPLOADED', 'PROCESSING', 'PROCESSED', 'PUBLISHED', 'ERROR');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CONTACTED');

-- CreateEnum
CREATE TYPE "ApplicationTier" AS ENUM ('PRIORITY_A', 'PRIORITY_B', 'PRIORITY_C', 'PRIORITY_D');

-- CreateEnum
CREATE TYPE "OpportunityStatus" AS ENUM ('OPEN', 'ON_HOLD', 'CLOSED');

-- CreateEnum
CREATE TYPE "OpportunityPriority" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'WRITER',
    "firstName" TEXT,
    "lastName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "producers" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "producerName" TEXT NOT NULL,
    "ipiNumber" TEXT,
    "proAffiliation" "ProType",
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "producers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "statements" (
    "id" TEXT NOT NULL,
    "proType" "ProType" NOT NULL,
    "filename" TEXT NOT NULL,
    "filePath" TEXT,
    "status" "StatementStatus" NOT NULL DEFAULT 'UPLOADED',
    "uploadDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),
    "publishedById" TEXT,
    "totalRevenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalPerformances" INTEGER NOT NULL DEFAULT 0,
    "statementPeriod" TEXT,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "statements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "statement_items" (
    "id" TEXT NOT NULL,
    "statementId" TEXT NOT NULL,
    "workTitle" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "producerId" TEXT NOT NULL,
    "revenue" DECIMAL(12,2) NOT NULL,
    "performances" INTEGER NOT NULL DEFAULT 0,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "statement_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applications" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "social" TEXT,
    "primaryLink" TEXT NOT NULL,
    "otherLinks" TEXT,
    "pro" TEXT,
    "distributor" TEXT,
    "catalogSize" TEXT NOT NULL,
    "placements" TEXT NOT NULL,
    "royalties" TEXT NOT NULL,
    "readiness" JSONB,
    "engagement" TEXT NOT NULL,
    "needs" JSONB,
    "notes" TEXT,
    "score" INTEGER NOT NULL DEFAULT 0,
    "tier" "ApplicationTier",
    "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "internalNotes" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opportunities" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "brief" TEXT NOT NULL,
    "genres" JSONB,
    "budget" TEXT,
    "deadline" TIMESTAMP(3),
    "contact" TEXT,
    "link" TEXT,
    "status" "OpportunityStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "OpportunityPriority" NOT NULL DEFAULT 'MEDIUM',
    "notes" TEXT,
    "tags" JSONB,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "opportunities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultations" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "title" TEXT,
    "website" TEXT,
    "businessType" TEXT,
    "companySize" TEXT,
    "budget" TEXT,
    "services" JSONB,
    "projectScope" TEXT,
    "timeline" TEXT,
    "volumeNeeds" TEXT,
    "additionalInfo" TEXT,
    "hearAbout" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "internalNotes" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consultations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "producers_userId_key" ON "producers"("userId");

-- CreateIndex
CREATE INDEX "producers_ipiNumber_idx" ON "producers"("ipiNumber");

-- CreateIndex
CREATE INDEX "producers_proAffiliation_idx" ON "producers"("proAffiliation");

-- CreateIndex
CREATE INDEX "statements_proType_idx" ON "statements"("proType");

-- CreateIndex
CREATE INDEX "statements_status_idx" ON "statements"("status");

-- CreateIndex
CREATE INDEX "statements_uploadDate_idx" ON "statements"("uploadDate");

-- CreateIndex
CREATE INDEX "statement_items_statementId_idx" ON "statement_items"("statementId");

-- CreateIndex
CREATE INDEX "statement_items_userId_idx" ON "statement_items"("userId");

-- CreateIndex
CREATE INDEX "statement_items_producerId_idx" ON "statement_items"("producerId");

-- CreateIndex
CREATE INDEX "statement_items_workTitle_idx" ON "statement_items"("workTitle");

-- CreateIndex
CREATE INDEX "applications_email_idx" ON "applications"("email");

-- CreateIndex
CREATE INDEX "applications_status_idx" ON "applications"("status");

-- CreateIndex
CREATE INDEX "applications_tier_idx" ON "applications"("tier");

-- CreateIndex
CREATE INDEX "applications_score_idx" ON "applications"("score");

-- CreateIndex
CREATE INDEX "opportunities_status_idx" ON "opportunities"("status");

-- CreateIndex
CREATE INDEX "opportunities_priority_idx" ON "opportunities"("priority");

-- CreateIndex
CREATE INDEX "opportunities_deadline_idx" ON "opportunities"("deadline");

-- CreateIndex
CREATE INDEX "consultations_email_idx" ON "consultations"("email");

-- CreateIndex
CREATE INDEX "consultations_status_idx" ON "consultations"("status");

-- AddForeignKey
ALTER TABLE "producers" ADD CONSTRAINT "producers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "statements" ADD CONSTRAINT "statements_publishedById_fkey" FOREIGN KEY ("publishedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "statement_items" ADD CONSTRAINT "statement_items_statementId_fkey" FOREIGN KEY ("statementId") REFERENCES "statements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "statement_items" ADD CONSTRAINT "statement_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "statement_items" ADD CONSTRAINT "statement_items_producerId_fkey" FOREIGN KEY ("producerId") REFERENCES "producers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
