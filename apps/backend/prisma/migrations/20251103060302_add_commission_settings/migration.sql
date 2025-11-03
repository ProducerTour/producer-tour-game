-- CreateTable
CREATE TABLE "commission_settings" (
    "id" TEXT NOT NULL,
    "commissionRate" DECIMAL(5,2) NOT NULL,
    "recipientName" TEXT NOT NULL,
    "description" TEXT,
    "effectiveDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commission_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "commission_settings_isActive_idx" ON "commission_settings"("isActive");

-- CreateIndex
CREATE INDEX "commission_settings_effectiveDate_idx" ON "commission_settings"("effectiveDate");
